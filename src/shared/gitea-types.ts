export type GiteaIssue = {
  number: number
  title: string
  state: 'open' | 'closed'
  url: string
  updatedAt: string
  body: string
  labels: string[]
}
