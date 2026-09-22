/**
 * 纯函数单测：ExecutionMemory + LocationRanker（无需 DB / 外网）
 * 运行：node src/test/testRecommendStep1.js
 */

const assert = require('assert');
const { buildMemoryFromRoutes, coarseType } = require('../MCP/executionMemory');
const { rankLocationCandidates } = require('../MCP/locationRanker');

function testCoarseType() {
  assert.strictEqual(coarseType('风景名胜;公园广场;公园'), 'park');
  assert.strictEqual(coarseType('购物服务;商场'), 'shopping');
  assert.ok(coarseType('110101').length > 0);
  console.log('✓ coarseType');
}

function testLowCompletionShortens() {
  const routes = Array.from({ length: 7 }, (_, i) => ({
    status: 'cancelled',
    distance: 3000,
    selectedPOI: { name: `P${i}`, type: '公园' },
    endLocation: { lat: 30 + i * 0.001, lng: 120, poiName: `P${i}`, poiType: '公园' }
  }));
  const mem = buildMemoryFromRoutes(routes);
  assert.strictEqual(mem.sampleSize, 7);
  assert.ok(mem.completionRate < 0.4);
  assert.ok(mem.distanceMultiplier < 1);
  assert.strictEqual(mem.preferNear, true);
  console.log('✓ low completion → shorter / nearer');
}

function testFreshnessAvoidsRepeat() {
  const mem = buildMemoryFromRoutes([
    {
      status: 'completed',
      distance: 2000,
      actualDistance: 2000,
      selectedPOI: { name: '西湖公园', type: '公园' },
      endLocation: { lat: 30.2, lng: 120.1, poiName: '西湖公园', poiType: '公园' }
    },
    {
      status: 'completed',
      distance: 2000,
      actualDistance: 1800,
      selectedPOI: { name: '运河广场', type: '广场' },
      endLocation: { lat: 30.21, lng: 120.11, poiName: '运河广场', poiType: '广场' }
    }
  ]);

  const candidates = [
    {
      name: '西湖公园',
      type: '公园',
      typecode: '110101',
      lat: 30.2,
      lng: 120.1,
      distance: 2000
    },
    {
      name: '新绿公园',
      type: '公园',
      typecode: '110101',
      lat: 30.22,
      lng: 120.12,
      distance: 2100
    },
    {
      name: '远山风景区',
      type: '风景名胜',
      typecode: '150000',
      lat: 30.3,
      lng: 120.3,
      distance: 5000
    }
  ];

  const { selected, scores } = rankLocationCandidates(candidates, {
    targetDistanceM: 2000,
    routePreferences: ['绿化多'],
    executionMemory: mem,
    hour: 10
  });

  assert.ok(selected);
  assert.notStrictEqual(selected.name, '西湖公园');
  const westLake = scores.find((s) => s.poi.name === '西湖公园');
  const fresh = scores.find((s) => s.poi.name === '新绿公园');
  assert.ok(westLake.score < fresh.score, '已去过的 POI 应降权');
  console.log('✓ freshness demotes recent POI');
}

function testCancelledMemoryLowersTargetMultiplier() {
  const cancelled = buildMemoryFromRoutes(
    Array.from({ length: 7 }, () => ({ status: 'cancelled', distance: 4000 }))
  );
  const mixed = buildMemoryFromRoutes([
    { status: 'completed', distance: 3000, actualDistance: 3100, selectedPOI: { type: '公园' } },
    { status: 'completed', distance: 3000, actualDistance: 2900, selectedPOI: { type: '公园' } },
    { status: 'completed', distance: 3000, actualDistance: 3000, selectedPOI: { type: '风景' } },
    { status: 'started', distance: 3000 },
    { status: 'completed', distance: 3000, actualDistance: 2800, selectedPOI: { type: '公园' } },
    { status: 'completed', distance: 3000, actualDistance: 3000, selectedPOI: { type: '公园' } },
    { status: 'completed', distance: 3000, actualDistance: 3200, selectedPOI: { type: '公园' } }
  ]);
  assert.ok(cancelled.distanceMultiplier < mixed.distanceMultiplier || cancelled.preferNear);
  console.log('✓ cancel-heavy memory vs healthy memory');
}

function main() {
  testCoarseType();
  testLowCompletionShortens();
  testFreshnessAvoidsRepeat();
  testCancelledMemoryLowersTargetMultiplier();
  console.log('\nAll recommend step1 unit tests passed.');
}

main();
