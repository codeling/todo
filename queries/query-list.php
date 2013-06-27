 <?php
	require("db.php");
	require("reactivate.php");

	$list_id = (int)$_POST["id"];
	$sql = "SELECT todo.id, description as todo, dueDate as due, priority, effort, ".
		"completed, notes, list_id, version, recurrenceMode, completionDate, ".
		"creationDate, ".
		"GROUP_CONCAT( DISTINCT name ORDER BY name SEPARATOR ',') as project ".
		"FROM todo ".
		"LEFT OUTER JOIN todo_tags ON todo.id = todo_tags.todo_id ".
		"LEFT OUTER JOIN tags ON todo_tags.tag_id = tags.id ".
		"WHERE ".
			"list_id = ".$list_id." AND (".
			"completed=0 ".
			"OR completionDate > (UTC_TIMESTAMP() - INTERVAL 31 DAY))".
		"GROUP BY todo.id";
	$result = jsonQueryResults($db, $sql);
	$db->close();
	echo $result;
?>
