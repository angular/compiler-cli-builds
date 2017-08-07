"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Must be imported first, because Angular decorators throw on load.
require("reflect-metadata");
var fs = require("fs");
var path = require("path");
var perform_compile_1 = require("./perform-compile");
function main(args, consoleError, checkFunc) {
    if (consoleError === void 0) { consoleError = console.error; }
    if (checkFunc === void 0) { checkFunc = perform_compile_1.throwOnDiagnostics; }
    try {
        var parsedArgs = require('minimist')(args);
        var project = parsedArgs.p || parsedArgs.project || '.';
        var projectDir = fs.lstatSync(project).isFile() ? path.dirname(project) : project;
        // file names in tsconfig are resolved relative to this absolute path
        var basePath = path.resolve(process.cwd(), projectDir);
        var _a = perform_compile_1.readConfiguration(project, basePath, checkFunc), parsed = _a.parsed, ngOptions = _a.ngOptions;
        return perform_compile_1.performCompilation(basePath, parsed.fileNames, parsed.options, ngOptions, consoleError, checkFunc);
    }
    catch (e) {
        consoleError(e.stack);
        consoleError('Compilation failed');
        return 2;
    }
}
exports.main = main;
// CLI entry point
if (require.main === module) {
    process.exit(main(process.argv.slice(2), function (s) { return console.error(s); }));
}
//# sourceMappingURL=ngc.js.map