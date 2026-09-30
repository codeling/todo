<?php
    require(__DIR__."/../session.php");
    requirePostWithCsrf();
    require("db.php");
    $id = (int)$_POST['id'];
    requireOwnTodo($db, $id);
    $trash = ((int)$_POST['trash'] == 1) ? 1 : 0;
    $version = (int)$_POST['version'];
    $stmt = dbExec($db, "UPDATE todo SET deleted=? WHERE id=? AND version=?",
        array($trash, $id, $version));
    $affectedRows = $stmt->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("VERSION_CONFLICT");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_ENTRY_CHANGED");
    } else {
        echo $affectedRows;
    }
    $db->close();
