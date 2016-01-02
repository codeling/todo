<?php
    require("db.php");
    $list_id = (int)$_GET["list_id"];
    $sql = "DELETE FROM todo WHERE deleted=1 AND list_id=$list_id";
    dbQueryOrDie($db, $sql);
    echo 1;
    $db->close();
