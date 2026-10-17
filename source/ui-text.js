
/* English presentation helpers. Never translate or mutate stored user content. */
"use strict";
const StudyUI = {
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  scopeNames: { day: 'Task', week: 'Weekly goal', month: 'Monthly goal', year: 'Yearly goal' },
  date(value, year = false) {
    const date = StudyEngine.parseDate(value);
    return date ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }).format(date) : '';
  },
  weekday(value) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(StudyEngine.parseDate(value));
  },
  sessionState(timer) {
    return {running:'In progress', paused:'Paused', review:'Ready to save', ready:'Ready to start'}[timer?.status] || 'Ready to start';
  },
  taskState(task, timer) {
    if (taskDone(task)) return {key:'done',label:'Done',session:false};
    if (timer?.taskId === task.id && ['running','paused','review'].includes(timer.status))
      return {key:timer.status,label:this.sessionState(timer),session:true};
    const saved = {'in-progress':['progress','In progress'],partial:['partial','Partially complete'],paused:['paused','Paused'],cancelled:['cancelled','Cancelled']}[task.status];
    return saved ? {key:saved[0],label:saved[1],session:false} : {key:'todo',label:'To do',session:false};
  },
  minutes(value) { return `${Math.round(Number(value || 0) * 10) / 10} min`; },
  status(task, timer) {
    const status = this.taskState(task, timer);
    if (['done','todo'].includes(status.key)) return `<span class="sr-only task-state" data-state="${status.key}">${status.label}</span>`;
    const glyph = status.key === 'paused' ? 'pause' : status.key === 'review' ? 'review' : 'circle';
    const color = ['running','progress'].includes(status.key) ? 'progress' : status.key === 'review' ? 'review' : 'todo';
    return `<span class="status-tag status-${color} task-state" data-state="${status.key}">${icon(glyph,'small')}${status.label}</span>`;
  },
  capacity(c) {
    const labels = { sufficient: 'Time available', overload: 'Over capacity', conflict: 'Schedule conflict', estimate: 'More details needed' };
    const label = labels[c.status] || 'Capacity estimate';
    let detail = `${Math.round(c.demandMinutes)} min remaining; ${Math.round(c.availableMinutes)} min available within your study budget, with ${c.bufferMinutes} min reserved for breaks and buffer.`;
    if (c.status === 'overload') detail = `${Math.round(c.demandMinutes)} min remaining, ${Math.round(c.availableMinutes)} min available — ${Math.round(c.excessMinutes)} min over capacity.`;
    if (c.status === 'conflict') detail = c.issues?.some(x => x.type === 'activity') ? 'A flexible activity cannot fit entirely inside its time window. Adjust the window or another activity.' : 'The total may fit, but fixed activities, time windows, continuous tasks or breaks prevent a workable schedule.';
    if (c.status === 'estimate') detail = c.missing?.length ? 'Add your waking hours, study budget and available study windows for a reliable check. Unscheduled time is not automatically counted as study time.' : 'No complete arrangement has been confirmed. Narrow the time windows or split a task to refine this estimate.';
    return { label, detail };
  },
  adjustmentWarning(message, proposal) {
    const impact = proposal.impact?.find(item => message === `${item.date}：${item.after.detail}`);
    return impact ? `${this.date(impact.date)}: ${this.capacity(impact.after).detail}` : this.error(message);
  },
  error(message) {
    message = StudyCopy.error(message);
    const errors = {
      '找不到这项任务。': 'This task no longer exists.',
      '这项任务已结束，请先恢复后调整。': 'Reopen this task before adjusting it.',
      '当前时间无效，请刷新后重试。': 'The current time is invalid. Reload and try again.',
      '请选择有效日期。': 'Choose a valid date.',
      '剩余工作量必须大于 0 分钟。': 'Remaining work must be greater than zero.',
      '缩小后的剩余时长需要大于 0 且少于当前剩余时长。': 'Enter a shorter remaining time greater than zero.',
      '此任务未允许拆分。请先在任务详情开启“可以拆分”。': 'Enable multiple study sessions in task details before splitting.',
      '请提供至少两段有效日期与整数分钟数。': 'Provide at least two sessions with valid dates and whole minutes.',
      '不支持的调整方式。': 'This adjustment is not supported.',
      '任务在预览后发生变化，请重新生成预览。': 'The task changed after this preview. Preview it again.',
      '调整预览无效': 'This preview is no longer valid.',
      '存在重复任务编号': 'Duplicate task IDs were found.',
      '任务日期范围不正确': 'The task date range is invalid.',
      '目标层级或日期范围不正确': 'The goal level or date range is invalid.',
      '请填写任务名称': 'Enter a task title.', '请选择有效日期': 'Choose a valid date.',
      '结束日期不能早于开始日期': 'The end date must be on or after the planned date.',
      '请选择计划层级': 'Choose a plan level.', '上级目标不存在': 'The parent goal no longer exists.',
      '上级目标必须属于更大的计划层级': 'Choose a parent goal at a higher plan level.',
      '任务日期需要落在上级目标的日期范围内': 'The task dates must fall within the parent goal dates.',
      '子计划的日期超出了当前目标范围': 'A child plan falls outside these goal dates.',
      '填写有效的剩余用时后查看可用时段。': 'Enter the remaining time to check available windows.',
      '时间资料尚不完整，暂不能确认可用时段。': 'Add your schedule before choosing a confirmed time window.',
      '其他任务或生活安排尚有冲突，请先调整后再选择时间。': 'Resolve other task or activity conflicts before choosing a time.',
      '请同时确认学习范围已缩小；单独改短时长并不会自动减少实际工作。': 'Confirm that you are reducing the scope too. A shorter estimate alone does not reduce the work.',
      '既有计时记录保留在原任务；新分段不会复制已记录的学习时间。': 'Existing time stays with the original task. New sessions do not duplicate recorded time.',
      '子计划层级需要小于当前目标': 'Child plans must be at a lower plan level.'
      ,'新层级不能小于或等于已有子任务层级': 'The plan level must be above its existing child plans.'
      ,'新的日期范围需要覆盖已有子任务': 'These dates must include all existing child plans.'
    };
    if (errors[message]) return errors[message];
    const rules = [
      [/^扣除其他任务后，学习预算还剩 (.+) 分钟，少于本次所需 (.+) 分钟。$/, (_, left, needed) => `${left} min of your study budget remains; this task needs ${needed} min.`],
      [/^扣除其他任务与缓冲后，没有可连续安排 (.+) 分钟的时段。$/, (_, min) => `No continuous ${min} min window remains after other tasks and buffer.`],
      [/^「(.+)」安排到 (.+)，超过截止日期 (.+)。$/, (_, title, date, deadline) => `“${title}” moves to ${date}, after its ${deadline} deadline.`],
      [/^「(.+)」的日期超出了上级计划「(.+)」的范围；确认后将解除上级关联，原目标不改动。$/, (_, title, parent) => `“${title}” falls outside “${parent}”. Confirming removes the parent link; the goal stays unchanged.`],
      [/^各段分钟数之和必须等于剩余工作量 (.+) 分钟。$/, (_, min) => `Session minutes must add up to the ${min} min remaining.`]
    ];
    for (const [pattern, replacement] of rules) if (pattern.test(message)) return message.replace(pattern, replacement);
    return message;
  }
};

