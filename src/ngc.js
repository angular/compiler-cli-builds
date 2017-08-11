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
var compiler_1 = require("@angular/compiler");
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
        // CLI arguments can override the i18n options
        var ngcOptions = mergeCommandLine(parsedArgs, ngOptions);
        var res = perform_compile_1.performCompilation(basePath, parsed.fileNames, parsed.options, ngcOptions, consoleError, checkFunc);
        return res.errorCode;
    }
    catch (e) {
        if (compiler_1.isSyntaxError(e)) {
            consoleError(e.message);
            return 1;
        }
        consoleError(e.stack);
        consoleError('Compilation failed');
        return 2;
    }
}
exports.main = main;
// Merge command line parameters
function mergeCommandLine(parsedArgs, options) {
    if (parsedArgs.i18nFile)
        options.i18nInFile = parsedArgs.i18nFile;
    if (parsedArgs.i18nFormat)
        options.i18nInFormat = parsedArgs.i18nFormat;
    if (parsedArgs.locale)
        options.i18nInLocale = parsedArgs.locale;
    var mt = parsedArgs.missingTranslation;
    if (mt === 'error' || mt === 'warning' || mt === 'ignore') {
        options.i18nInMissingTranslations = mt;
    }
    return options;
}
// CLI entry point
if (require.main === module) {
    process.exit(main(process.argv.slice(2), function (s) { return console.error(s); }));
}
//# sourceMappingURL=ngc.js.map