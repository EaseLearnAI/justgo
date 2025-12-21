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
  console.log('🔄 HomeView: 收到运动开始事件，刷新数据')
  
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
  console.log('=====================================')
  console.log('🔍 HomeView - 开始检查是否为新用户')
  console.log('=====================================')
  console.log('👤 用户数据:', JSON.stringify(user, null, 2))
  
  // 检查用户数据是否还是默认值
  // 如果身体数据、目标导向、活动水平都是默认值，说明是新用户
  const bodyStats = user.bodyStats || {}
  console.log('📊 身体数据:', bodyStats)
  
  const isDefaultBodyStats = 
    bodyStats.height === 170 &&
    bodyStats.weight === 65 &&
    bodyStats.age === 25 &&
    bodyStats.gender === 'male'
  
  console.log('📏 身体数据是否为默认值:', isDefaultBodyStats)
  console.log(`   - 身高: ${bodyStats.height} (默认: 170)`)
  console.log(`   - 体重: ${bodyStats.weight} (默认: 65)`)
  console.log(`   - 年龄: ${bodyStats.age} (默认: 25)`)
  console.log(`   - 性别: ${bodyStats.gender} (默认: male)`)
  
  const isDefaultGoal = user.goalOrientation === 'maintain'
  console.log('🎯 目标导向是否为默认值:', isDefaultGoal, `(${user.goalOrientation})`)
  
  const isDefaultActivity = user.activityLevel === 'moderate'
  console.log('🏋️ 活动水平是否为默认值:', isDefaultActivity, `(${user.activityLevel})`)
  
  // 如果所有数据都是默认值，则认为是新用户（不管 localStorage 标记）
  // 这样可以处理 localStorage 被污染的情况
  const isNewUser = isDefaultBodyStats && isDefaultGoal && isDefaultActivity
  
  if (isNewUser) {
    // 如果是新用户，清除可能存在的错误标记
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding')
    if (hasCompletedOnboarding === 'true') {
      console.log('⚠️ 检测到 localStorage 中有已完成标记，但用户数据是默认值')
      console.log('🧹 清除错误的 localStorage 标记')
      localStorage.removeItem('hasCompletedOnboarding')
    }
  } else {
    // 如果不是新用户，检查 localStorage 标记（作为额外验证）
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding')
    console.log('📋 已完成引导标记:', hasCompletedOnboarding)
    if (hasCompletedOnboarding === 'true') {
      console.log('✅ 用户已完成过引导，不需要再次显示')
      console.log('=====================================')
      return false
    }
  }
  
  console.log('=====================================')
  console.log('🎯 最终判断结果:', isNewUser ? '✅ 是新用户' : '❌ 不是新用户')
  console.log('=====================================')
  
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
  console.log('=====================================')
  console.log('🏠 HomeView - 组件已挂载')
  console.log('=====================================')
  
  // 加载用户信息
  try {
    console.log('📡 开始获取用户资料...')
    const response = await getUserProfile()
    
    console.log('📥 收到用户资料响应:', response.success ? '✅ 成功' : '❌ 失败')
    
    if (response.success && response.data) {
      const user = response.data.user
      console.log('👤 用户信息:', {
        id: user.id,
        name: user.name,
        phone: user.phone,
        bodyStats: user.bodyStats,
        goalOrientation: user.goalOrientation,
        activityLevel: user.activityLevel
      })
      
      userName.value = user.name ? (user.name.length > 6 ? user.name.substring(0, 6) : user.name) : 'Terry'
      if (user.avatar) {
        userAvatar.value = user.avatar
      }
      
      // 检查是否是新用户，如果是则显示引导
      const isNewUser = checkIfNewUser(user)
      if (isNewUser) {
        console.log('=====================================')
        console.log('👋 检测到新用户，准备显示引导弹窗')
        console.log('=====================================')
        console.log('📝 showOnboarding 当前值:', showOnboarding.value)
        showOnboarding.value = true
        console.log('📝 showOnboarding 更新后值:', showOnboarding.value)
        console.log('=====================================')
      } else {
        console.log('ℹ️ 不是新用户，不显示引导弹窗')
      }
    } else {
      console.warn('⚠️ 获取用户资料失败:', response.message)
    }
  } catch (error) {
    console.error('❌ 加载用户信息异常:', error)
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
  
  console.log('=====================================')
  console.log('🏁 HomeView - 挂载流程结束')
  console.log('=====================================')
})

/**
 * 完成引导后的回调
 */
const handleOnboardingComplete = () => {
  console.log('✅ 用户完成引导设置')
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
  console.log('🔄 HomeView - 收到刷新记录事件')
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
