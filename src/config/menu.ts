import {
  DashboardOutlined,
  AppstoreOutlined,
  CustomerServiceOutlined,
  PlayCircleOutlined,
  ReadOutlined,
  FileTextOutlined,
  NotificationOutlined,
  UserOutlined,
  HistoryOutlined,
  TagsOutlined
} from '@ant-design/icons-vue'

export const menuConfig = [
  {
    key: 'dashboard',
    title: '仪表盘',
    icon: DashboardOutlined,
    path: '/dashboard'
  },
  {
    key: 'music',
    title: '音乐管理',
    icon: CustomerServiceOutlined,
    children: [
      {
        key: 'songs',
        title: '音乐列表',
        path: '/music/songs'
      },
      {
        key: 'artists',
        title: '艺人管理',
        path: '/music/artists'
      },
      {
        key: 'albums',
        title: '专辑管理',
        path: '/music/albums'
      },
      {
        key: 'comments',
        title: '评论管理',
        path: '/music/comments'
      }
    ]
  },
  {
    key: 'posts',
    title: '帖子管理',
    icon: FileTextOutlined,
    children: [
      {
        key: 'posts-list',
        title: '帖子',
        path: '/posts/list'
      },
      {
        key: 'posts-comments',
        title: '评论',
        path: '/posts/comments'
      }
    ]
  },
  {
    key: 'announcements',
    title: '公告管理',
    icon: NotificationOutlined,
    path: '/announcements'
  },
  {
    key: 'users',
    title: '用户管理',
    icon: UserOutlined,
    path: '/users'
  },
  {
    key: 'logs',
    title: '系统日志',
    icon: HistoryOutlined,
    path: '/logs',
    roles: ['superadmin']
  },
  {
    key: 'tags',
    title: '标签管理',
    icon: TagsOutlined,
    path: '/tags'
  },
  {
    key: 'report-management',
    title: '举报管理',
    icon: NotificationOutlined,
    path: '/report-management'
  }
]