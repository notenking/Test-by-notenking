
/* Recorded time only: no inferred study, attention scores or completion claims. */
(function (root) {
  'use strict';
  const engine = root.StudyEngine || (typeof require === 'function' ? require('./engine.js') : null);
  function week(sessions, selectedDate) {
    const start = engine.weekStart(selectedDate);
    const days = Array.from({ length: 7 }, (_, i) => ({ date: engine.addDays(start, i), timer: 0, manual: 0, count: 0, corrected: 0 }));
    const byDate = new Map(days.map(day => [day.date, day]));
    for (const session of sessions || []) {
      const day = byDate.get(session.date), minutes = Number(session.minutes);
      if (!day || session.phase === 'break' || !Number.isFinite(minutes) || minutes < 0) continue;
      day[session.source === 'manual' ? 'manual' : 'timer'] += minutes;
      day.count++;
      if (session.correctedAt) day.corrected++;
    }
    for (const day of days) day.total = day.timer + day.manual;
    return { start, end: days[6].date, days, total: days.reduce((n, d) => n + d.total, 0), timer: days.reduce((n, d) => n + d.timer, 0), manual: days.reduce((n, d) => n + d.manual, 0), count: days.reduce((n, d) => n + d.count, 0) };
  }
  function localDay(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value;
    const d = new Date(value || '');
    return Number.isFinite(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
  }
  function period(state, selectedDate, mode = 'day') {
    const start = mode === 'week' ? engine.weekStart(selectedDate) : selectedDate;
    const end = mode === 'week' ? engine.addDays(start,6) : start;
    const within = date => date >= start && date <= end;
    const all = (state.sessions || []).filter(s => s.phase !== 'break' && Number.isFinite(Number(s.minutes)) && Number(s.minutes) >= 0);
    const sessions = all.filter(s => within(s.date));
    const recordedIds = new Set(sessions.map(s => s.taskId).filter(Boolean));
    const events = (state.adjustmentHistory || []).filter(h => within(localDay(h.date || h.at)));
    const adjustedIds = new Set(events.map(h => h.taskId));
    const deferredIds = new Set(events.filter(h => h.type === 'defer').map(h => h.taskId));
    const tasks = (state.tasks || []).filter(t => t.scope === 'day' && (within(t.start) || within(localDay(t.completedAt)) || recordedIds.has(t.id) || adjustedIds.has(t.id)));
    const lifetime = id => all.filter(s => s.taskId === id).reduce((n,s) => n+Number(s.minutes),0);
    const counts = { done:0, partial:0, deferred:deferredIds.size, cancelled:0 };
    tasks.forEach(t => { if(t.status === 'cancelled') counts.cancelled++; else if(t.done || t.status === 'done') counts.done++; else if(t.status === 'partial') counts.partial++; });
    const comparison = tasks.filter(t => (t.done || t.status === 'done') && within(localDay(t.completedAt)) && lifetime(t.id)>0).map(t => ({taskId:t.id,title:t.title,expected:Number(t.minutes)||0,actual:lifetime(t.id)}));
    return {start,end,sessions,tasks,counts,deferredIds:[...deferredIds],
      actual:sessions.reduce((n,s)=>n+Number(s.minutes),0),
      timer:sessions.filter(s=>s.source!=='manual').reduce((n,s)=>n+Number(s.minutes),0),
      manual:sessions.filter(s=>s.source==='manual').reduce((n,s)=>n+Number(s.minutes),0),
      taskMinutes:Object.fromEntries(tasks.map(t=>[t.id,sessions.filter(s=>s.taskId===t.id).reduce((n,s)=>n+Number(s.minutes),0)])),
      comparison,comparisonExpected:comparison.reduce((n,t)=>n+t.expected,0),comparisonActual:comparison.reduce((n,t)=>n+t.actual,0)};
  }
  const api = { week, period };
  root.StudyReviewTrend = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

