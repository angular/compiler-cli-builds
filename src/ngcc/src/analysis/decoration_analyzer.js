(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/analysis/decoration_analyzer", ["require", "exports", "tslib", "@angular/compiler", "canonical-path", "fs", "@angular/compiler-cli/src/ngtsc/annotations", "@angular/compiler-cli/src/ngtsc/cycles", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/partial_evaluator", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var path = require("canonical-path");
    var fs = require("fs");
    var annotations_1 = require("@angular/compiler-cli/src/ngtsc/annotations");
    var cycles_1 = require("@angular/compiler-cli/src/ngtsc/cycles");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var partial_evaluator_1 = require("@angular/compiler-cli/src/ngtsc/partial_evaluator");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var utils_1 = require("@angular/compiler-cli/src/ngcc/src/utils");
    exports.DecorationAnalyses = Map;
    /**
     * Simple class that resolves and loads files directly from the filesystem.
     */
    var NgccResourceLoader = /** @class */ (function () {
        function NgccResourceLoader() {
            this.canPreload = false;
        }
        NgccResourceLoader.prototype.preload = function () { throw new Error('Not implemented.'); };
        NgccResourceLoader.prototype.load = function (url) { return fs.readFileSync(url, 'utf8'); };
        NgccResourceLoader.prototype.resolve = function (url, containingFile) {
            return path.resolve(path.dirname(containingFile), url);
        };
        return NgccResourceLoader;
    }());
    /**
     * This Analyzer will analyze the files that have decorated classes that need to be transformed.
     */
    var DecorationAnalyzer = /** @class */ (function () {
        function DecorationAnalyzer(program, options, host, typeChecker, reflectionHost, referencesRegistry, rootDirs, isCore) {
            this.program = program;
            this.options = options;
            this.host = host;
            this.typeChecker = typeChecker;
            this.reflectionHost = reflectionHost;
            this.referencesRegistry = referencesRegistry;
            this.rootDirs = rootDirs;
            this.isCore = isCore;
            this.resourceManager = new NgccResourceLoader();
            this.refEmitter = new imports_1.ReferenceEmitter([
                new imports_1.LocalIdentifierStrategy(),
                new imports_1.AbsoluteModuleStrategy(this.program, this.typeChecker, this.options, this.host),
                // TODO(alxhub): there's no reason why ngcc needs the "logical file system" logic here, as ngcc
                // projects only ever have one rootDir. Instead, ngcc should just switch its emitted imort based
                // on whether a bestGuessOwningModule is present in the Reference.
                new imports_1.LogicalProjectStrategy(this.typeChecker, new path_1.LogicalFileSystem(this.rootDirs)),
            ]);
            this.scopeRegistry = new annotations_1.SelectorScopeRegistry(this.typeChecker, this.reflectionHost, this.refEmitter);
            this.evaluator = new partial_evaluator_1.PartialEvaluator(this.reflectionHost, this.typeChecker);
            this.moduleResolver = new imports_1.ModuleResolver(this.program, this.options, this.host);
            this.importGraph = new cycles_1.ImportGraph(this.moduleResolver);
            this.cycleAnalyzer = new cycles_1.CycleAnalyzer(this.importGraph);
            this.handlers = [
                new annotations_1.BaseDefDecoratorHandler(this.reflectionHost, this.evaluator),
                new annotations_1.ComponentDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore, this.resourceManager, this.rootDirs, /* defaultPreserveWhitespaces */ false, /* i18nUseExternalIds */ true, this.moduleResolver, this.cycleAnalyzer),
                new annotations_1.DirectiveDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
                new annotations_1.InjectableDecoratorHandler(this.reflectionHost, this.isCore, /* strictCtorDeps */ false),
                new annotations_1.NgModuleDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.referencesRegistry, this.isCore, /* routeAnalyzer */ null, this.refEmitter),
                new annotations_1.PipeDecoratorHandler(this.reflectionHost, this.evaluator, this.scopeRegistry, this.isCore),
            ];
        }
        /**
         * Analyze a program to find all the decorated files should be transformed.
         *
         * @returns a map of the source files to the analysis for those files.
         */
        DecorationAnalyzer.prototype.analyzeProgram = function () {
            var _this = this;
            var decorationAnalyses = new exports.DecorationAnalyses();
            var analysedFiles = this.program.getSourceFiles()
                .map(function (sourceFile) { return _this.analyzeFile(sourceFile); })
                .filter(utils_1.isDefined);
            var compiledFiles = analysedFiles.map(function (analysedFile) { return _this.compileFile(analysedFile); });
            compiledFiles.forEach(function (compiledFile) { return decorationAnalyses.set(compiledFile.sourceFile, compiledFile); });
            return decorationAnalyses;
        };
        DecorationAnalyzer.prototype.analyzeFile = function (sourceFile) {
            var _this = this;
            var decoratedClasses = this.reflectionHost.findDecoratedClasses(sourceFile);
            return decoratedClasses.length ? {
                sourceFile: sourceFile,
                analyzedClasses: decoratedClasses.map(function (clazz) { return _this.analyzeClass(clazz); }).filter(utils_1.isDefined)
            } :
                undefined;
        };
        DecorationAnalyzer.prototype.analyzeClass = function (clazz) {
            var e_1, _a, e_2, _b;
            var matchingHandlers = this.handlers
                .map(function (handler) {
                var detected = handler.detect(clazz.declaration, clazz.decorators);
                return { handler: handler, detected: detected };
            })
                .filter(isMatchingHandler);
            if (matchingHandlers.length === 0) {
                return null;
            }
            var detections = [];
            var hasWeakHandler = false;
            var hasNonWeakHandler = false;
            var hasPrimaryHandler = false;
            try {
                for (var matchingHandlers_1 = tslib_1.__values(matchingHandlers), matchingHandlers_1_1 = matchingHandlers_1.next(); !matchingHandlers_1_1.done; matchingHandlers_1_1 = matchingHandlers_1.next()) {
                    var _c = matchingHandlers_1_1.value, handler = _c.handler, detected = _c.detected;
                    if (hasNonWeakHandler && handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        continue;
                    }
                    else if (hasWeakHandler && handler.precedence !== transform_1.HandlerPrecedence.WEAK) {
                        // Clear all the WEAK handlers from the list of matches.
                        detections.length = 0;
                    }
                    if (hasPrimaryHandler && handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        throw new Error("TODO.Diagnostic: Class has multiple incompatible Angular decorators.");
                    }
                    detections.push({ handler: handler, detected: detected });
                    if (handler.precedence === transform_1.HandlerPrecedence.WEAK) {
                        hasWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.SHARED) {
                        hasNonWeakHandler = true;
                    }
                    else if (handler.precedence === transform_1.HandlerPrecedence.PRIMARY) {
                        hasNonWeakHandler = true;
                        hasPrimaryHandler = true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (matchingHandlers_1_1 && !matchingHandlers_1_1.done && (_a = matchingHandlers_1.return)) _a.call(matchingHandlers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var matches = [];
            var allDiagnostics = [];
            try {
                for (var detections_1 = tslib_1.__values(detections), detections_1_1 = detections_1.next(); !detections_1_1.done; detections_1_1 = detections_1.next()) {
                    var _d = detections_1_1.value, handler = _d.handler, detected = _d.detected;
                    var _e = handler.analyze(clazz.declaration, detected.metadata), analysis = _e.analysis, diagnostics = _e.diagnostics;
                    if (diagnostics !== undefined) {
                        allDiagnostics.push.apply(allDiagnostics, tslib_1.__spread(diagnostics));
                    }
                    matches.push({ handler: handler, analysis: analysis });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (detections_1_1 && !detections_1_1.done && (_b = detections_1.return)) _b.call(detections_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return tslib_1.__assign({}, clazz, { matches: matches, diagnostics: allDiagnostics.length > 0 ? allDiagnostics : undefined });
        };
        DecorationAnalyzer.prototype.compileFile = function (analyzedFile) {
            var _this = this;
            var constantPool = new compiler_1.ConstantPool();
            var compiledClasses = analyzedFile.analyzedClasses.map(function (analyzedClass) {
                var compilation = _this.compileClass(analyzedClass, constantPool);
                return tslib_1.__assign({}, analyzedClass, { compilation: compilation });
            });
            return { constantPool: constantPool, sourceFile: analyzedFile.sourceFile, compiledClasses: compiledClasses };
        };
        DecorationAnalyzer.prototype.compileClass = function (clazz, constantPool) {
            var e_3, _a;
            var compilations = [];
            try {
                for (var _b = tslib_1.__values(clazz.matches), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = _c.value, handler = _d.handler, analysis = _d.analysis;
                    var result = handler.compile(clazz.declaration, analysis, constantPool);
                    if (Array.isArray(result)) {
                        compilations.push.apply(compilations, tslib_1.__spread(result));
                    }
                    else {
                        compilations.push(result);
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return compilations;
        };
        return DecorationAnalyzer;
    }());
    exports.DecorationAnalyzer = DecorationAnalyzer;
    function isMatchingHandler(handler) {
        return !!handler.detected;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbl9hbmFseXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0M7SUFDL0MscUNBQXVDO0lBQ3ZDLHVCQUF5QjtJQUd6QiwyRUFBZ1E7SUFDaFEsaUVBQWlFO0lBQ2pFLG1FQUFpSjtJQUNqSix1RkFBa0U7SUFDbEUsNkRBQXNFO0lBQ3RFLHVFQUEwRztJQUcxRyxrRUFBbUM7SUFxQnRCLFFBQUEsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0lBT3RDOztPQUVHO0lBQ0g7UUFBQTtZQUNFLGVBQVUsR0FBRyxLQUFLLENBQUM7UUFNckIsQ0FBQztRQUxDLG9DQUFPLEdBQVAsY0FBcUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxpQ0FBSSxHQUFKLFVBQUssR0FBVyxJQUFZLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLG9DQUFPLEdBQVAsVUFBUSxHQUFXLEVBQUUsY0FBc0I7WUFDekMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUNILHlCQUFDO0lBQUQsQ0FBQyxBQVBELElBT0M7SUFFRDs7T0FFRztJQUNIO1FBOEJFLDRCQUNZLE9BQW1CLEVBQVUsT0FBMkIsRUFDeEQsSUFBcUIsRUFBVSxXQUEyQixFQUMxRCxjQUFrQyxFQUFVLGtCQUFzQyxFQUNsRixRQUEwQixFQUFVLE1BQWU7WUFIbkQsWUFBTyxHQUFQLE9BQU8sQ0FB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Z2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciwgQ29tcG9uZW50RGVjb3JhdG9ySGFuZGxlciwgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlciwgSW5qZWN0YWJsZURlY29yYXRvckhhbmRsZXIsIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciwgUGlwZURlY29yYXRvckhhbmRsZXIsIFJlZmVyZW5jZXNSZWdpc3RyeSwgUmVzb3VyY2VMb2FkZXIsIFNlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvYW5ub3RhdGlvbnMnO1xuaW1wb3J0IHtDeWNsZUFuYWx5emVyLCBJbXBvcnRHcmFwaH0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvY3ljbGVzJztcbmltcG9ydCB7QWJzb2x1dGVNb2R1bGVTdHJhdGVneSwgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3ksIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3ksIE1vZHVsZVJlc29sdmVyLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvcn0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgTG9naWNhbEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL25ndHNjL3BhdGgnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtEZWNvcmF0ZWRDbGFzc30gZnJvbSAnLi4vaG9zdC9kZWNvcmF0ZWRfY2xhc3MnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7aXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRGaWxlIHtcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcbiAgYW5hbHl6ZWRDbGFzc2VzOiBBbmFseXplZENsYXNzW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHl6ZWRDbGFzcyBleHRlbmRzIERlY29yYXRlZENsYXNzIHtcbiAgZGlhZ25vc3RpY3M/OiB0cy5EaWFnbm9zdGljW107XG4gIG1hdGNoZXM6IHtoYW5kbGVyOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PjsgYW5hbHlzaXM6IGFueTt9W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRDbGFzcyBleHRlbmRzIEFuYWx5emVkQ2xhc3MgeyBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdOyB9XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZWRGaWxlIHtcbiAgY29tcGlsZWRDbGFzc2VzOiBDb21waWxlZENsYXNzW107XG4gIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG4gIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sO1xufVxuXG5leHBvcnQgdHlwZSBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA8dHMuU291cmNlRmlsZSwgQ29tcGlsZWRGaWxlPjtcbmV4cG9ydCBjb25zdCBEZWNvcmF0aW9uQW5hbHlzZXMgPSBNYXA7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0Y2hpbmdIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgZGV0ZWN0ZWQ6IE07XG59XG5cbi8qKlxuICogU2ltcGxlIGNsYXNzIHRoYXQgcmVzb2x2ZXMgYW5kIGxvYWRzIGZpbGVzIGRpcmVjdGx5IGZyb20gdGhlIGZpbGVzeXN0ZW0uXG4gKi9cbmNsYXNzIE5nY2NSZXNvdXJjZUxvYWRlciBpbXBsZW1lbnRzIFJlc291cmNlTG9hZGVyIHtcbiAgY2FuUHJlbG9hZCA9IGZhbHNlO1xuICBwcmVsb2FkKCk6IHVuZGVmaW5lZHxQcm9taXNlPHZvaWQ+IHsgdGhyb3cgbmV3IEVycm9yKCdOb3QgaW1wbGVtZW50ZWQuJyk7IH1cbiAgbG9hZCh1cmw6IHN0cmluZyk6IHN0cmluZyB7IHJldHVybiBmcy5yZWFkRmlsZVN5bmModXJsLCAndXRmOCcpOyB9XG4gIHJlc29sdmUodXJsOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGNvbnRhaW5pbmdGaWxlKSwgdXJsKTtcbiAgfVxufVxuXG4vKipcbiAqIFRoaXMgQW5hbHl6ZXIgd2lsbCBhbmFseXplIHRoZSBmaWxlcyB0aGF0IGhhdmUgZGVjb3JhdGVkIGNsYXNzZXMgdGhhdCBuZWVkIHRvIGJlIHRyYW5zZm9ybWVkLlxuICovXG5leHBvcnQgY2xhc3MgRGVjb3JhdGlvbkFuYWx5emVyIHtcbiAgcmVzb3VyY2VNYW5hZ2VyID0gbmV3IE5nY2NSZXNvdXJjZUxvYWRlcigpO1xuICByZWZFbWl0dGVyID0gbmV3IFJlZmVyZW5jZUVtaXR0ZXIoW1xuICAgIG5ldyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSgpLFxuICAgIG5ldyBBYnNvbHV0ZU1vZHVsZVN0cmF0ZWd5KHRoaXMucHJvZ3JhbSwgdGhpcy50eXBlQ2hlY2tlciwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpLFxuICAgIC8vIFRPRE8oYWx4aHViKTogdGhlcmUncyBubyByZWFzb24gd2h5IG5nY2MgbmVlZHMgdGhlIFwibG9naWNhbCBmaWxlIHN5c3RlbVwiIGxvZ2ljIGhlcmUsIGFzIG5nY2NcbiAgICAvLyBwcm9qZWN0cyBvbmx5IGV2ZXIgaGF2ZSBvbmUgcm9vdERpci4gSW5zdGVhZCwgbmdjYyBzaG91bGQganVzdCBzd2l0Y2ggaXRzIGVtaXR0ZWQgaW1vcnQgYmFzZWRcbiAgICAvLyBvbiB3aGV0aGVyIGEgYmVzdEd1ZXNzT3duaW5nTW9kdWxlIGlzIHByZXNlbnQgaW4gdGhlIFJlZmVyZW5jZS5cbiAgICBuZXcgTG9naWNhbFByb2plY3RTdHJhdGVneSh0aGlzLnR5cGVDaGVja2VyLCBuZXcgTG9naWNhbEZpbGVTeXN0ZW0odGhpcy5yb290RGlycykpLFxuICBdKTtcbiAgc2NvcGVSZWdpc3RyeSA9IG5ldyBTZWxlY3RvclNjb3BlUmVnaXN0cnkodGhpcy50eXBlQ2hlY2tlciwgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgZXZhbHVhdG9yID0gbmV3IFBhcnRpYWxFdmFsdWF0b3IodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy50eXBlQ2hlY2tlcik7XG4gIG1vZHVsZVJlc29sdmVyID0gbmV3IE1vZHVsZVJlc29sdmVyKHRoaXMucHJvZ3JhbSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuICBpbXBvcnRHcmFwaCA9IG5ldyBJbXBvcnRHcmFwaCh0aGlzLm1vZHVsZVJlc29sdmVyKTtcbiAgY3ljbGVBbmFseXplciA9IG5ldyBDeWNsZUFuYWx5emVyKHRoaXMuaW1wb3J0R3JhcGgpO1xuICBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSA9IFtcbiAgICBuZXcgQmFzZURlZkRlY29yYXRvckhhbmRsZXIodGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IpLFxuICAgIG5ldyBDb21wb25lbnREZWNvcmF0b3JIYW5kbGVyKFxuICAgICAgICB0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSwgdGhpcy5yZXNvdXJjZU1hbmFnZXIsXG4gICAgICAgIHRoaXMucm9vdERpcnMsIC8qIGRlZmF1bHRQcmVzZXJ2ZVdoaXRlc3BhY2VzICovIGZhbHNlLCAvKiBpMThuVXNlRXh0ZXJuYWxJZHMgKi8gdHJ1ZSxcbiAgICAgICAgdGhpcy5tb2R1bGVSZXNvbHZlciwgdGhpcy5jeWNsZUFuYWx5emVyKSxcbiAgICBuZXcgRGlyZWN0aXZlRGVjb3JhdG9ySGFuZGxlcihcbiAgICAgICAgdGhpcy5yZWZsZWN0aW9uSG9zdCwgdGhpcy5ldmFsdWF0b3IsIHRoaXMuc2NvcGVSZWdpc3RyeSwgdGhpcy5pc0NvcmUpLFxuICAgIG5ldyBJbmplY3RhYmxlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmlzQ29yZSwgLyogc3RyaWN0Q3RvckRlcHMgKi8gZmFsc2UpLFxuICAgIG5ldyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIoXG4gICAgICAgIHRoaXMucmVmbGVjdGlvbkhvc3QsIHRoaXMuZXZhbHVhdG9yLCB0aGlzLnNjb3BlUmVnaXN0cnksIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgICB0aGlzLmlzQ29yZSwgLyogcm91dGVBbmFseXplciAqLyBudWxsLCB0aGlzLnJlZkVtaXR0ZXIpLFxuICAgIG5ldyBQaXBlRGVjb3JhdG9ySGFuZGxlcih0aGlzLnJlZmxlY3Rpb25Ib3N0LCB0aGlzLmV2YWx1YXRvciwgdGhpcy5zY29wZVJlZ2lzdHJ5LCB0aGlzLmlzQ29yZSksXG4gIF07XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLFxuICAgICAgcHJpdmF0ZSBob3N0OiB0cy5Db21waWxlckhvc3QsIHByaXZhdGUgdHlwZUNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByb290RGlyczogQWJzb2x1dGVGc1BhdGhbXSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBwcm9ncmFtIHRvIGZpbmQgYWxsIHRoZSBkZWNvcmF0ZWQgZmlsZXMgc2hvdWxkIGJlIHRyYW5zZm9ybWVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBhIG1hcCBvZiB0aGUgc291cmNlIGZpbGVzIHRvIHRoZSBhbmFseXNpcyBmb3IgdGhvc2UgZmlsZXMuXG4gICAqL1xuICBhbmFseXplUHJvZ3JhbSgpOiBEZWNvcmF0aW9uQW5hbHlzZXMge1xuICAgIGNvbnN0IGRlY29yYXRpb25BbmFseXNlcyA9IG5ldyBEZWNvcmF0aW9uQW5hbHlzZXMoKTtcbiAgICBjb25zdCBhbmFseXNlZEZpbGVzID0gdGhpcy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoc291cmNlRmlsZSA9PiB0aGlzLmFuYWx5emVGaWxlKHNvdXJjZUZpbGUpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihpc0RlZmluZWQpO1xuICAgIGNvbnN0IGNvbXBpbGVkRmlsZXMgPSBhbmFseXNlZEZpbGVzLm1hcChhbmFseXNlZEZpbGUgPT4gdGhpcy5jb21waWxlRmlsZShhbmFseXNlZEZpbGUpKTtcbiAgICBjb21waWxlZEZpbGVzLmZvckVhY2goXG4gICAgICAgIGNvbXBpbGVkRmlsZSA9PiBkZWNvcmF0aW9uQW5hbHlzZXMuc2V0KGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUpKTtcbiAgICByZXR1cm4gZGVjb3JhdGlvbkFuYWx5c2VzO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVGaWxlKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpOiBBbmFseXplZEZpbGV8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBkZWNvcmF0ZWRDbGFzc2VzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5maW5kRGVjb3JhdGVkQ2xhc3Nlcyhzb3VyY2VGaWxlKTtcbiAgICByZXR1cm4gZGVjb3JhdGVkQ2xhc3Nlcy5sZW5ndGggPyB7XG4gICAgICBzb3VyY2VGaWxlLFxuICAgICAgYW5hbHl6ZWRDbGFzc2VzOiBkZWNvcmF0ZWRDbGFzc2VzLm1hcChjbGF6eiA9PiB0aGlzLmFuYWx5emVDbGFzcyhjbGF6eikpLmZpbHRlcihpc0RlZmluZWQpXG4gICAgfSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFuYWx5emVDbGFzcyhjbGF6ejogRGVjb3JhdGVkQ2xhc3MpOiBBbmFseXplZENsYXNzfG51bGwge1xuICAgIGNvbnN0IG1hdGNoaW5nSGFuZGxlcnMgPSB0aGlzLmhhbmRsZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGhhbmRsZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXRlY3RlZCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGVyLmRldGVjdChjbGF6ei5kZWNsYXJhdGlvbiwgY2xhenouZGVjb3JhdG9ycyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7aGFuZGxlciwgZGV0ZWN0ZWR9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoaXNNYXRjaGluZ0hhbmRsZXIpO1xuXG4gICAgaWYgKG1hdGNoaW5nSGFuZGxlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZGV0ZWN0aW9uczoge2hhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+LCBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PGFueT59W10gPSBbXTtcbiAgICBsZXQgaGFzV2Vha0hhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBsZXQgaGFzTm9uV2Vha0hhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcbiAgICBsZXQgaGFzUHJpbWFyeUhhbmRsZXI6IGJvb2xlYW4gPSBmYWxzZTtcblxuICAgIGZvciAoY29uc3Qge2hhbmRsZXIsIGRldGVjdGVkfSBvZiBtYXRjaGluZ0hhbmRsZXJzKSB7XG4gICAgICBpZiAoaGFzTm9uV2Vha0hhbmRsZXIgJiYgaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChoYXNXZWFrSGFuZGxlciAmJiBoYW5kbGVyLnByZWNlZGVuY2UgIT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspIHtcbiAgICAgICAgLy8gQ2xlYXIgYWxsIHRoZSBXRUFLIGhhbmRsZXJzIGZyb20gdGhlIGxpc3Qgb2YgbWF0Y2hlcy5cbiAgICAgICAgZGV0ZWN0aW9ucy5sZW5ndGggPSAwO1xuICAgICAgfVxuICAgICAgaWYgKGhhc1ByaW1hcnlIYW5kbGVyICYmIGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIGluY29tcGF0aWJsZSBBbmd1bGFyIGRlY29yYXRvcnMuYCk7XG4gICAgICB9XG5cbiAgICAgIGRldGVjdGlvbnMucHVzaCh7aGFuZGxlciwgZGV0ZWN0ZWR9KTtcbiAgICAgIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspIHtcbiAgICAgICAgaGFzV2Vha0hhbmRsZXIgPSB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlNIQVJFRCkge1xuICAgICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWSkge1xuICAgICAgICBoYXNOb25XZWFrSGFuZGxlciA9IHRydWU7XG4gICAgICAgIGhhc1ByaW1hcnlIYW5kbGVyID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtYXRjaGVzOiB7aGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT4sIGFuYWx5c2lzOiBhbnl9W10gPSBbXTtcbiAgICBjb25zdCBhbGxEaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgZm9yIChjb25zdCB7aGFuZGxlciwgZGV0ZWN0ZWR9IG9mIGRldGVjdGlvbnMpIHtcbiAgICAgIGNvbnN0IHthbmFseXNpcywgZGlhZ25vc3RpY3N9ID0gaGFuZGxlci5hbmFseXplKGNsYXp6LmRlY2xhcmF0aW9uLCBkZXRlY3RlZC5tZXRhZGF0YSk7XG4gICAgICBpZiAoZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhbGxEaWFnbm9zdGljcy5wdXNoKC4uLmRpYWdub3N0aWNzKTtcbiAgICAgIH1cbiAgICAgIG1hdGNoZXMucHVzaCh7aGFuZGxlciwgYW5hbHlzaXN9KTtcbiAgICB9XG4gICAgcmV0dXJuIHsuLi5jbGF6eiwgbWF0Y2hlcywgZGlhZ25vc3RpY3M6IGFsbERpYWdub3N0aWNzLmxlbmd0aCA+IDAgPyBhbGxEaWFnbm9zdGljcyA6IHVuZGVmaW5lZH07XG4gIH1cblxuICBwcm90ZWN0ZWQgY29tcGlsZUZpbGUoYW5hbHl6ZWRGaWxlOiBBbmFseXplZEZpbGUpOiBDb21waWxlZEZpbGUge1xuICAgIGNvbnN0IGNvbnN0YW50UG9vbCA9IG5ldyBDb25zdGFudFBvb2woKTtcbiAgICBjb25zdCBjb21waWxlZENsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSA9IGFuYWx5emVkRmlsZS5hbmFseXplZENsYXNzZXMubWFwKGFuYWx5emVkQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgY29tcGlsYXRpb24gPSB0aGlzLmNvbXBpbGVDbGFzcyhhbmFseXplZENsYXNzLCBjb25zdGFudFBvb2wpO1xuICAgICAgcmV0dXJuIHsuLi5hbmFseXplZENsYXNzLCBjb21waWxhdGlvbn07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtjb25zdGFudFBvb2wsIHNvdXJjZUZpbGU6IGFuYWx5emVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZENsYXNzZXN9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGNvbXBpbGVDbGFzcyhjbGF6ejogQW5hbHl6ZWRDbGFzcywgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uczogQ29tcGlsZVJlc3VsdFtdID0gW107XG4gICAgZm9yIChjb25zdCB7aGFuZGxlciwgYW5hbHlzaXN9IG9mIGNsYXp6Lm1hdGNoZXMpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZXIuY29tcGlsZShjbGF6ei5kZWNsYXJhdGlvbiwgYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIGNvbXBpbGF0aW9ucy5wdXNoKC4uLnJlc3VsdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxhdGlvbnMucHVzaChyZXN1bHQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29tcGlsYXRpb25zO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTWF0Y2hpbmdIYW5kbGVyPEEsIE0+KGhhbmRsZXI6IFBhcnRpYWw8TWF0Y2hpbmdIYW5kbGVyPEEsIE0+Pik6XG4gICAgaGFuZGxlciBpcyBNYXRjaGluZ0hhbmRsZXI8QSwgTT4ge1xuICByZXR1cm4gISFoYW5kbGVyLmRldGVjdGVkO1xufVxuIl19