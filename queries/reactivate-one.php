<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
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
    if ($affectedRows < 1) {
        echo TodoLang::_("REACTIVATION_NOT_POSSIBLE");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        echo TodoLang::_("REACTIVATED_ENTRY");
        require("reactivate-temp.php");
    }
