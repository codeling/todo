<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    if (!isset($_POST['id']) || !isset($_POST['merge_id']))
    {
        die(TodoLang::_("INVALID_PARAMETERS"));
    }
    $id   = (int)$_POST['id'];
    $merge_id = (int)$_POST['merge_id'];
	// delete entries which already have the merge tag:
	dbExec($db, "DELETE t1 FROM `todo_tags` AS t1 ".
		"INNER JOIN `todo_tags` t2 ".
			"ON t1.`todo_id` = t2.`todo_id` ".
		"WHERE t1.`tag_id`=? AND t2.`tag_id`=?", array($id, $merge_id));
    dbExec($db, "UPDATE `todo_tags` SET `tag_id`=? WHERE `tag_id`=?", array($merge_id, $id));
    $affectedRows = dbExec($db, "DELETE FROM `tags` WHERE id=?", array($id))->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $affectedRows;
    }
    $db->close();
