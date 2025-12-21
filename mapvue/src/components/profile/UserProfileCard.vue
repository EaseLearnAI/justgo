<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserProfile } from '@/api'

const emit = defineEmits<{
  (e: 'edit-profile'): void
}>()

const userName = ref('Terry')
const userAvatar = ref('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')
const streakDays = ref(12)

onMounted(async () => {
  // 优先从后端加载
  try {
    const response = await getUserProfile()
    if (response.success && response.data) {
      const user = response.data.user
      userName.value = user.name || 'Terry'
      if (user.avatar) {
        userAvatar.value = user.avatar
      }
      streakDays.value = user.streakDays || 0
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
    // 回退到本地存储
    const name = localStorage.getItem('userName')
    if (name) {
      userName.value = name.length > 10 ? name.substring(0, 10) : name
    }
  }
})

const handleEditClick = () => {
  emit('edit-profile')
}

// 暴露刷新方法
const refresh = async () => {
  try {
    const response = await getUserProfile()
    if (response.success && response.data) {
      const user = response.data.user
      userName.value = user.name || 'Terry'
      if (user.avatar) {
        userAvatar.value = user.avatar
      }
      streakDays.value = user.streakDays || 0
    }
  } catch (error) {
    console.error('刷新用户信息失败:', error)
  }
}

defineExpose({ refresh })
</script>

<template>
  <div class="user-profile-card" @click="handleEditClick">
    <div class="user-avatar">
      <img :src="userAvatar" alt="Avatar">
    </div>
    <div class="user-info">
      <h2>{{ userName }}</h2>
      <p class="streak-text">连续打卡 {{ streakDays }} 天 🔥</p>
    </div>
    <div class="edit-icon">
      <font-awesome-icon icon="chevron-right" />
    </div>
  </div>
</template>

<style scoped>
.user-profile-card {
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  cursor: pointer;
  padding: 16px;
  background: var(--card-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.user-profile-card:active {
  transform: scale(0.98);
  background: var(--section-background);
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-info {
  flex: 1;
  padding-left: 20px;
}

.user-info h2 {
  font-size: 24px;
  margin-bottom: 4px;
}

.streak-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.edit-icon {
  color: var(--text-tertiary);
  font-size: 16px;
}
</style>
