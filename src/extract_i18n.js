#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const api = require("./transformers/api");
const main_1 = require("./main");
function mainXi18n(args, consoleError = console.error) {
    const config = readXi18nCommandLineAndConfiguration(args);
    return main_1.main(args, consoleError, config);
}
exports.mainXi18n = mainXi18n;
function readXi18nCommandLineAndConfiguration(args) {
    const options = {};
    const parsedArgs = require('minimist')(args);
    if (parsedArgs.outFile)
        options.i18nOutFile = parsedArgs.outFile;
    if (parsedArgs.i18nFormat)
        options.i18nOutFormat = parsedArgs.i18nFormat;
    if (parsedArgs.locale)
        options.i18nOutLocale = parsedArgs.locale;
    const config = main_1.readCommandLineAndConfiguration(args, options, [
        'outFile',
        'i18nFormat',
        'locale',
    ]);
    // only emit the i18nBundle but nothing else.
    return Object.assign({}, config, { emitFlags: api.EmitFlags.I18nBundle });
}
// Entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    process.exitCode = mainXi18n(args);
}
//# sourceMappingURL=extract_i18n.js.map