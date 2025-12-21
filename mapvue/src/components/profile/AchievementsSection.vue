<script setup lang="ts">
const achievements = [
  { emoji: '🏆', label: '初出茅庐', locked: false },
  { emoji: '🔥', label: '连续7天', locked: false },
  { emoji: '🏃', label: '50公里', locked: false },
  { emoji: '🌟', label: '未解锁', locked: true }
]
</script>

<template>
  <div class="achievements-section">
    <div class="section-header">
      <span class="section-title">我的成就</span>
      <a href="#" class="view-all">全部</a>
    </div>
    <div class="achievements-scroll">
      <div 
        v-for="(achievement, index) in achievements"
        :key="index"
        class="achievement-card"
        :class="{ locked: achievement.locked }"
      >
        <div class="achievement-emoji" :class="{ grayscale: achievement.locked }">
          {{ achievement.emoji }}
        </div>
        <div class="achievement-label">{{ achievement.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievements-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.view-all {
  font-size: 14px;
  color: var(--primary-color);
  text-decoration: none;
}

.achievements-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  -webkit-overflow-scrolling: touch;
}

.achievements-scroll::-webkit-scrollbar {
  display: none;
}

.achievement-card {
  flex-shrink: 0;
  width: 100px;
  background: var(--section-background);
  border-radius: var(--radius-md);
  padding: 16px 12px;
  text-align: center;
  border: 1px solid transparent;
}

.achievement-card.locked {
  opacity: 0.5;
  background: transparent;
  border: 1px dashed var(--border-color);
}

.achievement-emoji {
  font-size: 28px;
  margin-bottom: 8px;
}

.achievement-emoji.grayscale {
  filter: grayscale(1);
}

.achievement-label {
  font-size: 12px;
  font-weight: 600;
}

.achievement-card.locked .achievement-label {
  color: var(--text-secondary);
}
</style>
