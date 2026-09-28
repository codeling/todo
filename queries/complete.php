<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    requireOwnTodo($db, $id);
    $completed = (int)$_REQUEST['completed'];
    $version   = (int)$_REQUEST['version'];
    $complDate  = ($completed == 1) ? "UTC_TIMESTAMP()": "NULL";
    dbQueryOrDie($db, "UPDATE todo SET completed=$completed, completionDate=$complDate, version=$version+1 WHERE id=$id AND version=$version");
    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("VERSION_CONFLICT");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        echo $affectedRows;
    }
    $db->close();
