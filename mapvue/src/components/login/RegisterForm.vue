<script setup lang="ts">
import { ref } from 'vue'
import { register as apiRegister } from '@/api'

const emit = defineEmits<{
  (e: 'success'): void
}>()

const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)

const register = async () => {
  errorMsg.value = ''

  if (!phone.value || !password.value || !confirmPassword.value) {
    errorMsg.value = '请填写完整信息'
    return
  }

  if (!/^1\d{10}$/.test(phone.value)) {
    errorMsg.value = '请输入正确的手机号'
    return
  }

  if (password.value.length < 6) {
    errorMsg.value = '密码至少6个字符'
    return
  }

  if (password.value !== confirmPassword.value) {
    errorMsg.value = '两次密码不一致'
    return
  }
  
  loading.value = true
  
  try {
    const response = await apiRegister({
      phone: phone.value,
      password: password.value
    })
    
    if (response.success) {
      
      // 标记已登录
      localStorage.setItem('userLoggedIn', 'true')
      
      emit('success')
    } else {
      errorMsg.value = response.message || '注册失败'
    }
  } catch (error: any) {
    errorMsg.value = '网络请求失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-form">
    <div v-if="errorMsg" class="error-message">
      {{ errorMsg }}
    </div>

    <div class="input-group">
      <label>手机号</label>
      <input 
        type="tel" 
        v-model="phone" 
        class="input-field" 
        placeholder="11位手机号"
        maxlength="11"
      >
    </div>

    <div class="input-group">
      <label>密码</label>
      <input 
        type="password" 
        v-model="password" 
        class="input-field" 
        placeholder="6-20个字符"
        maxlength="20"
      >
    </div>

    <div class="input-group">
      <label>确认密码</label>
      <input 
        type="password" 
        v-model="confirmPassword" 
        class="input-field" 
        placeholder="再次输入密码"
        maxlength="20"
        @keypress.enter="register"
      >
    </div>

    <button class="btn btn-primary register-btn" @click="register">
      注册
    </button>

    <p class="login-link">
      已有账号？<router-link to="/login">立即登录</router-link>
    </p>
  </div>
</template>

<style scoped>
.register-form {
  width: 100%;
}

.error-message {
  background: #FFE5E5;
  color: #D64545;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  margin-bottom: 20px;
}

.input-field {
  height: 56px;
}

.register-btn {
  margin-top: 24px;
  height: 56px;
  font-size: 17px;
}

.login-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.login-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}
</style>
