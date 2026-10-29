<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    require("todo-input.php");
    require("tags.php");
    require("recurrence.php");
    $id       = (int)postParam('id');
    $todo     = postParam('todo');
    $due      = postParam('due');
    $start    = postParam('start');
    $effort   = (int)postParam('effort');
    $notes    = postParam('notes');
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
    // limit of the database column, counted in characters:
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
    $affectedRows = withTransaction($db, function () use ($db, $sql, $id, $todo, $due, $start, $effort,
        $notes, $version, $recurrenceMode, $recurrenceInterval, $recurrenceAnchor, $list_id, $tags) {
        $affectedRows = dbExec($db, $sql, array($todo,
            ($due == '') ? NULL : $due,
            ($start == '') ? NULL : $start,
            $effort,
            ($notes == '') ? NULL : $notes,
            $version+1, $recurrenceMode, $recurrenceInterval, $recurrenceAnchor, $list_id,
            $id, $version))->affected_rows;
        // after a version conflict nothing was changed, the tags stay as well
        if ($affectedRows == 1) {
            updateTags($db, $id, $tags);
        }
        return $affectedRows;
    });
    requireSingleRow($affectedRows, "VERSION_CONFLICT", "MORE_THAN_ONE_ENTRY_CHANGED");
    echo 1;
