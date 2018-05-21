<?php
$sql = "SELECT UTC_TIMESTAMP()";
$qResult = dbQueryOrDie($db, $sql);
$creationDate = $qResult->fetch_array()[0];
$sql = "SELECT id, description, ".
        "date_add(completionDate, INTERVAL recurrenceMode DAY) as newDueDate1, ".
        "date_add(dueDate, INTERVAL recurrenceMode DAY) as newDueDate2, ".
        "date_sub((SELECT newDueDate1), INTERVAL datediff(dueDate, startDate) DAY) as newStartDate1, ".
        "date_sub((SELECT newDueDate2), INTERVAL datediff(dueDate, startDate) DAY) as newStartDate2, ".
        "notes, recurrenceMode, recurrenceAnchor, list_id FROM reviving;";
$qResult = dbQueryOrDie($db, $sql);
while ($toReactivate = $qResult->fetch_object())
{
    $sql = "INSERT INTO todo ".
            "(creationDate, description, startDate, completed, ".
            "dueDate, notes, version, recurrenceMode, recurrenceAnchor, list_id) ".
            "VALUES (".
            "'".$creationDate."', ".
            "'".$toReactivate->description."', ".
            "'".((((int)$toReactivate->recurrenceAnchor)==0)?$toReactivate->newStartDate1:$toReactivate->newStartDate2)."', ".
            "0, ".   // completed
            "'".((((int)$toReactivate->recurrenceAnchor)==0)?$toReactivate->newDueDate1:$toReactivate->newDueDate2)."', ".
            "'".$toReactivate->notes."', ".
            "1, ".   // version
            $toReactivate->recurrenceMode.", ".
            $toReactivate->recurrenceAnchor.", ".
            $toReactivate->list_id.")";
    dbQueryOrDie($db, $sql) ;

    $newId = $db->insert_id;
    $sql = "INSERT INTO todo_tags(todo_id, tag_id) ".
            "SELECT $newId, tag_id FROM todo_tags ".
            "WHERE todo_id=".$toReactivate->id;
    dbQueryOrDie($db, $sql) ;

    $sql = "INSERT INTO recurringCopied (todo_id, copiedDate) ".
            "VALUES (".$toReactivate->id.", ".
            "'".$creationDate."')";
    dbQueryOrDie($db, $sql) ;
}
