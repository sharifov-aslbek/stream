<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../services/api'
import { on } from '../services/socket'
import PollList from '../components/PollList.vue'
import ItemManager from '../components/ItemManager.vue'
import ParticipantManager from '../components/ParticipantManager.vue'
import ChatControl from '../components/ChatControl.vue'
import ChatFeed from '../components/ChatFeed.vue'

const polls = ref([])
const selectedId = ref(null)
const detail = ref(null)
const loading = ref(false)

const selectedPoll = computed(() => polls.value.find((p) => p.id === selectedId.value) || null)

async function loadPolls() {
  polls.value = await api.listPolls()
  // Default selection: keep current, else the active poll, else the first.
  if (!polls.value.some((p) => p.id === selectedId.value)) {
    const active = polls.value.find((p) => p.isActive)
    selectedId.value = active?.id ?? polls.value[0]?.id ?? null
  }
}

async function loadDetail() {
  if (selectedId.value == null) {
    detail.value = null
    return
  }
  loading.value = true
  try {
    detail.value = await api.getPoll(selectedId.value)
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await loadPolls()
  await loadDetail()
}

function select(id) {
  selectedId.value = id
  loadDetail()
}

async function resetVotes() {
  if (!selectedPoll.value) return
  if (!confirm('Reset ALL votes for this poll?')) return
  await api.resetPoll(selectedId.value)
  await loadDetail()
}

// ---- live updates ----
const offFns = []
onMounted(async () => {
  await refreshAll()
  offFns.push(
    on('poll:status', () => refreshAll()),
    on('poll:reset', () => loadDetail()),
    // overlay:flush fires every 5s when the buffer is written — pull fresh counts
    on('overlay:flush', () => loadDetail()),
    // a vote arrived: cheap refresh of just the open poll
    on('poll:vote', (p) => {
      if (p.pollId === selectedId.value) loadDetail()
    })
  )
})
onUnmounted(() => offFns.forEach((off) => off()))
</script>

<template>
  <div class="dash">
    <aside class="left">
      <PollList
        :polls="polls"
        :selected-id="selectedId"
        @select="select"
        @changed="refreshAll"
      />
      <ChatControl />
    </aside>

    <div class="right">
      <template v-if="detail">
        <div class="head">
          <div>
            <h1>{{ detail.title }}</h1>
            <div class="sub">
              <span class="badge" :class="{ on: detail.isActive }">
                {{ detail.isActive ? 'ACTIVE' : 'inactive' }}
              </span>
              <span>💬 {{ detail.totalChatVotes }} chat votes</span>
              <span>🎮 {{ detail.totalStreamVotes }} stream votes</span>
            </div>
          </div>
          <button class="ghost danger" @click="resetVotes">Reset votes</button>
        </div>

        <ItemManager
          :poll-id="detail.id"
          :items="detail.items"
          :total-chat-votes="detail.totalChatVotes"
          @changed="loadDetail"
        />

        <ParticipantManager
          :poll-id="detail.id"
          :participants="detail.participants"
          :items="detail.items"
          @changed="loadDetail"
        />

        <ChatFeed />
      </template>

      <div v-else class="placeholder">
        {{ loading ? 'Loading…' : 'Select or create a poll to begin.' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 18px;
  align-items: start;
}
.left {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 84px;
}
.right {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
h1 {
  margin: 0 0 6px;
  font-family: var(--font-tech);
  font-size: 24px;
}
.sub {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--muted);
  font-size: 13px;
}
.badge {
  padding: 3px 10px;
  border-radius: 20px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 11px;
}
.badge.on {
  background: rgba(46, 204, 113, 0.15);
  border-color: var(--good);
  color: var(--good);
}
.placeholder {
  display: grid;
  place-items: center;
  height: 300px;
  color: var(--muted);
  background: var(--panel);
  border: 1px dashed var(--border);
  border-radius: 10px;
}

/* shared form controls */
:deep(input),
:deep(select) {
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 9px 11px;
  border-radius: 6px;
  outline: none;
}
:deep(input:focus),
:deep(select:focus) {
  border-color: var(--accent);
}
:deep(button) {
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 9px 16px;
  border-radius: 6px;
  font-weight: 700;
}
:deep(button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
:deep(button.ghost) {
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 12px;
}
:deep(button.warn) {
  background: var(--warn);
  color: #1a1a1a;
}
:deep(button.danger) {
  color: #ff8a96;
}
:deep(button.ghost.warn) {
  background: var(--panel-2);
  color: var(--warn);
  border-color: var(--warn);
}
</style>
