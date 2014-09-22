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
    line += '<span class="due">'+ dueString+
                ((it.completed==0 && dueDate != null && (today - dueDate) > 0) ?
                ' <img src="images/exclamation.png" height="16px" />':'')+
                '</span>'+
        '<span class="priority">'+it.priority+'</span>'+
        '<span class="effort">'+it.effort+'</span>'+
        '<span class="completed"><input type="checkbox" id="completed'+it.id+'" '+
            ((it.completed==1)?'checked="true" ':'')+'/></span>';
    if (it.deleted == 0) {
        line += '<span class="modify"><input type="image" value="'+
               $T('EDIT')+'" id="modify'+it.id+
               '" src="images/pencil.png" /></span>'+
           '<span class="trash"><input type="image" value="'+
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
    $('#todo'+it.id).dblclick(function() {
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
        minHeight: 180,
        minWidth: 600,
        title: $T('MODIFY_ENTRY'),
        close: function(ev,ui) {
            log($T('MODIFY_DIALOG_CLOSED'));
        }
    });
}

function openTagDialog(tagname)
{
    $('#tag_name').val(tagname);
    var result = $.grep(tagList, function(e) { return e.name === tagname; });
    $('#tag_count').val(result[0].tagCount);
    $('#tag_dialog').dialog( {
        modal: true,
        title: $T('EDIT_TAG')
    });
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
    for (var i=0; i<choices.length; i++) {
        $('#taglist ul').append('<li>'+choices[i].name+' ('+choices[i].tagCount+')</li>');
    }
    $('#taglist ul').tagit({readOnly: true});
}

$(document).ready(function() {

    $('#modify_save').click(function() {
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
    $('#filter_tag_edit').tagit({
        autocomplete: { source: function( search, showChoices) {
        onlyTags = new Array();
        for (var i=0; i<tagList.length; ++i)
        {
            if (tagList[i].name.toLowerCase().indexOf(search.term.toLowerCase()) != -1)
            {
                onlyTags.push(tagList[i].name);
            }
        }
        showChoices(this._subtractArray(onlyTags, this.assignedTags()));
    }, delay: 2, minLength: 2},
    singleField: true,
    singleFieldNode: $('#filter_tags'),
    afterTagAdded: function(event, ui) {
        renderTable();
    },
    afterTagRemoved: function(event, ui) {
        renderTable();
    }
    });

});
