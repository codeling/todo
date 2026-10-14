-- Database review (issue #16, B5): the start and due date of an entry are calendar days,
-- not points in time, so they are DATE columns. (The application only ever stored the day,
-- with the time 00:00:00; a time of an older entry is dropped.)
--
-- Together with this, the application sets the time zone of its connection to UTC, so that
-- CURDATE() and NOW() agree with UTC_DATE() and UTC_TIMESTAMP() which it uses everywhere else.
ALTER TABLE `todo`
	MODIFY `dueDate` date DEFAULT NULL,
	MODIFY `startDate` date DEFAULT NULL;

UPDATE `settings` SET `value` = "15" WHERE `key` = "db.version";
