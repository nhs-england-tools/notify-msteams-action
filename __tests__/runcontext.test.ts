// unit tests for the branch and commit author shown in the notification
import {expect, jest, test} from '@jest/globals'
import {branchName, commitAuthor, refTitle, serverUrl} from '../src/runcontext'

const DEFAULT_AVATAR_URL = 'https://avatars.githubusercontent.com/u/105098969'
const noWarning = (): void => {}

test('test naming the branch of a push', async () => {
  expect(branchName({GITHUB_REF_NAME: 'main'})).toBe('main')
  expect(branchName({GITHUB_REF_NAME: 'main', GITHUB_HEAD_REF: ''})).toBe(
    'main'
  )
})

test('test naming the branches of a pull request', async () => {
  expect(
    branchName({
      GITHUB_REF_NAME: '42/merge',
      GITHUB_HEAD_REF: 'feature/export',
      GITHUB_BASE_REF: 'main'
    })
  ).toBe('feature/export → main')
})

test('test labelling the ref of a tag run', async () => {
  expect(refTitle({GITHUB_REF_TYPE: 'tag'})).toBe('Tag')
  expect(refTitle({GITHUB_REF_TYPE: 'branch'})).toBe('Branch')
  expect(refTitle({})).toBe('Branch')
})

test('test using the server of the run', async () => {
  expect(serverUrl({GITHUB_SERVER_URL: 'https://github.example.org'})).toBe(
    'https://github.example.org'
  )
  expect(serverUrl({})).toBe('https://github.com')
})

test('test reading the commit author', async () => {
  const author = await commitAuthor(
    async () => ({
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
      login: 'octocat',
      html_url: 'https://github.com/octocat'
    }),
    noWarning
  )
  expect(author).toStrictEqual({
    avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    login: 'octocat',
    url: 'https://github.com/octocat'
  })
})

test('test using the default avatar when the author has none', async () => {
  const author = await commitAuthor(
    async () => ({
      avatar_url: '',
      login: 'octocat',
      html_url: 'https://github.com/octocat'
    }),
    noWarning
  )
  expect(author.avatarUrl).toBe(DEFAULT_AVATAR_URL)
})

test('test using no author when the commit has no GitHub user', async () => {
  const author = await commitAuthor(async () => null, noWarning)
  expect(author).toStrictEqual({
    avatarUrl: DEFAULT_AVATAR_URL,
    login: 'Not provided',
    url: ''
  })
  expect((await commitAuthor(async () => ({}), noWarning)).login).toBe(
    'Not provided'
  )
})

test('test warning and using no author when the commit is not found', async () => {
  const warning = jest.fn<(message: string) => void>()
  const author = await commitAuthor(async () => {
    throw new Error('No commit found for SHA: v9.9.9')
  }, warning)
  expect(author.login).toBe('Not provided')
  expect(warning).toHaveBeenCalledWith(
    'The commit author was not found: No commit found for SHA: v9.9.9'
  )
})
