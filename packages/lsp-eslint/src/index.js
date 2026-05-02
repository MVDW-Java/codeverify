import { ESLint } from "eslint";
import path from "node:path";
import fs from "node:fs/promises";

const CONFIG_NAMES = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
];

/**
 * Map ESLint severity (1=warn, 2=error) to codeverify severity.
 */
function mapSeverity(eslintSeverity) {
    switch (eslintSeverity) {
        case 2:
            return "error";
        case 1:
            return "warning";
        default:
            return "info";
    }
}

/**
 * Walk up from `dir` looking for an ESLint flat config file.
 * Returns the full path if found, or null.
 */
async function findExistingConfig(dir) {
    let current = path.resolve(dir);
    // Keep a cap on how far up we'll climb
    const root = path.parse(current).root;
    for (let i = 0; i < 32; i++) {
        for (const name of CONFIG_NAMES) {
            const candidate = path.join(current, name);
            try {
                await fs.access(candidate, fs.constants.F_OK);
                return candidate;
            } catch {
                // not here
            }
        }
        if (current === root) break;
        current = path.dirname(current);
    }
    return null;
}

/**
 * Default ESLint config used when no project config is found.
 * Enables a sensible set of recommended-lite rules.
 */
function createDefaultConfig() {
    return [
        {
            rules: {
                "no-unused-vars": "warn",
                "no-undef": "off",
                "no-extra-semi": "warn",
                "no-empty": "warn",
                "no-irregular-whitespace": "error",
                "no-unused-expressions": "warn",
                "no-var": "warn",
                "prefer-const": "warn",
                "no-duplicate-imports": "warn",
                "no-console": "off",
            },
        },
    ];
}

export default function eslintAdapter(options = {}) {
    return {
        name: "codeverify/eslint",

        supports: [
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            ".mjs",
            ".cjs",
            ".mts",
            ".cts",
        ],

        async run(filePath) {
            const absPath = path.resolve(filePath);
            const dir = path.dirname(absPath);

            let tempConfigPath = null;

            // Check whether a config already exists in the project tree
            const existing = await findExistingConfig(dir);

            if (!existing) {
                // Write a temporary config in the project directory so ESLint v10 can find it
                tempConfigPath = path.join(dir, "eslint.config.mjs");
                const configContent = `export default ${JSON.stringify(createDefaultConfig())};`;
                await fs.writeFile(tempConfigPath, configContent, "utf-8");
            }

            try {
                const eslint = new ESLint({
                    cwd: dir,
                    errorOnUnmatchedPattern: false,
                    globInputPaths: false,
                    fix: false,
                });

                const results = await eslint.lintFiles([absPath]);

                if (results.length === 0) {
                    return [];
                }

                const result = results[0];

                // Surface fatal errors (e.g. config parsing failures)
                const fatalMessages = result.messages.filter((m) => m.fatal);
                if (fatalMessages.length > 0) {
                    return fatalMessages.map((m) => ({
                        message: m.message,
                        severity: "error",
                        file: absPath,
                        line: (m.line || 1) - 1,
                        column: (m.column || 1) - 1,
                        source: "eslint",
                    }));
                }

                return result.messages.map((msg) => ({
                    message: msg.message,
                    severity: mapSeverity(msg.severity),
                    file: absPath,
                    line: (msg.line || 1) - 1,
                    column: (msg.column || 1) - 1,
                    endLine: msg.endLine ? msg.endLine - 1 : undefined,
                    endColumn: msg.endColumn ? msg.endColumn - 1 : undefined,
                    ruleId: msg.ruleId ?? undefined,
                    source: "eslint",
                }));
            } finally {
                // Clean up temporary config if we created one
                if (tempConfigPath) {
                    try {
                        await fs.unlink(tempConfigPath);
                    } catch {
                        // best-effort cleanup
                    }
                }
            }
        },
    };
}
