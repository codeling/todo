// What the user can do with the entries: complete, trash, reactivate, add, modify, empty the trash.
// Each action sends a request to the server with postAction() and changes the list on the page
// (the *Locally() functions), at once and undone if the server refuses, or once the server confirmed.
import { state } from './state.js';
import { notify, showToast } from './toast.js';
import { Todo, copyTodo, findItem } from './items.js';
import { formatDate, getUTCDate, parseDay } from './dates.js';
import { log } from './log.js';
import { postAction, reportFailure } from './api.js';
import { refreshView, renderTable, updateEnterDueLabel, setEnterToday, enterTodayPressed } from './render.js';
import { reloadTagList, refresh } from './load.js';
import { closeDialog } from './dialogs.js';

function setTrashedLocally(idx, trashed) {
    state.itemList[idx].deleted = trashed ? 1 : 0;
    refreshView();
}


function deleteLocally(idx) {
    // (-1: not in the list, e.g. replaced by a reload meanwhile; splice(-1) would remove the last one)
    if (idx == -1) {
        return;
    }
    state.itemList.splice(idx, 1);
    refreshView();
}


function modifyLocally(item) {
    var index = findItem(item.id);
    if (index == -1)
    {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    state.itemList[index].todo     = item.todo;
    state.itemList[index].start    = (item.start == '') ? null: item.start;
    state.itemList[index].effort   = item.effort;
    state.itemList[index].due      = (item.due == '') ? null: item.due;
    state.itemList[index].dueFixed = item.dueFixed;
    state.itemList[index].notes    = item.notes;
    state.itemList[index].tags     = item.tags;
    state.itemList[index].version  = item.version;
    state.itemList[index].recurrenceMode = item.recurrenceMode;
    state.itemList[index].recurrenceInterval = item.recurrenceInterval;
    state.itemList[index].recurrenceAnchor = item.recurrenceAnchor;
    renderTable();
}


function addLocally(newItem) {
    // just enter at the end, the sorting is done separately anyway
    state.itemList.push(newItem);
    refreshView();
}


function toggleLocally(item) {
    var index = findItem(item.id);
    if (index == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    var toggledItem = state.itemList[index];
    toggledItem.completed = item.completed;
    toggledItem.version = item.version;
    toggledItem.completionDate = item.completionDate;
    refreshView();
}


function emptyTrashLocally() {
    for (var idx = state.itemList.length-1; idx>=0; --idx) {
        if (state.itemList[idx].deleted == 1) {
            state.itemList.splice(idx, 1);
        }
    }
    refreshView();
}


export function emptyTrash() {
    if (!confirm($T('CONFIRM_EMPTY_TRASH'))) {
        return;
    }
    postAction('queries/empty-trash.php', { list_id: state.reloadData.list_id }).then(function() {
        log($T('EMPTYING_TRASH_SUCCESSFUL'));
        emptyTrashLocally();
        reloadTagList();
    }, function(failure) {
        reportFailure('ERROR_WHILE_EMPTYING_TRASH', failure);
    });
}


// The last request which changes an entry, by id of the entry. Each of these requests sends the version of the
// entry and the server refuses it if that is not the current one; the change of the one before (moving it into
// the trash or back, completing it, saving it) gives the entry a new version, and the entry is shown with that
// change before the server confirmed it. So a request for an entry is only sent once the one before is done,
// and reads the version then.
var entryRequests = {};

// send(): sends the request and returns its promise (which handles its failure itself)
function queueEntryRequest(id, send) {
    var request = (entryRequests[id] || Promise.resolve()).then(send, send);
    entryRequests[id] = request;
    request.then(function() {
        if (entryRequests[id] === request) {
            delete entryRequests[id];
        }
    });
}

// moves an entry into the trash or back; shown at once and undone if the server refuses
export function setTrashed(id, trashed) {
    log($T(trashed ? 'DELETING_ENTRY' : 'RESTORING_ENTRY'));
    var idx = findItem(id);
    if (idx == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    setTrashedLocally(idx, trashed);
    queueEntryRequest(id, function() {
        // (the version is read now, the one before may have changed it; the list may have
        // been loaded again meanwhile, so the entry is looked up again)
        var current = findItem(id);
        if (current == -1) {
            return;
        }
        var stuff = new Object();
        stuff.id = id;
        stuff.version = state.itemList[current].version;
        stuff.trash   = trashed ? 1 : 0;
        return postAction('queries/trash.php', stuff).then(function(answer) {
            // the move to the trash is a change of the entry: the next request needs the new version
            var confirmed = findItem(id);
            if (confirmed != -1 && answer.version !== undefined) {
                state.itemList[confirmed].version = answer.version;
            }
            log($T(trashed ? 'DELETING_SUCCESSFUL' : 'RESTORING_SUCCESSFUL'));
            if (trashed) {
                // (one tap takes it back, no question before it was needed)
                showToast($T('DELETING_SUCCESSFUL'), { actionLabel: $T('UNDO'), onAction: function() { setTrashed(id, false); } });
            }
        }, function(failure) {
            reportFailure(trashed ? 'ERROR_WHILE_DELETING' : 'ERROR_WHILE_RESTORING', failure);
            // undo what was shown, also after a transmission error
            var failed = findItem(id);
            if (failed != -1) {
                setTrashedLocally(failed, !trashed);
            }
        });
    });
}


function showReactivationResult(message) {
    log($T('RESULT')+': '+message);
    refresh();
}


function sendReactivate(id) {
    log($T('REACTIVATING'));
    // what the server says is the result, whether it reactivated the entry or refused to: only a
    // failed transmission is an error
    postAction('queries/reactivate-one.php', { id: id }).then(function(answer) {
        showReactivationResult(answer.message);
    }, function(failure) {
        if (failure.transport) {
            notify($T('TRANSMISSION_ERROR'));
            return;
        }
        showReactivationResult(failure.message);
    });
}


export function reactivate(id) {
    var index = findItem(id);
    if (index == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    if (state.itemList[index].completed == 0) {
        return;
    }
    if (!confirm($T('CONFIRM_REACTIVATION'))) {
        return;
    }
    sendReactivate(id);
}


// the checkbox was already toggled by the click: back to the state of the item,
// which is only changed once the server confirmed
function resetCompletedCheckbox(id) {
    var index = findItem(id);
    if (index != -1) {
        $('#completed'+id).prop('checked', state.itemList[index].completed == 1);
    }
}


export function toggleCompleted(id) {
    var index = findItem(id);
    if (index == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    if (state.itemList[index].deleted == 1) {
        return;
    }
    // what the click asked for: the opposite of what is shown now
    var completed = state.itemList[index].completed == 0 ? 1 : 0;
    queueEntryRequest(id, function() {
        // (after the request before, e.g. taking it back from the trash: its version, or the list was loaded again)
        var current = findItem(id);
        if (current == -1) {
            return;
        }
        if (state.itemList[current].deleted == 1) {
            // (moving it back from the trash failed)
            resetCompletedCheckbox(id);
            return;
        }
        var stuff = new Object();
        stuff.id = id;
        stuff.completed = completed;
        stuff.version   = state.itemList[current].version;
        stuff.completionDate = stuff.completed == 1 ? formatDate(getUTCDate(), true) : null;
        // a copy of its own for each request, the item itself is only changed once the server confirmed
        var item = copyTodo(state.itemList[current]);
        return postAction('queries/complete.php', stuff).then(function(answer) {
            item.completed = stuff.completed;
            item.completionDate = stuff.completionDate;
            item.version   = answer.version;
            toggleLocally(item);
            log($T('UPDATE_SUCCESSFUL'));
        }, function(failure) {
            reportFailure('ERROR_WHILE_MODIFYING', failure);
            resetCompletedCheckbox(id);
        });
    });
}


// the dates of an entry which "Do today" changes, to set them back with "Undo"
function setDates(id, dates, onsucc) {
    var idx = findItem(id);
    if (idx == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    // a copy: the entry itself is only changed once the server confirmed
    var stuff = copyTodo(state.itemList[idx]);
    stuff.due = dates.due;
    stuff.dueFixed = dates.dueFixed;
    stuff.start = dates.start;
    storeItemRemote(stuff, onsucc);
}


// "Do today": the entry is due today, as a fixed date, so that it is in the section "Today" (and, if it is not
// done today, in "Overdue" afterwards). It replaces the due date it had; the message has an Undo for that. It
// has to have started by then: a start which is later becomes today too.
export function doToday(id)
{
    var idx = findItem(id);
    if (idx == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    var item = state.itemList[idx];
    var before = { due: item.due, dueFixed: item.dueFixed, start: item.start };
    // today as the browser shows the dates; the start is not after the day of the server (which hides
    // entries which start later) either
    var today = formatDate(new Date());
    var serverToday = formatDate(getUTCDate());
    var start = item.start;
    if (start == null || formatDate(parseDay(start)) > today) {
        start = (serverToday < today) ? serverToday : today;
    }
    setDates(id, { due: today, dueFixed: 1, start: start }, function() {
        showToast($T('DOTODAY_DONE'), { actionLabel: $T('UNDO'), onAction: function() {
            setDates(id, before, function() {});
        } });
    });
}


// The parameters of a request: Todo is no plain object, jQuery 4 would not serialize it,
// and the server expects the tags as one comma separated string.
function todoParams(stuff) {
    return $.param(Object.assign({}, stuff, { tags: stuff.tags.join(',') }));
}


function addItem(stuff) {
    addLocally(stuff);
    postAction('queries/enter.php', todoParams(stuff)).then(function(answer) {
        reloadTagList(); // a tag might have been added or removed
        log($T('CREATING_SUCCESSFUL'));
        $('#enter_todo').val('');
        $('#enter_due').val('');
        updateEnterDueLabel();
        setEnterToday(state.todayOnly);
        // the item in the list is stuff; it has its id now, so it is shown like all others
        stuff.id = answer.id;
        refreshView();
    }, function(failure) {
        reportFailure('ERROR_WHILE_CREATING', failure);
        // remove the item from local list; the  data of it
        // will still remain in the edit fields anyway!
        // (not there any more if the list was loaded again meanwhile)
        deleteLocally(findItem(-1));
    });
}


function storeItemRemote(stuff, onsucc) {
    log($T('SAVING_MODIFICATIONS'));
    queueEntryRequest(stuff.id, function() {
        // (the version after the request before, if there was one still running)
        var current = findItem(stuff.id);
        if (current != -1) {
            stuff.version = state.itemList[current].version;
        }
        return sendItem(stuff, onsucc);
    });
}


function sendItem(stuff, onsucc) {
    return postAction('queries/update.php', todoParams(stuff)).then(function(answer) {
        reloadTagList(); // a tag might have been added or removed
        // if everything went fine, close dialog:
        log($T('SAVING_SUCCESSFUL'));
        onsucc();
        // only set locally now, else it could be confusing
        stuff.version = answer.version;
        if (stuff.list_id != state.reloadData.list_id) {
            deleteLocally(findItem(stuff.id));
        } else {
            modifyLocally(stuff);
        }
    }, function(failure) {
        // just keep dialog open...then changed values aren't lost
        reportFailure('ERROR_WHILE_MODIFYING', failure);
    });
}


export function storeItem() {
    var id = parseInt($('#modify_id').val());
    var idx = findItem(id);
    if (idx == -1) {
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Todo(id,
        $('#modify_todo').val(),
        $('#modify_due').val(),
        $('#modify_start').val(),
        $('#modify_effort').val(),
        0,  // currently not taken into account on server, and not modifiable at server
        $('#modify_notes').val().trim(),
        state.modifyTagify.value.map((tag) => tag.value),
        0,  // deleted items cannot be modified
        state.itemList[idx].version,
        $('#modify_recurrenceMode').val(),
        $('#modify_recurrenceInterval').val(),
        $('#modify_recurrenceAnchor').val(),
        state.itemList[idx].completionDate,
        state.itemList[idx].creationDate,
        $('#modify_list').val(),
        ($('#modify_dueFixed').prop('checked') && $('#modify_due').val() != '') ? 1 : 0
    );
    storeItemRemote(stuff, function() {
        closeDialog('#modify_dialog');
    });
}


export function enter() {
    log($T('CREATING_NEW_ENTRY'));
    if ($('#enter_todo').val().length == 0) {
        notify($T('TODO_MAY_NOT_BE_EMPTY'));
        return;
    }
    if (findItem(-1) != -1) {
        notify($T('ANOTHER_CREATE_STILL_RUNNING'));
        return;
    }
    var todo = $('#enter_todo').val();
    var colon = todo.lastIndexOf(':');
    var tags = [];
    if (colon != -1) {
        // "a, b: todo" (as typed, empty tags are ignored like on the server)
        tags = todo.substr(0, colon).split(',').map((tag) => tag.trim()).filter((tag) => tag != '');
        if (todo.charAt(colon+1) == ' ') { colon++; }
        todo = todo.substr(colon+1);
    }
    // "Today": due today (as the browser shows the dates, like "Do today"), as a fixed date; else the due date
    // which was picked only orders the list
    var dueFixed = enterTodayPressed() ? 1 : 0;
    var due = dueFixed ? formatDate(new Date()) : $('#enter_due').val();
    // incompletely entered date: value is empty, but input isn't
    if (!dueFixed && $('#enter_due')[0].validity.badInput) {
        notify($T('INVALID_DATE'));
        return;
    }
    if (due == '') {
        due = null;
    }
    // the line has no start date (the dialog has): the entry starts today, the day of the server, unless it is due
    // before that (a due date in the past, or today in a time zone behind UTC)
    var start = formatDate(getUTCDate());
    if (due != null && due < start) {
        start = due;
    }
    var stuff = new Todo(-1, todo, due, start, 1 /* effort */ ,
            0, '', tags, 0, 1, 0 /* recurrenceMode */, 1 /* recurrenceInterval */, 0 /* recurrenceAnchor */,
            null, formatDate(getUTCDate(), true),
            state.reloadData.list_id, dueFixed);
    addItem(stuff);
}
