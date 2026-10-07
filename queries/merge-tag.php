<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
    $id   = (int)postParam('id');
    $merge_id = (int)postParam('merge_id');
    if ($id < 1 || $merge_id < 1)
    {
        die(TodoLang::_("INVALID_PARAMETERS"));
    }
    // the join below would match every entry with itself and delete them all:
    if ($id == $merge_id)
    {
        die(TodoLang::_("CANNOT_MERGE_TAG_INTO_ITSELF"));
    }
    requireOwnTag($db, $id);
    requireOwnTag($db, $merge_id);
    $db->begin_transaction();
	// delete entries which already have the merge tag:
	dbExec($db, "DELETE t1 FROM `todo_tags` AS t1 ".
		"INNER JOIN `todo_tags` t2 ".
			"ON t1.`todo_id` = t2.`todo_id` ".
		"WHERE t1.`tag_id`=? AND t2.`tag_id`=?", array($id, $merge_id));
    dbExec($db, "UPDATE `todo_tags` SET `tag_id`=? WHERE `tag_id`=?", array($merge_id, $id));
    $affectedRows = dbExec($db, "DELETE FROM `tags` WHERE id=?", array($id))->affected_rows;
    $db->commit();
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $affectedRows;
    }
    $db->close();
