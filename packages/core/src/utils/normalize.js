export function normalizeDiagnostics(diagnostics = []) {
    let hasErrors = false;
    let hasWarnings = false;

    for (const d of diagnostics) {
        if (d.severity === "error") hasErrors = true;
        if (d.severity === "warning") hasWarnings = true;
    }

    return {
        hasErrors,
        hasWarnings,
        diagnostics,
    };
}
