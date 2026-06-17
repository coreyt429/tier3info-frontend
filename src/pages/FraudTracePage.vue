<template>
  <q-page class="flex flex-start fraud-trace-page">
    <div class="q-pa-md fraud-trace-shell">
      <q-card class="fraud-panel">
        <q-card-section class="q-pb-sm">
          <div class="text-overline text-grey-7 fraud-panel__eyebrow">Security review</div>
          <div class="text-h4">Fraud Trace</div>
          <div class="text-body2 text-grey-8 fraud-panel__copy">
            Search an IP address or phone number, then review the organization, disposition, and
            registered users tied to the source IP.
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-form class="row q-col-gutter-md items-end" @submit.prevent="runFraudTrace">
            <div class="col-12 col-md-7">
              <q-input
                v-model="inputString"
                label="Input String"
                hint="IP address or phone number"
                outlined
                dense
                clearable
                :disable="isLoading"
                @blur="trimInputString"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-input
                v-model="span"
                label="Span"
                hint="Elasticsearch span, e.g. 24h"
                outlined
                dense
                :disable="isLoading"
                @blur="trimSpan"
              />
            </div>
            <div class="col-12 col-md-2 row q-gutter-sm">
              <q-btn
                type="submit"
                color="primary"
                icon="travel_explore"
                label="Run"
                :loading="isLoading"
                :disable="isLoading || !inputString.trim()"
              />
              <q-btn
                color="secondary"
                icon="restart_alt"
                flat
                label="Reset"
                :disable="isLoading"
                @click="resetForm"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>

      <q-card v-if="statusMessage || errorMessage" class="q-mt-md">
        <q-card-section v-if="statusMessage">
          <q-banner dense rounded class="bg-info text-primary">
            {{ statusMessage }}
          </q-banner>
        </q-card-section>
        <q-card-section v-if="errorMessage">
          <q-banner dense rounded class="bg-negative text-white">
            {{ errorMessage }}
          </q-banner>
        </q-card-section>
      </q-card>

      <q-card v-if="reportCards.length" class="q-mt-md">
        <q-card-section class="row items-center justify-between q-gutter-sm">
          <div>
            <div class="text-h6">Results</div>
            <div class="text-caption text-grey-7">
              {{ reportCards.length }} IP{{ reportCards.length === 1 ? '' : 's' }} returned.
            </div>
          </div>
          <q-chip outline color="primary" text-color="primary">
            Span: {{ selectedSpanLabel }}
          </q-chip>
        </q-card-section>
        <q-separator />
        <q-tabs
          v-model="activeTab"
          dense
          align="left"
          active-color="primary"
          indicator-color="primary"
          class="fraud-result-tabs"
        >
          <q-tab :name="tabNames.trace" :label="`Trace (${reportCards.length})`" icon="timeline" />
          <q-tab
            :name="tabNames.ipAddresses"
            :label="`IP addresses (${ipAddressRows.length})`"
            icon="dns"
          />
          <q-tab
            :name="tabNames.compromisedUsers"
            :label="`Compromised users (${compromisedUserRows.length})`"
            icon="person_alert"
          />
        </q-tabs>
        <q-separator />

        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel :name="tabNames.trace" class="q-px-none">
            <div class="column q-gutter-md">
              <q-card
                v-for="card in reportCards"
                :key="card.ipAddress"
                class="fraud-result-card"
                :class="`fraud-result-card--${card.tone}`"
              >
                <q-card-section class="row items-start justify-between q-gutter-md">
                  <div>
                    <div class="text-overline text-grey-7">IP Address</div>
                    <div class="text-h6">{{ card.ipAddress }}</div>
                    <div class="text-body2 text-grey-8 q-mt-xs">
                      <strong>Organization:</strong> {{ card.organization || 'Unknown' }}
                    </div>
                    <div class="text-body2 text-grey-8">
                      <strong>Disposition:</strong>
                      <q-chip
                        dense
                        square
                        :color="dispositionTone(card.disposition)"
                        text-color="white"
                        class="q-ml-xs"
                      >
                        {{ card.disposition || 'Unknown' }}
                      </q-chip>
                    </div>
                  </div>
                  <div class="row items-center q-gutter-sm">
                    <q-chip outline color="primary" text-color="primary">
                      Users: {{ card.users.length }}
                    </q-chip>
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section>
                  <q-table
                    :rows="card.users"
                    :columns="userColumns"
                    dense
                    flat
                    bordered
                    hide-bottom
                    row-key="key"
                    :pagination="{ rowsPerPage: 0 }"
                    no-data-label="No registered users found"
                  >
                    <template v-slot:body-cell-password_changed="props">
                      <q-td :props="props">
                        <div class="row items-center no-wrap q-gutter-xs">
                          <q-icon
                            v-if="props.row.passwordChangeIndicatorColor"
                            name="brightness_1"
                            :color="props.row.passwordChangeIndicatorColor"
                            size="10px"
                            class="fraud-alert-dot"
                          >
                            <q-tooltip>
                              {{ props.row.passwordChangeIndicatorTooltip }}
                            </q-tooltip>
                          </q-icon>
                          <span>{{ props.value || 'Unknown' }}</span>
                        </div>
                      </q-td>
                    </template>
                    <template v-slot:body-cell-last_reg_timestamp="props">
                      <q-td :props="props">
                        <span>{{ props.value || 'Unknown' }}</span>
                      </q-td>
                    </template>
                    <template v-slot:body-cell-last_reg_code="props">
                      <q-td :props="props">
                        <span>{{ props.value || 'Unknown' }}</span>
                      </q-td>
                    </template>
                    <template v-slot:body-cell-last_reg_device="props">
                      <q-td :props="props">
                        <span class="text-wrap fraud-device-cell">{{ props.value || 'Unknown' }}</span>
                      </q-td>
                    </template>
                    <template v-slot:body-cell="props">
                      <q-td :props="props">
                        <span class="text-wrap">{{ props.value || 'Unknown' }}</span>
                      </q-td>
                    </template>
                  </q-table>
                </q-card-section>
              </q-card>
            </div>
          </q-tab-panel>

          <q-tab-panel :name="tabNames.ipAddresses" class="q-px-none">
            <q-table
              :rows="ipAddressRows"
              :columns="ipAddressColumns"
              dense
              flat
              bordered
              hide-bottom
              row-key="key"
              :pagination="{ rowsPerPage: 0 }"
              no-data-label="No unique IP addresses found"
            >
              <template v-slot:body-cell-ipAddress="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ props.value || 'Unknown' }}</div>
                </q-td>
              </template>
              <template v-slot:body-cell-organization="props">
                <q-td :props="props">
                  <span class="text-wrap">{{ props.value || 'Unknown' }}</span>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>

          <q-tab-panel :name="tabNames.compromisedUsers" class="q-px-none">
            <q-table
              :rows="compromisedUserRows"
              :columns="compromisedUserColumns"
              dense
              flat
              bordered
              hide-bottom
              row-key="key"
              :pagination="{ rowsPerPage: 0 }"
              no-data-label="No compromised users found"
            >
              <template v-slot:body-cell-password_changed="props">
                <q-td :props="props">
                  <div class="row items-center no-wrap q-gutter-xs">
                    <q-icon
                      v-if="props.row.passwordChangeIndicatorColor"
                      name="brightness_1"
                      :color="props.row.passwordChangeIndicatorColor"
                      size="10px"
                      class="fraud-alert-dot"
                    >
                      <q-tooltip>
                        {{ props.row.passwordChangeIndicatorTooltip }}
                      </q-tooltip>
                    </q-icon>
                    <span>{{ props.value || 'Unknown' }}</span>
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-last_reg_timestamp="props">
                <q-td :props="props">
                  <span>{{ props.value || 'Unknown' }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-last_reg_code="props">
                <q-td :props="props">
                  <span>{{ props.value || 'Unknown' }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-last_reg_device="props">
                <q-td :props="props">
                  <span class="text-wrap fraud-device-cell">{{ props.value || 'Unknown' }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell="props">
                <q-td :props="props">
                  <span class="text-wrap">{{ props.value || 'Unknown' }}</span>
                </q-td>
              </template>
            </q-table>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>

      <q-card v-else-if="!isLoading && !statusMessage && !errorMessage" class="q-mt-md">
        <q-card-section class="text-grey-7">
          Enter an IP address or phone number to build the fraud trace.
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { tier3info_restful_request } from 'src/plugins/tier3info.js'
import { usePreferencesStore } from 'src/stores/preferences'
import { useTitleStore } from 'stores/titleStore'

const props = defineProps({
  query: Object,
})

const titleStore = useTitleStore()
titleStore.setMainTitle('Fraud Trace')

const preferencesStore = usePreferencesStore()
const preferences = preferencesStore.preferences

const defaultSpan = '24h'
const spanOptions = [
  { label: '15 minutes', value: '15m' },
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '12 hours', value: '12h' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
]

const userColumns = [
  { name: 'user_label', label: 'User', field: 'userLabel', align: 'left', sortable: true },
  { name: 'timezone', label: 'Timezone', field: 'timezone', align: 'left', sortable: true },
  {
    name: 'password_changed',
    label: 'Password Change',
    field: 'passwordChangedText',
    align: 'left',
    sortable: true,
  },
  { name: 'last_200', label: 'Last 200', field: 'last200Text', align: 'left', sortable: true },
  {
    name: 'last_reg_timestamp',
    label: 'Last Reg Timestamp',
    field: 'lastRegTimestampText',
    align: 'left',
    sortable: true,
  },
  {
    name: 'last_reg_code',
    label: 'Last Reg Code',
    field: 'lastRegCode',
    align: 'left',
    sortable: true,
  },
  {
    name: 'last_reg_device',
    label: 'Last Reg Device',
    field: 'lastRegDevice',
    align: 'left',
    sortable: true,
  },
]

const ipAddressColumns = [
  { name: 'ipAddress', label: 'IP Address', field: 'ipAddress', align: 'left', sortable: true },
  { name: 'organization', label: 'Organization', field: 'organization', align: 'left', sortable: true },
]

const compromisedUserColumns = [
  { name: 'ipAddress', label: 'IP Address', field: 'ipAddress', align: 'left', sortable: true },
  ...userColumns,
]

const tabNames = {
  trace: 'trace',
  ipAddresses: 'ipAddresses',
  compromisedUsers: 'compromisedUsers',
}

const inputString = ref('')
const span = ref(defaultSpan)
const reportCards = ref([])
const isLoading = ref(false)
const statusMessage = ref(null)
const errorMessage = ref(null)
const activeTab = ref(tabNames.trace)

const selectedSpanLabel = computed(() => {
  const selectedSpan = span.value || defaultSpan
  return spanOptions.find((option) => option.value === selectedSpan)?.label || selectedSpan
})

const ipAddressRows = computed(() => {
  const seen = new Set()
  return reportCards.value.reduce((rows, card) => {
    const key = String(card.ipAddress || '').trim()
    if (!key || seen.has(key)) {
      return rows
    }
    seen.add(key)
    rows.push({
      key,
      ipAddress: card.ipAddress,
      organization: card.organization || '',
    })
    return rows
  }, [])
})

const compromisedUserRows = computed(() =>
  reportCards.value.flatMap((card) =>
    card.users
      .filter((user) => user.passwordChangeIndicatorColor === 'negative')
      .map((user, userIndex) => ({
        ...user,
        key: `${card.ipAddress}|${user.key || userIndex}|${userIndex}`,
        ipAddress: card.ipAddress,
      })),
  ),
)

function trimInputString() {
  inputString.value = String(inputString.value || '').trim()
}

function trimSpan() {
  span.value = String(span.value || '').trim()
}

function resetForm() {
  inputString.value = ''
  span.value = defaultSpan
  reportCards.value = []
  statusMessage.value = null
  errorMessage.value = null
  activeTab.value = tabNames.trace
}

function dispositionTone(value) {
  const normalized = String(value || '').toLowerCase()
  if (['allow', 'allowed', 'ok', 'clean', 'pass', 'pass-through'].includes(normalized)) return 'positive'
  if (['review', 'watch', 'suspicious', 'warn', 'warning', 'investigate'].includes(normalized))
    return 'warning'
  if (['deny', 'blocked', 'block', 'fraud', 'malicious', 'bad'].includes(normalized)) return 'negative'
  return 'info'
}

function getPreferencesTimeZone(user) {
  return (
    user?.time_zone ||
    user?.timezone ||
    user?.tz ||
    preferences?.TimeZone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
}

function getPreferencesTimeFormat() {
  return preferences?.TimeFormat || 'YYYY-MM-DD HH:mm:ss'
}

function formatTimestamp(rawValue, timeZone) {
  if (!rawValue) return ''
  const date = new Date(rawValue)
  if (Number.isNaN(date.getTime())) return String(rawValue)

  const format = getPreferencesTimeFormat()
  const resolvedTimeZone = timeZone || getPreferencesTimeZone()

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date)

    const lookup = parts.reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

    const hour24 = Number(lookup.hour || 0)
    const hour12 = ((hour24 + 11) % 12) + 1
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    const pad = (value) => String(value).padStart(2, '0')

    return format
      .replace(/YYYY/g, lookup.year || '')
      .replace(/MM/g, lookup.month || '')
      .replace(/DD/g, lookup.day || '')
      .replace(/HH/g, pad(hour24))
      .replace(/hh/g, pad(hour12))
      .replace(/mm/g, lookup.minute || '')
      .replace(/ss/g, lookup.second || '')
      .replace(/A/g, ampm)
      .replace(/a/g, ampm.toLowerCase())
  } catch {
    return date.toLocaleString()
  }
}

function extractTimestamp(candidate) {
  if (!candidate) return ''
  if (typeof candidate === 'string' || typeof candidate === 'number') return candidate
  if (candidate instanceof Date) return candidate.toISOString()
  if (typeof candidate === 'object') {
    return (
      candidate.timestamp ||
      candidate.time ||
      candidate.date ||
      candidate.value ||
      candidate.last_200 ||
      candidate.last200 ||
      candidate.passwordchanged ||
      candidate.password_changed ||
      ''
    )
  }
  return ''
}

function extractNested(candidate, keys) {
  if (!candidate || typeof candidate !== 'object') return ''
  for (const key of keys) {
    const value = candidate[key]
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function collectUserCandidates(record) {
  const candidates = [
    record?.users,
    record?.registered_users,
    record?.registrations,
    record?.people,
    record?.records,
    record?.items,
    record?.hits,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
    }
    if (candidate && typeof candidate === 'object') {
      return Object.entries(candidate).map(([userId, user]) => ({
        user_id: userId,
        ...(user && typeof user === 'object' ? user : { value: user }),
      }))
    }
  }
  return []
}

function getPasswordChangeIndicator(last200Raw, passwordChangedRaw) {
  if (!last200Raw) {
    return {
      color: 'warning',
      tooltip: 'Last 200 timestamp is unknown.',
    }
  }
  if (!passwordChangedRaw) return null

  const last200 = Date.parse(last200Raw)
  const passwordChanged = Date.parse(passwordChangedRaw)
  if (Number.isNaN(last200)) {
    return {
      color: 'warning',
      tooltip: 'Last 200 timestamp is unknown.',
    }
  }
  if (Number.isNaN(passwordChanged)) return null
  if (last200 > passwordChanged) {
    return {
      color: 'negative',
      tooltip: 'Last 200 is newer than the password change timestamp.',
    }
  }
  if (passwordChanged > last200) {
    return {
      color: 'positive',
      tooltip: 'Password change is newer than the last 200 timestamp.',
    }
  }
  return null
}

function normalizeUser(user, index, defaultTimeZone) {
  const timezone = getPreferencesTimeZone(user) || defaultTimeZone
  const userId =
    extractNested(user, ['user_id', 'userid', 'username', 'userName', 'phone_number', 'phoneNumber', 'msisdn']) ||
    `User ${index + 1}`
  const displayName = extractNested(user, ['display_name', 'displayName', 'name', 'full_name', 'fullName'])
  const lastReg = user?.last_reg || user?.lastRegistration || user?.last_registration || {}
  const passwordChangedRaw = extractTimestamp(
    extractNested(user, [
      'passwordchanged',
      'password_changed',
      'passwordChange',
      'password_change',
      'password_changed_at',
      'passwordChangedAt',
    ]) || user?.passwordchanged || user?.password_changed || user?.passwordChange || user?.password_change || '',
  )
  const last200Raw = extractTimestamp(
    extractNested(user, ['last_200', 'last200', 'last_200_at', 'last200At']) ||
      user?.last_200 ||
      user?.last200 ||
      '',
  )
  const lastRegTimestampRaw = extractTimestamp(
    extractNested(lastReg, [
      'timestamp',
      'last_reg_timestamp',
      'last_registration_timestamp',
      'time',
      'date',
      'value',
    ]) || user?.last_reg_timestamp || user?.last_registration_timestamp || '',
  )
  const lastRegCode = extractNested(lastReg, ['code', 'result_code', 'status_code']) || user?.last_reg_code || ''
  const lastRegDevice =
    extractNested(lastReg, ['device', 'device_id', 'deviceId', 'device_name', 'deviceName']) ||
    user?.last_reg_device ||
    user?.device_id ||
    user?.device ||
    ''
  const passwordChangeIndicator = getPasswordChangeIndicator(last200Raw, passwordChangedRaw)

  return {
    key:
      user?.id ||
      user?.key ||
      `${userId}|${timezone}|${lastRegTimestampRaw}|${index}`,
    userLabel: [displayName, userId].filter(Boolean).join(' • ') || userId,
    timezone,
    passwordChangedText: formatTimestamp(passwordChangedRaw, timezone),
    last200Text: formatTimestamp(last200Raw, timezone),
    lastRegTimestampText: formatTimestamp(lastRegTimestampRaw, timezone),
    lastRegCode: lastRegCode || '',
    lastRegDevice: lastRegDevice || '',
    passwordChangeIndicatorColor: passwordChangeIndicator?.color || '',
    passwordChangeIndicatorTooltip: passwordChangeIndicator?.tooltip || '',
  }
}

function normalizeResultCard(ipAddress, record, index) {
  const source = record && typeof record === 'object' ? record : {}
  const data = source?.data && typeof source.data === 'object' ? source.data : source
  const users = collectUserCandidates(source).map((user, userIndex) =>
    normalizeUser(user, userIndex, getPreferencesTimeZone(source)),
  )

  if (!users.length && source && typeof source === 'object') {
    const userFields = ['user_id', 'userid', 'username', 'userName', 'phone_number', 'phoneNumber']
    const registrationFields = ['last_reg', 'lastRegistration', 'last_registration', 'passwordchanged']
    const hasUserShape =
      userFields.some((field) => source[field] !== undefined && source[field] !== null) ||
      registrationFields.some((field) => source[field] !== undefined && source[field] !== null)

    if (hasUserShape) {
      users.push(normalizeUser(source, 0, getPreferencesTimeZone(source)))
    }
  }

  return {
    key: source?.id || ipAddress || `fraud-card-${index}`,
    ipAddress: String(data?.ip_address || data?.ip || ipAddress || `IP ${index + 1}`).trim(),
    organization:
      data?.organization ||
      data?.org ||
      data?.org_name ||
      data?.company ||
      data?.account_organization ||
      '',
    disposition: data?.disposition || data?.status || data?.decision || data?.rating || '',
    users,
    tone: dispositionTone(data?.disposition || data?.status || data?.decision || data?.rating || ''),
  }
}

function unwrapFraudResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return data
  }
  return data.results || data.data || data.report || data.items || data.hits || data
}

function normalizeFraudResponse(data) {
  const payload = unwrapFraudResponse(data)
  if (Array.isArray(payload)) {
    return payload.map((record, index) =>
      normalizeResultCard(record?.ip_address || record?.ip || record?.address || '', record, index),
    )
  }
  if (!payload || typeof payload !== 'object') {
    return []
  }

  return Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ipAddress, record], index) => normalizeResultCard(ipAddress, record, index))
}

async function getFraudTrace(input, selectedSpan) {
  return await tier3info_restful_request({
    method: 'GET',
    path: `/fraud/scope/${encodeURIComponent(input)}/${encodeURIComponent(selectedSpan)}`,
  })
}

async function runFraudTrace() {
  trimInputString()
  trimSpan()
  if (!inputString.value) return

  isLoading.value = true
  statusMessage.value = `Running fraud trace for "${inputString.value}"...`
  errorMessage.value = null
  reportCards.value = []
  activeTab.value = tabNames.trace

  try {
    const response = await getFraudTrace(inputString.value, span.value || defaultSpan)
    const normalized = normalizeFraudResponse(response?.data)
    if (!normalized.length) {
      statusMessage.value = null
      errorMessage.value = 'No fraud trace data was returned.'
      return
    }
    reportCards.value = normalized
    statusMessage.value = null
  } catch (error) {
    console.error('FraudTracePage: runFraudTrace error:', error)
    statusMessage.value = null
    errorMessage.value = 'Unable to load the fraud trace. Please try again later.'
  } finally {
    isLoading.value = false
  }
}

function hydrateFromQuery(query) {
  const queryInput = String(query?.input_string || query?.inputString || '').trim()
  const querySpan = String(query?.span || '').trim()

  if (queryInput) {
    activeTab.value = tabNames.trace
    inputString.value = queryInput
  }
  if (querySpan) {
    span.value = querySpan
  }

  if (queryInput) {
    runFraudTrace()
  }
}

onMounted(() => {
  hydrateFromQuery(props.query)
})

watch(
  () => props.query,
  (newQuery) => {
    hydrateFromQuery(newQuery)
  },
  { deep: true },
)
</script>

<style lang="scss" scoped>
.fraud-trace-page {
  width: 100%;
}

.fraud-trace-shell {
  width: 100%;
}

.fraud-panel {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.fraud-panel__eyebrow {
  letter-spacing: 0.14em;
}

.fraud-panel__copy {
  max-width: 72ch;
}

.fraud-result-card {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.fraud-result-card--negative {
  border-left: 5px solid #c10015;
}

.fraud-result-card--warning {
  border-left: 5px solid #f2c037;
}

.fraud-result-card--positive {
  border-left: 5px solid #2e7d32;
}

.fraud-result-card--info {
  border-left: 5px solid #1976d2;
}

.fraud-alert-dot {
  margin-right: 2px;
}

.fraud-device-cell {
  word-break: break-word;
  white-space: normal;
}
</style>
