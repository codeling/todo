 <?php
    require("db.php");
    $sql = "SELECT id, description as todo, dueDate as due, priority, completed, notes ".
           "FROM todo WHERE completed=0 ".
           "OR completionDate > (NOW() - INTERVAL 31 DAY) ".
           "ORDER BY completed ASC, priority DESC";
    $qResult = $db->query($sql);
    if ($qResult == FALSE)
    {
        echo $db->error;
        die;
    }
    $allResults = array();
    while ($stuff = $qResult->fetch_object())
    {
        $allResults[] = $stuff;
    }
    $db->close();
    echo json_encode($allResults);
?>
