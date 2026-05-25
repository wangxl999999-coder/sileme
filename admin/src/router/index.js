import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: { title: '数据看板' }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('../views/Users.vue'),
          meta: { title: '用户管理' }
        },
        {
          path: 'users/:id',
          name: 'UserDetail',
          component: () => import('../views/UserDetail.vue'),
          meta: { title: '用户详情' }
        },
        {
          path: 'contacts/:userId',
          name: 'Contacts',
          component: () => import('../views/Contacts.vue'),
          meta: { title: '联系人管理' }
        },
        {
          path: 'sos',
          name: 'SOS',
          component: () => import('../views/SOS.vue'),
          meta: { title: 'SOS记录' }
        },
        {
          path: 'notifications',
          name: 'Notifications',
          component: () => import('../views/Notifications.vue'),
          meta: { title: '通知记录' }
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
