<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getDailySummary, type DailySummaryData } from '@/api/stats'

// 数据状态
const loading = ref(true)
const netCalories = ref(0)
const intake = ref(0)
const exercise = ref(0)
const baseMetabolism = ref(0)
const dailyCalorieGoal = ref(1500)

// 计算进度
const progress = computed(() => {
  if (dailyCalorieGoal.value === 0) return 0
  const totalConsumed = exercise.value + baseMetabolism.value
  const total = intake.value + baseMetabolism.value
  return Math.min(100, Math.round((totalConsumed / total) * 100))
})

onMounted(() => {
  loadDailySummary()
  // 监听运动开始事件，自动刷新数据
  window.addEventListener('exercise-started', loadDailySummary)
})

onUnmounted(() => {
  window.removeEventListener('exercise-started', loadDailySummary)
})

/**
 * 从后端加载今日热量摘要
 */
const loadDailySummary = async () => {
  console.log('===================================');
  console.log('📊 DailySummaryCard: 加载今日热量摘要');
  console.log('===================================');
  
  loading.value = true
  
  try {
    const response = await getDailySummary()
    
    if (response.success && response.data) {
      const data = response.data
      
      netCalories.value = data.netCalories
      intake.value = data.intake
      exercise.value = data.exercise
      baseMetabolism.value = data.baseMetabolism
      dailyCalorieGoal.value = data.dailyCalorieGoal
      
      console.log('✅ 数据已更新到组件:');
      console.log(`   网热量: ${netCalories.value} kcal`);
      console.log(`   摄入: ${intake.value} kcal`);
      console.log(`   运动: ${exercise.value} kcal`);
      console.log(`   基础代谢估算: ${baseMetabolism.value} kcal`);
    } else {
      console.error('❌ 加载失败:', response.message)
    }
  } catch (error) {
    console.error('❌ 加载异常:', error)
  } finally {
    loading.value = false
    console.log('===================================');
  }
}

// 暴露刷新方法供父组件调用
defineExpose({
  refresh: loadDailySummary
})
</script>

<template>
  <div class="card daily-summary">
    <div class="summary-header">
      <div>
        <p class="summary-label">今日净消耗</p>
        <h2 class="summary-value">
          {{ netCalories > 0 ? '+' : '' }}{{ netCalories }} 
          <span class="unit">kcal</span>
        </h2>
      </div>
      <!-- Ring Chart -->
      <div class="ring-chart">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E5EA" stroke-width="6" />
          <circle 
            cx="32" 
            cy="32" 
            r="28" 
            fill="none" 
            stroke="#34C759" 
            stroke-width="6" 
            :stroke-dasharray="175" 
            :stroke-dashoffset="175 - (175 * progress / 100)" 
            stroke-linecap="round" 
            transform="rotate(-90 32 32)" 
          />
        </svg>
        <font-awesome-icon icon="fire" class="ring-icon" />
      </div>
    </div>
    
    <div class="summary-footer">
      <div class="stat-item">
        <p class="stat-label">摄入</p>
        <p class="stat-value">{{ intake }}</p>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <p class="stat-label">运动</p>
        <p class="stat-value">{{ exercise.toLocaleString() }}</p>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <p class="stat-label">基础代谢估算</p>
        <p class="stat-value">{{ baseMetabolism.toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.daily-summary {
  margin-bottom: 20px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.summary-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.summary-value {
  font-size: 42px;
  margin: 8px 0;
  font-weight: 800;
  letter-spacing: -1px;
}

.summary-value .unit {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

.ring-chart {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-chart svg {
  position: absolute;
}

.ring-icon {
  color: #34C759;
  font-size: 18px;
  z-index: 1;
}

.summary-footer {
  display: flex;
  align-items: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--divider-color);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-weight: 700;
  font-size: 16px;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--divider-color);
}
</style>
