import { mapSeverity } from "./severity.js";

/**
 * Normalize LSP diagnostics into CodeVerify format
 */
export function parseDiagnostics(lspDiagnostics, options = {}) {
    const {
        filePath,
        source,
        severityMap, // optional override
        transformMessage,
    } = options;

    return lspDiagnostics.map((diag) => {
        const severity = severityMap
            ? severityMap(diag.severity)
            : mapSeverity(diag.severity);

        const message = transformMessage
            ? transformMessage(diag.message, diag)
            : diag.message;

        return {
            message,
            severity,
            file: filePath,
            line: diag.range?.start?.line ?? 0,
            column: diag.range?.start?.character ?? 0,
            source: source || diag.source,
        };
    });
}
