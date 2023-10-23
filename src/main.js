import {AudioContext} from 'standardized-audio-context';


import './assets/main.css'

import {createApp} from 'vue'
import App from './App.vue'
import router from './router'

window.CustomAudioContext = new AudioContext()

const app = createApp(App)

app.use(router)

app.mount('#app')
