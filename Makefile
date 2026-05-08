.PHONY: help install-hooks dev build data test test-integration smoke lint fmt pages-preview release clean hooks-pre-commit hooks-commit-msg hooks-pre-push hooks-post-merge hooks-post-checkout

help:
	@printf "Available targets:\n"
	@printf "  make install-hooks     Wire .githooks through core.hooksPath\n"
	@printf "  make dev               Run the Vite dev server\n"
	@printf "  make build             Build GitHub Pages output into docs/\n"
	@printf "  make data              Mode A no-op; user data is imported locally\n"
	@printf "  make test              Run unit tests\n"
	@printf "  make test-integration  Run integration tests if present\n"
	@printf "  make smoke             Build, serve docs/, and run Playwright smoke tests\n"
	@printf "  make lint              Run ESLint and TypeScript checks\n"
	@printf "  make fmt               Autoformat source and docs\n"
	@printf "  make pages-preview     Preview docs/ locally as Pages would\n"
	@printf "  make release           Create a semver tag after checks\n"
	@printf "  make clean             Remove local build/cache outputs\n"

install-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*

dev:
	npm run dev

build:
	npm run build

data:
	@printf "Mode A: no static data pipeline. User datasets are imported locally.\n"

test:
	npm run test

test-integration:
	@printf "No integration tests are required for Mode A v0.1.0.\n"

smoke:
	bash scripts/smoke.sh

lint:
	npm run lint
	npm run fmt:check
	npm run typecheck

fmt:
	npm run fmt

pages-preview:
	npm run pages-preview

release: lint test build smoke
	@test -n "$(VERSION)" || (printf "Usage: make release VERSION=v0.1.0\n" && exit 1)
	git tag "$(VERSION)"
	git push origin "$(VERSION)"

clean:
	rm -rf docs node_modules/.vite coverage playwright-report test-results

hooks-pre-commit:
	.githooks/pre-commit

hooks-commit-msg:
	@test -n "$(MSG)" || (printf "Usage: make hooks-commit-msg MSG=.git/COMMIT_EDITMSG\n" && exit 1)
	.githooks/commit-msg "$(MSG)"

hooks-pre-push:
	.githooks/pre-push

hooks-post-merge:
	.githooks/post-merge

hooks-post-checkout:
	.githooks/post-checkout
