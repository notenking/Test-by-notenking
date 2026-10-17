
/* Today presentation: existing task, date, focus and storage handlers are reused. */
"use strict";
function atelierTaskRow(task, compact = false) {
  const done = taskDone(task), active = StudyUI.taskState(task, state.timer).session;
  const remaining = Planning.remaining(task);
  return `<div class="task-row atelier-task ${done ? 'done' : ''} ${active ? 'is-current' : ''}" data-task-id="${esc(task.id)}">
    <button type="button" class="task-check ${done ? 'checked' : ''}" role="checkbox" aria-checked="${done}" aria-label="${done ? 'Reopen' : 'Complete'} ${esc(task.title)}" data-action="toggle-task" data-id="${esc(task.id)}">${done ? icon('check') : ''}</button>
    <div class="grow"><button class="task-title" data-action="edit-task" data-id="${esc(task.id)}">${esc(task.title)}</button><div class="task-meta">${StudyUI.status(task, state.timer)}${task.subject ? `<span class="task-subject">${esc(task.subject)}</span>` : ''}${task.atTime ? `<span>${esc(task.atTime)}</span>` : ''}${!done && remaining !== task.minutes ? `<span>${remaining} min left</span>` : ''}${task.priority === 1 ? '<span>High priority</span>' : ''}${!done && task.due < today() ? '<span>Overdue</span>' : ''}</div></div>
    <div class="atelier-duration" aria-label="Estimated ${task.minutes} minutes">${task.minutes}<span>min</span></div>
    <div class="task-actions">${!done ? active ? btn(icon('timer') + '<span>Focus</span>', 'nav', `data-screen="focus" aria-label="Open focus for ${esc(task.title)}"`, 'small atelier-start') : btn(icon('play') + '<span>Start</span>', 'focus-task', `data-id="${esc(task.id)}" aria-label="Start ${esc(task.title)}"`, 'small atelier-start') : '<span class="atelier-action-spacer"></span>'}
      <details class="task-more"><summary aria-label="More actions for ${esc(task.title)}">${icon('more')}</summary><div class="task-menu" role="group" aria-label="Task actions">${btn(icon('edit') + ' Edit task', 'edit-task', `data-id="${esc(task.id)}"`, 'link')}${!done ? v4Action(icon('calendar') + ' Adjust task', 'adjust', `data-id="${esc(task.id)}"`, 'link') : btn(icon('refresh') + ' Reopen task', 'toggle-task', `data-id="${esc(task.id)}"`, 'link')}</div></details>
    </div>
  </div>`;
}
function atelierTaskList() {
  const items = v6FilteredTasks();
  if (items.length) return items.map(task => atelierTaskRow(task)).join('');
  const filtering = v6TaskQuery.trim() || v6TaskFilter !== 'all';
  const allDone = !v6TaskQuery.trim() && v6TaskFilter === 'pending' && v4Tasks(today()).length > 0 && v4Tasks(today()).every(taskDone);
  return `<div class="v6-empty atelier-empty"><div class="atelier-empty-copy"><h3>${allDone ? 'All tasks complete' : filtering ? 'No matching tasks' : 'No tasks yet'}</h3><p>${allDone ? 'Your completed tasks are saved.' : filtering ? 'Try another title or clear your filters.' : 'Add your first task for today.'}</p>${filtering ? btn(allDone ? 'View all tasks' : 'Clear filters', 'v6-clear-filter') : btn(icon('plus') + ' Add task', 'new-task', '', 'primary atelier-empty-add')}</div></div>`;
}
function atelierWeekStrip() {
  const start = E.weekStart(today());
  return `<nav class="v6-week-strip atelier-week" aria-label="This week">${Array.from({ length: 7 }, (_, i) => {
    const date = E.addDays(start, i), tasks = v4Tasks(date), isToday = date === today();
    return `<button type="button" class="v6-day ${isToday ? 'is-today is-selected' : ''}" data-action="v6-open-date" data-date="${date}" aria-label="${StudyUI.weekday(date)}, ${StudyUI.date(date, true)}. ${tasks.length} tasks${isToday ? '. Today; selected' : ''}" ${isToday ? 'aria-current="date"' : ''}><small>${StudyUI.weekdays[i]}</small><strong>${E.parseDate(date).getDate()}</strong>${isToday ? '<i class="date-dot today-marker" aria-hidden="true"></i>' : ''}</button>`;
  }).join('')}</nav>`;
}
function atelierFocus() {
  const timer = state.timer; if (!timer || timer.status === 'ready') return '';
  const task = state.tasks.find(item => item.id === timer.taskId);
  const label = StudyUI.sessionState(timer);
  return `<section class="atelier-focus" aria-label="Current focus session"><span class="focus-indicator">${icon('timer')}</span><div class="atelier-focus-copy"><span>${label} · ${timer.goalMinutes || Math.round(timer.duration / 60000)} min session</span><h2>${esc(task?.title || 'Free focus')}</h2></div><output id="clock-text" class="atelier-clock" aria-label="${timer.flow ? 'Elapsed time' : 'Time remaining'}">${formatTimer(timerSeconds())}</output>${btn('Open focus ' + icon('arrow'), 'nav', 'data-screen="focus"', 'atelier-focus-return link')}</section>`;
}
// The same goal and activity renderers are used by Today and Planner.
function workspaceGoal(scope, date) {
  const bounds = scope === 'week' ? [E.weekStart(date), E.addDays(E.weekStart(date), 6)] : E.monthBounds(date);
  const goals = state.tasks.filter(task => task.scope === scope && task.status !== 'cancelled' && task.start <= bounds[1] && task.due >= bounds[0]);
  const done = goals.filter(taskDone).length, label = scope === 'week' ? 'Weekly goal' : 'Monthly goal';
  return `<section class="atelier-goal" data-goal-scope="${scope}"><header><h2>${label}</h2>${btn(icon('plus'), 'new-task', `data-scope="${scope}" data-date="${date}" aria-label="Add ${label.toLowerCase()}"`, 'iconbtn link')}</header>
    ${goals.length ? `<div class="atelier-goal-progress"><span>${done} of ${goals.length} complete</span><i aria-hidden="true"><b style="width:${done / goals.length * 100}%"></b></i></div>
    ${goals.slice(0, 2).map(task => `<button class="atelier-goal-title" type="button" data-action="edit-task" data-id="${esc(task.id)}">${taskDone(task) ? icon('check') + '<span class="sr-only">Completed goal: </span>' : ''}<span>${esc(task.title)}</span></button>`).join('')}
    ${goals.length > 2 ? btn('View all goals', 'sidebar-goals', `data-date="${date}"`, 'link small') : ''}` : '<p class="rail-empty">No goal set</p>'}
  </section>`;
}
function workspaceActivity(date) {
  const recorded = state.sessions.filter(s => s.date === date && s.phase !== 'break').reduce((n, s) => n + Number(s.minutes || 0), 0);
  const week = StudyReviewTrend.week(state.sessions, date);
  const completedDates = new Set(state.tasks.filter(t => t.done && t.completedAt).map(t => E.dateKey(new Date(t.completedAt))));
  let streak = 0, cursor = completedDates.has(date) ? date : E.addDays(date, -1);
  while (completedDates.has(cursor) && streak < 36600) { streak++; cursor = E.addDays(cursor, -1); }
  const weekLabel = E.weekStart(date) === E.weekStart(today()) ? 'This week' : `Week of ${StudyUI.date(week.start)}`;
  return `<section class="atelier-records"><header><h2>Study activity</h2>${btn(icon('arrow'), 'sidebar-review', `data-date="${date}" aria-label="Open review for ${StudyUI.date(date)}"`, 'iconbtn link')}</header>
    ${recorded || week.total ? `<div class="atelier-record-numbers"><div><strong>${StudyUI.minutes(recorded)}</strong><span>${date === today() ? 'Today' : StudyUI.date(date)}</span></div><div><strong>${StudyUI.minutes(week.total)}</strong><span>${weekLabel}</span></div></div>` : '<p class="rail-empty">No study time recorded.</p>'}
    ${btn('View activity ' + icon('right'), 'sidebar-review', `data-date="${date}"`, 'link small')}
    ${streak ? `<details class="atelier-stat-detail"><summary>More statistics</summary><p>${streak} consecutive ${streak === 1 ? 'day' : 'days'} with completed tasks.</p><p>Counts explicitly completed tasks through ${StudyUI.date(date)}.</p></details>` : ''}
  </section>`;
}
function atelierNotes(date) {
  return `<div class="atelier-goals">${workspaceGoal('week',date)}${workspaceGoal('month',date)}</div>${workspaceActivity(date)}`;
}
function atelierTodayPage() {
  const date = today(), tasks = v4Tasks(date), done = tasks.filter(taskDone), pending = tasks.filter(t => !taskDone(t));
  const recorded = state.sessions.filter(s => s.date === date && s.phase !== 'break').reduce((n, s) => n + Number(s.minutes || 0), 0);
  const remaining = pending.reduce((n, t) => n + Planning.remaining(t), 0);
  const overdue = state.tasks.filter(t => t.scope === 'day' && t.due < date && !taskDone(t) && t.status !== 'cancelled');
  const complete = tasks.length > 0 && !pending.length;
  const firstTask = !tasks.length && !v6TaskQuery.trim() && v6TaskFilter === 'all';
  return `<section class="atelier-today" data-task-state="${tasks.length ? complete ? 'completed' : 'active' : 'empty'}"><header class="pagehead atelier-heading"><div><h1>Today</h1><p class="sub"><time datetime="${date}">${weekday(date)}, ${fmtDate(date, true)}</time></p></div><div class="row atelier-header-actions">${btn(icon('plus') + ' Add task', 'new-task', `id="today-add-task" ${firstTask ? 'hidden' : ''}`, 'primary')}</div></header>
    <div class="atelier-workspace"><div class="atelier-main"><div class="atelier-planner-toolbar">${atelierWeekStrip()}</div><div class="atelier-task-toolbar"><div class="segments" aria-label="Task filters">${[['all','All tasks'],['pending','To do'],['done','Done']].map(([value,label])=>`<button type="button" class="btn ${v6TaskFilter===value?'active':''}" data-action="v6-filter" data-filter="${value}" aria-pressed="${v6TaskFilter===value}">${label}</button>`).join('')}</div><label class="search-field">${icon('search')}<input id="v6-task-search" type="search" placeholder="Search tasks" aria-label="Search tasks" value="${esc(v6TaskQuery)}" maxlength="160"></label></div>
    ${atelierFocus()}<section class="v6-task-panel atelier-ledger" aria-label="Today tasks"><header class="atelier-ledger-head ${!tasks.length?'is-empty':''}"><h2>Tasks <span id="v6-list-status" role="status" aria-live="polite">${v6FilteredTasks().length}</span></h2><span class="atelier-estimate-label">${complete ? `${done.length} of ${tasks.length} complete` : `${remaining} min planned`}</span></header>${complete ? `<div class="atelier-complete">${icon('check')}<div><strong>All tasks complete</strong><span>Your progress is saved.</span></div>${btn('Review day ' + icon('arrow'),'nav','data-screen="reflection"','link')}</div>`:''}<div id="v6-task-list">${atelierTaskList()}</div>${tasks.length?`<button class="atelier-inline-add" type="button" data-action="new-task" data-date="${date}">${icon('plus')}<span>Add task</span></button>`:''}${overdue.length?`<details class="v6-overdue"><summary>Needs rescheduling · ${overdue.length}</summary>${overdue.map(t=>atelierTaskRow(t,true)).join('')}</details>`:''}</section>${v4CapacityCard(date,true)}${v8GuidePrompt()}</div>
    <aside class="atelier-aside workspace-sidebar" aria-label="Goals and activity">${atelierNotes(date,recorded)}<div class="atelier-utilities"><button class="atelier-tool" type="button" data-action="nav" data-screen="blocking">${icon('shield')}<span>Website blocking</span>${icon('right')}</button><button class="atelier-tool" type="button" data-action="nav" data-screen="assessment">${icon('file')}<span>Study assessment</span>${icon('right')}</button></div></aside></div></section>`;
}

