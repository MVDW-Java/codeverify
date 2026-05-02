import { normalizeDiagnostics } from "./utils/normalize.js";
import path from "node:path";

export class Verifier {
    constructor() {
        /** @type {Map<string, any>} */
        this.adapters = new Map();
    }

    /**
     * Register a plugin/adapter
     * @param {Function} pluginFn
     */
    use(pluginFn) {
        const plugin = pluginFn();

        if (!plugin || !plugin.name || !plugin.run) {
            throw new Error("Invalid plugin: must provide name and run()");
        }

        this.adapters.set(plugin.name, plugin);
        return this;
    }

    /**
     * Resolve adapters that support a file
     */
    _getAdaptersForFile(filePath) {
        const ext = path.extname(filePath);

        return [...this.adapters.values()].filter((adapter) =>
            adapter.supports?.includes(ext),
        );
    }

    /**
     * Run verification
     */
    async verify(filePath, options = {}) {
        const adapters = this._getAdaptersForFile(filePath);

        if (adapters.length === 0) {
            return {
                hasErrors: false,
                hasWarnings: false,
                diagnostics: [],
            };
        }

        const results = await Promise.all(
            adapters.map(async (adapter) => {
                try {
                    const diagnostics = await adapter.run(filePath, {
                        options,
                        adapterName: adapter.name,
                    });

                    return diagnostics.map((d) => ({
                        ...d,
                        source: d.source || adapter.name,
                    }));
                } catch (err) {
                    return [
                        {
                            message: err.message || "Adapter failed",
                            severity: "error",
                            file: filePath,
                            line: 0,
                            column: 0,
                            source: adapter.name,
                        },
                    ];
                }
            }),
        );

        const flat = results.flat();

        return normalizeDiagnostics(flat);
    }
}
