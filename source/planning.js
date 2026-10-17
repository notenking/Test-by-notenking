
/* Local planning math. No task is changed until applyAdjustment is called. */
(function (root) {
  "use strict";
  const LIMIT = 16000;
  const finite = (v, fallback = 0) =>
    Number.isFinite(Number(v)) ? Number(v) : fallback;
  const sum = (slots) => slots.reduce((n, s) => n + s[1] - s[0], 0);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function timeToMinutes(value) {
    if (typeof value !== "string" || !/^\d{1,2}:\d{2}$/.test(value)) return NaN;
    const [h, m] = value.split(":").map(Number);
    return h >= 0 && h <= 24 && m >= 0 && m < 60 && (h < 24 || m === 0)
      ? h * 60 + m
      : NaN;
  }
  function minutesToTime(value) {
    const n = Math.max(0, Math.round(value));
    return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  }
  function remaining(task) {
    if (task.done || task.status === "completed" || task.status === "cancelled")
      return 0;
    return Math.max(
      0,
      Math.ceil(finite(task.remainingMinutes ?? task.minutes)),
    );
  }
  function dayConfig(state, date) {
    const life = state.life || {};
    return clone({ ...(life.template || {}), ...(life.days?.[date] || {}) });
  }
  function merge(slots) {
    const out = [];
    for (const slot of slots
      .filter((s) => s[1] > s[0])
      .sort((a, b) => a[0] - b[0])) {
      const last = out[out.length - 1];
      if (last && slot[0] <= last[1]) last[1] = Math.max(last[1], slot[1]);
      else out.push(slot.slice());
    }
    return out;
  }
  function intersect(a, b) {
    const out = [];
    for (const x of a)
      for (const y of b) {
        const start = Math.max(x[0], y[0]),
          end = Math.min(x[1], y[1]);
        if (end > start) out.push([start, end]);
      }
    return merge(out);
  }
  function subtract(slots, occupied) {
    let out = slots.map((s) => s.slice());
    for (const [a, b] of merge(occupied))
      out = out.flatMap(([x, y]) => {
        if (a >= y || b <= x) return [[x, y]];
        return [
          [x, Math.min(a, y)],
          [Math.max(x, b), y],
        ].filter((s) => s[1] > s[0]);
      });
    return out;
  }
  const publicSlot = (s) => ({
    start: minutesToTime(s[0]),
    end: minutesToTime(s[1]),
    startMinute: s[0],
    endMinute: s[1],
  });
  function makePlacement(job, start, end) {
    return {
      type: job.type,
      id: job.id,
      title: job.title,
      ...publicSlot([start, end]),
      minutes: end - start,
    };
  }
  function interval(start, end, awake) {
    let a = timeToMinutes(start),
      b = timeToMinutes(end);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (awake[1] > 1440 && a < awake[0]) a += 1440;
    if (b <= a) b += 1440;
    return [a, b];
  }
  // Integer max-flow allocates splittable tasks across actual free intervals.
  // This avoids an early, flexible task consuming a later task's only window.
  function allocateSplit(jobs, busy) {
    if (!jobs.length) return [];
    const domains = jobs.map((j) => subtract(j.slots, busy));
    const points = [...new Set(domains.flat(2))].sort((a, b) => a - b);
    const segments = points
      .slice(1)
      .map((p, i) => [points[i], p])
      .filter(
        ([a, b]) =>
          b > a && domains.some((ds) => ds.some((s) => a >= s[0] && b <= s[1])),
      );
    const sink = 1 + jobs.length + segments.length,
      graph = Array.from({ length: sink + 1 }, () => []);
    function edge(a, b, capacity) {
      const forward = {
        to: b,
        rev: graph[b].length,
        cap: capacity,
        initial: capacity,
      };
      const reverse = { to: a, rev: graph[a].length, cap: 0, initial: 0 };
      graph[a].push(forward);
      graph[b].push(reverse);
      return forward;
    }
    const links = [];
    jobs.forEach((j, i) => {
      edge(0, i + 1, j.minutes);
      segments.forEach((s, k) => {
        if (domains[i].some((d) => s[0] >= d[0] && s[1] <= d[1]))
          links.push({
            i,
            k,
            edge: edge(i + 1, jobs.length + 1 + k, s[1] - s[0]),
          });
      });
    });
    segments.forEach((s, k) => edge(jobs.length + 1 + k, sink, s[1] - s[0]));
    let flow = 0;
    while (true) {
      const level = Array(graph.length).fill(-1),
        q = [0];
      level[0] = 0;
      for (let qi = 0; qi < q.length; qi++)
        for (const e of graph[q[qi]])
          if (e.cap > 0 && level[e.to] < 0) {
            level[e.to] = level[q[qi]] + 1;
            q.push(e.to);
          }
      if (level[sink] < 0) break;
      const ptr = Array(graph.length).fill(0);
      function push(v, amount) {
        if (v === sink) return amount;
        for (; ptr[v] < graph[v].length; ptr[v]++) {
          const e = graph[v][ptr[v]];
          if (e.cap <= 0 || level[e.to] !== level[v] + 1) continue;
          const sent = push(e.to, Math.min(amount, e.cap));
          if (sent) {
            e.cap -= sent;
            graph[e.to][e.rev].cap += sent;
            return sent;
          }
        }
        return 0;
      }
      let sent;
      while ((sent = push(0, Infinity))) flow += sent;
    }
    if (flow < jobs.reduce((n, j) => n + j.minutes, 0)) return null;
    const cursors = segments.map((s) => s[0]),
      placements = [];
    for (const link of links) {
      const amount = link.edge.initial - link.edge.cap;
      if (amount > 0) {
        placements.push(
          makePlacement(
            jobs[link.i],
            cursors[link.k],
            cursors[link.k] + amount,
          ),
        );
        cursors[link.k] += amount;
      }
    }
    return placements;
  }
  function solve(jobs, fixed, study, limit = LIMIT) {
    const atomic = jobs
      .filter((j) => !j.split)
      .slice()
      .sort((a, b) => {
        const slack = (j) => sum(subtract(j.slots, fixed)) - j.minutes;
        return (
          slack(a) - slack(b) ||
          String(a.deadline || "9999").localeCompare(
            String(b.deadline || "9999"),
          )
        );
      });
    const split = jobs.filter((j) => j.split);
    let steps = 0,
      exhausted = false;
    const deadline = Date.now() + 220;
    function visit(index, busy, placements) {
      if (++steps > limit || Date.now() > deadline) {
        exhausted = true;
        return null;
      }
      if (index >= atomic.length) {
        const tails = allocateSplit(split, busy);
        return tails ? placements.concat(tails) : null;
      }
      const job = atomic[index],
        slots = subtract(job.slots, busy),
        starts = [];
      for (const [a, b] of slots)
        for (let start = a; start + job.minutes <= b; start++) {
          if (job.exact != null && start !== job.exact) continue;
          starts.push(start);
        }
      if (job.type === "activity")
        starts.sort(
          (a, b) =>
            sum(intersect([[a, a + job.minutes]], study)) -
              sum(intersect([[b, b + job.minutes]], study)) || a - b,
        );
      for (const start of starts) {
        const nextBusy = busy.concat([[start, start + job.minutes]]);
        // A necessary bound cheaply rejects impossible branches before flow.
        if (
          jobs.some(
            (j) => j.split && sum(subtract(j.slots, nextBusy)) < j.minutes,
          )
        )
          continue;
        const result = visit(
          index + 1,
          nextBusy,
          placements.concat(makePlacement(job, start, start + job.minutes)),
        );
        if (result) return result;
        if (exhausted) break;
      }
      return null;
    }
    const placements = visit(0, fixed, []);
    return { placements, exhausted, steps };
  }
  function capacity(state, date, options = {}) {
    const config = dayConfig(state, date),
      issues = [],
      missing = [];
    let wake = timeToMinutes(config.wake),
      sleep = timeToMinutes(config.sleep);
    if (!Number.isFinite(wake) || !Number.isFinite(sleep)) {
      missing.push("起床与睡觉时间");
      wake = 7 * 60;
      sleep = 23 * 60;
    }
    if (sleep <= wake) sleep += 1440;
    const awake = [wake, sleep],
      fixed = [],
      flex = [];
    const willingnessSet =
      config.studyMinutes !== undefined &&
      config.studyMinutes !== "" &&
      Number.isFinite(Number(config.studyMinutes));
    const totalStudyBudget = willingnessSet
      ? Math.max(0, Math.floor(Number(config.studyMinutes)))
      : 0;
    const seenSessions = new Set();
    const consumedMinutes = (state.sessions || []).reduce((total, session) => {
      if (
        session.phase === "break" ||
        session.date !== date ||
        session.deleted ||
        (session.id && seenSessions.has(session.id))
      )
        return total;
      if (session.id) seenSessions.add(session.id);
      return total + Math.max(0, finite(session.minutes));
    }, 0);
    const willingness = Math.max(0, totalStudyBudget - consumedMinutes);
    if (!willingnessSet) missing.push("愿意用于学习的分钟数");
    const buffer = Math.max(0, Math.ceil(finite(config.bufferMinutes)));
    let windows = (config.studyWindows || [])
      .map((w) => interval(w.start, w.end, awake))
      .filter(Boolean);
    if (!windows.length) {
      missing.push("可用于学习的具体时段");
      windows = [awake];
    }
    windows = intersect(merge(windows), [awake]);
    // Callers opt into a remaining-day calculation with an explicit clock.
    // Historical/future dates and calls without a clock retain whole-day math.
    let fromMinute = options.fromMinute;
    if (!Number.isFinite(fromMinute) && options.now !== undefined) {
      const now = new Date(options.now);
      if (Number.isFinite(now.getTime()) && localToday(now) === date)
        fromMinute = now.getHours() * 60 + now.getMinutes();
    }
    if (Number.isFinite(fromMinute))
      windows = intersect(windows, [[fromMinute, awake[1]]]);
    for (const [i, activity] of (config.activities || []).entries()) {
      const span = interval(activity.start, activity.end, awake);
      if (!span) {
        missing.push(`「${activity.title || "生活安排"}」的有效时间`);
        continue;
      }
      const slots = intersect([span], [awake]);
      if (activity.type === "flex") {
        const duration = Math.ceil(finite(activity.minutes));
        if (duration <= 0) {
          missing.push(`「${activity.title || "弹性安排"}」的时长`);
          continue;
        }
        flex.push({
          type: "activity",
          id: activity.id || `activity-${i}`,
          title: activity.title || "弹性安排",
          slots,
          minutes: duration,
        });
      } else fixed.push(...slots);
    }
    const occupied = merge(fixed),
      baseSlots = subtract(windows, occupied);
    const tasks = (state.tasks || []).filter(
      (t) =>
        (t.scope === "day" || !t.scope) &&
        remaining(t) > 0 &&
        (t.date === date || (t.start <= date && (t.due || t.start) >= date)),
    );
    const demandMinutes = tasks.reduce((n, t) => n + remaining(t), 0);
    const jobs = tasks.map((t) => {
      let slots = windows;
      if (t.windowStart && t.windowEnd) {
        const span = interval(t.windowStart, t.windowEnd, awake);
        if (span) slots = intersect(slots, [span]);
        else missing.push(`「${t.title}」的有效时间段`);
      }
      let exact = null;
      if (t.atTime) {
        exact = timeToMinutes(t.atTime);
        if (awake[1] > 1440 && exact < awake[0]) exact += 1440;
      }
      if (validDate(t.deadline) && date > t.deadline)
        issues.push({
          type: "deadline",
          taskId: t.id,
          detail: `「${t.title}」已超过截止日期 ${t.deadline}。`,
        });
      return {
        type: "task",
        id: t.id,
        title: t.title,
        slots,
        minutes: remaining(t),
        split: !!t.splittable && exact == null,
        exact,
        deadline: validDate(t.deadline) ? t.deadline : "",
      };
    });
    const lifeResult = solve(flex, occupied, windows);
    const lifePlacements = lifeResult.placements || [];
    const activityBusy = lifePlacements.map((p) => [
      p.startMinute,
      p.endMinute,
    ]);
    const physicalMinutes = Math.max(
      0,
      sum(subtract(baseSlots, activityBusy)) - buffer,
    );
    let availableMinutes = Math.min(willingness, physicalMinutes);
    let result = {
      status: "sufficient",
      label: "时间基本充足",
      detail: "",
      excessMinutes: Math.max(0, demandMinutes - availableMinutes),
      availableMinutes,
      demandMinutes,
      consumedMinutes,
      totalStudyBudget,
      freeSlots: subtract(baseSlots, activityBusy).map(publicSlot),
      placements: lifePlacements,
      issues,
      activityMinutes: sum(occupied) + flex.reduce((n, j) => n + j.minutes, 0),
      bufferMinutes: buffer,
      missing,
      estimated: !!missing.length,
    };
    if (!lifeResult.placements) {
      result.status = lifeResult.exhausted ? "estimate" : "conflict";
      result.label = lifeResult.exhausted ? "暂时只能估算" : "生活安排存在冲突";
      result.detail = lifeResult.exhausted
        ? "生活安排组合较多，暂未确认是否都能放入指定区间；请缩小可选区间后重试。"
        : "至少一项弹性活动不能完整放进指定区间。请调整它的区间或其他生活安排。";
      result.issues.push({ type: "activity", detail: result.detail });
      return result;
    }
    const bufferJobs = buffer
      ? [
          {
            type: "buffer",
            id: "daily-buffer",
            title: "休息与缓冲",
            minutes: buffer,
            slots: windows,
            split: true,
          },
        ]
      : [];
    const full = solve([...flex, ...jobs, ...bufferJobs], occupied, windows);
    if (full.placements) {
      const flexBusy = full.placements
        .filter((p) => p.type === "activity")
        .map((p) => [p.startMinute, p.endMinute]);
      result.availableMinutes = availableMinutes = Math.min(
        willingness,
        Math.max(0, sum(subtract(baseSlots, flexBusy)) - buffer),
      );
      result.excessMinutes = Math.max(0, demandMinutes - availableMinutes);
      result.placements = full.placements;
      // Available slots before proposed learning placements, with life and buffer reserved.
      const lifeAndBuffer = full.placements
        .filter((p) => p.type !== "task")
        .map((p) => [p.startMinute, p.endMinute]);
      result.freeSlots = subtract(baseSlots, lifeAndBuffer).map(publicSlot);
    }
    const unavoidableActivityMinutes = flex.reduce((total, job) => {
      let minimum = Infinity;
      for (const [a, b] of subtract(job.slots, occupied))
        for (let start = a; start + job.minutes <= b; start++)
          minimum = Math.min(
            minimum,
            sum(intersect([[start, start + job.minutes]], windows)),
          );
      return total + (Number.isFinite(minimum) ? minimum : 0);
    }, 0);
    const upperCapacity = Math.min(
      willingness,
      Math.max(0, sum(baseSlots) - buffer - unavoidableActivityMinutes),
    );
    if (demandMinutes > upperCapacity && willingnessSet) {
      result.status = "overload";
      result.label = "总量超出可用时间";
      result.excessMinutes = Math.max(
        0,
        demandMinutes - result.availableMinutes,
      );
      result.detail = `剩余任务 ${demandMinutes} 分钟，可安排约 ${result.availableMinutes} 分钟，多出 ${result.excessMinutes} 分钟。`;
    } else if (full.exhausted && !full.placements) {
      result.status = "estimate";
      result.label = "暂时只能估算";
      result.detail =
        "时间组合较多，尚未找到可行安排，也不能据此认定一定冲突；请缩小可选时段或拆分任务。";
    } else if (!full.placements) {
      result.status = "conflict";
      result.label = "时段冲突或过于零碎";
      result.detail =
        "总量可能足够，但固定安排、弹性区间、任务连续时长或休息缓冲使具体时段无法容纳。";
      result.issues.push({ type: "fragmentation", detail: result.detail });
    } else
      result.detail = `剩余任务 ${demandMinutes} 分钟；学习预算内可安排 ${availableMinutes} 分钟，已为生活安排和 ${buffer} 分钟休息缓冲留出空间。`;
    if (
      missing.length &&
      result.status !== "overload" &&
      result.status !== "conflict"
    ) {
      result.status = "estimate";
      result.label = "信息不足，暂时只能估算";
      result.detail = `尚缺${[...new Set(missing)].join("、")}。未安排的时间不会自动算作学习时间。`;
    }
    if (missing.length)
      result.issues.push({
        type: "missing",
        detail: `需要补充：${[...new Set(missing)].join("、")}`,
      });
    return result;
  }
  // Recommend a continuous slot for the task being adjusted, not every gap
  // between life activities. Other tasks keep their feasible trial placement.
  // A chosen start time pins this task, even when it otherwise allows splitting.
  function availableTaskSlots(state, date, taskId, options = {}) {
    const task = (state.tasks || []).find((t) => t.id === taskId);
    const others = {
      ...state,
      tasks: (state.tasks || []).filter((t) => t.id !== taskId),
    };
    const result = capacity(others, date, options);
    const requestedMinutes = Math.ceil(
      finite(options.minutes ?? (task ? remaining(task) : 0)),
    );
    const remainingBudgetMinutes = Math.max(
      0,
      result.availableMinutes - result.demandMinutes,
    );
    const recommendation = {
      ...result,
      freeSlots: [],
      requestedMinutes,
      remainingBudgetMinutes,
      recommendationReason: "",
    };
    if (!task || requestedMinutes <= 0) {
      recommendation.recommendationReason = "填写有效的剩余用时后查看可用时段。";
      return recommendation;
    }
    if (result.status !== "sufficient") {
      recommendation.recommendationReason =
        result.status === "estimate"
          ? "时间资料尚不完整，暂不能确认可用时段。"
          : "其他任务或生活安排尚有冲突，请先调整后再选择时间。";
      return recommendation;
    }
    if (requestedMinutes > remainingBudgetMinutes) {
      recommendation.recommendationReason =
        `扣除其他任务后，学习预算还剩 ${remainingBudgetMinutes} 分钟，少于本次所需 ${requestedMinutes} 分钟。`;
      return recommendation;
    }
    const otherTaskSlots = result.placements
      .filter((p) => p.type === "task")
      .map((p) => [p.startMinute, p.endMinute]);
    let slots = subtract(
      result.freeSlots.map((s) => [s.startMinute, s.endMinute]),
      otherTaskSlots,
    );
    if (task.windowStart && task.windowEnd) {
      const config = dayConfig(state, date);
      let wake = timeToMinutes(config.wake),
        sleep = timeToMinutes(config.sleep);
      if (!Number.isFinite(wake) || !Number.isFinite(sleep)) {
        wake = 7 * 60;
        sleep = 23 * 60;
      }
      if (sleep <= wake) sleep += 1440;
      const taskWindow = interval(task.windowStart, task.windowEnd, [wake, sleep]);
      slots = taskWindow ? intersect(slots, [taskWindow]) : [];
    }
    recommendation.freeSlots = slots
      .filter(([start, end]) => end - start >= requestedMinutes)
      .map(publicSlot);
    if (!recommendation.freeSlots.length)
      recommendation.recommendationReason =
        `扣除其他任务与缓冲后，没有可连续安排 ${requestedMinutes} 分钟的时段。`;
    return recommendation;
  }
  function validDate(date) {
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(date || "") &&
      !Number.isNaN(Date.parse(`${date}T12:00:00`))
    );
  }
  function localToday(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function newId() {
    return (
      root.crypto?.randomUUID?.() ||
      `part-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    );
  }
  function proposeAdjustment(state, options) {
    const task = (state.tasks || []).find((t) => t.id === options.taskId);
    const fail = (detail) => ({
      ok: false,
      detail,
      warnings: [],
      updates: [],
      additions: [],
    });
    if (!task) return fail("找不到这项任务。");
    if (task.done || task.status === "cancelled")
      return fail("这项任务已结束，请先恢复后调整。");
    const now = options.now === undefined ? new Date() : new Date(options.now);
    if (!Number.isFinite(now.getTime())) return fail("当前时间无效，请刷新后重试。");
    const rest = remaining(task),
      type = options.type,
      date = options.date || task.start || localToday(now);
    if (!validDate(date)) return fail("请选择有效日期。");
    const additions = [],
      patch = {},
      warnings = [],
      affected = new Set([task.start, date]);
    const history = {
      type,
      at: now.toISOString(),
      fromDate: task.start,
      toDate: date,
      previousRemaining: rest,
      note: options.note || "",
    };
    if (type === "defer" || type === "continue") {
      Object.assign(patch, {
        start: date,
        due: date,
        status: task.status === "partial" ? "partial" : "pending",
      });
      if (options.atTime !== undefined) patch.atTime = options.atTime;
      else if (date !== task.start) patch.atTime = "";
      if (options.windowStart !== undefined)
        patch.windowStart = options.windowStart;
      if (options.windowEnd !== undefined) patch.windowEnd = options.windowEnd;
      if (type === "continue" && options.minutes != null) {
        if (
          !Number.isFinite(Number(options.minutes)) ||
          Number(options.minutes) <= 0
        )
          return fail("剩余工作量必须大于 0 分钟。");
        patch.remainingMinutes = Math.ceil(Number(options.minutes));
      }
    } else if (type === "reduce") {
      const amount = Number(options.minutes);
      if (!Number.isFinite(amount) || amount <= 0 || amount >= rest)
        return fail("缩小后的剩余时长需要大于 0 且少于当前剩余时长。");
      patch.remainingMinutes = Math.ceil(amount);
      patch.minutes =
        Math.max(0, finite(task.minutes) - rest) + patch.remainingMinutes;
      if (options.title?.trim()) patch.title = options.title.trim();
      if (options.description !== undefined)
        patch.description = options.description;
      warnings.push(
        "请同时确认学习范围已缩小；单独改短时长并不会自动减少实际工作。",
      );
    } else if (type === "split") {
      if (!task.splittable)
        return fail("此任务未允许拆分。请先在任务详情开启“可以拆分”。");
      const parts = options.parts;
      if (
        !Array.isArray(parts) ||
        parts.length < 2 ||
        parts.some(
          (p) =>
            !validDate(p.date) ||
            !Number.isFinite(Number(p.minutes)) ||
            Number(p.minutes) <= 0 ||
            !Number.isInteger(Number(p.minutes)),
        )
      )
        return fail("请提供至少两段有效日期与整数分钟数。");
      if (parts.reduce((n, p) => n + Number(p.minutes), 0) !== rest)
        return fail(`各段分钟数之和必须等于剩余工作量 ${rest} 分钟。`);
      const baseTitle = task.splitBaseTitle || task.title;
      parts.forEach((part, i) => {
        affected.add(part.date);
        const values = {
          title: `${baseTitle} · ${i + 1}/${parts.length}`,
          splitBaseTitle: baseTitle,
          splitGroupId: task.splitGroupId || task.id,
          start: part.date,
          due: part.date,
          remainingMinutes: Number(part.minutes),
          atTime: part.atTime || "",
          status: "pending",
          done: false,
        };
        if (i === 0)
          Object.assign(patch, values, {
            minutes:
              Math.max(0, finite(task.minutes) - rest) + Number(part.minutes),
          });
        else
          additions.push({
            ...clone(task),
            ...values,
            id: newId(),
            minutes: Number(part.minutes),
            reminder: task.reminder ? { ...task.reminder } : undefined,
            adjustmentHistory: [history],
            createdAt: Date.now(),
          });
      });
      warnings.push(
        "既有计时记录保留在原任务；新分段不会复制已记录的学习时间。",
      );
    } else if (type === "cancel")
      Object.assign(patch, { status: "cancelled", cancelledAt: Date.now() });
    else return fail("不支持的调整方式。");
    if (options.note !== undefined) {
      patch.continuation = String(options.note);
      patch.nextStep = String(options.note); // Preserve compatibility with earlier local previews.
    }
    patch.adjustmentHistory = [...(task.adjustmentHistory || []), history];
    const updated = { ...task, ...patch };
    for (const changed of [updated, ...additions]) {
      if (
        validDate(changed.deadline) &&
        changed.due > changed.deadline &&
        type !== "cancel"
      )
        warnings.push(
          `「${changed.title}」安排到 ${changed.due}，超过截止日期 ${changed.deadline}。`,
        );
      const parent = (state.tasks || []).find((t) => t.id === changed.parentId);
      if (
        parent &&
        (changed.start < parent.start || changed.due > parent.due)
      ) {
        changed.parentId = "";
        if (changed.id === task.id) patch.parentId = "";
        warnings.push(
          `「${changed.title}」的日期超出了上级计划「${parent.title}」的范围；确认后将解除上级关联，原目标不改动。`,
        );
      }
    }
    const proposedState = {
      ...state,
      tasks: state.tasks
        .map((t) => (t.id === task.id ? updated : t))
        .concat(additions),
    };
    const dates = [...affected].filter(validDate).sort();
    const impact = dates.map((day) => {
      const capOptions = { now };
      return {
        date: day,
        before: capacity(state, day, capOptions),
        after: capacity(proposedState, day, capOptions),
      };
    });
    for (const change of impact)
      if (
        change.after.status === "overload" ||
        change.after.status === "conflict"
      )
        warnings.push(`${change.date}：${change.after.detail}`);
    const titles = {
      defer: "调整日期",
      split: "拆分任务",
      reduce: "缩小范围",
      cancel: "取消剩余任务",
      continue: "安排继续学习",
    };
    return {
      ok: true,
      type,
      taskId: task.id,
      title: titles[type],
      before: clone(task),
      after: clone(updated),
      updates: [{ id: task.id, patch }],
      additions,
      warnings: [...new Set(warnings)],
      impact,
      detail: `${titles[type]}前请核对日期、剩余工作量与相关安排；已记录的学习时间会保留。`,
    };
  }
  function applyAdjustment(state, proposal) {
    if (!proposal?.ok) throw new Error(proposal?.detail || "调整预览无效");
    const current = state.tasks.find((t) => t.id === proposal.taskId);
    if (!current || JSON.stringify(current) !== JSON.stringify(proposal.before))
      throw new Error("任务在预览后发生变化，请重新生成预览。");
    const patches = new Map(proposal.updates.map((u) => [u.id, u.patch]));
    const tasks = state.tasks
      .map((t) =>
        patches.has(t.id) ? { ...t, ...clone(patches.get(t.id)) } : t,
      )
      .concat(clone(proposal.additions));
    const event = {
      id: newId(),
      taskId: proposal.taskId,
      type: proposal.type,
      at: new Date().toISOString(),
      date: localToday(),
      before: clone(current),
      after: clone(tasks.find((t) => t.id === proposal.taskId)),
      addedTaskIds: proposal.additions.map((t) => t.id),
    };
    return {
      ...state,
      tasks,
      adjustmentHistory: [...(state.adjustmentHistory || []), event],
    };
  }
  const api = {
    capacity,
    availableTaskSlots,
    remaining,
    dayConfig,
    timeToMinutes,
    minutesToTime,
    proposeAdjustment,
    applyAdjustment,
  };
  root.StudyPlanning = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

