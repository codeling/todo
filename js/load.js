// Loading the lists, the entries and the tags from the server, and showing them.
import { state } from './state.js';
import { log } from './log.js';
import { postAction, reportLoadFailure } from './api.js';
import { renderLists, refreshView, fillTagList } from './render.js';

function toggleWorking(show) {
    $('#working').css('display', show? 'block':'none');
}


// returns a promise which is resolved when all requests are finished (also failed ones)
export function reload() {
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
            state.lists = JSON.parse(responseText);
        } catch (e) {
            alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+responseText+
                '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
        }
        renderLists();
    }).fail(reportLoadFailure);
    return $.when(todosLoaded.catch($.noop), listsLoaded.catch($.noop));
}


function loadTodos() {
    return $.ajax({
        url: 'queries/query-todos.php',
        type: 'GET',
        dataType: 'text',
        data: state.reloadData
    }).done(function(responseText) {
        try {
            state.itemList = JSON.parse(responseText);
        } catch (e) {
            alert($T('SERVER_DELIVERED_INVALID_DATA')+': "'+responseText+
                '";'+$T('JSON_PARSER_MESSAGE')+' : '+e);
        }
        for (var i=0; i<state.itemList.length; ++i) {
            // make "proper" Todo items out of the loaded values:
            state.itemList[i].id        = parseInt(state.itemList[i].id);
            state.itemList[i].effort    = parseInt(state.itemList[i].effort);
            state.itemList[i].completed = parseInt(state.itemList[i].completed);
            state.itemList[i].version   = parseInt(state.itemList[i].version);
            state.itemList[i].recurrenceMode = parseInt(state.itemList[i].recurrenceMode);
            state.itemList[i].recurrenceInterval = parseInt(state.itemList[i].recurrenceInterval);
            state.itemList[i].recurrenceAnchor = parseInt(state.itemList[i].recurrenceAnchor);
        }
        refreshView();
        log($T('LOADING_FINISHED'));
    }).fail(reportLoadFailure);
}


export function refresh() {
    toggleWorking(true);
    reload().always(function() {
        toggleWorking(false);
    });
// TODO: change listener, or if that proves impossible,
// refresh every 5-10 minues (or check with server if anything to refresh!!!
//    setTimeout(refresh, 30000);
}


export function reloadTagList() {
    var stuff = new Object();
    stuff.list_id = state.reloadData.list_id;
    $.ajax({
        url: 'queries/query-tags.php',
        data: stuff,
        dataType: 'json',
        success: function (tags) {
            state.tagList = tags;
            fillTagList(state.tagList);
        },
        error: reportLoadFailure,
        cache: false
    });
}
