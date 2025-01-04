import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: () => import('@/layouts/BasicLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '仪表盘',
          requiresAuth: true
        }
      },
      {
        path: 'music',
        name: 'MusicManagement',
        meta: {
          title: '音乐管理',
          requiresAuth: true
        },
        children: [
          {
            path: 'songs',
            name: 'MusicSongs',
            component: () => import('@/views/music/songs/index.vue'),
            meta: {
              title: '音乐',
              requiresAuth: true
            }
          },
          {
            path: 'albums',
            name: 'MusicAlbums',
            component: () => import('@/views/music/albums/index.vue'),
            meta: {
              title: '专辑管理',
              requiresAuth: true
            }
          },
          {
            path: 'artists',
            name: 'MusicArtists',
            component: () => import('@/views/music/artists/index.vue'),
            meta: {
              title: '艺人管理',
              requiresAuth: true
            }
          },
          {
            path: 'comments',
            name: 'MusicComments',
            component: () => import('@/views/music/comments/index.vue'),
            meta: {
              title: '评论管理',
              requiresAuth: true
            }
          }
        ]
      },
      {
        path: 'posts',
        name: 'PostsManagement',
        meta: {
          title: '帖子管理',
          requiresAuth: true
        },
        children: [
          {
            path: 'list',
            name: 'PostsList',
            component: () => import('@/views/posts/list/index.vue'),
            meta: {
              title: '帖子列表',
              requiresAuth: true
            }
          },
          {
            path: 'comments',
            name: 'PostsComments',
            component: () => import('@/views/posts/comments/index.vue'),
            meta: {
              title: '帖子评论',
              requiresAuth: true
            }
          }
        ]
      },
      {
        path: 'announcements',
        name: 'Announcements',
        component: () => import('@/views/system/announcements.vue'),
        meta: {
          title: '公告管理',
          requiresAuth: true
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/user/index.vue'),
        meta: {
          title: '用户管理',
          requiresAuth: true
        }
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/system/logs.vue'),
        meta: {
          title: '系统日志',
          requiresAuth: true
        }
      },
      {
        path: 'tags',
        name: 'Tags',
        component: () => import('@/views/system/tags.vue'),
        meta: {
          title: '标签管理',
          requiresAuth: true
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // 设置页面标题
  document.title = `${to.meta.title} - Fox Admin` || 'Fox Admin'
  
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else if (to.path === '/login' && userStore.token) {
    next('/')
  } else {
    next()
  }
})

export default router 