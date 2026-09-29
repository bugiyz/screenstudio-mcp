# Screen Studio MCP

An MCP server that lets Claude, ChatGPT-compatible MCP clients, Cursor, and other MCP hosts control **Screen Studio** through the open-source `screenstudio-agent` CLI.

## Architecture

```text
Claude / ChatGPT / Cursor
          │ MCP (stdio)
          ▼
screenstudio-mcp
          │ subprocess
          ▼
screenstudio-agent CLI
          │ localhost Electron/CDP bridge
          ▼
      Screen Studio
```

## What v0.1 can do

- Launch / status / quit Screen Studio automation
- List displays and windows
- Start / pause / resume / stop / cancel recording
- Verify the resulting `.screenstudio` project after stop
- Inspect project information
- Save / undo / redo
- Seek and capture preview frames
- Analyze a recording into frames + event timeline
- Read/write Screen Studio config values
- Open export or quick-export to clipboard

## Requirements

- macOS
- Screen Studio
- Node.js 21+
- `screenstudio-agent` installed as the `screenstudio` command
- `ffmpeg` / `ffprobe` for analysis/render features in the underlying CLI
- macOS Accessibility permission for the terminal/host that launches the automation

## 1. Install screenstudio-agent

```bash
git clone https://github.com/HyperfocuSam/screenstudio-agent.git
cd screenstudio-agent
npm install
npx tsc
mkdir -p ~/.local/bin
ln -s "$PWD/bin/screenstudio.js" ~/.local/bin/screenstudio
```

Ensure `~/.local/bin` is on your PATH.

```bash
screenstudio --help
```

## 2. Install this MCP server

```bash
cd screenstudio-mcp
npm install
```

Test it:

```bash
npm start
```

It will appear to sit there silently. That is normal: MCP stdio servers wait for a host.

## Claude Code

From this repository:

```bash
claude mcp add screenstudio -- node "$PWD/src/index.mjs"
```

Then try:

> Launch Screen Studio, list my windows, and record the Safari window. Wait until recording has really started.

When finished:

> Stop the recording, tell me where the Screen Studio project was saved, then quit Screen Studio automation.

## Claude Desktop

Add an MCP entry using Node and the absolute path to `src/index.mjs`.

Example shape:

```json
{
  "mcpServers": {
    "screenstudio": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/screenstudio-mcp/src/index.mjs"]
    }
  }
}
```

## Custom CLI path

If the `screenstudio` binary is not on the MCP host's PATH:

```bash
SCREENSTUDIO_BIN=/absolute/path/to/screenstudio node src/index.mjs
```

Or provide that environment variable in your MCP host configuration.

## Important security note

The underlying CLI launches Screen Studio with a localhost Electron remote-debugging port. The referenced project reports it binds to `127.0.0.1`, but local processes can still reach the Screen Studio bridge while it is open.

**Always call `screenstudio_quit` when the automation job is done.**

## Next milestone: "follow the typing"

The first version deliberately wraps verified CLI capabilities rather than guessing at Screen Studio internals.

For the Abide demo use case, the next layer should add a higher-level editing tool such as:

```text
screenstudio_focus_typing(
  from_ms,
  to_ms,
  target_window,
  padding,
  zoom
)
```

The implementation can combine:

1. macOS Accessibility APIs to locate the focused text field/caret during typing.
2. Screen Studio's recorded event/project data.
3. Zoom-range mutations through the existing Screen Studio Electron bridge.
4. `preview` / `render` after mutation to verify that the crop actually follows the intended region.

That gives the agent a verification loop instead of blindly adding zooms.

## License

MIT
# screenstudio-mcp
