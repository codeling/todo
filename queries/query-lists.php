<?php
require("db.php");
$user_id = 0;
$qResult = dbExec($db, "SELECT id, name FROM list WHERE user_id=?", array($user_id))->get_result();
$allResults = array();
while ($stuff = $qResult->fetch_object())
{
    $allResults[] = $stuff;
}
$db->close();
echo json_encode($allResults);
