<script setup>
import { ref } from 'vue'
import { api } from '../services/api'

const props = defineProps({
  polls: { type: Array, default: () => [] },
  selectedId: { type: Number, default: null },
})
const emit = defineEmits(['select', 'changed'])

const title = ref('')
const busy = ref(false)

async function create() {
  const t = title.value.trim()
  if (!t) return
  busy.value = true
  try {
    const poll = await api.createPoll(t)
    title.value = ''
    emit('changed')
    emit('select', poll.id)
  } finally {
    busy.value = false
  }
}

async function remove(poll) {
  if (!confirm(`Delete poll "${poll.title}"?`)) return
  await api.deletePoll(poll.id)
  emit('changed')
}

async function activate(poll) {
  await api.activatePoll(poll.id)
  emit('changed')
}
async function deactivate(poll) {
  await api.deactivatePoll(poll.id)
  emit('changed')
}
</script>

<template>
  <section class="panel">
    <h2>Polls</h2>

    <form class="new" @submit.prevent="create">
      <input v-model="title" placeholder="New poll title…" maxlength="200" />
      <button :disabled="busy || !title.trim()">Create</button>
    </form>

    <ul class="list">
      <li
        v-for="p in polls"
        :key="p.id"
        :class="{ active: p.id === selectedId }"
        @click="emit('select', p.id)"
      >
        <div class="row">
          <span class="dot" :class="{ on: p.isActive }"></span>
          <span class="name">{{ p.title }}</span>
        </div>
        <div class="actions" @click.stop>
          <button v-if="!p.isActive" class="ghost" @click="activate(p)">Activate</button>
          <button v-else class="ghost warn" @click="deactivate(p)">Deactivate</button>
          <button class="ghost danger" @click="remove(p)">✕</button>
        </div>
      </li>
      <li v-if="!polls.length" class="empty">No polls yet.</li>
    </ul>
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
.new {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.new input {
  flex: 1;
  min-width: 0;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--panel-2);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}
.list li.active {
  border-color: var(--accent);
}
.list li.empty {
  justify-content: center;
  color: var(--muted);
  cursor: default;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #555;
  flex: none;
}
.dot.on {
  background: var(--good);
  box-shadow: 0 0 8px var(--good);
}
.actions {
  display: flex;
  gap: 6px;
  flex: none;
}
</style>
