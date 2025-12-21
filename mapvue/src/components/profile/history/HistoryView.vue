<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppHeader from '@/components/common/AppHeader.vue'

interface DayData {
  completed: boolean
  calories: number
  duration: number
  distance: number
}

const currentDate = ref(new Date())
const selectedDate = ref(new Date())
const monthCompleteDays = ref(15)
const currentStreak = ref(12)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// Mock data for demo
const mockData: Record<string, DayData> = {
  '2024-12-16': { completed: true, calories: 285, duration: 42, distance: 3.5 },
  '2024-12-15': { completed: true, calories: 320, duration: 45, distance: 4.0 },
  '2024-12-14': { completed: true, calories: 250, duration: 35, distance: 3.0 },
  '2024-12-13': { completed: true, calories: 180, duration: 30, distance: 2.5 },
  '2024-12-12': { completed: true, calories: 300, duration: 40, distance: 3.2 },
  '2024-12-11': { completed: false, calories: 0, duration: 0, distance: 0 },
  '2024-12-10': { completed: true, calories: 220, duration: 38, distance: 2.8 },
  '2024-12-09': { completed: true, calories: 280, duration: 42, distance: 3.5 },
  '2024-12-08': { completed: true, calories: 350, duration: 50, distance: 4.2 },
  '2024-12-07': { completed: true, calories: 200, duration: 30, distance: 2.5 },
  '2024-12-06': { completed: true, calories: 260, duration: 38, distance: 3.0 },
  '2024-12-05': { completed: true, calories: 290, duration: 42, distance: 3.5 },
  '2024-12-04': { completed: true, calories: 310, duration: 45, distance: 3.8 },
  '2024-12-03': { completed: false, calories: 0, duration: 0, distance: 0 },
  '2024-12-02': { completed: true, calories: 270, duration: 40, distance: 3.2 },
  '2024-12-01': { completed: true, calories: 240, duration: 35, distance: 2.8 }
}

const calendarTitle = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  return `${year}年${month}月`
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  
  const days: Array<{ day: number | null; isToday: boolean; completed: boolean; dateStr: string }> = []
  
  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    days.push({ day: null, isToday: false, completed: false, dateStr: '' })
  }
  
  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
    const data = mockData[dateStr]
    
    days.push({
      day,
      isToday,
      completed: data?.completed || false,
      dateStr
    })
  }
  
  return days
})

const selectedDateDisplay = computed(() => {
  const month = selectedDate.value.getMonth() + 1
  const day = selectedDate.value.getDate()
  const weekday = weekdays[selectedDate.value.getDay()]
  return `${month}月${day}日 星期${weekday}`
})

const selectedDayData = computed(() => {
  const year = selectedDate.value.getFullYear()
  const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0')
  const day = String(selectedDate.value.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  return mockData[dateStr] || { completed: false, calories: 0, duration: 0, distance: 0 }
})

const prevMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
}

const nextMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
}

const selectDay = (day: number | null, dateStr: string) => {
  if (day === null) return
  selectedDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), day)
}

onMounted(() => {
  // Calculate complete days for current month
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (mockData[dateStr]?.completed) count++
  }
  monthCompleteDays.value = count
})
</script>

<template>
  <div class="history-page">
    <AppHeader title="历史记录" show-back back-path="/profile" />

    <div class="content">
      <!-- Monthly Stats -->
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-card-value">{{ monthCompleteDays }}</div>
          <div class="stat-card-label">本月完成天数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">{{ currentStreak }}</div>
          <div class="stat-card-label">当前连续打卡</div>
        </div>
      </div>

      <!-- Calendar -->
      <div class="card">
        <div class="calendar-header">
          <button class="calendar-nav" @click="prevMonth">
            <font-awesome-icon icon="chevron-left" />
          </button>
          <span class="calendar-title">{{ calendarTitle }}</span>
          <button class="calendar-nav" @click="nextMonth">
            <font-awesome-icon icon="chevron-right" />
          </button>
        </div>
        
        <div class="calendar-weekdays">
          <div v-for="day in weekdays" :key="day" class="calendar-weekday">
            {{ day }}
          </div>
        </div>
        
        <div class="calendar-days">
          <div 
            v-for="(dayInfo, index) in calendarDays"
            :key="index"
            class="calendar-day"
            :class="{
              empty: dayInfo.day === null,
              today: dayInfo.isToday,
              completed: dayInfo.completed
            }"
            @click="selectDay(dayInfo.day, dayInfo.dateStr)"
          >
            {{ dayInfo.day }}
          </div>
        </div>
      </div>

      <!-- Day Detail -->
      <div class="day-detail">
        <div class="day-detail-header">
          <span class="day-detail-title">{{ selectedDateDisplay }}</span>
          <span 
            class="day-detail-badge" 
            :class="selectedDayData.completed ? 'completed' : 'missed'"
          >
            {{ selectedDayData.completed ? '已完成' : '未完成' }}
          </span>
        </div>
        <div class="detail-row">
          <div class="detail-label">
            <div class="detail-icon" style="background: #E8F5E9; color: #34C759;">
              <font-awesome-icon icon="fire" />
            </div>
            <span>消耗热量</span>
          </div>
          <div class="detail-value">{{ selectedDayData.calories }} kcal</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">
            <div class="detail-icon" style="background: #E3F2FD; color: #007AFF;">
              <font-awesome-icon icon="clock" />
            </div>
            <span>运动时长</span>
          </div>
          <div class="detail-value">{{ selectedDayData.duration }} 分钟</div>
        </div>
        <div class="detail-row last">
          <div class="detail-label">
            <div class="detail-icon" style="background: #FFF3E0; color: #FF9500;">
              <font-awesome-icon icon="route" />
            </div>
            <span>运动距离</span>
          </div>
          <div class="detail-value">{{ selectedDayData.distance }} 公里</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
}

.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.stat-card-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 16px;
}

.calendar-nav {
  width: 40px;
  height: 40px;
  background: var(--section-background);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
}

.calendar-title {
  font-size: 18px;
  font-weight: 700;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}

.calendar-weekday {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 0;
  font-weight: 600;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-background);
  border: 1px solid var(--border-color);
}

.calendar-day:hover {
  background: var(--section-background);
}

.calendar-day.empty {
  background: transparent;
  border: none;
  cursor: default;
}

.calendar-day.today {
  border-color: var(--primary-color);
  color: var(--primary-color);
  font-weight: 700;
}

.calendar-day.completed {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.day-detail {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-top: 24px;
}

.day-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--divider-color);
}

.day-detail-title {
  font-size: 16px;
  font-weight: 600;
}

.day-detail-badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
}

.day-detail-badge.completed {
  background: var(--primary-green-weak);
  color: var(--primary-color);
}

.day-detail-badge.missed {
  background: #FFE5E5;
  color: #D64545;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--divider-color);
}

.detail-row.last {
  border-bottom: none;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.detail-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.detail-value {
  font-weight: 600;
  font-size: 16px;
}
</style>
