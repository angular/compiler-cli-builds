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
        define("@angular/compiler-cli/src/perform_compile", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var api = require("@angular/compiler-cli/src/transformers/api");
    var ng = require("@angular/compiler-cli/src/transformers/entry_points");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
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
        return file_system_1.relative(file_system_1.resolve(host.getCurrentDirectory()), file_system_1.resolve(host.getCanonicalFileName(fileName)));
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
        var fs = file_system_1.getFileSystem();
        var absProject = fs.resolve(project);
        var projectIsDir = fs.lstat(absProject).isDirectory();
        var projectFile = projectIsDir ? fs.join(absProject, 'tsconfig.json') : absProject;
        var projectDir = projectIsDir ? absProject : fs.dirname(absProject);
        var basePath = fs.resolve(projectDir);
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
            var fs_1 = file_system_1.getFileSystem();
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
                    var extendedConfigPath = fs_1.resolve(fs_1.dirname(configFile), config.extends);
                    extendedConfigPath = fs_1.extname(extendedConfigPath) ?
                        extendedConfigPath :
                        file_system_1.absoluteFrom(extendedConfigPath + ".json");
                    if (fs_1.exists(extendedConfigPath)) {
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
                fileExists: fs_1.exists.bind(fs_1),
                readDirectory: ts.sys.readDirectory,
                readFile: ts.sys.readFile
            };
            var configFileName = fs_1.resolve(fs_1.pwd(), projectFile);
            var parsed = ts.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingOptions, configFileName);
            var rootNames = parsed.fileNames;
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
        var rootNames = _a.rootNames, options = _a.options, host = _a.host, oldProgram = _a.oldProgram, emitCallback = _a.emitCallback, mergeEmitResultsCallback = _a.mergeEmitResultsCallback, _b = _a.gatherDiagnostics, gatherDiagnostics = _b === void 0 ? defaultGatherDiagnostics : _b, customTransformers = _a.customTransformers, _c = _a.emitFlags, emitFlags = _c === void 0 ? api.EmitFlags.Default : _c, _d = _a.modifiedResourceFiles, modifiedResourceFiles = _d === void 0 ? null : _d;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV9jb21waWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9wZXJmb3JtX2NvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBEO0lBQzFELCtCQUFpQztJQUNqQywyRUFBd0c7SUFDeEcsZ0VBQTBDO0lBQzFDLHdFQUFrRDtJQUNsRCxvRUFBNEQ7SUFJNUQsU0FBZ0IsdUJBQXVCLENBQUMsV0FBd0I7UUFDOUQsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUE1QyxDQUE0QyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUZELDBEQUVDO0lBRUQsSUFBTSxpQkFBaUIsR0FBNkI7UUFDbEQsbUJBQW1CLEVBQUUsY0FBTSxPQUFBLEVBQUUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBNUIsQ0FBNEI7UUFDdkQsb0JBQW9CLEVBQUUsVUFBQSxRQUFRLElBQUksT0FBQSxRQUFRLEVBQVIsQ0FBUTtRQUMxQyxVQUFVLEVBQUUsY0FBTSxPQUFBLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFkLENBQWM7S0FDakMsQ0FBQztJQUVGLFNBQVMsZUFBZSxDQUFDLFFBQWdCLEVBQUUsSUFBOEI7UUFDdkUsT0FBTyxzQkFBUSxDQUNYLHFCQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxxQkFBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVELFNBQWdCLHdCQUF3QixDQUNwQyxRQUFrQixFQUFFLElBQWtEO1FBQWxELHFCQUFBLEVBQUEsd0JBQWtEO1FBQ3hFLE9BQVUs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Y0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxTQUFTLFNBQVMsQ0FBQyxLQUFrQjtRQUNuQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQTFDLENBQTBDLENBQUMsQ0FBQztJQUNyRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1Bvc2l0aW9uLCBpc1N5bnRheEVycm9yfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbSwgZ2V0RmlsZVN5c3RlbSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi90cmFuc2Zvcm1lcnMvYXBpJztcbmltcG9ydCAqIGFzIG5nIGZyb20gJy4vdHJhbnNmb3JtZXJzL2VudHJ5X3BvaW50cyc7XG5pbXBvcnQge2NyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljfSBmcm9tICcuL3RyYW5zZm9ybWVycy91dGlsJztcblxuZXhwb3J0IHR5cGUgRGlhZ25vc3RpY3MgPSBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+O1xuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzKTogRGlhZ25vc3RpY3Mge1xuICByZXR1cm4gZGlhZ25vc3RpY3MuZmlsdGVyKGQgPT4gZC5jYXRlZ29yeSAhPT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5Lk1lc3NhZ2UpO1xufVxuXG5jb25zdCBkZWZhdWx0Rm9ybWF0SG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiB0cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICBnZXRDYW5vbmljYWxGaWxlTmFtZTogZmlsZU5hbWUgPT4gZmlsZU5hbWUsXG4gIGdldE5ld0xpbmU6ICgpID0+IHRzLnN5cy5uZXdMaW5lXG59O1xuXG5mdW5jdGlvbiBkaXNwbGF5RmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0KTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlbGF0aXZlKFxuICAgICAgcmVzb2x2ZShob3N0LmdldEN1cnJlbnREaXJlY3RvcnkoKSksIHJlc29sdmUoaG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZShmaWxlTmFtZSkpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNQb3NpdGlvbihcbiAgICBwb3NpdGlvbjogUG9zaXRpb24sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0KTogc3RyaW5nIHtcbiAgcmV0dXJuIGAke2Rpc3BsYXlGaWxlTmFtZShwb3NpdGlvbi5maWxlTmFtZSwgaG9zdCl9KCR7cG9zaXRpb24ubGluZSArIDF9LCR7cG9zaXRpb24uY29sdW1uKzF9KWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihcbiAgICBjaGFpbjogYXBpLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0KTogc3RyaW5nIHtcbiAgbGV0IHJlc3VsdCA9IGNoYWluLm1lc3NhZ2VUZXh0O1xuICBsZXQgaW5kZW50ID0gMTtcbiAgbGV0IGN1cnJlbnQgPSBjaGFpbi5uZXh0O1xuICBjb25zdCBuZXdMaW5lID0gaG9zdC5nZXROZXdMaW5lKCk7XG4gIHdoaWxlIChjdXJyZW50KSB7XG4gICAgcmVzdWx0ICs9IG5ld0xpbmU7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICcgICc7XG4gICAgfVxuICAgIHJlc3VsdCArPSBjdXJyZW50Lm1lc3NhZ2VUZXh0O1xuICAgIGNvbnN0IHBvc2l0aW9uID0gY3VycmVudC5wb3NpdGlvbjtcbiAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgIHJlc3VsdCArPSBgIGF0ICR7Zm9ybWF0RGlhZ25vc3RpY1Bvc2l0aW9uKHBvc2l0aW9uLCBob3N0KX1gO1xuICAgIH1cbiAgICBjdXJyZW50ID0gY3VycmVudC5uZXh0O1xuICAgIGluZGVudCsrO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IGFwaS5EaWFnbm9zdGljLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG4gIGNvbnN0IG5ld0xpbmUgPSBob3N0LmdldE5ld0xpbmUoKTtcbiAgY29uc3Qgc3BhbiA9IGRpYWdub3N0aWMuc3BhbjtcbiAgaWYgKHNwYW4pIHtcbiAgICByZXN1bHQgKz0gYCR7Zm9ybWF0RGlhZ25vc3RpY1Bvc2l0aW9uKHtcbiAgICAgIGZpbGVOYW1lOiBzcGFuLnN0YXJ0LmZpbGUudXJsLFxuICAgICAgbGluZTogc3Bhbi5zdGFydC5saW5lLFxuICAgICAgY29sdW1uOiBzcGFuLnN0YXJ0LmNvbFxuICAgIH0sIGhvc3QpfTogYDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLnBvc2l0aW9uKSB7XG4gICAgcmVzdWx0ICs9IGAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihkaWFnbm9zdGljLnBvc2l0aW9uLCBob3N0KX06IGA7XG4gIH1cbiAgaWYgKGRpYWdub3N0aWMuc3BhbiAmJiBkaWFnbm9zdGljLnNwYW4uZGV0YWlscykge1xuICAgIHJlc3VsdCArPSBgOiAke2RpYWdub3N0aWMuc3Bhbi5kZXRhaWxzfSwgJHtkaWFnbm9zdGljLm1lc3NhZ2VUZXh0fSR7bmV3TGluZX1gO1xuICB9IGVsc2UgaWYgKGRpYWdub3N0aWMuY2hhaW4pIHtcbiAgICByZXN1bHQgKz0gYCR7ZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4oZGlhZ25vc3RpYy5jaGFpbiwgaG9zdCl9LiR7bmV3TGluZX1gO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCArPSBgOiAke2RpYWdub3N0aWMubWVzc2FnZVRleHR9JHtuZXdMaW5lfWA7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNzKFxuICAgIGRpYWdzOiBEaWFnbm9zdGljcywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0gZGVmYXVsdEZvcm1hdEhvc3QpOiBzdHJpbmcge1xuICBpZiAoZGlhZ3MgJiYgZGlhZ3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGRpYWdzXG4gICAgICAgIC5tYXAoZGlhZ25vc3RpYyA9PiB7XG4gICAgICAgICAgaWYgKGFwaS5pc1RzRGlhZ25vc3RpYyhkaWFnbm9zdGljKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRzLmZvcm1hdERpYWdub3N0aWNzKFtkaWFnbm9zdGljXSwgaG9zdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGhvc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oJycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBwcm9qZWN0OiBzdHJpbmc7XG4gIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnM7XG4gIHJvb3ROYW1lczogc3RyaW5nW107XG4gIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncztcbiAgZXJyb3JzOiBEaWFnbm9zdGljcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNQcm9qZWN0RmlsZUFuZEJhc2VQYXRoKHByb2plY3Q6IHN0cmluZyk6XG4gICAge3Byb2plY3RGaWxlOiBBYnNvbHV0ZUZzUGF0aCwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICBjb25zdCBhYnNQcm9qZWN0ID0gZnMucmVzb2x2ZShwcm9qZWN0KTtcbiAgY29uc3QgcHJvamVjdElzRGlyID0gZnMubHN0YXQoYWJzUHJvamVjdCkuaXNEaXJlY3RvcnkoKTtcbiAgY29uc3QgcHJvamVjdEZpbGUgPSBwcm9qZWN0SXNEaXIgPyBmcy5qb2luKGFic1Byb2plY3QsICd0c2NvbmZpZy5qc29uJykgOiBhYnNQcm9qZWN0O1xuICBjb25zdCBwcm9qZWN0RGlyID0gcHJvamVjdElzRGlyID8gYWJzUHJvamVjdCA6IGZzLmRpcm5hbWUoYWJzUHJvamVjdCk7XG4gIGNvbnN0IGJhc2VQYXRoID0gZnMucmVzb2x2ZShwcm9qZWN0RGlyKTtcbiAgcmV0dXJuIHtwcm9qZWN0RmlsZSwgYmFzZVBhdGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTmdDb21waWxlck9wdGlvbnMoXG4gICAgYmFzZVBhdGg6IHN0cmluZywgY29uZmlnOiBhbnksIHRzT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogYXBpLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIGVuYWJsZUl2eSBgbmd0c2NgIGlzIGFuIGFsaWFzIGZvciBgdHJ1ZWAuXG4gIGlmIChjb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucyAmJiBjb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucy5lbmFibGVJdnkgPT09ICduZ3RzYycpIHtcbiAgICBjb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucy5lbmFibGVJdnkgPSB0cnVlO1xuICB9XG4gIHJldHVybiB7Li4udHNPcHRpb25zLCAuLi5jb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgZ2VuRGlyOiBiYXNlUGF0aCwgYmFzZVBhdGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZ3VyYXRpb24oXG4gICAgcHJvamVjdDogc3RyaW5nLCBleGlzdGluZ09wdGlvbnM/OiB0cy5Db21waWxlck9wdGlvbnMpOiBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgICBjb25zdCB7cHJvamVjdEZpbGUsIGJhc2VQYXRofSA9IGNhbGNQcm9qZWN0RmlsZUFuZEJhc2VQYXRoKHByb2plY3QpO1xuXG4gICAgY29uc3QgcmVhZEV4dGVuZGVkQ29uZmlnRmlsZSA9XG4gICAgICAgIChjb25maWdGaWxlOiBzdHJpbmcsIGV4aXN0aW5nQ29uZmlnPzogYW55KToge2NvbmZpZz86IGFueSwgZXJyb3I/OiB0cy5EaWFnbm9zdGljfSA9PiB7XG4gICAgICAgICAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gdHMucmVhZENvbmZpZ0ZpbGUoY29uZmlnRmlsZSwgdHMuc3lzLnJlYWRGaWxlKTtcblxuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIHtlcnJvcn07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbnRvIG1lcmdpbmcgJ2FuZ3VsYXJDb21waWxlck9wdGlvbnMnIGFzXG4gICAgICAgICAgLy8gb3RoZXIgb3B0aW9ucyBsaWtlICdjb21waWxlck9wdGlvbnMnIGFyZSBtZXJnZWQgYnkgVFNcbiAgICAgICAgICBjb25zdCBiYXNlQ29uZmlnID0gZXhpc3RpbmdDb25maWcgfHwgY29uZmlnO1xuICAgICAgICAgIGlmIChleGlzdGluZ0NvbmZpZykge1xuICAgICAgICAgICAgYmFzZUNvbmZpZy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zID0gey4uLmNvbmZpZy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmJhc2VDb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9uc307XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGNvbmZpZy5leHRlbmRzKSB7XG4gICAgICAgICAgICBsZXQgZXh0ZW5kZWRDb25maWdQYXRoID0gZnMucmVzb2x2ZShmcy5kaXJuYW1lKGNvbmZpZ0ZpbGUpLCBjb25maWcuZXh0ZW5kcyk7XG4gICAgICAgICAgICBleHRlbmRlZENvbmZpZ1BhdGggPSBmcy5leHRuYW1lKGV4dGVuZGVkQ29uZmlnUGF0aCkgP1xuICAgICAgICAgICAgICAgIGV4dGVuZGVkQ29uZmlnUGF0aCA6XG4gICAgICAgICAgICAgICAgYWJzb2x1dGVGcm9tKGAke2V4dGVuZGVkQ29uZmlnUGF0aH0uanNvbmApO1xuXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzKGV4dGVuZGVkQ29uZmlnUGF0aCkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCByZWFkIGNvbmZpZyByZWN1cnNpdmVseSBhcyBUeXBlU2NyaXB0IG9ubHkgbWVyZ2VzIENvbXBpbGVyT3B0aW9uc1xuICAgICAgICAgICAgICByZXR1cm4gcmVhZEV4dGVuZGVkQ29uZmlnRmlsZShleHRlbmRlZENvbmZpZ1BhdGgsIGJhc2VDb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB7Y29uZmlnOiBiYXNlQ29uZmlnfTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHJlYWRFeHRlbmRlZENvbmZpZ0ZpbGUocHJvamVjdEZpbGUpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm9qZWN0LFxuICAgICAgICBlcnJvcnM6IFtlcnJvcl0sXG4gICAgICAgIHJvb3ROYW1lczogW10sXG4gICAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VDb25maWdIb3N0ID0ge1xuICAgICAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lczogdHJ1ZSxcbiAgICAgIGZpbGVFeGlzdHM6IGZzLmV4aXN0cy5iaW5kKGZzKSxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IHRzLnN5cy5yZWFkRGlyZWN0b3J5LFxuICAgICAgcmVhZEZpbGU6IHRzLnN5cy5yZWFkRmlsZVxuICAgIH07XG4gICAgY29uc3QgY29uZmlnRmlsZU5hbWUgPSBmcy5yZXNvbHZlKGZzLnB3ZCgpLCBwcm9qZWN0RmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgICAgIGNvbmZpZywgcGFyc2VDb25maWdIb3N0LCBiYXNlUGF0aCwgZXhpc3RpbmdPcHRpb25zLCBjb25maWdGaWxlTmFtZSk7XG4gICAgY29uc3Qgcm9vdE5hbWVzID0gcGFyc2VkLmZpbGVOYW1lcztcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBjcmVhdGVOZ0NvbXBpbGVyT3B0aW9ucyhiYXNlUGF0aCwgY29uZmlnLCBwYXJzZWQub3B0aW9ucyk7XG4gICAgbGV0IGVtaXRGbGFncyA9IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdDtcbiAgICBpZiAoIShvcHRpb25zLnNraXBNZXRhZGF0YUVtaXQgfHwgb3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSkpIHtcbiAgICAgIGVtaXRGbGFncyB8PSBhcGkuRW1pdEZsYWdzLk1ldGFkYXRhO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5za2lwVGVtcGxhdGVDb2RlZ2VuKSB7XG4gICAgICBlbWl0RmxhZ3MgPSBlbWl0RmxhZ3MgJiB+YXBpLkVtaXRGbGFncy5Db2RlZ2VuO1xuICAgIH1cbiAgICByZXR1cm4ge3Byb2plY3Q6IHByb2plY3RGaWxlLCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogcGFyc2VkLmVycm9ycywgZW1pdEZsYWdzfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yczogRGlhZ25vc3RpY3MgPSBbe1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIG1lc3NhZ2VUZXh0OiBlLnN0YWNrLFxuICAgICAgc291cmNlOiBhcGkuU09VUkNFLFxuICAgICAgY29kZTogYXBpLlVOS05PV05fRVJST1JfQ09ERVxuICAgIH1dO1xuICAgIHJldHVybiB7cHJvamVjdDogJycsIGVycm9ycywgcm9vdE5hbWVzOiBbXSwgb3B0aW9uczoge30sIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0fTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCB7XG4gIGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcztcbiAgcHJvZ3JhbT86IGFwaS5Qcm9ncmFtO1xuICBlbWl0UmVzdWx0PzogdHMuRW1pdFJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4aXRDb2RlRnJvbVJlc3VsdChkaWFnczogRGlhZ25vc3RpY3MgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAoIWRpYWdzIHx8IGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGRpYWdzKS5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGEgcmVzdWx0IGFuZCBkaWRuJ3QgZ2V0IGFueSBlcnJvcnMsIHdlIHN1Y2NlZWRlZC5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8vIFJldHVybiAyIGlmIGFueSBvZiB0aGUgZXJyb3JzIHdlcmUgdW5rbm93bi5cbiAgcmV0dXJuIGRpYWdzLnNvbWUoZCA9PiBkLnNvdXJjZSA9PT0gJ2FuZ3VsYXInICYmIGQuY29kZSA9PT0gYXBpLlVOS05PV05fRVJST1JfQ09ERSkgPyAyIDogMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBlcmZvcm1Db21waWxhdGlvbihcbiAgICB7cm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtLCBlbWl0Q2FsbGJhY2ssIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgZ2F0aGVyRGlhZ25vc3RpY3MgPSBkZWZhdWx0R2F0aGVyRGlhZ25vc3RpY3MsIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgZW1pdEZsYWdzID0gYXBpLkVtaXRGbGFncy5EZWZhdWx0LCBtb2RpZmllZFJlc291cmNlRmlsZXMgPSBudWxsfToge1xuICAgICAgcm9vdE5hbWVzOiBzdHJpbmdbXSxcbiAgICAgIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgICBob3N0PzogYXBpLkNvbXBpbGVySG9zdCxcbiAgICAgIG9sZFByb2dyYW0/OiBhcGkuUHJvZ3JhbSxcbiAgICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayxcbiAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIGdhdGhlckRpYWdub3N0aWNzPzogKHByb2dyYW06IGFwaS5Qcm9ncmFtKSA9PiBEaWFnbm9zdGljcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzPzogU2V0PHN0cmluZz58IG51bGwsXG4gICAgfSk6IFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCB7XG4gIGxldCBwcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIGxldCBlbWl0UmVzdWx0OiB0cy5FbWl0UmVzdWx0fHVuZGVmaW5lZDtcbiAgbGV0IGFsbERpYWdub3N0aWNzOiBBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiA9IFtdO1xuICB0cnkge1xuICAgIGlmICghaG9zdCkge1xuICAgICAgaG9zdCA9IG5nLmNyZWF0ZUNvbXBpbGVySG9zdCh7b3B0aW9uc30pO1xuICAgIH1cbiAgICBpZiAobW9kaWZpZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICBob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9ICgpID0+IG1vZGlmaWVkUmVzb3VyY2VGaWxlcztcbiAgICB9XG5cbiAgICBwcm9ncmFtID0gbmcuY3JlYXRlUHJvZ3JhbSh7cm9vdE5hbWVzLCBob3N0LCBvcHRpb25zLCBvbGRQcm9ncmFtfSk7XG5cbiAgICBjb25zdCBiZWZvcmVEaWFncyA9IERhdGUubm93KCk7XG4gICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5nYXRoZXJEaWFnbm9zdGljcyhwcm9ncmFtICEpKTtcbiAgICBpZiAob3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgY29uc3QgYWZ0ZXJEaWFncyA9IERhdGUubm93KCk7XG4gICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIGNyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKGBUaW1lIGZvciBkaWFnbm9zdGljczogJHthZnRlckRpYWdzIC0gYmVmb3JlRGlhZ3N9bXMuYCkpO1xuICAgIH1cblxuICAgIGlmICghaGFzRXJyb3JzKGFsbERpYWdub3N0aWNzKSkge1xuICAgICAgZW1pdFJlc3VsdCA9XG4gICAgICAgICAgcHJvZ3JhbSAhLmVtaXQoe2VtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLCBjdXN0b21UcmFuc2Zvcm1lcnMsIGVtaXRGbGFnc30pO1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5lbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLCBwcm9ncmFtLCBlbWl0UmVzdWx0fTtcbiAgICB9XG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MsIHByb2dyYW19O1xuICB9IGNhdGNoIChlKSB7XG4gICAgbGV0IGVyck1zZzogc3RyaW5nO1xuICAgIGxldCBjb2RlOiBudW1iZXI7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIC8vIGRvbid0IHJlcG9ydCB0aGUgc3RhY2sgZm9yIHN5bnRheCBlcnJvcnMgYXMgdGhleSBhcmUgd2VsbCBrbm93biBlcnJvcnMuXG4gICAgICBlcnJNc2cgPSBlLm1lc3NhZ2U7XG4gICAgICBjb2RlID0gYXBpLkRFRkFVTFRfRVJST1JfQ09ERTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyTXNnID0gZS5zdGFjaztcbiAgICAgIC8vIEl0IGlzIG5vdCBhIHN5bnRheCBlcnJvciB3ZSBtaWdodCBoYXZlIGEgcHJvZ3JhbSB3aXRoIHVua25vd24gc3RhdGUsIGRpc2NhcmQgaXQuXG4gICAgICBwcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgICAgY29kZSA9IGFwaS5VTktOT1dOX0VSUk9SX0NPREU7XG4gICAgfVxuICAgIGFsbERpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIHtjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBtZXNzYWdlVGV4dDogZXJyTXNnLCBjb2RlLCBzb3VyY2U6IGFwaS5TT1VSQ0V9KTtcbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcywgcHJvZ3JhbX07XG4gIH1cbn1cbmZ1bmN0aW9uIGRlZmF1bHRHYXRoZXJEaWFnbm9zdGljcyhwcm9ncmFtOiBhcGkuUHJvZ3JhbSk6IERpYWdub3N0aWNzIHtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IEFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+ID0gW107XG5cbiAgZnVuY3Rpb24gY2hlY2tEaWFnbm9zdGljcyhkaWFnczogRGlhZ25vc3RpY3MgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAoZGlhZ3MpIHtcbiAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ3MpO1xuICAgICAgcmV0dXJuICFoYXNFcnJvcnMoZGlhZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGxldCBjaGVja090aGVyRGlhZ25vc3RpY3MgPSB0cnVlO1xuICAvLyBDaGVjayBwYXJhbWV0ZXIgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID0gY2hlY2tPdGhlckRpYWdub3N0aWNzICYmXG4gICAgICBjaGVja0RpYWdub3N0aWNzKFsuLi5wcm9ncmFtLmdldFRzT3B0aW9uRGlhZ25vc3RpY3MoKSwgLi4ucHJvZ3JhbS5nZXROZ09wdGlvbkRpYWdub3N0aWNzKCldKTtcblxuICAvLyBDaGVjayBzeW50YWN0aWMgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID1cbiAgICAgIGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJiBjaGVja0RpYWdub3N0aWNzKHByb2dyYW0uZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcygpIGFzIERpYWdub3N0aWNzKTtcblxuICAvLyBDaGVjayBUeXBlU2NyaXB0IHNlbWFudGljIGFuZCBBbmd1bGFyIHN0cnVjdHVyZSBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPVxuICAgICAgY2hlY2tPdGhlckRpYWdub3N0aWNzICYmXG4gICAgICBjaGVja0RpYWdub3N0aWNzKFxuICAgICAgICAgIFsuLi5wcm9ncmFtLmdldFRzU2VtYW50aWNEaWFnbm9zdGljcygpLCAuLi5wcm9ncmFtLmdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKCldKTtcblxuICAvLyBDaGVjayBBbmd1bGFyIHNlbWFudGljIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9XG4gICAgICBjaGVja090aGVyRGlhZ25vc3RpY3MgJiYgY2hlY2tEaWFnbm9zdGljcyhwcm9ncmFtLmdldE5nU2VtYW50aWNEaWFnbm9zdGljcygpIGFzIERpYWdub3N0aWNzKTtcblxuICByZXR1cm4gYWxsRGlhZ25vc3RpY3M7XG59XG5cbmZ1bmN0aW9uIGhhc0Vycm9ycyhkaWFnczogRGlhZ25vc3RpY3MpIHtcbiAgcmV0dXJuIGRpYWdzLnNvbWUoZCA9PiBkLmNhdGVnb3J5ID09PSB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IpO1xufVxuIl19