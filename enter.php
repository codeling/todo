<?php
    require("db.php");
    require("date.php");
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    // checks:
    if (!checkDateStr($due)) {
        $due = '';
    } 
    if ($todo == '') {
        echo 'Die Beschreibung darf nicht leer sein!';
        die;
    }
    $todo = "'".$todo."'";
    $due  = (strcmp($due, '') == 0) ? "NULL" : "'$due'";
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, priority, notes) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), $todo, $due, $priority, NULL)";
    if ($db->query($sql) == FALSE) {
        echo $db->error;
    } else {
        echo $db->insert_id;
    }
    $db->close();
?>

