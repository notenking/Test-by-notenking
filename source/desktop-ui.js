
/* Shared keyboard behavior for the presentation layer. No task or storage writes. */
'use strict';
document.addEventListener('click', event => {
  document.querySelectorAll('.task-more[open]').forEach(menu => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});
document.addEventListener('keydown', event => {
  const menu = event.target.closest('.task-more');
  if (!menu || document.querySelector('[role="dialog"]')) return;
  if (event.key === 'Escape' && menu.open) {
    event.preventDefault(); event.stopPropagation();
    menu.open = false; menu.querySelector('summary').focus();
  } else if (event.key === 'ArrowDown' && event.target.tagName === 'SUMMARY') {
    event.preventDefault(); menu.open = true;
    menu.querySelector('button')?.focus();
  }
}, true);
document.addEventListener('input', event => {
  const field = event.target.closest('#task-form .field');
  if (!field) return;
  field.querySelector('.field-error')?.remove();
  event.target.removeAttribute('aria-invalid');
  event.target.removeAttribute('aria-describedby');
});

