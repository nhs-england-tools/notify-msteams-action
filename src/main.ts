import * as github from '@actions/github'
import * as core from '@actions/core'
import axios from 'axios'
import {buildMessageCard} from './messagecard'
import {escapeMarkdown} from './markdownhelper'

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', {required: true})
    const teamsWebhookUrl = core.getInput('teams-webhook-url', {required: true})
    const messageTitle = core.getInput('message-title', {required: true})
    const messageBody = core.getInput('message-text', {required: true})
    const messageColour =
      core.getInput('message-colour', {required: false}) || '00cbff'
    const link = core.getInput('link', {required: false}) || ''

    const [owner, repoName] = (process.env.GITHUB_REPOSITORY || '').split('/') // https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
    const sha = process.env.GITHUB_SHA || ''
    const runNumber = process.env.GITHUB_RUN_NUMBER || ''
    const runId = process.env.GITHUB_RUN_ID || ''
    const repoUrl = `https://github.com/${owner}/${repoName}`
    const repoBranch = process.env.GITHUB_REF_NAME || ''

    const octokit = github.getOctokit(githubToken)
    const params = {owner, repo: repoName, ref: sha}
    const commit = await octokit.rest.repos.getCommit(params)
    const author = commit.data.author
    let avatar_url = 'https://avatars.githubusercontent.com/u/105098969'
    let login = 'Not provided'
    let author_url = 'Not provided'
    if (author) {
      if (author.avatar_url) {
        avatar_url = author.avatar_url
      }
      login = author.login
      author_url = author.html_url
    }

    const messageCard = buildMessageCard(
      escapeMarkdown(messageTitle),
      escapeMarkdown(messageBody),
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

    const response = await axios.post(teamsWebhookUrl, messageCard, {
      headers: {'Content-Type': 'application/json'}
    })

    core.debug(`Response: ${JSON.stringify(response.data)}`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
