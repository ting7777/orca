import '../unused-default-rpc-methods.test-fixture'
import { describe, expect, it, vi } from 'vitest'
import { RpcDispatcher } from '../dispatcher'
import type { OrcaRuntimeService } from '../../orca-runtime'
import { GITEA_METHODS } from './gitea'

describe('Gitea RPC methods', () => {
  it('routes issue lists to the repo owner and validates paging', async () => {
    const listGiteaRepoIssues = vi.fn().mockResolvedValue([])
    const runtime = {
      getRuntimeId: () => 'test-runtime',
      listGiteaRepoIssues
    }
    const dispatcher = new RpcDispatcher({
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the dispatcher only calls the mocked Gitea method.
      runtime: runtime as unknown as OrcaRuntimeService,
      methods: GITEA_METHODS
    })
    const request = (params: unknown) => ({
      id: 'req-1',
      authToken: 'tok',
      method: 'gitea.listIssues',
      params
    })

    expect(
      await dispatcher.dispatch(request({ repo: 'id:repo-1', state: 'closed', page: 2, limit: 25 }))
    ).toMatchObject({ ok: true, result: [] })
    expect(listGiteaRepoIssues).toHaveBeenCalledWith('id:repo-1', 'closed', 2, 25)
    expect(await dispatcher.dispatch(request({ repo: 'id:repo-1', page: -1 }))).toMatchObject({
      ok: false
    })
    expect(listGiteaRepoIssues).toHaveBeenCalledTimes(1)
  })
})
