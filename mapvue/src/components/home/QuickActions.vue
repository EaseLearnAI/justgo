<script setup lang="ts">
import { ref } from 'vue'
import ActionSheet from '@/components/common/ActionSheet.vue'
import AppModal from '@/components/common/AppModal.vue'
import { analyzeFood, type FoodItem, type TotalCalories } from '@/api'
import { analyzeImageFood } from '@/api/vision'

// 定义事件
const emit = defineEmits<{
  (e: 'recordAdded'): void
}>()

const showPhotoSheet = ref(false)
const showInputModal = ref(false)
const showAnalysisModal = ref(false)
const isAnalyzing = ref(false)
const foodInput = ref('')
const analysisError = ref('')
const hasNewRecord = ref(false)  // 标记是否有新记录

// 图片选择 input ref
const fileInputRef = ref<HTMLInputElement | null>(null)
const currentImageSource = ref<'camera' | 'gallery'>('camera')

// 分析结果 - 支持三值热量
const analysisResult = ref<{
  foods: FoodItem[]
  totalCalories: TotalCalories
  summary: string
  scientificNote: string
}>({
  foods: [],
  totalCalories: { min: 0, estimated: 0, max: 0 },
  summary: '',
  scientificNote: ''
})

/**
 * 关闭分析结果弹窗，并通知父组件刷新记录
 */
const closeAnalysisModal = () => {
  showAnalysisModal.value = false
  
  // 如果有新记录，通知父组件刷新
  if (hasNewRecord.value) {
    console.log('🔄 通知刷新记录列表')
    emit('recordAdded')
    hasNewRecord.value = false
  }
}

const openCamera = () => {
  showPhotoSheet.value = false
  currentImageSource.value = 'camera'
  console.log('📷 打开相机拍照...')
  
  // 触发文件选择（优先使用相机）
  if (fileInputRef.value) {
    fileInputRef.value.accept = 'image/*'
    fileInputRef.value.capture = 'environment'  // 使用后置摄像头
    fileInputRef.value.click()
  }
}

const openGallery = () => {
  showPhotoSheet.value = false
  currentImageSource.value = 'gallery'
  console.log('🖼️ 从相册选择...')
  
  // 触发文件选择（从相册选择）
  if (fileInputRef.value) {
    fileInputRef.value.accept = 'image/*'
    fileInputRef.value.removeAttribute('capture')  // 移除 capture 以打开相册
    fileInputRef.value.click()
  }
}

/**
 * 处理图片选择
 */
const handleImageSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) {
    console.log('⚠️ 没有选择图片')
    return
  }
  
  console.log('=====================================')
  console.log('📸 选择了图片')
  console.log('=====================================')
  console.log('📝 文件名:', file.name)
  console.log('📝 文件大小:', (file.size / 1024).toFixed(2), 'KB')
  console.log('📝 文件类型:', file.type)
  console.log('📝 来源:', currentImageSource.value === 'camera' ? '相机拍摄' : '相册选择')
  
  // 清空 input 以便再次选择同一张图片
  target.value = ''
  
  // 开始分析
  await analyzeWithImage(file)
}

/**
 * 使用图片进行分析
 */
const analyzeWithImage = async (file: File) => {
  console.log('=====================================')
  console.log('🖼️ QuickActions - 开始图片食物热量分析')
  console.log('=====================================')
  
  showAnalysisModal.value = true
  isAnalyzing.value = true
  analysisError.value = ''
  
  try {
    console.log('-----------------------------------')
    console.log('🤖 调用后端视觉 AI 分析服务...')
    console.log('-----------------------------------')
    
    const response = await analyzeImageFood(file, true)
    
    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')
    
    if (response.success && response.data) {
      console.log('✅ 图片分析成功!')
      
      // 处理三值热量数据
      const totalCal = response.data.totalCalories
      const totalCalories: TotalCalories = typeof totalCal === 'number' 
        ? { min: Math.floor(totalCal * 0.85), estimated: totalCal, max: Math.ceil(totalCal * 1.15) }
        : totalCal
      
      analysisResult.value = {
        foods: response.data.analysis?.foods || [],
        totalCalories: totalCalories,
        summary: response.data.summary || '',
        scientificNote: response.data.scientificNote || '基于视觉 AI 识别估算'
      }
      
      console.log('📊 分析结果:')
      console.log('   - 食物数量:', analysisResult.value.foods.length)
      console.log('   - 估算热量:', totalCalories.estimated, 'kcal')
      
      if (response.data.savedRecords && response.data.savedRecords.length > 0) {
        console.log('💾 已保存记录数:', response.data.savedRecords.length)
        hasNewRecord.value = true
      }
    } else {
      console.error('❌ 图片分析失败:', response.message)
      analysisError.value = response.message || '图片分析失败，请稍后重试'
    }
  } catch (error: any) {
    console.error('❌ 图片分析异常:', error)
    analysisError.value = '网络请求失败，请检查网络连接'
  } finally {
    isAnalyzing.value = false
    console.log('=====================================')
    console.log('🏁 QuickActions - 图片食物热量分析流程结束')
    console.log('=====================================')
  }
}

const submitFood = () => {
  if (foodInput.value.trim()) {
    showInputModal.value = false
    analyzeWithAI(foodInput.value)
    foodInput.value = ''
  }
}

/**
 * 调用后端 AI 服务分析食物热量
 */
const analyzeWithAI = async (text: string) => {
  console.log('=====================================')
  console.log('🍽️ QuickActions - 开始食物热量分析')
  console.log('=====================================')
  console.log('📝 用户输入:', text)

  showAnalysisModal.value = true
  isAnalyzing.value = true
  analysisError.value = ''

  try {
    console.log('-----------------------------------')
    console.log('🤖 调用后端 AI 分析服务...')
    console.log('-----------------------------------')

    const response = await analyzeFood(text, true)

    console.log('-----------------------------------')
    console.log('📥 收到后端响应')
    console.log('-----------------------------------')

    if (response.success && response.data) {
      console.log('✅ 分析成功!')
      
      // 处理三值热量数据
      const totalCal = response.data.totalCalories
      const totalCalories: TotalCalories = typeof totalCal === 'number' 
        ? { min: Math.floor(totalCal * 0.85), estimated: totalCal, max: Math.ceil(totalCal * 1.15) }
        : totalCal
      
      analysisResult.value = {
        foods: response.data.analysis.foods || [],
        totalCalories: totalCalories,
        summary: response.data.summary,
        scientificNote: response.data.scientificNote || '基于常见食物标准热量估算'
      }

      console.log('📊 分析结果:')
      console.log('   - 食物数量:', analysisResult.value.foods.length)
      console.log('   - 估算热量:', totalCalories.estimated, 'kcal')
      console.log('   - 热量范围:', totalCalories.min, '-', totalCalories.max, 'kcal')
      
      if (response.data.savedRecords && response.data.savedRecords.length > 0) {
        console.log('💾 已保存记录数:', response.data.savedRecords.length)
        hasNewRecord.value = true  // 标记有新记录
      }
    } else {
      console.error('❌ 分析失败:', response.message)
      analysisError.value = response.message || '分析失败，请稍后重试'
      
      // 回退到本地分析
      fallbackLocalAnalysis(text)
    }
  } catch (error: any) {
    console.error('❌ 分析异常:', error)
    analysisError.value = '网络请求失败，使用本地分析'
    
    // 回退到本地分析
    fallbackLocalAnalysis(text)
  } finally {
    isAnalyzing.value = false
    console.log('=====================================')
    console.log('🏁 QuickActions - 食物热量分析流程结束')
    console.log('=====================================')
  }
}

/**
 * 本地分析回退方案（当后端不可用时）
 */
const fallbackLocalAnalysis = (text: string) => {
  console.log('⚠️ 使用本地分析回退方案')
  
  // 本地热量数据库
  const foodCalorieDB: Record<string, number> = {
    '拿铁': 180, '拿铁咖啡': 180, '咖啡': 150, '美式咖啡': 10,
    '奶茶': 350, '珍珠奶茶': 450, '绿茶': 0, '红茶': 0,
    '米饭': 230, '白米饭': 230, '炒饭': 450, '盖浇饭': 500,
    '面包': 280, '吐司': 250, '三明治': 350, '汉堡': 550,
    '薯条': 320, '炸鸡': 450, '炸鸡腿': 280, '炸鸡翅': 200,
    '苹果': 95, '香蕉': 105, '橙子': 62, '葡萄': 70,
    '牛肉': 250, '猪肉': 280, '鸡肉': 165, '鱼': 120,
    '鸡蛋': 78, '牛奶': 150, '酸奶': 120, '豆浆': 80,
    '沙拉': 120, '蓂菜': 50, '水果': 80, '饮料': 150,
    '蛋糕': 350, '巧克力': 550, '冰淇淋': 280, '饼干': 180,
    '披萨': 800, '火锅': 600, '寿司': 350, '包子': 220
  }

  let totalCalories = 0
  const foods: FoodItem[] = []

  for (const [key, value] of Object.entries(foodCalorieDB)) {
    if (text.includes(key)) {
      const min = Math.floor(value * 0.85)
      const max = Math.ceil(value * 1.15)
      foods.push({
        name: key,
        quantity: '1份',
        calorie_min: min,
        calorie_estimated: value,
        calorie_max: max,
        calories: value,
        unit: '份'
      })
      totalCalories += value
    }
  }

  if (foods.length === 0) {
    // 如果没有匹配到，使用默认值
    foods.push({
      name: text,
      quantity: '1份',
      calorie_min: 170,
      calorie_estimated: 200,
      calorie_max: 230,
      calories: 200,
      unit: '份'
    })
    totalCalories = 200
  }

  analysisResult.value = {
    foods,
    totalCalories: {
      min: Math.floor(totalCalories * 0.85),
      estimated: totalCalories,
      max: Math.ceil(totalCalories * 1.15)
    },
    summary: '本地分析结果，仅供参考',
    scientificNote: '基于本地食物数据库估算'
  }

  // 保存到本地存储
  saveToLocalStorage(foods, totalCalories)

  console.log('📊 本地分析结果:')
  console.log('   - 食物:', foods.map(f => f.name).join(', '))
  console.log('   - 总热量:', totalCalories, 'kcal')
}

/**
 * 保存到本地存储（回退方案）
 */
const saveToLocalStorage = (foods: FoodItem[], totalCalories: number) => {
  console.log('💾 保存到本地存储...')
  
  const records = JSON.parse(localStorage.getItem('foodRecords') || '[]')
  
  foods.forEach(food => {
    records.unshift({
      id: Date.now() + Math.random(),
      name: food.name,
      calories: food.calories,
      type: 'intake',
      time: new Date().toISOString()
    })
  })
  
  localStorage.setItem('foodRecords', JSON.stringify(records))
  console.log('💾 本地存储保存成功')
}
</script>

<template>
  <div class="quick-actions-section">
    <!-- 隐藏的文件选择 input -->
    <input 
      ref="fileInputRef"
      type="file" 
      accept="image/*"
      style="display: none;"
      @change="handleImageSelected"
    >
    
    <h3 class="section-title">今天吃了什么?</h3>
    <div class="action-cards">
      <div class="action-card" @click="showPhotoSheet = true">
        <div class="action-icon">
          <font-awesome-icon icon="camera" />
        </div>
        <span class="action-label">拍照识别</span>
      </div>
      <div class="action-card" @click="showInputModal = true">
        <div class="action-icon">
          <font-awesome-icon icon="pen" />
        </div>
        <span class="action-label">手动输入</span>
      </div>
    </div>

    <!-- Photo Action Sheet -->
    <ActionSheet :show="showPhotoSheet" @close="showPhotoSheet = false">
      <template #title>选择图片来源</template>
      <div class="action-option" @click="openCamera">
        <font-awesome-icon icon="camera" />
        <span>拍照</span>
      </div>
      <div class="action-option" @click="openGallery">
        <font-awesome-icon icon="images" />
        <span>从相册选择</span>
      </div>
    </ActionSheet>

    <!-- Input Modal -->
    <AppModal :show="showInputModal" title="输入食物信息" @close="showInputModal = false">
      <div class="input-group">
        <label>食物描述</label>
        <input 
          type="text" 
          v-model="foodInput" 
          class="input-field" 
          placeholder="例如：我吃了一个包子和鸡蛋"
          @keypress.enter="submitFood"
        >
        <p class="input-hint">支持自然语言输入，AI 将自动分析热量</p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showInputModal = false">取消</button>
        <button class="btn btn-primary" @click="submitFood">开始分析</button>
      </template>
    </AppModal>

    <!-- Analysis Modal -->
    <AppModal :show="showAnalysisModal" title="热量分析结果" @close="closeAnalysisModal">
      <div class="analysis-content">
        <div v-if="isAnalyzing" class="loading">
          <font-awesome-icon icon="spinner" spin class="loading-icon" />
          <p>AI 正在分析中...</p>
        </div>
        <div v-else-if="analysisError" class="error">
          <div class="error-icon">
            <font-awesome-icon icon="circle-exclamation" />
          </div>
          <p class="error-text">{{ analysisError }}</p>
        </div>
        <div v-else class="result">
          <!-- 结论区: 食物名 + 核心数值 -->
          <div class="result-header">
            <div v-if="analysisResult.foods.length > 1" class="food-list">
              <div v-for="(food, index) in analysisResult.foods" :key="index" class="food-item">
                <span class="food-name">{{ food.name }}</span>
                <span class="food-calories">≈ {{ food.calorie_estimated || food.calories }} kcal</span>
              </div>
            </div>
            <div v-else-if="analysisResult.foods.length === 1" class="single-food">
              <p class="food-title">{{ analysisResult.foods[0].name }}</p>
            </div>
          </div>
          
          <!-- 核心热量数值 -->
          <div class="calorie-main">
            <span class="calorie-symbol">≈</span>
            <span class="calorie-value">{{ analysisResult.totalCalories.estimated }}</span>
            <span class="calorie-unit">kcal</span>
          </div>
          
          <!-- 可信度区: 热量区间 -->
          <div class="confidence-block">
            <span class="confidence-label">热量区间：</span>
            <span class="confidence-range">{{ analysisResult.totalCalories.min }} – {{ analysisResult.totalCalories.max }} kcal</span>
          </div>
          
          <!-- 科学依据区 -->
          <div class="method-tag">
            <font-awesome-icon icon="chart-simple" />
            <span>{{ analysisResult.scientificNote || '基于标准食物热量数据估算' }}</span>
          </div>
          
          <!-- 健康建议区 -->
          <div class="advice-card" v-if="analysisResult.summary">
            <p class="advice-title">饮食建议</p>
            <p class="advice-content">{{ analysisResult.summary }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-primary" @click="closeAnalysisModal">确认</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 32px 0 16px;
}

.action-cards {
  display: flex;
  gap: 16px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--section-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
}

.action-card:active {
  transform: scale(0.98);
}

.action-icon {
  font-size: 24px;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.action-label {
  font-weight: 600;
  font-size: 14px;
}

.action-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  background: var(--section-background);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s;
}

.action-option:active {
  background: #E5E5EA;
}

.action-option svg {
  width: 24px;
  text-align: center;
  color: var(--text-primary);
  font-size: 20px;
}

.action-option span {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.analysis-content {
  text-align: center;
  padding: 24px 0;
}

.loading {
  padding: 20px 0;
}

.loading-icon {
  font-size: 32px;
  color: var(--primary-color);
  margin-bottom: 16px;
}

.loading p {
  color: var(--text-secondary);
}

/* 结果区样式优化 */
.result {
  text-align: center;
}

.result-header {
  margin-bottom: 8px;
}

.food-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

.calorie-main {
  margin: 16px 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.calorie-symbol {
  font-size: 24px;
  font-weight: 500;
  color: #FF9500;
}

.calorie-value {
  font-size: 48px;
  font-weight: 700;
  color: #FF9500;
  line-height: 1;
}

.calorie-main .calorie-unit {
  font-size: 18px;
  font-weight: 500;
  color: #FF9500;
  opacity: 0.8;
}

.confidence-block {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 16px;
  background: var(--section-background);
  border-radius: 20px;
  margin-bottom: 16px;
}

.confidence-label {
  font-size: 13px;
  color: var(--text-tertiary);
}

.confidence-range {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.method-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(0, 122, 255, 0.08);
  border-radius: 8px;
  font-size: 12px;
  color: #007AFF;
  margin-bottom: 16px;
}

.method-tag svg {
  font-size: 14px;
}

.advice-card {
  text-align: left;
  padding: 12px 16px;
  background: var(--section-background);
  border-radius: 12px;
  margin-top: 8px;
}

.advice-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.advice-content {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.input-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.food-list {
  margin-bottom: 16px;
  width: 100%;
}

.food-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--section-background);
  border-radius: 8px;
  margin-bottom: 8px;
}

.food-name {
  font-weight: 500;
}

.food-calories {
  color: #FF9500;
  font-weight: 600;
}

.single-food {
  margin-bottom: 8px;
}

.error {
  text-align: center;
  padding: 20px 0;
}

.error-icon {
  width: 60px;
  height: 60px;
  background: #FFF3E0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 28px;
  color: #FF9500;
}

.error-text {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
