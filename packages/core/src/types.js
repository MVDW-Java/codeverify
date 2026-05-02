/**
 * @typedef {"error" | "warning" | "info"} Severity
 */

/**
 * @typedef {Object} Diagnostic
 * @property {string} message
 * @property {Severity} severity
 * @property {string} file
 * @property {number} line
 * @property {number} column
 * @property {string} [source]
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} hasErrors
 * @property {boolean} hasWarnings
 * @property {Diagnostic[]} diagnostics
 */
