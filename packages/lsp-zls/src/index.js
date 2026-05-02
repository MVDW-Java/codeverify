import { createLSPProcess, ensureZigInstalled } from "./lspClient.js";
import { parseDiagnostics } from "@codeverify/normalizer";
import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

export default function zigAdapter(options = {}) {
    const { command = "zls", cwd = process.cwd() } = options;

    return {
        name: "codeverify/zls",
        supports: [".zig"],

        async run(filePath) {
            const absPath = path.resolve(filePath);
            const uri = pathToUri(absPath);

            const fileContent = await fs.readFile(absPath, "utf-8");

            ensureZigInstalled();

            const lsp = createLSPProcess(command, cwd);

            try {
                await lsp.initialize(cwd);

                await lsp.didOpen({
                    uri,
                    languageId: "zig",
                    version: 1,
                    text: fileContent,
                });

                const diagnostics = await lsp.waitForDiagnostics(uri);

                return parseDiagnostics(diagnostics, {
                    filePath: absPath,
                    source: "zls",
                });
            } finally {
                lsp.shutdown();
            }
        },
    };
}

function pathToUri(p) {
    return pathToFileURL(path.resolve(p)).href;
}
