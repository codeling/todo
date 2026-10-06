<?php
    // authenticates first, a CSRF check is no replacement for that
    require(__DIR__."/../todo-core.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)postParam('id');
    requireOwnTag($db, $id);
    $db->begin_transaction();
    $deletedAssignments = dbExec($db, "DELETE FROM todo_tags WHERE tag_id=?", array($id))->affected_rows;
	// TODO: only delete if no tags left!
    $affectedRows = dbExec($db, "DELETE FROM tags WHERE id=?", array($id))->affected_rows;
    $db->commit();
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $deletedAssignments;
    }
    $db->close();
