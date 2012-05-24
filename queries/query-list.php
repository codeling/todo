 <?php
    require("db.php");
	require("reactivate.php");

    $sql = "SELECT id, description as todo, dueDate as due, priority, effort, ".
            "completed, notes, project, version, recurrenceMode, completionDate, ".
			"creationDate ".
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
