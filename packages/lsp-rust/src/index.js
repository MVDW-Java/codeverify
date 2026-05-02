import { createLSPProcess, ensureRustInstalled } from "./lspClient.js";
import { parseDiagnostics } from "@codeverify/normalizer";
import path from "node:path";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

/**
 * Walk up from `dir` looking for a Cargo.toml file.
 * Returns the directory containing Cargo.toml, or the original dir if none found.
 */
async function findCargoRoot(dir) {
    let current = path.resolve(dir);
    const root = path.parse(current).root;
    for (let i = 0; i < 32; i++) {
        try {
            await fs.access(
                path.join(current, "Cargo.toml"),
                fs.constants.F_OK,
            );
            return current;
        } catch {
            // not here
        }
        if (current === root) break;
        current = path.dirname(current);
    }
    return dir;
}

export default function rustAdapter(options = {}) {
    const { command = "rust-analyzer" } = options;

    return {
        name: "codeverify/rust",
        supports: [".rs"],

        async run(filePath) {
            const absPath = path.resolve(filePath);
            const uri = pathToUri(absPath);

            const fileContent = await fs.readFile(absPath, "utf-8");

            ensureRustInstalled();

            // Find the Cargo project root so rust-analyzer can resolve the workspace
            const cargoRoot = await findCargoRoot(path.dirname(absPath));

            const lsp = createLSPProcess(command, cargoRoot);

            try {
                await lsp.initialize(cargoRoot);

                await lsp.didOpen({
                    uri,
                    languageId: "rust",
                    version: 1,
                    text: fileContent,
                });

                const diagnostics = await lsp.waitForDiagnostics(uri);

                return parseDiagnostics(diagnostics, {
                    filePath: absPath,
                    source: "rust-analyzer",
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
