// Глобальные переменные
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

let program = {
    A: [],
    B: [],
    C: []
};

let currentTraining = null; // 'A', 'B' или 'C'
let currentExerciseIndex = 0;

// Установка пола
function setGender(gender) {
    userData.gender = gender;
    updateButtonSelection('gender', gender);
}

// Установка статуса
function setStatus(status) {
    userData.status = status;
    updateButtonSelection('status', status);
}

// Установка цели
function setGoal(goal) {
    userData.goal = goal;
    updateButtonSelection('goal', goal);
}

// Вспомогательная функция для визуального выделения кнопок
function updateButtonSelection(group, value) {
    document.querySelectorAll(`[data-${group}]`).forEach(btn => {
        if (btn.dataset[group] === value) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

// Переключение экранов
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Проверка и сбор данных из полей
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

// Округление веса до ближайших 2.5 кг (или 1 кг для малых весов)
function roundWeight(weight) {
    if (weight < 5) return Math.round(weight);
    return Math.round(weight / 2.5) * 2.5;
}

// Получение параметров тренировки (процент, подходы, повторения, отдых)
function getParams(isCompound) {
    const { gender, status, goal } = userData;
    let percent, sets, reps, rest;

    // Определяем базовые проценты в зависимости от цели и статуса
    if (goal === 'hypertrophy') {
        if (isCompound) {
            if (status === 'enhanced') {
                percent = 0.80;
                sets = 5;
                reps = '6-8';
                rest = '75 сек';
            } else {
                percent = 0.75;
                sets = 4;
                reps = '6-8';
                rest = '90 сек';
            }
        } else {
            if (status === 'enhanced') {
                percent = 0.70;
                sets = 4;
                reps = '10-12';
                rest = '60 сек';
            } else {
                percent = 0.65;
                sets = 3;
                reps = '10-12';
                rest = '60 сек';
            }
        }
    } else if (goal === 'strength') {
        if (isCompound) {
            if (status === 'enhanced') {
                percent = 0.90;
                sets = 5;
                reps = '3-5';
                rest = '120 сек';
            } else {
                percent = 0.85;
                sets = 4;
                reps = '3-5';
                rest = '150 сек';
            }
        } else {
            if (status === 'enhanced') {
                percent = 0.80;
                sets = 3;
                reps = '6-8';
                rest = '90 сек';
            } else {
                percent = 0.75;
                sets = 3;
                reps = '6-8';
                rest = '90 сек';
            }
        }
    } else if (goal === 'endurance') {
        if (isCompound) {
            if (status === 'enhanced') {
                percent = 0.60;
                sets = 3;
                reps = '12-15';
                rest = '45 сек';
            } else {
                percent = 0.55;
                sets = 3;
                reps = '12-15';
                rest = '60 сек';
            }
        } else {
            if (status === 'enhanced') {
                percent = 0.50;
                sets = 3;
                reps = '15-20';
                rest = '30 сек';
            } else {
                percent = 0.45;
                sets = 2;
                reps = '15-20';
                rest = '45 сек';
            }
        }
    } else {
        // fallback
        percent = 0.75;
        sets = 4;
        reps = '8-10';
        rest = '90 сек';
    }

    // Корректировка для женщин: немного ниже интенсивность, больше повторений
    if (gender === 'female') {
        percent *= 0.95;
        if (reps.includes('-')) {
            let [low, high] = reps.split('-').map(Number);
            low = Math.min(low + 2, 30);
            high = Math.min(high + 2, 30);
            reps = `${low}-${high}`;
        }
    }

    return { percent, sets, reps, rest };
}

// Генерация всех трёх тренировок
function generateProgram() {
    const { bench1rm, squat1rm, deadlift1rm } = userData;

    // Тренировка A
    program.A = [
        createExercise('Жим лёжа в Смите', 'Грудь, трицепс', bench1rm, true),
        createExercise('Тяга верхнего блока', 'Широчайшие, бицепс', deadlift1rm * 0.6, true),
        createExercise('Бабочка (грудь)', 'Грудь', bench1rm * 0.4, false),
        createExercise('Горизонтальная тяга', 'Спина', deadlift1rm * 0.7, false),
        createExercise('Пуловер на блоке', 'Широчайшие', deadlift1rm * 0.3, false),
        createExercise('Жим ногами', 'Квадрицепс, ягодицы', squat1rm * 1.8, true)
    ];

    // Тренировка B
    program.B = [
        createExercise('Жим плечи в тренажёре', 'Дельтовидные', bench1rm * 0.6, true),
        createExercise('Разведения на заднюю дельту', 'Задняя дельта', bench1rm * 0.25, false),
        createExercise('Сгибания рук на блоке', 'Бицепс', deadlift1rm * 0.25, false),
        createExercise('Разгибания рук на блоке', 'Трицепс', bench1rm * 0.35, false),
        createExercise('Сгибания на Скотте', 'Бицепс', deadlift1rm * 0.2, false),
        createExercise('Разгибания ног', 'Квадрицепс', squat1rm * 0.3, false)
    ];

    // Тренировка C
    program.C = [
        createExercise('Наклонный жим в Смите', 'Верх груди', bench1rm * 0.7, true),
        createExercise('Тяга верхнего блока обратным хватом', 'Спина, бицепс', deadlift1rm * 0.55, true),
        createExercise('Сведение в бабочке', 'Грудь', bench1rm * 0.4, false),
        createExercise('Тяга горизонтального блока одной рукой', 'Спина', deadlift1rm * 0.35, false),
        createExercise('Шраги в тренажёре', 'Трапеции', deadlift1rm * 0.5, false),
        createExercise('Сгибания ног лёжа', 'Бицепс бедра', squat1rm * 0.25, false)
    ];
}

// Создание объекта упражнения
function createExercise(name, muscle, baseMax, isCompound) {
    const { percent, sets, reps, rest } = getParams(isCompound);
    const weight = roundWeight(baseMax * percent);
    return { name, muscle, weight, sets, reps, rest };
}

// Расчёт программы при нажатии кнопки
function calculateProgram() {
    if (!collectFormData()) return;
    generateProgram();
    showScreen('screen-training-select');
    document.getElementById('user-info').textContent =
        `${userData.gender === 'male' ? 'Мужчина' : 'Женщина'}, ${userData.weight} кг, ${userData.height} см, ` +
        `${userData.status === 'enhanced' ? 'Химик' : 'Натурал'}, цель: ${userData.goal === 'hypertrophy' ? 'Гипертрофия' : userData.goal === 'strength' ? 'Сила' : 'Выносливость'}`;
}

// Начало тренировки
function startTraining(type) {
    currentTraining = type;
    currentExerciseIndex = 0;
    showScreen('screen-exercise');
    displayExercise();
}

// Отображение текущего упражнения
function displayExercise() {
    const ex = program[currentTraining][currentExerciseIndex];
    document.getElementById('exercise-number').textContent =
        `${currentExerciseIndex + 1} / ${program[currentTraining].length}`;
    document.getElementById('exercise-name').textContent = ex.name;
    document.getElementById('exercise-muscle').textContent = ex.muscle;
    document.getElementById('exercise-weight').textContent = ex.weight;
    document.getElementById('exercise-sets').textContent = ex.sets;
    document.getElementById('exercise-reps').textContent = ex.reps;
    document.getElementById('exercise-rest').textContent = `Отдых: ${ex.rest}`;
}

// Переход к следующему упражнению
function nextExercise() {
    if (!currentTraining) return;
    currentExerciseIndex = (currentExerciseIndex + 1) % program[currentTraining].length;
    displayExercise();
}

// Назад к списку тренировок
function backToTrainingSelect() {
    showScreen('screen-training-select');
}

// Назад к анкете
function backToQuestionnaire() {
    showScreen('screen-questionnaire');
}

// Инициализация: установить значения по умолчанию
document.addEventListener('DOMContentLoaded', () => {
    setGender('male');
    setStatus('natural');
    setGoal('hypertrophy');
});