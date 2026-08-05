# Server Contract

## Release Layout

```
/www/wwwroot/vvv-front-end/releases/<git-sha>/
/www/wwwroot/vvv-front-end/current -> releases/<git-sha>
```

The aaPanel Nginx virtual host points at `/www/wwwroot/vvv-front-end/current`. Releases are immutable after `current` switches to them.

## Runtime Routing

The browser requests the relative API base `/api`. Nginx must serve the frontend release and proxy `location /api/` to the backend production listener. At the verified personal-site deployment, that listener is `http://127.0.0.1:8080`; local Vite development uses a separate proxy target, `http://127.0.0.1:8848`.

Do not put the production listener address into frontend environment variables. It is an Nginx and backend service contract, not public frontend configuration.

## GitHub Secrets

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Server address |
| `DEPLOY_USER` | Restricted SSH deploy user |
| `DEPLOY_SSH_PORT` | SSH port |
| `SSH_PRIVATE_KEY` | Dedicated deploy key |
| `SSH_KNOWN_HOSTS` | Pinned server host key line |

The `production` Environment is optional for visibility. Existing credentials are repository secrets, and manual workflow dispatch is the deployment gate.

## Expected Triggers

CI runs on every branch push and pull request. Deploy is `workflow_dispatch` only: choose the branch containing the site version that should be served.
