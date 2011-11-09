<?php
    require("db.php");
    require("date.php");
    $todo = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    if (!checkDateStr($due))
    {
        $due = '';
    } 
    $priority = (int)$_REQUEST['priority'];
    if ($todo == '')
    {
        echo 'Die Beschreibung darf nicht leer sein!';
        die;
    }
    else
    {
        $sql = "INSERT INTO todo ".
                "(creationDate, description, dueDate, priority) ".
            "VALUES ".
                "(UTC_TIMESTAMP(), ".
                "'$todo', ".
                ((strcmp($due, '') == 0)?"NULL":"'$due'").", ".
                "$priority)";
        if ($db->query($sql) == FALSE)
        {
            echo $db->error;
        }
        else
        {
            echo $db->insert_id;
        }
    }
    $db->close();
?>

