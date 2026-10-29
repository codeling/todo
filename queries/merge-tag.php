<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    $id   = (int)postParam('id');
    $merge_id = (int)postParam('merge_id');
    if ($id < 1 || $merge_id < 1)
    {
        rejectRequest("INVALID_PARAMETERS");
    }
    // the join below would match every entry with itself and delete them all:
    if ($id == $merge_id)
    {
        rejectRequest("CANNOT_MERGE_TAG_INTO_ITSELF");
    }
    requireOwnTag($db, $id);
    requireOwnTag($db, $merge_id);
    $affectedRows = withTransaction($db, function () use ($db, $id, $merge_id) {
        // delete entries which already have the merge tag:
        dbExec($db, "DELETE t1 FROM `todo_tags` AS t1 ".
            "INNER JOIN `todo_tags` t2 ".
                "ON t1.`todo_id` = t2.`todo_id` ".
            "WHERE t1.`tag_id`=? AND t2.`tag_id`=?", array($id, $merge_id));
        dbExec($db, "UPDATE `todo_tags` SET `tag_id`=? WHERE `tag_id`=?", array($merge_id, $id));
        return dbExec($db, "DELETE FROM `tags` WHERE id=?", array($id))->affected_rows;
    });
    requireSingleRow($affectedRows, "NO_ROWS_AFFECTED", "MORE_THAN_ONE_TAG_AFFECTED");
    echo 1;
