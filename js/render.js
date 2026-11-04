// Showing the entries: the table, the progress bar, the lists and the tags, as HTML built by string
// concatenation. Everything which comes from the user or the database goes through escapeHtml() or
// textToHtml(). The buttons of the rows call the actions (actions.js, dialogs.js) and the list of the
// lists reloads (load.js); they call back here to show the result. So render.js, actions.js, dialogs.js
// and load.js import each other, which is fine as long as they only call each other's functions when
// an event happens, and not while the modules are loaded.
import { state } from './state.js';
import { parseDate, parseDay, formatDate } from './dates.js';
import { escapeHtml, textToHtml, icon, iconButton } from './html.js';
import { ItemSort, getTodoWithTag } from './items.js';
import { toggleCompleted, setTrashed } from './actions.js';
import { modifyItem } from './dialogs.js';
import { reload, reloadTagList } from './load.js';

// shows the table and the progress bar again after the list changed
export function refreshView() {
    renderTable();
    updateProgress();
    updateMenu();
}


// "Empty trash" is only there if there is something in the trash
function updateMenu() {
    var hasTrash = state.itemList.some(function(item) { return item.deleted == 1; });
    $('#emptyTrash').prop('hidden', !hasTrash);
}


// the checkbox completes the entry, a tap on the entry opens its dialog (which has all other actions: change,
// do today, reactivate), the button at the right moves it to the trash or back
function setListener(id) {
    $('#completed'+id).on('click', function() {
        toggleCompleted(id);
    });
    $('#open'+id).on('click', function() {
        modifyItem(id);
    });
    $('#trash'+id).on('click', function() {
        setTrashed(id, true);
    });
    $('#restore'+id).on('click', function() {
        setTrashed(id, false);
    });
}


function getRecurrenceString(recurrenceMode, recurrenceInterval)
{
    var unit = $('#modify_recurrenceMode option[value="'+recurrenceMode+'"]').text();
    if (recurrenceMode == 0)
    {
        return unit;
    }
    return $T('RECURRENCE_EVERY')+' '+recurrenceInterval+' '+unit;
}


export function renderTable() {
    clearTable();
    var filtered = filterList();
    for (var i=0; i<filtered.length; i++) {
        renderItem(filtered[i]);
    }
}


// the lists: a button for each (a tab), the one which is shown is marked
export function renderLists() {
    $('#lists').empty();
    for (var i=0; i<state.lists.length; ++i) {
        $('<button type="button" class="listTab"></button>').text(state.lists[i].name)
            .attr('aria-current', state.lists[i].id == state.reloadData.list_id ? 'true' : 'false')
            .attr('data-list-id', state.lists[i].id).appendTo('#lists');
    }
    $('#lists .listTab').on('click', function() {
        var id = $(this).attr('data-list-id');
        if (id == state.reloadData.list_id) {
            return;
        }
        state.reloadData.list_id = id;
        // (the tags of the other list are other tags)
        state.filterTags = [];
        $('#lists .listTab').attr('aria-current', 'false');
        $(this).attr('aria-current', 'true');
        reload();
        reloadTagList();
    });

    $('#modify_list').empty();
    for (var j=0; j<state.lists.length; ++j) {
        $('#modify_list').append($('<option></option>').val(state.lists[j].id).text(state.lists[j].name));
    }
}


function filterList() {
    var result;
    if (state.filterTags.length == 0) {
        result = state.itemList.slice(0);
    } else {
        result = getTodoWithTag(state.filterTags);
    }
    result.sort(ItemSort);
    return result;
}


function updateProgress() {
    var open = 0;
    var done = 0;
    for (var i=0; i<state.itemList.length; i++) {
        if (state.itemList[i].deleted == 1) {
            continue;
        }
        if (state.itemList[i].completed == 0) {
            open++;
        } else {
            done++;
        }
    }
    var count = done+open;
    var progressWidth = 100; // in percent
    // without entries there is nothing to divide by
    var openPercent = (count == 0) ? 0 : progressWidth*open/count;
    var donePercent = (count == 0) ? 0 : progressWidth*done/count;
    $('#progress_todo').css('width', openPercent+'%');
    $('#progress_done').css('width', donePercent+'%');
    $('#progress_todo').attr('title', $T('OPEN')+': '+open);
    $('#progress_done').attr('title', $T('DONE')+': '+Math.round(donePercent) + ' % ('+done+') '+$T('SINCE_DAYS_PREFIX')+state.reloadData.age+$T('SINCE_DAYS_POSTFIX'));
}


function clearTable()
{
    $("#todoList").empty();
}


// the tags of an entry as plain chips (text only; the names are escaped like all texts of the page)
function tagChipsHtml(tags) {
    return tags.map(function(tag) { return tag.trim(); }).filter(function(tag) { return tag != ''; })
        .map(function(tag) { return '<span class="tagChip">'+escapeHtml(tag)+'</span>'; }).join('');
}


// the tooltip of an entry: when it was created, how it recurs, when it was done
function todoTooltip(it) {
    var createDate = parseDate(it.creationDate);
    var complDate = parseDate(it.completionDate);
    // label of the recurrence option (DOM text), goes into an HTML attribute:
    var repetition = escapeHtml(getRecurrenceString(it.recurrenceMode, it.recurrenceInterval));
    return $T('CREATED')+': '+formatDate(createDate, true)+'; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'');
}


// the text of an entry and, below it, what else there is to know: a note, that it recurs, when it starts (if that
// is still to come), its tags
function todoTitleHtml(it) {
    var meta = '';
    if (it.notes != null && it.notes != '') {
        meta += '<span class="note" title="'+textToHtml(it.notes)+'">'+icon('note')+'</span>';
    }
    if (it.recurrenceMode != 0) {
        meta += '<span class="recurring" title="'+escapeHtml(getRecurrenceString(it.recurrenceMode, it.recurrenceInterval))+'">'+icon('repeat')+'</span>';
    }
    var start = parseDay(it.start);
    if (it.completed == 0 && start != null && start > new Date()) {
        meta += '<span class="todoStart">'+escapeHtml($T('START'))+' '+formatDate(start)+'</span>';
    }
    if (it.tags.length > 0) {
        meta += '<span class="todo_item_tags">'+tagChipsHtml(it.tags)+'</span>';
    }
    return '<span class="todoTitle">'+textToHtml(it.todo)+'</span>'+(meta == '' ? '' : '<span class="todoMeta">'+meta+'</span>');
}


// an entry in the dialog of a tag
export function tagTodoHtml(it) {
    return '<div class="tagTodo" title="'+todoTooltip(it)+'">'+todoTitleHtml(it)+'</div>';
}


// date as YYYY-MM-DD; the year is in its own span, so that it can be hidden
// on narrow screens if it is the current one
function dateHtml(date) {
    var str = formatDate(date);
    if (date == null || date.getFullYear() != new Date().getFullYear()) {
        return str;
    }
    return '<span class="date_year">'+str.substring(0, 5)+'</span>'+str.substring(5);
}


// narrow screens show the due date of a new todo as text (or a calendar icon if
// there is none) over the invisible date input
export function updateEnterDueLabel() {
    $('#enter_due_label').html(dateHtml(parseDay($('#enter_due').val())));
}


function renderItem(it) {
    var today   = new Date();
    var dueDate = parseDay(it.due);
    var complDate = parseDate(it.completionDate);
    // due date for open, completion date for completed todos
    var dueHtml = (it.completed == 0) ? dateHtml(dueDate): dateHtml(complDate);
    var isOverdue = it.completed==0 && dueDate != null && (today - dueDate) > 0;
    var line = '<li class="todoItem'+
        ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
        (isOverdue ? ' overdue' : '')+
        '" id="todo'+it.id+'">';
    // deleted todos cannot be completed or reopened
    line += '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
        ((it.completed==1)?'checked="true" ':'')+((it.deleted==1)?'disabled ':'')+
        'aria-label="'+escapeHtml($T('DONE'))+'" /></span>';
    line += '<button type="button" class="todoMain" id="open'+it.id+'" title="'+todoTooltip(it)+'">'+todoTitleHtml(it)+'</button>';
    line += '<span class="todoDue">'+dueHtml+(isOverdue ? ' <span class="exclamation">'+icon('warning')+'</span>':'')+'</span>';
    line += '<span class="todoActions">';
    if (it.deleted == 0) {
        line += iconButton('trash'+it.id, 'deleteButton', 'delete', $T('DELETE'));
    } else {
        line += iconButton('restore'+it.id, 'undeleteButton', 'restore', $T('RESTORE'));
    }
    line += '</span></li>';
    $('#todoList').append(line);
    // a just added todo has no id yet, it is rendered again when it got one
    if (it.id != -1) {
        setListener(it.id);
    }
}


// the chips above the table: one for each tag of the list, which filters the table when it is pressed
export function fillTagList(choices)
{
    // (a tag which was deleted, renamed or merged is no filter any more)
    var names = choices.map(function(tag) { return tag.name; });
    state.filterTags = state.filterTags.filter(function(name) { return names.indexOf(name) != -1; });
    $('#tagbar').empty();
    for (var i=0; i<choices.length; i++) {
        $('<button type="button" class="tagChip tagFilter"></button>')
            .text(choices[i].name)
            .append($('<span class="tagCount"></span>').text(choices[i].tagCount))
            .attr('aria-pressed', state.filterTags.indexOf(choices[i].name) != -1 ? 'true' : 'false')
            .attr('data-tag', choices[i].name)
            .appendTo('#tagbar');
    }
    // (the entries may not be there yet; they are shown when they arrive)
    if (state.itemList !== undefined) {
        renderTable();
    }
}


// a chip of the tag bar was pressed: the tag is a filter, or not any more
export function toggleTagFilter(name) {
    var index = state.filterTags.indexOf(name);
    if (index == -1) {
        state.filterTags.push(name);
    } else {
        state.filterTags.splice(index, 1);
    }
    $('#tagbar .tagFilter').each(function() {
        $(this).attr('aria-pressed', state.filterTags.indexOf($(this).attr('data-tag')) != -1 ? 'true' : 'false');
    });
    renderTable();
}
