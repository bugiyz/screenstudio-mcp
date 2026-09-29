#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const SCREENSTUDIO_BIN = process.env.SCREENSTUDIO_BIN || "screenstudio";

async function runScreenStudio(args, { timeout = 120000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(
      SCREENSTUDIO_BIN,
      ["--json", ...args],
      {
        timeout,
        maxBuffer: 20 * 1024 * 1024,
        env: process.env,
      },
    );

    const output = (stdout || stderr || "").trim();
    if (!output) return { success: true };

    try {
      return JSON.parse(output);
    } catch {
      return { success: true, output, stderr: stderr?.trim() || undefined };
    }
  } catch (error) {
    const stdout = error?.stdout?.toString?.().trim();
    const stderr = error?.stderr?.toString?.().trim();
    throw new Error(
      [
        `Screen Studio command failed: ${args.join(" ")}`,
        stderr,
        stdout,
        error?.message,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function result(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

const server = new McpServer({
  name: "screenstudio-mcp",
  version: "0.1.0",
});

server.tool(
  "screenstudio_status",
  "Check whether Screen Studio is connected and inspect the currently open project.",
  {},
  async () => result(await runScreenStudio(["status"])),
);

server.tool(
  "screenstudio_launch",
  "Launch Screen Studio with its local automation/debug bridge enabled.",
  {
    port: z.number().int().min(1024).max(65535).optional(),
  },
  async ({ port }) => {
    const args = ["launch"];
    if (port) args.push("--port", String(port));
    return result(await runScreenStudio(args));
  },
);

server.tool(
  "screenstudio_quit",
  "Quit Screen Studio and verify that the local automation port is closed. Use this when automation is finished.",
  {},
  async () => result(await runScreenStudio(["quit"])),
);

server.tool(
  "screenstudio_list_displays",
  "List displays that Screen Studio can record, including visible apps.",
  {},
  async () => result(await runScreenStudio(["record", "displays"])),
);

server.tool(
  "screenstudio_list_windows",
  "List windows that Screen Studio can record.",
  {},
  async () => result(await runScreenStudio(["record", "windows"])),
);

server.tool(
  "screenstudio_record_start",
  "Start a Screen Studio recording and optionally wait until capture is actually rolling.",
  {
    mode: z.enum(["display", "window"]).default("display"),
    display: z.number().int().min(0).optional(),
    app: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    wait: z.boolean().default(true),
  },
  async ({ mode, display, app, title, wait }) => {
    const args = ["record", "start"];
    if (mode === "window") args.push("--mode", "window");
    if (display !== undefined) args.push("--display", String(display));
    if (app) args.push("--app", app);
    if (title) args.push("--title", title);
    if (wait) args.push("--wait");
    return result(await runScreenStudio(args));
  },
);

server.tool(
  "screenstudio_record_pause",
  "Pause the active Screen Studio recording.",
  {},
  async () => result(await runScreenStudio(["record", "pause"])),
);

server.tool(
  "screenstudio_record_resume",
  "Resume the active Screen Studio recording.",
  {},
  async () => result(await runScreenStudio(["record", "resume"])),
);

server.tool(
  "screenstudio_record_stop",
  "Stop recording, wait for the Screen Studio project bundle to finish saving, and return its path/duration.",
  {},
  async () => result(await runScreenStudio(["record", "stop"], { timeout: 180000 })),
);

server.tool(
  "screenstudio_record_cancel",
  "Cancel the active Screen Studio recording.",
  {},
  async () => result(await runScreenStudio(["record", "cancel"])),
);

server.tool(
  "screenstudio_project_info",
  "Get information about the active Screen Studio project.",
  {},
  async () => result(await runScreenStudio(["project", "info"])),
);

server.tool(
  "screenstudio_project_save",
  "Save the active Screen Studio project.",
  {},
  async () => result(await runScreenStudio(["project", "save"])),
);

server.tool(
  "screenstudio_project_undo",
  "Undo the last Screen Studio CLI mutation.",
  {},
  async () => result(await runScreenStudio(["project", "undo"])),
);

server.tool(
  "screenstudio_project_redo",
  "Redo the last Screen Studio CLI mutation.",
  {},
  async () => result(await runScreenStudio(["project", "redo"])),
);

server.tool(
  "screenstudio_seek",
  "Move the Screen Studio playhead to a timestamp in milliseconds.",
  {
    milliseconds: z.number().int().min(0),
  },
  async ({ milliseconds }) => result(await runScreenStudio(["seek", String(milliseconds)])),
);

server.tool(
  "screenstudio_preview",
  "Capture a screenshot of the Screen Studio preview canvas, optionally at a timestamp.",
  {
    at_ms: z.number().int().min(0).optional(),
  },
  async ({ at_ms }) => {
    const args = ["preview"];
    if (at_ms !== undefined) args.push("--at", String(at_ms));
    return result(await runScreenStudio(args));
  },
);

server.tool(
  "screenstudio_analyze",
  "Extract frames and the event timeline from the active recording so an AI agent can inspect the edit.",
  {
    interval_seconds: z.number().positive().max(60).default(2),
  },
  async ({ interval_seconds }) =>
    result(
      await runScreenStudio(["analyze", "--interval", String(interval_seconds)], {
        timeout: 180000,
      }),
    ),
);

server.tool(
  "screenstudio_config_get",
  "Read a Screen Studio configuration value.",
  {
    key: z.string().min(1),
  },
  async ({ key }) => result(await runScreenStudio(["config", key])),
);

server.tool(
  "screenstudio_config_set",
  "Set a Screen Studio configuration value. Values are passed as strings to Screen Studio.",
  {
    key: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
  },
  async ({ key, value }) =>
    result(await runScreenStudio(["config", key, String(value)])),
);

server.tool(
  "screenstudio_export",
  "Open Screen Studio's export UI, or quick-export to clipboard.",
  {
    clipboard: z.boolean().default(false),
  },
  async ({ clipboard }) => {
    const args = ["export"];
    if (clipboard) args.push("--clipboard");
    return result(await runScreenStudio(args, { timeout: 180000 }));
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
