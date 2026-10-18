import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => ({ call: vi.fn() }))
vi.mock('./runtime-rpc-client', () => ({ callRuntimeRpc: rpc.call }))

import { giteaApiFor } from './gitea-owner-api'

const localListIssues = vi.fn()

beforeEach(() => {
  rpc.call.mockReset().mockResolvedValue([])
  localListIssues.mockReset().mockResolvedValue([])
  vi.stubGlobal('window', { api: { gitea: { listIssues: localListIssues } } })
})

describe('Gitea issue owner', () => {
  it('loads a server-owned repository from its server', async () => {
    const selector = {
      repoPath: '/work/app',
      repoId: 'server-repo',
      repoOwnerExecutionHostId: 'runtime:owner-server',
      state: 'closed' as const
    }
    await giteaApiFor(selector).listIssues(selector)
    expect(localListIssues).not.toHaveBeenCalled()
    expect(rpc.call).toHaveBeenCalledWith(
      { kind: 'environment', environmentId: 'owner-server' },
      'gitea.listIssues',
      expect.objectContaining({ repo: 'id:server-repo', state: 'closed' })
    )
  })

  it('uses the local API for a locally owned repository', async () => {
    const selector = { repoPath: '/work/app', repoId: 'local-repo' }
    await giteaApiFor(selector).listIssues(selector)
    expect(localListIssues).toHaveBeenCalledWith(selector)
    expect(rpc.call).not.toHaveBeenCalled()
  })
})
