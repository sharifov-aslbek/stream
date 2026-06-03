<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isOverlay = computed(() => route.name === 'overlay')
</script>

<template>
  <!-- The overlay renders standalone (transparent, no chrome) for OBS.
       Everything else gets the app shell. -->
  <RouterView v-if="isOverlay" />
  <div v-else class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="logo">🕷️</span>
        <span class="brand-name">NEXUS<span>POLL</span></span>
      </div>
      <nav class="nav">
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <a href="#/overlay" target="_blank" rel="noopener">Overlay ↗</a>
      </nav>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
  background: linear-gradient(180deg, #1a1c22, #131419);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  font-size: 22px;
}
.brand-name {
  font-family: var(--font-tech);
  font-weight: 800;
  letter-spacing: 2px;
  font-size: 18px;
}
.brand-name span {
  color: var(--accent);
}
.nav {
  display: flex;
  gap: 18px;
  font-weight: 600;
}
.nav a {
  color: var(--muted);
  padding: 6px 4px;
  transition: color 0.15s;
}
.nav a:hover,
.nav a.router-link-active {
  color: var(--text);
}
.main {
  flex: 1;
  padding: 24px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}
</style>
