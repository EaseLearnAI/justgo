<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import TabBar from '@/components/common/TabBar.vue'
import DailySummaryCard from '@/components/home/DailySummaryCard.vue'
import QuickActions from '@/components/home/QuickActions.vue'
import RecentRecords from '@/components/home/RecentRecords.vue'
import OnboardingModal from '@/components/profile/OnboardingModal.vue'
import { getUserProfile } from '@/api'

const userName = ref('Terry')
const userAvatar = ref('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80')
const currentDate = ref('')
const recentRecordsRef = ref<InstanceType<typeof RecentRecords> | null>(null)
const dailySummaryRef = ref<InstanceType<typeof DailySummaryCard> | null>(null)
const showOnboarding = ref(false)

/**
 * 处理运动开始事件
 */
const handleExerciseStarted = () => {
  // 刷新每日摘要
  if (dailySummaryRef.value) {
    dailySummaryRef.value.refresh()
  }
  
  // 刷新记录列表
  if (recentRecordsRef.value) {
    recentRecordsRef.value.refreshRecords()
  }
}

/**
 * 检查用户是否是新用户（需要完成引导）
 */
const checkIfNewUser = (user: any): boolean => {
  // 检查用户数据是否还是默认值
  // 如果身体数据、目标导向、活动水平都是默认值，说明是新用户
  const bodyStats = user.bodyStats || {}
  
  const isDefaultBodyStats = 
    bodyStats.height === 170 &&
    bodyStats.weight === 65 &&
    bodyStats.age === 25 &&
    bodyStats.gender === 'male'
  
  const isDefaultGoal = user.goalOrientation === 'maintain'
  const isDefaultActivity = user.activityLevel === 'moderate'
  
  // 如果所有数据都是默认值，则认为是新用户（不管 localStorage 标记）
  // 这样可以处理 localStorage 被污染的情况
  const isNewUser = isDefaultBodyStats && isDefaultGoal && isDefaultActivity
  
  if (isNewUser) {
    // 如果是新用户，清除可能存在的错误标记
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding')
    if (hasCompletedOnboarding === 'true') {
      localStorage.removeItem('hasCompletedOnboarding')
    }
  } else {
    // 如果不是新用户，检查 localStorage 标记（作为额外验证）
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding')
    if (hasCompletedOnboarding === 'true') {
      return false
    }
  }
  
  return isNewUser
}

// 监听运动开始事件，刷新数据
onMounted(() => {
  window.addEventListener('exercise-started', handleExerciseStarted)
})

onUnmounted(() => {
  window.removeEventListener('exercise-started', handleExerciseStarted)
})

onMounted(async () => {
  // 加载用户信息
  try {
    const response = await getUserProfile()
    
    if (response.success && response.data) {
      const user = response.data.user
      
      userName.value = user.name ? (user.name.length > 6 ? user.name.substring(0, 6) : user.name) : 'Terry'
      if (user.avatar) {
        userAvatar.value = user.avatar
      }
      
      // 检查是否是新用户，如果是则显示引导
      const isNewUser = checkIfNewUser(user)
      if (isNewUser) {
        showOnboarding.value = true
      } else {
        // Not a new user
      }
    } else {
      // Error handling
    }
  } catch (error) {
    // 回退到本地存储
    const name = localStorage.getItem('userName')
    if (name) {
      userName.value = name.length > 6 ? name.substring(0, 6) : name
    }
  }
  
  const now = new Date()
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
  const days = ['日', '一', '二', '三', '四', '五', '六']
  currentDate.value = `${months[now.getMonth()]}月${now.getDate()}日 星期${days[now.getDay()]}`
})

/**
 * 完成引导后的回调
 */
const handleOnboardingComplete = () => {
  localStorage.setItem('hasCompletedOnboarding', 'true')
  showOnboarding.value = false
  // 刷新每日摘要以获取最新数据
  if (dailySummaryRef.value) {
    dailySummaryRef.value.refresh()
  }
}

/**
 * 关闭引导弹窗
 */
const handleOnboardingClose = () => {
  showOnboarding.value = false
}

/**
 * 当添加新记录后刷新记录列表和每日摘要
 */
const onRecordAdded = () => {
  if (recentRecordsRef.value) {
    recentRecordsRef.value.refreshRecords()
  }
  // 刷新每日摘要卡片
  if (dailySummaryRef.value) {
    dailySummaryRef.value.refresh()
  }
}
</script>

<template>
  <div class="home-page">
    <!-- Header -->
    <header class="home-header">
      <div>
        <p class="date-text">{{ currentDate }}</p>
        <h1 class="greeting">你好, {{ userName }} 👋</h1>
      </div>
      <div class="avatar">
        <img :src="userAvatar" alt="Profile">
      </div>
    </header>

    <div class="content">
      <!-- 固定区域：不可滚动 -->
      <div class="fixed-section">
        <!-- Daily Summary -->
        <DailySummaryCard ref="dailySummaryRef" />

        <!-- Quick Actions -->
        <QuickActions @recordAdded="onRecordAdded" />
      </div>

      <!-- 滚动区域：只有这里可以滚动 -->
      <div class="scroll-section">
        <RecentRecords ref="recentRecordsRef" />
      </div>
    </div>

    <TabBar />

    <!-- 新用户引导弹窗 -->
    <OnboardingModal 
      :show="showOnboarding" 
      @complete="handleOnboardingComplete"
      @close="handleOnboardingClose"
    />
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--background-color);
  overflow: hidden;
}

.home-header {
  padding: calc(var(--safe-area-top) + 10px) 24px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--background-color);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 10;
}

.date-text {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.greeting {
  font-size: 28px;
  font-weight: 700;
  margin-top: 4px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 24px;
}

.fixed-section {
  flex-shrink: 0;
}

.scroll-section {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 90px; /* 给 TabBar 留出空间 */
}
</style>
