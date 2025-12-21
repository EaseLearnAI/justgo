<script setup lang="ts">
interface Props {
  show: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'logout'): void
  (e: 'edit-profile'): void
}>()

const handleEditProfile = () => {
  emit('edit-profile')
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="sidebar-overlay" :class="{ show }" @click="emit('close')">
      <div class="sidebar-content" @click.stop>
        <div class="sidebar-header">
          <h3>设置</h3>
          <button class="close-btn" @click="emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
        <div class="sidebar-body">
          <div class="sidebar-item" @click="handleEditProfile">
            <div class="sidebar-icon" style="background: #E3F2FD; color: #007AFF;">
              <font-awesome-icon icon="user-pen" />
            </div>
            <span>设置个人信息</span>
            <font-awesome-icon icon="chevron-right" />
          </div>
          <div class="sidebar-item danger" @click="emit('logout')">
            <div class="sidebar-icon" style="background: #FFE5E5; color: #D64545;">
              <font-awesome-icon icon="right-from-bracket" />
            </div>
            <span>退出登录</span>
            <font-awesome-icon icon="chevron-right" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.sidebar-overlay.show {
  opacity: 1;
  visibility: visible;
}

.sidebar-content {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: var(--card-background);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar-overlay.show .sidebar-content {
  transform: translateX(0);
}

.sidebar-header {
  padding: calc(var(--safe-area-top) + 20px) 20px 20px;
  border-bottom: 1px solid var(--divider-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  background: var(--section-background);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
}

.sidebar-body {
  flex: 1;
  padding: 20px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
  text-decoration: none;
  color: var(--text-primary);
}

.sidebar-item:active {
  background: var(--section-background);
}

.sidebar-item.danger {
  color: #D64545;
}

.sidebar-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.sidebar-item span {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
}

.sidebar-item > svg:last-child {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
