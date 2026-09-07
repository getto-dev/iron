// Evidence-based training engine for GymPro v3.
// The rules below intentionally separate evidence-backed defaults from
// heuristic starting loads. The app uses actual logged performance for
// progression instead of pretending accessory 1RM ratios are universal.

export const GOAL_CONFIG = {
  hypertrophy: {
    label: 'Гипертрофия',
    setsPerMusclePerWeek: 10,
    repMin: 6,
    repMax: 12,
    restSec: 120,
    targetRir: 2
  },
  strength: {
    label: 'Сила',
    setsPerMusclePerWeek: 6,
    repMin: 3,
    repMax: 6,
    restSec: 180,
    targetRir: 2,
    compoundPercent: 0.82
  },
  endurance: {
    label: 'Выносливость',
    setsPerMusclePerWeek: 8,
    repMin: 12,
    repMax: 20,
    restSec: 60,
    targetRir: 2
  }
};

export const EXPERIENCE_CONFIG = {
  novice: { label: 'Начинающий', setMultiplier: 0.8 },
  intermediate: { label: 'Средний', setMultiplier: 1 },
  advanced: { label: 'Продвинутый', setMultiplier: 1.1 }
};

export const EXERCISES = [
  { id: 'smith-bench', name: 'Жим лёжа в Смите', muscleGroups: ['chest', 'triceps'], type: 'compound', anchor: 'bench1rm', equipment: 'smith', cue: 'Лопатки сведены, стопы устойчивы, контролируй опускание.' },
  { id: 'squat', name: 'Приседания со штангой', muscleGroups: ['quads', 'glutes'], type: 'compound', anchor: 'squat1rm', equipment: 'barbell', cue: 'Колени следуют за носками, корпус стабилен, глубина контролируема.' },
  { id: 'deadlift', name: 'Становая тяга', muscleGroups: ['back', 'hamstrings', 'glutes'], type: 'compound', anchor: 'deadlift1rm', equipment: 'barbell', cue: 'Штанга близко к телу, нейтральный позвоночник, толкай пол ногами.' },
  { id: 'incline-smith', name: 'Наклонный жим в Смите', muscleGroups: ['chest', 'triceps'], type: 'compound', anchor: 'bench1rm', equipment: 'smith', cue: 'Умеренный наклон, стабильные лопатки, полный контролируемый диапазон.' },
  { id: 'lat-pulldown', name: 'Тяга верхнего блока', muscleGroups: ['back', 'biceps'], type: 'compound', equipment: 'cable', cue: 'Локти направляются вниз, без раскачки корпуса.' },
  { id: 'leg-press', name: 'Жим ногами', muscleGroups: ['quads', 'glutes'], type: 'compound', equipment: 'machine', cue: 'Стопы устойчивы, колени не проваливаются внутрь, без блокировки.' },
  { id: 'row', name: 'Горизонтальная тяга', muscleGroups: ['back'], type: 'compound', equipment: 'cable', cue: 'Тяни локтями, сохраняй стабильный корпус.' },
  { id: 'leg-curl', name: 'Сгибания ног лёжа', muscleGroups: ['hamstrings'], type: 'isolation', equipment: 'machine', cue: 'Таз прижат, движение плавное, без инерции.' },
  { id: 'leg-extension', name: 'Разгибания ног', muscleGroups: ['quads'], type: 'isolation', equipment: 'machine', cue: 'Контролируй весь диапазон, не используй рывок.' },
  { id: 'pec-deck', name: 'Сведение в тренажёре', muscleGroups: ['chest'], type: 'isolation', equipment: 'machine', cue: 'Своди руки за счёт грудных, удерживай короткую паузу.' },
  { id: 'lateral-raise', name: 'Разведения гантелей в стороны', muscleGroups: ['shoulders'], type: 'isolation', equipment: 'dumbbell', cue: 'Локти мягкие, поднимай в контролируемой плоскости.' },
  { id: 'rear-delt', name: 'Разведения на заднюю дельту', muscleGroups: ['shoulders'], type: 'isolation', equipment: 'machine', cue: 'Не раскачивайся, двигай руками за счёт задней дельты.' },
  { id: 'biceps-curl', name: 'Сгибания рук', muscleGroups: ['biceps'], type: 'isolation', equipment: 'cable', cue: 'Локти стабильны, полная амплитуда без читинга.' },
  { id: 'triceps-pushdown', name: 'Разгибания рук на блоке', muscleGroups: ['triceps'], type: 'isolation', equipment: 'cable', cue: 'Локти рядом с корпусом, полное разгибание.' },
  { id: 'calf-raise', name: 'Подъёмы на носки стоя', muscleGroups: ['calves'], type: 'isolation', equipment: 'machine', cue: 'Пауза внизу и вверху, не отбивайся пружиной.' }
];

const SPLITS = {
  A: ['chest', 'back', 'quads', 'hamstrings'],
  B: ['shoulders', 'biceps', 'triceps', 'quads'],
  C: ['chest', 'back', 'glutes', 'hamstrings', 'calves']
};

export function epley1RM(weight, reps) {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0 || reps > 30) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function calcBMI(weight, height) {
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) return null;
  const value = weight / ((height / 100) ** 2);
  return Math.round(value * 10) / 10;
}

export function roundWeight(value, step = 2.5) {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(step, Math.round(value / step) * step);
}

export function validateProfile(profile) {
  const ranges = [
    ['weight', 30, 300],
    ['height', 120, 250],
    ['bench1rm', 5, 500],
    ['squat1rm', 5, 600],
    ['deadlift1rm', 5, 700]
  ];
  for (const [key, min, max] of ranges) {
    const value = Number(profile[key]);
    if (!Number.isFinite(value) || value < min || value > max) return { ok: false, field: key };
  }
  if (!['male', 'female'].includes(profile.gender)) return { ok: false, field: 'gender' };
  if (!['natural', 'enhanced'].includes(profile.status)) return { ok: false, field: 'status' };
  if (!['hypertrophy', 'strength', 'endurance'].includes(profile.goal)) return { ok: false, field: 'goal' };
  if (!['novice', 'intermediate', 'advanced'].includes(profile.experience)) return { ok: false, field: 'experience' };
  if (![2, 3, 4, 5, 6].includes(Number(profile.daysPerWeek))) return { ok: false, field: 'daysPerWeek' };
  return { ok: true };
}

function basePrescription(profile, exercise, previous) {
  const goal = GOAL_CONFIG[profile.goal];
  const experience = EXPERIENCE_CONFIG[profile.experience];
  let sets = Math.max(2, Math.round(goal.setsPerMusclePerWeek * experience.setMultiplier / 2));

  if (profile.goal === 'strength' && exercise.type === 'compound') sets = 3;
  if (profile.goal === 'endurance') sets = Math.max(2, Math.round(sets * 0.9));

  const repsMin = goal.repMin;
  const repsMax = goal.repMax;
  const targetRir = goal.targetRir;
  const restSec = goal.restSec;

  let targetWeight = null;
  if (previous?.bestWeight) {
    targetWeight = previous.bestWeight;
  } else if (exercise.anchor && profile[exercise.anchor]) {
    const pct = profile.goal === 'strength' && exercise.type === 'compound' ? 0.82 : profile.goal === 'hypertrophy' ? 0.72 : 0.58;
    targetWeight = roundWeight(profile[exercise.anchor] * pct);
  }

  return { sets, repsMin, repsMax, targetRir, restSec, targetWeight };
}

function findPrevious(history, exerciseId) {
  const entries = [];
  for (const session of history) {
    for (const exercise of session.exercises || []) {
      if (exercise.exerciseId === exerciseId && exercise.sets?.length) entries.push(exercise);
    }
  }
  entries.sort((a, b) => new Date(a.completedAt || 0) - new Date(b.completedAt || 0));
  const latest = entries.at(-1);
  if (!latest) return null;
  const best = latest.sets.reduce((acc, set) => Math.max(acc, Number(set.weight) || 0), 0);
  return { bestWeight: best || null, last: latest };
}

export function suggestNextWeight(exercise, completedSets, goal) {
  if (!completedSets?.length) return null;
  const config = GOAL_CONFIG[goal];
  const topReps = config.repMax;
  const allStrong = completedSets.every(set => Number(set.reps) >= topReps && Number(set.rir) >= config.targetRir);
  const lastWeight = Math.max(...completedSets.map(set => Number(set.weight) || 0));
  if (!allStrong || !lastWeight) return lastWeight || null;
  return roundWeight(lastWeight + 2.5);
}

export function buildPlan(profile, history = []) {
  const sessions = profile.daysPerWeek >= 3 ? ['A', 'B', 'C'] : ['A', 'B'];
  const plan = {};
  for (const split of sessions) {
    const muscleGroups = SPLITS[split];
    const used = new Set();
    plan[split] = [];
    for (const muscle of muscleGroups) {
      const candidates = EXERCISES.filter(ex => ex.muscleGroups.includes(muscle) && !used.has(ex.id));
      const exercise = candidates[0];
      if (!exercise) continue;
      used.add(exercise.id);
      const previous = findPrevious(history, exercise.id);
      const prescription = basePrescription(profile, exercise, previous);
      const next = previous?.last ? suggestNextWeight(exercise, previous.last.sets, profile.goal) : null;
      if (next) prescription.targetWeight = next;
      plan[split].push({ ...exercise, prescription });
    }
    if (profile.goal !== 'endurance') {
      const accessory = EXERCISES.find(ex => ex.type === 'isolation' && !used.has(ex.id));
      if (accessory) {
        used.add(accessory.id);
        plan[split].push({ ...accessory, prescription: basePrescription(profile, accessory, findPrevious(history, accessory.id)) });
      }
    }
  }
  return plan;
}

export function totalVolume(history) {
  return history.reduce((total, session) => total + (session.exercises || []).reduce((sum, ex) => sum + (ex.sets || []).reduce((v, set) => v + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0), 0);
}

export function estimated1RM(weight, reps) {
  return epley1RM(Number(weight), Number(reps));
}

export function muscleVolumeForWeek(history, muscleGroups, sinceMs = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - sinceMs;
  const groups = Object.fromEntries(muscleGroups.map(g => [g, 0]));
  for (const session of history) {
    if (new Date(session.startedAt).getTime() < cutoff) continue;
    for (const ex of session.exercises || []) {
      const sets = ex.sets?.length || 0;
      for (const group of ex.muscleGroups || []) if (group in groups) groups[group] += sets;
    }
  }
  return groups;
}
