<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    require("date.php");
    require("tags.php");
    $id       = (int)postParam('id');
    $todo     = encodeInput(postParam('todo'));
    $due      = postParam('due');
    $start    = postParam('start');
    $effort   = (int)postParam('effort');
    $notes    = encodeInput(postParam('notes'));
    $tags     = explode(",", postParam('tags'));
    $version  = (int)postParam('version');
    $recurrenceMode = (int)postParam('recurrenceMode');
    $recurrenceAnchor = (int)postParam('recurrenceAnchor');
    $list_id  = (int)postParam('list_id');
    requireOwnTodo($db, $id);
    requireOwnList($db, $list_id);
    if (strcmp($todo, '') == 0) {
        echo TodoLang::_("TODO_MAY_NOT_BE_EMPTY");
        die;
    }
    // empty dates are allowed:
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
    if ($effort < 0 || $effort > 9999) {
        echo TodoLang::_("INVALID_EFFORT");
        die;
    }
    // recurrence interval in days, at most 10 years:
    if ($recurrenceMode < 0 || $recurrenceMode > 3650) {
        echo TodoLang::_("INVALID_RECURRENCE_MODE");
        die;
    }
    if ($recurrenceAnchor != 0 && $recurrenceAnchor != 1) {
        echo TodoLang::_("INVALID_RECURRENCE_ANCHOR");
        die;
    }
    $sql = "UPDATE todo ".
            "SET description=?, ".
                "dueDate=?, ".
                "startDate=?, ".
                "effort=?, ".
                "notes=?, ".
                "version=?, ".
                "recurrenceMode=?, ".
                "recurrenceAnchor=?, ".
                "list_id=? ".
            "WHERE id=? AND version=?";
    $stmt = dbExec($db, $sql, array($todo,
        ($due == '') ? NULL : $due,
        ($start == '') ? NULL : $start,
        $effort,
        ($notes == '') ? NULL : $notes,
        $version+1, $recurrenceMode, $recurrenceAnchor, $list_id,
        $id, $version));

    $affectedRows = $stmt->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("VERSION_CONFLICT");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        updateTags($db, $id, $tags);
        echo $affectedRows;
    }
    $db->close();
