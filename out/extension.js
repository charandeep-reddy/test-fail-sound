"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
let outputChannel;
function activate(context) {
    outputChannel = vscode.window.createOutputChannel("Test Fail Sound");
    outputChannel.appendLine("Test Fail Sound extension activated.");
    // ── Primary: Shell Execution Listener ───────────────────────────
    // Fires when any command finishes in the integrated terminal.
    // This catches manually typed `npm test`, `jest`, etc.
    const shellExecListener = vscode.window.onDidEndTerminalShellExecution((event) => {
        const exitCode = event.exitCode;
        if (exitCode === 0 || exitCode === undefined) {
            return; // success or unknown
        }
        const commandLine = event.execution.commandLine.value;
        outputChannel.appendLine(`Shell command ended: "${commandLine}" (exit ${exitCode})`);
        if (isTestCommand(commandLine)) {
            outputChannel.appendLine("Detected test failure from shell execution!");
            playFailSound(context);
        }
    });
    // ── Secondary: Task Process Listener ────────────────────────────
    // Fires when a VS Code Task ends (e.g. from tasks.json or Task Runner).
    const taskListener = vscode.tasks.onDidEndTaskProcess((event) => {
        if (event.exitCode === 0 || event.exitCode === undefined) {
            return;
        }
        const task = event.execution.task;
        if (isTestTask(task)) {
            outputChannel.appendLine(`Detected task failure: "${task.name}" (exit ${event.exitCode})`);
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
function isTestCommand(cmd) {
    const normalized = cmd.trim().toLowerCase();
    return (/\bnpm\s+(run\s+)?test\b/.test(normalized) ||
        /\bnpx\s+(jest|vitest|mocha)\b/.test(normalized) ||
        /\byarn\s+(run\s+)?test\b/.test(normalized) ||
        /\bpnpm\s+(run\s+)?test\b/.test(normalized) ||
        /\bjest\b/.test(normalized) ||
        /\bvitest\b/.test(normalized) ||
        /\bmocha\b/.test(normalized));
}
/**
 * Checks if a VS Code Task represents a test invocation.
 */
function isTestTask(task) {
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
function playFailSound(context) {
    const config = vscode.workspace.getConfiguration("testFailSound");
    if (!config.get("enabled", true)) {
        return;
    }
    const customPath = config.get("soundFile", "").trim();
    // Windows SoundPlayer only supports .wav; use .mp3 on macOS/Linux
    const ext = os.platform() === "win32" ? "wav" : "mp3";
    const bundledPath = path.join(context.extensionPath, "media", `fahhhhh.${ext}`);
    const soundPath = customPath || bundledPath;
    // Check if the sound file actually exists
    if (!fs.existsSync(soundPath)) {
        outputChannel.appendLine(`Sound file not found: ${soundPath}. Using system beep fallback.`);
        vscode.window
            .showWarningMessage(`Test failed! Sound file not found at: ${soundPath}`, "Open media folder")
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
    const volume = config.get("volume", 1.0);
    playSoundFile(soundPath, volume);
}
/**
 * Cross-platform sound playback using native CLI tools.
 */
function playSoundFile(filePath, volume) {
    const platform = os.platform();
    let cmd;
    let args;
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
    (0, child_process_1.execFile)(cmd, args, (err) => {
        if (err) {
            outputChannel.appendLine(`Sound playback error: ${err.message}`);
            if (platform === "linux" && cmd === "paplay") {
                (0, child_process_1.execFile)("aplay", [filePath], (err2) => {
                    if (err2) {
                        outputChannel.appendLine(`aplay fallback also failed: ${err2.message}`);
                    }
                });
            }
        }
    });
}
function deactivate() {
    // cleanup handled by subscriptions
}
//# sourceMappingURL=extension.js.map