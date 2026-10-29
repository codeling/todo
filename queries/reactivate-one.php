<?php
    require(__DIR__."/endpoint.php");
    require("recurrence.php");
    $db = todoDb();
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    if (!reactivateOne($db, $id)) {
        rejectRequest(409, "REACTIVATION_NOT_POSSIBLE");
    }
    sendOk(array('message' => TodoLang::_("REACTIVATED_ENTRY")));
