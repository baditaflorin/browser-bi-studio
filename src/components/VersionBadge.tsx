import { useQuery } from '@tanstack/react-query'
import { GitCommit } from 'lucide-react'
import { fetchVersionMetadata } from '../lib/version'

export function VersionBadge() {
  const { data } = useQuery({
    queryKey: ['version-metadata'],
    queryFn: fetchVersionMetadata,
    staleTime: 60_000,
  })

  return (
    <a
      className="version-badge"
      href={data?.commitUrl ?? 'https://github.com/baditaflorin/browser-bi-studio/commits/main'}
      target="_blank"
      rel="noreferrer"
      title="Open current main commit"
    >
      <GitCommit size={15} />
      <span>v{data?.version ?? '0.1.0'}</span>
      <span>{data?.liveCommit ?? 'loading'}</span>
    </a>
  )
}
