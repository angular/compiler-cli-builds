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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api", "@angular/compiler-cli/src/ngtsc/transform/src/declaration"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/api");
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
    var EMPTY_ARRAY = [];
    /**
     * Manages a compilation of Ivy decorators into static fields across an entire ts.Program.
     *
     * The compilation is stateful - source files are analyzed and records of the operations that need
     * to be performed during the transform/emit process are maintained internally.
     */
    var IvyCompilation = /** @class */ (function () {
        /**
         * @param handlers array of `DecoratorHandler`s which will be executed against each class in the
         * program
         * @param checker TypeScript `TypeChecker` instance for the program
         * @param reflector `ReflectionHost` through which all reflection operations will be performed
         * @param coreImportsFrom a TypeScript `SourceFile` which exports symbols needed for Ivy imports
         * when compiling @angular/core, or `null` if the current program is not @angular/core. This is
         * `null` in most cases.
         */
        function IvyCompilation(handlers, reflector, importRewriter, incrementalState, perf, sourceToFactorySymbols, scopeRegistry) {
            this.handlers = handlers;
            this.reflector = reflector;
            this.importRewriter = importRewriter;
            this.incrementalState = incrementalState;
            this.perf = perf;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
            this.scopeRegistry = scopeRegistry;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.ivyClasses = new Map();
            /**
             * Tracks factory information which needs to be generated.
             */
            /**
             * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
             */
            this.dtsMap = new Map();
            this.reexportMap = new Map();
            this._diagnostics = [];
        }
        Object.defineProperty(IvyCompilation.prototype, "exportStatements", {
            get: function () { return this.reexportMap; },
            enumerable: true,
            configurable: true
        });
        IvyCompilation.prototype.analyzeSync = function (sf) { return this.analyze(sf, false); };
        IvyCompilation.prototype.analyzeAsync = function (sf) { return this.analyze(sf, true); };
        IvyCompilation.prototype.detectHandlersForClass = function (node) {
            var e_1, _a;
            // The first step is to reflect the decorators.
            var classDecorators = this.reflector.getDecoratorsOfDeclaration(node);
            var ivyClass = null;
            try {
                // Look through the DecoratorHandlers to see if any are relevant.
                for (var _b = tslib_1.__values(this.handlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var handler = _c.value;
                    // An adapter is relevant if it matches one of the decorators on the class.
                    var detected = handler.detect(node, classDecorators);
                    if (detected === undefined) {
                        // This handler didn't match.
                        continue;
                    }
                    var isPrimaryHandler = handler.precedence === api_1.HandlerPrecedence.PRIMARY;
                    var isWeakHandler = handler.precedence === api_1.HandlerPrecedence.WEAK;
                    var match = {
                        handler: handler,
                        analyzed: null, detected: detected,
                    };
                    if (ivyClass === null) {
                        // This is the first handler to match this class. This path is a fast path through which
                        // most classes will flow.
                        ivyClass = {
                            matchedHandlers: [match],
                            hasPrimaryHandler: isPrimaryHandler,
                            hasWeakHandlers: isWeakHandler,
                        };
                        this.ivyClasses.set(node, ivyClass);
                    }
                    else {
                        // This is at least the second handler to match this class. This is a slower path that some
                        // classes will go through, which validates that the set of decorators applied to the class
                        // is valid.
                        // Validate according to rules as follows:
                        //
                        // * WEAK handlers are removed if a non-WEAK handler matches.
                        // * Only one PRIMARY handler can match at a time. Any other PRIMARY handler matching a
                        //   class with an existing PRIMARY handler is an error.
                        if (!isWeakHandler && ivyClass.hasWeakHandlers) {
                            // The current handler is not a WEAK handler, but the class has other WEAK handlers.
                            // Remove them.
                            ivyClass.matchedHandlers = ivyClass.matchedHandlers.filter(function (field) { return field.handler.precedence !== api_1.HandlerPrecedence.WEAK; });
                            ivyClass.hasWeakHandlers = false;
                        }
                        else if (isWeakHandler && !ivyClass.hasWeakHandlers) {
                            // The current handler is a WEAK handler, but the class has non-WEAK handlers already.
                            // Drop the current one.
                            continue;
                        }
                        if (isPrimaryHandler && ivyClass.hasPrimaryHandler) {
                            // The class already has a PRIMARY handler, and another one just matched.
                            this._diagnostics.push({
                                category: ts.DiagnosticCategory.Error,
                                code: Number('-99' + diagnostics_1.ErrorCode.DECORATOR_COLLISION),
                                file: typescript_1.getSourceFile(node),
                                start: node.getStart(undefined, false),
                                length: node.getWidth(),
                                messageText: 'Two incompatible decorators on class',
                            });
                            this.ivyClasses.delete(node);
                            return null;
                        }
                        // Otherwise, it's safe to accept the multiple decorators here. Update some of the metadata
                        // regarding this class.
                        ivyClass.matchedHandlers.push(match);
                        ivyClass.hasPrimaryHandler = ivyClass.hasPrimaryHandler || isPrimaryHandler;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return ivyClass;
        };
        IvyCompilation.prototype.analyze = function (sf, preanalyze) {
            var _this = this;
            var promises = [];
            if (this.incrementalState.safeToSkip(sf)) {
                return;
            }
            var analyzeClass = function (node) {
                var e_2, _a;
                var ivyClass = _this.detectHandlersForClass(node);
                // If the class has no Ivy behavior (or had errors), skip it.
                if (ivyClass === null) {
                    return;
                }
                var _loop_1 = function (match) {
                    // The analyze() function will run the analysis phase of the handler.
                    var analyze = function () {
                        var _a;
                        var analyzeClassSpan = _this.perf.start('analyzeClass', node);
                        try {
                            match.analyzed = match.handler.analyze(node, match.detected.metadata);
                            if (match.analyzed.diagnostics !== undefined) {
                                (_a = _this._diagnostics).push.apply(_a, tslib_1.__spread(match.analyzed.diagnostics));
                            }
                            if (match.analyzed.factorySymbolName !== undefined &&
                                _this.sourceToFactorySymbols !== null &&
                                _this.sourceToFactorySymbols.has(sf.fileName)) {
                                _this.sourceToFactorySymbols.get(sf.fileName).add(match.analyzed.factorySymbolName);
                            }
                        }
                        catch (err) {
                            if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                _this._diagnostics.push(err.toDiagnostic());
                            }
                            else {
                                throw err;
                            }
                        }
                        finally {
                            _this.perf.stop(analyzeClassSpan);
                        }
                    };
                    // If preanalysis was requested and a preanalysis step exists, then run preanalysis.
                    // Otherwise, skip directly to analysis.
                    if (preanalyze && match.handler.preanalyze !== undefined) {
                        // Preanalysis might return a Promise, indicating an async operation was necessary. Or it
                        // might return undefined, indicating no async step was needed and analysis can proceed
                        // immediately.
                        var preanalysis = match.handler.preanalyze(node, match.detected.metadata);
                        if (preanalysis !== undefined) {
                            // Await the results of preanalysis before running analysis.
                            promises.push(preanalysis.then(analyze));
                        }
                        else {
                            // No async preanalysis needed, skip directly to analysis.
                            analyze();
                        }
                    }
                    else {
                        // Not in preanalysis mode or not needed for this handler, skip directly to analysis.
                        analyze();
                    }
                };
                try {
                    // Loop through each matched handler that needs to be analyzed and analyze it, either
                    // synchronously or asynchronously.
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        _loop_1(match);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            };
            var visit = function (node) {
                // Process nodes recursively, and look for class declarations with decorators.
                if (reflection_1.isNamedClassDeclaration(node)) {
                    analyzeClass(node);
                }
                ts.forEachChild(node, visit);
            };
            visit(sf);
            if (preanalyze && promises.length > 0) {
                return Promise.all(promises).then(function () { return undefined; });
            }
            else {
                return undefined;
            }
        };
        /**
         * Feeds components discovered in the compilation to a context for indexing.
         */
        IvyCompilation.prototype.index = function (context) {
            this.ivyClasses.forEach(function (ivyClass, declaration) {
                var e_3, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.index !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.index(context, declaration, match.analyzed.analysis);
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
            });
        };
        IvyCompilation.prototype.resolve = function () {
            var _this = this;
            var resolveSpan = this.perf.start('resolve');
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_4, _a, e_5, _b, _c;
                try {
                    for (var _d = tslib_1.__values(ivyClass.matchedHandlers), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var match = _e.value;
                        if (match.handler.resolve !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            var resolveClassSpan = _this.perf.start('resolveClass', node);
                            try {
                                var res = match.handler.resolve(node, match.analyzed.analysis);
                                if (res.reexports !== undefined) {
                                    var fileName = node.getSourceFile().fileName;
                                    if (!_this.reexportMap.has(fileName)) {
                                        _this.reexportMap.set(fileName, new Map());
                                    }
                                    var fileReexports = _this.reexportMap.get(fileName);
                                    try {
                                        for (var _f = (e_5 = void 0, tslib_1.__values(res.reexports)), _g = _f.next(); !_g.done; _g = _f.next()) {
                                            var reexport = _g.value;
                                            fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
                                        }
                                    }
                                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                                    finally {
                                        try {
                                            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                                        }
                                        finally { if (e_5) throw e_5.error; }
                                    }
                                }
                                if (res.diagnostics !== undefined) {
                                    (_c = _this._diagnostics).push.apply(_c, tslib_1.__spread(res.diagnostics));
                                }
                            }
                            catch (err) {
                                if (err instanceof diagnostics_1.FatalDiagnosticError) {
                                    _this._diagnostics.push(err.toDiagnostic());
                                }
                                else {
                                    throw err;
                                }
                            }
                            finally {
                                _this.perf.stop(resolveClassSpan);
                            }
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
            });
            this.perf.stop(resolveSpan);
            this.recordNgModuleScopeDependencies();
        };
        IvyCompilation.prototype.recordNgModuleScopeDependencies = function () {
            var _this = this;
            var recordSpan = this.perf.start('recordDependencies');
            this.scopeRegistry.getCompilationScopes().forEach(function (scope) {
                var file = scope.declaration.getSourceFile();
                // Register the file containing the NgModule where the declaration is declared.
                _this.incrementalState.trackFileDependency(scope.ngModule.getSourceFile(), file);
                scope.directives.forEach(function (directive) {
                    return _this.incrementalState.trackFileDependency(directive.ref.node.getSourceFile(), file);
                });
                scope.pipes.forEach(function (pipe) { return _this.incrementalState.trackFileDependency(pipe.ref.node.getSourceFile(), file); });
            });
            this.perf.stop(recordSpan);
        };
        IvyCompilation.prototype.typeCheck = function (context) {
            this.ivyClasses.forEach(function (ivyClass, node) {
                var e_6, _a;
                try {
                    for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var match = _c.value;
                        if (match.handler.typeCheck !== undefined && match.analyzed !== null &&
                            match.analyzed.analysis !== undefined) {
                            match.handler.typeCheck(context, node, match.analyzed.analysis);
                        }
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
            });
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node, constantPool) {
            var e_7, _a;
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!reflection_1.isNamedClassDeclaration(original) || !this.ivyClasses.has(original)) {
                return undefined;
            }
            var ivyClass = this.ivyClasses.get(original);
            var res = [];
            var _loop_2 = function (match) {
                if (match.analyzed === null || match.analyzed.analysis === undefined) {
                    return "continue";
                }
                var compileSpan = this_1.perf.start('compileClass', original);
                var compileMatchRes = match.handler.compile(node, match.analyzed.analysis, constantPool);
                this_1.perf.stop(compileSpan);
                if (Array.isArray(compileMatchRes)) {
                    compileMatchRes.forEach(function (result) {
                        if (!res.some(function (r) { return r.name === result.name; })) {
                            res.push(result);
                        }
                    });
                }
                else if (!res.some(function (result) { return result.name === compileMatchRes.name; })) {
                    res.push(compileMatchRes);
                }
            };
            var this_1 = this;
            try {
                for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var match = _c.value;
                    _loop_2(match);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_7) throw e_7.error; }
            }
            // Look up the .d.ts transformer for the input file and record that at least one field was
            // generated, which will allow the .d.ts to be transformed later.
            var fileName = original.getSourceFile().fileName;
            var dtsTransformer = this.getDtsTransformer(fileName);
            dtsTransformer.recordStaticField(reflection_1.reflectNameOfDeclaration(node), res);
            // Return the instruction to the transformer so the fields will be added.
            return res.length > 0 ? res : undefined;
        };
        /**
         * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
         */
        IvyCompilation.prototype.ivyDecoratorsFor = function (node) {
            var e_8, _a;
            var original = ts.getOriginalNode(node);
            if (!reflection_1.isNamedClassDeclaration(original) || !this.ivyClasses.has(original)) {
                return EMPTY_ARRAY;
            }
            var ivyClass = this.ivyClasses.get(original);
            var decorators = [];
            try {
                for (var _b = tslib_1.__values(ivyClass.matchedHandlers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var match = _c.value;
                    if (match.analyzed === null || match.analyzed.analysis === undefined) {
                        continue;
                    }
                    if (match.detected.trigger !== null && ts.isDecorator(match.detected.trigger)) {
                        decorators.push(match.detected.trigger);
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return decorators;
        };
        /**
         * Process a declaration file and return a transformed version that incorporates the changes
         * made to the source file.
         */
        IvyCompilation.prototype.transformedDtsFor = function (file, context) {
            // No need to transform if it's not a declarations file, or if no changes have been requested
            // to the input file.
            // Due to the way TypeScript afterDeclarations transformers work, the SourceFile path is the
            // same as the original .ts.
            // The only way we know it's actually a declaration file is via the isDeclarationFile property.
            if (!file.isDeclarationFile || !this.dtsMap.has(file.fileName)) {
                return file;
            }
            // Return the transformed source.
            return this.dtsMap.get(file.fileName).transform(file, context);
        };
        Object.defineProperty(IvyCompilation.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        IvyCompilation.prototype.getDtsTransformer = function (tsFileName) {
            if (!this.dtsMap.has(tsFileName)) {
                this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer(this.importRewriter));
            }
            return this.dtsMap.get(tsFileName);
        };
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUtsRSx5RUFBcUg7SUFHckgsa0ZBQXdEO0lBRXhELHlFQUF1RztJQUN2Ryx5RkFBaUQ7SUFFakQsSUFBTSxXQUFXLEdBQVEsRUFBRSxDQUFDO0lBbUI1Qjs7Ozs7T0FLRztJQUNIO1FBb0JFOzs7Ozs7OztXQVFHO1FBQ0gsd0JBQ1ksUUFBc0MsRUFBVSxTQUF5QixFQUN6RSxjQUE4QixFQUFVLGdCQUFrQyxFQUMxRSxJQUFrQixFQUFVLHNCQUFxRCxFQUNqRixhQUF1QztZQUh2QyxhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQ3pFLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUFVLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7WUFDMUUsU0FBSSxHQUFKLElBQUksQ0FBYztZQUFVLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7WUFDakYsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBaENuRDs7O2VBR0c7WUFDSyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFFM0Q7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUUvQyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUF5QyxDQUFDO1lBQy9ELGlCQUFZLEdBQW9CLEVBQUUsQ0FBQztRQWdCVyxDQUFDO1FBR3ZELHNCQUFJLDRDQUFnQjtpQkFBcEIsY0FBcUUsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzs7O1dBQUE7UUFF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SUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDOUQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELGlDQUFpQztZQUNqQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxzQkFBSSx1Q0FBVztpQkFBZixjQUFrRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVyRSwwQ0FBaUIsR0FBekIsVUFBMEIsVUFBa0I7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxnQ0FBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzthQUMxRTtZQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFHLENBQUM7UUFDdkMsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQXpYRCxJQXlYQztJQXpYWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtJbmNyZW1lbnRhbFN0YXRlfSBmcm9tICcuLi8uLi9pbmNyZW1lbnRhbCc7XG5pbXBvcnQge0luZGV4aW5nQ29udGV4dH0gZnJvbSAnLi4vLi4vaW5kZXhlcic7XG5pbXBvcnQge1BlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIFJlZmxlY3Rpb25Ib3N0LCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge1R5cGVDaGVja0NvbnRleHR9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5cbmNvbnN0IEVNUFRZX0FSUkFZOiBhbnkgPSBbXTtcblxuLyoqXG4gKiBSZWNvcmQgb2YgYW4gYWRhcHRlciB3aGljaCBkZWNpZGVkIHRvIGVtaXQgYSBzdGF0aWMgZmllbGQsIGFuZCB0aGUgYW5hbHlzaXMgaXQgcGVyZm9ybWVkIHRvXG4gKiBwcmVwYXJlIGZvciB0aGF0IG9wZXJhdGlvbi5cbiAqL1xuaW50ZXJmYWNlIE1hdGNoZWRIYW5kbGVyPEEsIE0+IHtcbiAgaGFuZGxlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgYW5hbHl6ZWQ6IEFuYWx5c2lzT3V0cHV0PEE+fG51bGw7XG4gIGRldGVjdGVkOiBEZXRlY3RSZXN1bHQ8TT47XG59XG5cbmludGVyZmFjZSBJdnlDbGFzcyB7XG4gIG1hdGNoZWRIYW5kbGVyczogTWF0Y2hlZEhhbmRsZXI8YW55LCBhbnk+W107XG5cbiAgaGFzV2Vha0hhbmRsZXJzOiBib29sZWFuO1xuICBoYXNQcmltYXJ5SGFuZGxlcjogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNYW5hZ2VzIGEgY29tcGlsYXRpb24gb2YgSXZ5IGRlY29yYXRvcnMgaW50byBzdGF0aWMgZmllbGRzIGFjcm9zcyBhbiBlbnRpcmUgdHMuUHJvZ3JhbS5cbiAqXG4gKiBUaGUgY29tcGlsYXRpb24gaXMgc3RhdGVmdWwgLSBzb3VyY2UgZmlsZXMgYXJlIGFuYWx5emVkIGFuZCByZWNvcmRzIG9mIHRoZSBvcGVyYXRpb25zIHRoYXQgbmVlZFxuICogdG8gYmUgcGVyZm9ybWVkIGR1cmluZyB0aGUgdHJhbnNmb3JtL2VtaXQgcHJvY2VzcyBhcmUgbWFpbnRhaW5lZCBpbnRlcm5hbGx5LlxuICovXG5leHBvcnQgY2xhc3MgSXZ5Q29tcGlsYXRpb24ge1xuICAvKipcbiAgICogVHJhY2tzIGNsYXNzZXMgd2hpY2ggaGF2ZSBiZWVuIGFuYWx5emVkIGFuZCBmb3VuZCB0byBoYXZlIGFuIEl2eSBkZWNvcmF0b3IsIGFuZCB0aGVcbiAgICogaW5mb3JtYXRpb24gcmVjb3JkZWQgYWJvdXQgdGhlbSBmb3IgbGF0ZXIgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGl2eUNsYXNzZXMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIEl2eUNsYXNzPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgZmFjdG9yeSBpbmZvcm1hdGlvbiB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIGBEdHNGaWxlVHJhbnNmb3JtZXJgcyBmb3IgZWFjaCBUUyBmaWxlIHRoYXQgbmVlZHMgLmQudHMgdHJhbnNmb3JtYXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBkdHNNYXAgPSBuZXcgTWFwPHN0cmluZywgRHRzRmlsZVRyYW5zZm9ybWVyPigpO1xuXG4gIHByaXZhdGUgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgTWFwPHN0cmluZywgW3N0cmluZywgc3RyaW5nXT4+KCk7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gaGFuZGxlcnMgYXJyYXkgb2YgYERlY29yYXRvckhhbmRsZXJgcyB3aGljaCB3aWxsIGJlIGV4ZWN1dGVkIGFnYWluc3QgZWFjaCBjbGFzcyBpbiB0aGVcbiAgICogcHJvZ3JhbVxuICAgKiBAcGFyYW0gY2hlY2tlciBUeXBlU2NyaXB0IGBUeXBlQ2hlY2tlcmAgaW5zdGFuY2UgZm9yIHRoZSBwcm9ncmFtXG4gICAqIEBwYXJhbSByZWZsZWN0b3IgYFJlZmxlY3Rpb25Ib3N0YCB0aHJvdWdoIHdoaWNoIGFsbCByZWZsZWN0aW9uIG9wZXJhdGlvbnMgd2lsbCBiZSBwZXJmb3JtZWRcbiAgICogQHBhcmFtIGNvcmVJbXBvcnRzRnJvbSBhIFR5cGVTY3JpcHQgYFNvdXJjZUZpbGVgIHdoaWNoIGV4cG9ydHMgc3ltYm9scyBuZWVkZWQgZm9yIEl2eSBpbXBvcnRzXG4gICAqIHdoZW4gY29tcGlsaW5nIEBhbmd1bGFyL2NvcmUsIG9yIGBudWxsYCBpZiB0aGUgY3VycmVudCBwcm9ncmFtIGlzIG5vdCBAYW5ndWxhci9jb3JlLiBUaGlzIGlzXG4gICAqIGBudWxsYCBpbiBtb3N0IGNhc2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlciwgcHJpdmF0ZSBpbmNyZW1lbnRhbFN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLFxuICAgICAgcHJpdmF0ZSBwZXJmOiBQZXJmUmVjb3JkZXIsIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSkge31cblxuXG4gIGdldCBleHBvcnRTdGF0ZW1lbnRzKCk6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+PiB7IHJldHVybiB0aGlzLnJlZXhwb3J0TWFwOyB9XG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgZmFsc2UpOyB9XG5cbiAgYW5hbHl6ZUFzeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTsgfVxuXG4gIHByaXZhdGUgZGV0ZWN0SGFuZGxlcnNGb3JDbGFzcyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogSXZ5Q2xhc3N8bnVsbCB7XG4gICAgLy8gVGhlIGZpcnN0IHN0ZXAgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycy5cbiAgICBjb25zdCBjbGFzc0RlY29yYXRvcnMgPSB0aGlzLnJlZmxlY3Rvci5nZXREZWNvcmF0b3JzT2ZEZWNsYXJhdGlvbihub2RlKTtcbiAgICBsZXQgaXZ5Q2xhc3M6IEl2eUNsYXNzfG51bGwgPSBudWxsO1xuXG4gICAgLy8gTG9vayB0aHJvdWdoIHRoZSBEZWNvcmF0b3JIYW5kbGVycyB0byBzZWUgaWYgYW55IGFyZSByZWxldmFudC5cbiAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgdGhpcy5oYW5kbGVycykge1xuICAgICAgLy8gQW4gYWRhcHRlciBpcyByZWxldmFudCBpZiBpdCBtYXRjaGVzIG9uZSBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAgICBjb25zdCBkZXRlY3RlZCA9IGhhbmRsZXIuZGV0ZWN0KG5vZGUsIGNsYXNzRGVjb3JhdG9ycyk7XG4gICAgICBpZiAoZGV0ZWN0ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXIgZGlkbid0IG1hdGNoLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXNQcmltYXJ5SGFuZGxlciA9IGhhbmRsZXIucHJlY2VkZW5jZSA9PT0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgICAgIGNvbnN0IGlzV2Vha0hhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUs7XG4gICAgICBjb25zdCBtYXRjaCA9IHtcbiAgICAgICAgaGFuZGxlcixcbiAgICAgICAgYW5hbHl6ZWQ6IG51bGwsIGRldGVjdGVkLFxuICAgICAgfTtcblxuICAgICAgaWYgKGl2eUNsYXNzID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIGZpcnN0IGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBwYXRoIGlzIGEgZmFzdCBwYXRoIHRocm91Z2ggd2hpY2hcbiAgICAgICAgLy8gbW9zdCBjbGFzc2VzIHdpbGwgZmxvdy5cbiAgICAgICAgaXZ5Q2xhc3MgPSB7XG4gICAgICAgICAgbWF0Y2hlZEhhbmRsZXJzOiBbbWF0Y2hdLFxuICAgICAgICAgIGhhc1ByaW1hcnlIYW5kbGVyOiBpc1ByaW1hcnlIYW5kbGVyLFxuICAgICAgICAgIGhhc1dlYWtIYW5kbGVyczogaXNXZWFrSGFuZGxlcixcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pdnlDbGFzc2VzLnNldChub2RlLCBpdnlDbGFzcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGlzIGlzIGF0IGxlYXN0IHRoZSBzZWNvbmQgaGFuZGxlciB0byBtYXRjaCB0aGlzIGNsYXNzLiBUaGlzIGlzIGEgc2xvd2VyIHBhdGggdGhhdCBzb21lXG4gICAgICAgIC8vIGNsYXNzZXMgd2lsbCBnbyB0aHJvdWdoLCB3aGljaCB2YWxpZGF0ZXMgdGhhdCB0aGUgc2V0IG9mIGRlY29yYXRvcnMgYXBwbGllZCB0byB0aGUgY2xhc3NcbiAgICAgICAgLy8gaXMgdmFsaWQuXG5cbiAgICAgICAgLy8gVmFsaWRhdGUgYWNjb3JkaW5nIHRvIHJ1bGVzIGFzIGZvbGxvd3M6XG4gICAgICAgIC8vXG4gICAgICAgIC8vICogV0VBSyBoYW5kbGVycyBhcmUgcmVtb3ZlZCBpZiBhIG5vbi1XRUFLIGhhbmRsZXIgbWF0Y2hlcy5cbiAgICAgICAgLy8gKiBPbmx5IG9uZSBQUklNQVJZIGhhbmRsZXIgY2FuIG1hdGNoIGF0IGEgdGltZS4gQW55IG90aGVyIFBSSU1BUlkgaGFuZGxlciBtYXRjaGluZyBhXG4gICAgICAgIC8vICAgY2xhc3Mgd2l0aCBhbiBleGlzdGluZyBQUklNQVJZIGhhbmRsZXIgaXMgYW4gZXJyb3IuXG5cbiAgICAgICAgaWYgKCFpc1dlYWtIYW5kbGVyICYmIGl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgbm90IGEgV0VBSyBoYW5kbGVyLCBidXQgdGhlIGNsYXNzIGhhcyBvdGhlciBXRUFLIGhhbmRsZXJzLlxuICAgICAgICAgIC8vIFJlbW92ZSB0aGVtLlxuICAgICAgICAgIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycyA9IGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycy5maWx0ZXIoXG4gICAgICAgICAgICAgIGZpZWxkID0+IGZpZWxkLmhhbmRsZXIucHJlY2VkZW5jZSAhPT0gSGFuZGxlclByZWNlZGVuY2UuV0VBSyk7XG4gICAgICAgICAgaXZ5Q2xhc3MuaGFzV2Vha0hhbmRsZXJzID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNXZWFrSGFuZGxlciAmJiAhaXZ5Q2xhc3MuaGFzV2Vha0hhbmRsZXJzKSB7XG4gICAgICAgICAgLy8gVGhlIGN1cnJlbnQgaGFuZGxlciBpcyBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgbm9uLVdFQUsgaGFuZGxlcnMgYWxyZWFkeS5cbiAgICAgICAgICAvLyBEcm9wIHRoZSBjdXJyZW50IG9uZS5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ByaW1hcnlIYW5kbGVyICYmIGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyKSB7XG4gICAgICAgICAgLy8gVGhlIGNsYXNzIGFscmVhZHkgaGFzIGEgUFJJTUFSWSBoYW5kbGVyLCBhbmQgYW5vdGhlciBvbmUganVzdCBtYXRjaGVkLlxuICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICAgICAgY2F0ZWdvcnk6IHRzLkRpYWdub3N0aWNDYXRlZ29yeS5FcnJvcixcbiAgICAgICAgICAgIGNvZGU6IE51bWJlcignLTk5JyArIEVycm9yQ29kZS5ERUNPUkFUT1JfQ09MTElTSU9OKSxcbiAgICAgICAgICAgIGZpbGU6IGdldFNvdXJjZUZpbGUobm9kZSksXG4gICAgICAgICAgICBzdGFydDogbm9kZS5nZXRTdGFydCh1bmRlZmluZWQsIGZhbHNlKSxcbiAgICAgICAgICAgIGxlbmd0aDogbm9kZS5nZXRXaWR0aCgpLFxuICAgICAgICAgICAgbWVzc2FnZVRleHQ6ICdUd28gaW5jb21wYXRpYmxlIGRlY29yYXRvcnMgb24gY2xhc3MnLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuaXZ5Q2xhc3Nlcy5kZWxldGUobm9kZSk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPdGhlcndpc2UsIGl0J3Mgc2FmZSB0byBhY2NlcHQgdGhlIG11bHRpcGxlIGRlY29yYXRvcnMgaGVyZS4gVXBkYXRlIHNvbWUgb2YgdGhlIG1ldGFkYXRhXG4gICAgICAgIC8vIHJlZ2FyZGluZyB0aGlzIGNsYXNzLlxuICAgICAgICBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMucHVzaChtYXRjaCk7XG4gICAgICAgIGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyID0gaXZ5Q2xhc3MuaGFzUHJpbWFyeUhhbmRsZXIgfHwgaXNQcmltYXJ5SGFuZGxlcjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaXZ5Q2xhc3M7XG4gIH1cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHNvdXJjZSBmaWxlIGFuZCBwcm9kdWNlIGRpYWdub3N0aWNzIGZvciBpdCAoaWYgYW55KS5cbiAgICovXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogdHJ1ZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICAgIGlmICh0aGlzLmluY3JlbWVudGFsU3RhdGUuc2FmZVRvU2tpcChzZikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYW5hbHl6ZUNsYXNzID0gKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiB2b2lkID0+IHtcbiAgICAgIGNvbnN0IGl2eUNsYXNzID0gdGhpcy5kZXRlY3RIYW5kbGVyc0ZvckNsYXNzKG5vZGUpO1xuXG4gICAgICAvLyBJZiB0aGUgY2xhc3MgaGFzIG5vIEl2eSBiZWhhdmlvciAob3IgaGFkIGVycm9ycyksIHNraXAgaXQuXG4gICAgICBpZiAoaXZ5Q2xhc3MgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBMb29wIHRocm91Z2ggZWFjaCBtYXRjaGVkIGhhbmRsZXIgdGhhdCBuZWVkcyB0byBiZSBhbmFseXplZCBhbmQgYW5hbHl6ZSBpdCwgZWl0aGVyXG4gICAgICAvLyBzeW5jaHJvbm91c2x5IG9yIGFzeW5jaHJvbm91c2x5LlxuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgLy8gVGhlIGFuYWx5emUoKSBmdW5jdGlvbiB3aWxsIHJ1biB0aGUgYW5hbHlzaXMgcGhhc2Ugb2YgdGhlIGhhbmRsZXIuXG4gICAgICAgIGNvbnN0IGFuYWx5emUgPSAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgYW5hbHl6ZUNsYXNzU3BhbiA9IHRoaXMucGVyZi5zdGFydCgnYW5hbHl6ZUNsYXNzJywgbm9kZSk7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkID0gbWF0Y2guaGFuZGxlci5hbmFseXplKG5vZGUsIG1hdGNoLmRldGVjdGVkLm1ldGFkYXRhKTtcblxuICAgICAgICAgICAgaWYgKG1hdGNoLmFuYWx5emVkLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaCguLi5tYXRjaC5hbmFseXplZC5kaWFnbm9zdGljcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtYXRjaC5hbmFseXplZC5mYWN0b3J5U3ltYm9sTmFtZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzICE9PSBudWxsICYmXG4gICAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgdGhpcy5zb3VyY2VUb0ZhY3RvcnlTeW1ib2xzLmdldChzZi5maWxlTmFtZSkgIS5hZGQobWF0Y2guYW5hbHl6ZWQuZmFjdG9yeVN5bWJvbE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIEZhdGFsRGlhZ25vc3RpY0Vycm9yKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goZXJyLnRvRGlhZ25vc3RpYygpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5wZXJmLnN0b3AoYW5hbHl6ZUNsYXNzU3Bhbik7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIElmIHByZWFuYWx5c2lzIHdhcyByZXF1ZXN0ZWQgYW5kIGEgcHJlYW5hbHlzaXMgc3RlcCBleGlzdHMsIHRoZW4gcnVuIHByZWFuYWx5c2lzLlxuICAgICAgICAvLyBPdGhlcndpc2UsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgIGlmIChwcmVhbmFseXplICYmIG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gUHJlYW5hbHlzaXMgbWlnaHQgcmV0dXJuIGEgUHJvbWlzZSwgaW5kaWNhdGluZyBhbiBhc3luYyBvcGVyYXRpb24gd2FzIG5lY2Vzc2FyeS4gT3IgaXRcbiAgICAgICAgICAvLyBtaWdodCByZXR1cm4gdW5kZWZpbmVkLCBpbmRpY2F0aW5nIG5vIGFzeW5jIHN0ZXAgd2FzIG5lZWRlZCBhbmQgYW5hbHlzaXMgY2FuIHByb2NlZWRcbiAgICAgICAgICAvLyBpbW1lZGlhdGVseS5cbiAgICAgICAgICBjb25zdCBwcmVhbmFseXNpcyA9IG1hdGNoLmhhbmRsZXIucHJlYW5hbHl6ZShub2RlLCBtYXRjaC5kZXRlY3RlZC5tZXRhZGF0YSk7XG4gICAgICAgICAgaWYgKHByZWFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEF3YWl0IHRoZSByZXN1bHRzIG9mIHByZWFuYWx5c2lzIGJlZm9yZSBydW5uaW5nIGFuYWx5c2lzLlxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChwcmVhbmFseXNpcy50aGVuKGFuYWx5emUpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTm8gYXN5bmMgcHJlYW5hbHlzaXMgbmVlZGVkLCBza2lwIGRpcmVjdGx5IHRvIGFuYWx5c2lzLlxuICAgICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBOb3QgaW4gcHJlYW5hbHlzaXMgbW9kZSBvciBub3QgbmVlZGVkIGZvciB0aGlzIGhhbmRsZXIsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgICAgYW5hbHl6ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByb2Nlc3Mgbm9kZXMgcmVjdXJzaXZlbHksIGFuZCBsb29rIGZvciBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCBkZWNvcmF0b3JzLlxuICAgICAgaWYgKGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIGFuYWx5emVDbGFzcyhub2RlKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGZWVkcyBjb21wb25lbnRzIGRpc2NvdmVyZWQgaW4gdGhlIGNvbXBpbGF0aW9uIHRvIGEgY29udGV4dCBmb3IgaW5kZXhpbmcuXG4gICAqL1xuICBpbmRleChjb250ZXh0OiBJbmRleGluZ0NvbnRleHQpIHtcbiAgICB0aGlzLml2eUNsYXNzZXMuZm9yRWFjaCgoaXZ5Q2xhc3MsIGRlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5pbmRleCAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5pbmRleChjb250ZXh0LCBkZWNsYXJhdGlvbiwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IHJlc29sdmVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlJyk7XG4gICAgdGhpcy5pdnlDbGFzc2VzLmZvckVhY2goKGl2eUNsYXNzLCBub2RlKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlQ2xhc3NTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlQ2xhc3MnLCBub2RlKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gbWF0Y2guaGFuZGxlci5yZXNvbHZlKG5vZGUsIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzKTtcbiAgICAgICAgICAgIGlmIChyZXMucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlZXhwb3J0TWFwLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGZpbGVSZWV4cG9ydHMgPSB0aGlzLnJlZXhwb3J0TWFwLmdldChmaWxlTmFtZSkgITtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZXMucmVleHBvcnRzKSB7XG4gICAgICAgICAgICAgICAgZmlsZVJlZXhwb3J0cy5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4ucmVzLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGVyci50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVDbGFzc1NwYW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVTcGFuKTtcbiAgICB0aGlzLnJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkTmdNb2R1bGVTY29wZURlcGVuZGVuY2llcygpIHtcbiAgICBjb25zdCByZWNvcmRTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZWNvcmREZXBlbmRlbmNpZXMnKTtcbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkgIS5nZXRDb21waWxhdGlvblNjb3BlcygpLmZvckVhY2goc2NvcGUgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHNjb3BlLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIC8vIFJlZ2lzdGVyIHRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIE5nTW9kdWxlIHdoZXJlIHRoZSBkZWNsYXJhdGlvbiBpcyBkZWNsYXJlZC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxTdGF0ZS50cmFja0ZpbGVEZXBlbmRlbmN5KHNjb3BlLm5nTW9kdWxlLmdldFNvdXJjZUZpbGUoKSwgZmlsZSk7XG4gICAgICBzY29wZS5kaXJlY3RpdmVzLmZvckVhY2goXG4gICAgICAgICAgZGlyZWN0aXZlID0+XG4gICAgICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxTdGF0ZS50cmFja0ZpbGVEZXBlbmRlbmN5KGRpcmVjdGl2ZS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCksIGZpbGUpKTtcbiAgICAgIHNjb3BlLnBpcGVzLmZvckVhY2goXG4gICAgICAgICAgcGlwZSA9PiB0aGlzLmluY3JlbWVudGFsU3RhdGUudHJhY2tGaWxlRGVwZW5kZW5jeShwaXBlLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSwgZmlsZSkpO1xuICAgIH0pO1xuICAgIHRoaXMucGVyZi5zdG9wKHJlY29yZFNwYW4pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGNvbnRleHQ6IFR5cGVDaGVja0NvbnRleHQpOiB2b2lkIHtcbiAgICB0aGlzLml2eUNsYXNzZXMuZm9yRWFjaCgoaXZ5Q2xhc3MsIG5vZGUpID0+IHtcbiAgICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICAgIGlmIChtYXRjaC5oYW5kbGVyLnR5cGVDaGVjayAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci50eXBlQ2hlY2soY29udGV4dCwgbm9kZSwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBhIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBvbiB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpbnN0cnVjdGlvbnMgdG8gYW5cbiAgICogQVNUIHRyYW5zZm9ybWVyIGlmIGFueSBhcmUgYXZhaWxhYmxlLlxuICAgKi9cbiAgY29tcGlsZUl2eUZpZWxkRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXXx1bmRlZmluZWQge1xuICAgIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIG9yaWdpbmFsIG5vZGUgd2FzIGFuYWx5emVkLiBJZiBub3QsIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZTtcbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG9yaWdpbmFsKSB8fCAhdGhpcy5pdnlDbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLml2eUNsYXNzZXMuZ2V0KG9yaWdpbmFsKSAhO1xuXG4gICAgbGV0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgaWYgKG1hdGNoLmFuYWx5emVkID09PSBudWxsIHx8IG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNvbXBpbGVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdjb21waWxlQ2xhc3MnLCBvcmlnaW5hbCk7XG4gICAgICBjb25zdCBjb21waWxlTWF0Y2hSZXMgPVxuICAgICAgICAgIG1hdGNoLmhhbmRsZXIuY29tcGlsZShub2RlIGFzIENsYXNzRGVjbGFyYXRpb24sIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgICAgdGhpcy5wZXJmLnN0b3AoY29tcGlsZVNwYW4pO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY29tcGlsZU1hdGNoUmVzKSkge1xuICAgICAgICBjb21waWxlTWF0Y2hSZXMuZm9yRWFjaChyZXN1bHQgPT4ge1xuICAgICAgICAgIGlmICghcmVzLnNvbWUociA9PiByLm5hbWUgPT09IHJlc3VsdC5uYW1lKSkge1xuICAgICAgICAgICAgcmVzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmICghcmVzLnNvbWUocmVzdWx0ID0+IHJlc3VsdC5uYW1lID09PSBjb21waWxlTWF0Y2hSZXMubmFtZSkpIHtcbiAgICAgICAgcmVzLnB1c2goY29tcGlsZU1hdGNoUmVzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSAuZC50cyB0cmFuc2Zvcm1lciBmb3IgdGhlIGlucHV0IGZpbGUgYW5kIHJlY29yZCB0aGF0IGF0IGxlYXN0IG9uZSBmaWVsZCB3YXNcbiAgICAvLyBnZW5lcmF0ZWQsIHdoaWNoIHdpbGwgYWxsb3cgdGhlIC5kLnRzIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gb3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGR0c1RyYW5zZm9ybWVyID0gdGhpcy5nZXREdHNUcmFuc2Zvcm1lcihmaWxlTmFtZSk7XG4gICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQocmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpICEsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGRzIHdpbGwgYmUgYWRkZWQuXG4gICAgcmV0dXJuIHJlcy5sZW5ndGggPiAwID8gcmVzIDogdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgYHRzLkRlY29yYXRvcmAgd2hpY2ggdHJpZ2dlcmVkIHRyYW5zZm9ybWF0aW9uIG9mIGEgcGFydGljdWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGl2eURlY29yYXRvcnNGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiB0cy5EZWNvcmF0b3JbXSB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHlwZW9mIG5vZGU7XG5cbiAgICBpZiAoIWlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG9yaWdpbmFsKSB8fCAhdGhpcy5pdnlDbGFzc2VzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiBFTVBUWV9BUlJBWTtcbiAgICB9XG4gICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLml2eUNsYXNzZXMuZ2V0KG9yaWdpbmFsKSAhO1xuICAgIGNvbnN0IGRlY29yYXRvcnM6IHRzLkRlY29yYXRvcltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgaWYgKG1hdGNoLmFuYWx5emVkID09PSBudWxsIHx8IG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAobWF0Y2guZGV0ZWN0ZWQudHJpZ2dlciAhPT0gbnVsbCAmJiB0cy5pc0RlY29yYXRvcihtYXRjaC5kZXRlY3RlZC50cmlnZ2VyKSkge1xuICAgICAgICBkZWNvcmF0b3JzLnB1c2gobWF0Y2guZGV0ZWN0ZWQudHJpZ2dlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlY29yYXRvcnM7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIGRlY2xhcmF0aW9uIGZpbGUgYW5kIHJldHVybiBhIHRyYW5zZm9ybWVkIHZlcnNpb24gdGhhdCBpbmNvcnBvcmF0ZXMgdGhlIGNoYW5nZXNcbiAgICogbWFkZSB0byB0aGUgc291cmNlIGZpbGUuXG4gICAqL1xuICB0cmFuc2Zvcm1lZER0c0ZvcihmaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb250ZXh0OiB0cy5UcmFuc2Zvcm1hdGlvbkNvbnRleHQpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgICAvLyBObyBuZWVkIHRvIHRyYW5zZm9ybSBpZiBpdCdzIG5vdCBhIGRlY2xhcmF0aW9ucyBmaWxlLCBvciBpZiBubyBjaGFuZ2VzIGhhdmUgYmVlbiByZXF1ZXN0ZWRcbiAgICAvLyB0byB0aGUgaW5wdXQgZmlsZS5cbiAgICAvLyBEdWUgdG8gdGhlIHdheSBUeXBlU2NyaXB0IGFmdGVyRGVjbGFyYXRpb25zIHRyYW5zZm9ybWVycyB3b3JrLCB0aGUgU291cmNlRmlsZSBwYXRoIGlzIHRoZVxuICAgIC8vIHNhbWUgYXMgdGhlIG9yaWdpbmFsIC50cy5cbiAgICAvLyBUaGUgb25seSB3YXkgd2Uga25vdyBpdCdzIGFjdHVhbGx5IGEgZGVjbGFyYXRpb24gZmlsZSBpcyB2aWEgdGhlIGlzRGVjbGFyYXRpb25GaWxlIHByb3BlcnR5LlxuICAgIGlmICghZmlsZS5pc0RlY2xhcmF0aW9uRmlsZSB8fCAhdGhpcy5kdHNNYXAuaGFzKGZpbGUuZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHRyYW5zZm9ybWVkIHNvdXJjZS5cbiAgICByZXR1cm4gdGhpcy5kdHNNYXAuZ2V0KGZpbGUuZmlsZU5hbWUpICEudHJhbnNmb3JtKGZpbGUsIGNvbnRleHQpO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBwcml2YXRlIGdldER0c1RyYW5zZm9ybWVyKHRzRmlsZU5hbWU6IHN0cmluZyk6IER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuZHRzTWFwLnNldCh0c0ZpbGVOYW1lLCBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldCh0c0ZpbGVOYW1lKSAhO1xuICB9XG59XG4iXX0=