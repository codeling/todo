RENAME TABLE `recurringCompletionHistory` TO `recurringCopied`;
ALTER TABLE `recurringCopied` CHANGE `completionDate` `copiedDate` datetime NOT NULL;

SELECT  recurringCopied r, todo t WHERE r.todo_id=t.id and completed=0 and copiedDate!='2012-03-30 10:20:28'

INSERT INTO todo (creationDate, description, priority, completed, completionDate, dueDate, notes, project, version, recurrenceMode)
    SELECT NOW(), description, priority, 0, r.copiedDate, dueDate, notes, project, version, recurrenceMode FROM recurringCopied r, todo t WHERE r.todo_id=t.id and completed=0 and copiedDate!='2012-03-30 10:20:28';

INSERT INTO todo (creationDate, description, priority, completed, completionDate, dueDate, notes, project, version, recurrenceMode)
    SELECT NOW(), description, priority, 1, r.copiedDate, dueDate, notes, project, version, recurrenceMode FROM recurringCopied r, todo t WHERE r.todo_id=t.id and completed=0 and copiedDate='2012-03-30 10:20:28';

UPDATE  todo
   SET completed=1
WHERE id in (607, 626, 639, 642)
	
