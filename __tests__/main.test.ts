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
  const avatar_url = 'https://avatars.githubusercontent.com/u/105098969'
  const login = 'XXXXXX'
  const author_url = 'XXXXXX'
  const link = 'https://google.com'
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
    author_url,
    link
  )
  const messageJson = JSON.parse(message)
  expect(messageJson.type).toBe('message')
  expect(messageJson.attachments[0].content.body[0].text).toBe(messageTitle)
  expect(messageJson.attachments[0].content.actions[0].url).toBe(link)
})

test('test building a message card with no link', async () => {
  const messageTitle = 'This is a title'
  const messageBody = 'This is some text'
  const messageColour = 'HEXCOL'
  const runNumber = 'XXXXXX'
  const runId = 'XXXXXX'
  const repoName = 'XXXXXX'
  const repoUrl = 'XXXXXX'
  const repoBranch = 'XXXXXX'
  const avatar_url = 'https://avatars.githubusercontent.com/u/105098969'
  const login = 'XXXXXX'
  const author_url = 'XXXXXX'
  const link = ''
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
    author_url,
    link
  )
  const messageJson = JSON.parse(message)
  expect(messageJson.type).toBe('message')
  expect(messageJson.attachments[0].content.body[0].text).toBe(messageTitle)
  expect(messageJson.attachments[0].content.actions).toStrictEqual([])
})
