// holds all items of the todo list
var itemList;

// holds all lists of current user
var lists;

var currentlyModified = null;
var reloadData = {
    age: 0,
    list_id: 0,
    incomplete: false
};
var listsData = {user_id: 0};

function Todo(id, todo, due, start, effort,
        completed, notes, tags, deleted,
        version, recurrenceMode, recurrenceAnchor,
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
        item.version, item.recurrenceMode, item.recurrenceAnchor,
        item.completionDate, item.creationDate, item.list_id
    );
}


function printItem(item)
{
    alert(JSON.stringify(item).replace(/,/g,"\n").replace(/[{}\"]/g, ""));
}


function ItemSort(item1, item2) {
    var less =
        (item1.deleted < item2.deleted) ||
        (
          (item1.deleted == item2.deleted) &&
          (
            (item1.completed < item2.completed) ||
            (
              (item1.completed == item2.completed) &&
              (
                (
                  (item1.completed == 0) &&
                  (
                    (item2.start == null && item1.start != null) ||
                    (
                      (item1.start < item2.start) ||
                      (
                        (item1.start == item2.start) &&
                        (
                          (item2.due == null && item1.due != null) ||
                          (
                            (item1.due < item2.due) ||
                            (item1.due == item2.due &&
                             item1.todo < item2.todo)
                          )
                        )
                      )
                    )
                  )
                ) || (
                  (item1.completed == 1) &&
                  (
                    (item1.completionDate > item2.completionDate) ||
                    (
                      (item1.completionDate == item2.completionDate) &&
                      (
                        (item2.start == null && item1.start != null) ||
                        (
                          (item1.start < item2.start) ||
                          (
                            (item1.start == item2.start) ||
                            (item1.todo < item2.todo)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        );
    // log('item1: c='+item1.completed+', p='+item1.start+'; item2: c='+item2.completed+', p='+item2.start+'; less: '+less);
    if (less) {
        return -1;
    } else if (item1.deleted == item2.deleted &&
               item1.completed == item2.completed &&
               item1.start == item2.start &&
               item1.todo == item2.todo &&
               item1.tags == item2.tags &&
               (item1.completed == 0 || item1.completionDate == item2.completionDate) ) {
        return 0;
    } else {
        return 1;
    }
}


function findItem(id) {
    for (var i=0; i<itemList.length; ++i) {
        if (itemList[i].id == id) {
            return i;
        }
    }
    return -1;
}


function trashLocally(idx) {
    itemList[idx].deleted = 1;
    renderTable();
    updateProgress();
}


function deleteLocally(idx) {
    itemList.splice(idx, 1);
    renderTable();
    updateProgress();
}


function restoreLocally(idx) {
    itemList[idx].deleted = 0;
    renderTable();
    updateProgress();
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
    itemList[index].recurrenceAnchor = item.recurrenceAnchor;
    renderTable();
}


function addLocally(newItem) {
    // just enter at the end, the sorting is done separately anyway
    var insertIdx = itemList.length;
/*
    while(insertIdx < itemList.length && 
        ItemSort(newItem, itemList[insertIdx]) > 0) {
        ++insertIdx;
    }
*/
    itemList.splice(insertIdx, 0, newItem);
    renderTable();
    updateProgress();
}


function toggleLocally(item) {
    var index = findItem(item.id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    toggledItem = itemList[index];
    toggledItem.completed = item.completed;
    toggledItem.version = item.version;
    toggledItem.completionDate = item.completionDate;
    renderTable();
    updateProgress();
}


function emptyTrashLocally() {
    for (idx = itemList.length-1; idx>=0; --idx) {
        if (itemList[idx].deleted == 1) {
            itemList.splice(idx, 1);
        }
    }
    renderTable();
}


function emptyTrash() {
    if (!confirm($T('CONFIRM_EMPTY_TRASH'))) {
        return;
    }
    var stuff = new Object();
    stuff.list_id = reloadData.list_id;
    $.ajax( {
        type: 'POST',
        url: 'queries/empty-trash.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log($T('ERROR_WHILE_EMPTYING_TRASH')+returnValue);
                alert($T('ERROR_WHILE_EMPTYING_TRASH')+returnValue);
            } else {
                log($T('EMPTYING_TRASH_SUCCESSFUL'));
                emptyTrashLocally();
                reloadTagList();
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
   });

}


function trashItem(id) {
    log($T('DELETING_ENTRY'));
    var idx = findItem(id);
    if (idx == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    stuff.trash   = 1;
    trashLocally(idx);
    $.ajax( {
        type: 'POST',
        url: 'queries/trash.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log($T('ERROR_WHILE_DELETING')+returnValue);
                alert($T('ERROR_WHILE_DELETING')+returnValue);
                restoreLocally(idx);
            } else {
                log($T('DELETING_SUCCESSFUL'));
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
   });
}


function restoreItem(id) {
    log($T('RESTORING_ENTRY'));
    var idx = findItem(id);
    if (idx == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.version = itemList[idx].version;
    stuff.trash   = 0;
    restoreLocally(idx);
    $.ajax( {
        type: 'POST',
        url: 'queries/trash.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log($T('ERROR_WHILE_RESTORING')+returnValue);
                alert($T('ERROR_WHILE_RESTORING')+returnValue);
                trashLocally(idx);
            } else {
                log($T('RESTORING_SUCCESSFUL'));
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
   });
}


function sendReactivate(id) {
    log($T('REACTIVATING'));
    var idobj = new Object();
    idobj.id = id;
    $.ajax( {
        type: 'POST',
        url: 'queries/reactivate-one.php',
        data: idobj,
        success: function(returnValue) {
            log($T('RESULT')+': '+returnValue);
            refresh();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
    });
}


function reactivate(id) {
    var index = findItem(id);
    if (itemList[index].completed == 0) {
        return;
    }
    if (!confirm($T('CONFIRM_REACTIVATION'))) {
        return;
    }
    sendReactivate(id);
}


function toggleCompleted(id) {
    var index = findItem(id);
    if (index == -1) {
        alert($T('ENTRY_NOT_FOUND'));
        return;
    }
    var stuff = new Object();
    stuff.id = id;
    stuff.completed = itemList[index].completed == 0 ? 1 : 0;
    stuff.version   = itemList[index].version;
    stuff.completionDate = stuff.completed == 1 ? formatDate(getUTCDate(), true) : null;
    currentlyModified = copyTodo(itemList[index]);
    $.ajax({
        type: 'POST',
        url: 'queries/complete.php',
        data: stuff,
        success: function(returnValue) {
            if (returnValue != 1) {
                log($T('ERROR_WHILE_MODIFYING')+returnValue);
                alert($T('ERROR_WHILE_MODIFYING')+returnValue);
                // reset checkbox:
                var checked = $('#completed'+currentlyModified.id).prop('checked');
                if (checked=='checked') {
                    $('#completed'+currentlyModified.id).prop('checked', false);
                } else {
                    $('#completed'+currentlyModified.id).prop('checked', true);
                }
            } else {
                currentlyModified.completed = stuff.completed;
                currentlyModified.completionDate = stuff.completionDate;
                currentlyModified.version   = stuff.version + 1;
                toggleLocally(currentlyModified);
                log($T('UPDATE_SUCCESSFUL'));
            }
            currentlyModified = null;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
    });
}

function html_entity_decode(str) {
    var txtEl = document.createElement('textarea');
    txtEl.innerHTML = str;
    return txtEl.value;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// for inserting text from the server (stored HTML-encoded) or from user input
// (not encoded yet) into HTML: decode once, then encode, so both end up correct and safe
function textToHtml(str) {
    if (str == null) {
        return '';
    }
    return escapeHtml(html_entity_decode(str));
}

function toggleRecurrenceAnchor(e)
{
    var val = $("#modify_recurrenceMode option:selected").val();
    if (val == 0)
    {
        $('.recurrence_dependent').hide();
    }
    else
    {
        $('.recurrence_dependent').show();
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
    $('#modify_todo').val(html_entity_decode(item.todo));
    $('#modify_due').val(formatDate(parseDay(item.due)));
    $('#modify_start').val(formatDate(parseDay(item.start)));
    $('#modify_start').data('oldVal', formatDate(parseDay(item.start)));
    $('#modify_effort').val(item.effort);
    $('#modify_notes').val(html_entity_decode(item.notes));
    // otherwise only visible in the tooltip, which touch devices can't show:
    $('#modify_info').text($T('CREATED')+': '+formatDate(parseDate(item.creationDate), true)+
        ((item.completed != 0) ? '; '+$T('DONE')+': '+formatDate(parseDate(item.completionDate), true) : ''));

    var tagify = $('#modify_tag_edit')[0].__tagify;
    tagify.removeAllTags();
    let tagStrs = tagList.map( (x) => x.name );
    $('#modify_tag_edit')[0].__tagify.settings.whitelist = tagStrs;

    var tags = (item.tags == null) ? new Array() : item.tags.split(",");
    for (var i=0; i<tags.length; i++)
    {
        tagify.addTags([ html_entity_decode(tags[i]) ] );
    }

    $('#modify_recurrenceMode option:selected').prop('selected', false);
    $('#modify_recurrenceMode option[value="'+item.recurrenceMode+'"]').prop('selected', true);

    $('#modify_recurrenceAnchor option:selected').prop('selected', false);
    $('#modify_recurrenceAnchor option[value="'+item.recurrenceAnchor+'"]').prop('selected', true);

    $('#modify_list option:selected').prop('selected', false);
    $('#modify_list option[value="'+item.list_id+'"]').prop('selected', true);
    toggleRecurrenceAnchor();
}

function fillStr(str, fillchar, count) {
    var fillStr = '';
    for (var i=0; i < (count - str.toString().length); ++i) {
        fillStr += fillchar;
    }
    return fillStr + str;
}


// parse a UTC timestamp ("yyyy-mm-dd hh:mm:ss", e.g. creation or completion date)
function parseDate(dateStr) {
    if (dateStr == null || dateStr == '') {
        return null;
    }
    var parts = dateStr.split(' ');
    if (parts.length < 1 || parts.length > 2) {
        return null;
    }
    var datePart = parts[0].split('-');
    var timePart = new Array(0, 0, 0);
    if (parts.length > 1) {
         timePart = parts[1].split(':');
    }
    return new Date(Date.UTC(datePart[0], datePart[1]-1, datePart[2], timePart[0], timePart[1], timePart[2], 0));
}

// parse a calendar day ("yyyy-mm-dd", optionally followed by a time which is
// ignored; start and due date): local midnight of that day, so that it is
// shown as the same day in every time zone
function parseDay(dateStr) {
    if (dateStr == null || dateStr == '') {
        return null;
    }
    var datePart = dateStr.split(' ')[0].split('-');
    if (datePart.length != 3) {
        return null;
    }
    return new Date(datePart[0], datePart[1]-1, datePart[2]);
}
 

function formatDate(date, includeTime) {
    if (date == null){
        return '';
    }
    if (isNaN(date.getFullYear())) {
        return 'invalid';
    }
    result = ''+
        date.getFullYear()               +'-'+
        fillStr(date.getMonth()+1, '0', 2) +'-'+
        fillStr(date.getDate() , '0', 2);
    if (includeTime != null && includeTime == true)
    {
        result += ' ' + fillStr(date.getHours(), '0', 2) + ':' +
                  fillStr(date.getMinutes(), '0', 2) + ':' +
                  fillStr(date.getSeconds(), '0', 2);
    }
    return result;
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
        trashItem(id);
    });
    $('#restore'+id).on('click', function() {
        restoreItem(id);
    });
    $('#reactivate'+id).on('click', function() {
        reactivate(id);
    });
}


function getRecurrenceString(recurrenceMode)
{
    return $('#modify_recurrenceMode option[value="'+recurrenceMode+'"]').text();
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
    var liItem = $('<li></li>').text(html_entity_decode(listItem.name)).data('list_id', listItem.id);
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
        $('#modify_list').append($('<option></option>').val(lists[i].id).text(html_entity_decode(lists[i].name)));
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
        if (itemList[i].tags == null) {
            continue;
        }
        var itemTags = itemList[i].tags.split(',');
        if (arrayContainsAny(filterTags, itemTags)) {
            result.push(itemList[i]);
        }
    }
    return result;
}

function filterList() {
    let filterTags = $('#filter_tag_edit')[0].__tagify.value.map((tag) => tag.value);
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
    $('#progress_todo').css('width', ((progressWidth*open/count))+'%');
    $('#progress_done').css('width', ((progressWidth*done/count))+'%');
    $('#progress_todo').attr('title', $T('OPEN')+': '+open);
    $('#progress_done').attr('title', $T('DONE')+': '+Math.round(100*done/count) + ' % ('+done+') '+$T('SINCE_DAYS_PREFIX')+reloadData.age+$T('SINCE_DAYS_POSTFIX'));
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


function reload() {
    log($T('LOADING_TODO_LIST'));
    $.ajax({
        url: 'queries/query-todos.php',
        type: 'GET',
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
            itemList[i].recurrenceAnchor = parseInt(itemList[i].recurrenceAnchor);
        }
        renderTable();
        updateProgress();
        log($T('LOADING_FINISHED'));
    });

    $.ajax({
        url: 'queries/query-lists.php',
        type: 'GET',
        data: listsData
    }).done( function(responseText) {
        try {
            lists = JSON.parse(responseText);
        } catch (e) {
            alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+responseText+
                '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
        }
        renderLists();
    });
}

function getUTCDate() {
    var now = new Date(); 
    var now_utc = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    );
    return now_utc;
}

function addItem(stuff) {
    addLocally(stuff);
    $.ajax( {
        type: 'POST',
        url: 'queries/enter.php',
        data: stuff,
        success: function(returnValue) {
            if (isNaN(returnValue)) {
                log($T('ERROR_WHILE_CREATING')+returnValue);
                alert($T('ERROR_WHILE_CREATING')+returnValue);
                // remove the item from local list; the  data of it
                // will still remain in the edit fields anyway!
                deleteLocally(findItem(-1));
            } else {
                reloadTagList(); // a tag might have been added or removed
                log($T('CREATING_SUCCESSFUL'));
                $('#enter_todo').val('');
                $('#enter_due').val('');
                $('#enter_start').val('');
                $('#enter_start').data('oldVal', '');
                $('#enter_effort').val('1');
                var index = findItem(-1);
                var id = parseInt(returnValue);
                itemList[index].id = id;
                $('#todo-1').attr('id', 'todo'+id);
                $('#completed-1').attr('id', 'completed'+id);
                $('#modify-1').attr('id', 'modify'+id);
                $('#trash-1').attr('id', 'trash'+id);
                setListener(id);
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
            deleteLocally(findItem(-1));
        }
    });
}

function storeItemRemote(stuff, onsucc) {
    currentlyModified = stuff;
    log($T('SAVING_MODIFICATIONS'));
    $.ajax({
        type: 'POST',
        url: 'queries/update.php',
        data: stuff,
        success: function(returnValue) {
            if (isNaN(returnValue)) {
                log($T('ERROR_WHILE_MODIFYING')+returnValue);
                alert($T('ERROR_WHILE_MODIFYING')+returnValue);
            // just keep dialog open...then changed values aren't lost
            } else {
                reloadTagList(); // a tag might have been added or removed
                // if everything went fine, close dialog:
                log($T('SAVING_SUCCESSFUL'));
                onsucc();
                // only set locally now, else it could be confusing
                currentlyModified.version = currentlyModified.version+1;
                if (currentlyModified.list_id != reloadData.list_id) {
                    deleteLocally(findItem(currentlyModified.id));
                } else {
                    modifyLocally(currentlyModified);
                }
                currentlyModified = null;
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert($T('TRANSMISSION_ERROR'));
        }
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
        $('#modify_tag_edit')[0].__tagify.value.map((tag) => tag.value).join(","),
        0,  // deleted items cannot be modified
        itemList[idx].version,
        $('#modify_recurrenceMode').val(),
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
    var tags = '';
    if (colon != -1) {
        tags = todo.substr(0, colon);
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
            0, '', tags, 0, 1, 0 /* recurrenceMode */, 0 /* recurrenceAnchor */,
            null, formatDate(getUTCDate(), true),
            reloadData.list_id);
    addItem(stuff);
}

function refresh() {
    toggleWorking(true);
    reload();
    toggleWorking(false);
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

function getTodoTitleHtml(it, lineNr, tagbasename, spanCssClass, baseElem, checkbox, extraHtml) {
    var isRecurring = it.recurrenceMode != 0;
    var hasNote = it.notes != null && it.notes != '';
    var hasTags = it.tags != null && it.tags != '';
    var createDate = parseDate(it.creationDate);
    var repetition = getRecurrenceString(it.recurrenceMode);
    var complDate = parseDate(it.completionDate);
    line =   '<'+baseElem+' class="'+spanCssClass+'" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
            '">';
    if (checkbox)
    {
        line += '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>';
	}
    line += '<span class="todo_lineNr">'+(lineNr+1)+'.</span> '+
            '<span>'+textToHtml(it.todo)+'</span>'+
            (hasNote ? '<span class="note" title="'+textToHtml(it.notes)+'"></span>':'')+
            (isRecurring ? '<input type="button" class="reactivateButton" id="reactivate'+it.id+'" />':'');
    if (hasTags) {
        line += ' <input id="'+tagbasename+it.id+'" class="todo_item_tags" readonly value="'+textToHtml(it.tags)+'">';
    }
    if (extraHtml) {
        line += extraHtml;
    }
    line += '</'+baseElem+'>';
    return line;
}

function renderItem(it, lineNr) {
    var today   = new Date();
    var dueDate = parseDay(it.due);
    var complDate = parseDate(it.completionDate);
    var dueString = (it.completed == 0) ? formatDate(dueDate): formatDate(complDate);
    var line = '<tr class="line'+
        ((lineNr%2!=0)?' line_odd':'')+
        ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
            '" id="todo'+it.id+'">';
    var overdue = (it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <span class="exclamation"></span>':'';
    // shown instead of the start/due columns on narrow screens:
    // start -> due for open, completion date for completed todos
    var narrowDateStr = dueString;
    if (it.completed == 0 && it.start != null) {
        narrowDateStr = formatDate(parseDay(it.start)) + ((dueString != '') ? ' \u2192 ' + dueString : '');
    }
    var narrowDates = (narrowDateStr != '' || overdue != '') ?
        ' <span class="narrow_dates">'+narrowDateStr+overdue+'</span>' : '';
    var tagbasename = 'todo_tags_';
    line += getTodoTitleHtml(it, lineNr, tagbasename, 'todo', 'td', true, narrowDates);
    line +=  '<td class="start">'+((it.start == null)?'undef':formatDate(parseDay(it.start)))+'</td>'+
        '<td class="due">'+ dueString+overdue+'</td>'+
        '<td class="effort">'+it.effort+'</td>'+
        '<td class="actions">'+
            '<span class="modify"><input type="button" alt="'+
                $T('EDIT')+'" id="modify'+it.id+
                '" class="editButton" /></span>'+
            '<span class="dotoday"><input type="button" alt="'+
                $T('DOTODAY')+'" id="dotoday'+it.id+
                '" class="todayButton" /></span>';
    if (it.deleted == 0) {
        line += '<span class="trash"><input type="button" alt="'+
               $T('DELETE')+'" id="trash'+it.id+
               '" class="deleteButton" /></span>';
    } else {
        line += '<span class="restore"><input type="button" alt="'+
               $T('RESTORE')+'" id="restore'+it.id+
               '" class="undeleteButton" /></span>';
    }
    line += '</td></tr>';
    $('#todoTable tbody').append(line);
    var elem = $('#'+tagbasename+it.id);
    if (it.tags != null && it.tags != '') {
        new Tagify(elem[0], { readOnly: true } );
    }
    if (window.matchMedia('(hover: hover)').matches) {
        // debug output; not on touch devices, where a double tap would trigger it
        $('#todo'+it.id).on('dblclick', function() {
            printItem(it);
        });
    }
    if (it.id != -1) {
        setListener(it.id);
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
        function(e) { return html_entity_decode(e.name) === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_id').val(result[0].id);
    $('#tag_dialog').dialog( {
        modal: true,
        width: dialogWidth(420),
        maxWidth: 420,
        title: $T('EDIT_TAG')
    });
    var tagify = $('#merge_tag_edit')[0].__tagify;
    tagify.removeAllTags();
    tagify.settings.whitelist = tagList.map( (x) => x.name );
    $('#tag_todo_table').empty();
    var filtered = getTodoWithTag(new Array(tagname));
    filtered.sort(ItemSort);
    var tagbase = 'tag_todo_tags_';
    for (var i=0; i<filtered.length; i++) {
        var line = getTodoTitleHtml(filtered[i], i, tagbase, 'todo', 'div', false);
        $('#tag_todo_table').append(line);
        var elem = $('#'+tagbase+filtered[i].id); // .tagit({readOnly: true});
        new Tagify(elem[0], { readOnly: true } );
    }
}

function fillTagList(choices)
{
    var tagify;
    if ($('#taglist input')[0].__tagify) {
        tagify = $('#taglist input')[0].__tagify;
        tagify.removeAllTags();
    } else {
        tagify = new Tagify($('#taglist input')[0], { readonly: true } );
    }
    for (var i=0; i<choices.length; i++) {
        tagify.addTags([ html_entity_decode(choices[i].name) ]);
    }
}

function isInt(value)
{
    return !isNaN(value) && 
        parseInt(Number(value)) == value && 
        !isNaN(parseInt(value, 10));
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
        var tagobject = new Object();
        tagobject.id = $('#tag_id').val();
        tagobject.tag_name = $('#tag_name').val();
        $.ajax( {
            type: 'POST',
            url: 'queries/edit-tag.php',
            data: tagobject,
            success: function(returnValue) {
                if (isInt(returnValue)) {
                    log($T('EDITED_TAG_SUCCESSFUL'));
                    $('#tag_dialog').dialog('close');
                    reloadTagList();
                    refresh();
                } else {
                    log($T('ERROR_WHILE_MODIFYING')+returnValue);
                    alert($T('ERROR_WHILE_MODIFYING')+returnValue);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert($T('TRANSMISSION_ERROR'));
            }
        });
        return false;
    });
    $('#tag_delete').on('click', function() {
        if (!confirm($T('CONFIRM_DELETE_TAG')))
        {
            return false;
        }
        var tagidobject = new Object();
        tagidobject.id = $('#tag_id').val();
        $.ajax( {
            type: 'POST',
            url: 'queries/delete-tag.php',
            data: tagidobject,
            success: function(returnValue) {
                if (isInt(returnValue)) {
                    log($T('DELETED_TAG_SUCCESSFUL'));
                    $('#tag_dialog').dialog('close');
                    refresh();
                    reloadTagList();
                } else {
                    log($T('ERROR_WHILE_DELETING')+returnValue);
                    alert($T('ERROR_WHILE_DELETING')+returnValue);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert($T('TRANSMISSION_ERROR'));
            }
        });
        return false;
    });
    $('#tag_merge').on('click', function() {
        var tagobject = new Object();
        tagobject.id = $('#tag_id').val();
        merge_tagname = $('#merge_tag_edit')[0].__tagify.value.map((tag) => tag.value)[0];
        var result = $.grep(tagList,
            function(e) { return html_entity_decode(e.name) === merge_tagname; });
        if (result.length == 0 || result.length > 1)
        {
            alert("Found no tag or more than one tag with that name, aborting merge!");
            return false;
        }
        tagobject.merge_id = result[0].id;
        $.ajax( {
            type: 'POST',
            url: 'queries/merge-tag.php',
            data: tagobject,
            success: function(returnValue) {
                if (isInt(returnValue)) {
                    log($T('MERGE_TAG_SUCCESSFUL'));
                    $('#tag_dialog').dialog('close');
                    reloadTagList();
                    refresh();
                } else {
                    log($T('ERROR_WHILE_MODIFYING')+returnValue);
                    alert($T('ERROR_WHILE_MODIFYING')+returnValue);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert($T('TRANSMISSION_ERROR'));
            }
        });
        return false;
    });
    var filterTagEdit = $('#filter_tag_edit');
    // tagList not set yet here ...
    var tagify = new Tagify(filterTagEdit[0]);
    tagify.on('change', function() {
        renderTable();
    } );
    var modifyTagEdit = $('#modify_tag_edit');
    var mergeTagEdit = $('#merge_tag_edit');
    var mergeTagEditTagify = new Tagify(mergeTagEdit[0], {
        enforceWhitelist: true,
        mode: "select"
    });
    /*
        autocomplete: {
            source: function( search, showChoices) {
                onlyTags = new Array();
                for (var i=0; i<tagList.length; ++i)
                {
                    if (tagList[i].name.toLowerCase().indexOf(search.term.toLowerCase()) != -1)
                    {
                        onlyTags.push(tagList[i].name);
                    }
                }
                showChoices(this._subtractArray(onlyTags, this.assignedTags()));
            },
            delay: 2, minLength: 2
        },
        mode: select,
        singleFieldNode: $('#merge_tag'),
        tagLimit: 1
    });
    */
    $('#modify_recurrenceMode').on('change', function(e) {
        toggleRecurrenceAnchor();
    });
});
