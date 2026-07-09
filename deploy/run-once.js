#!/usr/bin/env node
import { NAMES, c, createClient, findByName, loadEnv, readState } from './config.js';

// Dev helper: fire the deployment once, now, instead of waiting for the cron.
// The session then runs autonomously on Anthropic's side — nothing to keep open.
// Prints the platform.claude.com link so you can watch the transcript live, and
// reminds you to review the result with inbox.js.
//
//   node deploy/run-once.js

async function main() {
  loadEnv();
  const client = createClient();
  const state = readState();

  let deploymentId = state.deploymentId;
  if (!deploymentId) {
    const deployment = await findByName((o) => client.beta.deployments.list(o), NAMES.deployment);
    deploymentId = deployment?.id;
  }
  if (!deploymentId) {
    console.error('No deployment found. Run `node deploy/deploy.js` first.');
    process.exit(1);
  }

  const run = await client.beta.deployments.run(deploymentId);
  if (run.error) {
    console.error(`${c.red}run rejected:${c.reset} ${run.error.type} — ${run.error.message}`);
    process.exit(1);
  }

  const slug = process.env.ANTHROPIC_WORKSPACE_SLUG || 'default';
  console.log(`${c.green}${c.bold}Triggered.${c.reset} deployment run ${run.id}`);
  if (run.session_id) {
    console.log(`  session ${run.session_id}`);
    console.log(
      `  ${c.dim}watch live:${c.reset} https://platform.claude.com/workspaces/${slug}/sessions/${run.session_id}`,
    );
  }
  console.log(
    `\nThe agent runs autonomously — no need to keep this open. ` +
      `Review its proposals with ${c.bold}node deploy/inbox.js${c.reset} once it finishes.`,
  );
}

main().catch((error) => {
  console.error(`${c.red}run failed:${c.reset} ${error.message}`);
  process.exit(1);
});
