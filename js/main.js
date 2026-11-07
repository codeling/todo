// The entry point of the page (index.php loads only this file, as a module): connects the
// elements of the page to the code and loads the data.
//
// jQuery ($), $T() (lang-js.php) and Tagify are classic scripts which index.php loads
// before; the modules use them as globals. A module is run when the document is parsed (like a
// script with defer), so the elements are all there and no "ready" handler is needed.
import { state, narrowScreenQuery } from './state.js';
import { notify } from './toast.js';
import { formatDate, parseDay, dateDiffInDays, addDays } from './dates.js';
import { logItems } from './log.js';
import { ItemSort } from './items.js';
import { setupAjax } from './api.js';
import { enter, emptyTrash, storeItem, doToday, reactivate, setTrashed } from './actions.js';
import { toggleTagFilter, toggleTagBarExpanded, updateTagBarOverflow, updateEnterDueLabel, toggleTodayOnly, setEnterFixed, enterFixedPressed } from './render.js';
import { reload, refresh, reloadTagList } from './load.js';
import { setupDialogs, keepSuggestionsInDialog, showLogDialog, showTagsDialog, toggleRecurrenceAnchor, openTagDialog, tagDialogAction, updateDueFixed } from './dialogs.js';

// The one way to reach the state of the page from outside the modules: the UI tests
// (tests/ui.test.js) read it, and it helps to look at the page in the browser console.
// Nothing in the application uses it.
window.todoApp = { state, ItemSort, logItems, reloadTagList };

// when the start date in the dialog is changed, move the due date by the same number of days
function shiftDueWithStart(startSel, dueSel) {
    $(startSel).on('change', function() {
        var oldVal = parseDay($(startSel).data('oldVal'));
        var newVal = parseDay($(startSel).val());
        var curDue = parseDay($(dueSel).val());
        if (curDue != null && oldVal != null && newVal != null) {
            $(dueSel).val(formatDate(addDays(curDue, dateDiffInDays(oldVal, newVal))));
        }
        $(startSel).data('oldVal', $(startSel).val());
    });
}

setupDialogs();

// the actions of the dialog of an entry: they close it
function onEntryAction(selector, action) {
    $(selector).on('click', function() {
        var id = parseInt($('#modify_id').val());
        $('#modify_dialog')[0].close();
        action(id);
    });
}
onEntryAction('#modify_dotoday', doToday);
onEntryAction('#modify_reactivate', reactivate);
onEntryAction('#modify_trash', function(id) { setTrashed(id, true); });
onEntryAction('#modify_restore', function(id) { setTrashed(id, false); });

$('#modify_save').on('click', function() {
    // store...
    storeItem();
});
// the chips above the table filter it; the buttons in the dialog "Manage tags" open the dialog of a tag
$('#tagbar').on('click', '.tagFilter', function() {
    toggleTagFilter($(this).attr('data-tag'));
});
$('#tagToggle').on('click', toggleTagBarExpanded);
// (the chips wrap differently when the width changes)
$(window).on('resize', updateTagBarOverflow);
$('#tags_dialog_list').on('click', '.tagManage', function() {
    var name = $(this).attr('data-tag');
    $('#tags_dialog')[0].close();
    openTagDialog(name);
});
// a tag chosen in the merge field is part of what is saved: with it, Save merges (a renaming would be lost with the
// merged tag anyway)
function mergeTagAction() {
    var mergeTagname = state.mergeTagify.value.map((tag) => tag.value)[0];
    var result = $.grep(state.tagList,
        function(e) { return e.name === mergeTagname; });
    if (result.length == 0 || result.length > 1)
    {
        notify("Found no tag or more than one tag with that name, aborting merge!");
        return false;
    }
    return tagDialogAction('queries/merge-tag.php',
        { id: $('#tag_id').val(), merge_id: result[0].id },
        'MERGE_TAG_SUCCESSFUL', 'ERROR_WHILE_MODIFYING');
}
$('#tag_save').on('click', function() {
    if (state.mergeTagify.value.length > 0) {
        return mergeTagAction();
    }
    return tagDialogAction('queries/edit-tag.php',
        { id: $('#tag_id').val(), tag_name: $('#tag_name').val() },
        'EDITED_TAG_SUCCESSFUL', 'ERROR_WHILE_MODIFYING');
});
$('#tag_delete').on('click', function() {
    if (!confirm($T('CONFIRM_DELETE_TAG')))
    {
        return false;
    }
    return tagDialogAction('queries/delete-tag.php',
        { id: $('#tag_id').val() },
        'DELETED_TAG_SUCCESSFUL', 'ERROR_WHILE_DELETING');
});
$('#tag_merge').on('click', mergeTagAction);
// The list of suggestions of a tag field in a dialog is put into the dialog: a modal dialog covers everything else on
// the page, so a list at the end of <body> would be hidden behind it; keepSuggestionsInDialog() places it.
function tagifyInDialog(selector, dialogSelector, settings) {
    var tagify = new Tagify($(selector)[0], $.extend({ dropdown: { appendTarget: $(dialogSelector)[0] } }, settings));
    keepSuggestionsInDialog(tagify);
    return tagify;
}
state.modifyTagify = tagifyInDialog('#modify_tag_edit', '#modify_dialog');
state.mergeTagify = tagifyInDialog('#merge_tag_edit', '#tag_dialog', {
    enforceWhitelist: true,
    mode: "select"
});
$('#modify_recurrenceMode').on('change', function(e) {
    toggleRecurrenceAnchor();
});

setupAjax();

// no inline event handlers, they are blocked by the Content-Security-Policy
$('#inputform, #modifyform').on('submit', function(e) {
    e.preventDefault();
});
$('#enter_save').on('click', enter);
// Enter in one of the fields adds the entry (the form has no submit button, and with two fields the browser does not submit it)
$('#enter_todo, #enter_due').on('keydown', function(e) {
    if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        enter();
    }
});
// the menu (a popover: the browser opens and closes it, also with Escape and a click outside)
$('#menu_button').on('click', function() {
    // below the button, at its right edge
    var box = this.getBoundingClientRect();
    $('#main_menu').css({ top: (box.bottom + 4) + 'px', right: Math.max(4, window.innerWidth - box.right) + 'px' });
});
$('#main_menu .menuItem').on('click', function() {
    $('#main_menu')[0].hidePopover();
});
$('#emptyTrash').on('click', emptyTrash);
$('#showLog').on('click', showLogDialog);
$('#manageTags').on('click', showTagsDialog);

// the completed entries of the last days are loaded, more days on request (the menu); "less" only while there are more
function loadCompletedAge(change) {
    state.reloadData.age = Math.max(0, state.reloadData.age + change);
    $('#loadLessCompleted').prop('disabled', state.reloadData.age == 0);
    reload();
}
$('#loadMoreCompleted').on('click', function() { loadCompletedAge(10); });
$('#loadLessCompleted').on('click', function() { loadCompletedAge(-10); });
// entries which start later are shown on request ("peek upcoming"): a toggle button in the header
$('#loadIncomplete').attr('aria-pressed', 'false');
$('#loadIncomplete').on('click', function() {
    state.reloadData.incomplete = !state.reloadData.incomplete;
    var label = $T(state.reloadData.incomplete ? 'LOAD_INCOMPLETE_HIDE' : 'LOAD_INCOMPLETE');
    $(this).attr({ 'aria-pressed': state.reloadData.incomplete, title: label, 'aria-label': label });
    reload();
});

// only the open entries which are overdue or due today (fixed due dates), on request: a toggle in the header;
// the entries are all loaded, so it only changes what is shown
$('#todayOnly').attr('aria-pressed', 'false').on('click', toggleTodayOnly);

shiftDueWithStart('#modify_start', '#modify_due');
$('#modify_due').on('input change', updateDueFixed);
$('#enter_due').on('input change', updateEnterDueLabel);
$('#enter_fixed').attr('aria-pressed', 'false').on('click', function() {
    setEnterFixed(!enterFixedPressed());
});
$('#enter_due').on('click', function() {
    // the date input is invisible on narrow screens: open the picker on any tap
    if (window.matchMedia(narrowScreenQuery).matches && this.showPicker) {
        try { this.showPicker(); } catch (e) {}
    }
});

$('#refresh').on('click', refresh);

reloadTagList();

refresh();
