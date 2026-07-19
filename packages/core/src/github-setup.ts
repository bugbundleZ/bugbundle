import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CONFIG_FILE, writeDefaultConfig } from "./config.js";

export const GITHUB_ISSUE_FORM = ".github/ISSUE_TEMPLATE/bug-report.yml";

export interface GitHubSetupResult {
  readonly configPath: string;
  readonly githubIssueFormPath: string;
}

export interface GitHubSetupOptions {
  readonly force?: boolean;
  readonly cliVersion: string;
}

function issueForm(cliVersion: string): string {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(cliVersion)) {
    throw new Error(`Invalid BugBundle CLI version: ${cliVersion}`);
  }
  return `name: Reproducible bug report
description: Report a failure with a reviewed BugBundle
title: "[Bug]: "
labels: []
body:
  - type: markdown
    attributes:
      value: |
        Thanks for helping us reproduce the problem.

        Run these commands from a safe reproduction project. Replace \`npm test\` if the maintainer documents another command.

        \`\`\`bash
        npx bugbundle@${cliVersion} preview
        npx bugbundle@${cliVersion} capture --output bugbundle.zip -- npm test
        npx bugbundle@${cliVersion} inspect bugbundle.zip
        \`\`\`

        Review the complete ZIP before uploading it. Never attach secrets or proprietary source code.
  - type: textarea
    id: description
    attributes:
      label: Description
      description: What happened, and what did you expect?
    validations:
      required: true
  - type: textarea
    id: bundle
    attributes:
      label: Reviewed BugBundle
      description: Drag \`bugbundle.zip\` here after reviewing its complete contents.
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: BugBundle version
      placeholder: "${cliVersion}"
    validations:
      required: true
  - type: dropdown
    id: operating-system
    attributes:
      label: Operating system
      options:
        - Linux
        - macOS
        - Windows
        - Other
    validations:
      required: true
  - type: checkboxes
    id: safety
    attributes:
      label: Safety confirmation
      options:
        - label: I ran \`bugbundle preview\` and reviewed every file in the bundle.
          required: true
        - label: The bundle contains no secrets or proprietary source code.
          required: true
`;
}

export async function writeGitHubSetup(
  cwd: string,
  options: GitHubSetupOptions,
): Promise<GitHubSetupResult> {
  const { force = false, cliVersion } = options;
  const configPath = join(cwd, CONFIG_FILE);
  const githubIssueFormPath = join(cwd, GITHUB_ISSUE_FORM);
  const form = issueForm(cliVersion);

  if (!force) {
    for (const path of [configPath, githubIssueFormPath]) {
      if (await exists(path)) throw new Error(`Refusing to overwrite existing file: ${path}`);
    }
  }

  await mkdir(dirname(githubIssueFormPath), { recursive: true });
  let createdConfig = false;
  try {
    await writeDefaultConfig(cwd, force);
    createdConfig = true;
    await writeFile(githubIssueFormPath, form, { encoding: "utf8", flag: force ? "w" : "wx" });
  } catch (error) {
    if (createdConfig && !force) await unlink(configPath).catch(() => undefined);
    throw error;
  }

  return { configPath, githubIssueFormPath };
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}
