import { ipcMain } from 'electron'
import { resolve } from 'node:path'
import type { TaskSourceContext } from '../../shared/task-source-context'
import { getRepoExecutionHostId } from '../../shared/execution-host'
import { listGiteaIssues } from '../gitea/issues'
import { getLocalProjectWorktreeGitOptions } from '../project-runtime-git-options'
import type { Store } from '../persistence'

export function registerGiteaHandlers(store: Store): void {
  ipcMain.handle(
    'gitea:listIssues',
    async (
      _event,
      args: {
        repoPath: string
        repoId: string
        sourceContext?: TaskSourceContext | null
        repoOwnerExecutionHostId?: string
        state?: 'open' | 'closed' | 'all'
        page?: number
        limit?: number
      }
    ) => {
      const repo = store.getRepo(args.repoId)
      if (
        !repo ||
        resolve(repo.path) !== resolve(args.repoPath) ||
        (args.repoOwnerExecutionHostId &&
          args.repoOwnerExecutionHostId !== getRepoExecutionHostId(repo)) ||
        (args.sourceContext &&
          (args.sourceContext.provider !== 'gitea' ||
            args.sourceContext.hostId !== getRepoExecutionHostId(repo)))
      ) {
        throw new Error('Access denied: unknown Gitea repository')
      }
      return listGiteaIssues(repo.path, {
        connectionId: repo.connectionId,
        wslDistro: getLocalProjectWorktreeGitOptions(store, repo).wslDistro,
        state: args.state,
        page: Number.isSafeInteger(args.page) && Number(args.page) > 0 ? args.page : 1,
        limit:
          Number.isSafeInteger(args.limit) && Number(args.limit) > 0
            ? Math.min(Number(args.limit), 100)
            : 50
      })
    }
  )
}
