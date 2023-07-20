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
  link: string
): string {
  let actions: Record<string, string>[] = []
  if (link !== '') {
    actions = [
      {
        type: 'Action.OpenUrl',
        title: 'View',
        url: link,
        role: 'button'
      }
    ]
  }

  const title = {
    type: 'TextBlock',
    size: 'Large',
    weight: 'Bolder',
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
            text: `by [${login}](${author_url})`,
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
        title: 'Branch',
        value: repoBranch
      }
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
