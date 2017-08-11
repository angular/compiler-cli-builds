#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
var tsc = require("@angular/tsc-wrapped");
var fs = require("fs");
var path = require("path");
var ngc = require("./ngc");
var compiler_1 = require("@angular/compiler");
var perform_compile_1 = require("./perform-compile");
var codegen_1 = require("./codegen");
function codegen(ngOptions, cliOptions, program, host) {
    if (ngOptions.enableSummariesForJit === undefined) {
        // default to false
        ngOptions.enableSummariesForJit = false;
    }
    return codegen_1.CodeGenerator.create(ngOptions, cliOptions, program, host).codegen();
}
function main(args, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    var project = args.p || args.project || '.';
    var cliOptions = new tsc.NgcCliOptions(args);
    return tsc.main(project, cliOptions, codegen).then(function () { return 0; }).catch(function (e) {
        if (e instanceof tsc.UserError || compiler_1.isSyntaxError(e)) {
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
    var args = process.argv.slice(2);
    var parsedArgs = require('minimist')(args);
    var project = parsedArgs.p || parsedArgs.project || '.';
    var projectDir = fs.lstatSync(project).isFile() ? path.dirname(project) : project;
    // file names in tsconfig are resolved relative to this absolute path
    var basePath = path.resolve(process.cwd(), projectDir);
    var ngOptions = perform_compile_1.readConfiguration(project, basePath).ngOptions;
    if (ngOptions.disableTransformerPipeline) {
        main(parsedArgs).then(function (exitCode) { return process.exit(exitCode); });
    }
    else {
        process.exit(ngc.main(args, function (s) { return console.error(s); }));
    }
}
//# sourceMappingURL=main.js.map