<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $id   = (int)$_POST['id'];
    $name = encodeInput($_POST['tag_name']);
    $affectedRows = dbExec($db, "UPDATE `tags` SET `name`=? WHERE id=?", array($name, $id))->affected_rows;
    if ($affectedRows < 1) {
        echo "No rows affected!";
    } else if ($affectedRows > 1) {
        echo "More than one tag affected!";
    } else {
        echo $affectedRows;
    }
    $db->close();
