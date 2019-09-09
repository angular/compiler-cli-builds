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
        var _a = config.angularCompilerOptions, angularCompilerOptions = _a === void 0 ? {} : _a;
        var enableIvy = angularCompilerOptions.enableIvy;
        angularCompilerOptions.enableIvy = enableIvy !== false && enableIvy !== 'tsc';
        return tslib_1.__assign({}, tsOptions, angularCompilerOptions, { genDir: basePath, basePath: basePath });
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
            var _b = readExtendedConfigFile_1(projectFile), config = _b.config, error_1 = _b.error;
            if (error_1) {
                return {
                    project: project,
                    errors: [error_1],
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV9jb21waWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9wZXJmb3JtX2NvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQTBEO0lBQzFELCtCQUFpQztJQUNqQywyRUFBd0c7SUFDeEcsZ0VBQTBDO0lBQzFDLHdFQUFrRDtJQUNsRCxvRUFBNEQ7SUFJNUQsU0FBZ0IsdUJBQXVCLENBQUMsV0FBd0I7UUFDOUQsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUE1QyxDQUE0QyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUZELDBEQUVDO0lBRUQsSUFBTSxpQkFBaUIsR0FBNkI7UUFDbEQsbUJBQW1CLEVBQUUsY0FBTSxPQUFBLEVBQUUsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsRUFBNUIsQ0FBNEI7UUFDdkQsb0JBQW9CLEVBQUUsVUFBQSxRQUFRLElBQUksT0FBQSxRQUFRLEVBQVIsQ0FBUTtRQUMxQyxVQUFVLEVBQUUsY0FBTSxPQUFBLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFkLENBQWM7S0FDakMsQ0FBQztJQUVGLFNBQVMsZUFBZSxDQUFDLFFBQWdCLEVBQUUsSUFBOEI7UUFDdkUsT0FBTyxzQkFBUSxDQUNYLHFCQUFPLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxxQkFBTyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVELFNBQWdCLHdCQUF3QixDQUNwQyxRQUFrQixFQUFFLElBQWtEO1FBQWxELHFCQUFBLEVBQUEsd0JBQWtEO1FBQ3hFLE9BQVUs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LENBQUM7SUEvQkQsNERBK0JDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBa0I7UUFDbkMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUExQyxDQUEwQyxDQUFDLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQb3NpdGlvbiwgaXNTeW50YXhFcnJvcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBhYnNvbHV0ZUZyb20sIGdldEZpbGVTeXN0ZW0sIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuaW1wb3J0IHtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpY30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmV4cG9ydCB0eXBlIERpYWdub3N0aWNzID0gUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPjtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcyk6IERpYWdub3N0aWNzIHtcbiAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihkID0+IGQuY2F0ZWdvcnkgIT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlKTtcbn1cblxuY29uc3QgZGVmYXVsdEZvcm1hdEhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gZGlzcGxheUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiByZWxhdGl2ZShcbiAgICAgIHJlc29sdmUoaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkpLCByZXNvbHZlKGhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljUG9zaXRpb24oXG4gICAgcG9zaXRpb246IFBvc2l0aW9uLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtkaXNwbGF5RmlsZU5hbWUocG9zaXRpb24uZmlsZU5hbWUsIGhvc3QpfSgke3Bvc2l0aW9uLmxpbmUgKyAxfSwke3Bvc2l0aW9uLmNvbHVtbisxfSlgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4oXG4gICAgY2hhaW46IGFwaS5EaWFnbm9zdGljTWVzc2FnZUNoYWluLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIGxldCByZXN1bHQgPSBjaGFpbi5tZXNzYWdlVGV4dDtcbiAgbGV0IGluZGVudCA9IDE7XG4gIGxldCBjdXJyZW50ID0gY2hhaW4ubmV4dDtcbiAgY29uc3QgbmV3TGluZSA9IGhvc3QuZ2V0TmV3TGluZSgpO1xuICB3aGlsZSAoY3VycmVudCkge1xuICAgIHJlc3VsdCArPSBuZXdMaW5lO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW5kZW50OyBpKyspIHtcbiAgICAgIHJlc3VsdCArPSAnICAnO1xuICAgIH1cbiAgICByZXN1bHQgKz0gY3VycmVudC5tZXNzYWdlVGV4dDtcbiAgICBjb25zdCBwb3NpdGlvbiA9IGN1cnJlbnQucG9zaXRpb247XG4gICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICByZXN1bHQgKz0gYCBhdCAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihwb3NpdGlvbiwgaG9zdCl9YDtcbiAgICB9XG4gICAgY3VycmVudCA9IGN1cnJlbnQubmV4dDtcbiAgICBpbmRlbnQrKztcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGlhZ25vc3RpYyhcbiAgICBkaWFnbm9zdGljOiBhcGkuRGlhZ25vc3RpYywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0gZGVmYXVsdEZvcm1hdEhvc3QpIHtcbiAgbGV0IHJlc3VsdCA9ICcnO1xuICBjb25zdCBuZXdMaW5lID0gaG9zdC5nZXROZXdMaW5lKCk7XG4gIGNvbnN0IHNwYW4gPSBkaWFnbm9zdGljLnNwYW47XG4gIGlmIChzcGFuKSB7XG4gICAgcmVzdWx0ICs9IGAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbih7XG4gICAgICBmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCxcbiAgICAgIGxpbmU6IHNwYW4uc3RhcnQubGluZSxcbiAgICAgIGNvbHVtbjogc3Bhbi5zdGFydC5jb2xcbiAgICB9LCBob3N0KX06IGA7XG4gIH0gZWxzZSBpZiAoZGlhZ25vc3RpYy5wb3NpdGlvbikge1xuICAgIHJlc3VsdCArPSBgJHtmb3JtYXREaWFnbm9zdGljUG9zaXRpb24oZGlhZ25vc3RpYy5wb3NpdGlvbiwgaG9zdCl9OiBgO1xuICB9XG4gIGlmIChkaWFnbm9zdGljLnNwYW4gJiYgZGlhZ25vc3RpYy5zcGFuLmRldGFpbHMpIHtcbiAgICByZXN1bHQgKz0gYCR7ZGlhZ25vc3RpYy5zcGFuLmRldGFpbHN9LCAke2RpYWdub3N0aWMubWVzc2FnZVRleHR9JHtuZXdMaW5lfWA7XG4gIH0gZWxzZSBpZiAoZGlhZ25vc3RpYy5jaGFpbikge1xuICAgIHJlc3VsdCArPSBgJHtmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihkaWFnbm9zdGljLmNoYWluLCBob3N0KX0uJHtuZXdMaW5lfWA7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ICs9IGAke2RpYWdub3N0aWMubWVzc2FnZVRleHR9JHtuZXdMaW5lfWA7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpYWdub3N0aWNzKFxuICAgIGRpYWdzOiBEaWFnbm9zdGljcywgaG9zdDogdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0gZGVmYXVsdEZvcm1hdEhvc3QpOiBzdHJpbmcge1xuICBpZiAoZGlhZ3MgJiYgZGlhZ3MubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGRpYWdzXG4gICAgICAgIC5tYXAoZGlhZ25vc3RpYyA9PiB7XG4gICAgICAgICAgaWYgKGFwaS5pc1RzRGlhZ25vc3RpYyhkaWFnbm9zdGljKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRzLmZvcm1hdERpYWdub3N0aWNzKFtkaWFnbm9zdGljXSwgaG9zdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXREaWFnbm9zdGljKGRpYWdub3N0aWMsIGhvc3QpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oJycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICBwcm9qZWN0OiBzdHJpbmc7XG4gIG9wdGlvbnM6IGFwaS5Db21waWxlck9wdGlvbnM7XG4gIHJvb3ROYW1lczogc3RyaW5nW107XG4gIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncztcbiAgZXJyb3JzOiBEaWFnbm9zdGljcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNQcm9qZWN0RmlsZUFuZEJhc2VQYXRoKHByb2plY3Q6IHN0cmluZyk6XG4gICAge3Byb2plY3RGaWxlOiBBYnNvbHV0ZUZzUGF0aCwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICBjb25zdCBhYnNQcm9qZWN0ID0gZnMucmVzb2x2ZShwcm9qZWN0KTtcbiAgY29uc3QgcHJvamVjdElzRGlyID0gZnMubHN0YXQoYWJzUHJvamVjdCkuaXNEaXJlY3RvcnkoKTtcbiAgY29uc3QgcHJvamVjdEZpbGUgPSBwcm9qZWN0SXNEaXIgPyBmcy5qb2luKGFic1Byb2plY3QsICd0c2NvbmZpZy5qc29uJykgOiBhYnNQcm9qZWN0O1xuICBjb25zdCBwcm9qZWN0RGlyID0gcHJvamVjdElzRGlyID8gYWJzUHJvamVjdCA6IGZzLmRpcm5hbWUoYWJzUHJvamVjdCk7XG4gIGNvbnN0IGJhc2VQYXRoID0gZnMucmVzb2x2ZShwcm9qZWN0RGlyKTtcbiAgcmV0dXJuIHtwcm9qZWN0RmlsZSwgYmFzZVBhdGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTmdDb21waWxlck9wdGlvbnMoXG4gICAgYmFzZVBhdGg6IHN0cmluZywgY29uZmlnOiBhbnksIHRzT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zKTogYXBpLkNvbXBpbGVyT3B0aW9ucyB7XG4gIC8vIGVuYWJsZUl2eSBgbmd0c2NgIGlzIGFuIGFsaWFzIGZvciBgdHJ1ZWAuXG4gIGNvbnN0IHthbmd1bGFyQ29tcGlsZXJPcHRpb25zID0ge319ID0gY29uZmlnO1xuICBjb25zdCB7ZW5hYmxlSXZ5fSA9IGFuZ3VsYXJDb21waWxlck9wdGlvbnM7XG4gIGFuZ3VsYXJDb21waWxlck9wdGlvbnMuZW5hYmxlSXZ5ID0gZW5hYmxlSXZ5ICE9PSBmYWxzZSAmJiBlbmFibGVJdnkgIT09ICd0c2MnO1xuXG4gIHJldHVybiB7Li4udHNPcHRpb25zLCAuLi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLCBnZW5EaXI6IGJhc2VQYXRoLCBiYXNlUGF0aH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29uZmlndXJhdGlvbihcbiAgICBwcm9qZWN0OiBzdHJpbmcsIGV4aXN0aW5nT3B0aW9ucz86IHRzLkNvbXBpbGVyT3B0aW9ucyk6IFBhcnNlZENvbmZpZ3VyYXRpb24ge1xuICB0cnkge1xuICAgIGNvbnN0IGZzID0gZ2V0RmlsZVN5c3RlbSgpO1xuICAgIGNvbnN0IHtwcm9qZWN0RmlsZSwgYmFzZVBhdGh9ID0gY2FsY1Byb2plY3RGaWxlQW5kQmFzZVBhdGgocHJvamVjdCk7XG5cbiAgICBjb25zdCByZWFkRXh0ZW5kZWRDb25maWdGaWxlID1cbiAgICAgICAgKGNvbmZpZ0ZpbGU6IHN0cmluZywgZXhpc3RpbmdDb25maWc/OiBhbnkpOiB7Y29uZmlnPzogYW55LCBlcnJvcj86IHRzLkRpYWdub3N0aWN9ID0+IHtcbiAgICAgICAgICBjb25zdCB7Y29uZmlnLCBlcnJvcn0gPSB0cy5yZWFkQ29uZmlnRmlsZShjb25maWdGaWxlLCB0cy5zeXMucmVhZEZpbGUpO1xuXG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4ge2Vycm9yfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGludG8gbWVyZ2luZyAnYW5ndWxhckNvbXBpbGVyT3B0aW9ucycgYXNcbiAgICAgICAgICAvLyBvdGhlciBvcHRpb25zIGxpa2UgJ2NvbXBpbGVyT3B0aW9ucycgYXJlIG1lcmdlZCBieSBUU1xuICAgICAgICAgIGNvbnN0IGJhc2VDb25maWcgPSBleGlzdGluZ0NvbmZpZyB8fCBjb25maWc7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nQ29uZmlnKSB7XG4gICAgICAgICAgICBiYXNlQ29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMgPSB7Li4uY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uYmFzZUNvbmZpZy5hbmd1bGFyQ29tcGlsZXJPcHRpb25zfTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoY29uZmlnLmV4dGVuZHMpIHtcbiAgICAgICAgICAgIGxldCBleHRlbmRlZENvbmZpZ1BhdGggPSBmcy5yZXNvbHZlKGZzLmRpcm5hbWUoY29uZmlnRmlsZSksIGNvbmZpZy5leHRlbmRzKTtcbiAgICAgICAgICAgIGV4dGVuZGVkQ29uZmlnUGF0aCA9IGZzLmV4dG5hbWUoZXh0ZW5kZWRDb25maWdQYXRoKSA/XG4gICAgICAgICAgICAgICAgZXh0ZW5kZWRDb25maWdQYXRoIDpcbiAgICAgICAgICAgICAgICBhYnNvbHV0ZUZyb20oYCR7ZXh0ZW5kZWRDb25maWdQYXRofS5qc29uYCk7XG5cbiAgICAgICAgICAgIGlmIChmcy5leGlzdHMoZXh0ZW5kZWRDb25maWdQYXRoKSkge1xuICAgICAgICAgICAgICAvLyBDYWxsIHJlYWQgY29uZmlnIHJlY3Vyc2l2ZWx5IGFzIFR5cGVTY3JpcHQgb25seSBtZXJnZXMgQ29tcGlsZXJPcHRpb25zXG4gICAgICAgICAgICAgIHJldHVybiByZWFkRXh0ZW5kZWRDb25maWdGaWxlKGV4dGVuZGVkQ29uZmlnUGF0aCwgYmFzZUNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHtjb25maWc6IGJhc2VDb25maWd9O1xuICAgICAgICB9O1xuXG4gICAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gcmVhZEV4dGVuZGVkQ29uZmlnRmlsZShwcm9qZWN0RmlsZSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb2plY3QsXG4gICAgICAgIGVycm9yczogW2Vycm9yXSxcbiAgICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0XG4gICAgICB9O1xuICAgIH1cbiAgICBjb25zdCBwYXJzZUNvbmZpZ0hvc3QgPSB7XG4gICAgICB1c2VDYXNlU2Vuc2l0aXZlRmlsZU5hbWVzOiB0cnVlLFxuICAgICAgZmlsZUV4aXN0czogZnMuZXhpc3RzLmJpbmQoZnMpLFxuICAgICAgcmVhZERpcmVjdG9yeTogdHMuc3lzLnJlYWREaXJlY3RvcnksXG4gICAgICByZWFkRmlsZTogdHMuc3lzLnJlYWRGaWxlXG4gICAgfTtcbiAgICBjb25zdCBjb25maWdGaWxlTmFtZSA9IGZzLnJlc29sdmUoZnMucHdkKCksIHByb2plY3RGaWxlKTtcbiAgICBjb25zdCBwYXJzZWQgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudChcbiAgICAgICAgY29uZmlnLCBwYXJzZUNvbmZpZ0hvc3QsIGJhc2VQYXRoLCBleGlzdGluZ09wdGlvbnMsIGNvbmZpZ0ZpbGVOYW1lKTtcbiAgICBjb25zdCByb290TmFtZXMgPSBwYXJzZWQuZmlsZU5hbWVzO1xuXG4gICAgY29uc3Qgb3B0aW9ucyA9IGNyZWF0ZU5nQ29tcGlsZXJPcHRpb25zKGJhc2VQYXRoLCBjb25maWcsIHBhcnNlZC5vcHRpb25zKTtcbiAgICBsZXQgZW1pdEZsYWdzID0gYXBpLkVtaXRGbGFncy5EZWZhdWx0O1xuICAgIGlmICghKG9wdGlvbnMuc2tpcE1ldGFkYXRhRW1pdCB8fCBvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSkge1xuICAgICAgZW1pdEZsYWdzIHw9IGFwaS5FbWl0RmxhZ3MuTWV0YWRhdGE7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4pIHtcbiAgICAgIGVtaXRGbGFncyA9IGVtaXRGbGFncyAmIH5hcGkuRW1pdEZsYWdzLkNvZGVnZW47XG4gICAgfVxuICAgIHJldHVybiB7cHJvamVjdDogcHJvamVjdEZpbGUsIHJvb3ROYW1lcywgb3B0aW9ucywgZXJyb3JzOiBwYXJzZWQuZXJyb3JzLCBlbWl0RmxhZ3N9O1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc3QgZXJyb3JzOiBEaWFnbm9zdGljcyA9IFt7XG4gICAgICBjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLFxuICAgICAgbWVzc2FnZVRleHQ6IGUuc3RhY2ssXG4gICAgICBzb3VyY2U6IGFwaS5TT1VSQ0UsXG4gICAgICBjb2RlOiBhcGkuVU5LTk9XTl9FUlJPUl9DT0RFXG4gICAgfV07XG4gICAgcmV0dXJuIHtwcm9qZWN0OiAnJywgZXJyb3JzLCByb290TmFtZXM6IFtdLCBvcHRpb25zOiB7fSwgZW1pdEZsYWdzOiBhcGkuRW1pdEZsYWdzLkRlZmF1bHR9O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGVyZm9ybUNvbXBpbGF0aW9uUmVzdWx0IHtcbiAgZGlhZ25vc3RpY3M6IERpYWdub3N0aWNzO1xuICBwcm9ncmFtPzogYXBpLlByb2dyYW07XG4gIGVtaXRSZXN1bHQ/OiB0cy5FbWl0UmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhpdENvZGVGcm9tUmVzdWx0KGRpYWdzOiBEaWFnbm9zdGljcyB8IHVuZGVmaW5lZCk6IG51bWJlciB7XG4gIGlmICghZGlhZ3MgfHwgZmlsdGVyRXJyb3JzQW5kV2FybmluZ3MoZGlhZ3MpLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIElmIHdlIGhhdmUgYSByZXN1bHQgYW5kIGRpZG4ndCBnZXQgYW55IGVycm9ycywgd2Ugc3VjY2VlZGVkLlxuICAgIHJldHVybiAwO1xuICB9XG5cbiAgLy8gUmV0dXJuIDIgaWYgYW55IG9mIHRoZSBlcnJvcnMgd2VyZSB1bmtub3duLlxuICByZXR1cm4gZGlhZ3Muc29tZShkID0+IGQuc291cmNlID09PSAnYW5ndWxhcicgJiYgZC5jb2RlID09PSBhcGkuVU5LTk9XTl9FUlJPUl9DT0RFKSA/IDIgOiAxO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGVyZm9ybUNvbXBpbGF0aW9uKFxuICAgIHtyb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIG9sZFByb2dyYW0sIGVtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICAgICBnYXRoZXJEaWFnbm9zdGljcyA9IGRlZmF1bHRHYXRoZXJEaWFnbm9zdGljcywgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICAgICBlbWl0RmxhZ3MgPSBhcGkuRW1pdEZsYWdzLkRlZmF1bHQsIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IG51bGx9OiB7XG4gICAgICByb290TmFtZXM6IHN0cmluZ1tdLFxuICAgICAgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGhvc3Q/OiBhcGkuQ29tcGlsZXJIb3N0LFxuICAgICAgb2xkUHJvZ3JhbT86IGFwaS5Qcm9ncmFtLFxuICAgICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrLFxuICAgICAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrPzogYXBpLlRzTWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICAgICAgZ2F0aGVyRGlhZ25vc3RpY3M/OiAocHJvZ3JhbTogYXBpLlByb2dyYW0pID0+IERpYWdub3N0aWNzLFxuICAgICAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgICAgIGVtaXRGbGFncz86IGFwaS5FbWl0RmxhZ3MsXG4gICAgICBtb2RpZmllZFJlc291cmNlRmlsZXM/OiBTZXQ8c3RyaW5nPnwgbnVsbCxcbiAgICB9KTogUGVyZm9ybUNvbXBpbGF0aW9uUmVzdWx0IHtcbiAgbGV0IHByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgbGV0IGVtaXRSZXN1bHQ6IHRzLkVtaXRSZXN1bHR8dW5kZWZpbmVkO1xuICBsZXQgYWxsRGlhZ25vc3RpY3M6IEFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+ID0gW107XG4gIHRyeSB7XG4gICAgaWYgKCFob3N0KSB7XG4gICAgICBob3N0ID0gbmcuY3JlYXRlQ29tcGlsZXJIb3N0KHtvcHRpb25zfSk7XG4gICAgfVxuICAgIGlmIChtb2RpZmllZFJlc291cmNlRmlsZXMpIHtcbiAgICAgIGhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gKCkgPT4gbW9kaWZpZWRSZXNvdXJjZUZpbGVzO1xuICAgIH1cblxuICAgIHByb2dyYW0gPSBuZy5jcmVhdGVQcm9ncmFtKHtyb290TmFtZXMsIGhvc3QsIG9wdGlvbnMsIG9sZFByb2dyYW19KTtcblxuICAgIGNvbnN0IGJlZm9yZURpYWdzID0gRGF0ZS5ub3coKTtcbiAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmdhdGhlckRpYWdub3N0aWNzKHByb2dyYW0gISkpO1xuICAgIGlmIChvcHRpb25zLmRpYWdub3N0aWNzKSB7XG4gICAgICBjb25zdCBhZnRlckRpYWdzID0gRGF0ZS5ub3coKTtcbiAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goXG4gICAgICAgICAgY3JlYXRlTWVzc2FnZURpYWdub3N0aWMoYFRpbWUgZm9yIGRpYWdub3N0aWNzOiAke2FmdGVyRGlhZ3MgLSBiZWZvcmVEaWFnc31tcy5gKSk7XG4gICAgfVxuXG4gICAgaWYgKCFoYXNFcnJvcnMoYWxsRGlhZ25vc3RpY3MpKSB7XG4gICAgICBlbWl0UmVzdWx0ID1cbiAgICAgICAgICBwcm9ncmFtICEuZW1pdCh7ZW1pdENhbGxiYWNrLCBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssIGN1c3RvbVRyYW5zZm9ybWVycywgZW1pdEZsYWdzfSk7XG4gICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmVtaXRSZXN1bHQuZGlhZ25vc3RpY3MpO1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MsIHByb2dyYW0sIGVtaXRSZXN1bHR9O1xuICAgIH1cbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcywgcHJvZ3JhbX07XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsZXQgZXJyTXNnOiBzdHJpbmc7XG4gICAgbGV0IGNvZGU6IG51bWJlcjtcbiAgICBpZiAoaXNTeW50YXhFcnJvcihlKSkge1xuICAgICAgLy8gZG9uJ3QgcmVwb3J0IHRoZSBzdGFjayBmb3Igc3ludGF4IGVycm9ycyBhcyB0aGV5IGFyZSB3ZWxsIGtub3duIGVycm9ycy5cbiAgICAgIGVyck1zZyA9IGUubWVzc2FnZTtcbiAgICAgIGNvZGUgPSBhcGkuREVGQVVMVF9FUlJPUl9DT0RFO1xuICAgIH0gZWxzZSB7XG4gICAgICBlcnJNc2cgPSBlLnN0YWNrO1xuICAgICAgLy8gSXQgaXMgbm90IGEgc3ludGF4IGVycm9yIHdlIG1pZ2h0IGhhdmUgYSBwcm9ncmFtIHdpdGggdW5rbm93biBzdGF0ZSwgZGlzY2FyZCBpdC5cbiAgICAgIHByb2dyYW0gPSB1bmRlZmluZWQ7XG4gICAgICBjb2RlID0gYXBpLlVOS05PV05fRVJST1JfQ09ERTtcbiAgICB9XG4gICAgYWxsRGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAge2NhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsIG1lc3NhZ2VUZXh0OiBlcnJNc2csIGNvZGUsIHNvdXJjZTogYXBpLlNPVVJDRX0pO1xuICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLCBwcm9ncmFtfTtcbiAgfVxufVxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRHYXRoZXJEaWFnbm9zdGljcyhwcm9ncmFtOiBhcGkuUHJvZ3JhbSk6IERpYWdub3N0aWNzIHtcbiAgY29uc3QgYWxsRGlhZ25vc3RpY3M6IEFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+ID0gW107XG5cbiAgZnVuY3Rpb24gY2hlY2tEaWFnbm9zdGljcyhkaWFnczogRGlhZ25vc3RpY3MgfCB1bmRlZmluZWQpIHtcbiAgICBpZiAoZGlhZ3MpIHtcbiAgICAgIGFsbERpYWdub3N0aWNzLnB1c2goLi4uZGlhZ3MpO1xuICAgICAgcmV0dXJuICFoYXNFcnJvcnMoZGlhZ3MpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGxldCBjaGVja090aGVyRGlhZ25vc3RpY3MgPSB0cnVlO1xuICAvLyBDaGVjayBwYXJhbWV0ZXIgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID0gY2hlY2tPdGhlckRpYWdub3N0aWNzICYmXG4gICAgICBjaGVja0RpYWdub3N0aWNzKFsuLi5wcm9ncmFtLmdldFRzT3B0aW9uRGlhZ25vc3RpY3MoKSwgLi4ucHJvZ3JhbS5nZXROZ09wdGlvbkRpYWdub3N0aWNzKCldKTtcblxuICAvLyBDaGVjayBzeW50YWN0aWMgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID1cbiAgICAgIGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJiBjaGVja0RpYWdub3N0aWNzKHByb2dyYW0uZ2V0VHNTeW50YWN0aWNEaWFnbm9zdGljcygpIGFzIERpYWdub3N0aWNzKTtcblxuICAvLyBDaGVjayBUeXBlU2NyaXB0IHNlbWFudGljIGFuZCBBbmd1bGFyIHN0cnVjdHVyZSBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPVxuICAgICAgY2hlY2tPdGhlckRpYWdub3N0aWNzICYmXG4gICAgICBjaGVja0RpYWdub3N0aWNzKFxuICAgICAgICAgIFsuLi5wcm9ncmFtLmdldFRzU2VtYW50aWNEaWFnbm9zdGljcygpLCAuLi5wcm9ncmFtLmdldE5nU3RydWN0dXJhbERpYWdub3N0aWNzKCldKTtcblxuICAvLyBDaGVjayBBbmd1bGFyIHNlbWFudGljIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9XG4gICAgICBjaGVja090aGVyRGlhZ25vc3RpY3MgJiYgY2hlY2tEaWFnbm9zdGljcyhwcm9ncmFtLmdldE5nU2VtYW50aWNEaWFnbm9zdGljcygpIGFzIERpYWdub3N0aWNzKTtcblxuICByZXR1cm4gYWxsRGlhZ25vc3RpY3M7XG59XG5cbmZ1bmN0aW9uIGhhc0Vycm9ycyhkaWFnczogRGlhZ25vc3RpY3MpIHtcbiAgcmV0dXJuIGRpYWdzLnNvbWUoZCA9PiBkLmNhdGVnb3J5ID09PSB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IpO1xufVxuIl19