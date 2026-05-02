import { createVerifier } from "codeverify";
import pyright from "@codeverify/pyright";
import eslint from "@codeverify/eslint";
import rust from "@codeverify/rust";
import zls from "@codeverify/zls";

const verifier = createVerifier();

verifier.use(pyright);
verifier.use(eslint);
verifier.use(rust);
verifier.use(zls);

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
