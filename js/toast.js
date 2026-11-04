// Messages which do not stop the page (alert() did: the page cannot be used until the box is closed, and a
// phone shows it as a box of its own). A message is shown in the area at the bottom of the page (index.php has it
// as aria-live), a failure as role="alert", which assistive technology reads at once, and goes away by itself
// after a while, or with its close button. A message can have one button, like "Undo".
// Where a message goes: into the dialog which is open (everything outside a modal dialog is inert, so a message
// there could be seen but not used: no Undo, no close button), else into the area of the page. The area of the
// page is a popover, which is in the top layer like a dialog.
function container() {
    var dialog = document.querySelector('dialog[open]');
    return (dialog && dialog.querySelector('.toasts')) || document.getElementById('toasts');
}
const isPage = (element) => element.id === 'toasts';

// shows a message; options: error (a failure), actionLabel and onAction (the button), seconds (default 8)
export function showToast(message, options = {}) {
    var toast = $('<div class="toast"></div>').attr('role', options.error ? 'alert' : 'status')
        .toggleClass('error', !!options.error);
    $('<span class="toast_text"></span>').text(message).appendTo(toast);
    var timer = null;
    var area = container();
    function dismiss() {
        clearTimeout(timer);
        toast.remove();
        if (isPage(area) && area.children.length == 0 && area.matches(':popover-open')) {
            area.hidePopover();
        }
    }
    if (options.actionLabel) {
        $('<button type="button" class="toast_action"></button>').text(options.actionLabel).on('click', function() {
            dismiss();
            options.onAction();
        }).appendTo(toast);
    }
    $('<button type="button" class="toast_close"></button>').attr({ title: $T('CLOSE'), 'aria-label': $T('CLOSE') })
        .text('×').on('click', dismiss).appendTo(toast);
    $(area).append(toast);
    if (isPage(area)) {
        // (shown again for each message, so that it is above anything which was put into the top layer meanwhile)
        if (area.matches(':popover-open')) {
            area.hidePopover();
        }
        area.showPopover();
    }
    timer = setTimeout(dismiss, (options.seconds || 8) * 1000);
    return toast;
}


// a failure, or something which the person has to know (what alert() was used for)
export function notify(message) {
    return showToast(message, { error: true, seconds: 12 });
}
