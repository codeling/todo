// The state which the modules share. A module cannot assign to a binding it imported, so the
// state is one object and the modules replace its properties: state.itemList = ...
export const state = {
    // holds all items of the todo list (undefined until the first answer of the server)
    itemList: undefined,

    // holds all lists of current user
    lists: undefined,

    // the tags of the current list with their counts (for the dialogs; the chips above the table are made from the entries)
    tagList: undefined,

    // the names of the tags which the table is filtered by (the chips above it): entries with any of them are
    // shown, all entries if there are none
    filterTags: [],

    // the Tagify instances (created in main.js): the tags in the dialog of a todo and the target of a
    // merge in the dialog of a tag
    modifyTagify: undefined,
    mergeTagify: undefined,

    // what is loaded: the age (in days) of the completed todos which are shown, the list, and
    // whether the incomplete ones are shown from all times
    reloadData: {
        age: 0,
        list_id: 0,
        incomplete: false
    }
};

// screen width up to which the narrow layout of todo.css is used
export const narrowScreenQuery = '(max-width: 575px)';
