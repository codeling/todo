-- Issue #2: a due date is either soft (it only orders the list, and is never shown as overdue)
-- or fixed (a real deadline: on the day it is in the section "Today", afterwards in "Overdue").
--
-- The existing due dates become soft, as most of them were used to order the list; only recurring
-- entries which repeat from their due date (recurrenceAnchor = 1, like a bill) become fixed. This
-- includes completed ones, so that the copies which reactivation makes of them are fixed as well.
-- Afterwards mark the other real deadlines in the dialog of the entry ("Fixed date").
ALTER TABLE `todo`
	ADD `dueFixed` tinyint NOT NULL DEFAULT 0 AFTER `dueDate`,
	ADD CONSTRAINT `todo_check_dueFixed` CHECK (`dueFixed` IN (0, 1));

UPDATE `todo` SET `dueFixed` = 1
	WHERE `recurrenceMode` != 0 AND `recurrenceAnchor` = 1 AND `dueDate` IS NOT NULL;

UPDATE `settings` SET `value` = "17" WHERE `key` = "db.version";
