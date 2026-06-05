<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

/**
 * Event-driven snake/caterpillar card transfer.
 *
 * Scores arrive from a websocket (the parent feeds them in as props). A fixed
 * pool of `totalCards` is split between a left and a right zone. Whenever the
 * score distribution changes we compute how many cards must change ownership
 * and crawl exactly those cards across the divider one-by-one (FLIP + stagger).
 *
 * Hard rules honoured here:
 *   - Animation runs ONLY on a real distribution change (no looping, no idle ticks).
 *   - It is event-driven, never time-driven.
 *   - A new update arriving mid-animation is QUEUED, never interrupts the run.
 *   - After the run the cards stay put and the system sits idle.
 */
const props = defineProps({
  leftScore: { type: Number, default: 50 },
  rightScore: { type: Number, default: 50 },
  totalCards: { type: Number, default: 10 },
  duration: { type: Number, default: 600 }, // per-card travel time (ms)
  stagger: { type: Number, default: 70 },   // gap between consecutive crawlers (ms)
})

// Stable card identities. Order is always [ ...left cards, ...right cards ] so
// each zone renders a contiguous slice and transferred cards land at the
// divider (the natural meeting point of the two columns).
let nextId = 0
const cards = ref([])
const arena = ref(null)
const animating = ref(false)

// Pending target distributions. We only ever store the *latest* desired state
// per drain, but keep a queue so several rapid websocket bursts each get a turn.
const queue = []

// ---------------------------------------------------------------------------
// Distribution maths
// ---------------------------------------------------------------------------

// Translate a score pair into "how many cards should sit on the left".
function desiredLeft(left, right) {
  const sum = left + right
  if (sum <= 0) return cards.value.filter((c) => c.owner === 'left').length
  return Math.max(0, Math.min(props.totalCards, Math.round((left / sum) * props.totalCards)))
}

function buildInitial() {
  const leftCount = desiredLeft(props.leftScore, props.rightScore)
  const list = []
  for (let i = 0; i < props.totalCards; i++) {
    list.push({ id: nextId++, owner: i < leftCount ? 'left' : 'right' })
  }
  cards.value = list
}

// ---------------------------------------------------------------------------
// Queue: every score change enqueues a target, the drain runs them serially.
// ---------------------------------------------------------------------------

function enqueue() {
  queue.push({ left: props.leftScore, right: props.rightScore })
  drain()
}

async function drain() {
  if (animating.value) return // a run owns the stage — it will re-drain when done
  const target = queue.shift()
  if (!target) return

  const targetLeft = desiredLeft(target.left, target.right)
  const currentLeft = cards.value.filter((c) => c.owner === 'left').length
  const diff = targetLeft - currentLeft

  if (diff === 0) {
    // No ownership change → genuinely nothing to animate. Stay idle, but still
    // check whether a later queued update does require movement.
    if (queue.length) drain()
    return
  }

  animating.value = true
  const moverIds = reorderForTransfer(diff)
  await playTransfer(moverIds)
  animating.value = false

  // Process whatever websocket bursts queued up while we were busy.
  if (queue.length) drain()
}

// Flip ownership of the cards nearest the divider and re-thread the master
// array so the moved cards sit at the boundary of their new zone. Returns the
// mover ids in crawl order (closest-to-divider first → caterpillar head).
function reorderForTransfer(diff) {
  const left = cards.value.filter((c) => c.owner === 'left')
  const right = cards.value.filter((c) => c.owner === 'right')
  let movers

  if (diff > 0) {
    // right → left: take the right cards closest to the centre.
    movers = right.slice(0, diff)
    movers.forEach((c) => (c.owner = 'left'))
    cards.value = [...left, ...movers, ...right.slice(diff)]
  } else {
    const k = -diff
    // left → right: take the left cards closest to the centre (its tail).
    movers = left.slice(left.length - k)
    movers.forEach((c) => (c.owner = 'right'))
    cards.value = [...left.slice(0, left.length - k), ...movers, ...right]
  }
  return movers.map((c) => c.id)
}

// ---------------------------------------------------------------------------
// FLIP: First (measure) → Last (after DOM update) → Invert → Play (staggered)
// ---------------------------------------------------------------------------

function playTransfer(moverIds) {
  return new Promise((resolve) => {
    const root = arena.value
    const all = () => Array.from(root.querySelectorAll('[data-card-id]'))

    // FIRST — positions captured *before* this frame paints the reordered DOM.
    const first = new Map()
    all().forEach((el) => first.set(el.dataset.cardId, el.getBoundingClientRect()))

    // The reorder mutation already ran synchronously in reorderForTransfer, so
    // wait one tick for Vue to flush the new layout, then read LAST positions.
    nextTick(() => {
      const order = new Map(moverIds.map((id, i) => [String(id), i]))
      const playing = []

      all().forEach((el) => {
        const id = el.dataset.cardId
        const f = first.get(id)
        if (!f) return
        const l = el.getBoundingClientRect()
        const dx = f.left - l.left
        const dy = f.top - l.top
        if (dx === 0 && dy === 0) return // didn't actually move

        // INVERT — slam each card back to where it was, with no transition.
        el.style.transition = 'none'
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
        playing.push(el)
      })

      // Force a reflow so the inverted transforms are committed before we play.
      void root.offsetWidth

      // PLAY — release to the real position. Movers get a stagger delay keyed to
      // their crawl order (snake); shifting bystanders move immediately.
      let maxDelay = 0
      playing.forEach((el) => {
        const id = el.dataset.cardId
        const delay = order.has(id) ? order.get(id) * props.stagger : 0
        maxDelay = Math.max(maxDelay, delay)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            el.style.transition = `transform ${props.duration}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`
            el.style.transform = 'translate3d(0, 0, 0)'
          })
        )
      })

      // When the last crawler has landed, strip inline styles and go idle.
      window.setTimeout(() => {
        playing.forEach((el) => {
          el.style.transition = ''
          el.style.transform = ''
        })
        resolve()
      }, props.duration + maxDelay + 80)
    })
  })
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

onMounted(buildInitial)

// React only to genuine score changes — this is the single event source.
watch(
  () => [props.leftScore, props.rightScore],
  enqueue
)

const leftCount = () => cards.value.filter((c) => c.owner === 'left').length
</script>

<template>
  <div ref="arena" class="arena">
    <div class="zone left">
      <div
        v-for="c in cards.filter((x) => x.owner === 'left')"
        :key="c.id"
        :data-card-id="c.id"
        class="snake-card left"
      >
        <span class="dot" />
      </div>
    </div>

    <div class="divider">
      <span class="vs">VS</span>
    </div>

    <div class="zone right">
      <div
        v-for="c in cards.filter((x) => x.owner === 'right')"
        :key="c.id"
        :data-card-id="c.id"
        class="snake-card right"
      >
        <span class="dot" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.arena {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  width: 100%;
}

/* Both zones pack their cards toward the centre divider so transfers happen
   right at the boundary — the snake crosses the middle. */
.zone {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.zone.left {
  justify-content: flex-end;
}
.zone.right {
  justify-content: flex-start;
}

.divider {
  flex: none;
  display: grid;
  place-items: center;
}
.vs {
  font-weight: 900;
  font-size: 22px;
  letter-spacing: 1px;
  color: #fff;
  opacity: 0.85;
}

.snake-card {
  flex: none;
  width: 46px;
  height: 60px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  /* translate3d keeps every transfer on the GPU compositor. The transition is
     applied inline at play time so the idle state carries no transition. */
  will-change: transform;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
}
.snake-card.left {
  background: linear-gradient(135deg, #1f6feb 0%, #0d3b8f 100%);
}
.snake-card.right {
  background: linear-gradient(135deg, #b71826 0%, #7a0718 100%);
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}
</style>
