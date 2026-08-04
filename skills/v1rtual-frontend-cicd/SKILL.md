---
name: v1rtual-frontend-cicd
description: Build, validate, and manually deploy the currently checked-out branch of the V1rtual Vue/Vite frontend through GitHub Actions, SSH, rsync, and Nginx. Use for frontend CI/CD changes, Nginx release validation, or rollback.
---

# V1rtual Frontend CI/CD

Deploy this repository's Vue/Vite application as an immutable `dist` release served by Nginx. Never put credentials in Git, artifacts, workflow logs, or generated configuration.

## Release Workflow

- Every branch push and pull request runs `.github/workflows/ci.yml`; CI builds `dist` but never changes the server.
- `.github/workflows/deploy.yml` is manual only. When asked to deploy, use the currently checked-out branch: `branch="$(git branch --show-current)"`; push it first, then run `gh workflow run deploy.yml --ref "$branch"`.
- Do not deploy an uncommitted working tree. GitHub Actions checks out the pushed commit selected by `--ref`.
- The backend is a separate repository and has its own deployment workflow. Deploy it separately when both halves of a site branch must change.
- Upload `dist` to `/tmp`, verify it, copy it into a revisioned release directory, then atomically update `current`. Retain the three newest releases. Never delete `current` before a verified replacement exists.

## Branch Rules

A branch represents one complete site version. A new branch is deployable only after it contains `.github/workflows/deploy.yml`; branch from `main` or a current site branch so it inherits the workflow. A push to any branch runs CI automatically. Selecting a branch from the Actions "Run workflow" menu deploys only that branch's frontend and does not deploy the backend.

Before a release, confirm the same branch exists and is pushed in the backend repository when its matching API is also required. For an explicit deployment request only, wait for CI to pass, dispatch the workflow, watch its run, and verify `https://v1rtual.top/`.

## Server Contract

Read [server-contract.md](references/server-contract.md) before modifying deployment resources. The relevant templates are in `assets/`. Run `scripts/validate-templates.sh` after editing this skill; it validates bundled template structure only and does not contact the server.

## Rollback

List the revision directories under `/www/wwwroot/vvv-front-end/releases/`, then run:

```bash
sudo /usr/local/sbin/v1rtual-deploy-frontend <previous-revision>
```

Verify Nginx and request the public URL after rollback.
