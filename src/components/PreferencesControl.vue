<template>
  <ToggleBanner title="Preferences" storageKey="showPreferences" v-model="showPreferences" />
  <q-card>
    <q-card-section v-if="showPreferences">
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
          label="Favorite Action (old gui)"
          class="q-mb-md"
        />
        <q-select
          filled
          v-model="preferences.defaultRoute"
          label="Favorite Route (new gui)"
          :options="filteredRouteOptions"
          option-value="value"
          option-label="label"
          emit-value
          map-options
          class="q-mb-md"
          use-input
          fill-input
          hide-selected
          input-debounce="200"
          @filter="filterFn"
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
import ToggleBanner from './ToggleBanner.vue'
const preferencesStore = usePreferencesStore()
const preferences = preferencesStore.preferences
const showPreferences = ref(
  localStorage.getItem('showPreferences') === null
    ? true
    : JSON.parse(localStorage.getItem('showPreferences')),
)

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
      if (link.link && (link.link.startsWith('/') || link.link.includes('index.cgi'))) {
        return {
          label: link.title,
          value: link.link,
        }
      }
      return []
    })
  }

  const routes = extractRoutes(props.linksList)
  return routes.sort((a, b) => a.label.localeCompare(b.label))
})

const filteredRouteOptions = ref(routeOptions.value)

// Ensure preferences.defaultRoute only stores the value string
if (
  preferences.defaultRoute &&
  typeof preferences.defaultRoute === 'object' &&
  'value' in preferences.defaultRoute
) {
  preferences.defaultRoute = preferences.defaultRoute.value
}

watch(routeOptions, (newOptions) => {
  filteredRouteOptions.value = newOptions
})

const filterFn = (val, update) => {
  if (val === '') {
    update(() => {
      filteredRouteOptions.value = routeOptions.value
    })
  } else {
    const filter = val.toLowerCase()
    update(() => {
      filteredRouteOptions.value = routeOptions.value.filter((option) =>
        option.label.toLowerCase().includes(filter),
      )
    })
  }
}

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
