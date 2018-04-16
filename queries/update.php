<?php
    require("db.php");
    require("date.php");
    require("tags.php");
    $id       = (int)$_REQUEST['id'];
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $start    = $db->real_escape_string(htmlentities($_REQUEST['start'], ENT_QUOTES, "UTF-8"));
    $effort   = (int)$_REQUEST['effort'];
    $notes    = $db->real_escape_string(htmlentities($_REQUEST['notes'], ENT_QUOTES, "UTF-8"));
    $tags     = explode(",", $_REQUEST['tags']);
    $version  = (int)$_REQUEST['version'];
    $recurrenceMode = (int)$_REQUEST['recurrenceMode'];
    $recurrenceAnchor = (int)$_REQUEST['recurrenceAnchor'];
    $list_id  = (int)$_REQUEST['list_id'];
    if (strcmp($todo, '') == 0) {
        echo "Die Beschreibung darf nicht leer sein!";
        die;
    }
     if (!checkDateStr($due)) {
        $due = '';
    }
    $due   = (strcmp($due,   '') == 0) ? "NULL" : "'$due'";
    $notes = (strcmp($notes, '') == 0) ? "NULL" : "'".$notes."'";
    $start = (strcmp($start, '') == 0) ? "NULL" : "'$start'";
    $todo  = "'".$todo."'";
    $sql = "UPDATE todo ".
            "SET description=$todo, ".
                "dueDate=$due, ".
                "startDate=$start, ".
                "effort=$effort, ".
                "notes=$notes, ".
                "version=".($version+1).", ".
                "recurrenceMode=".$recurrenceMode.", ".
                "recurrenceAnchor=".$recurrenceAnchor.", ".
                "list_id=$list_id ".
            "WHERE id=$id AND version=$version";
    dbQueryOrDie($db, $sql);

    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo "In der Datenbank ist eine andere Version gespeichert als du gesendet hast. Es scheint so als wäre der Eintrag in der Zwischenzeit verändert worden! Bitte lade die Einträge neu!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
        updateTags($db, $id, $tags);
        echo $affectedRows;
    }
    $db->close();
