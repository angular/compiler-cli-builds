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
        IvyCompilation.prototype.resolve = function () {
            this.analysis.forEach(function (op, decl) {
                if (op.adapter.resolve !== undefined) {
                    op.adapter.resolve(decl, op.analysis);
                }
            });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLDJFQUF1RDtJQUV2RCx5RUFBcUY7SUFJckYseUZBQWlEO0lBY2pEOzs7OztPQUtHO0lBQ0g7UUFtQkU7Ozs7Ozs7O1dBUUc7UUFDSCx3QkFDWSxRQUFzQyxFQUFVLE9BQXVCLEVBQ3ZFLFNBQXlCLEVBQVUsY0FBOEIsRUFDakUsc0JBQXFEO1lBRnJELGFBQVEsR0FBUixRQUFRLENBQThCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFDdkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7WUFDakUsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUErQjtZQTlCakU7OztlQUdHO1lBQ0ssYUFBUSxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1lBQ25FLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQThDLENBQUM7WUFFN0U7O2VBRUc7WUFFSDs7ZUFFRztZQUNLLFdBQU0sR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvQyxpQkFBWSxHQUFvQixFQUFFLENBQUM7UUFleUIsQ0FBQztRQUdyRSxvQ0FBVyxHQUFYLFVBQVksRUFBaUIsSUFBVSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RSxxQ0FBWSxHQUFaLFVBQWEsRUFBaUIsSUFBNkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFPbkYsZ0NBQU8sR0FBZixVQUFnQixFQUFpQixF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QUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ2hDLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUcsQ0FBQyxRQUFRLENBQUM7UUFDaEQsQ0FBQztRQUVEOzs7V0FHRztRQUNILDBDQUFpQixHQUFqQixVQUFrQixVQUFrQixFQUFFLGlCQUF5QjtZQUM3RCw0RUFBNEU7WUFDNUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoQyxPQUFPLGlCQUFpQixDQUFDO2FBQzFCO1lBRUQsdUNBQXVDO1lBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxzQkFBSSx1Q0FBVztpQkFBZixjQUFrRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzs7V0FBQTtRQUVyRSwwQ0FBaUIsR0FBekIsVUFBMEIsVUFBa0I7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxnQ0FBa0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzthQUMxRTtZQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFHLENBQUM7UUFDdkMsQ0FBQztRQUNILHFCQUFDO0lBQUQsQ0FBQyxBQTlNRCxJQThNQztJQTlNWSx3Q0FBYyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2x9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0ZhdGFsRGlhZ25vc3RpY0Vycm9yfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0ltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE5hbWVPZkRlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7VHlwZUNoZWNrQ29udGV4dH0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcblxuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4vZGVjbGFyYXRpb24nO1xuXG5cblxuLyoqXG4gKiBSZWNvcmQgb2YgYW4gYWRhcHRlciB3aGljaCBkZWNpZGVkIHRvIGVtaXQgYSBzdGF0aWMgZmllbGQsIGFuZCB0aGUgYW5hbHlzaXMgaXQgcGVyZm9ybWVkIHRvXG4gKiBwcmVwYXJlIGZvciB0aGF0IG9wZXJhdGlvbi5cbiAqL1xuaW50ZXJmYWNlIEVtaXRGaWVsZE9wZXJhdGlvbjxBLCBNPiB7XG4gIGFkYXB0ZXI6IERlY29yYXRvckhhbmRsZXI8QSwgTT47XG4gIGFuYWx5c2lzOiBBbmFseXNpc091dHB1dDxBPjtcbiAgbWV0YWRhdGE6IE07XG59XG5cbi8qKlxuICogTWFuYWdlcyBhIGNvbXBpbGF0aW9uIG9mIEl2eSBkZWNvcmF0b3JzIGludG8gc3RhdGljIGZpZWxkcyBhY3Jvc3MgYW4gZW50aXJlIHRzLlByb2dyYW0uXG4gKlxuICogVGhlIGNvbXBpbGF0aW9uIGlzIHN0YXRlZnVsIC0gc291cmNlIGZpbGVzIGFyZSBhbmFseXplZCBhbmQgcmVjb3JkcyBvZiB0aGUgb3BlcmF0aW9ucyB0aGF0IG5lZWRcbiAqIHRvIGJlIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHRyYW5zZm9ybS9lbWl0IHByb2Nlc3MgYXJlIG1haW50YWluZWQgaW50ZXJuYWxseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEl2eUNvbXBpbGF0aW9uIHtcbiAgLyoqXG4gICAqIFRyYWNrcyBjbGFzc2VzIHdoaWNoIGhhdmUgYmVlbiBhbmFseXplZCBhbmQgZm91bmQgdG8gaGF2ZSBhbiBJdnkgZGVjb3JhdG9yLCBhbmQgdGhlXG4gICAqIGluZm9ybWF0aW9uIHJlY29yZGVkIGFib3V0IHRoZW0gZm9yIGxhdGVyIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhbmFseXNpcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIEVtaXRGaWVsZE9wZXJhdGlvbjxhbnksIGFueT4+KCk7XG4gIHByaXZhdGUgdHlwZUNoZWNrTWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgRGVjb3JhdG9ySGFuZGxlcjxhbnksIGFueT4+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBmYWN0b3J5IGluZm9ybWF0aW9uIHdoaWNoIG5lZWRzIHRvIGJlIGdlbmVyYXRlZC5cbiAgICovXG5cbiAgLyoqXG4gICAqIFRyYWNrcyB0aGUgYER0c0ZpbGVUcmFuc2Zvcm1lcmBzIGZvciBlYWNoIFRTIGZpbGUgdGhhdCBuZWVkcyAuZC50cyB0cmFuc2Zvcm1hdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGR0c01hcCA9IG5ldyBNYXA8c3RyaW5nLCBEdHNGaWxlVHJhbnNmb3JtZXI+KCk7XG4gIHByaXZhdGUgX2RpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuXG4gIC8qKlxuICAgKiBAcGFyYW0gaGFuZGxlcnMgYXJyYXkgb2YgYERlY29yYXRvckhhbmRsZXJgcyB3aGljaCB3aWxsIGJlIGV4ZWN1dGVkIGFnYWluc3QgZWFjaCBjbGFzcyBpbiB0aGVcbiAgICogcHJvZ3JhbVxuICAgKiBAcGFyYW0gY2hlY2tlciBUeXBlU2NyaXB0IGBUeXBlQ2hlY2tlcmAgaW5zdGFuY2UgZm9yIHRoZSBwcm9ncmFtXG4gICAqIEBwYXJhbSByZWZsZWN0b3IgYFJlZmxlY3Rpb25Ib3N0YCB0aHJvdWdoIHdoaWNoIGFsbCByZWZsZWN0aW9uIG9wZXJhdGlvbnMgd2lsbCBiZSBwZXJmb3JtZWRcbiAgICogQHBhcmFtIGNvcmVJbXBvcnRzRnJvbSBhIFR5cGVTY3JpcHQgYFNvdXJjZUZpbGVgIHdoaWNoIGV4cG9ydHMgc3ltYm9scyBuZWVkZWQgZm9yIEl2eSBpbXBvcnRzXG4gICAqIHdoZW4gY29tcGlsaW5nIEBhbmd1bGFyL2NvcmUsIG9yIGBudWxsYCBpZiB0aGUgY3VycmVudCBwcm9ncmFtIGlzIG5vdCBAYW5ndWxhci9jb3JlLiBUaGlzIGlzXG4gICAqIGBudWxsYCBpbiBtb3N0IGNhc2VzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhhbmRsZXJzOiBEZWNvcmF0b3JIYW5kbGVyPGFueSwgYW55PltdLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGltcG9ydFJld3JpdGVyOiBJbXBvcnRSZXdyaXRlcixcbiAgICAgIHByaXZhdGUgc291cmNlVG9GYWN0b3J5U3ltYm9sczogTWFwPHN0cmluZywgU2V0PHN0cmluZz4+fG51bGwpIHt9XG5cblxuICBhbmFseXplU3luYyhzZjogdHMuU291cmNlRmlsZSk6IHZvaWQgeyByZXR1cm4gdGhpcy5hbmFseXplKHNmLCBmYWxzZSk7IH1cblxuICBhbmFseXplQXN5bmMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLmFuYWx5emUoc2YsIHRydWUpOyB9XG5cbiAgLyoqXG4gICAqIEFuYWx5emUgYSBzb3VyY2UgZmlsZSBhbmQgcHJvZHVjZSBkaWFnbm9zdGljcyBmb3IgaXQgKGlmIGFueSkuXG4gICAqL1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IGZhbHNlKTogdW5kZWZpbmVkO1xuICBwcml2YXRlIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUsIHByZWFuYWx5emU6IHRydWUpOiBQcm9taXNlPHZvaWQ+fHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhbmFseXplKHNmOiB0cy5Tb3VyY2VGaWxlLCBwcmVhbmFseXplOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPnx1bmRlZmluZWQge1xuICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcblxuICAgIGNvbnN0IGFuYWx5emVDbGFzcyA9IChub2RlOiB0cy5EZWNsYXJhdGlvbik6IHZvaWQgPT4ge1xuICAgICAgLy8gVGhlIGZpcnN0IHN0ZXAgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycy5cbiAgICAgIGNvbnN0IGNsYXNzRGVjb3JhdG9ycyA9IHRoaXMucmVmbGVjdG9yLmdldERlY29yYXRvcnNPZkRlY2xhcmF0aW9uKG5vZGUpO1xuXG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIERlY29yYXRvckhhbmRsZXJzIHRvIHNlZSBpZiBhbnkgYXJlIHJlbGV2YW50LlxuICAgICAgdGhpcy5oYW5kbGVycy5mb3JFYWNoKGFkYXB0ZXIgPT4ge1xuXG4gICAgICAgIC8vIEFuIGFkYXB0ZXIgaXMgcmVsZXZhbnQgaWYgaXQgbWF0Y2hlcyBvbmUgb2YgdGhlIGRlY29yYXRvcnMgb24gdGhlIGNsYXNzLlxuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IGFkYXB0ZXIuZGV0ZWN0KG5vZGUsIGNsYXNzRGVjb3JhdG9ycyk7XG4gICAgICAgIGlmIChtZXRhZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29tcGxldGVBbmFseXNpcyA9ICgpID0+IHtcbiAgICAgICAgICAvLyBDaGVjayBmb3IgbXVsdGlwbGUgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBub2RlLiBUZWNobmljYWxseSBzcGVha2luZyB0aGlzXG4gICAgICAgICAgLy8gY291bGQgYmUgc3VwcG9ydGVkLCBidXQgcmlnaHQgbm93IGl0J3MgYW4gZXJyb3IuXG4gICAgICAgICAgaWYgKHRoaXMuYW5hbHlzaXMuaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSdW4gYW5hbHlzaXMgb24gdGhlIG1ldGFkYXRhLiBUaGlzIHdpbGwgcHJvZHVjZSBlaXRoZXIgZGlhZ25vc3RpY3MsIGFuXG4gICAgICAgICAgLy8gYW5hbHlzaXMgcmVzdWx0LCBvciBib3RoLlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFkYXB0ZXIuYW5hbHl6ZShub2RlLCBtZXRhZGF0YSk7XG4gICAgICAgICAgICBpZiAoYW5hbHlzaXMuYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICB0aGlzLmFuYWx5c2lzLnNldChub2RlLCB7XG4gICAgICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgICAgICBhbmFseXNpczogYW5hbHlzaXMuYW5hbHlzaXMsXG4gICAgICAgICAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgaWYgKCEhYW5hbHlzaXMudHlwZUNoZWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50eXBlQ2hlY2tNYXAuc2V0KG5vZGUsIGFkYXB0ZXIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhbmFseXNpcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuX2RpYWdub3N0aWNzLnB1c2goLi4uYW5hbHlzaXMuZGlhZ25vc3RpY3MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYW5hbHlzaXMuZmFjdG9yeVN5bWJvbE5hbWUgIT09IHVuZGVmaW5lZCAmJiB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMgIT09IG51bGwgJiZcbiAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgICAgICAgICB0aGlzLnNvdXJjZVRvRmFjdG9yeVN5bWJvbHMuZ2V0KHNmLmZpbGVOYW1lKSAhLmFkZChhbmFseXNpcy5mYWN0b3J5U3ltYm9sTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRmF0YWxEaWFnbm9zdGljRXJyb3IpIHtcbiAgICAgICAgICAgICAgdGhpcy5fZGlhZ25vc3RpY3MucHVzaChlcnIudG9EaWFnbm9zdGljKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAocHJlYW5hbHl6ZSAmJiBhZGFwdGVyLnByZWFuYWx5emUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHByZWFuYWx5c2lzID0gYWRhcHRlci5wcmVhbmFseXplKG5vZGUsIG1ldGFkYXRhKTtcbiAgICAgICAgICBpZiAocHJlYW5hbHlzaXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaChwcmVhbmFseXNpcy50aGVuKCgpID0+IGNvbXBsZXRlQW5hbHlzaXMoKSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb21wbGV0ZUFuYWx5c2lzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbXBsZXRlQW5hbHlzaXMoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHZpc2l0ID0gKG5vZGU6IHRzLk5vZGUpOiB2b2lkID0+IHtcbiAgICAgIC8vIFByb2Nlc3Mgbm9kZXMgcmVjdXJzaXZlbHksIGFuZCBsb29rIGZvciBjbGFzcyBkZWNsYXJhdGlvbnMgd2l0aCBkZWNvcmF0b3JzLlxuICAgICAgaWYgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlKSkge1xuICAgICAgICBhbmFseXplQ2xhc3Mobm9kZSk7XG4gICAgICB9XG4gICAgICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgdmlzaXQpO1xuICAgIH07XG5cbiAgICB2aXNpdChzZik7XG5cbiAgICBpZiAocHJlYW5hbHl6ZSAmJiBwcm9taXNlcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4gdW5kZWZpbmVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKCk6IHZvaWQge1xuICAgIHRoaXMuYW5hbHlzaXMuZm9yRWFjaCgob3AsIGRlY2wpID0+IHtcbiAgICAgIGlmIChvcC5hZGFwdGVyLnJlc29sdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcC5hZGFwdGVyLnJlc29sdmUoZGVjbCwgb3AuYW5hbHlzaXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgdHlwZUNoZWNrKGNvbnRleHQ6IFR5cGVDaGVja0NvbnRleHQpOiB2b2lkIHtcbiAgICB0aGlzLnR5cGVDaGVja01hcC5mb3JFYWNoKChoYW5kbGVyLCBub2RlKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci50eXBlQ2hlY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBoYW5kbGVyLnR5cGVDaGVjayhjb250ZXh0LCBub2RlLCB0aGlzLmFuYWx5c2lzLmdldChub2RlKSAhLmFuYWx5c2lzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24sIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sKTogQ29tcGlsZVJlc3VsdFtdfHVuZGVmaW5lZCB7XG4gICAgLy8gTG9vayB0byBzZWUgd2hldGhlciB0aGUgb3JpZ2luYWwgbm9kZSB3YXMgYW5hbHl6ZWQuIElmIG5vdCwgdGhlcmUncyBub3RoaW5nIHRvIGRvLlxuICAgIGNvbnN0IG9yaWdpbmFsID0gdHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHRzLkRlY2xhcmF0aW9uO1xuICAgIGlmICghdGhpcy5hbmFseXNpcy5oYXMob3JpZ2luYWwpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBvcCA9IHRoaXMuYW5hbHlzaXMuZ2V0KG9yaWdpbmFsKSAhO1xuXG4gICAgLy8gUnVuIHRoZSBhY3R1YWwgY29tcGlsYXRpb24sIHdoaWNoIGdlbmVyYXRlcyBhbiBFeHByZXNzaW9uIGZvciB0aGUgSXZ5IGZpZWxkLlxuICAgIGxldCByZXM6IENvbXBpbGVSZXN1bHR8Q29tcGlsZVJlc3VsdFtdID0gb3AuYWRhcHRlci5jb21waWxlKG5vZGUsIG9wLmFuYWx5c2lzLCBjb25zdGFudFBvb2wpO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICByZXMgPSBbcmVzXTtcbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSAuZC50cyB0cmFuc2Zvcm1lciBmb3IgdGhlIGlucHV0IGZpbGUgYW5kIHJlY29yZCB0aGF0IGEgZmllbGQgd2FzIGdlbmVyYXRlZCxcbiAgICAvLyB3aGljaCB3aWxsIGFsbG93IHRoZSAuZC50cyB0byBiZSB0cmFuc2Zvcm1lZCBsYXRlci5cbiAgICBjb25zdCBmaWxlTmFtZSA9IG9yaWdpbmFsLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCBkdHNUcmFuc2Zvcm1lciA9IHRoaXMuZ2V0RHRzVHJhbnNmb3JtZXIoZmlsZU5hbWUpO1xuICAgIGR0c1RyYW5zZm9ybWVyLnJlY29yZFN0YXRpY0ZpZWxkKHJlZmxlY3ROYW1lT2ZEZWNsYXJhdGlvbihub2RlKSAhLCByZXMpO1xuXG4gICAgLy8gUmV0dXJuIHRoZSBpbnN0cnVjdGlvbiB0byB0aGUgdHJhbnNmb3JtZXIgc28gdGhlIGZpZWxkIHdpbGwgYmUgYWRkZWQuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rdXAgdGhlIGB0cy5EZWNvcmF0b3JgIHdoaWNoIHRyaWdnZXJlZCB0cmFuc2Zvcm1hdGlvbiBvZiBhIHBhcnRpY3VsYXIgY2xhc3MgZGVjbGFyYXRpb24uXG4gICAqL1xuICBpdnlEZWNvcmF0b3JGb3Iobm9kZTogdHMuRGVjbGFyYXRpb24pOiBEZWNvcmF0b3J8dW5kZWZpbmVkIHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0cy5EZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXNpcy5nZXQob3JpZ2luYWwpICEubWV0YWRhdGE7XG4gIH1cblxuICAvKipcbiAgICogUHJvY2VzcyBhIC5kLnRzIHNvdXJjZSBzdHJpbmcgYW5kIHJldHVybiBhIHRyYW5zZm9ybWVkIHZlcnNpb24gdGhhdCBpbmNvcnBvcmF0ZXMgdGhlIGNoYW5nZXNcbiAgICogbWFkZSB0byB0aGUgc291cmNlIGZpbGUuXG4gICAqL1xuICB0cmFuc2Zvcm1lZER0c0Zvcih0c0ZpbGVOYW1lOiBzdHJpbmcsIGR0c09yaWdpbmFsU291cmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIE5vIG5lZWQgdG8gdHJhbnNmb3JtIGlmIG5vIGNoYW5nZXMgaGF2ZSBiZWVuIHJlcXVlc3RlZCB0byB0aGUgaW5wdXQgZmlsZS5cbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIGR0c09yaWdpbmFsU291cmNlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0aGUgdHJhbnNmb3JtZWQgLmQudHMgc291cmNlLlxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgIS50cmFuc2Zvcm0oZHRzT3JpZ2luYWxTb3VyY2UsIHRzRmlsZU5hbWUpO1xuICB9XG5cbiAgZ2V0IGRpYWdub3N0aWNzKCk6IFJlYWRvbmx5QXJyYXk8dHMuRGlhZ25vc3RpYz4geyByZXR1cm4gdGhpcy5fZGlhZ25vc3RpY3M7IH1cblxuICBwcml2YXRlIGdldER0c1RyYW5zZm9ybWVyKHRzRmlsZU5hbWU6IHN0cmluZyk6IER0c0ZpbGVUcmFuc2Zvcm1lciB7XG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuZHRzTWFwLnNldCh0c0ZpbGVOYW1lLCBuZXcgRHRzRmlsZVRyYW5zZm9ybWVyKHRoaXMuaW1wb3J0UmV3cml0ZXIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZHRzTWFwLmdldCh0c0ZpbGVOYW1lKSAhO1xuICB9XG59XG4iXX0=