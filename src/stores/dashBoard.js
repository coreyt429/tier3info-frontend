import { ref, reactive } from 'vue'
import { defineStore } from 'pinia'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'

export const useDashBoardStore = defineStore('dashboard', () => {
  const dashboard = ref({})
  const dashboardLoading = ref(false)
  const metricDetails = ref({})
  const detailsHtml = ref('')
  const detailsJSON = ref([])
  const counts = reactive({ green: 0, yellow: 0, red: 0, blue: 0 })
  const metrics = reactive({ green: 0, yellow: 0, red: 0, blue: 0 })
  const colors = ref(['green', 'yellow', 'red', 'blue'])
  // FIXME: sample_data should be moved to test_api
  const sample_data = [
    {
      type: 'divider',
    },
    {
      type: 'legend',
      contents: 'Test Legend',
    },
    {
      type: 'html',
      contents: 'Test html<br>more <b>html</b><br>',
    },
    {
      type: 'tabs',
      contents: {
        'Tab 1': [
          {
            type: 'html',
            contents:
              '<h3>Welcome to Tab 1</h3><p>This is some introductory content for Tab 1.</p>',
          },
          {
            type: 'datatable',
            contents: {
              labels: ['Name', 'Age', 'Occupation'],
              data: [
                ['Alice', 30, 'Engineer'],
                ['Bob', 25, 'Designer'],
                ['Charlie', 35, 'Teacher'],
              ],
            },
          },
        ],
        'Tab 2': [
          {
            type: 'html',
            contents:
              '<h3>Insights for Tab 2</h3><p>Here are some insights and statistics for Tab 2.</p>',
          },
          {
            type: 'chart',
            contents: {
              type: 'bar',
              labels: ['January', 'February', 'March', 'April'],
              datasets: [
                {
                  data: [10, 20, 15, 25],
                  label: 'Monthly Data',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1,
                },
              ],
              legend: 'test legend',
              options: {
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              },
            },
          },
        ],
        'Tab 3': [
          {
            type: 'datatable',
            contents: {
              labels: ['Field1', 'Field2', 'Field3', 'Field4', 'Field5', 'Field6'],

              data: [
                ['Row1-Col1', 123, 'Row1-Col3', 456, 'Row1-Col5', 789],
                ['Row2-Col1', 234, 'Row2-Col3', 567, 'Row2-Col5', 890],
                ['Row3-Col1', 345, 'Row3-Col3', 678, 'Row3-Col5', 901],
                ['Row4-Col1', 456, 'Row4-Col3', 789, 'Row4-Col5', 123],
                ['Row5-Col1', 567, 'Row5-Col3', 890, 'Row5-Col5', 234],
              ],
            },
          },
        ],
        'Tab 4': [
          {
            type: 'html',
            contents: `<pre>
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
</pre>`,
          },
        ],
      },
    },
  ]

  async function fetchDashboard() {
    dashboardLoading.value = true
    try {
      const request = {
        method: 'GET',
        path: '/dashboard/?include=data',
      }
      const response = await tier3info_restful_request(request)
      console.log('Dashboard response:', response)
      dashboard.value = response.data
      console.log('Dashboard data:', dashboard.value)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      dashboardLoading.value = false
    }
  }

  async function refreshDashboard() {
    await fetchDashboard()
    console.log('Dashboard fetched', dashboard.value)
    counts.green = 0
    counts.yellow = 0
    counts.red = 0
    counts.blue = 0
    metrics.green = []
    metrics.yellow = []
    metrics.red = []
    metrics.blue = []
    console.log('Dashboard before check:', dashboard.value)

    if (!dashboard.value || Object.keys(dashboard.value).length === 0) {
      // FIXME: this should be handled by test_api
      console.warn('Dashboard is empty, populating with dummy data')
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      dashboard.value = {
        item1: {
          color: 'green',
          label: 'Item 1',
          count: 1,
          target: 1,
          percent: 100,
          text: 'Okay',
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item2: {
          color: 'yellow',
          label: 'Item 2',
          count: 2,
          target: 5,
          percent: 40,
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item3: {
          color: 'red',
          label: 'Item 3',
          count: 2.34565,
          target: 3,
          percent: 78,
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item4: {
          color: 'green',
          label: 'Item 4',
          count: 3,
          target: 3,
          percent: 100,
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item5: {
          color: 'yellow',
          label: 'Item 5',
          count: 1,
          target: 4,
          percent: 25,
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item6: {
          color: 'red',
          label: 'Item 6',
          count: 0,
          target: 2,
          percent: 0,
          expire: 15,
          timestamp: fiveMinutesAgo,
        },
        item7: {
          color: 'green',
          label: 'Item 7',
          count: 5,
          target: 5,
          percent: 100,
          expire: 15,
          timestamp: thirtyMinutesAgo,
        },
        item8: {
          color: 'yellow',
          label: 'Item 8',
          count: 2.5,
          target: 5,
          percent: 50,
          expire: 15,
          timestamp: thirtyMinutesAgo,
        },
        item9: {
          color: 'red',
          label: 'Item 9',
          count: 1.5,
          target: 3,
          percent: 50,
          expire: 15,
          timestamp: thirtyMinutesAgo,
        },
      }
    }
    console.log('Dashboard after check:', dashboard.value)
    Object.keys(dashboard.value).forEach((key) => {
      const item = dashboard.value[key]
      item.id = key
      if (Object.prototype.hasOwnProperty.call(item, 'text') && item.text != null) {
        item.textContent = `${item.label}: ${item.text}`
      } else {
        item.textContent = `${item.label}: (${Number.isInteger(item.count) ? item.count : item.count.toFixed(2)}/${item.target}) ${item.percent}%`
      }
      const itemTimestamp = new Date(item.timestamp).getTime()
      const currentTime = Date.now()
      const expireTime = item.expire * 60 * 1000

      if (currentTime - itemTimestamp > expireTime) {
        console.log(`Metric: ${item.label} has expired, removing from dashboard: ${item.timestamp}`)
        counts.blue += 1
        metrics.blue = metrics.blue || []
        metrics.blue.push(item)
      } else if (counts[item.color] !== undefined) {
        console.log(
          `Metric: ${item.label} within ${item.expire}, storing in dashboard: ${item.timestamp}`,
        )
        counts[item.color] += 1
        metrics[item.color] = metrics[item.color] || []
        metrics[item.color].push(item)
      }
    })
    // Sort metrics by label
    metrics.green.sort((a, b) => a.label.localeCompare(b.label))
    metrics.yellow.sort((a, b) => a.label.localeCompare(b.label))
    metrics.red.sort((a, b) => a.label.localeCompare(b.label))
    metrics.blue.sort((a, b) => a.label.localeCompare(b.label))
    colors.value.splice(
      0,
      colors.value.length,
      ...Object.keys(counts).filter((color) => counts[color] > 0),
    )
    console.log('Colors after sorting:', colors.value)
  }

  async function loadDetails(metric) {
    console.log('Loading details for metric:', metric)
    const request = {
      method: 'GET',
      path: `/dashboard/detail/${metric.id}`,
    }
    const response = await tier3info_restful_request(request)
    if (!response || !response.data) {
      console.error('No data received for metric details')
      metricDetails.value = {
        data_description: this.sample_data,
      }
      detailsJSON.value = this.sample_data
      console.log('Details JSON:', detailsJSON.value)
      return
    }
    console.log('Metric details response:', response)

    metricDetails.value = response.data
    console.log('Metric details:', metricDetails.value)
    detailsJSON.value = metricDetails.value.data_description || [
      {
        type: 'html',
        contents: 'html missing',
      },
    ]
    console.log('Details JSON:', detailsJSON.value)
  }

  return {
    dashboard,
    dashboardLoading,
    metricDetails,
    detailsHtml,
    detailsJSON,
    counts,
    metrics,
    colors,
    fetchDashboard,
    refreshDashboard,
    loadDetails,
    sample_data,
  }
})
