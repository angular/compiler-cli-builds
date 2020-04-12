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
        define("@angular/compiler-cli/src/perform_compile", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/transformers/api", "@angular/compiler-cli/src/transformers/entry_points", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
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
    function flattenDiagnosticMessageChain(chain, host, indent) {
        var e_1, _a;
        if (host === void 0) { host = defaultFormatHost; }
        if (indent === void 0) { indent = 0; }
        var newLine = host.getNewLine();
        var result = '';
        if (indent) {
            result += newLine;
            for (var i = 0; i < indent; i++) {
                result += '  ';
            }
        }
        result += chain.messageText;
        var position = chain.position;
        // add position if available, and we are not at the depest frame
        if (position && indent !== 0) {
            result += " at " + formatDiagnosticPosition(position, host);
        }
        indent++;
        if (chain.next) {
            try {
                for (var _b = tslib_1.__values(chain.next), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var kid = _c.value;
                    result += flattenDiagnosticMessageChain(kid, host, indent);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
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
            result += formatDiagnosticPosition({ fileName: span.start.file.url, line: span.start.line, column: span.start.col }, host) + ": ";
        }
        else if (diagnostic.position) {
            result += formatDiagnosticPosition(diagnostic.position, host) + ": ";
        }
        if (diagnostic.span && diagnostic.span.details) {
            result += diagnostic.span.details + ", " + diagnostic.messageText + newLine;
        }
        else if (diagnostic.chain) {
            result += flattenDiagnosticMessageChain(diagnostic.chain, host) + "." + newLine;
        }
        else {
            result += "" + diagnostic.messageText + newLine;
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
                    return diagnostics_1.replaceTsWithNgInErrors(ts.formatDiagnosticsWithColorAndContext([diagnostic], host));
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
        var _a = config.angularCompilerOptions, angularCompilerOptions = _a === void 0 ? {} : _a;
        var enableIvy = angularCompilerOptions.enableIvy;
        angularCompilerOptions.enableIvy = enableIvy !== false && enableIvy !== 'tsc';
        return tslib_1.__assign(tslib_1.__assign(tslib_1.__assign({}, tsOptions), angularCompilerOptions), { genDir: basePath, basePath: basePath });
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
                    baseConfig.angularCompilerOptions = tslib_1.__assign(tslib_1.__assign({}, config.angularCompilerOptions), baseConfig.angularCompilerOptions);
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
    exports.defaultGatherDiagnostics = defaultGatherDiagnostics;
    function hasErrors(diags) {
        return diags.some(function (d) { return d.category === ts.DiagnosticCategory.Error; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV9jb21waWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9wZXJmb3JtX2NvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBEO0lBQzFELCtCQUFpQztJQUVqQywyRUFBd0c7SUFFeEcsMkVBQTREO0lBQzVELGdFQUEwQztJQUMxQyx3RUFBa0Q7SUFDbEQsb0VBQTREO0lBSTVELFNBQWdCLHVCQUF1QixDQUFDLFdBQXdCO1FBQzlELE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxRQUFRLEtBQUssRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBNUMsQ0FBNEMsQ0FBQyxDQUFDO0lBQy9FLENBQUM7SUFGRCwwREFFQztJQUVELElBQU0saUJBQWlCLEdBQTZCO1FBQ2xELG1CQUFtQixFQUFFLGNBQU0sT0FBQSxFQUFFLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLEVBQTVCLENBQTRCO1FBQ3ZELG9CQUFvQixFQUFFLFVBQUEsUUFBUSxJQUFJLE9BQUEsUUFBUSxFQUFSLENBQVE7UUFDMUMsVUFBVSxFQUFFLGNBQU0sT0FBQSxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBZCxDQUFjO0tBQ2pDLENBQUM7SUFFRixTQUFTLGVBQWUsQ0FBQyxRQUFnQixFQUFFLElBQThCO1FBQ3ZFLE9BQU8sc0JBQVEsQ0FDWCxxQkFBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUscUJBQU8sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxTQUFnQix3QkFBd0IsQ0FDcEMsUUFBa0IsRUFBRSxJQUFrRDtRQUFsRCxxQkFBQSxFQUFBLHdCQUFr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T0FBTyxDQUFDLHdCQUF3QixFQUFFLEVBQUssT0FBTyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQztRQUUxRixxQ0FBcUM7UUFDckMscUJBQXFCO1lBQ2pCLHFCQUFxQixJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBaUIsQ0FBQyxDQUFDO1FBRWpHLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUEvQkQsNERBK0JDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBa0I7UUFDbkMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUExQyxDQUEwQyxDQUFDLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQb3NpdGlvbiwgaXNTeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIGFic29sdXRlRnJvbSwgZ2V0RmlsZVN5c3RlbSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuaW1wb3J0IHtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpY30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmV4cG9ydCB0eXBlIERpYWdub3N0aWNzID0gUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPjtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcyk6IERpYWdub3N0aWNzIHtcbiAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihkID0+IGQuY2F0ZWdvcnkgIT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlKTtcbn1cblxuY29uc3QgZGVmYXVsdEZvcm1hdEhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gZGlzcGxheUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiByZWxhdGl2ZShcbiAgICAgIHJlc29sdmUoaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkpLCByZXNvbHZlKGhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljUG9zaXRpb24oXG4gICAgcG9zaXRpb246IFBvc2l0aW9uLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtkaXNwbGF5RmlsZU5hbWUocG9zaXRpb24uZmlsZU5hbWUsIGhvc3QpfSgke3Bvc2l0aW9uLmxpbmUgKyAxfSwke3Bvc2l0aW9uLmNvbHVtbiArIDF9KWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihcbiAgICBjaGFpbjogYXBpLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0LFxuICAgIGluZGVudCA9IDApOiBzdHJpbmcge1xuICBjb25zdCBuZXdMaW5lID0gaG9zdC5nZXROZXdMaW5lKCk7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgaWYgKGluZGVudCkge1xuICAgIHJlc3VsdCArPSBuZXdMaW5lO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICcgICc7XG4gICAgfVxuICB9XG4gIHJlc3VsdCArPSBjaGFpbi5tZXNzYWdlVGV4dDtcblxuICBjb25zdCBwb3NpdGlvbiA9IGNoYWluLnBvc2l0aW9uO1xuICAvLyBhZGQgcG9zaXRpb24gaWYgYXZhaWxhYmxlLCBhbmQgd2UgYXJlIG5vdCBhdCB0aGUgZGVwZXN0IGZyYW1lXG4gIGlmIChwb3NpdGlvbiAmJiBpbmRlbnQgIT09IDApIHtcbiAgICByZXN1bHQgKz0gYCBhdCAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihwb3NpdGlvbiwgaG9zdCl9YDtcbiAgfVxuXG4gIGluZGVudCsrO1xuICBpZiAoY2hhaW4ubmV4dCkge1xuICAgIGZvciAoY29uc3Qga2lkIG9mIGNoYWluLm5leHQpIHtcbiAgICAgIHJlc3VsdCArPSBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihraWQsIGhvc3QsIGluZGVudCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IGFwaS5EaWFnbm9zdGljLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG4gIGNvbnN0IG5ld0xpbmUgPSBob3N0LmdldE5ld0xpbmUoKTtcbiAgY29uc3Qgc3BhbiA9IGRpYWdub3N0aWMuc3BhbjtcbiAgaWYgKHNwYW4pIHtcbiAgICByZXN1bHQgKz0gYCR7XG4gICAgICAgIGZvcm1hdERpYWdub3N0aWNQb3NpdGlvbihcbiAgICAgICAgICAgIHtmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgbGluZTogc3Bhbi5zdGFydC5saW5lLCBjb2x1bW46IHNwYW4uc3RhcnQuY29sfSxcbiAgICAgICAgICAgIGhvc3QpfTogYDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLnBvc2l0aW9uKSB7XG4gICAgcmVzdWx0ICs9IGAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihkaWFnbm9zdGljLnBvc2l0aW9uLCBob3N0KX06IGA7XG4gIH1cbiAgaWYgKGRpYWdub3N0aWMuc3BhbiAmJiBkaWFnbm9zdGljLnNwYW4uZGV0YWlscykge1xuICAgIHJlc3VsdCArPSBgJHtkaWFnbm9zdGljLnNwYW4uZGV0YWlsc30sICR7ZGlhZ25vc3RpYy5tZXNzYWdlVGV4dH0ke25ld0xpbmV9YDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLmNoYWluKSB7XG4gICAgcmVzdWx0ICs9IGAke2ZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZUNoYWluKGRpYWdub3N0aWMuY2hhaW4sIGhvc3QpfS4ke25ld0xpbmV9YDtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQgKz0gYCR7ZGlhZ25vc3RpYy5tZXNzYWdlVGV4dH0ke25ld0xpbmV9YDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGlhZ25vc3RpY3MoXG4gICAgZGlhZ3M6IERpYWdub3N0aWNzLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIGlmIChkaWFncyAmJiBkaWFncy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZGlhZ3NcbiAgICAgICAgLm1hcChkaWFnbm9zdGljID0+IHtcbiAgICAgICAgICBpZiAoYXBpLmlzVHNEaWFnbm9zdGljKGRpYWdub3N0aWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgaG9zdCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBob3N0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKCcnKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgcHJvamVjdDogc3RyaW5nO1xuICBvcHRpb25zOiBhcGkuQ29tcGlsZXJPcHRpb25zO1xuICByb290TmFtZXM6IHN0cmluZ1tdO1xuICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3M7XG4gIGVycm9yczogRGlhZ25vc3RpY3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUHJvamVjdEZpbGVBbmRCYXNlUGF0aChwcm9qZWN0OiBzdHJpbmcpOlxuICAgIHtwcm9qZWN0RmlsZTogQWJzb2x1dGVGc1BhdGgsIGJhc2VQYXRoOiBBYnNvbHV0ZUZzUGF0aH0ge1xuICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgY29uc3QgYWJzUHJvamVjdCA9IGZzLnJlc29sdmUocHJvamVjdCk7XG4gIGNvbnN0IHByb2plY3RJc0RpciA9IGZzLmxzdGF0KGFic1Byb2plY3QpLmlzRGlyZWN0b3J5KCk7XG4gIGNvbnN0IHByb2plY3RGaWxlID0gcHJvamVjdElzRGlyID8gZnMuam9pbihhYnNQcm9qZWN0LCAndHNjb25maWcuanNvbicpIDogYWJzUHJvamVjdDtcbiAgY29uc3QgcHJvamVjdERpciA9IHByb2plY3RJc0RpciA/IGFic1Byb2plY3QgOiBmcy5kaXJuYW1lKGFic1Byb2plY3QpO1xuICBjb25zdCBiYXNlUGF0aCA9IGZzLnJlc29sdmUocHJvamVjdERpcik7XG4gIHJldHVybiB7cHJvamVjdEZpbGUsIGJhc2VQYXRofTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5nQ29tcGlsZXJPcHRpb25zKFxuICAgIGJhc2VQYXRoOiBzdHJpbmcsIGNvbmZpZzogYW55LCB0c09wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucyk6IGFwaS5Db21waWxlck9wdGlvbnMge1xuICAvLyBlbmFibGVJdnkgYG5ndHNjYCBpcyBhbiBhbGlhcyBmb3IgYHRydWVgLlxuICBjb25zdCB7YW5ndWxhckNvbXBpbGVyT3B0aW9ucyA9IHt9fSA9IGNvbmZpZztcbiAgY29uc3Qge2VuYWJsZUl2eX0gPSBhbmd1bGFyQ29tcGlsZXJPcHRpb25zO1xuICBhbmd1bGFyQ29tcGlsZXJPcHRpb25zLmVuYWJsZUl2eSA9IGVuYWJsZUl2eSAhPT0gZmFsc2UgJiYgZW5hYmxlSXZ5ICE9PSAndHNjJztcblxuICByZXR1cm4gey4uLnRzT3B0aW9ucywgLi4uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgZ2VuRGlyOiBiYXNlUGF0aCwgYmFzZVBhdGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZ3VyYXRpb24oXG4gICAgcHJvamVjdDogc3RyaW5nLCBleGlzdGluZ09wdGlvbnM/OiB0cy5Db21waWxlck9wdGlvbnMpOiBQYXJzZWRDb25maWd1cmF0aW9uIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmcyA9IGdldEZpbGVTeXN0ZW0oKTtcbiAgICBjb25zdCB7cHJvamVjdEZpbGUsIGJhc2VQYXRofSA9IGNhbGNQcm9qZWN0RmlsZUFuZEJhc2VQYXRoKHByb2plY3QpO1xuXG4gICAgY29uc3QgcmVhZEV4dGVuZGVkQ29uZmlnRmlsZSA9XG4gICAgICAgIChjb25maWdGaWxlOiBzdHJpbmcsIGV4aXN0aW5nQ29uZmlnPzogYW55KToge2NvbmZpZz86IGFueSwgZXJyb3I/OiB0cy5EaWFnbm9zdGljfSA9PiB7XG4gICAgICAgICAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gdHMucmVhZENvbmZpZ0ZpbGUoY29uZmlnRmlsZSwgdHMuc3lzLnJlYWRGaWxlKTtcblxuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIHtlcnJvcn07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbnRvIG1lcmdpbmcgJ2FuZ3VsYXJDb21waWxlck9wdGlvbnMnIGFzXG4gICAgICAgICAgLy8gb3RoZXIgb3B0aW9ucyBsaWtlICdjb21waWxlck9wdGlvbnMnIGFyZSBtZXJnZWQgYnkgVFNcbiAgICAgICAgICBjb25zdCBiYXNlQ29uZmlnID0gZXhpc3RpbmdDb25maWcgfHwgY29uZmlnO1xuICAgICAgICAgIGlmIChleGlzdGluZ0NvbmZpZykge1xuICAgICAgICAgICAgYmFzZUNvbmZpZy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zID0gey4uLmNvbmZpZy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmJhc2VDb25maWcuYW5ndWxhckNvbXBpbGVyT3B0aW9uc307XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGNvbmZpZy5leHRlbmRzKSB7XG4gICAgICAgICAgICBsZXQgZXh0ZW5kZWRDb25maWdQYXRoID0gZnMucmVzb2x2ZShmcy5kaXJuYW1lKGNvbmZpZ0ZpbGUpLCBjb25maWcuZXh0ZW5kcyk7XG4gICAgICAgICAgICBleHRlbmRlZENvbmZpZ1BhdGggPSBmcy5leHRuYW1lKGV4dGVuZGVkQ29uZmlnUGF0aCkgP1xuICAgICAgICAgICAgICAgIGV4dGVuZGVkQ29uZmlnUGF0aCA6XG4gICAgICAgICAgICAgICAgYWJzb2x1dGVGcm9tKGAke2V4dGVuZGVkQ29uZmlnUGF0aH0uanNvbmApO1xuXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzKGV4dGVuZGVkQ29uZmlnUGF0aCkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCByZWFkIGNvbmZpZyByZWN1cnNpdmVseSBhcyBUeXBlU2NyaXB0IG9ubHkgbWVyZ2VzIENvbXBpbGVyT3B0aW9uc1xuICAgICAgICAgICAgICByZXR1cm4gcmVhZEV4dGVuZGVkQ29uZmlnRmlsZShleHRlbmRlZENvbmZpZ1BhdGgsIGJhc2VDb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiB7Y29uZmlnOiBiYXNlQ29uZmlnfTtcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHJlYWRFeHRlbmRlZENvbmZpZ0ZpbGUocHJvamVjdEZpbGUpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm9qZWN0LFxuICAgICAgICBlcnJvcnM6IFtlcnJvcl0sXG4gICAgICAgIHJvb3ROYW1lczogW10sXG4gICAgICAgIG9wdGlvbnM6IHt9LFxuICAgICAgICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdFxuICAgICAgfTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VDb25maWdIb3N0ID0ge1xuICAgICAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lczogdHJ1ZSxcbiAgICAgIGZpbGVFeGlzdHM6IGZzLmV4aXN0cy5iaW5kKGZzKSxcbiAgICAgIHJlYWREaXJlY3Rvcnk6IHRzLnN5cy5yZWFkRGlyZWN0b3J5LFxuICAgICAgcmVhZEZpbGU6IHRzLnN5cy5yZWFkRmlsZVxuICAgIH07XG4gICAgY29uc3QgY29uZmlnRmlsZU5hbWUgPSBmcy5yZXNvbHZlKGZzLnB3ZCgpLCBwcm9qZWN0RmlsZSk7XG4gICAgY29uc3QgcGFyc2VkID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgICAgIGNvbmZpZywgcGFyc2VDb25maWdIb3N0LCBiYXNlUGF0aCwgZXhpc3RpbmdPcHRpb25zLCBjb25maWdGaWxlTmFtZSk7XG4gICAgY29uc3Qgcm9vdE5hbWVzID0gcGFyc2VkLmZpbGVOYW1lcztcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBjcmVhdGVOZ0NvbXBpbGVyT3B0aW9ucyhiYXNlUGF0aCwgY29uZmlnLCBwYXJzZWQub3B0aW9ucyk7XG4gICAgbGV0IGVtaXRGbGFncyA9IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdDtcbiAgICBpZiAoIShvcHRpb25zLnNraXBNZXRhZGF0YUVtaXQgfHwgb3B0aW9ucy5mbGF0TW9kdWxlT3V0RmlsZSkpIHtcbiAgICAgIGVtaXRGbGFncyB8PSBhcGkuRW1pdEZsYWdzLk1ldGFkYXRhO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5za2lwVGVtcGxhdGVDb2RlZ2VuKSB7XG4gICAgICBlbWl0RmxhZ3MgPSBlbWl0RmxhZ3MgJiB+YXBpLkVtaXRGbGFncy5Db2RlZ2VuO1xuICAgIH1cbiAgICByZXR1cm4ge3Byb2plY3Q6IHByb2plY3RGaWxlLCByb290TmFtZXMsIG9wdGlvbnMsIGVycm9yczogcGFyc2VkLmVycm9ycywgZW1pdEZsYWdzfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yczogRGlhZ25vc3RpY3MgPSBbe1xuICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgIG1lc3NhZ2VUZXh0OiBlLnN0YWNrLFxuICAgICAgc291cmNlOiBhcGkuU09VUkNFLFxuICAgICAgY29kZTogYXBpLlVOS05PV05fRVJST1JfQ09ERVxuICAgIH1dO1xuICAgIHJldHVybiB7cHJvamVjdDogJycsIGVycm9ycywgcm9vdE5hbWVzOiBbXSwgb3B0aW9uczoge30sIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0fTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCB7XG4gIGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcztcbiAgcHJvZ3JhbT86IGFwaS5Qcm9ncmFtO1xuICBlbWl0UmVzdWx0PzogdHMuRW1pdFJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4aXRDb2RlRnJvbVJlc3VsdChkaWFnczogRGlhZ25vc3RpY3MgfCB1bmRlZmluZWQpOiBudW1iZXIge1xuICBpZiAoIWRpYWdzIHx8IGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGRpYWdzKS5sZW5ndGggPT09IDApIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGEgcmVzdWx0IGFuZCBkaWRuJ3QgZ2V0IGFueSBlcnJvcnMsIHdlIHN1Y2NlZWRlZC5cbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIC8vIFJldHVybiAyIGlmIGFueSBvZiB0aGUgZXJyb3JzIHdlcmUgdW5rbm93bi5cbiAgcmV0dXJuIGRpYWdzLnNvbWUoZCA9PiBkLnNvdXJjZSA9PT0gJ2FuZ3VsYXInICYmIGQuY29kZSA9PT0gYXBpLlVOS05PV05fRVJST1JfQ09ERSkgPyAyIDogMTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBlcmZvcm1Db21waWxhdGlvbihcbiAgICB7cm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCBvbGRQcm9ncmFtLCBlbWl0Q2FsbGJhY2ssIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgZ2F0aGVyRGlhZ25vc3RpY3MgPSBkZWZhdWx0R2F0aGVyRGlhZ25vc3RpY3MsIGN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgZW1pdEZsYWdzID0gYXBpLkVtaXRGbGFncy5EZWZhdWx0LCBtb2RpZmllZFJlc291cmNlRmlsZXMgPSBudWxsfToge1xuICAgICAgcm9vdE5hbWVzOiBzdHJpbmdbXSxcbiAgICAgIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnMsXG4gICAgICBob3N0PzogYXBpLkNvbXBpbGVySG9zdCxcbiAgICAgIG9sZFByb2dyYW0/OiBhcGkuUHJvZ3JhbSxcbiAgICAgIGVtaXRDYWxsYmFjaz86IGFwaS5Uc0VtaXRDYWxsYmFjayxcbiAgICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayxcbiAgICAgIGdhdGhlckRpYWdub3N0aWNzPzogKHByb2dyYW06IGFwaS5Qcm9ncmFtKSA9PiBEaWFnbm9zdGljcyxcbiAgICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMsXG4gICAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzLFxuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzPzogU2V0PHN0cmluZz58IG51bGwsXG4gICAgfSk6IFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCB7XG4gIGxldCBwcm9ncmFtOiBhcGkuUHJvZ3JhbXx1bmRlZmluZWQ7XG4gIGxldCBlbWl0UmVzdWx0OiB0cy5FbWl0UmVzdWx0fHVuZGVmaW5lZDtcbiAgbGV0IGFsbERpYWdub3N0aWNzOiBBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiA9IFtdO1xuICB0cnkge1xuICAgIGlmICghaG9zdCkge1xuICAgICAgaG9zdCA9IG5nLmNyZWF0ZUNvbXBpbGVySG9zdCh7b3B0aW9uc30pO1xuICAgIH1cbiAgICBpZiAobW9kaWZpZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICBob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9ICgpID0+IG1vZGlmaWVkUmVzb3VyY2VGaWxlcztcbiAgICB9XG5cbiAgICBwcm9ncmFtID0gbmcuY3JlYXRlUHJvZ3JhbSh7cm9vdE5hbWVzLCBob3N0LCBvcHRpb25zLCBvbGRQcm9ncmFtfSk7XG5cbiAgICBjb25zdCBiZWZvcmVEaWFncyA9IERhdGUubm93KCk7XG4gICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5nYXRoZXJEaWFnbm9zdGljcyhwcm9ncmFtICEpKTtcbiAgICBpZiAob3B0aW9ucy5kaWFnbm9zdGljcykge1xuICAgICAgY29uc3QgYWZ0ZXJEaWFncyA9IERhdGUubm93KCk7XG4gICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKFxuICAgICAgICAgIGNyZWF0ZU1lc3NhZ2VEaWFnbm9zdGljKGBUaW1lIGZvciBkaWFnbm9zdGljczogJHthZnRlckRpYWdzIC0gYmVmb3JlRGlhZ3N9bXMuYCkpO1xuICAgIH1cblxuICAgIGlmICghaGFzRXJyb3JzKGFsbERpYWdub3N0aWNzKSkge1xuICAgICAgZW1pdFJlc3VsdCA9XG4gICAgICAgICAgcHJvZ3JhbSAhLmVtaXQoe2VtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLCBjdXN0b21UcmFuc2Zvcm1lcnMsIGVtaXRGbGFnc30pO1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5lbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLCBwcm9ncmFtLCBlbWl0UmVzdWx0fTtcbiAgICB9XG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MsIHByb2dyYW19O1xuICB9IGNhdGNoIChlKSB7XG4gICAgbGV0IGVyck1zZzogc3RyaW5nO1xuICAgIGxldCBjb2RlOiBudW1iZXI7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIC8vIGRvbid0IHJlcG9ydCB0aGUgc3RhY2sgZm9yIHN5bnRheCBlcnJvcnMgYXMgdGhleSBhcmUgd2VsbCBrbm93biBlcnJvcnMuXG4gICAgICBlcnJNc2cgPSBlLm1lc3NhZ2U7XG4gICAgICBjb2RlID0gYXBpLkRFRkFVTFRfRVJST1JfQ09ERTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyTXNnID0gZS5zdGFjaztcbiAgICAgIC8vIEl0IGlzIG5vdCBhIHN5bnRheCBlcnJvciB3ZSBtaWdodCBoYXZlIGEgcHJvZ3JhbSB3aXRoIHVua25vd24gc3RhdGUsIGRpc2NhcmQgaXQuXG4gICAgICBwcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgICAgY29kZSA9IGFwaS5VTktOT1dOX0VSUk9SX0NPREU7XG4gICAgfVxuICAgIGFsbERpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIHtjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBtZXNzYWdlVGV4dDogZXJyTXNnLCBjb2RlLCBzb3VyY2U6IGFwaS5TT1VSQ0V9KTtcbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcywgcHJvZ3JhbX07XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0R2F0aGVyRGlhZ25vc3RpY3MocHJvZ3JhbTogYXBpLlByb2dyYW0pOiBEaWFnbm9zdGljcyB7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiBBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrRGlhZ25vc3RpY3MoZGlhZ3M6IERpYWdub3N0aWNzIHwgdW5kZWZpbmVkKSB7XG4gICAgaWYgKGRpYWdzKSB7XG4gICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmRpYWdzKTtcbiAgICAgIHJldHVybiAhaGFzRXJyb3JzKGRpYWdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBsZXQgY2hlY2tPdGhlckRpYWdub3N0aWNzID0gdHJ1ZTtcbiAgLy8gQ2hlY2sgcGFyYW1ldGVyIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9IGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJlxuICAgICAgY2hlY2tEaWFnbm9zdGljcyhbLi4ucHJvZ3JhbS5nZXRUc09wdGlvbkRpYWdub3N0aWNzKCksIC4uLnByb2dyYW0uZ2V0TmdPcHRpb25EaWFnbm9zdGljcygpXSk7XG5cbiAgLy8gQ2hlY2sgc3ludGFjdGljIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9XG4gICAgICBjaGVja090aGVyRGlhZ25vc3RpY3MgJiYgY2hlY2tEaWFnbm9zdGljcyhwcm9ncmFtLmdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoKSBhcyBEaWFnbm9zdGljcyk7XG5cbiAgLy8gQ2hlY2sgVHlwZVNjcmlwdCBzZW1hbnRpYyBhbmQgQW5ndWxhciBzdHJ1Y3R1cmUgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID1cbiAgICAgIGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJlxuICAgICAgY2hlY2tEaWFnbm9zdGljcyhcbiAgICAgICAgICBbLi4ucHJvZ3JhbS5nZXRUc1NlbWFudGljRGlhZ25vc3RpY3MoKSwgLi4ucHJvZ3JhbS5nZXROZ1N0cnVjdHVyYWxEaWFnbm9zdGljcygpXSk7XG5cbiAgLy8gQ2hlY2sgQW5ndWxhciBzZW1hbnRpYyBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPVxuICAgICAgY2hlY2tPdGhlckRpYWdub3N0aWNzICYmIGNoZWNrRGlhZ25vc3RpY3MocHJvZ3JhbS5nZXROZ1NlbWFudGljRGlhZ25vc3RpY3MoKSBhcyBEaWFnbm9zdGljcyk7XG5cbiAgcmV0dXJuIGFsbERpYWdub3N0aWNzO1xufVxuXG5mdW5jdGlvbiBoYXNFcnJvcnMoZGlhZ3M6IERpYWdub3N0aWNzKSB7XG4gIHJldHVybiBkaWFncy5zb21lKGQgPT4gZC5jYXRlZ29yeSA9PT0gdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yKTtcbn1cbiJdfQ==