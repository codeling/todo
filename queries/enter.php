<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    require("date.php");
    require("tags.php");
    $todo     = encodeInput(postParam('todo'));
    $due      = postParam('due');
    $start    = postParam('start');
    $tags = explode(",", postParam('tags'));
    // checks (empty dates are allowed: start defaults to today, due stays empty):
    if ($due != '' && !checkDateStr($due)) {
        echo 'Invalid due date!';
        die;
    }
    if ($start != '' && !checkDateStr($start)) {
        echo 'Invalid start date!';
        die;
    }
    if ($due != '' && $start != '' && convertStrToDate($due) < convertStrToDate($start))
    {
        echo 'Due date is earlier than start date!';
        die;
    }
    if ($todo == '') {
        echo 'Die Beschreibung darf nicht leer sein!';
        die;
    }
    $list_id = (int)postParam('list_id');
    // TODO: check if given list_id belongs to logged in user!
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, startDate, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), ?, ?, COALESCE(?, UTC_DATE()), 1, NULL, ?)";
    dbExec($db, $sql, array($todo, ($due == '') ? NULL : $due,
        ($start == '') ? NULL : $start, $list_id));
    $todo_id = $db->insert_id;
    updateTags($db, $todo_id, $tags);
    echo $todo_id;
    $db->close();
