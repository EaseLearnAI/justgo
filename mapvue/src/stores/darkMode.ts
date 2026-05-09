import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export const useDarkModeStore = defineStore('darkMode', () => {
  const isDark = ref(localStorage.getItem('darkMode') === 'true')

  const applyTheme = (dark: boolean) => {
    document.documentElement.classList.toggle('dark', dark)
  }

  const toggle = () => {
    isDark.value = !isDark.value
  }

  watch(isDark, (val) => {
    localStorage.setItem('darkMode', String(val))
    applyTheme(val)
  }, { immediate: true })

  return { isDark, toggle }
})
