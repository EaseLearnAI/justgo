<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getExerciseIntensity, updateExerciseFeeling, getPostExerciseState, updatePostExerciseState, type ExerciseFeeling, type PostExerciseState } from '@/api'
import { generatePersonalizedRoute, startExercise, type RoutePreferences } from '@/api/route'
import { getDailySummary } from '@/api/stats'
import { getCurrentLocation } from '@/utils/location'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  'exercise-started': [data: { routeId: string; calories: number; distance: string; duration: number }]
}>()

interface ExerciseTimes {
  walk: number
  run: number
  bike: number
}

const totalIntake = ref(0)
const recordCount = ref(0)
const exerciseTimes = ref<ExerciseTimes>({ walk: 10, run: 5, bike: 5 })
const currentType = ref<'walk' | 'run' | 'bike'>('walk')
const showProgressModal = ref(false)
const currentStep = ref(0)
const showResult = ref(false)
const generatedRoute = ref<any>(null)

// 运动感受偏好
const selectedFeeling = ref<PostExerciseState>('moderate')
const feelingOptions = [
  { value: 'relaxed' as const, emoji: '😌', label: '轻松', desc: '简简单单' },
  { value: 'moderate' as const, emoji: '🙂', label: '微微累', desc: '问题不大' },
  { value: 'intense' as const, emoji: '😤', label: '明显累', desc: '挑战一下自己' }
]

const exerciseTypes = [
  { type: 'walk', icon: 'person-walking', label: '步行' },
  { type: 'run', icon: 'person-running', label: '跑步' },
  { type: 'bike', icon: 'bicycle', label: '骑行' }
] as const

const preferences = ref([
  { label: '🏞️ Citywalk', selected: true },
  { label: '🌳 绿化多', selected: false },
  { label: '🌅 晴天出行', selected: false },
  { label: '🌄 田园风光', selected: false },
  { label: '🌊 沿水路线', selected: false },
  { label: '🚶 安静路线', selected: false },
  { label: '🏛️ 景观步道', selected: false },
  { label: '🌿 绿色呼吸', selected: false }
])

const steps = [
  { id: 'step1', title: '获取用户数据', desc: '读取身体数据与运动偏好' },
  { id: 'step2', title: 'AI 计算运动方案', desc: '分析热量消耗与运动时长' },
  { id: 'step3', title: '调用高德地图', desc: '获取周边路线与景点信息' },
  { id: 'step4', title: '生成运动路径', desc: '规划最佳路线与导航链接' }
]

const typeNames: Record<string, string> = { walk: '步行', run: '跑步', bike: '骑行' }
const selectedTypeName = computed(() => typeNames[currentType.value])
const estimatedTime = computed(() => exerciseTimes.value[currentType.value])

watch(() => props.show, (newVal) => {
  if (newVal) {
    updatePageData()
    loadUserFeelingPreference()
  }
})

/**
 * 加载用户的运动感受偏好
 */
const loadUserFeelingPreference = async () => {
  try {
    // 首先尝试获取新的运动后状态偏好
    const response = await getPostExerciseState()
    if (response.success && response.data) {
      selectedFeeling.value = response.data.preferredPostExerciseState as PostExerciseState
    } else {
      // 如果新的接口不可用，回退到旧的接口
      const oldResponse = await getExerciseIntensity()
      if (oldResponse.success && oldResponse.data) {
        selectedFeeling.value = oldResponse.data.exerciseIntensityPreference as PostExerciseState
      }
    }
  } catch (error) {
    // Error handling
  }
}

/**
 * 选择运动感受偏好
 */
const selectFeeling = async (feeling: PostExerciseState) => {
  selectedFeeling.value = feeling
  
  // 保存到后端
  try {
    await updatePostExerciseState(feeling)
  } catch (error) {
    // Error handling
  }
}

/**
 * 从后端获取今日摄入数据
 */
const getTodayIntake = async () => {
  try {
    const response = await getDailySummary()
    if (response.success && response.data) {
      return {
        total: response.data.intake,
        count: response.data.recordCount || 0
      }
    }
  } catch (error) {
    // Error handling
  }
  // 如果API调用失败，返回默认值
  return {
    total: 0,
    count: 0
  }
}

const calculateExerciseTime = (calories: number): ExerciseTimes => {
  return {
    walk: Math.max(10, Math.round(calories / 5.5)),
    run: Math.max(5, Math.round(calories / 10)),
    bike: Math.max(5, Math.round(calories / 12))
  }
}

const updatePageData = async () => {
  const intake = await getTodayIntake()
  totalIntake.value = intake.total
  recordCount.value = intake.count
  exerciseTimes.value = calculateExerciseTime(intake.total)
}

const selectExercise = (type: 'walk' | 'run' | 'bike') => {
  currentType.value = type
}

const togglePreference = (index: number) => {
  // 单选模式：取消其他选项的选择状态
  preferences.value.forEach((pref, i) => {
    pref.selected = i === index
  })
}

const startGeneration = () => {
  showProgressModal.value = true
  currentStep.value = 0
  showResult.value = false
  executeSteps()
}

const executeSteps = async () => {
  const stepDurations: number[] = [800, 1200, 1500, 1000]
  
  for (let i = 0; i < steps.length; i++) {
    currentStep.value = i + 1
    await sleep(stepDurations[i] ?? 1000)
  }
  
  await generateResult()
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const generateResult = async () => {
  const duration = exerciseTimes.value[currentType.value]
  const speeds: Record<'walk' | 'run' | 'bike', number> = { walk: 5, run: 8, bike: 15 }
  const caloriesPerMin: Record<'walk' | 'run' | 'bike', number> = { walk: 5.5, run: 10, bike: 12 }
  
  const speed = speeds[currentType.value]
  const calPerMin = caloriesPerMin[currentType.value]
  const distance = ((speed * duration) / 60).toFixed(1)
  const calories = Math.round(calPerMin * duration)
  
  // 准备路由偏好数据
  const routePreferences: RoutePreferences = {
    preferredPostExerciseState: selectedFeeling.value,
    routeStyle: preferences.value.filter(p => p.selected).map(p => p.label),
    mood: '放松' // 可以根据需要调整
  }
  
  try {
    // 获取用户当前位置
    let userLocation = null
    try {
      userLocation = await getCurrentLocation()
    } catch (locationError) {
      // 位置获取失败不影响路径生成，后端会使用 IP 定位
    }
    
    // 调用后端生成个性化路径，传递位置信息
    const routeResponse = await generatePersonalizedRoute(routePreferences, userLocation || undefined)
    
    if (routeResponse.success && routeResponse.data) {
      // 使用实际的路径数据（优先使用后端返回的估算消耗）
      const routeEstimatedCalories = routeResponse.data.routeSuggestion?.estimated_calories || 
        calories; // 如果后端没有返回，使用前端计算的
      
      generatedRoute.value = {
        routeId: routeResponse.data.routeId, // 保存路线ID
        type: currentType.value,
        distance: routeResponse.data.navigation.distance_km.toFixed(1),
        duration: routeResponse.data.navigation.duration_min,
        calories: routeEstimatedCalories, // 使用后端返回的估算消耗
        preferences: preferences.value.filter(p => p.selected).map(p => p.label),
        routeDetails: routeResponse.data.routeDetails,
        navigationUrl: routeResponse.data.navigationUrl, // 保存实际的导航链接
        routeSuggestion: routeResponse.data.routeSuggestion,
        motivationalMessage: routeResponse.data.motivationalMessage,
        safetyTips: routeResponse.data.safetyTips
      }
    } else {
      // 如果路由生成失败，回退到原来的计算方式
      generatedRoute.value = {
        type: currentType.value,
        distance,
        duration,
        calories,
        preferences: preferences.value.filter(p => p.selected).map(p => p.label)
      }
    }
  } catch (error) {
    // 如果路由生成失败，回退到原来的计算方式
    generatedRoute.value = {
      type: currentType.value,
      distance,
      duration,
      calories,
      preferences: preferences.value.filter(p => p.selected).map(p => p.label)
    }
  }
  
  showResult.value = true
}

const openAmap = async () => {
  // 使用实际生成的导航链接
  if (generatedRoute.value?.navigationUrl) {
    // 注意：路线在生成时就已经设置为 started 状态，并创建了消耗记录
    // 这里只需要触发事件通知前端刷新数据
    if (generatedRoute.value.routeId) {
      // 触发事件，通知父组件刷新数据
      emit('exercise-started', {
        routeId: generatedRoute.value.routeId,
        calories: Number(generatedRoute.value.calories) || 0,
        distance: generatedRoute.value.distance || '0.0',
        duration: Number(generatedRoute.value.duration) || 0
      })
      
      // 同时触发全局事件，让所有组件都能收到
      window.dispatchEvent(new CustomEvent('exercise-started', {
        detail: {
          routeId: generatedRoute.value.routeId,
          calories: Number(generatedRoute.value.calories) || 0,
          distance: generatedRoute.value.distance || '0.0',
          duration: Number(generatedRoute.value.duration) || 0
        }
      }))
    }
    
    // 打开高德地图
    window.location.href = generatedRoute.value.navigationUrl
    
    // 保存运动记录（开始运动时）
    saveExerciseRecord()
  } else {
    // 降级方案：使用默认链接
    const currentLat = 39.908823
    const currentLng = 116.397470
    const endLat = currentLat + 0.01
    const endLng = currentLng + 0.01
    
    const modeMap: Record<string, number> = { walk: 2, run: 2, bike: 3 }
    
    const amapUrl = `https://uri.amap.com/navigation?from=${currentLng},${currentLat},我的位置&to=${endLng},${endLat},终点&mode=${modeMap[currentType.value]}&policy=1&src=justgo&coordinate=gaode&callnative=1`
    
    window.location.href = amapUrl
    saveExerciseRecord()
  }
}

const saveExerciseRecord = () => {
  if (!generatedRoute.value) return
  
  const records = JSON.parse(localStorage.getItem('foodRecords') || '[]')
  const typeNameMap: Record<string, string> = { walk: '步行运动', run: '跑步运动', bike: '骑行运动' }
  
  records.unshift({
    id: Date.now(),
    name: typeNameMap[generatedRoute.value.type],
    calories: generatedRoute.value.calories,
    type: 'consume',
    time: new Date().toISOString(),
    duration: generatedRoute.value.duration,
    distance: generatedRoute.value.distance
  })
  
  localStorage.setItem('foodRecords', JSON.stringify(records))
}

const closeProgressModal = () => {
  if (showResult.value) {
    showProgressModal.value = false
  }
}

const closeMainModal = () => {
  if (!showProgressModal.value) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="exercise-modal-overlay" :class="{ show }" @click="closeMainModal">
      <div class="exercise-modal-container" :class="{ show }" @click.stop>
        <!-- Header -->
        <div class="modal-header">
          <button class="close-btn" @click="emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
          <h2 class="modal-title">消耗计划</h2>
          <div class="header-placeholder"></div>
        </div>

        <div class="modal-content">
          <!-- Status Bar -->
          <div class="status-bar">
            <div class="status-main">
              <span class="main-value">{{ totalIntake }}</span>
              <span class="unit">kcal</span>
            </div>
            <p class="sub-info">今日摄入 · 已记录 {{ recordCount }} 次</p>
          </div>

          <!-- Exercise Type Selector -->
          <p class="section-title">选择运动方式</p>
          <div class="segment-control">
            <div 
              v-for="exercise in exerciseTypes" 
              :key="exercise.type"
              class="segment-item"
              :class="{ selected: currentType === exercise.type }"
              @click="selectExercise(exercise.type)"
            >
              <font-awesome-icon :icon="exercise.icon" />
              <span class="seg-label">{{ exercise.label }}</span>
            </div>
          </div>



          <!-- 运动感受偏好 -->
          <p class="section-title">今天你希望运动结束后的状态是？</p>
          <div class="feeling-options">
            <div 
              v-for="option in feelingOptions" 
              :key="option.value"
              class="feeling-option"
              :class="{ selected: selectedFeeling === option.value }"
              @click="selectFeeling(option.value)"
            >
              <span class="feeling-emoji">{{ option.emoji }}</span>
              <div class="feeling-info">
                <span class="feeling-label">{{ option.label }}</span>
                <span class="feeling-desc">{{ option.desc }}</span>
              </div>
              <font-awesome-icon 
                v-if="selectedFeeling === option.value" 
                icon="check-circle" 
                class="feeling-check" 
              />
            </div>
          </div>

          <!-- Preferences -->
          <p class="section-title">今天想要的感觉</p>
          <div class="preference-tags">
            <span 
              v-for="(pref, index) in preferences"
              :key="index"
              class="preference-tag"
              :class="{ selected: pref.selected }"
              @click="togglePreference(index)"
            >
              {{ pref.label }}
            </span>
          </div>

          <!-- CTA Button -->
          <button class="cta-btn" @click="startGeneration">
            为我生成运动路线
          </button>
        </div>

        <!-- Progress Modal (nested) -->
        <div class="progress-modal" :class="{ show: showProgressModal }" @click="closeProgressModal">
          <div class="progress-content" @click.stop>
            <h3 class="progress-title">正在生成运动路线</h3>
            
            <div class="timeline">
              <div 
                v-for="(step, index) in steps"
                :key="step.id"
                class="timeline-item"
                :class="{ 
                  active: currentStep === index + 1,
                  completed: currentStep > index + 1
                }"
              >
                <div class="timeline-dot">
                  <font-awesome-icon icon="check" />
                </div>
                <div class="timeline-title">{{ step.title }}</div>
                <div class="timeline-desc">{{ step.desc }}</div>
              </div>
            </div>

            <!-- Result Section -->
            <div class="result-section" :class="{ show: showResult }">
              <div class="result-stats">
                <div class="result-stat">
                  <div class="result-stat-value">{{ generatedRoute?.distance }}</div>
                  <div class="result-stat-label">公里</div>
                </div>
                <div class="result-stat">
                  <div class="result-stat-value">{{ generatedRoute?.duration }}</div>
                  <div class="result-stat-label">分钟</div>
                </div>
                <div class="result-stat">
                  <div class="result-stat-value">{{ generatedRoute?.calories }}</div>
                  <div class="result-stat-label">kcal</div>
                </div>
              </div>
              <button class="nav-btn" @click="openAmap">
                <font-awesome-icon icon="location-arrow" />
                启动高德地图开始运动
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.exercise-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.exercise-modal-overlay.show {
  opacity: 1;
  visibility: visible;
}

.exercise-modal-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 100vh;
  background: #FAFAF8;
  border-radius: 20px 20px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
}

.exercise-modal-container.show {
  transform: translateY(0);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: #FAFAF8;
  border-radius: 20px 20px 0 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--section-background);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 16px;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
}

.header-placeholder {
  width: 32px;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 40px;
}

.status-bar {
  background: #F5F5F3;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 32px;
}

.status-main {
  display: flex;
  align-items: baseline;
}

.main-value {
  font-size: 32px;
  font-weight: 700;
  color: #2A2A2A;
  letter-spacing: -1px;
}

.unit {
  font-size: 14px;
  font-weight: 500;
  color: #9B9B9B;
  margin-left: 4px;
}

.sub-info {
  font-size: 13px;
  color: #9B9B9B;
  margin-top: 4px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #9B9B9B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
}

.segment-control {
  display: flex;
  background: #F0F0ED;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 20px;
}

.segment-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
}

.segment-item.selected {
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.segment-item svg {
  font-size: 20px;
  color: #9B9B9B;
  margin-bottom: 6px;
  transition: color 0.2s;
}

.segment-item.selected svg {
  color: #E8B88C;
}

.seg-label {
  font-size: 13px;
  font-weight: 500;
  color: #9B9B9B;
  transition: all 0.2s;
}

.segment-item.selected .seg-label {
  color: #2A2A2A;
  font-weight: 600;
}



.preference-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preference-tag {
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: 1px solid #E5E5E0;
  color: #9B9B9B;
  cursor: pointer;
  transition: all 0.2s;
}

.preference-tag.selected {
  background: rgba(232, 184, 140, 0.12);
  border-color: #E8B88C;
  color: #2A2A2A;
}

.cta-btn {
  display: block;
  width: 100%;
  padding: 16px;
  background: #2A2A2A;
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  border-radius: 10px;
  margin-top: 40px;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.cta-btn:hover {
  background: #1A1A1A;
}

/* Progress Modal */
.progress-modal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  border-radius: 20px 20px 0 0;
}

.progress-modal.show {
  opacity: 1;
  visibility: visible;
}

.progress-content {
  background: white;
  border-radius: 16px;
  width: calc(100% - 48px);
  max-width: 360px;
  padding: 28px 24px;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}

.progress-modal.show .progress-content {
  transform: translateY(0);
}

.progress-title {
  font-size: 18px;
  font-weight: 700;
  color: #2A2A2A;
  text-align: center;
  margin-bottom: 28px;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 28px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #E5E5E0;
}

.timeline-item {
  position: relative;
  padding-bottom: 24px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -28px;
  top: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #E5E5E0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.timeline-dot svg {
  font-size: 8px;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.timeline-item.active .timeline-dot {
  background: #E8B88C;
  box-shadow: 0 0 0 4px rgba(232, 184, 140, 0.2);
}

.timeline-item.active .timeline-dot::after {
  content: '';
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.timeline-item.completed .timeline-dot {
  background: #4CAF50;
}

.timeline-item.completed .timeline-dot svg {
  opacity: 1;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: #9B9B9B;
  margin-bottom: 4px;
  transition: color 0.3s;
}

.timeline-item.active .timeline-title,
.timeline-item.completed .timeline-title {
  color: #2A2A2A;
}

.timeline-desc {
  font-size: 12px;
  color: #C5C5C5;
  transition: color 0.3s;
}

.timeline-item.active .timeline-desc,
.timeline-item.completed .timeline-desc {
  color: #9B9B9B;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Result Section */
.result-section {
  display: none;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #EEEEE9;
  margin-top: 24px;
}

.result-section.show {
  display: block;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 20px;
}

.result-stat {
  text-align: center;
}

.result-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2A2A2A;
}

.result-stat-label {
  font-size: 12px;
  color: #9B9B9B;
  margin-top: 4px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.nav-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.nav-btn svg {
  font-size: 18px;
}
/* 运动感受选项 */
.feeling-options {
  display: flex;
  gap: 12px;
  margin: 20px 0 28px 0;
}

.feeling-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 16px 8px;
  background: var(--section-background);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.feeling-option:hover {
  background: var(--card-background);
}

.feeling-option.selected {
  border-color: var(--primary-color);
  background: rgba(52, 199, 89, 0.05);
}

.feeling-emoji {
  font-size: 24px;
  margin-bottom: 8px;
}

.feeling-info {
  text-align: center;
}

.feeling-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.feeling-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.feeling-check {
  color: var(--primary-color);
  font-size: 16px;
  margin-top: 8px;
}
</style>
