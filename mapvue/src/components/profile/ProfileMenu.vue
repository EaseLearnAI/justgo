<script setup lang="ts">
const emit = defineEmits<{
  (e: 'show-body-stats'): void
  (e: 'show-goal-orientation'): void
  (e: 'show-activity-level'): void
}>()
</script>

<template>
  <div class="profile-menu">
    <!-- Main Menu -->
    <div class="menu-group">
      <div class="menu-item" @click="emit('show-body-stats')">
        <div class="menu-icon" style="background: #E8F5E9; color: #34C759;">
          <font-awesome-icon icon="ruler-vertical" />
        </div>
        <div class="menu-label">身体数据</div>
        <font-awesome-icon icon="chevron-right" class="menu-arrow" />
      </div>
      <div class="menu-item" @click="emit('show-goal-orientation')">
        <div class="menu-icon" style="background: #FFF3E0; color: #FF9500;">
          <font-awesome-icon icon="bullseye" />
        </div>
        <div class="menu-label">目标导向</div>
        <font-awesome-icon icon="chevron-right" class="menu-arrow" />
      </div>
      <div class="menu-item" @click="emit('show-activity-level')">
        <div class="menu-icon" style="background: #F3E5F5; color: #AF52DE;">
          <font-awesome-icon icon="person-running" />
        </div>
        <div class="menu-label">日常活动水平</div>
        <font-awesome-icon icon="chevron-right" class="menu-arrow" />
      </div>
      <router-link to="/history" class="menu-item">
        <div class="menu-icon" style="background: #FFF3E0; color: #FF9500;">
          <font-awesome-icon icon="clock-rotate-left" />
        </div>
        <div class="menu-label">历史记录</div>
        <font-awesome-icon icon="chevron-right" class="menu-arrow" />
      </router-link>
    </div>

    <!-- Share Menu -->
    <div class="menu-group">
      <div class="menu-item">
        <div class="menu-icon" style="background: var(--section-background); color: var(--text-secondary);">
          <font-awesome-icon icon="share-nodes" />
        </div>
        <div class="menu-label">分享给好友</div>
        <font-awesome-icon icon="chevron-right" class="menu-arrow" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-group {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--divider-color);
  cursor: pointer;
  transition: background 0.2s;
  background: var(--card-background);
  text-decoration: none;
  color: inherit;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: var(--section-background);
}

.menu-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.menu-label {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
}

.menu-arrow {
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
