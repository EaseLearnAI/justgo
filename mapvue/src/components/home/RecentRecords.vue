<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getTodayRecords, getRecordsByDate, type SavedFoodRecord } from '@/api'

interface FoodRecord {
  id: string
  name: string
  calories: number
  calorieMin?: number
  calorieMax?: number
  type: 'intake' | 'consume'
  time: string
}

const records = ref<FoodRecord[]>([])
const currentFilter = ref('all')
const showDropdown = ref(false)
const loading = ref(false)

// 日期选择相关
const showDatePicker = ref(false)
const selectedDate = ref(new Date())
const currentMonth = ref(new Date())

// 格式化日期为 YYYY-MM-DD
const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 检查是否是今天
const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}

// 获取显示的日期标签
const dateLabel = computed(() => {
  if (isToday(selectedDate.value)) {
    return '今天'
  }
  const month = selectedDate.value.getMonth() + 1
  const day = selectedDate.value.getDate()
  return `${month}月${day}日`
})

// 获取当月天数
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

// 获取当月第一天是星期几
const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

// 生成日历数据
const calendarDays = computed(() => {
  const days: { date: number; isCurrentMonth: boolean; fullDate: Date }[] = []
  const daysInMonth = getDaysInMonth(currentMonth.value)
  const firstDay = getFirstDayOfMonth(currentMonth.value)
  
  // 上一个月的天数
  const prevMonthDays = getDaysInMonth(new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1))
  
  // 填充上月剩余天数
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = prevMonthDays - i
    days.push({
      date,
      isCurrentMonth: false,
      fullDate: new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, date)
    })
  }
  
  // 填充本月天数
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      isCurrentMonth: true,
      fullDate: new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), i)
    })
  }
  
  // 填充下月天数（补全 6 行）
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: i,
      isCurrentMonth: false,
      fullDate: new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, i)
    })
  }
  
  return days
})

// 月份标签
const monthLabel = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

// 切换月份
const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1)
}

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1)
}

// 选择日期
const selectDate = (day: { date: number; isCurrentMonth: boolean; fullDate: Date }) => {
  selectedDate.value = day.fullDate
  showDatePicker.value = false
  loadRecordsByDate(day.fullDate)
}

// 快速选择今天
const selectToday = () => {
  selectedDate.value = new Date()
  currentMonth.value = new Date()
  showDatePicker.value = false
  loadRecords()
}

// 检查日期是否被选中
const isSelectedDate = (day: { fullDate: Date }): boolean => {
  return day.fullDate.getFullYear() === selectedDate.value.getFullYear() &&
         day.fullDate.getMonth() === selectedDate.value.getMonth() &&
         day.fullDate.getDate() === selectedDate.value.getDate()
}

// 检查是否是今天的日期格子
const isTodayDate = (day: { fullDate: Date }): boolean => {
  return isToday(day.fullDate)
}

// 检查是否是未来日期
const isFutureDate = (day: { fullDate: Date }): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return day.fullDate > today
}

const filteredRecords = computed(() => {
  if (currentFilter.value === 'all') {
    return records.value
  }
  return records.value.filter(r => r.type === currentFilter.value)
})

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'intake', label: '摄入' },
  { value: 'consume', label: '消耗' }
]

const filterLabel = computed(() => {
  return filterOptions.find(o => o.value === currentFilter.value)?.label || '全部'
})

onMounted(() => {
  loadRecords()
})

/**
 * 从后端 API 加载今日记录
 */
const loadRecords = async () => {
  loading.value = true
  
  try {
    const response = await getTodayRecords()
    
    if (response.success && response.data) {
      // 转换后端数据格式
      records.value = response.data.records.map((record: SavedFoodRecord) => ({
        id: record._id,
        name: record.name,
        calories: record.calories,
        calorieMin: record.calorieMin || Math.floor(record.calories * 0.85),
        calorieMax: record.calorieMax || Math.ceil(record.calories * 1.15),
        type: record.type,
        time: record.time
      }))
    } else {
      loadFromLocalStorage()
    }
  } catch (error) {
    loadFromLocalStorage()
  } finally {
    loading.value = false
  }
}

/**
 * 根据指定日期加载记录
 */
const loadRecordsByDate = async (date: Date) => {
  const dateStr = formatDateToString(date)
  
  loading.value = true
  
  try {
    const response = await getRecordsByDate(dateStr)
    
    if (response.success && response.data) {
      records.value = response.data.records.map((record: SavedFoodRecord) => ({
        id: record._id,
        name: record.name,
        calories: record.calories,
        calorieMin: record.calorieMin || Math.floor(record.calories * 0.85),
        calorieMax: record.calorieMax || Math.ceil(record.calories * 1.15),
        type: record.type,
        time: record.time
      }))
    } else {
      records.value = []
    }
  } catch (error) {
    records.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 从本地存储加载（回退方案）
 */
const loadFromLocalStorage = () => {
  const today = new Date().toDateString()
  const allRecords = JSON.parse(localStorage.getItem('foodRecords') || '[]')
  const todayRecords = allRecords.filter((r: any) => 
    new Date(r.time).toDateString() === today
  )
  
  records.value = todayRecords.map((r: any) => ({
    id: r.id || r._id || String(Date.now()),
    name: r.name,
    calories: r.calories,
    calorieMin: r.calorieMin || Math.floor(r.calories * 0.85),
    calorieMax: r.calorieMax || Math.ceil(r.calories * 1.15),
    type: r.type,
    time: r.time
  }))
  
  // 如果没有记录，显示演示数据
  if (records.value.length === 0) {
    records.value = [
      { id: '1', name: '晚间散步', calories: 120, calorieMin: 100, calorieMax: 140, type: 'consume', time: new Date().toISOString() },
      { id: '2', name: '拿铁咖啡', calories: 180, calorieMin: 150, calorieMax: 210, type: 'intake', time: new Date().toISOString() },
      { id: '3', name: '晨跑', calories: 250, calorieMin: 210, calorieMax: 290, type: 'consume', time: new Date().toISOString() }
    ]
  }
}

/**
 * 刷新记录（供外部调用）
 */
const refreshRecords = () => {
  loadRecords()
}

// 暴露刷新方法
defineExpose({ refreshRecords })

const setFilter = (filter: string) => {
  currentFilter.value = filter
  showDropdown.value = false
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  
  if (recordDate.getTime() === todayDate.getTime()) {
    return `今天 ${timeStr}`
  }
  
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日 ${timeStr}`
}

const getIconClass = (record: FoodRecord) => {
  if (record.type === 'consume') {
    if (record.name.includes('跑')) return 'person-running'
    return 'person-walking'
  }
  if (record.name.includes('咖啡')) return 'mug-hot'
  return 'utensils'
}

const getIconBg = (record: FoodRecord) => {
  if (record.type === 'consume') {
    if (record.name.includes('跑')) return '#E3F2FD'
    return 'var(--primary-green-weak)'
  }
  return '#FFF4E5'
}

const getIconColor = (record: FoodRecord) => {
  if (record.type === 'consume') {
    if (record.name.includes('跑')) return '#007AFF'
    return 'var(--primary-color)'
  }
  return '#FF9500'
}
</script>

<template>
  <div class="recent-records-section">
    <div class="section-header">
      <h3 class="section-title">近期记录</h3>
      <div class="header-actions">
        <!-- 日历按钮 -->
        <div class="date-picker-container">
          <span class="date-btn" @click="showDatePicker = !showDatePicker">
            <font-awesome-icon icon="calendar-alt" />
            <span class="date-label">{{ dateLabel }}</span>
          </span>
          
          <!-- 移动端日历弹窗 -->
          <Teleport to="body">
            <div class="date-picker-overlay" v-if="showDatePicker" @click="showDatePicker = false">
              <div class="date-picker-modal" @click.stop>
                <div class="date-picker-header">
                  <button class="month-nav-btn" @click="prevMonth">
                    <font-awesome-icon icon="chevron-left" />
                  </button>
                  <span class="month-label">{{ monthLabel }}</span>
                  <button class="month-nav-btn" @click="nextMonth">
                    <font-awesome-icon icon="chevron-right" />
                  </button>
                </div>
                
                <div class="weekday-header">
                  <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
                </div>
                
                <div class="calendar-grid">
                  <button
                    v-for="(day, index) in calendarDays"
                    :key="index"
                    class="calendar-day"
                    :class="{
                      'other-month': !day.isCurrentMonth,
                      'selected': isSelectedDate(day),
                      'today': isTodayDate(day),
                      'disabled': isFutureDate(day)
                    }"
                    :disabled="isFutureDate(day)"
                    @click="selectDate(day)"
                  >
                    {{ day.date }}
                  </button>
                </div>
                
                <div class="date-picker-footer">
                  <button class="today-btn" @click="selectToday">返回今天</button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
        
        <!-- 筛选下拉 -->
        <div class="filter-container">
          <span class="filter-btn" @click="showDropdown = !showDropdown">
            {{ filterLabel }}
            <font-awesome-icon icon="chevron-down" />
          </span>
          <div class="filter-dropdown" :class="{ show: showDropdown }">
            <span 
              v-for="option in filterOptions" 
              :key="option.value"
              class="filter-option"
              :class="{ active: currentFilter === option.value }"
              @click="setFilter(option.value)"
            >
              {{ option.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="records-scroll-area">
      <div class="records-container">
        <div v-if="loading" class="empty-state">
          <font-awesome-icon icon="spinner" spin class="empty-icon" />
          <p>加载中...</p>
        </div>
        
        <div v-else-if="filteredRecords.length === 0" class="empty-state">
          <font-awesome-icon icon="utensils" class="empty-icon" />
          <p>{{ isToday(selectedDate) ? '今天还没有记录，快去记录你的饮食吧！' : '该日期没有记录' }}</p>
        </div>
        
        <div 
          v-for="record in filteredRecords" 
          :key="record.id"
          class="record-card"
        >
          <div class="record-left">
            <div 
              class="record-icon" 
              :style="{ background: getIconBg(record), color: getIconColor(record) }"
            >
              <font-awesome-icon :icon="getIconClass(record)" />
            </div>
            <div class="record-info">
              <p class="record-name">{{ record.name }}</p>
              <p class="record-time">{{ formatTime(record.time) }}</p>
            </div>
          </div>
          <div class="record-right">
            <p 
              class="record-calories"
              :style="{ color: record.type === 'intake' ? '#FF9500' : 'var(--primary-color)' }"
            >
              ≈ {{ record.calories }} <span class="calorie-unit">kcal</span>
            </p>
            <p class="record-range" v-if="record.calorieMin && record.calorieMax">
              {{ record.calorieMin }}-{{ record.calorieMax }} kcal
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-records-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.section-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16px 0;
  background: var(--background-color);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 日期选择器 */
.date-picker-container {
  position: relative;
}

.date-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary-green-weak);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--primary-color);
}

.date-btn svg {
  font-size: 14px;
}

.date-label {
  font-size: 13px;
}

.date-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.date-picker-modal {
  background: var(--card-background);
  border-radius: 24px 24px 0 0;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.month-nav-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--section-background);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 14px;
}

.month-nav-btn:active {
  background: var(--border-color);
}

.month-label {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 8px;
}

.weekday-header span {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 50%;
  font-size: 15px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.15s ease;
}

.calendar-day:active {
  transform: scale(0.9);
}

.calendar-day.other-month {
  color: var(--text-tertiary);
}

.calendar-day.today {
  background: var(--primary-green-weak);
  color: var(--primary-color);
  font-weight: 600;
}

.calendar-day.selected {
  background: var(--primary-color);
  color: white;
  font-weight: 600;
}

.calendar-day.disabled {
  color: var(--text-tertiary);
  opacity: 0.5;
  cursor: not-allowed;
}

.date-picker-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.today-btn {
  width: 100%;
  padding: 14px;
  background: var(--section-background);
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--primary-color);
  cursor: pointer;
}

.today-btn:active {
  background: var(--border-color);
}

.filter-container {
  position: relative;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--section-background);
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.filter-btn svg {
  font-size: 10px;
}

.filter-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--card-background);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  padding: 8px;
  min-width: 140px;
  z-index: 50;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px) scale(0.95);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
}

.filter-dropdown.show {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.filter-option {
  display: block;
  padding: 10px 16px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.filter-option:hover,
.filter-option.active {
  background: var(--section-background);
}

.filter-option.active {
  color: var(--primary-color);
  font-weight: 600;
}

.records-scroll-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 20px;
}

.records-container {
  background: var(--card-background);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 32px;
  opacity: 0.5;
  margin-bottom: 12px;
}

.record-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--divider-color);
}

.record-card:last-child {
  border-bottom: none;
}

.record-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.record-name {
  font-weight: 600;
  font-size: 15px;
}

.record-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.record-right {
  text-align: right;
}

.record-calories {
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 2px;
}

.calorie-unit {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.8;
}

.record-range {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
</style>
