<?php
    require("db.php");
    $id = (int)$_REQUEST['id'];
    requireOwnTodo($db, $id);
    $trash = (int)$_REQUEST['trash'];
    $version = (int)$_REQUEST['version'];
    dbQueryOrDie($db, "UPDATE todo SET deleted=$trash WHERE id=$id AND version=$version");
    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("VERSION_CONFLICT");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        echo $affectedRows;
    }
    $db->close();
