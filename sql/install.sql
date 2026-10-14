CREATE TABLE `list` (
	`id` int NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255),
	`user_id` int NOT NULL,
	PRIMARY KEY (`id`),
	KEY `list_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `todo` (
	`id` int NOT NULL AUTO_INCREMENT,
	`creationDate` datetime NOT NULL,
	`description` varchar(255) NOT NULL DEFAULT '',
	`effort` smallint unsigned NOT NULL DEFAULT 1,
	`completed` tinyint NOT NULL DEFAULT 0,
	`completionDate` datetime DEFAULT NULL,
	`dueDate` date DEFAULT NULL,
	`startDate` date DEFAULT NULL,
	`notes` varchar(10000) DEFAULT '',
	`version` int NOT NULL DEFAULT 1,
	`recurrenceMode` tinyint NOT NULL DEFAULT 0,
	`recurrenceInterval` smallint unsigned NOT NULL DEFAULT 1,
	`recurrenceAnchor` tinyint NOT NULL DEFAULT 0,
	`deleted` tinyint NOT NULL DEFAULT 0,
	`list_id` int NOT NULL DEFAULT '0',
	PRIMARY KEY (`id`),
	-- the list query, reactivation and "empty trash" filter by list, completed and deleted:
	KEY `todo_list_state` (`list_id`, `completed`, `deleted`),
	-- statistics:
	KEY `todo_completionDate` (`completionDate`),
	KEY `todo_creationDate` (`creationDate`),
	CONSTRAINT `todo_list_list_id` FOREIGN KEY (`list_id`)
		REFERENCES `list` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT `todo_check_completed` CHECK (`completed` IN (0, 1)),
	CONSTRAINT `todo_check_deleted` CHECK (`deleted` IN (0, 1)),
	CONSTRAINT `todo_check_recurrenceAnchor` CHECK (`recurrenceAnchor` IN (0, 1)),
	CONSTRAINT `todo_check_recurrenceMode` CHECK (`recurrenceMode` BETWEEN 0 AND 4),
	CONSTRAINT `todo_check_recurrenceInterval` CHECK (`recurrenceInterval` BETWEEN 1 AND 999),
	CONSTRAINT `todo_check_effort` CHECK (`effort` BETWEEN 0 AND 9999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `recurringCopied` (
	`todo_id` int NOT NULL,
	`copiedDate` datetime NOT NULL,
	PRIMARY KEY (`todo_id`),
	CONSTRAINT `recurringCopied_todo_id` FOREIGN KEY (`todo_id`)
		REFERENCES `todo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	PRIMARY KEY (`id`),
	-- case-insensitive (collation), like the lookup by name always was:
	UNIQUE KEY `tags_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `todo_tags` (
	`todo_id` int,
	`tag_id` int,
	PRIMARY KEY (`todo_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE `settings` (
	`key` VARCHAR(32),
	`value` VARCHAR(255),
	PRIMARY KEY(`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO `settings` (`key`, `value`) VALUES ("db.version", "15");

-- default list of the default user (todo.list_id defaults to 0):
SET SESSION sql_mode = CONCAT(@@sql_mode, ',NO_AUTO_VALUE_ON_ZERO');
INSERT INTO `list` (`id`, `name`, `user_id`) VALUES (0, "Default", 0);

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
