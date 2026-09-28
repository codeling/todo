<?php
    require("db.php");
    require("date.php");
    require("tags.php");
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $start    = $db->real_escape_string(htmlentities($_REQUEST['start'], ENT_QUOTES, "UTF-8"));
    $tags = explode(",", $_REQUEST['tags']);
    // checks (empty dates are allowed: start defaults to today, due stays empty):
    if ($due != '' && !checkDateStr($due)) {
        echo TodoLang::_("INVALID_DUE_DATE");
        die;
    }
    if ($start != '' && !checkDateStr($start)) {
        echo TodoLang::_("INVALID_START_DATE");
        die;
    }
    if ($due != '' && $start != '' && convertStrToDate($due) < convertStrToDate($start))
    {
        echo TodoLang::_("DUE_BEFORE_START");
        die;
    }
    if ($todo == '') {
        echo TodoLang::_("TODO_MAY_NOT_BE_EMPTY");
        die;
    }
    $todo  = "'".$todo."'";
    $due   = (strcmp($due, '') == 0) ? "NULL" : "'$due'";
    $start = (strcmp($start, '') == 0) ? "UTC_DATE()" : "'$start'";
    $list_id = (int)$_REQUEST['list_id'];
    requireOwnList($db, $list_id);
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, startDate, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), $todo, $due, $start, 1, NULL, $list_id)";
    dbQueryOrDie($db, $sql);
    $todo_id = $db->insert_id;
    updateTags($db, $todo_id, $tags);
    echo $todo_id;
    $db->close();
