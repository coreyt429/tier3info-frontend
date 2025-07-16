<template>
  <q-card>
    <q-card-section class="bg-primary py-2">
      <h6 class="text-warning text-caption">Preferences</h6>
    </q-card-section>
    <q-card-section>
      <q-form>
        <q-input
          filled
          v-model="preferences.TimeFormat"
          label="Time Format"
          :error="timeFormatError"
          @input="updateTimeFormat"
          :hint="`Example: ${timeFormatExample}`"
          lazy-rules
          class="q-mb-md"
        />
        <q-input
          filled
          v-model="preferences.TimeZone"
          label="Time Zone"
          :error="timeZoneError"
          :hint="`Current system time zone: ${systemTimeZone}`"
          lazy-rules
          class="q-mb-md"
        />
        <q-input
          filled
          v-model="preferences.defaultAction"
          label="Default Action"
          class="q-mb-md"
        />
        <q-select
          filled
          v-model="preferences.defaultRoute"
          label="Default Route"
          :options="routeOptions"
          class="q-mb-md"
        />
        <q-checkbox
          v-model="menuDropDownChecked"
          label="Menu Drop Down"
          @update:model-value="(val) => (preferences.menuDropDown = val ? 1 : 0)"
          class="q-mb-md"
        />
        <q-checkbox
          v-model="menuSearchChecked"
          label="Menu Search"
          @update:model-value="(val) => (preferences.menuSearch = val ? 1 : 0)"
          class="q-mb-md"
        />
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { usePreferencesStore } from 'src/stores/preferences'
import dayjs from 'dayjs'
const preferencesStore = usePreferencesStore()
const preferences = preferencesStore.preferences

const props = defineProps({
  linksList: {
    type: Array,
    default: () => [],
  },
})

console.log('PreferencesControl props:', props)

const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

const timeFormatExample = computed(() => {
  try {
    // Use dayjs to format current date/time with user's TimeFormat string
    const now = dayjs()
    if (!preferences.TimeFormat || preferences.TimeFormat.trim() === '') {
      return ''
    }
    const formatted = now.format(preferences.TimeFormat)
    if (formatted === 'Invalid Date') {
      return ''
    }
    return formatted
  } catch {
    return ''
  }
})

const timeFormatError = ref(false)
const timeZoneError = ref(false)

watch(
  () => preferences.TimeFormat,
  (val) => {
    // Basic validation: TimeFormat should be a non-empty string
    timeFormatError.value = !val || val.trim() === ''
  },
)

watch(
  () => preferences.TimeZone,
  (val) => {
    // Validate that TimeZone matches a known timezone string format (basic check)
    timeZoneError.value = val !== systemTimeZone && val.trim() === ''
  },
)

const updateTimeFormat = (val) => {
  preferences.TimeFormat = val
}

const routeOptions = computed(() => {
  const extractRoutes = (links) => {
    return links.flatMap((link) => {
      if (link.children && link.children.length > 0) {
        return extractRoutes(link.children)
      }
      if (link.link) {
        return {
          label: link.title,
          value: link.link,
        }
      }
      return []
    })
  }

  return extractRoutes(props.linksList)
})

console.log('PreferencesControl routeOptions:', routeOptions.value)
const menuDropDownChecked = computed({
  get: () => preferences.menuDropDown === 1,
  set: (val) => {
    preferences.menuDropDown = val ? 1 : 0
  },
})

const menuSearchChecked = computed({
  get: () => preferences.menuSearch === 1,
  set: (val) => {
    preferences.menuSearch = val ? 1 : 0
  },
})
</script>
