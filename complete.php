<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    $completed = (int)$_REQUEST['completed'];
    $version   = (int)$_REQUEST['version'];
    $result = $db->query("UPDATE todo SET completed=$completed, completionDate=NOW(), version=$version+1 WHERE id=$id AND version=$version");
    if ($result == FALSE) {
        echo $db->error;
        die;
    }
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
