// Showing the entries: the table, the progress bar, the lists and the tags, as HTML built by string
// concatenation. Everything which comes from the user or the database goes through escapeHtml() or
// textToHtml(). The buttons of the rows call the actions (actions.js, dialogs.js) and the list of the
// lists reloads (load.js); they call back here to show the result. So render.js, actions.js, dialogs.js
// and load.js import each other, which is fine as long as they only call each other's functions when
// an event happens, and not while the modules are loaded.
import { state, narrowScreenQuery } from './state.js';
import { parseDate, parseDay, formatDate } from './dates.js';
import { escapeHtml, textToHtml } from './html.js';
import { ItemSort, getTodoWithTag } from './items.js';
import { toggleCompleted, setTrashed, doToday, reactivate } from './actions.js';
import { modifyItem } from './dialogs.js';
import { reload, reloadTagList } from './load.js';

// shows the table and the progress bar again after the list changed
export function refreshView() {
    renderTable();
    updateProgress();
}


function setListener(id) {
    $('#completed'+id).on('click', function() {
        toggleCompleted(id);
    });
    if ($('#modify'+id).length !== 0) {
        $('#modify'+id).on('click', function() {
            modifyItem(id);
        });
    }
    if ($('#dotoday'+id).length !== 0) {
        $('#dotoday'+id).on('click', function() {
            doToday(id);
        });
    }
    $('#trash'+id).on('click', function() {
        setTrashed(id, true);
    });
    $('#restore'+id).on('click', function() {
        setTrashed(id, false);
    });
    $('#reactivate'+id).on('click', function() {
        reactivate(id);
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
        renderItem(filtered[i], i);
    }
}


function renderList(listItem)
{
    var liItem = $('<li></li>').text(listItem.name).data('list_id', listItem.id);
    $('#lists ul').append(liItem);
}

export function renderLists() {
    $('#lists ul').empty();
    for (var i=0; i<state.lists.length; ++i) {
        renderList(state.lists[i]);
    }
    $('#lists ul li').on('click', function(event) { 
        state.reloadData.list_id = $(this).data('list_id');
        reload();
        reloadTagList();
    });

    $('#modify_list').empty();
    for (var i=0; i<state.lists.length; ++i) {
        $('#modify_list').append($('<option></option>').val(state.lists[i].id).text(state.lists[i].name));
    }
}


function filterList() {
    var result;
    var filterTags = state.filterTagify.value.map((tag) => tag.value);
    if (filterTags.length == 0) {
        result = state.itemList.slice(0);
    } else {
        result = getTodoWithTag(filterTags);
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
    $("#todoTable tbody").empty();
}


// Shows the tags (an array of names) of a todo in an empty input field.
// They are added one by one and not as the value of the input: Tagify parses a value which
// looks like JSON and writes the keys of the objects into the tag element as attribute
// names, without escaping them, so a tag named like that could inject HTML.
export function showReadOnlyTags(inputElem, tags) {
    var tagify = new Tagify(inputElem, { readOnly: true });
    tagify.addTags(tags.map(function(tag) {
        return tag.trim();
    }).filter(function(tag) {
        return tag != '';
    }));
}


export function getTodoTitleHtml(it, lineNr, tagbasename, spanCssClass, baseElem, checkbox) {
    var isRecurring = it.recurrenceMode != 0;
    var hasNote = it.notes != null && it.notes != '';
    var hasTags = it.tags.length > 0;
    var createDate = parseDate(it.creationDate);
    // label of the recurrence option (DOM text), goes into an HTML attribute:
    var repetition = escapeHtml(getRecurrenceString(it.recurrenceMode, it.recurrenceInterval));
    var complDate = parseDate(it.completionDate);
    var line = '<'+baseElem+' class="'+spanCssClass+'" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
            '">';
    if (checkbox)
    {
        // deleted todos cannot be completed or reopened
        line += '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+((it.deleted==1)?'disabled ':'')+'/></span>';
    }
    line += '<span class="todo_lineNr">'+(lineNr+1)+'.</span> '+
            '<span>'+textToHtml(it.todo)+'</span>'+
            (hasNote ? '<span class="note" title="'+textToHtml(it.notes)+'"></span>':'')+
            (isRecurring ? '<span class="recurring" title="'+repetition+'"></span>':'');
    if (hasTags) {
        line += ' <input id="'+tagbasename+it.id+'" class="todo_item_tags" readonly>';
    }
    line += '</'+baseElem+'>';
    return line;
}


// action button; the label is shown as tooltip and read by screen readers
function actionButton(spanClass, id, buttonClass, label) {
    return '<span class="'+spanClass+'"><input type="button" id="'+id+'" class="iconButton '+buttonClass+
        '" title="'+escapeHtml(label)+'" aria-label="'+escapeHtml(label)+'" /></span>';
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


function renderItem(it, lineNr) {
    var today   = new Date();
    var dueDate = parseDay(it.due);
    var complDate = parseDate(it.completionDate);
    // due date for open, completion date for completed todos
    var dueHtml = (it.completed == 0) ? dateHtml(dueDate): dateHtml(complDate);
    var isOverdue = it.completed==0 && dueDate != null && (today - dueDate) > 0;
    var line = '<tr class="line'+
        ((lineNr%2!=0)?' line_odd':'')+
        ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
            '" id="todo'+it.id+'">';
    var overdue = isOverdue ? ' <span class="exclamation"></span>':'';
    var tagbasename = 'todo_tags_';
    line += getTodoTitleHtml(it, lineNr, tagbasename, 'todo', 'td', true);
    line +=  '<td class="start">'+((it.start == null)?'undef':formatDate(parseDay(it.start)))+'</td>'+
        '<td class="due'+(isOverdue ? ' overdue' : '')+'">'+ dueHtml+overdue+'</td>'+
        '<td class="effort">'+it.effort+'</td>'+
        '<td class="actions">';
    if (it.recurrenceMode != 0 && it.completed != 0) {
        line += actionButton('reactivate', 'reactivate'+it.id, 'reactivateButton', $T('REACTIVATE'));
    }
    line += actionButton('modify', 'modify'+it.id, 'editButton', $T('EDIT'))+
        actionButton('dotoday', 'dotoday'+it.id, 'todayButton', $T('DOTODAY'));
    if (it.deleted == 0) {
        line += actionButton('trash', 'trash'+it.id, 'deleteButton', $T('DELETE'));
    } else {
        line += actionButton('restore', 'restore'+it.id, 'undeleteButton', $T('RESTORE'));
    }
    line += '</td></tr>';
    $('#todoTable tbody').append(line);
    var elem = $('#'+tagbasename+it.id);
    if (it.tags.length > 0) {
        showReadOnlyTags(elem[0], it.tags);
    }
    // a just added todo has no id yet, it is rendered again when it got one
    if (it.id != -1) {
        setListener(it.id);
        // on narrow screens the edit button is hidden, a tap on the todo opens the dialog instead
        $('#todo'+it.id+' td.todo').on('click', function(e) {
            if (window.matchMedia(narrowScreenQuery).matches && $(e.target).closest('.completed').length == 0) {
                modifyItem(it.id);
            }
        });
    }
}


export function fillTagList(choices)
{
    if (state.tagListTagify) {
        state.tagListTagify.removeAllTags();
    } else {
        state.tagListTagify = new Tagify($('#taglist input')[0], { readonly: true } );
    }
    for (var i=0; i<choices.length; i++) {
        state.tagListTagify.addTags([ choices[i].name ]);
    }
}
