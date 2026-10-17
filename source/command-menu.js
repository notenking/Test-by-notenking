
/* Local task and feature search. No requests, analytics or persisted query history. */
(function (root) {
  'use strict';
  const COMMANDS = [
    {id:'assessment',title:'Study assessment',detail:'Optional · 30 questions',icon:'file',keywords:'问卷 测评 评估 assessment'},
    { id: 'new-task', title: StudyCopy.text("common.addTask"), detail: 'Add a task for today', icon: 'plus', keywords: '添加 create new task' },
    { id: 'life', title: 'Availability', detail: 'Study windows and daily schedule', icon: 'clock', keywords: '容量 起床 睡觉 课程 capacity schedule' },
    { id: 'today', title: StudyCopy.text("common.today"), detail: 'Page', icon: 'sun', keywords: '首页 home today' },
    { id: 'plan', title: StudyCopy.text("common.planner"), detail: 'Page', icon: 'calendar', keywords: '日历 周 月 年 calendar plan' },
    { id: 'focus', title: StudyCopy.text("common.focus"), detail: 'Page', icon: 'timer', keywords: 'Timer timer focus' },
    { id: 'reflection', title: StudyCopy.text("common.review"), detail: 'Page', icon: 'history', keywords: '历史 Study activity review reflection' },
    { id: 'notebook', title: 'Notebook', detail: 'Page', icon: 'book', keywords: '笔记 资料 notebook' },
    { id: 'blocking', title: 'Website blocking', detail: 'Page', icon: 'shield', keywords: '名单 定时 白名单 网站 blocker block' },
    { id: 'settings', title: 'Settings', detail: 'Page', icon: 'settings', keywords: '偏好 备份 恢复 导出 settings backup' },
    { id: 'guide', title: 'Quick guide', detail: 'Page', icon: 'info', keywords: '帮助 使用 guide help' },
  ];
  let menu = null, opener = null, activeIndex = 0, results = [], composing = false, executing = false;
  let previousOverflow = '', previousInert = [], modalObserver = null;
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
  const taskById = id => state.tasks.find(task => task.id === id);
  const queryInput = () => menu?.querySelector('#command-search-input');
  const isOpen = () => Boolean(menu?.isConnected);
  function otherModalOpen() {
    return Boolean(modal || document.querySelector('dialog[open]') || [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(el => !menu?.contains(el) && !(moreOpen && el.id === 'more-menu')));
  }
  function restoreOpener() {
    if (opener?.isConnected && !opener.matches('body,html') && !opener.closest('[inert]') && !opener.disabled && opener.getClientRects().length) { opener.focus({ preventScroll: true }); return; }
    const fallback = [...document.querySelectorAll('[data-action="commands-open"],.focus-immersive-toolbar button,#main-content')].find(element => element.getClientRects().length && !element.closest('[inert]'));
    fallback?.focus?.({ preventScroll: true });
  }
  function close(options = {}) {
    if (!isOpen()) return;
    modalObserver?.disconnect(); modalObserver = null;
    menu.remove(); menu = null; results = []; composing = false;
    document.body.style.overflow = previousOverflow;
    for (const [element, wasInert] of previousInert) if (element.isConnected) element.inert = wasInert;
    previousInert = [];
    if (options.restoreFocus !== false) restoreOpener();
  }
  function open() {
    if (isOpen()) { queryInput()?.focus(); return true; }
    if (otherModalOpen()) { toast('Close the current dialog before opening search.'); return false; }
    opener = document.activeElement;
    if (moreOpen) setMoreMenu(false);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousInert = ['app', 'modal-root'].map(id => document.getElementById(id)).filter(Boolean).map(element => [element, element.inert]);
    previousInert.forEach(([element]) => { element.inert = true; });
    menu = document.createElement('div');
    menu.id = 'command-menu-root'; menu.className = 'command-overlay is-open';
    menu.innerHTML = `<section class="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title"><header class="command-header">${icon('search')}<label class="sr-only" id="command-title" for="command-search-input">Search tasks and pages</label><input class="command-input" id="command-search-input" type="search" placeholder="Search tasks or pages" autocomplete="off" spellcheck="false" aria-controls="command-results" aria-describedby="command-result-count"><button class="command-close iconbtn" type="button" data-command-close aria-label="Close search">${icon('close', 'small')}</button></header><div class="command-results" id="command-results" aria-label="Search results"></div><p id="command-result-count" class="sr-only" role="status" aria-live="polite"></p><p id="command-error" class="command-error" role="alert" hidden></p><footer class="command-footer"><span>Search on this device</span><span class="command-shortcut"><kbd>↑</kbd><kbd>↓</kbd> Select <kbd>Enter</kbd> Open <kbd>Esc</kbd> Close</span></footer></section>`;
    document.body.append(menu);
    activeIndex = 0; renderResults(''); queryInput().focus();
    modalObserver = new MutationObserver(() => { if (isOpen() && otherModalOpen()) { if (menu.contains(modalOpener)) { modalOpener = opener; modalFocusTarget = rememberFocusTarget(opener); } close({ restoreFocus: false }); } });
    modalObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return true;
  }
  function taskState(task) {
    if (task.status === 'cancelled') return 'Cancelled';
    if (taskDone(task) || task.done || task.status === 'done') return 'Done';
    if (task.status === 'partial') return 'In progress';
    if (task.status === 'in-progress') return 'In progress';
    return 'To do';
  }
  function taskMeta(task) {
    const date = task.start && task.due && task.start !== task.due ? `${StudyUI.date(task.start)} — ${StudyUI.date(task.due)}` : task.start || task.due ? StudyUI.date(task.start || task.due) : 'No date set';
    return [task.subject || 'Study', date, taskState(task)].join(' · ');
  }
  function search(value) {
    const query = normalize(value), terms = query.split(/\s+/).filter(Boolean);
    if (!terms.length) return COMMANDS.map(command => ({ type: 'command', command }));
    const tasks = state.tasks.map(task => {
      const title = normalize(task.title), subject = normalize(task.subject), note = normalize(String(task.note || '').slice(0, 2000));
      const combined = [title, subject, note].join(' ');
      if (!terms.every(term => combined.includes(term))) return null;
      const score = (title === query ? 100 : title.startsWith(query) ? 70 : title.includes(query) ? 50 : subject.includes(query) ? 25 : 10) + (task.start === today() ? 2 : 0);
      const matchNote = terms.find(term => note.includes(term) && !title.includes(term) && !subject.includes(term));
      const sourceNote = String(task.note || '').replace(/\s+/g, ' ');
      const noteOffset = matchNote ? Math.max(0, normalize(sourceNote).indexOf(matchNote) - 16) : 0;
      const snippet = matchNote ? `${noteOffset ? '…' : ''}${sourceNote.slice(noteOffset, noteOffset + 76)}${sourceNote.length > noteOffset + 76 ? '…' : ''}` : '';
      return { type: 'task', task, score, snippet };
    }).filter(Boolean).sort((a, b) => b.score - a.score || String(b.task.start || '').localeCompare(String(a.task.start || '')));
    const commands = COMMANDS.filter(command => terms.every(term => normalize(`${command.title} ${command.detail} ${command.keywords}`).includes(term))).map(command => ({ type: 'command', command }));
    return [...tasks, ...commands].slice(0, 10);
  }
  function renderResults(value) {
    if (!isOpen()) return;
    results = search(value); activeIndex = 0;
    let lastGroup = '';
    menu.querySelector('#command-results').innerHTML = results.length ? results.map((result, index) => {
      const group = result.type === 'task' ? 'Task' : result.command.detail === 'Page' ? 'Page' : 'Action';
      const heading = group !== lastGroup ? `<p class="command-group-label">${group}</p>` : ''; lastGroup = group;
      const task = result.task, title = task?.title || result.command?.title || 'Untitled task', detail = task ? taskMeta(task) : result.command.detail;
      const canStart = task && task.scope === 'day' && task.status !== 'cancelled' && !taskDone(task) && !task.done && task.status !== 'done';
      return `${heading}<div class="command-result ${index === activeIndex ? 'is-active' : ''}" data-command-row="${index}"><button type="button" class="command-main" data-command-index="${index}" aria-current="${index === activeIndex}">${icon(task ? 'file' : result.command.icon, 'small')}<span class="command-copy"><span class="command-task-title">${esc(title)}</span><span class="command-task-meta">${esc(detail)}</span>${result.snippet ? `<span class="command-task-note">${esc(result.snippet)}</span>` : ''}</span>${icon('right', 'small')}</button>${canStart ? `<button class="command-start btn small" type="button" data-task-id="${esc(task.id)}" aria-label="Start ${esc(task.title)}">Start</button>` : ''}</div>`;
    }).join('') : '<div class="command-empty"><p>No matching tasks or pages</p><span>Try a title, subject or word from your notes.</span></div>';
    const hasQuery = Boolean(normalize(value));
    menu.querySelector('#command-result-count').textContent = results.length ? `${results.length} ${hasQuery && results.length === 10 ? 'matches, showing up to 10' : 'results'}` : 'No results';
    const error = menu.querySelector('#command-error'); error.hidden = true; error.textContent = '';
  }
  function chooseIndex(index, moveFocus = true) {
    if (!results.length || !isOpen()) return;
    activeIndex = ((index % results.length) + results.length) % results.length;
    menu.querySelectorAll('[data-command-row]').forEach(row => row.classList.toggle('is-active', Number(row.dataset.commandRow) === activeIndex));
    menu.querySelectorAll('[data-command-index]').forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.commandIndex) === activeIndex)));
    const button = menu.querySelector(`[data-command-index="${activeIndex}"]`);
    if (moveFocus) button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  async function guardedStart(taskId) {
    const run = () => startTaskTimer(taskId).catch(error => toast('Could not start task: ' + error.message));
    // startTaskTimer intentionally owns timer conflicts. Preserve the notebook's
    // existing leave confirmation before that function changes the active page.
    if (typeof notebookCleanup !== 'undefined' && notebookCleanup?.hasUnsaved?.() && screen !== 'focus') {
      go('focus');
      if (screen === 'focus' && !modal) { await run(); return; }
      if (modal?.type === 'confirm' && typeof modal.fn === 'function') {
        const continueNavigation = modal.fn;
        modal.fn = () => { continueNavigation(); if (screen === 'focus') void run(); };
      }
      return;
    }
    await run();
  }
  async function execute(result, start = false) {
    if (!result || executing || !isOpen()) return;
    executing = true;
    try {
      if (result.type === 'task') {
        const task = taskById(result.task.id);
        if (!task) throw Error('This task was deleted. Search again.');
        close();
        if (start) await guardedStart(task.id);
        else openModal('task', { task: structuredClone(task) });
      } else {
        const command = result.command;
        close();
        if (command.id === 'new-task') newTask({ date: today() });
        else if (command.id === 'life') openModal('v4-life', { date: today() });
        else go(command.id);
      }
    } catch (error) {
      if (isOpen()) { const target = menu.querySelector('#command-error'); target.textContent = error.message; target.hidden = false; }
      else toast(error.message || 'Could not complete the action. Try again.');
    } finally { executing = false; }
  }
  function focusables() {
    return menu ? [...menu.querySelectorAll('button:not(:disabled),input:not(:disabled),[tabindex="0"],a[href]')].filter(element => element.getClientRects().length && !element.closest('[hidden]')) : [];
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-action="commands-open"]');
    if (trigger) { event.preventDefault(); event.stopImmediatePropagation(); open(); return; }
    if (!isOpen() || !menu.contains(event.target)) return;
    event.stopImmediatePropagation();
    if (event.target === menu || event.target.closest('[data-command-close]')) { event.preventDefault(); close(); return; }
    const start = event.target.closest('.command-start');
    if (start) { event.preventDefault(); const result = results.find(item => item.task?.id === start.dataset.taskId); void execute(result, true); return; }
    const result = event.target.closest('[data-command-index]');
    if (result) { event.preventDefault(); void execute(results[Number(result.dataset.commandIndex)]); }
  }, true);
  document.addEventListener('compositionstart', event => { if (menu?.contains(event.target)) composing = true; }, true);
  document.addEventListener('compositionend', event => { if (menu?.contains(event.target)) { composing = false; renderResults(queryInput()?.value || ''); } }, true);
  document.addEventListener('input', event => {
    if (event.target.id === 'command-search-input' && !composing && !event.isComposing) renderResults(event.target.value);
  }, true);
  document.addEventListener('focusin', event => {
    if (!isOpen()) return;
    if (!menu.contains(event.target)) { queryInput()?.focus(); return; }
    const row = event.target.closest('[data-command-row]');
    if (row) chooseIndex(Number(row.dataset.commandRow), false);
  }, true);
  document.addEventListener('keydown', event => {
    const ime = composing || event.isComposing || event.keyCode === 229;
    if (!ime && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault(); event.stopImmediatePropagation(); if (isOpen()) close(); else open(); return;
    }
    if (!isOpen()) return;
    // Do not leak the app's single-letter shortcuts through a focused result.
    event.stopImmediatePropagation();
    if (ime) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key === 'Tab') {
      const items = focusables(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const fromInput = event.target.id === 'command-search-input';
      chooseIndex(fromInput ? event.key === 'ArrowDown' ? 0 : results.length - 1 : activeIndex + (event.key === 'ArrowDown' ? 1 : -1)); return;
    }
    if (event.key === 'Enter') {
      if (event.target.closest('[data-command-close]')) return;
      event.preventDefault();
      if (event.target.closest('.command-start')) {
        const taskId = event.target.closest('.command-start').dataset.taskId;
        void execute(results.find(result => result.task?.id === taskId), true);
      } else void execute(results[activeIndex]);
      return;
    }
    // Typing after arrow navigation continues the same query instead of invoking
    // page shortcuts; text entry itself stays in the native search input.
    if (event.target !== queryInput() && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && !(event.key === ' ' && event.target.closest('button'))) {
      event.preventDefault(); const input = queryInput(); input.focus(); input.value += event.key; renderResults(input.value);
    }
  }, true);
  root.StudyCommands = { open, close, isOpen };
})(window);

