#!/usr/bin/env node

const args = process.argv.slice(2);

function readFlag(name, fallback = "") {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function readJsonFlag(name) {
  const value = readFlag(name, "");
  return value ? JSON.parse(value) : {};
}

async function request(path, options = {}) {
  const baseUrl = readFlag("--base-url", "http://localhost:3015").replace(/\/$/, "");
  const token = readFlag("--token", "");
  if (!token) {
    throw new Error("Missing --token");
  }
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: response.ok, raw: text };
  }
}

async function main() {
  const command = args[0];
  switch (command) {
    case "whoami":
      console.log(JSON.stringify(await request("/api/agent/me"), null, 2));
      return;
    case "board":
      console.log(JSON.stringify(await request("/api/agent/board"), null, 2));
      return;
    case "create-task":
      console.log(JSON.stringify(await request("/api/agent/tasks", {
        method: "POST",
        body: JSON.stringify(readJsonFlag("--data"))
      }), null, 2));
      return;
    case "act-task": {
      const taskId = readFlag("--task-id", "");
      if (!taskId) throw new Error("Missing --task-id");
      console.log(JSON.stringify(await request(`/api/agent/tasks/${taskId}/actions`, {
        method: "POST",
        body: JSON.stringify(readJsonFlag("--data"))
      }), null, 2));
      return;
    }
    default:
      console.log(`DOTSTACK Kanban Agent CLI

Usage:
  node kanban-agent.mjs whoami --base-url <url> --token <token>
  node kanban-agent.mjs board --base-url <url> --token <token>
  node kanban-agent.mjs create-task --base-url <url> --token <token> --data '{"title":"...","type":"ops","priority":"high","outcome":"...","context":"","acceptanceCriteria":["..."],"riskFlags":[]}'
  node kanban-agent.mjs act-task --base-url <url> --token <token> --task-id <id> --data '{"action":"claim_task"}'`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
