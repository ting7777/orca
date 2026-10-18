import { useEffect, useState } from 'react'
import { ArrowRight, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { GiteaIssue } from '../../../../../shared/gitea-types'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { Button } from '@/components/ui/button'
import TaskProjectSourceCombobox from '@/components/task-project-source-combobox'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { getLinkedWorkItemSuggestedName } from '@/lib/new-workspace'
import { giteaApiFor } from '@/runtime/gitea-owner-api'
import { getTaskPageRepoSourceContext } from '../../task-page-source-context'
import { normalizeTaskRepoSelection } from '../../task-page-default-repo-selection'

export function TaskPageGiteaContent({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element {
  const {
    eligibleRepos,
    selectedRepos,
    selectedReposKey,
    repoSelection,
    setRepoSelection,
    taskPickerGroups,
    taskPickerRepos,
    getTaskPickerRepoHostLabel,
    updateSettings,
    openModal
  } = model
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open')
  const [refresh, setRefresh] = useState(0)
  const [issues, setIssues] = useState<(GiteaIssue & { repoId: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    setIssues([])
    setError(null)
    if (selectedRepos.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    void Promise.allSettled(
      selectedRepos.map(async (repo) => {
        const selector = {
          repoPath: repo.path,
          repoId: repo.id,
          sourceContext: getTaskPageRepoSourceContext(repo, 'gitea'),
          repoOwnerExecutionHostId: getRepoExecutionHostId(repo),
          state,
          limit: 50
        }
        return {
          repoId: repo.id,
          issues: await giteaApiFor(selector).listIssues(selector)
        }
      })
    )
      .then((results) => {
        if (stale) {
          return
        }
        const next: (GiteaIssue & { repoId: string })[] = []
        const errors: string[] = []
        for (const result of results) {
          if (result.status === 'fulfilled') {
            next.push(
              ...result.value.issues.map((issue) => ({ ...issue, repoId: result.value.repoId }))
            )
          } else {
            errors.push(
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            )
          }
        }
        next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        setIssues(next)
        if (errors.length && next.length === 0) {
          setError(errors[0])
        }
      })
      .finally(() => {
        if (!stale) {
          setLoading(false)
        }
      })
    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedReposKey covers the selected repo fields.
  }, [selectedReposKey, state, refresh])

  return (
    <div className="flex min-h-0 max-h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full min-w-0 sm:w-[200px]">
          <TaskProjectSourceCombobox
            groups={taskPickerGroups}
            selected={repoSelection}
            getRepoHostLabel={getTaskPickerRepoHostLabel}
            onChange={(next) => {
              const normalized = normalizeTaskRepoSelection(eligibleRepos, next)
              setRepoSelection(normalized)
              void updateSettings({ defaultRepoSelection: [...normalized] }).catch(() => {
                toast.error('Failed to save project selection.')
              })
            }}
            onSelectAll={() => {
              setRepoSelection(new Set(taskPickerRepos.map((repo) => repo.id)))
              void updateSettings({ defaultRepoSelection: null }).catch(() => {
                toast.error('Failed to save project selection.')
              })
            }}
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Issue state">
          {(['open', 'closed', 'all'] as const).map((value) => (
            <Button
              key={value}
              variant={state === value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setState(value)}
              aria-pressed={state === value}
            >
              {value === 'open' ? 'Open' : value === 'closed' ? 'Closed' : 'All'}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={loading}
          aria-label="Refresh Gitea issues"
        >
          {loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border/50 bg-muted/50 shadow-sm">
        <div className="grid grid-cols-[70px_minmax(0,1fr)_100px_80px] gap-3 border-b border-border/50 px-3 py-2 text-2xs font-semibold uppercase text-muted-foreground">
          <span>ID</span>
          <span>Title</span>
          <span>Updated</span>
          <span />
        </div>
        <div className="min-h-0 overflow-y-auto scrollbar-sleek">
          {loading && issues.length === 0 && (
            <p
              role="status"
              className="flex items-center gap-2 px-4 py-12 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-4 animate-spin" />
              Loading Gitea issues…
            </p>
          )}
          {error && (
            <p role="alert" className="px-3 py-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && issues.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              {selectedRepos.length === 0
                ? 'Select a project source to see Gitea issues.'
                : 'No Gitea issues match this filter.'}
            </p>
          )}
          {issues.map((issue) => (
            <div
              key={`${issue.repoId}:${issue.number}`}
              className="grid grid-cols-[70px_minmax(0,1fr)_100px_80px] items-center gap-3 border-b border-border/50 px-3 py-2 hover:bg-accent"
            >
              <span className="font-mono text-xs text-muted-foreground">#{issue.number}</span>
              <span className="min-w-0 truncate text-sm text-foreground" title={issue.title}>
                {issue.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(issue.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Start workspace from issue #${issue.number}`}
                  onClick={() => {
                    const repo = selectedRepos.find((candidate) => candidate.id === issue.repoId)
                    openModal('new-workspace-composer', {
                      linkedWorkItem: {
                        provider: 'gitea',
                        type: 'issue',
                        number: issue.number,
                        title: issue.title,
                        url: issue.url,
                        repoId: issue.repoId
                      },
                      taskSourceContext: getTaskPageRepoSourceContext(repo, 'gitea'),
                      prefilledName: getLinkedWorkItemSuggestedName(issue),
                      initialRepoId: issue.repoId,
                      telemetrySource: 'sidebar'
                    })
                  }}
                >
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Open issue #${issue.number} in Gitea`}
                  onClick={() => void window.api.shell.openUrl(issue.url)}
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
