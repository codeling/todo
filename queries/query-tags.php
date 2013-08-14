<?php
	require("db.php");

	$query = $db->real_escape_string($_REQUEST["q"]);
	$sql = "SELECT name FROM tags ".
		"WHERE name LIKE '%$query%'";
	$qResult = dbQueryOrDie($db, $sql);
	$allResults = array();
	while ($stuff = $qResult->fetch_object())
	{
		$allResults[] = $stuff->name;
	}
	$db->close();
	echo json_encode($allResults);
?>
