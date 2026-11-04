<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    require("tags.php");
    $id   = (int)postParam('id');
    $name = trim(postParam('tag_name'));
    // no comma: tags are passed around as comma separated lists (see tags.php)
    if (!isValidTagName($name)) {
        rejectRequest(422, "INVALID_TAG_NAME");
    }
    requireOwnTag($db, $id);
    // names are unique (case-insensitive); the unique key also catches a concurrent rename
    try {
        dbExec($db, "UPDATE `tags` SET `name`=? WHERE id=?", array($name, $id));
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() != 1062) {
            throw $e;
        }
        rejectRequest(409, "TAG_EXISTS");
    }
    // (no check of the affected rows: saving the unchanged name changes no row, and the tag was checked above)
    sendOk();
