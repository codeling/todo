<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
    require("tags.php");
    $id   = (int)postParam('id');
    $name = encodeInput(trim(postParam('tag_name')));
    // no comma: tags are passed around as comma separated lists (see tags.php)
    if (!isValidTagName($name)) {
        echo TodoLang::_("INVALID_TAG_NAME");
        die;
    }
    requireOwnTag($db, $id);
    // names are unique (case-insensitive); the unique key also catches a concurrent rename
    try {
        $affectedRows = dbExec($db, "UPDATE `tags` SET `name`=? WHERE id=?", array($name, $id))->affected_rows;
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() != 1062) {
            throw $e;
        }
        echo TodoLang::_("TAG_EXISTS");
        die;
    }
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $affectedRows;
    }
    $db->close();
