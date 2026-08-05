# V1rtual Frontend

V1rtual 个人网站前端，当前分支版本为 `V1rtualSS`。

- Website: [https://v1rtual.top/](https://v1rtual.top/)
- Backend: [../vvv_backend](../vvv_backend)

## 当前版本预览

<p align="center">
  <img width="49%" alt="首页" src="https://github.com/user-attachments/assets/08e599c7-8cd7-444c-8b2c-8499e28dc25f" />
  <img width="49%" alt="Gallery" src="https://github.com/user-attachments/assets/6f6888b8-3528-4431-abe3-cd28971c574f" />
</p>

<p align="center">
  <img width="49%" alt="个人资料" src="https://github.com/user-attachments/assets/11d832ed-a2a9-4bb4-8db7-502ff8d4d56e" />
  <img width="49%" alt="管理后台" src="https://github.com/user-attachments/assets/dff94273-a28f-477a-a819-4f593e41cc3f" />
</p>

## 功能

- 首页随机内容与首页配置展示。
- Gallery 的媒体浏览、上传、点赞和评论。
- 登录、个人资料、头像、用户名与密码维护。
- 管理员资源上传、OSS 同步、首页与媒体资源管理。
- 全局音效和站内音乐播放器。

当前页面按桌面端设计；移动端会显示访问提示。

## 技术栈

| 类别 | 组件 |
| --- | --- |
| Framework | Vue 3 |
| Build | Vite 7 |
| Routing | Vue Router 4 |
| State | Pinia |
| UI | Element Plus |
| HTTP | Axios |
| Media | Vue Cropper |

## 目录

```text
src/
├── components/       # 默认布局、消息提示、音乐播放器
├── views/            # home、gallery、login、profile、admin
├── router/           # 路由生成与守卫
├── stores/           # 登录状态
└── utils/            # 请求、日期、主题工具
```

## 本地运行

要求：Node.js `20.19+` 或 `22.12+`、pnpm，以及运行在 `8848` 的后端。

```bash
pnpm install
pnpm dev
```

开发服务器地址为 `http://localhost:3001`。前端请求 `/api`，由 Vite 代理到 `http://127.0.0.1:8848`。

```bash
pnpm build
```

## 环境与发布

| Mode | API 行为 |
| --- | --- |
| development | `/api` 代理到 `http://127.0.0.1:8848` |
| production | 浏览器请求相对路径 `/api`，Nginx 负责转发 |

`.env.development` 和 `.env.production` 已提交，均不包含密钥。

每个分支代表一套完整网站版本。push 和 PR 只执行 CI 构建；部署由 GitHub Actions 手动选择分支执行。前后端接口联动时，两个仓库应使用同名分支，并分别通过 CI 后再发布。

发布细节见 [CICD规范.md](CICD规范.md) 和 [skills/v1rtual-frontend-cicd](skills/v1rtual-frontend-cicd/SKILL.md)。
