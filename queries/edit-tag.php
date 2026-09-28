<?php
    require("db.php");
    $id   = (int)$_REQUEST['id'];
    $name = $db->real_escape_string(htmlentities($_REQUEST['tag_name'], ENT_QUOTES, "UTF-8"));
    dbQueryOrDie($db, "UPDATE `tags` SET `name`='$name' WHERE id=$id");
    $affectedRows = $db->affected_rows;
    if ($affectedRows < 1) {
        echo TodoLang::_("NO_ROWS_AFFECTED");
    } else if ($affectedRows > 1) {
        echo TodoLang::_("MORE_THAN_ONE_TAG_AFFECTED");
    } else {
        echo $affectedRows;
    }
    $db->close();
