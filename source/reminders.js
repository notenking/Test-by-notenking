
/* StudyOS reminders: local scheduling only; no background delivery guarantee. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StudyReminders = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GRACE_MS = 120000;
  const KINDS = ["start", "end", "advance"];
  const TERMINAL = new Set(["delivered", "dismissed", "suppressed", "expired"]);
  const DEFAULTS = {
    enabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
    reduceDuringFocus: true,
    sound: false,
    method: "inapp",
    timerException: false,
  };

  function timestamp(now) {
    return now instanceof Date ? now.getTime() : Number(now);
  }

  function settingsOf(state) {
    return { ...DEFAULTS, ...(state?.settings?.reminders || {}) };
  }

  function clockMinutes(value) {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hours, minutes] = value.split(":").map(Number);
    return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
  }

  // Equal endpoints, empty endpoints or quietEnabled:false mean no quiet period.
  // Quiet hours follow the browser's local timezone, just like task input fields.
  function inDnd(now, settings) {
    const time = timestamp(now);
    if (!Number.isFinite(time)) return false;
    const s = { ...DEFAULTS, ...(settings?.reminders || settings || {}) };
    if (s.quietEnabled === false) return false;
    const start = clockMinutes(s.quietStart);
    const end = clockMinutes(s.quietEnd);
    if (start == null || end == null || start === end) return false;
    const date = new Date(time);
    const current = date.getHours() * 60 + date.getMinutes();
    return start < end
      ? current >= start && current < end
      : current >= start || current < end;
  }

  function activeFocus(state) {
    const timer = state?.timer;
    return Boolean(
      timer &&
      timer.phase !== "break" &&
      ["running", "paused"].includes(timer.status),
    );
  }

  function eligible(state, now) {
    const s = settingsOf(state);
    return Boolean(
      Number.isFinite(timestamp(now)) &&
      s.enabled &&
      !inDnd(now, s) &&
      !(s.reduceDuringFocus && activeFocus(state)),
    );
  }

  // Ending the current timer is independent of other task reminders. The user's
  // exception only bypasses quiet hours; it never bypasses the global switch.
  function timerEndAllowed(state, now) {
    const s = settingsOf(state);
    return Boolean(
      Number.isFinite(timestamp(now)) &&
      s.enabled &&
      (s.timerException || !inDnd(now, s)),
    );
  }

  function taskStart(task) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.start || "")) return null;
    const minute = clockMinutes(task.atTime);
    if (minute == null) return null;
    const [year, month, day] = task.start.split("-").map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    // Reject invalid dates and nonexistent wall-clock times, rather than moving
    // a reminder silently to another day or hour.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() * 60 + date.getMinutes() !== minute
    )
      return null;
    return date.getTime();
  }

  function schedules(state) {
    const events = new Map();
    for (const task of Array.isArray(state?.tasks) ? state.tasks : []) {
      if (
        !task ||
        !task.id ||
        task.done ||
        ["cancelled", "canceled", "complete", "completed", "archived"].includes(
          task.status,
        ) ||
        (task.scope && task.scope !== "day")
      )
        continue;
      const start = taskStart(task);
      if (start == null) continue;
      const remaining = task.remainingMinutes;
      const minutes = Math.max(
        0,
        Number(
          remaining != null && Number.isFinite(Number(remaining))
            ? remaining
            : task.minutes,
        ) || 0,
      );
      const configs = Array.isArray(task.reminders)
        ? task.reminders
        : [task.reminder];
      for (const config of configs) {
        if (!config || config.enabled !== true) continue;
        const kinds = Array.isArray(config.kinds)
          ? config.kinds
          : [config.kind || "start"];
        for (const kind of kinds) {
          if (!KINDS.includes(kind)) continue;
          const rawAdvance = Number(config.advanceMinutes ?? 10);
          const advance = Number.isFinite(rawAdvance)
            ? Math.max(0, Math.min(10080, rawAdvance))
            : 10;
          const at =
            start +
            (kind === "end"
              ? minutes * 60000
              : kind === "advance"
                ? -advance * 60000
                : 0);
          const revision = String(
            config.revision ?? task.reminderRevision ?? 0,
          );
          // A changed schedule or config gets a new ID. Old delivered/snoozed
          // entries cannot deliver reminders for a superseded time.
          const id = [
            "task",
            encodeURIComponent(String(task.id)),
            kind,
            start,
            at,
            encodeURIComponent(revision),
          ].join(":");
          events.set(id, {
            id,
            taskId: String(task.id),
            title: String(task.title || "学习任务"),
            kind,
            at,
            scheduledAt: at,
            minutes,
            snoozed: false,
          });
        }
      }
    }
    return Array.from(events.values());
  }

  // Pure: callers persist delivered/suppressed statuses BEFORE opening a UI or
  // issuing a notification. Repeated scans alone intentionally do not mutate data.
  function scan(state, now) {
    const time = timestamp(now);
    const due = [];
    const expired = [];
    if (!Number.isFinite(time)) return { due, expired };
    const allowed = eligible(state, time);
    const settings = settingsOf(state);
    const log = state?.reminderLog || {};
    for (const scheduled of schedules(state)) {
      const entry = Object.prototype.hasOwnProperty.call(log, scheduled.id)
        ? log[scheduled.id]
        : null;
      if (TERMINAL.has(entry?.status)) continue;
      const event = { ...scheduled };
      if (entry?.status === "snoozed") {
        const until = Number(entry.until);
        if (!Number.isFinite(until) || until <= 0) {
          expired.push(event.id);
          continue;
        }
        event.at = until;
        event.snoozed = true;
      }
      if (event.at > time) continue;
      // Also check the intended time: reopening at 07:00 must not replay a
      // 06:59 reminder that belonged to quiet hours while the page was closed.
      if (time - event.at > GRACE_MS || !allowed || inDnd(event.at, settings))
        expired.push(event.id);
      else due.push(event);
    }
    due.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
    return { due, expired };
  }

  function compute(state, now) {
    return scan(state, now).due;
  }

  return {
    compute,
    scan,
    eligible,
    inDnd,
    timerEndAllowed,
    schedules,
    GRACE_MS,
  };
});

