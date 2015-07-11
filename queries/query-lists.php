<?php
require("db.php");
$user_id = 0;
$sql = "SELECT id, name FROM list WHERE user_id=$user_id";
$qResult = dbQueryOrDie($db, $sql);
$allResults = array();
while ($stuff = $qResult->fetch_object())
{
    $allResults[] = $stuff;
}
$db->close();
echo json_encode($allResults);
