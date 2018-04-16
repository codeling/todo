<?php
function todoListQuery($list_id, $incomplete = true, $age = 0)
{
    return "SELECT todo.id, description as todo, dueDate as due, startDate as start, effort, ".
        "completed, notes, version, recurrenceMode, recurrenceAnchor, completionDate, ".
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
}
?>
