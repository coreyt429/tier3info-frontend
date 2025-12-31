<template>
  <q-page class="q-pa-md q-gutter-md">
    <q-card>
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Users</div>
        <q-btn dense flat icon="refresh" label="Reload" color="primary" @click="loadUsers" />
      </q-card-section>
      <DataTable
        :rows="userRows"
        :columns="userColumns"
        :filterable="true"
        :exportable="true"
        selection="single"
        :visibleColumns="visibleColumns"
        :pagination-config="pagination"
        @update:selected="handleSelection"
        table-height="45vh"
      />
    </q-card>

    <q-card v-if="selectedUserId">
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">API Key</div>
        <q-spinner v-if="apiKeyLoading" size="20px" color="primary" />
      </q-card-section>
      <q-separator />
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-12 col-md-6">
          <q-input
            v-model="apiKeyValue"
            label="API Key"
            outlined
            dense
            :type="apiKeyVisible ? 'text' : 'password'"
            readonly
            :hint="apiKeyExists ? 'Existing key' : 'No key set'"
          >
            <template #append>
              <q-icon
                :name="apiKeyVisible ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="apiKeyVisible = !apiKeyVisible"
              />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-checkbox
            v-model="apiKeyExists"
            label="API Key Enabled"
            @update:model-value="handleApiKeyToggle"
            :disable="apiKeyLoading"
          />
        </div>
        <div class="col-12 col-md-3">
          <q-btn
            dense
            outline
            color="primary"
            label="Generate New Key"
            :disable="apiKeyLoading || !selectedUserId"
            @click="generateAndSaveApiKey"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="selectedUserId">
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">ACLs</div>
        <q-spinner v-if="aclLoading" size="20px" color="primary" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-table
          :rows="aclRows"
          :columns="aclColumns"
          row-key="acl"
          flat
          bordered
          dense
          :loading="aclLoading"
          :pagination="{ rowsPerPage: 0 }"
        >
          <template #body-cell-enabled="props">
            <q-td :props="props">
              <q-checkbox
                v-model="props.row.enabled"
                @update:model-value="(val) => toggleAcl(props.row.acl, val)"
                :disable="aclLoading"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'components/DataTable.vue'
import { tier3info_restful_request, emit_notification } from 'src/plugins/tier3info'
import { useTitleStore } from 'stores/titleStore'

const titleStore = useTitleStore()
titleStore.setMainTitle('Users')

const userRows = ref([])
const userColumns = [
  { name: 'user_id', label: 'User ID', field: 'user_id', align: 'left' },
  { name: 'name', label: 'Name', field: 'name', align: 'left' },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'timezone', label: 'Timezone', field: 'timezone', align: 'left' },
  { name: 'groups', label: 'Groups', field: 'groups', align: 'left' },
  { name: 'tier3info_group', label: 'Tier3Info Group', field: 'tier3info_group', align: 'left' },
]
const visibleColumns = userColumns.map((c) => c.name)
const pagination = { rowsPerPage: 0 }

const selectedUserId = ref(null)
const apiKeyValue = ref('')
const apiKeyVisible = ref(false)
const apiKeyExists = ref(false)
const apiKeyLoading = ref(false)

const aclRows = ref([])
const aclLoading = ref(false)
const aclColumns = [
  { name: 'acl', label: 'ACL', field: 'acl', align: 'left' },
  { name: 'enabled', label: 'Enabled', field: 'enabled', align: 'left' },
]

onMounted(() => {
  loadUsers()
})

async function loadUsers() {
  const response = await tier3info_restful_request({
    path: '/user/?include=data',
    method: 'GET',
  })
  const data = response?.data || {}
  const rows = Object.entries(data).map(([userId, user]) => {
    const groupsArr = Array.isArray(user.groups) ? user.groups : []
    const adGroups = Array.isArray(user.ad_groups) ? user.ad_groups : []
    return {
      id: userId,
      user_id: userId,
      name: user?.okta?.name || '',
      email: user?.okta?.preferred_username || '',
      timezone: user?.okta?.zoneinfo || '',
      groups: groupsArr.join(', '),
      tier3info_group: adGroups.filter((g) => /tier3info/i.test(g)).join(', '),
    }
  })
  userRows.value = rows
}

function handleSelection(selected) {
  const row = selected && selected.length ? selected[0] : null
  selectedUserId.value = row ? row.user_id : null
  apiKeyValue.value = ''
  apiKeyExists.value = false
  if (selectedUserId.value) {
    loadApiKey(selectedUserId.value)
    loadAcls(selectedUserId.value)
  } else {
    aclRows.value = []
  }
}

async function loadApiKey(userId) {
  apiKeyLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: `/apikey/${userId}`,
      method: 'GET',
    })
    if (response && response.status === 200 && response.data) {
      apiKeyValue.value = response.data.apikey || response.data.api_key || ''
      apiKeyExists.value = Boolean(apiKeyValue.value)
    } else {
      apiKeyValue.value = ''
      apiKeyExists.value = false
    }
  } catch (e) {
    console.error('Error loading API key:', e)
    apiKeyValue.value = ''
    apiKeyExists.value = false
  } finally {
    apiKeyLoading.value = false
  }
}

async function handleApiKeyToggle(val) {
  if (!selectedUserId.value) return
  apiKeyLoading.value = true
  try {
    if (!val) {
      await tier3info_restful_request({
        path: `/apikey/${selectedUserId.value}`,
        method: 'DELETE',
      })
      apiKeyValue.value = ''
      apiKeyExists.value = false
      emit_notification('positive', 'API key removed.')
    } else {
      let key = apiKeyValue.value
      if (!key) {
        key = generateApiKey()
        apiKeyValue.value = key
      }
      await tier3info_restful_request({
        path: `/apikey/${selectedUserId.value}`,
        method: 'PUT',
        body: { apikey: key },
      })
      apiKeyExists.value = true
      emit_notification('positive', 'API key set.')
    }
  } finally {
    apiKeyLoading.value = false
  }
}

async function generateAndSaveApiKey() {
  if (!selectedUserId.value) return
  apiKeyValue.value = generateApiKey()
  await handleApiKeyToggle(true)
}

function generateApiKey() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

async function loadAcls(userId) {
  aclLoading.value = true
  try {
    const response = await tier3info_restful_request({
      path: `/acl/user/${userId}`,
      method: 'GET',
    })
    const data = response?.data || {}
    aclRows.value = Object.entries(data).map(([acl, enabled]) => ({
      acl,
      enabled: Boolean(enabled),
    }))
  } finally {
    aclLoading.value = false
  }
}

async function toggleAcl(aclId, enabled) {
  if (!selectedUserId.value) return
  const body = enabled ? { add: [selectedUserId.value] } : { remove: [selectedUserId.value] }
  const response = await tier3info_restful_request({
    path: `/acl/${aclId}`,
    method: 'PATCH',
    body,
  })

  if (response && response.status === 200) {
    emit_notification('positive', `ACL ${enabled ? 'granted' : 'removed'} for ${aclId}.`)
  }
}
</script>
