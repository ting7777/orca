import type { Repo } from '../../shared/repo-types'
import { listGiteaIssues } from '../gitea/issues'

export class RuntimeGiteaQueryCommands {
  constructor(
    private readonly deps: {
      resolveRepo: (selector: string) => Promise<Repo>
      getLocalGitArgs: (repo: Repo) => [] | [{ wslDistro?: string }]
    }
  ) {}

  async listGiteaRepoIssues(
    repoSelector: string,
    state: 'open' | 'closed' | 'all' = 'open',
    page = 1,
    limit = 50
  ): Promise<Awaited<ReturnType<typeof listGiteaIssues>>> {
    const repo = await this.deps.resolveRepo(repoSelector)
    return listGiteaIssues(repo.path, {
      connectionId: repo.connectionId,
      wslDistro: this.deps.getLocalGitArgs(repo)[0]?.wslDistro,
      state,
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      limit: Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50
    })
  }
}
