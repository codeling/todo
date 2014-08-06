
ALTER TABLE `todo_tags` DROP CONSTRAINT `todo_tags_tag_id`;
ALTER TABLE `todo_tags` DROP CONSTRAINT `todo_tags_todo_id`;

DROP TABLE `list`;
DROP TABLE `recurringCopied`;
DROP TABLE `tags`;
DROP TABLE `todo`;
DROP TABLE `todo_tags`;
