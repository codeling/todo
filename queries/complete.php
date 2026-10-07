<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    $completed = ((int)postParam('completed') == 1) ? 1 : 0;
    $version   = (int)postParam('version');
    $stmt = dbExec($db, "UPDATE todo SET completed=?, ".
        "completionDate=IF(?=1, UTC_TIMESTAMP(), NULL), version=?+1 WHERE id=? AND version=?",
        array($completed, $completed, $version, $id, $version));
    $affectedRows = $stmt->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("VERSION_CONFLICT");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        echo $affectedRows;
    }
    $db->close();
