# AGENTS.md — vvv（V1rtual 前端）

V1rtual 网站的 Vue 3 前端。配对的**后端仓库是 `../vvv_backend`**，两者是两个独立的 git 仓库。

## 权威文档（本文件不重复它们的内容）

| 文档 | 管什么 |
| --- | --- |
| `CICD规范.md` | 分支模型、CI/CD、发布顺序、回滚 |
| `skills/v1rtual-frontend-cicd/SKILL.md` | 前端的构建与发布流程 |
| `skills/v1rtual-frontend-cicd/references/server-contract.md` | 服务器路径、Nginx、环境变量契约 |

只要改动影响 **API 契约、登录鉴权、资源访问、Nginx 路由、环境变量或发布脚本**，就必须同时阅读
`../vvv_backend/skills/v1rtual-backend-cicd/SKILL.md` 和它的 `references/server-contract.md`。

**不要把这些文档的内容抄进 AGENTS.md。** 抄了就会产生两份需要同步的规则。

## 工作方式

- **本地可以随便测。** `pnpm dev` / `pnpm build` / `pnpm test` 随便跑，本地后端在 `8848`，随便连。
- **不要用 SSH 连生产做验证或测试。** 生产凭据在本机 SSH 配置里，只用于用户**明确要求**的发布动作。
  任何"顺手连一下生产看看"的行为都不允许。
- **提交与推送遵从 `CICD规范.md`。** 尤其是：联动改动必须与 `vvv_backend` 使用**同名分支**，
  且两端 CI 都绿才算可上线；只推一边不能视为完成。
- **不要擅自执行 `git commit` / `git push` / 切分支。** 用户明确要求时才做。
- 改 `.github/workflows/` 或 `scripts/` 时，先在非 `main` 分支推送验证，再同步到 `main`。

## 提交规范

`CICD规范.md` 里**没有**写提交信息格式，但仓库历史实际遵循 **Conventional Commits**：

```
fix: keep home media choices in sync with type
refactor: modularize frontend pages and api access
docs: describe frontend module boundaries
```

- 格式：`<type>: <中文描述>`，**type 等操作名保持英文，描述用中文**，结尾不加句号
- 常用 type：`feat` 新功能 / `fix` 修 bug / `refactor` 重构 / `test` 测试 / `docs` 文档 / `ci` 工作流 / `chore` 杂项
- **一个功能一个 commit**，不要把无关改动混在一起
- 描述用中文。历史提交是英文描述，**从 2026-09-13 起统一改成中文**（type 仍然是英文）

## 技术栈

Vue 3（`<script setup>` + Composition API）、Vite 7、Vue Router 4、Pinia + `pinia-plugin-persistedstate`、
Axios、pnpm（不是 npm/yarn）。Node 版本要求见 `package.json` 的 `engines`。

`element-plus` 在 `package.json` 的 dependencies 里，但 **`src/` 下零引用**，是未使用的依赖。
不要假设它可用或已全局注册。

## 目录结构

```
src/
├── main.js                  应用入口（装 pinia + router，恢复 token）
├── App.vue
├── router/index.js          路由 —— 自动生成，见下
├── stores/auth.js           唯一的 Pinia store（token + user）
├── components/              layout/DefaultLayout.vue、VMessage.vue
├── utils/                   request.js（axios 封装）、date.js、theme.js
├── modules/<域>/            业务逻辑：api/ 放请求，composables/ 放状态编排
└── views/<页面>/            index.vue + index.css + page.js
```

**路由是自动生成的。** `router/index.js` 用 `import.meta.glob('../views/**/page.js')` 推导路由。
新增页面只需建 `src/views/<名字>/page.js` 并导出 `{ title, requiresAuth, layout }`，
**不需要手改路由表**。`router/index.js` 里的守卫只硬编码了 `/profile` 和 `/login` 两条特例。

## 代码约定

- 导入用 `@/` 别名（指向 `src`），不要写 `../../..`
- 请求一律走 `utils/request.js` 的 axios 实例。它已自动注入 `Bearer` token，并且对 `code !== 200`
  **主动 reject** —— 所以业务错误会进 `catch`，后端消息在 `error.response.data.msg`
- **不要手写 `localStorage`。** `stores/auth.js` 开了 `persist: true`，由 pinia 持久化插件接管
- 用户可见提示统一用 `window.$vmessage.{success,info,warning,error}(文案)`，
  定义在 `components/VMessage.vue`
- **用户可见文案一律用中性表达**：陈述事实，不用「～」「哦」「啦」「呀」这类语气词，
  不用感叹号，不加颜文字。「还没有人留下温暖的话哦～」应写作「暂无评论」。
  **注释同样中性**，不写口语化的碎碎念
- **缩进跟随所在文件**：主流是 2 空格，但 `stores/auth.js` 是 4 空格、`utils/date.js` 是 8 空格。
  改哪个文件就跟哪个文件的风格，不要顺手重排整个文件

## 错误提示的所有权

弹提示只有**两个合法的 owner**，不要长出第三个：

- **`utils/request.js`** —— 负责**所有** HTTP 错误和业务错误。它会自动弹出后端返回的 `msg`，
  没有 `msg` 时按状态码给中性兜底文案
- **composable / 页面自己** —— 只负责两类：
  1. **本地校验失败**（还没发请求就失败的，比如用户名格式不对）
  2. **成功提示**

**页面或 composable 的 `catch` 里不要再弹后端消息。** 请求失败时 `request.js` 已经弹过了，
再弹一次用户就会看到**两条重复提示**。`catch` 只应该做状态回滚（比如把乐观更新的点赞数改回去）。

判断方法：这条错误如果是**从 `request.js` reject 出来的**，就不要再弹；
如果是你在**发请求之前**自己发现的，才弹。

## 命令

```bash
pnpm install        # 安装依赖
pnpm dev            # 开发服务器 http://localhost:3001，/api 代理到 127.0.0.1:8848
pnpm build          # 生产构建到 dist/
pnpm test           # 单元测试，单次跑完
pnpm test:watch     # 监听模式
pnpm test:coverage  # 带覆盖率报告
```

## 测试要求

- 框架：Vitest + @vue/test-utils + jsdom。配置在 `vite.config.js` 的 `test` 块，
  全局 setup 在 `src/test/setup.js`
- **新增或修改逻辑必须带测试**；纯样式、颜色、文案、错别字改动豁免
- 测试文件与被测文件同目录，命名 `<名字>.test.js`
- `window.$vmessage` 已由 setup 文件自动装上替身，直接断言 `window.$vmessage.warning` 即可，
  不要在测试里自己 mock 它
- 不要为了凑覆盖率写没有断言的测试

## 已知陷阱

- **移动端拦截有两处**：后端 `MobileBlockFilter`，以及 `index.html` 里的**内联脚本**
  （用 `ontouchstart` + `innerWidth` 判定，命中会删掉 `#app` 再 `throw`）。
  只处理一处，手机端照样白屏。
- `home/index.vue` 等页面的悬浮信息栏用 `@mouseenter` / `@mouseleave` 控制，
  **移动端没有 hover，内容永远看不到**。
- `modules/home/composables/useHomeContent.js` 读取的 `latestBlogs` / `pinnedBlog`
  后端从未返回，永远是空值。

## 不许做的事

- 不要把生产主机、端口、SSH 凭据、密钥写进 `VITE_*` 环境变量 —— 这些值会被打进公开产物
- 不要把任何密钥、token、私钥提交进仓库
