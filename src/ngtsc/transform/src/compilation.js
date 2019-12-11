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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/transform/src/api"], factory);
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
        function IvyCompilation(handlers, reflector, importRewriter, incrementalDriver, perf, sourceToFactorySymbols, scopeRegistry, compileNonExportedClasses, dtsTransforms, mwpScanner) {
            this.handlers = handlers;
            this.reflector = reflector;
            this.importRewriter = importRewriter;
            this.incrementalDriver = incrementalDriver;
            this.perf = perf;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
            this.scopeRegistry = scopeRegistry;
            this.compileNonExportedClasses = compileNonExportedClasses;
            this.dtsTransforms = dtsTransforms;
            this.mwpScanner = mwpScanner;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.ivyClasses = new Map();
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
            if (!this.compileNonExportedClasses && !typescript_1.isExported(node)) {
                return null;
            }
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
            this.mwpScanner.scan(sf, {
                addTypeReplacement: function (node, type) {
                    // Only obtain the return type transform for the source file once there's a type to replace,
                    // so that no transform is allocated when there's nothing to do.
                    _this.dtsTransforms.getReturnTypeTransform(sf).addTypeReplacement(node, type);
                }
            });
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
                var ngModuleFile = scope.ngModule.getSourceFile();
                // A change to any dependency of the declaration causes the declaration to be invalidated,
                // which requires the NgModule to be invalidated as well.
                var deps = _this.incrementalDriver.getFileDependencies(file);
                _this.incrementalDriver.trackFileDependencies(deps, ngModuleFile);
                // A change to the NgModule file should cause the declaration itself to be invalidated.
                _this.incrementalDriver.trackFileDependency(ngModuleFile, file);
                // A change to any directive/pipe in the compilation scope should cause the declaration to be
                // invalidated.
                scope.directives.forEach(function (directive) {
                    var dirSf = directive.ref.node.getSourceFile();
                    // When a directive in scope is updated, the declaration needs to be recompiled as e.g.
                    // a selector may have changed.
                    _this.incrementalDriver.trackFileDependency(dirSf, file);
                    // When any of the dependencies of the declaration changes, the NgModule scope may be
                    // affected so a component within scope must be recompiled. Only components need to be
                    // recompiled, as directives are not dependent upon the compilation scope.
                    if (directive.isComponent) {
                        _this.incrementalDriver.trackFileDependencies(deps, dirSf);
                    }
                });
                scope.pipes.forEach(function (pipe) {
                    // When a pipe in scope is updated, the declaration needs to be recompiled as e.g.
                    // the pipe's name may have changed.
                    _this.incrementalDriver.trackFileDependency(pipe.ref.node.getSourceFile(), file);
                });
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
            this.dtsTransforms.getIvyDeclarationTransform(original.getSourceFile())
                .addFields(original, res);
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
        Object.defineProperty(IvyCompilation.prototype, "diagnostics", {
            get: function () { return this._diagnostics; },
            enumerable: true,
            configurable: true
        });
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQU1sRSx5RUFBMkY7SUFHM0Ysa0ZBQW9FO0lBRXBFLHlFQUF1RztJQUd2RyxJQUFNLFdBQVcsR0FBUSxFQUFFLENBQUM7SUFtQjVCOzs7OztPQUtHO0lBQ0g7UUFVRTs7Ozs7Ozs7V0FRRztRQUNILHdCQUNZLFFBQXNDLEVBQVUsU0FBeUIsRUFDekUsY0FBOEIsRUFBVSxpQkFBb0MsRUFDNUUsSUFBa0IsRUFBVSxzQkFBcUQsRUFDakYsYUFBdUMsRUFBVSx5QkFBa0MsRUFDbkYsYUFBbUMsRUFBVSxVQUFzQztZQUpuRixhQUFRLEdBQVIsUUFBUSxDQUE4QjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQ3pFLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtZQUFVLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7WUFDNUUsU0FBSSxHQUFKLElBQUksQ0FBYztZQUFVLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBK0I7WUFDakYsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBQVUsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFTO1lBQ25GLGtCQUFhLEdBQWIsYUFBYSxDQUFzQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQTRCO1lBdkIvRjs7O2VBR0c7WUFDSyxlQUFVLEdBQUcsSUFBSSxHQUFHLEVBQThCLENBQUM7WUFFbkQsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUMvRCxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFpQjNDLENBQUM7UUFFRCxzQkFBSSw0Q0FBZ0I7aUJBQXBCLGNBQXFF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QUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3hFLE9BQU8sV0FBVyxDQUFDO2FBQ3BCO1lBQ0QsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFHLENBQUM7WUFDakQsSUFBTSxVQUFVLEdBQW1CLEVBQUUsQ0FBQzs7Z0JBRXRDLEtBQW9CLElBQUEsS0FBQSxpQkFBQSxRQUFRLENBQUMsZUFBZSxDQUFBLGdCQUFBLDRCQUFFO29CQUF6QyxJQUFNLEtBQUssV0FBQTtvQkFDZCxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssSUFBSSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxLQUFLLFNBQVMsRUFBRTt3QkFDcEUsU0FBUztxQkFDVjtvQkFDRCxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxLQUFLLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQzdFLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDekM7aUJBQ0Y7Ozs7Ozs7OztZQUVELE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxzQkFBSSx1Q0FBVztpQkFBZixjQUFrRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUMvRSxxQkFBQztJQUFELENBQUMsQUF2WEQsSUF1WEM7SUF2WFksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBUeXBlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW5jcmVtZW50YWxEcml2ZXJ9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuLi8uLi9pbmRleGVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXJ9IGZyb20gJy4uLy4uL21vZHVsZXdpdGhwcm92aWRlcnMnO1xuaW1wb3J0IHtQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgaXNOYW1lZENsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnl9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNFeHBvcnRlZH0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RHRzVHJhbnNmb3JtUmVnaXN0cnl9IGZyb20gJy4vZGVjbGFyYXRpb24nO1xuXG5jb25zdCBFTVBUWV9BUlJBWTogYW55ID0gW107XG5cbi8qKlxuICogUmVjb3JkIG9mIGFuIGFkYXB0ZXIgd2hpY2ggZGVjaWRlZCB0byBlbWl0IGEgc3RhdGljIGZpZWxkLCBhbmQgdGhlIGFuYWx5c2lzIGl0IHBlcmZvcm1lZCB0b1xuICogcHJlcGFyZSBmb3IgdGhhdCBvcGVyYXRpb24uXG4gKi9cbmludGVyZmFjZSBNYXRjaGVkSGFuZGxlcjxBLCBNPiB7XG4gIGhhbmRsZXI6IERlY29yYXRvckhhbmRsZXI8QSwgTT47XG4gIGFuYWx5emVkOiBBbmFseXNpc091dHB1dDxBPnxudWxsO1xuICBkZXRlY3RlZDogRGV0ZWN0UmVzdWx0PE0+O1xufVxuXG5pbnRlcmZhY2UgSXZ5Q2xhc3Mge1xuICBtYXRjaGVkSGFuZGxlcnM6IE1hdGNoZWRIYW5kbGVyPGFueSwgYW55PltdO1xuXG4gIGhhc1dlYWtIYW5kbGVyczogYm9vbGVhbjtcbiAgaGFzUHJpbWFyeUhhbmRsZXI6IGJvb2xlYW47XG59XG5cbi8qKlxuICogTWFuYWdlcyBhIGNvbXBpbGF0aW9uIG9mIEl2eSBkZWNvcmF0b3JzIGludG8gc3RhdGljIGZpZWxkcyBhY3Jvc3MgYW4gZW50aXJlIHRzLlByb2dyYW0uXG4gKlxuICogVGhlIGNvbXBpbGF0aW9uIGlzIHN0YXRlZnVsIC0gc291cmNlIGZpbGVzIGFyZSBhbmFseXplZCBhbmQgcmVjb3JkcyBvZiB0aGUgb3BlcmF0aW9ucyB0aGF0IG5lZWRcbiAqIHRvIGJlIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHRyYW5zZm9ybS9lbWl0IHByb2Nlc3MgYXJlIG1haW50YWluZWQgaW50ZXJuYWxseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEl2eUNvbXBpbGF0aW9uIHtcbiAgLyoqXG4gICAqIFRyYWNrcyBjbGFzc2VzIHdoaWNoIGhhdmUgYmVlbiBhbmFseXplZCBhbmQgZm91bmQgdG8gaGF2ZSBhbiBJdnkgZGVjb3JhdG9yLCBhbmQgdGhlXG4gICAqIGluZm9ybWF0aW9uIHJlY29yZGVkIGFib3V0IHRoZW0gZm9yIGxhdGVyIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBpdnlDbGFzc2VzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBJdnlDbGFzcz4oKTtcblxuICBwcml2YXRlIHJlZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+PigpO1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgLyoqXG4gICAqIEBwYXJhbSBoYW5kbGVycyBhcnJheSBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWQgYWdhaW5zdCBlYWNoIGNsYXNzIGluIHRoZVxuICAgKiBwcm9ncmFtXG4gICAqIEBwYXJhbSBjaGVja2VyIFR5cGVTY3JpcHQgYFR5cGVDaGVja2VyYCBpbnN0YW5jZSBmb3IgdGhlIHByb2dyYW1cbiAgICogQHBhcmFtIHJlZmxlY3RvciBgUmVmbGVjdGlvbkhvc3RgIHRocm91Z2ggd2hpY2ggYWxsIHJlZmxlY3Rpb24gb3BlcmF0aW9ucyB3aWxsIGJlIHBlcmZvcm1lZFxuICAgKiBAcGFyYW0gY29yZUltcG9ydHNGcm9tIGEgVHlwZVNjcmlwdCBgU291cmNlRmlsZWAgd2hpY2ggZXhwb3J0cyBzeW1ib2xzIG5lZWRlZCBmb3IgSXZ5IGltcG9ydHNcbiAgICogd2hlbiBjb21waWxpbmcgQGFuZ3VsYXIvY29yZSwgb3IgYG51bGxgIGlmIHRoZSBjdXJyZW50IHByb2dyYW0gaXMgbm90IEBhbmd1bGFyL2NvcmUuIFRoaXMgaXNcbiAgICogYG51bGxgIGluIG1vc3QgY2FzZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10sIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLCBwcml2YXRlIGluY3JlbWVudGFsRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlcixcbiAgICAgIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLCBwcml2YXRlIHNvdXJjZVRvRmFjdG9yeVN5bWJvbHM6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PnxudWxsLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIHByaXZhdGUgY29tcGlsZU5vbkV4cG9ydGVkQ2xhc3NlczogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgZHRzVHJhbnNmb3JtczogRHRzVHJhbnNmb3JtUmVnaXN0cnksIHByaXZhdGUgbXdwU2Nhbm5lcjogTW9kdWxlV2l0aFByb3ZpZGVyc1NjYW5uZXIpIHtcbiAgfVxuXG4gIGdldCBleHBvcnRTdGF0ZW1lbnRzKCk6IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+PiB7IHJldHVybiB0aGlzLnJlZXhwb3J0TWFwOyB9XG5cbiAgYW5hbHl6ZVN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgZmFsc2UpOyB9XG5cbiAgYW5hbHl6ZUFzeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCB0cnVlKTsgfVxuXG4gIHByaXZhdGUgZGV0ZWN0SGFuZGxlcnNGb3JDbGFzcyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogSXZ5Q2xhc3N8bnVsbCB7XG4gICAgaWYgKCF0aGlzLmNvbXBpbGVOb25FeHBvcnRlZENsYXNzZXMgJiYgIWlzRXhwb3J0ZWQobm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFRoZSBmaXJzdCBzdGVwIGlzIHRvIHJlZmxlY3QgdGhlIGRlY29yYXRvcnMuXG4gICAgY29uc3QgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG4gICAgbGV0IGl2eUNsYXNzOiBJdnlDbGFzc3xudWxsID0gbnVsbDtcblxuICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgRGVjb3JhdG9ySGFuZGxlcnMgdG8gc2VlIGlmIGFueSBhcmUgcmVsZXZhbnQuXG4gICAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHRoaXMuaGFuZGxlcnMpIHtcbiAgICAgIC8vIEFuIGFkYXB0ZXIgaXMgcmVsZXZhbnQgaWYgaXQgbWF0Y2hlcyBvbmUgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgICAgY29uc3QgZGV0ZWN0ZWQgPSBoYW5kbGVyLmRldGVjdChub2RlLCBjbGFzc0RlY29yYXRvcnMpO1xuICAgICAgaWYgKGRldGVjdGVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVGhpcyBoYW5kbGVyIGRpZG4ndCBtYXRjaC5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGlzUHJpbWFyeUhhbmRsZXIgPSBoYW5kbGVyLnByZWNlZGVuY2UgPT09IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gICAgICBjb25zdCBpc1dlYWtIYW5kbGVyID0gaGFuZGxlci5wcmVjZWRlbmNlID09PSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuICAgICAgY29uc3QgbWF0Y2ggPSB7XG4gICAgICAgIGhhbmRsZXIsXG4gICAgICAgIGFuYWx5emVkOiBudWxsLCBkZXRlY3RlZCxcbiAgICAgIH07XG5cbiAgICAgIGlmIChpdnlDbGFzcyA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCBoYW5kbGVyIHRvIG1hdGNoIHRoaXMgY2xhc3MuIFRoaXMgcGF0aCBpcyBhIGZhc3QgcGF0aCB0aHJvdWdoIHdoaWNoXG4gICAgICAgIC8vIG1vc3QgY2xhc3NlcyB3aWxsIGZsb3cuXG4gICAgICAgIGl2eUNsYXNzID0ge1xuICAgICAgICAgIG1hdGNoZWRIYW5kbGVyczogW21hdGNoXSxcbiAgICAgICAgICBoYXNQcmltYXJ5SGFuZGxlcjogaXNQcmltYXJ5SGFuZGxlcixcbiAgICAgICAgICBoYXNXZWFrSGFuZGxlcnM6IGlzV2Vha0hhbmRsZXIsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaXZ5Q2xhc3Nlcy5zZXQobm9kZSwgaXZ5Q2xhc3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhdCBsZWFzdCB0aGUgc2Vjb25kIGhhbmRsZXIgdG8gbWF0Y2ggdGhpcyBjbGFzcy4gVGhpcyBpcyBhIHNsb3dlciBwYXRoIHRoYXQgc29tZVxuICAgICAgICAvLyBjbGFzc2VzIHdpbGwgZ28gdGhyb3VnaCwgd2hpY2ggdmFsaWRhdGVzIHRoYXQgdGhlIHNldCBvZiBkZWNvcmF0b3JzIGFwcGxpZWQgdG8gdGhlIGNsYXNzXG4gICAgICAgIC8vIGlzIHZhbGlkLlxuXG4gICAgICAgIC8vIFZhbGlkYXRlIGFjY29yZGluZyB0byBydWxlcyBhcyBmb2xsb3dzOlxuICAgICAgICAvL1xuICAgICAgICAvLyAqIFdFQUsgaGFuZGxlcnMgYXJlIHJlbW92ZWQgaWYgYSBub24tV0VBSyBoYW5kbGVyIG1hdGNoZXMuXG4gICAgICAgIC8vICogT25seSBvbmUgUFJJTUFSWSBoYW5kbGVyIGNhbiBtYXRjaCBhdCBhIHRpbWUuIEFueSBvdGhlciBQUklNQVJZIGhhbmRsZXIgbWF0Y2hpbmcgYVxuICAgICAgICAvLyAgIGNsYXNzIHdpdGggYW4gZXhpc3RpbmcgUFJJTUFSWSBoYW5kbGVyIGlzIGFuIGVycm9yLlxuXG4gICAgICAgIGlmICghaXNXZWFrSGFuZGxlciAmJiBpdnlDbGFzcy5oYXNXZWFrSGFuZGxlcnMpIHtcbiAgICAgICAgICAvLyBUaGUgY3VycmVudCBoYW5kbGVyIGlzIG5vdCBhIFdFQUsgaGFuZGxlciwgYnV0IHRoZSBjbGFzcyBoYXMgb3RoZXIgV0VBSyBoYW5kbGVycy5cbiAgICAgICAgICAvLyBSZW1vdmUgdGhlbS5cbiAgICAgICAgICBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMgPSBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMuZmlsdGVyKFxuICAgICAgICAgICAgICBmaWVsZCA9PiBmaWVsZC5oYW5kbGVyLnByZWNlZGVuY2UgIT09IEhhbmRsZXJQcmVjZWRlbmNlLldFQUspO1xuICAgICAgICAgIGl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycyA9IGZhbHNlO1xuICAgICAgICB9IGVsc2UgaWYgKGlzV2Vha0hhbmRsZXIgJiYgIWl2eUNsYXNzLmhhc1dlYWtIYW5kbGVycykge1xuICAgICAgICAgIC8vIFRoZSBjdXJyZW50IGhhbmRsZXIgaXMgYSBXRUFLIGhhbmRsZXIsIGJ1dCB0aGUgY2xhc3MgaGFzIG5vbi1XRUFLIGhhbmRsZXJzIGFscmVhZHkuXG4gICAgICAgICAgLy8gRHJvcCB0aGUgY3VycmVudCBvbmUuXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNQcmltYXJ5SGFuZGxlciAmJiBpdnlDbGFzcy5oYXNQcmltYXJ5SGFuZGxlcikge1xuICAgICAgICAgIC8vIFRoZSBjbGFzcyBhbHJlYWR5IGhhcyBhIFBSSU1BUlkgaGFuZGxlciwgYW5kIGFub3RoZXIgb25lIGp1c3QgbWF0Y2hlZC5cbiAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKHtcbiAgICAgICAgICAgIGNhdGVnb3J5OiB0cy5EaWFnbm9zdGljQ2F0ZWdvcnkuRXJyb3IsXG4gICAgICAgICAgICBjb2RlOiBOdW1iZXIoJy05OScgKyBFcnJvckNvZGUuREVDT1JBVE9SX0NPTExJU0lPTiksXG4gICAgICAgICAgICBmaWxlOiBnZXRTb3VyY2VGaWxlKG5vZGUpLFxuICAgICAgICAgICAgc3RhcnQ6IG5vZGUuZ2V0U3RhcnQodW5kZWZpbmVkLCBmYWxzZSksXG4gICAgICAgICAgICBsZW5ndGg6IG5vZGUuZ2V0V2lkdGgoKSxcbiAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiAnVHdvIGluY29tcGF0aWJsZSBkZWNvcmF0b3JzIG9uIGNsYXNzJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLml2eUNsYXNzZXMuZGVsZXRlKG5vZGUpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHNhZmUgdG8gYWNjZXB0IHRoZSBtdWx0aXBsZSBkZWNvcmF0b3JzIGhlcmUuIFVwZGF0ZSBzb21lIG9mIHRoZSBtZXRhZGF0YVxuICAgICAgICAvLyByZWdhcmRpbmcgdGhpcyBjbGFzcy5cbiAgICAgICAgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzLnB1c2gobWF0Y2gpO1xuICAgICAgICBpdnlDbGFzcy5oYXNQcmltYXJ5SGFuZGxlciA9IGl2eUNsYXNzLmhhc1ByaW1hcnlIYW5kbGVyIHx8IGlzUHJpbWFyeUhhbmRsZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl2eUNsYXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBzb3VyY2UgZmlsZSBhbmQgcHJvZHVjZSBkaWFnbm9zdGljcyBmb3IgaXQgKGlmIGFueSkuXG4gICAqL1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgICBjb25zdCBhbmFseXplQ2xhc3MgPSAobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQgPT4ge1xuICAgICAgY29uc3QgaXZ5Q2xhc3MgPSB0aGlzLmRldGVjdEhhbmRsZXJzRm9yQ2xhc3Mobm9kZSk7XG5cbiAgICAgIC8vIElmIHRoZSBjbGFzcyBoYXMgbm8gSXZ5IGJlaGF2aW9yIChvciBoYWQgZXJyb3JzKSwgc2tpcCBpdC5cbiAgICAgIGlmIChpdnlDbGFzcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIExvb3AgdGhyb3VnaCBlYWNoIG1hdGNoZWQgaGFuZGxlciB0aGF0IG5lZWRzIHRvIGJlIGFuYWx5emVkIGFuZCBhbmFseXplIGl0LCBlaXRoZXJcbiAgICAgIC8vIHN5bmNocm9ub3VzbHkgb3IgYXN5bmNocm9ub3VzbHkuXG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICAvLyBUaGUgYW5hbHl6ZSgpIGZ1bmN0aW9uIHdpbGwgcnVuIHRoZSBhbmFseXNpcyBwaGFzZSBvZiB0aGUgaGFuZGxlci5cbiAgICAgICAgY29uc3QgYW5hbHl6ZSA9ICgpID0+IHtcbiAgICAgICAgICBjb25zdCBhbmFseXplQ2xhc3NTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdhbmFseXplQ2xhc3MnLCBub2RlKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgbWF0Y2guYW5hbHl6ZWQgPSBtYXRjaC5oYW5kbGVyLmFuYWx5emUobm9kZSwgbWF0Y2guZGV0ZWN0ZWQubWV0YWRhdGEpO1xuXG4gICAgICAgICAgICBpZiAobWF0Y2guYW5hbHl6ZWQuZGlhZ25vc3RpY3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKC4uLm1hdGNoLmFuYWx5emVkLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1hdGNoLmFuYWx5emVkLmZhY3RvcnlTeW1ib2xOYW1lICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuZ2V0KHNmLmZpbGVOYW1lKSAhLmFkZChtYXRjaC5hbmFseXplZC5mYWN0b3J5U3ltYm9sTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChlcnIudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB0aGlzLnBlcmYuc3RvcChhbmFseXplQ2xhc3NTcGFuKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSWYgcHJlYW5hbHlzaXMgd2FzIHJlcXVlc3RlZCBhbmQgYSBwcmVhbmFseXNpcyBzdGVwIGV4aXN0cywgdGhlbiBydW4gcHJlYW5hbHlzaXMuXG4gICAgICAgIC8vIE90aGVyd2lzZSwgc2tpcCBkaXJlY3RseSB0byBhbmFseXNpcy5cbiAgICAgICAgaWYgKHByZWFuYWx5emUgJiYgbWF0Y2guaGFuZGxlci5wcmVhbmFseXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBQcmVhbmFseXNpcyBtaWdodCByZXR1cm4gYSBQcm9taXNlLCBpbmRpY2F0aW5nIGFuIGFzeW5jIG9wZXJhdGlvbiB3YXMgbmVjZXNzYXJ5LiBPciBpdFxuICAgICAgICAgIC8vIG1pZ2h0IHJldHVybiB1bmRlZmluZWQsIGluZGljYXRpbmcgbm8gYXN5bmMgc3RlcCB3YXMgbmVlZGVkIGFuZCBhbmFseXNpcyBjYW4gcHJvY2VlZFxuICAgICAgICAgIC8vIGltbWVkaWF0ZWx5LlxuICAgICAgICAgIGNvbnN0IHByZWFuYWx5c2lzID0gbWF0Y2guaGFuZGxlci5wcmVhbmFseXplKG5vZGUsIG1hdGNoLmRldGVjdGVkLm1ldGFkYXRhKTtcbiAgICAgICAgICBpZiAocHJlYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gQXdhaXQgdGhlIHJlc3VsdHMgb2YgcHJlYW5hbHlzaXMgYmVmb3JlIHJ1bm5pbmcgYW5hbHlzaXMuXG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHByZWFuYWx5c2lzLnRoZW4oYW5hbHl6ZSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBhc3luYyBwcmVhbmFseXNpcyBuZWVkZWQsIHNraXAgZGlyZWN0bHkgdG8gYW5hbHlzaXMuXG4gICAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vdCBpbiBwcmVhbmFseXNpcyBtb2RlIG9yIG5vdCBuZWVkZWQgZm9yIHRoaXMgaGFuZGxlciwgc2tpcCBkaXJlY3RseSB0byBhbmFseXNpcy5cbiAgICAgICAgICBhbmFseXplKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgdmlzaXQgPSAobm9kZTogdHMuTm9kZSk6IHZvaWQgPT4ge1xuICAgICAgLy8gUHJvY2VzcyBub2RlcyByZWN1cnNpdmVseSwgYW5kIGxvb2sgZm9yIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIGRlY29yYXRvcnMuXG4gICAgICBpZiAoaXNOYW1lZENsYXNzRGVjbGFyYXRpb24obm9kZSkpIHtcbiAgICAgICAgYW5hbHl6ZUNsYXNzKG5vZGUpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuXG4gICAgdGhpcy5td3BTY2FubmVyLnNjYW4oc2YsIHtcbiAgICAgIGFkZFR5cGVSZXBsYWNlbWVudDogKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiBUeXBlKTogdm9pZCA9PiB7XG4gICAgICAgIC8vIE9ubHkgb2J0YWluIHRoZSByZXR1cm4gdHlwZSB0cmFuc2Zvcm0gZm9yIHRoZSBzb3VyY2UgZmlsZSBvbmNlIHRoZXJlJ3MgYSB0eXBlIHRvIHJlcGxhY2UsXG4gICAgICAgIC8vIHNvIHRoYXQgbm8gdHJhbnNmb3JtIGlzIGFsbG9jYXRlZCB3aGVuIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICAgICAgdGhpcy5kdHNUcmFuc2Zvcm1zLmdldFJldHVyblR5cGVUcmFuc2Zvcm0oc2YpLmFkZFR5cGVSZXBsYWNlbWVudChub2RlLCB0eXBlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGZWVkcyBjb21wb25lbnRzIGRpc2NvdmVyZWQgaW4gdGhlIGNvbXBpbGF0aW9uIHRvIGEgY29udGV4dCBmb3IgaW5kZXhpbmcuXG4gICAqL1xuICBpbmRleChjb250ZXh0OiBJbmRleGluZ0NvbnRleHQpIHtcbiAgICB0aGlzLml2eUNsYXNzZXMuZm9yRWFjaCgoaXZ5Q2xhc3MsIGRlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5pbmRleCAhPT0gdW5kZWZpbmVkICYmIG1hdGNoLmFuYWx5emVkICE9PSBudWxsICYmXG4gICAgICAgICAgICBtYXRjaC5hbmFseXplZC5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5pbmRleChjb250ZXh0LCBkZWNsYXJhdGlvbiwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIGNvbnN0IHJlc29sdmVTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlJyk7XG4gICAgdGhpcy5pdnlDbGFzc2VzLmZvckVhY2goKGl2eUNsYXNzLCBub2RlKSA9PiB7XG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGl2eUNsYXNzLm1hdGNoZWRIYW5kbGVycykge1xuICAgICAgICBpZiAobWF0Y2guaGFuZGxlci5yZXNvbHZlICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlQ2xhc3NTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZXNvbHZlQ2xhc3MnLCBub2RlKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzID0gbWF0Y2guaGFuZGxlci5yZXNvbHZlKG5vZGUsIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzKTtcbiAgICAgICAgICAgIGlmIChyZXMucmVleHBvcnRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgICAgICAgICAgaWYgKCF0aGlzLnJlZXhwb3J0TWFwLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnJlZXhwb3J0TWFwLnNldChmaWxlTmFtZSwgbmV3IE1hcDxzdHJpbmcsIFtzdHJpbmcsIHN0cmluZ10+KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGZpbGVSZWV4cG9ydHMgPSB0aGlzLnJlZXhwb3J0TWFwLmdldChmaWxlTmFtZSkgITtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCByZWV4cG9ydCBvZiByZXMucmVleHBvcnRzKSB7XG4gICAgICAgICAgICAgICAgZmlsZVJlZXhwb3J0cy5zZXQocmVleHBvcnQuYXNBbGlhcywgW3JlZXhwb3J0LmZyb21Nb2R1bGUsIHJlZXhwb3J0LnN5bWJvbE5hbWVdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4ucmVzLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGVyci50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVDbGFzc1NwYW4pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMucGVyZi5zdG9wKHJlc29sdmVTcGFuKTtcbiAgICB0aGlzLnJlY29yZE5nTW9kdWxlU2NvcGVEZXBlbmRlbmNpZXMoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkTmdNb2R1bGVTY29wZURlcGVuZGVuY2llcygpIHtcbiAgICBjb25zdCByZWNvcmRTcGFuID0gdGhpcy5wZXJmLnN0YXJ0KCdyZWNvcmREZXBlbmRlbmNpZXMnKTtcbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkgIS5nZXRDb21waWxhdGlvblNjb3BlcygpLmZvckVhY2goc2NvcGUgPT4ge1xuICAgICAgY29uc3QgZmlsZSA9IHNjb3BlLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlRmlsZSA9IHNjb3BlLm5nTW9kdWxlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgICAgLy8gQSBjaGFuZ2UgdG8gYW55IGRlcGVuZGVuY3kgb2YgdGhlIGRlY2xhcmF0aW9uIGNhdXNlcyB0aGUgZGVjbGFyYXRpb24gdG8gYmUgaW52YWxpZGF0ZWQsXG4gICAgICAvLyB3aGljaCByZXF1aXJlcyB0aGUgTmdNb2R1bGUgdG8gYmUgaW52YWxpZGF0ZWQgYXMgd2VsbC5cbiAgICAgIGNvbnN0IGRlcHMgPSB0aGlzLmluY3JlbWVudGFsRHJpdmVyLmdldEZpbGVEZXBlbmRlbmNpZXMoZmlsZSk7XG4gICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY2llcyhkZXBzLCBuZ01vZHVsZUZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byB0aGUgTmdNb2R1bGUgZmlsZSBzaG91bGQgY2F1c2UgdGhlIGRlY2xhcmF0aW9uIGl0c2VsZiB0byBiZSBpbnZhbGlkYXRlZC5cbiAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIudHJhY2tGaWxlRGVwZW5kZW5jeShuZ01vZHVsZUZpbGUsIGZpbGUpO1xuXG4gICAgICAvLyBBIGNoYW5nZSB0byBhbnkgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIHNob3VsZCBjYXVzZSB0aGUgZGVjbGFyYXRpb24gdG8gYmVcbiAgICAgIC8vIGludmFsaWRhdGVkLlxuICAgICAgc2NvcGUuZGlyZWN0aXZlcy5mb3JFYWNoKGRpcmVjdGl2ZSA9PiB7XG4gICAgICAgIGNvbnN0IGRpclNmID0gZGlyZWN0aXZlLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgICAgICAvLyBXaGVuIGEgZGlyZWN0aXZlIGluIHNjb3BlIGlzIHVwZGF0ZWQsIHRoZSBkZWNsYXJhdGlvbiBuZWVkcyB0byBiZSByZWNvbXBpbGVkIGFzIGUuZy5cbiAgICAgICAgLy8gYSBzZWxlY3RvciBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY3koZGlyU2YsIGZpbGUpO1xuXG4gICAgICAgIC8vIFdoZW4gYW55IG9mIHRoZSBkZXBlbmRlbmNpZXMgb2YgdGhlIGRlY2xhcmF0aW9uIGNoYW5nZXMsIHRoZSBOZ01vZHVsZSBzY29wZSBtYXkgYmVcbiAgICAgICAgLy8gYWZmZWN0ZWQgc28gYSBjb21wb25lbnQgd2l0aGluIHNjb3BlIG11c3QgYmUgcmVjb21waWxlZC4gT25seSBjb21wb25lbnRzIG5lZWQgdG8gYmVcbiAgICAgICAgLy8gcmVjb21waWxlZCwgYXMgZGlyZWN0aXZlcyBhcmUgbm90IGRlcGVuZGVudCB1cG9uIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICAgICAgaWYgKGRpcmVjdGl2ZS5pc0NvbXBvbmVudCkge1xuICAgICAgICAgIHRoaXMuaW5jcmVtZW50YWxEcml2ZXIudHJhY2tGaWxlRGVwZW5kZW5jaWVzKGRlcHMsIGRpclNmKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBzY29wZS5waXBlcy5mb3JFYWNoKHBpcGUgPT4ge1xuICAgICAgICAvLyBXaGVuIGEgcGlwZSBpbiBzY29wZSBpcyB1cGRhdGVkLCB0aGUgZGVjbGFyYXRpb24gbmVlZHMgdG8gYmUgcmVjb21waWxlZCBhcyBlLmcuXG4gICAgICAgIC8vIHRoZSBwaXBlJ3MgbmFtZSBtYXkgaGF2ZSBjaGFuZ2VkLlxuICAgICAgICB0aGlzLmluY3JlbWVudGFsRHJpdmVyLnRyYWNrRmlsZURlcGVuZGVuY3kocGlwZS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCksIGZpbGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5wZXJmLnN0b3AocmVjb3JkU3Bhbik7XG4gIH1cblxuICB0eXBlQ2hlY2soY29udGV4dDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMuaXZ5Q2xhc3Nlcy5mb3JFYWNoKChpdnlDbGFzcywgbm9kZSkgPT4ge1xuICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpdnlDbGFzcy5tYXRjaGVkSGFuZGxlcnMpIHtcbiAgICAgICAgaWYgKG1hdGNoLmhhbmRsZXIudHlwZUNoZWNrICE9PSB1bmRlZmluZWQgJiYgbWF0Y2guYW5hbHl6ZWQgIT09IG51bGwgJiZcbiAgICAgICAgICAgIG1hdGNoLmFuYWx5emVkLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBtYXRjaC5oYW5kbGVyLnR5cGVDaGVjayhjb250ZXh0LCBub2RlLCBtYXRjaC5hbmFseXplZC5hbmFseXNpcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdfHVuZGVmaW5lZCB7XG4gICAgLy8gTG9vayB0byBzZWUgd2hldGhlciB0aGUgb3JpZ2luYWwgbm9kZSB3YXMgYW5hbHl6ZWQuIElmIG5vdCwgdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlO1xuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24ob3JpZ2luYWwpIHx8ICF0aGlzLml2eUNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBpdnlDbGFzcyA9IHRoaXMuaXZ5Q2xhc3Nlcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICBsZXQgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICBpZiAobWF0Y2guYW5hbHl6ZWQgPT09IG51bGwgfHwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29tcGlsZVNwYW4gPSB0aGlzLnBlcmYuc3RhcnQoJ2NvbXBpbGVDbGFzcycsIG9yaWdpbmFsKTtcbiAgICAgIGNvbnN0IGNvbXBpbGVNYXRjaFJlcyA9XG4gICAgICAgICAgbWF0Y2guaGFuZGxlci5jb21waWxlKG5vZGUgYXMgQ2xhc3NEZWNsYXJhdGlvbiwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgICB0aGlzLnBlcmYuc3RvcChjb21waWxlU3Bhbik7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShjb21waWxlTWF0Y2hSZXMpKSB7XG4gICAgICAgIGNvbXBpbGVNYXRjaFJlcy5mb3JFYWNoKHJlc3VsdCA9PiB7XG4gICAgICAgICAgaWYgKCFyZXMuc29tZShyID0+IHIubmFtZSA9PT0gcmVzdWx0Lm5hbWUpKSB7XG4gICAgICAgICAgICByZXMucHVzaChyZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKCFyZXMuc29tZShyZXN1bHQgPT4gcmVzdWx0Lm5hbWUgPT09IGNvbXBpbGVNYXRjaFJlcy5uYW1lKSkge1xuICAgICAgICByZXMucHVzaChjb21waWxlTWF0Y2hSZXMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYXQgbGVhc3Qgb25lIGZpZWxkIHdhc1xuICAgIC8vIGdlbmVyYXRlZCwgd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgdGhpcy5kdHNUcmFuc2Zvcm1zLmdldEl2eURlY2xhcmF0aW9uVHJhbnNmb3JtKG9yaWdpbmFsLmdldFNvdXJjZUZpbGUoKSlcbiAgICAgICAgLmFkZEZpZWxkcyhvcmlnaW5hbCwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZHMgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzLmxlbmd0aCA+IDAgPyByZXMgOiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIHRoZSBgdHMuRGVjb3JhdG9yYCB3aGljaCB0cmlnZ2VyZWQgdHJhbnNmb3JtYXRpb24gb2YgYSBwYXJ0aWN1bGFyIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgaXZ5RGVjb3JhdG9yc0Zvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IHRzLkRlY29yYXRvcltdIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZTtcblxuICAgIGlmICghaXNOYW1lZENsYXNzRGVjbGFyYXRpb24ob3JpZ2luYWwpIHx8ICF0aGlzLml2eUNsYXNzZXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIEVNUFRZX0FSUkFZO1xuICAgIH1cbiAgICBjb25zdCBpdnlDbGFzcyA9IHRoaXMuaXZ5Q2xhc3Nlcy5nZXQob3JpZ2luYWwpICE7XG4gICAgY29uc3QgZGVjb3JhdG9yczogdHMuRGVjb3JhdG9yW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaXZ5Q2xhc3MubWF0Y2hlZEhhbmRsZXJzKSB7XG4gICAgICBpZiAobWF0Y2guYW5hbHl6ZWQgPT09IG51bGwgfHwgbWF0Y2guYW5hbHl6ZWQuYW5hbHlzaXMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXRjaC5kZXRlY3RlZC50cmlnZ2VyICE9PSBudWxsICYmIHRzLmlzRGVjb3JhdG9yKG1hdGNoLmRldGVjdGVkLnRyaWdnZXIpKSB7XG4gICAgICAgIGRlY29yYXRvcnMucHVzaChtYXRjaC5kZXRlY3RlZC50cmlnZ2VyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVjb3JhdG9ycztcbiAgfVxuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHsgcmV0dXJuIHRoaXMuX2RpYWdub3N0aWNzOyB9XG59XG4iXX0=