<?php
    require("db.php");
    require("date.php");
    $id       = (int)$_REQUEST['id'];
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    $notes    = $db->real_escape_string(htmlentities($_REQUEST['notes'], ENT_QUOTES, "UTF-8"));
    // checks:
    if (strcmp($todo, '') == 0) {
        echo "Die Beschreibung darf nicht leer sein!";
        die;
    }
     if (!checkDateStr($due)) {
        $due = '';
    }
    $due   = (strcmp($due,   '') == 0) ? "NULL" : "'$due'";
    $notes = (strcmp($notes, '') == 0) ? "NULL" : "'".$notes."'";
    $todo  = "'".$todo."'";
    $sql = "UPDATE todo ".
            "SET description=$todo, ".
                "dueDate=$due, ".
                "priority=$priority, ".
                "notes=$notes ".
            "WHERE id=$id";
//    echo $sql;
    $returnVal = $db->query($sql);
    if ($returnVal == FALSE) {
        echo $db->error;
    } else {
        echo $returnVal;
    }
    $db->close();
?>
