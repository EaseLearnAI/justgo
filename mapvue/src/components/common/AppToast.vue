<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show: boolean
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  duration: 2000
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const visible = ref(false)

watch(() => props.show, (newVal) => {
  if (newVal) {
    visible.value = true
    if (props.duration > 0) {
      setTimeout(() => {
        visible.value = false
        emit('close')
      }, props.duration)
    }
  } else {
    visible.value = false
  }
}, { immediate: true })

const iconMap = {
  success: 'circle-check',
  error: 'circle-xmark',
  warning: 'triangle-exclamation',
  info: 'circle-info'
}

const colorMap = {
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-overlay">
        <div class="toast-container" :style="{ '--toast-color': colorMap[type] }">
          <div class="toast-icon">
            <font-awesome-icon :icon="iconMap[type]" />
          </div>
          <p class="toast-message">{{ message }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  pointer-events: none;
}

.toast-container {
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 140px;
  max-width: 280px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.toast-icon {
  width: 48px;
  height: 48px;
  background: var(--toast-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.toast-message {
  color: white;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  line-height: 1.4;
  margin: 0;
}

/* Animation */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: scale(1);
}
</style>
