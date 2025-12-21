<script setup lang="ts">
interface Props {
  show: boolean
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleOverlayClick = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div 
      class="modal-overlay" 
      :class="{ show }"
      @click="handleOverlayClick"
    >
      <div class="modal-content input-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="emit('close')">
            <font-awesome-icon icon="xmark" />
          </button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.modal-overlay.show {
  opacity: 1;
  visibility: visible;
}

.modal-content {
  background: var(--card-background);
  width: 100%;
  max-width: 480px;
  border-radius: 32px 32px 0 0;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
}

.modal-overlay.show .modal-content {
  transform: translateY(0);
}

.input-modal {
  padding: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
}

.modal-close {
  width: 36px;
  height: 36px;
  background: var(--section-background);
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 16px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #E5E5EA;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  gap: 16px;
  padding: 24px;
  padding-bottom: calc(var(--safe-area-bottom) + 24px);
  border-top: 1px solid var(--border-color);
}

.modal-footer :deep(.btn) {
  flex: 1;
}
</style>
