import { buildPlan, epley1RM, calcBMI, validateProfile, totalVolume } from './src/engine.js';
import { storage } from './src/storage.js';

const defaults = { gender: 'male', status: 'natural', goal: 'hypertrophy', experience: 'intermediate', daysPerWeek: 3, weight: null, height: null, bench1rm: null, squat1rm: null, deadlift1rm: null };
let profile = { ...defaults, ...(storage.loadProfile() || {}) };
let plan = storage.loadPlan() || null;
let active = storage.loadActiveWorkout() || null;
let timer = { id: null, remaining: 0, total: 0 };

const $ = id => document.getElementById(id);
const show = id => { document.querySelectorAll('.screen').forEach(x => x.classList.remove('active')); $(id).classList.add('active'); window.scrollTo(0,0); };
const select = (group, value) => document.querySelectorAll(`[data-${group}]`).forEach(b => b.classList.toggle('selected', String(b.dataset[group]) === String(value)));

function bindChoices() {
  ['gender','status','experience','days','goal'].forEach(group => document.querySelectorAll(`[data-${group}]`).forEach(btn => btn.addEventListener('click', () => {
    const key = group === 'days' ? 'daysPerWeek' : group;
    profile[key] = group === 'days' ? Number(btn.dataset[group]) : btn.dataset[group];
    select(group, btn.dataset[group]);
  })));
}
function loadForm() {
  for (const key of ['weight','height','bench1rm','squat1rm','deadlift1rm']) if (profile[key] != null) $(key).value = profile[key];
  select('gender', profile.gender); select('status', profile.status); select('experience', profile.experience); select('days', profile.daysPerWeek); select('goal', profile.goal);
}
function readProfile() {
  for (const key of ['weight','height','bench1rm','squat1rm','deadlift1rm']) profile[key] = Number($(key).value);
  return profile;
}
function calc1RM() {
  const value = epley1RM(Number($('calc1rm-weight').value), Number($('calc1rm-reps').value));
  $('calc1rm-result').textContent = value ? `Прогнозируемый 1ПМ: ${value} кг` : 'Введите корректные вес и повторы';
}
function generate() {
  readProfile();
  const result = validateProfile(profile);
  if (!result.ok) { alert(`Проверьте поле: ${result.field}`); return; }
  plan = buildPlan(profile, storage.loadHistory());
  storage.saveProfile(profile); storage.savePlan(plan); renderPlan(); show('screen-training-select');
}
function renderPlan() {
  const bmi = calcBMI(profile.weight, profile.height);
  $('user-info').innerHTML = `<strong>${profile.weight} кг · ${profile.height} см</strong><br>ИМТ: ${bmi ?? '—'} · ${profile.experience} · ${profile.daysPerWeek} д/нед<br>Цель: <strong>${profile.goal}</strong>`;
  const box = $('training-buttons'); box.innerHTML = '';
  Object.entries(plan || {}).forEach(([type, exercises]) => {
    const b = document.createElement('button'); b.className = 'btn primary'; b.innerHTML = `<span class="btn-title">Тренировка ${type}</span><span class="btn-subtitle">${exercises.map(x => x.name).join(' · ')}</span>`; b.onclick = () => startTraining(type); box.appendChild(b);
  });
  updateStats();
}
function updateStats() {
  const history = storage.loadHistory(); const volume = totalVolume(history); const last = history.at(-1);
  $('stat-total').textContent = history.length; $('stat-volume').textContent = `${Math.round(volume)} кг`; $('stat-last').textContent = last ? new Date(last.startedAt).toLocaleDateString('ru-RU') : '—';
}
function startTraining(type, resume = false) {
  if (!plan?.[type]) return;
  if (!resume) active = { trainingType: type, startedAt: new Date().toISOString(), exerciseIndex: 0, exercises: plan[type].map(ex => ({ exerciseId: ex.id, name: ex.name, muscleGroups: ex.muscleGroups, sets: [] })) };
  storage.saveActiveWorkout(active); show('screen-exercise'); renderExercise();
}
function currentExercise() { return plan[active.trainingType][active.exerciseIndex]; }
function currentLog() { return active.exercises[active.exerciseIndex]; }
function renderExercise() {
  const ex = currentExercise(), log = currentLog(), p = ex.prescription; const done = log.sets.length;
  $('exercise-number').textContent = `${active.exerciseIndex + 1} / ${plan[active.trainingType].length}`; $('workout-progress-text').textContent = `${done}/${p.sets} подходов`;
  $('workout-progress-fill').style.width = `${Math.min(100, done / p.sets * 100)}%`;
  $('exercise-name').textContent = ex.name; $('exercise-muscle').textContent = ex.muscleGroups.join(', '); $('exercise-weight').textContent = p.targetWeight ? `${p.targetWeight} кг` : 'по самочувствию'; $('exercise-sets').textContent = p.sets; $('exercise-reps').textContent = `${p.repsMin}–${p.repsMax}`; $('exercise-rir').textContent = p.targetRir; $('exercise-rest').textContent = `Отдых: ${Math.round(p.restSec/60)} мин`;
  $('exercise-rpe').textContent = `RIR ${p.targetRir}`; $('exercise-cue').textContent = ex.cue;
  $('set-weight').value = p.targetWeight || ''; $('set-reps').value = ''; $('set-rir').value = p.targetRir;
  $('completed-sets').innerHTML = log.sets.map((s,i) => `<div class="history-card"><strong>Подход ${i+1}</strong><br>${s.weight} кг × ${s.reps} · RIR ${s.rir} · e1RM ${epley1RM(s.weight,s.reps)} кг</div>`).join('');
  $('prev-exercise').disabled = active.exerciseIndex === 0; $('next-exercise').textContent = active.exerciseIndex === plan[active.trainingType].length - 1 ? 'Завершить →' : 'Следующее →'; resetTimer(p.restSec);
}
function markSet() {
  const log = currentLog(), ex = currentExercise(), weight = Number($('set-weight').value), reps = Number($('set-reps').value), rir = Number($('set-rir').value);
  if (!weight || !reps || !Number.isFinite(rir) || rir < 0 || rir > 6) { alert('Введите вес, повторы и RIR.'); return; }
  if (log.sets.length >= ex.prescription.sets) { alert('Плановое число подходов уже выполнено.'); return; }
  log.sets.push({ weight, reps, rir, completedAt: new Date().toISOString() }); storage.saveActiveWorkout(active); renderExercise(); startTimer();
}
function nextExercise() {
  const log = currentLog(); const required = currentExercise().prescription.sets;
  if (log.sets.length < required) { alert(`Выполните ${required - log.sets.length} подход(а/ов) или вернитесь позже.`); return; }
  if (active.exerciseIndex < plan[active.trainingType].length - 1) { active.exerciseIndex++; storage.saveActiveWorkout(active); renderExercise(); } else finishWorkout();
}
function prevExercise() { if (active.exerciseIndex > 0) { active.exerciseIndex--; storage.saveActiveWorkout(active); renderExercise(); } }
function finishWorkout() {
  stopTimer(); const session = { ...active, finishedAt: new Date().toISOString() }; storage.saveSession(session); storage.clearActiveWorkout(); active = null; renderSummary(session); updateStats(); show('screen-summary');
}
function renderSummary(session) {
  const volume = session.exercises.reduce((sum,e) => sum + e.sets.reduce((v,s) => v + s.weight*s.reps,0),0); const sets = session.exercises.reduce((n,e)=>n+e.sets.length,0); const e1rm = Math.max(0,...session.exercises.flatMap(e=>e.sets.map(s=>epley1RM(s.weight,s.reps))));
  $('summary-card').innerHTML = `<div class="summary-row"><span>Дата</span><strong>${new Date(session.startedAt).toLocaleString('ru-RU')}</strong></div><div class="summary-row"><span>Подходов</span><strong>${sets}</strong></div><div class="summary-row"><span>Тоннаж</span><strong>${Math.round(volume)} кг</strong></div><div class="summary-row"><span>Лучший e1RM</span><strong>${Math.round(e1rm)} кг</strong></div>`;
}
function renderHistory() {
  const history = storage.loadHistory(); const volume = totalVolume(history); $('hist-total').textContent = history.length; $('hist-volume').textContent = `${Math.round(volume)} кг`;
  $('history-list').innerHTML = history.slice().reverse().map(s => `<div class="history-card"><strong>Тренировка ${s.trainingType}</strong><br>${new Date(s.startedAt).toLocaleString('ru-RU')} · ${s.exercises.reduce((n,e)=>n+e.sets.length,0)} подходов<br>${Math.round(s.exercises.reduce((v,e)=>v+e.sets.reduce((x,set)=>x+set.weight*set.reps,0),0))} кг</div>`).join('') || '<p class="empty-state">История пуста.</p>';
}
function clearHistory() { if (confirm('Удалить историю?')) { storage.clearHistory(); renderHistory(); updateStats(); } }
function resetTimer(sec) { stopTimer(); timer.remaining = sec; timer.total = sec; drawTimer(); }
function drawTimer() { const m = Math.floor(timer.remaining/60), s = timer.remaining%60; $('rest-timer-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function startTimer() { if (timer.id || timer.remaining <= 0) return; timer.id = setInterval(()=>{ timer.remaining--; drawTimer(); if(timer.remaining<=0){ stopTimer(); navigator.vibrate?.([100,60,100]); } },1000); }
function stopTimer() { if(timer.id){clearInterval(timer.id);timer.id=null;} }
function toggleTimer() { timer.id ? stopTimer() : startTimer(); }
function addTimer() { timer.remaining += 30; timer.total = Math.max(timer.total,timer.remaining); drawTimer(); }
function showProfile() { show('screen-questionnaire'); loadForm(); }

bindChoices(); loadForm();
$('calc1rm').onclick = calc1RM; $('calculate').onclick = generate; $('history').onclick = ()=>{renderHistory();show('screen-history')}; $('history-home').onclick = showProfile; $('clear-history').onclick = clearHistory; $('back-profile').onclick = showProfile; $('summary-home').onclick = ()=>{renderPlan();show('screen-training-select')}; $('mark-set').onclick = markSet; $('next-exercise').onclick = nextExercise; $('prev-exercise').onclick = prevExercise; $('cancel-workout').onclick = ()=>{storage.saveActiveWorkout(active);stopTimer();show('screen-training-select')}; $('timer-start').onclick = toggleTimer; $('timer-add').onclick = addTimer; $('timer-reset').onclick = ()=>resetTimer(currentExercise().prescription.restSec);
if (plan) renderPlan();
if (active && plan?.[active.trainingType]) { $('resume').style.display='block'; $('resume').onclick=()=>startTraining(active.trainingType,true); }
const params = new URLSearchParams(location.search); if(params.get('action')==='new') showProfile();
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
