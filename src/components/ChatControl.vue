<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../services/api'
import { on } from '../services/socket'

const status = ref({ isRunning: false, videoId: null, message: '' })
const videoId = ref('')
const busy = ref(false)

// quick test vote
const simAuthor = ref('TestUser')
const simMsg = ref('')

async function refresh() {
  status.value = await api.chatStatus()
}

async function start() {
  if (!videoId.value.trim()) return
  busy.value = true
  try {
    status.value = await api.chatStart(videoId.value.trim())
  } finally {
    busy.value = false
  }
}
async function stop() {
  busy.value = true
  try {
    status.value = await api.chatStop()
  } finally {
    busy.value = false
  }
}

async function simulate() {
  if (!simMsg.value.trim()) return
  await api.simulateVote(simAuthor.value.trim() || 'TestUser', simMsg.value.trim())
  simMsg.value = ''
}

let off
onMounted(() => {
  refresh()
  off = on('chat:status', (s) => (status.value = { ...status.value, ...s }))
})
onUnmounted(() => off && off())
</script>

<template>
  <section class="panel">
    <h2>Chat Listener</h2>

    <div class="status" :class="{ live: status.isRunning }">
      <span class="dot"></span>
      <span v-if="status.isRunning">Live · {{ status.videoId }}</span>
      <span v-else>Stopped</span>
    </div>

    <form class="row" @submit.prevent="start">
      <input v-model="videoId" placeholder="YouTube URL or video ID" />
      <button v-if="!status.isRunning" :disabled="busy || !videoId.trim()">Start</button>
      <button v-else type="button" class="warn" :disabled="busy" @click="stop">Stop</button>
    </form>

    <div class="sim">
      <div class="sim-title">Simulate a vote (test)</div>
      <form class="row" @submit.prevent="simulate">
        <input v-model="simAuthor" class="sm" placeholder="Author" />
        <input v-model="simMsg" placeholder="!AXAXAX" />
        <button class="ghost" :disabled="!simMsg.trim()">Send</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}
h2 {
  margin: 0 0 12px;
  font-family: var(--font-tech);
  font-size: 16px;
  letter-spacing: 1px;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--panel-2);
  font-size: 13px;
  margin-bottom: 12px;
}
.status .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #777;
}
.status.live .dot {
  background: var(--good);
  box-shadow: 0 0 8px var(--good);
  animation: pulse 1.4s infinite;
}
@keyframes pulse {
  50% {
    opacity: 0.4;
  }
}
.row {
  display: flex;
  gap: 8px;
}
.row input {
  flex: 1;
  min-width: 0;
}
.row input.sm {
  flex: 0 0 110px;
}
.sim {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.sim-title {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}
</style>
