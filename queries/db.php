<?php
    $db = new mysqli("localhost", "root", "g9NgU4CVsd30pLW2", "todo");

	function dbQueryOrDie($db, $sql) {
	    $qResult = $db->query($sql);
		if ($qResult == FALSE) {
		    echo $db->error;
			die;
		}
		return $qResult;
	}

?>
