<script setup lang="ts">
interface Props {
  show: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div 
      class="modal-overlay" 
      :class="{ show }"
      @click="emit('close')"
    >
      <div class="modal-content action-sheet" @click.stop>
        <div class="action-sheet-title">
          <slot name="title">选择操作</slot>
        </div>
        <div class="action-sheet-options">
          <slot></slot>
        </div>
        <div class="action-cancel" @click="emit('close')">取消</div>
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

.action-sheet {
  padding: 24px;
  padding-bottom: calc(var(--safe-area-bottom) + 20px);
}

.action-sheet-title {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-weight: 600;
}

.action-sheet-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-cancel {
  text-align: center;
  padding: 18px;
  margin-top: 12px;
  background: var(--card-background);
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}
</style>
