<?php
// parameters: list_id, age (days completed entries are still shown)
function todoListQuery($incomplete = true)
{
    return "SELECT todo.id, description as todo, dueDate as due, startDate as start, effort, ".
        "completed, notes, version, recurrenceMode, recurrenceInterval, recurrenceAnchor, completionDate, ".
        "creationDate, deleted, ".
        "GROUP_CONCAT( DISTINCT name ORDER BY name SEPARATOR ',') as tags, list_id ".
        "FROM todo ".
        "LEFT OUTER JOIN todo_tags ON todo.id = todo_tags.todo_id ".
        "LEFT OUTER JOIN tags ON todo_tags.tag_id = tags.id ".
        "WHERE ".
            "list_id = ? AND (".
            "(completed = 1 AND DATEDIFF(UTC_TIMESTAMP(), completionDate) <= ?) OR ".
            "(completed = 0 AND DATEDIFF(startDate, UTC_TIMESTAMP()) <= 0) ".
            ($incomplete? " OR (completed = 0) ":"").
        ") GROUP BY todo.id";
}
?>
