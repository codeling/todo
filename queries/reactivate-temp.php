<?php
require_once(__DIR__."/recurrence.php");
// copies all entries in the temporary table "reviving" as new, not completed entries;
// all values are copied inside the database, so they never become part of an SQL string
$creationDate = dbQueryOrDie($db, "SELECT UTC_TIMESTAMP()")->fetch_array()[0];
$qResult = dbQueryOrDie($db, "SELECT id FROM reviving");
while ($toReactivate = $qResult->fetch_object())
{
    // new due date: recurrence interval after completion (anchor 0) or after due date (anchor 1);
    // start date keeps its distance to the due date (or equals the due date if there is none)
    $nextDue = recurrenceNextSql("IF(recurrenceAnchor=0, completionDate, dueDate)");
    dbExec($db, "INSERT INTO todo ".
            "(creationDate, description, startDate, completed, ".
            "dueDate, notes, version, recurrenceMode, recurrenceInterval, recurrenceAnchor, list_id) ".
        "SELECT ?, description, ".
            "COALESCE(DATE_SUB(".$nextDue.", INTERVAL DATEDIFF(dueDate, startDate) DAY), ".$nextDue."), ".
            "0, ".   // completed
            $nextDue.", ".
            "notes, ".
            "1, ".   // version
            "recurrenceMode, recurrenceInterval, recurrenceAnchor, list_id ".
        "FROM reviving WHERE id=?",
        array($creationDate, $toReactivate->id));

    $newId = $db->insert_id;
    dbExec($db, "INSERT INTO todo_tags(todo_id, tag_id) ".
            "SELECT ?, tag_id FROM todo_tags WHERE todo_id=?",
        array($newId, $toReactivate->id));

    dbExec($db, "INSERT INTO recurringCopied (todo_id, copiedDate) VALUES (?, ?)",
        array($toReactivate->id, $creationDate));
}
