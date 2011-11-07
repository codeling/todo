<?php
    require("db.php");
    $todo = $db->real_escape_string(htmlentities($_REQUEST['todo'], ENT_QUOTES, "UTF-8"));
    $due = $db->real_escape_string(htmlentities($_REQUEST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_REQUEST['priority'];
    if ($todo == '')
    {
        echo '-1';
    }
    else
    {
        if ($db->query("INSERT INTO todo (creationDate, description, dueDate, priority) VALUES (UTC_TIMESTAMP(), '$todo', '$due', $priority)") == FALSE)
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

