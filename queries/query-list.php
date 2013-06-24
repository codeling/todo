 <?php
	require("db.php");
	require("reactivate.php");

	$list_id = (int)$_POST["id"];
	$sql = "SELECT id, description as todo, dueDate as due, priority, effort, ".
		"completed, notes, project, list_id, version, recurrenceMode, completionDate, ".
		"creationDate ".
		"FROM todo ".
		"WHERE ".
			"list_id = ".$list_id." AND (".
			"completed=0 ".
			"OR completionDate > (UTC_TIMESTAMP() - INTERVAL 31 DAY))";
	$result = jsonQueryResults($db, $sql);
	$db->close();
	echo $result;
?>
