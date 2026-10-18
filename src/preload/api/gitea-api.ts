import type { TaskSourceContext } from '../../shared/task-source-context'
import type { GiteaIssue } from '../../shared/gitea-types'

export type GiteaIssueSelector = {
  repoPath: string
  repoId: string
  sourceContext?: TaskSourceContext | null
  repoOwnerExecutionHostId?: string
  state?: 'open' | 'closed' | 'all'
  page?: number
  limit?: number
}

export type GiteaApi = {
  listIssues: (args: GiteaIssueSelector) => Promise<GiteaIssue[]>
}
