<?php
require("db.php");
$list_id=(int)$_GET["list_id"];
requireOwnList($db, $list_id);
$sql = "SELECT id, name, COUNT(todo_id) AS tagCount FROM tags t ".
    "LEFT JOIN todo_tags r ON t.id=r.tag_id ".
	"WHERE EXISTS (SELECT 1 FROM todo i WHERE r.todo_id=i.id AND i.list_id=?)".
    "GROUP BY t.id ".
    "ORDER BY tagCount DESC";
$qResult = dbExec($db, $sql, array($list_id))->get_result();
$allResults = array();
while ($stuff = $qResult->fetch_object())
{
    $allResults[] = $stuff;
}
$db->close();
sendJson(json_encode($allResults));
