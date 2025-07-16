import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'

const defaultPreferences = {
  TimeFormat: 'YYYY-MM-DD HH:mm:ss',
  TimeZone: 'America/Chicago',
  defaultAction: 'dashboard',
  startRoute: { label: '4.x', value: '/#/locate' },
  menuDropDown: 1,
  menuSearch: 1,
}

export const usePreferencesStore = defineStore('preferences', () => {
  const preferences = reactive({})
  Object.assign(preferences, JSON.parse(localStorage.getItem('preferences')) || defaultPreferences)
  let updateTimeout = null

  async function loadPreferences() {
    const request = {
      method: 'GET',
      path: '/preferences/',
    }
    const data = await tier3info_restful_request(request)
    if (data) {
      console.log('Preferences loaded:', data)
      Object.assign(preferences, data)
      localStorage.setItem('preferences', JSON.stringify(preferences))
    } else {
      // Load default preferences if the request fails
      const storedPreferences = localStorage.getItem('preferences')
      console.log('preferences: Using stored preferences:', storedPreferences)
      if (storedPreferences) {
        Object.assign(preferences, JSON.parse(storedPreferences))
      } else {
        console.warn('preferences: No stored preferences found, using defaults', defaultPreferences)
        Object.assign(preferences, defaultPreferences)
      }
    }
  }

  watch(
    preferences,
    (newVal) => {
      if (updateTimeout) {
        clearTimeout(updateTimeout)
      }
      updateTimeout = setTimeout(async () => {
        const request = {
          method: 'PUT',
          path: '/preferences/',
          body: newVal,
        }
        localStorage.setItem('preferences', JSON.stringify(newVal))
        await tier3info_restful_request(request)
      }, 2000)
    },
    { deep: true },
  )

  return {
    preferences,
    loadPreferences,
  }
})
