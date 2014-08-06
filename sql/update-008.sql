ALTER TABLE `todo_tags`
	ADD FOREIGN KEY `todo_tags_tag_id` (tag_id)
		REFERENCES `tags` (id)
	ON DELETE CASCADE
	ON UPDATE CASCADE;

ALTER TABLE `todo_tags`
	ADD FOREIGN KEY `todo_tags_todo_id` (todo_id)
		REFERENCEs `todo` (id)
	ON DELETE CASCADE
	ON UPDATE CASCADE;
