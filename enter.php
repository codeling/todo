<?php
  // print_r ($_POST);
    require("db.php");
    $todo = $db->real_escape_string(htmlentities($_POST['todo'], ENT_QUOTES, "UTF-8"));
    $due = $db->real_escape_string(htmlentities($_POST['due'], ENT_QUOTES, "UTF-8"));
    $priority = (int)$_POST['due'];
    if ($todo == '')
    {
        echo '-1';
    }
    else
    {
        if ($db->query("INSERT INTO todo (creationDate, description, dueDate, priority) VALUES (UTC_TIMESTAMP(), '$todo', '$due', $priority)") == FALSE)
        {
            echo '-2';
        }
        else
        {
            echo $db->insert_id;
        }
    }
    $db->close();
?>

