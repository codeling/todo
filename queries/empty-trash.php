<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
    $list_id = (int)postParam('list_id');
    requireOwnList($db, $list_id);
    dbExec($db, "DELETE FROM todo WHERE deleted=1 AND list_id=?", array($list_id));
    echo 1;
    $db->close();
