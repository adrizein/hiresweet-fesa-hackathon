#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { SILLAGE_MCP_URL, FULLENRICH_MCP_URL, NAMES, c, createClient, findByName, loadEnv, readState, writeState } from './config.js';

// One-time OAuth authorizer for the Sillage + FullEnrich MCP servers.
//
// Those MCP endpoints require OAuth 2.0 (authorization_code + PKCE) — the REST
// API keys are NOT accepted, so they can't be wired as static bearer tokens.
// This runs the standard flow per server (dynamic client registration → browser
// authorize → token exchange) and stores the result as an `mcp_oauth` vault
// credential WITH a refresh block, so Anthropic renews the token automatically
// for every scheduled run. You only run this when the grant is first set up or
// after it is revoked.
//
//   node deploy/mcp-auth.js            # authorize both servers
//   node deploy/mcp-auth.js sillage    # just one
//
// Requires the vault to exist — run `node deploy/deploy.js` first.

const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const SERVERS = {
  sillage: SILLAGE_MCP_URL(),
  fullenrich: FULLENRICH_MCP_URL(),
};

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getJson(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → ${r.status} ${await r.text().catch(() => '')}`);
  return r.json();
}

// Discover the authorization server + its endpoints for an MCP server URL.
async function discover(mcpUrl) {
  const u = new URL(mcpUrl);
  const prm = await getJson(`${u.origin}/.well-known/oauth-protected-resource${u.pathname}`);
  const asBase = prm.authorization_servers[0];
  const meta = await getJson(`${new URL(asBase).origin}/.well-known/oauth-authorization-server`);
  return {
    resource: prm.resource ?? mcpUrl,
    scope: (prm.scopes_supported ?? []).join(' ') || undefined,
    registration_endpoint: meta.registration_endpoint,
    authorization_endpoint: meta.authorization_endpoint,
    token_endpoint: meta.token_endpoint,
  };
}

function waitForCode(expectedState) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== '/callback') {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const err = url.searchParams.get('error');
      res.writeHead(200, { 'content-type': 'text/html' }).end(
        `<html><body style="font-family:sans-serif;padding:2rem"><h2>${err ? 'Authorization failed' : 'Authorized ✓'}</h2><p>You can close this tab and return to the terminal.</p></body></html>`,
      );
      server.close();
      if (err) reject(new Error(`authorization error: ${err}`));
      else if (state !== expectedState) reject(new Error('state mismatch (possible CSRF) — aborted'));
      else resolve(code);
    });
    server.listen(PORT);
    server.on('error', reject);
  });
}

async function authorizeServer(client, vaultId, label, mcpUrl) {
  console.log(`\n${c.bold}${label}${c.reset} ${c.dim}${mcpUrl}${c.reset}`);
  const d = await discover(mcpUrl);

  // 1. Dynamic client registration (public client, PKCE).
  const reg = await getJson(d.registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Wake deploy (HireSweet)',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      ...(d.scope ? { scope: d.scope } : {}),
    }),
  });
  const clientId = reg.client_id;

  // 2. PKCE + authorize (browser).
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash('sha256').update(verifier).digest());
  const state = b64url(randomBytes(16));
  const authUrl = new URL(d.authorization_endpoint);
  authUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    resource: d.resource,
    ...(d.scope ? { scope: d.scope } : {}),
  }).toString();

  console.log(`  ${c.yellow}Opening your browser to authorize…${c.reset}`);
  console.log(`  If it doesn't open, paste this URL:\n  ${authUrl}`);
  spawn('open', [authUrl.toString()], { stdio: 'ignore' }).on('error', () => {});
  const code = await waitForCode(state);

  // 3. Exchange the code for tokens (PKCE, public client).
  const tok = await getJson(d.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
      resource: d.resource,
    }).toString(),
  });

  // 4. Replace any existing credential for this URL (keys are unique per vault).
  const existing = (await client.beta.vaults.credentials.list(vaultId))?.data ?? [];
  for (const cr of existing) {
    if (cr.auth?.mcp_server_url === mcpUrl) {
      await client.beta.vaults.credentials.archive(cr.id, { vault_id: vaultId });
      console.log(`  ${c.dim}archived old credential for this URL${c.reset}`);
    }
  }

  const auth = {
    type: 'mcp_oauth',
    mcp_server_url: mcpUrl,
    access_token: tok.access_token,
    ...(tok.expires_in ? { expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString() } : {}),
    ...(tok.refresh_token
      ? {
          refresh: {
            token_endpoint: d.token_endpoint,
            client_id: clientId,
            refresh_token: tok.refresh_token,
            token_endpoint_auth: { type: 'none' },
            ...(d.scope ? { scope: d.scope } : {}),
          },
        }
      : {}),
  };
  const cred = await client.beta.vaults.credentials.create(vaultId, { display_name: `${label} MCP (OAuth)`, auth });
  console.log(
    `  ${c.green}stored mcp_oauth credential${c.reset} ${cred.id}` +
      (tok.refresh_token ? ' (auto-refreshing)' : ` ${c.yellow}(no refresh token — will expire)${c.reset}`),
  );
}

async function main() {
  loadEnv();
  const client = createClient();
  const state = readState();
  let vaultId = state.vaultId;
  if (!vaultId) {
    const vault = await findByName((o) => client.beta.vaults.list(o), NAMES.vault);
    vaultId = vault?.id;
  }
  if (!vaultId) {
    console.error('No vault found. Run `node deploy/deploy.js` first.');
    process.exit(1);
  }

  const pick = process.argv[2];
  const targets = pick ? { [pick]: SERVERS[pick] } : SERVERS;
  if (pick && !SERVERS[pick]) {
    console.error(`Unknown server "${pick}". Choose: ${Object.keys(SERVERS).join(', ')}`);
    process.exit(1);
  }

  for (const [label, url] of Object.entries(targets)) {
    await authorizeServer(client, vaultId, label, url);
  }
  state.mcpOauthAt = new Date().toISOString();
  writeState(state);
  console.log(
    `\n${c.green}${c.bold}Done.${c.reset} Re-run a pass with ${c.bold}node deploy/run-once.js${c.reset} — ` +
      `the agent now has Sillage + FullEnrich MCP.`,
  );
}

main().catch((error) => {
  console.error(`\n${c.red}mcp-auth failed:${c.reset} ${error.message}`);
  process.exit(1);
});
