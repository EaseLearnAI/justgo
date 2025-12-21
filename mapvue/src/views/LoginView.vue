<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import LoginForm from '@/components/login/LoginForm.vue'

const router = useRouter()

const handleLoginSuccess = () => {
  router.push('/home')
}
</script>

<template>
  <div class="login-page">
    <!-- Logo -->
    <div class="logo-section">
      <div class="logo-icon">
        <font-awesome-icon icon="fire-flame-curved" />
      </div>
      <h1 class="logo-title">Just Go!</h1>
      <p class="logo-subtitle">开启健康运动之旅</p>
    </div>

    <!-- Form -->
    <LoginForm @success="handleLoginSuccess" />
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 24px;
  min-height: 100vh;
  background: var(--background-color);
}

.logo-section {
  text-align: center;
  margin-bottom: 48px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--primary-color) 0%, #3D9A87 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 24px rgba(46, 125, 107, 0.3);
  font-size: 36px;
  color: white;
}

.logo-title {
  font-size: 28px;
  margin-bottom: 8px;
  font-weight: 700;
}

.logo-subtitle {
  color: var(--text-secondary);
  font-size: 15px;
}
</style>
