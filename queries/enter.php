<?php
    require("db.php");
    require("date.php");
    require("tags.php");
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    $effort   = (int)$_REQUEST['effort'];
    $list_id  = (int)$_REQUEST['list_id'];
    $tags = explode(",", $_REQUEST['project']);
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
            "(creationDate, description, dueDate, priority, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), $todo, $due, $priority, $effort, NULL, $list_id)";
    dbQueryOrDie($db, $sql);
    $todo_id = $db->insert_id;
    updateTags($db, $todo_id, $tags);
    echo $todo_id;
    $db->close();
?>
