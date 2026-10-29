// What the user can do with the entries: complete, trash, reactivate, add, modify, empty the trash.
// Each action sends a request to the server with postAction() and changes the list on the page
// (the *Locally() functions), at once and undone if the server refuses, or once the server confirmed.
import { state } from './state.js';
import { Todo, copyTodo, findItem } from './items.js';
import { formatDate, getUTCDate, parseDay } from './dates.js';
import { log } from './log.js';
import { postAction, reportFailure } from './api.js';
import { refreshView, renderTable, updateEnterDueLabel } from './render.js';
import { reloadTagList, refresh } from './load.js';

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
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    state.itemList[index].todo     = item.todo;
    state.itemList[index].start    = (item.start == '') ? null: item.start;
    state.itemList[index].effort   = item.effort;
    state.itemList[index].due      = (item.due == '') ? null: item.due;
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
        alert($T('ENTRY_NOT_FOUND'));
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
    renderTable();
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


// moves an entry into the trash or back; shown at once and undone if the server refuses
export function setTrashed(id, trashed) {
    log($T(trashed ? 'DELETING_ENTRY' : 'RESTORING_ENTRY'));
    var idx = findItem(id);
    if (idx == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = state.itemList[idx].version;
    stuff.trash   = trashed ? 1 : 0;
    setTrashedLocally(idx, trashed);
    postAction('queries/trash.php', stuff).then(function() {
        log($T(trashed ? 'DELETING_SUCCESSFUL' : 'RESTORING_SUCCESSFUL'));
    }, function(failure) {
        reportFailure(trashed ? 'ERROR_WHILE_DELETING' : 'ERROR_WHILE_RESTORING', failure);
        // undo what was shown, also after a transmission error (the list may have been loaded
        // again meanwhile, so the entry is looked up again)
        var current = findItem(id);
        if (current != -1) {
            setTrashedLocally(current, !trashed);
        }
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
            alert($T('TRANSMISSION_ERROR'));
            return;
        }
        showReactivationResult(failure.message);
    });
}


export function reactivate(id) {
    var index = findItem(id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
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
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    if (state.itemList[index].deleted == 1) {
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = state.itemList[index].completed == 0 ? 1 : 0;
    stuff.version   = state.itemList[index].version;
    stuff.completionDate = stuff.completed == 1 ? formatDate(getUTCDate(), true) : null;
    // a copy of its own for each request, the item itself is only changed once the server confirmed
    var item = copyTodo(state.itemList[index]);
    postAction('queries/complete.php', stuff).then(function(answer) {
        item.completed = stuff.completed;
        item.completionDate = stuff.completionDate;
        item.version   = answer.version;
        toggleLocally(item);
        log($T('UPDATE_SUCCESSFUL'));
    }, function(failure) {
        reportFailure('ERROR_WHILE_MODIFYING', failure);
        resetCompletedCheckbox(id);
    });
}


export function doToday(id)
{
    var idx = findItem(id);
    var today = new Date();
    if (state.itemList[idx].start == null || parseDay(state.itemList[idx].start) > today)
    {
        state.itemList[idx].start = formatDate(getUTCDate(), false);
        storeItemRemote(state.itemList[idx], function() {});
    }
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
        $('#enter_start').val('');
        $('#enter_start').data('oldVal', '');
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
    postAction('queries/update.php', todoParams(stuff)).then(function(answer) {
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
        alert($T('ENTRY_NOT_FOUND'));
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
        $('#modify_list').val()
    );
    storeItemRemote(stuff, function() {
        $('#modify_dialog').dialog('close');
    });
}


export function enter() {
    log($T('CREATING_NEW_ENTRY'));
    if ($('#enter_todo').val().length == 0) {
        alert($T('TODO_MAY_NOT_BE_EMPTY'));
        return;
    }
    if (findItem(-1) != -1) {
        alert($T('ANOTHER_CREATE_STILL_RUNNING'));
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
    // incompletely entered date: value is empty, but input isn't
    if ($('#enter_start')[0].validity.badInput || $('#enter_due')[0].validity.badInput) {
        alert($T('INVALID_DATE'));
        return;
    }
    // start/due inputs are hidden on narrow screens; default like the server:
    // start today, no due date
    var start = $('#enter_start').val();
    if (start == '') {
        start = formatDate(getUTCDate());
    }
    var due = $('#enter_due').val();
    if (due == '') {
        due = null;
    }
    var stuff = new Todo(-1, todo, due, start, 1 /* effort */ ,
            0, '', tags, 0, 1, 0 /* recurrenceMode */, 1 /* recurrenceInterval */, 0 /* recurrenceAnchor */,
            null, formatDate(getUTCDate(), true),
            state.reloadData.list_id);
    addItem(stuff);
}
