// 引入组件
import { createRouter, createWebHistory } from 'vue-router';
import { createRoutesGenerator } from '../utils/generators/routerGenerator.js';
import WebsiteLayout from '../components/layout/DefaultLayout.vue'; // 默认布局

// 引入auth store
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

// 路由守卫。这里的提示都是本地守卫，不经过 request.js，所以需要自己弹
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.path === '/profile' && !authStore.isLoggedIn) {
    window.$vmessage.info('请先登录');
    next('/login');
    return;
  }

  // 已登录时访问登录页，直接回首页
  if (to.path === '/login' && authStore.isLoggedIn) {
    window.$vmessage.success(`欢迎回来，${authStore.username}`);
    next('/home');
    return;
  }

  // 支持 page.js 里 meta.requiresAuth = true 的页面保护
  if (to.meta?.requiresAuth && !authStore.isLoggedIn) {
    window.$vmessage.info('请先登录');
    next('/login');
    return;
  }

  next();
});

export default router;
