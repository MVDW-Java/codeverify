// LSP DiagnosticSeverity:
// 1 = Error
// 2 = Warning
// 3 = Information
// 4 = Hint

export function mapSeverity(lspSeverity) {
    switch (lspSeverity) {
        case 1:
            return "error";
        case 2:
            return "warning";
        case 3:
            return "info";
        case 4:
            return "info";
        default:
            return "info";
    }
}
