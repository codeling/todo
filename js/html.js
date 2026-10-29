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
