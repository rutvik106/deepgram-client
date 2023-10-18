import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/DeepgramTest.vue')
    },
    {
      path: '/TextToAudioWsV1',
      name: 'p1',
      component: () => import('../views/TextToAudioWsV1.vue')
    },
    {
      path: '/TextToAudioWsV2',
      name: 'p2',
      component: () => import('../views/TextToAudioWsV2.vue')
    },
  ]
})

export default router
