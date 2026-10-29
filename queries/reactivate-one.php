<?php
    require(__DIR__."/endpoint.php");
    require("recurrence.php");
    $db = todoDb();
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    if (!reactivateOne($db, $id)) {
        rejectRequest("REACTIVATION_NOT_POSSIBLE");
    }
    echo TodoLang::_("REACTIVATED_ENTRY");
