// The entry point of the page (index.php loads only this file, as a module): connects the
// elements of the page to the code and loads the data.
//
// jQuery ($), jQuery UI, $T() (lang-js.php) and Tagify are classic scripts which index.php loads
// before; the modules use them as globals. A module is run when the document is parsed (like a
// script with defer), so the elements are all there and no "ready" handler is needed.
import { state, narrowScreenQuery } from './state.js';
import { formatDate, parseDay, dateDiffInDays, addDays } from './dates.js';
import { logItems, toggleLog } from './log.js';
import { ItemSort } from './items.js';
import { setupAjax } from './api.js';
import { enter, emptyTrash, storeItem } from './actions.js';
import { renderTable, updateEnterDueLabel } from './render.js';
import { reload, refresh, reloadTagList } from './load.js';
import { keepDialogsInWindow, showLogDialog, toggleRecurrenceAnchor, openTagDialog, tagDialogAction } from './dialogs.js';

// The one way to reach the state of the page from outside the modules: the UI tests
// (tests/ui.test.js) read it, and it helps to look at the page in the browser console.
// Nothing in the application uses it.
window.todoApp = { state, ItemSort, logItems, reloadTagList };

// when the start date is changed, move the due date by the same number of days
// (or, if fillEmptyDue is set and no due date is set yet, set it to the start date)
function shiftDueWithStart(startSel, dueSel, fillEmptyDue) {
    $(startSel).on('change', function() {
        var oldVal = parseDay($(startSel).data('oldVal'));
        var newVal = parseDay($(startSel).val());
        var curDue = parseDay($(dueSel).val());
        if (curDue == null) {
            if (fillEmptyDue) {
                $(dueSel).val($(startSel).val());
            }
        } else if (oldVal != null && newVal != null) {
            $(dueSel).val(formatDate(addDays(curDue, dateDiffInDays(oldVal, newVal))));
        }
        $(startSel).data('oldVal', $(startSel).val());
    });
}

keepDialogsInWindow();

$('#modify_save').on('click', function() {
    // store...
    storeItem();
});
$(document.body).on('click', '#taglist .tagify__tag', function() {
    var tagname = this.__tagifyTagData.value;
    if (tagname.indexOf("(") != -1)
    {
        tagname = tagname.substr(0, tagname.indexOf("(")-1).trim();
    }
    openTagDialog(tagname);
});
$('#tag_save').on('click', function() {
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
$('#tag_merge').on('click', function() {
    var mergeTagname = state.mergeTagify.value.map((tag) => tag.value)[0];
    var result = $.grep(state.tagList,
        function(e) { return e.name === mergeTagname; });
    if (result.length == 0 || result.length > 1)
    {
        alert("Found no tag or more than one tag with that name, aborting merge!");
        return false;
    }
    return tagDialogAction('queries/merge-tag.php',
        { id: $('#tag_id').val(), merge_id: result[0].id },
        'MERGE_TAG_SUCCESSFUL', 'ERROR_WHILE_MODIFYING');
});
state.filterTagify = new Tagify($('#filter_tag_edit')[0]);
// tagList not set yet here ...
state.filterTagify.on('change', function() {
    renderTable();
} );
state.modifyTagify = new Tagify($('#modify_tag_edit')[0]);
state.mergeTagify = new Tagify($('#merge_tag_edit')[0], {
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
$('#emptyTrash').on('click', function(e) {
    e.preventDefault();
    emptyTrash();
});
$('#showLog').on('click', function(e) {
    e.preventDefault();
    toggleLog();
});

$("#smallLog").on('click', showLogDialog);

$('#loadMoreCompleted').on('click', function(e) {
    e.preventDefault();
    state.reloadData.age += 10;
    reload();
});
$('#loadLessCompleted').on('click', function(e) {
    e.preventDefault();
    state.reloadData.age -= 10;
    if (state.reloadData.age < 0)
    {
        state.reloadData.age = 0;
    }
    reload();
});
$('#loadIncomplete').on('click', function(e) {
    e.preventDefault();
    state.reloadData.incomplete = !state.reloadData.incomplete;
    $('#loadIncomplete').text(state.reloadData.incomplete?$T('LOAD_INCOMPLETE_HIDE'):$T('LOAD_INCOMPLETE'));
    reload();
});

shiftDueWithStart('#modify_start', '#modify_due', false);
shiftDueWithStart('#enter_start', '#enter_due', true);
$('#enter_due').on('input change', updateEnterDueLabel);
$('#enter_due').on('click', function() {
    // the date input is invisible on narrow screens: open the picker on any tap
    if (window.matchMedia(narrowScreenQuery).matches && this.showPicker) {
        try { this.showPicker(); } catch (e) {}
    }
});

$('#filter .tagify__input').on('focus', function() {
    state.filterTagify.settings.whitelist = state.tagList.map( (x) => x.name );
});

$('#refresh').on('click', refresh);

reloadTagList();

refresh();
