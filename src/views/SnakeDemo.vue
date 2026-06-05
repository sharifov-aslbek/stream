<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { on } from '../services/socket'
import SnakeCards from '../components/SnakeCards.vue'

// These two refs are the ONLY animation trigger. Mutating them simulates a
// websocket score update; SnakeCards reacts via its watcher + queue.
const leftScore = ref(50)
const rightScore = ref(50)

// Each preset is a discrete "event" — like one websocket message landing.
function send(left, right) {
  leftScore.value = left
  rightScore.value = right
}

// Fire several events back-to-back to prove the queue: the first animation runs
// to completion, the rest are processed in order afterwards (no interruption).
function burst() {
  send(40, 60)
  setTimeout(() => send(20, 80), 50)
  setTimeout(() => send(70, 30), 100)
}

// Optional live wiring: derive left/right from the real poll socket so the demo
// can run off production data. Maps items[0]/items[1] percentages onto scores.
const offFns = []
onMounted(() => {
  offFns.push(
    on('poll:vote', (payload) => {
      const items = payload?.items
      if (!items || items.length < 2) return
      send(items[0].chatPercentage ?? 50, items[1].chatPercentage ?? 50)
    })
  )
})
onUnmounted(() => offFns.forEach((off) => off()))
</script>

<template>
  <div class="demo">
    <h1>Snake card transfer</h1>
    <p class="score">{{ leftScore }} / {{ rightScore }}</p>

    <SnakeCards :left-score="leftScore" :right-score="rightScore" :total-cards="10" />

    <div class="controls">
      <button @click="send(50, 50)">50 / 50</button>
      <button @click="send(40, 60)">40 / 60</button>
      <button @click="send(70, 30)">70 / 30</button>
      <button @click="send(20, 80)">20 / 80</button>
      <button @click="send(90, 10)">90 / 10</button>
      <button class="accent" @click="burst()">Burst (queue test)</button>
    </div>
  </div>
</template>

<style scoped>
.demo {
  min-height: 100vh;
  background: #0d161f;
  color: #fff;
  font-family: 'Orbitron', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px;
  box-sizing: border-box;
}
h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 1px;
  opacity: 0.7;
}
.score {
  margin: 0;
  font-size: 40px;
  font-weight: 800;
}
.demo > :deep(.arena) {
  max-width: 760px;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
button {
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  cursor: pointer;
}
button:hover {
  background: rgba(255, 255, 255, 0.14);
}
button.accent {
  background: #b71826;
  border-color: #b71826;
}
</style>
