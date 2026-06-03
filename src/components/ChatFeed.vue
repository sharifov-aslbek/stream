<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { api } from '../services/api'
import { on } from '../services/socket'

const messages = ref([])
const MAX = 100

async function load() {
  const res = await api.chatMessages()
  // API returns newest-first; show newest at top.
  messages.value = res.messages || []
}

let off
onMounted(() => {
  load()
  off = on('chat:message', (msg) => {
    messages.value = [msg, ...messages.value].slice(0, MAX)
  })
})
onUnmounted(() => off && off())

function time(ts) {
  try {
    return new Date(ts).toLocaleTimeString()
  } catch {
    return ''
  }
}
</script>

<template>
  <section class="panel">
    <h2>Live Chat</h2>
    <div class="feed">
      <div v-for="m in messages" :key="m.id" class="msg" :class="{ vote: m.isVote }">
        <span class="t">{{ time(m.timestamp) }}</span>
        <span class="author">{{ m.authorName }}</span>
        <span class="text">{{ m.message }}</span>
        <span v-if="m.isVote" class="tag">→ {{ m.votedItemName }}</span>
      </div>
      <p v-if="!messages.length" class="empty">No messages yet.</p>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
h2 {
  margin: 0 0 12px;
  font-family: var(--font-tech);
  font-size: 16px;
  letter-spacing: 1px;
}
.feed {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 420px;
}
.msg {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 13px;
}
.msg.vote {
  background: rgba(200, 30, 44, 0.12);
}
.t {
  color: var(--muted);
  font-size: 11px;
  flex: none;
}
.author {
  font-weight: 700;
  color: #ffb3bb;
  flex: none;
}
.text {
  color: var(--text);
  word-break: break-word;
}
.tag {
  margin-left: auto;
  color: var(--good);
  font-weight: 700;
  flex: none;
}
.empty {
  color: var(--muted);
  text-align: center;
}
</style>
