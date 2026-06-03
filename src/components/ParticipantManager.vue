<script setup>
import { ref } from 'vue'
import { api } from '../services/api'
import LogoBadge from './LogoBadge.vue'

const props = defineProps({
  pollId: { type: Number, required: true },
  participants: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
})
const emit = defineEmits(['changed'])

const name = ref('')
const logo = ref(null)
const busy = ref(false)

function onFile(e) {
  logo.value = e.target.files[0] || null
}

async function add() {
  if (!name.value.trim()) return
  busy.value = true
  try {
    const fd = new FormData()
    fd.append('participantName', name.value.trim())
    if (logo.value) fd.append('logo', logo.value)
    await api.addParticipant(props.pollId, fd)
    name.value = ''
    logo.value = null
    emit('changed')
  } finally {
    busy.value = false
  }
}

async function setVote(p, e) {
  const raw = e.target.value
  const pollItemId = raw === '' ? null : Number(raw)
  await api.updateParticipant(props.pollId, p.id, pollItemId)
  emit('changed')
}

async function remove(p) {
  if (!confirm(`Remove participant "${p.participantName}"?`)) return
  await api.deleteParticipant(props.pollId, p.id)
  emit('changed')
}
</script>

<template>
  <section class="panel">
    <h2>Participants <small>(on-stream cards)</small></h2>

    <form class="new" @submit.prevent="add">
      <input v-model="name" placeholder="Participant name e.g. Zaki" />
      <label class="file">
        <input type="file" accept="image/png,image/jpeg" @change="onFile" />
        <span>{{ logo ? logo.name : 'Photo…' }}</span>
      </label>
      <button :disabled="busy || !name.trim()">Add</button>
    </form>

    <div class="grid">
      <div v-for="p in participants" :key="p.id" class="card">
        <button class="ghost danger x" @click="remove(p)">✕</button>
        <LogoBadge :url="p.logoUrl" :size="46" class="ib" />
        <strong class="pname">{{ p.participantName }}</strong>
        <select :value="p.pollItemId ?? ''" @change="setVote(p, $event)">
          <option value="">— not voted —</option>
          <option v-for="it in items" :key="it.id" :value="it.id">
            {{ it.displayName || it.name }}
          </option>
        </select>
      </div>
      <p v-if="!participants.length" class="empty">No participants yet.</p>
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
h2 small {
  color: var(--muted);
  font-weight: 400;
  letter-spacing: 0;
}
.new {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  margin-bottom: 14px;
}
.file {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  max-width: 160px;
}
.file input {
  display: none;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 10px 12px;
  background: var(--panel-2);
  border-radius: 8px;
  text-align: center;
}
.ib {
  color: var(--accent);
}
.pname {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card select {
  width: 100%;
}
.x {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
}
.empty {
  color: var(--muted);
  grid-column: 1 / -1;
  text-align: center;
}
</style>
