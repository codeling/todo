<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    $completed = (int)$_REQUEST['completed'];
    $version   = (int)$_REQUEST['version'];
    dbQueryOrDie($db, "UPDATE todo SET completed=$completed, completionDate=NOW(), version=$version+1 WHERE id=$id AND version=$version");
    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo "In der Datenbank ist eine andere Version gespeichert als du gesendet hast. Es scheint so als wäre der Eintrag in der Zwischenzeit verändert worden! Bitte lade die Einträge neu!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
	    // handle recurring items: insert or delete from recurringCompletionHistory
        $sql = "SELECT recurrenceMode, completionDate FROM todo WHERE id=$id";
        $qResult = dbQueryOrDie($db, $sql);
        if ($item = $qResult->fetch_object())
        {
            if ((int)$item->recurrenceMode > 0)
            {
                if ($completed != 0) {
                    $sql = "INSERT INTO recurringCompletionHistory (todo_id, completionDate) VALUES ($id, '$item->completionDate')";
                    dbQueryOrDie($db, $sql);
                } else {
                    $sql = "SELECT MAX(completionDate) as maxDate FROM recurringCompletionHistory WHERE todo_id=$id";
                    $qResult = dbQueryOrDie($db, $sql);
                    if ($item = $qResult->fetch_object())
                    {
                        $sql = "DELETE FROM recurringCompletionHistory WHERE todo_id=$id AND ".
                            "completionDate='$item->maxDate'";
                        dbQueryOrDie($db, $sql);
                    } else {
                        echo "Couldn't fetch maximum completionDate for recurring todo, although there should be one!";
                    }
                }
            }
        } else {
            echo "Couldn't fetch recurrenceMode for current todo, but it should definitely exist!";
        }
        echo $affectedRows;
    }
    $db->close();
?>
