<?php
    require("db.php");
    require("date.php");
    $id = (int)$_REQUEST['id'];
    $todo = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    if (!checkDateStr($due))
    {
        $due = '';
    }
    if (strcmp($todo, '') == 0)
    {
        echo "Die Beschreibung darf nicht leer sein!";
        die;
    }
    $priority = (int)$_REQUEST['priority'];
    $notes    = (strcmp($_REQUEST['notes'], 'null')==0) ? "NULL" :
        "'".$db->real_escape_string(htmlentities($_REQUEST['notes'], ENT_QUOTES, "UTF-8"))."'";
    // ech ("isNull: ".((strcmp($_REQUEST['notes'], 'null')==0)?"true":"false")." notes=".$_REQUEST['notes']);
    $sql = "UPDATE todo ".
            "SET description='$todo', ".
                "dueDate=".((strcmp($due, '') == 0)?"NULL":"'$due'").", ".
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
