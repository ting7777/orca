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
      })
  }
}
