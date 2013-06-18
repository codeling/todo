<?php
    require("db.php");
    require("date.php");
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    $effort   = (int)$_REQUEST['effort'];
    $list_id  = (int)$_REQUEST['list_id'];
    $project = $db->real_escape_string(htmlentities($_REQUEST['project'], ENT_QUOTES, "UTF-8"));
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
    $project = "'".$project."'";
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, priority, effort, notes, project, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), $todo, $due, $priority, $effort, NULL, $project, $list_id)";
    dbQueryOrDie($db, $sql);
    echo $db->insert_id;
    $db->close();
?>
