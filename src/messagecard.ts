export interface Fact {
  title: string
  value: string
}

const TITLE_COLOURS = ['default', 'accent', 'good', 'warning', 'attention']

// Map the message colour to an Adaptive Card text colour. Values that are not
// one of the named colours, such as the old hex default, keep the default.
export function titleColour(messageColour: string): string {
  const colour = messageColour.trim().toLowerCase()
  return TITLE_COLOURS.includes(colour) ? colour : 'default'
}

// Parse 'Name: value' lines into facts, skipping lines without both parts.
export function parseFacts(text: string): Fact[] {
  const facts: Fact[] = []
  for (const line of text.split('\n')) {
    const separator = line.indexOf(':')
    const title = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (separator > 0 && title !== '' && value !== '') {
      facts.push({title, value})
    }
  }
  return facts
}

export function buildMessageCard(
  messageTitle: string,
  messageBody: string,
  messageColour: string,
  runNumber: string,
  runId: string,
  repoName: string,
  repoUrl: string,
  repoBranch: string,
  avatar_url: string,
  login: string,
  author_url: string,
  link: string,
  extraFacts: Fact[] = [],
  linkTitle = 'View',
  refTitle = 'Branch'
): string {
  let actions: Record<string, string>[] = []
  if (link !== '') {
    actions = [
      {
        type: 'Action.OpenUrl',
        title: linkTitle,
        url: link,
        role: 'button'
      }
    ]
  }

  const title = {
    type: 'TextBlock',
    size: 'Large',
    weight: 'Bolder',
    color: titleColour(messageColour),
    text: messageTitle,
    wrap: true
  }

  const subtitle = {
    type: 'ColumnSet',
    columns: [
      {
        type: 'Column',
        width: 'auto',
        items: [
          {
            type: 'Image',
            url: avatar_url,
            size: 'Small',
            style: 'Person',
            altText: login
          }
        ]
      },
      {
        type: 'Column',
        width: 'stretch',
        items: [
          {
            type: 'TextBlock',
            text: `[${repoName}](${repoUrl})`,
            weight: 'Bolder',
            size: 'Medium',
            wrap: true
          },
          {
            type: 'TextBlock',
            text: author_url.startsWith('https://')
              ? `by [${login}](${author_url})`
              : `by ${login}`,
            weight: 'Bolder',
            size: 'Small',
            wrap: true
          }
        ]
      }
    ]
  }

  const message = {
    type: 'TextBlock',
    text: messageBody,
    wrap: true
  }

  const facts = {
    type: 'FactSet',
    facts: [
      {
        title: 'Run Number',
        value: runNumber
      },
      {
        title: 'Run ID',
        value: runId
      },
      {
        title: refTitle,
        value: repoBranch
      },
      ...extraFacts
    ]
  }

  const adaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [title, subtitle, message, facts],
    actions
  }

  const card = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: adaptiveCard
      }
    ]
  }

  return JSON.stringify(card)
}
