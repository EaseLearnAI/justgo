<script setup lang="ts">
import { useRouter } from 'vue-router'

interface Props {
  title: string
  showBack?: boolean
  backPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  showBack: false,
  backPath: ''
})

const router = useRouter()

const goBack = () => {
  if (props.backPath) {
    router.push(props.backPath)
  } else {
    router.back()
  }
}

const emit = defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <header class="header">
    <button v-if="showBack" class="back-btn" @click="goBack">
      <font-awesome-icon icon="arrow-left" />
    </button>
    <div v-else style="width: 20px;"></div>
    <h1>{{ title }}</h1>
    <slot name="action">
      <div style="width: 20px;"></div>
    </slot>
  </header>
</template>

<style scoped>
.header {
  padding: calc(var(--safe-area-top) + 10px) 24px 10px;
  background: var(--background-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header h1 {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text-primary);
  flex: 1;
  text-align: center;
}

.back-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 18px;
  cursor: pointer;
}
</style>
