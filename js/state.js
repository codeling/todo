// The state which the modules share. A module cannot assign to a binding it imported, so the
// state is one object and the modules replace its properties: state.itemList = ...
export const state = {
    // holds all items of the todo list (undefined until the first answer of the server)
    itemList: undefined,

    // holds all lists of current user
    lists: undefined,

    // the tags of the current list with their counts
    tagList: undefined,

    // the Tagify instances (created in main.js): the filter above the table, the tags in the
    // dialog of a todo, the target of a merge in the dialog of a tag, and the list of all tags
    // in the sidebar (created when it is first filled)
    filterTagify: undefined,
    modifyTagify: undefined,
    mergeTagify: undefined,
    tagListTagify: undefined,

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
