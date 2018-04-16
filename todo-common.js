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
        type: 'GET',
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
    $('#modify_due').val(formatDate(parseDate(item.due)));
    $('#modify_start').val(formatDate(parseDate(item.start)));
    $('#modify_start').data('oldVal', formatDate(parseDate(item.start)));
    $('#modify_effort').val(item.effort);
    $('#modify_notes').val(html_entity_decode(item.notes));
    $('#modify_tag_edit').tagit('removeAll');
    var tags = (item.tags == null) ? new Array() : item.tags.split(",");
    for (var i=0; i<tags.length; i++)
    {
        $("#modify_tag_edit").tagit("createTag", html_entity_decode(tags[i]));
    }

    $('#modify_recurrenceMode option:selected').prop('selected', false);
    $('#modify_recurrenceMode option[value="'+item.recurrenceMode+'"]').prop('selected', true);

    $('#modify_recurrenceAnchor option:selected').prop('selected', false);
    $('#modify_recurrenceAnchor option[value="'+item.recurrenceAnchor+'"]').prop('selected', true);

    $('#modify_list option:selected').prop('selected', false);
    $('#modify_list option[value="'+item.list_id+'"]').prop('selected', true); }

function emptyModifyForm()
{
    $('#modify_id').val(-1);
    $('#modify_todo').val('');
    $('#modify_due').val('');
    $('#modify_start').val('');
    $('#modify_start').data('oldVal', '');
    $('#modify_effort').val(1);
    $('#modify_notes').val('');
    $('#modify_tag_edit').tagit('removeAll');
    $('#modify_recurrenceMode option:selected').prop('selected', false);
    $('#modify_recurrenceAnchor option:selected').prop('selected', false);
}

function fillStr(str, fillchar, count) {
    var fillStr = '';
    for (var i=0; i < (count - str.toString().length); ++i) {
        fillStr += fillchar;
    }
    return fillStr + str;
}


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
    if (itemList[idx].start == null || parseDate(itemList[idx].start) > today)
    {
        itemList[idx].start = formatDate(getUTCDate(), false);
        storeItemRemote(itemList[idx], function() {});
    }
}

function setListener(id) {
    $('#completed'+id).click(function() {
        toggleCompleted(id);
    });
    if ($('#modify'+id).length !== 0) { // needed for mobile version - there we don't have the modifyID element
        $('#modify'+id).click(function() {
            modifyItem(id);
        });
    }
    if ($('#dotoday'+id).length !== 0) { // needed for mobile version - there we don't have the modifyID element
        $('#dotoday'+id).click(function() {
            doToday(id);
        });
    }
    $('#trash'+id).click(function() {
        trashItem(id);
    });
    $('#restore'+id).click(function() {
        restoreItem(id);
    });
    $('#reactivate'+id).click(function() {
        reactivate(id);
    });
}


function getRecurrenceString(recurrenceMode)
{
    return $('#modify_recurrenceMode option[value="'+recurrenceMode+'"]').text();
}


function renderTable() {
    $('#todoTable').empty();
    var filtered = filterList();
    for (var i=0; i<filtered.length; i++) {
        renderItem(filtered[i], i);
    }
}

function renderList(listItem)
{
    var liItem = $.parseHTML('<li>' + listItem.name + '</li>');
    $('#lists ul').append(liItem);
}

function renderLists() {
    $('#lists ul').empty();
    for (var i=0; i<lists.length; ++i) {
        renderList(lists[i]);
    }
    $('#lists ul li').on('click', function(event) { 
        for (var i=0; i<lists.length; ++i) {
             if (lists[i].name == $(this).text()) {
                 reloadData.list_id = lists[i].id;
                 reload();
                 reloadTagList();
                 break;
             }
        }
    });

    $('#modify_list').empty();
    for (var i=0; i<lists.length; ++i) {
        $('#modify_list').append('<option value='+lists[i].id+'>'+lists[i].name+'</option>');
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
    if ($('#filter_tags').length == 0 || $('#filter_tags').val() == '') {
        result = itemList.slice(0);
    } else {
        filterTags = $('#filter_tags').val().split(',');
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
    var progressWidth = 99.5; // in percent
    $('#progress_todo').css('width', ((progressWidth*open/count))+'%');
    $('#progress_done').css('width', ((progressWidth*done/count))+'%');
    $('#progress_todo').attr('title', $T('OPEN')+': '+open);
    $('#progress_done').attr('title', $T('DONE')+': '+Math.round(100*done/count) + ' % ('+done+') '+$T('SINCE_DAYS_PREFIX')+reloadData.age+$T('SINCE_DAYS_POSTFIX'));
}


function toggleWorking(show) {
    $('#working').css('display', show? 'block':'none');
}


function reload() {
    log($T('LOADING_TODO_LIST'));
    var jsontext = $.ajax({
        url: 'queries/query-todos.php',
        type: 'GET',
        data: reloadData,
        async: false
    }).responseText;
    try {
        itemList = JSON.parse(jsontext);
    } catch (e) {
        alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+jsontext+
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

    var jsontext = $.ajax({
        url: 'queries/query-lists.php',
        type: 'GET',
        data: listsData,
        async: false
    }).responseText;
    try {
        lists = JSON.parse(jsontext);
    } catch (e) {
        alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+jsontext+
            '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
    }
    renderLists();

    updateProgress();
    log($T('LOADING_FINISHED'));
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
        $('#modify_tags').val(),
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
    var stuff = new Todo(-1, todo, $('#enter_due').val(),
            $('#enter_start').val(), 1 /* effort */ ,
            0, '', tags, 0, 1, 0, null, formatDate(getUTCDate(), true),
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
