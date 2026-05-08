# Contributing

Thanks for helping improve Browser BI Studio.

## Local Setup

```sh
npm install
make install-hooks
make dev
```

## Checks

Run these before pushing:

```sh
make fmt
make lint
make test
make build
make smoke
```

## Commits

Use Conventional Commits:

- `feat: add dashboard export`
- `fix: handle empty csv import`
- `docs: expand deployment notes`
- `test: cover chart inference`
- `chore: update hooks`

## Secrets

Never commit secrets. Do not commit `.env`, API keys, tokens, private keys, `.pem`, `.key`, or private hostnames.
