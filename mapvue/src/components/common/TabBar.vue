<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const showExercisePlan = inject<() => void>('showExercisePlan')

const isActive = (path: string) => {
  return route.path === path
}

const openExercisePlan = () => {
  if (showExercisePlan) {
    showExercisePlan()
  }
}
</script>

<template>
  <nav class="tab-bar">
    <router-link to="/home" class="tab-item" :class="{ active: isActive('/home') }">
      <font-awesome-icon icon="house" />
      <span>首页</span>
    </router-link>
    <button class="go-button" @click="openExercisePlan">
      GO
    </button>
    <router-link to="/profile" class="tab-item" :class="{ active: isActive('/profile') }">
      <font-awesome-icon icon="user" />
      <span>我的</span>
    </router-link>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
  padding-top: 16px;
  padding-bottom: var(--safe-area-bottom);
  z-index: 100;
  max-width: 480px;
  margin: 0 auto;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  text-decoration: none;
  font-size: 10px;
  font-weight: 500;
  width: 60px;
}

.tab-item.active {
  color: var(--text-primary);
}

.tab-item svg {
  font-size: 22px;
}

.go-button {
  width: 68px;
  height: 68px;
  background: var(--primary-color);
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(52, 199, 89, 0.3);
  margin-top: -39px;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}

.go-button:active {
  transform: scale(0.95);
  box-shadow: 0 4px 10px rgba(52, 199, 89, 0.2);
}
</style>
