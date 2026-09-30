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
    $list_id = (int)postParam('list_id');
    requireOwnList($db, $list_id);
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
