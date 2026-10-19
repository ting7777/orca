import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { GiteaIssue } from '../../../../../shared/gitea-types'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { getTaskPageRepoSourceContext } from '../../task-page-source-context'
import { giteaApiFor } from '@/runtime/gitea-owner-api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Repo = TaskPageComposerActionsModel['selectedRepos'][number]
type SelectedIssue = GiteaIssue & { repoId: string }

export function TaskPageGiteaIssueDialog({
  issue,
  repos,
  onClose,
  onChanged
}: {
  issue: SelectedIssue
  repos: Repo[]
  onClose: () => void
  onChanged: () => void
}): React.JSX.Element {
  const [title, setTitle] = useState(issue.title)
  const [body, setBody] = useState(issue.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  function issueApi() {
    const repo = repos.find((candidate) => candidate.id === issue.repoId)
    if (!repo) {
      throw new Error('Gitea project is no longer available')
    }
    const selector = {
      repoPath: repo.path,
      repoId: repo.id,
      sourceContext: getTaskPageRepoSourceContext(repo, 'gitea'),
      repoOwnerExecutionHostId: getRepoExecutionHostId(repo),
      number: issue.number
    }
    return { selector, api: giteaApiFor(selector) }
  }

  async function change(updates: { title?: string; body?: string; state?: 'open' | 'closed' }) {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const { selector, api } = issueApi()
      await api.updateIssue({ ...selector, updates })
      toast.success(`Updated Gitea issue #${issue.number}`)
      onClose()
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update Gitea issue')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) {
      return
    }
    setBusy(true)
    try {
      const { selector, api } = issueApi()
      await api.deleteIssue(selector)
      toast.success(`Deleted Gitea issue #${issue.number}`)
      onClose()
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete Gitea issue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gitea issue #{issue.number}</DialogTitle>
          <DialogDescription>
            {confirmDelete
              ? 'Permanently delete this issue from Gitea? This cannot be undone.'
              : 'View and edit this issue in its Gitea repository.'}
          </DialogDescription>
        </DialogHeader>
        {confirmDelete ? (
          <DialogFooter>
            <Button
              autoFocus
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={busy}>
              {busy && <LoaderCircle className="size-4 animate-spin" />}
              Delete issue
            </Button>
          </DialogFooter>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="gitea-issue-title"
                className="text-xs font-medium text-muted-foreground"
              >
                Title
              </label>
              <Input
                id="gitea-issue-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="gitea-issue-body"
                className="text-xs font-medium text-muted-foreground"
              >
                Description (markdown)
              </label>
              <Textarea
                id="gitea-issue-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={busy}
                className="min-h-40"
              />
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => void change({ state: issue.state === 'open' ? 'closed' : 'open' })}
                disabled={busy}
              >
                {issue.state === 'open' ? 'Close issue' : 'Reopen issue'}
              </Button>
              <Button
                onClick={() => void change({ title: title.trim(), body })}
                disabled={!title.trim() || busy || (title === issue.title && body === issue.body)}
              >
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
