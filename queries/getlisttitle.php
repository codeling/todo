<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    $sql = "SELECT name FROM list WHERE id=$id";
    $qResult = dbQueryOrDie($db, $sql);
    $obj = $qResult->fetch_object();
    echo $obj->name;
    $db->close();
?>
