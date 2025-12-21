/**
 * 视觉 AI 服务测试
 * 测试图片食物分析功能
 * 
 * 运行方式: node src/test/testVision.js
 */

require('dotenv').config();

const { callVisionLLM, analyzeImageCalories, VISION_CONFIG } = require('../services/visionService');

// 测试用的图片 URL (使用 ModelScope 可访问的图片)
const TEST_IMAGE_URL = 'https://modelscope.oss-cn-beijing.aliyuncs.com/demo/images/audrey_hepburn.jpg';

/**
 * 测试视觉模型直接调用
 */
const testVisionAnalysis = async () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   🧪 视觉 AI 服务测试                                  ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('📋 测试配置:');
  console.log('   - 模型:', VISION_CONFIG.model);
  console.log('   - API 地址:', VISION_CONFIG.baseUrl);
  console.log('   - 测试图片:', TEST_IMAGE_URL);
  console.log('\n');

  try {
    console.log('🚀 开始测试图片食物分析...\n');
    
    const startTime = Date.now();
    const result = await analyzeImageCalories(TEST_IMAGE_URL, 'test-user-123');
    const endTime = Date.now();

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('                    📊 测试结果                        ');
    console.log('═══════════════════════════════════════════════════════\n');

    if (result.success) {
      console.log('✅ 测试通过!');
      console.log('\n📊 分析结果:');
      console.log('   - 成功:', result.success);
      console.log('   - 用户 ID:', result.userId);
      console.log('   - 图片 URL:', result.imageUrl);
      console.log('   - 分析时间:', result.analyzedAt);
      
      if (result.foods && result.foods.length > 0) {
        console.log('\n🍽️ 识别的食物:');
        result.foods.forEach((food, index) => {
          console.log(`   ${index + 1}. ${food.name}`);
          console.log(`      - 数量: ${food.quantity || '1份'}`);
          console.log(`      - 热量范围: ${food.calorie_min} - ${food.calorie_max} kcal`);
          console.log(`      - 估算热量: ≈ ${food.calorie_estimated} kcal`);
        });
      }

      if (result.totalCalories) {
        console.log('\n🔥 总热量:');
        console.log(`   - 最小: ${result.totalCalories.min} kcal`);
        console.log(`   - 估算: ≈ ${result.totalCalories.estimated} kcal`);
        console.log(`   - 最大: ${result.totalCalories.max} kcal`);
      }

      if (result.summary) {
        console.log('\n💡 营养建议:');
        console.log(`   ${result.summary}`);
      }

      if (result.scientificNote) {
        console.log('\n📝 科学说明:');
        console.log(`   ${result.scientificNote}`);
      }

      if (result.imageDescription) {
        console.log('\n🖼️ 图片描述:');
        console.log(`   ${result.imageDescription}`);
      }

    } else {
      console.log('❌ 测试失败!');
      console.log('   - 错误信息:', result.error);
    }

    console.log('\n⏱️ 总耗时:', endTime - startTime, 'ms');

  } catch (error) {
    console.error('\n❌ 测试异常:', error.message);
    console.error('📊 错误堆栈:', error.stack);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    🏁 测试结束                        ');
  console.log('═══════════════════════════════════════════════════════\n');
};

// 运行测试
testVisionAnalysis();
