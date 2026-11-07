<?php include "todo-core.php"; $csrfToken = csrfToken(); ?>
<!DOCTYPE html>
<html lang="<?php echo htmlspecialchars(todoConfig('language')); ?>"<?php echo(themeHtmlAttribute()); ?>>
  <head>
    <meta charset="UTF-8">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($csrfToken); ?>">
    <?php echo(themeHeadHtml()); ?>
    <title><?php echo(TodoConstants::AppName); ?></title>
    <!-- JQuery & JQuery UI -->
    <script src="<?php echo(assetUrl("vendor/jquery/jquery.min.js")); ?>"></script>
    <script src="lang-js.php"></script>
    <script src="<?php echo(assetUrl("vendor/tagify/tagify.js")); ?>"></script>
    <!-- the application: ES modules (js/*.js) which js/main.js imports; they use the scripts above as globals.
         Only this URL has a version: the web server makes browsers check the other modules each time
         (Cache-Control: no-cache, see .htaccess and nginx.conf.sample) -->
    <script type="module" src="<?php echo(assetUrl("js/main.js")); ?>"></script>
    <script src="<?php echo(assetUrl("js/theme.js")); ?>" defer></script>
    <link rel="stylesheet" type="text/css" href="<?php echo(assetUrl("vendor/tagify/tagify.css")); ?>" />
    <link rel="stylesheet" type="text/css" href="<?php echo(assetUrl("todo.css")); ?>" />
    <link rel="icon" href="todo.svg" type="image/svg+xml">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <!-- (the manifest is fetched with the credentials of the page: the web server asks for a login) -->
    <link rel="manifest" href="<?php echo(assetUrl("manifest.webmanifest")); ?>" crossorigin="use-credentials">
    <link rel="apple-touch-icon" href="todo-180.png">
  </head>
  <body>
    <div id="todo_content" class="todo_page">
      <div id="mainContent">
        <div id="headerLine">
          <h1><?php echo(TodoConstants::AppTitle); ?></h1>
          <div id="working"><?php echo(TodoLang::_("WORKING"));?></div>
          <div id="headerActions">
            <?php echo(iconButton("todayOnly", "toggleButton", "today", TodoLang::_("TODAY_ONLY")));?>
            <?php echo(iconButton("loadIncomplete", "toggleButton", "peek", TodoLang::_("LOAD_INCOMPLETE")));?>
            <?php echo(iconButton("refresh", "refreshButton", "refresh", TodoLang::_("REFRESH")));?>
            <?php echo(themeButtonHtml());?>
            <button type="button" id="menu_button" class="iconButton" popovertarget="main_menu" title="<?php echo(htmlspecialchars(TodoLang::_("MENU")));?>" aria-label="<?php echo(htmlspecialchars(TodoLang::_("MENU")));?>"><?php echo(iconSvg("menu"));?></button>
            <div id="main_menu" popover>
              <button type="button" id="emptyTrash" class="menuItem" hidden><?php echo(iconSvg("delete"));?><?php echo(TodoLang::_("EMPTY_TRASH"));?></button>
              <button type="button" id="loadMoreCompleted" class="menuItem"><?php echo(iconSvg("show-more"));?><?php echo(TodoLang::_("LOAD_MORE_COMPLETED"));?></button>
              <button type="button" id="loadLessCompleted" class="menuItem" disabled><?php echo(iconSvg("show-less"));?><?php echo(TodoLang::_("LOAD_LESS_COMPLETED"));?></button>
              <button type="button" id="manageTags" class="menuItem"><?php echo(iconSvg("tag"));?><?php echo(TodoLang::_("MANAGE_TAGS"));?></button>
              <a href="statistics.php" id="statisticsLink" class="menuItem"><?php echo(iconSvg("chart"));?><?php echo(TodoLang::_("SHOW_STATISTICS"));?></a>
              <button type="button" id="showLog" class="menuItem"><?php echo(iconSvg("note"));?><?php echo(TodoLang::_("SHOW_LOG"));?></button>
            </div>
          </div>
        </div>
        <div id="tagbarRow">
          <div id="tagbar" role="group" aria-label="<?php echo(htmlspecialchars(TodoLang::_("TAG_FILTER")));?>"></div>
          <button type="button" id="tagToggle" class="tagChip" aria-expanded="false" aria-controls="tagbar" hidden></button>
        </div>
        <div id="progress"><span id="progress_done">&nbsp;</span><span id="progress_todo">&nbsp;</span></div>
        <form method="POST" id="inputform">
          <div id="enterLine">
            <input type="text" id="enter_todo" name="enter_todo" maxlength="255" placeholder="<?php echo(htmlspecialchars(TodoLang::_("ENTER_PLACEHOLDER")));?>" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" />
            <span class="due"><span class="date_caption"><?php echo(TodoLang::_("DUE"));?></span> <label class="due_picker"><input type="date" id="enter_due" name="enter_due" /><span id="enter_due_label"></span></label></span>
            <?php echo(iconButton("enter_fixed", "toggleButton", "deadline", TodoLang::_("ENTER_FIXED")));?>
            <?php echo(iconButton("enter_save", "addButton", "add", TodoLang::_("ADD")));?>
          </div>
        </form>
        <ul id="todoList"></ul>
        <nav id="lists" aria-label="<?php echo(htmlspecialchars(TodoLang::_("LISTS")));?>"></nav>
      </div>
    </div>
    <!-- messages (js/toast.js) -->
    <div id="toasts" class="toasts" popover="manual" aria-live="polite"></div>
    <!-- the dialogs (js/dialogs.js opens them with showModal()) -->
    <dialog id="modify_dialog" aria-labelledby="modify_dialog_title">
      <?php echo(dialogHeaderHtml("modify_dialog_title", TodoLang::_("MODIFY_ENTRY"), true)); ?>
      <div class="dialog_body" tabindex="-1" autofocus>
      <form method="POST" id="modifyform">
        <input type="hidden" id="modify_id" name="modify_id" />
        <div id="modify_info"></div>
        <?php echo(formLineStartHtml("modify_todo", TodoLang::_("TODO"), "TODO_HELP"));?>
          <input type="text" id="modify_todo" name="modify_todo" maxlength="255" placeholder="<?php echo(htmlspecialchars(TodoLang::_("TODO_PLACEHOLDER")));?>" aria-describedby="modify_todo_help" />
        <?php echo(formLineEndHtml("modify_todo", "TODO_HELP"));?>
        <?php echo(formLineStartHtml("modify_start", TodoLang::_("START"), "START_HELP"));?>
          <input type="date" id="modify_start" name="modify_start" aria-describedby="modify_start_help" />
        <?php echo(formLineEndHtml("modify_start", "START_HELP"));?>
        <?php echo(formLineStartHtml("modify_due", TodoLang::_("DUE"), "DUE_HELP"));?>
          <input type="date" id="modify_due" name="modify_due" aria-describedby="modify_due_help" />
          <?php echo(iconButton("modify_dueFixed", "toggleButton", "deadline", TodoLang::_("DUE_FIXED")));?>
        <?php echo(formLineEndHtml("modify_due", "DUE_HELP"));?>
        <?php echo(formLineStartHtml("modify_effort", TodoLang::_("EFFORT"), "EFFORT_HELP"));?>
          <input type="number" id="modify_effort" name="modify_effort" min="0" max="9999" step="1" inputmode="numeric" placeholder="<?php echo(htmlspecialchars(TodoLang::_("EFFORT_PLACEHOLDER")));?>" aria-describedby="modify_effort_help" />
        <?php echo(formLineEndHtml("modify_effort", "EFFORT_HELP"));?>
        <?php echo(formLineStartHtml("modify_recurrenceMode", TodoLang::_("RECURRENCE"), "RECURRENCE_HELP"));?>
          <input type="number" id="modify_recurrenceInterval" name="modify_recurrenceInterval" min="1" max="999" value="1" title="<?php echo(htmlspecialchars(TodoLang::_("RECURRENCE_EVERY")));?>" aria-label="<?php echo(htmlspecialchars(TodoLang::_("RECURRENCE_EVERY")));?>" aria-describedby="modify_recurrenceMode_help" /><select name="modify_recurrenceMode" id="modify_recurrenceMode" aria-describedby="modify_recurrenceMode_help">
            <option value="0"><?php echo(TodoLang::_("DONT_REPEAT"));?></option>
            <option value="1"><?php echo(TodoLang::_("REPEAT_UNIT_DAYS"));?></option>
            <option value="2"><?php echo(TodoLang::_("REPEAT_UNIT_WEEKS"));?></option>
            <option value="3"><?php echo(TodoLang::_("REPEAT_UNIT_MONTHS"));?></option>
            <option value="4"><?php echo(TodoLang::_("REPEAT_UNIT_YEARS"));?></option>
          </select>
        <?php echo(formLineEndHtml("modify_recurrenceMode", "RECURRENCE_HELP"));?>
        <div class="recurrence_dependent">
        <?php echo(formLineStartHtml("modify_recurrenceAnchor", TodoLang::_("RECURRENCE_ANCHOR"), "RECURRENCE_ANCHOR_HELP"));?>
          <select name="modify_recurrenceAnchor" id="modify_recurrenceAnchor" aria-describedby="modify_recurrenceAnchor_help">
            <option value="0"><?php echo(TodoLang::_("REPEAT_ANCHOR_COMPLETIONDATE"));?></option>
            <option value="1"><?php echo(TodoLang::_("REPEAT_ANCHOR_ENDDATE"));?></option>
          </select>
        <?php echo(formLineEndHtml("modify_recurrenceAnchor", "RECURRENCE_ANCHOR_HELP"));?>
        </div>
        <?php echo(formLineStartHtml("modify_notes", TodoLang::_("NOTES"), "NOTES_HELP"));?>
          <textarea id="modify_notes" name="modify_notes" placeholder="<?php echo(htmlspecialchars(TodoLang::_("NOTES_PLACEHOLDER")));?>" aria-describedby="modify_notes_help"></textarea>
        <?php echo(formLineEndHtml("modify_notes", "NOTES_HELP"));?>
        <?php echo(formLineStartHtml("modify_tag_edit", TodoLang::_("TAGS"), "TAGS_HELP"));?>
          <input id="modify_tag_edit" placeholder="<?php echo(htmlspecialchars(TodoLang::_("TAGS_PLACEHOLDER")));?>" aria-describedby="modify_tag_edit_help" />
        <?php echo(formLineEndHtml("modify_tag_edit", "TAGS_HELP"));?>
        <?php echo(formLineStartHtml("modify_list", TodoLang::_("LIST"), "LIST_HELP"));?>
          <select id="modify_list" aria-describedby="modify_list_help">
          </select>
        <?php echo(formLineEndHtml("modify_list", "LIST_HELP"));?>
      </form>
      <div class="dialog_actions">
        <?php echo(dialogButtonHtml("modify_dotoday", "", TodoLang::_("DOTODAY"), "today")); ?>
        <?php echo(dialogButtonHtml("modify_reactivate", "", TodoLang::_("REACTIVATE"), "repeat")); ?>
      </div>
      </div>
      <div class="dialog_footer">
        <?php echo(dialogButtonHtml("modify_trash", "danger dialog_footer_start", TodoLang::_("DELETE"), "delete")); ?>
        <?php echo(dialogButtonHtml("modify_restore", "dialog_footer_start", TodoLang::_("RESTORE"), "restore")); ?>
        <?php echo(dialogCancelButtonHtml().dialogButtonHtml("modify_save", "primary", TodoLang::_("SAVE"), "check")); ?>
      </div>
      <div class="dialog_dropdowns" id="modify_dialog_dropdowns"></div>
    </dialog>
    <dialog id="log_dialog" aria-labelledby="log_dialog_title">
      <?php echo(dialogHeaderHtml("log_dialog_title", "Log")); ?>
      <div class="dialog_body" tabindex="-1" autofocus id="log_dialog_text"></div>
    </dialog>
    <dialog id="tags_dialog" aria-labelledby="tags_dialog_title">
      <?php echo(dialogHeaderHtml("tags_dialog_title", TodoLang::_("MANAGE_TAGS"))); ?>
      <div class="dialog_body" tabindex="-1" autofocus id="tags_dialog_list"></div>
    </dialog>
    <dialog id="tag_dialog" aria-labelledby="tag_dialog_title">
      <?php echo(dialogHeaderHtml("tag_dialog_title", TodoLang::_("EDIT_TAG"))); ?>
      <div class="dialog_body" tabindex="-1" autofocus>
        <form>
          <input type="hidden" id="tag_id" name="tag_id" />
          <?php echo(formLineStartHtml("tag_name", TodoLang::_("TAG_NAME")));?>
            <input type="text" id="tag_name" name="tag_name" maxlength="255" />
          <?php echo(formLineEndHtml("tag_name"));?>
          <?php echo(formLineStartHtml("tag_count", TodoLang::_("TAG_COUNT")));?>
            <input type="text" id="tag_count" name="tag_count" readonly="true" />
          <?php echo(formLineEndHtml("tag_count"));?>
          <?php echo(formLineStartHtml("merge_tag_edit", TodoLang::_("MERGE_TO")));?>
            <input id="merge_tag_edit" >
            <?php echo(iconButton("tag_merge", "mergeButton", "merge", TodoLang::_("MERGE")));?>
          <?php echo(formLineEndHtml("merge_tag_edit"));?>
        </form>
        <div id="tag_todo_container">
          <span id="tag_todo_caption"><?php echo(TodoLang::_("TAG_TODO_LIST_CAPTION"));?></span>
          <div id="tag_todo_table">
          </div>
        </div>
      </div>
      <div class="dialog_footer">
        <?php echo(iconButton("tag_delete", "deleteButton dialog_footer_start", "delete", TodoLang::_("DELETE")));?>
        <?php echo(dialogCancelButtonHtml().dialogButtonHtml("tag_save", "primary", TodoLang::_("SAVE"), "check")); ?>
      </div>
      <div class="dialog_dropdowns" id="tag_dialog_dropdowns"></div>
    </dialog>
  </body>
</html>
