<?php
    require("db.php");
    require("date.php");
    require("tags.php");
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $start    = $db->real_escape_string(htmlentities($_REQUEST['start'], ENT_QUOTES, "UTF-8"));
    $tags = explode(",", $_REQUEST['tags']);
    // checks:
    if (!checkDateStr($due)) {
		echo 'Invalid due date!';
		die;
    }
	if (!checkDateStr($start)) {
		echo 'Invalid start date!';
		die;
	}
	if (convertStrToDate($due) < convertStrToDate($start))
	{
		echo 'Due date is earlier than start date!';
		die;
	}
    if ($todo == '') {
        echo 'Die Beschreibung darf nicht leer sein!';
        die;
    }
    $todo  = "'".$todo."'";
    $due   = (strcmp($due, '') == 0) ? "NULL" : "'$due'";
    $start = (strcmp($start, '') == 0) ? "NULL" : "'$start'";
    $list_id = (int)$_REQUEST['list_id'];
    // TODO: check if given list_id belongs to logged in user!
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, startDate, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), $todo, $due, $start, 1, NULL, $list_id)";
    dbQueryOrDie($db, $sql);
    $todo_id = $db->insert_id;
    updateTags($db, $todo_id, $tags);
    echo $todo_id;
    $db->close();
