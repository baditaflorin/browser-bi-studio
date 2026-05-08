#!/usr/bin/env bash
set -euo pipefail

target="${1:---staged}"

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks protect "$target"
  exit 0
fi

if [ "$target" = "--staged" ]; then
  files="$(git diff --cached --name-only --diff-filter=ACM || true)"
else
  files="$(rg --files -uu -g '!node_modules/**' -g '!.git/**' || true)"
fi

if [ -z "$files" ]; then
  exit 0
fi

pattern='(AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----|password\s*=\s*[^[:space:]]+|api[_-]?key\s*=\s*[^[:space:]]+)'

if printf "%s\n" "$files" | xargs rg -n --hidden --no-heading -e "$pattern"; then
  printf "Potential secret detected. Install gitleaks for full scanning: https://github.com/gitleaks/gitleaks\n" >&2
  exit 1
fi
