import { spawnSync } from "node:child_process";
import { spawn } from "node:child_process";

/**
 * Create a minimal LSP client over stdio for rust-analyzer.
 */
export function createLSPProcess(command, cwd) {
    const proc = spawn(command, [], { cwd, stdio: ["pipe", "pipe", "pipe"] });

    let id = 0;
    const pending = new Map();
    const diagnosticsMap = new Map();
    const diagnosticsListeners = new Set();

    let buffer = "";

    proc.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        processBuffer();
    });

    proc.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        // rust-analyzer emits log/trace messages on stderr — ignore them
        // unless they indicate a crash
        if (
            text.includes("panic") ||
            text.includes("Error:") ||
            text.includes("thread")
        ) {
            console.error("[rust-analyzer stderr]", text);
        }
    });

    proc.on("error", (err) => {
        if (err.code === "ENOENT") {
            console.error(
                `[codeverify] Failed to start "${command}". Is it installed and in PATH?`,
            );
        } else {
            console.error("[rust-analyzer process error]", err);
        }
    });

    function processBuffer() {
        while (true) {
            const headerEnd = buffer.indexOf("\r\n\r\n");
            if (headerEnd === -1) return;

            const header = buffer.slice(0, headerEnd);
            const match = header.match(/Content-Length: (\d+)/i);

            if (!match) {
                // Invalid header — skip past it
                buffer = buffer.slice(headerEnd + 4);
                continue;
            }

            const length = parseInt(match[1], 10);
            const messageStart = headerEnd + 4;
            const messageEnd = messageStart + length;

            if (buffer.length < messageEnd) {
                // Wait for more data
                return;
            }

            const jsonStr = buffer.slice(messageStart, messageEnd);
            buffer = buffer.slice(messageEnd);

            try {
                const msg = JSON.parse(jsonStr);
                handleMessage(msg);
            } catch (err) {
                console.error("[LSP] Failed to parse message:", err);
            }
        }
    }

    function handleMessage(msg) {
        // Response to a request
        if (msg.id !== undefined && pending.has(msg.id)) {
            pending.get(msg.id)(msg.result);
            pending.delete(msg.id);
            return;
        }

        // Notifications
        if (msg.method === "textDocument/publishDiagnostics") {
            diagnosticsMap.set(msg.params.uri, msg.params.diagnostics);
            for (const fn of diagnosticsListeners) {
                fn(msg.params.uri);
            }
            return;
        }
    }

    function send(method, params) {
        const message = {
            jsonrpc: "2.0",
            id: id++,
            method,
            params,
        };

        writeMessage(message);

        return new Promise((resolve) => {
            pending.set(message.id, resolve);
        });
    }

    function notify(method, params) {
        const message = {
            jsonrpc: "2.0",
            method,
            params,
        };

        writeMessage(message);
    }

    function writeMessage(message) {
        const json = JSON.stringify(message);
        const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
        proc.stdin.write(payload);
    }

    return {
        async initialize(rootPath) {
            const rootUri = pathToUri(rootPath);

            await send("initialize", {
                processId: process.pid,
                rootUri,
                capabilities: {
                    textDocument: {
                        publishDiagnostics: {},
                        synchronization: {
                            didSave: true,
                            willSave: false,
                            willSaveWaitUntil: false,
                        },
                    },
                },
            });

            notify("initialized", {});
        },

        async didOpen({ uri, languageId, version, text }) {
            notify("textDocument/didOpen", {
                textDocument: {
                    uri,
                    languageId,
                    version,
                    text,
                },
            });
        },

        async waitForDiagnostics(uri, timeout = 8000, settleMs = 400) {
            const start = Date.now();
            let lastUpdate = null;

            const listener = (updatedUri) => {
                if (updatedUri === uri) lastUpdate = Date.now();
            };
            diagnosticsListeners.add(listener);

            try {
                while (Date.now() - start < timeout) {
                    await new Promise((r) => setTimeout(r, 50));

                    if (
                        lastUpdate !== null &&
                        Date.now() - lastUpdate >= settleMs
                    ) {
                        return diagnosticsMap.get(uri) ?? [];
                    }
                }
            } finally {
                diagnosticsListeners.delete(listener);
            }

            return diagnosticsMap.get(uri) ?? [];
        },

        shutdown() {
            try {
                notify("shutdown");
                notify("exit");
            } catch {
                // ignore
            }

            // Give rust-analyzer a brief moment to flush before killing
            setTimeout(() => {
                proc.kill();
            }, 100).unref();
        },
    };
}

function pathToUri(p) {
    return "file://" + p;
}

export function ensureRustInstalled() {
    const res = spawnSync("rustc", ["--version"]);

    if (res.error) {
        throw new Error(
            `Rust is not installed.\n\nInstall it from: https://rustup.rs/`,
        );
    }
}
