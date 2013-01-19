<?php
    $sql = "INSERT INTO todo ".
		    "(creationDate, description, priority, completed, ".
			"dueDate, notes, project, version, recurrenceMode) ".
	    "SELECT NOW() as creationDate, description, priority, 0 as completed, ".
		    "date_add(completionDate, INTERVAL recurrenceMode DAY) as dueDate, ".
			"notes, project, 1 as version, recurrenceMode FROM reviving;";
	$qResult = dbQueryOrDie($db, $sql) ;
	$sql = "INSERT INTO recurringCopied (todo_id, copiedDate) SELECT id, NOW() FROM reviving";
	$qResult = dbQueryOrDie($db, $sql) ;
