<script setup lang="ts">
import { ref, provide } from 'vue'
import { RouterView } from 'vue-router'
import ExercisePlanModal from '@/components/exercise/ExercisePlanModal.vue'

const showExerciseModal = ref(false)

const openExercisePlan = () => {
  showExerciseModal.value = true
}

const closeExercisePlan = () => {
  showExerciseModal.value = false
}

/**
 * 处理运动开始事件
 * 通知所有相关组件刷新数据
 */
const handleExerciseStarted = (data: { routeId: string; calories: number; distance: string; duration: number }) => {
  console.log('\n╔═══════════════════════════════════════════════════════╗')
  console.log('║                                                       ║')
  console.log('║   🔄 App: 收到运动开始事件，通知所有组件刷新         ║')
  console.log('║                                                       ║')
  console.log('╚═══════════════════════════════════════════════════════╝')
  console.log('📊 运动数据:', data)
  
  // 使用 window 事件通知所有组件刷新
  window.dispatchEvent(new CustomEvent('exercise-started', { detail: data }))
  
  console.log('✅ 已发送 exercise-started 事件到所有组件')
  console.log('===================================\n')
}

provide('showExercisePlan', openExercisePlan)
</script>

<template>
  <div class="app-container">
    <RouterView />
    <ExercisePlanModal 
      :show="showExerciseModal" 
      @close="closeExercisePlan"
      @exercise-started="handleExerciseStarted"
    />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  background-color: var(--background-color);
  max-width: 480px;
  margin: 0 auto;
}
</style>
