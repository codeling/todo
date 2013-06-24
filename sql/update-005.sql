CREATE TABLE tags (
	id int(11) AUTO_INCREMENT NOT NULL,
	name varchar(255) NOT NULL,
	PRIMARY KEY (id)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;

CREATE TABLE todo_tags (
	todo_id int(11),
	tag_id int(11),
	PRIMARY KEY (todo_id, tag_id)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 ;

INSERT INTO tags (name)
SELECT DISTINCT lower(project) tag FROM
(
	select project from todo t1 where project not like '%:%'
	union all
	select substring_index(`project`,':', 1) from todo t2
		where project like '%:%'
	union all
	select substring_index(`project`,':', -1) from todo t3
		where project like '%:%'
) q1 where project is not null and project != '';


INSERT INTO todo_tags(todo_id, tag_id)
	SELECT todo.id, tags.id FROM todo
		INNER JOIN tags ON LOCATE(tags.name, todo.project) != 0;

ALTER TABLE todo DROP COLUMN project;
