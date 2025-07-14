import { defineStore } from 'pinia'
import { ref } from 'vue'

// FIXME: This store doesn't seem to be using state, is this valid?
export const useTitleStore = defineStore('title', () => {
  const mainTitle = ref('Voice Engineering Information Center')
  const setMainTitle = (newTitle) => {
    mainTitle.value = newTitle
  }
  return { mainTitle, setMainTitle }
})
