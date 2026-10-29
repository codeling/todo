<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    $id = (int)postParam('id');
    requireOwnTodo($db, $id);
    $completed = ((int)postParam('completed') == 1) ? 1 : 0;
    $version   = (int)postParam('version');
    // deleted entries are neither completed nor reopened (deleted=0 in the UPDATE, as the
    // entry could be deleted between this check and the update)
    $deleted = dbExec($db, "SELECT 1 FROM todo WHERE id=? AND deleted=1", array($id))->get_result();
    if ($deleted->num_rows > 0) {
        rejectRequest(409, "ENTRY_DELETED");
    }
    $stmt = dbExec($db, "UPDATE todo SET completed=?, ".
        "completionDate=IF(?=1, UTC_TIMESTAMP(), NULL), version=?+1 WHERE id=? AND version=? AND deleted=0",
        array($completed, $completed, $version, $id, $version));
    requireSingleRow($stmt->affected_rows, "VERSION_CONFLICT", "MORE_THAN_ONE_ENTRY_CHANGED");
    sendOk(array('version' => $version + 1));
