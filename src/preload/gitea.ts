import { ipcRenderer } from 'electron'
import type { GiteaApi } from './api/gitea-api'

export const giteaApi: GiteaApi = {
  listIssues: (args) => ipcRenderer.invoke('gitea:listIssues', args),
  createIssue: (args) => ipcRenderer.invoke('gitea:createIssue', args),
  updateIssue: (args) => ipcRenderer.invoke('gitea:updateIssue', args),
  deleteIssue: (args) => ipcRenderer.invoke('gitea:deleteIssue', args)
}
