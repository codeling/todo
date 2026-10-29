<?php
    require(__DIR__."/endpoint.php");
    $id = (int)postParam('id');
    requireOwnTag($db, $id);
    $db->begin_transaction();
    $deletedAssignments = dbExec($db, "DELETE FROM todo_tags WHERE tag_id=?", array($id))->affected_rows;
    $affectedRows = dbExec($db, "DELETE FROM tags WHERE id=?", array($id))->affected_rows;
    $db->commit();
    requireSingleRow($affectedRows, "NO_ROWS_AFFECTED", "MORE_THAN_ONE_TAG_AFFECTED");
    echo $deletedAssignments;
