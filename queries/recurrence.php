<?php
// recurrenceMode is the unit (0 = no recurrence), recurrenceInterval the number of units
const RECURRENCE_UNITS = array(1 => 'DAY', 2 => 'WEEK', 3 => 'MONTH', 4 => 'YEAR');
const MAX_RECURRENCE_INTERVAL = 999;

// SQL expression: $baseExpr plus the recurrence interval of the todo row
function recurrenceNextSql($baseExpr)
{
    // a day (start and due date are dates; the base may be a date and time)
    $sql = "DATE(CASE recurrenceMode ";
    foreach (RECURRENCE_UNITS as $mode => $unit) {
        $sql .= "WHEN ".$mode." THEN DATE_ADD(".$baseExpr.", INTERVAL recurrenceInterval ".$unit.") ";
    }
    return $sql."END)";
}

// Copies the completed recurring entries of the user which are due as new, not completed entries
// (the lists of the user only). Would theoretically be enough to do once per day or so; called by
// reactivate-due.php (a POST request, as it modifies data).
function reactivateDue($db, $userId)
{
    $creationDate = dbQuery($db, "SELECT UTC_TIMESTAMP()")->fetch_array()[0];
    // due: the next occurrence is less than the duration of the entry (at least 4 days) away
    $sql = "SELECT t.id FROM todo t WHERE completed=1 AND ".
            "recurrenceMode != 0 AND ".
            "t.list_id IN (SELECT id FROM list WHERE user_id=?) AND ((".
            "recurrenceAnchor = 0 AND ".
            "DATEDIFF(".recurrenceNextSql("completionDate").", UTC_DATE()) ".
                "< GREATEST(DATEDIFF(dueDate, startDate), 4) ".
            ") OR (".
            "recurrenceAnchor = 1 AND ".
            "DATEDIFF(".recurrenceNextSql("dueDate").", UTC_DATE()) ".
                "< GREATEST(DATEDIFF(dueDate, startDate), 4) ".
            ")) AND NOT EXISTS (SELECT 1 FROM recurringCopied r WHERE r.todo_id=t.id)";
    $qResult = dbExec($db, $sql, array((int)$userId))->get_result();
    while ($toReactivate = $qResult->fetch_object())
    {
        copyRecurringEntry($db, $toReactivate->id, $creationDate);
    }
}

// Copies one completed recurring entry as new, not completed entry (the caller checks that it
// belongs to the user); false if that is not possible: it is not completed, not recurring or was
// copied already.
function reactivateOne($db, $id)
{
    $creationDate = dbQuery($db, "SELECT UTC_TIMESTAMP()")->fetch_array()[0];
    return copyRecurringEntry($db, $id, $creationDate);
}

// Copies the entry as new, not completed entry which was created at $creationDate, with its tags;
// false if it does not qualify (not completed, not recurring) or another request copied it first.
// All values are copied inside the database, so they never become part of an SQL string.
function copyRecurringEntry($db, $id, $creationDate)
{
    return withTransaction($db, function () use ($db, $id, $creationDate) {
        // claim the entry first: if several requests run at the same time,
        // only one of them gets to copy it
        $claimed = dbExec($db, "INSERT IGNORE INTO recurringCopied (todo_id, copiedDate) VALUES (?, ?)",
            array($id, $creationDate))->affected_rows;
        if ($claimed < 1) {
            $db->rollback();
            return false;
        }
        // new due date: recurrence interval after completion (anchor 0) or after due date (anchor 1);
        // start date keeps its distance to the due date (or equals the due date if there is none)
        $nextDue = recurrenceNextSql("IF(recurrenceAnchor=0, completionDate, dueDate)");
        $copied = dbExec($db, "INSERT INTO todo ".
                "(creationDate, description, startDate, completed, ".
                "dueDate, notes, version, recurrenceMode, recurrenceInterval, recurrenceAnchor, list_id) ".
            "SELECT ?, description, ".
                "COALESCE(DATE_SUB(".$nextDue.", INTERVAL DATEDIFF(dueDate, startDate) DAY), ".$nextDue."), ".
                "0, ".   // completed
                $nextDue.", ".
                "notes, ".
                "1, ".   // version
                "recurrenceMode, recurrenceInterval, recurrenceAnchor, list_id ".
            "FROM todo WHERE id=? AND completed=1 AND recurrenceMode != 0",
            array($creationDate, $id))->affected_rows;
        if ($copied < 1) {
            // (no longer) a completed recurring entry: it must not be marked as copied
            $db->rollback();
            return false;
        }
        $newId = $db->insert_id;
        dbExec($db, "INSERT INTO todo_tags(todo_id, tag_id) ".
                "SELECT ?, tag_id FROM todo_tags WHERE todo_id=?",
            array($newId, $id));
        return true;
    });
}
