const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

async function run() {
  /*
  1. Parse inputs:
    1.1. base-branch to check for updates
    1.2. target-branch for PR
    1.3. GitHub Token for authentication
    1.4. Working directory
  2. Execute the npm update command within the working directory
  3. Check for modified package*.json files
  4. If modified
    4.1. Add and commit changes to target-branch
    4.2. Create PR to the base-branch using the octokit API
  */
  const baseBranch = core.getInput("base-branch", { required: true });
  const targetBranch = core.getInput("target-branch", { required: true });
  const workingDir = core.getInput("working-directory", { required: true });
  const ghToken = core.getInput("gh-token", { required: true });
  const debug = core.getBooleanInput("debug");

  const commonExecOpts = {
    cwd: workingDir,
  };

  core.setSecret(ghToken);

  if (!validateBranchName(baseBranch)) {
    core.setFailed(
      `Invalid base-branch '${baseBranch}'. Branch names should contain only characters, numbers, hyphens, underscores, dots, and forward slashes`,
    );
    return;
  }

  if (!validateBranchName(targetBranch)) {
    core.setFailed(
      `Invalid targer-branch '${targetBranch}'. Branch names should contain only characters, numbers, hyphens, underscores, dots, and forward slashes`,
    );
    return;
  }

  if (!validateDirectoryName(workingDir)) {
    core.setFailed(
      `Invalid working-directory '${workingDir}'. Directory names should contain only characters, numbers, hyphens, underscores, and forward slashes`,
    );
    return;
  }

  core.info(`[js-dependency-update] base-branch = ${baseBranch}`);
  core.info(`[js-dependency-update] target-branch = ${targetBranch}`);
  core.info(`[js-dependency-update] working-directory = ${workingDir}`);

  await exec.exec("npm update", [], {
    ...commonExecOpts,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package*.json",
    [],
    {
      ...commonExecOpts,
    },
  );

  if (gitStatus.stdout.length == 0) {
    core.info("[js-dependency-update] no updates");
  }

  core.info("[js-dependency-updae] updates available");

  await exec.exec(`git config --global user.name "gh-automation"`);
  await exec.exec(`git config --global user.email "gh-automation@email.com"`);
  await exec.exec(`git checkout -b ${targetBranch}`, [], {
    ...commonExecOpts,
  });
  await exec.exec(`git add package.json package-lock.json`, [], {
    ...commonExecOpts,
  });
  await exec.exec(`git commit -m "chore: update dependencies"`, [], {
    ...commonExecOpts,
  });
  // Requires 'Allow GitHub Actions to create and approve pull requests'
  // In Settings -> Actions -> General
  await exec.exec(`git push -u origin ${targetBranch} --force`, [], {
    ...commonExecOpts,
  });

  const octokit = github.getOctokit(ghToken);

  try {
    await octokit.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: "Update NPM dependencies",
      body: "This pull request updates NPM packages",
      base: baseBranch,
      head: targetBranch,
    });
  } catch (e) {
    core.error("[js-dependency-update] Failed to create PR. See below");
    core.error(e);
    core.setFailed(e.message);
  }
}

// letters, digits, _, -, ., /
const branchNameRegEx = /^[a-zA-Z0-9_\-\.\/]+$/;
// letters, digits, _, -, /
const direcoryNameRegEx = /^[a-zA-Z0-9_\-\/]+$/;

const validateBranchName = (name) => branchNameRegEx.test(name);
const validateDirectoryName = (name) => direcoryNameRegEx.test(name);

run();
