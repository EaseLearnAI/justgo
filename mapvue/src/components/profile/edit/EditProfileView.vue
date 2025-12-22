<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import { getUserProfile, updateProfile, type UserProfile } from '@/api'

const router = useRouter()

const nickname = ref('')
const displayPhone = ref('138****8888')
const avatarUrl = ref('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')
const loading = ref(false)
const saving = ref(false)

onMounted(() => {
  loadData()
})

const loadData = async () => {
  loading.value = true
  
  try {
    const response = await getUserProfile()
    
    if (response.success && response.data) {
      const user = response.data.user
      nickname.value = user.name || ''
      avatarUrl.value = user.avatar || avatarUrl.value
      
      // 显示脱敏手机号
      if (user.phone) {
        displayPhone.value = user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }
    } else {
      // 回退到本地存储
      nickname.value = localStorage.getItem('userName') || ''
      const phone = localStorage.getItem('userPhone') || ''
      if (phone) {
        displayPhone.value = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      }
    }
  } catch (error) {
    // Error handling
  } finally {
    loading.value = false
  }
}

const previewAvatar = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(input.files[0])
  }
}

const saveProfile = async () => {
  if (!nickname.value.trim()) {
    alert('请输入昵称')
    return
  }
  
  saving.value = true
  
  try {
    const response = await updateProfile({
      name: nickname.value,
      avatar: avatarUrl.value
    })
    
    if (response.success) {
      alert('保存成功！')
      router.push('/profile')
    } else {
      alert(response.message || '保存失败')
    }
  } catch (error) {
    alert('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="edit-profile-page">
    <AppHeader title="设置个人信息" show-back back-path="/profile" />

    <div class="content">
      <!-- Avatar Section -->
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <img :src="avatarUrl" alt="头像" class="avatar-img">
          <label class="avatar-edit-btn">
            <font-awesome-icon icon="camera" />
            <input type="file" accept="image/*" @change="previewAvatar" style="display: none;">
          </label>
        </div>
        <p class="avatar-hint">点击更换头像</p>
      </div>

      <!-- Basic Info -->
      <p class="section-title">基本信息</p>
      <div class="form-section">
        <div class="form-item">
          <span class="form-label">昵称</span>
          <input type="text" v-model="nickname" class="form-input" placeholder="请输入昵称">
        </div>
        <div class="form-item">
          <span class="form-label">手机号</span>
          <span class="form-value">{{ displayPhone }}</span>
          <font-awesome-icon icon="chevron-right" class="form-arrow" />
        </div>
      </div>

      <button class="save-btn" @click="saveProfile" :disabled="saving">
        {{ saving ? '保存中...' : '保存修改' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.edit-profile-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 16px;
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--card-background);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  border: 2px solid var(--card-background);
  cursor: pointer;
}

.avatar-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

.section-title {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.form-section {
  background: var(--card-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 24px;
  overflow: hidden;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  width: 80px;
  font-size: 15px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.form-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
  text-align: right;
  outline: none;
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-value {
  flex: 1;
  text-align: right;
  font-size: 15px;
  color: var(--text-primary);
}

.form-arrow {
  color: var(--text-tertiary);
  font-size: 14px;
  margin-left: 8px;
}

.form-unit {
  color: var(--text-secondary);
  font-size: 14px;
  margin-left: 4px;
}

.save-btn {
  width: 100%;
  height: 56px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #3D9A87 100%);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 24px;
  box-shadow: 0 4px 16px rgba(46, 125, 107, 0.35);
}

.save-btn:active {
  transform: scale(0.98);
}
</style>
