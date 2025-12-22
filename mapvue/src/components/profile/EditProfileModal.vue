<script setup lang="ts">
import { ref, watch } from 'vue'
import { getUserProfile, updateProfile, uploadAvatar, type UserProfile } from '@/api'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const nickname = ref('')
const displayPhone = ref('138****8888')
const avatarUrl = ref('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')
const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)

// 监听显示状态，加载数据
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadData()
  }
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

// 头像文件选择
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    const file = input.files[0]
    
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }
    
    // 预览
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
    
    // 上传到 OSS
    uploading.value = true
    try {
      
      const response = await uploadAvatar(file)
      
      if (response.success && response.data) {
        avatarUrl.value = response.data.avatar
      } else {
        alert(response.message || '头像上传失败')
      }
    } catch (error) {
      alert('头像上传失败，请稍后重试')
    } finally {
      uploading.value = false
    }
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
      emit('saved')
      emit('close')
    } else {
      alert(response.message || '保存失败')
    }
  } catch (error) {
    alert('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="handleClose">
        <div class="modal-container" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <button class="close-btn" @click="handleClose">
              <font-awesome-icon icon="times" />
            </button>
            <h2 class="modal-title">设置个人信息</h2>
            <div class="header-placeholder"></div>
          </div>

          <div class="modal-content">
            <!-- Avatar Section -->
            <div class="avatar-section">
              <div class="avatar-wrapper" @click="triggerFileSelect">
                <img :src="avatarUrl" alt="头像" class="avatar-img">
                <div class="avatar-overlay" :class="{ uploading: uploading }">
                  <font-awesome-icon v-if="uploading" icon="spinner" spin />
                  <font-awesome-icon v-else icon="camera" />
                </div>
              </div>
              <p class="avatar-hint">{{ uploading ? '上传中...' : '点击更换头像' }}</p>
              <input 
                ref="fileInputRef"
                type="file" 
                accept="image/*" 
                @change="handleFileChange" 
                style="display: none;"
              >
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
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="cancel-btn" @click="handleClose">取消</button>
            <button class="save-btn" @click="saveProfile" :disabled="saving || uploading">
              {{ saving ? '保存中...' : '保存修改' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: var(--card-background);
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--section-background);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
}

.close-btn:active {
  background: var(--border-color);
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-placeholder {
  width: 36px;
}

.modal-content {
  padding: 20px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  margin-bottom: 12px;
}

.avatar-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--card-background);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.avatar-overlay {
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
}

.avatar-overlay.uploading {
  background: var(--text-secondary);
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
  background: var(--section-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
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

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.cancel-btn {
  flex: 1;
  height: 48px;
  background: var(--section-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.save-btn {
  flex: 1;
  height: 48px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #3D9A87 100%);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(46, 125, 107, 0.35);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn:active,
.save-btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(20px);
}

.modal-enter-to .modal-container,
.modal-leave-from .modal-container {
  transform: scale(1) translateY(0);
}
</style>
