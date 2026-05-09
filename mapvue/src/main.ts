import './assets/styles/global.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// FontAwesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faHouse,
  faUser,
  faArrowLeft,
  faGear,
  faCamera,
  faPen,
  faImages,
  faXmark,
  faCheck,
  faFire,
  faFireFlameCurved,
  faChevronRight,
  faChevronDown,
  faChevronLeft,
  faPersonWalking,
  faPersonRunning,
  faBicycle,
  faCircleCheck,
  faSliders,
  faRulerVertical,
  faClockRotateLeft,
  faShareNodes,
  faBullseye,
  faUserPen,
  faRightFromBracket,
  faUtensils,
  faMugHot,
  faRoute,
  faClock,
  faTrophy,
  faLocationArrow,
  faBolt,
  faStop,
  faArrowUp,
  faSpinner,
  faMoon,
  faSun
} from '@fortawesome/free-solid-svg-icons'

import App from './App.vue'
import router from './router'

// Add icons to library
library.add(
  faHouse,
  faUser,
  faArrowLeft,
  faGear,
  faCamera,
  faPen,
  faImages,
  faXmark,
  faCheck,
  faFire,
  faFireFlameCurved,
  faChevronRight,
  faChevronDown,
  faChevronLeft,
  faPersonWalking,
  faPersonRunning,
  faBicycle,
  faCircleCheck,
  faSliders,
  faRulerVertical,
  faClockRotateLeft,
  faShareNodes,
  faBullseye,
  faUserPen,
  faRightFromBracket,
  faUtensils,
  faMugHot,
  faRoute,
  faClock,
  faTrophy,
  faLocationArrow,
  faBolt,
  faStop,
  faArrowUp,
  faSpinner,
  faMoon,
  faSun
)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(createPinia())
app.use(router)

app.mount('#app')
