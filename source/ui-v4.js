
/* StudyOS 0.0.4 — planning, execution, adjustment and reflection. */
"use strict";
const Planning = StudyPlanning;
const coreTaskOnDateV4 = E.taskOnDate;
E.taskOnDate = (task, date) =>
  task.status !== "cancelled" && coreTaskOnDateV4(task, date);
const coreGoV4 = go;
go = function (destination) {
  if (notebookCleanup?.hasUnsaved?.() && destination !== screen) {
    confirmAction(
      StudyCopy.text("ui_v4.leave_without_saving_a82da4"),
      StudyCopy.text("ui_v4.this_resource_has_unsaved_changes_01a395"),
      () => {
        notebookCleanup?.();
        notebookCleanup = null;
        coreGoV4(destination);
      },
      StudyCopy.text("ui_v4.discard_and_leave_8df245"),
    );
    return;
  }
  coreGoV4(destination);
};
let notebookCleanup = null,
  reviewPeriod = "day",
  reviewDate = today(),
  activeReminder = null,
  nextNotebookId = null;
let focusImmersive = false, v7MoreReturn = ' .global-nav [data-action="toggle-more"]';
// Per-tab presentation only. Neither variable is persisted in the study data.
// A new session enters the existing distraction-free view once; pause/resume
// and re-renders respect a user's explicit choice to leave that view.
let focusViewSessionId = state.timer?.id || null;
function applyFocusPresentation() {
  const immersive = screen === 'focus' && focusImmersive;
  document.body.classList.toggle('is-focus-immersive', immersive);
  for (const selector of ['.global-nav','.global-tools','.mobile-bottom','#focus-support','.app-main[data-screen="focus"] .pagehead [data-action="session-history"]']) {
    const element = document.querySelector(selector);
    if (!element) continue;
    element.inert = immersive;
    if (immersive) element.setAttribute('aria-hidden','true');
    else element.removeAttribute('aria-hidden');
  }
  const toggle = document.getElementById('focus-view-toggle');
  if (toggle) {
    toggle.innerHTML = icon(immersive?'left':'focus','small') + ' ' + StudyCopy.text(immersive?'focusView.exit':'focusView.enter');
    toggle.setAttribute('aria-pressed', String(immersive));
    toggle.title = immersive ? StudyCopy.text('focusView.exitHint') : '';
    toggle.classList.toggle('link', !immersive);
  }
}
function setFocusPresentation(immersive) {
  // Do not call start/pause/finish, commitState, or render here. Even unapplied
  // settings remain intact when only the surrounding layout changes.
  focusImmersive = screen === 'focus' && Boolean(immersive);
  applyFocusPresentation();
  document.getElementById('focus-view-toggle')?.focus({preventScroll:true});
}
const coreRenderModal = renderModal;
const corePlanPage = planPage;
const coreRing = ring;
const coreExport = exportData;
function commitV4(next) {
  if (typeof commitState === "function") return commitState(next);
  if (!demo) localStorage.setItem(KEY, JSON.stringify(next));
  state = next;
}
function updatedV4(fn) {
  const next = structuredClone(state);
  fn(next);
  commitV4(next);
}
function v4Action(label, action, extra = "", kind = "") {
  return btn(label, `v4-${action}`, `type="button" ${extra}`, kind);
}
function v4TaskActual(task) {
  return state.sessions
    .filter((s) => s.taskId === task.id && s.phase !== "break")
    .reduce((n, s) => n + Number(s.minutes || 0), 0);
}
function v4Minutes(n) {
  return StudyUI.minutes(n);
}
function v4Tasks(date) {
  return sortedTasks(
    state.tasks.filter(
      (t) => E.taskOnDate(t, date) && t.status !== "cancelled",
    ),
  );
}
function v4Capacity(date = today(), source = state) {
  return Planning.capacity(source, date, { now: new Date() });
}
function v4Slots(c) {
  if (c.missing?.includes("可用于学习的具体时段"))
    return "No study windows set";
  return (
    (c.freeSlots || [])
      .map(
        (s) =>
          `${typeof s.start === "number" ? Planning.minutesToTime(s.start) : s.start}–${typeof s.end === "number" ? Planning.minutesToTime(s.end) : s.end}`,
      )
      .join("、") || "No confirmed available windows"
  );
}
function v4CapacityCard(date = today(), compact = false) {
  const c = v4Capacity(date), copy = StudyUI.capacity(c);
  const missing = c.missing?.includes('愿意用于学习的分钟数');
  const issue = ['overload','conflict'].includes(c.status);
  const summary = missing ? 'Set a study budget to check your plan.' : c.status === 'estimate' ? 'Add study windows for a schedule check.' : c.status === 'overload' ? `${StudyUI.minutes(c.excessMinutes)} over capacity` : c.status === 'conflict' ? 'A time conflict needs attention' : `${StudyUI.minutes(c.demandMinutes)} planned · ${StudyUI.minutes(c.availableMinutes)} available`;
  return `<section class="availability-panel ${compact?'is-compact':''}" data-capacity-state="${c.status}" aria-label="Availability">
    <header><h2>Availability</h2>${v4Action(missing?'Set availability':'Edit schedule','life',`data-date="${date}"`,'small')}</header>
    <p class="availability-summary">${summary}</p>
    <details ${issue?'open':''}><summary>${issue?'Schedule details':'How this is calculated'}</summary>
      <p>${copy.detail}</p><p>Fixed activities and overlapping time are counted once. Flexible activities must fit entirely inside their windows. Unscheduled time is not automatically study time.</p>
      ${issue ? v4Action('Adjust your plan','analysis','','small link') : ''}
    </details>
  </section>`;
}
layout = function (body) {
  return `${workspaceNavigation()}<main class="app-main" data-screen="${screen}"><div class="content" id="main-content" tabindex="-1">${typeof taskDraftNotice==='function'?taskDraftNotice():''}${body}<footer class="footer-note"><span>StudyOS</span><span class="grow"></span><span>${storageError?'Could not save. Export a backup':'Saved locally'} · 0.0.22</span></footer></div></main>${workspaceMobileNavigation()}<div id="reminder-region" aria-live="polite"></div>`;
};
const coreFocusDetailsV4 = focusTaskDetails;
focusTaskDetails = function (task) {
  const base = coreFocusDetailsV4(task);
  if (!task) return base;
  const ids = task.materialIds?.length
    ? task.materialIds
    : task.materialId
      ? [task.materialId]
      : [];
  return (
    base +
    (task.note
      ? `<section class="card"><h3>Task notes</h3><p class="sub section-space" style="white-space:pre-wrap">${esc(task.note)}</p></section>`
      : "") +
    (ids.length
      ? `<section class="card"><h3>Resources</h3><div class="row wrap section-space">${ids.map((id, index) => v4Action(ids.length > 1 ? "Open resource " + (index + 1) : "Open linked resource", "open-material", `data-id="${esc(id)}"`, "small")).join("")}</div></section>`
      : "")
  );
};
const coreTaskRow = taskRow;
taskRow = function(t, compact=false) {
 if(t.scope==='day') return atelierTaskRow(t,compact);
 const done=taskDone(t),remaining=Planning.remaining(t),time=t.scope==='day'?(remaining===t.minutes?`${t.minutes} min`:`${remaining} min left / ${t.minutes} min estimated`):StudyUI.scopeNames[t.scope];
 return `<div class="task-row ${done?'done':''}"><button type="button" class="task-check ${done?'checked':''}" role="checkbox" aria-checked="${done}" aria-label="${done?'Reopen':'Complete'} ${esc(t.title)}" data-action="toggle-task" data-id="${esc(t.id)}">${done?icon('check'):''}</button><div class="grow"><button class="task-title" data-action="edit-task" data-id="${esc(t.id)}">${esc(t.title)}</button><div class="task-meta">${t.priority===1?'<span>High priority</span><span>·</span>':''}<span>${esc(t.subject||'Study')}</span><span>·</span><span>${t.atTime?esc(t.atTime)+' · ':''}${time}</span>${t.due<today()&&!done?'<span>Needs rescheduling</span>':''}</div></div><div class="task-actions">${t.scope==='day'&&!done?btn(StudyCopy.text("common.start"),'focus-task',`data-id="${esc(t.id)}" aria-label="Start ${esc(t.title)}"`,'small')+v4Action('Adjust','adjust',`data-id="${esc(t.id)}"`,'small link'):''}${!compact?`<button type="button" class="iconbtn" data-action="edit-task" data-id="${esc(t.id)}" aria-label="Edit ${esc(t.title)}">${icon('edit','small')}</button>`:''}</div></div>`;
};
let v6TaskFilter = 'all', v6TaskQuery = '';
function v6FilteredTasks() {
  const query = v6TaskQuery.trim().toLocaleLowerCase();
  return v4Tasks(today()).filter(t =>
    (v6TaskFilter === 'all' || (v6TaskFilter === 'done' ? taskDone(t) : !taskDone(t))) &&
    (!query || `${t.title} ${t.subject || ''}`.toLocaleLowerCase().includes(query))
  );
}
function v6TaskList() {
  return atelierTaskList();
}
function v6PaintTaskList(animate = false) {
  const list = document.getElementById('v6-task-list');
  if (!list) return;
  list.innerHTML = v6TaskList();
  if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    list.animate([{ opacity: .5, transform: 'translateY(2px)' }, { opacity: 1, transform: 'none' }], { duration: 140, easing: 'ease-out' });
  }
  document.getElementById('v6-list-status').textContent = `${v6FilteredTasks().length}`;
  const add = document.getElementById('today-add-task');
  if(add) add.hidden = !v4Tasks(today()).length && !v6TaskQuery.trim() && v6TaskFilter === 'all';
  document.querySelectorAll('[data-action="v6-filter"]').forEach(button => {
    const active = button.dataset.filter === v6TaskFilter;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function v6WeekStrip() {
  return atelierWeekStrip();
}
function v6NextFocus(tasks) {
  const active = state.timer && ['running','paused','review'].includes(state.timer.status);
  const task = active ? state.tasks.find(t => t.id === state.timer.taskId) : tasks.find(t => !taskDone(t));
  const minutes = active ? (state.timer.goalMinutes || state.timer.duration / 60000) : task ? Planning.remaining(task) : Number(state.focusConfig.minutes || 25);
  return `<section class="v6-next-focus"><div class="v6-focus-label">${icon('timer','small')}<span>${active ? ({running:StudyCopy.text("ui_v4.current_focus_ef87e7"),paused:StudyCopy.text("ui_v4.focus_paused_f45981"),review:StudyCopy.text("ui_v4.ready_to_save_53e875")}[state.timer.status]) : StudyCopy.text("common.focus")}</span>${active?'<span class="v6-live-dot" aria-hidden="true"></span>':''}</div><h2>${esc(task?.title || StudyCopy.text("ui_v4.free_focus_0e3cfe"))}</h2><div class="v6-focus-length"><strong>${minutes}</strong><small>${active?StudyCopy.text("ui_v4.min_this_session_3c3983"):task?StudyCopy.text("ui_v4.min_estimated_remaining_483071"):StudyCopy.text("ui_v4.min_current_setting_3d98c0")}</small></div><div class="v6-focus-actions">${active ? btn(StudyCopy.text("ui_v4.open_focus_2960ab")+icon('arrow','small'),'nav','data-screen="focus"','') : task ? btn(StudyCopy.text("ui_v4.getting_started_ef027c")+icon('play','small'),'focus-task',`data-id="${esc(task.id)}"`,'') : btn(StudyCopy.text("ui_v4.open_focus_2960ab")+icon('arrow','small'),'nav','data-screen="focus"','')}</div></section>`;
}
function v8GuidePrompt() {
  if (state.settings.guideDismissed) return '';
  const config = Planning.dayConfig(state,today());
  const completed = [state.tasks.some(t=>t.scope==='day'), Boolean(config && Number.isFinite(Number(config.studyMinutes)) && config.studyMinutes!==null && config.studyMinutes!==undefined) || Boolean(state.settings.guideTimeSkipped), Boolean(state.timer && state.timer.status!=='ready' || state.sessions.some(s=>s.phase!=='break'))];
  const step = completed.findIndex(done=>!done);
  if(step < 0) return '';
  const descriptions = ['Start with a task title and an estimated duration.', 'Availability is optional. Use it to check how your plan fits.', 'Start a task when ready, then save the session to record your progress.'];
  return `<aside class="getting-started" aria-label="Getting started"><div><span class="getting-started-label">Getting started · ${step+1} of 3</span><p>${descriptions[step]}</p></div>${step===1?btn('Skip for now','v8-guide-skip-time','','link'):''}<button class="iconbtn" type="button" data-action="dismiss-guide-hint" aria-label="Dismiss getting started">${icon('close','small')}</button></aside>`;
}
todayPage = atelierTodayPage;
planPage = function () {
  const original = corePlanPage().replace('<p class="sub"></p>', '').replace(StudyCopy.text("common.addTask"), StudyCopy.text("common.addTask"));
  const calendar = `<div class="calendar-layout">${monthCalendar()}<aside class="calendar-side workspace-sidebar">${v9ControlCenter(selectedDate)}</aside></div>`;
  const body = planView === 'month' ? original.replace(/<div class="calendar-layout">[\s\S]*$/, calendar) : original;
  return `<div class="v9-plan">${body}${planView==='month'?'':`<div class="section-space">${v4CapacityCard(selectedDate,true)}</div>`}</div>`;
};
function v9Goals(scope, date) { return workspaceGoal(scope, date); }
function v9ControlCenter(date=today(), includeTasks=true) {
  const tasks = v4Tasks(date), done = tasks.filter(taskDone).length;
  const overview = includeTasks ? `<section class="sidebar-day"><header><h2>${date === today() ? 'Today' : StudyUI.date(date)}</h2>${btn(icon('plus'),'new-task',`data-date="${date}" aria-label="Add task for ${StudyUI.date(date)}"`,'iconbtn link')}</header>
    ${tasks.length ? `<p class="rail-empty">${done} of ${tasks.length} complete</p><div class="sidebar-tasks">${tasks.slice(0,4).map(task=>`<button class="sidebar-task" type="button" data-action="edit-task" data-id="${esc(task.id)}">${taskDone(task)?icon('check','small'):'<span class="sidebar-task-dot" aria-hidden="true"></span>'}<span>${esc(task.title)}</span><small>${StudyUI.minutes(Planning.remaining(task))}</small></button>`).join('')}</div>${tasks.length>4?btn('View all tasks','v6-open-date',`data-date="${date}"`,'small link'):''}` : '<p class="rail-empty">No tasks yet</p>'}
  </section>` : '';
  return `${atelierNotes(date)}${overview}`;
}
function v4AnalysisDetails() {
  const c = v4Capacity(), copy = StudyUI.capacity(c), relevant = v4Tasks(today()).filter(t => !taskDone(t));
  return `<p class="sub">${copy.detail}</p><h3>Supporting records</h3><p>${relevant.length} unfinished tasks today, with ${v4Minutes(c.demandMinutes)} remaining. ${c.missing?.includes("愿意用于学习的分钟数") ? "No study budget has been set." : `Current capacity: ${v4Minutes(c.availableMinutes)}.`}</p><p class="tiny">Available windows: ${esc(v4Slots(c))}. Timers record elapsed time; they do not reduce remaining work automatically.</p><h3>Possible causes and uncertainty</h3><p>${c.status === "estimate" ? "Your availability is incomplete, so this is only an estimate." : c.status === "conflict" ? "Fixed events and activity windows may leave gaps too short for continuous tasks." : c.status === "sufficient" ? "The current schedule appears to fit. Compare it with actual progress as you work." : "The task scope or estimates may exceed the time you want to study."} Unrecorded activities, interruptions and inaccurate estimates can change the result.</p><h3>Ways to adjust</h3><ol class="steps"><li>Reduce a task's scope and update its remaining estimate.</li><li>Split a task that allows multiple sessions, keeping its progress.</li><li>Move a continuous task to an available date and check its deadline.</li></ol><div class="stack">${relevant.slice(0,5).map(t => `<div class="between"><span>${esc(t.title)}</span>${v4Action("Preview adjustment", "adjust", `data-id="${esc(t.id)}"`, "small")}</div>`).join("")}</div><div class="modal-actions">${v4Action("Edit availability", "life", "", "primary")}</div>`;
}
profilePage = function () {
  const c = v4Capacity(), copy = StudyUI.capacity(c);
  return `${head("Plan insights", "")}<section class="card v4-analysis"><span class="v4-eyebrow">One thing to consider</span><h2>${copy.label}</h2><p class="sub">${copy.detail}</p><p class="tiny">Based on ${v4Minutes(c.demandMinutes)} remaining today. ${c.status === "estimate" ? "Available capacity is not yet confirmed." : `${v4Minutes(c.availableMinutes)} available for study.`}</p>${v4Action("View causes and options", "analysis", "", "primary")}</section>`;
};
function v7ReviewTrend() {
  const summary = StudyReviewTrend.week(state.sessions, reviewDate);
  const maximum = Math.max(1, ...summary.days.map(day => day.total));
  const number = n => Math.round(n * 10) / 10;
  const sources = [
    summary.timer > 0 ? `<span><i class="trend-timer-key" aria-hidden="true"></i>Timer ${number(summary.timer)} min</span>` : '',
    summary.manual > 0 ? `<span><i class="trend-manual-key" aria-hidden="true"></i>Manual ${number(summary.manual)} min</span>` : '',
  ].join('');
  return `<section class="review-trend card" aria-labelledby="review-trend-heading">
    <header class="review-trend-head"><div><h2 id="review-trend-heading">Study activity</h2><p class="tiny">${StudyUI.date(summary.start)} — ${StudyUI.date(summary.end)}</p></div><div class="review-trend-total"><strong>${number(summary.total)}</strong><span>min recorded</span></div></header>
    ${sources ? `<div class="review-trend-legend">${sources}</div>` : ''}
    <div class="review-trend-chart" aria-label="Daily activity. Select a date for details">${summary.days.map((day, i) => `<button type="button" class="review-trend-day ${reviewPeriod === 'day' && reviewDate === day.date ? 'is-selected' : ''}" data-action="v7-review-day" data-date="${day.date}" data-timer-minutes="${day.timer}" data-manual-minutes="${day.manual}" aria-pressed="${reviewPeriod === 'day' && reviewDate === day.date}" aria-label="${day.date}，Timer ${number(day.timer)} min，Manual ${number(day.manual)} min，${day.count} records. View details"><span class="review-trend-value">${day.total ? number(day.total) : '—'}</span><span class="review-trend-bar" aria-hidden="true"><i class="trend-manual" style="height:${day.manual / maximum * 100}%"></i><i class="trend-timer" style="height:${day.timer / maximum * 100}%"></i>${!day.total ? '<i class="trend-zero"></i>' : ''}</span><strong>${StudyUI.weekdays[i]}</strong><small>${day.date.slice(5).replace('-', '/')}</small></button>`).join('')}</div>
    <div class="review-trend-foot">${reviewPeriod === 'day' ? '<button type="button" class="btn small link" data-action="v7-review-week">View full week</button>' : ''}</div>
  </section>`;
}
function v4ReflectionPage() {
  const r = StudyReviewTrend.period(state, reviewDate, reviewPeriod);
  const { tasks, sessions, comparison } = r;
  const label = reviewPeriod === 'week' ? (E.weekStart(reviewDate) === E.weekStart(today()) ? 'This week' : `Week of ${StudyUI.date(r.start)}`) : reviewDate === today() ? 'Today' : StudyUI.date(reviewDate);
  const deferredIds = new Set(r.deferredIds);
  const status = t => t.status === 'cancelled' ? 'Cancelled' : t.done || t.status === 'done' ? 'Done' : deferredIds.has(t.id) ? `Rescheduled to ${StudyUI.date(t.start)}` : ({ partial: 'Partially complete', 'in-progress': 'In progress', paused: 'Paused' }[t.status] || 'To do');
  const suggestion = comparison.length >= 3
    ? `${label}: completed ${comparison.length} tasks with records, estimated ${v4Minutes(r.comparisonExpected)}, total recorded ${v4Minutes(r.comparisonActual)}. Use recorded time from similar tasks for your next estimate.`
    : '';
  const explanation = `<details class="review-explanation"><summary>About these records</summary><p>Missing records do not mean no study. A longer session does not imply poor focus.</p><p>Timer records and manual entries are shown separately. You can correct either using Edit record. Tasks keep their current progress; recorded time does not automatically mean a task is complete.</p><p>Estimates compare completed tasks that have linked records, including their recorded time across dates. Suggestions appear only with at least three such tasks.</p></details>`;
  const toolbar = `${head(StudyCopy.text("common.review"), '', v4Action('Log study time', 'session', '', 'primary'))}<div class="review-toolbar row wrap"><div class="segments">${v4Action('Day', 'review-period', 'data-period="day"', reviewPeriod === 'day' ? 'active' : '')}${v4Action('Week', 'review-period', 'data-period="week"', reviewPeriod === 'week' ? 'active' : '')}</div><input class="input" type="date" id="review-date" aria-label="Review date" value="${reviewDate}" style="width:auto"></div>`;
  if (!tasks.length && !sessions.length) {
    return `${toolbar}<section class="review-empty" id="review-records" tabindex="-1"><span class="review-empty-mark" aria-hidden="true">${icon('history')}</span><h2>No activity for this period</h2><p>Your focus sessions appear here. You can also log time you studied without a timer.</p></section>${explanation}`;
  }
  const sources = [r.timer > 0 ? `Timer ${v4Minutes(r.timer)}` : '', r.manual > 0 ? `Manual ${v4Minutes(r.manual)}` : ''].filter(Boolean).join(' · ');
  const summary = sessions.length
    ? reviewPeriod === 'week' ? v7ReviewTrend() : `<section class="v8-record-summary card"><div><h2>${label} · Study activity</h2><p class="tiny">${StudyUI.date(r.start)}</p></div><div><strong>${Math.round(r.actual * 10) / 10}</strong><span>min</span>${sources ? `<p class="tiny">${sources}</p>` : ''}</div></section>`
    : '<p class="review-record-note">No time recorded for this period. You can add time you studied without a timer.</p>';
  const taskList = tasks.length ? `<section class="card v8-review-tasks"><h2>${label} · Tasks</h2><p class="tiny">Tasks linked to this period, with their current progress.</p>${tasks.map(t => `<div class="between task-row" data-review-task="${esc(t.id)}"><span>${esc(t.title)}<small class="tiny"> · ${esc(status(t))}</small>${t.status === 'cancelled' ? v4Action('Restore task', 'restore-task', `data-id="${esc(t.id)}"`, 'small link') : ''}</span><span class="tiny" ${r.taskMinutes[t.id] ? '' : 'aria-label="No time recorded"'}>${r.taskMinutes[t.id] ? `${label} recorded ${v4Minutes(r.taskMinutes[t.id])}` : '—'}</span></div>`).join('')}${comparison.length ? `<details class="v8-estimate-comparison section-space"><summary>Estimates and recorded time · ${comparison.length} completed tasks</summary><p class="tiny section-space">Same tasks: ${label}: completed with linked records. Actual time includes all recorded time for these tasks across dates.</p><div class="v4-stats"><div><strong data-comparison="expected">${Math.round(r.comparisonExpected * 10) / 10}</strong><span>Estimated · min</span></div><div><strong data-comparison="actual">${Math.round(r.comparisonActual * 10) / 10}</strong><span>Recorded · min</span></div></div>${comparison.map(t => `<div class="between task-row"><span>${esc(t.title)}</span><span class="tiny">Estimated ${v4Minutes(t.expected)} / Recorded ${v4Minutes(t.actual)}</span></div>`).join('')}</details>` : ''}</section>` : '';
  const records = sessions.length ? `<section class="card" id="review-records" tabindex="-1"><h3>Session history</h3>${sessions.map(record => `<div class="between task-row"><div><p>${esc(state.tasks.find(t => t.id === record.taskId)?.title || 'Unlinked session')}</p><span class="tiny">${StudyUI.date(record.date)} · ${v4Minutes(record.minutes)} · ${record.source === 'manual' ? 'Manual entry' : record.correctedAt ? 'Corrected timer record' : 'Timer record'}</span></div>${v4Action('Edit record', 'session', `data-id="${esc(record.id)}"`, 'small link')}</div>`).join('')}</section>` : '';
  return `${toolbar}${summary}<div class="v4-two-col review-detail-grid section-space">${taskList}<aside class="stack">${records}${suggestion ? `<section class="review-suggestion"><h3>Next estimate</h3><p class="sub">${esc(suggestion)}</p></section>` : ''}</aside></div>${explanation}`;
}
function v4ReminderSettings() {
  const r = {
    enabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
    reduceDuringFocus: true,
    sound: false,
    method: "inapp",
    timerException: false,
    ...state.settings.reminders,
  };
  return StudyCopy.format("ui_v4.reminders_and_quiet_hours_enable_cc73fa", [r.enabled ? "checked" : "", inputField(StudyCopy.text("ui_v4.quiet_hours_start_a321ca"), "quietStart", r.quietStart, "time"), inputField(StudyCopy.text("ui_v4.quiet_hours_end_a3c020"), "quietEnd", r.quietEnd, "time"), r.reduceDuringFocus ? "checked" : "", r.timerException ? "checked" : "", r.sound ? "checked" : "", r.method === "inapp" ? "selected" : "", r.method === "system" ? "selected" : ""]);
}
const coreFocusShieldV5 = focusShield;
function v5UnavailableBlocker(compact=false){return StudyCopy.format("ui_v4.website_blocking_web_version_this_e6bc46", [compact?'focus-blocking-help':'blocking-settings', !compact?btn(StudyCopy.text("ui_v4.export_backup_672ef4"),'export-data','','small link'):'']);}
focusShield=function(){return window.StudyBlocker ? StudyBlocker.summary(true) : isExt?coreFocusShieldV5():v5UnavailableBlocker(true);};
function v5BlockingSettings(){
 if(window.StudyBlocker)return StudyBlocker.summary(false);
 if(!isExt)return v5UnavailableBlocker();
 return StudyCopy.format("ui_v4.website_blocking_help_block_during_648e40", [blockStatusPanel(), state.blocking.enabled?'on':'', state.blocking.enabled, state.blocking.domains.map(d=>StudyCopy.format("ui_v4.message_e4d166", [esc(d), esc(d), esc(d), icon('close','small')])).join(''), state.blocking.allow.map(d=>StudyCopy.format("ui_v4.message_db9340", [esc(d), esc(d), esc(d), icon('close','small')])).join(''), btn(StudyCopy.text("ui_v4.check_rules_2b4a79"),'block-check','','small'), btn(StudyCopy.text("ui_v4.reapply_rules_fa9fa2"),'block-repair','','small'), blockHealth(), btn(StudyCopy.text("ui_v4.block_now_b9a693"),'block-now','','small primary'), btn(StudyCopy.text("ui_v4.stop_blocking_fa7735"),'block-stop',canStopBlock()?'':'disabled','small')]);
}
settingsPage = function () {
  return StudyCopy.format("ui_v4.daily_preferences_save_preferences_notebook_923e5c", [head(StudyCopy.text("ui_v4.settings_1dfb67"), ""), inputField(StudyCopy.text("ui_v4.name_optional_bb6a45"), "name", state.settings.name || ""), inputField(StudyCopy.text("ui_v4.default_study_budget_minutes_66b583"), "capacity", state.settings.dailyCapacity, "number", 'min="15" max="480" required'), !state.settings.notebook ? "selected" : "", state.settings.notebook === "external" ? "selected" : "", state.settings.notebook === "here" ? "selected" : "", state.settings.notebook === "none" ? "selected" : "", btn(StudyCopy.text("ui_v4.open_notebook_e0e1a0"), "nav", 'data-screen="notebook"', "small link"), v4Action(StudyCopy.text("ui_v4.availability_and_daily_template_43369a"), "life", "", "small link"), v4ReminderSettings(), btn(icon("download", "small") + StudyCopy.text("ui_v4.export_full_backup_dfc34b"), "export-data"), btn(StudyCopy.text("ui_v4.restore_backup_7ff43e"), "import-data"), v4Action(StudyCopy.text("ui_v4.view_archive_d2f3c7"), "archive", "", "small link"), v5BlockingSettings()]);
};
function v4DefaultLife(date) {
  return structuredClone(
    Planning.dayConfig(state, date) || {
      wake: "",
      sleep: "",
      studyMinutes: state.settings.dailyCapacity,
      bufferMinutes: 15,
      studyWindows: [],
      activities: [],
    },
  );
}
function v4TimeValue(value) {
  let time = String(value || "").trim().replace(/：/g, ":");
  if (/^\d{1,2}$/.test(time)) time=time.padStart(2,"0")+":00";
  if (/^\d{3}$/.test(time)) time="0"+time;
  if (/^\d{4}$/.test(time)) time = time.slice(0, 2) + ":" + time.slice(2);
  if (/^\d:\d{2}$/.test(time)) time = "0" + time;
  return time;
}
function v4TimeField(label, name, value = "", extra = "") {
  return inputField(label, name, value, "text", `inputmode="numeric" data-time-input autocomplete="off" maxlength="5" placeholder="07:30" ${extra}`);
}
function v4ActivityRow(a = {}) {
  const flex = a.type === "flex";
  return `<div class="v4-life-row" data-life-row><input type="hidden" name="activityId" value="${esc(a.id || uid())}"><div class="field"><label>Activity name</label><input class="input" name="activityTitle" aria-label="Activity name" placeholder="e.g. Lunch" value="${esc(a.title || "")}"></div><div class="field"><label>Type</label><select class="input" name="activityType" aria-label="Activity type"><option value="fixed" ${!flex ? "selected" : ""}>Fixed time</option><option value="flex" ${flex ? "selected" : ""}>Flexible window</option></select></div><div class="field"><label data-activity-start-label>${flex ? "Earliest start" : "Start time"}</label><input class="input" name="activityStart" aria-label="Start or earliest start" type="text" inputmode="numeric" data-time-input maxlength="5" placeholder="11:00" value="${esc(a.start || "11:00")}"></div><div class="field"><label data-activity-end-label>${flex ? "Latest finish" : "End time"}</label><input class="input" name="activityEnd" aria-label="End or latest finish" type="text" inputmode="numeric" data-time-input maxlength="5" placeholder="13:00" value="${esc(a.end || "13:00")}"></div><div class="field" data-activity-duration ${flex ? "" : "hidden"}><label>Duration (minutes)</label><input class="input" name="activityMinutes" aria-label="Flexible activity duration" type="number" min="1" max="1440" value="${a.minutes || 40}" ${flex ? "" : "disabled"}></div>${v4Action(icon("close", "small"), "remove-life-row", 'aria-label="Remove activity"', "iconbtn")}</div>`;
}
function v8StudyWindowRow(window = {}) {
  return `<div class="v8-study-window" data-study-window><div class="field"><label>Start time</label><input class="input" type="time" name="studyStart" aria-label="Study window start" value="${esc(window.start || '')}"></div><div class="field"><label>End time</label><input class="input" type="time" name="studyEnd" aria-label="Study window end" value="${esc(window.end || '')}"></div>${v4Action(icon('close','small'),'remove-study-window','aria-label="Remove study window"','iconbtn')}</div>`;
}
function v4LifeModal() {
  const date = modal.date || today(),
    c = modal.life || v4DefaultLife(date);
  return `<form id="v4-life-form" data-date="${date}" novalidate><div class="life-editor-body"><p class="sub">Check whether tasks fit your day. Nothing is changed automatically.</p><div class="formgrid section-space">${inputField("Date", "date", date, "date", "required")}${inputField("Study budget (minutes)", "studyMinutes", c.studyMinutes ?? state.settings.dailyCapacity, "number", 'min="0" max="1440" required')}</div><section class="section-space" aria-labelledby="life-windows-label"><div class="between"><h3 id="life-windows-label">Study windows (optional)</h3>${v4Action('Add window','add-study-window','','small')}</div><p class="tiny" id="life-windows-help">Add windows when you can study. Without them, capacity is only an estimate.</p><div id="life-windows" class="stack section-space">${(c.studyWindows || []).map(v8StudyWindowRow).join('')}</div></section><details id="life-advanced" class="section-space" ${c.wake || c.sleep ? "open" : ""}><summary>Waking hours and breaks (optional)</summary><p class="tiny section-space">Waking hours exclude sleep from capacity. If omitted, 07:00–23:00 is used as an estimate. Bedtime may be after midnight.</p><div class="formgrid section-space">${v4TimeField("Wake-up time", "wake", c.wake || "")}${v4TimeField("Bedtime", "sleep", c.sleep || "")}${inputField("Breaks and buffer (minutes)", "bufferMinutes", c.bufferMinutes ?? 15, "number", 'min="0" max="360" required')}</div></details><h3 class="section-space">Classes and daily activities</h3><p class="tiny">Fixed events reserve their actual duration. Flexible activities must fit entirely within their window: a 40-minute lunch between 11:00 and 13:00 uses 40 minutes.</p><div id="life-activities" class="stack section-space">${(c.activities || []).map(v4ActivityRow).join("")}</div>${v4Action("Add activity", "add-life-row", "", "small section-space")}<div id="life-preview" class="notice section-space" role="status" aria-live="polite"></div><label class="toggle-line"><span>Save as daily template</span><input type="checkbox" name="saveTemplate"></label></div><div class="life-editor-footer"><p id="life-error" class="v5-field-error" role="alert" hidden tabindex="-1"></p><div class="modal-actions">${state.life?.template ? v4Action("Load daily template", "load-template", "", "small link") : ""}<span class="grow"></span>${btn(StudyCopy.text("common.cancel"), "close-modal", 'type="button"')}<button class="btn primary" type="submit">Save schedule</button></div></div></form>`;
}
function v4ReadLife(form) {
  const v = Object.fromEntries(new FormData(form));
  const windows = $$('[data-study-window]', form).map((row,index) => {
    const start = row.querySelector('[name="studyStart"]').value;
    const end = row.querySelector('[name="studyEnd"]').value;
    if (!validTime(start) || !validTime(end) || start === end) throw Error(`Enter distinct start and end times for study window ${index + 1}.`);
    return { start, end };
  });
  const activities = $$("[data-life-row]", form).map((row) => {
    const get = (n) => row.querySelector(`[name="${n}"]`).value;
    return { id: get("activityId"), title: get("activityTitle").trim() || "Activity", type: get("activityType"), start: v4TimeValue(get("activityStart")), end: v4TimeValue(get("activityEnd")), minutes: Number(get("activityMinutes")) };
  });
  const wake = v4TimeValue(v.wake), sleep = v4TimeValue(v.sleep);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || "") || !E.parseDate(v.date)) throw Error("Choose a valid date.");
  if ((wake || sleep) && (!validTime(wake) || !validTime(sleep) || wake === sleep))
    throw Error("Enter both waking times, such as 07:30 and 23:00, or leave both blank.");
  if (v.studyMinutes === "" || !Number.isFinite(+v.studyMinutes) || +v.studyMinutes < 0 || +v.studyMinutes > 1440)
    throw Error("Enter a study budget from 0 to 1440 minutes.");
  if (v.bufferMinutes === "" || !Number.isFinite(+v.bufferMinutes) || +v.bufferMinutes < 0 || +v.bufferMinutes > 360)
    throw Error("Enter 0 to 360 minutes for breaks and buffer.");
  for (const a of activities)
    if (!validTime(a.start) || !validTime(a.end) || a.start === a.end || (a.type === "flex" && (!Number.isFinite(a.minutes) || a.minutes < 1 || a.minutes > 1440)))
      throw Error(`Check the times for “${a.title}” (use HH:MM). Flexible activities also need a duration.`);
  return { date: v.date, config: { wake, sleep, studyMinutes: +v.studyMinutes, bufferMinutes: +v.bufferMinutes, studyWindows: windows, activities }, saveTemplate: Boolean(v.saveTemplate) };
}
function validTime(s) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s || "");
}
function v4LifePreview() {
  const f = $("#v4-life-form"), el = $("#life-preview");
  if (!f || !el) return;
  try {
    const { date, config } = v4ReadLife(f),
      next = { ...state, life: { ...state.life, days: { ...state.life?.days, [date]: config } } },
      c = v4Capacity(date, next);
    el.textContent = `${StudyUI.capacity(c).label}. ${StudyUI.capacity(c).detail}`;
    el.dataset.state = c.status;
    const error = $("#life-error");
    if (error) { error.hidden = true; error.textContent = ""; }
  } catch (e) {
    el.textContent = e.message;
    el.dataset.state = "invalid";
  }
}
function v4AdjustFields(task, type, values = {}) {
  const rest = Planning.remaining(task),
    half = Math.max(1, Math.floor(rest / 2)),
    firstDate = task.start < today() ? today() : task.start,
    date = values.date || modal.targetDate || E.addDays(firstDate, 1),
    time = values.atTime ?? "",
    minutes = values.minutes ?? (type === "split" || type === "reduce" ? half : rest);
  if (type === "cancel") return '<p class="notice">Cancel the remaining work. Progress and recorded time are kept. You can restore the task from Review.</p>';
  if (type === "reduce") return `${inputField("Remaining minutes after reduction", "minutes", minutes, "number", `min="1" max="${Math.max(1, rest - 1)}" step="1" required`)}<p class="tiny">Remaining: ${v4Minutes(rest)}. Describe the work you will keep below.</p>`;
  if (type === "split") return `${inputField("First session date", "firstDate", values.firstDate || firstDate, "date", "required")}${inputField("First session (minutes)", "minutes", minutes, "number", `min="1" max="${Math.max(1, rest - 1)}" step="1" required`)}${inputField("Second session date", "date", date, "date", "required")}<p class="notice" id="adjust-second-part">Second session: ${v4Minutes(rest - Number(minutes))}; total: ${v4Minutes(rest)}.</p>`;
  return `${type === "defer" ? inputField("Planned date", "date", date, "date", "required") : `<p class="notice">Continue today, ${today()}. Check the time left today.</p>${inputField("Remaining minutes", "minutes", minutes, "number", 'min="1" max="1440" step="1" required')}`}${v4TimeField("Start time (optional)", "atTime", time)}`;
}
function v4AdjustModal() {
  const t = state.tasks.find((t) => t.id === modal.id);
  if (!t) return "<p>This task no longer exists.</p>";
  const type = modal.adjustType || "continue", draft = modal.adjustDraft || {};
  return `<form id="v4-adjust-form" data-id="${esc(t.id)}" data-mode="${type}" novalidate><div class="v5-adjust-summary"><h3>${esc(t.title)}</h3><p class="sub">Remaining ${v4Minutes(Planning.remaining(t))} · Recorded ${v4Minutes(v4TaskActual(t))}</p></div><div class="field section-space"><label for="adjust-type">Adjustment</label><select class="input" id="adjust-type" name="type">${[["continue", "Continue today"], ["defer", "Reschedule"], ...(t.splittable && Planning.remaining(t) > 1 ? [["split", "Split into two sessions"]] : []), ...(Planning.remaining(t) > 1 ? [["reduce", "Reduce scope"]] : []), ["cancel", "Cancel task"]].map(([v, l]) => `<option value="${v}" ${v === type ? "selected" : ""}>${l}</option>`).join("")}</select></div><div id="adjust-fields" class="formgrid section-space v5-adjust-fields">${v4AdjustFields(t, type, draft)}</div><div class="field section-space"><label for="adjust-note">${type === "reduce" ? "Work to keep (required)" : type === "cancel" ? "Reason (optional)" : "Where to pick up next (optional)"}</label><textarea class="input" id="adjust-note" name="note" rows="2" placeholder="${type === "reduce" ? "e.g. Only complete questions 1–3" : "e.g. Continue from question 3"}">${esc(draft.note ?? t.continuation ?? "")}</textarea></div><div id="adjust-slots" class="section-space" ${["cancel", "reduce"].includes(type) ? "hidden" : ""}></div><p id="adjust-error" class="v5-field-error" role="alert" hidden></p><div class="modal-actions">${btn(StudyCopy.text("common.cancel"), "close-modal", 'type="button"')}<button class="btn primary" type="submit">Preview changes</button></div></form>`;
}
function v4UpdateAdjust(form, changedType = false) {
  if (!form || form._updatingAdjustment) return;
  const task = state.tasks.find((t) => t.id === form.dataset.id);
  if (!task) return;
  const type = form.elements.type.value;
  if (changedType) {
    form._adjustDrafts ||= {};
    form._adjustDrafts[form.dataset.mode] = Object.fromEntries(new FormData(form));
    form.dataset.mode = type;
    form._updatingAdjustment = true;
    try { $("#adjust-fields", form).innerHTML = v4AdjustFields(task, type, form._adjustDrafts[type] || {}); }
    finally { delete form._updatingAdjustment; }
    $("label[for=adjust-note]", form).textContent = type === "reduce" ? "Work to keep (required)" : type === "cancel" ? "Reason (optional)" : "Where to pick up next (optional)";
    $("#adjust-note", form).placeholder = type === "reduce" ? "e.g. Only complete questions 1–3" : "e.g. Continue from question 3";
  }
  const error = $("#adjust-error", form);
  error.hidden = true; error.textContent = "";
  const slots = $("#adjust-slots", form);
  slots.hidden = ["cancel", "reduce"].includes(type);
  if (slots.hidden) return;
  if (type === "split") {
    const second = Planning.remaining(task) - Number(form.elements.minutes.value);
    $("#adjust-second-part", form).textContent = `Second session: ${v4Minutes(second)}; total: ${v4Minutes(Planning.remaining(task))}.`;
  }
  const date = type === "continue" ? today() : form.elements.date?.value;
  if (!E.parseDate(date)) { slots.textContent = "Choose a date to see available windows."; return; }
  const minutes = type === "split" ? Planning.remaining(task) - Number(form.elements.minutes.value) : type === "continue" ? Number(form.elements.minutes.value) : Planning.remaining(task);
  const c = Planning.availableTaskSlots(state, date, task.id, { now: new Date(), minutes });
  slots.innerHTML = `<p class="tiny">${type === "split" ? "Second session date" : "Available windows"}: ${esc(StudyUI.error(c.recommendationReason || v4Slots(c)))}</p>${c.status === "estimate" ? '<p class="tiny">The schedule is incomplete. The preview will show estimates.</p>' : ""}${type !== "split" && !c.missing?.includes("可用于学习的具体时段") ? `<div class="row wrap v5-slot-options">${(c.freeSlots || []).slice(0, 8).map(s => { const start = typeof s.start === "number" ? Planning.minutesToTime(s.start) : s.start; return v4Action(`Choose ${start}`, "adjust-slot", `data-time="${esc(start)}"`, "small"); }).join("")}</div>` : ""}`;
}
function v4ProposalModal() {
  const p = modal.proposal;
  return `<div class="v4-adjustment"><p class="sub">Nothing changes until you confirm. Recorded time will be kept.</p><h3>Task changes</h3>${(p.updates || []).map((u) => {
      const old = state.tasks.find((t) => t.id === u.id), next = u.patch || u;
      return `<div class="notice"><strong>${esc(old?.title)}</strong><p>Date: ${StudyUI.date(old?.start)} → ${StudyUI.date(next.start || old?.start)}${next.atTime ? ` ${esc(next.atTime)}` : ""}</p><p>Remaining: ${v4Minutes(Planning.remaining(old))} → ${next.status === "cancelled" ? StudyCopy.text("common.cancel") : v4Minutes(next.remainingMinutes ?? Planning.remaining(old))}</p>${next.continuation ? `<p>${p.type === "reduce" ? "Work to keep" : "Note"}: ${esc(next.continuation)}</p>` : ""}</div>`;
    }).join("")}${(p.additions || []).map((t) => `<p>Add ${esc(t.title)} · ${StudyUI.date(t.start)} · ${v4Minutes(Planning.remaining(t))}</p>`).join("")}<h3>Schedule impact</h3>${(p.impact || []).map((x) => `<div class="notice"><strong>${StudyUI.date(x.date)}</strong><p>Before: ${StudyUI.capacity(x.before).label} · ${x.before.demandMinutes} min</p><p>After: ${StudyUI.capacity(x.after).label} · ${x.after.demandMinutes} min</p><p class="tiny">${StudyUI.capacity(x.after).detail}</p>${x.after.placements?.filter((y) => y.type === "task").length ? `<p class="tiny">Suggested arrangement: ${x.after.placements.filter((y) => y.type === "task").map((y) => `${esc(y.title)} ${esc(y.start)}–${esc(y.end)}`).join("；")}</p>` : ""}</div>`).join("")}${p.warnings?.length ? `<div class="notice">${p.warnings.map((w) => `<p>${esc(StudyUI.adjustmentWarning(w, p))}</p>`).join("")}</div>` : ""}<p id="adjust-error" class="v5-field-error" role="alert" hidden></p><div class="modal-actions">${v4Action("Back to edit", "adjust-back", "", "")}${v4Action("Confirm changes", "apply-adjustment", "", "primary")}</div></div>`;
}
function v4SessionModal() {
  const s = state.sessions.find((s) => s.id === modal.id) || {};
  return `<form id="v4-session-form" data-id="${esc(s.id || "")}"><p class="sub">${s.id ? "Corrections preserve the original minutes and edit time." : "Add study time you missed. It is marked as a manual entry."}</p><div class="formgrid section-space">${inputField("Date", "date", s.date || (screen === "reflection" ? reviewDate : today()), "date", "required")}${inputField("Time studied (minutes)", "minutes", s.minutes ?? 30, "number", 'min="0" max="1440" step="0.1" required')}</div><div class="field"><label for="session-task">Linked task (optional)</label><select class="input" id="session-task" name="taskId"><option value="">No linked task</option>${state.tasks
    .filter((t) => t.scope === "day")
    .map(
      (t) =>
        `<option value="${esc(t.id)}" ${s.taskId === t.id ? "selected" : ""}>${esc(t.title)}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="field section-space"><label for="session-note">Note (optional)</label><textarea class="input" name="note" id="session-note">${esc(s.note || "")}</textarea></div><div class="modal-actions">${btn(StudyCopy.text("common.cancel"), "close-modal", 'type="button"')}<button class="btn primary" type="submit">Save record</button></div></form>`;
}
renderModal = function () {
  if (!modal || !modal.type.startsWith("v4-")) {
    coreRenderModal();
    return;
  }
  const views = {
    "v4-life": ["Availability", v4LifeModal],
    "v4-adjust": ["Adjust task", v4AdjustModal],
    "v4-proposal": ["Confirm changes", v4ProposalModal],
    "v4-analysis": ["Plan insights", v4AnalysisDetails],
    "v4-session": [StudyCopy.text("common.studyActivity"), v4SessionModal],
    "v4-archive": [
      StudyCopy.text("ui_v4.archive_a6029d"),
      () =>
        StudyCopy.format("ui_v4.previous_questions_review_cards_questionnaires_db02b5", [state.reviews.length, state.importedNotes.length, esc(JSON.stringify({ aiDraft: state.aiDraft, reviews: state.reviews, importedNotes: state.importedNotes, answers: state.answers, assessments: state.assessments }, null, 2)), v4Action(StudyCopy.text("ui_v4.export_archive_51e6ca"), "export-archive", "", "primary")]),
    ],
    "v4-import": [
      StudyCopy.text("ui_v4.restore_backup_7ff43e"),
      () =>
        StudyCopy.format("ui_v4.restore_plans_and_records_current_23f621", [modal.importData.state.tasks.length, modal.importData.state.sessions.length, btn(StudyCopy.text("ui_v4.export_current_backup_3e5757"), "export-data", 'type="button"'), btn(StudyCopy.text("common.cancel"), "close-modal", 'type="button"'), v4Action(StudyCopy.text("ui_v4.restore_backup_7ff43e"), "confirm-import", "", "primary")]),
    ],
  };
  const [title, body] = views[modal.type] || [
    StudyCopy.text("ui_v4.notice_9a2de7"),
    () => StudyCopy.text("ui_v4.this_content_is_temporarily_unavailable_e08e36"),
  ];
  $("#modal-root").innerHTML =
    `<div class="modal-overlay" data-overlay="true"><section class="modal ${modal.type === "v4-life" ? "wide life-modal" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h2 id="modal-title">${title}</h2><button class="iconbtn" data-action="close-modal" aria-label="Close">${icon("close")}</button></header>${body()}</section></div>`;
  if (!modalFocusReady) {
    modalFocusReady = true;
    requestAnimationFrame(() =>
      $(
        "#modal-root input:not([type=hidden]),#modal-root select,#modal-root button",
      )?.focus(),
    );
  }
  if (modal.type === "v4-life") v4LifePreview();
  if (modal.type === "v4-adjust") v4UpdateAdjust($("#v4-adjust-form"));
};
render = function () {
  const previousView = document.body.classList.contains('is-focus-immersive');
  const focusAction = document.activeElement?.dataset.action;
  const navFocusScreen = document.activeElement?.matches('.global-nav [data-screen]')
    ? document.activeElement.dataset.screen : null;
  const sessionId = state.timer?.id || null;
  if (screen !== 'focus') focusImmersive = false;
  else if (sessionId !== focusViewSessionId) {
    if (sessionId && state.timer.status === 'running') focusImmersive = true;
    else if (!sessionId) focusImmersive = false;
  }
  focusViewSessionId = sessionId;
  if (
    ![
      "today",
      "plan",
      "focus",
      "profile",
      "settings",
      "reflection",
      "notebook",
      "guide",
      "blocking",
      "assessment",
    ].includes(screen)
  )
    screen = "today";
  if (notebookCleanup?.hasUnsaved?.() && screen === "notebook") {
    renderModal();
    updateClock();
    return;
  }
  notebookCleanup?.();
  notebookCleanup = null;
  const pages = {
    today: todayPage,
    plan: planPage,
    focus: focusPage,
    profile: profilePage,
    assessment: () => StudyAssessmentUI.page(),
    settings: settingsPage,
    reflection: v4ReflectionPage,
    guide: () => StudyGuide.page(),
    blocking: () => window.StudyBlocker ? StudyBlocker.page() : v5UnavailableBlocker(),
    notebook: () =>
      `${head(StudyCopy.text("ui_v4.notebook_84fc7f"), "")}<div id="notebook-root"></div>`,
  };
  const changingPage = lastRenderScreen !== screen;
  $("#app").innerHTML = layout(pages[screen]());
  // Commit the previous geometry before toggling the view so the new DOM
  // can interpolate the sidebar collapse rather than jumping to its end.
  if (previousView !== (screen === 'focus' && focusImmersive)) document.querySelector('.focus-layout')?.getBoundingClientRect();
  applyFocusPresentation();
  positionMoreMenu();
  // Replacing the route DOM must not drop keyboard focus back to the body.
  // Preserve it only for the navigation control that activated this route.
  if (navFocusScreen === screen && !focusImmersive)
    document.querySelector(`.global-nav [data-screen="${screen}"]`)?.focus({preventScroll:true});
  if (screen === 'focus' && ['start-timer','pause-timer','focus-task'].includes(focusAction)) document.querySelector('.focus-btns .primary')?.focus({preventScroll:true});
  if (changingPage && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('#main-content')?.animate([{opacity:.45,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  renderModal();
  updateClock();
  lastRenderScreen = screen;
  if (screen === "notebook")
    notebookCleanup = StudyNotebook.mount($("#notebook-root"), {
      openId: nextNotebookId,
      preference: state.settings.notebook || "",
      onPreference: (value) => {
        updatedV4((s) => (s.settings.notebook = value));
      },
      onPlan: (material) => {
        newTask({ date: today() });
        Object.assign(modal.task, material);
        renderModal();
      },
      toast,
    });
  nextNotebookId = null;
  v4PaintReminder();
  window.StudyBlocker?.onRender?.();
};
exportData = async function () {
  try {
    const notebook = await StudyNotebook.backup();
    const data = {
      app: "StudyOS",
      version: "0.0.4",
      exportedAt: new Date().toISOString(),
      data: state,
      notebook,
    };
    download(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      StudyCopy.format("ui_v4.studyos_backup_json_324bb8", [today()]),
    );
    toast(StudyCopy.text("ui_v4.full_backup_created_including_resources_0bc66b"));
  } catch (e) {
    toast(StudyCopy.text("ui_v4.backup_failed_9b7b06") + StudyUI.error(e.message), null, "error");
  }
};
importFile = async function (file) {
  try {
    if (file.size > 100 * 1024 * 1024) throw Error(StudyCopy.text("ui_v4.the_backup_must_be_mb_65cde8"));
    const raw = JSON.parse(await file.text()),
      next = validateState(raw);
    openModal("v4-import", {
      importData: { state: next, notebook: raw.notebook },
    });
  } catch (e) {
    toast(StudyCopy.text("ui_v4.could_not_read_backup_ad9fde") + StudyUI.error(e.message), null, "error");
  }
};
ring = function () {
  if (!state.settings.reminders || StudyReminders.timerEndAllowed(state, Date.now())) coreRing();
};
async function v4HandleAction(el) {
  const action = el.dataset.action,
    id = el.dataset.id;
  switch (action) {
    case "v4-life":
      moreOpen = false;
      openModal("v4-life", {
        date: el.dataset.date || selectedDate || today(),
      });
      break;
    case "v4-add-study-window":
      $("#life-windows").insertAdjacentHTML("beforeend", v8StudyWindowRow());
      $("#life-windows [data-study-window]:last-child input").focus();
      v4LifePreview();
      break;
    case "v4-remove-study-window":
      el.closest("[data-study-window]").remove();
      v4LifePreview();
      break;
    case "v4-add-life-row":
      $("#life-activities").insertAdjacentHTML("beforeend", v4ActivityRow());
      v4LifePreview();
      break;
    case "v4-remove-life-row":
      el.closest("[data-life-row]").remove();
      v4LifePreview();
      break;
    case "v4-load-template": {
      const form = $("#v4-life-form"), date = form.elements.date.value;
      if (!state.life?.template) throw Error(StudyCopy.text("ui_v4.no_daily_template_yet_select_74a2d6"));
      openModal("v4-life", { date, life: structuredClone(state.life.template) });
      break;
    }
    case "v4-adjust":
      openModal("v4-adjust", { id });
      break;
    case "v4-adjust-slot": {
      const input = $("#v4-adjust-form [name=atTime]");
      if (input) { input.value = el.dataset.time; input.focus(); }
      break;
    }
    case "v4-adjust-back": {
      const p = modal.proposal, after = p.after || {},
        draft = modal.adjustDraft || { date: p.type === "split" ? p.additions?.[0]?.start : after.start, firstDate: after.start, minutes: after.remainingMinutes, atTime: after.atTime || "", note: after.continuation || "" };
      openModal("v4-adjust", { id: p.taskId, adjustType: p.type, adjustDraft: draft });
      break;
    }
    case "v4-analysis":
      openModal("v4-analysis");
      break;
    case "v4-archive":
      moreOpen = false;
      openModal("v4-archive");
      break;
    case "v4-export-archive":
      download(
        new Blob(
          [
            JSON.stringify(
              {
                app: "StudyOS",
                version: "0.0.4",
                exportedAt: new Date().toISOString(),
                archive: {
                  reviews: state.reviews,
                  aiDraft: state.aiDraft,
                  answers: state.answers,
                  assessments: state.assessments,
                  importedNotes: state.importedNotes,
                  methodVotes: state.methodVotes,
                  original: state.archivedLegacy,
                },
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        StudyCopy.format("ui_v4.studyos_archive_json_2fb80b", [today()]),
      );
      break;
    case "v4-apply-adjustment": {
      if (el.disabled) break;
      el.disabled = true;
      try {
        if (modal.snapshot !== JSON.stringify({ tasks: state.tasks, life: state.life }))
          throw Error("The plan changed in another tab. Return to edit and preview it again.");
        const next = Planning.applyAdjustment(state, modal.proposal);
        commitV4(next);
        closeModal();
        render();
        toast("Changes saved.");
      } catch (e) {
        el.disabled = false;
        const error = $("#adjust-error");
        if (error) { error.textContent = StudyUI.error(e.message); error.hidden = false; }
        else throw e;
      }
      break;
    }
    case "v4-open-material":
      nextNotebookId = id;
      go("notebook");
      break;
    case "v4-restore-task":
      updatedV4((s) => {
        const t = s.tasks.find((t) => t.id === id);
        if (t) {
          t.status = "pending";
          t.done = false;
        }
      });
      render();
      toast("Task restored. Recorded time is unchanged.");
      break;
    case "v4-session":
      openModal("v4-session", { id });
      break;
    case "v4-review-period":
      reviewPeriod = el.dataset.period;
      render();
      break;
    case "v4-dismiss-reminder":
      if (activeReminder) {
        updatedV4((s) => {
          s.reminderLog ||= {};
          s.reminderLog[activeReminder.id] = { status: "dismissed" };
        });
        activeReminder = null;
        v4PaintReminder();
      }
      break;
    case "v4-snooze-reminder":
      if (activeReminder) {
        updatedV4((s) => {
          s.reminderLog ||= {};
          s.reminderLog[activeReminder.id] = {
            status: "snoozed",
            until: Date.now() + 10 * 60000,
          };
        });
        activeReminder = null;
        v4PaintReminder();
        toast("Reminder snoozed for 10 minutes.");
      }
      break;
    case "v4-confirm-import": {
      const imported = modal.importData;
      el.disabled = true;
      el.textContent = StudyCopy.text("ui_v4.restoring_resources_4f1435");
      const protectImport = event => { event.preventDefault(); event.returnValue = ''; };
      window.addEventListener('beforeunload', protectImport);
      let notebookRestored = false;
      try {
        // Check space before touching the notebook, without publishing half an import.
        if (!demo) {
          const probe = KEY + '.import-check';
          try { localStorage.setItem(probe, JSON.stringify(imported.state)); }
          finally { localStorage.removeItem(probe); }
        }
        if (imported.notebook) { await StudyNotebook.restore(imported.notebook); notebookRestored = true; }
        commitV4(imported.state);
      } catch (e) {
        el.textContent = StudyCopy.text("ui_v4.restore_backup_7ff43e");
        if (notebookRestored) throw Error(StudyCopy.text("ui_v4.resources_were_merged_but_plans_ab1f40") + StudyUI.error(e.message));
        throw e;
      } finally { window.removeEventListener('beforeunload', protectImport); }
      activeReminder = null;
      closeModal();
      screen = "today";
      render();
      toast(StudyCopy.text("ui_v4.backup_restored_307058"));
      break;
    }
    default:
      return false;
  }
  return true;
}
document.addEventListener(
  "click",
  (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el || el.disabled) return;
    if (
      notebookCleanup?.hasUnsaved?.() &&
      ["toggle-more", "start-demo", "exit-demo"].includes(el.dataset.action)
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      toast(StudyCopy.text("ui_v4.save_or_cancel_your_resource_b02c63"));
      return;
    }
    if (el.dataset.action.startsWith("v4-")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      v4HandleAction(el).catch((e) => {
        console.error(e);
        toast(StudyUI.error(e.message), null, "error");
        el.disabled = false;
      });
    } else if (el.dataset.action === "session-history") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      go("reflection");
    } else if (el.dataset.action === "export-data") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      exportData();
    } else if (
      [
        "open-reviews",
        "deep-quiz",
        "basic-quiz",
        "start-quiz",
        "nav-ai",
      ].includes(el.dataset.action)
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      openModal("v4-archive");
    }
  },
  true,
);
document.addEventListener(
  "submit",
  (ev) => {
    if (ev.target.id === "settings-form") {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const form = ev.target;
      if (!StudyForms.validate(form)) return;
      try {
        const v = Object.fromEntries(new FormData(form));
        updatedV4((s) => {
          s.settings.name = v.name.trim();
          s.settings.dailyCapacity = Number(v.capacity);
          s.life ||= {};
          s.life.template = {
            ...s.life.template,
            studyMinutes: Number(v.capacity),
          };
        });
        render();
        toast(StudyCopy.text("ui_v4.default_study_budget_saved_existing_3751fb"));
      } catch (e) {
        toast(StudyUI.error(e.message), null, "error");
      }
      return;
    }
    if (!ev.target.id.startsWith("v4-")) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const form = ev.target;
    if (form.dataset.busy) return;
    (async () => {
      form.dataset.busy = "true";
      try {
        if (!["v4-life-form", "v4-adjust-form"].includes(form.id) && !StudyForms.validate(form)) return;
        if (form.id === "v4-life-form") {
          const { date, config, saveTemplate } = v4ReadLife(form);
          updatedV4((s) => {
            s.life ||= { days: {} };
            s.life.days ||= {};
            s.life.days[date] = config;
            if (saveTemplate) s.life.template = structuredClone(config);
          });
          closeModal();
          selectedDate = date;
          render();
          toast("Schedule saved. Capacity updated.");
        } else if (form.id === "v4-adjust-form") {
          const v = Object.fromEntries(new FormData(form)),
            task = state.tasks.find((t) => t.id === form.dataset.id);
          if (!task) throw Error("This task no longer exists. Close this dialog and try again.");
          if (v.type === "reduce" && !v.note.trim()) throw Error("Describe the work to keep, such as questions 1–3.");
          if (["continue", "reduce", "split"].includes(v.type) && (!v.minutes || !Number.isInteger(Number(v.minutes)) || Number(v.minutes) < 1 || Number(v.minutes) > 1440))
            throw Error("Enter a whole number from 1 to 1440 minutes.");
          if (["defer", "split"].includes(v.type) && (!/^\d{4}-\d{2}-\d{2}$/.test(v.date || "") || !E.parseDate(v.date)))
            throw Error("Choose a valid planned date.");
          const atTime = v4TimeValue(v.atTime);
          if (atTime && !validTime(atTime)) throw Error("Use HH:MM for the start time, or leave it blank.");
          const options = { type: v.type, taskId: task.id, note: v.note.trim(), now: new Date() };
          if (v.type === "continue" || v.type === "defer") Object.assign(options, { date: v.type === "continue" ? today() : v.date, atTime });
          if (["continue", "reduce"].includes(v.type)) options.minutes = Number(v.minutes);
          if (v.type === "split") {
            options.date = v.date;
            options.parts = [{ date: v.firstDate, minutes: Number(v.minutes) }, { date: v.date, minutes: Planning.remaining(task) - Number(v.minutes) }];
          }
          const proposal = Planning.proposeAdjustment(state, options);
          if (!proposal.ok) throw Error(proposal.error || proposal.detail || proposal.errors?.join("；") || "Check the dates and minutes before previewing this adjustment.");
          openModal("v4-proposal", { proposal, adjustDraft: v, snapshot: JSON.stringify({ tasks: state.tasks, life: state.life }) });
        } else if (form.id === "v4-reminders-form") {
          const v = Object.fromEntries(new FormData(form));
          if (v.method === "system" && v.enabled) {
            if (!("Notification" in window))
              throw Error(StudyCopy.text("ui_v4.this_browser_does_not_support_f33bad"));
            if ((await Notification.requestPermission()) !== "granted")
              throw Error(StudyCopy.text("ui_v4.notification_permission_was_not_granted_42644c"));
          }
          updatedV4((s) => {
            s.settings.reminders = {
              enabled: Boolean(v.enabled),
              quietStart: v.quietStart,
              quietEnd: v.quietEnd,
              reduceDuringFocus: Boolean(v.reduceDuringFocus),
              timerException: Boolean(v.timerException),
              sound: Boolean(v.sound),
              method: v.method,
            };
            s.settings.sound = Boolean(v.sound);
          });
          unlockAudio();
          render();
          toast(StudyCopy.text("ui_v4.reminders_saved_49216b"));
        } else if (form.id === "v4-session-form") {
          const v = Object.fromEntries(new FormData(form)),
            minutes = Number(v.minutes);
          if (
            !E.parseDate(v.date) ||
            !Number.isFinite(minutes) ||
            minutes < 0 ||
            minutes > 1440
          )
            throw Error("Check the date and time studied.");
          updatedV4((s) => {
            const old = s.sessions.find((x) => x.id === form.dataset.id);
            if (old) {
              old.originalMinutes ??= old.minutes;
              Object.assign(old, {
                date: v.date,
                minutes,
                taskId: v.taskId,
                note: v.note,
                correctedAt: new Date().toISOString(),
              });
            } else
              s.sessions.push({
                id: uid(),
                date: v.date,
                at: new Date().toISOString(),
                minutes,
                taskId: v.taskId,
                note: v.note,
                source: "manual",
                phase: "focus",
                method: "timeblock",
              });
          });
          closeModal();
          render();
          toast("Session saved.");
        }
      } finally {
        delete form.dataset.busy;
      }
    })().catch((e) => {
      const error = form.querySelector("#life-error, #adjust-error");
      if (error) {
        error.textContent = StudyUI.error(e.message);
        error.hidden = false;
        error.focus({preventScroll:true});
      } else {
        console.error(e);
        toast(StudyUI.error(e.message), null, "error");
      }
    });
  },
  true,
);
document.addEventListener("input", (ev) => {
  if (ev.target.matches("[data-time-input]") && /^\d{4}$/.test(ev.target.value)) {
    const time = v4TimeValue(ev.target.value);
    if (validTime(time)) ev.target.value = time;
  }
  if (ev.target.closest("#v4-life-form")) v4LifePreview();
  if (ev.target.closest("#v4-adjust-form") && ev.target.name !== "type") v4UpdateAdjust(ev.target.closest("form"));
  if (ev.target.closest("#task-form")) v4TaskPreview();
});
document.addEventListener("change", (ev) => {
  if (ev.target.id === "review-date") {
    reviewDate = ev.target.value || today();
    render();
  }
  if (ev.target.id === "notebook-preference") {
    try {
      updatedV4((s) => (s.settings.notebook = ev.target.value));
      toast(StudyCopy.text("ui_v4.notebook_preference_saved_e0bd7c"));
    } catch (e) {
      toast(StudyUI.error(e.message), null, "error");
    }
  }
  if (ev.target.matches("[data-time-input]")) {
    const value = v4TimeValue(ev.target.value);
    if (validTime(value)) ev.target.value = value;
  }
  if (ev.target.closest("#v4-life-form")) {
    if (ev.target.name === "activityType") {
      const row = ev.target.closest("[data-life-row]"), flex = ev.target.value === "flex";
      row.querySelector("[data-activity-duration]").hidden = !flex;
      row.querySelector("[name=activityMinutes]").disabled = !flex;
      row.querySelector("[data-activity-start-label]").textContent = flex ? "Earliest start" : "Start time";
      row.querySelector("[data-activity-end-label]").textContent = flex ? "Latest finish" : "End time";
    }
    v4LifePreview();
  }
  if (ev.target.closest("#v4-adjust-form")) v4UpdateAdjust(ev.target.closest("form"), ev.target.name === "type");
  if (ev.target.closest("#task-form")) v4TaskPreview();
});
function v4TaskPreview() {
  const el = $("#task-capacity-preview");
  if (!el) return;
  try {
    const task = taskFromForm(),
      next = structuredClone(state),
      i = next.tasks.findIndex((t) => t.id === task.id);
    if (i < 0) next.tasks.push(task);
    else next.tasks[i] = task;
    const c = v4Capacity(task.start, next);
    el.textContent = `After saving: ${StudyUI.capacity(c).label}. ${StudyUI.capacity(c).detail}`;
  } catch {
    el.textContent = "Add a date and an estimate to check capacity.";
  }
}
document.addEventListener(
  "drop",
  (ev) => {
    const cell = ev.target.closest(".day-cell");
    if (!cell) return;
    const id = ev.dataTransfer.getData("text/studyos-task");
    if (!id) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    cell.classList.remove("drag-over");
    const p = Planning.proposeAdjustment(state, {
      type: "defer",
      taskId: id,
      date: cell.dataset.date,
      now: new Date(),
    });
    if (!p.ok) {
      toast(p.error || p.detail || StudyCopy.text("ui_v4.could_not_reschedule_efe5bc"));
      return;
    }
    openModal("v4-proposal", {
      proposal: p,
      snapshot: JSON.stringify({ tasks: state.tasks, life: state.life }),
    });
  },
  true,
);
function v4PaintReminder() {
  if (activeReminder && (!StudyReminders.eligible(state, Date.now()) || !StudyReminders.schedules(state).some(s => s.id === activeReminder.id))) activeReminder = null;
  const el = $("#reminder-region");
  if (!el) return;
  el.innerHTML = activeReminder
    ? `<aside class="v4-reminder" role="status"><div><strong>${esc(activeReminder.title)}</strong><p>${{ start: "It is time to start this task.", end: "The planned end time has arrived. Update your progress when ready.", advance: "Your task starts soon." }[activeReminder.kind] || "Snoozed reminder"}</p></div><div class="row">${v4Action("Snooze 10 min", "snooze-reminder", "", "small")}${v4Action(StudyCopy.text("common.close"), "dismiss-reminder", "", "small")}</div></aside>`
    : "";
}
let reminderTickBusy = false;
async function v4ReminderTick() {
  if (demo || reminderTickBusy) return;
  reminderTickBusy = true;
  try {
    if (
      activeReminder &&
      (!StudyReminders.eligible(state, Date.now()) ||
        !StudyReminders.schedules(state).some(
          (s) => s.id === activeReminder.id,
        ))
    ) {
      activeReminder = null;
      v4PaintReminder();
    }
    const result = StudyReminders.scan(state, Date.now());
    if (!result.expired.length && !result.due.length) return;
    const run = () => {
      const latest = localStorage.getItem(KEY);
      if (latest) state = validateState(JSON.parse(latest));
      const checked = StudyReminders.scan(state, Date.now());
      if (!checked.expired.length && !checked.due.length) return;
      const candidate = activeReminder ? null : checked.due[0];
      updatedV4((s) => {
        s.reminderLog ||= {};
        for (const id of checked.expired)
          s.reminderLog[id] = { status: "suppressed" };
        for (const item of checked.due)
          s.reminderLog[item.id] = {
            status: item === candidate ? "delivered" : "suppressed",
          };
      });
      if (candidate) {
        activeReminder = candidate;
        v4PaintReminder();
        if (
          state.settings.reminders?.method === "system" &&
          globalThis.Notification?.permission === "granted"
        ) {
          try {
            new Notification(StudyCopy.text("ui_v4.studyos_study_reminder_4229c1"), {
              body: candidate.title,
              tag: candidate.id,
            });
          } catch {}
        }
        if (state.settings.reminders?.sound) coreRing();
      }
    };
    if (navigator.locks)
      await navigator.locks.request("studyos-timer-v004", run);
    else run();
  } catch (e) {
    console.warn(StudyCopy.text("ui_v4.reminders_temporarily_unavailable_cecb98"), e.message);
  } finally {
    reminderTickBusy = false;
  }
}
document.addEventListener('click', event => {
 const control=event.target.closest('[data-action]');if(!control)return;
 const action=control.dataset.action;
 if(action==='toggle-more'){
  event.preventDefault();event.stopImmediatePropagation();
  if(!moreOpen)v7MoreReturn=control.closest('.mobile-bottom')?'.mobile-bottom [data-action="toggle-more"]':'.global-nav [data-action="toggle-more"]';
  setMoreMenu(!moreOpen, {returnFocus:moreOpen, focusFirst:!moreOpen});
 }else if(action==='v7-immersive-toggle'){
  event.preventDefault();event.stopImmediatePropagation();setFocusPresentation(!focusImmersive);
 }else if(action==='sidebar-goals'){
  event.preventDefault();event.stopImmediatePropagation();selectedDate=anchor=control.dataset.date;planView='tree';go('plan');
 }else if(action==='sidebar-review'){
  event.preventDefault();event.stopImmediatePropagation();reviewDate=control.dataset.date;reviewPeriod='day';go('reflection');
 }else if(action==='v7-review-day'){
  event.preventDefault();event.stopImmediatePropagation();reviewDate=control.dataset.date;reviewPeriod='day';render();requestAnimationFrame(()=>{const records=document.getElementById('review-records');records?.scrollIntoView({block:'nearest'});records?.focus({preventScroll:true});});
 }else if(action==='v7-review-week'){
  event.preventDefault();event.stopImmediatePropagation();reviewPeriod='week';render();requestAnimationFrame(()=>document.getElementById('review-trend-heading')?.scrollIntoView({block:'nearest'}));
 }else if(action==='v6-open-date'){
  event.preventDefault();event.stopImmediatePropagation();anchor=selectedDate=control.dataset.date;planView='day';go('plan');
 }else if(action==='v6-filter'){
  event.preventDefault();event.stopImmediatePropagation();v6TaskFilter=control.dataset.filter;v6PaintTaskList(true);
 }else if(action==='v6-clear-filter'){
  event.preventDefault();event.stopImmediatePropagation();v6TaskFilter='all';v6TaskQuery='';const input=document.getElementById('v6-task-search');if(input){input.value='';input.focus();}v6PaintTaskList();
 }else if(action==='open-blocking'){
  event.preventDefault();event.stopImmediatePropagation();go('blocking');
 }else if(action==='guide-go'){
  event.preventDefault();event.stopImmediatePropagation();
  const destination=control.dataset.destination;
  if(destination==='new-task')newTask({date:today()});
  else if(destination==='life')openModal('v4-life',{date:today()});
  else if(destination==='commands')window.StudyCommands?.open();
  else if(destination==='blocking-page')go('blocking');
  else if(destination==='blocking'){go('guide');requestAnimationFrame(()=>document.getElementById('guide-blocking')?.scrollIntoView({block:'start'}));}
  else go(destination);
 }else if(action==='dismiss-guide-hint'){
  event.preventDefault();event.stopImmediatePropagation();
  try{updatedV4(s=>s.settings.guideDismissed=true);render();}catch(e){toast(StudyUI.error(e.message), null, "error");}
 }else if(action==='v8-guide-skip-time'){
  event.preventDefault();event.stopImmediatePropagation();
  try{updatedV4(s=>s.settings.guideTimeSkipped=true);render();}catch(e){toast(StudyUI.error(e.message), null, "error");}
 }else if(action==='v8-guide-reset'){
  event.preventDefault();event.stopImmediatePropagation();
  try{updatedV4(s=>{s.settings.guideDismissed=false;s.settings.guideTimeSkipped=false;s.settings.guideReplay=true;});go('today');}catch(e){toast(StudyUI.error(e.message), null, "error");}
 }else if(action==='extension-help'){
  event.preventDefault();event.stopImmediatePropagation();go('guide');requestAnimationFrame(()=>document.getElementById('guide-blocking')?.scrollIntoView({block:'start'}));
 }
}, true);
document.addEventListener('input',event=>{
 if(event.target.id==='v6-task-search'){v6TaskQuery=event.target.value;v6PaintTaskList();}
});
document.addEventListener('keydown',event=>{
 if(event.isComposing || event.keyCode===229 || modal || window.StudyCommands?.isOpen?.())return;
 if(event.target.closest('[data-action="toggle-more"]') && event.key==='ArrowDown') {
  event.preventDefault();event.stopImmediatePropagation();setMoreMenu(true,{focusFirst:true});
 }else if(moreOpen){
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();setMoreMenu(false,{returnFocus:true});}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key) && event.target.closest('#more-menu')){
   const controls=[...document.querySelectorAll('#more-menu button')], index=controls.indexOf(document.activeElement);
   const next=event.key==='Home'?0:event.key==='End'?controls.length-1:(index+(event.key==='ArrowUp'?-1:1)+controls.length)%controls.length;
   event.preventDefault();controls[next]?.focus();
  }
 }else if(event.key==='Escape'&&focusImmersive){
  event.preventDefault();event.stopImmediatePropagation();setFocusPresentation(false);
 }
},true);
window.StudyOS = {
  ...window.StudyOS,
  getState: () => structuredClone(state),
  render: () => render(),
  planning: Planning,
  reminders: StudyReminders,
  notebook: StudyNotebook,
};
// Initial assessment is optional legacy content; a new user can start planning immediately.
if (screen === "quiz") screen = "today";
render();
setInterval(v4ReminderTick, 15000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") v4ReminderTick();
});
v4ReminderTick();

