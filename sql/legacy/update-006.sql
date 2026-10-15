ALTER TABLE `todo` DROP COLUMN `list_id`;
ALTER TABLE `todo` ADD (`user_id` INT(11) NOT NULL);
