import { Verifier } from "./verifier.js";

/**
 * Factory (recommended)
 */
export function createVerifier() {
    return new Verifier();
}

/**
 * Convenience singleton (optional)
 */
const defaultVerifier = new Verifier();

export const use = (plugin) => {
    defaultVerifier.use(plugin);
    return defaultVerifier;
};

export const verify = (...args) => {
    return defaultVerifier.verify(...args);
};
