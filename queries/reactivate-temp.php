<?php
$sql = "SELECT UTC_TIMESTAMP()";
$qResult = dbQueryOrDie($db, $sql);
$creationDate = $qResult->fetch_array()[0];
$sql = "SELECT id, description, ".
        "date_add(completionDate, INTERVAL 0.8*recurrenceMode DAY) as newStartDate, ".
        "date_add(completionDate, INTERVAL recurrenceMode DAY) as newDueDate, ".
        "notes, recurrenceMode, list_id FROM reviving;";
$qResult = dbQueryOrDie($db, $sql);
while ($toReactivate = $qResult->fetch_object())
{
    $sql = "INSERT INTO todo ".
            "(creationDate, description, startDate, completed, ".
            "dueDate, notes, version, recurrenceMode, list_id) ".
            "VALUES (".
            "'".$creationDate."', ".
            "'".$toReactivate->description."', ".
            $toReactivate->startDate.", ".
            "0, ".   // complated
            "'".$toReactivate->newDueDate."', ".
            "'".$toReactivate->notes."', ".
            "1, ".   // version
                $toReactivate->recurrenceMode.", ".
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
