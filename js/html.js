// Text is plain text (stored and sent as typed) and only escaped where it is inserted into HTML.
export function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// for inserting text (stored as plain text, or typed by the user) into HTML; null is no text
export function textToHtml(str) {
    if (str == null) {
        return '';
    }
    return escapeHtml(str);
}


// Icons (the files of webicons/icons/, see iconSvg() and iconButton() in todo-core.php for the same markup
// of the page itself): an inline SVG which uses the shape in the file; todo.css sets its color.
// Decorative: the button or the text around it has the name. iconVersion comes from lang-js.php.
export function icon(name, extraClass) {
    return '<svg class="icon icon-'+name+(extraClass ? ' '+extraClass : '')+'" viewBox="0 0 16 16" aria-hidden="true">'+
        '<use href="webicons/icons/'+name+'.svg?v='+iconVersion+'#i"/></svg>';
}


// a button with an icon; the label is its tooltip and its name for assistive technology
export function iconButton(id, buttonClass, iconName, label) {
    return '<button type="button" id="'+id+'" class="iconButton '+buttonClass+
        '" title="'+escapeHtml(label)+'" aria-label="'+escapeHtml(label)+'">'+icon(iconName)+'</button>';
}
