/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
    exports.defaultGatherDiagnostics = exports.performCompilation = exports.exitCodeFromResult = exports.readConfiguration = exports.calcProjectFileAndBasePath = exports.formatDiagnostics = exports.formatDiagnostic = exports.flattenDiagnosticMessageChain = exports.formatDiagnosticPosition = exports.filterErrorsAndWarnings = void 0;
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
        return (0, file_system_1.relative)((0, file_system_1.resolve)(host.getCurrentDirectory()), (0, file_system_1.resolve)(host.getCanonicalFileName(fileName)));
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
                for (var _b = (0, tslib_1.__values)(chain.next), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                    return (0, diagnostics_1.replaceTsWithNgInErrors)(ts.formatDiagnosticsWithColorAndContext([diagnostic], host));
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
    function calcProjectFileAndBasePath(project, host) {
        if (host === void 0) { host = (0, file_system_1.getFileSystem)(); }
        var absProject = host.resolve(project);
        var projectIsDir = host.lstat(absProject).isDirectory();
        var projectFile = projectIsDir ? host.join(absProject, 'tsconfig.json') : absProject;
        var projectDir = projectIsDir ? absProject : host.dirname(absProject);
        var basePath = host.resolve(projectDir);
        return { projectFile: projectFile, basePath: basePath };
    }
    exports.calcProjectFileAndBasePath = calcProjectFileAndBasePath;
    function readConfiguration(project, existingOptions, host) {
        var _a;
        if (host === void 0) { host = (0, file_system_1.getFileSystem)(); }
        try {
            var fs_1 = (0, file_system_1.getFileSystem)();
            var readConfigFile_1 = function (configFile) {
                return ts.readConfigFile(configFile, function (file) { return host.readFile(host.resolve(file)); });
            };
            var readAngularCompilerOptions_1 = function (configFile, parentOptions) {
                if (parentOptions === void 0) { parentOptions = {}; }
                var _a = readConfigFile_1(configFile), config = _a.config, error = _a.error;
                if (error) {
                    // Errors are handled later on by 'parseJsonConfigFileContent'
                    return parentOptions;
                }
                // we are only interested into merging 'angularCompilerOptions' as
                // other options like 'compilerOptions' are merged by TS
                var existingNgCompilerOptions = (0, tslib_1.__assign)((0, tslib_1.__assign)({}, config.angularCompilerOptions), parentOptions);
                if (config.extends && typeof config.extends === 'string') {
                    var extendedConfigPath = getExtendedConfigPath(configFile, config.extends, host, fs_1);
                    if (extendedConfigPath !== null) {
                        // Call readAngularCompilerOptions recursively to merge NG Compiler options
                        return readAngularCompilerOptions_1(extendedConfigPath, existingNgCompilerOptions);
                    }
                }
                return existingNgCompilerOptions;
            };
            var _b = calcProjectFileAndBasePath(project, host), projectFile = _b.projectFile, basePath = _b.basePath;
            var configFileName = host.resolve(host.pwd(), projectFile);
            var _c = readConfigFile_1(projectFile), config = _c.config, error = _c.error;
            if (error) {
                return {
                    project: project,
                    errors: [error],
                    rootNames: [],
                    options: {},
                    emitFlags: api.EmitFlags.Default
                };
            }
            var existingCompilerOptions = (0, tslib_1.__assign)((0, tslib_1.__assign)({ genDir: basePath, basePath: basePath }, readAngularCompilerOptions_1(configFileName)), existingOptions);
            var parseConfigHost = createParseConfigHost(host, fs_1);
            var _d = ts.parseJsonConfigFileContent(config, parseConfigHost, basePath, existingCompilerOptions, configFileName), options = _d.options, errors = _d.errors, rootNames = _d.fileNames, projectReferences = _d.projectReferences;
            // Coerce to boolean as `enableIvy` can be `ngtsc|true|false|undefined` here.
            options.enableIvy = !!((_a = options.enableIvy) !== null && _a !== void 0 ? _a : true);
            var emitFlags = api.EmitFlags.Default;
            if (!(options.skipMetadataEmit || options.flatModuleOutFile)) {
                emitFlags |= api.EmitFlags.Metadata;
            }
            if (options.skipTemplateCodegen) {
                emitFlags = emitFlags & ~api.EmitFlags.Codegen;
            }
            return { project: projectFile, rootNames: rootNames, projectReferences: projectReferences, options: options, errors: errors, emitFlags: emitFlags };
        }
        catch (e) {
            var errors = [{
                    category: ts.DiagnosticCategory.Error,
                    messageText: e.stack,
                    file: undefined,
                    start: undefined,
                    length: undefined,
                    source: 'angular',
                    code: api.UNKNOWN_ERROR_CODE,
                }];
            return { project: '', errors: errors, rootNames: [], options: {}, emitFlags: api.EmitFlags.Default };
        }
    }
    exports.readConfiguration = readConfiguration;
    function createParseConfigHost(host, fs) {
        if (fs === void 0) { fs = (0, file_system_1.getFileSystem)(); }
        return {
            fileExists: host.exists.bind(host),
            readDirectory: ts.sys.readDirectory,
            readFile: host.readFile.bind(host),
            useCaseSensitiveFileNames: fs.isCaseSensitive(),
        };
    }
    function getExtendedConfigPath(configFile, extendsValue, host, fs) {
        var result = getExtendedConfigPathWorker(configFile, extendsValue, host, fs);
        if (result !== null) {
            return result;
        }
        // Try to resolve the paths with a json extension append a json extension to the file in case if
        // it is missing and the resolution failed. This is to replicate TypeScript behaviour, see:
        // https://github.com/microsoft/TypeScript/blob/294a5a7d784a5a95a8048ee990400979a6bc3a1c/src/compiler/commandLineParser.ts#L2806
        return getExtendedConfigPathWorker(configFile, extendsValue + ".json", host, fs);
    }
    function getExtendedConfigPathWorker(configFile, extendsValue, host, fs) {
        if (extendsValue.startsWith('.') || fs.isRooted(extendsValue)) {
            var extendedConfigPath = host.resolve(host.dirname(configFile), extendsValue);
            if (host.exists(extendedConfigPath)) {
                return extendedConfigPath;
            }
        }
        else {
            var parseConfigHost = createParseConfigHost(host, fs);
            // Path isn't a rooted or relative path, resolve like a module.
            var resolvedModule = ts.nodeModuleNameResolver(extendsValue, configFile, { moduleResolution: ts.ModuleResolutionKind.NodeJs, resolveJsonModule: true }, parseConfigHost).resolvedModule;
            if (resolvedModule) {
                return (0, file_system_1.absoluteFrom)(resolvedModule.resolvedFileName);
            }
        }
        return null;
    }
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
            allDiagnostics.push.apply(allDiagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(gatherDiagnostics(program)), false));
            if (options.diagnostics) {
                var afterDiags = Date.now();
                allDiagnostics.push((0, util_1.createMessageDiagnostic)("Time for diagnostics: " + (afterDiags - beforeDiags) + "ms."));
            }
            if (!hasErrors(allDiagnostics)) {
                emitResult =
                    program.emit({ emitCallback: emitCallback, mergeEmitResultsCallback: mergeEmitResultsCallback, customTransformers: customTransformers, emitFlags: emitFlags });
                allDiagnostics.push.apply(allDiagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(emitResult.diagnostics), false));
                return { diagnostics: allDiagnostics, program: program, emitResult: emitResult };
            }
            return { diagnostics: allDiagnostics, program: program };
        }
        catch (e) {
            var errMsg = void 0;
            var code = void 0;
            if ((0, compiler_1.isSyntaxError)(e)) {
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
                allDiagnostics.push.apply(allDiagnostics, (0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(diags), false));
                return !hasErrors(diags);
            }
            return true;
        }
        var checkOtherDiagnostics = true;
        // Check parameter diagnostics
        checkOtherDiagnostics = checkOtherDiagnostics &&
            checkDiagnostics((0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(program.getTsOptionDiagnostics()), false), (0, tslib_1.__read)(program.getNgOptionDiagnostics()), false));
        // Check syntactic diagnostics
        checkOtherDiagnostics =
            checkOtherDiagnostics && checkDiagnostics(program.getTsSyntacticDiagnostics());
        // Check TypeScript semantic and Angular structure diagnostics
        checkOtherDiagnostics =
            checkOtherDiagnostics &&
                checkDiagnostics((0, tslib_1.__spreadArray)((0, tslib_1.__spreadArray)([], (0, tslib_1.__read)(program.getTsSemanticDiagnostics()), false), (0, tslib_1.__read)(program.getNgStructuralDiagnostics()), false));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybV9jb21waWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9wZXJmb3JtX2NvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEwRDtJQUMxRCwrQkFBaUM7SUFFakMsMkVBQXdJO0lBR3hJLDJFQUE0RDtJQUM1RCxnRUFBMEM7SUFDMUMsd0VBQWtEO0lBQ2xELG9FQUE0RDtJQUk1RCxTQUFnQix1QkFBdUIsQ0FBQyxXQUF3QjtRQUM5RCxPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQTVDLENBQTRDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRkQsMERBRUM7SUFFRCxJQUFNLGlCQUFpQixHQUE2QjtRQUNsRCxtQkFBbUIsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxFQUE1QixDQUE0QjtRQUN2RCxvQkFBb0IsRUFBRSxVQUFBLFFBQVEsSUFBSSxPQUFBLFFBQVEsRUFBUixDQUFRO1FBQzFDLFVBQVUsRUFBRSxjQUFNLE9BQUEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQWQsQ0FBYztLQUNqQyxDQUFDO0lBRUYsU0FBUyxlQUFlLENBQUMsUUFBZ0IsRUFBRSxJQUE4QjtRQUN2RSxPQUFPLElBQUEsc0JBQVEsRUFDWCxJQUFBLHFCQUFPLEVBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxJQUFBLHFCQUFPLEVBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRUQsU0FBZ0Isd0JBQXdCLENBQ3BDLFFBQWtCLEVBQUUsSUFBa0Q7UUFBbEQs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QUE0QjtZQUNwRCxJQUFJLEtBQUssRUFBRTtnQkFDVCxjQUFjLENBQUMsSUFBSSxPQUFuQixjQUFjLHFEQUFTLEtBQUssV0FBRTtnQkFDOUIsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUMxQjtZQUNELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUkscUJBQXFCLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLDhCQUE4QjtRQUM5QixxQkFBcUIsR0FBRyxxQkFBcUI7WUFDekMsZ0JBQWdCLCtFQUFLLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSwrQkFBSyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsVUFBRSxDQUFDO1FBRWpHLDhCQUE4QjtRQUM5QixxQkFBcUI7WUFDakIscUJBQXFCLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFpQixDQUFDLENBQUM7UUFFbEcsOERBQThEO1FBQzlELHFCQUFxQjtZQUNqQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQiwrRUFDUixPQUFPLENBQUMsd0JBQXdCLEVBQUUsK0JBQUssT0FBTyxDQUFDLDBCQUEwQixFQUFFLFVBQUUsQ0FBQztRQUUxRixxQ0FBcUM7UUFDckMscUJBQXFCO1lBQ2pCLHFCQUFxQixJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBaUIsQ0FBQyxDQUFDO1FBRWpHLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUEvQkQsNERBK0JDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBa0I7UUFDbkMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUExQyxDQUEwQyxDQUFDLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2lzU3ludGF4RXJyb3IsIFBvc2l0aW9ufSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIEFic29sdXRlRnNQYXRoLCBGaWxlU3lzdGVtLCBnZXRGaWxlU3lzdGVtLCBSZWFkb25seUZpbGVTeXN0ZW0sIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICcuLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOZ0NvbXBpbGVyT3B0aW9uc30gZnJvbSAnLi9uZ3RzYy9jb3JlL2FwaSc7XG5cbmltcG9ydCB7cmVwbGFjZVRzV2l0aE5nSW5FcnJvcnN9IGZyb20gJy4vbmd0c2MvZGlhZ25vc3RpY3MnO1xuaW1wb3J0ICogYXMgYXBpIGZyb20gJy4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQgKiBhcyBuZyBmcm9tICcuL3RyYW5zZm9ybWVycy9lbnRyeV9wb2ludHMnO1xuaW1wb3J0IHtjcmVhdGVNZXNzYWdlRGlhZ25vc3RpY30gZnJvbSAnLi90cmFuc2Zvcm1lcnMvdXRpbCc7XG5cbmV4cG9ydCB0eXBlIERpYWdub3N0aWNzID0gUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPjtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckVycm9yc0FuZFdhcm5pbmdzKGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcyk6IERpYWdub3N0aWNzIHtcbiAgcmV0dXJuIGRpYWdub3N0aWNzLmZpbHRlcihkID0+IGQuY2F0ZWdvcnkgIT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5NZXNzYWdlKTtcbn1cblxuY29uc3QgZGVmYXVsdEZvcm1hdEhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnkoKSxcbiAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IGZpbGVOYW1lID0+IGZpbGVOYW1lLFxuICBnZXROZXdMaW5lOiAoKSA9PiB0cy5zeXMubmV3TGluZVxufTtcblxuZnVuY3Rpb24gZGlzcGxheUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcsIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiByZWxhdGl2ZShcbiAgICAgIHJlc29sdmUoaG9zdC5nZXRDdXJyZW50RGlyZWN0b3J5KCkpLCByZXNvbHZlKGhvc3QuZ2V0Q2Fub25pY2FsRmlsZU5hbWUoZmlsZU5hbWUpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljUG9zaXRpb24oXG4gICAgcG9zaXRpb246IFBvc2l0aW9uLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtkaXNwbGF5RmlsZU5hbWUocG9zaXRpb24uZmlsZU5hbWUsIGhvc3QpfSgke3Bvc2l0aW9uLmxpbmUgKyAxfSwke3Bvc2l0aW9uLmNvbHVtbiArIDF9KWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihcbiAgICBjaGFpbjogYXBpLkRpYWdub3N0aWNNZXNzYWdlQ2hhaW4sIGhvc3Q6IHRzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IGRlZmF1bHRGb3JtYXRIb3N0LFxuICAgIGluZGVudCA9IDApOiBzdHJpbmcge1xuICBjb25zdCBuZXdMaW5lID0gaG9zdC5nZXROZXdMaW5lKCk7XG4gIGxldCByZXN1bHQgPSAnJztcbiAgaWYgKGluZGVudCkge1xuICAgIHJlc3VsdCArPSBuZXdMaW5lO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRlbnQ7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICcgICc7XG4gICAgfVxuICB9XG4gIHJlc3VsdCArPSBjaGFpbi5tZXNzYWdlVGV4dDtcblxuICBjb25zdCBwb3NpdGlvbiA9IGNoYWluLnBvc2l0aW9uO1xuICAvLyBhZGQgcG9zaXRpb24gaWYgYXZhaWxhYmxlLCBhbmQgd2UgYXJlIG5vdCBhdCB0aGUgZGVwZXN0IGZyYW1lXG4gIGlmIChwb3NpdGlvbiAmJiBpbmRlbnQgIT09IDApIHtcbiAgICByZXN1bHQgKz0gYCBhdCAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihwb3NpdGlvbiwgaG9zdCl9YDtcbiAgfVxuXG4gIGluZGVudCsrO1xuICBpZiAoY2hhaW4ubmV4dCkge1xuICAgIGZvciAoY29uc3Qga2lkIG9mIGNoYWluLm5leHQpIHtcbiAgICAgIHJlc3VsdCArPSBmbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VDaGFpbihraWQsIGhvc3QsIGluZGVudCk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREaWFnbm9zdGljKFxuICAgIGRpYWdub3N0aWM6IGFwaS5EaWFnbm9zdGljLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCkge1xuICBsZXQgcmVzdWx0ID0gJyc7XG4gIGNvbnN0IG5ld0xpbmUgPSBob3N0LmdldE5ld0xpbmUoKTtcbiAgY29uc3Qgc3BhbiA9IGRpYWdub3N0aWMuc3BhbjtcbiAgaWYgKHNwYW4pIHtcbiAgICByZXN1bHQgKz0gYCR7XG4gICAgICAgIGZvcm1hdERpYWdub3N0aWNQb3NpdGlvbihcbiAgICAgICAgICAgIHtmaWxlTmFtZTogc3Bhbi5zdGFydC5maWxlLnVybCwgbGluZTogc3Bhbi5zdGFydC5saW5lLCBjb2x1bW46IHNwYW4uc3RhcnQuY29sfSxcbiAgICAgICAgICAgIGhvc3QpfTogYDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLnBvc2l0aW9uKSB7XG4gICAgcmVzdWx0ICs9IGAke2Zvcm1hdERpYWdub3N0aWNQb3NpdGlvbihkaWFnbm9zdGljLnBvc2l0aW9uLCBob3N0KX06IGA7XG4gIH1cbiAgaWYgKGRpYWdub3N0aWMuc3BhbiAmJiBkaWFnbm9zdGljLnNwYW4uZGV0YWlscykge1xuICAgIHJlc3VsdCArPSBgJHtkaWFnbm9zdGljLnNwYW4uZGV0YWlsc30sICR7ZGlhZ25vc3RpYy5tZXNzYWdlVGV4dH0ke25ld0xpbmV9YDtcbiAgfSBlbHNlIGlmIChkaWFnbm9zdGljLmNoYWluKSB7XG4gICAgcmVzdWx0ICs9IGAke2ZsYXR0ZW5EaWFnbm9zdGljTWVzc2FnZUNoYWluKGRpYWdub3N0aWMuY2hhaW4sIGhvc3QpfS4ke25ld0xpbmV9YDtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQgKz0gYCR7ZGlhZ25vc3RpYy5tZXNzYWdlVGV4dH0ke25ld0xpbmV9YDtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGlhZ25vc3RpY3MoXG4gICAgZGlhZ3M6IERpYWdub3N0aWNzLCBob3N0OiB0cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSBkZWZhdWx0Rm9ybWF0SG9zdCk6IHN0cmluZyB7XG4gIGlmIChkaWFncyAmJiBkaWFncy5sZW5ndGgpIHtcbiAgICByZXR1cm4gZGlhZ3NcbiAgICAgICAgLm1hcChkaWFnbm9zdGljID0+IHtcbiAgICAgICAgICBpZiAoYXBpLmlzVHNEaWFnbm9zdGljKGRpYWdub3N0aWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVRzV2l0aE5nSW5FcnJvcnMoXG4gICAgICAgICAgICAgICAgdHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgaG9zdCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0RGlhZ25vc3RpYyhkaWFnbm9zdGljLCBob3N0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKCcnKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cbn1cblxuLyoqIFVzZWQgdG8gcmVhZCBjb25maWd1cmF0aW9uIGZpbGVzLiAqL1xuZXhwb3J0IHR5cGUgQ29uZmlndXJhdGlvbkhvc3QgPSBQaWNrPFxuICAgIFJlYWRvbmx5RmlsZVN5c3RlbSwgJ3JlYWRGaWxlJ3wnZXhpc3RzJ3wnbHN0YXQnfCdyZXNvbHZlJ3wnam9pbid8J2Rpcm5hbWUnfCdleHRuYW1lJ3wncHdkJz47XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIHByb2plY3Q6IHN0cmluZztcbiAgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucztcbiAgcm9vdE5hbWVzOiBzdHJpbmdbXTtcbiAgcHJvamVjdFJlZmVyZW5jZXM/OiByZWFkb25seSB0cy5Qcm9qZWN0UmVmZXJlbmNlW118dW5kZWZpbmVkO1xuICBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3M7XG4gIGVycm9yczogdHMuRGlhZ25vc3RpY1tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1Byb2plY3RGaWxlQW5kQmFzZVBhdGgoXG4gICAgcHJvamVjdDogc3RyaW5nLCBob3N0OiBDb25maWd1cmF0aW9uSG9zdCA9IGdldEZpbGVTeXN0ZW0oKSk6XG4gICAge3Byb2plY3RGaWxlOiBBYnNvbHV0ZUZzUGF0aCwgYmFzZVBhdGg6IEFic29sdXRlRnNQYXRofSB7XG4gIGNvbnN0IGFic1Byb2plY3QgPSBob3N0LnJlc29sdmUocHJvamVjdCk7XG4gIGNvbnN0IHByb2plY3RJc0RpciA9IGhvc3QubHN0YXQoYWJzUHJvamVjdCkuaXNEaXJlY3RvcnkoKTtcbiAgY29uc3QgcHJvamVjdEZpbGUgPSBwcm9qZWN0SXNEaXIgPyBob3N0LmpvaW4oYWJzUHJvamVjdCwgJ3RzY29uZmlnLmpzb24nKSA6IGFic1Byb2plY3Q7XG4gIGNvbnN0IHByb2plY3REaXIgPSBwcm9qZWN0SXNEaXIgPyBhYnNQcm9qZWN0IDogaG9zdC5kaXJuYW1lKGFic1Byb2plY3QpO1xuICBjb25zdCBiYXNlUGF0aCA9IGhvc3QucmVzb2x2ZShwcm9qZWN0RGlyKTtcbiAgcmV0dXJuIHtwcm9qZWN0RmlsZSwgYmFzZVBhdGh9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZ3VyYXRpb24oXG4gICAgcHJvamVjdDogc3RyaW5nLCBleGlzdGluZ09wdGlvbnM/OiBhcGkuQ29tcGlsZXJPcHRpb25zLFxuICAgIGhvc3Q6IENvbmZpZ3VyYXRpb25Ib3N0ID0gZ2V0RmlsZVN5c3RlbSgpKTogUGFyc2VkQ29uZmlndXJhdGlvbiB7XG4gIHRyeSB7XG4gICAgY29uc3QgZnMgPSBnZXRGaWxlU3lzdGVtKCk7XG5cbiAgICBjb25zdCByZWFkQ29uZmlnRmlsZSA9IChjb25maWdGaWxlOiBzdHJpbmcpID0+XG4gICAgICAgIHRzLnJlYWRDb25maWdGaWxlKGNvbmZpZ0ZpbGUsIGZpbGUgPT4gaG9zdC5yZWFkRmlsZShob3N0LnJlc29sdmUoZmlsZSkpKTtcbiAgICBjb25zdCByZWFkQW5ndWxhckNvbXBpbGVyT3B0aW9ucyA9XG4gICAgICAgIChjb25maWdGaWxlOiBzdHJpbmcsIHBhcmVudE9wdGlvbnM6IE5nQ29tcGlsZXJPcHRpb25zID0ge30pOiBOZ0NvbXBpbGVyT3B0aW9ucyA9PiB7XG4gICAgICAgICAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gcmVhZENvbmZpZ0ZpbGUoY29uZmlnRmlsZSk7XG5cbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEVycm9ycyBhcmUgaGFuZGxlZCBsYXRlciBvbiBieSAncGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQnXG4gICAgICAgICAgICByZXR1cm4gcGFyZW50T3B0aW9ucztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGludG8gbWVyZ2luZyAnYW5ndWxhckNvbXBpbGVyT3B0aW9ucycgYXNcbiAgICAgICAgICAvLyBvdGhlciBvcHRpb25zIGxpa2UgJ2NvbXBpbGVyT3B0aW9ucycgYXJlIG1lcmdlZCBieSBUU1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTmdDb21waWxlck9wdGlvbnMgPSB7Li4uY29uZmlnLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsIC4uLnBhcmVudE9wdGlvbnN9O1xuXG4gICAgICAgICAgaWYgKGNvbmZpZy5leHRlbmRzICYmIHR5cGVvZiBjb25maWcuZXh0ZW5kcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkQ29uZmlnUGF0aCA9IGdldEV4dGVuZGVkQ29uZmlnUGF0aChcbiAgICAgICAgICAgICAgICBjb25maWdGaWxlLCBjb25maWcuZXh0ZW5kcywgaG9zdCwgZnMsXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoZXh0ZW5kZWRDb25maWdQYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIC8vIENhbGwgcmVhZEFuZ3VsYXJDb21waWxlck9wdGlvbnMgcmVjdXJzaXZlbHkgdG8gbWVyZ2UgTkcgQ29tcGlsZXIgb3B0aW9uc1xuICAgICAgICAgICAgICByZXR1cm4gcmVhZEFuZ3VsYXJDb21waWxlck9wdGlvbnMoZXh0ZW5kZWRDb25maWdQYXRoLCBleGlzdGluZ05nQ29tcGlsZXJPcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gZXhpc3RpbmdOZ0NvbXBpbGVyT3B0aW9ucztcbiAgICAgICAgfTtcblxuICAgIGNvbnN0IHtwcm9qZWN0RmlsZSwgYmFzZVBhdGh9ID0gY2FsY1Byb2plY3RGaWxlQW5kQmFzZVBhdGgocHJvamVjdCwgaG9zdCk7XG4gICAgY29uc3QgY29uZmlnRmlsZU5hbWUgPSBob3N0LnJlc29sdmUoaG9zdC5wd2QoKSwgcHJvamVjdEZpbGUpO1xuICAgIGNvbnN0IHtjb25maWcsIGVycm9yfSA9IHJlYWRDb25maWdGaWxlKHByb2plY3RGaWxlKTtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb2plY3QsXG4gICAgICAgIGVycm9yczogW2Vycm9yXSxcbiAgICAgICAgcm9vdE5hbWVzOiBbXSxcbiAgICAgICAgb3B0aW9uczoge30sXG4gICAgICAgIGVtaXRGbGFnczogYXBpLkVtaXRGbGFncy5EZWZhdWx0XG4gICAgICB9O1xuICAgIH1cbiAgICBjb25zdCBleGlzdGluZ0NvbXBpbGVyT3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICAgIGdlbkRpcjogYmFzZVBhdGgsXG4gICAgICBiYXNlUGF0aCxcbiAgICAgIC4uLnJlYWRBbmd1bGFyQ29tcGlsZXJPcHRpb25zKGNvbmZpZ0ZpbGVOYW1lKSxcbiAgICAgIC4uLmV4aXN0aW5nT3B0aW9ucyxcbiAgICB9O1xuXG4gICAgY29uc3QgcGFyc2VDb25maWdIb3N0ID0gY3JlYXRlUGFyc2VDb25maWdIb3N0KGhvc3QsIGZzKTtcbiAgICBjb25zdCB7b3B0aW9ucywgZXJyb3JzLCBmaWxlTmFtZXM6IHJvb3ROYW1lcywgcHJvamVjdFJlZmVyZW5jZXN9ID1cbiAgICAgICAgdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoXG4gICAgICAgICAgICBjb25maWcsIHBhcnNlQ29uZmlnSG9zdCwgYmFzZVBhdGgsIGV4aXN0aW5nQ29tcGlsZXJPcHRpb25zLCBjb25maWdGaWxlTmFtZSk7XG5cbiAgICAvLyBDb2VyY2UgdG8gYm9vbGVhbiBhcyBgZW5hYmxlSXZ5YCBjYW4gYmUgYG5ndHNjfHRydWV8ZmFsc2V8dW5kZWZpbmVkYCBoZXJlLlxuICAgIG9wdGlvbnMuZW5hYmxlSXZ5ID0gISEob3B0aW9ucy5lbmFibGVJdnkgPz8gdHJ1ZSk7XG5cbiAgICBsZXQgZW1pdEZsYWdzID0gYXBpLkVtaXRGbGFncy5EZWZhdWx0O1xuICAgIGlmICghKG9wdGlvbnMuc2tpcE1ldGFkYXRhRW1pdCB8fCBvcHRpb25zLmZsYXRNb2R1bGVPdXRGaWxlKSkge1xuICAgICAgZW1pdEZsYWdzIHw9IGFwaS5FbWl0RmxhZ3MuTWV0YWRhdGE7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLnNraXBUZW1wbGF0ZUNvZGVnZW4pIHtcbiAgICAgIGVtaXRGbGFncyA9IGVtaXRGbGFncyAmIH5hcGkuRW1pdEZsYWdzLkNvZGVnZW47XG4gICAgfVxuICAgIHJldHVybiB7cHJvamVjdDogcHJvamVjdEZpbGUsIHJvb3ROYW1lcywgcHJvamVjdFJlZmVyZW5jZXMsIG9wdGlvbnMsIGVycm9ycywgZW1pdEZsYWdzfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnN0IGVycm9yczogdHMuRGlhZ25vc3RpY1tdID0gW3tcbiAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICBtZXNzYWdlVGV4dDogZS5zdGFjayxcbiAgICAgIGZpbGU6IHVuZGVmaW5lZCxcbiAgICAgIHN0YXJ0OiB1bmRlZmluZWQsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZTogJ2FuZ3VsYXInLFxuICAgICAgY29kZTogYXBpLlVOS05PV05fRVJST1JfQ09ERSxcbiAgICB9XTtcbiAgICByZXR1cm4ge3Byb2plY3Q6ICcnLCBlcnJvcnMsIHJvb3ROYW1lczogW10sIG9wdGlvbnM6IHt9LCBlbWl0RmxhZ3M6IGFwaS5FbWl0RmxhZ3MuRGVmYXVsdH07XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFyc2VDb25maWdIb3N0KGhvc3Q6IENvbmZpZ3VyYXRpb25Ib3N0LCBmcyA9IGdldEZpbGVTeXN0ZW0oKSk6IHRzLlBhcnNlQ29uZmlnSG9zdCB7XG4gIHJldHVybiB7XG4gICAgZmlsZUV4aXN0czogaG9zdC5leGlzdHMuYmluZChob3N0KSxcbiAgICByZWFkRGlyZWN0b3J5OiB0cy5zeXMucmVhZERpcmVjdG9yeSxcbiAgICByZWFkRmlsZTogaG9zdC5yZWFkRmlsZS5iaW5kKGhvc3QpLFxuICAgIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXM6IGZzLmlzQ2FzZVNlbnNpdGl2ZSgpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRFeHRlbmRlZENvbmZpZ1BhdGgoXG4gICAgY29uZmlnRmlsZTogc3RyaW5nLCBleHRlbmRzVmFsdWU6IHN0cmluZywgaG9zdDogQ29uZmlndXJhdGlvbkhvc3QsXG4gICAgZnM6IEZpbGVTeXN0ZW0pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgY29uc3QgcmVzdWx0ID0gZ2V0RXh0ZW5kZWRDb25maWdQYXRoV29ya2VyKGNvbmZpZ0ZpbGUsIGV4dGVuZHNWYWx1ZSwgaG9zdCwgZnMpO1xuICBpZiAocmVzdWx0ICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIFRyeSB0byByZXNvbHZlIHRoZSBwYXRocyB3aXRoIGEganNvbiBleHRlbnNpb24gYXBwZW5kIGEganNvbiBleHRlbnNpb24gdG8gdGhlIGZpbGUgaW4gY2FzZSBpZlxuICAvLyBpdCBpcyBtaXNzaW5nIGFuZCB0aGUgcmVzb2x1dGlvbiBmYWlsZWQuIFRoaXMgaXMgdG8gcmVwbGljYXRlIFR5cGVTY3JpcHQgYmVoYXZpb3VyLCBzZWU6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9ibG9iLzI5NGE1YTdkNzg0YTVhOTVhODA0OGVlOTkwNDAwOTc5YTZiYzNhMWMvc3JjL2NvbXBpbGVyL2NvbW1hbmRMaW5lUGFyc2VyLnRzI0wyODA2XG4gIHJldHVybiBnZXRFeHRlbmRlZENvbmZpZ1BhdGhXb3JrZXIoY29uZmlnRmlsZSwgYCR7ZXh0ZW5kc1ZhbHVlfS5qc29uYCwgaG9zdCwgZnMpO1xufVxuXG5mdW5jdGlvbiBnZXRFeHRlbmRlZENvbmZpZ1BhdGhXb3JrZXIoXG4gICAgY29uZmlnRmlsZTogc3RyaW5nLCBleHRlbmRzVmFsdWU6IHN0cmluZywgaG9zdDogQ29uZmlndXJhdGlvbkhvc3QsXG4gICAgZnM6IEZpbGVTeXN0ZW0pOiBBYnNvbHV0ZUZzUGF0aHxudWxsIHtcbiAgaWYgKGV4dGVuZHNWYWx1ZS5zdGFydHNXaXRoKCcuJykgfHwgZnMuaXNSb290ZWQoZXh0ZW5kc1ZhbHVlKSkge1xuICAgIGNvbnN0IGV4dGVuZGVkQ29uZmlnUGF0aCA9IGhvc3QucmVzb2x2ZShob3N0LmRpcm5hbWUoY29uZmlnRmlsZSksIGV4dGVuZHNWYWx1ZSk7XG4gICAgaWYgKGhvc3QuZXhpc3RzKGV4dGVuZGVkQ29uZmlnUGF0aCkpIHtcbiAgICAgIHJldHVybiBleHRlbmRlZENvbmZpZ1BhdGg7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnN0IHBhcnNlQ29uZmlnSG9zdCA9IGNyZWF0ZVBhcnNlQ29uZmlnSG9zdChob3N0LCBmcyk7XG5cbiAgICAvLyBQYXRoIGlzbid0IGEgcm9vdGVkIG9yIHJlbGF0aXZlIHBhdGgsIHJlc29sdmUgbGlrZSBhIG1vZHVsZS5cbiAgICBjb25zdCB7XG4gICAgICByZXNvbHZlZE1vZHVsZSxcbiAgICB9ID1cbiAgICAgICAgdHMubm9kZU1vZHVsZU5hbWVSZXNvbHZlcihcbiAgICAgICAgICAgIGV4dGVuZHNWYWx1ZSwgY29uZmlnRmlsZSxcbiAgICAgICAgICAgIHttb2R1bGVSZXNvbHV0aW9uOiB0cy5Nb2R1bGVSZXNvbHV0aW9uS2luZC5Ob2RlSnMsIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlfSxcbiAgICAgICAgICAgIHBhcnNlQ29uZmlnSG9zdCk7XG4gICAgaWYgKHJlc29sdmVkTW9kdWxlKSB7XG4gICAgICByZXR1cm4gYWJzb2x1dGVGcm9tKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBlcmZvcm1Db21waWxhdGlvblJlc3VsdCB7XG4gIGRpYWdub3N0aWNzOiBEaWFnbm9zdGljcztcbiAgcHJvZ3JhbT86IGFwaS5Qcm9ncmFtO1xuICBlbWl0UmVzdWx0PzogdHMuRW1pdFJlc3VsdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4aXRDb2RlRnJvbVJlc3VsdChkaWFnczogRGlhZ25vc3RpY3N8dW5kZWZpbmVkKTogbnVtYmVyIHtcbiAgaWYgKCFkaWFncyB8fCBmaWx0ZXJFcnJvcnNBbmRXYXJuaW5ncyhkaWFncykubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gSWYgd2UgaGF2ZSBhIHJlc3VsdCBhbmQgZGlkbid0IGdldCBhbnkgZXJyb3JzLCB3ZSBzdWNjZWVkZWQuXG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvLyBSZXR1cm4gMiBpZiBhbnkgb2YgdGhlIGVycm9ycyB3ZXJlIHVua25vd24uXG4gIHJldHVybiBkaWFncy5zb21lKGQgPT4gZC5zb3VyY2UgPT09ICdhbmd1bGFyJyAmJiBkLmNvZGUgPT09IGFwaS5VTktOT1dOX0VSUk9SX0NPREUpID8gMiA6IDE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwZXJmb3JtQ29tcGlsYXRpb24oe1xuICByb290TmFtZXMsXG4gIG9wdGlvbnMsXG4gIGhvc3QsXG4gIG9sZFByb2dyYW0sXG4gIGVtaXRDYWxsYmFjayxcbiAgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLFxuICBnYXRoZXJEaWFnbm9zdGljcyA9IGRlZmF1bHRHYXRoZXJEaWFnbm9zdGljcyxcbiAgY3VzdG9tVHJhbnNmb3JtZXJzLFxuICBlbWl0RmxhZ3MgPSBhcGkuRW1pdEZsYWdzLkRlZmF1bHQsXG4gIG1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9IG51bGxcbn06IHtcbiAgcm9vdE5hbWVzOiBzdHJpbmdbXSxcbiAgb3B0aW9uczogYXBpLkNvbXBpbGVyT3B0aW9ucyxcbiAgaG9zdD86IGFwaS5Db21waWxlckhvc3QsXG4gIG9sZFByb2dyYW0/OiBhcGkuUHJvZ3JhbSxcbiAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrLFxuICBtZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2s/OiBhcGkuVHNNZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2ssXG4gIGdhdGhlckRpYWdub3N0aWNzPzogKHByb2dyYW06IGFwaS5Qcm9ncmFtKSA9PiBEaWFnbm9zdGljcyxcbiAgY3VzdG9tVHJhbnNmb3JtZXJzPzogYXBpLkN1c3RvbVRyYW5zZm9ybWVycyxcbiAgZW1pdEZsYWdzPzogYXBpLkVtaXRGbGFncyxcbiAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzPzogU2V0PHN0cmluZz58IG51bGwsXG59KTogUGVyZm9ybUNvbXBpbGF0aW9uUmVzdWx0IHtcbiAgbGV0IHByb2dyYW06IGFwaS5Qcm9ncmFtfHVuZGVmaW5lZDtcbiAgbGV0IGVtaXRSZXN1bHQ6IHRzLkVtaXRSZXN1bHR8dW5kZWZpbmVkO1xuICBsZXQgYWxsRGlhZ25vc3RpY3M6IEFycmF5PHRzLkRpYWdub3N0aWN8YXBpLkRpYWdub3N0aWM+ID0gW107XG4gIHRyeSB7XG4gICAgaWYgKCFob3N0KSB7XG4gICAgICBob3N0ID0gbmcuY3JlYXRlQ29tcGlsZXJIb3N0KHtvcHRpb25zfSk7XG4gICAgfVxuICAgIGlmIChtb2RpZmllZFJlc291cmNlRmlsZXMpIHtcbiAgICAgIGhvc3QuZ2V0TW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gKCkgPT4gbW9kaWZpZWRSZXNvdXJjZUZpbGVzO1xuICAgIH1cblxuICAgIHByb2dyYW0gPSBuZy5jcmVhdGVQcm9ncmFtKHtyb290TmFtZXMsIGhvc3QsIG9wdGlvbnMsIG9sZFByb2dyYW19KTtcblxuICAgIGNvbnN0IGJlZm9yZURpYWdzID0gRGF0ZS5ub3coKTtcbiAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmdhdGhlckRpYWdub3N0aWNzKHByb2dyYW0hKSk7XG4gICAgaWYgKG9wdGlvbnMuZGlhZ25vc3RpY3MpIHtcbiAgICAgIGNvbnN0IGFmdGVyRGlhZ3MgPSBEYXRlLm5vdygpO1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaChcbiAgICAgICAgICBjcmVhdGVNZXNzYWdlRGlhZ25vc3RpYyhgVGltZSBmb3IgZGlhZ25vc3RpY3M6ICR7YWZ0ZXJEaWFncyAtIGJlZm9yZURpYWdzfW1zLmApKTtcbiAgICB9XG5cbiAgICBpZiAoIWhhc0Vycm9ycyhhbGxEaWFnbm9zdGljcykpIHtcbiAgICAgIGVtaXRSZXN1bHQgPVxuICAgICAgICAgIHByb2dyYW0hLmVtaXQoe2VtaXRDYWxsYmFjaywgbWVyZ2VFbWl0UmVzdWx0c0NhbGxiYWNrLCBjdXN0b21UcmFuc2Zvcm1lcnMsIGVtaXRGbGFnc30pO1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5lbWl0UmVzdWx0LmRpYWdub3N0aWNzKTtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLCBwcm9ncmFtLCBlbWl0UmVzdWx0fTtcbiAgICB9XG4gICAgcmV0dXJuIHtkaWFnbm9zdGljczogYWxsRGlhZ25vc3RpY3MsIHByb2dyYW19O1xuICB9IGNhdGNoIChlKSB7XG4gICAgbGV0IGVyck1zZzogc3RyaW5nO1xuICAgIGxldCBjb2RlOiBudW1iZXI7XG4gICAgaWYgKGlzU3ludGF4RXJyb3IoZSkpIHtcbiAgICAgIC8vIGRvbid0IHJlcG9ydCB0aGUgc3RhY2sgZm9yIHN5bnRheCBlcnJvcnMgYXMgdGhleSBhcmUgd2VsbCBrbm93biBlcnJvcnMuXG4gICAgICBlcnJNc2cgPSBlLm1lc3NhZ2U7XG4gICAgICBjb2RlID0gYXBpLkRFRkFVTFRfRVJST1JfQ09ERTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXJyTXNnID0gZS5zdGFjaztcbiAgICAgIC8vIEl0IGlzIG5vdCBhIHN5bnRheCBlcnJvciB3ZSBtaWdodCBoYXZlIGEgcHJvZ3JhbSB3aXRoIHVua25vd24gc3RhdGUsIGRpc2NhcmQgaXQuXG4gICAgICBwcm9ncmFtID0gdW5kZWZpbmVkO1xuICAgICAgY29kZSA9IGFwaS5VTktOT1dOX0VSUk9SX0NPREU7XG4gICAgfVxuICAgIGFsbERpYWdub3N0aWNzLnB1c2goXG4gICAgICAgIHtjYXRlZ29yeTogdHMuRGlhZ25vc3RpY0NhdGVnb3J5LkVycm9yLCBtZXNzYWdlVGV4dDogZXJyTXNnLCBjb2RlLCBzb3VyY2U6IGFwaS5TT1VSQ0V9KTtcbiAgICByZXR1cm4ge2RpYWdub3N0aWNzOiBhbGxEaWFnbm9zdGljcywgcHJvZ3JhbX07XG4gIH1cbn1cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0R2F0aGVyRGlhZ25vc3RpY3MocHJvZ3JhbTogYXBpLlByb2dyYW0pOiBEaWFnbm9zdGljcyB7XG4gIGNvbnN0IGFsbERpYWdub3N0aWNzOiBBcnJheTx0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljPiA9IFtdO1xuXG4gIGZ1bmN0aW9uIGNoZWNrRGlhZ25vc3RpY3MoZGlhZ3M6IERpYWdub3N0aWNzfHVuZGVmaW5lZCkge1xuICAgIGlmIChkaWFncykge1xuICAgICAgYWxsRGlhZ25vc3RpY3MucHVzaCguLi5kaWFncyk7XG4gICAgICByZXR1cm4gIWhhc0Vycm9ycyhkaWFncyk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbGV0IGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9IHRydWU7XG4gIC8vIENoZWNrIHBhcmFtZXRlciBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPSBjaGVja090aGVyRGlhZ25vc3RpY3MgJiZcbiAgICAgIGNoZWNrRGlhZ25vc3RpY3MoWy4uLnByb2dyYW0uZ2V0VHNPcHRpb25EaWFnbm9zdGljcygpLCAuLi5wcm9ncmFtLmdldE5nT3B0aW9uRGlhZ25vc3RpY3MoKV0pO1xuXG4gIC8vIENoZWNrIHN5bnRhY3RpYyBkaWFnbm9zdGljc1xuICBjaGVja090aGVyRGlhZ25vc3RpY3MgPVxuICAgICAgY2hlY2tPdGhlckRpYWdub3N0aWNzICYmIGNoZWNrRGlhZ25vc3RpY3MocHJvZ3JhbS5nZXRUc1N5bnRhY3RpY0RpYWdub3N0aWNzKCkgYXMgRGlhZ25vc3RpY3MpO1xuXG4gIC8vIENoZWNrIFR5cGVTY3JpcHQgc2VtYW50aWMgYW5kIEFuZ3VsYXIgc3RydWN0dXJlIGRpYWdub3N0aWNzXG4gIGNoZWNrT3RoZXJEaWFnbm9zdGljcyA9XG4gICAgICBjaGVja090aGVyRGlhZ25vc3RpY3MgJiZcbiAgICAgIGNoZWNrRGlhZ25vc3RpY3MoXG4gICAgICAgICAgWy4uLnByb2dyYW0uZ2V0VHNTZW1hbnRpY0RpYWdub3N0aWNzKCksIC4uLnByb2dyYW0uZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoKV0pO1xuXG4gIC8vIENoZWNrIEFuZ3VsYXIgc2VtYW50aWMgZGlhZ25vc3RpY3NcbiAgY2hlY2tPdGhlckRpYWdub3N0aWNzID1cbiAgICAgIGNoZWNrT3RoZXJEaWFnbm9zdGljcyAmJiBjaGVja0RpYWdub3N0aWNzKHByb2dyYW0uZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKCkgYXMgRGlhZ25vc3RpY3MpO1xuXG4gIHJldHVybiBhbGxEaWFnbm9zdGljcztcbn1cblxuZnVuY3Rpb24gaGFzRXJyb3JzKGRpYWdzOiBEaWFnbm9zdGljcykge1xuICByZXR1cm4gZGlhZ3Muc29tZShkID0+IGQuY2F0ZWdvcnkgPT09IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcik7XG59XG4iXX0=