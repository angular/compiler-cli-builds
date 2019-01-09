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
        function IvyCompilation(handlers, checker, reflector, coreImportsFrom, sourceToFactorySymbols) {
            this.handlers = handlers;
            this.checker = checker;
            this.reflector = reflector;
            this.coreImportsFrom = coreImportsFrom;
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
                this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer(this.coreImportsFrom));
            }
            return this.dtsMap.get(tsFileName);
        };
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUF1RDtJQUN2RCx5RUFBcUY7SUFJckYseUZBQWlEO0lBYWpEOzs7OztPQUtHO0lBQ0g7UUFtQkU7Ozs7Ozs7O1dBUUc7UUFDSCx3QkFDWSxRQUFzQyxFQUFVLE9BQXVCLEVBQ3ZFLFNBQXlCLEVBQVUsZUFBbUMsRUFDdEUsc0JBQXFEO1lBRnJELGFBQVEsR0FBUixRQUFRLENBQThCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDdkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxvQkFBZSxHQUFmLGVBQWUsQ0FBb0I7WUFDdEUsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUErQjtZQTlCakU7OztlQUdHO1lBQ0ssYUFBUSxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1lBQ25FLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFFN0U7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvQyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFleUIsQ0FBQztRQUdyRSxvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxxQ0FBWSxHQUFaLFVBQWEsRUFBaUIsSUFBNkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFPbkYsZ0NBQU8sR0FBZixVQUFnQixFQUFpQixFQUFFLFVBQW1CO1lB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QUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8saUJBQWlCLENBQUM7YUFDMUI7WUFFRCx1Q0FBdUM7WUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELHNCQUFJLHVDQUFXO2lCQUFmLGNBQWtELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7OztXQUFBO1FBRXJFLDBDQUFpQixHQUF6QixVQUEwQixVQUFrQjtZQUMxQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxJQUFJLGdDQUFrQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2FBQzNFO1lBQ0QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUcsQ0FBQztRQUN2QyxDQUFDO1FBQ0gscUJBQUM7SUFBRCxDQUFDLEFBdE1ELElBc01DO0lBdE1ZLHdDQUFjIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NvbnN0YW50UG9vbH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcblxuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4vZGVjbGFyYXRpb24nO1xuXG5cbi8qKlxuICogUmVjb3JkIG9mIGFuIGFkYXB0ZXIgd2hpY2ggZGVjaWRlZCB0byBlbWl0IGEgc3RhdGljIGZpZWxkLCBhbmQgdGhlIGFuYWx5c2lzIGl0IHBlcmZvcm1lZCB0b1xuICogcHJlcGFyZSBmb3IgdGhhdCBvcGVyYXRpb24uXG4gKi9cbmludGVyZmFjZSBFbWl0RmllbGRPcGVyYXRpb248QSwgTT4ge1xuICBhZGFwdGVyOiBEZWNvcmF0b3JIYW5kbGVyPEEsIE0+O1xuICBhbmFseXNpczogQW5hbHlzaXNPdXRwdXQ8QT47XG4gIG1ldGFkYXRhOiBNO1xufVxuXG4vKipcbiAqIE1hbmFnZXMgYSBjb21waWxhdGlvbiBvZiBJdnkgZGVjb3JhdG9ycyBpbnRvIHN0YXRpYyBmaWVsZHMgYWNyb3NzIGFuIGVudGlyZSB0cy5Qcm9ncmFtLlxuICpcbiAqIFRoZSBjb21waWxhdGlvbiBpcyBzdGF0ZWZ1bCAtIHNvdXJjZSBmaWxlcyBhcmUgYW5hbHl6ZWQgYW5kIHJlY29yZHMgb2YgdGhlIG9wZXJhdGlvbnMgdGhhdCBuZWVkXG4gKiB0byBiZSBwZXJmb3JtZWQgZHVyaW5nIHRoZSB0cmFuc2Zvcm0vZW1pdCBwcm9jZXNzIGFyZSBtYWludGFpbmVkIGludGVybmFsbHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBJdnlDb21waWxhdGlvbiB7XG4gIC8qKlxuICAgKiBUcmFja3MgY2xhc3NlcyB3aGljaCBoYXZlIGJlZW4gYW5hbHl6ZWQgYW5kIGZvdW5kIHRvIGhhdmUgYW4gSXZ5IGRlY29yYXRvciwgYW5kIHRoZVxuICAgKiBpbmZvcm1hdGlvbiByZWNvcmRlZCBhYm91dCB0aGVtIGZvciBsYXRlciBjb21waWxhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgYW5hbHlzaXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBFbWl0RmllbGRPcGVyYXRpb248YW55LCBhbnk+PigpO1xuICBwcml2YXRlIHR5cGVDaGVja01hcCA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIERlY29yYXRvckhhbmRsZXI8YW55LCBhbnk+PigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgZmFjdG9yeSBpbmZvcm1hdGlvbiB3aGljaCBuZWVkcyB0byBiZSBnZW5lcmF0ZWQuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIGBEdHNGaWxlVHJhbnNmb3JtZXJgcyBmb3IgZWFjaCBUUyBmaWxlIHRoYXQgbmVlZHMgLmQudHMgdHJhbnNmb3JtYXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSBkdHNNYXAgPSBuZXcgTWFwPHN0cmluZywgRHRzRmlsZVRyYW5zZm9ybWVyPigpO1xuICBwcml2YXRlIF9kaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cblxuICAvKipcbiAgICogQHBhcmFtIGhhbmRsZXJzIGFycmF5IG9mIGBEZWNvcmF0b3JIYW5kbGVyYHMgd2hpY2ggd2lsbCBiZSBleGVjdXRlZCBhZ2FpbnN0IGVhY2ggY2xhc3MgaW4gdGhlXG4gICAqIHByb2dyYW1cbiAgICogQHBhcmFtIGNoZWNrZXIgVHlwZVNjcmlwdCBgVHlwZUNoZWNrZXJgIGluc3RhbmNlIGZvciB0aGUgcHJvZ3JhbVxuICAgKiBAcGFyYW0gcmVmbGVjdG9yIGBSZWZsZWN0aW9uSG9zdGAgdGhyb3VnaCB3aGljaCBhbGwgcmVmbGVjdGlvbiBvcGVyYXRpb25zIHdpbGwgYmUgcGVyZm9ybWVkXG4gICAqIEBwYXJhbSBjb3JlSW1wb3J0c0Zyb20gYSBUeXBlU2NyaXB0IGBTb3VyY2VGaWxlYCB3aGljaCBleHBvcnRzIHN5bWJvbHMgbmVlZGVkIGZvciBJdnkgaW1wb3J0c1xuICAgKiB3aGVuIGNvbXBpbGluZyBAYW5ndWxhci9jb3JlLCBvciBgbnVsbGAgaWYgdGhlIGN1cnJlbnQgcHJvZ3JhbSBpcyBub3QgQGFuZ3VsYXIvY29yZS4gVGhpcyBpc1xuICAgKiBgbnVsbGAgaW4gbW9zdCBjYXNlcy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBoYW5kbGVyczogRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT5bXSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBjb3JlSW1wb3J0c0Zyb206IHRzLlNvdXJjZUZpbGV8bnVsbCxcbiAgICAgIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwpIHt9XG5cblxuICBhbmFseXplU3luYyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCBmYWxzZSk7IH1cblxuICBhbmFseXplQXN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIHRydWUpOyB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBzb3VyY2UgZmlsZSBhbmQgcHJvZHVjZSBkaWFnbm9zdGljcyBmb3IgaXQgKGlmIGFueSkuXG4gICAqL1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcblxuICAgIGNvbnN0IGFuYWx5emVDbGFzcyA9IChub2RlOiB0cy5EZWNsYXJhdGlvbik6IHZvaWQgPT4ge1xuICAgICAgLy8gVGhlIGZpcnN0IHN0ZXAgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycy5cbiAgICAgIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIERlY29yYXRvckhhbmRsZXJzIHRvIHNlZSBpZiBhbnkgYXJlIHJlbGV2YW50LlxuICAgICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGFkYXB0ZXIgPT4ge1xuXG4gICAgICAgIC8vIEFuIGFkYXB0ZXIgaXMgcmVsZXZhbnQgaWYgaXQgbWF0Y2hlcyBvbmUgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IGFkYXB0ZXIuZGV0ZWN0KG5vZGUsIGNsYXNzRGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChtZXRhZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29tcGxldGVBbmFseXNpcyA9ICgpID0+IHtcbiAgICAgICAgICAvLyBDaGVjayBmb3IgbXVsdGlwbGUgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBub2RlLiBUZWNobmljYWxseSBzcGVha2luZyB0aGlzXG4gICAgICAgICAgLy8gY291bGQgYmUgc3VwcG9ydGVkLCBidXQgcmlnaHQgbm93IGl0J3MgYW4gZXJyb3IuXG4gICAgICAgICAgaWYgKHRoaXMuYW5hbHlzaXMuaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSdW4gYW5hbHlzaXMgb24gdGhlIG1ldGFkYXRhLiBUaGlzIHdpbGwgcHJvZHVjZSBlaXRoZXIgZGlhZ25vc3RpY3MsIGFuXG4gICAgICAgICAgLy8gYW5hbHlzaXMgcmVzdWx0LCBvciBib3RoLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFkYXB0ZXIuYW5hbHl6ZShub2RlLCBtZXRhZGF0YSk7XG4gICAgICAgICAgICBpZiAoYW5hbHlzaXMuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLmFuYWx5c2lzLnNldChub2RlLCB7XG4gICAgICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgICAgICBhbmFseXNpczogYW5hbHlzaXMuYW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaWYgKCEhYW5hbHlzaXMudHlwZUNoZWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50eXBlQ2hlY2tNYXAuc2V0KG5vZGUsIGFkYXB0ZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhbmFseXNpcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4uYW5hbHlzaXMuZGlhZ25vc3RpY3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYW5hbHlzaXMuZmFjdG9yeVN5bWJvbE5hbWUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuZ2V0KHNmLmZpbGVOYW1lKSAhLmFkZChhbmFseXNpcy5mYWN0b3J5U3ltYm9sTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChlcnIudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAocHJlYW5hbHl6ZSAmJiBhZGFwdGVyLnByZWFuYWx5emUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHByZWFuYWx5c2lzID0gYWRhcHRlci5wcmVhbmFseXplKG5vZGUsIG1ldGFkYXRhKTtcbiAgICAgICAgICBpZiAocHJlYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChwcmVhbmFseXNpcy50aGVuKCgpID0+IGNvbXBsZXRlQW5hbHlzaXMoKSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wbGV0ZUFuYWx5c2lzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbXBsZXRlQW5hbHlzaXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByb2Nlc3Mgbm9kZXMgcmVjdXJzaXZlbHksIGFuZCBsb29rIGZvciBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCBkZWNvcmF0b3JzLlxuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBhbmFseXplQ2xhc3Mobm9kZSk7XG4gICAgICB9XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgdmlzaXQpO1xuICAgIH07XG5cbiAgICB2aXNpdChzZik7XG5cbiAgICBpZiAocHJlYW5hbHl6ZSAmJiBwcm9taXNlcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICB0eXBlQ2hlY2soY29udGV4dDogVHlwZUNoZWNrQ29udGV4dCk6IHZvaWQge1xuICAgIHRoaXMudHlwZUNoZWNrTWFwLmZvckVhY2goKGhhbmRsZXIsIG5vZGUpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLnR5cGVDaGVjayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGhhbmRsZXIudHlwZUNoZWNrKGNvbnRleHQsIG5vZGUsIHRoaXMuYW5hbHlzaXMuZ2V0KG5vZGUpICEuYW5hbHlzaXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFBlcmZvcm0gYSBjb21waWxhdGlvbiBvcGVyYXRpb24gb24gdGhlIGdpdmVuIGNsYXNzIGRlY2xhcmF0aW9uIGFuZCByZXR1cm4gaW5zdHJ1Y3Rpb25zIHRvIGFuXG4gICAqIEFTVCB0cmFuc2Zvcm1lciBpZiBhbnkgYXJlIGF2YWlsYWJsZS5cbiAgICovXG4gIGNvbXBpbGVJdnlGaWVsZEZvcihub2RlOiB0cy5EZWNsYXJhdGlvbiwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wpOiBDb21waWxlUmVzdWx0W118dW5kZWZpbmVkIHtcbiAgICAvLyBMb29rIHRvIHNlZSB3aGV0aGVyIHRoZSBvcmlnaW5hbCBub2RlIHdhcyBhbmFseXplZC4gSWYgbm90LCB0aGVyZSdzIG5vdGhpbmcgdG8gZG8uXG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuRGVjbGFyYXRpb247XG4gICAgaWYgKCF0aGlzLmFuYWx5c2lzLmhhcyhvcmlnaW5hbCkpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IG9wID0gdGhpcy5hbmFseXNpcy5nZXQob3JpZ2luYWwpICE7XG5cbiAgICAvLyBSdW4gdGhlIGFjdHVhbCBjb21waWxhdGlvbiwgd2hpY2ggZ2VuZXJhdGVzIGFuIEV4cHJlc3Npb24gZm9yIHRoZSBJdnkgZmllbGQuXG4gICAgbGV0IHJlczogQ29tcGlsZVJlc3VsdHxDb21waWxlUmVzdWx0W10gPSBvcC5hZGFwdGVyLmNvbXBpbGUobm9kZSwgb3AuYW5hbHlzaXMsIGNvbnN0YW50UG9vbCk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlcykpIHtcbiAgICAgIHJlcyA9IFtyZXNdO1xuICAgIH1cblxuICAgIC8vIExvb2sgdXAgdGhlIC5kLnRzIHRyYW5zZm9ybWVyIGZvciB0aGUgaW5wdXQgZmlsZSBhbmQgcmVjb3JkIHRoYXQgYSBmaWVsZCB3YXMgZ2VuZXJhdGVkLFxuICAgIC8vIHdoaWNoIHdpbGwgYWxsb3cgdGhlIC5kLnRzIHRvIGJlIHRyYW5zZm9ybWVkIGxhdGVyLlxuICAgIGNvbnN0IGZpbGVOYW1lID0gb3JpZ2luYWwuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgIGNvbnN0IGR0c1RyYW5zZm9ybWVyID0gdGhpcy5nZXREdHNUcmFuc2Zvcm1lcihmaWxlTmFtZSk7XG4gICAgZHRzVHJhbnNmb3JtZXIucmVjb3JkU3RhdGljRmllbGQocmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9uKG5vZGUpICEsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGQgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgYHRzLkRlY29yYXRvcmAgd2hpY2ggdHJpZ2dlcmVkIHRyYW5zZm9ybWF0aW9uIG9mIGEgcGFydGljdWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGl2eURlY29yYXRvckZvcihub2RlOiB0cy5EZWNsYXJhdGlvbik6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy5hbmFseXNpcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmFuYWx5c2lzLmdldChvcmlnaW5hbCkgIS5tZXRhZGF0YTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzIGEgLmQudHMgc291cmNlIHN0cmluZyBhbmQgcmV0dXJuIGEgdHJhbnNmb3JtZWQgdmVyc2lvbiB0aGF0IGluY29ycG9yYXRlcyB0aGUgY2hhbmdlc1xuICAgKiBtYWRlIHRvIHRoZSBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHRyYW5zZm9ybWVkRHRzRm9yKHRzRmlsZU5hbWU6IHN0cmluZywgZHRzT3JpZ2luYWxTb3VyY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gTm8gbmVlZCB0byB0cmFuc2Zvcm0gaWYgbm8gY2hhbmdlcyBoYXZlIGJlZW4gcmVxdWVzdGVkIHRvIHRoZSBpbnB1dCBmaWxlLlxuICAgIGlmICghdGhpcy5kdHNNYXAuaGFzKHRzRmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gZHRzT3JpZ2luYWxTb3VyY2U7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRoZSB0cmFuc2Zvcm1lZCAuZC50cyBzb3VyY2UuXG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldCh0c0ZpbGVOYW1lKSAhLnRyYW5zZm9ybShkdHNPcmlnaW5hbFNvdXJjZSwgdHNGaWxlTmFtZSk7XG4gIH1cblxuICBnZXQgZGlhZ25vc3RpY3MoKTogUmVhZG9ubHlBcnJheTx0cy5EaWFnbm9zdGljPiB7IHJldHVybiB0aGlzLl9kaWFnbm9zdGljczsgfVxuXG4gIHByaXZhdGUgZ2V0RHRzVHJhbnNmb3JtZXIodHNGaWxlTmFtZTogc3RyaW5nKTogRHRzRmlsZVRyYW5zZm9ybWVyIHtcbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5kdHNNYXAuc2V0KHRzRmlsZU5hbWUsIG5ldyBEdHNGaWxlVHJhbnNmb3JtZXIodGhpcy5jb3JlSW1wb3J0c0Zyb20pKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldCh0c0ZpbGVOYW1lKSAhO1xuICB9XG59XG4iXX0=