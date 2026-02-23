import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import * as os from "os";

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("Test Fail Sound");
  outputChannel.appendLine("Test Fail Sound extension activated.");

  // ── Primary: Shell Execution Listener ───────────────────────────
  // Fires when any command finishes in the integrated terminal.
  // This catches manually typed `npm test`, `jest`, etc.
  const shellExecListener = vscode.window.onDidEndTerminalShellExecution(
    (event) => {
      const exitCode = event.exitCode;
      if (exitCode === 0 || exitCode === undefined) {
        return; // success or unknown
      }

      const commandLine = event.execution.commandLine.value;
      outputChannel.appendLine(
        `Shell command ended: "${commandLine}" (exit ${exitCode})`
      );

      if (isTestCommand(commandLine)) {
        outputChannel.appendLine("Detected test failure from shell execution!");
        playFailSound(context);
      }
    }
  );

  // ── Secondary: Task Process Listener ────────────────────────────
  // Fires when a VS Code Task ends (e.g. from tasks.json or Task Runner).
  const taskListener = vscode.tasks.onDidEndTaskProcess((event) => {
    if (event.exitCode === 0 || event.exitCode === undefined) {
      return;
    }

    const task = event.execution.task;
    if (isTestTask(task)) {
      outputChannel.appendLine(
        `Detected task failure: "${task.name}" (exit ${event.exitCode})`
      );
      playFailSound(context);
    }
  });

  context.subscriptions.push(shellExecListener, taskListener, outputChannel);

  outputChannel.appendLine("Listeners registered. Waiting for test failures...");
}

// ── Detection Helpers ───────────────────────────────────────────────

/**
 * Checks if a raw command string looks like a test command.
 */
function isTestCommand(cmd: string): boolean {
  const normalized = cmd.trim().toLowerCase();
  return (
    /\bnpm\s+(run\s+)?test\b/.test(normalized) ||
    /\bnpx\s+(jest|vitest|mocha)\b/.test(normalized) ||
    /\byarn\s+(run\s+)?test\b/.test(normalized) ||
    /\bpnpm\s+(run\s+)?test\b/.test(normalized) ||
    /\bjest\b/.test(normalized) ||
    /\bvitest\b/.test(normalized) ||
    /\bmocha\b/.test(normalized)
  );
}

/**
 * Checks if a VS Code Task represents a test invocation.
 */
function isTestTask(task: vscode.Task): boolean {
  if (task.source === "npm") {
    const def = task.definition;
    if (def && def.script && /^test/.test(def.script)) {
      return true;
    }
  }

  if (/test/i.test(task.name)) {
    return true;
  }

  return false;
}

// ── Sound Playback ──────────────────────────────────────────────────

/**
 * Resolves the sound file path and plays it.
 */
function playFailSound(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("testFailSound");

  if (!config.get<boolean>("enabled", true)) {
    return;
  }

  const customPath = config.get<string>("soundFile", "").trim();
  // Windows SoundPlayer only supports .wav; use .mp3 on macOS/Linux
  const ext = os.platform() === "win32" ? "wav" : "mp3";
  const bundledPath = path.join(context.extensionPath, "media", `fahhhhh.${ext}`);
  const soundPath = customPath || bundledPath;

  // Check if the sound file actually exists
  if (!fs.existsSync(soundPath)) {
    outputChannel.appendLine(
      `Sound file not found: ${soundPath}. Using system beep fallback.`
    );
    vscode.window
      .showWarningMessage(
        `Test failed! Sound file not found at: ${soundPath}`,
        "Open media folder"
      )
      .then((choice) => {
        if (choice === "Open media folder") {
          const mediaDir = path.join(context.extensionPath, "media");
          vscode.env.openExternal(vscode.Uri.file(mediaDir));
        }
      });

    // System beep as fallback
    process.stdout.write("\x07");
    return;
  }

  const volume = config.get<number>("volume", 1.0);
  playSoundFile(soundPath, volume);
}

/**
 * Cross-platform sound playback using native CLI tools.
 */
function playSoundFile(filePath: string, volume: number) {
  const platform = os.platform();

  let cmd: string;
  let args: string[];

  switch (platform) {
    case "darwin":
      cmd = "afplay";
      args = ["--volume", String(volume), filePath];
      break;

    case "win32":
      cmd = "powershell";
      args = [
        "-NoProfile",
        "-Command",
        `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`,
      ];
      break;

    default:
      cmd = "paplay";
      args = [filePath];
      break;
  }

  outputChannel.appendLine(`Playing: ${cmd} ${args.join(" ")}`);

  execFile(cmd, args, (err) => {
    if (err) {
      outputChannel.appendLine(`Sound playback error: ${err.message}`);

      if (platform === "linux" && cmd === "paplay") {
        execFile("aplay", [filePath], (err2) => {
          if (err2) {
            outputChannel.appendLine(
              `aplay fallback also failed: ${err2.message}`
            );
          }
        });
      }
    }
  });
}

export function deactivate() {
  // cleanup handled by subscriptions
}
