<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    $list_id = (int)postParam('list_id');
    requireOwnList($db, $list_id);
    dbExec($db, "DELETE FROM todo WHERE deleted=1 AND list_id=?", array($list_id));
    echo 1;
