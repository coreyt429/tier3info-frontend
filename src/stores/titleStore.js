import { defineStore } from 'pinia'

export const useTitleStore = defineStore('title', {
  state: () => ({
    mainTitle: 'Voice Engineering Information Center',
  }),
  actions: {
    setMainTitle(newTitle) {
      this.mainTitle = newTitle
    },
  },
})
