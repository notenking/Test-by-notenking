
/* English form feedback and date controls, independent of browser UI language.
 * Values remain ISO local dates / 24-hour local times. No storage operations. */
(function (root) {
  'use strict';
  const C = StudyCopy;
  let serial = 0, picker = null;
  const fields = 'input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea';
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00');
    return Number.isFinite(d.getTime()) && key(d) === value;
  }
  function clear(input) {
    input.setCustomValidity?.('');
    const id = input.dataset.feedbackId;
    if (id) document.getElementById(id)?.remove();
    input.removeAttribute('aria-invalid');
    if (id) {
      const remaining = (input.getAttribute('aria-describedby') || '').split(' ').filter(v=>v && v!==id);
      if (remaining.length) input.setAttribute('aria-describedby', remaining.join(' '));
      else input.removeAttribute('aria-describedby');
    }
  }
  function fieldError(input, text) {
    clear(input);
    const error = document.createElement('span');
    error.id = input.dataset.feedbackId || `english-field-error-${++serial}`;
    input.dataset.feedbackId = error.id;
    error.className = 'field-error'; error.setAttribute('role','alert'); error.textContent = text;
    (input.closest('.english-date-control') || input).insertAdjacentElement('afterend',error);
    input.setAttribute('aria-invalid','true');
    input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),error.id].filter(Boolean).join(' '));
    input.setCustomValidity(text);
  }
  function message(input) {
    if (input.disabled || input.readOnly || !input.willValidate) return '';
    const value = input.value.trim();
    if (input.required && !value) return C.text(input.id === 'task-title' ? 'forms.taskTitle' : 'forms.required');
    if (!value) return '';
    if (input.dataset.dateInput === 'date' && !validDate(value)) return C.text('forms.date');
    if (input.dataset.dateInput === 'month' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return C.text('forms.month');
    if (input.dataset.englishTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return C.text('forms.time');
    if (input.dataset.dateInput && ((input.min && value<input.min)||(input.max && value>input.max))) return C.text('forms.dateRange');
    if (input.type === 'number') {
      const number = Number(value);
      if (!Number.isFinite(number) || input.validity.badInput || input.validity.rangeUnderflow || input.validity.rangeOverflow || input.validity.stepMismatch) {
        if (input.closest('#task-form') && input.name === 'minutes') return C.text('forms.estimate');
        if (input.min && input.max) return C.format('forms.numberRange',[input.min,input.max]);
        return C.text('forms.number');
      }
    }
    if (input.validity.typeMismatch) return C.text(input.type === 'url' ? 'forms.url' : 'forms.invalid');
    if (input.validity.patternMismatch || input.validity.tooLong || input.validity.tooShort) return C.text('forms.invalid');
    return '';
  }
  function validate(form, focus = true) {
    let first = null;
    for (const input of form.querySelectorAll(fields)) {
      clear(input);
      const text = message(input);
      if (text) { fieldError(input,text); first ||= input; }
    }
    if (first && focus) { first.closest('details')?.setAttribute('open',''); first.focus(); }
    return !first;
  }
  function closePicker(restore = false) {
    if (!picker) return;
    const {panel, opener} = picker; picker = null;
    panel.remove(); opener.setAttribute('aria-expanded','false');
    if (restore && opener.isConnected) opener.focus();
  }
  function openPicker(input, opener) {
    closePicker();
    const monthMode = input.dataset.dateInput === 'month';
    const value = monthMode ? input.value + '-01' : input.value;
    const selected = validDate(value) ? new Date(value+'T12:00:00') : new Date();
    let year = selected.getFullYear(), month = selected.getMonth();
    const panel = document.createElement('div');
    panel.className = 'english-calendar'; panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label',C.text(monthMode?'forms.chooseMonth':'forms.chooseDate'));
    panel.setAttribute('popover','auto');
    input.closest('.english-date-control').append(panel);
    picker = {panel, opener}; opener.setAttribute('aria-expanded','true');
    const choose = date => {
      const result = key(date); input.value = monthMode ? result.slice(0,7) : result;
      clear(input); closePicker();
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
      const restore = () => {
        const field = input.isConnected ? input : input.id ? document.getElementById(input.id) : null;
        const target = monthMode ? field?.closest('.english-date-control')?.querySelector('.english-date-trigger') : field;
        target?.focus({preventScroll:true});
      };
      if(monthMode || !input.isConnected) requestAnimationFrame(restore); else restore();
    };
    function button(label, click, className='') {
      const b=document.createElement('button');b.type='button';b.textContent=label;b.className=className;b.addEventListener('click',click);return b;
    }
    function paint() {
      panel.replaceChildren();
      const header=document.createElement('div');header.className='english-calendar-header';
      const prev=button('‹',()=>{if(monthMode)year--;else if(--month<0){month=11;year--;}paint();});prev.setAttribute('aria-label',C.text('forms.previous'));
      const next=button('›',()=>{if(monthMode)year++;else if(++month>11){month=0;year++;}paint();});next.setAttribute('aria-label',C.text('forms.next'));
      const heading=document.createElement('strong');heading.textContent=monthMode?String(year):new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(year,month,1));
      header.append(prev,heading,next);panel.append(header);
      const grid=document.createElement('div');grid.className=monthMode?'english-month-grid':'english-date-grid';
      if (!monthMode) for(const name of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']){const cell=document.createElement('small');cell.textContent=name;grid.append(cell);}
      const count = monthMode?12:new Date(year,month+1,0).getDate();
      if(!monthMode) for(let i=0;i<(new Date(year,month,1).getDay()+6)%7;i++)grid.append(document.createElement('span'));
      for(let i=1;i<=count;i++) {
        const date=monthMode?new Date(year,i-1,1,12):new Date(year,month,i,12),iso=key(date),v=monthMode?iso.slice(0,7):iso;
        const b=button(monthMode?new Intl.DateTimeFormat('en-US',{month:'short'}).format(date):String(i),()=>choose(date));
        b.dataset.calendarDate=v;b.setAttribute('aria-label',new Intl.DateTimeFormat('en-US',{month:'long',...(monthMode?{}:{day:'numeric'}),year:'numeric'}).format(date));
        b.setAttribute('aria-pressed',String(input.value===v));
        b.disabled=Boolean((input.min&&v<input.min)||(input.max&&v>input.max));
        if(input.value===v)b.classList.add('selected');
        if(iso===key(new Date())&&!monthMode){b.classList.add('is-today');b.setAttribute('aria-current','date');}
        grid.append(b);
      }
      panel.append(grid);
      const footer=document.createElement('div');footer.className='english-calendar-footer';
      footer.append(button(C.common.today,()=>choose(new Date())),button(C.common.close,()=>closePicker(true)));panel.append(footer);
    }
    paint();panel.showPopover?.();
    const r=opener.getBoundingClientRect();
    panel.style.left=Math.max(8,Math.min(r.right-280,innerWidth-288))+'px';
    panel.style.top=Math.max(8,Math.min(r.bottom+8,innerHeight-panel.getBoundingClientRect().height-8))+'px';
    panel.addEventListener('toggle',e=>{if(e.newState==='closed'&&picker?.panel===panel)closePicker();});
    panel.querySelector('.selected')?.focus();
  }
  function enhance(scope) {
    const all=(selector)=>[...(scope.matches?.(selector)?[scope]:[]),...scope.querySelectorAll(selector)];
    for(const form of all('form')) form.noValidate=true;
    for(const input of all('input[type=date],input[type=month],input[type=time]')) {
      const type=input.type; input.type='text'; input.lang='en'; input.autocomplete='off';
      if(type==='time') {input.dataset.englishTime='true';input.placeholder='HH:mm';input.setAttribute('aria-description',C.text('forms.timeHint'));continue;}
      input.dataset.dateInput=type; if(input.id==='month-jump'){input.tabIndex=-1;input.setAttribute('aria-hidden','true');} input.placeholder=type==='month'?'YYYY-MM':'YYYY-MM-DD';
      input.setAttribute('aria-description',C.text(type==='month'?'forms.monthHint':'forms.dateHint'));
      const wrapper=document.createElement('span');wrapper.className='english-date-control';
      input.replaceWith(wrapper);wrapper.append(input);
      const opener=document.createElement('button');opener.type='button';opener.className='english-date-trigger';
      opener.setAttribute('aria-label',C.text(type==='month'?'forms.chooseMonth':'forms.chooseDate'));opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-haspopup','dialog');
      opener.innerHTML=icon('calendar');
      opener.disabled = input.disabled || input.readOnly;
      opener.addEventListener('click',()=>{if(!input.disabled&&!input.readOnly){picker?.opener===opener?closePicker(true):openPicker(input,opener);}});wrapper.append(opener);
    }
  }
  document.addEventListener('submit',e=>{
    const form=e.target;if(!(form instanceof HTMLFormElement))return;
    if(!validate(form)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('invalid',e=>e.preventDefault(),true);
  document.addEventListener('input',e=>{if(e.target.matches?.(fields))clear(e.target);},true);
  document.addEventListener('change',e=>{
    if(e.target.dataset?.dateInput||e.target.dataset?.englishTime){clear(e.target);const text=message(e.target);if(text){fieldError(e.target,text);e.stopImmediatePropagation();}}
  },true);
  document.addEventListener('keydown',e=>{
    if(!picker)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closePicker(true);return;}
    if(e.target.dataset.calendarDate&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
      e.preventDefault();const buttons=[...picker.panel.querySelectorAll('[data-calendar-date]')];const i=buttons.indexOf(e.target),columns=e.target.closest('.english-month-grid')?3:7;
      buttons[i+({ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[e.key])]?.focus();
    }
  },true);
  new MutationObserver(records=>{
    if(picker&&!picker.opener.isConnected)closePicker();
    for(const record of records){
      if(record.type==='attributes'&&record.target.dataset.dateInput){const input=record.target,button=input.closest('.english-date-control')?.querySelector('.english-date-trigger');if(button)button.disabled=input.disabled||input.readOnly;}
      for(const node of record.addedNodes)if(node.nodeType===1)enhance(node);
    }
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','readonly']});
  enhance(document);
  root.StudyForms={validate,fieldError,validDate};
})(window);

