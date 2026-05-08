# Deployment

Production URL:

https://baditaflorin.github.io/browser-bi-studio/

Repository:

https://github.com/baditaflorin/browser-bi-studio

## Publishing

GitHub Pages serves the `docs/` directory from the `main` branch.

```sh
make build
git add docs package-lock.json package.json src public
git commit -m "feat: update browser bi studio"
git push
```

## Rollback

Revert the publishing commit and push:

```sh
git revert <commit_sha>
git push
```

## Custom Domain

No custom domain is configured. To add one, create `public/CNAME` with the domain, rebuild, and configure DNS with GitHub Pages:

https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## GitHub Pages Gotchas

- The app base path is `/browser-bi-studio/`.
- GitHub Pages does not support `_headers` or `_redirects`.
- SPA fallback is handled by copying `docs/index.html` to `docs/404.html`.
- Service worker scope must match `/browser-bi-studio/`.
