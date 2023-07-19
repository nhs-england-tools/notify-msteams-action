import {buildMessageCard} from '../src/messagecard'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'
import {expect, test} from '@jest/globals'

test('test building a message card', async () => {
  const messageTitle = 'This is a title'
  const messageBody = 'This is some text'
  const messageColour = 'HEXCOL'
  const runNumber = 'XXXXXX'
  const runId = 'XXXXXX'
  const repoName = 'XXXXXX'
  const repoUrl = 'XXXXXX'
  const repoBranch = 'XXXXXX'
  const avatar_url = 'XXXXXX'
  const login = 'XXXXXX'
  const author_url = 'XXXXXX'
  const message = buildMessageCard(
    messageTitle,
    messageBody,
    messageColour,
    runNumber,
    runId,
    repoName,
    repoUrl,
    repoBranch,
    avatar_url,
    login,
    author_url
  )
  const messageJson = JSON.parse(message)
  expect(messageJson.summary).toBe(messageTitle)
})
