// ==========================================
// GymPro Trainer — PWA v2.0
// Научно обоснованный расчёт тренировок (ACSM) с поддержкой статуса Natural / Enhanced
// ==========================================

// ---------- Глобальное состояние ----------
let userData = {
    gender: 'male',
    status: 'natural',
    goal: 'hypertrophy',
    weight: null,
    height: null,
    bench1rm: null,
    squat1rm: null,
    deadlift1rm: null
};

let program = { A: [], B: [], C: [] };
let currentTraining = null;
let currentExerciseIndex = 0;

// Состояние таймера отдыха
let restTimer = {
    intervalId: null,
    remaining: 0,
    total: 0
};

// Текущая выполненная тренировка (для записи прогресса)
let currentSession = {
    trainingType: null,
    startedAt: null,
    exercises: []
};

// ---------- КОНСТАНТЫ: ACSM-based параметры ----------
// Источник: ACSM Position Stand 2009 + мета-анализы Schoenfeld 2017, Brad Phillips 2021
// С поправкой на статус (Enhanced → увеличенный объём, выше %1RM на 2-5%, короче отдых на 15-30с)
const ACSM_PARAMS = {
    hypertrophy: {
        natural: {
            compound:  { pctMin: 0.65, pctMax: 0.80, setsMin: 3, setsMax: 5, repsMin: 6,  repsMax: 12, restMin: 90,  restMax: 120, rpe: '7-9' },
            isolation:  { pctMin: 0.55, pctMax: 0.70, setsMin: 3, setsMax: 4, repsMin: 8,  repsMax: 15, restMin: 60,  restMax: 90,  rpe: '7-9' }
        },
        enhanced: {
            compound:  { pctMin: 0.70, pctMax: 0.85, setsMin: 4, setsMax: 6, repsMin: 6,  repsMax: 12, restMin: 60,  restMax: 90,  rpe: '8-10' },
            isolation:  { pctMin: 0.60, pctMax: 0.75, setsMin: 4, setsMax: 5, repsMin: 8,  repsMax: 15, restMin: 45,  restMax: 75,  rpe: '8-10' }
        }
    },
    strength: {
        natural: {
            compound:  { pctMin: 0.85, pctMax: 0.95, setsMin: 4, setsMax: 5, repsMin: 3,  repsMax: 5,  restMin: 120, restMax: 180, rpe: '8-9' },
            isolation:  { pctMin: 0.70, pctMax: 0.80, setsMin: 3, setsMax: 4, repsMin: 6,  repsMax: 8,  restMin: 90,  restMax: 120, rpe: '7-8' }
        },
        enhanced: {
            compound:  { pctMin: 0.87, pctMax: 0.97, setsMin: 5, setsMax: 6, repsMin: 2,  repsMax: 5,  restMin: 90,  restMax: 150, rpe: '8-10' },
            isolation:  { pctMin: 0.75, pctMax: 0.85, setsMin: 3, setsMax: 4, repsMin: 5,  repsMax: 8,  restMin: 60,  restMax: 90,  rpe: '8-9' }
        }
    },
    endurance: {
        natural: {
            compound:  { pctMin: 0.50, pctMax: 0.65, setsMin: 2, setsMax: 3, repsMin: 12, repsMax: 20, restMin: 45,  restMax: 60,  rpe: '7-8' },
            isolation:  { pctMin: 0.40, pctMax: 0.55, setsMin: 2, setsMax: 3, repsMin: 15, repsMax: 25, restMin: 30,  restMax: 45,  rpe: '7-8' }
        },
        enhanced: {
            compound:  { pctMin: 0.55, pctMax: 0.70, setsMin: 3, setsMax: 4, repsMin: 12, repsMax: 20, restMin: 30,  restMax: 45,  rpe: '8-9' },
            isolation:  { pctMin: 0.45, pctMax: 0.60, setsMin: 3, setsMax: 4, repsMin: 15, repsMax: 25, restMin: 20,  restMax: 30,  rpe: '8-9' }
        }
    }
};

// Технические подсказки к упражнениям
const EXERCISE_CUES = {
    'Жим штанги лежа': 'Вдох в живот, сведение лопаток, траектория по диагонали к нижней части груди.',
    'Приседания со штангой': 'Глубина до параллели, колени по направлению носков,Neutral спины.',
    'Становая тяга': 'Срыв за счёт ног,Neutral позвоночника, фиксация лопаток в верхней точке.',
    'Армейский жим стоя': 'Вертикальная траектория, ягодицы и пресс напряжены, без прогиба в пояснице.',
    'Тяга штанги в наклоне': 'Тяга к низу живота за счёт сведения лопаток, без кругления спины.',
    'Подъём штанги на бицепс': 'Пиковое сокращение 1 сек в верхней точке, без читинга и раскачки.',
    'Французский жим лежа': 'Фиксация локтей, растяжение длинной головки трицепса.',
    'Жим лёжа в Смите': 'Контрольная пауза 1 сек на груди, касание нижней точки.',
    'Тяга верхнего блока': 'Тяга к верхней части груди, локти опускаются вниз и назад.',
    'Бабочка (грудь)': 'Пиковое сокращение в центре, контролируемый негатив 2 сек.',
    'Горизонтальная тяга': 'Сведение лопаток, пауза 1 сек в конечной точке.',
    'Пуловер на блоке': 'Прямые руки, работа широчайшими, без сгиба локтей.',
    'Жим ногами': 'Стопы на ширине плеч, колени по направлению носков, не запирать колени.',
    'Жим плечи в тренажёре': 'Полная амплитуда, контрольная пауза в верхней точке.',
    'Разведения на заднюю дельту': 'Локти чуть согнуты, фиксированный угол, работа дельтой.',
    'Сгибания рук на блоке': 'Фиксация локтей у корпуса, пиковое сокращение.',
    'Разгибания рук на блоке': 'Полное разгибание в нижней точке, фиксированные локти.',
    'Сгибания на Скотте': 'Изолированная работа бицепса, без читинга.',
    'Разгибания ног': 'Пиковое сокращение 1 сек в верхней точке, контрольный негатив.',
    'Наклонный жим в Смите': 'Угол 30°, траектория к верхней части груди.',
    'Тяга верхнего блока обратным хватом': 'Активная работа бицепса и широчайших.',
    'Сведение в бабочке': 'Пауза в центре 1 сек, контролируемое разведение.',
    'Тяга горизонтального блока одной рукой': 'Нейтральный хват, разворот корпуса минимален.',
    'Шраги в тренажёре': 'Плавный подъём плеч к ушам, пауза 1 сек, без круглений.',
    'Сгибания ног лёжа': 'Таз прижат, контрольный негатив, без инерции.',
    'Подъёмы на носки стоя': 'Пауза 2 сек в нижней точке для исключения инерции ахилла.',
    'Выпады с гантелями': 'Шаг средней длины, колено задней ноги к полу,Neutral корпуса.',
    'Гиперэкстензия': 'Neutral позвоночника, работа ягодиц и поясницы, без переразгибания.',
    'Тяга нижнего блока к поясу': 'Тяга локтями, пауза 1 сек в конечной точке.'
};

function getCue(name) {
    return EXERCISE_CUES[name] || 'Контрольная техника, дыхание синхронизировано с фазами.';
}

// ---------- Вспомогательные функции ----------
function setGender(gender) {
    userData.gender = gender;
    updateButtonSelection('gender', gender);
}

function setStatus(status) {
    userData.status = status;
    updateButtonSelection('status', status);
    // Визуальная индикация статуса
    const btnEnhanced = document.querySelector('[data-status="enhanced"]');
    if (btnEnhanced) {
        btnEnhanced.classList.toggle('enhanced-active', status === 'enhanced');
    }
}

function setGoal(goal) {
    userData.goal = goal;
    updateButtonSelection('goal', goal);
}

function updateButtonSelection(group, value) {
    document.querySelectorAll(`[data-${group}]`).forEach(btn => {
        btn.classList.toggle('selected', btn.dataset[group] === value);
    });
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
}

// ---------- Калькулятор 1ПМ (формула Эпли) ----------
// 1ПМ = вес × (1 + повторения / 30)
function epley1RM(weight, reps) {
    if (!weight || !reps || reps < 1) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function calc1RM() {
    const w = parseFloat(document.getElementById('calc1rm-weight').value);
    const r = parseInt(document.getElementById('calc1rm-reps').value, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0 || r > 30) {
        document.getElementById('calc1rm-result').textContent = 'Введите вес (кг) и повторы (1-30)';
        return;
    }
    const oneRM = epley1RM(w, r);
    document.getElementById('calc1rm-result').innerHTML =
        `<strong>Прогнозируемый 1ПМ: ${oneRM} кг</strong><br>
         <span class="calc-hint">Формула Эпли: 1ПМ = вес × (1 + повт / 30)</span>`;
}

function apply1RMToField(targetFieldId) {
    const w = parseFloat(document.getElementById('calc1rm-weight').value);
    const r = parseInt(document.getElementById('calc1rm-reps').value, 10);
    if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
    const oneRM = epley1RM(w, r);
    document.getElementById(targetFieldId).value = oneRM;
    document.getElementById('calc1rm-result').innerHTML =
        `<strong>Записано: ${oneRM} кг → в поле «${targetFieldId === 'bench1rm' ? 'Жим лежа' : targetFieldId === 'squat1rm' ? 'Присед' : 'Становая'}»</strong>`;
}

// ---------- ИМТ ----------
function calcBMI(weight, height) {
    if (!weight || !height) return null;
    const h = height / 100;
    const bmi = weight / (h * h);
    return Math.round(bmi * 10) / 10;
}

function bmiCategory(bmi) {
    if (bmi < 18.5) return 'Недостаток веса';
    if (bmi < 25) return 'Норма';
    if (bmi < 30) return 'Избыточный';
    return 'Ожирение';
}

// ---------- Округление веса ----------
function roundWeight(weight) {
    if (weight < 5) return Math.round(weight * 10) / 10;
    return Math.round(weight / 2.5) * 2.5;
}

// ---------- Основной алгоритм: расчёт параметров упражнения ----------
function getParams(isCompound) {
    const { gender, status, goal } = userData;
    const base = ACSM_PARAMS[goal][status][isCompound ? 'compound' : 'isolation'];

    // Среднее значение процента (берём середину диапазона)
    let percent = (base.pctMin + base.pctMax) / 2;

    // Количество подходов — середина диапазона
    let sets = Math.round((base.setsMin + base.setsMax) / 2);

    // Диапазон повторений
    let repsMin = base.repsMin;
    let repsMax = base.repsMax;

    // Время отдыха — середина диапазона (в секундах, для таймера)
    let restSec = Math.round((base.restMin + base.restMax) / 2);

    // Корректировка для женщин: -2.5% к интенсивности базы, +1 повтор
    if (gender === 'female') {
        percent = Math.max(0.40, percent - 0.025);
        repsMin = Math.min(repsMin + 1, 25);
        repsMax = Math.min(repsMax + 2, 30);
    }

    return {
        percent,
        percentInt: Math.round(percent * 100),
        sets,
        reps: `${repsMin}-${repsMax}`,
        repsMin,
        repsMax,
        restSec,
        restText: restSec >= 60 ? `${Math.floor(restSec / 60)} мин ${restSec % 60} сек` : `${restSec} сек`,
        restMin: base.restMin,
        restMax: base.restMax,
        rpe: base.rpe
    };
}

// ---------- Создание объекта упражнения ----------
function createExercise(name, muscle, baseMax, isCompound) {
    const p = getParams(isCompound);
    const weight = roundWeight(baseMax * p.percent);
    return {
        name,
        muscle,
        weight,
        pct: p.percentInt,
        sets: p.sets,
        reps: p.reps,
        repsMin: p.repsMin,
        repsMax: p.repsMax,
        restSec: p.restSec,
        restText: p.restText,
        restMin: p.restMin,
        restMax: p.restMax,
        rpe: p.rpe,
        cue: getCue(name),
        isCompound
    };
}

// ---------- Генерация программ A / B / C ----------
function generateProgram() {
    const { bench1rm, squat1rm, deadlift1rm, weight } = userData;

    // Тренировка A: Грудь + Спина + Ноги (база)
    program.A = [
        createExercise('Жим лёжа в Смите', 'Грудь, трицепс, передняя дельта', bench1rm, true),
        createExercise('Тяга верхнего блока', 'Широчайшие, бицепс', deadlift1rm * 0.55, true),
        createExercise('Приседания со штангой', 'Квадрицепс, ягодицы', squat1rm * 0.85, true),
        createExercise('Бабочка (грудь)', 'Грудь', bench1rm * 0.40, false),
        createExercise('Горизонтальная тяга', 'Спина', deadlift1rm * 0.45, false),
        createExercise('Пуловер на блоке', 'Широчайшие', deadlift1rm * 0.30, false),
        createExercise('Разгибания ног', 'Квадрицепс', squat1rm * 0.30, false),
        createExercise('Сгибания ног лёжа', 'Бицепс бедра', squat1rm * 0.22, false),
        createExercise('Подъёмы на носки стоя', 'Икроножные', (weight || 80) * 1.2 + squat1rm * 0.25, false)
    ];

    // Тренировка B: Плечи + Руки + Ноги (вспомогательные)
    program.B = [
        createExercise('Армейский жим стоя', 'Дельтовидные, трицепс', bench1rm * 0.62, true),
        createExercise('Тяга штанги в наклоне', 'Широчайшие, ромбовидные', deadlift1rm * 0.50, true),
        createExercise('Жим ногами', 'Квадрицепс, ягодицы', squat1rm * 1.5, true),
        createExercise('Жим плечи в тренажёре', 'Дельтовидные', bench1rm * 0.55, false),
        createExercise('Разведения на заднюю дельту', 'Задняя дельта', bench1rm * 0.22, false),
        createExercise('Сгибания рук на блоке', 'Бицепс', deadlift1rm * 0.20, false),
        createExercise('Разгибания рук на блоке', 'Трицепс', bench1rm * 0.32, false),
        createExercise('Сгибания на Скотте', 'Бицепс', deadlift1rm * 0.18, false),
        createExercise('Французский жим лежа', 'Трицепс', bench1rm * 0.30, false)
    ];

    // Тренировка C: Грудь (верх) + Спина (ширина) + Задняя цепь
    program.C = [
        createExercise('Наклонный жим в Смите', 'Верх груди, трицепс', bench1rm * 0.70, true),
        createExercise('Тяга верхнего блока обратным хватом', 'Спина, бицепс', deadlift1rm * 0.50, true),
        createExercise('Становая тяга', 'Спина, задняя цепь', deadlift1rm, true),
        createExercise('Сведение в бабочке', 'Грудь', bench1rm * 0.35, false),
        createExercise('Тяга горизонтального блока одной рукой', 'Спина', deadlift1rm * 0.30, false),
        createExercise('Шраги в тренажёре', 'Трапеции', deadlift1rm * 0.45, false),
        createExercise('Гиперэкстензия', 'Поясница, ягодицы', (weight || 80) * 0.6, false),
        createExercise('Выпады с гантелями', 'Квадрицепс, ягодицы', squat1rm * 0.40, false),
        createExercise('Сгибания ног лёжа', 'Бицепс бедра', squat1rm * 0.22, false)
    ];
}

// ---------- Расчёт программы при нажатии кнопки ----------
function calculateProgram() {
    if (!collectFormData()) return;
    generateProgram();
    showScreen('screen-training-select');
    updateUserSummary();
    updateProgressStats();
}

function updateUserSummary() {
    const gender = userData.gender === 'male' ? 'Мужчина' : 'Женщина';
    const status = userData.status === 'enhanced' ? 'Химик' : 'Натурал';
    const goalMap = { hypertrophy: 'Гипертрофия', strength: 'Сила', endurance: 'Выносливость' };
    const bmi = calcBMI(userData.weight, userData.height);
    const bmiCat = bmi ? bmiCategory(bmi) : '—';

    document.getElementById('user-info').innerHTML =
        `<strong>${gender}, ${userData.weight} кг, ${userData.height} см</strong><br>
         ИМТ: ${bmi || '—'} (${bmiCat})<br>
         Статус: <span class="status-badge ${userData.status}">${status}</span><br>
         Цель: <strong>${goalMap[userData.goal]}</strong>`;
}

// ---------- Проверка и сбор данных ----------
function collectFormData() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const bench = parseFloat(document.getElementById('bench1rm').value);
    const squat = parseFloat(document.getElementById('squat1rm').value);
    const deadlift = parseFloat(document.getElementById('deadlift1rm').value);

    if (isNaN(weight) || isNaN(height) || isNaN(bench) || isNaN(squat) || isNaN(deadlift)) {
        alert('Пожалуйста, заполните все числовые поля.');
        return false;
    }
    if ([weight, height, bench, squat, deadlift].some(v => v <= 0)) {
        alert('Значения должны быть положительными.');
        return false;
    }
    userData.weight = weight;
    userData.height = height;
    userData.bench1rm = bench;
    userData.squat1rm = squat;
    userData.deadlift1rm = deadlift;
    return true;
}

// ---------- Запуск тренировки ----------
function startTraining(type) {
    currentTraining = type;
    currentExerciseIndex = 0;
    currentSession = {
        trainingType: type,
        startedAt: new Date().toISOString(),
        exercises: []
    };
    showScreen('screen-exercise');
    displayExercise();
}

// ---------- Отображение текущего упражнения ----------
function displayExercise() {
    const ex = program[currentTraining][currentExerciseIndex];
    const total = program[currentTraining].length;

    document.getElementById('exercise-number').textContent = `${currentExerciseIndex + 1} / ${total}`;
    document.getElementById('exercise-name').textContent = ex.name;
    document.getElementById('exercise-muscle').textContent = ex.muscle;
    document.getElementById('exercise-weight').textContent = ex.weight;
    document.getElementById('exercise-sets').textContent = ex.sets;
    document.getElementById('exercise-reps').textContent = ex.reps;
    document.getElementById('exercise-rest').textContent = `Отдых: ${ex.restText}`;
    document.getElementById('exercise-pct').textContent = `${ex.pct}% 1ПМ`;
    document.getElementById('exercise-rpe').textContent = `RPE ${ex.rpe}`;
    document.getElementById('exercise-cue').textContent = ex.cue;

    // Кнопка next/finish
    const nextBtn = document.getElementById('btn-next-exercise');
    if (currentExerciseIndex === total - 1) {
        nextBtn.textContent = 'ЗАВЕРШИТЬ ТРЕНИРОВКУ';
    } else {
        nextBtn.textContent = 'Следующее упражнение →';
    }

    // Прогресс-бар тренировки
    const progressPercent = ((currentExerciseIndex + 1) / total) * 100;
    document.getElementById('workout-progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('workout-progress-text').textContent = `${currentExerciseIndex + 1} / ${total}`;

    // Сброс таймера при смене упражнения
    stopRestTimer();
    setRestTimerFromExercise(ex);
}

function setRestTimerFromExercise(ex) {
    restTimer.remaining = ex.restSec;
    restTimer.total = ex.restSec;
    updateRestTimerDisplay();
}

// ---------- Таймер отдыха ----------
function startRestTimer() {
    if (restTimer.intervalId) return;
    if (restTimer.remaining <= 0) {
        restTimer.remaining = restTimer.total || 60;
    }
    restTimer.intervalId = setInterval(() => {
        restTimer.remaining--;
        updateRestTimerDisplay();
        if (restTimer.remaining <= 0) {
            stopRestTimer();
            // Вибрация и уведомление
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            playBeep();
        }
    }, 1000);
    document.getElementById('btn-timer-start').textContent = '⏸ Пауза';
}

function pauseRestTimer() {
    if (restTimer.intervalId) {
        clearInterval(restTimer.intervalId);
        restTimer.intervalId = null;
        document.getElementById('btn-timer-start').textContent = '▶ Продолжить';
    }
}

function toggleRestTimer() {
    if (restTimer.intervalId) pauseRestTimer();
    else startRestTimer();
}

function stopRestTimer() {
    if (restTimer.intervalId) {
        clearInterval(restTimer.intervalId);
        restTimer.intervalId = null;
    }
    const btn = document.getElementById('btn-timer-start');
    if (btn) btn.textContent = '▶ Старт';
}

function addRestTime(seconds) {
    restTimer.remaining += seconds;
    restTimer.total += seconds;
    updateRestTimerDisplay();
}

function resetRestTimer() {
    stopRestTimer();
    const ex = program[currentTraining][currentExerciseIndex];
    if (ex) setRestTimerFromExercise(ex);
}

function updateRestTimerDisplay() {
    const m = Math.floor(restTimer.remaining / 60);
    const s = restTimer.remaining % 60;
    const display = document.getElementById('rest-timer-display');
    if (display) {
        display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        // Цветовая индикация
        const ratio = restTimer.total > 0 ? restTimer.remaining / restTimer.total : 0;
        display.classList.toggle('timer-warning', ratio < 0.25 && ratio > 0);
        display.classList.toggle('timer-done', restTimer.remaining <= 0);
    }
    // Круговой прогресс
    const ring = document.getElementById('timer-ring-progress');
    if (ring) {
        const circumference = 2 * Math.PI * 45;
        const ratio = restTimer.total > 0 ? restTimer.remaining / restTimer.total : 0;
        ring.style.strokeDashoffset = circumference * (1 - ratio);
    }
}

function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) { /* silent */ }
}

// ---------- Отметка подхода выполненным ----------
function markSetDone() {
    const ex = program[currentTraining][currentExerciseIndex];
    const entry = {
        name: ex.name,
        weight: ex.weight,
        sets: ex.sets,
        reps: ex.reps,
        completedAt: new Date().toISOString()
    };
    currentSession.exercises.push(entry);

    // Визуальная обратная связь
    const btn = document.getElementById('btn-mark-set');
    const original = btn.textContent;
    btn.textContent = '✓ Записано!';
    btn.classList.add('done-flash');
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('done-flash');
    }, 1200);

    // Авто-старт таймера
    if (!restTimer.intervalId && restTimer.remaining > 0) {
        startRestTimer();
    }
}

// ---------- Переход между упражнениями ----------
function nextExercise() {
    if (!currentTraining) return;
    const total = program[currentTraining].length;
    if (currentExerciseIndex < total - 1) {
        currentExerciseIndex++;
        displayExercise();
    } else {
        // Завершение тренировки
        finishWorkout();
    }
}

function prevExercise() {
    if (!currentTraining || currentExerciseIndex === 0) return;
    currentExerciseIndex--;
    displayExercise();
}

function finishWorkout() {
    stopRestTimer();
    // Сохраняем в историю
    const sessionToSave = {
        ...currentSession,
        finishedAt: new Date().toISOString(),
        totalExercises: currentSession.exercises.length
    };
    saveSession(sessionToSave);
    showScreen('screen-summary');
    renderSummary(sessionToSave);
    updateProgressStats();
}

function renderSummary(session) {
    const total = program[currentTraining].length;
    const done = session.totalExercises;
    document.getElementById('summary-count').textContent = `${done} / ${total}`;
    document.getElementById('summary-date').textContent = new Date(session.startedAt).toLocaleString('ru-RU');
    // Объём нагрузки
    let volume = 0;
    session.exercises.forEach(e => {
        const reps = parseInt(e.reps) || 8;
        volume += e.weight * e.sets * reps;
    });
    document.getElementById('summary-volume').textContent = `${Math.round(volume)} кг`;
}

// ---------- Прогресс-трекинг (localStorage) ----------
const STORAGE_KEY = 'gympro_sessions_v2';

function loadSessions() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) { return []; }
}

function saveSession(session) {
    const sessions = loadSessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function clearHistory() {
    if (confirm('Удалить всю историю тренировок?')) {
        localStorage.removeItem(STORAGE_KEY);
        updateProgressStats();
        renderHistory();
    }
}

function updateProgressStats() {
    const sessions = loadSessions();
    const totalVolume = sessions.reduce((sum, s) => {
        return sum + (s.exercises || []).reduce((v, e) => {
            const reps = parseInt(e.reps) || 8;
            return v + e.weight * e.sets * reps;
        }, 0);
    }, 0);

    // Последняя тренировка
    const last = sessions[sessions.length - 1];
    const lastText = last
        ? new Date(last.startedAt).toLocaleDateString('ru-RU')
        : '—';

    // Обновляем stats на экране выбора тренировки
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setText('stat-total', sessions.length);
    setText('stat-volume', `${Math.round(totalVolume)} кг`);
    setText('stat-last', lastText);

    // Дублируем на экран истории (если открыт)
    setText('hist-stat-total', sessions.length);
    setText('hist-stat-volume', `${Math.round(totalVolume)} кг`);
}

function showHistory() {
    showScreen('screen-history');
    renderHistory();
    updateProgressStats();
}

function renderHistory() {
    const sessions = loadSessions().slice().reverse();
    const container = document.getElementById('history-list');
    if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-state">История пуста. Завершите первую тренировку!</p>';
        return;
    }
    container.innerHTML = sessions.map((s, idx) => {
        const date = new Date(s.startedAt).toLocaleString('ru-RU');
        const done = s.totalExercises || 0;
        const total = program[s.trainingType] ? program[s.trainingType].length : '—';
        return `
            <div class="history-card">
                <div class="history-header">
                    <span class="history-badge">Тренировка ${s.trainingType}</span>
                    <span class="history-date">${date}</span>
                </div>
                <div class="history-stat">Выполнено упражнений: ${done} / ${total}</div>
                <div class="history-stat">Записанных подходов: ${(s.exercises || []).length}</div>
            </div>
        `;
    }).join('');
}

// ---------- Навигация ----------
function backToTrainingSelect() {
    stopRestTimer();
    showScreen('screen-training-select');
    updateUserSummary();
}

function backToQuestionnaire() {
    stopRestTimer();
    showScreen('screen-questionnaire');
}

// ---------- PWA: Install prompt ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btn-install');
    if (btn) {
        btn.style.display = 'block';
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                btn.style.display = 'none';
            }
            deferredPrompt = null;
        });
    }
});

window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('btn-install');
    if (btn) btn.style.display = 'none';
});

// ---------- Service Worker registration ----------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('[PWA] SW registered', reg.scope))
            .catch(err => console.warn('[PWA] SW registration failed', err));
    });
}

// ---------- Инициализация ----------
document.addEventListener('DOMContentLoaded', () => {
    setGender('male');
    setStatus('natural');
    setGoal('hypertrophy');
    updateProgressStats();
});
