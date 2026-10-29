<?php
// (makes failRequest() answer with JSON, see response.php)
const TODO_API_REQUEST = true;
require("db.php");
$db = todoDb();
$list_id=(int)(isset($_GET["list_id"]) ? $_GET["list_id"] : 0);
requireOwnList($db, $list_id);
$sql = "SELECT id, name, COUNT(todo_id) AS tagCount FROM tags t ".
    "LEFT JOIN todo_tags r ON t.id=r.tag_id ".
	"WHERE EXISTS (SELECT 1 FROM todo i WHERE r.todo_id=i.id AND i.list_id=?)".
    "GROUP BY t.id ".
    "ORDER BY tagCount DESC";
sendJson(jsonQueryResults($db, $sql, array($list_id)));
