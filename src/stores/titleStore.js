import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTitleStore = defineStore('title', () => {
  const mainTitle = ref('Voice Engineering Information Center')
  return { mainTitle }
})
