<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    $todo = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));;
    $priority = (int)$_REQUEST['priority'];
    $returnVal = $db->query("UPDATE todo ".
            "SET description='$todo', dueDate='$due', priority=$priority ".
            "WHERE id=$id");
    if ($returnVal == FALSE) {
        echo $db->error;
    } else {
        echo $returnVal;
    }
    $db->close();
?>
