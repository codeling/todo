<?php
function updateTags($db, $todo_id, $tags)
{
    $todo_id = (int)$todo_id;
    $sql = "DELETE FROM todo_tags WHERE todo_id=$todo_id";
    dbQueryOrDie($db, $sql);
    foreach ( $tags as $tag)
    {
        $quotedTag = quoteString($db, $tag);
        $sql = "SELECT id FROM tags WHERE name=$quotedTag";
        $qResult = dbQueryOrDie($db, $sql);
        $obj = $qResult->fetch_object();
        if (is_null($obj)) {
            $sql = "INSERT INTO tags (name) VALUES ($quotedTag)";
            dbQueryOrDie($db, $sql);
            $tag_id = $db->insert_id;
        } else {
            $tag_id = $obj->id;
        }
        $sql = "INSERT INTO todo_tags (todo_id, tag_id) VALUES ($todo_id, $tag_id)";
        dbQueryOrDie($db, $sql);
    }
}
