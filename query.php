 <?php
    require("db.php");
    $sql = "UPDATE todo SET completed=0, dueDate=date_add(completionDate, INTERVAL recurrenceMode DAY) WHERE ".
        "recurrenceMode != 0 AND completionDate < (NOW() - INTERVAL 3*recurrenceMode/4 DAY)";
    $qResult = dbQueryOrDie($db, $sql);

    $sql = "SELECT id, description as todo, dueDate as due, priority, ".
            "completed, notes, project, version, recurrenceMode ".
           "FROM todo WHERE completed=0 ".
           "OR completionDate > (NOW() - INTERVAL 31 DAY)";
    $qResult = dbQueryOrDie($db, $sql);
    $allResults = array();
    while ($stuff = $qResult->fetch_object())
    {
        $allResults[] = $stuff;
    }
    $db->close();
    echo json_encode($allResults);
?>
