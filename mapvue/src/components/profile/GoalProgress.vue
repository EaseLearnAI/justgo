<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getGoalProgress, type GoalProgressData } from '@/api/stats'

const loading = ref(true)
const goalData = ref<GoalProgressData | null>(null)

// 计算综合进度
const progress = computed(() => {
  if (!goalData.value) return 0
  return goalData.value.overall?.progress || 0
})

onMounted(() => {
  loadGoalProgress()
})

/**
 * 从后端加载目标进度
 */
const loadGoalProgress = async () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗')
  console.log('║                                                       ║')
  console.log('║   🎯 GoalProgress: 加载目标进度                       ║')
  console.log('║                                                       ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  
  loading.value = true
  
  try {
    const response = await getGoalProgress()
    
    if (response.success && response.data) {
      goalData.value = response.data
      
      console.log('✅ 目标进度数据已更新到组件:')
      console.log(`   🎯 目标取向: ${response.data.goalOrientation}`)
      console.log(`   🔥 热量目标: ${response.data.calorie.goal} kcal`)
      console.log(`   🔥 热量当前: ${response.data.calorie.current} kcal`)
      console.log(`   🔥 热量进度: ${response.data.calorie.progress}%`)
      console.log(`   🏃 运动目标: ${response.data.exercise.goal} 分钟`)
      console.log(`   🏃 运动当前: ${response.data.exercise.current} 分钟`)
      console.log(`   🏃 运动进度: ${response.data.exercise.progress}%`)
      console.log(`   📊 综合进度: ${response.data.overall?.progress || 0}%`)
    } else {
      console.error('❌ 加载失败:', response.message)
    }
  } catch (error) {
    console.error('❌ 加载异常:', error)
  } finally {
    loading.value = false
    console.log('===================================\n')
  }
}

// 暴露刷新方法供父组件调用
defineExpose({
  refresh: loadGoalProgress
})
</script>

<template>
  <div class="card goal-progress">
    <div class="goal-icon">
      <font-awesome-icon icon="bullseye" />
    </div>
    <div class="goal-content">
      <div class="goal-header">
        <span class="goal-title">今日目标</span>
        <span class="goal-percent">{{ progress }}%</span>
      </div>
      <div class="goal-bar">
        <div class="goal-bar-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal-progress {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.goal-icon {
  width: 50px;
  height: 50px;
  background: var(--primary-green-weak);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  font-size: 24px;
  flex-shrink: 0;
}

.goal-content {
  flex: 1;
  padding: 0 16px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.goal-title {
  font-weight: 600;
  font-size: 15px;
}

.goal-percent {
  font-size: 13px;
  color: var(--primary-color);
  font-weight: 600;
}

.goal-bar {
  height: 6px;
  background: var(--section-background);
  border-radius: 3px;
  overflow: hidden;
}

.goal-bar-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
