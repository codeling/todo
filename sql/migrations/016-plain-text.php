<?php
// Database review (issue #16, D1): the application stores plain text instead of HTML-encoded text
// ("Straße & Co" instead of "Stra&szlig;e &amp; Co"), and escapes it when it shows it. This
// migration decodes what the earlier versions stored: the descriptions and notes of the entries,
// the names of the tags and the names of the lists (the application does not create lists, but the
// client decoded their names too). The text is decoded with html_entity_decode, the inverse of the
// htmlentities call which encoded it, so every value ends up as it was shown before.
//
// Tags which become equal after decoding in the collation of the table (case-insensitive, like
// "ä" and "&auml;", which an even older version may have stored decoded) are merged into the one
// with the lowest id, like 014 does: the entries of the others get the kept tag, and the others
// are deleted.
//
// It is a PHP file because the inverse of htmlentities (253 entities) does not fit in SQL. It
// only changes data, so it runs in one transaction: it is applied completely or not at all (the
// runner shows the error and the database stays as it was). It sets db.version itself, as the SQL
// migrations do. Run it after a backup, with an account which may create temporary tables.
return function ($db) {
    $decode = function ($value) {
        // (NULL stays NULL: the notes are optional)
        return $value === null ? null : html_entity_decode($value, ENT_QUOTES | ENT_HTML401, 'UTF-8');
    };

    // decodes the text columns of a table in batches (by id); rows which do not change are not
    // updated
    $decodeColumns = function ($table, $columns) use ($db, $decode) {
        $select = $db->prepare("SELECT `id`, `".implode("`, `", $columns)."` FROM `".$table."` ".
            "WHERE `id` > ? ORDER BY `id` LIMIT 500");
        $update = $db->prepare("UPDATE `".$table."` SET `".implode("` = ?, `", $columns)."` = ? WHERE `id` = ?");
        $lastId = -1;
        while (true) {
            $select->bind_param("i", $lastId);
            $select->execute();
            $rows = $select->get_result()->fetch_all(MYSQLI_ASSOC);
            if (count($rows) == 0) {
                break;
            }
            foreach ($rows as $row) {
                $lastId = (int)$row['id'];
                $values = array();
                $changed = false;
                foreach ($columns as $column) {
                    $value = $decode($row[$column]);
                    $values[] = $value;
                    $changed = $changed || $value !== $row[$column];
                }
                if ($changed) {
                    $values[] = $lastId;
                    $update->bind_param(str_repeat("s", count($columns))."i", ...$values);
                    $update->execute();
                }
            }
        }
    };

    // The decoded names of the tags: the unique key finds those which become equal, because it
    // compares them in the collation of tags.name. The table is created before the transaction,
    // as some replication settings refuse that inside one.
    $db->query("CREATE TEMPORARY TABLE `plain_tag_names` (".
        "`name` varchar(255) NOT NULL, `tag_id` int NOT NULL, PRIMARY KEY (`name`)".
        ") DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci");
    $db->begin_transaction();
    try {
        $decodeColumns('todo', array('description', 'notes'));
        $decodeColumns('list', array('name'));

        $insertStmt = $db->prepare("INSERT INTO `plain_tag_names` (`name`, `tag_id`) VALUES (?, ?) ".
            "ON DUPLICATE KEY UPDATE `tag_id` = `tag_id`");
        $keeperStmt = $db->prepare("SELECT `tag_id` FROM `plain_tag_names` WHERE `name` = ?");
        $copyStmt = $db->prepare("INSERT IGNORE INTO `todo_tags` (`todo_id`, `tag_id`) ".
            "SELECT `todo_id`, ? FROM `todo_tags` WHERE `tag_id` = ?");
        $deleteAssignmentsStmt = $db->prepare("DELETE FROM `todo_tags` WHERE `tag_id` = ?");
        $deleteTagStmt = $db->prepare("DELETE FROM `tags` WHERE `id` = ?");
        // the tags which keep their id and get a new name: id => decoded name
        $renames = array();
        // ordered by id: the first tag of a group is the one with the lowest id
        $tags = $db->query("SELECT `id`, `name` FROM `tags` ORDER BY `id`")->fetch_all(MYSQLI_ASSOC);
        foreach ($tags as $tag) {
            $id = (int)$tag['id'];
            $name = $decode($tag['name']);
            $insertStmt->bind_param("si", $name, $id);
            $insertStmt->execute();
            $keeperStmt->bind_param("s", $name);
            $keeperStmt->execute();
            $keepId = (int)$keeperStmt->get_result()->fetch_row()[0];
            if ($keepId == $id) {
                if ($name !== $tag['name']) {
                    $renames[$id] = $name;
                }
                continue;
            }
            // equal to an earlier tag: its entries go to that one
            $copyStmt->bind_param("ii", $keepId, $id);
            $copyStmt->execute();
            $deleteAssignmentsStmt->bind_param("i", $id);
            $deleteAssignmentsStmt->execute();
            $deleteTagStmt->bind_param("i", $id);
            $deleteTagStmt->execute();
        }

        // A new name can still be the old name of a tag which is renamed too (the text
        // "&amp;" was stored as "&amp;amp;", and "&" as "&amp;"): such a tag waits until the
        // other one is renamed.
        $renameStmt = $db->prepare("UPDATE `tags` SET `name` = ? WHERE `id` = ?");
        while (count($renames) > 0) {
            $done = false;
            foreach ($renames as $id => $name) {
                $renameStmt->bind_param("si", $name, $id);
                try {
                    $renameStmt->execute();
                } catch (mysqli_sql_exception $e) {
                    if ($e->getCode() != 1062) {
                        throw $e;
                    }
                    continue;
                }
                unset($renames[$id]);
                $done = true;
            }
            if (!$done) {
                throw new RuntimeException("the tags ".implode(", ", array_keys($renames)).
                    " cannot be renamed, each new name is the old name of another one of them");
            }
        }

        $db->query("UPDATE `settings` SET `value` = '16' WHERE `key` = 'db.version'");
        $db->commit();
    } catch (Throwable $e) {
        $db->rollback();
        throw $e;
    } finally {
        $db->query("DROP TEMPORARY TABLE `plain_tag_names`");
    }
};
