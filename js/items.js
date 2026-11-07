// The entries of the list: what an entry is and how entries are ordered and found.
// (The functions which change the list are in actions.js.)
import { state } from './state.js';
import { parseDay, dateDiffInDays } from './dates.js';

export function Todo(id, todo, due, start, effort,
        completed, notes, tags, deleted,
        version, recurrenceMode, recurrenceInterval, recurrenceAnchor,
        completionDate, creationDate, list_id, dueFixed) {
    this.id        = parseInt(id);
    this.todo      = todo;
    this.due       = due;
    this.start     = start;
    // (0: not estimated)
    this.effort    = parseInt(effort) || 0;
    this.completed = parseInt(completed);
    this.notes     = notes;
    this.tags      = tags;
    this.deleted   = parseInt(deleted);
    this.version   = parseInt(version);
    this.recurrenceMode = parseInt(recurrenceMode);
    this.recurrenceInterval = parseInt(recurrenceInterval);
    this.recurrenceAnchor = parseInt(recurrenceAnchor);
    this.completionDate = completionDate;
    this.creationDate = creationDate;
    this.list_id   = list_id;
    // 1: the due date is a real deadline (sections "Overdue" and "Today"); 0: it only orders the list
    this.dueFixed  = parseInt(dueFixed) || 0;
}

export function copyTodo(item)
{
    return new Todo(
        item.id, item.todo, item.due, item.start, item.effort,
        item.completed, item.notes, item.tags, item.deleted,
        item.version, item.recurrenceMode, item.recurrenceInterval, item.recurrenceAnchor,
        item.completionDate, item.creationDate, item.list_id, item.dueFixed
    );
}


// -1, 0 or 1 for two values of one kind; a missing value (no date) is always last
function compareKeys(a, b, descending) {
    if (a == b) {
        return 0;
    }
    if (a == null) {
        return 1;
    }
    if (b == null) {
        return -1;
    }
    var result = (a < b) ? -1 : 1;
    return descending ? -result : result;
}


// The sections of the open entries, in the order in which they are shown: a fixed due date (a real deadline)
// which has passed, one which is today, and all others. A soft due date only orders the list, so an entry with
// one is always in "later", also when the date has passed.
export const SECTIONS = ['overdue', 'today', 'later'];

// the section of an open entry (compared by calendar day in the time zone of the browser, like the dates are
// shown); null for a completed or deleted entry
export function dueSection(item, today) {
    if (item.completed != 0 || item.deleted != 0) {
        return null;
    }
    var due = parseDay(item.due);
    if (item.dueFixed != 1 || due == null) {
        return 'later';
    }
    var days = dateDiffInDays(today || new Date(), due);
    return days < 0 ? 'overdue' : (days == 0 ? 'today' : 'later');
}


// order of the table: not deleted before deleted, open before completed;
// open by section (overdue, today, later; overdue ones by due date, the oldest first), then by start, due date and
// description, completed by completion date (newest first), start and description; the id makes it a total order
export function ItemSort(item1, item2) {
    var result = compareKeys(item1.deleted, item2.deleted) ||
        compareKeys(item1.completed, item2.completed);
    if (result != 0) {
        return result;
    }
    if (item1.completed == 0) {
        var section1 = dueSection(item1);
        var section2 = dueSection(item2);
        result = compareKeys(SECTIONS.indexOf(section1), SECTIONS.indexOf(section2)) ||
            (section1 == 'overdue' ? compareKeys(item1.due, item2.due) : 0) ||
            compareKeys(item1.start, item2.start) ||
            compareKeys(item1.due, item2.due) ||
            compareKeys(item1.todo, item2.todo);
    } else {
        result = compareKeys(item1.completionDate, item2.completionDate, true) ||
            compareKeys(item1.start, item2.start) ||
            compareKeys(item1.todo, item2.todo);
    }
    return result || compareKeys(item1.id, item2.id);
}


export function findItem(id) {
    for (var i=0; i<state.itemList.length; ++i) {
        if (state.itemList[i].id == id) {
            return i;
        }
    }
    return -1;
}

function arrayContainsAny(needle, haystack) {
    for (var i=0; i<needle.length; i++) {
        if (haystack.indexOf(needle[i]) != -1) {
            return true;
        }
    }
    return false;
}

export function getTodoWithTag(filterTags)
{
    var result = new Array();
    for (var i=0; i<state.itemList.length; i++) {
        if (arrayContainsAny(filterTags, state.itemList[i].tags)) {
            result.push(state.itemList[i]);
        }
    }
    return result;
}
