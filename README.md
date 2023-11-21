# Notify MSTeams Action

This GitHub action is designed to enable development teams to easily send notifications to an MS Teams channel from their build pipelines.

This action uses typescript and is built from the [typescript-action](https://github.com/actions/typescript-action) baseline

## Table of Contents

- [Notify MSTeams Action](#notify-msteams-action)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [To work on this repository](#to-work-on-this-repository)
    - [Prerequisites](#prerequisites)
  - [Usage](#usage)
  - [Contacts](#contacts)
  - [Licence](#licence)

## Installation

This action can be called as part of your [GitHub action](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) workflows. to achieve this follow these steps:

Add the following section to your existing workflow file:

```yml
      - name: Testing action to notify Teams
        uses: nhs-england-tools/notify-msteams-action@v0.0.4
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          teams-webhook-url: ${{ secrets.TEAMS_WEBHOOK_URL }}
          message-title: "Replace with an appropriate title"
          message-text: "Replace with appropriate text"
          link: https://google.com
```

Follow the instructions [to add an Incoming Webhook](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=dotnet) to the Teams channel of your choice.

Add the webhook url from above as a [repository secret](https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/managing-encrypted-secrets-for-your-repository-and-organization-for-github-codespaces#adding-secrets-for-a-repository) with the following name:

```shell
TEAMS_WEBHOOK_URL
```

## To work on this repository

Clone the repository

```shell
git clone https://github.com/nhs-england-tools/notify-msteams.git
cd nhs-england-tools/notify-msteams
```

Install and configure toolchain dependencies

```shell
make config
```

### Prerequisites

The following software packages or their equivalents are expected to be installed

- [node](https://nodejs.org/en/download)

## Usage

The steps above detail how to quickly use this action within your repository. The following attributes can be provided to further control the output of your notification:

- github-token - use the default [GitHub token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)
- teams-webhook-url - this is the URL provided by MS Teams when you configured the incoming webhook
- message-title - the title for your message - this will be displayed in the notification
- message-text - the text for your message - this will be displayed in the notification
- message-colour - The colour to use for the header line in the notification
- link - optional if required provide a link to be presented in the notification

An example of how the notification could appear in Microsoft Teams is provided:

![Microsoft Teams notification showing the adaptive card being displayed to the user for a "Pull request opened" event](docs/images/msteams-action-notification.png)

## Contacts

Provide a way to contact the owners of this project. It can be a team, an individual or information on the means of getting in touch via active communication channels, e.g. opening a GitHub discussion, raising an issue, etc.

## Licence

> The [LICENCE.md](./LICENCE.md) file will need to be updated with the correct year and owner

Unless stated otherwise, the codebase is released under the MIT License. This covers both the codebase and any sample code in the documentation.

Any HTML or Markdown documentation is [© Crown Copyright](https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/) and available under the terms of the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
