<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'
import { on } from '../services/socket'
import LogoBadge from '../components/LogoBadge.vue'

const route = useRoute()
const DEMO = {
  isActive: true,
  pollTitle: 'GAMEPOINT CS 7 MAVSUM',
  items: [
    { id: 1, name: 'F', displayName: 'iF', logoUrl: '', chatPercentage: 100, streamVotesCount: 4 },
    { id: 2, name: 'G', displayName: 'iG', logoUrl: '', chatPercentage: 100, streamVotesCount: 4 },
  ],
  participants: [
    { id: 1, participantName: 'ZAKI', pollItemId: 1, logoUrl: '' },
    { id: 2, participantName: 'DEVICE', pollItemId: 1, logoUrl: '' },
    { id: 3, participantName: 'CHAT', pollItemId: 2, logoUrl: '' },
  ],
  totalChatVotes: 0,
  recentVote: null,
}

const data = ref({
  isActive: false,
  pollTitle: null,
  items: [],
  participants: [],
  totalChatVotes: 0,
  recentVote: null,
})

const recentFlash = ref(null)
let flashTimer = null

async function refresh() {
  try {
    data.value = await api.getOverlay()
  } catch (e) {
    console.warn('overlay refresh failed', e)
  }
}

function showFlash(vote) {
  if (!vote) return
  recentFlash.value = vote
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (recentFlash.value = null), 4000)
}

const offFns = []
let pollTimer = null

onMounted(async () => {
  document.body.classList.add('overlay-mode')

  if (route.query.demo != null) {
    data.value = DEMO
    return
  }

  await refresh()

  offFns.push(
    on('poll:vote', (payload) => {
      if (payload?.items) {
        const byId = new Map(payload.items.map((i) => [i.id, i]))
        data.value.items = data.value.items.map((it) => {
          const u = byId.get(it.id)
          return u ? { ...it, chatPercentage: u.chatPercentage } : it
        })
      }
      showFlash({
        authorName: payload.authorName,
        pollItemName: payload.votedItemName,
        pollItemLogoUrl:
          payload.items?.find((i) => i.name === payload.votedItemName)?.logoUrl || '',
      })
    }),
    on('poll:status', () => refresh()),
    on('poll:reset', () => {
      recentFlash.value = null
      refresh()
    }),
    on('overlay:flush', () => refresh()),
    on('connect', () => refresh())
  )

  pollTimer = setInterval(refresh, 15000)
})

onUnmounted(() => {
  document.body.classList.remove('overlay-mode')
  offFns.forEach((off) => off())
  clearTimeout(flashTimer)
  clearInterval(pollTimer)
})

// ---------------------------------------------------------------------------
// View-Model Computations
// ---------------------------------------------------------------------------

// Stable Teams: Used for the bottom bar so left/right layout doesn't jump abruptly
const teamA = computed(() => data.value.items[0] || null)
const teamB = computed(() => data.value.items[1] || null)

// Ranked Teams: Used for the dynamic matchup card (FLIP Animation).
const rankedItems = computed(() =>
  [...data.value.items].sort((a, b) => scoreValue(b) - scoreValue(a))
)
const winnerItem = computed(() => rankedItems.value[0] || null)

const itemsById = computed(() => {
  const m = new Map()
  for (const it of data.value.items) m.set(it.id, it)
  return m
})

function chosenItem(participant) {
  return participant.pollItemId ? itemsById.value.get(participant.pollItemId) : null
}

// The team image to portray on a participant card: their assigned team, or —
// when none is assigned yet — the leading team from the matchup ("comparing")
// card, so the participant card always mirrors an image standing in the
// comparison instead of falling back to the empty spider.
function participantTeam(participant) {
  return chosenItem(participant) || winnerItem.value
}

function score(item) {
  return scoreValue(item)
}

function scoreValue(item) {
  if (!item) return 0
  return item.totalScore ?? item.streamVotesCount ?? item.votesCount ?? item.chatPercentage ?? 0
}

function isWinner(item) {
  return !!item && item.id === winnerItem.value?.id
}

function keyword(item) {
  if (!item) return '—'
  return item.name.startsWith('!') ? item.name : `!${item.name}`
}
</script>

<template>
  <div class="overlay" :class="{ inactive: !data.isActive }">
    <div class="cards">
      
      <div class="card matchup">
        <div class="card-tab">{{ data.pollTitle || 'NEXUSPOLL' }}</div>

        <TransitionGroup name="team-swap" tag="div" class="card-body">
          <template v-for="(team, index) in rankedItems" :key="team.id">
            <span v-if="index > 0" :key="`vs-${team.id}`" class="vs">X</span>
            <LogoBadge
              class="mark"
              :class="{ winnerMark: isWinner(team) }"
              :url="team.logoUrl"
              :size="58"
            />
          </template>
        </TransitionGroup>
      </div>

      <div
        v-for="p in data.participants"
        :key="p.id"
        class="card participant"
        :class="{ winner: isWinner(chosenItem(p)) }"
      >
        <div class="card-tab">{{ p.participantName }}</div>
        <div class="card-body">
          <Transition name="fade" mode="out-in">
            <div :key="`participant-${p.id}`" class="photo-wrap">
              <LogoBadge
                class="mark"
                :class="{ winnerMark: isWinner(chosenItem(p)) }"
                :url="participantTeam(p)?.logoUrl || p.logoUrl"
                :size="54"
              />
            </div>
          </Transition>
        </div>
      </div>
      
    </div>

    <div class="bottom">
      <div class="facecam"></div>

      <div class="votebar">
        <div class="votebar-fill" :style="{ width: (teamA?.chatPercentage || 0) + '%' }"></div>
        <div class="votebar-content">
          <span class="vote-label">OVOZ BERISH</span>
          <span class="pct">{{ teamA?.chatPercentage ?? 0 }}%</span>
          
          <Transition name="fade" mode="out-in">
            <LogoBadge
              :key="teamA?.id || 'bottom-team-a-empty'"
              class="mark bottomMark"
              :class="{ winnerMark: isWinner(teamA) }"
              :url="teamA?.logoUrl"
              :size="72"
            />
          </Transition>
          
          <span class="team">{{ keyword(teamA) }}</span>
          <span class="vs big">X</span>
          <span class="team">{{ keyword(teamB) }}</span>
          
          <Transition name="fade" mode="out-in">
            <LogoBadge
              :key="teamB?.id || 'bottom-team-b-empty'"
              class="mark bottomMark"
              :class="{ winnerMark: isWinner(teamB) }"
              :url="teamB?.logoUrl"
              :size="72"
            />
          </Transition>
          
          <span class="pct">{{ teamB?.chatPercentage ?? 0 }}%</span>
        </div>
      </div>
    </div>

    <transition name="flash">
      <div v-if="recentFlash" class="flash-toast">
        <LogoBadge :url="recentFlash.pollItemLogoUrl" :size="34" />
        <div class="flash-text">
          <strong>{{ recentFlash.authorName }}</strong>
          <span>{{ recentFlash.pollItemName }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Load the local variable font from src/font folder */
@font-face {
  font-family: 'Orbitron';
  src: url('../font/Orbitron-VariableFont_wght.ttf') format('truetype-variable'),
       url('../font/Orbitron-VariableFont_wght.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.overlay {
  position: fixed;
  inset: 0;
  font-family: 'Orbitron', sans-serif;
  color: #fff;
  user-select: none;
  pointer-events: none;
}
.overlay.inactive {
  opacity: 0;
  transition: opacity 0.4s;
}

/* Optional background matching production stage canvas */
:global(.overlay-mode) {
  background-color: #0d161f;
}

/* ---- Shared rich crimson texture ---- */
.card,
.votebar {
  background: linear-gradient(135deg, #7a0718 0%, #940a23 100%);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

/* ===================== Top cards ===================== */
.cards {
  position: absolute;
  left: 120px;
  /* 12.69px gap above the bottom banner (banner top = 78 + 132 = 210px) */
  bottom: 222.69px;
  display: flex;
  align-items: stretch; /* Stretches cards to match layout height perfectly */
  gap: 12px;
}
.cards::before {
  content: '';
  position: absolute;
  left: -26px;
  right: -26px;
  bottom: -20px;
  height: 150px;
  background: linear-gradient(90deg, transparent, rgba(255, 80, 98, 0.2), transparent);
  filter: blur(16px);
  opacity: 0.7;
  animation: card-light-pass 6s ease-in-out infinite;
}
.card {
  position: relative;
  animation: card-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  transition: filter 0.35s ease;
  z-index: 1;
}
.card:nth-child(2) { animation-delay: 0.1s; }
.card:nth-child(3) { animation-delay: 0.2s; }
.card:nth-child(4) { animation-delay: 0.3s; }
.card:nth-child(5) { animation-delay: 0.4s; }

.card.winner {
  filter: drop-shadow(0 0 18px rgba(255, 80, 98, 0.55));
}
.card.winner::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.38);
  opacity: 0.65;
  animation: winner-frame 2s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

.matchup {
  width: 269px;
  background: url('../assets/comparing-card.png') center / 100% 100% no-repeat;
}
.matchup .card-body {
  gap: 26px;
}

/* ---- White title header labels ---- */
.card-tab {
  position: absolute;
  top: -23px;
  left: 0;
  right: 0;
  background: #ffffff;
  color: #0c0d10;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 5px 12px;
  text-align: center;
  white-space: nowrap;
}

/* Base structural dimensions for matchup block */
.card-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 22px;
  height: 105px;
  box-sizing: border-box;
}
.vs {
  font-size: 30px;
  font-weight: 900;
}
.mark {
  flex: none;
  transition: filter 0.35s ease;
}
.winnerMark {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
}

/* Participant Layout: Locked completely edge-to-edge inside the exact height mask */
.card.participant {
  width: 127px;
  background: url('../assets/participants-bg.png') center / 100% 100% no-repeat;
}
.card.participant .card-body {
  padding: 0;
  height: 105px;           /* Match the comparing (matchup) card height */
  box-sizing: border-box;
  overflow: hidden;        /* Clones bounds clipping to stop image bursting */
  border-radius: inherit;  /* Follows base card border-radius smoothly */
}
.photo-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;     /* Center the logo inside the card... */
  justify-content: center; /* ...instead of stretching it edge-to-edge */
  line-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;        /* Dual layout mask for custom image scaling layers */
}

/* Keep the logo contained at its natural badge size (not bursting the frame) */
.photo-wrap :deep(img) {
  object-fit: contain !important;
}

.team-chip {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 2;
  padding: 2px;
  background: rgba(12, 13, 16, 0.85);
  border-radius: 5px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.55);
}
.score-ball {
  position: absolute;
  left: 50%;
  bottom: 8px;
  transform: translateX(-50%);
  z-index: 2;
  min-width: 1.5em;
  height: 1.5em;
  padding: 0 0.3em;
  border-radius: 999px;
  background: #fff;
  color: #111;
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 19px;
  line-height: 1.5em;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25);
}
.overlay :deep(.num) {
  min-width: 1.16em;
  height: 1.16em;
  padding: 0 0.16em;
  font-size: 0.34em;
  line-height: 1.16em;
}

/* ===================== Bottom row bar metrics ===================== */
.bottom {
  position: absolute;
  left: 120px;
  bottom: 78px;
  display: flex;
  align-items: stretch;
  gap: 16px;
}
.facecam {
  width: 172px;
  height: 132px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  border-radius: 4px;
}
.votebar {
  position: relative;
  width: 1366px;
  height: 132px;
  overflow: hidden;
  background: url('../assets/long-banner-bottom.png') center / 100% 100% no-repeat;
  animation: bar-slide 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}
.votebar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(255, 80, 98, 0.5), rgba(183, 24, 38, 0));
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.votebar-content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between; /* Spread the text edge-to-edge across the banner */
  gap: 16px;
  padding: 0 48px;
}
.vote-label {
  font-size: 56px;
  font-weight: 900;
  letter-spacing: 1px;
}
.pct {
  font-size: 56px;
  font-weight: 800;
  text-align: center;
}
.team {
  font-size: 52px;
  font-weight: 800;
  letter-spacing: 1px;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vs.big {
  font-size: 60px;
  margin: 0 4px;
}

/* ===================== Live Alert Toast Notification ===================== */
.flash-toast {
  position: absolute;
  left: 120px;
  bottom: 312px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(12, 13, 16, 0.92);
  border-left: 3px solid #ff5062;
  font-family: 'Orbitron', sans-serif;
  border-radius: 0 4px 4px 0;
}
.flash-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.flash-text strong {
  font-size: 14px;
}
.flash-text span {
  font-size: 12px;
  color: #ffb3bb;
}
.flash-enter-active,
.flash-leave-active {
  transition: all 0.35s ease;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ===================== Animation Timelines ===================== */
.team-swap-move {
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes card-light-pass {
  0%, 100% {
    transform: translateX(-16%);
    opacity: 0.25;
  }
  50% {
    transform: translateX(16%);
    opacity: 0.85;
  }
}
@keyframes winner-frame {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.65; }
}
@keyframes bar-slide {
  from {
    opacity: 0;
    transform: translateX(34px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>