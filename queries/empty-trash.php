<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $list_id = (int)$_POST["list_id"];
    dbExec($db, "DELETE FROM todo WHERE deleted=1 AND list_id=?", array($list_id));
    echo 1;
    $db->close();
