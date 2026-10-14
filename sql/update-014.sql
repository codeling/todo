-- Database review (issue #16, B1): the tables use utf8mb4 instead of utf8 (= utf8mb3), so that
-- emoji and other 4-byte characters can be stored.
--
-- The collation is utf8mb4_unicode_520_ci: it ignores case like the old utf8_general_ci did
-- (so tags still are unique ignoring case), but, unlike utf8mb4_general_ci and
-- utf8mb4_unicode_ci, it does not treat all emoji as equal. It exists in MariaDB 10.2+
-- and MySQL 5.6+. The index key of tags.name is 4 * 255 bytes, which needs the row format
-- DYNAMIC (the default since MariaDB 10.2 and MySQL 5.7).
--
-- Run it after a backup. Rebuilding the tables locks them for the time it takes.

-- Tags which are equal in the new collation but were not in the old one (like "straße" and
-- "STRASSE") would violate the unique key: merge them into the one with the lowest id first.
INSERT IGNORE INTO `todo_tags` (`todo_id`, `tag_id`)
	SELECT r.`todo_id`, k.`keep_id`
	FROM `todo_tags` r
	JOIN `tags` t ON t.`id` = r.`tag_id`
	JOIN (SELECT CONVERT(`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci AS `name`, MIN(`id`) AS `keep_id`
		FROM `tags` GROUP BY CONVERT(`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci) k
		ON k.`name` = CONVERT(t.`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci
	WHERE t.`id` <> k.`keep_id`;

DELETE t FROM `tags` t
	JOIN (SELECT CONVERT(`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci AS `name`, MIN(`id`) AS `keep_id`
		FROM `tags` GROUP BY CONVERT(`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci) k
		ON k.`name` = CONVERT(t.`name` USING utf8mb4) COLLATE utf8mb4_unicode_520_ci
	WHERE t.`id` <> k.`keep_id`;

ALTER TABLE `list` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE `todo` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE `recurringCopied` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE `tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE `todo_tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
ALTER TABLE `settings` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

UPDATE `settings` SET `value` = "14" WHERE `key` = "db.version";
