<?php
    // recurring events reactivation
    // currently called from query.php
    // would theoretically be enough to do this once per day or so:
    require_once(__DIR__."/recurrence.php");
    $sql = "CREATE TEMPORARY TABLE reviving AS ".
            "SELECT * FROM todo t WHERE completed=1 and ".
            "recurrenceMode != 0 AND ((".
            "recurrenceAnchor = 0 AND ".
            "DATEDIFF(".recurrenceNextSql("completionDate").", UTC_DATE()) ".
                "< GREATEST(DATEDIFF(dueDate, startDate), 4) ".
            ") OR (".
            "recurrenceAnchor = 1 AND ".
            "DATEDIFF(".recurrenceNextSql("dueDate").", UTC_DATE()) ".
                "< GREATEST(DATEDIFF(dueDate, startDate), 4) ".
            ")) AND NOT EXISTS (SELECT 1 FROM recurringCopied r WHERE r.todo_id=t.id);";
    $qResult = dbQueryOrDie($db, $sql);
    require("reactivate-temp.php");
