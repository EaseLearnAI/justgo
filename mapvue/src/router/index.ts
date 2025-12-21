import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/navigation',
      name: 'navigation',
      component: () => import('../views/NavigationView.vue')
    },
    {
      path: '/result',
      name: 'result',
      component: () => import('../components/exercise/ResultView.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue')
    },
    {
      path: '/edit-profile',
      name: 'editProfile',
      component: () => import('../components/profile/edit/EditProfileView.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../components/profile/history/HistoryView.vue')
    }
  ]
})

export default router
