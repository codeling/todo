// holds all items of the todo list
var itemList;

// holds all lists of current user
var lists;

// the tags of the current list with their counts
var tagList;

// the Tagify instances (created in the ready handler at the end): the filter above the
// table, the tags in the dialog of a todo, the target of a merge in the dialog of a
// tag, and the list of all tags in the sidebar (created when it is first filled)
var filterTagify;
var modifyTagify;
var mergeTagify;
var tagListTagify;

// screen width up to which the narrow layout of todo.css is used
var narrowScreenQuery = '(max-width: 575px)';
var reloadData = {
    age: 0,
    list_id: 0,
    incomplete: false
};

function Todo(id, todo, due, start, effort,
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

function copyTodo(item)
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
function ItemSort(item1, item2) {
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


function findItem(id) {
    for (var i=0; i<itemList.length; ++i) {
        if (itemList[i].id == id) {
            return i;
        }
    }
    return -1;
}


// shows the table and the progress bar again after the list changed
function refreshView() {
    renderTable();
    updateProgress();
}


function setTrashedLocally(idx, trashed) {
    itemList[idx].deleted = trashed ? 1 : 0;
    refreshView();
}


function deleteLocally(idx) {
    itemList.splice(idx, 1);
    refreshView();
}


function modifyLocally(item) {
    var index = findItem(item.id);
    if (index == -1)
    {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    itemList[index].todo     = item.todo;
    itemList[index].start    = (item.start == '') ? null: item.start;
    itemList[index].effort   = item.effort;
    itemList[index].due      = (item.due == '') ? null: item.due;
    itemList[index].notes    = item.notes;
    itemList[index].tags     = item.tags;
    itemList[index].version  = item.version;
    itemList[index].recurrenceMode = item.recurrenceMode;
    itemList[index].recurrenceInterval = item.recurrenceInterval;
    itemList[index].recurrenceAnchor = item.recurrenceAnchor;
    renderTable();
}


function addLocally(newItem) {
    // just enter at the end, the sorting is done separately anyway
    itemList.push(newItem);
    refreshView();
}


function toggleLocally(item) {
    var index = findItem(item.id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var toggledItem = itemList[index];
    toggledItem.completed = item.completed;
    toggledItem.version = item.version;
    toggledItem.completionDate = item.completionDate;
    refreshView();
}


function emptyTrashLocally() {
    for (var idx = itemList.length-1; idx>=0; --idx) {
        if (itemList[idx].deleted == 1) {
            itemList.splice(idx, 1);
        }
    }
    renderTable();
}


// Sends a request which modifies data. The promise is resolved with the answer of the
// server if the request succeeded, and rejected with { transport: true } if the request
// itself failed or with { message: text } if the server answered with an error message.
// This is the one place which decides what a success is: an integer answer (the id of
// a new entry, a count, or 1). anyAnswer is for the one endpoint with a text as answer.
function postAction(url, data, anyAnswer) {
    return new Promise(function(resolve, reject) {
        $.ajax({
            type: 'POST',
            url: url,
            data: data,
            dataType: 'text'
        }).then(function(answer) {
            if (anyAnswer || /^\d+$/.test(answer)) {
                resolve(answer);
            } else {
                reject({ message: answer });
            }
        }, function() {
            reject({ transport: true });
        });
    });
}

// reports a failed postAction(): the message of the server is logged and shown behind
// the text of the language key prefixKey, a failed transmission is only shown
function reportFailure(prefixKey, failure) {
    if (failure.transport) {
        alert($T('TRANSMISSION_ERROR'));
        return;
    }
    log($T(prefixKey)+failure.message);
    alert($T(prefixKey)+failure.message);
}


function emptyTrash() {
    if (!confirm($T('CONFIRM_EMPTY_TRASH'))) {
        return;
    }
    postAction('queries/empty-trash.php', { list_id: reloadData.list_id }).then(function() {
        log($T('EMPTYING_TRASH_SUCCESSFUL'));
        emptyTrashLocally();
        reloadTagList();
    }, function(failure) {
        reportFailure('ERROR_WHILE_EMPTYING_TRASH', failure);
    });
}


// moves an entry into the trash or back; shown at once and undone if the server refuses
function setTrashed(id, trashed) {
    log($T(trashed ? 'DELETING_ENTRY' : 'RESTORING_ENTRY'));
    var idx = findItem(id);
    if (idx == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    stuff.trash   = trashed ? 1 : 0;
    setTrashedLocally(idx, trashed);
    postAction('queries/trash.php', stuff).then(function() {
        log($T(trashed ? 'DELETING_SUCCESSFUL' : 'RESTORING_SUCCESSFUL'));
    }, function(failure) {
        reportFailure(trashed ? 'ERROR_WHILE_DELETING' : 'ERROR_WHILE_RESTORING', failure);
        // after a transmission error the entry stays as shown, as before
        if (!failure.transport) {
            setTrashedLocally(idx, !trashed);
        }
    });
}


function sendReactivate(id) {
    log($T('REACTIVATING'));
    // the answer is a text, whatever it says
    postAction('queries/reactivate-one.php', { id: id }, true).then(function(answer) {
        log($T('RESULT')+': '+answer);
        refresh();
    }, function() {
        // there is no other failure with this answer
        alert($T('TRANSMISSION_ERROR'));
    });
}


function reactivate(id) {
    var index = findItem(id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    if (itemList[index].completed == 0) {
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
        $('#completed'+id).prop('checked', itemList[index].completed == 1);
    }
}


function toggleCompleted(id) {
    var index = findItem(id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    if (itemList[index].deleted == 1) {
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = itemList[index].completed == 0 ? 1 : 0;
    stuff.version   = itemList[index].version;
    stuff.completionDate = stuff.completed == 1 ? formatDate(getUTCDate(), true) : null;
    // a copy of its own for each request, the item itself is only changed once the server confirmed
    var item = copyTodo(itemList[index]);
    postAction('queries/complete.php', stuff).then(function() {
        item.completed = stuff.completed;
        item.completionDate = stuff.completionDate;
        item.version   = stuff.version + 1;
        toggleLocally(item);
        log($T('UPDATE_SUCCESSFUL'));
    }, function(failure) {
        reportFailure('ERROR_WHILE_MODIFYING', failure);
        resetCompletedCheckbox(id);
    });
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// for inserting text (stored as plain text, or typed by the user) into HTML; null is no text
function textToHtml(str) {
    if (str == null) {
        return '';
    }
    return escapeHtml(str);
}

function toggleRecurrenceAnchor(e)
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
    var item = itemList[index];
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

    modifyTagify.removeAllTags();
    modifyTagify.settings.whitelist = tagList.map( (x) => x.name );

    for (var i=0; i<item.tags.length; i++)
    {
        modifyTagify.addTags([ item.tags[i] ]);
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

function doToday(id)
{
    var idx = findItem(id);
    var today = new Date();
    if (itemList[idx].start == null || parseDay(itemList[idx].start) > today)
    {
        itemList[idx].start = formatDate(getUTCDate(), false);
        storeItemRemote(itemList[idx], function() {});
    }
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


function renderTable() {
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

function renderLists() {
    $('#lists ul').empty();
    for (var i=0; i<lists.length; ++i) {
        renderList(lists[i]);
    }
    $('#lists ul li').on('click', function(event) { 
        reloadData.list_id = $(this).data('list_id');
        reload();
        reloadTagList();
    });

    $('#modify_list').empty();
    for (var i=0; i<lists.length; ++i) {
        $('#modify_list').append($('<option></option>').val(lists[i].id).text(lists[i].name));
    }
}

function arrayContainsAny(needle, haystack) {
    for (var i=0; i<needle.length; i++) {
        if (haystack.indexOf(needle[i]) != -1) {
            return true;
        }
    }
    return false;
}

function getTodoWithTag(filterTags)
{
    var result = new Array();
    for (var i=0; i<itemList.length; i++) {
        if (arrayContainsAny(filterTags, itemList[i].tags)) {
            result.push(itemList[i]);
        }
    }
    return result;
}

function filterList() {
    var result;
    var filterTags = filterTagify.value.map((tag) => tag.value);
    if (filterTags.length == 0) {
        result = itemList.slice(0);
    } else {
        result = getTodoWithTag(filterTags);
    }
    result.sort(ItemSort);
    return result;
}

function updateProgress() {
    var open = 0;
    var done = 0;
    for (var i=0; i<itemList.length; i++) {
        if (itemList[i].deleted == 1) {
            continue;
        }
        if (itemList[i].completed == 0) {
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
    $('#progress_done').attr('title', $T('DONE')+': '+Math.round(donePercent) + ' % ('+done+') '+$T('SINCE_DAYS_PREFIX')+reloadData.age+$T('SINCE_DAYS_POSTFIX'));
}


// dialog width limited to the window width (for small screens)
function dialogWidth(maxWidth) {
    return Math.min(maxWidth, $(window).width() - 20);
}

// keep open dialogs within the window when its size changes (e.g. rotating a phone)
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


function toggleWorking(show) {
    $('#working').css('display', show? 'block':'none');
}


// returns a promise which is resolved when all requests are finished (also failed ones)
function reload() {
    log($T('LOADING_TODO_LIST'));
    // recurring entries which are due are copied first; that modifies data,
    // so it is a POST request (with CSRF token) and not part of loading the list
    var todosLoaded = postAction('queries/reactivate-due.php').then(loadTodos, loadTodos);

    var listsLoaded = $.ajax({
        url: 'queries/query-lists.php',
        type: 'GET',
        dataType: 'text'
    }).done( function(responseText) {
        try {
            lists = JSON.parse(responseText);
        } catch (e) {
            alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+responseText+
                '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
        }
        renderLists();
    });
    return $.when(todosLoaded.catch($.noop), listsLoaded.catch($.noop));
}

function loadTodos() {
    return $.ajax({
        url: 'queries/query-todos.php',
        type: 'GET',
        dataType: 'text',
        data: reloadData
    }).done(function(responseText) {
        try {
            itemList = JSON.parse(responseText);
        } catch (e) {
            alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+responseText+
                '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
        }
        for (var i=0; i<itemList.length; ++i) {
            // make "proper" Todo items out of the loaded values:
            itemList[i].id        = parseInt(itemList[i].id);
            itemList[i].effort    = parseInt(itemList[i].effort);
            itemList[i].completed = parseInt(itemList[i].completed);
            itemList[i].version   = parseInt(itemList[i].version);
            itemList[i].recurrenceMode = parseInt(itemList[i].recurrenceMode);
            itemList[i].recurrenceInterval = parseInt(itemList[i].recurrenceInterval);
            itemList[i].recurrenceAnchor = parseInt(itemList[i].recurrenceAnchor);
        }
        refreshView();
        log($T('LOADING_FINISHED'));
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
        $('#enter_start').val('');
        $('#enter_start').data('oldVal', '');
        // the item in the list is stuff; it has its id now, so it is shown like all others
        stuff.id = parseInt(answer);
        refreshView();
    }, function(failure) {
        reportFailure('ERROR_WHILE_CREATING', failure);
        // remove the item from local list; the  data of it
        // will still remain in the edit fields anyway!
        deleteLocally(findItem(-1));
    });
}

function storeItemRemote(stuff, onsucc) {
    log($T('SAVING_MODIFICATIONS'));
    postAction('queries/update.php', todoParams(stuff)).then(function() {
        reloadTagList(); // a tag might have been added or removed
        // if everything went fine, close dialog:
        log($T('SAVING_SUCCESSFUL'));
        onsucc();
        // only set locally now, else it could be confusing
        stuff.version = stuff.version+1;
        if (stuff.list_id != reloadData.list_id) {
            deleteLocally(findItem(stuff.id));
        } else {
            modifyLocally(stuff);
        }
    }, function(failure) {
        // just keep dialog open...then changed values aren't lost
        reportFailure('ERROR_WHILE_MODIFYING', failure);
    });
}

function storeItem() {
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
        modifyTagify.value.map((tag) => tag.value),
        0,  // deleted items cannot be modified
        itemList[idx].version,
        $('#modify_recurrenceMode').val(),
        $('#modify_recurrenceInterval').val(),
        $('#modify_recurrenceAnchor').val(),
        itemList[idx].completionDate,
        itemList[idx].creationDate,
        $('#modify_list').val()
    );
    storeItemRemote(stuff, function() {
        $('#modify_dialog').dialog('close');
    });
}

function enter() {
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
            reloadData.list_id);
    addItem(stuff);
}

function refresh() {
    toggleWorking(true);
    reload().always(function() {
        toggleWorking(false);
    });
// TODO: change listener, or if that proves impossible,
// refresh every 5-10 minues (or check with server if anything to refresh!!!
//    setTimeout('refresh()', 30000);
}

function reloadTagList() {
    var stuff = new Object();
    stuff.list_id = reloadData.list_id;
    $.ajax({
        url: 'queries/query-tags.php',
        data: stuff,
        dataType: 'json',
        success: function (tags) {
            tagList = tags;
            fillTagList(tagList);
        },
        cache: false
    });
}


function clearTable()
{
    $("#todoTable tbody").empty();
}

// Shows the tags (an array of names) of a todo in an empty input field.
// They are added one by one and not as the value of the input: Tagify parses a value which
// looks like JSON and writes the keys of the objects into the tag element as attribute
// names, without escaping them, so a tag named like that could inject HTML.
function showReadOnlyTags(inputElem, tags) {
    var tagify = new Tagify(inputElem, { readOnly: true });
    tagify.addTags(tags.map(function(tag) {
        return tag.trim();
    }).filter(function(tag) {
        return tag != '';
    }));
}

function getTodoTitleHtml(it, lineNr, tagbasename, spanCssClass, baseElem, checkbox) {
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
function updateEnterDueLabel() {
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

function modifyItem(id) {
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

function openTagDialog(tagname)
{
    $('#tag_name').val(tagname);
    var result = $.grep(tagList,
        function(e) { return e.name === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_id').val(result[0].id);
    $('#tag_dialog').dialog( {
        modal: true,
        width: dialogWidth(420),
        maxWidth: 420,
        title: $T('EDIT_TAG')
    });
    mergeTagify.removeAllTags();
    // a tag cannot be merged into itself:
    mergeTagify.settings.whitelist = tagList.filter( (x) => x.id != result[0].id ).map( (x) => x.name );
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

function fillTagList(choices)
{
    if (tagListTagify) {
        tagListTagify.removeAllTags();
    } else {
        tagListTagify = new Tagify($('#taglist input')[0], { readonly: true } );
    }
    for (var i=0; i<choices.length; i++) {
        tagListTagify.addTags([ choices[i].name ]);
    }
}

// the buttons of the tag dialog: on success the dialog is closed and the tags and
// todos are loaded again; false, so that the click does nothing else
function tagDialogAction(url, data, successKey, errorKey) {
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

$(document).ready(function() {

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
        var mergeTagname = mergeTagify.value.map((tag) => tag.value)[0];
        var result = $.grep(tagList,
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
    filterTagify = new Tagify($('#filter_tag_edit')[0]);
    // tagList not set yet here ...
    filterTagify.on('change', function() {
        renderTable();
    } );
    modifyTagify = new Tagify($('#modify_tag_edit')[0]);
    mergeTagify = new Tagify($('#merge_tag_edit')[0], {
        enforceWhitelist: true,
        mode: "select"
    });
    $('#modify_recurrenceMode').on('change', function(e) {
        toggleRecurrenceAnchor();
    });
});
