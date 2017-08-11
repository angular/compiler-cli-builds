"use strict";
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
                getNewLine: function () { return ts.sys.newLine; }
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
/**
 * Throw a syntax error exception with a message formatted for output
 * if the args parameter contains diagnostics errors.
 *
 * @param cwd   The directory to report error as relative to.
 * @param args  A list of potentially empty diagnostic errors.
 */
function throwOnDiagnostics(cwd) {
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
exports.throwOnDiagnostics = throwOnDiagnostics;
function readConfiguration(project, basePath, checkFunc, existingOptions) {
    if (checkFunc === void 0) { checkFunc = throwOnDiagnostics; }
    // Allow a directory containing tsconfig.json as the project value
    // Note, TS@next returns an empty array, while earlier versions throw
    var projectFile = fs.lstatSync(project).isDirectory() ? path.join(project, 'tsconfig.json') : project;
    var _a = ts.readConfigFile(projectFile, ts.sys.readFile), config = _a.config, error = _a.error;
    if (error)
        checkFunc(basePath, [error]);
    var parseConfigHost = {
        useCaseSensitiveFileNames: true,
        fileExists: fs.existsSync,
        readDirectory: ts.sys.readDirectory,
        readFile: ts.sys.readFile
    };
    var parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingOptions);
    checkFunc(basePath, parsed.errors);
    // Default codegen goes to the current directory
    // Parsed options are already converted to absolute paths
    var ngOptions = config.angularCompilerOptions || {};
    // Ignore the genDir option
    ngOptions.genDir = basePath;
    return { parsed: parsed, ngOptions: ngOptions };
}
exports.readConfiguration = readConfiguration;
/**
 * Returns an object with two properties:
 * - `errorCode` is 0 when the compilation was successful,
 * - `result` is an `EmitResult` when the errorCode is 0, `undefined` otherwise.
 */
function performCompilation(basePath, files, options, ngOptions, consoleError, checkFunc, tsCompilerHost) {
    if (consoleError === void 0) { consoleError = console.error; }
    if (checkFunc === void 0) { checkFunc = throwOnDiagnostics; }
    var _a = ts.version.split('.'), major = _a[0], minor = _a[1];
    if (+major < 2 || (+major === 2 && +minor < 3)) {
        throw new Error('Must use TypeScript > 2.3 to have transformer support');
    }
    try {
        ngOptions.basePath = basePath;
        ngOptions.genDir = basePath;
        var host = tsCompilerHost || ts.createCompilerHost(options, true);
        host.realpath = function (p) { return p; };
        var rootFileNames_1 = files.map(function (f) { return path.normalize(f); });
        var addGeneratedFileName = function (fileName) {
            if (fileName.startsWith(basePath) && TS_EXT.exec(fileName)) {
                rootFileNames_1.push(fileName);
            }
        };
        if (ngOptions.flatModuleOutFile && !ngOptions.skipMetadataEmit) {
            var _b = tsc_wrapped_1.createBundleIndexHost(ngOptions, rootFileNames_1, host), bundleHost = _b.host, indexName = _b.indexName, errors = _b.errors;
            if (errors)
                checkFunc(basePath, errors);
            if (indexName)
                addGeneratedFileName(indexName);
            host = bundleHost;
        }
        var ngHostOptions = __assign({}, options, ngOptions);
        var ngHost = ng.createHost({ tsHost: host, options: ngHostOptions });
        var ngProgram = ng.createProgram({ rootNames: rootFileNames_1, host: ngHost, options: ngHostOptions });
        // Check parameter diagnostics
        checkFunc(basePath, ngProgram.getTsOptionDiagnostics(), ngProgram.getNgOptionDiagnostics());
        // Check syntactic diagnostics
        checkFunc(basePath, ngProgram.getTsSyntacticDiagnostics());
        // Check TypeScript semantic and Angular structure diagnostics
        checkFunc(basePath, ngProgram.getTsSemanticDiagnostics(), ngProgram.getNgStructuralDiagnostics());
        // Check Angular semantic diagnostics
        checkFunc(basePath, ngProgram.getNgSemanticDiagnostics());
        var result = ngProgram.emit({
            emitFlags: api.EmitFlags.Default |
                ((ngOptions.skipMetadataEmit || ngOptions.flatModuleOutFile) ? 0 : api.EmitFlags.Metadata)
        });
        checkFunc(basePath, result.diagnostics);
        return { errorCode: 0, result: result };
    }
    catch (e) {
        if (compiler_1.isSyntaxError(e)) {
            consoleError(e.message);
            return { errorCode: 1 };
        }
        throw e;
    }
}
exports.performCompilation = performCompilation;
//# sourceMappingURL=perform-compile.js.map