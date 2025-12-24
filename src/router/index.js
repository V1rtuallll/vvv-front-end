// router.js
// 引入组件
import { createRouter, createWebHistory } from 'vue-router';
import { createRoutesGenerator } from '../utils/generators/routerGenerator.js';
// import AdminLayout from '../components/admin-layout/AdminLayout.vue';//未实现
import WebsiteLayout from '../components/layout/DefaultLayout.vue';//默认布局
// import { useAuthStore } from '../stores/auth.js';//不用
// 1. 静态定义将要扫描的模块
// Vite 要求 glob 路径必须是静态的
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

// 3. 生成最终路由，应用布局和排除规则
const routes = generateRoutes({
  // 提供一个布局名称到组件的映射表
  layoutComponents: {
    // 'admin': AdminLayout, // 'default' 布局使用 AdminLayout.vue 未实现
    'default': WebsiteLayout,
  },
  // 排除特定路由的示例
  // exclude: ['/some-page'],
});
// 添加自定义路由
const customRoutes = [
  //  / 重定向到 /home
  {
    path: '/',
    redirect: '/home',
  },
];


// 创建router实例
const router = createRouter({
  history: createWebHistory(''),
  routes: [...routes, ...customRoutes],
});

// function isLoggedIn() {
//   try {
//     const authStore = useAuthStore();

//     // 首先检查store中是否有 access token
//     if (authStore.access && authStore.access.trim() !== '') {
//       return true;
//     }

//     // 检查store中是否有 refresh token
//     // 有 refresh token 的话可以通过自动刷新机制获取新的 access token
//     if (authStore.refresh && authStore.refresh.trim() !== '') {
//       return true;
//     }

//     // 兜底检查：从本地存储中检查 token（适用于页面刷新等场景）
//     const localRefreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');

//     return !!(localRefreshToken);

//   } catch (error) {
//     console.warn('检查登录状态时出错:', error);
//     // 发生错误时默认返回未登录状态
//     return false;
//   }
// }

router.beforeEach(async (to, from, next) => {
  // 这里是 router 的钩子函数，在每次路由切换之前调用

  // 检查是否需要认证
  // if (to.meta.requiresAuth !== false && !isLoggedIn()) {
  //     // 如果需要认证但未登录，重定向到登录页
  //     next('/login');
  //     return;
  // }

  // 继续导航
  next();
});

export default router;