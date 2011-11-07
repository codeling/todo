<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    $completed = (int)$_REQUEST['completed'];
    $returnVal = $db->query("UPDATE todo SET completed=$completed, completionDate=NOW() WHERE id=$id");
    if ($returnVal == FALSE) {
        echo $db->error;
    } else {
        echo $returnVal;
    }
    $db->close();
?>
