<?php
require("db.php");
$user_id = (int)$curUserID;
$qResult = dbExec($db, "SELECT id, name FROM list WHERE user_id=?", array($user_id))->get_result();
$allResults = array();
while ($stuff = $qResult->fetch_object())
{
    $allResults[] = $stuff;
}
$db->close();
sendJson(json_encode($allResults));
