function clearTable()
{
    $("#todoTable tbody").empty();
}
function getTodoTitleHtml(it, lineNr, tagbasename, spanCssClass, baseElem) {
    var isRecurring = it.recurrenceMode != 0;
    var hasNote = it.notes != null && it.notes != '';
    var hasTags = it.tags != null && it.tags != '';
    var createDate = parseDate(it.creationDate);
    var repetition = getRecurrenceString(it.recurrenceMode);
    var complDate = parseDate(it.completionDate);
    line =   '<'+baseElem+' class="'+spanCssClass+'" title="'+$T('CREATED')+': '+formatDate(createDate, true)+
            '; '+$T('RECURRENCE')+': '+repetition+
        ((it.completed != 0)? '; '+$T('DONE')+': '+formatDate(complDate, true):'')+
            '">'+
            '<span class="todo_lineNr">'+(lineNr+1)+'.</span> '+
            '<span>'+it.todo+'</span>'+
            (hasNote ? '<span class="note" title="'+it.notes+'"></span>':'')+
            (isRecurring ? '<input type="button" class="reactivateButton" id="reactivate'+it.id+'" />':'');
    if (hasTags) {
        line += ' <input id="'+tagbasename+it.id+'" class="todo_item_tags" readonly value="'+it.tags+'">';
    }
    line += '</'+baseElem+'>';
    return line;
}

function renderItem(it, lineNr) {
    var today   = new Date();
    var dueDate = parseDate(it.due);
    var complDate = parseDate(it.completionDate);
    var dueString = (it.completed == 0) ? formatDate(dueDate): formatDate(complDate);
    var line = '<tr class="line'+
        ((lineNr%2!=0)?' line_odd':'')+
        ((it.completed==1)?' todo_completed':'')+
        ((it.deleted==1)?' todo_deleted':'')+
            '" id="todo'+it.id+'">';
    var tagbasename = 'todo_tags_';
    line += getTodoTitleHtml(it, lineNr, tagbasename, 'todo', 'td');
    line +=  '<td class="start">'+((it.start == null)?'undef':formatDate(parseDate(it.start)))+'</td>'+
        '<td class="due">'+ dueString+
                ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <span class="exclamation"></span>':'')+
        '</td>'+
        '<td class="effort">'+it.effort+'</td>'+
        '<td class="actions">'+
            '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>'+
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
    var elem = $('#'+tagbasename+it.id); //.tagit({readOnly: true});
    if (it.tags != null && it.tags != '') {
        new Tagify(elem[0], { readOnly: true } );
    }
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
        width: 420,
        title: $T('EDIT_TAG')
    });
    $('#merge_tag_edit')[0].__tagify.removeAllTags();
    $('#tag_todo_table').empty();
    var filtered = getTodoWithTag(new Array(tagname));
    filtered.sort(ItemSort);
    var tagbase = 'tag_todo_tags_';
    for (var i=0; i<filtered.length; i++) {
        var line = '<div>';
        line += getTodoTitleHtml(filtered[i], i, tagbase, '');
        line += '</div>'
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
        tagify.addTags([ decodeHtml(choices[i].name) ]);
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
    var filterTagEdit = $('#filter_tag_edit');
    new Tagify(filterTagEdit[0]);
    /*
    .tagit({
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
    */
    var modifyTagEdit = $('#modify_tag_edit');
    //new Tagify(modifyTagEdit[0]);
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
        singleField: true,
        singleFieldNode: $('#modify_tags')
    });
    */
    var mergeTagEdit = $('#merge_tag_edit');
    var mergeTagEditTagify = new Tagify(mergeTagEdit[0]);
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
