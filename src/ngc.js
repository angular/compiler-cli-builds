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
var tsc_wrapped_1 = require("@angular/tsc-wrapped");
var fs = require("fs");
var path = require("path");
var ts = require("typescript");
var api = require("./transformers/api");
var ng = require("./transformers/entry_points");
var TS_EXT = /\.ts$/;
function isTsDiagnostics(diagnostics) {
    return diagnostics && diagnostics[0] && (diagnostics[0].file || diagnostics[0].messageText);
}
function formatDiagnostics(cwd, diags) {
    if (diags && diags.length) {
        if (isTsDiagnostics(diags)) {
            return ts.formatDiagnostics(diags, {
                getCurrentDirectory: function () { return cwd; },
                getCanonicalFileName: function (fileName) { return fileName; },
                getNewLine: function () { return '\n'; }
            });
        }
        else {
            return diags
                .map(function (d) {
                var res = api.DiagnosticCategory[d.category];
                if (d.span) {
                    res +=
                        " at " + d.span.start.file.url + "(" + (d.span.start.line + 1) + "," + (d.span.start.col + 1) + ")";
                }
                if (d.span && d.span.details) {
                    res += ": " + d.span.details + ", " + d.message + "\n";
                }
                else {
                    res += ": " + d.message + "\n";
                }
                return res;
            })
                .join();
        }
    }
    else
        return '';
}
function check(cwd) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (args.some(function (diags) { return !!(diags && diags[0]); })) {
        throw compiler_1.syntaxError(args.map(function (diags) {
            if (diags && diags[0]) {
                return formatDiagnostics(cwd, diags);
            }
        })
            .filter(function (message) { return !!message; })
            .join(''));
    }
}
function syntheticError(message) {
    return {
        file: null,
        start: 0,
        length: 0,
        messageText: message,
        category: ts.DiagnosticCategory.Error,
        code: 0
    };
}
function readConfiguration(project, basePath, existingOptions) {
    // Allow a directory containing tsconfig.json as the project value
    // Note, TS@next returns an empty array, while earlier versions throw
    var projectFile = fs.lstatSync(project).isDirectory() ? path.join(project, 'tsconfig.json') : project;
    var _a = ts.readConfigFile(projectFile, ts.sys.readFile), config = _a.config, error = _a.error;
    if (error)
        check(basePath, [error]);
    var parseConfigHost = {
        useCaseSensitiveFileNames: true,
        fileExists: fs.existsSync,
        readDirectory: ts.sys.readDirectory,
        readFile: ts.sys.readFile
    };
    var parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingOptions);
    check(basePath, parsed.errors);
    // Default codegen goes to the current directory
    // Parsed options are already converted to absolute paths
    var ngOptions = config.angularCompilerOptions || {};
    // Ignore the genDir option
    ngOptions.genDir = basePath;
    for (var _i = 0, _b = Object.keys(parsed.options); _i < _b.length; _i++) {
        var key = _b[_i];
        ngOptions[key] = parsed.options[key];
    }
    return { parsed: parsed, ngOptions: ngOptions };
}
exports.readConfiguration = readConfiguration;
function main(args, consoleError) {
    if (consoleError === void 0) { consoleError = console.error; }
    try {
        var parsedArgs = require('minimist')(args);
        var project = parsedArgs.p || parsedArgs.project || '.';
        var projectDir = fs.lstatSync(project).isFile() ? path.dirname(project) : project;
        // file names in tsconfig are resolved relative to this absolute path
        var basePath_1 = path.resolve(process.cwd(), projectDir);
        var _a = readConfiguration(project, basePath_1), parsed = _a.parsed, ngOptions = _a.ngOptions;
        ngOptions.basePath = basePath_1;
        var host = ts.createCompilerHost(parsed.options, true);
        var rootFileNames_1 = parsed.fileNames.slice(0);
        var addGeneratedFileName = function (fileName) {
            if (fileName.startsWith(basePath_1) && TS_EXT.exec(fileName)) {
                rootFileNames_1.push(fileName);
            }
        };
        if (ngOptions.flatModuleOutFile && !ngOptions.skipMetadataEmit) {
            var _b = tsc_wrapped_1.createBundleIndexHost(ngOptions, rootFileNames_1, host), bundleHost = _b.host, indexName = _b.indexName, errors = _b.errors;
            if (errors)
                check(basePath_1, errors);
            if (indexName)
                addGeneratedFileName(indexName);
            host = bundleHost;
        }
        var ngHost = ng.createHost({ tsHost: host, options: ngOptions });
        var ngProgram = ng.createProgram({ rootNames: rootFileNames_1, host: ngHost, options: ngOptions });
        // Check parameter diagnostics
        check(basePath_1, ngProgram.getTsOptionDiagnostics(), ngProgram.getNgOptionDiagnostics());
        // Check syntactic diagnostics
        check(basePath_1, ngProgram.getTsSyntacticDiagnostics());
        // Check TypeScript semantic and Angular structure diagnostics
        check(basePath_1, ngProgram.getTsSemanticDiagnostics(), ngProgram.getNgStructuralDiagnostics());
        // Check Angular semantic diagnostics
        check(basePath_1, ngProgram.getNgSemanticDiagnostics());
        ngProgram.emit({
            emitFlags: api.EmitFlags.Default |
                ((ngOptions.skipMetadataEmit || ngOptions.flatModuleOutFile) ? 0 : api.EmitFlags.Metadata)
        });
    }
    catch (e) {
        if (compiler_1.isSyntaxError(e)) {
            consoleError(e.message);
            return 1;
        }
        else {
            consoleError(e.stack);
            consoleError('Compilation failed');
            return 2;
        }
    }
    return 0;
}
exports.main = main;
// CLI entry point
if (require.main === module) {
    process.exit(main(process.argv.slice(2), function (s) { return console.error(s); }));
}
//# sourceMappingURL=ngc.js.map