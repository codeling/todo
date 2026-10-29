// The entries of the list: what an entry is and how entries are ordered and found.
// (The functions which change the list are in actions.js.)
import { state } from './state.js';

export function Todo(id, todo, due, start, effort,
        completed, notes, tags, deleted,
        version, recurrenceMode, recurrenceInterval, recurrenceAnchor,
        completionDate, creationDate, list_id) {
    this.id        = parseInt(id);
    this.todo      = todo;
    this.due       = due;
    this.start     = start;
    this.effort    = parseInt(effort);
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
}

export function copyTodo(item)
{
    return new Todo(
        item.id, item.todo, item.due, item.start, item.effort,
        item.completed, item.notes, item.tags, item.deleted,
        item.version, item.recurrenceMode, item.recurrenceInterval, item.recurrenceAnchor,
        item.completionDate, item.creationDate, item.list_id
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


// order of the table: not deleted before deleted, open before completed;
// open by start, due date and description, completed by completion date (newest
// first), start and description; the id makes it a total order
export function ItemSort(item1, item2) {
    var result = compareKeys(item1.deleted, item2.deleted) ||
        compareKeys(item1.completed, item2.completed);
    if (result != 0) {
        return result;
    }
    if (item1.completed == 0) {
        result = compareKeys(item1.start, item2.start) ||
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
