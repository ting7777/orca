import { defineMethod } from '../core'
import { GiteaIssuesCreate, GiteaIssuesList } from '../../../../shared/rpc-contract/gitea-params'

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
  })
]
