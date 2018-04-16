ALTER TABLE `todo` ADD `recurrenceAnchor` int(1) NOT NULL DEFAULT 0 AFTER `recurrenceMode`;

CREATE TABLE `settings` (
	`key` VARCHAR(32),
	`value` VARCHAR(255),
	PRIMARY KEY(`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `settings` VALUES ("db.version", "11");

