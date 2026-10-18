import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'

test.use({ orcaAppExtraEnv: { ORCA_BACKGROUND_LAUNCH: '1' } })

test('Gitea issues appear as tasks and can seed a workspace', async ({
  orcaPage,
  electronApp,
  seededRepoPath
}) => {
  await waitForSessionReady(orcaPage)
  await electronApp.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('gitea:listIssues')
    ipcMain.handle('gitea:listIssues', () => [
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
  expect(
    await electronApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().every((window) => !window.isVisible() && !window.isFocused())
    )
  ).toBe(true)
  await orcaPage
    .getByRole('button', { name: 'Start workspace from issue #42' })
    .dispatchEvent('click')
  await expect(orcaPage.getByRole('dialog', { name: /Create (workspace|worktree)/i })).toBeVisible()
})
