import { createRequire } from "node:module";

/**
 * Known @codeverify/* adapter packages and their file extensions.
 * These are loaded lazily — if the package isn't installed, it's silently skipped.
 */
const ADAPTER_PACKAGES = [
    {
        name: "@codeverify/eslint",
        extensions: [
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            ".mjs",
            ".cjs",
            ".mts",
            ".cts",
        ],
    },
    { name: "@codeverify/pyright", extensions: [".py"] },
    { name: "@codeverify/rust", extensions: [".rs"] },
    { name: "@codeverify/zls", extensions: [".zig"] },
];

/**
 * Try to resolve and import an adapter package from the caller's perspective.
 *
 * Resolution uses `createRequire(callerURL).resolve(pkgName)` to find the
 * package from the caller's module graph, then `import()` on the resolved
 * absolute file path so it works regardless of who calls this function.
 *
 * Returns the default-exported adapter function, or null if the package
 * is not installed (or doesn't export a valid adapter).
 */
async function tryLoadAdapter(pkgName, callerURL) {
    try {
        const callerRequire = createRequire(callerURL);
        const resolved = callerRequire.resolve(pkgName);
        const mod = await import(resolved);
        if (typeof mod.default === "function") {
            return mod.default;
        }
        return null;
    } catch {
        // Package not installed — expected, silently skip
        return null;
    }
}

/**
 * Register all available @codeverify/* adapters onto a Verifier instance.
 *
 * @param {import("codeverify").Verifier} verifier - A codeverify Verifier instance
 * @param {ImportMeta} [importMeta] - Pass the caller's `import.meta` so adapter
 *        resolution uses the caller's package context.
 * @returns {Promise<number>} - Number of adapters successfully loaded
 */
export async function loadAll(verifier, importMeta) {
    const callerURL = importMeta?.url;
    if (!callerURL) {
        throw new Error(
            "autoload.loadAll() requires import.meta as the second argument. " +
                "Call it as: autoload.loadAll(verifier, import.meta)",
        );
    }

    let count = 0;

    for (const { name } of ADAPTER_PACKAGES) {
        const adapterFn = await tryLoadAdapter(name, callerURL);
        if (adapterFn) {
            verifier.use(adapterFn);
            count++;
        }
    }

    return count;
}

/**
 * Return a list of which file extensions have an available adapter.
 * Useful for quickly checking if a file can be verified.
 *
 * @param {ImportMeta} [importMeta] - The caller's `import.meta` (see loadAll).
 * @returns {Promise<string[]>} - List of supported file extensions
 */
export async function getSupportedExtensions(importMeta) {
    const callerURL = importMeta?.url;
    if (!callerURL) {
        throw new Error(
            "autoload.getSupportedExtensions() requires import.meta as the " +
                "first argument. Call it as: autoload.getSupportedExtensions(import.meta)",
        );
    }

    const extensions = new Set();

    for (const { name, extensions: exts } of ADAPTER_PACKAGES) {
        const adapterFn = await tryLoadAdapter(name, callerURL);
        if (adapterFn) {
            const plugin = adapterFn();
            if (plugin && plugin.supports) {
                for (const ext of plugin.supports) {
                    extensions.add(ext);
                }
            } else {
                for (const ext of exts) {
                    extensions.add(ext);
                }
            }
        }
    }

    return [...extensions];
}

export default { loadAll, getSupportedExtensions };
