import { defineMethod } from '../core'
import {
  GiteaIssuesCreate,
  GiteaIssuesDelete,
  GiteaIssuesList,
  GiteaIssuesUpdate
} from '../../../../shared/rpc-contract/gitea-params'

export const GITEA_METHODS = [
  defineMethod({
    name: 'gitea.listIssues',
    permission: 'workspace',
    params: GiteaIssuesList,
    handler: (params, { runtime }) =>
      runtime.listGiteaRepoIssues(params.repo, params.state, params.page, params.limit)
  }),
  defineMethod({
    name: 'gitea.createIssue',
    permission: 'workspace',
    params: GiteaIssuesCreate,
    handler: (params, { runtime }) =>
      runtime.createGiteaRepoIssue(params.repo, params.title, params.body)
  }),
  defineMethod({
    name: 'gitea.updateIssue',
    permission: 'workspace',
    params: GiteaIssuesUpdate,
    handler: (params, { runtime }) =>
      runtime.updateGiteaRepoIssue(params.repo, params.number, params.updates)
  }),
  defineMethod({
    name: 'gitea.deleteIssue',
    permission: 'workspace',
    params: GiteaIssuesDelete,
    handler: async (params, { runtime }) => {
      await runtime.deleteGiteaRepoIssue(params.repo, params.number)
      return { ok: true }
    }
  })
]
