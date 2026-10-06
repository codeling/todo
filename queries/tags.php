<?php
// limits of tags: the length of the database column, and a number which no list needs
// (every tag costs a few queries, a request must not be able to cause millions of them)
const MAX_TAG_LENGTH = 255;
const MAX_TAGS_PER_TODO = 50;

// whether the (already HTML-encoded) name can be used as tag name: tags are
// passed around as comma separated lists, so a comma would split the tag
function isValidTagName($encodedName)
{
    return $encodedName !== '' && strpos($encodedName, ',') === false &&
        preg_match_all('/./su', $encodedName) <= MAX_TAG_LENGTH;
}

// "a, b,c,a" => array('a', 'b', 'c'): the HTML-encoded names, without empty tags and duplicates;
// null if a tag or the number of tags is invalid
function parseTags($tagString)
{
    $tags = array();
    foreach (explode(",", $tagString) as $tag)
    {
        $trimmedTag = trim($tag);
        if (strcmp($trimmedTag, '') == 0) {
            // don't want to have empty tags in the database!
            continue;
        }
        $encodedTag = encodeInput($trimmedTag);
        if (!isValidTagName($encodedTag)) {
            return null;
        }
        $tags[$encodedTag] = $encodedTag;
        if (count($tags) > MAX_TAGS_PER_TODO) {
            return null;
        }
    }
    return array_values($tags);
}

// $encodedTags: result of parseTags()
function updateTags($db, $todo_id, $encodedTags)
{
    $todo_id = (int)$todo_id;
    $db->begin_transaction();
    dbExec($db, "DELETE FROM todo_tags WHERE todo_id=?", array($todo_id));
    foreach ($encodedTags as $encodedTag)
    {
        $obj = dbExec($db, "SELECT id FROM tags WHERE name=?", array($encodedTag))
            ->get_result()->fetch_object();
        if (is_null($obj)) {
            dbExec($db, "INSERT INTO tags (name) VALUES (?)", array($encodedTag));
            $tag_id = $db->insert_id;
        } else {
            $tag_id = $obj->id;
        }
        dbExec($db, "INSERT IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)", array($todo_id, $tag_id));
    }
    $db->commit();
}
