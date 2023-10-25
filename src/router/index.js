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
      path: '/text-to-audio-v1',
      name: 'p1',
      component: () => import('../views/TextToAudioWsV1.vue')
    },
    {
      path: '/speech-to-audio-v2',
      name: 'p2',
      component: () => import('../views/TextToAudioWsV2.vue')
    },
    {
      path: '/audio-to-audio',
      name: 'p3',
      component: () => import('../views/AudioToAudio.vue')
    },
    {
      path: '/audio-to-audio-pcm',
      name: 'p4',
      component: () => import('../views/AudioToAudioV3.vue')
    },
    {
      path: '/audio-to-audio-v4',
      name: 'p5',
      component: () => import('../views/AudioToAudioV4.vue')
    },
    {
      path: '/audio-to-audio-custom-context',
      name: 'p6',
      component: () => import('../views/AudioToAudioV5.vue')
    },
    {
      path: '/audio-to-audio-howler',
      component: () => import('../views/AudioToAudioHowler.vue')
    },
  ]
})

export default router
