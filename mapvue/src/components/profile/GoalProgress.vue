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
  loading.value = true
  
  try {
    const response = await getGoalProgress()
    
    if (response.success && response.data) {
      goalData.value = response.data
    } else {
      // Error handling
    }
  } catch (error) {
    // Error handling
  } finally {
    loading.value = false
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
