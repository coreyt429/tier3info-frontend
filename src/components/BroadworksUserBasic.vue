<template>
  <div>
    <div class="text-subtitle1 q-mb-sm">User Information</div>
    <q-list bordered class="q-pa-sm" dense>
      <q-item>
        <q-item-section><strong>User ID:</strong></q-item-section>
        <q-item-section>{{ user.user_id }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Broadworks Cluster:</strong></q-item-section>
        <q-item-section>{{ user.cluster }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Enterprise ID:</strong></q-item-section>
        <q-item-section>{{ user.enterprise_id }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Group ID:</strong></q-item-section>
        <q-item-section>{{ user.group_id }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>First Name:</strong></q-item-section>
        <q-item-section>{{ user.first_name }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Last Name:</strong></q-item-section>
        <q-item-section>{{ user.last_name }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>DN:</strong></q-item-section>
        <q-item-section>{{ user.dn }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Extension:</strong></q-item-section>
        <q-item-section>{{ user.extension }}</q-item-section>
      </q-item>
      <q-item>
        <q-item-section><strong>Time Zone:</strong></q-item-section>
        <q-item-section>{{ user.time_zone }}</q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
defineProps({
  user: Object,
})
</script>
