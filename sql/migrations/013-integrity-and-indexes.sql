-- Database review (issue #16): integrity constraints, indexes and column types.
--
-- Run this with an administrative account after backing up the database
-- (mysqldump --single-transaction). It stops at the first statement which fails,
-- (fix the data it complained about, then run the remaining statements; the ones
-- which succeeded before must not be repeated).
--
-- Check for bad data first, all of these must return no rows:
--   orphaned todos (todo_list_list_id would fail):
--     SELECT t.id FROM todo t LEFT JOIN list l ON l.id = t.list_id WHERE l.id IS NULL;
--   values outside of the ranges checked below:
--     SELECT id FROM todo WHERE completed NOT IN (0, 1) OR deleted NOT IN (0, 1)
--       OR recurrenceAnchor NOT IN (0, 1) OR recurrenceMode NOT BETWEEN 0 AND 4
--       OR recurrenceInterval NOT BETWEEN 1 AND 999 OR effort NOT BETWEEN 0 AND 9999;

-- The old layout has the zero date '0000-00-00 00:00:00' as default of todo.creationDate. A default
-- MySQL 8 (sql_mode with NO_ZERO_DATE) refuses to change a table with such a default at all
-- ("Invalid default value for 'creationDate'"), so this script does not use that mode. The
-- default is removed below; the mode of the session is restored at the end.
SET @old_sql_mode = @@sql_mode;
SET SESSION sql_mode = REPLACE(REPLACE(@@sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');

-- 1. Tag names are unique. Tags which differ only by case or trailing spaces are the same
-- tag for the unique key (and always were for the lookup by name): merge them into the
-- one with the lowest id; the entries of the others move to it.
INSERT IGNORE INTO `todo_tags` (`todo_id`, `tag_id`)
	SELECT r.`todo_id`, k.`keep_id`
	FROM `todo_tags` r
	JOIN `tags` t ON t.`id` = r.`tag_id`
	JOIN (SELECT `name`, MIN(`id`) AS `keep_id` FROM `tags` GROUP BY `name`) k ON k.`name` = t.`name`
	WHERE t.`id` <> k.`keep_id`;

-- (the todo_tags rows of the deleted tags are removed by the foreign key)
DELETE t FROM `tags` t
	JOIN (SELECT `name`, MIN(`id`) AS `keep_id` FROM `tags` GROUP BY `name`) k ON k.`name` = t.`name`
	WHERE t.`id` <> k.`keep_id`;

ALTER TABLE `tags` ADD UNIQUE KEY `tags_name` (`name`);

-- 2. recurringCopied: remove the rows of deleted todos, then add the missing foreign key
DELETE r FROM `recurringCopied` r LEFT JOIN `todo` t ON t.`id` = r.`todo_id` WHERE t.`id` IS NULL;

ALTER TABLE `recurringCopied`
	ADD CONSTRAINT `recurringCopied_todo_id` FOREIGN KEY (`todo_id`)
		REFERENCES `todo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Indexes, before the foreign key below, which then uses todo_list_state.
ALTER TABLE `list` ADD KEY `list_user_id` (`user_id`);
ALTER TABLE `todo`
	ADD KEY `todo_list_state` (`list_id`, `completed`, `deleted`),
	ADD KEY `todo_completionDate` (`completionDate`),
	ADD KEY `todo_creationDate` (`creationDate`);

-- 4. The foreign key todo.list_id -> list.id exists on databases which were upgraded with
-- legacy/update-009.sql, but not on the ones created by install.sql (up to version 12). Add it
-- only if it is missing (this fails if there are todos of a list which does not exist).
-- legacy/update-009.sql did not name the constraint (MySQL calls it todo_ibfk_1, MariaDB
-- todo_list_list_id): an existing one with another name is replaced, so that all databases get the same.
SET @list_fk = (SELECT MIN(CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todo' AND COLUMN_NAME = 'list_id'
		AND REFERENCED_TABLE_NAME = 'list' AND REFERENCED_COLUMN_NAME = 'id');
SET @sql = IF(@list_fk IS NOT NULL AND @list_fk <> 'todo_list_list_id',
	CONCAT('ALTER TABLE `todo` DROP FOREIGN KEY `', @list_fk, '`'), 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET @sql = IF(@list_fk = 'todo_list_list_id', 'SELECT 1',
	'ALTER TABLE `todo` ADD CONSTRAINT `todo_list_list_id` FOREIGN KEY (`list_id`) REFERENCES `list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- The index which legacy/update-009.sql created for the foreign key is redundant now (a database
-- upgraded with it has it, it is called like the constraint); the server may have dropped it already.
SET @has_old_idx = (SELECT COUNT(*) FROM information_schema.STATISTICS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todo' AND INDEX_NAME = 'todo_list_list_id');
SET @sql = IF(@has_old_idx > 0, 'ALTER TABLE `todo` DROP KEY `todo_list_list_id`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Column types (display widths are meaningless and deprecated) and no zero date as default
-- (rejected by NO_ZERO_DATE, so install.sql failed on a default MySQL 8). The application
-- always sets creationDate.
ALTER TABLE `todo`
	MODIFY `creationDate` datetime NOT NULL,
	MODIFY `effort` smallint unsigned NOT NULL DEFAULT 1,
	MODIFY `completed` tinyint NOT NULL DEFAULT 0,
	MODIFY `version` int NOT NULL DEFAULT 1,
	MODIFY `recurrenceMode` tinyint NOT NULL DEFAULT 0,
	MODIFY `recurrenceInterval` smallint unsigned NOT NULL DEFAULT 1,
	MODIFY `recurrenceAnchor` tinyint NOT NULL DEFAULT 0,
	MODIFY `deleted` tinyint NOT NULL DEFAULT 0,
	MODIFY `list_id` int NOT NULL DEFAULT '0';

-- 6. Range checks (enforced by MariaDB 10.2.1+ and MySQL 8.0.16+, ignored by older servers)
ALTER TABLE `todo`
	ADD CONSTRAINT `todo_check_completed` CHECK (`completed` IN (0, 1)),
	ADD CONSTRAINT `todo_check_deleted` CHECK (`deleted` IN (0, 1)),
	ADD CONSTRAINT `todo_check_recurrenceAnchor` CHECK (`recurrenceAnchor` IN (0, 1)),
	ADD CONSTRAINT `todo_check_recurrenceMode` CHECK (`recurrenceMode` BETWEEN 0 AND 4),
	ADD CONSTRAINT `todo_check_recurrenceInterval` CHECK (`recurrenceInterval` BETWEEN 1 AND 999),
	ADD CONSTRAINT `todo_check_effort` CHECK (`effort` BETWEEN 0 AND 9999);

SET SESSION sql_mode = @old_sql_mode;

UPDATE `settings` SET `value` = "13" WHERE `key` = "db.version";
