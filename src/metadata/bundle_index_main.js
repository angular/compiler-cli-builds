#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const ts = require("typescript");
const main_1 = require("../main");
const bundle_index_host_1 = require("./bundle_index_host");
const ng = require("../transformers/entry_points");
function main(args, consoleError = console.error) {
    const { options, rootNames } = main_1.readCommandLineAndConfiguration(args);
    const host = ng.createCompilerHost({ options });
    const { host: bundleHost, indexName, errors } = bundle_index_host_1.createBundleIndexHost(options, rootNames, host);
    if (!indexName) {
        console.error('Did not find an index.ts in the top-level of the package.');
        return 1;
    }
    // The index file is synthetic, so we have to add it to the program after parsing the tsconfig
    rootNames.push(indexName);
    const program = ts.createProgram(rootNames, options, bundleHost);
    const indexSourceFile = program.getSourceFile(indexName);
    if (!indexSourceFile) {
        console.error(`${indexSourceFile} is not in the program. Please file a bug.`);
        return 1;
    }
    program.emit(indexSourceFile);
    return 0;
}
exports.main = main;
// CLI entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    process.exitCode = main(args);
}
//# sourceMappingURL=bundle_index_main.js.map