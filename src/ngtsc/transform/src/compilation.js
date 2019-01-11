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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform/src/declaration"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
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
        function IvyCompilation(handlers, checker, reflector, importRewriter, sourceToFactorySymbols) {
            this.handlers = handlers;
            this.checker = checker;
            this.reflector = reflector;
            this.importRewriter = importRewriter;
            this.sourceToFactorySymbols = sourceToFactorySymbols;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.analysis = new Map();
            this.typeCheckMap = new Map();
            /**
             * Tracks factory information which needs to be generated.
             */
            /**
             * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
             */
            this.dtsMap = new Map();
            this._diagnostics = [];
        }
        IvyCompilation.prototype.analyzeSync = function (sf) { return this.analyze(sf, false); };
        IvyCompilation.prototype.analyzeAsync = function (sf) { return this.analyze(sf, true); };
        IvyCompilation.prototype.analyze = function (sf, preanalyze) {
            var _this = this;
            var promises = [];
            var analyzeClass = function (node) {
                // The first step is to reflect the decorators.
                var classDecorators = _this.reflector.getDecoratorsOfDeclaration(node);
                // Look through the DecoratorHandlers to see if any are relevant.
                _this.handlers.forEach(function (adapter) {
                    // An adapter is relevant if it matches one of the decorators on the class.
                    var metadata = adapter.detect(node, classDecorators);
                    if (metadata === undefined) {
                        return;
                    }
                    var completeAnalysis = function () {
                        var _a;
                        // Check for multiple decorators on the same node. Technically speaking this
                        // could be supported, but right now it's an error.
                        if (_this.analysis.has(node)) {
                            throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
                        }
                        // Run analysis on the metadata. This will produce either diagnostics, an
                        // analysis result, or both.
                        try {
                            var analysis = adapter.analyze(node, metadata);
                            if (analysis.analysis !== undefined) {
                                _this.analysis.set(node, {
                                    adapter: adapter,
                                    analysis: analysis.analysis,
                                    metadata: metadata,
                                });
                                if (!!analysis.typeCheck) {
                                    _this.typeCheckMap.set(node, adapter);
                                }
                            }
                            if (analysis.diagnostics !== undefined) {
                                (_a = _this._diagnostics).push.apply(_a, tslib_1.__spread(analysis.diagnostics));
                            }
                            if (analysis.factorySymbolName !== undefined && _this.sourceToFactorySymbols !== null &&
                                _this.sourceToFactorySymbols.has(sf.fileName)) {
                                _this.sourceToFactorySymbols.get(sf.fileName).add(analysis.factorySymbolName);
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
                    };
                    if (preanalyze && adapter.preanalyze !== undefined) {
                        var preanalysis = adapter.preanalyze(node, metadata);
                        if (preanalysis !== undefined) {
                            promises.push(preanalysis.then(function () { return completeAnalysis(); }));
                        }
                        else {
                            completeAnalysis();
                        }
                    }
                    else {
                        completeAnalysis();
                    }
                });
            };
            var visit = function (node) {
                // Process nodes recursively, and look for class declarations with decorators.
                if (ts.isClassDeclaration(node)) {
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
        IvyCompilation.prototype.typeCheck = function (context) {
            var _this = this;
            this.typeCheckMap.forEach(function (handler, node) {
                if (handler.typeCheck !== undefined) {
                    handler.typeCheck(context, node, _this.analysis.get(node).analysis);
                }
            });
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node, constantPool) {
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!this.analysis.has(original)) {
                return undefined;
            }
            var op = this.analysis.get(original);
            // Run the actual compilation, which generates an Expression for the Ivy field.
            var res = op.adapter.compile(node, op.analysis, constantPool);
            if (!Array.isArray(res)) {
                res = [res];
            }
            // Look up the .d.ts transformer for the input file and record that a field was generated,
            // which will allow the .d.ts to be transformed later.
            var fileName = original.getSourceFile().fileName;
            var dtsTransformer = this.getDtsTransformer(fileName);
            dtsTransformer.recordStaticField(reflection_1.reflectNameOfDeclaration(node), res);
            // Return the instruction to the transformer so the field will be added.
            return res;
        };
        /**
         * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
         */
        IvyCompilation.prototype.ivyDecoratorFor = function (node) {
            var original = ts.getOriginalNode(node);
            if (!this.analysis.has(original)) {
                return undefined;
            }
            return this.analysis.get(original).metadata;
        };
        /**
         * Process a .d.ts source string and return a transformed version that incorporates the changes
         * made to the source file.
         */
        IvyCompilation.prototype.transformedDtsFor = function (tsFileName, dtsOriginalSource) {
            // No need to transform if no changes have been requested to the input file.
            if (!this.dtsMap.has(tsFileName)) {
                return dtsOriginalSource;
            }
            // Return the transformed .d.ts source.
            return this.dtsMap.get(tsFileName).transform(dtsOriginalSource, tsFileName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUF1RDtJQUV2RCx5RUFBcUY7SUFJckYseUZBQWlEO0lBY2pEOzs7OztPQUtHO0lBQ0g7UUFtQkU7Ozs7Ozs7O1dBUUc7UUFDSCx3QkFDWSxRQUFzQyxFQUFVLE9BQXVCLEVBQ3ZFLFNBQXlCLEVBQVUsY0FBOEIsRUFDakUsc0JBQXFEO1lBRnJELGFBQVEsR0FBUixRQUFRLENBQThCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDdkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7WUFDakUsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUErQjtZQTlCakU7OztlQUdHO1lBQ0ssYUFBUSxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1lBQ25FLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFFN0U7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvQyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFleUIsQ0FBQztRQUdyRSxvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxxQ0FBWSxHQUFaLFVBQWEsRUFBaUIsSUFBNkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFPbkYsZ0NBQU8sR0FBZixVQUFnQixFQUFpQixF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QUM1RSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8saUJBQWlCLENBQUM7YUFDMUI7WUFFRCx1Q0FBdUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELHNCQUFJLHVDQUFXO2lCQUFmLGNBQWtELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXJFLDBDQUFpQixHQUF6QixVQUEwQixVQUFrQjtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLGdDQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO2FBQzFFO1lBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQztRQUN2QyxDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBdE1ELElBc01DO0lBdE1ZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0TmFtZU9mRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtUeXBlQ2hlY2tDb250ZXh0fSBmcm9tICcuLi8uLi90eXBlY2hlY2snO1xuXG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0R0c0ZpbGVUcmFuc2Zvcm1lcn0gZnJvbSAnLi9kZWNsYXJhdGlvbic7XG5cblxuXG4vKipcbiAqIFJlY29yZCBvZiBhbiBhZGFwdGVyIHdoaWNoIGRlY2lkZWQgdG8gZW1pdCBhIHN0YXRpYyBmaWVsZCwgYW5kIHRoZSBhbmFseXNpcyBpdCBwZXJmb3JtZWQgdG9cbiAqIHByZXBhcmUgZm9yIHRoYXQgb3BlcmF0aW9uLlxuICovXG5pbnRlcmZhY2UgRW1pdEZpZWxkT3BlcmF0aW9uPEEsIE0+IHtcbiAgYWRhcHRlcjogRGVjb3JhdG9ySGFuZGxlcjxBLCBNPjtcbiAgYW5hbHlzaXM6IEFuYWx5c2lzT3V0cHV0PEE+O1xuICBtZXRhZGF0YTogTTtcbn1cblxuLyoqXG4gKiBNYW5hZ2VzIGEgY29tcGlsYXRpb24gb2YgSXZ5IGRlY29yYXRvcnMgaW50byBzdGF0aWMgZmllbGRzIGFjcm9zcyBhbiBlbnRpcmUgdHMuUHJvZ3JhbS5cbiAqXG4gKiBUaGUgY29tcGlsYXRpb24gaXMgc3RhdGVmdWwgLSBzb3VyY2UgZmlsZXMgYXJlIGFuYWx5emVkIGFuZCByZWNvcmRzIG9mIHRoZSBvcGVyYXRpb25zIHRoYXQgbmVlZFxuICogdG8gYmUgcGVyZm9ybWVkIGR1cmluZyB0aGUgdHJhbnNmb3JtL2VtaXQgcHJvY2VzcyBhcmUgbWFpbnRhaW5lZCBpbnRlcm5hbGx5LlxuICovXG5leHBvcnQgY2xhc3MgSXZ5Q29tcGlsYXRpb24ge1xuICAvKipcbiAgICogVHJhY2tzIGNsYXNzZXMgd2hpY2ggaGF2ZSBiZWVuIGFuYWx5emVkIGFuZCBmb3VuZCB0byBoYXZlIGFuIEl2eSBkZWNvcmF0b3IsIGFuZCB0aGVcbiAgICogaW5mb3JtYXRpb24gcmVjb3JkZWQgYWJvdXQgdGhlbSBmb3IgbGF0ZXIgY29tcGlsYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGFuYWx5c2lzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgRW1pdEZpZWxkT3BlcmF0aW9uPGFueSwgYW55Pj4oKTtcbiAgcHJpdmF0ZSB0eXBlQ2hlY2tNYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55Pj4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGZhY3RvcnkgaW5mb3JtYXRpb24gd2hpY2ggbmVlZHMgdG8gYmUgZ2VuZXJhdGVkLlxuICAgKi9cblxuICAvKipcbiAgICogVHJhY2tzIHRoZSBgRHRzRmlsZVRyYW5zZm9ybWVyYHMgZm9yIGVhY2ggVFMgZmlsZSB0aGF0IG5lZWRzIC5kLnRzIHRyYW5zZm9ybWF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgZHRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIER0c0ZpbGVUcmFuc2Zvcm1lcj4oKTtcbiAgcHJpdmF0ZSBfZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG5cbiAgLyoqXG4gICAqIEBwYXJhbSBoYW5kbGVycyBhcnJheSBvZiBgRGVjb3JhdG9ySGFuZGxlcmBzIHdoaWNoIHdpbGwgYmUgZXhlY3V0ZWQgYWdhaW5zdCBlYWNoIGNsYXNzIGluIHRoZVxuICAgKiBwcm9ncmFtXG4gICAqIEBwYXJhbSBjaGVja2VyIFR5cGVTY3JpcHQgYFR5cGVDaGVja2VyYCBpbnN0YW5jZSBmb3IgdGhlIHByb2dyYW1cbiAgICogQHBhcmFtIHJlZmxlY3RvciBgUmVmbGVjdGlvbkhvc3RgIHRocm91Z2ggd2hpY2ggYWxsIHJlZmxlY3Rpb24gb3BlcmF0aW9ucyB3aWxsIGJlIHBlcmZvcm1lZFxuICAgKiBAcGFyYW0gY29yZUltcG9ydHNGcm9tIGEgVHlwZVNjcmlwdCBgU291cmNlRmlsZWAgd2hpY2ggZXhwb3J0cyBzeW1ib2xzIG5lZWRlZCBmb3IgSXZ5IGltcG9ydHNcbiAgICogd2hlbiBjb21waWxpbmcgQGFuZ3VsYXIvY29yZSwgb3IgYG51bGxgIGlmIHRoZSBjdXJyZW50IHByb2dyYW0gaXMgbm90IEBhbmd1bGFyL2NvcmUuIFRoaXMgaXNcbiAgICogYG51bGxgIGluIG1vc3QgY2FzZXMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaGFuZGxlcnM6IERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+W10sIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgaW1wb3J0UmV3cml0ZXI6IEltcG9ydFJld3JpdGVyLFxuICAgICAgcHJpdmF0ZSBzb3VyY2VUb0ZhY3RvcnlTeW1ib2xzOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj58bnVsbCkge31cblxuXG4gIGFuYWx5emVTeW5jKHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIGZhbHNlKTsgfVxuXG4gIGFuYWx5emVBc3luYyhzZjogdHMuU291cmNlRmlsZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkIHsgcmV0dXJuIHRoaXMuYW5hbHl6ZShzZiwgdHJ1ZSk7IH1cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHNvdXJjZSBmaWxlIGFuZCBwcm9kdWNlIGRpYWdub3N0aWNzIGZvciBpdCAoaWYgYW55KS5cbiAgICovXG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogZmFsc2UpOiB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYW5hbHl6ZShzZjogdHMuU291cmNlRmlsZSwgcHJlYW5hbHl6ZTogdHJ1ZSk6IFByb21pc2U8dm9pZD58dW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7XG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgY29uc3QgYW5hbHl6ZUNsYXNzID0gKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogdm9pZCA9PiB7XG4gICAgICAvLyBUaGUgZmlyc3Qgc3RlcCBpcyB0byByZWZsZWN0IHRoZSBkZWNvcmF0b3JzLlxuICAgICAgY29uc3QgY2xhc3NEZWNvcmF0b3JzID0gdGhpcy5yZWZsZWN0b3IuZ2V0RGVjb3JhdG9yc09mRGVjbGFyYXRpb24obm9kZSk7XG5cbiAgICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgRGVjb3JhdG9ySGFuZGxlcnMgdG8gc2VlIGlmIGFueSBhcmUgcmVsZXZhbnQuXG4gICAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goYWRhcHRlciA9PiB7XG5cbiAgICAgICAgLy8gQW4gYWRhcHRlciBpcyByZWxldmFudCBpZiBpdCBtYXRjaGVzIG9uZSBvZiB0aGUgZGVjb3JhdG9ycyBvbiB0aGUgY2xhc3MuXG4gICAgICAgIGNvbnN0IG1ldGFkYXRhID0gYWRhcHRlci5kZXRlY3Qobm9kZSwgY2xhc3NEZWNvcmF0b3JzKTtcbiAgICAgICAgaWYgKG1ldGFkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb21wbGV0ZUFuYWx5c2lzID0gKCkgPT4ge1xuICAgICAgICAgIC8vIENoZWNrIGZvciBtdWx0aXBsZSBkZWNvcmF0b3JzIG9uIHRoZSBzYW1lIG5vZGUuIFRlY2huaWNhbGx5IHNwZWFraW5nIHRoaXNcbiAgICAgICAgICAvLyBjb3VsZCBiZSBzdXBwb3J0ZWQsIGJ1dCByaWdodCBub3cgaXQncyBhbiBlcnJvci5cbiAgICAgICAgICBpZiAodGhpcy5hbmFseXNpcy5oYXMobm9kZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVE9ETy5EaWFnbm9zdGljOiBDbGFzcyBoYXMgbXVsdGlwbGUgQW5ndWxhciBkZWNvcmF0b3JzLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFJ1biBhbmFseXNpcyBvbiB0aGUgbWV0YWRhdGEuIFRoaXMgd2lsbCBwcm9kdWNlIGVpdGhlciBkaWFnbm9zdGljcywgYW5cbiAgICAgICAgICAvLyBhbmFseXNpcyByZXN1bHQsIG9yIGJvdGguXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFuYWx5c2lzID0gYWRhcHRlci5hbmFseXplKG5vZGUsIG1ldGFkYXRhKTtcbiAgICAgICAgICAgIGlmIChhbmFseXNpcy5hbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuYW5hbHlzaXMuc2V0KG5vZGUsIHtcbiAgICAgICAgICAgICAgICBhZGFwdGVyLFxuICAgICAgICAgICAgICAgIGFuYWx5c2lzOiBhbmFseXNpcy5hbmFseXNpcyxcbiAgICAgICAgICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGEsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBpZiAoISFhbmFseXNpcy50eXBlQ2hlY2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGVDaGVja01hcC5zZXQobm9kZSwgYWRhcHRlcik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFuYWx5c2lzLmRpYWdub3N0aWNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaCguLi5hbmFseXNpcy5kaWFnbm9zdGljcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhbmFseXNpcy5mYWN0b3J5U3ltYm9sTmFtZSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scyAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAgICAgICAgIHRoaXMuc291cmNlVG9GYWN0b3J5U3ltYm9scy5nZXQoc2YuZmlsZU5hbWUpICEuYWRkKGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBGYXRhbERpYWdub3N0aWNFcnJvcikge1xuICAgICAgICAgICAgICB0aGlzLl9kaWFnbm9zdGljcy5wdXNoKGVyci50b0RpYWdub3N0aWMoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChwcmVhbmFseXplICYmIGFkYXB0ZXIucHJlYW5hbHl6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgcHJlYW5hbHlzaXMgPSBhZGFwdGVyLnByZWFuYWx5emUobm9kZSwgbWV0YWRhdGEpO1xuICAgICAgICAgIGlmIChwcmVhbmFseXNpcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHByZWFuYWx5c2lzLnRoZW4oKCkgPT4gY29tcGxldGVBbmFseXNpcygpKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXBsZXRlQW5hbHlzaXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29tcGxldGVBbmFseXNpcygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgdmlzaXQgPSAobm9kZTogdHMuTm9kZSk6IHZvaWQgPT4ge1xuICAgICAgLy8gUHJvY2VzcyBub2RlcyByZWN1cnNpdmVseSwgYW5kIGxvb2sgZm9yIGNsYXNzIGRlY2xhcmF0aW9ucyB3aXRoIGRlY29yYXRvcnMuXG4gICAgICBpZiAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUpKSB7XG4gICAgICAgIGFuYWx5emVDbGFzcyhub2RlKTtcbiAgICAgIH1cbiAgICAgIHRzLmZvckVhY2hDaGlsZChub2RlLCB2aXNpdCk7XG4gICAgfTtcblxuICAgIHZpc2l0KHNmKTtcblxuICAgIGlmIChwcmVhbmFseXplICYmIHByb21pc2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB1bmRlZmluZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIHR5cGVDaGVjayhjb250ZXh0OiBUeXBlQ2hlY2tDb250ZXh0KTogdm9pZCB7XG4gICAgdGhpcy50eXBlQ2hlY2tNYXAuZm9yRWFjaCgoaGFuZGxlciwgbm9kZSkgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIudHlwZUNoZWNrICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaGFuZGxlci50eXBlQ2hlY2soY29udGV4dCwgbm9kZSwgdGhpcy5hbmFseXNpcy5nZXQobm9kZSkgIS5hbmFseXNpcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUGVyZm9ybSBhIGNvbXBpbGF0aW9uIG9wZXJhdGlvbiBvbiB0aGUgZ2l2ZW4gY2xhc3MgZGVjbGFyYXRpb24gYW5kIHJldHVybiBpbnN0cnVjdGlvbnMgdG8gYW5cbiAgICogQVNUIHRyYW5zZm9ybWVyIGlmIGFueSBhcmUgYXZhaWxhYmxlLlxuICAgKi9cbiAgY29tcGlsZUl2eUZpZWxkRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCk6IENvbXBpbGVSZXN1bHRbXXx1bmRlZmluZWQge1xuICAgIC8vIExvb2sgdG8gc2VlIHdoZXRoZXIgdGhlIG9yaWdpbmFsIG5vZGUgd2FzIGFuYWx5emVkLiBJZiBub3QsIHRoZXJlJ3Mgbm90aGluZyB0byBkby5cbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qgb3AgPSB0aGlzLmFuYWx5c2lzLmdldChvcmlnaW5hbCkgITtcblxuICAgIC8vIFJ1biB0aGUgYWN0dWFsIGNvbXBpbGF0aW9uLCB3aGljaCBnZW5lcmF0ZXMgYW4gRXhwcmVzc2lvbiBmb3IgdGhlIEl2eSBmaWVsZC5cbiAgICBsZXQgcmVzOiBDb21waWxlUmVzdWx0fENvbXBpbGVSZXN1bHRbXSA9IG9wLmFkYXB0ZXIuY29tcGlsZShub2RlLCBvcC5hbmFseXNpcywgY29uc3RhbnRQb29sKTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzKSkge1xuICAgICAgcmVzID0gW3Jlc107XG4gICAgfVxuXG4gICAgLy8gTG9vayB1cCB0aGUgLmQudHMgdHJhbnNmb3JtZXIgZm9yIHRoZSBpbnB1dCBmaWxlIGFuZCByZWNvcmQgdGhhdCBhIGZpZWxkIHdhcyBnZW5lcmF0ZWQsXG4gICAgLy8gd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBvcmlnaW5hbC5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgY29uc3QgZHRzVHJhbnNmb3JtZXIgPSB0aGlzLmdldER0c1RyYW5zZm9ybWVyKGZpbGVOYW1lKTtcbiAgICBkdHNUcmFuc2Zvcm1lci5yZWNvcmRTdGF0aWNGaWVsZChyZWZsZWN0TmFtZU9mRGVjbGFyYXRpb24obm9kZSkgISwgcmVzKTtcblxuICAgIC8vIFJldHVybiB0aGUgaW5zdHJ1Y3Rpb24gdG8gdGhlIHRyYW5zZm9ybWVyIHNvIHRoZSBmaWVsZCB3aWxsIGJlIGFkZGVkLlxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICAvKipcbiAgICogTG9va3VwIHRoZSBgdHMuRGVjb3JhdG9yYCB3aGljaCB0cmlnZ2VyZWQgdHJhbnNmb3JtYXRpb24gb2YgYSBwYXJ0aWN1bGFyIGNsYXNzIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgaXZ5RGVjb3JhdG9yRm9yKG5vZGU6IHRzLkRlY2xhcmF0aW9uKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG4gICAgaWYgKCF0aGlzLmFuYWx5c2lzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuYW5hbHlzaXMuZ2V0KG9yaWdpbmFsKSAhLm1ldGFkYXRhO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSAuZC50cyBzb3VyY2Ugc3RyaW5nIGFuZCByZXR1cm4gYSB0cmFuc2Zvcm1lZCB2ZXJzaW9uIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSBjaGFuZ2VzXG4gICAqIG1hZGUgdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgdHJhbnNmb3JtZWREdHNGb3IodHNGaWxlTmFtZTogc3RyaW5nLCBkdHNPcmlnaW5hbFNvdXJjZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBObyBuZWVkIHRvIHRyYW5zZm9ybSBpZiBubyBjaGFuZ2VzIGhhdmUgYmVlbiByZXF1ZXN0ZWQgdG8gdGhlIGlucHV0IGZpbGUuXG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBkdHNPcmlnaW5hbFNvdXJjZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHRyYW5zZm9ybWVkIC5kLnRzIHNvdXJjZS5cbiAgICByZXR1cm4gdGhpcy5kdHNNYXAuZ2V0KHRzRmlsZU5hbWUpICEudHJhbnNmb3JtKGR0c09yaWdpbmFsU291cmNlLCB0c0ZpbGVOYW1lKTtcbiAgfVxuXG4gIGdldCBkaWFnbm9zdGljcygpOiBSZWFkb25seUFycmF5PHRzLkRpYWdub3N0aWM+IHsgcmV0dXJuIHRoaXMuX2RpYWdub3N0aWNzOyB9XG5cbiAgcHJpdmF0ZSBnZXREdHNUcmFuc2Zvcm1lcih0c0ZpbGVOYW1lOiBzdHJpbmcpOiBEdHNGaWxlVHJhbnNmb3JtZXIge1xuICAgIGlmICghdGhpcy5kdHNNYXAuaGFzKHRzRmlsZU5hbWUpKSB7XG4gICAgICB0aGlzLmR0c01hcC5zZXQodHNGaWxlTmFtZSwgbmV3IER0c0ZpbGVUcmFuc2Zvcm1lcih0aGlzLmltcG9ydFJld3JpdGVyKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgITtcbiAgfVxufVxuIl19