<template>
  <div class="fullscreen bg-primary text-warning text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">403</div>

      <div class="text-h2" style="opacity: 0.4">Oops. You don't seem to be logged in...</div>
      <div class="text-h5" style="opacity: 0.4">
        I don't have login handling code yet, so click below to login!
      </div>

      <q-btn
        class="q-mt-xl"
        color="warning"
        text-color="primary"
        unelevated
        href="https://tier3info.mtmsus.us/index.cgi"
        label="Login"
        no-caps
      />
    </div>
  </div>
</template>

<script setup>
//
</script>
