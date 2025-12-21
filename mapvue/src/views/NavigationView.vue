<script setup lang="ts">
import { ref } from 'vue'

// Simulated navigation data
const currentDistance = ref('1.2')
const currentDuration = ref('12:35')
const currentCalories = ref(85)
const nextInstruction = ref('50 米')
const nextInstructionDetail = ref('左转进入公园大道')
</script>

<template>
  <div class="navigation-page">
    <!-- Map Background -->
    <div class="map-container">
      <img 
        src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?auto=format&fit=crop&w=800&q=80" 
        class="map-bg" 
        alt="Map"
      >
      
      <!-- Route Path SVG -->
      <svg class="route-path">
        <path 
          d="M 220 800 L 220 600 L 350 400 L 150 200" 
          stroke="#2E7D6B" 
          stroke-width="8" 
          fill="none" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        />
        <circle cx="220" cy="750" r="12" fill="#5A7A9A" stroke="white" stroke-width="4"/>
      </svg>

      <!-- Top Instruction -->
      <div class="nav-overlay-top">
        <font-awesome-icon icon="arrow-up" class="direction-icon" style="transform: rotate(-45deg);" />
        <div class="instruction-text">
          <h2>{{ nextInstruction }}</h2>
          <p>{{ nextInstructionDetail }}</p>
        </div>
      </div>

      <!-- Bottom Stats -->
      <div class="nav-overlay-bottom">
        <div class="stats-row">
          <div class="stat-box">
            <div class="stat-value">{{ currentDuration }}</div>
            <div class="stat-label">时长</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">{{ currentDistance }}</div>
            <div class="stat-label">公里</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-box">
            <div class="stat-value">{{ currentCalories }}</div>
            <div class="stat-label">卡路里</div>
          </div>
        </div>

        <div class="action-row">
          <router-link to="/result" class="end-btn">
            <font-awesome-icon icon="stop" />
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.navigation-page {
  height: 100%;
  position: relative;
}

.map-container {
  position: relative;
  height: 100%;
  background: #e5e5ea;
  overflow: hidden;
}

.map-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.9);
}

.route-path {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.nav-overlay-top {
  position: absolute;
  top: calc(var(--safe-area-top) + 20px);
  left: 20px;
  right: 20px;
  background: #2C2C2E;
  color: white;
  padding: 20px;
  border-radius: 16px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
}

.direction-icon {
  font-size: 32px;
  color: #2E7D6B;
}

.instruction-text h2 {
  font-size: 24px;
  color: white;
}

.instruction-text p {
  opacity: 0.8;
  color: white;
  margin-top: 4px;
}

.nav-overlay-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--card-background);
  padding: 24px 24px calc(var(--safe-area-bottom) + 20px);
  border-radius: 32px 32px 0 0;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
}

.stats-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 32px;
}

.stat-box {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #1C1C1E;
}

.stat-label {
  font-size: 12px;
  color: #9A9AA0;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: #EDEEF0;
}

.action-row {
  display: flex;
  justify-content: center;
}

.end-btn {
  width: 72px;
  height: 72px;
  background: #D64545;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  border: 4px solid rgba(214, 69, 69, 0.3);
  text-decoration: none;
  background-clip: content-box;
  padding: 4px;
  transition: transform 0.1s;
}

.end-btn:active {
  transform: scale(0.9);
}
</style>
