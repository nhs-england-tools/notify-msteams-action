import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import {escapeMarkdown} from './markdownhelper'
import {buildMessageCard, parseFacts} from './messagecard'
import {branchName, commitAuthor, refTitle, serverUrl} from './runcontext'

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    const teamsWebhookUrl = core.getInput('teams-webhook-url', {required: true})
    const messageTitle = core.getInput('message-title', {required: true})
    const messageBody = core.getInput('message-text', {required: true})
    const messageColour =
      core.getInput('message-colour', {required: false}) || '00cbff'
    const link = core.getInput('link', {required: false}) || ''
    const linkTitle = core.getInput('link-title', {required: false}) || 'View'
    const facts = parseFacts(core.getInput('facts', {required: false})).map(
      fact => ({
        title: escapeMarkdown(fact.title),
        value: escapeMarkdown(fact.value)
      })
    )

    const [owner, repoName] = (process.env.GITHUB_REPOSITORY || '').split('/') // https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
    const commitRef =
      core.getInput('commit', {required: false}) || process.env.GITHUB_SHA || ''
    const runNumber = process.env.GITHUB_RUN_NUMBER || ''
    const runId = process.env.GITHUB_RUN_ID || ''
    const repoUrl = `${serverUrl(process.env)}/${owner}/${repoName}`
    const repoBranch = branchName(process.env)

    const octokit = github.getOctokit(githubToken)
    const author = await commitAuthor(
      async () => {
        const commit = await octokit.rest.repos.getCommit({
          owner,
          repo: repoName,
          ref: commitRef
        })
        return commit.data.author
      },
      message => core.warning(message)
    )

    const messageCard = buildMessageCard(
      escapeMarkdown(messageTitle),
      escapeMarkdown(messageBody),
      messageColour,
      runNumber,
      runId,
      repoName,
      repoUrl,
      escapeMarkdown(repoBranch),
      author.avatarUrl,
      author.login,
      author.url,
      link,
      facts,
      escapeMarkdown(linkTitle),
      refTitle(process.env)
    )

    const response = await axios.post(teamsWebhookUrl, messageCard, {
      headers: {'Content-Type': 'application/json'}
    })

    core.debug(`Response: ${JSON.stringify(response.data)}`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
