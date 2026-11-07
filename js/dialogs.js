// The dialogs: an entry, a tag, and the log.
import { state } from './state.js';
import { notify } from './toast.js';
import { findItem, ItemSort, getTodoWithTag, dueSection } from './items.js';
import { parseDate, parseDay, formatDate } from './dates.js';
import { log, logItems, updateLog } from './log.js';
import { postAction, reportFailure } from './api.js';
import { tagTodoHtml } from './render.js';
import { reloadTagList, refresh } from './load.js';

// The dialogs are <dialog> elements (index.php) which are opened with showModal(): the browser keeps
// the focus in them, closes them with Escape and draws the page behind them as inactive. The buttons
// with data-dialog-close close their dialog, also those which index.php shows in the header and the footer.
export function setupDialogs() {
    $(document).on('click', '[data-dialog-close]', function() {
        this.closest('dialog').close();
    });
    $('#modify_dialog').on('close', function() {
        log($T('MODIFY_DIALOG_CLOSED'));
    });
    followVisualViewport();
}


// On a phone a dialog fills the screen (todo.css). The on-screen keyboard covers the bottom of the screen, but in
// Chrome and Safari it makes only the visual viewport (the part of the page which is visible) smaller, not the layout
// viewport which 100dvh and position: fixed refer to; so the footer with the buttons was behind the keyboard. The
// size and the position of the visual viewport are given to the CSS as --visual-height and --visual-top, and a
// dialog on a narrow screen covers just that part. Not while the page is zoomed in: then the dialog keeps its size,
// as the visible part is only a piece of the dialog.
function followVisualViewport() {
    var viewport = window.visualViewport;
    if (!viewport) {
        return;
    }
    function update() {
        var style = document.documentElement.style;
        if (Math.abs(viewport.scale - 1) < 0.01) {
            style.setProperty('--visual-height', viewport.height + 'px');
            style.setProperty('--visual-top', viewport.offsetTop + 'px');
        } else {
            style.removeProperty('--visual-height');
            style.removeProperty('--visual-top');
        }
    }
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();
}


// Tagify puts the list of suggestions of a field below the field, but adds up the offsets of the ancestors of the
// list to do so, which is wrong in a dialog (the list is in the dialog, because a modal dialog covers everything else
// on the page). So the list is placed again, in the coordinates of the dialog (position: fixed, so it is the
// containing block of the list): below the field, or above it if there is no room below. Tagify places it again
// when the page is resized or scrolled, and it changes the style of the list when it opens: the observer
// puts it where it belongs after each of that.
export function keepSuggestionsInDialog(tagify) {
    var observer = null;
    function place() {
        var list = tagify.DOM.dropdown;
        var dialog = list && list.closest('dialog');
        if (!dialog || !list.isConnected) {
            return;
        }
        var field = tagify.DOM.scope.getBoundingClientRect();
        var box = dialog.getBoundingClientRect();
        var height = list.offsetHeight;
        var above = window.innerHeight - field.bottom < height && field.top > height;
        list.style.left = (field.left - box.left - dialog.clientLeft) + 'px';
        list.style.top = ((above ? field.top - height : field.bottom - 1) - box.top - dialog.clientTop) + 'px';
        list.style.minWidth = list.style.maxWidth = field.width + 'px';
    }
    tagify.on('dropdown:show', function() {
        place();
        if (!observer) {
            observer = new MutationObserver(place);
        }
        observer.observe(tagify.DOM.dropdown, { attributes: true, attributeFilter: ['style'] });
    });
    tagify.on('dropdown:hide', function() {
        if (observer) {
            observer.disconnect();
        }
    });
}


function openDialog(selector) {
    var dialog = $(selector)[0];
    if (!dialog.open) {
        dialog.showModal();
    }
}


export function closeDialog(selector) {
    var dialog = $(selector)[0];
    if (dialog.open) {
        dialog.close();
    }
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
        notify($T('ENTRY_NOT_FOUND'));
        return;
    }
    var item = state.itemList[index];
    // set values:
    $('#modify_id').val(item.id);
    $('#modify_todo').val(item.todo);
    $('#modify_due').val(formatDate(parseDay(item.due)));
    $('#modify_dueFixed').prop('checked', item.dueFixed == 1);
    updateDueFixed();
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
    // the actions which only make sense for this entry: doing it today (if it is open, and not overdue or due today
    // already), reactivating a recurring one which is done, moving it to the trash or back; a deleted entry cannot
    // be changed
    $('#modify_dotoday').prop('hidden', dueSection(item) != 'later');
    $('#modify_reactivate').prop('hidden', !(item.recurrenceMode != 0 && item.completed != 0));
    $('#modify_trash').prop('hidden', item.deleted != 0);
    $('#modify_restore').prop('hidden', item.deleted == 0);
    $('#modify_save').prop('disabled', item.deleted != 0);
}


// "Fixed date" belongs to the due date: without one there is nothing to fix
export function updateDueFixed() {
    $('#modify_dueFixed').prop('disabled', $('#modify_due').val() == '');
}


export function modifyItem(id) {
    fillModifyForm(id);
    openDialog('#modify_dialog');
}


export function openTagDialog(tagname)
{
    $('#tag_name').val(tagname);
    var result = $.grep(state.tagList,
        function(e) { return e.name === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_id').val(result[0].id);
    openDialog('#tag_dialog');
    state.mergeTagify.removeAllTags();
    // a tag cannot be merged into itself:
    state.mergeTagify.settings.whitelist = state.tagList.filter( (x) => x.id != result[0].id ).map( (x) => x.name );
    $('#tag_todo_table').empty();
    var filtered = getTodoWithTag(new Array(tagname));
    filtered.sort(ItemSort);
    for (var i=0; i<filtered.length; i++) {
        $('#tag_todo_table').append(tagTodoHtml(filtered[i]));
    }
}


// the buttons of the tag dialog: on success the dialog is closed and the tags and
// todos are loaded again; false, so that the click does nothing else
export function tagDialogAction(url, data, successKey, errorKey) {
    postAction(url, data).then(function() {
        log($T(successKey));
        closeDialog('#tag_dialog');
        reloadTagList();
        refresh();
    }, function(failure) {
        reportFailure(errorKey, failure);
    });
    return false;
}


export function showLogDialog() {
    updateLog('#log_dialog_text', logItems.length);
    openDialog('#log_dialog');
}


// the tags of the list, to change one of them (the dialog of the tag, with its name, rename, merge and delete)
export function showTagsDialog() {
    var list = $('#tags_dialog_list').empty();
    if (state.tagList.length == 0) {
        list.text($T('NO_TAGS'));
    }
    state.tagList.forEach(function(tag) {
        $('<button type="button" class="tagChip tagManage"></button>').text(tag.name)
            .append($('<span class="tagCount"></span>').text(tag.tagCount))
            .attr('data-tag', tag.name).appendTo(list);
    });
    openDialog('#tags_dialog');
}
