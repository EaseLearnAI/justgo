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
  // 使用 window 事件通知所有组件刷新
  window.dispatchEvent(new CustomEvent('exercise-started', { detail: data }))
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
