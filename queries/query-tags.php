<?php
require("db.php");
$sql = "SELECT id, name, COUNT(todo_id) AS tagCount FROM tags t ".
    "LEFT JOIN todo_tags r ON t.id=r.tag_id ".
    "GROUP BY t.id ".
    "ORDER BY tagCount DESC";
$qResult = dbQueryOrDie($db, $sql);
$allResults = array();
while ($stuff = $qResult->fetch_object())
{
    $allResults[] = $stuff;
}
$db->close();
echo json_encode($allResults);
