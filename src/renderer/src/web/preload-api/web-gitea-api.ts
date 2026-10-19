import type { GiteaApi } from '../../../../preload/api/gitea-api'
import { callRuntimeResult } from './web-runtime-calls'

export function createGiteaApi(): GiteaApi {
  return {
    listIssues: (args) =>
      callRuntimeResult('gitea.listIssues', {
        repo: `id:${args.repoId}`,
        state: args.state,
        page: args.page,
        limit: args.limit
      }),
    createIssue: (args) =>
      callRuntimeResult('gitea.createIssue', {
        repo: `id:${args.repoId}`,
        title: args.title,
        body: args.body
      }),
    updateIssue: (args) =>
      callRuntimeResult('gitea.updateIssue', {
        repo: `id:${args.repoId}`,
        number: args.number,
        updates: args.updates
      }),
    deleteIssue: (args) =>
      callRuntimeResult('gitea.deleteIssue', {
        repo: `id:${args.repoId}`,
        number: args.number
      }).then(() => undefined)
  }
}
