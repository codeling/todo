<?php
    require("db.php");
    $db = todoDb();
    require("todo-list-query.php");

    $list_id = (int)(isset($_GET["list_id"]) ? $_GET["list_id"] : 0);
    requireOwnList($db, $list_id);
    $incomplete = isset($_GET["incomplete"])? $_GET["incomplete"] === 'true': false;
    $age = isset($_GET["age"])? (int)$_GET["age"]: 0;
    $params = array($list_id, $age);
    $todos = array();
    $qResult = dbExec($db, todoListQuery($incomplete), $params)->get_result();
    while ($todo = $qResult->fetch_object())
    {
        // the tags are a JSON array, not a string which has to be split (and which would be cut
        // by group_concat_max_len)
        $todo->tags = array();
        $todos[$todo->id] = $todo;
    }
    $qResult = dbExec($db, todoTagsQuery($incomplete), $params)->get_result();
    while ($tag = $qResult->fetch_object())
    {
        // (an entry which was created or moved between the two queries is not in the list)
        if (isset($todos[$tag->todo_id])) {
            $todos[$tag->todo_id]->tags[] = $tag->name;
        }
    }
    sendJson(json_encode(array_values($todos)));
