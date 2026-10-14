<?php
// parameters: list_id, age (days completed entries are still shown)
function todoListWhere($incomplete)
{
    return "todo.list_id = ? AND (".
            "(todo.completed = 1 AND DATEDIFF(UTC_TIMESTAMP(), todo.completionDate) <= ?) OR ".
            "(todo.completed = 0 AND DATEDIFF(todo.startDate, UTC_TIMESTAMP()) <= 0) ".
            ($incomplete? " OR (todo.completed = 0) ":"").
        ")";
}

function todoListQuery($incomplete = true)
{
    return "SELECT todo.id, description as todo, dueDate as due, startDate as start, effort, ".
        "completed, notes, version, recurrenceMode, recurrenceInterval, recurrenceAnchor, completionDate, ".
        "creationDate, deleted, list_id ".
        "FROM todo WHERE ".todoListWhere($incomplete);
}

// the tags of the same entries (same parameters): the rows (todo_id, name), ordered by name
function todoTagsQuery($incomplete = true)
{
    return "SELECT todo_tags.todo_id, tags.name FROM todo ".
        "JOIN todo_tags ON todo.id = todo_tags.todo_id ".
        "JOIN tags ON todo_tags.tag_id = tags.id ".
        "WHERE ".todoListWhere($incomplete)." ORDER BY tags.name";
}
?>
