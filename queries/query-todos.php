 <?php
    require("db.php");
    require("reactivate.php");

    // TODO: get ID of logged in user here!
    $list_id = (int)$_GET["list_id"];
    $incomplete = isset($_GET["incomplete"])? $_GET["incomplete"] === 'true': false;
    $age = isset($_GET["age"])? (int)$_GET["age"]: 0;
    $sql = "SELECT todo.id, description as todo, dueDate as due, startDate as start, effort, ".
        "completed, notes, version, recurrenceMode, completionDate, ".
        "creationDate, deleted, ".
        "GROUP_CONCAT( DISTINCT name ORDER BY name SEPARATOR ',') as tags, list_id ".
        "FROM todo ".
        "LEFT OUTER JOIN todo_tags ON todo.id = todo_tags.todo_id ".
        "LEFT OUTER JOIN tags ON todo_tags.tag_id = tags.id ".
        "WHERE ".
            "list_id = ".$list_id." AND (".
            "(completed = 1 AND DATEDIFF(UTC_TIMESTAMP(), completionDate) <= $age) OR ".
            "(completed = 0 AND DATEDIFF(startDate, UTC_TIMESTAMP()) <= 0) ".
            ($incomplete? " OR (completed = 0) ":"").
        ") GROUP BY todo.id";
    $result = jsonQueryResults($db, $sql);
    $db->close();
    echo $result;
