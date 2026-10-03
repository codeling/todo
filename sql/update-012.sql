-- recurrenceMode used to be an interval in days; it is now the unit
-- (0 = none, 1 = days, 2 = weeks, 3 = months, 4 = years) and recurrenceInterval the count
ALTER TABLE `todo` ADD `recurrenceInterval` int(11) NOT NULL DEFAULT 1 AFTER `recurrenceMode`;

-- recurrenceInterval first: it is computed from the old recurrenceMode value
UPDATE `todo` SET
	`recurrenceInterval` = CASE
		WHEN `recurrenceMode` = 0 THEN 1
		WHEN `recurrenceMode` IN (30, 60) THEN `recurrenceMode` / 30
		WHEN `recurrenceMode` = 91 THEN 3
		WHEN `recurrenceMode` = 121 THEN 4
		WHEN `recurrenceMode` = 182 THEN 6
		WHEN `recurrenceMode` = 1805 THEN 5
		WHEN `recurrenceMode` % 365 = 0 THEN `recurrenceMode` / 365
		WHEN `recurrenceMode` % 7 = 0 THEN `recurrenceMode` / 7
		ELSE `recurrenceMode` END,
	`recurrenceMode` = CASE
		WHEN `recurrenceMode` = 0 THEN 0
		WHEN `recurrenceMode` IN (30, 60, 91, 121, 182) THEN 3
		WHEN `recurrenceMode` = 1805 OR `recurrenceMode` % 365 = 0 THEN 4
		WHEN `recurrenceMode` % 7 = 0 THEN 2
		ELSE 1 END;

UPDATE `settings` SET `value` = "12" WHERE `key` = "db.version";
