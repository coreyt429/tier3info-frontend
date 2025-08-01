// src/stores/docStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDocStore = defineStore('doc', () => {
  const docUrl = ref('/docs/start.html') // default

  function setDocUrl(newUrl) {
    docUrl.value = newUrl
  }

  return { docUrl, setDocUrl }
})
