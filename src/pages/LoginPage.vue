<template>
  <div class="fullscreen bg-primary text-warning text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">403</div>

      <div class="text-h2" style="opacity: 0.4">Oops. You don't seem to be logged in...</div>
      <div class="text-h5" style="opacity: 0.4">
        I don't have login handling code yet, so click below to login! Hey, the button might work
        now, it should send you to {{ loginUrl }}.
      </div>

      <q-btn
        class="q-mt-xl"
        color="warning"
        text-color="primary"
        unelevated
        :href="loginUrl"
        label="Login"
        no-caps
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const loginUrl = ref('https://tier3info.mtmsys.us/index.cgi')
import { tier3info_restful_request } from 'src/plugins/tier3info'

const response = await tier3info_restful_request({
  method: 'GET',
  endpoint: '/login',
  headers: {
    'Content-Type': 'application/json',
  },
})
console.log('LoginPage: Response from /login:', response)
loginUrl.value = response.data.url || 'https://tier3info.mtmsys.us/index.cgi'
console.log('LoginPage: Login URL set to:', loginUrl.value)
</script>
