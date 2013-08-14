 <?php
    require("db.php");
    require("reactivate.php");

    // TODO: get ID of logged in user here!
    $user_id = 0;
    $sql = "SELECT todo.id, description as todo, dueDate as due, priority, effort, ".
        "completed, notes, version, recurrenceMode, completionDate, ".
        "creationDate, ".
        "GROUP_CONCAT( DISTINCT name ORDER BY name SEPARATOR ',') as tags ".
        "FROM todo ".
        "LEFT OUTER JOIN todo_tags ON todo.id = todo_tags.todo_id ".
        "LEFT OUTER JOIN tags ON todo_tags.tag_id = tags.id ".
        "WHERE ".
            "user_id = ".$user_id." AND (".
            "completed=0 ".
            "OR completionDate > (UTC_TIMESTAMP() - INTERVAL 31 DAY))".
        "GROUP BY todo.id";
    $result = jsonQueryResults($db, $sql);
    $db->close();
    echo $result;
?>
