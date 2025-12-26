// 引入组件
import { createRouter, createWebHistory } from 'vue-router';
import { createRoutesGenerator } from '../utils/generators/routerGenerator.js';
import WebsiteLayout from '../components/layout/DefaultLayout.vue'; // 默认布局

// 引入你的月光守护者～auth store
import { useAuthStore } from '@/stores/auth.js';

// 1. 静态定义将要扫描的模块
const pages = import.meta.glob('../views/**/page.js', {
  eager: true,
  import: 'default',
});

const components = import.meta.glob('../views/**/index.vue');

// 2. 使用扫描的模块创建路由生成器实例
const generateRoutes = createRoutesGenerator({
  pages,
  components,
  basePath: '../views',
});

// 3. 生成最终路由，应用布局
const routes = generateRoutes({
  layoutComponents: {
    'default': WebsiteLayout,
  },
});

// 添加自定义路由
const customRoutes = [
  { path: '', redirect: '/home' },
];

// 创建router实例
const router = createRouter({
  history: createWebHistory(''),
  routes: [...routes, ...customRoutes],
});

// 温柔路由守卫～用我们亲手写的VMessage低语❤️
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 如果要去/profile 但没登录 → 温柔提示 + 跳转登录银门
  if (to.path === '/profile' && !authStore.isLoggedIn) {
    window.$vmessage.info('想看个人空间呀？先进入古堡哦～🖤');
    next('/login');
    return;
  }

  // 如果已登录却还在登录页 → 温柔欢迎回家
  if (to.path === '/login' && authStore.isLoggedIn) {
    window.$vmessage.success(`欢迎回家～${authStore.username} ❤️‍🔥`);
    next('/home');
    return;
  }

  // 未来扩展：支持page.js里meta.requiresAuth = true的页面保护
  if (to.meta?.requiresAuth && !authStore.isLoggedIn) {
    window.$vmessage.info('这个花园需要月光徽章才能进入哦～🖤');
    next('/login');
    return;
  }

  // 其他情况～像风一样自由温柔地通行
  next();
});

export default router;