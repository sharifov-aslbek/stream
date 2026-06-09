<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'
import { on } from '../services/socket'
import LogoBadge from '../components/LogoBadge.vue'
import xxxImg from '../assets/xxx.png'

const route = useRoute()
const DEMO = {
  isActive: true,
  pollTitle: 'GAMEPOINT CS 7 MAVSUM',
  items: [
    { id: 1, name: 'F', displayName: 'iF', logoUrl: '', chatPercentage: 100, streamVotesCount: 4 },
    { id: 2, name: 'G', displayName: 'iG', logoUrl: '', chatPercentage: 100, streamVotesCount: 4 },
  ],
  participants: [
    { id: 1, participantName: 'ART1ST', pollItemId: null, logoUrl: '' },
    { id: 2, participantName: 'SOLAAR', pollItemId: null, logoUrl: '' },
    { id: 3, participantName: 'FRIEND444', pollItemId: 1, logoUrl: '' },
    { id: 4, participantName: 'TOLL', pollItemId: null, logoUrl: '' },
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
    // ?demo&results previews the post-submit state (CHAT card collapses to the
    // higher-scoring team — here team 1 / iF).
    data.value =
      route.query.results != null
        ? { ...DEMO, isActive: false, phase: 'results', winnerItemId: 1 }
        : DEMO
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
    // poll:ended carries the full results-phase payload directly; refresh() pulls
    // the same shape from /api/overlay so the overlay flips to the results view.
    on('poll:ended', () => refresh()),
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

// Participant cards must keep a STABLE row order. The backend may return
// participants in a different order once someone votes; if we rendered that
// order directly, the keyed TransitionGroup would re-seat cards (a positional
// slide) on a mere team change. Pinning by id means a vote only flips the
// in-card logo snake — the row itself never moves. New participants still
// append in id order and animate in via the cardflow enter (rise).
const orderedParticipants = computed(() =>
  [...data.value.participants].sort((a, b) => a.id - b.id)
)

const itemsById = computed(() => {
  const m = new Map()
  for (const it of data.value.items) m.set(it.id, it)
  return m
})

function chosenItem(participant) {
  return participant.pollItemId ? itemsById.value.get(participant.pollItemId) : null
}

// Which side of the matchup a participant has committed to. teamA is the left
// logo, teamB the right. Returns null while they're still undecided — that's
// when the card keeps BOTH logos visible. Once they vote, the loser's logo
// snakes out to the right and the chosen logo slides to the centre. Driven by
// the live pollItemId, which arrives over the poll:vote / overlay socket.
function choiceSide(participant) {
  if (!participant.pollItemId) return null
  if (participant.pollItemId === teamA.value?.id) return 'left'
  if (participant.pollItemId === teamB.value?.id) return 'right'
  return null
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

// ---------------------------------------------------------------------------
// CHAT summary card (sits after the participants)
// ---------------------------------------------------------------------------
// Mirrors the two-logo participant layout, but its pick is decided by the poll
// itself. While the poll is live it shows BOTH teams. Once the poll is submitted
// (admin deactivates → phase "results"), the higher-scoring team snakes to the
// centre and the other fades out — same animation as the participant cards.
const submitted = computed(
  () => data.value.phase === 'results' || data.value.showResults === true
)
const chatChoice = computed(() => {
  if (!submitted.value || !teamA.value || !teamB.value) return null
  const wid = data.value.winnerItemId
  if (wid === teamA.value.id) return 'left'
  if (wid === teamB.value.id) return 'right'
  // fallback when the backend didn't flag a winner: compare live scores
  return scoreValue(teamA.value) >= scoreValue(teamB.value) ? 'left' : 'right'
})
</script>

<template>
  <div class="overlay" :class="{ inactive: !data.isActive && data.phase !== 'results' }">
    <TransitionGroup name="cardflow" tag="div" class="cards" appear>

      <div class="card matchup" key="matchup">
        <div class="card-tab">{{ data.pollTitle || 'NEXUSPOLL' }}</div>

        <div class="card-body">
          <LogoBadge
            class="mark"
            :class="{ winnerMark: isWinner(teamA) }"
            :url="teamA?.logoUrl"
            :size="66"
          />
          <img class="vs vs-img" :src="xxxImg" alt="X" />
          <LogoBadge
            class="mark"
            :class="{ winnerMark: isWinner(teamB) }"
            :url="teamB?.logoUrl"
            :size="66"
          />
        </div>
      </div>

      <div
        v-for="p in orderedParticipants"
        :key="p.id"
        class="card participant"
        :class="[`choice-${choiceSide(p) || 'none'}`, { voted: !!choiceSide(p), winner: isWinner(chosenItem(p)) }]"
      >
        <div class="pname">{{ p.participantName }}</div>
        <div class="pbody">
          <div class="pslot slot-left">
            <LogoBadge class="mark" :url="teamA?.logoUrl" :size="66" />
          </div>
          <span class="pdivider"></span>
          <div class="pslot slot-right">
            <LogoBadge class="mark" :url="teamB?.logoUrl" :size="66" />
          </div>
        </div>
      </div>

      <!-- CHAT summary card: collapses to the higher-scoring team once submitted -->
      <div
        v-if="teamA && teamB"
        key="chat"
        class="card participant chat"
        :class="[`choice-${chatChoice || 'none'}`, { voted: !!chatChoice }]"
      >
        <div class="pname">CHAT</div>
        <div class="pbody">
          <div class="pslot slot-left">
            <LogoBadge class="mark" :url="teamA?.logoUrl" :size="66" />
          </div>
          <span class="pdivider"></span>
          <div class="pslot slot-right">
            <LogoBadge class="mark" :url="teamB?.logoUrl" :size="66" />
          </div>
        </div>
      </div>

    </TransitionGroup>

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
          <img class="vs big vs-img" :src="xxxImg" alt="X" />
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
  transition: opacity 2.4s;
}

/* Optional background matching production stage canvas */
:global(.overlay-mode) {
  background-color: #0d161f;
}

/* ---- Shared rich crimson texture ---- */
.card,
.votebar {
  background: linear-gradient(135deg, #7a0718 0%, #940a23 100%);
  border-radius: 0;
}

/* ===================== Top cards ===================== */
.cards {
  position: absolute;
  left: 120px;
  /* 12.69px gap above the bottom banner (banner top = 78 + 132 = 210px) */
  bottom: 222.69px;
  display: flex;
  align-items: flex-end; /* Align all card bottoms; participant cards rise to the
                            comparing card's full height (incl. its floating tab) */
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
  animation: card-light-pass 8s ease-in-out infinite;
}
.card {
  position: relative;
  transition: filter 2.35s ease;
  z-index: 1;
}
/* Bottom→top rise ONLY when a card actually enters the row — i.e. the initial
   load (appear) or a brand-new participant being added. An in-place update like
   a vote/team change never gets these classes, so it never rises; it just plays
   the horizontal logo snake. `backwards` holds the start frame (no pre-anim flash). */
.cardflow-enter-active,
.cardflow-appear-active {
  animation: card-rise 3.8s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
/* Stagger only the initial appear so the row cascades in; a single added card
   rises immediately with no delay. */
.cardflow-appear-active:nth-child(2) { animation-delay: 0.18s; }
.cardflow-appear-active:nth-child(3) { animation-delay: 0.36s; }
.cardflow-appear-active:nth-child(4) { animation-delay: 0.54s; }
.cardflow-appear-active:nth-child(5) { animation-delay: 0.72s; }

.card.winner::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid rgba(255, 255, 255, 0.38);
  opacity: 0.65;
  animation: winner-frame 4s ease-in-out infinite;
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

/* Base structural dimensions for matchup block.
   Body is 82px so that, with the ~23px the title tab floats above it, the card's
   total visual height is 105px — exactly matching the participant cards. */
.card-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 10px 22px;
  height: 82px;
  box-sizing: border-box;
}
.vs {
  font-size: 30px;
  font-weight: 900;
}
.mark {
  flex: none;
  transition: filter 2.35s ease;
}
.winnerMark {
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4));
}

/* ---- Participant cards: name banner + the two team logos ----
   A participant starts undecided, showing BOTH team logos split by a divider.
   When they vote (choiceSide != null) the card narrows, the divider fades and
   the non-chosen logo slides off its OWN side (left loser exits left, right
   loser exits right) while the chosen one glides to the centre — leaving a
   single centred logo. */
.card.participant {
  /* Fixed card footprint */
  width: 127px;
  height: 105px;
  /* Same crimson texture as the comparing card */
  background: url('../assets/participants-bg.png') center / 100% 100% no-repeat;
  border-radius: 0;
  overflow: hidden;             /* clips the big logos at both edges + the exiting loser */
  display: flex;
  flex-direction: column;
}

/* Dark name banner sitting at the top of the white card */
.pname {
  flex: none;
  height: 26px;
  line-height: 26px;
  background: #ffffff;
  color: #0c0d10;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
  text-align: center;
  padding: 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* The white logo stage below the banner; fills the remaining card height so
   participant cards line up with the matchup card (align-items: stretch). */
.pbody {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;   /* crimson card texture shows through */
  overflow: hidden;
}
.pslot {
  flex: 1;
  display: grid;
  place-items: center;
  /* Chess-piece slide (not a snake crawl): the logo glides smoothly across to
     its new "square" and settles into place. The transform easing has a soft
     overshoot so it lands with a brief settle, like a piece being pushed and set
     down — deliberate but never choppy. Opacity eases out cleanly so the loser
     fades as it leaves. */
  transition: transform 1.7s cubic-bezier(0.32, 1.28, 0.5, 1), opacity 1.3s ease-out;
}
.pdivider {
  width: 1px;
  align-self: stretch;
  margin: 16px 0;
  background: rgba(255, 255, 255, 0.28);
  transition: opacity 2.35s ease;
}

/* Voted: divider gone, winner glides to the centre, loser slides out right. */
.card.participant.voted .pdivider {
  opacity: 0;
}
.card.participant.choice-left .slot-left {
  transform: translateX(50%);   /* left-half centre → card centre */
  z-index: 2;
}
.card.participant.choice-left .slot-right {
  transform: translateX(140%);  /* exit right */
  opacity: 0;
}
.card.participant.choice-right .slot-right {
  transform: translateX(-50%);  /* right-half centre → card centre */
  z-index: 2;
}
.card.participant.choice-right .slot-left {
  transform: translateX(-140%);  /* exit left — loser leaves on its own side */
  opacity: 0;
}

/* Keep logos contained at their natural badge size on the crimson stage. */
.pbody :deep(img) {
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
  width: 195px;
  height: 131px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
  border-radius: 0;
}
.votebar {
  position: relative;
  width: 1366px;
  height: 132px;
  overflow: hidden;
  background: url('../assets/long-banner-bottom.png') center / 100% 100% no-repeat;
  animation: bar-slide 4.8s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
}
.votebar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(255, 80, 98, 0.5), rgba(183, 24, 38, 0));
  transition: width 2.6s cubic-bezier(0.22, 1, 0.36, 1);
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
  color: #deff00;
}
.vs.big {
  font-size: 60px;
  margin: 0 4px;
}
/* X image replacing the "X" text between logos */
.vs-img {
  width: 1em;
  height: 1em;
  object-fit: contain;
  vertical-align: middle;
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
  transition: all 2.35s ease;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ===================== Animation Timelines ===================== */
/* Adding/removing a participant card: neighbours slide (FLIP) to open or close
   the gap with no jump; a newly added card still rises in via card-rise, and a
   removed one fades out without snapping the row. */
.cardflow-move {
  transition: transform 3.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.cardflow-leave-active {
  transition: opacity 2.8s ease, transform 2.8s ease;
  position: absolute;
}
.cardflow-leave-to {
  opacity: 0;
  transform: translateY(22px);
}

.team-swap-move {
  /* same slow "walk" pace as the participant card snake animation */
  transition: transform 4.4s ease-in-out;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 2.25s ease;
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