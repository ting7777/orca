import { beforeEach, describe, expect, it, vi } from 'vitest'

const { gitExecFileAsyncMock } = vi.hoisted(() => ({ gitExecFileAsyncMock: vi.fn() }))
vi.mock('../git/runner', () => ({ gitExecFileAsync: gitExecFileAsyncMock }))

import { _resetGiteaRepoRefCache } from './repository-ref'
import { listGiteaIssues } from './issues'

describe('Gitea issues', () => {
  beforeEach(() => {
    _resetGiteaRepoRefCache()
    gitExecFileAsyncMock.mockReset().mockResolvedValue({
      stdout: 'https://git.example.com/team/repo.git\n',
      stderr: ''
    })
    vi.unstubAllGlobals()
  })

  it('loads only repository issues using the existing token and remote', async () => {
    const fetchMock = vi.fn(async (_url: URL, _request: RequestInit) =>
      Response.json([
        {
          number: 12,
          title: 'Fix login',
          state: 'open',
          html_url: 'https://git.example.com/team/repo/issues/12',
          updated_at: '2026-10-18T00:00:00Z',
          body: 'Details',
          labels: [{ name: 'bug' }]
        },
        { number: 13, pull_request: {} },
        { number: 'invalid' }
      ])
    )
    vi.stubGlobal('fetch', fetchMock)
    const previousToken = process.env.ORCA_GITEA_TOKEN
    process.env.ORCA_GITEA_TOKEN = 'test-token'
    try {
      await expect(listGiteaIssues('/repo')).resolves.toEqual([
        {
          number: 12,
          title: 'Fix login',
          state: 'open',
          url: 'https://git.example.com/team/repo/issues/12',
          updatedAt: '2026-10-18T00:00:00Z',
          body: 'Details',
          labels: ['bug']
        }
      ])
      const [url, request] = fetchMock.mock.calls[0]
      expect(String(url)).toContain('/api/v1/repos/team/repo/issues?state=open&type=issues')
      expect(new Headers(request.headers).get('Authorization')).toBe('token test-token')
    } finally {
      if (previousToken === undefined) {
        delete process.env.ORCA_GITEA_TOKEN
      } else {
        process.env.ORCA_GITEA_TOKEN = previousToken
      }
    }
  })

  it('reports API failures instead of presenting an empty task list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 }))
    )
    await expect(listGiteaIssues('/repo')).rejects.toThrow('HTTP 401')
  })
})
