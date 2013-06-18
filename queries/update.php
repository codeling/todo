<?php
    require("db.php");
    require("date.php");
    $id       = (int)$_REQUEST['id'];
    $todo     = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due      = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    $effort   = (int)$_REQUEST['effort'];
    $notes    = $db->real_escape_string(htmlentities($_REQUEST['notes'], ENT_QUOTES, "UTF-8"));
    $project  = $db->real_escape_string(htmlentities($_REQUEST['project'], ENT_QUOTES, "UTF-8"));
    $list_id  = (int)$_REQUEST['list_id'];
    $version  = (int)$_REQUEST['version'];
    $recurrenceMode = (int)$_REQUEST['recurrenceMode'];
    if (strcmp($todo, '') == 0) {
        echo "Die Beschreibung darf nicht leer sein!";
        die;
    }
     if (!checkDateStr($due)) {
        $due = '';
    }
    $due   = (strcmp($due,   '') == 0) ? "NULL" : "'$due'";
    $notes = (strcmp($notes, '') == 0) ? "NULL" : "'".$notes."'";
    $todo  = "'".$todo."'";
    $project = (strcmp($project, '') == 0) ? "NULL" : "'".$project."'";
    $sql = "UPDATE todo ".
            "SET description=$todo, ".
                "dueDate=$due, ".
                "priority=$priority, ".
                "effort=$effort, ".
                "notes=$notes, ".
                "project=$project, ".
                "list_id=$list_id, ".
                "version=".($version+1).", ".
                "recurrenceMode=".$recurrenceMode." ".
            "WHERE id=$id AND version=$version";
    dbQueryOrDie($db, $sql);

    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo "In der Datenbank ist eine andere Version gespeichert als du gesendet hast. Es scheint so als wäre der Eintrag in der Zwischenzeit verändert worden! Bitte lade die Einträge neu!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
        echo $affectedRows;
    }
    $db->close();
?>
