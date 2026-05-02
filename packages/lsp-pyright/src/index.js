import { execFile } from "node:child_process";
import path from "node:path";

/**
 * Map pyright severity strings to codeverify severity strings.
 */
function mapSeverity(pyrightSeverity) {
    switch (pyrightSeverity) {
        case "error":
            return "error";
        case "warning":
            return "warning";
        case "information":
            return "info";
        default:
            return "info";
    }
}

/**
 * Find pyright via PATH or npx.
 * Returns the command and any extra args needed to run pyright.
 */
function resolvePyrightCommand() {
    // Try `npx --yes pyright` — this works whether pyright is globally
    // installed or needs to be fetched from the npm registry.
    return { command: "npx", args: ["--yes", "pyright"] };
}

/**
 * Run pyright CLI on a file and return parsed JSON output.
 */
function runPyright(filePath, cwd) {
    return new Promise((resolve, reject) => {
        const { command, args: baseArgs } = resolvePyrightCommand();
        const args = [...baseArgs, "--outputjson", filePath];

        execFile(
            command,
            args,
            {
                cwd,
                // Increase max buffer to handle large diagnostic output
                maxBuffer: 10 * 1024 * 1024,
            },
            (error, stdout, stderr) => {
                // pyright exits with 0 on success (even when there are diagnostics)
                // and non-zero on internal errors. We still parse the JSON output
                // regardless of exit code.

                if (stdout.length === 0) {
                    const detail = (stderr || "").trim() || "Unknown error";
                    reject(new Error(`Pyright produced no output — ${detail}`));
                    return;
                }

                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (parseErr) {
                    const detail =
                        stderr.trim() ||
                        stdout.trim().slice(0, 200) ||
                        "Failed to parse pyright output";
                    reject(new Error(`Pyright parse error: ${detail}`));
                }
            },
        );
    });
}

export default function pyrightAdapter(options = {}) {
    const { cwd = process.cwd() } = options;

    return {
        name: "codeverify/pyright",

        supports: [".py"],

        async run(filePath) {
            const absPath = path.resolve(filePath);
            const dir = path.dirname(absPath);

            let result;
            try {
                result = await runPyright(absPath, dir);
            } catch (err) {
                // Surface execution errors as a diagnostic rather than crashing
                return [
                    {
                        message: err.message || "Pyright execution failed",
                        severity: "error",
                        file: absPath,
                        line: 0,
                        column: 0,
                        source: "pyright",
                    },
                ];
            }

            // Pyright returns generalDiagnostics array (0-based lines/columns)
            const diagnostics = result.generalDiagnostics || [];

            return diagnostics.map((d) => ({
                message: d.message,
                severity: mapSeverity(d.severity),
                file: d.file || absPath,
                line: d.range?.start?.line ?? 0,
                column: d.range?.start?.character ?? 0,
                endLine: d.range?.end?.line ?? undefined,
                endColumn: d.range?.end?.character ?? undefined,
                ruleId: d.rule ?? undefined,
                source: "pyright",
            }));
        },
    };
}
