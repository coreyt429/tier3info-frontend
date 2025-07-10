<template>
  <template v-if="props">
    <q-item
      v-if="!props.parent"
      :key="props.title"
      :clickable="!props.children || !props.children.length"
      :tag="!props.children || !props.children.length ? 'a' : undefined"
      :target="!props.children || !props.children.length ? props.target : undefined"
      :href="!props.children || !props.children.length ? props.link : undefined"
    >
      <q-item-section v-if="props.icon" avatar>
        <q-icon :name="props.icon" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ props.title }}</q-item-label>
        <q-item-label caption>{{ props.caption }}</q-item-label>
      </q-item-section>
      <q-item-section v-if="props.children && props.children.length" side>
        <q-icon
          :name="isOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_right'"
          class="cursor-pointer"
          @click.stop="toggle"
        />
      </q-item-section>
    </q-item>
    <q-item
      v-else
      :key="props.title + '-parent'"
      clickable="!props.children || !props.children.length"
      :tag="!props.children || !props.children.length ? 'a' : undefined"
      :target="!props.children || !props.children.length ? props.target : undefined"
      :href="!props.children || !props.children.length ? props.link : undefined"
    >
      <q-item-section>
        <q-item-label>{{ props.title }}</q-item-label>
        <q-item-label caption>{{ props.caption }}</q-item-label>
      </q-item-section>
      <q-item-section v-if="props.children && props.children.length" side>
        <q-icon
          :name="isOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_right'"
          class="cursor-pointer"
          @click.stop="toggle"
        />
      </q-item-section>
    </q-item>
    <q-list
      v-if="props.children && props.children.length && isOpen"
      class="q-ml-lg"
      :key="props.title + '-children'"
    >
      <EssentialLinkItem
        v-for="child in props.children"
        :key="child.title"
        :title="child.title"
        :caption="child.caption"
        :link="child.link"
        :icon="child.icon"
        :children="child.children"
        :parent="props.title"
      />
    </q-list>
  </template>
  <template v-else>
    <div style="color: red">Props not defined or missing required fields.</div>
  </template>
</template>

<script setup>
import { ref } from 'vue'
// Do NOT import EssentialLinkItem here to avoid recursion issues

const props = defineProps({
  title: { type: String, required: true },
  caption: { type: String, default: '' },
  link: { type: String, default: '#' },
  icon: { type: String, default: '' },
  target: { type: String, default: '' },
  children: { type: Array, default: () => [] },
  parent: { type: String, default: '' },
})

const isOpen = ref(true)
function toggle() {
  isOpen.value = !isOpen.value
}
console.log('EssentialLinkItem loaded:', props.title, 'Children:', props.children?.length)
</script>
