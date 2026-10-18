import { ipcMain } from 'electron'
import { resolve } from 'node:path'
import { getRepoExecutionHostId } from '../../shared/execution-host'
import { createGiteaIssue, listGiteaIssues } from '../gitea/issues'
import { getLocalProjectWorktreeGitOptions } from '../project-runtime-git-options'
import type { Store } from '../persistence'
import type { GiteaIssueSelector } from '../../preload/api/gitea-api'

function getAuthorizedRepo(store: Store, args: GiteaIssueSelector) {
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
  return repo
}

export function registerGiteaHandlers(store: Store): void {
  ipcMain.handle('gitea:listIssues', async (_event, args: GiteaIssueSelector) => {
    const repo = getAuthorizedRepo(store, args)
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
  })
  ipcMain.handle(
    'gitea:createIssue',
    async (_event, args: GiteaIssueSelector & { title: string; body: string }) => {
      const repo = getAuthorizedRepo(store, args)
      if (typeof args.title !== 'string' || !args.title.trim() || typeof args.body !== 'string') {
        throw new Error('Invalid Gitea issue')
      }
      return createGiteaIssue(repo.path, args.title, args.body, {
        connectionId: repo.connectionId,
        wslDistro: getLocalProjectWorktreeGitOptions(store, repo).wslDistro
      })
    }
  )
}
