function getTodoItemStart(it, lineNr) {
    return '<div class="line'+
            ((lineNr%2!=0)?' line_odd':'')+
            ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
            '" id="todo'+it.id+'">';
}

function getTodoTitleHtml(it, lineNr, tagbasename, spanCssClass) {
    var isRecurring = it.recurrenceMode != 0;
    var hasNote = it.notes != null && it.notes != '';
    var hasTags = it.tags != null && it.tags != '';
    var createDate = parseDate(it.creationDate);
    var repetition = getRecurrenceString(it.recurrenceMode);
    var complDate = parseDate(it.completionDate);
    line =   '<span class="'+spanCssClass+'" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
            '">'+
            '<span class="todo_lineNr">'+(lineNr+1)+'</span>. '+
            it.todo+
            (hasNote ? '<img src="images/note.png" />':'')+
            (isRecurring ? '<img src="images/recurring.png" id="reactivate'+it.id+'" />':'');
    if (hasTags) {
        line += ' <ul id="'+tagbasename+it.id+'" class="todo_item_tags">';
        tags = it.tags.split(",");
        for (var i=0; i<tags.length; i++) {
            line += '<li>'+tags[i]+'</li>';
        }
        line += '</ul>';
    }
    line += '</span>';
    return line;
}

function renderItem(it, lineNr) {
    var today   = new Date();
    var dueDate = parseDate(it.due);
    var complDate = parseDate(it.completionDate);
    var dueString = (it.completed == 0) ? formatDate(dueDate): formatDate(complDate);
    var line = getTodoItemStart(it, lineNr);
    var tagbasename = 'todo_tags_';
    line += getTodoTitleHtml(it, lineNr, tagbasename, 'todo');
    line +=  '<span class="start">'+((it.start == null)?'undef':formatDate(parseDate(it.start)))+'</span>'+
        '<span class="due">'+ dueString+
                ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <img src="images/exclamation.png" height="16px" />':'')+
                '</span>'+
        '<span class="effort">'+it.effort+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>';
    line += '<span class="modify"><input type="image" value="'+
               $T('EDIT')+'" id="modify'+it.id+
               '" src="images/pencil.png" /></span>'+
            '<span class="dotoday"><input type="image" value"'+
               $T('DOTODAY')+'" id="dotoday'+it.id+
               '" src="images/dotoday.png" /></span>'
    if (it.deleted == 0) {
        line +=            '<span class="trash"><input type="image" value="'+
               $T('DELETE')+'" id="trash'+it.id+
               '" src="images/trash_red.png" /></span>';
    } else {
        line += '<span class="restore"><input type="image" value="'+
               $T('RESTORE')+'" id="restore'+it.id+
               '" src="images/undelete.png" /></span>';
    }
    line += '</div>';
    $('#todoTable').append(line);
    $('#'+tagbasename+it.id).tagit({readOnly: true});
    $('#todo'+it.id).on('dblclick', function() {
        printItem(it);
    });
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
        minWidth: 500,
        title: $T('MODIFY_ENTRY'),
        close: function(ev,ui) {
            log($T('MODIFY_DIALOG_CLOSED'));
        }
    });
}

function decodeHtml(val)
{
   var div = document.createElement('div');
   div.innerHTML = val;
   return div.firstChild.nodeValue;
}

function openTagDialog(tagname)
{
    $('#tag_name').val(tagname);
    var result = $.grep(tagList,
        function(e) { return decodeHtml(e.name) === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_id').val(result[0].id);
    $('#tag_dialog').dialog( {
        modal: true,
        width: 400,
        title: $T('EDIT_TAG')
    });
    $('#merge_tag_edit').tagit("removeAll");
    $('#tag_todo_table').empty();
    var filtered = getTodoWithTag(new Array(tagname));
    filtered.sort(ItemSort);
    var tagbase = 'tag_todo_tags_';
    for (var i=0; i<filtered.length; i++) {
        var line = '<div>'; //getTodoItemStart(filtered[i], i);
        line += getTodoTitleHtml(filtered[i], i, tagbase, '');
        line += '</div>'
        $('#tag_todo_table').append(line);
        $('#'+tagbase+filtered[i].id).tagit({readOnly: true});
    }
}

function fillTagList(choices)
{
    if ($('#taglist ul').html() != '')
    {
        $('#taglist ul').tagit("removeAll");
    }
    $('#taglist ul').tagit({readOnly: true});
    for (var i=0; i<choices.length; i++) {
        $('#taglist ul').tagit("createTag", decodeHtml(choices[i].name)+' ('+choices[i].tagCount+')');
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
    $(document.body).on('click', '.tagit-choice-read-only', function() {
        var tagname = $(this).text();
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
            type: 'GET',
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
            type: 'GET',
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
        merge_tagname = $('#merge_tag').val();
        var result = $.grep(tagList,
            function(e) { return decodeHtml(e.name) === merge_tagname; });
        if (result.length == 0 || result.length > 1)
        {
            alert("Found no tag or more than one tag with that name, aborting merge!");
            return false;
        }
        tagobject.merge_id = result[0].id;
        $.ajax( {
            type: 'GET',
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
    $('#filter_tag_edit').tagit({
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
        singleField: true,
        singleFieldNode: $('#filter_tags'),
        afterTagAdded: function(event, ui) {
            renderTable();
        },
        afterTagRemoved: function(event, ui) {
            renderTable();
        }
    });
    $('#modify_tag_edit').tagit({
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
        singleField: true,
        singleFieldNode: $('#modify_tags')
    });
    $('#merge_tag_edit').tagit({
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
        singleField: true,
        singleFieldNode: $('#merge_tag'),
        tagLimit: 1
    });
    $('#enter_start').on('change', function() {
        if ($('#enter_due').val() == "")
        {
            $('#enter_due').val($('#enter_start').val());
        }
    });
    $('#modify_recurrenceMode').on('change', function(e) {
        toggleRecurrenceAnchor();
    });
});
