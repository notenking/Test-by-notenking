
/* Website blocking controls. Drafts remain useful in the ordinary web version. */
(function (root) {
  'use strict';
  const DAYS = [StudyCopy.text("blocker_ui.sun_6c6761"), StudyCopy.text("blocker_ui.mon_26adb7"), StudyCopy.text("blocker_ui.tue_81c541"), StudyCopy.text("blocker_ui.wed_1e96d0"), StudyCopy.text("blocker_ui.thu_46f6e7"), StudyCopy.text("blocker_ui.fri_cbdb1a"), StudyCopy.text("blocker_ui.sat_4b3ce1")];
  const PRESETS = [
    { id: 'video', name: StudyCopy.text("blocker_ui.video_a02ac7"), description: StudyCopy.text("blocker_ui.youtube_bilibili_douyin_cea3e0"), domains: ['youtube.com', 'bilibili.com', 'douyin.com'] },
    { id: 'social', name: StudyCopy.text("blocker_ui.social_1c23d0"), description: StudyCopy.text("blocker_ui.weibo_xiaohongshu_x_instagram_1ac2e2"), domains: ['weibo.com', 'xiaohongshu.com', 'x.com', 'instagram.com'] },
    { id: 'community', name: StudyCopy.text("blocker_ui.community_98df16"), description: StudyCopy.text("blocker_ui.reddit_zhihu_tieba_3d58dc"), domains: ['reddit.com', 'zhihu.com', 'tieba.baidu.com'] },
  ];
  let notice = '', noticeIsError = false, busy = false, editingId = '', deletingId = '', selectedMinutes = 50, lastQuery = 0;
  const schedules = () => Array.isArray(state.blocking.schedules) ? state.blocking.schedules : [];
  const action = (label, name, extra = '', kind = '') => btn(label, 'blocker-' + name, 'type="button" ' + extra, kind);
  const id = () => 'schedule-' + (root.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const noteMarkup = () => `<div id="blocker-notice" class="blocker-notice ${noticeIsError ? 'is-error' : ''}" role="${noticeIsError ? 'alert' : 'status'}" ${notice ? '' : 'hidden'}>${esc(notice)}</div>`;
  const QUICK_SITES = [
    ['YouTube', 'youtube.com'], [StudyCopy.text("blocker_ui.bilibili_654039"), 'bilibili.com'], [StudyCopy.text("blocker_ui.douyin_e5f83c"), 'douyin.com'],
    [StudyCopy.text("blocker_ui.xiaohongshu_652cf5"), 'xiaohongshu.com'], ['Instagram', 'instagram.com'], ['Reddit', 'reddit.com'],
  ];
  let viewDraft = null;
  const clearedForms = new Set();
  function formKey(form) {
    return form.dataset.blockerForm + ':' + (form.dataset.kind || form.querySelector('[name="scheduleId"]')?.value || '');
  }
  function captureView() {
    const page = document.querySelector('.blocker-page'); if (!page) return;
    viewDraft = {
      details: [...page.querySelectorAll('details[id]')].map(el => [el.id, el.open]),
      search: page.querySelector('#blocker-search')?.value || '',
      forms: [...page.querySelectorAll('form[data-blocker-form]')].filter(form => !clearedForms.has(formKey(form))).map(form => ({
        key: formKey(form), values: [...form.elements].filter(el => el.name).map(el => ({ name: el.name, value: el.value, checked: el.checked, type: el.type })),
      })),
    };
    clearedForms.clear();
  }
  function restoreView() {
    const page = document.querySelector('.blocker-page'); if (!page || !viewDraft) return;
    for (const [id, open] of viewDraft.details) { const el = page.querySelector('#' + id); if (el) el.open = open; }
    for (const saved of viewDraft.forms) {
      const form = [...page.querySelectorAll('form[data-blocker-form]')].find(form => formKey(form) === saved.key); if (!form) continue;
      for (const value of saved.values) {
        const fields = [...form.elements].filter(el => el.name === value.name);
        if (value.type === 'checkbox' || value.type === 'radio') { const el = fields.find(el => el.value === value.value); if (el) el.checked = value.checked; }
        else if (fields[0]) fields[0].value = value.value;
      }
    }
    const search = page.querySelector('#blocker-search'); if (search) { search.value = viewDraft.search; filterRules(search.value); }
    if (editingId) for (const id of ['blocker-advanced', 'blocker-schedules', 'blocker-schedule-editor']) { const detail = document.getElementById(id); if (detail) detail.open = true; }
    viewDraft = null;
  }
  function filterRules(value) {
    const q = String(value || '').trim().toLowerCase(); let count = 0;
    document.querySelectorAll('#blocker-domains-list [data-blocker-domain]').forEach(row => { row.hidden = !row.dataset.blockerDomain.includes(q); if (!row.hidden) count++; });
    const empty = document.getElementById('blocker-search-empty'); if (empty) empty.hidden = count > 0 || !state.blocking.domains.length;
  }
  function activeSources() { return blockStatus.sources || (blockStatus.blocking ? [blockStatus] : []); }
  function manualSource() { return isExt && activeSources().find(source => source.mode === 'manual' && source.until > Date.now()); }
  function manualAction() {
    if (!isExt) return '';
    const manual = manualSource(), others = activeSources().some(source => source.mode !== 'manual');
    return manual
      ? StudyCopy.format("blocker_ui.restart_with_this_duration_f6157f", [others ? StudyCopy.text("blocker_ui.the_top_button_stops_manual_5b0412") : StudyCopy.text("blocker_ui.you_can_stop_manual_blocking_76ab6b")])
      : StudyCopy.format("blocker_ui.start_blocking_d89ecf", [others ? StudyCopy.text("blocker_ui.start_a_manual_session_existing_e60265") : StudyCopy.text("blocker_ui.ends_automatically_when_time_is_c3fc3d")]);
  }
  function configurationSummary() {
    if (!isExt) return '';
    const applied = blockStatus.schedules || [], enabled = applied.filter(s => s.enabled).length;
    const missing = applied.filter(s => !schedules().some(local => local.id === s.id)).length;
    if (!enabled && !missing) return '';
    return `<p>${enabled ? StudyCopy.format("blocker_ui.weekly_schedules_applied_7798cb", [enabled]) : StudyCopy.text("blocker_ui.the_extension_has_saved_schedules_94da77")}${missing ? StudyCopy.format("blocker_ui.schedules_are_not_in_local_78bdd2", [missing]) : ''} ${action(StudyCopy.text("blocker_ui.view_schedules_012abb"), 'open-advanced', 'data-section="blocker-schedules"', 'small link')}</p>`;
  }
  function setNotice(message, isError = false) {
    message = StudyUI.error(message);
    notice = message; noticeIsError = isError;
    const el = document.getElementById('blocker-notice');
    if (el) { el.textContent = message; el.hidden = !message; el.classList.toggle('is-error', isError); el.setAttribute('role', isError ? 'alert' : 'status'); }
  }
  function inline(form, message, error = false) {
    message = StudyUI.error(message);
    const el = form?.querySelector('[data-blocker-feedback]');
    if (el) { el.textContent = message; el.hidden = !message; el.classList.toggle('is-error', error); el.setAttribute('role', error ? 'alert' : 'status'); }
    else setNotice(message, error);
  }
  function mutate(fn) {
    const next = structuredClone(state);
    next.blocking = { ...next.blocking, schedules: Array.isArray(next.blocking.schedules) ? next.blocking.schedules : [] };
    fn(next.blocking);
    commitState(next);
  }
  function listsValid(domains, allow, requireDomain = false) {
    if (domains.length > 40 || allow.length > 40) throw Error(StudyCopy.text("blocker_ui.each_list_supports_up_to_1b085f"));
    if (!domains.length) {
      if (requireDomain) throw Error(StudyCopy.text("blocker_ui.add_at_least_one_website_70e910"));
      if (allow.some(d => !StudyBlockRules.host(d))) throw Error(StudyCopy.text("blocker_ui.the_allowed_list_contains_an_7ada5c"));
      return { domains, allow };
    }
    return StudyBlockRules.sanitize(domains, allow);
  }
  function parseDomains(value, kind) {
    const tokens = String(value).split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean);
    if (!tokens.length) throw Error(StudyCopy.text("blocker_ui.enter_at_least_one_domain_9ab1e5"));
    const invalid = [], valid = [];
    for (const token of tokens) {
      const domain = kind === 'domains' ? StudyBlockRules.canonical(token) : StudyBlockRules.host(token);
      if (!domain) invalid.push(token); else valid.push(domain);
    }
    if (invalid.length) throw Error(StudyCopy.text("blocker_ui.nothing_added_correct_these_invalid_da405b") + invalid.slice(0, 4).join('、'));
    return [...new Set(valid)];
  }
  async function send(message) {
    const result = await extMessage(message);
    if (!result?.ok) throw Error(result?.error || StudyCopy.text("blocker_ui.the_extension_did_not_respond_cb30f4"));
    if (typeof result.blocking === 'boolean') blockStatus = result;
    return result;
  }
  async function refresh() {
    if (!isExt || demo) return;
    await send({ type: 'STATUS' });
    lastQuery = Date.now(); paintStatus();
  }
  async function syncLists() {
    if (!isExt || demo) return;
    const current = await send({ type: 'STATUS' });
    if (state.blocking.domains.length && (current.sources?.length || current.schedules?.length || current.blocking)) {
      await send({ type: 'UPDATE_LISTS', domains: state.blocking.domains, allow: state.blocking.allow });
    }
    await refresh();
  }
  async function applyScheduleChange(scheduleId, remove = false) {
    if (!isExt || demo) return;
    const current = await send({ type: 'STATUS' });
    const applied = (current.schedules || []).filter(s => s.id !== scheduleId);
    const changed = schedules().find(s => s.id === scheduleId);
    if (!remove && changed) applied.push(changed);
    await send({ type: 'SET_SCHEDULES', schedules: applied, domains: state.blocking.domains, allow: state.blocking.allow });
    await refresh();
  }
  async function applySchedules() {
    if (!isExt || demo) return;
    listsValid(state.blocking.domains, state.blocking.allow, schedules().some(s => s.enabled));
    const current = await send({ type: 'STATUS' });
    const applied = [...(current.schedules || []).filter(s => !schedules().some(local => local.id === s.id)), ...schedules()];
    await send({ type: 'SET_SCHEDULES', schedules: applied, domains: state.blocking.domains, allow: state.blocking.allow });
    await refresh();
  }
  function sourceLabel(s) { return s.mode === 'timer' ? StudyCopy.text("blocker_ui.current_focus_ef87e7") : s.mode === 'manual' ? StudyCopy.text("blocker_ui.manual_blocking_b2f01a") : (s.name || StudyCopy.text("blocker_ui.scheduled_blocking_06b148")); }
  function remaining(until) { return Math.max(0, Math.ceil((Number(until || 0) - Date.now()) / 60000)); }
  function statusText() {
    if (demo) return 'Demo mode';
    if (!isExt) return 'Rule draft';
    if (blockStatus.error) return 'Needs attention';
    return blockStatus.blocking ? 'Blocking active' : 'Not blocking';
  }
  function listSignature(lists) {
    return JSON.stringify({ domains: [...(lists.domains || [])].sort(), allow: [...(lists.allow || [])].sort() });
  }
  function listMismatchMarkup() {
    if (!isExt) return '';
    const registered = [...(blockStatus.sources || [])];
    if (blockStatus.schedules?.length) registered.push({ name: StudyCopy.text("blocker_ui.shared_weekly_schedule_list_39ce63"), mode: 'schedule', domains: blockStatus.scheduleDomains || [], allow: blockStatus.scheduleAllow || [] });
    if (!registered.some(item => listSignature(item) !== listSignature(state.blocking))) return '';
    return StudyCopy.format("blocker_ui.extension_lists_differ_from_local_851ecd", [registered.map(item => StudyCopy.format("blocker_ui.blocked_allowed_925c1f", [esc(sourceLabel(item)), esc((item.domains || []).join('、') || StudyCopy.text("blocker_ui.none_44cde2")), esc((item.allow || []).join('、') || StudyCopy.text("blocker_ui.none_44cde2"))])).join(''), action(StudyCopy.text("blocker_ui.apply_local_lists_d2d84b"), 'apply-lists', '', 'small')]);
  }
  function liveStatus() {
    if (demo) return StudyCopy.text("blocker_ui.demo_mode_does_not_activate_efff99");
    if (!isExt) return StudyCopy.text("blocker_ui.a_web_page_cannot_block_e2bef2");
    const sources = [...activeSources()].sort((a, b) => Number(b.mode === 'manual') - Number(a.mode === 'manual'));
    return `${blockStatus.error ? `<div class="blocker-error" role="alert">${esc(StudyUI.error(blockStatus.error))} ${action(StudyCopy.text("blocker_ui.check_again_78ce04"), 'check', '', 'small link')}${action(StudyCopy.text("blocker_ui.repair_rules_431d7b"), 'repair', '', 'small')}</div>` : ''}${sources.length ? `<div class="blocker-sources">${sources.map(source => StudyCopy.format("blocker_ui.remaining_min_eb5175", [esc(sourceLabel(source)), remaining(source.until), source.mode === 'schedule' ? action(StudyCopy.text("blocker_ui.skip_this_occurrence_b25a05"), 'skip', `data-id="${esc(source.scheduleId || source.id)}"`, 'small link') : source.mode === 'manual' ? action(StudyCopy.text("blocker_ui.stop_manual_blocking_5a41d7"), 'stop', '', 'primary small') : btn(StudyCopy.text("blocker_ui.view_focus_e547a3"), 'nav', 'data-screen="focus"', 'small link')])).join('')}</div>` : !blockStatus.error ? StudyCopy.text("blocker_ui.choose_websites_and_a_duration_255e8e") : ''}${listMismatchMarkup()}`;
  }
  function ruleList(kind) {
    const entries = state.blocking[kind] || [];
    return `<div class="blocker-rule-list" id="blocker-${kind}-list">${entries.length ? entries.map(domain => StudyCopy.format("blocker_ui.message_01bae0", [esc(domain), esc(domain), kind, esc(domain), kind === 'allow' ? StudyCopy.text("blocker_ui.allowed_websites_7ece68") : StudyCopy.text("blocker_ui.blocked_websites_2b903f"), esc(domain), icon('close', 'small')])).join('') : StudyCopy.text("blocker_ui.no_websites_selected_246a34")}</div>`;
  }
  function addForm(kind) {
    return StudyCopy.format("blocker_ui.add_9ae92e", [kind, kind, kind === 'allow' ? StudyCopy.text("blocker_ui.add_a_study_subdomain_ecd5ae") : StudyCopy.text("blocker_ui.add_another_website_f3a5bf"), kind, kind === 'allow' ? StudyCopy.text("blocker_ui.e_g_study_example_com_4178ff") : StudyCopy.text("blocker_ui.paste_domains_or_urls_separated_78e450"), kind === 'allow' ? StudyCopy.text("blocker_ui.allowed_websites_2ec3a6") : '']);
  }
  function scheduleForm() {
    const item = schedules().find(s => s.id === editingId);
    const days = item?.days || [1, 2, 3, 4, 5];
    return StudyCopy.format("blocker_ui.name_repeat_on_start_time_9258a2", [item ? 'open' : '', item ? StudyCopy.text("blocker_ui.edit_schedule_26fca4") : StudyCopy.text("blocker_ui.add_schedule_4c53e8"), icon('plus', 'small'), esc(item?.id || ''), esc(item?.name || ''), [1, 2, 3, 4, 5, 6, 0].map(day => StudyCopy.format("blocker_ui.message_a8b8d0", [day, days.includes(day) ? 'checked' : '', DAYS[day]])).join(''), esc(item?.start || '19:00'), esc(item?.end || '20:30'), item?.enabled !== false ? 'checked' : '', isExt ? '' : StudyCopy.text("blocker_ui.apply_after_installing_the_extension_cfef28"), isExt ? StudyCopy.text("blocker_ui.save_and_apply_7b8e7a") : StudyCopy.text("blocker_ui.save_schedule_draft_d9c53c"), item ? action(StudyCopy.text("blocker_ui.cancel_editing_bef475"), 'cancel-edit', '', 'link') : '', isExt ? StudyCopy.text("blocker_ui.saving_an_enabled_schedule_starts_5b0675") : '']);
  }
  function scheduleSignature(s) {
    return JSON.stringify({ id: s.id, name: s.name || '', days: [...(s.days || [])].sort(), start: s.start, end: s.end, enabled: Boolean(s.enabled) });
  }
  function scheduleAppliedText(s) {
    if (!isExt) return StudyCopy.text("blocker_ui.draft_c17117");
    const applied = (blockStatus.schedules || []).find(a => a.id === s.id);
    if (!applied || scheduleSignature(applied) !== scheduleSignature(s)) return StudyCopy.text("blocker_ui.draft_not_applied_4a32d5");
    return s.enabled ? StudyCopy.text("blocker_ui.applied_704298") : StudyCopy.text("blocker_ui.disabled_3a582c");
  }
  function externalSchedules() {
    if (!isExt) return '';
    const missing = (blockStatus.schedules || []).filter(s => !schedules().some(local => local.id === s.id));
    if (!missing.length) return '';
    return StudyCopy.format("blocker_ui.other_extension_schedules_these_schedules_79b27a", [missing.map(s => `<article class="blocker-schedule"><div><h3>${esc(s.name || StudyCopy.text("blocker_ui.scheduled_blocking_06b148"))}</h3><span class="blocker-schedule-time">${esc(s.start)}—${esc(s.end)}${s.end < s.start ? StudyCopy.text("blocker_ui.next_day_73024d") : ''}</span><p class="tiny">${(s.days || []).map(d => StudyCopy.text("blocker_ui.message_dd29ec") + DAYS[d]).join(' · ')} · ${s.enabled ? StudyCopy.text("blocker_ui.applied_in_extension_eb9a30") : StudyCopy.text("blocker_ui.disabled_in_extension_9ef0fb")}</p></div><div class="row wrap">${action(StudyCopy.text("blocker_ui.load_to_edit_f2df67"), 'load-schedule', `data-id="${esc(s.id)}"`, 'small')}${s.enabled ? action(StudyCopy.text("blocker_ui.disable_schedule_0587aa"), 'disable-external', `data-id="${esc(s.id)}"`, 'small link') : ''}</div></article>`).join('')]);
  }
  function scheduleList() {
    return `<div class="blocker-schedule-list">${schedules().map(s => StudyCopy.format("blocker_ui.message_91eb6f", [esc(s.name || StudyCopy.text("blocker_ui.scheduled_blocking_06b148")), esc(s.start), esc(s.end), s.end < s.start ? StudyCopy.text("blocker_ui.next_day_73024d") : '', s.enabled ? 'on' : '', s.enabled ? StudyCopy.text("blocker_ui.disable_853dbb") : StudyCopy.text("blocker_ui.enable_d7f85e"), esc(s.name || StudyCopy.text("blocker_ui.scheduled_blocking_06b148")), Boolean(s.enabled), esc(s.id), (s.days || []).map(d => StudyCopy.text("blocker_ui.message_dd29ec") + DAYS[d]).join(' · '), esc(s.id), scheduleAppliedText(s), action(StudyCopy.text("blocker_ui.edit_c88ae9"), 'edit-schedule', `data-id="${esc(s.id)}"`, 'small link'), action(StudyCopy.text("blocker_ui.delete_0bf113"), 'delete-schedule', `data-id="${esc(s.id)}"`, 'small link'), deletingId === s.id ? StudyCopy.format("blocker_ui.delete_this_schedule_recorded_study_cdce18", [action(StudyCopy.text("blocker_ui.delete_schedule_0fc756"), 'confirm-delete', `data-id="${esc(s.id)}"`, 'small'), action(StudyCopy.text("blocker_ui.keep_55777a"), 'cancel-delete', '', 'small link')]) : ''])).join('') || StudyCopy.text("blocker_ui.no_schedules_yet_7095df")}</div>`;
  }
  function page() {
    captureView();
    const scheduleCount = new Set([...schedules(), ...(blockStatus.schedules || [])].map(s => s.id)).size;
    return StudyCopy.format("blocker_ui.website_blocking_help_choose_websites_9c69a6", [icon('arrow', 'small'), icon('shield', 'small'), statusText(), !isExt ? StudyCopy.text("blocker_ui.install_extension_12f228") : '', liveStatus(), configurationSummary(), noteMarkup(), !isExt ? 'is-web' : '', isExt ? '<span class="blocker-step-number">1</span>' : '', state.blocking.domains.length, QUICK_SITES.map(([name, domain]) => { const selected = state.blocking.domains.includes(domain); return `<button class="blocker-site-choice ${selected ? 'selected' : ''}" type="button" data-action="${selected ? 'blocker-remove' : 'blocker-quick'}" data-kind="domains" data-domain="${domain}" aria-pressed="${selected}"><span>${name}</span>${icon(selected ? 'check' : 'plus', 'small')}</button>`; }).join(''), !isExt ? StudyCopy.text("blocker_ui.local_draft_70fb30") : '', ruleList('domains'), addForm('domains'), PRESETS.map(preset => `<button class="blocker-preset" type="button" data-action="blocker-preset" data-id="${preset.id}"><span><strong>${preset.name}</strong><small>${preset.description}</small></span><span>${preset.domains.every(domain => state.blocking.domains.includes(domain)) ? StudyCopy.text("blocker_ui.added_0aaf38") : StudyCopy.text("blocker_ui.add_c2be75")}</span></button>`).join(''), icon('search', 'small'), isExt && activeSources().length ? StudyCopy.text("blocker_ui.changes_also_update_rules_that_48bcd4") : '', isExt ? StudyCopy.format("blocker_ui.choose_duration_custom_duration_minutes_d22f4e", [[25, 50, 90].map(minutes => action(minutes + StudyCopy.text("blocker_ui.min_592fb9"), 'minutes', `data-minutes="${minutes}" aria-pressed="${Number(selectedMinutes) === minutes}"`, Number(selectedMinutes) === minutes ? 'selected' : '')).join(''), esc(selectedMinutes), manualAction()]) : '', icon('right', 'small'), !isExt ? StudyCopy.text("blocker_ui.this_page_only_saves_the_91bae1") : '', state.blocking.enabled ? 'on' : '', state.blocking.enabled, scheduleCount, !isExt ? StudyCopy.text("blocker_ui.the_web_version_saves_drafts_02d7f6") : '', scheduleList(), externalSchedules(), scheduleForm(), isExt && schedules().length ? action(StudyCopy.text("blocker_ui.apply_local_schedules_e3f0fe"), 'apply-schedules', '', 'small') + StudyCopy.text("blocker_ui.applies_enabled_local_drafts_and_39f030") : '', state.blocking.allow.length, ruleList('allow'), addForm('allow'), isExt ? `<div class="row wrap">${action(StudyCopy.text("blocker_ui.check_extension_status_3b6b02"), 'check', '', 'small link')}${action(StudyCopy.text("blocker_ui.reapply_current_rules_8b2bc1"), 'repair', '', 'small link')}</div>` : '', btn(StudyCopy.text("blocker_ui.export_full_backup_0d5c48"), 'export-data', '', 'small link')]);
  }
  function summary(compact = false) {
    return `<section class="card blocker-summary" id="${compact ? 'focus-blocking-help' : 'blocking-settings'}"><div class="between"><h2>Website blocking</h2>${icon('shield', 'small')}</div><p><strong data-blocker-status>${statusText()}</strong><span class="tiny"> · ${state.blocking.domains.length} websites</span></p><p class="tiny">${isExt ? state.blocking.enabled ? 'Starts with your focus session.' : 'Start manually or set a weekly schedule.' : 'Rules work after you install the browser extension.'}</p><div class="row wrap">${btn('Manage blocking', 'nav', 'type="button" data-screen="blocking"', 'small')}${!isExt ? '<button class="btn small link" type="button" data-action="guide-go" data-destination="blocking">Install extension</button>' : ''}</div></section>`;
  }
  function paintStatus() {
    document.querySelectorAll('[data-blocker-status]').forEach(el => { el.textContent = statusText(); });
    const el = document.getElementById('blocker-live-status');
    if (el) { const markup = liveStatus(), expanded = Boolean(el.querySelector('.blocker-list-mismatch')?.open); if (el.innerHTML !== markup) el.innerHTML = markup; const details = el.querySelector('.blocker-list-mismatch'); if (details && expanded) details.open = true; }
    const controls = document.getElementById('blocker-manual-action'); if (controls) { const markup = manualAction(); if (controls.innerHTML !== markup) controls.innerHTML = markup; }
    const configuration = document.getElementById('blocker-configuration-summary'); if (configuration) { const markup = configurationSummary(); if (configuration.innerHTML !== markup) configuration.innerHTML = markup; }
    const external = document.getElementById('blocker-external-schedules'); if (external) { const markup = externalSchedules(); if (external.innerHTML !== markup) external.innerHTML = markup; }
    document.querySelectorAll('[data-blocker-schedule-count]').forEach(el => { el.textContent = new Set([...schedules(), ...(blockStatus.schedules || [])].map(s => s.id)).size.toString(); });
    document.querySelectorAll('[data-blocker-schedule-state]').forEach(el => { const item = schedules().find(s => s.id === el.dataset.blockerScheduleState); if (item) el.textContent = scheduleAppliedText(item); });
  }
  function onRender() {
    restoreView(); paintStatus();
    if (isExt && !demo && Date.now() - lastQuery > 5000) refresh().catch(e => { blockStatus = { blocking: false, error: e.message }; paintStatus(); });
  }
  function cleanTime(value) {
    const raw = String(value || '').trim(), match = /^(\d{1,2}):?(\d{2})$/.exec(raw);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw Error(StudyCopy.text("blocker_ui.enter_a_time_as_hh_ab1e4c"));
    return match[1].padStart(2, '0') + ':' + match[2];
  }
  async function saveAdded(form, kind, input) {
    const additions = parseDomains(input, kind), previous = state.blocking[kind];
    const domains = [...new Set([...previous, ...additions])];
    const lists = listsValid(kind === 'domains' ? domains : state.blocking.domains, kind === 'allow' ? domains : state.blocking.allow);
    mutate(b => Object.assign(b, lists));
    const count = domains.length - previous.length;
    try { await syncLists(); setNotice(count ? StudyCopy.format("blocker_ui.added_websites_d3dac6", [count, isExt ? StudyCopy.text("blocker_ui.active_rules_updated_902b75") : StudyCopy.text("blocker_ui.draft_saved_842ac8")]) : StudyCopy.text("blocker_ui.these_websites_are_already_in_874173")); }
    catch (e) { setNotice(StudyCopy.text("blocker_ui.list_saved_locally_but_extension_b1e80f") + e.message, true); }
    if (form) clearedForms.add(formKey(form));
    render();
  }
  document.addEventListener('input', event => {
    if (event.target.id === 'blocker-search') filterRules(event.target.value);
    if (event.target.id === 'blocker-manual-minutes') {
      selectedMinutes = event.target.value;
      document.querySelectorAll('[data-action="blocker-minutes"]').forEach(button => { const selected = Number(button.dataset.minutes) === Number(selectedMinutes); button.setAttribute('aria-pressed', String(selected)); button.classList.toggle('selected', selected); });
    }
  });
  document.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-blocker-form]'); if (!form) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (busy) return;
    busy = true; const buttons = [...form.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
    try {
      const data = new FormData(form), type = form.dataset.blockerForm;
      if (type === 'list') await saveAdded(form, form.dataset.kind, data.get('domains'));
      if (type === 'start') {
        if (!isExt) { inline(form, StudyCopy.text("blocker_ui.this_page_cannot_block_other_e4874e")); go('guide'); requestAnimationFrame(() => document.getElementById('guide-blocking')?.scrollIntoView({ block: 'start' })); return; }
        if (demo) throw Error(StudyCopy.text("blocker_ui.demo_mode_does_not_activate_479c9a"));
        const minutes = Number(data.get('minutes'));
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw Error(StudyCopy.text("blocker_ui.enter_a_whole_number_between_1a3d9d"));
        const lists = listsValid(state.blocking.domains, state.blocking.allow, true);
        const result = await send({ type: 'START', mode: 'manual', until: Date.now() + minutes * 60000, ...lists });
        if (!result.blocking || result.verified === false) throw Error(result.error || StudyCopy.text("blocker_ui.browser_rules_have_not_passed_d2e7ed"));
        selectedMinutes = minutes; setNotice(StudyCopy.format("blocker_ui.manual_blocking_started_ends_in_8d6017", [minutes])); render();
      }
      if (type === 'check') {
        const result = StudyBlockRules.preview(String(data.get('url') || ''), state.blocking.domains, state.blocking.allow);
        if (result.error) throw Error(result.error);
        inline(form, `${result.host}: ${result.allowed ? StudyCopy.text("blocker_ui.allowed_by_the_allowed_list_23310c") : result.blocked ? StudyCopy.text("blocker_ui.matches_the_block_list_5bd02a") : StudyCopy.text("blocker_ui.no_block_list_match_89bed6")}. ${StudyUI.error(result.reason || '')}${isExt ? StudyCopy.text("blocker_ui.this_is_a_list_match_3b26fd") : StudyCopy.text("blocker_ui.this_page_checks_drafts_only_d29daa")}`);
      }
      if (type === 'schedule') {
        const scheduleId = String(data.get('scheduleId') || ''), days = data.getAll('days').map(Number);
        if (!days.length) throw Error(StudyCopy.text("blocker_ui.choose_at_least_one_day_bd5a3b"));
        const start = cleanTime(data.get('start')), end = cleanTime(data.get('end'));
        if (start === end) throw Error(StudyCopy.text("blocker_ui.start_and_end_times_must_325d96"));
        if (!scheduleId && schedules().length >= 20) throw Error(StudyCopy.text("blocker_ui.you_can_save_up_to_0417cd"));
        const enabled = data.get('enabled') === 'on';
        listsValid(state.blocking.domains, state.blocking.allow, enabled);
        const schedule = { id: scheduleId || id(), name: String(data.get('name') || '').trim().slice(0, 40) || StudyCopy.text("blocker_ui.scheduled_blocking_06b148"), days, start, end, enabled };
        mutate(b => { const i = b.schedules.findIndex(s => s.id === schedule.id); if (i >= 0) b.schedules[i] = schedule; else b.schedules.push(schedule); });
        try { await applyScheduleChange(schedule.id); setNotice(isExt ? StudyCopy.text("blocker_ui.schedule_saved_and_applied_e6c825") : StudyCopy.text("blocker_ui.schedule_draft_saved_the_web_7349d7")); }
        catch (e) { setNotice(StudyCopy.text("blocker_ui.schedule_saved_locally_but_not_a6da37") + e.message, true); }
        clearedForms.add(formKey(form)); editingId = ''; render();
      }
    } catch (e) { inline(form, e.message || StudyCopy.text("blocker_ui.the_action_could_not_be_b132de"), true); }
    finally { busy = false; buttons.forEach(b => b.disabled = false); }
  }, true);
  document.addEventListener('click', async event => {
    const control = event.target.closest('[data-action^="blocker-"]'); if (!control) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (busy) return;
    busy = true;
    try {
      const name = control.dataset.action.slice(8), key = control.dataset.id;
      if (name === 'open-advanced') {
        const advanced = document.getElementById('blocker-advanced'), section = document.getElementById(control.dataset.section || 'blocker-schedules');
        if (advanced) advanced.open = true; if (section) { section.open = true; section.scrollIntoView({ block: 'nearest' }); section.querySelector('summary')?.focus(); }
      } else if (name === 'quick') {
        const site = QUICK_SITES.find(([, domain]) => domain === control.dataset.domain); if (site) await saveAdded(null, 'domains', site[1]);
      } else if (name === 'minutes') {
        selectedMinutes = Number(control.dataset.minutes); const input = document.getElementById('blocker-manual-minutes'); if (input) input.value = selectedMinutes;
        document.querySelectorAll('[data-action="blocker-minutes"]').forEach(b => { const selected = Number(b.dataset.minutes) === selectedMinutes; b.setAttribute('aria-pressed', String(selected)); b.classList.toggle('selected', selected); });
      } else if (name === 'preset') {
        const preset = PRESETS.find(p => p.id === key); if (preset) await saveAdded(null, 'domains', preset.domains.join('\n'));
      } else if (name === 'remove') {
        const kind = control.dataset.kind; if (!['domains', 'allow'].includes(kind)) return;
        const values = state.blocking[kind].filter(d => d !== control.dataset.domain);
        if (kind === 'domains' && !values.length && isExt) { await refresh(); if (blockStatus.blocking) throw Error(StudyCopy.text("blocker_ui.stop_active_blocking_before_removing_df9613")); if (blockStatus.schedules?.length) throw Error(StudyCopy.text("blocker_ui.the_extension_still_has_schedules_1f8e25")); }
        const lists = listsValid(kind === 'domains' ? values : state.blocking.domains, kind === 'allow' ? values : state.blocking.allow);
        mutate(b => Object.assign(b, lists));
        try { await syncLists(); setNotice(StudyCopy.text("blocker_ui.website_removed_f341f0")); } catch (e) { setNotice(StudyCopy.text("blocker_ui.removed_locally_but_extension_rules_ac0ccd") + e.message, true); }
        render();
      } else if (name === 'apply-lists') {
        listsValid(state.blocking.domains, state.blocking.allow, true); await syncLists(); setNotice(StudyCopy.text("blocker_ui.local_lists_applied_to_existing_109bc8")); paintStatus();
      } else if (name === 'auto') {
        if (!state.blocking.enabled) listsValid(state.blocking.domains, state.blocking.allow, true);
        mutate(b => { b.enabled = !b.enabled; });
        if (isExt) await syncBlocking();
        setNotice(state.blocking.enabled ? isExt ? StudyCopy.text("blocker_ui.blocking_will_start_with_focus_86880d") : StudyCopy.text("blocker_ui.preference_saved_install_the_extension_82ced4") : StudyCopy.text("blocker_ui.automatic_focus_blocking_is_off_a195f6")); render();
      } else if (name === 'stop') { await send({ type: 'STOP', mode: 'manual' }); setNotice(StudyCopy.text("blocker_ui.manual_blocking_stopped_other_active_dd6b94")); render(); }
      else if (name === 'skip') { await send({ type: 'SKIP_SCHEDULE', id: key }); setNotice(StudyCopy.text("blocker_ui.this_occurrence_was_skipped_future_75d27b")); render(); }
      else if (name === 'check') { await refresh(); setNotice(blockStatus.error || StudyCopy.text("blocker_ui.status_check_complete_b608e8"), Boolean(blockStatus.error)); }
      else if (name === 'repair') { await send({ type: 'REPAIR' }); setNotice(StudyCopy.text("blocker_ui.current_rules_reapplied_8ce47e")); render(); }
      else if (name === 'load-schedule') {
        const external = (blockStatus.schedules || []).find(s => s.id === key);
        if (!external) throw Error(StudyCopy.text("blocker_ui.this_extension_schedule_no_longer_adb95f"));
        if (schedules().length >= 20) throw Error(StudyCopy.text("blocker_ui.you_already_have_local_schedule_59dabd"));
        mutate(b => { if (!b.schedules.some(s => s.id === key)) b.schedules.push(structuredClone(external)); });
        editingId = key; setNotice(StudyCopy.text("blocker_ui.extension_schedule_loaded_locally_you_1f64b0")); render(); document.querySelector('#blocker-schedule-editor [name="name"]')?.focus();
      }
      else if (name === 'disable-external') {
        const current = await send({ type: 'STATUS' });
        const applied = (current.schedules || []).map(s => s.id === key ? { ...s, enabled: false } : s);
        await send({ type: 'SET_SCHEDULES', schedules: applied, domains: current.scheduleDomains || state.blocking.domains, allow: current.scheduleAllow || state.blocking.allow });
        setNotice(StudyCopy.text("blocker_ui.extension_schedule_disabled_local_drafts_6dc495")); paintStatus();
      }
      else if (name === 'edit-schedule') { editingId = key; deletingId = ''; render(); document.querySelector('#blocker-schedule-editor [name="name"]')?.focus(); }
      else if (name === 'cancel-edit') { editingId = ''; render(); }
      else if (name === 'delete-schedule') { deletingId = key; render(); }
      else if (name === 'cancel-delete') { deletingId = ''; render(); }
      else if (name === 'confirm-delete' || name === 'schedule-toggle') {
        if (name === 'schedule-toggle' && !schedules().find(s => s.id === key)?.enabled) listsValid(state.blocking.domains, state.blocking.allow, true);
        mutate(b => { if (name === 'confirm-delete') b.schedules = b.schedules.filter(s => s.id !== key); else { const s = b.schedules.find(s => s.id === key); if (s) s.enabled = !s.enabled; } });
        try { await applyScheduleChange(key, name === 'confirm-delete'); setNotice(isExt ? StudyCopy.text("blocker_ui.schedule_updated_and_applied_68510a") : StudyCopy.text("blocker_ui.schedule_draft_updated_the_web_250fd5")); } catch (e) { setNotice(StudyCopy.text("blocker_ui.local_draft_updated_but_the_a1a92b") + e.message, true); }
        deletingId = ''; if (editingId === key) editingId = ''; render();
      } else if (name === 'apply-schedules') { await applySchedules(); setNotice(StudyCopy.text("blocker_ui.local_schedules_applied_other_extension_545033")); render(); }
    } catch (e) { setNotice(e.message || StudyCopy.text("blocker_ui.the_action_could_not_be_b132de"), true); }
    finally { busy = false; }
  }, true);
  setInterval(() => { if (document.querySelector('[data-blocker-status]')) onRender(); }, 15000);
  root.StudyBlocker = { page, summary, onRender, paintStatus };
  if (root.StudyOS) render();
})(window);

