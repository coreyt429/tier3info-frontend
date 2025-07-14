import { defineStore } from 'pinia'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'

export const useDashBoardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: {},
    dashboardLoading: false,
    counts: { green: 0, yellow: 0, red: 0 },
    metrics: { green: 0, yellow: 0, red: 0 },
  }),
  getters: {},
  actions: {
    async fetchDashboard() {
      this.dashboardLoading = true
      try {
        const request = {
          method: 'GET',
          path: '/dashboard/',
        }
        const response = await tier3info_restful_request(request)
        console.log('Dashboard response:', response)
        this.dashboard = response.data
        console.log('Dashboard data:', this.dashboard)
      } catch (error) {
        console.error('Error fetching dashboard:', error)
      } finally {
        this.dashboardLoading = false
      }
    },
    async refreshDashboard() {
      await this.fetchDashboard()
      console.log('Dashboard fetched', this.dashboard)
      this.counts = { green: 0, yellow: 0, red: 0 }
      this.metrics = { green: 0, yellow: 0, red: 0 }
      if (!this.dashboard || Object.keys(this.dashboard).length === 0) {
        // populate with dummy data if dashboard is empty
        this.dashboard = {
          item1: { status: 'green', text: 'Item 1 text' },
          item2: { status: 'yellow', text: 'Item 2 text' },
          item3: { status: 'red', text: 'Item 3 text' },
        }
      }
      Object.keys(this.dashboard).forEach((key) => {
        const item = this.dashboard[key]
        if (this.counts[item.status] !== undefined) {
          this.counts[item.status] += 1
          this.metrics[item.status] = this.metrics[item.status] || []
          this.metrics[item.status].push(item)
        }
      })
    },
  },
})
