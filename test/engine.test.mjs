import test from 'node:test';
import assert from 'node:assert/strict';
import { epley1RM, calcBMI, roundWeight, validateProfile, suggestNextWeight } from '../src/engine.js';

test('Epley 1RM', () => assert.equal(epley1RM(100, 10), 133.3));
test('BMI', () => assert.equal(calcBMI(80, 180), 24.7));
test('round weight', () => assert.equal(roundWeight(83.2), 82.5));
test('profile validation rejects impossible weight', () => assert.equal(validateProfile({weight:5,height:180,bench1rm:100,squat1rm:140,deadlift1rm:160,gender:'male',status:'natural',goal:'hypertrophy',experience:'intermediate',daysPerWeek:3}).ok, false));
test('progression increases weight only when top reps and target RIR are met', () => {
  assert.equal(suggestNextWeight({}, [{weight:80,reps:12,rir:2},{weight:80,reps:12,rir:2}], 'hypertrophy'), 82.5);
  assert.equal(suggestNextWeight({}, [{weight:80,reps:10,rir:2},{weight:80,reps:12,rir:1}], 'hypertrophy'), 80);
});
