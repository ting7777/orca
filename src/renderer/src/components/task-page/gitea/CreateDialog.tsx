import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { getTaskPageRepoSourceContext } from '../../task-page-source-context'
import { giteaApiFor } from '@/runtime/gitea-owner-api'
import { isScreenSubmitShortcut } from '@/lib/screen-submit-shortcut'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

type Repo = TaskPageComposerActionsModel['selectedRepos'][number]

export function TaskPageGiteaCreateDialog({
  open,
  onOpenChange,
  repos,
  onCreated
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  repos: Repo[]
  onCreated: () => void
}): React.JSX.Element {
  const [repoId, setRepoId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && !repos.some((repo) => repo.id === repoId)) {
      setRepoId(repos[0]?.id ?? '')
    }
  }, [open, repoId, repos])

  async function submit(): Promise<void> {
    const repo = repos.find((candidate) => candidate.id === repoId)
    if (!repo || !title.trim() || submitting) {
      return
    }
    setSubmitting(true)
    try {
      const selector = {
        repoPath: repo.path,
        repoId: repo.id,
        sourceContext: getTaskPageRepoSourceContext(repo, 'gitea'),
        repoOwnerExecutionHostId: getRepoExecutionHostId(repo)
      }
      const issue = await giteaApiFor(selector).createIssue({
        ...selector,
        title: title.trim(),
        body
      })
      toast.success(`Created Gitea issue #${issue.number}`)
      setTitle('')
      setBody('')
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create Gitea issue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent
        onKeyDown={(event) => {
          if (isScreenSubmitShortcut(event)) {
            event.preventDefault()
            void submit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Create Gitea task</DialogTitle>
          <DialogDescription>Creates an issue in the selected Gitea repository.</DialogDescription>
        </DialogHeader>
        {repos.length > 1 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={repoId} onValueChange={setRepoId} disabled={submitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="gitea-task-title" className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id="gitea-task-title"
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder="Short summary"
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="gitea-task-body" className="text-xs font-medium text-muted-foreground">
            Description (optional, markdown)
          </label>
          <Textarea
            id="gitea-task-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What needs to be done?"
            disabled={submitting}
            className="min-h-40"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!repoId || !title.trim() || submitting}>
            {submitting && <LoaderCircle className="size-4 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
