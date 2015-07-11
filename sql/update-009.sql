ALTER TABLE `todo` ADD `list_id` INT NOT NULL DEFAULT '0' AFTER `deleted`;

ALTER TABLE `list` ADD `user_id` INT NOT NULL AFTER `name`;

ALTER TABLE `todo` DROP `user_id`;

ALTER TABLE `todo`
	ADD FOREIGN KEY `todo_list_list_id` (list_id)
		REFERENCES `list` (id)
	ON DELETE CASCADE
	ON UPDATE CASCADE;

