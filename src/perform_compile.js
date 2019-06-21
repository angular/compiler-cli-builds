/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/perform_compile", ["require", "exports", "tslib", "@angular/compiler", "fs", "path", "typescript", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var fs = require("fs");
    var path = require("path");
    var ts = require("typescript");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var ng = require("@angular/compiler-cli/src/transformers/entry_points");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    var TS_EXT = /\.ts$/;
    function filterErrorsAndWarnings(diagnostics) {
        return diagnostics.filter(function (d) { return d.category !== ts.DiagnosticCategory.Message; });
    }
    exports.filterErrorsAndWarnings = filterErrorsAndWarnings;
    var defaultFormatHost = {
        getCurrentDirectory: function () { return ts.sys.getCurrentDirectory(); },
        getCanonicalFileName: function (fileName) { return fileName; },
        getNewLine: function () { return ts.sys.newLine; }
    };
    function displayFileName(fileName, host) {
        return path.relative(host.getCurrentDirectory(), host.getCanonicalFileName(fileName));
    }
    function formatDiagnosticPosition(position, host) {
        if (host === void 0) { host = defaultFormatHost; }
        return displayFileName(position.fileName, host) + "(" + (position.line + 1) + "," + (position.column + 1) + ")";
    }
    exports.formatDiagnosticPosition = formatDiagnosticPosition;
    function flattenDiagnosticMessageChain(chain, host) {
        if (host === void 0) { host = defaultFormatHost; }
        var result = chain.messageText;
        var indent = 1;
        var current = chain.next;
        var newLine = host.getNewLine();
        while (current) {
            result += newLine;
            for (var i = 0; i < indent; i++) {
                result += '  ';
            }
            result += current.messageText;
            var position = current.position;
            if (position) {
                result += " at " + formatDiagnosticPosition(position, host);
            }
            current = current.next;
            indent++;
        }
        return result;
    }
    exports.flattenDiagnosticMessageChain = flattenDiagnosticMessageChain;
    function formatDiagnostic(diagnostic, host) {
        if (host === void 0) { host = defaultFormatHost; }
        var result = '';
        var newLine = host.getNewLine();
        var span = diagnostic.span;
        if (span) {
            result += formatDiagnosticPosition({
                fileName: span.start.file.url,
                line: span.start.line,
                column: span.start.col
            }, host) + ": ";
        }
        else if (diagnostic.position) {
            result += formatDiagnosticPosition(diagnostic.position, host) + ": ";
        }
        if (diagnostic.span && diagnostic.span.details) {
            result += ": " + diagnostic.span.details + ", " + diagnostic.messageText + newLine;
        }
        else if (diagnostic.chain) {
            result += flattenDiagnosticMessageChain(diagnostic.chain, host) + "." + newLine;
        }
        else {
            result += ": " + diagnostic.messageText + newLine;
        }
        return result;
    }
    exports.formatDiagnostic = formatDiagnostic;
    function formatDiagnostics(diags, host) {
        if (host === void 0) { host = defaultFormatHost; }
        if (diags && diags.length) {
            return diags
                .map(function (diagnostic) {
                if (api.isTsDiagnostic(diagnostic)) {
                    return ts.formatDiagnostics([diagnostic], host);
                }
                else {
                    return formatDiagnostic(diagnostic, host);
                }
            })
                .join('');
        }
        else {
            return '';
        }
    }
    exports.formatDiagnostics = formatDiagnostics;
    function calcProjectFileAndBasePath(project) {
        var projectIsDir = fs.lstatSync(project).isDirectory();
        var projectFile = projectIsDir ? path.join(project, 'tsconfig.json') : project;
        var projectDir = projectIsDir ? project : path.dirname(project);
        var basePath = path.resolve(process.cwd(), projectDir);
        return { projectFile: projectFile, basePath: basePath };
    }
    exports.calcProjectFileAndBasePath = calcProjectFileAndBasePath;
    function createNgCompilerOptions(basePath, config, tsOptions) {
        // enableIvy `ngtsc` is an alias for `true`.
        if (config.angularCompilerOptions && config.angularCompilerOptions.enableIvy === 'ngtsc') {
            config.angularCompilerOptions.enableIvy = true;
        }
        return tslib_1.__assign({}, tsOptions, config.angularCompilerOptions, { genDir: basePath, basePath: basePath });
    }
    exports.createNgCompilerOptions = createNgCompilerOptions;
    function readConfiguration(project, existingOptions) {
        try {
            var _a = calcProjectFileAndBasePath(project), projectFile = _a.projectFile, basePath = _a.basePath;
            var readExtendedConfigFile_1 = function (configFile, existingConfig) {
                var _a = ts.readConfigFile(configFile, ts.sys.readFile), config = _a.config, error = _a.error;
                if (error) {
                    return { error: error };
                }
                // we are only interested into merging 'angularCompilerOptions' as
                // other options like 'compilerOptions' are merged by TS
                var baseConfig = existingConfig || config;
                if (existingConfig) {
                    baseConfig.angularCompilerOptions = tslib_1.__assign({}, config.angularCompilerOptions, baseConfig.angularCompilerOptions);
                }
                if (config.extends) {
                    var extendedConfigPath = path.resolve(path.dirname(configFile), config.extends);
                    extendedConfigPath = path.extname(extendedConfigPath) ? extendedConfigPath :
                        extendedConfigPath + ".json";
                    if (fs.existsSync(extendedConfigPath)) {
                        // Call read config recursively as TypeScript only merges CompilerOptions
                        return readExtendedConfigFile_1(extendedConfigPath, baseConfig);
                    }
                }
                return { config: baseConfig };
            };
            var _b = readExtendedConfigFile_1(projectFile), config = _b.config, error = _b.error;
            if (error) {
                return {
                    project: project,
                    errors: [error],
                    rootNames: [],
                    options: {},
                    emitFlags: api.EmitFlags.Default
                };
            }
            var parseConfigHost = {
                useCaseSensitiveFileNames: true,
                fileExists: fs.existsSync,
                readDirectory: ts.sys.readDirectory,
                readFile: ts.sys.readFile
            };
            var configFileName = path.resolve(process.cwd(), projectFile);
            var parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingOptions, configFileName);
            var rootNames = parsed.fileNames.map(function (f) { return path.normalize(f); });
            var options = createNgCompilerOptions(basePath, config, parsed.options);
            var emitFlags = api.EmitFlags.Default;
            if (!(options.skipMetadataEmit || options.flatModuleOutFile)) {
                emitFlags |= api.EmitFlags.Metadata;
            }
            if (options.skipTemplateCodegen) {
                emitFlags = emitFlags & ~api.EmitFlags.Codegen;
            }
            return { project: projectFile, rootNames: rootNames, options: options, errors: parsed.errors, emitFlags: emitFlags };
        }
        catch (e) {
            var errors = [{
                    category: ts.DiagnosticCategory.Error,
                    messageText: e.stack,
                    source: api.SOURCE,
                    code: api.UNKNOWN_ERROR_CODE
                }];
            return { project: '', errors: errors, rootNames: [], options: {}, emitFlags: api.EmitFlags.Default };
        }
    }
    exports.readConfiguration = readConfiguration;
    function exitCodeFromResult(diags) {
        if (!diags || filterErrorsAndWarnings(diags).length === 0) {
            // If we have a result and didn't get any errors, we succeeded.
            return 0;
        }
        // Return 2 if any of the errors were unknown.
        return diags.some(function (d) { return d.source === 'angular' && d.code === api.UNKNOWN_ERROR_CODE; }) ? 2 : 1;
    }
    exports.exitCodeFromResult = exitCodeFromResult;
    function performCompilation(_a) {
        var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram, emitCallback = _a.emitCallback, mergeEmitResultsCallback = _a.mergeEmitResultsCallback, _b = _a.gatherDiagnostics, gatherDiagnostics = _b === void 0 ? defaultGatherDiagnostics : _b, customTransformers = _a.customTransformers, _c = _a.emitFlags, emitFlags = _c === void 0 ? api.EmitFlags.Default : _c, modifiedResourceFiles = _a.modifiedResourceFiles;
        var program;
        var emitResult;
        var allDiagnostics = [];
        try {
            if (!host) {
                host = ng.createCompilerHost({ options: options });
            }
            if (modifiedResourceFiles) {
                host.getModifiedResourceFiles = function () { return modifiedResourceFiles; };
            }
            program = ng.createProgram({ rootNames: rootNames, host: host, options: options, oldProgram: oldProgram });
            var beforeDiags = Date.now();
            allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(gatherDiagnostics(program)));
            if (options.diagnostics) {
                var afterDiags = Date.now();
                allDiagnostics.push(util_1.createMessageDiagnostic("Time for diagnostics: " + (afterDiags - beforeDiags) + "ms."));
            }
            if (!hasErrors(allDiagnostics)) {
                emitResult =
                    program.emit({ emitCallback: emitCallback, mergeEmitResultsCallback: mergeEmitResultsCallback, customTransformers: customTransformers, emitFlags: emitFlags });
                allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(emitResult.diagnostics));
                return { diagnostics: allDiagnostics, program: program, emitResult: emitResult };
            }
            return { diagnostics: allDiagnostics, program: program };
        }
        catch (e) {
            var errMsg = void 0;
            var code = void 0;
            if (compiler_1.isSyntaxError(e)) {
                // don't report the stack for syntax errors as they are well known errors.
                errMsg = e.message;
                code = api.DEFAULT_ERROR_CODE;
            }
            else {
                errMsg = e.stack;
                // It is not a syntax error we might have a program with unknown state, discard it.
                program = undefined;
                code = api.UNKNOWN_ERROR_CODE;
            }
            allDiagnostics.push({ category: ts.DiagnosticCategory.Error, messageText: errMsg, code: code, source: api.SOURCE });
            return { diagnostics: allDiagnostics, program: program };
        }
    }
    exports.performCompilation = performCompilation;
    function defaultGatherDiagnostics(program) {
        var allDiagnostics = [];
        function checkDiagnostics(diags) {
            if (diags) {
                allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diags));
                return !hasErrors(diags);
            }
            return true;
        }
        var checkOtherDiagnostics = true;
        // Check parameter diagnostics
        checkOtherDiagnostics = checkOtherDiagnostics &&
            checkDiagnostics(tslib_1.__spread(program.getTsOptionDiagnostics(), program.getNgOptionDiagnostics()));
        // Check syntactic diagnostics
        checkOtherDiagnostics =
            checkOtherDiagnostics && checkDiagnostics(program.getTsSyntacticDiagnostics());
        // Check TypeScript semantic and Angular structure diagnostics
        checkOtherDiagnostics =
            checkOtherDiagnostics &&
                checkDiagnostics(tslib_1.__spread(program.getTsSemanticDiagnostics(), program.getNgStructuralDiagnostics()));
        // Check Angular semantic diagnostics
        checkOtherDiagnostics =
            checkOtherDiagnostics && checkDiagnostics(program.getNgSemanticDiagnostics());
        return allDiagnostics;
    }
    function hasErrors(diags) {
        return diags.some(function (d) { return d.category === ts.DiagnosticCategory.Error; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV9jb21waWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9wZXJmb3JtX2NvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQXVFO0lBQ3ZFLHVCQUF5QjtJQUN6QiwyQkFBNkI7SUFDN0IsK0JBQWlDO0lBRWpDLGdFQUEwQztJQUMxQyx3RUFBa0Q7SUFDbEQsb0VBQTREO0lBRTVELElBQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQztJQUl2QixTQUFnQix1QkFBdUIsQ0FBQyxXQUF3QjtRQUM5RCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQTVDLENBQTRDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRkQsMERBRUM7SUFFRCxJQUFNLGlCQUFpQixHQUE2QjtRQUNsRCxtQkFBbUIsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxFQUE1QixDQUE0QjtRQUN2RCxvQkFBb0IsRUFBRSxVQUFBLFFBQVEsSUFBSSxPQUFBLFFBQVEsRUFBUixDQUFRO1FBQzFDLFVBQVUsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQWQsQ0FBYztLQUNqQyxDQUFDO0lBRUYsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxJQUE4QjtRQUN2RSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVELFNBQWdCLHdCQUF3QixDQUNwQyxRQUFrQixFQUFFLElBQWtEO1FBQWxELHFCQUFBLEVB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S0FBSyxDQUFDLElBQUksQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBMUMsQ0FBMEMsQ0FBQyxDQUFDO0lBQ3JFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UG9zaXRpb24sIGlzU3ludGF4RXJyb3IsIHN5bnRheEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCAqIGFzIGFwaSBmcm9tICcuL3RyYW5zZm9ybWVycy9hcGknO1xuaW1wb3J0ICogYXMgbmcgZnJvbSAnLi90cmFuc2Zvcm1lcnMvZW50cnlfcG9pbnRzJztcbmltcG9ydCB7Y3JlYXRlTWVzc2FnZURpYWdub3N0aWN9IGZyb20gJy4vdHJhbnNmb3JtZXJzL3V0aWwnO1xuXG5jb25zdCBUU19FWFQgPSAvXFwudHMkLztcblxuZXhwb3J0IHR5cGUgRGlhZ25vc3RpY3MgPSBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+O1xuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzKTogRGlhZ25vc3RpY3Mge1xuICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKGQgPT4gZC5jYXRlZ29yeSAhPT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UpO1xufVxuXG5jb25zdCBkZWZhdWx0Rm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG59O1xuXG5mdW5jdGlvbiBkaXNwbGF5RmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0KTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGgucmVsYXRpdmUoaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCksIGhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNQb3NpdGlvbihcbiAgICBwb3NpdGlvbjogUG9zaXRpb24sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0KTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2Rpc3BsYXlGaWxlTmFtZShwb3NpdGlvbi5maWxlTmFtZSwgaG9zdCl9KCR7cG9zaXRpb24ubGluZSArIDF9LCR7cG9zaXRpb24uY29sdW1uKzF9KWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihcbiAgICBjaGFpbjogYXBpLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0KTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IGNoYWluLm1lc3NhZ2VUZXh0O1xuICBsZXQgaW5kZW50ID0gMTtcbiAgbGV0IGN1cnJlbnQgPSBjaGFpbi5uZXh0O1xuICBjb25zdCBuZXdMaW5lID0gaG9zdC5nZXROZXdMaW5lKCk7XG4gIHdoaWxlIChjdXJyZW50KSB7XG4gICAgcmVzdWx0ICs9IG5ld0xpbmU7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICcgICc7XG4gICAgfVxuICAgIHJlc3VsdCArPSBjdXJyZW50Lm1lc3NhZ2VUZXh0O1xuICAgIGNvbnN0IHBvc2l0aW9uID0gY3VycmVudC5wb3NpdGlvbjtcbiAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgIHJlc3VsdCArPSBgIGF0ICR7Zm9ybWF0RGlhZ25vc3RpY1Bvc2l0aW9uKHBvc2l0aW9uLCBob3N0KX1gO1xuICAgIH1cbiAgICBjdXJyZW50ID0gY3VycmVudC5uZXh0O1xuICAgIGluZGVudCsrO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IGFwaS5EaWFnbm9zdGljLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG4gIGNvbnN0IG5ld0xpbmUgPSBob3N0LmdldE5ld0xpbmUoKTtcbiAgY29uc3Qgc3BhbiA9IGRpYWdub3N0aWMuc3BhbjtcbiAgaWYgKHNwYW4pIHtcbiAgICByZXN1bHQgKz0gYCR7Zm9ybWF0RGlhZ25vc3RpY1Bvc2l0aW9uKHtcbiAgICAgIGZpbGVOYW1lOiBzcGFuLnN0YXJ0LmZpbGUudXJsLFxuICAgICAgbGluZTogc3Bhbi5zdGFydC5saW5lLFxuICAgICAgY29sdW1uOiBzcGFuLnN0YXJ0LmNvbFxuICAgIH0sIGhvc3QpfTogYDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLnBvc2l0aW9uKSB7XG4gICAgcmVzdWx0ICs9IGAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihkaWFnbm9zdGljLnBvc2l0aW9uLCBob3N0KX06IGA7XG4gIH1cbiAgaWYgKGRpYWdub3N0aWMuc3BhbiAmJiBkaWFnbm9zdGljLnNwYW4uZGV0YWlscykge1xuICAgIHJlc3VsdCArPSBgOiAke2RpYWdub3N0aWMuc3Bhbi5kZXRhaWxzfSwgJHtkaWFnbm9zdGljLm1lc3NhZ2VUZXh0fSR7bmV3TGluZX1gO1xuICB9IGVsc2UgaWYgKGRpYWdub3N0aWMuY2hhaW4pIHtcbiAgICByZXN1bHQgKz0gYCR7ZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4oZGlhZ25vc3RpYy5jaGFpbiwgaG9zdCl9LiR7bmV3TGluZX1gO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCArPSBgOiAke2RpYWdub3N0aWMubWVzc2FnZVRleHR9JHtuZXdMaW5lfWA7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNzKFxuICAgIGRpYWdzOiBEaWFnbm9zdGljcywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0gZGVmYXVsdEZvcm1hdEhvc3QpOiBzdHJpbmcge1xuICBpZiAoZGlhZ3MgJiYgZGlhZ3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGRpYWdzXG4gICAgICAgIC5tYXAoZGlhZ25vc3RpYyA9PiB7XG4gICAgICAgICAgaWYgKGFwaS5pc1RzRGlhZ25vc3RpYyhkaWFnbm9zdGljKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRzLmZvcm1hdERpYWdub3N0aWNzKFtkaWFnbm9zdGljXSwgaG9zdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGhvc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oJycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBwcm9qZWN0OiBzdHJpbmc7XG4gIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnM7XG4gIHJvb3ROYW1lczogc3RyaW5nW107XG4gIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncztcbiAgZXJyb3JzOiBEaWFnbm9zdGljcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNQcm9qZWN0RmlsZUFuZEJhc2VQYXRoKHByb2plY3Q6IHN0cmluZyk6XG4gICAge3Byb2plY3RGaWxlOiBzdHJpbmcsIGJhc2VQYXRoOiBzdHJpbmd9IHtcbiAgY29uc3QgcHJvamVjdElzRGlyID0gZnMubHN0YXRTeW5jKHByb2plY3QpLmlzRGlyZWN0b3J5KCk7XG4gIGNvbnN0IHByb2plY3RGaWxlID0gcHJvamVjdElzRGlyID8gcGF0aC5qb2luKHByb2plY3QsICd0c2NvbmZpZy5qc29uJykgOiBwcm9qZWN0O1xuICBjb25zdCBwcm9qZWN0RGlyID0gcHJvamVjdElzRGlyID8gcHJvamVjdCA6IHBhdGguZGlybmFtZShwcm9qZWN0KTtcbiAgY29uc3QgYmFzZVBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcHJvamVjdERpcik7XG4gIHJldHVybiB7cHJvamVjdEZpbGUsIGJhc2VQYXRofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIGJhc2VQYXRoOiBzdHJpbmcsIGNvbmZpZzogYW55LCB0c09wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Db21waWxlck9wdGlvbnMge1xuICAvLyBlbmFibGVJdnkgYG5ndHNjYCBpcyBhbiBhbGlhcyBmb3IgYHRydWVgLlxuICBpZiAoY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMgJiYgY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMuZW5hYmxlSXZ5ID09PSAnbmd0c2MnKSB7XG4gICAgY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMuZW5hYmxlSXZ5ID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gey4uLnRzT3B0aW9ucywgLi4uY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsIGdlbkRpcjogYmFzZVBhdGgsIGJhc2VQYXRofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWd1cmF0aW9uKFxuICAgIHByb2plY3Q6IHN0cmluZywgZXhpc3RpbmdPcHRpb25zPzogdHMuQ29tcGlsZXJPcHRpb25zKTogUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIHRyeSB7XG4gICAgY29uc3Qge3Byb2plY3RGaWxlLCBiYXNlUGF0aH0gPSBjYWxjUHJvamVjdEZpbGVBbmRCYXNlUGF0aChwcm9qZWN0KTtcblxuICAgIGNvbnN0IHJlYWRFeHRlbmRlZENvbmZpZ0ZpbGUgPVxuICAgICAgICAoY29uZmlnRmlsZTogc3RyaW5nLCBleGlzdGluZ0NvbmZpZz86IGFueSk6IHtjb25maWc/OiBhbnksIGVycm9yPzogdHMuRGlhZ25vc3RpY30gPT4ge1xuICAgICAgICAgIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHRzLnJlYWRDb25maWdGaWxlKGNvbmZpZ0ZpbGUsIHRzLnN5cy5yZWFkRmlsZSk7XG5cbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiB7ZXJyb3J9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW50byBtZXJnaW5nICdhbmd1bGFyQ29tcGlsZXJPcHRpb25zJyBhc1xuICAgICAgICAgIC8vIG90aGVyIG9wdGlvbnMgbGlrZSAnY29tcGlsZXJPcHRpb25zJyBhcmUgbWVyZ2VkIGJ5IFRTXG4gICAgICAgICAgY29uc3QgYmFzZUNvbmZpZyA9IGV4aXN0aW5nQ29uZmlnIHx8IGNvbmZpZztcbiAgICAgICAgICBpZiAoZXhpc3RpbmdDb25maWcpIHtcbiAgICAgICAgICAgIGJhc2VDb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucyA9IHsuLi5jb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5iYXNlQ29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnN9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjb25maWcuZXh0ZW5kcykge1xuICAgICAgICAgICAgbGV0IGV4dGVuZGVkQ29uZmlnUGF0aCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoY29uZmlnRmlsZSksIGNvbmZpZy5leHRlbmRzKTtcbiAgICAgICAgICAgIGV4dGVuZGVkQ29uZmlnUGF0aCA9IHBhdGguZXh0bmFtZShleHRlbmRlZENvbmZpZ1BhdGgpID8gZXh0ZW5kZWRDb25maWdQYXRoIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCR7ZXh0ZW5kZWRDb25maWdQYXRofS5qc29uYDtcblxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZXh0ZW5kZWRDb25maWdQYXRoKSkge1xuICAgICAgICAgICAgICAvLyBDYWxsIHJlYWQgY29uZmlnIHJlY3Vyc2l2ZWx5IGFzIFR5cGVTY3JpcHQgb25seSBtZXJnZXMgQ29tcGlsZXJPcHRpb25zXG4gICAgICAgICAgICAgIHJldHVybiByZWFkRXh0ZW5kZWRDb25maWdGaWxlKGV4dGVuZGVkQ29uZmlnUGF0aCwgYmFzZUNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHtjb25maWc6IGJhc2VDb25maWd9O1xuICAgICAgICB9O1xuXG4gICAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gcmVhZEV4dGVuZGVkQ29uZmlnRmlsZShwcm9qZWN0RmlsZSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb2plY3QsXG4gICAgICAgIGVycm9yczogW2Vycm9yXSxcbiAgICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0XG4gICAgICB9O1xuICAgIH1cbiAgICBjb25zdCBwYXJzZUNvbmZpZ0hvc3QgPSB7XG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiB0cnVlLFxuICAgICAgZmlsZUV4aXN0czogZnMuZXhpc3RzU3luYyxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IHRzLnN5cy5yZWFkRGlyZWN0b3J5LFxuICAgICAgcmVhZEZpbGU6IHRzLnN5cy5yZWFkRmlsZVxuICAgIH07XG4gICAgY29uc3QgY29uZmlnRmlsZU5hbWUgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgcHJvamVjdEZpbGUpO1xuICAgIGNvbnN0IHBhcnNlZCA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KFxuICAgICAgICBjb25maWcsIHBhcnNlQ29uZmlnSG9zdCwgYmFzZVBhdGgsIGV4aXN0aW5nT3B0aW9ucywgY29uZmlnRmlsZU5hbWUpO1xuICAgIGNvbnN0IHJvb3ROYW1lcyA9IHBhcnNlZC5maWxlTmFtZXMubWFwKGYgPT4gcGF0aC5ub3JtYWxpemUoZikpO1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IGNyZWF0ZU5nQ29tcGlsZXJPcHRpb25zKGJhc2VQYXRoLCBjb25maWcsIHBhcnNlZC5vcHRpb25zKTtcbiAgICBsZXQgZW1pdEZsYWdzID0gYXBpLkVtaXRGbGFncy5EZWZhdWx0O1xuICAgIGlmICghKG9wdGlvbnMuc2tpcE1ldGFkYXRhRW1pdCB8fCBvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSkge1xuICAgICAgZW1pdEZsYWdzIHw9IGFwaS5FbWl0RmxhZ3MuTWV0YWRhdGE7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4pIHtcbiAgICAgIGVtaXRGbGFncyA9IGVtaXRGbGFncyAmIH5hcGkuRW1pdEZsYWdzLkNvZGVnZW47XG4gICAgfVxuICAgIHJldHVybiB7cHJvamVjdDogcHJvamVjdEZpbGUsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBwYXJzZWQuZXJyb3JzLCBlbWl0RmxhZ3N9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgZXJyb3JzOiBEaWFnbm9zdGljcyA9IFt7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgbWVzc2FnZVRleHQ6IGUuc3RhY2ssXG4gICAgICBzb3VyY2U6IGFwaS5TT1VSQ0UsXG4gICAgICBjb2RlOiBhcGkuVU5LTk9XTl9FUlJPUl9DT0RFXG4gICAgfV07XG4gICAgcmV0dXJuIHtwcm9qZWN0OiAnJywgZXJyb3JzLCByb290TmFtZXM6IFtdLCBvcHRpb25zOiB7fSwgZW1pdEZsYWdzOiBhcGkuRW1pdEZsYWdzLkRlZmF1bHR9O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVyZm9ybUNvbXBpbGF0aW9uUmVzdWx0IHtcbiAgZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzO1xuICBwcm9ncmFtPzogYXBpLlByb2dyYW07XG4gIGVtaXRSZXN1bHQ/OiB0cy5FbWl0UmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhpdENvZGVGcm9tUmVzdWx0KGRpYWdzOiBEaWFnbm9zdGljcyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmICghZGlhZ3MgfHwgZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoZGlhZ3MpLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIElmIHdlIGhhdmUgYSByZXN1bHQgYW5kIGRpZG4ndCBnZXQgYW55IGVycm9ycywgd2Ugc3VjY2VlZGVkLlxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLy8gUmV0dXJuIDIgaWYgYW55IG9mIHRoZSBlcnJvcnMgd2VyZSB1bmtub3duLlxuICByZXR1cm4gZGlhZ3Muc29tZShkID0+IGQuc291cmNlID09PSAnYW5ndWxhcicgJiYgZC5jb2RlID09PSBhcGkuVU5LTk9XTl9FUlJPUl9DT0RFKSA/IDIgOiAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGVyZm9ybUNvbXBpbGF0aW9uKFxuICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0sIGVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICAgICBnYXRoZXJEaWFnbm9zdGljcyA9IGRlZmF1bHRHYXRoZXJEaWFnbm9zdGljcywgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICBlbWl0RmxhZ3MgPSBhcGkuRW1pdEZsYWdzLkRlZmF1bHQsIG1vZGlmaWVkUmVzb3VyY2VGaWxlc306IHtcbiAgICAgIHJvb3ROYW1lczogc3RyaW5nW10sXG4gICAgICBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgaG9zdD86IGFwaS5Db21waWxlckhvc3QsXG4gICAgICBvbGRQcm9ncmFtPzogYXBpLlByb2dyYW0sXG4gICAgICBlbWl0Q2FsbGJhY2s/OiBhcGkuVHNFbWl0Q2FsbGJhY2ssXG4gICAgICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gICAgICBnYXRoZXJEaWFnbm9zdGljcz86IChwcm9ncmFtOiBhcGkuUHJvZ3JhbSkgPT4gRGlhZ25vc3RpY3MsXG4gICAgICBjdXN0b21UcmFuc2Zvcm1lcnM/OiBhcGkuQ3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICAgZW1pdEZsYWdzPzogYXBpLkVtaXRGbGFncyxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcz86IFNldDxzdHJpbmc+LFxuICAgIH0pOiBQZXJmb3JtQ29tcGlsYXRpb25SZXN1bHQge1xuICBsZXQgcHJvZ3JhbTogYXBpLlByb2dyYW18dW5kZWZpbmVkO1xuICBsZXQgZW1pdFJlc3VsdDogdHMuRW1pdFJlc3VsdHx1bmRlZmluZWQ7XG4gIGxldCBhbGxEaWFnbm9zdGljczogQXJyYXk8dHMuRGlhZ25vc3RpY3xhcGkuRGlhZ25vc3RpYz4gPSBbXTtcbiAgdHJ5IHtcbiAgICBpZiAoIWhvc3QpIHtcbiAgICAgIGhvc3QgPSBuZy5jcmVhdGVDb21waWxlckhvc3Qoe29wdGlvbnN9KTtcbiAgICB9XG4gICAgaWYgKG1vZGlmaWVkUmVzb3VyY2VGaWxlcykge1xuICAgICAgaG9zdC5nZXRNb2RpZmllZFJlc291cmNlRmlsZXMgPSAoKSA9PiBtb2RpZmllZFJlc291cmNlRmlsZXM7XG4gICAgfVxuXG4gICAgcHJvZ3JhbSA9IG5nLmNyZWF0ZVByb2dyYW0oe3Jvb3ROYW1lcywgaG9zdCwgb3B0aW9ucywgb2xkUHJvZ3JhbX0pO1xuXG4gICAgY29uc3QgYmVmb3JlRGlhZ3MgPSBEYXRlLm5vdygpO1xuICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZ2F0aGVyRGlhZ25vc3RpY3MocHJvZ3JhbSAhKSk7XG4gICAgaWYgKG9wdGlvbnMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IGFmdGVyRGlhZ3MgPSBEYXRlLm5vdygpO1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICBjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhgVGltZSBmb3IgZGlhZ25vc3RpY3M6ICR7YWZ0ZXJEaWFncyAtIGJlZm9yZURpYWdzfW1zLmApKTtcbiAgICB9XG5cbiAgICBpZiAoIWhhc0Vycm9ycyhhbGxEaWFnbm9zdGljcykpIHtcbiAgICAgIGVtaXRSZXN1bHQgPVxuICAgICAgICAgIHByb2dyYW0gIS5lbWl0KHtlbWl0Q2FsbGJhY2ssIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaywgY3VzdG9tVHJhbnNmb3JtZXJzLCBlbWl0RmxhZ3N9KTtcbiAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZW1pdFJlc3VsdC5kaWFnbm9zdGljcyk7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcywgcHJvZ3JhbSwgZW1pdFJlc3VsdH07XG4gICAgfVxuICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLCBwcm9ncmFtfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxldCBlcnJNc2c6IHN0cmluZztcbiAgICBsZXQgY29kZTogbnVtYmVyO1xuICAgIGlmIChpc1N5bnRheEVycm9yKGUpKSB7XG4gICAgICAvLyBkb24ndCByZXBvcnQgdGhlIHN0YWNrIGZvciBzeW50YXggZXJyb3JzIGFzIHRoZXkgYXJlIHdlbGwga25vd24gZXJyb3JzLlxuICAgICAgZXJyTXNnID0gZS5tZXNzYWdlO1xuICAgICAgY29kZSA9IGFwaS5ERUZBVUxUX0VSUk9SX0NPREU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVyck1zZyA9IGUuc3RhY2s7XG4gICAgICAvLyBJdCBpcyBub3QgYSBzeW50YXggZXJyb3Igd2UgbWlnaHQgaGF2ZSBhIHByb2dyYW0gd2l0aCB1bmtub3duIHN0YXRlLCBkaXNjYXJkIGl0LlxuICAgICAgcHJvZ3JhbSA9IHVuZGVmaW5lZDtcbiAgICAgIGNvZGUgPSBhcGkuVU5LTk9XTl9FUlJPUl9DT0RFO1xuICAgIH1cbiAgICBhbGxEaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICB7Y2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvciwgbWVzc2FnZVRleHQ6IGVyck1zZywgY29kZSwgc291cmNlOiBhcGkuU09VUkNFfSk7XG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MsIHByb2dyYW19O1xuICB9XG59XG5mdW5jdGlvbiBkZWZhdWx0R2F0aGVyRGlhZ25vc3RpY3MocHJvZ3JhbTogYXBpLlByb2dyYW0pOiBEaWFnbm9zdGljcyB7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiBBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrRGlhZ25vc3RpY3MoZGlhZ3M6IERpYWdub3N0aWNzIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKGRpYWdzKSB7XG4gICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmRpYWdzKTtcbiAgICAgIHJldHVybiAhaGFzRXJyb3JzKGRpYWdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBsZXQgY2hlY2tPdGhlckRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgLy8gQ2hlY2sgcGFyYW1ldGVyIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9IGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJlxuICAgICAgY2hlY2tEaWFnbm9zdGljcyhbLi4ucHJvZ3JhbS5nZXRUc09wdGlvbkRpYWdub3N0aWNzKCksIC4uLnByb2dyYW0uZ2V0TmdPcHRpb25EaWFnbm9zdGljcygpXSk7XG5cbiAgLy8gQ2hlY2sgc3ludGFjdGljIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9XG4gICAgICBjaGVja090aGVyRGlhZ25vc3RpY3MgJiYgY2hlY2tEaWFnbm9zdGljcyhwcm9ncmFtLmdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoKSBhcyBEaWFnbm9zdGljcyk7XG5cbiAgLy8gQ2hlY2sgVHlwZVNjcmlwdCBzZW1hbnRpYyBhbmQgQW5ndWxhciBzdHJ1Y3R1cmUgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID1cbiAgICAgIGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJlxuICAgICAgY2hlY2tEaWFnbm9zdGljcyhcbiAgICAgICAgICBbLi4ucHJvZ3JhbS5nZXRUc1NlbWFudGljRGlhZ25vc3RpY3MoKSwgLi4ucHJvZ3JhbS5nZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcygpXSk7XG5cbiAgLy8gQ2hlY2sgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPVxuICAgICAgY2hlY2tPdGhlckRpYWdub3N0aWNzICYmIGNoZWNrRGlhZ25vc3RpY3MocHJvZ3JhbS5nZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoKSBhcyBEaWFnbm9zdGljcyk7XG5cbiAgcmV0dXJuIGFsbERpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ3M6IERpYWdub3N0aWNzKSB7XG4gIHJldHVybiBkaWFncy5zb21lKGQgPT4gZC5jYXRlZ29yeSA9PT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yKTtcbn1cbiJdfQ==