import { createVerifier } from "codeverify";
import eslint from "@codeverify/eslint";
import zls from "@codeverify/zls";
import pyright from "@codeverify/pyright";
import rust from "@codeverify/rust";

const verifier = createVerifier();

verifier.use(eslint);
verifier.use(zls);
verifier.use(pyright);
verifier.use(rust);

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
