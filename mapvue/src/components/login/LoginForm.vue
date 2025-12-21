<script setup lang="ts">
import { ref } from 'vue'
import { login as apiLogin } from '@/api'

const emit = defineEmits<{
  (e: 'success'): void
}>()

const account = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const login = async () => {
  console.log('===================================')
  console.log('📱 开始执行登录操作')
  console.log('===================================')
  
  errorMsg.value = ''
  
  if (!account.value || !password.value) {
    errorMsg.value = '请填写完整信息'
    console.warn('⚠️ 表单验证失败: 请填写完整信息')
    return
  }

  console.log('✅ 表单验证通过')
  console.log('📝 登录信息:', { phone: account.value, password: '******' })
  
  loading.value = true
  
  try {
    console.log('-----------------------------------')
    console.log('🌐 准备调用后端登录 API')
    console.log('-----------------------------------')
    
    const response = await apiLogin({
      phone: account.value,
      password: password.value
    })
    
    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')
    
    if (response.success) {
      console.log('✅ 登录成功！')
      console.log('🎉 准备跳转到首页')
      
      // 标记已登录
      localStorage.setItem('userLoggedIn', 'true')
      
      emit('success')
    } else {
      errorMsg.value = response.message || '账号或密码错误'
      console.error('❌ 登录失败:', response.message)
    }
  } catch (error: any) {
    errorMsg.value = '网络请求失败，请稍后重试'
    console.error('❌ 登录异常:', error)
  } finally {
    loading.value = false
    console.log('===================================')
    console.log('🏁 登录流程结束')
    console.log('===================================')
  }
}
</script>

<template>
  <div class="login-form">
    <div v-if="errorMsg" class="error-message">
      {{ errorMsg }}
    </div>

    <div class="input-group">
      <label>手机号</label>
      <input 
        type="tel" 
        v-model="account" 
        class="input-field" 
        placeholder="请输入手机号"
        maxlength="11"
        @keypress.enter="login"
      >
    </div>

    <div class="input-group">
      <label>密码</label>
      <input 
        type="password" 
        v-model="password" 
        class="input-field" 
        placeholder="请输入密码"
        @keypress.enter="login"
      >
    </div>

    <button class="btn btn-primary login-btn" @click="login">
      登录
    </button>

    <p class="register-link">
      还没有账号？<router-link to="/register">立即注册</router-link>
    </p>
  </div>
</template>

<style scoped>
.login-form {
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

.login-btn {
  margin-top: 24px;
  height: 56px;
  font-size: 17px;
}

.register-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--text-secondary);
}

.register-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}
</style>
