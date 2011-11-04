 <?php
    require("db.php");
    $sql = "SELECT id, description as todo, dueDate as due, priority, completed FROM todo WHERE completed=0 ORDER BY priority DESC";
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
