<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TabBar from '@/components/common/TabBar.vue'
import AppModal from '@/components/common/AppModal.vue'
import ActionSheet from '@/components/common/ActionSheet.vue'
import AppToast from '@/components/common/AppToast.vue'
import UserProfileCard from '@/components/profile/UserProfileCard.vue'
import StatsCard from '@/components/profile/StatsCard.vue'
import GoalProgress from '@/components/profile/GoalProgress.vue'
import AchievementsSection from '@/components/profile/AchievementsSection.vue'
import ProfileMenu from '@/components/profile/ProfileMenu.vue'
import SettingsSidebar from '@/components/profile/SettingsSidebar.vue'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import { getUserProfile, updateBodyStats, updateGoalOrientation, updateActivityLevel, type GoalOrientation, type ActivityLevel } from '@/api'

const router = useRouter()

// Loading states
const loading = ref(false)
const savingBodyStats = ref(false)

// Modals
const showBodyStatsModal = ref(false)
const showGoalOrientationSheet = ref(false)
const showActivityLevelSheet = ref(false)

// Body Stats Form
const userHeight = ref('175')
const userWeight = ref('70')
const userAge = ref('25')
const userGender = ref<'male' | 'female'>('male')

// Goal Orientation and Activity Level
const currentGoalOrientation = ref<GoalOrientation>('maintain')
const currentActivityLevel = ref<ActivityLevel>('moderate')

// Settings Sidebar
const showSettingsSidebar = ref(false)

// Edit Profile Modal
const showEditProfileModal = ref(false)
const userProfileCardRef = ref<InstanceType<typeof UserProfileCard> | null>(null)
const statsCardRef = ref<InstanceType<typeof StatsCard> | null>(null)
const goalProgressRef = ref<InstanceType<typeof GoalProgress> | null>(null)

// Toast状态
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')

/**
 * 处理运动开始事件
 */
const handleExerciseStarted = () => {
  console.log('🔄 ProfileView: 收到运动开始事件，刷新数据')
  
  // 刷新统计卡片
  if (statsCardRef.value) {
    statsCardRef.value.refresh()
  }
  
  // 刷新目标进度
  if (goalProgressRef.value) {
    goalProgressRef.value.refresh()
  }
}

onMounted(() => {
  loadUserProfile()
  
  // 监听运动开始事件，刷新数据
  window.addEventListener('exercise-started', handleExerciseStarted)
})

onUnmounted(() => {
  window.removeEventListener('exercise-started', handleExerciseStarted)
})

/**
 * 从后端加载用户资料
 */
const loadUserProfile = async () => {
  console.log('=====================================')
  console.log('📂 ProfileView - 开始加载用户资料')
  console.log('=====================================')
  
  loading.value = true
  
  try {
    const response = await getUserProfile()
    
    if (response.success && response.data) {
      const user = response.data.user
      
      // 更新身体数据
      if (user.bodyStats) {
        userHeight.value = String(user.bodyStats.height || 175)
        userWeight.value = String(user.bodyStats.weight || 70)
        userAge.value = String(user.bodyStats.age || 25)
        userGender.value = user.bodyStats.gender || 'male'
        console.log('📊 身体数据已加载:', user.bodyStats)
      }
      
      // 更新目标导向和活动水平
      if (user.goalOrientation) {
        currentGoalOrientation.value = user.goalOrientation
        console.log('🎯 目标导向已加载:', user.goalOrientation)
      }
      if (user.activityLevel) {
        currentActivityLevel.value = user.activityLevel
        console.log('🏋️ 活动水平已加载:', user.activityLevel)
      }
      
      console.log('✅ ProfileView - 用户资料加载成功')
    } else {
      console.warn('⚠️ 用户资料加载失败，使用本地存储作为备份')
      loadFromLocalStorage()
    }
  } catch (error) {
    console.error('❌ 加载用户资料异常:', error)
    loadFromLocalStorage()
  } finally {
    loading.value = false
    console.log('=====================================')
    console.log('🏁 ProfileView - 用户资料加载流程结束')
    console.log('=====================================')
  }
}

/**
 * 从本地存储加载数据（备用方案）
 */
const loadFromLocalStorage = () => {
  console.log('📦 从本地存储加载数据...')
  
  userHeight.value = localStorage.getItem('userHeight') || '175'
  userWeight.value = localStorage.getItem('userWeight') || '70'
  userAge.value = localStorage.getItem('userAge') || '25'
  userGender.value = (localStorage.getItem('userGender') as 'male' | 'female') || 'male'
  console.log('📦 本地存储数据加载完成')
}

/**
 * 保存身体数据到后端
 */
const saveBodyStats = async () => {
  console.log('=====================================')
  console.log('📊 开始保存身体数据')
  console.log('=====================================')
  
  savingBodyStats.value = true
  
  const bodyStatsData = {
    height: parseInt(userHeight.value) || 175,
    weight: parseInt(userWeight.value) || 70,
    age: parseInt(userAge.value) || 25,
    gender: userGender.value
  }
  
  console.log('📝 身体数据:', bodyStatsData)
  
  try {
    console.log('-----------------------------------')
    console.log('🌐 准备调用后端更新身体数据 API')
    console.log('-----------------------------------')
    
    const response = await updateBodyStats(bodyStatsData)
    
    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')
    
    if (response.success) {
      console.log('✅ 身体数据保存成功！')
      
      // 同步更新本地存储
      localStorage.setItem('userHeight', userHeight.value)
      localStorage.setItem('userWeight', userWeight.value)
      localStorage.setItem('userAge', userAge.value)
      localStorage.setItem('userGender', userGender.value)
      console.log('💾 本地存储已同步')
      
      showBodyStatsModal.value = false
      showSuccessToast('身体数据保存成功！')
    } else {
      console.error('❌ 保存身体数据失败:', response.message)
      showErrorToast(response.message || '保存失败，请稍后重试')
    }
  } catch (error) {
    console.error('❌ 保存身体数据异常:', error)
    showErrorToast('保存失败，请稍后重试')
  } finally {
    savingBodyStats.value = false
    console.log('=====================================')
    console.log('🏁 身体数据保存流程结束')
    console.log('=====================================')
  }
}

/**
 * 退出登录
 */
const logout = () => {
  if (confirm('确定要退出登录吗？')) {
    console.log('=====================================')
    console.log('🚪 用户退出登录')
    console.log('=====================================')
    
    localStorage.removeItem('userLoggedIn')
    localStorage.removeItem('userName')
    localStorage.removeItem('token')
    
    console.log('🗑️ 已清除登录状态')
    console.log('🔄 跳转到登录页面')
    
    router.push('/login')
  }
}

/**
 * 保存目标导向
 */
const saveGoalOrientation = async (orientation: GoalOrientation) => {
  console.log('=====================================')
  console.log('🎯 开始保存目标导向')
  console.log('=====================================')
  console.log('📝 新目标导向:', orientation)
  
  try {
    const response = await updateGoalOrientation(orientation)
    
    if (response.success) {
      console.log('✅ 目标导向保存成功！')
      currentGoalOrientation.value = orientation
      showGoalOrientationSheet.value = false
      showSuccessToast('目标导向设置成功！')
    } else {
      console.error('❌ 保存目标导向失败:', response.message)
      showErrorToast(response.message || '保存失败，请稍后重试')
    }
  } catch (error) {
    console.error('❌ 保存目标导向异常:', error)
    showErrorToast('保存失败，请稍后重试')
  } finally {
    console.log('=====================================')
    console.log('🏁 目标导向保存流程结束')
    console.log('=====================================')
  }
}

/**
 * 保存活动水平
 */
const saveActivityLevel = async (level: ActivityLevel) => {
  console.log('=====================================')
  console.log('🏋️ 开始保存活动水平')
  console.log('=====================================')
  console.log('📝 新活动水平:', level)
  
  try {
    const response = await updateActivityLevel(level)
    
    if (response.success) {
      console.log('✅ 活动水平保存成功！')
      currentActivityLevel.value = level
      showActivityLevelSheet.value = false
      showSuccessToast('活动水平设置成功！')
    } else {
      console.error('❌ 保存活动水平失败:', response.message)
      showErrorToast(response.message || '保存失败，请稍后重试')
    }
  } catch (error) {
    console.error('❌ 保存活动水平异常:', error)
    showErrorToast('保存失败，请稍后重试')
  } finally {
    console.log('=====================================')
    console.log('🏁 活动水平保存流程结束')
    console.log('=====================================')
  }
}

/**
 * 显示成功Toast
 */
const showSuccessToast = (message: string) => {
  toastMessage.value = message
  toastType.value = 'success'
  showToast.value = true
}

/**
 * 显示失败Toast
 */
const showErrorToast = (message: string) => {
  toastMessage.value = message
  toastType.value = 'error'
  showToast.value = true
}

// 编辑个人信息
const handleEditProfile = () => {
  showEditProfileModal.value = true
}

const handleProfileSaved = () => {
  showSuccessToast('个人信息已更新！')
  // 刷新用户信息卡片
  userProfileCardRef.value?.refresh()
}
</script>

<template>
  <div class="profile-page">
    <!-- Header -->
    <header class="profile-header">
      <h1>我的</h1>
      <button class="settings-btn" @click="showSettingsSidebar = true">
        <font-awesome-icon icon="gear" />
      </button>
    </header>

    <div class="content">
      <!-- User Info -->
      <UserProfileCard ref="userProfileCardRef" @edit-profile="handleEditProfile" />

      <!-- Stats -->
      <StatsCard ref="statsCardRef" />

      <!-- Goal Progress -->
      <GoalProgress ref="goalProgressRef" />

      <!-- Achievements -->
      <AchievementsSection />

      <!-- Menu -->
      <ProfileMenu 
        @show-body-stats="showBodyStatsModal = true"
        @show-goal-orientation="showGoalOrientationSheet = true"
        @show-activity-level="showActivityLevelSheet = true"
      />
    </div>

    <TabBar />

    <!-- Body Stats Modal -->
    <AppModal :show="showBodyStatsModal" title="身体数据" @close="showBodyStatsModal = false">
      <div class="input-group">
        <label>身高 (cm)</label>
        <input type="number" v-model="userHeight" class="input-field" placeholder="175">
      </div>
      <div class="input-group">
        <label>体重 (kg)</label>
        <input type="number" v-model="userWeight" class="input-field" placeholder="70">
      </div>
      <div class="input-group">
        <label>年龄</label>
        <input type="number" v-model="userAge" class="input-field" placeholder="25">
      </div>
      <div class="input-group">
        <label>性别</label>
        <select v-model="userGender" class="input-field">
          <option value="male">男</option>
          <option value="female">女</option>
        </select>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showBodyStatsModal = false">取消</button>
        <button class="btn btn-primary" @click="saveBodyStats" :disabled="savingBodyStats">
          {{ savingBodyStats ? '保存中...' : '保存' }}
        </button>
      </template>
    </AppModal>

    <!-- Settings Sidebar -->
    <SettingsSidebar 
      :show="showSettingsSidebar" 
      @close="showSettingsSidebar = false"
      @logout="logout"
      @edit-profile="handleEditProfile"
    />

    <!-- Goal Orientation ActionSheet -->
    <ActionSheet :show="showGoalOrientationSheet" @close="showGoalOrientationSheet = false">
      <template #title>选择目标导向</template>
      <button 
        class="action-option" 
        :class="{ active: currentGoalOrientation === 'lose' }"
        @click="saveGoalOrientation('lose')"
      >
        <div class="option-icon">📉</div>
        <div class="option-content">
          <div class="option-title">减脂</div>
          <div class="option-desc">减少体重，降低体脂率</div>
        </div>
        <font-awesome-icon v-if="currentGoalOrientation === 'lose'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentGoalOrientation === 'maintain' }"
        @click="saveGoalOrientation('maintain')"
      >
        <div class="option-icon">🎯</div>
        <div class="option-content">
          <div class="option-title">维持</div>
          <div class="option-desc">保持当前体重和体脂率</div>
        </div>
        <font-awesome-icon v-if="currentGoalOrientation === 'maintain'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentGoalOrientation === 'gain' }"
        @click="saveGoalOrientation('gain')"
      >
        <div class="option-icon">💪</div>
        <div class="option-content">
          <div class="option-title">增肌</div>
          <div class="option-desc">增加肌肉量，提升体能</div>
        </div>
        <font-awesome-icon v-if="currentGoalOrientation === 'gain'" icon="check-circle" class="check-icon" />
      </button>
    </ActionSheet>

    <!-- Activity Level ActionSheet -->
    <ActionSheet :show="showActivityLevelSheet" @close="showActivityLevelSheet = false">
      <template #title>选择日常活动水平</template>
      <button 
        class="action-option" 
        :class="{ active: currentActivityLevel === 'sedentary' }"
        @click="saveActivityLevel('sedentary')"
      >
        <div class="option-icon">🧋</div>
        <div class="option-content">
          <div class="option-title">久坐少动</div>
          <div class="option-desc">几乎没有运动，久坐办公</div>
        </div>
        <font-awesome-icon v-if="currentActivityLevel === 'sedentary'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentActivityLevel === 'light' }"
        @click="saveActivityLevel('light')"
      >
        <div class="option-icon">🚶</div>
        <div class="option-content">
          <div class="option-title">轻度活动</div>
          <div class="option-desc">每周运动 1-3 天</div>
        </div>
        <font-awesome-icon v-if="currentActivityLevel === 'light'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentActivityLevel === 'moderate' }"
        @click="saveActivityLevel('moderate')"
      >
        <div class="option-icon">🏋️</div>
        <div class="option-content">
          <div class="option-title">中度活动</div>
          <div class="option-desc">每周运动 3-5 天</div>
        </div>
        <font-awesome-icon v-if="currentActivityLevel === 'moderate'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentActivityLevel === 'active' }"
        @click="saveActivityLevel('active')"
      >
        <div class="option-icon">🏃</div>
        <div class="option-content">
          <div class="option-title">高度活动</div>
          <div class="option-desc">每周运动 6-7 天</div>
        </div>
        <font-awesome-icon v-if="currentActivityLevel === 'active'" icon="check-circle" class="check-icon" />
      </button>
      <button 
        class="action-option" 
        :class="{ active: currentActivityLevel === 'very_active' }"
        @click="saveActivityLevel('very_active')"
      >
        <div class="option-icon">🏋️‍♀️</div>
        <div class="option-content">
          <div class="option-title">非常活跃</div>
          <div class="option-desc">每天大强度训练或体力劳动</div>
        </div>
        <font-awesome-icon v-if="currentActivityLevel === 'very_active'" icon="check-circle" class="check-icon" />
      </button>
    </ActionSheet>

    <!-- Edit Profile Modal -->
    <EditProfileModal 
      :show="showEditProfileModal" 
      @close="showEditProfileModal = false"
      @saved="handleProfileSaved"
    />

    <!-- Toast 提示 -->
    <AppToast 
      :show="showToast" 
      :message="toastMessage" 
      :type="toastType" 
      @close="showToast = false" 
    />
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
}

.profile-header {
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

.profile-header h1 {
  font-size: 28px;
  font-weight: 700;
}

.settings-btn {
  width: 40px;
  height: 40px;
  background: var(--section-background);
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
}

.input-field {
  height: 56px;
}

/* Action Sheet Options */
.action-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--card-background);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.action-option:active {
  transform: scale(0.98);
}

.action-option.active {
  border-color: var(--primary-color);
  background: rgba(52, 199, 89, 0.05);
}

.option-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.option-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

.check-icon {
  color: var(--primary-color);
  font-size: 20px;
}
</style>
