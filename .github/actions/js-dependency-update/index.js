const core = require("@actions/core");
const exec = require("@actions/exec");

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
  const baseBranch = core.getInput("base-branch");
  const targetBranch = core.getInput("target-branch");
  const workingDir = core.getInput("working-directory");
  const ghToken = core.getInput("gh-token");
  const debug = core.getBooleanInput("debug");

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

  core.info(`[js-dependency-updae] base-branch = ${baseBranch}`);
  core.info(`[js-dependency-updae] target-branch = ${targetBranch}`);
  core.info(`[js-dependency-updae] working-directory = ${workingDir}`);

  await exec.exec("npm update", [], {
    cwd: workingDir,
  });

  const gitStatus = await exec.getExecOutput(
    "git status -s package*.json",
    [],
    {
      cwd: workingDir,
    },
  );

  if (gitStatus.stdout.length > 0) {
    core.info("[js-dependency-updae] updates available");
  } else {
    core.info("[js-dependency-updae] no updates");
  }

  core.info("I am a custom JS action");
}

// letters, digits, _, -, ., /
const branchNameRegEx = /^[a-zA-Z0-9_\-\.\/]+$/;
// letters, digits, _, -, /
const direcoryNameRegEx = /^[a-zA-Z0-9_\-\/]+$/;

const validateBranchName = (name) => branchNameRegEx.test(name);
const validateDirectoryName = (name) => direcoryNameRegEx.test(name);

run();
