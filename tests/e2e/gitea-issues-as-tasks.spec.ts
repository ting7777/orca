import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'

test.use({ orcaAppExtraEnv: { ORCA_BACKGROUND_LAUNCH: '1' } })

test('Gitea issues appear as tasks and can seed a workspace', async ({
  orcaPage,
  electronApp,
  seededRepoPath
}) => {
  await waitForSessionReady(orcaPage)
  await expect
    .poll(() => orcaPage.evaluate(() => window.__store?.getState().preflightStatusChecked))
    .toBe(true)
  await electronApp.evaluate(({ ipcMain }) => {
    let createdIssue: {
      number: number
      title: string
      state: 'open'
      url: string
      updatedAt: string
      body: string
      labels: string[]
    } | null = null
    ipcMain.removeHandler('gitea:listIssues')
    ipcMain.handle('gitea:listIssues', () => [
      ...(createdIssue ? [createdIssue] : []),
      {
        number: 42,
        title: 'Repair sign in',
        state: 'open',
        url: 'https://git.example/team/repo/issues/42',
        updatedAt: '2026-10-18T00:00:00Z',
        body: 'Fix the login flow',
        labels: ['bug']
      }
    ])
    ipcMain.removeHandler('gitea:createIssue')
    ipcMain.handle('gitea:createIssue', (_event, args: { title: string; body: string }) => {
      createdIssue = {
        number: 43,
        title: args.title,
        state: 'open',
        url: 'https://git.example/team/repo/issues/43',
        updatedAt: '2026-10-18T00:00:00Z',
        body: args.body,
        labels: []
      }
      return createdIssue
    })
  })
  await orcaPage.evaluate((repoPath) => {
    const store = window.__store
    if (!store) {
      throw new Error('Store unavailable')
    }
    const state = store.getState()
    const repo = state.repos.find((candidate) => candidate.path === repoPath)
    if (!repo || !state.settings) {
      throw new Error('Seeded repository/settings missing')
    }
    store.setState({
      repos: state.repos.map((candidate) =>
        candidate.id === repo.id
          ? {
              ...candidate,
              gitRemoteIdentity: {
                canonicalKey: 'git.example/team/repo',
                remoteName: 'origin',
                remoteUrl: 'https://git.example/team/repo.git'
              }
            }
          : candidate
      ),
      settings: {
        ...state.settings,
        defaultTaskSource: 'gitea',
        visibleTaskProviders: ['gitea'],
        defaultRepoSelection: [repo.id]
      },
      preflightStatus: {
        ...state.preflightStatus,
        gitea: {
          configured: true,
          authenticated: true,
          account: 'tester',
          baseUrl: 'https://git.example/api/v1',
          tokenConfigured: true
        }
      },
      preflightStatusChecked: true,
      preflightStatusContextKey: 'host',
      preflightStatusError: null
    })
    store.getState().openTaskPage({ taskSource: 'gitea' })
  }, seededRepoPath)

  await expect(orcaPage.getByText('Repair sign in')).toBeVisible()
  await expect(
    orcaPage.getByRole('button', { name: 'Start workspace from issue #42' })
  ).toBeVisible()
  await orcaPage.getByRole('button', { name: 'Create task' }).dispatchEvent('click')
  await expect(orcaPage.getByRole('dialog', { name: 'Create Gitea task' })).toBeVisible()
  await orcaPage.evaluate(() => {
    const title = document.getElementById('gitea-task-title')
    const body = document.getElementById('gitea-task-body')
    if (!(title instanceof HTMLInputElement) || !(body instanceof HTMLTextAreaElement)) {
      throw new Error('Gitea task fields missing')
    }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
      title,
      'New Gitea task'
    )
    title.dispatchEvent(new Event('input', { bubbles: true }))
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      body,
      'Created in Orca'
    )
    body.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await orcaPage
    .getByRole('dialog', { name: 'Create Gitea task' })
    .getByRole('button', { name: 'Create task' })
    .dispatchEvent('click')
  await expect(orcaPage.getByText('New Gitea task')).toBeVisible()
  await expect(orcaPage.locator('[data-slot="dialog-content"]')).toHaveAttribute(
    'data-state',
    'closed'
  )
  expect(
    await electronApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().every((window) => !window.isVisible() && !window.isFocused())
    )
  ).toBe(true)
  await orcaPage
    .locator('button[aria-label="Start workspace from issue #42"]')
    .dispatchEvent('click')
  await expect(orcaPage.getByRole('dialog', { name: /Create (workspace|worktree)/i })).toBeVisible()
})
