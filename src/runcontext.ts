export interface Author {
  avatarUrl: string
  login: string
  url: string
}

export interface CommitAuthor {
  avatar_url?: string
  login?: string
  html_url?: string
}

const DEFAULT_AVATAR_URL = 'https://avatars.githubusercontent.com/u/105098969'

// Name the branch of the run. A pull request run is on a merge ref such as
// '42/merge', so name its source and target branches instead.
export function branchName(env: Record<string, string | undefined>): string {
  const head = env.GITHUB_HEAD_REF || ''
  const base = env.GITHUB_BASE_REF || ''
  if (head !== '' && base !== '') {
    return `${head} → ${base}`
  }
  return env.GITHUB_REF_NAME || ''
}

// Label the ref fact, a run triggered by a tag is on that tag.
export function refTitle(env: Record<string, string | undefined>): string {
  return env.GITHUB_REF_TYPE === 'tag' ? 'Tag' : 'Branch'
}

// The GitHub server of the run, GitHub Enterprise Server included.
export function serverUrl(env: Record<string, string | undefined>): string {
  return env.GITHUB_SERVER_URL || 'https://github.com'
}

// Read the GitHub user who wrote the commit. A failed lookup only warns, so
// the notification is still sent.
export async function commitAuthor(
  fetchAuthor: () => Promise<CommitAuthor | null>,
  warn: (message: string) => void
): Promise<Author> {
  try {
    const author = await fetchAuthor()
    if (author?.login) {
      return {
        avatarUrl: author.avatar_url || DEFAULT_AVATAR_URL,
        login: author.login,
        url: author.html_url || ''
      }
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    warn(`The commit author was not found: ${reason}`)
  }
  return {avatarUrl: DEFAULT_AVATAR_URL, login: 'Not provided', url: ''}
}
