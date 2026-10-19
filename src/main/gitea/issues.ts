import { encodedRepoPath, requestJson } from './client'
import { getGiteaRepoRef, type GiteaRepoRef } from './repository-ref'
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

function mapIssue(issue: RawGiteaIssue | null): GiteaIssue | null {
  if (
    !issue ||
    issue.pull_request ||
    typeof issue.number !== 'number' ||
    !Number.isSafeInteger(issue.number) ||
    issue.number < 1 ||
    typeof issue.title !== 'string' ||
    (issue.state !== 'open' && issue.state !== 'closed') ||
    typeof issue.html_url !== 'string' ||
    typeof issue.updated_at !== 'string'
  ) {
    return null
  }
  return {
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
}

async function requireIssue(repo: GiteaRepoRef, number: number): Promise<void> {
  const issue = await requestJson<RawGiteaIssue>(
    repo,
    `/repos/${encodedRepoPath(repo)}/issues/${number}`,
    {},
    true
  )
  if (mapIssue(issue)?.number !== number) {
    throw new Error('Gitea issue not found')
  }
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
    const mapped = mapIssue(issue)
    return mapped ? [mapped] : []
  })
}

export async function createGiteaIssue(
  repoPath: string,
  title: string,
  body: string,
  options: { connectionId?: string | null; wslDistro?: string } = {}
): Promise<GiteaIssue> {
  if (!title.trim()) {
    throw new Error('Issue title is required')
  }
  requireWriteToken()
  const repo = await getGiteaRepoRef(repoPath, options.connectionId, {
    wslDistro: options.wslDistro
  })
  if (!repo) {
    throw new Error('Gitea repository not found')
  }
  const issue = await requestJson<RawGiteaIssue>(
    repo,
    `/repos/${encodedRepoPath(repo)}/issues`,
    { method: 'POST', body: { title: title.trim(), body } },
    true
  )
  if (
    !issue ||
    typeof issue.number !== 'number' ||
    !Number.isSafeInteger(issue.number) ||
    issue.number < 1 ||
    typeof issue.html_url !== 'string'
  ) {
    throw new Error('Gitea returned an invalid issue')
  }
  return {
    number: issue.number,
    title: typeof issue.title === 'string' ? issue.title : title.trim(),
    state: 'open',
    url: issue.html_url,
    updatedAt: typeof issue.updated_at === 'string' ? issue.updated_at : new Date().toISOString(),
    body,
    labels: []
  }
}

export async function updateGiteaIssue(
  repoPath: string,
  number: number,
  updates: { title?: string; body?: string; state?: 'open' | 'closed' },
  options: { connectionId?: string | null; wslDistro?: string } = {}
): Promise<GiteaIssue> {
  requireWriteToken()
  if (
    !Number.isSafeInteger(number) ||
    number < 1 ||
    (updates.title !== undefined && !updates.title.trim())
  ) {
    throw new Error('Invalid Gitea issue update')
  }
  const repo = await getGiteaRepoRef(repoPath, options.connectionId, {
    wslDistro: options.wslDistro
  })
  if (!repo) {
    throw new Error('Gitea repository not found')
  }
  await requireIssue(repo, number)
  const issue = await requestJson<RawGiteaIssue>(
    repo,
    `/repos/${encodedRepoPath(repo)}/issues/${number}`,
    {
      method: 'PATCH',
      body: { ...updates, ...(updates.title ? { title: updates.title.trim() } : {}) }
    },
    true
  )
  const mapped = mapIssue(issue)
  if (!mapped || mapped.number !== number) {
    throw new Error('Gitea returned an invalid issue')
  }
  return mapped
}

export async function deleteGiteaIssue(
  repoPath: string,
  number: number,
  options: { connectionId?: string | null; wslDistro?: string } = {}
): Promise<void> {
  requireWriteToken()
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new Error('Invalid Gitea issue number')
  }
  const repo = await getGiteaRepoRef(repoPath, options.connectionId, {
    wslDistro: options.wslDistro
  })
  if (!repo) {
    throw new Error('Gitea repository not found')
  }
  await requireIssue(repo, number)
  await requestJson<null>(
    repo,
    `/repos/${encodedRepoPath(repo)}/issues/${number}`,
    { method: 'DELETE' },
    true
  )
}

function requireWriteToken(): void {
  if (!process.env.ORCA_GITEA_TOKEN?.trim()) {
    throw new Error('Set ORCA_GITEA_TOKEN to change Gitea issues')
  }
}
