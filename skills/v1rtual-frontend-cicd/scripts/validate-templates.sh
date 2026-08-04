#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"

bash -n "$skill_dir/assets/server/v1rtual-deploy-frontend.sh"
workflow="$skill_dir/assets/workflows/deploy.yml"
rg -q '^name:' "$workflow"
rg -q 'workflow_dispatch:' "$workflow"
rg -q 'SSH_KNOWN_HOSTS' "$workflow"
printf 'Frontend deployment templates passed static validation.\n'
