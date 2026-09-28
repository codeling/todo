<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
	// TODO: restrict to current list!
    dbQueryOrDie($db, "DELETE FROM todo_tags WHERE tag_id=$id");
    $deletedAssignments = $db->affected_rows;
	// TODO: only delete if no tags left!
    dbQueryOrDie($db, "DELETE FROM tags WHERE id=$id");
    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $deletedAssignments;
    }
    $db->close();
