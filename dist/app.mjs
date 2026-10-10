import {STORAGE_KEY, COLORS, LIMITS, dateKey, parseDay, addDays, goalDate, currentStreak, bestStreak, monthKeys, freshData, validateData} from './core.mjs';

const $ = selector => document.querySelector(selector);
const main = $('#main');
$('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView({block:'start'}); });
const today = () => dateKey();
const icon = name => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  svg.setAttribute('aria-hidden', 'true'); use.setAttribute('href', `icons.svg#${name}`); svg.append(use); return svg;
};
function el(tag, className = '', content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}
function button(text, className, action, iconName) {
  const node = el('button', className); node.type = 'button';
  if (iconName) node.append(icon(iconName)); node.append(document.createTextNode(text));
  node.addEventListener('click', action); return node;
}
function link(text, href, className = '') { const node = el('a', className, text); node.href = href; return node; }
const prettyDay = key => parseDay(key).toLocaleDateString(undefined, {month:'long', day:'numeric', year:'numeric'});
const prettyMonth = key => parseDay(`${key}-01`).toLocaleDateString(undefined, {month:'long', year:'numeric'});
const plural = (number, noun) => `${number} ${noun}${number === 1 ? '' : 's'}`;
const id = () => crypto.randomUUID();
let data = freshData(), snapshot = null, storageProblem = false;
let editingId = null, checkingId = null, confirmAction = null, activeTab = 'calendar';
let priorityFilter = 'all', sortOrder = 'created', toastTimer, lastDay = today();
const historyVisible = new Map();

function storageWarning(message) { $('#storage-banner').textContent = message; $('#storage-banner').hidden = false; }
try {
  snapshot = localStorage.getItem(STORAGE_KEY);
  if (snapshot !== null) data = validateData(JSON.parse(snapshot));
} catch {
  storageProblem = true;
  storageWarning('Your saved data could not be read. It has not been changed. Open My space to restore a backup or explicitly reset storage.');
}
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.hidden = true; }, 4500);
}
function save(next, {recover = false} = {}) {
  try {
    if (storageProblem && !recover) throw new Error('Storage needs attention. Open My space to restore or reset it.');
    if (!recover && localStorage.getItem(STORAGE_KEY) !== snapshot) throw new Error('Another tab changed your habits. Reload this page before saving.');
    const validated = validateData(next), json = JSON.stringify(validated);
    if (new Blob([json]).size > LIMITS.fileBytes) throw new Error('Your history is too large to save. Export a backup before removing older habits.');
    localStorage.setItem(STORAGE_KEY, json);
    data = validated; snapshot = json; storageProblem = false; $('#storage-banner').hidden = true;
    render(); return true;
  } catch (error) {
    const message = error.name === 'QuotaExceededError' ? 'Browser storage is full. Your change was not saved. Export a backup before freeing space.' : error.name === 'SecurityError' ? 'Browser storage is disabled. Allow site storage to save your habits.' : error.message;
    toast(message); return false;
  }
}
function update(mutator) { const next = structuredClone(data); mutator(next); return save(next); }
const findHabit = habitId => data.habits.find(h => h.id === habitId);
function confirm(title, message, action, label = 'Confirm') {
  $('#confirm-title').textContent = title; $('#confirm-message').textContent = message;
  $('#confirm-action').textContent = label; confirmAction = action; $('#confirm-dialog').showModal();
}
$('#confirm-action').addEventListener('click', () => { $('#confirm-dialog').close(); const action = confirmAction; confirmAction = null; action?.(); });
document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => document.getElementById(node.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
for (const [value, label] of Object.entries(COLORS)) {
  const wrapper = el('label', `color-option color-${value}`);
  const radio = el('input'); radio.type = 'radio'; radio.name = 'color'; radio.value = value; radio.required = true; radio.setAttribute('aria-label',label);
  wrapper.append(radio, el('span', 'color-dot'), el('span', 'sr-only', label)); wrapper.title = label;
  $('#color-options').append(wrapper);
}
function openHabit(habitId = null) {
  const habit = habitId ? findHabit(habitId) : null;
  if (!habit && data.habits.length >= LIMITS.habits) { toast('You can keep up to 100 habits.'); return; }
  editingId = habit?.id ?? null;
  $('#habit-dialog-title').textContent = habit ? 'Edit habit' : 'New habit';
  $('#habit-name').value = habit?.name ?? '';
  $('#habit-priority').value = habit?.priority ?? 'p2';
  $('#habit-goal').value = habit?.goalDays ?? 21;
  document.querySelector(`#color-options input[value="${habit?.color ?? 'sage'}"]`).checked = true;
  $('#habit-form-error').hidden = true; $('#habit-dialog').showModal(); $('#habit-name').focus();
}
$('#habit-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#habit-name').value.trim(), goalDays = Number($('#habit-goal').value);
  if (!name) { $('#habit-name').setCustomValidity('Give your habit a name.'); $('#habit-name').reportValidity(); return; }
  const fields = {name, goalDays, priority: $('#habit-priority').value, color: document.querySelector('input[name="color"]:checked').value};
  const success = update(next => {
    if (editingId) Object.assign(next.habits.find(h => h.id === editingId), fields);
    else next.habits.push({id: id(), ...fields, createdOn: today(), todos: [], entries: {}});
  });
  if (success) { $('#habit-dialog').close(); toast(editingId ? 'Habit updated.' : 'A small step starts here. Habit created.'); }
  else { $('#habit-form-error').textContent = $('#toast').textContent; $('#habit-form-error').hidden = false; }
});
$('#habit-name').addEventListener('input', () => $('#habit-name').setCustomValidity(''));

function openCompletion(habitId) {
  const habit = findHabit(habitId); if (!habit) return;
  checkingId = habitId;
  $('#completion-dialog-title').textContent = habit.entries[today()] ? 'Today’s check-in' : 'A little progress, recorded.';
  $('#completion-subtitle').textContent = `${habit.name} · ${prettyDay(today())}`;
  $('#completion-form-error').hidden = true;
  const container = $('#completion-items'); container.replaceChildren();
  // Retain deleted/renamed task snapshots when editing an existing check-in.
  const previous = habit.entries[today()]?.items ?? [];
  const options = habit.todos.map(t => previous.find(p => p.id === t.id) ?? t);
  previous.filter(p => !options.some(t => t.id === p.id)).forEach(p => options.push(p));
  if (!options.length) container.append(el('p', 'empty-inline', 'Showing up counts. Save your check-in for today.'));
  for (const todo of options) {
    const label = el('label', 'check-item');
    const input = el('input'); input.type = 'checkbox'; input.value = todo.id;
    input.checked = previous.some(p => p.id === todo.id);
    input.dataset.text = todo.text;
    label.append(input, el('span', '', todo.text)); container.append(label);
  }
  $('#undo-completion').hidden = !habit.entries[today()]; $('#completion-dialog').showModal();
}
$('#completion-form').addEventListener('submit', event => {
  event.preventDefault();
  const items = [...$('#completion-items').querySelectorAll('input:checked')].map(input => ({id: input.value, text: input.dataset.text}));
  if (update(next => { next.habits.find(h => h.id === checkingId).entries[today()] = {items}; })) {
    $('#completion-dialog').close(); toast('Today’s progress saved. Keep it steady.');
  } else { $('#completion-form-error').textContent = $('#toast').textContent; $('#completion-form-error').hidden = false; }
});
$('#undo-completion').addEventListener('click', () => {
  if (update(next => { delete next.habits.find(h => h.id === checkingId).entries[today()]; })) {
    $('#completion-dialog').close(); toast('Today’s check-in removed.');
  }
});
function completionButton(habit) {
  const done = !!habit.entries[today()];
  return button(done ? 'Completed today' : 'Complete today', `button check-in ${done ? 'is-done' : ''}`, () => openCompletion(habit.id), 'check');
}
function stat(value, label, iconName, note) {
  const card = el('div', 'stat'); const top = el('div', 'stat-top');
  top.append(el('span', '', label), icon(iconName)); card.append(top);
  const bottom = el('div', 'stat-bottom'); bottom.append(el('strong', '', value));
  if (note) bottom.append(el('span', 'muted', note)); card.append(bottom); return card;
}
function pageHeading(eyebrow, title, subtitle, action) {
  const row = el('div', 'page-heading'), text = el('div');
  text.append(el('p', 'eyebrow', eyebrow), el('h1', '', title), el('p', 'page-subtitle', subtitle)); row.append(text);
  if (action) row.append(action); return row;
}

function tooltipText(habit, key) {
  const entry = habit.entries[key];
  let text = `${prettyDay(key)}\n`;
  if (key < habit.createdOn) text += 'Before this habit began';
  else if (entry) text += `Completed${entry.items.length ? '\n' + entry.items.map(item => `• ${item.text}`).join('\n') : ' · No to-do items selected'}`;
  else text += key > today() ? 'Coming up' : 'No check-in';
  if (key === goalDate(habit)) text += `\nGoal date · Day ${habit.goalDays}`;
  return text;
}
let tooltipOwner = null;
function hideTooltip() { const tooltip = $('#day-tooltip'); tooltip.hidden = true; document.body.append(tooltip); if (tooltipOwner) tooltipOwner.removeAttribute('aria-describedby'); tooltipOwner = null; }
function showTooltip(cell, text) {
  hideTooltip(); const tooltip = $('#day-tooltip'); tooltipOwner = cell;
  tooltip.textContent = text; tooltip.hidden = false; cell.setAttribute('aria-describedby', 'day-tooltip');
  // The tooltip follows its source in layout, so the CSP requires no inline styles.
  cell.append(tooltip);
}
function calendar(habit, month) {
  const wrapper = el('section', `month-calendar color-${habit.color}`); wrapper.setAttribute('aria-label', prettyMonth(month));
  wrapper.append(el('h3', 'month-title', prettyMonth(month)));
  const grid = el('div', 'calendar-grid');
  ['M','T','W','T','F','S','S'].forEach(day => grid.append(el('span', 'weekday', day)));
  const first = parseDay(`${month}-01`), offset = (first.getDay() + 6) % 7;
  for (let n = 0; n < offset; n++) { const gap = el('span', 'calendar-gap'); gap.setAttribute('aria-hidden', 'true'); grid.append(gap); }
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    const key = `${month}-${String(day).padStart(2, '0')}`;
    const completed = Object.hasOwn(habit.entries, key), future = key > today(), before = key < habit.createdOn;
    const cell = el('button', `day${completed ? ' completed' : ''}${future ? ' future' : ''}${before ? ' before' : ''}${key === today() ? ' today' : ''}${key === goalDate(habit) ? ' goal-day' : ''}`, day);
    cell.type = 'button'; cell.setAttribute('aria-label', tooltipText(habit, key).replaceAll('\n', '. '));
    if (key === today()) cell.setAttribute('aria-current', 'date');
    cell.addEventListener('pointerenter', () => showTooltip(cell, tooltipText(habit, key)));
    cell.addEventListener('pointerleave', hideTooltip);
    cell.addEventListener('focus', () => showTooltip(cell, tooltipText(habit, key)));
    cell.addEventListener('blur', hideTooltip);
    cell.addEventListener('click', () => { if (key === today()) openCompletion(habit.id); else showTooltip(cell, tooltipText(habit, key)); });
    grid.append(cell);
  }
  wrapper.append(grid); return wrapper;
}
function legend() {
  const row = el('div', 'calendar-legend');
  for (const [className, label] of [['legend-complete','Completed'],['legend-today','Today'],['legend-goal','Goal date']]) {
    const item = el('span'); item.append(el('i', className), document.createTextNode(label)); row.append(item);
  }
  row.append(el('span', 'legend-hint', 'Hover or focus a day for details')); return row;
}
function habitCard(habit) {
  const card = el('article', `habit-card color-${habit.color}`);
  const header = el('div', 'habit-card-header');
  const titleRow = el('div', 'habit-title-row'), badge = el('span', 'habit-icon'); badge.append(icon('sprout'));
  const text = el('div'); text.append(link(habit.name, `#habit/${habit.id}`, 'habit-title'), el('span', `priority ${habit.priority}`, `${habit.priority.toUpperCase()} · ${{p1:'High',p2:'Medium',p3:'Low'}[habit.priority]}`));
  titleRow.append(badge, text);
  const edit = button('', 'icon-button', () => openHabit(habit.id), 'edit'); edit.setAttribute('aria-label', `Edit ${habit.name}`); edit.title = 'Edit habit';
  header.append(titleRow, edit); card.append(header);
  const middle = el('div', 'card-calendar-row'); middle.append(calendar(habit, today().slice(0,7)));
  const insight = el('div', 'card-insight');
  const streak = el('div', 'streak-value'); streak.append(icon('flame'), el('strong', '', currentStreak(habit)));
  insight.append(streak, el('span', 'insight-label', 'day streak'), el('div','insight-divider'));
  insight.append(el('strong', 'goal-count', `${Object.keys(habit.entries).length} / ${habit.goalDays}`), el('span','insight-label','days completed'));
  const progress = el('progress'); progress.max = habit.goalDays; progress.value = Object.keys(habit.entries).length; progress.setAttribute('aria-label', `${habit.name} goal progress`); insight.append(progress);
  insight.append(el('span','goal-date', `Goal · ${parseDay(goalDate(habit)).toLocaleDateString(undefined, {month:'short',day:'numeric', ...(goalDate(habit).slice(0,4) !== today().slice(0,4) ? {year:'numeric'} : {})})}`));
  middle.append(insight); card.append(middle);
  const actions = el('div', 'card-actions'); actions.append(completionButton(habit));
  const detail = link('Details', `#habit/${habit.id}`, 'detail-link'); detail.append(icon('arrow')); actions.append(detail); card.append(actions); return card;
}
function renderHabitGrid() {
  const grid = $('#habit-grid'); if (!grid) return; hideTooltip(); grid.replaceChildren();
  let habits = data.habits.filter(h => priorityFilter === 'all' || h.priority === priorityFilter);
  if (sortOrder === 'priority') habits = habits.toSorted((a,b) => a.priority.localeCompare(b.priority));
  if (sortOrder === 'name') habits = habits.toSorted((a,b) => a.name.localeCompare(b.name));
  habits.forEach(habit => grid.append(habitCard(habit)));
  if (!habits.length) grid.append(el('div', 'filter-empty', 'No habits at this priority yet.'));
  $('#habit-visible-count').textContent = plural(habits.length, 'habit');
}
function home() {
  main.append(pageHeading('YOUR DAILY PRACTICE', 'One day at a time.', 'A little consistency goes a long way.', button('New habit', 'button primary', () => openHabit(), 'plus')));
  const completed = data.habits.filter(h => h.entries[today()]).length;
  const stats = el('section', 'stats-grid'); stats.setAttribute('aria-label', 'Habit overview');
  stats.append(stat(data.habits.length, 'Active habits', 'sprout', 'small commitments'), stat(`${completed} / ${data.habits.length}`, 'Completed today', 'check', completed && completed === data.habits.length ? 'a good day’s work' : 'at your own pace'), stat(Math.max(0, ...data.habits.map(h => currentStreak(h))), 'Longest current streak', 'flame', 'days in a row'));
  main.append(stats);
  if (!data.habits.length) { renderEmpty(); return; }
  const tools = el('div', 'habit-toolbar'), left = el('div', 'toolbar-title'); left.append(el('h2', '', 'Your habits'), el('span', 'count-label', '',));
  left.lastChild.id = 'habit-visible-count'; tools.append(left);
  const controls = el('div', 'toolbar-controls'), filterGroup = el('div', 'priority-filter'); filterGroup.setAttribute('aria-label', 'Filter by priority');
  for (const value of ['all','p1','p2','p3']) {
    const node = button(value === 'all' ? 'All habits' : value.toUpperCase(), priorityFilter === value ? 'selected' : '', () => {
      priorityFilter = value; filterGroup.querySelectorAll('button').forEach(b => { const selected = b === node; b.classList.toggle('selected',selected); b.setAttribute('aria-pressed', String(selected)); }); renderHabitGrid();
    }); node.setAttribute('aria-pressed', String(priorityFilter === value)); filterGroup.append(node);
  }
  const sort = el('select', 'sort-select'); sort.setAttribute('aria-label','Sort habits');
  for (const [value,text] of [['created','Created order'],['priority','Priority'],['name','Name A–Z']]) { const option = el('option','',text); option.value = value; sort.append(option); }
  sort.value = sortOrder; sort.addEventListener('change', () => {sortOrder = sort.value; renderHabitGrid();});
  controls.append(filterGroup, sort); tools.append(controls); main.append(tools);
  const grid = el('div','habit-grid'); grid.id = 'habit-grid'; main.append(grid); renderHabitGrid(); main.append(legend());
}
function renderEmpty() {
  const section = el('section', 'empty-state'); const artwork = el('div', 'empty-art'); artwork.append(icon('sprout'));
  section.append(artwork, el('p','eyebrow','A FRESH START'), el('h2','','Good habits start small.'), el('p','muted','Choose something you want to make a little more room for.\nWe’ll help you see each day of progress.'));
  section.append(button('Create your first habit','button primary',() => openHabit(),'plus'));
  section.append(button('Explore with sample habits','text-button sample-button',loadSamples));
  const ideas = el('div','habit-ideas'); ['Read a few pages','Move a little','Practice a skill'].forEach(text => ideas.append(el('span','',text))); section.append(ideas); main.append(section);
}
function loadSamples() {
  if (data.habits.length) return;
  const specs = [['Read a few pages','sage','p2',21,['Read one chapter','Write a short note']],['Move a little','peach','p1',30,['Go for a walk','Stretch for 10 minutes']],['Practice a skill','lavender','p2',14,['Practice for 20 minutes','Review yesterday’s work']],['Make time to unwind','blue','p3',21,[]]];
  if (update(next => {
    next.habits = specs.map(([name,color,priority,goalDays,tasks], index) => {
      const createdOn = addDays(today(), -12 - index * 2), todos = tasks.map(text => ({id:id(),text})), entries = {};
      for (let n = 0; addDays(createdOn,n) < today(); n++) {
        if ((n + index) % 6 !== 1) entries[addDays(createdOn,n)] = {items: todos.length ? [structuredClone(todos[n % todos.length])] : []};
      }
      return {id:id(),name,color,priority,goalDays,createdOn,todos,entries};
    });
  })) { window.scrollTo({top:0}); toast('Sample habits added. Edit or delete them to make this space yours.'); }
}

function detail(habitId) {
  const habit = findHabit(habitId);
  if (!habit) { main.append(pageHeading('NOT FOUND','This habit isn’t here.','It may have been deleted or replaced by a backup.'), link('Back to my habits','#home','button secondary')); return; }
  main.classList.add(`color-${habit.color}`);
  main.append(link('← Back to my habits','#home','back-link'));
  const heading = pageHeading(`HABIT DETAILS · ${habit.priority.toUpperCase()}`, habit.name, `Started ${prettyDay(habit.createdOn)} · ${habit.goalDays}-day goal`, button('Edit habit','button secondary',() => openHabit(habit.id),'edit')); main.append(heading);
  const stats = el('section','stats-grid'); stats.append(stat(currentStreak(habit),'Current streak','flame','days in a row'),stat(Object.keys(habit.entries).length,'Total check-ins','check','days you showed up'),stat(bestStreak(habit),'Personal best','target','days in a row')); main.append(stats);
  const content = el('section','detail-panel');
  const bar = el('div','detail-tab-bar'), tabs = el('div','detail-tabs'); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Habit details');
  const tabButtons = [];
  for (const [value,text,iconName] of [['calendar','Calendar','calendar'],['todos',`To-do list (${habit.todos.length})`,'list']]) {
    const tab = button(text, activeTab === value ? 'active' : '', () => { activeTab = value; render(); document.getElementById(`tab-${value}`).focus(); },iconName);
    tab.id = `tab-${value}`; tab.setAttribute('role','tab'); tab.setAttribute('aria-selected',String(activeTab === value)); tab.setAttribute('aria-controls','detail-tab-panel'); tab.tabIndex = activeTab === value ? 0 : -1;
    tabs.append(tab); tabButtons.push(tab);
  }
  tabs.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); const target = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (tabButtons.indexOf(document.activeElement) + 1) % 2; tabButtons[target].click();
  });
  bar.append(tabs,completionButton(habit)); content.append(bar);
  const panel = el('div','detail-tab-panel'); panel.id = 'detail-tab-panel'; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',`tab-${activeTab}`);
  if (activeTab === 'calendar') renderHistory(panel,habit); else renderTodos(panel,habit);
  content.append(panel); main.append(content);
  const bottom = el('div','detail-bottom'); bottom.append(el('p','muted','Progress is a practice, not a perfect score.'),button('Delete habit','text-button danger',() => confirm('Delete this habit?',`“${habit.name}” and all of its check-ins will be removed from this browser. Export a backup in My space first if you want to keep them.`,() => {
    if (update(next => {next.habits = next.habits.filter(h => h.id !== habit.id);})) {location.hash = 'home';toast('Habit deleted.');}
  },'Delete habit'),'trash')); main.append(bottom);
}
function renderHistory(panel,habit) {
  const intro = el('div','panel-intro'); intro.append(el('h2','','Every day is part of the story.'),el('p','muted',`Your history from ${prettyDay(habit.createdOn)}. Goal date: ${prettyDay(goalDate(habit))}.`)); panel.append(intro);
  const keys = monthKeys(habit), visible = historyVisible.get(habit.id) ?? 12;
  if (keys.length > visible) panel.append(button(`Show ${Math.min(12,keys.length - visible)} earlier months`,'button secondary history-more',() => {historyVisible.set(habit.id,visible + 12);render();}));
  const months = el('div','history-grid'); keys.slice(-visible).forEach(key => months.append(calendar(habit,key))); panel.append(months,legend());
}
function renderTodos(panel,habit) {
  const intro = el('div','panel-intro'); intro.append(el('h2','','Give your habit a little shape.'),el('p','muted','Optional, repeatable activities. Choose what you did when you check in; each day keeps its own record.')); panel.append(intro);
  const form = el('form','add-todo-form'), input = el('input'); input.placeholder = 'e.g. Read one chapter'; input.maxLength = 120; input.required = true; input.setAttribute('aria-label','New to-do item');
  const add = el('button','button primary','Add item'); add.type = 'submit'; form.append(input,add);
  form.addEventListener('submit',event => {
    event.preventDefault(); const text = input.value.trim(); if (!text) {input.setCustomValidity('Add a few words for this item.'); input.reportValidity(); return;}
    if (habit.todos.length >= LIMITS.todos) {toast('A habit can have up to 100 to-do items.'); return;}
    if (update(next => next.habits.find(h => h.id === habit.id).todos.push({id:id(),text}))) {toast('To-do item added.');$('#detail-tab-panel input').focus();}
  }); input.addEventListener('input',()=> input.setCustomValidity('')); panel.append(form);
  if (!habit.todos.length) {const empty = el('div','todo-empty'); empty.append(icon('list'),el('p','','Keep it simple, or add a few activities.'),el('span','muted','Your habit works either way.'));panel.append(empty);}
  const list = el('ul','todo-list');
  for (const todo of habit.todos) {
    const item = el('li','todo-row'); item.append(el('span','todo-bullet','○'),el('span','todo-text',todo.text));
    const edit = button('','icon-button',() => {
      const editForm = el('form','todo-edit-form'), field = el('input'); field.value = todo.text; field.maxLength = 120; field.required = true; field.setAttribute('aria-label','Edit to-do item');
      const submit = el('button','button secondary small','Save'); submit.type = 'submit'; editForm.append(field,submit,button('Cancel','text-button',render));
      editForm.addEventListener('submit',event => {event.preventDefault();const text = field.value.trim();if (!text) {field.setCustomValidity('Add a few words for this item.');field.reportValidity();return;} if(update(next => {next.habits.find(h => h.id === habit.id).todos.find(t => t.id === todo.id).text = text;})) toast('Item updated. Previous check-ins keep their original wording.');});
      field.addEventListener('input',()=> field.setCustomValidity(''));item.replaceChildren(editForm);field.focus();
    },'edit'); edit.setAttribute('aria-label',`Edit ${todo.text}`);
    const remove = button('','icon-button',()=>confirm('Remove this to-do item?',`“${todo.text}” will no longer appear for new check-ins. Previous check-ins will keep their record.`,()=> {if(update(next => {const target = next.habits.find(h => h.id === habit.id);target.todos = target.todos.filter(t => t.id !== todo.id);})) toast('To-do item removed.');},'Remove item'),'trash'); remove.setAttribute('aria-label',`Remove ${todo.text}`);
    item.append(edit,remove);list.append(item);
  }
  panel.append(list);
}
function profile() {
  main.append(pageHeading('YOUR PERSONAL SPACE','A practice that’s yours.','A nickname, a little perspective, and your progress in one place.'));
  const profileCard = el('section','profile-card'), avatar = el('span','avatar large',data.nickname.slice(0,1).toUpperCase());
  const info = el('div','profile-info'); info.append(el('h2','',data.nickname),el('p','muted','Local profile · No account needed'));
  const form = el('form','nickname-form'), input = el('input'); input.value = data.nickname; input.maxLength = 32; input.required = true; input.autocomplete = 'off'; input.id = 'nickname';
  const label = el('label','','Nickname'); label.htmlFor = 'nickname'; const field = el('div');field.append(label,input);
  const submit = el('button','button secondary','Save nickname'); submit.type = 'submit';form.append(field,submit);
  form.addEventListener('submit',event => {event.preventDefault(); const nickname = input.value.trim();if(!nickname){input.setCustomValidity('Choose a nickname.');input.reportValidity();return;}if(update(next => {next.nickname = nickname;}))toast('Nickname saved on this browser.');});input.addEventListener('input',()=>input.setCustomValidity(''));
  profileCard.append(avatar,info,form);main.append(profileCard);
  const stats = el('section','stats-grid'); const total = data.habits.reduce((sum,h) => sum + Object.keys(h.entries).length,0);
  let opportunities = 0, completed = 0;
  for (const h of data.habits) for(let n = 0;n < 30;n++) {const day = addDays(today(),-n);if(day >= h.createdOn){opportunities++;if(h.entries[day])completed++;}}
  stats.append(stat(total,'Total check-ins','check','across your habits'),stat(Math.max(0,...data.habits.map(bestStreak)),'Best ever streak','flame','days in a row'),stat(opportunities ? `${Math.round(completed/opportunities*100)}%` : '—','Last 30 days','calendar',opportunities ? `${completed} of ${opportunities} possible check-ins` : 'your story starts here'));main.append(stats);
  const storage = el('section','settings-card'), heading = el('div','settings-heading');heading.append(icon('shield'),el('h2','','Your progress stays with you.'));storage.append(heading,el('p','muted','Habits and your nickname are saved only in this browser on this device. There is no account, analytics, or cloud sync. Use a nickname and avoid sensitive details.'));
  const rows = el('div','settings-rows');
  rows.append(settingsRow('Keep a backup','Download your nickname, habits, and check-in history as a JSON file.',button('Export backup','button secondary',exportBackup,'download')));
  rows.append(settingsRow('Restore your progress','Import a Steady JSON backup. This replaces the data in this browser.',button('Import backup','button secondary',()=>{$('#import-file').value = '';$('#import-file').click();})));
  rows.append(settingsRow('Start fresh','Delete your local nickname and all habits. This cannot be undone without a backup.',button('Reset local data','button secondary danger',()=>confirm('Reset all local data?','Your nickname, habits, to-do lists, and check-ins will be removed. Keep a backup first if you want to restore them later.',()=> {
    if(save(freshData(),{recover:true})) {location.hash='home';toast('Local data reset. A fresh start.');}
  },'Reset local data'))));storage.append(rows,el('p','privacy-footnote','Clearing browser data or using a different browser, port, or device gives you a separate space. Backups contain your habit history: keep them outside your public repository.'));main.append(storage);
}
function settingsRow(title,description,action) {const row = el('div','settings-row'), text = el('div');text.append(el('h3','',title),el('p','muted',description));row.append(text,action);return row;}
function exportBackup() {
  if(storageProblem){toast('Saved data could not be read. Restore or reset storage before exporting.');return;}
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob), a = el('a');
  a.href = url;a.download = `steady-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup downloaded. Keep it outside your public repository.');
}
$('#import-file').addEventListener('change',async event => {
  const file = event.target.files[0];if(!file)return;
  if(file.size > LIMITS.fileBytes){toast('This file is too large. Choose a Steady backup under 8 MB.');return;}
  try {
    const imported = validateData(JSON.parse(await file.text()));
    confirm('Restore this backup?',`Replace your current space with ${plural(imported.habits.length,'habit')} from this backup? Export your current data first if you want to keep it.`,()=> {if(save(imported,{recover:storageProblem}))toast('Backup restored. Welcome back.');},'Restore backup');
  } catch(error) {toast(error instanceof SyntaxError ? 'This file is not valid JSON. Your current habits have not changed.' : error.message);}
});
function render() {
  hideTooltip();document.body.append($('#day-tooltip'));main.replaceChildren();main.className = '';
  $('#sidebar-name').textContent = data.nickname;$('#sidebar-avatar').textContent = data.nickname.slice(0,1).toUpperCase();$('#nav-count').textContent = data.habits.length;
  $('#header-date').textContent = new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});$('#header-date').dateTime = today();
  const route = location.hash.slice(1) || 'home', isProfile = route === 'profile';
  $('#nav-home').classList.toggle('active',!isProfile);$('#nav-profile').classList.toggle('active',isProfile);
  $('#nav-home').toggleAttribute('aria-current',!isProfile);$('#nav-profile').toggleAttribute('aria-current',isProfile);
  if(!isProfile)$('#nav-home').setAttribute('aria-current','page');else $('#nav-profile').setAttribute('aria-current','page');
  $('#breadcrumb').textContent = isProfile ? 'My space' : route.startsWith('habit/') ? 'My habits / Habit details' : 'My habits';
  if(isProfile) {document.title = 'My space — Steady';profile();}
  else if(route.startsWith('habit/')) {document.title = `${findHabit(route.slice(6))?.name ?? 'Habit details'} — Steady`;detail(route.slice(6));}
  else {document.title = 'My habits — Steady';home();}
}
window.addEventListener('hashchange',()=> {activeTab = 'calendar';render();main.focus();window.scrollTo({top:0});});
window.addEventListener('storage',event=> {
  if(event.key !== STORAGE_KEY && event.key !== null)return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);const next = raw === null ? freshData() : validateData(JSON.parse(raw));
    data = next;snapshot = raw;storageProblem = false;$('#storage-banner').hidden = true;
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();toast('Your space was updated in another tab.');
  } catch {storageProblem = true;storageWarning('Data changed in another tab and could not be read. Your existing data has not been overwritten. Restore a backup in My space.');}
});
function refreshDay() {
  if(today() === lastDay)return;
  lastDay = today();document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();toast('A new day. Your calendar is up to date.');
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});window.addEventListener('focus',refreshDay);setInterval(refreshDay,30000);
document.addEventListener('keydown',event=>{if(event.key === 'Escape')hideTooltip();});
document.addEventListener('pointerdown',event=>{if(tooltipOwner && !tooltipOwner.contains(event.target))hideTooltip();});
render();
