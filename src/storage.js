export const STORAGE_KEYS = {
  profile: 'gympro_profile_v3',
  plan: 'gympro_plan_v3',
  activeWorkout: 'gympro_active_workout_v3',
  history: 'gympro_history_v3'
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadProfile: () => read(STORAGE_KEYS.profile, null),
  saveProfile: value => write(STORAGE_KEYS.profile, value),
  loadPlan: () => read(STORAGE_KEYS.plan, null),
  savePlan: value => write(STORAGE_KEYS.plan, value),
  loadActiveWorkout: () => read(STORAGE_KEYS.activeWorkout, null),
  saveActiveWorkout: value => write(STORAGE_KEYS.activeWorkout, value),
  clearActiveWorkout: () => localStorage.removeItem(STORAGE_KEYS.activeWorkout),
  loadHistory: () => read(STORAGE_KEYS.history, []),
  saveSession: session => write(STORAGE_KEYS.history, [...read(STORAGE_KEYS.history, []), session]),
  clearHistory: () => localStorage.removeItem(STORAGE_KEYS.history)
};
