/**
 * @description 基于文件结构自动生成 Vue 路由
 * 此工具设计为健壮且可配置的，遵循专业标准
 * @author Cascade
 * @see https://vitejs.dev/guide/features.html#glob-import
 */

/**
 * @typedef {import('vue-router').RouteRecordRaw} RouteRecordRaw
 * @typedef {import('vue').Component} Component
 */

/**
 * 从一组页面和组件模块生成路由记录数组
 *
 * @param {Record<string, object>} pages - 页面元数据模块的映射，来自 `import.meta.glob`
 * @param {Record<string, () => Promise<Component>>} components - 组件模块的映射，来自 `import.meta.glob`
 * @param {object} options - 配置选项
 * @param {string} options.basePath - 从路由路径中移除的基础目录路径（例如，'../views'）
 * @param {string[]} [options.exclude=[]] - 要从路由中排除的路径数组
 * @param {Component} [options.layoutComponent=null] - 所有路由的可选父布局组件
 * @returns {RouteRecordRaw[]}
 */
function buildRoutes(pages, components, options) {
    const { basePath, exclude = [], layoutComponents = {} } = options;

    const routes = Object.entries(pages).map(([path, meta]) => {
        const componentPath = path.replace('page.js', 'index.vue');
        const routePath = path.replace(basePath, '').replace('/page.js', '') || '/';
        const isId = meta.isId;

        if (exclude.includes(routePath)) {
            return null;
        }

        const name = routePath.split('/').filter(Boolean).join('-') || 'index';

        return {
            path: isId ? `${routePath}/:id` : routePath,
            name,
            component: components[componentPath],
            meta, // 直接使用 page.js 中的 meta
        };
    }).filter(Boolean);

    // 按布局名称对路由进行分组
    const groupedRoutes = routes.reduce((acc, route) => {
        const layoutName = route.meta?.layout; // e.g., 'default', 'admin', or undefined
        if (layoutName) {
            if (!acc[layoutName]) {
                acc[layoutName] = [];
            }
            acc[layoutName].push(route);
        } else {
            acc.standalone.push(route);
        }
        return acc;
    }, { standalone: [] });

    // 首先添加所有独立路由
    const finalRoutes = [...groupedRoutes.standalone];

    // 为每个在 layoutComponents 中定义的布局创建嵌套路由
    for (const layoutName in layoutComponents) {
        if (groupedRoutes[layoutName] && groupedRoutes[layoutName].length > 0) {
            const layoutComponent = layoutComponents[layoutName];
            finalRoutes.push({
                // 注意：这里假设每个布局都从根路径开始，可以根据需要进行调整
                path: layoutName === 'default' ? '/' : `/${layoutName}`,
                component: layoutComponent,
                children: groupedRoutes[layoutName],
            });
        }
    }

    return finalRoutes;
}

/**
 * 工厂函数，用于创建配置好的路由生成器
 * Vite 的 `import.meta.glob` 需要静态路径，所以这个工厂函数捕获静态路径
 * 并返回一个可以调用来生成路由的函数
 *
 * @param {object} config
 * @param {Record<string, object>} config.pages - `import.meta.glob` 对 page.js 文件的结果
 * @param {Record<string, () => Promise<Component>>} config.components - `import.meta.glob` 对 index.vue 文件的结果
 * @param {string} config.basePath - 计算路由路径的基础目录（例如，'../views'）
 * @returns {(options: { exclude?: string[], layoutComponent?: Component }) => RouteRecordRaw[]}
 */
export function createRoutesGenerator({ pages, components, basePath }) {
    /**
     * @param {object} [options]
     * @param {string[]} [options.exclude=[]] - 要排除的路径。
     * @param {Record<string, Component>} [options.layoutComponents={}] - 一个布局名称到组件的映射。
     * @returns {RouteRecordRaw[]}
     */
    return function generate(options = {}) {
        return buildRoutes(pages, components, {
            basePath,
            exclude: options.exclude || [],
            layoutComponents: options.layoutComponents || {},
        });
    };
}
