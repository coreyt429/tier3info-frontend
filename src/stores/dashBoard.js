import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDashBoardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: ref([]),
  }),
  getters: {},
  actions: {},
})
