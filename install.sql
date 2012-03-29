CREATE TABLE `todo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creationDate` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `description` varchar(255) NOT NULL DEFAULT '',
  `priority` int(4) NOT NULL DEFAULT '0',
  `completed` tinyint(1) NOT NULL DEFAULT '0',
  `completionDate` datetime DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `notes` varchar(10000) DEFAULT '',
  `project` varchar(255) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT '1',
  `recurrenceMode` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;

/**
recurrenceMode values:
0 - not recurring
1 - recurring daily
2 - recurring weekly
3 - recurring bi-weekly
4 - recurring monthly
5 - recurring bi-monthly
6 - recurring quarterly
7 - recurring half-yearly
8 - recurring yearly
*/

CREATE TABLE `recurringCompletionHistory` (
  `todo_id` int(11) NOT NULL,
  `completionDate` datetime NOT NULL,
  PRIMARY KEY (`todo_id`, `completionDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 ;

