<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getUserStats, type UserStatsData } from '@/api/stats'

const loading = ref(true)
const stats = ref([
  { value: '0', label: '打卡天数' },
  { value: '0', label: '消耗热量' },
  { value: '0', label: '运动公里' }
])

onMounted(() => {
  loadUserStats()
  // 监听运动开始事件，自动刷新数据
  window.addEventListener('exercise-started', loadUserStats)
})

onUnmounted(() => {
  window.removeEventListener('exercise-started', loadUserStats)
})

/**
 * 从后端加载用户累计统计
 */
const loadUserStats = async () => {
  console.log('===================================');
  console.log('📋 StatsCard: 加载用户累计统计');
  console.log('===================================');
  
  loading.value = true
  
  try {
    const response = await getUserStats()
    
    if (response.success && response.data) {
      const data = response.data
      
      stats.value = [
        { value: data.streakDays.toString(), label: '打卡天数' },
        { value: data.formattedCalories, label: '消耗热量' },
        { value: data.formattedDistance, label: '运动公里' }
      ]
      
      console.log('✅ 数据已更新到组件:');
      console.log(`   打卡天数: ${data.streakDays} 天`);
      console.log(`   累计消耗: ${data.formattedCalories} kcal`);
      console.log(`   运动公里: ${data.formattedDistance} km`);
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
  refresh: loadUserStats
})
</script>

<template>
  <div class="card stats-card">
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-item">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-card {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
