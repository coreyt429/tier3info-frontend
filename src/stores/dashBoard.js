import { defineStore } from 'pinia'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'

export const useDashBoardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: {},
    dashboardLoading: false,
    metricDetails: {},
    detailsHtml: '',
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
      console.log('Dashboard before check:', this.dashboard)
      if (!this.dashboard || Object.keys(this.dashboard).length === 0) {
        // populate with dummy data if dashboard is empty
        console.warn('Dashboard is empty, populating with dummy data')
        this.dashboard = {
          item1: {
            color: 'green',
            label: 'Item 1',
            count: 1,
            target: 1,
            percent: 100,
            text: 'Okay',
          },
          item2: { color: 'yellow', label: 'Item 2', count: 2, target: 5, percent: 40 },
          item3: { color: 'red', label: 'Item 3', count: 2.34565, target: 3, percent: 78 },
          item4: { color: 'green', label: 'Item 4', count: 3, target: 3, percent: 100 },
          item5: { color: 'yellow', label: 'Item 5', count: 1, target: 4, percent: 25 },
          item6: { color: 'red', label: 'Item 6', count: 0, target: 2, percent: 0 },
          item7: { color: 'green', label: 'Item 7', count: 5, target: 5, percent: 100 },
          item8: { color: 'yellow', label: 'Item 8', count: 2.5, target: 5, percent: 50 },
          item9: { color: 'red', label: 'Item 9', count: 1.5, target: 3, percent: 50 },
        }
      }
      console.log('Dashboard after check:', this.dashboard)
      Object.keys(this.dashboard).forEach((key) => {
        const item = this.dashboard[key]
        item.id = key
        if (Object.prototype.hasOwnProperty.call(item, 'text') && item.text != null) {
          item.textContent = `${item.label}: ${item.text}`
        } else {
          item.textContent = `${item.label}: (${Number.isInteger(item.count) ? item.count : item.count.toFixed(2)}/${item.target}) ${item.percent}%`
        }
        if (this.counts[item.color] !== undefined) {
          this.counts[item.color] += 1
          this.metrics[item.color] = this.metrics[item.color] || []
          this.metrics[item.color].push(item)
        }
      })
    },
    async loadDetails(metric) {
      console.log('Loading details for metric:', metric)
      const request = {
        method: 'GET',
        path: `/dashboard/detail/${metric.id}`,
      }
      const response = await tier3info_restful_request(request)
      console.log('Metric details response:', response)
      this.metricDetails = response.data
      console.log('Metric details:', this.metricDetails)
      this.detailsHtml = response.data
      console.log('Details HTML:', this.detailsHtml)
    },
  },
})
