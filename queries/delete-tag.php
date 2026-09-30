<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)$_POST['id'];
	// TODO: restrict to current list!
    $deletedAssignments = dbExec($db, "DELETE FROM todo_tags WHERE tag_id=?", array($id))->affected_rows;
	// TODO: only delete if no tags left!
    $affectedRows = dbExec($db, "DELETE FROM tags WHERE id=?", array($id))->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $deletedAssignments;
    }
    $db->close();
