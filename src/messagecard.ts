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
  author_url: string
): string {
  const card = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.0',
    summary: messageTitle,
    themeColor: messageColour,
    title: messageTitle,
    sections: [
      {
        activityTitle: `[${repoName}](${repoUrl})`,
        activitySubtitle: `by [${login}](${author_url})`,
        activityImage: avatar_url,
        facts: [
          {
            name: 'Run Number',
            value: runNumber
          },
          {
            name: 'Run ID',
            value: runId
          },
          {
            name: 'Branch',
            value: repoBranch
          }
        ],
        text: messageBody
      }
    ]
  }
  return JSON.stringify(card)
}
