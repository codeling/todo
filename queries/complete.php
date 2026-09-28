<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)$_POST['id'];
    $completed = ((int)$_POST['completed'] == 1) ? 1 : 0;
    $version   = (int)$_POST['version'];
    $stmt = dbExec($db, "UPDATE todo SET completed=?, ".
        "completionDate=IF(?=1, UTC_TIMESTAMP(), NULL), version=?+1 WHERE id=? AND version=?",
        array($completed, $completed, $version, $id, $version));
    $affectedRows = $stmt->affected_rows;
    if ($affectedRows < 1) {
        echo "In der Datenbank ist eine andere Version gespeichert als du gesendet hast. Es scheint so als wäre der Eintrag in der Zwischenzeit verändert worden! Bitte lade die Einträge neu!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
        echo $affectedRows;
    }
    $db->close();
