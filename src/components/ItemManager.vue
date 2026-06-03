<script setup>
import { ref } from 'vue'
import { api } from '../services/api'
import LogoBadge from './LogoBadge.vue'

const props = defineProps({
  pollId: { type: Number, required: true },
  items: { type: Array, default: () => [] },
  totalChatVotes: { type: Number, default: 0 },
})
const emit = defineEmits(['changed'])

const name = ref('')
const displayName = ref('')
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
    fd.append('name', name.value.trim())
    if (displayName.value.trim()) fd.append('displayName', displayName.value.trim())
    if (logo.value) fd.append('logo', logo.value)
    await api.addItem(props.pollId, fd)
    name.value = ''
    displayName.value = ''
    logo.value = null
    emit('changed')
  } finally {
    busy.value = false
  }
}

async function remove(item) {
  if (!confirm(`Delete item "${item.name}"?`)) return
  await api.deleteItem(props.pollId, item.id)
  emit('changed')
}

function pct(item) {
  if (!props.totalChatVotes) return 0
  return Math.round((item.votesCount / props.totalChatVotes) * 100)
}
</script>

<template>
  <section class="panel">
    <h2>Items <small>(teams / options)</small></h2>

    <form class="new" @submit.prevent="add">
      <input v-model="name" placeholder="Keyword e.g. AXAXAX (chat types !AXAXAX)" />
      <input v-model="displayName" placeholder="Display name (optional)" />
      <label class="file">
        <input type="file" accept="image/png,image/jpeg" @change="onFile" />
        <span>{{ logo ? logo.name : 'Logo…' }}</span>
      </label>
      <button :disabled="busy || !name.trim()">Add</button>
    </form>

    <div class="items">
      <div v-for="it in items" :key="it.id" class="item">
        <LogoBadge :url="it.logoUrl" :size="44" class="ib" />
        <div class="meta">
          <div class="line">
            <strong>{{ it.displayName || it.name }}</strong>
            <code>!{{ it.name }}</code>
          </div>
          <div class="bar">
            <div class="fill" :style="{ width: pct(it) + '%' }"></div>
          </div>
          <div class="stats">
            <span>{{ pct(it) }}%</span>
            <span>💬 {{ it.votesCount }}</span>
            <span>🎮 {{ it.streamVotesCount }}</span>
            <span class="total">Σ {{ it.totalScore }}</span>
          </div>
        </div>
        <button class="ghost danger" @click="remove(it)">✕</button>
      </div>
      <p v-if="!items.length" class="empty">No items yet — add teams above.</p>
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
  grid-template-columns: 1.4fr 1fr auto auto;
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
  max-width: 140px;
}
.file input {
  display: none;
}
.items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--panel-2);
  border-radius: 8px;
  padding: 10px 12px;
}
.ib {
  color: var(--accent);
  flex: none;
}
.meta {
  flex: 1;
  min-width: 0;
}
.line {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.line code {
  color: #ffb3bb;
  font-size: 12px;
}
.bar {
  height: 8px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), #ff6473);
  transition: width 0.4s ease;
}
.stats {
  display: flex;
  gap: 14px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--muted);
}
.stats .total {
  color: var(--text);
  font-weight: 700;
}
.empty {
  color: var(--muted);
  text-align: center;
  margin: 8px 0;
}
</style>
