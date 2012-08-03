<?php
    $db = new mysqli("localhost", "todo", "UwxhNGPBjB3u9KbV", "todo");

	function dbQueryOrDie($db, $sql) {
	    $qResult = $db->query($sql);
		if ($qResult == FALSE) {
		    echo $db->error;
			die;
		}
		return $qResult;
	}

?>
