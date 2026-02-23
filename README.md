# 🔊 Test Fail Sound

A VS Code / Cursor extension that plays a sound when your tests fail — so you never miss a broken build.

![VS Code](https://img.shields.io/badge/VS%20Code-^1.93.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20|%20Windows%20|%20Linux-lightgrey)

## Features

- 🎵 **Plays a sound on test failure** — `npm test`, `jest`, `vitest`, `mocha`, `yarn test`, `pnpm test`
- 🖥️ **Detects tests everywhere** — terminal commands (via Shell Integration) and VS Code Tasks
- 🌍 **Cross-platform** — macOS (`afplay`), Windows (`powershell`), Linux (`paplay` / `aplay`)
- ⚙️ **Configurable** — custom sound file, volume control, enable/disable toggle

## How It Works

1. **Shell Execution Listener** — uses `onDidEndTerminalShellExecution` to detect when a test command finishes in the integrated terminal with a non-zero exit code.
2. **Task Listener** — uses `onDidEndTaskProcess` to catch test tasks run via the VS Code Task system.
3. **Sound Playback** — spawns the platform's native audio CLI to play the sound file.

## Installation

### From Source

```bash
# Clone or download this project
cd test-fail-sound

# Install dependencies
npm install

# Compile
npm run compile

# Package as VSIX (optional)
npx @vscode/vsce package

# Install in Cursor / VS Code
# Extensions → ⋯ → Install from VSIX…
```

### Development

1. Open this folder in Cursor / VS Code
2. Press **F5** to launch the Extension Development Host
3. Run a failing `npm test` in the new window
4. 🔊 Hear the sound!

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `testFailSound.enabled` | `boolean` | `true` | Enable or disable the failure sound |
| `testFailSound.soundFile` | `string` | `""` | Absolute path to a custom sound file. Leave empty to use the bundled sound |
| `testFailSound.volume` | `number` | `1.0` | Playback volume (0–1). Only works on macOS |

### Example `settings.json`

```json
{
  "testFailSound.enabled": true,
  "testFailSound.soundFile": "/path/to/custom-fail.mp3",
  "testFailSound.volume": 0.5
}
```

## Supported Test Runners

The extension detects these commands (typed in terminal or run as tasks):

- `npm test` / `npm run test`
- `yarn test` / `yarn run test`
- `pnpm test` / `pnpm run test`
- `jest`
- `vitest`
- `mocha`
- `npx jest` / `npx vitest` / `npx mocha`

## Platform Notes

| Platform | Audio Format | Player | Volume Control |
|----------|-------------|--------|----------------|
| macOS | `.mp3` | `afplay` | ✅ Yes |
| Windows | `.wav` | PowerShell `SoundPlayer` | ❌ No |
| Linux | `.mp3` | `paplay` → `aplay` fallback | ❌ No |

> **Note:** Place both `fahhhhh.mp3` and `fahhhhh.wav` in the `media/` folder for full cross-platform support.

## Requirements

- VS Code / Cursor with engine `≥ 1.93.0`
- **Shell Integration** must be enabled (default in modern VS Code):
  ```json
  { "terminal.integrated.shellIntegration.enabled": true }
  ```

## Debugging

Open the **Output** panel → select **"Test Fail Sound"** from the dropdown to view extension logs.