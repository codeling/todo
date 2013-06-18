<?php
    require("db.php");
    $name = $db->real_escape_string(htmlentities($_REQUEST['name'], ENT_QUOTES, "UTF-8"));
    if ($name == '') {
        echo 'Der Name darf nicht leer sein!';
        die;
    }
    $name = "'".$name."'";
    $sql = "INSERT INTO list ".
            "(name) ".
        "VALUES ".
            "($name)";
    dbQueryOrDie($db, $sql);
    echo $db->insert_id;
    $db->close();
?>
