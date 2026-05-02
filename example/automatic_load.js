import { createVerifier } from "codeverify";
import autoload from "@codeverify/autoload";

const verifier = createVerifier();

const loaded = await autoload.loadAll(verifier, import.meta);
console.log(
    `Loaded ${loaded} adapter(s) from installed @codeverify/* packages\n`,
);

// --- Test Zig ---
const zigResult = await verifier.verify("./test_files/zig/test.zig");

console.log("=== Zig Result ===");
console.log(JSON.stringify(zigResult, null, 2));

// --- Test JavaScript ---
const jsResult = await verifier.verify("./test_files/js/test.js");

console.log("\n=== JS Result ===");
console.log(JSON.stringify(jsResult, null, 2));

// --- Test Python ---
const pyResult = await verifier.verify("./test_files/py/test.py");

console.log("\n=== Python Result ===");
console.log(JSON.stringify(pyResult, null, 2));

// --- Test Rust ---
const rustResult = await verifier.verify("./test_files/rs/src/main.rs");

console.log("\n=== Rust Result ===");
console.log(JSON.stringify(rustResult, null, 2));
