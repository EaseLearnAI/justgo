<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const calories = ref(285)
const duration = ref('42:15')
const streak = ref(1)

const goHome = () => {
  router.push('/home')
}

const share = () => {
  // 分享功能
  if (navigator.share) {
    navigator.share({
      title: 'Just Go! 运动成就',
      text: `我刚刚完成了 ${duration.value} 的运动，消耗了 ${calories.value} 卡路里！`,
      url: window.location.href
    })
  }
}
</script>

<template>
  <div class="result-page">
    <!-- Trophy Icon -->
    <div class="trophy-icon">
      <font-awesome-icon icon="trophy" />
    </div>

    <h1 class="title">做得漂亮！</h1>
    <p class="subtitle">你已经成功消耗了摄入热量</p>

    <!-- Stats Card -->
    <div class="stats-card">
      <div class="stat-row">
        <span class="stat-label">消耗热量</span>
        <span class="stat-value">{{ calories }} <small>kcal</small></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">运动时长</span>
        <span class="stat-value">{{ duration }}</span>
      </div>
      <div class="stat-row last">
        <span class="stat-label">连续打卡</span>
        <span class="stat-value streak">
          <font-awesome-icon icon="fire" />
          +{{ streak }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <button class="btn btn-primary complete-btn" @click="goHome">
      完成
    </button>
    
    <a href="#" class="share-link" @click.prevent="share">分享成就</a>
  </div>
</template>

<style scoped>
.result-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px;
  min-height: 100%;
  background: var(--background-color);
}

.trophy-icon {
  width: 120px;
  height: 120px;
  background: #DCEDEA;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  font-size: 50px;
  color: #2E7D6B;
}

.title {
  font-size: 32px;
  margin-bottom: 12px;
  text-align: center;
  color: #1C1C1E;
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 48px;
  text-align: center;
}

.stats-card {
  width: 100%;
  background: var(--card-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 40px;
  overflow: hidden;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
}

.stat-row.last {
  border-bottom: none;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 700;
  font-size: 18px;
  color: #1C1C1E;
}

.stat-value small {
  font-weight: 400;
  font-size: 14px;
  color: #9A9AA0;
}

.stat-value.streak {
  color: #2E7D6B;
  display: flex;
  align-items: center;
  gap: 6px;
}

.complete-btn {
  margin-bottom: 16px;
}

.share-link {
  color: #9A9AA0;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
</style>
