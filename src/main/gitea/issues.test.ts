import { beforeEach, describe, expect, it, vi } from 'vitest'

const { gitExecFileAsyncMock } = vi.hoisted(() => ({ gitExecFileAsyncMock: vi.fn() }))
vi.mock('../git/runner', () => ({ gitExecFileAsync: gitExecFileAsyncMock }))

import { _resetGiteaRepoRefCache } from './repository-ref'
import { createGiteaIssue, deleteGiteaIssue, listGiteaIssues, updateGiteaIssue } from './issues'

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

  it('creates an issue with the configured token', async () => {
    const fetchMock = vi.fn(async (_url: URL, _request: RequestInit) =>
      Response.json({
        number: 14,
        title: 'New task',
        html_url: 'https://git.example.com/team/repo/issues/14',
        updated_at: '2026-10-18T00:00:00Z'
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const previousToken = process.env.ORCA_GITEA_TOKEN
    process.env.ORCA_GITEA_TOKEN = 'test-token'
    try {
      await expect(createGiteaIssue('/repo', ' New task ', 'Details')).resolves.toMatchObject({
        number: 14,
        title: 'New task',
        body: 'Details'
      })
      const [url, request] = fetchMock.mock.calls[0]
      expect(String(url)).toBe('https://git.example.com/api/v1/repos/team/repo/issues')
      expect(request.method).toBe('POST')
      expect(new Headers(request.headers).get('Authorization')).toBe('token test-token')
      expect(JSON.parse(String(request.body))).toEqual({ title: 'New task', body: 'Details' })
    } finally {
      if (previousToken === undefined) {
        delete process.env.ORCA_GITEA_TOKEN
      } else {
        process.env.ORCA_GITEA_TOKEN = previousToken
      }
    }
  })

  it('edits, closes, and deletes an issue through the repository API', async () => {
    const fetchMock = vi.fn(async (_url: URL, request: RequestInit) =>
      request.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : Response.json({
            number: 14,
            title: 'Updated task',
            state: 'closed',
            html_url: 'https://git.example.com/team/repo/issues/14',
            updated_at: '2026-10-19T00:00:00Z',
            body: 'Updated details'
          })
    )
    vi.stubGlobal('fetch', fetchMock)
    const previousToken = process.env.ORCA_GITEA_TOKEN
    process.env.ORCA_GITEA_TOKEN = 'test-token'
    try {
      await expect(
        updateGiteaIssue('/repo', 14, {
          title: ' Updated task ',
          body: 'Updated details',
          state: 'closed'
        })
      ).resolves.toMatchObject({ number: 14, title: 'Updated task', state: 'closed' })
      const [editUrl, editRequest] = fetchMock.mock.calls[1]
      expect(String(editUrl)).toBe('https://git.example.com/api/v1/repos/team/repo/issues/14')
      expect(editRequest.method).toBe('PATCH')
      expect(JSON.parse(String(editRequest.body))).toEqual({
        title: 'Updated task',
        body: 'Updated details',
        state: 'closed'
      })

      await expect(deleteGiteaIssue('/repo', 14)).resolves.toBeUndefined()
      const [deleteUrl, deleteRequest] = fetchMock.mock.calls[3]
      expect(String(deleteUrl)).toBe('https://git.example.com/api/v1/repos/team/repo/issues/14')
      expect(deleteRequest.method).toBe('DELETE')
    } finally {
      if (previousToken === undefined) {
        delete process.env.ORCA_GITEA_TOKEN
      } else {
        process.env.ORCA_GITEA_TOKEN = previousToken
      }
    }
  })

  it('refuses to edit a pull request through the issue endpoint', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        number: 14,
        title: 'Pull request',
        state: 'open',
        html_url: 'https://git.example.com/team/repo/pulls/14',
        updated_at: '2026-10-19T00:00:00Z',
        pull_request: {}
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const previousToken = process.env.ORCA_GITEA_TOKEN
    process.env.ORCA_GITEA_TOKEN = 'test-token'
    try {
      await expect(updateGiteaIssue('/repo', 14, { state: 'closed' })).rejects.toThrow(
        'Gitea issue not found'
      )
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      if (previousToken === undefined) {
        delete process.env.ORCA_GITEA_TOKEN
      } else {
        process.env.ORCA_GITEA_TOKEN = previousToken
      }
    }
  })
})
