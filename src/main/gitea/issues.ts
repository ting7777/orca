import { encodedRepoPath, requestJson } from './client'
import { getGiteaRepoRef } from './repository-ref'
import type { GiteaIssue } from '../../shared/gitea-types'

type RawGiteaIssue = {
  number?: number
  title?: string
  state?: string
  html_url?: string
  updated_at?: string
  body?: string
  labels?: { name?: string }[]
  pull_request?: unknown
}

export async function listGiteaIssues(
  repoPath: string,
  options: {
    connectionId?: string | null
    wslDistro?: string
    state?: 'open' | 'closed' | 'all'
    page?: number
    limit?: number
  } = {}
): Promise<GiteaIssue[]> {
  const repo = await getGiteaRepoRef(repoPath, options.connectionId, {
    wslDistro: options.wslDistro
  })
  if (!repo) {
    return []
  }
  const issues = await requestJson<RawGiteaIssue[]>(
    repo,
    `/repos/${encodedRepoPath(repo)}/issues`,
    {
      searchParams: {
        state: options.state ?? 'open',
        type: 'issues',
        page: options.page ?? 1,
        limit: options.limit ?? 50
      }
    },
    true
  )
  if (!Array.isArray(issues)) {
    throw new Error('Gitea returned an invalid issue list')
  }
  return issues.flatMap((issue) => {
    if (
      !issue ||
      typeof issue !== 'object' ||
      issue.pull_request ||
      typeof issue.number !== 'number' ||
      !Number.isSafeInteger(issue.number) ||
      issue.number < 1 ||
      typeof issue.title !== 'string' ||
      (issue.state !== 'open' && issue.state !== 'closed') ||
      typeof issue.html_url !== 'string' ||
      typeof issue.updated_at !== 'string'
    ) {
      return []
    }
    return [
      {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        updatedAt: issue.updated_at,
        body: typeof issue.body === 'string' ? issue.body : '',
        labels: Array.isArray(issue.labels)
          ? issue.labels.flatMap((label) => (typeof label.name === 'string' ? [label.name] : []))
          : []
      }
    ]
  })
}
