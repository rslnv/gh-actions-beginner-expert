const core = require("@actions/core");

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
  core.info("I am a custom JS action");
}

run();
