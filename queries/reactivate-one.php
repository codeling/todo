<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)postParam('id');
    // recurring events reactivation
    // for one specific event
    $sql = "CREATE TEMPORARY TABLE reviving AS ".
            "SELECT * FROM todo t WHERE completed=1 AND ".
            "recurrenceMode != 0 AND ".
            "t.id=? AND ".
            "NOT EXISTS (SELECT 1 FROM recurringCopied r WHERE r.todo_id=t.id)";
    $affectedRows = dbExec($db, $sql, array($id))->affected_rows;
    if ($affectedRows < 1) {
        echo "Either item is not completed, not recurring, or there is already a reactivated entry!";
    } else if ($affectedRows > 1) {
        echo "Schwerwiegender Applikationslogik-Fehler: Mehr als einen Eintrag verändert!";
    } else {
        echo "Reactivated entry...";
        require("reactivate-temp.php");
    }
