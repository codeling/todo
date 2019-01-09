<?php
    // recurring events reactivation
    // currently called from query.php
    // would theoretically be enough to do this once per day or so:
    $sql = "CREATE TEMPORARY TABLE reviving AS ".
            "SELECT * FROM todo t WHERE completed=1 and ".
            "recurrenceMode != 0 AND ((".
            "recurrenceAnchor = 0 AND ".
            "DATEDIFF(".
                "DATE_ADD(".
                    "completionDate, ".
                    "INTERVAL recurrenceMode DAY".
                "),".
                "UTC_DATE()".
            ") < GREATEST(DATEDIFF(dueDate, startDate), 4) ".
			") OR (".
			"recurrenceAnchor = 1 AND ".
            "DATEDIFF(".
                "DATE_ADD(".
                    "dueDate, ".
                    "INTERVAL recurrenceMode DAY".
                "),".
                "UTC_DATE()".
            ") < GREATEST(DATEDIFF(dueDate, startDate), 4) ".
            ")) AND NOT EXISTS (SELECT 1 FROM recurringCopied r WHERE r.todo_id=t.id);";
    $qResult = dbQueryOrDie($db, $sql);
    require("reactivate-temp.php");
