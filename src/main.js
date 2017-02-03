#!/usr/bin/env node
"use strict";
require('reflect-metadata');
const tsc = require('@angular/tsc-wrapped');
const compiler_1 = require('@angular/compiler');
const codegen_1 = require('./codegen');
function codegen(ngOptions, cliOptions, program, host) {
    return codegen_1.CodeGenerator.create(ngOptions, cliOptions, program, host).codegen();
}
function main(args, consoleError = console.error) {
    const project = args.p || args.project || '.';
    const cliOptions = new tsc.NgcCliOptions(args);
    return tsc.main(project, cliOptions, codegen).then(() => 0).catch(e => {
        if (e instanceof tsc.UserError || e instanceof compiler_1.SyntaxError) {
            consoleError(e.message);
            return Promise.resolve(1);
        }
        else {
            consoleError(e.stack);
            consoleError('Compilation failed');
            return Promise.resolve(1);
        }
    });
}
exports.main = main;
// CLI entry point
if (require.main === module) {
    const args = require('minimist')(process.argv.slice(2));
    main(args).then((exitCode) => process.exit(exitCode));
}
//# sourceMappingURL=main.js.map