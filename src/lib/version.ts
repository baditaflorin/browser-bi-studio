import type { VersionMetadata } from '../types'

declare const __APP_VERSION__: string
declare const __GIT_COMMIT__: string

type CommitResponse = {
  sha?: string
  html_url?: string
}

export async function fetchVersionMetadata(): Promise<VersionMetadata> {
  const [build, live] = await Promise.allSettled([fetchBuildMetadata(), fetchLiveCommit()])
  const buildValue =
    build.status === 'fulfilled'
      ? build.value
      : { version: __APP_VERSION__, commit: __GIT_COMMIT__ }
  const liveValue =
    live.status === 'fulfilled'
      ? live.value
      : {
          sha: undefined,
          html_url: `https://github.com/baditaflorin/browser-bi-studio/commit/${buildValue.commit}`,
        }
  const fallbackCommit = buildValue.commit === 'live-main' ? 'main' : buildValue.commit

  return {
    version: buildValue.version,
    buildCommit: buildValue.commit,
    liveCommit: liveValue.sha?.slice(0, 7) ?? fallbackCommit,
    commitUrl:
      liveValue.html_url ??
      `https://github.com/baditaflorin/browser-bi-studio/commit/${buildValue.commit}`,
  }
}

async function fetchBuildMetadata() {
  const response = await fetch(`${import.meta.env.BASE_URL}version.json`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Build metadata unavailable')
  }

  return (await response.json()) as { version: string; commit: string }
}

async function fetchLiveCommit() {
  const response = await fetch(
    'https://api.github.com/repos/baditaflorin/browser-bi-studio/commits/main',
    { cache: 'no-store' },
  )

  if (!response.ok) {
    throw new Error('GitHub commit metadata unavailable')
  }

  return (await response.json()) as CommitResponse
}
