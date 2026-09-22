/**
 * 决策引擎与热量纯函数最小单测（无外部依赖）
 * 运行: npm test
 */

const assert = require('assert');
const {
  decideExercisePlan,
  isRecoveryDay,
  ABSOLUTE_MIN_DURATION,
  ABSOLUTE_MIN_CALORIE
} = require('../services/route/decision');
const {
  calculateBMR,
  calculateTDEE,
  calculateBaseMetabolism,
  calculateNetCalories
} = require('../services/calorieCalculatorService');
const { resolveIntensityPreference } = require('../config/constants');
const {
  canUseNearbyPOI,
  isCoarseLocation,
  getLocationByIP
} = require('../services/route/locationResolver');
const { env } = require('../config/env');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('decision engine');
  await test('recovery day when calorie balance < -300', () => {
    assert.strictEqual(isRecoveryDay({ intake: 100, consume: 500 }), true);
    assert.strictEqual(isRecoveryDay({ intake: 1500, consume: 200 }), false);
  });

  await test('relaxed plan stays in short duration range', () => {
    const plan = decideExercisePlan({
      user: {
        goalOrientation: 'maintain',
        exerciseFeeling: 'relaxed',
        bodyStats: { weight: 65 }
      },
      todayStats: { intake: 1200, consume: 0 },
      preferences: { sportType: 'walk' }
    });
    assert.ok(plan.durationRange[0] >= ABSOLUTE_MIN_DURATION);
    assert.ok(plan.durationRange[1] <= 20);
    assert.ok(plan.calorieRange[0] >= ABSOLUTE_MIN_CALORIE);
    assert.strictEqual(plan.intensity, 'relaxed');
    assert.ok(Array.isArray(plan.durationRange) && plan.durationRange.length === 2);
  });

  await test('intense maps to challenging and longer range', () => {
    const plan = decideExercisePlan({
      user: {
        goalOrientation: 'lose',
        exerciseFeeling: 'intense',
        bodyStats: { weight: 70 }
      },
      todayStats: { intake: 2000, consume: 0 },
      preferences: { sportType: 'run' }
    });
    assert.strictEqual(plan.intensity, 'challenging');
    assert.ok(plan.durationRange[0] >= 15);
  });

  await test('LLM must not invent: plan has fixed numeric fields', () => {
    const plan = decideExercisePlan({
      user: { exerciseFeeling: 'moderate', bodyStats: { weight: 65 } },
      todayStats: {},
      preferences: {}
    });
    assert.ok(typeof plan.targetDuration === 'number');
    assert.ok(typeof plan.estimatedCalories === 'number');
    assert.ok(typeof plan.burnCap === 'number');
  });

  console.log('intensity resolve');
  await test('exerciseFeeling preferred over legacy names', () => {
    assert.strictEqual(
      resolveIntensityPreference({
        exerciseFeeling: 'relaxed',
        exerciseIntensityPreference: 'challenging'
      }),
      'relaxed'
    );
    assert.strictEqual(
      resolveIntensityPreference({ exerciseIntensityPreference: 'intense' }),
      'challenging'
    );
  });

  console.log('location semantics');
  await test('IP/default sources are coarse — no place/around', () => {
    assert.strictEqual(isCoarseLocation({ level: 'L1', source: 'ip_location' }), true);
    assert.strictEqual(canUseNearbyPOI({ level: 'L1', source: 'ip_location' }), false);
    assert.strictEqual(canUseNearbyPOI({ level: 'L2', source: 'request' }), true);
    assert.strictEqual(canUseNearbyPOI({ level: 'L3', source: 'request' }), true);
  });

  await test('local IP respects MOCK_CITY (same as resolveLocation)', async () => {
    const prev = {
      mockCity: env.mockCity,
      mockAdcode: env.mockAdcode,
      mockLat: env.mockLat,
      mockLng: env.mockLng
    };
    env.mockCity = '杭州';
    env.mockAdcode = '330100';
    env.mockLat = 30.2741;
    env.mockLng = 120.1551;
    try {
      const loc = await getLocationByIP('127.0.0.1');
      assert.strictEqual(loc.source, 'mock');
      assert.strictEqual(loc.level, 'L1');
      assert.strictEqual(loc.city, '杭州');
      assert.strictEqual(canUseNearbyPOI(loc), false);
    } finally {
      Object.assign(env, prev);
    }
  });

  console.log('calorie math');
  await test('BMR / TDEE / net calories', () => {
    const bmr = calculateBMR({ weight: 70, height: 175, age: 30, gender: 'male' });
    assert.ok(bmr > 1500 && bmr < 1800);
    const tdee = calculateTDEE(bmr, 'moderate');
    assert.ok(tdee > bmr);
    const base = calculateBaseMetabolism(bmr, 'moderate');
    assert.ok(base > bmr && base < tdee);
    assert.strictEqual(calculateNetCalories(2000, 300, 1800), -100);
  });

  if (process.exitCode) {
    console.error('\nSome tests failed');
  } else {
    console.log('\nAll tests passed');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
