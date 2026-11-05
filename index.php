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
            <?php echo(iconButton("refresh", "refreshButton", "refresh", TodoLang::_("REFRESH")));?>
            <?php echo(themeButtonHtml());?>
            <button type="button" id="menu_button" class="iconButton" popovertarget="main_menu" title="<?php echo(htmlspecialchars(TodoLang::_("MENU")));?>" aria-label="<?php echo(htmlspecialchars(TodoLang::_("MENU")));?>"><?php echo(iconSvg("menu"));?></button>
            <div id="main_menu" popover>
              <button type="button" id="emptyTrash" class="menuItem" hidden><?php echo(iconSvg("delete"));?><?php echo(TodoLang::_("EMPTY_TRASH"));?></button>
              <button type="button" id="manageTags" class="menuItem"><?php echo(iconSvg("tag"));?><?php echo(TodoLang::_("MANAGE_TAGS"));?></button>
              <a href="statistics.php" id="statisticsLink" class="menuItem"><?php echo(iconSvg("chart"));?><?php echo(TodoLang::_("SHOW_STATISTICS"));?></a>
              <button type="button" id="showLog" class="menuItem"><?php echo(iconSvg("note"));?><?php echo(TodoLang::_("SHOW_LOG"));?></button>
            </div>
          </div>
        </div>
        <nav id="lists" aria-label="<?php echo(htmlspecialchars(TodoLang::_("LISTS")));?>"></nav>
        <div id="tagbarRow">
          <div id="tagbar" role="group" aria-label="<?php echo(htmlspecialchars(TodoLang::_("TAG_FILTER")));?>"></div>
          <button type="button" id="tagToggle" class="tagChip" aria-expanded="false" aria-controls="tagbar" hidden></button>
        </div>
        <div id="progress"><span id="progress_done">&nbsp;</span><span id="progress_todo">&nbsp;</span></div>
        <form method="POST" id="inputform">
          <div id="enterLine">
            <input type="text" id="enter_todo" name="enter_todo" maxlength="255" placeholder="<?php echo(htmlspecialchars(TodoLang::_("ENTER_PLACEHOLDER")));?>" enterkeyhint="done" autocomplete="off" autocapitalize="sentences" />
            <span class="start"><span class="date_caption"><?php echo(TodoLang::_("START"));?></span> <input type="date" id="enter_start" name="enter_start" /></span>
            <span class="due"><span class="date_caption"><?php echo(TodoLang::_("DUE"));?></span> <label class="due_picker"><input type="date" id="enter_due" name="enter_due" /><span id="enter_due_label"></span></label></span>
            <?php echo(iconButton("enter_save", "addButton", "add", TodoLang::_("ADD")));?>
          </div>
        </form>
        <ul id="todoList"></ul>
        <div id="loadMoreBox">
            <a href="#" id="loadIncomplete"><?php echo(TodoLang::_("LOAD_INCOMPLETE"));?></a>
            <a href="#" id="loadLessCompleted"><?php echo(TodoLang::_("LOAD_LESS_COMPLETED"));?></a>
            <a href="#" id="loadMoreCompleted"><?php echo(TodoLang::_("LOAD_MORE_COMPLETED"));?></a>
        </div>
      </div>
    </div>
    <!-- messages (js/toast.js) -->
    <div id="toasts" class="toasts" popover="manual" aria-live="polite"></div>
    <!-- the dialogs (js/dialogs.js opens them with showModal()) -->
    <dialog id="modify_dialog" aria-labelledby="modify_dialog_title">
      <?php echo(dialogHeaderHtml("modify_dialog_title", TodoLang::_("MODIFY_ENTRY"))); ?>
      <div class="dialog_body" tabindex="-1" autofocus>
      <form method="POST" id="modifyform">
        <input type="hidden" id="modify_id" name="modify_id" />
        <div class="modify_line" id="modify_info"></div>
        <div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("TODO"));?>: </span>
          <input type="text" id="modify_todo" name="modify_todo" maxlength="255" />
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("START"));?>:</span>
          <input type="date" id="modify_start" name="modify_start" />
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("DUE"));?>: </span>
          <input type="date" id="modify_due" name="modify_due" />
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("EFFORT"));?>:</span>
          <input type="text" id="modify_effort" name="modify_effort" maxlength="4" /><?php echo(TodoLang::_("EFFORT_REMARK"));?>
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("RECURRENCE"));?>:</span>
          <input type="number" id="modify_recurrenceInterval" name="modify_recurrenceInterval" min="1" max="999" value="1" title="<?php echo(TodoLang::_("RECURRENCE_EVERY"));?>" /><select name="modify_recurrenceMode" id="modify_recurrenceMode">
            <option value="0"><?php echo(TodoLang::_("DONT_REPEAT"));?></option>
            <option value="1"><?php echo(TodoLang::_("REPEAT_UNIT_DAYS"));?></option>
            <option value="2"><?php echo(TodoLang::_("REPEAT_UNIT_WEEKS"));?></option>
            <option value="3"><?php echo(TodoLang::_("REPEAT_UNIT_MONTHS"));?></option>
            <option value="4"><?php echo(TodoLang::_("REPEAT_UNIT_YEARS"));?></option>
          </select>
        </div><div class="modify_line recurrence_dependent">
          <span class="modify_desc"><?php echo(TodoLang::_("RECURRENCE_ANCHOR"));?>:</span>
          <select name="modify_recurrenceAnchor" id="modify_recurrenceAnchor">
            <option value="0"><?php echo(TodoLang::_("REPEAT_ANCHOR_COMPLETIONDATE"));?></option>
            <option value="1"><?php echo(TodoLang::_("REPEAT_ANCHOR_ENDDATE"));?></option>
          </select>
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("NOTES"));?>:</span>
          <textarea type="text" id="modify_notes" name="modify_notes"></textarea>
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("TAGS"));?>:</span>
          <input id="modify_tag_edit" />
        </div><div class="modify_line">
          <span class="modify_desc"><?php echo(TodoLang::_("LIST"));?>:</span>
          <select id="modify_list">
          </select>
        </div>
      </form>
      <div class="dialog_actions">
        <?php echo(dialogButtonHtml("modify_dotoday", "", TodoLang::_("DOTODAY"), "today")); ?>
        <?php echo(dialogButtonHtml("modify_reactivate", "", TodoLang::_("REACTIVATE"), "repeat")); ?>
        <?php echo(dialogButtonHtml("modify_trash", "danger", TodoLang::_("DELETE"), "delete")); ?>
        <?php echo(dialogButtonHtml("modify_restore", "", TodoLang::_("RESTORE"), "restore")); ?>
      </div>
      </div>
      <div class="dialog_footer">
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
          <div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_NAME"));?>: </span>
            <input type="hidden" id="tag_id" name="tag_id" />
            <input type="text" id="tag_name" name="tag_name" maxlength="255" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("TAG_COUNT"));?>: </span>
            <input type="text" id="tag_count" name="tag_count" readonly="true" />
          </div><div class="modify_line">
            <span class="modify_desc"><?php echo(TodoLang::_("MERGE_TO"));?>: </span>
            <input id="merge_tag_edit" >
            <?php echo(iconButton("tag_merge", "mergeButton", "merge", TodoLang::_("MERGE")));?>
          </div>
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
