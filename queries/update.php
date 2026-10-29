<?php
    require(__DIR__."/endpoint.php");
    require("todo-input.php");
    require("tags.php");
    require("recurrence.php");
    $id       = (int)postParam('id');
    $todo     = encodeInput(postParam('todo'));
    $due      = postParam('due');
    $start    = postParam('start');
    $effort   = (int)postParam('effort');
    $notes    = encodeInput(postParam('notes'));
    $tags     = parseTags(postParam('tags'));
    $version  = (int)postParam('version');
    $recurrenceMode = (int)postParam('recurrenceMode');
    $recurrenceInterval = (int)postParam('recurrenceInterval');
    $recurrenceAnchor = (int)postParam('recurrenceAnchor');
    $list_id  = (int)postParam('list_id');
    requireOwnTodo($db, $id);
    requireOwnList($db, $list_id);
    $inputError = todoInputError($todo, $start, $due, $tags);
    if ($inputError !== null) {
        rejectRequest($inputError);
    }
    // limit of the database column, counted after HTML-encoding (what is stored):
    if (charLength($notes) > MAX_NOTES_LENGTH) {
        rejectRequest("NOTES_TOO_LONG");
    }
    if ($effort < 0 || $effort > 9999) {
        rejectRequest("INVALID_EFFORT");
    }
    if (!isset(RECURRENCE_UNITS[$recurrenceMode]) && $recurrenceMode != 0) {
        rejectRequest("INVALID_RECURRENCE_MODE");
    }
    if ($recurrenceInterval < 1 || $recurrenceInterval > MAX_RECURRENCE_INTERVAL) {
        rejectRequest("INVALID_RECURRENCE_INTERVAL");
    }
    if ($recurrenceAnchor != 0 && $recurrenceAnchor != 1) {
        rejectRequest("INVALID_RECURRENCE_ANCHOR");
    }
    $sql = "UPDATE todo ".
            "SET description=?, ".
                "dueDate=?, ".
                "startDate=?, ".
                "effort=?, ".
                "notes=?, ".
                "version=?, ".
                "recurrenceMode=?, ".
                "recurrenceInterval=?, ".
                "recurrenceAnchor=?, ".
                "list_id=? ".
            "WHERE id=? AND version=?";
    $stmt = dbExec($db, $sql, array($todo,
        ($due == '') ? NULL : $due,
        ($start == '') ? NULL : $start,
        $effort,
        ($notes == '') ? NULL : $notes,
        $version+1, $recurrenceMode, $recurrenceInterval, $recurrenceAnchor, $list_id,
        $id, $version));

    requireSingleRow($stmt->affected_rows, "VERSION_CONFLICT", "MORE_THAN_ONE_ENTRY_CHANGED");
    updateTags($db, $id, $tags);
    echo 1;
