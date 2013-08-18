<?php
    $sql = "SELECT UTC_TIMESTAMP()";
    $qResult = dbQueryOrDie($db, $sql);
    $creationDate = $qResult->fetch_array()[0];
    $sql = "INSERT INTO todo ".
            "(creationDate, description, priority, completed, ".
            "dueDate, notes, version, recurrenceMode, user_id) ".
        "SELECT '$creationDate' as creationDate, description, priority, 0 as completed, ".
            "date_add(completionDate, INTERVAL recurrenceMode DAY) as dueDate, ".
            "notes, 1 as version, recurrenceMode, user_id FROM reviving;";
    $qResult = dbQueryOrDie($db, $sql) ;
    $sql = "INSERT INTO recurringCopied (todo_id, copiedDate) SELECT id, '$creationDate' FROM reviving";
    $qResult = dbQueryOrDie($db, $sql) ;
    /*
    TODO: copy tags to new items as well!
    Problem:
        - We don't have the IDs of the newly created items
        - Even if we had those IDs#, We can't easily match the tags of the old items to the new IDs

    $sql = "INSERT INTO todo_tags (todo_id, tag_id) SELECT , tag_id FROM todo_tags t2 WHERE t2.todo_id in (SELECT id FROM reviving)";
    $qResult = dbQueryOrDie($db, $sql) ;
    */
