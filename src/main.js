import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import Overlay from './views/Overlay.vue'
import SnakeDemo from './views/SnakeDemo.vue'
import './style.css'

const router = createRouter({
  // Hash history keeps the overlay URL stable inside OBS browser sources
  // (no server-side route config needed): .../#/overlay
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    { path: '/overlay', name: 'overlay', component: Overlay },
    { path: '/snake', name: 'snake', component: SnakeDemo },
  ],
})

createApp(App).use(router).mount('#app')
