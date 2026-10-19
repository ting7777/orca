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

export const GiteaIssueUpdates = z
  .object({
    title: z.string().trim().min(1).optional(),
    body: z.string().optional(),
    state: z.enum(['open', 'closed']).optional()
  })
  .refine((updates) => Object.keys(updates).length > 0)

export const GiteaIssuesUpdate = z.object({
  repo: requiredString('Missing repo selector'),
  number: z.number().int().positive(),
  updates: GiteaIssueUpdates
})

export const GiteaIssuesDelete = z.object({
  repo: requiredString('Missing repo selector'),
  number: z.number().int().positive()
})
