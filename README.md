# Screen Studio MCP

Control and edit **Screen Studio** with Claude, Cursor, and other MCP-compatible AI clients.

`screenstudio-mcp` exposes Screen Studio automation as MCP tools by using the open-source [`screenstudio-agent`](https://github.com/HyperfocuSam/screenstudio-agent) CLI underneath.

## Architecture

```text
Claude / Cursor / MCP Client
            │
            │ MCP (stdio)
            ▼
     screenstudio-mcp
            │
            │ subprocess
            ▼
   screenstudio-agent
            │
            │ localhost Electron/CDP bridge
            ▼
       Screen Studio
```

## What v0.1 can do

- Launch Screen Studio automation
- Check Screen Studio connection/status
- Quit Screen Studio and close the automation bridge
- List displays
- List windows
- Start recordings
- Pause recordings
- Resume recordings
- Stop recordings
- Cancel recordings
- Verify the resulting `.screenstudio` project after recording
- Inspect project information
- Save projects
- Undo and redo project changes
- Seek to specific timestamps
- Capture preview frames
- Analyze recordings into frames and event timelines
- Read Screen Studio configuration values
- Modify Screen Studio configuration values
- Trigger Screen Studio export
- Quick-export to clipboard

## Requirements

You need:

- macOS
- Screen Studio
- Node.js 21 or newer
- `screenstudio-agent`
- `ffmpeg` and `ffprobe` for render/analyze features
- macOS Accessibility permission for the terminal or MCP host controlling Screen Studio

---

# Installation

There are two pieces:

1. `screenstudio-agent` — talks to Screen Studio
2. `screenstudio-mcp` — exposes those capabilities to AI agents through MCP

## 1. Install screenstudio-agent

Clone the underlying Screen Studio automation CLI:

```bash
cd ~
git clone https://github.com/HyperfocuSam/screenstudio-agent.git
cd screenstudio-agent
npm install
npx tsc
```

Create the `screenstudio` command:

```bash
mkdir -p ~/.local/bin
ln -sf "$PWD/bin/screenstudio.js" ~/.local/bin/screenstudio
```

Make sure `~/.local/bin` is on your PATH.

For zsh:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify the installation:

```bash
screenstudio --help
```

You should see the Screen Studio CLI commands.

Optional but recommended:

```bash
brew install ffmpeg
```

This enables analysis and rendering functionality.

---

## 2. Install Screen Studio MCP

Clone this repository:

```bash
cd ~
git clone https://github.com/bugiyz/screenstudio-mcp.git
cd screenstudio-mcp
npm install
```

You can test the MCP server directly:

```bash
npm start
```

The terminal will appear to sit silently.

That is expected.

MCP stdio servers wait for an MCP host to communicate with them.

Press `Ctrl+C` to stop the manual test.

---

# Claude Code

From the `screenstudio-mcp` repository:

```bash
cd ~/screenstudio-mcp
claude mcp add screenstudio -- node "$PWD/src/index.mjs"
```

Verify that Claude can see the server:

```bash
claude mcp list
```

You should see something similar to:

```text
screenstudio: node /Users/you/screenstudio-mcp/src/index.mjs
└─ ✔ Connected
```

Start a new Claude Code session:

```bash
claude
```

Then try:

> Use the Screen Studio MCP to launch Screen Studio and check its status.

Then:

> List all windows available for recording.

Or:

> Find my Safari window and start recording it. Wait until recording has actually started.

When finished:

> Stop the recording, tell me where the Screen Studio project was saved, then quit Screen Studio automation.

---

# Claude Desktop / Other MCP Hosts

Configure an MCP stdio server using Node and the absolute path to `src/index.mjs`.

Example:

```json
{
  "mcpServers": {
    "screenstudio": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/screenstudio-mcp/src/index.mjs"
      ]
    }
  }
}
```

Restart the MCP host after changing its configuration.

---

# Custom screenstudio CLI path

By default, the MCP server expects this command to work:

```bash
screenstudio
```

If `screenstudio` is installed somewhere else, provide its path using `SCREENSTUDIO_BIN`.

Example:

```bash
SCREENSTUDIO_BIN=/absolute/path/to/screenstudio node src/index.mjs
```

You can also set this environment variable in your MCP host configuration.

---

# Example workflows

## Record a product demo

Tell your AI agent:

> Launch Screen Studio, list the available windows, find my iPhone Mirroring window, and begin recording it. Wait until recording is confirmed to be running.

Then:

> Stop the recording and return the saved Screen Studio project path.

## Inspect a project

> Inspect the currently open Screen Studio project and tell me its duration and project state.

## Preview footage

> Seek to 12 seconds and capture a preview frame.

## Edit with natural language

The underlying Screen Studio automation supports timeline and zoom manipulation, which makes workflows like this possible:

> Inspect this product demo and add restrained zooms around the important interactions. Preserve natural pacing and verify each edit with preview frames.

---

# Security

`screenstudio-agent` controls Screen Studio by launching it with an Electron remote-debugging port.

The upstream project reports that this port binds to:

```text
127.0.0.1
```

This means it is available only from the local machine.

However, other local processes may still be able to interact with Screen Studio while the automation bridge is active.

For that reason:

**Always quit Screen Studio automation after finishing an automated task.**

Through this MCP, use:

```text
screenstudio_quit
```

Or from the CLI:

```bash
screenstudio quit
```

Do not leave the remote-debugging bridge running unnecessarily.

---

# Roadmap

The current version primarily exposes verified Screen Studio automation primitives.

The larger goal is semantic AI video editing.

Planned higher-level tools include concepts such as:

```text
follow_typing()
focus_region()
remove_dead_air()
highlight_response()
verify_edit()
edit_product_demo()
```

For example:

> Make this product demo feel like an Apple-quality product video. Follow the important interactions with restrained zooms, preserve natural pauses, remove unnecessary dead time, and verify the edits visually.

Instead of requiring the AI agent to manually reason about every timeline operation, higher-level MCP tools can translate creative intent into multiple Screen Studio edits.

---

# Follow typing

One planned capability is automatically following text-entry interactions.

Conceptually:

```text
screenstudio_focus_typing(
  from_ms,
  to_ms,
  target_window,
  padding,
  zoom
)
```

A future implementation could combine:

1. macOS Accessibility APIs to locate the focused text field or caret
2. Screen Studio event/project data
3. Screen Studio zoom-range mutations
4. Preview or render verification after each edit

This creates a feedback loop:

```text
detect interaction
       ↓
find target
       ↓
apply zoom
       ↓
render preview
       ↓
verify framing
       ↓
adjust if needed
```

The goal is not just automated editing.

The goal is **AI editing that can inspect and verify its own work.**

---

# Credits

This project uses [`screenstudio-agent`](https://github.com/HyperfocuSam/screenstudio-agent) by HyperfocuSam as the underlying Screen Studio automation layer.

`screenstudio-agent` itself builds on earlier work from [`screenstudio-cli`](https://github.com/ShawnPana/screenstudio-cli).

`screenstudio-mcp` provides the MCP interface and AI-agent tooling layer on top of that work.

This project is unofficial and is not affiliated with Screen Studio.

---

# License

MIT
