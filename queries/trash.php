<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    $trash = ((int)postParam('trash') == 1) ? 1 : 0;
    $version = (int)postParam('version');
    $stmt = dbExec($db, "UPDATE todo SET deleted=? WHERE id=? AND version=?",
        array($trash, $id, $version));
    requireSingleRow($stmt->affected_rows, "VERSION_CONFLICT", "MORE_THAN_ONE_ENTRY_CHANGED");
    echo 1;
