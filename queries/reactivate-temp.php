<?php
$sql = "SELECT UTC_TIMESTAMP()";
$qResult = dbQueryOrDie($db, $sql);
$creationDate = $qResult->fetch_array()[0];
$sql = "SELECT id, description, priority, ".
        "date_add(completionDate, INTERVAL recurrenceMode DAY) as newDueDate, ".
        "notes, recurrenceMode, user_id FROM reviving;";
$qResult = dbQueryOrDie($db, $sql);
while ($toReactivate = $qResult->fetch_object())
{
    $sql = "INSERT INTO todo ".
            "(creationDate, description, priority, completed, ".
            "dueDate, notes, version, recurrenceMode, user_id) ".
            "VALUES (".
            "'".$creationDate."', ".
            "'".$toReactivate->description."', ".
            $toReactivate->priority.", ".
            "0, ".   // complated
            "'".$toReactivate->newDueDate."', ".
            "'".$toReactivate->notes."', ".
            "1, ".   // version
                $toReactivate->recurrenceMode.", ".
                $toReactivate->user_id.")";
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
