<?php
    require(__DIR__."/endpoint.php");
    $db = todoDb();
    require("todo-input.php");
    require("tags.php");
    $todo     = postParam('todo');
    $due      = postParam('due');
    $start    = postParam('start');
    $tags     = parseTags(postParam('tags'));
    $inputError = todoInputError($todo, $start, $due, $tags);
    if ($inputError !== null) {
        rejectRequest(422, $inputError);
    }
    $dueFixed = dueFixedValue(postParam('dueFixed'), $due);
    if ($dueFixed === null) {
        rejectRequest(422, "INVALID_DUE_FIXED");
    }
    $list_id = (int)postParam('list_id');
    requireOwnList($db, $list_id);
    $sql = "INSERT INTO todo ".
            "(creationDate, description, dueDate, dueFixed, startDate, effort, notes, list_id) ".
        "VALUES ".
            "(UTC_TIMESTAMP(), ?, ?, ?, COALESCE(?, UTC_DATE()), 0, NULL, ?)";   // effort 0: not estimated
    $todo_id = withTransaction($db, function () use ($db, $sql, $todo, $due, $dueFixed, $start, $list_id, $tags) {
        dbExec($db, $sql, array($todo, ($due == '') ? NULL : $due, $dueFixed,
            ($start == '') ? NULL : $start, $list_id));
        $todo_id = $db->insert_id;
        updateTags($db, $todo_id, $tags);
        return $todo_id;
    });
    sendOk(array('id' => (int)$todo_id));
