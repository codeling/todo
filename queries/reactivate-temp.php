<?php
    $sql = "INSERT INTO todo ".
		    "(creationDate, description, priority, completed, ".
			"dueDate, notes, version, recurrenceMode, user_id) ".
	    "SELECT UTC_TIMESTAMP() as creationDate, description, priority, 0 as completed, ".
		    "date_add(completionDate, INTERVAL recurrenceMode DAY) as dueDate, ".
			"notes, 1 as version, recurrenceMode, user_id FROM reviving;";
	$qResult = dbQueryOrDie($db, $sql) ;
	$sql = "INSERT INTO recurringCopied (todo_id, copiedDate) SELECT id, UTC_TIMESTAMP() FROM reviving";
	$qResult = dbQueryOrDie($db, $sql) ;
	// TODO: also copy tag entries!
