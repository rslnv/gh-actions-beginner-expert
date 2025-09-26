const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");

async function run() {
  const baseBranch = core.getInput("base-branch", { required: true });
  const headBranch = core.getInput("head-branch", { required: true });
  const workingDir = core.getInput("working-directory", { required: true });
  const ghToken = core.getInput("gh-token", { required: true });
  const debug = core.getBooleanInput("debug");
  const logger = setupLogger({ debug, prefix: "[js-dependency-update]" });

  const commonExecOpts = {
    cwd: workingDir,
  };

  core.setSecret(ghToken);

  logger.debug("Validating base-branch, head-branch, and working-directory");

  if (!validateBranchName(baseBranch)) {
    core.setFailed(
      `Invalid base-branch '${baseBranch}'. Branch names should contain only characters, numbers, hyphens, underscores, dots, and forward slashes`,
    );
    return;
  }

  if (!validateBranchName(headBranch)) {
    core.setFailed(
      `Invalid targer-branch '${headBranch}'. Branch names should contain only characters, numbers, hyphens, underscores, dots, and forward slashes`,
    );
    return;
  }

  if (!validateDirectoryName(workingDir)) {
    core.setFailed(
      `Invalid working-directory '${workingDir}'. Directory names should contain only characters, numbers, hyphens, underscores, and forward slashes`,
    );
    return;
  }

  logger.debug(`base-branch = ${baseBranch}`);
  logger.debug(`head-branch = ${headBranch}`);
  logger.debug(`working-directory = ${workingDir}`);

  logger.debug("Checking for package updates");

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

  const updatesAvailable = gitStatus.stdout.length > 0;

  core.debug(`Setting 'updates-available' output to ${{ updatesAvailable }}`);
  core.setOutput("updates-available", updatesAvailable);

  if (!updatesAvailable) {
    logger.info("no updates");
    return;
  }

  logger.debug("updates available");

  logger.debug("setting up git");

  await setupGit();

  logger.debug("committing and pushing package*.json changes");
  await exec.exec(`git checkout -b ${headBranch}`, [], {
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
  await exec.exec(`git push -u origin ${headBranch} --force`, [], {
    ...commonExecOpts,
  });

  logger.debug("fetching octokit api");
  const octokit = github.getOctokit(ghToken);

  try {
    logger.debug(`creating PR using head-branch ${headBranch}`);
    await octokit.rest.pulls.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title: "Update NPM dependencies",
      body: "This pull request updates NPM packages",
      base: baseBranch,
      head: headBranch,
    });
  } catch (e) {
    logger.error("Failed to create PR. See below");
    logger.error(e);
    core.setFailed(e.message);
  }
}

// letters, digits, _, -, ., /
const branchNameRegEx = /^[a-zA-Z0-9_\-\.\/]+$/;
// letters, digits, _, -, /
const direcoryNameRegEx = /^[a-zA-Z0-9_\-\/]+$/;

const validateBranchName = (name) => branchNameRegEx.test(name);
const validateDirectoryName = (name) => direcoryNameRegEx.test(name);

const setupGit = async () => {
  await exec.exec(`git config --global user.name "gh-automation"`);
  await exec.exec(`git config --global user.email "gh-automation@email.com"`);
};

const setupLogger = ({ debug, prefix } = { debug: false, prefix: "" }) => ({
  debug: (message) => {
    if (debug) core.info(`DEBUG: ${prefix}${prefix ? " " : ""}${message}`);
  },
  info: (message) => core.info(`${prefix}${prefix ? " " : ""}${message}`),
  error: (message) => core.error(`${prefix}${prefix ? " " : ""}${message}`),
});

run();
