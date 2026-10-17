/* Non-modal, trigger-anchored navigation. Presentation only; no timer writes. */
function workspaceNavigation() {
  const routes = [['today','Today','nav-today'],['plan','Planner','nav-planner'],['focus','Focus','nav-focus'],['reflection','Review','nav-review']];
  const extra = ['notebook','profile','blocking','assessment','guide'].includes(screen);
  const session = state.timer && ['running','paused','review'].includes(state.timer.status);
  const groups = [
    ['Study tools', [['Notebook','notebook','book'],['Goal tree','open-tree','goal'],['Plan insights','profile','file'],['Study assessment','assessment','file']]],
    ['Other tools', [['Website blocking','blocking','shield'],['Archive','v4-archive','history']]],
    ['Help', [['Quick guide','guide','guide']]],
  ];
  const item = ([label, destination, glyph]) => {
    const action = ['open-tree','v4-archive'].includes(destination) ? destination : 'nav';
    return `<button type="button" data-action="${action}" ${action === 'nav' ? `data-screen="${destination}"` : ''}>${icon(glyph)}<span>${label}</span></button>`;
  };
  return `<a class="skip-link" href="#main-content">Skip to content</a>
    <header class="global-header"><div class="global-inner">
      <button class="brand" data-action="nav" data-screen="today" aria-label="StudyOS Today">${SYMBOL}<span>StudyOS</span></button>
      <nav class="global-nav" aria-label="Main navigation">
        ${routes.map(([route,label,glyph]) => `<button type="button" class="global-link ${screen === route ? 'active' : ''}" data-action="nav" data-screen="${route}" ${screen === route ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`).join('')}
        <button type="button" class="global-link ${extra ? 'active' : ''}" data-action="toggle-more" aria-expanded="${moreOpen}" aria-controls="more-menu">${icon('more')}<span>More</span></button>
      </nav>
      <div class="global-tools">
        <button class="commands-trigger" type="button" data-action="commands-open" aria-label="Search tasks and pages"><span>${icon('search','small')}</span><span class="commands-trigger-text">Search</span><kbd>⌘ / Ctrl K</kbd></button>
        ${demo ? '<button class="demo-label" data-action="exit-demo">Exit demo</button>' : ''}
        ${session ? `<button type="button" class="mini-timer" data-action="nav" data-screen="focus" aria-label="Open current focus session">${icon(state.timer.status === 'paused' ? 'pause' : 'timer','small')}<span id="mini-timer-text">${state.timer.status === 'review' ? 'Ready to save' : `${state.timer.status === 'paused' ? 'Paused · ' : ''}${formatTimer(timerSeconds())}`}</span></button>` : ''}
        <button type="button" class="iconbtn ${screen === 'settings' ? 'active' : ''}" data-action="nav" data-screen="settings" aria-label="Settings" ${screen === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}</button>
      </div>
    </div></header>
    <div class="more-menu" id="more-menu" role="group" aria-label="More tools" ${moreOpen ? '' : 'hidden'}>
      ${groups.map(([label,items]) => `<section class="more-menu-group" aria-label="${label}"><h2>${label}</h2>${items.map(item).join('')}</section>`).join('')}
    </div>`;
}
function positionMoreMenu() {
  const menu = document.getElementById('more-menu');
  const trigger = document.querySelector(v7MoreReturn);
  if (!moreOpen || !menu || !trigger) return;
  const rect = trigger.getBoundingClientRect(), width = Math.min(280, innerWidth - 32);
  const top = Math.min(rect.bottom + 8, innerHeight - 52);
  menu.style.width = `${width}px`;
  menu.style.left = `${Math.max(16, Math.min(rect.left, innerWidth - width - 16))}px`;
  menu.style.top = `${Math.max(16, top)}px`;
  menu.style.maxHeight = `${Math.max(36, innerHeight - top - 16)}px`;
}
function setMoreMenu(open, { returnFocus = false, focusFirst = false } = {}) {
  moreOpen = Boolean(open);
  const menu = document.getElementById('more-menu');
  if (menu) menu.hidden = !moreOpen;
  document.querySelectorAll('[data-action="toggle-more"]').forEach(button => button.setAttribute('aria-expanded', String(moreOpen)));
  if (moreOpen) {
    positionMoreMenu();
    if (focusFirst) menu?.querySelector('button')?.focus({preventScroll:true});
  } else if (returnFocus) document.querySelector(v7MoreReturn)?.focus({preventScroll:true});
}
// Close before downstream route/modal handlers run, without replacing their DOM.
document.addEventListener('click', event => {
  if (!moreOpen || event.target.closest('[data-action="toggle-more"]')) return;
  const inside = event.target.closest('#more-menu');
  if (!inside || event.target.closest('button')) setMoreMenu(false);
}, true);
document.addEventListener('focusin', event => {
  if (moreOpen && !event.target.closest('#more-menu,[data-action="toggle-more"]')) setMoreMenu(false);
});
window.addEventListener('resize', positionMoreMenu);
window.addEventListener('scroll', positionMoreMenu, true);

function workspaceMobileNavigation() {
  return `<nav class="mobile-bottom" aria-label="Navigation">${[['today','Today','nav-today'],['plan','Planner','nav-planner'],['focus','Focus','nav-focus'],['reflection','Review','nav-review']].map(([route,label,glyph])=>`<button type="button" class="${screen===route?'active':''}" data-action="nav" data-screen="${route}" ${screen===route?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></button>`).join('')}<button type="button" data-action="toggle-more" aria-expanded="${moreOpen}" aria-controls="more-menu">${icon('more')}<span>More</span></button></nav>`;
}
