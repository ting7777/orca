import { z } from 'zod'
import { requiredString } from './rpc-param-primitives'

export const GiteaIssuesList = z.object({
  repo: requiredString('Missing repo selector'),
  state: z.enum(['open', 'closed', 'all']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).optional()
})

export const GiteaIssuesCreate = z.object({
  repo: requiredString('Missing repo selector'),
  title: requiredString('Issue title is required'),
  body: z.string()
})
