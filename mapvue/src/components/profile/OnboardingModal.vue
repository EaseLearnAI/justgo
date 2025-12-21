<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { updateBodyStats, updateGoalOrientation, updateActivityLevel, type GoalOrientation, type ActivityLevel } from '@/api'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  complete: []
  close: []
}>()

// 监听 show 属性变化
watch(() => props.show, (newVal) => {
  console.log('=====================================')
  console.log('🎭 OnboardingModal - show 属性变化')
  console.log('=====================================')
  console.log('📝 show 新值:', newVal)
  console.log('📝 currentStep:', currentStep.value)
  if (newVal) {
    console.log('✅ 弹窗应该显示')
    // 重置到第一步
    currentStep.value = 0
    console.log('🔄 已重置步骤到 0')
  } else {
    console.log('❌ 弹窗应该隐藏')
  }
  console.log('=====================================')
})

// 当前步骤 (0: 介绍, 1: 身体数据, 2: 目标导向, 3: 活动水平, 4: 完成)
const currentStep = ref(0)

// 步骤配置
const steps = [
  { id: 0, title: '欢迎', icon: '👋' },
  { id: 1, title: '身体数据', icon: '📏' },
  { id: 2, title: '目标导向', icon: '🎯' },
  { id: 3, title: '活动水平', icon: '🏋️' },
  { id: 4, title: '完成', icon: '✅' }
]

// 身体数据表单
const bodyStats = ref({
  height: '175',
  weight: '70',
  age: '25',
  gender: 'male' as 'male' | 'female'
})

// 目标导向
const selectedGoal = ref<GoalOrientation>('maintain')
const goalOptions = [
  { value: 'lose' as const, emoji: '📉', title: '减脂', desc: '减少体重，降低体脂率' },
  { value: 'maintain' as const, emoji: '🎯', title: '维持', desc: '保持当前体重和体脂率' },
  { value: 'gain' as const, emoji: '💪', title: '增肌', desc: '增加肌肉量，提升体能' }
]

// 活动水平
const selectedActivity = ref<ActivityLevel>('moderate')
const activityOptions = [
  { value: 'sedentary' as const, emoji: '🧋', title: '久坐少动', desc: '几乎没有运动，久坐办公' },
  { value: 'light' as const, emoji: '🚶', title: '轻度活动', desc: '每周运动 1-3 天' },
  { value: 'moderate' as const, emoji: '🏋️', title: '中度活动', desc: '每周运动 3-5 天' },
  { value: 'active' as const, emoji: '🏃', title: '高度活动', desc: '每周运动 6-7 天' },
  { value: 'very_active' as const, emoji: '🏋️‍♀️', title: '非常活跃', desc: '每天大强度训练或体力劳动' }
]

// 保存状态
const saving = ref(false)

// 计算当前步骤进度
const progress = computed(() => {
  return ((currentStep.value + 1) / steps.length) * 100
})

// 下一步
const nextStep = async () => {
  if (currentStep.value === 0) {
    // 从介绍页进入第一步
    currentStep.value = 1
  } else if (currentStep.value === 1) {
    // 保存身体数据
    await saveBodyStats()
  } else if (currentStep.value === 2) {
    // 保存目标导向
    await saveGoalOrientation()
  } else if (currentStep.value === 3) {
    // 保存活动水平并完成
    await saveActivityLevel()
  } else if (currentStep.value === 4) {
    // 完成引导
    emit('complete')
  }
}

// 上一步
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 保存身体数据
const saveBodyStats = async () => {
  saving.value = true
  try {
    const response = await updateBodyStats({
      height: parseInt(bodyStats.value.height) || 175,
      weight: parseInt(bodyStats.value.weight) || 70,
      age: parseInt(bodyStats.value.age) || 25,
      gender: bodyStats.value.gender
    })
    
    if (response.success) {
      currentStep.value = 2
    }
  } catch (error) {
    console.error('保存身体数据失败:', error)
  } finally {
    saving.value = false
  }
}

// 保存目标导向
const saveGoalOrientation = async () => {
  saving.value = true
  try {
    const response = await updateGoalOrientation(selectedGoal.value)
    
    if (response.success) {
      currentStep.value = 3
    }
  } catch (error) {
    console.error('保存目标导向失败:', error)
  } finally {
    saving.value = false
  }
}

// 保存活动水平
const saveActivityLevel = async () => {
  saving.value = true
  try {
    const response = await updateActivityLevel(selectedActivity.value)
    
    if (response.success) {
      currentStep.value = 4
    }
  } catch (error) {
    console.error('保存活动水平失败:', error)
  } finally {
    saving.value = false
  }
}

// 跳过引导
const skipOnboarding = () => {
  emit('close')
}

// 重置步骤（当弹窗关闭时）
const resetSteps = () => {
  currentStep.value = 0
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="onboarding-overlay" 
      :class="{ show: props.show }" 
      @click.self="skipOnboarding"
    >
      <div class="onboarding-container" :class="{ show: props.show }">
        <!-- 进度条 -->
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>

        <!-- 极简步骤指示器 -->
        <div class="timeline-steps">
          <div 
            v-for="(step, index) in steps.slice(1, 4)" 
            :key="step.id"
            class="timeline-step"
            :class="{ 
              active: currentStep === step.id,
              completed: currentStep > step.id
            }"
          >
            <div class="step-dot" v-if="currentStep === step.id || currentStep > step.id">
              <span v-if="currentStep > step.id" class="check-icon">●</span>
              <span v-else class="step-dot-inner"></span>
            </div>
            <div class="step-dot-empty" v-else></div>
            <div class="step-label">{{ step.title }}</div>
            <div v-if="index < 2" class="step-connector" :class="{ completed: currentStep > step.id }"></div>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="onboarding-content">
          <!-- 步骤 0: 欢迎页 -->
          <div v-if="currentStep === 0" class="step-content welcome-step">
            <h2 class="welcome-title">欢迎使用</h2>
            <p class="welcome-desc">
              只需 3 步，填写简单信息，即可获得更准确、更专业的运动计划和热量管理方案。
            </p>
            <div class="benefits-list">
              <div class="benefit-item">
                <font-awesome-icon icon="check-circle" class="benefit-icon" />
                <span>个性化运动计划</span>
              </div>
              <div class="benefit-item">
                <font-awesome-icon icon="check-circle" class="benefit-icon" />
                <span>精准热量计算</span>
              </div>
              <div class="benefit-item">
                <font-awesome-icon icon="check-circle" class="benefit-icon" />
                <span>专业数据管理</span>
              </div>
            </div>
            <p class="edit-hint">
              所有信息都可以在 <strong>"我的"</strong> 页面随时修改
            </p>
          </div>

          <!-- 步骤 1: 身体数据 -->
          <div v-if="currentStep === 1" class="step-content form-step">
            <h3 class="step-title">建立你的身体模型</h3>
            <p class="step-subtitle">用于更准确地估算每日消耗与运动强度</p>
            
            <div class="form-group">
              <label>身高</label>
              <div class="input-wrapper">
                <input 
                  type="number" 
                  v-model="bodyStats.height" 
                  class="form-input" 
                  placeholder="175"
                  min="100"
                  max="250"
                >
                <span class="input-unit">cm</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>体重</label>
              <div class="input-wrapper">
                <input 
                  type="number" 
                  v-model="bodyStats.weight" 
                  class="form-input" 
                  placeholder="70"
                  min="30"
                  max="200"
                >
                <span class="input-unit">kg</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>年龄</label>
              <div class="input-wrapper">
                <input 
                  type="number" 
                  v-model="bodyStats.age" 
                  class="form-input" 
                  placeholder="25"
                  min="10"
                  max="100"
                >
              </div>
            </div>
            
            <div class="form-group">
              <label>性别</label>
              <div class="gender-selector">
                <button 
                  class="gender-btn"
                  :class="{ active: bodyStats.gender === 'male' }"
                  @click="bodyStats.gender = 'male'"
                >
                  <span>男</span>
                </button>
                <button 
                  class="gender-btn"
                  :class="{ active: bodyStats.gender === 'female' }"
                  @click="bodyStats.gender = 'female'"
                >
                  <span>女</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 步骤 2: 目标导向 -->
          <div v-if="currentStep === 2" class="step-content form-step">
            <h3 class="step-title">选择目标导向</h3>
            <p class="step-subtitle">告诉我们您的健身目标，以便制定合适的计划</p>
            
            <div class="options-list">
              <button
                v-for="option in goalOptions"
                :key="option.value"
                class="option-card"
                :class="{ active: selectedGoal === option.value }"
                @click="selectedGoal = option.value"
              >
                <div class="option-content">
                  <div class="option-title">{{ option.title }}</div>
                  <div class="option-desc">{{ option.desc }}</div>
                </div>
                <font-awesome-icon 
                  v-if="selectedGoal === option.value" 
                  icon="check-circle" 
                  class="option-check" 
                />
              </button>
            </div>
          </div>

          <!-- 步骤 3: 活动水平 -->
          <div v-if="currentStep === 3" class="step-content form-step">
            <h3 class="step-title">选择日常活动水平</h3>
            <p class="step-subtitle">帮助我们了解您的日常运动习惯</p>
            
            <div class="options-list">
              <button
                v-for="option in activityOptions"
                :key="option.value"
                class="option-card"
                :class="{ active: selectedActivity === option.value }"
                @click="selectedActivity = option.value"
              >
                <div class="option-content">
                  <div class="option-title">{{ option.title }}</div>
                  <div class="option-desc">{{ option.desc }}</div>
                </div>
                <font-awesome-icon 
                  v-if="selectedActivity === option.value" 
                  icon="check-circle" 
                  class="option-check" 
                />
              </button>
            </div>
          </div>

          <!-- 步骤 4: 完成 -->
          <div v-if="currentStep === 4" class="step-content complete-step">
            <h2 class="complete-title">设置完成</h2>
            <p class="complete-desc">
              您的个性化运动计划已准备就绪，开始您的健康之旅吧！
            </p>
            <p class="edit-hint">
              如需修改信息，可在 <strong>"我的"</strong> 页面随时调整
            </p>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="onboarding-footer">
          <button 
            v-if="currentStep > 0 && currentStep < 4" 
            class="btn btn-secondary" 
            @click="prevStep"
            :disabled="saving"
          >
            上一步
          </button>
          <button 
            v-if="currentStep < 4"
            class="btn btn-primary" 
            @click="nextStep"
            :disabled="saving"
          >
            {{ saving ? '保存中...' : currentStep === 0 ? '开始设置' : '继续' }}
          </button>
          <button 
            v-if="currentStep === 4"
            class="btn btn-primary" 
            @click="emit('complete')"
          >
            开始使用
          </button>
          <button 
            v-if="currentStep === 0"
            class="btn btn-text" 
            @click="skipOnboarding"
          >
            稍后设置
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.onboarding-overlay.show {
  opacity: 1;
  visibility: visible;
}

.onboarding-container {
  background: #F5F6F7;
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  transform: scale(0.9) translateY(20px);
  transition: transform 0.3s ease;
  overflow: hidden;
}

.onboarding-overlay.show .onboarding-container {
  transform: scale(1) translateY(0);
}

/* 进度条 */
.progress-bar {
  height: 2px;
  background: #CFCFCF;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #5FB878;
  transition: width 0.3s ease;
}

/* 极简步骤指示器 */
.timeline-steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: white;
  border-bottom: 1px solid #E5E5EA;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5FB878;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.step-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5FB878;
}

.step-dot-empty {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
  border: 2px solid #CFCFCF;
  position: relative;
  z-index: 2;
}

.check-icon {
  font-size: 8px;
  color: #5FB878;
  line-height: 1;
}

.step-label {
  font-size: 13px;
  color: #8C8C8C;
  margin-top: 10px;
  font-weight: 400;
  transition: color 0.3s;
}

.timeline-step.active .step-label {
  color: #1F1F1F;
  font-weight: 500;
}

.timeline-step.completed .step-label {
  color: #8C8C8C;
}

.step-connector {
  position: absolute;
  top: 4px;
  left: calc(50% + 4px);
  right: calc(-50% + 4px);
  height: 1px;
  background: #CFCFCF;
  z-index: 1;
  transition: background 0.3s ease;
}

.step-connector.completed {
  background: #5FB878;
}

/* 内容区域 */
.onboarding-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  -webkit-overflow-scrolling: touch;
}

.step-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 欢迎页 */
.welcome-step {
  text-align: center;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  color: #1F1F1F;
  margin-bottom: 12px;
}

.welcome-desc {
  font-size: 15px;
  color: #8C8C8C;
  line-height: 1.6;
  margin-bottom: 24px;
  font-weight: 400;
}

.benefits-list {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  font-size: 15px;
  color: #1F1F1F;
  font-weight: 400;
}

.benefit-icon {
  color: #5FB878;
  font-size: 18px;
}

.edit-hint {
  font-size: 13px;
  color: #8C8C8C;
  line-height: 1.5;
  margin-top: 16px;
  font-weight: 400;
}

.edit-hint strong {
  color: #1F1F1F;
  font-weight: 500;
}

/* 表单步骤 */
.form-step {
  text-align: center;
}

.step-title {
  font-size: 24px;
  font-weight: 600;
  color: #1F1F1F;
  margin-bottom: 8px;
}

.step-subtitle {
  font-size: 14px;
  color: #8C8C8C;
  margin-bottom: 32px;
  font-weight: 400;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #8C8C8C;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  height: 56px;
  padding: 0 16px;
  padding-right: 50px;
  background: #F0F2F3;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  color: #1F1F1F;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  background: #E8E9EA;
}

.form-input::placeholder {
  color: #CFCFCF;
}

.input-unit {
  position: absolute;
  right: 16px;
  font-size: 14px;
  color: #8C8C8C;
  font-weight: 400;
  pointer-events: none;
}

.gender-selector {
  display: flex;
  gap: 12px;
}

.gender-btn {
  flex: 1;
  height: 56px;
  background: transparent;
  border: 1px solid #CFCFCF;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #8C8C8C;
  transition: all 0.2s;
  cursor: pointer;
}

.gender-btn.active {
  border-color: #5FB878;
  background: rgba(95, 184, 120, 0.08);
  color: #5FB878;
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid #CFCFCF;
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.option-card:active {
  transform: scale(0.98);
}

.option-card.active {
  border-color: #5FB878;
  background: rgba(95, 184, 120, 0.08);
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 500;
  color: #1F1F1F;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 13px;
  color: #8C8C8C;
  font-weight: 400;
}

.option-check {
  color: #5FB878;
  font-size: 18px;
  flex-shrink: 0;
}

/* 完成页 */
.complete-step {
  text-align: center;
}

.complete-title {
  font-size: 28px;
  font-weight: 600;
  color: #1F1F1F;
  margin-bottom: 12px;
}

.complete-desc {
  font-size: 15px;
  color: #8C8C8C;
  line-height: 1.6;
  margin-bottom: 24px;
  font-weight: 400;
}

/* 底部按钮 */
.onboarding-footer {
  padding: 20px 24px;
  background: white;
  border-top: 1px solid #E5E5EA;
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #1F1F1F;
  color: white;
}

.btn-primary:active:not(:disabled) {
  background: #0F0F0F;
}

.btn-secondary {
  background: #F0F2F3;
  color: #1F1F1F;
}

.btn-secondary:active:not(:disabled) {
  background: #E8E9EA;
}

.btn-text {
  background: transparent;
  color: #8C8C8C;
  font-weight: 400;
}

.btn-text:active {
  color: #1F1F1F;
}
</style>



