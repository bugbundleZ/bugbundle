import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { GITHUB_ISSUE_FORM, writeGitHubSetup } from "./github-setup.js";

describe("GitHub setup", () => {
  it("writes a config and valid Issue Form without project-specific labels", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-github-"));
    const result = await writeGitHubSetup(cwd, { cliVersion: "9.8.7" });

    expect(result).toEqual({
      configPath: join(cwd, ".bugbundle.yml"),
      githubIssueFormPath: join(cwd, GITHUB_ISSUE_FORM),
    });
    const issueForm = parse(await readFile(result.githubIssueFormPath, "utf8"));
    expect(issueForm).toMatchObject({
      name: "Reproducible bug report",
      labels: [],
      body: expect.any(Array),
    });
    await expect(readFile(result.githubIssueFormPath, "utf8")).resolves.toContain("npx bugbundle@9.8.7 preview");
  });

  it("refuses the whole setup when either target already exists", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-github-existing-"));
    const issueFormPath = join(cwd, GITHUB_ISSUE_FORM);
    await mkdir(join(cwd, ".github", "ISSUE_TEMPLATE"), { recursive: true });
    await writeFile(issueFormPath, "maintainer-owned\n");

    await expect(writeGitHubSetup(cwd, { cliVersion: "0.2.0" })).rejects.toThrow(
      "Refusing to overwrite existing file",
    );
    await expect(readFile(join(cwd, ".bugbundle.yml"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(issueFormPath, "utf8")).resolves.toBe("maintainer-owned\n");
  });

  it("overwrites both generated files only with force", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-github-force-"));
    const result = await writeGitHubSetup(cwd, { cliVersion: "0.2.0" });
    await writeFile(result.configPath, "custom config\n");
    await writeFile(result.githubIssueFormPath, "custom form\n");

    await writeGitHubSetup(cwd, { force: true, cliVersion: "0.2.0" });
    await expect(readFile(result.configPath, "utf8")).resolves.toContain("schemaVersion: 1");
    await expect(readFile(result.githubIssueFormPath, "utf8")).resolves.toContain("Reproducible bug report");
  });

  it("rejects a version that could inject Issue Form YAML", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-github-version-"));
    await expect(writeGitHubSetup(cwd, { cliVersion: "1.0.0\nlabels: [unsafe]" })).rejects.toThrow(
      "Invalid BugBundle CLI version",
    );
  });
});
