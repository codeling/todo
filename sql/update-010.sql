ALTER TABLE `todo` DROP `priority`;
ALTER TABLE `todo` ADD `startDate` datetime DEFAULT NULL AFTER `dueDate`;

