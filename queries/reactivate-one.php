<?php
    require(__DIR__."/endpoint.php");
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    // recurring events reactivation
    // for one specific event
    $sql = "CREATE TEMPORARY TABLE reviving AS ".
            "SELECT * FROM todo t WHERE completed=1 AND ".
            "recurrenceMode != 0 AND ".
            "t.id=? AND ".
            "NOT EXISTS (SELECT 1 FROM recurringCopied r WHERE r.todo_id=t.id)";
    $affectedRows = dbExec($db, $sql, array($id))->affected_rows;
    requireSingleRow($affectedRows, "REACTIVATION_NOT_POSSIBLE", "MORE_THAN_ONE_ENTRY_CHANGED");
    echo TodoLang::_("REACTIVATED_ENTRY");
    require("reactivate-temp.php");
