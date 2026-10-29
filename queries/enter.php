<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    require("todo-input.php");
    require("tags.php");
    $todo     = encodeInput(postParam('todo'));
    $due      = postParam('due');
    $start    = postParam('start');
    $tags     = parseTags(postParam('tags'));
    $inputError = todoInputError($todo, $start, $due, $tags);
    if ($inputError !== null) {
        rejectRequest($inputError);
    }
    $list_id = (int)postParam('list_id');
    requireOwnList($db, $list_id);
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, startDate, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), ?, ?, COALESCE(?, UTC_DATE()), 1, NULL, ?)";
    $todo_id = withTransaction($db, function () use ($db, $sql, $todo, $due, $start, $list_id, $tags) {
        dbExec($db, $sql, array($todo, ($due == '') ? NULL : $due,
            ($start == '') ? NULL : $start, $list_id));
        $todo_id = $db->insert_id;
        updateTags($db, $todo_id, $tags);
        return $todo_id;
    });
    echo $todo_id;
