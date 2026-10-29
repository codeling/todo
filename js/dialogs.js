// The dialogs: an entry, a tag, and the log.
import { state } from './state.js';
import { findItem, ItemSort, getTodoWithTag } from './items.js';
import { parseDate, parseDay, formatDate } from './dates.js';
import { log, logItems, updateLog, toggleLog } from './log.js';
import { postAction, reportFailure } from './api.js';
import { showReadOnlyTags, getTodoTitleHtml } from './render.js';
import { reloadTagList, refresh } from './load.js';

// dialog width limited to the window width (for small screens)
function dialogWidth(maxWidth) {
    return Math.min(maxWidth, $(window).width() - 20);
}


// keep open dialogs within the window when its size changes (e.g. rotating a phone)
export function keepDialogsInWindow() {
    $(window).on('resize', function() {
        $('.ui-dialog-content').each(function() {
            if (!$(this).dialog('instance') || !$(this).dialog('isOpen')) {
                return;
            }
            var maxWidth = $(this).dialog('option', 'maxWidth');
            if (maxWidth) {
                $(this).dialog('option', 'width', dialogWidth(maxWidth));
            }
            $(this).dialog('option', 'position', { my: 'center', at: 'center', of: window });
        });
    });
}


export function toggleRecurrenceAnchor(e)
{
    var val = $("#modify_recurrenceMode option:selected").val();
    if (val == 0)
    {
        $('.recurrence_dependent').hide();
        $('#modify_recurrenceInterval').hide();
    }
    else
    {
        $('.recurrence_dependent').show();
        $('#modify_recurrenceInterval').show();
    }
}


function fillModifyForm(id) {
    log($T('OPENING_UPDATE_DIALOG'));
    var index = findItem(id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var item = state.itemList[index];
    // set values:
    $('#modify_id').val(item.id);
    $('#modify_todo').val(item.todo);
    $('#modify_due').val(formatDate(parseDay(item.due)));
    $('#modify_start').val(formatDate(parseDay(item.start)));
    $('#modify_start').data('oldVal', formatDate(parseDay(item.start)));
    $('#modify_effort').val(item.effort);
    $('#modify_notes').val(item.notes);
    // otherwise only visible in the tooltip, which touch devices can't show:
    $('#modify_info').text($T('CREATED')+': '+formatDate(parseDate(item.creationDate), true)+
        ((item.completed != 0) ? '; '+$T('DONE')+': '+formatDate(parseDate(item.completionDate), true) : ''));

    state.modifyTagify.removeAllTags();
    state.modifyTagify.settings.whitelist = state.tagList.map( (x) => x.name );

    for (var i=0; i<item.tags.length; i++)
    {
        state.modifyTagify.addTags([ item.tags[i] ]);
    }

    $('#modify_recurrenceMode option:selected').prop('selected', false);
    $('#modify_recurrenceMode option[value="'+item.recurrenceMode+'"]').prop('selected', true);

    $('#modify_recurrenceInterval').val(item.recurrenceInterval);
    $('#modify_recurrenceAnchor option:selected').prop('selected', false);
    $('#modify_recurrenceAnchor option[value="'+item.recurrenceAnchor+'"]').prop('selected', true);

    $('#modify_list option:selected').prop('selected', false);
    $('#modify_list option[value="'+item.list_id+'"]').prop('selected', true);
    toggleRecurrenceAnchor();
}


export function modifyItem(id) {
    fillModifyForm(id);
    // set up store function:
    // show dialog:
    $('#modify_dialog').dialog( {
        modal: true,
        width: dialogWidth(500),
        maxWidth: 500,
        title: $T('MODIFY_ENTRY'),
        close: function(ev,ui) {
            log($T('MODIFY_DIALOG_CLOSED'));
        }
    });
}


export function openTagDialog(tagname)
{
    $('#tag_name').val(tagname);
    var result = $.grep(state.tagList,
        function(e) { return e.name === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_id').val(result[0].id);
    $('#tag_dialog').dialog( {
        modal: true,
        width: dialogWidth(420),
        maxWidth: 420,
        title: $T('EDIT_TAG')
    });
    state.mergeTagify.removeAllTags();
    // a tag cannot be merged into itself:
    state.mergeTagify.settings.whitelist = state.tagList.filter( (x) => x.id != result[0].id ).map( (x) => x.name );
    $('#tag_todo_table').empty();
    var filtered = getTodoWithTag(new Array(tagname));
    filtered.sort(ItemSort);
    var tagbase = 'tag_todo_tags_';
    for (var i=0; i<filtered.length; i++) {
        var line = getTodoTitleHtml(filtered[i], i, tagbase, 'todo', 'div', false);
        $('#tag_todo_table').append(line);
        var elem = $('#'+tagbase+filtered[i].id);
        showReadOnlyTags(elem[0], filtered[i].tags);
    }
}


// the buttons of the tag dialog: on success the dialog is closed and the tags and
// todos are loaded again; false, so that the click does nothing else
export function tagDialogAction(url, data, successKey, errorKey) {
    postAction(url, data).then(function() {
        log($T(successKey));
        $('#tag_dialog').dialog('close');
        reloadTagList();
        refresh();
    }, function(failure) {
        reportFailure(errorKey, failure);
    });
    return false;
}


export function showLogDialog() {
    updateLog('#log_dialog', logItems.length);
    $('#log_dialog').append('<br />',
        $('<a href="#"></a>').text($T('LOG_ONOFF')).on('click', function(e) {
            e.preventDefault();
            toggleLog();
        }));
    $('#log_dialog').dialog({
        modal: true,
        minHeight: 150,
        width: dialogWidth(600),
        maxWidth: 600,
        title: 'Log'
    });
}
