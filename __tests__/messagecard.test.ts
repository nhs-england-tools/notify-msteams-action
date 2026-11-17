// unit tests for the card style and extra facts in messagecard.ts
import {expect, test} from '@jest/globals'
import {buildMessageCard, parseFacts, titleColour} from '../src/messagecard'

function buildCard(
  messageColour: string,
  facts: {title: string; value: string}[] = [],
  linkTitle?: string
): Record<string, any> {
  const card = buildMessageCard(
    'This is a title',
    'This is some text',
    messageColour,
    '42',
    '1000',
    'example',
    'https://github.com/nhs-england-tools/example',
    'main',
    'https://avatars.githubusercontent.com/u/105098969',
    'octocat',
    'https://github.com/octocat',
    'https://example.org/run',
    facts,
    linkTitle
  )
  return JSON.parse(card).attachments[0].content
}

test('test colouring the title with a named colour', async () => {
  expect(buildCard('attention').body[0].color).toBe('attention')
  expect(buildCard('Good').body[0].color).toBe('good')
  expect(buildCard(' warning ').body[0].color).toBe('warning')
})

test('test keeping the default title colour for other values', async () => {
  expect(buildCard('00cbff').body[0].color).toBe('default')
  expect(buildCard('').body[0].color).toBe('default')
  expect(buildCard('red').body[0].color).toBe('default')
})

test('test mapping message colours to Adaptive Card colours', async () => {
  for (const colour of ['default', 'accent', 'good', 'warning', 'attention']) {
    expect(titleColour(colour)).toBe(colour)
  }
  expect(titleColour('#00cbff')).toBe('default')
})

test('test appending facts after the run facts', async () => {
  const facts = buildCard('default', [
    {title: 'Tag', value: 'v1.2.3'},
    {title: 'Commit', value: 'abc1234'}
  ]).body[3].facts
  expect(facts).toStrictEqual([
    {title: 'Run Number', value: '42'},
    {title: 'Run ID', value: '1000'},
    {title: 'Branch', value: 'main'},
    {title: 'Tag', value: 'v1.2.3'},
    {title: 'Commit', value: 'abc1234'}
  ])
})

test('test naming the link button', async () => {
  expect(buildCard('default').actions[0].title).toBe('View')
  expect(buildCard('default', [], 'View the run').actions[0].title).toBe(
    'View the run'
  )
})

test('test labelling the ref fact', async () => {
  const card = buildMessageCard(
    'This is a title',
    'This is some text',
    'default',
    '42',
    '1000',
    'example',
    'https://github.com/nhs-england-tools/example',
    'v1.2.3',
    'https://avatars.githubusercontent.com/u/105098969',
    'octocat',
    'https://github.com/octocat',
    '',
    [],
    'View',
    'Tag'
  )
  expect(
    JSON.parse(card).attachments[0].content.body[3].facts[2]
  ).toStrictEqual({title: 'Tag', value: 'v1.2.3'})
  expect(buildCard('default').body[3].facts[2].title).toBe('Branch')
})

test('test parsing facts from name and value lines', async () => {
  const facts = parseFacts(
    'Tag: v1.2.3\nnot a fact\n\n  Commit :  abc1234: fix  \r\n: no name\nEmpty:'
  )
  expect(facts).toStrictEqual([
    {title: 'Tag', value: 'v1.2.3'},
    {title: 'Commit', value: 'abc1234: fix'}
  ])
})

test('test parsing no facts from empty text', async () => {
  expect(parseFacts('')).toStrictEqual([])
})

function authorLine(authorUrl: string): string {
  const card = buildMessageCard(
    'This is a title',
    'This is some text',
    'default',
    '42',
    '1000',
    'example',
    'https://github.com/nhs-england-tools/example',
    'main',
    'https://avatars.githubusercontent.com/u/105098969',
    'octocat',
    authorUrl,
    ''
  )
  return JSON.parse(card).attachments[0].content.body[1].columns[1].items[1]
    .text
}

test('test linking the author to their profile', async () => {
  expect(authorLine('https://github.com/octocat')).toBe(
    'by [octocat](https://github.com/octocat)'
  )
})

test('test showing the author without a link when there is no profile', async () => {
  expect(authorLine('')).toBe('by octocat')
  expect(authorLine('Not provided')).toBe('by octocat')
})
