import type { GiteaApi, GiteaIssueSelector } from '../../../preload/api/gitea-api'
import { forgeCredentialTarget } from './forge-credential-target'
import { callRuntimeRpc } from './runtime-rpc-client'

export function giteaApiFor(selector: GiteaIssueSelector): GiteaApi {
  try {
    const target = forgeCredentialTarget(selector)
    if (target.kind === 'environment') {
      return {
        listIssues: (args) =>
          callRuntimeRpc(
            { kind: 'environment', environmentId: target.environmentId },
            'gitea.listIssues',
            {
              repo: `id:${args.sourceContext?.repoId || args.repoId}`,
              state: args.state,
              page: args.page,
              limit: args.limit
            }
          )
      }
    }
    return window.api.gitea
  } catch (error) {
    return { listIssues: () => Promise.reject(error) }
  }
}
