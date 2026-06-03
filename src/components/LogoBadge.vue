<script setup>
import { ref, watch } from 'vue'
import { assetUrl } from '../services/api'
import SpiderLogo from './SpiderLogo.vue'

// Shows an uploaded logo if available, otherwise the spider fallback.
// Optionally overlays a small circular number badge centered on the mark
// (the "4" chip from the overlay design).
const props = defineProps({
  url: { type: String, default: '' },
  size: { type: [Number, String], default: 56 },
  badge: { type: [Number, String, null], default: null },
})

const failed = ref(false)
watch(
  () => props.url,
  () => {
    failed.value = false
  }
)
</script>

<template>
  <div
    class="badge-wrap"
    :style="{ width: size + 'px', height: size + 'px', fontSize: size + 'px' }"
  >
    <img v-if="url && !failed" :src="assetUrl(url)" alt="" @error="failed = true" />
    <SpiderLogo v-else :size="Math.round(Number(size) * 0.94)" />
    <span v-if="badge !== null && badge !== ''" class="num">{{ badge }}</span>
  </div>
</template>

<style scoped>
.badge-wrap {
  position: relative;
  display: grid;
  place-items: center;
  color: #fff;
}
.badge-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.num {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 1.3em;
  height: 1.3em;
  padding: 0 0.18em;
  border-radius: 999px;
  background: #fff;
  color: #111;
  font-family: var(--font-tech);
  font-weight: 800;
  font-size: 0.42em;
  line-height: 1.3em;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25);
}
</style>
