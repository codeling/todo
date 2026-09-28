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
    if (strcmp($todo, '') == 0) {
        echo "Die Beschreibung darf nicht leer sein!";
        die;
    }
    // empty dates are allowed:
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
    if ($effort < 0 || $effort > 9999) {
        echo 'Invalid effort!';
        die;
    }
    // recurrence interval in days, at most 10 years:
    if ($recurrenceMode < 0 || $recurrenceMode > 3650) {
        echo 'Invalid recurrence mode!';
        die;
    }
    if ($recurrenceAnchor != 0 && $recurrenceAnchor != 1) {
        echo 'Invalid recurrence anchor!';
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
        echo "In der Datenbank ist eine andere Version gespeichert als du gesendet hast. Es scheint so als wäre der Eintrag in der Zwischenzeit verändert worden! Bitte lade die Einträge neu!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
        updateTags($db, $id, $tags);
        echo $affectedRows;
    }
    $db->close();
