<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    $id = (int)postParam('id');
    requireOwnTag($db, $id);
    list($deletedAssignments, $affectedRows) = withTransaction($db, function () use ($db, $id) {
        $deletedAssignments = dbExec($db, "DELETE FROM todo_tags WHERE tag_id=?", array($id))->affected_rows;
        $affectedRows = dbExec($db, "DELETE FROM tags WHERE id=?", array($id))->affected_rows;
        return array($deletedAssignments, $affectedRows);
    });
    requireSingleRow($affectedRows, "NO_ROWS_AFFECTED", "MORE_THAN_ONE_TAG_AFFECTED");
    sendOk(array('deleted' => (int)$deletedAssignments));
