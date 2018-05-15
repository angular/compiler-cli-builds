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
        define("@angular/compiler-cli/src/ngtsc/transform/src/compilation", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/transform/src/declaration"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var declaration_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/declaration");
    /**
     * Manages a compilation of Ivy decorators into static fields across an entire ts.Program.
     *
     * The compilation is stateful - source files are analyzed and records of the operations that need
     * to be performed during the transform/emit process are maintained internally.
     */
    var IvyCompilation = /** @class */ (function () {
        function IvyCompilation(adapters, checker) {
            this.adapters = adapters;
            this.checker = checker;
            /**
             * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
             * information recorded about them for later compilation.
             */
            this.analysis = new Map();
            /**
             * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
             */
            this.dtsMap = new Map();
        }
        /**
         * Analyze a source file and produce diagnostics for it (if any).
         */
        IvyCompilation.prototype.analyze = function (sf) {
            var _this = this;
            var diagnostics = [];
            var visit = function (node) {
                // Process nodes recursively, and look for class declarations with decorators.
                if (ts.isClassDeclaration(node) && node.decorators !== undefined) {
                    // The first step is to reflect the decorators, which will identify decorators
                    // that are imported from another module.
                    var decorators_1 = node.decorators.map(function (decorator) { return metadata_1.reflectDecorator(decorator, _this.checker); })
                        .filter(function (decorator) { return decorator !== null; });
                    // Look through the CompilerAdapters to see if any are relevant.
                    _this.adapters.forEach(function (adapter) {
                        // An adapter is relevant if it matches one of the decorators on the class.
                        var decorator = adapter.detect(decorators_1);
                        if (decorator === undefined) {
                            return;
                        }
                        // Check for multiple decorators on the same node. Technically speaking this
                        // could be supported, but right now it's an error.
                        if (_this.analysis.has(node)) {
                            throw new Error('TODO.Diagnostic: Class has multiple Angular decorators.');
                        }
                        // Run analysis on the decorator. This will produce either diagnostics, an
                        // analysis result, or both.
                        var analysis = adapter.analyze(node, decorator);
                        if (analysis.diagnostics !== undefined) {
                            diagnostics.push.apply(diagnostics, tslib_1.__spread(analysis.diagnostics));
                        }
                        if (analysis.analysis !== undefined) {
                            _this.analysis.set(node, {
                                adapter: adapter,
                                analysis: analysis.analysis,
                                decorator: decorator.node,
                            });
                        }
                    });
                }
                ts.forEachChild(node, visit);
            };
            visit(sf);
            return diagnostics;
        };
        /**
         * Perform a compilation operation on the given class declaration and return instructions to an
         * AST transformer if any are available.
         */
        IvyCompilation.prototype.compileIvyFieldFor = function (node) {
            // Look to see whether the original node was analyzed. If not, there's nothing to do.
            var original = ts.getOriginalNode(node);
            if (!this.analysis.has(original)) {
                return undefined;
            }
            var op = this.analysis.get(original);
            // Run the actual compilation, which generates an Expression for the Ivy field.
            var res = op.adapter.compile(node, op.analysis);
            // Look up the .d.ts transformer for the input file and record that a field was generated,
            // which will allow the .d.ts to be transformed later.
            var fileName = node.getSourceFile().fileName;
            var dtsTransformer = this.getDtsTransformer(fileName);
            dtsTransformer.recordStaticField(node.name.text, res);
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
            return this.analysis.get(original).decorator;
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
            return this.dtsMap.get(tsFileName).transform(dtsOriginalSource);
        };
        IvyCompilation.prototype.getDtsTransformer = function (tsFileName) {
            if (!this.dtsMap.has(tsFileName)) {
                this.dtsMap.set(tsFileName, new declaration_1.DtsFileTransformer());
            }
            return this.dtsMap.get(tsFileName);
        };
        return IvyCompilation;
    }());
    exports.IvyCompilation = IvyCompilation;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybS9zcmMvY29tcGlsYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBR0gsK0JBQWlDO0lBRWpDLHFFQUEyRDtJQUczRCx5RkFBaUQ7SUFjakQ7Ozs7O09BS0c7SUFDSDtRQVlFLHdCQUFvQixRQUFnQyxFQUFVLE9BQXVCO1lBQWpFLGFBQVEsR0FBUixRQUFRLENBQXdCO1lBQVUsWUFBTyxHQUFQLE9BQU8sQ0FBZ0I7WUFYckY7OztlQUdHO1lBQ0ssYUFBUSxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1lBRTNFOztlQUVHO1lBQ0ssV0FBTSxHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBRWlDLENBQUM7UUFFekY7O1dBRUc7UUFDSCxnQ0FBTyxHQUFQLFVBQVEsRUFBaUI7WUFBekIsaUJBOENDO1lBN0NDLElBQU0sV0FBVyxHQUFvQixFQUFFLENBQUM7WUFDeEMsSUFBTSxLQUFLLEdBQUcsVUFBQyxJQUFhO2dCQUMxQiw4RUFBOEU7Z0JBQzlFLElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO29CQUNoRSw4RUFBOEU7b0JBQzlFLHlDQUF5QztvQkFDekMsSUFBTSxZQUFVLEdBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSwyQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsS0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUF6QyxDQUF5QyxDQUFDO3lCQUN0RSxNQUFNLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLEtBQUssSUFBSSxFQUFsQixDQUFrQixDQUFnQixDQUFDO29CQUVo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N0QsNEVBQTRFO1lBQzVFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDaEMsT0FBTyxpQkFBaUIsQ0FBQzthQUMxQjtZQUVELHVDQUF1QztZQUN2QyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFTywwQ0FBaUIsR0FBekIsVUFBMEIsVUFBa0I7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxnQ0FBa0IsRUFBRSxDQUFDLENBQUM7YUFDdkQ7WUFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDO1FBQ3ZDLENBQUM7UUFDSCxxQkFBQztJQUFELENBQUMsQUExSEQsSUEwSEM7SUExSFksd0NBQWMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXhwcmVzc2lvbiwgVHlwZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCByZWZsZWN0RGVjb3JhdG9yfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5cbmltcG9ydCB7QWRkU3RhdGljRmllbGRJbnN0cnVjdGlvbiwgQW5hbHlzaXNPdXRwdXQsIENvbXBpbGVyQWRhcHRlcn0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtEdHNGaWxlVHJhbnNmb3JtZXJ9IGZyb20gJy4vZGVjbGFyYXRpb24nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVUeXBlfSBmcm9tICcuL3RyYW5zbGF0b3InO1xuXG5cbi8qKlxuICogUmVjb3JkIG9mIGFuIGFkYXB0ZXIgd2hpY2ggZGVjaWRlZCB0byBlbWl0IGEgc3RhdGljIGZpZWxkLCBhbmQgdGhlIGFuYWx5c2lzIGl0IHBlcmZvcm1lZCB0b1xuICogcHJlcGFyZSBmb3IgdGhhdCBvcGVyYXRpb24uXG4gKi9cbmludGVyZmFjZSBFbWl0RmllbGRPcGVyYXRpb248VD4ge1xuICBhZGFwdGVyOiBDb21waWxlckFkYXB0ZXI8VD47XG4gIGFuYWx5c2lzOiBBbmFseXNpc091dHB1dDxUPjtcbiAgZGVjb3JhdG9yOiB0cy5EZWNvcmF0b3I7XG59XG5cbi8qKlxuICogTWFuYWdlcyBhIGNvbXBpbGF0aW9uIG9mIEl2eSBkZWNvcmF0b3JzIGludG8gc3RhdGljIGZpZWxkcyBhY3Jvc3MgYW4gZW50aXJlIHRzLlByb2dyYW0uXG4gKlxuICogVGhlIGNvbXBpbGF0aW9uIGlzIHN0YXRlZnVsIC0gc291cmNlIGZpbGVzIGFyZSBhbmFseXplZCBhbmQgcmVjb3JkcyBvZiB0aGUgb3BlcmF0aW9ucyB0aGF0IG5lZWRcbiAqIHRvIGJlIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHRyYW5zZm9ybS9lbWl0IHByb2Nlc3MgYXJlIG1haW50YWluZWQgaW50ZXJuYWxseS5cbiAqL1xuZXhwb3J0IGNsYXNzIEl2eUNvbXBpbGF0aW9uIHtcbiAgLyoqXG4gICAqIFRyYWNrcyBjbGFzc2VzIHdoaWNoIGhhdmUgYmVlbiBhbmFseXplZCBhbmQgZm91bmQgdG8gaGF2ZSBhbiBJdnkgZGVjb3JhdG9yLCBhbmQgdGhlXG4gICAqIGluZm9ybWF0aW9uIHJlY29yZGVkIGFib3V0IHRoZW0gZm9yIGxhdGVyIGNvbXBpbGF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBhbmFseXNpcyA9IG5ldyBNYXA8dHMuQ2xhc3NEZWNsYXJhdGlvbiwgRW1pdEZpZWxkT3BlcmF0aW9uPGFueT4+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB0aGUgYER0c0ZpbGVUcmFuc2Zvcm1lcmBzIGZvciBlYWNoIFRTIGZpbGUgdGhhdCBuZWVkcyAuZC50cyB0cmFuc2Zvcm1hdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIGR0c01hcCA9IG5ldyBNYXA8c3RyaW5nLCBEdHNGaWxlVHJhbnNmb3JtZXI+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBhZGFwdGVyczogQ29tcGlsZXJBZGFwdGVyPGFueT5bXSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcikge31cblxuICAvKipcbiAgICogQW5hbHl6ZSBhIHNvdXJjZSBmaWxlIGFuZCBwcm9kdWNlIGRpYWdub3N0aWNzIGZvciBpdCAoaWYgYW55KS5cbiAgICovXG4gIGFuYWx5emUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB0cy5EaWFnbm9zdGljW10ge1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcbiAgICBjb25zdCB2aXNpdCA9IChub2RlOiB0cy5Ob2RlKSA9PiB7XG4gICAgICAvLyBQcm9jZXNzIG5vZGVzIHJlY3Vyc2l2ZWx5LCBhbmQgbG9vayBmb3IgY2xhc3MgZGVjbGFyYXRpb25zIHdpdGggZGVjb3JhdG9ycy5cbiAgICAgIGlmICh0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgJiYgbm9kZS5kZWNvcmF0b3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVGhlIGZpcnN0IHN0ZXAgaXMgdG8gcmVmbGVjdCB0aGUgZGVjb3JhdG9ycywgd2hpY2ggd2lsbCBpZGVudGlmeSBkZWNvcmF0b3JzXG4gICAgICAgIC8vIHRoYXQgYXJlIGltcG9ydGVkIGZyb20gYW5vdGhlciBtb2R1bGUuXG4gICAgICAgIGNvbnN0IGRlY29yYXRvcnMgPVxuICAgICAgICAgICAgbm9kZS5kZWNvcmF0b3JzLm1hcChkZWNvcmF0b3IgPT4gcmVmbGVjdERlY29yYXRvcihkZWNvcmF0b3IsIHRoaXMuY2hlY2tlcikpXG4gICAgICAgICAgICAgICAgLmZpbHRlcihkZWNvcmF0b3IgPT4gZGVjb3JhdG9yICE9PSBudWxsKSBhcyBEZWNvcmF0b3JbXTtcblxuICAgICAgICAvLyBMb29rIHRocm91Z2ggdGhlIENvbXBpbGVyQWRhcHRlcnMgdG8gc2VlIGlmIGFueSBhcmUgcmVsZXZhbnQuXG4gICAgICAgIHRoaXMuYWRhcHRlcnMuZm9yRWFjaChhZGFwdGVyID0+IHtcbiAgICAgICAgICAvLyBBbiBhZGFwdGVyIGlzIHJlbGV2YW50IGlmIGl0IG1hdGNoZXMgb25lIG9mIHRoZSBkZWNvcmF0b3JzIG9uIHRoZSBjbGFzcy5cbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3IgPSBhZGFwdGVyLmRldGVjdChkZWNvcmF0b3JzKTtcbiAgICAgICAgICBpZiAoZGVjb3JhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDaGVjayBmb3IgbXVsdGlwbGUgZGVjb3JhdG9ycyBvbiB0aGUgc2FtZSBub2RlLiBUZWNobmljYWxseSBzcGVha2luZyB0aGlzXG4gICAgICAgICAgLy8gY291bGQgYmUgc3VwcG9ydGVkLCBidXQgcmlnaHQgbm93IGl0J3MgYW4gZXJyb3IuXG4gICAgICAgICAgaWYgKHRoaXMuYW5hbHlzaXMuaGFzKG5vZGUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RPRE8uRGlhZ25vc3RpYzogQ2xhc3MgaGFzIG11bHRpcGxlIEFuZ3VsYXIgZGVjb3JhdG9ycy4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSdW4gYW5hbHlzaXMgb24gdGhlIGRlY29yYXRvci4gVGhpcyB3aWxsIHByb2R1Y2UgZWl0aGVyIGRpYWdub3N0aWNzLCBhblxuICAgICAgICAgIC8vIGFuYWx5c2lzIHJlc3VsdCwgb3IgYm90aC5cbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFkYXB0ZXIuYW5hbHl6ZShub2RlLCBkZWNvcmF0b3IpO1xuICAgICAgICAgIGlmIChhbmFseXNpcy5kaWFnbm9zdGljcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmFuYWx5c2lzLmRpYWdub3N0aWNzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFuYWx5c2lzLmFuYWx5c2lzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuYW5hbHlzaXMuc2V0KG5vZGUsIHtcbiAgICAgICAgICAgICAgYWRhcHRlcixcbiAgICAgICAgICAgICAgYW5hbHlzaXM6IGFuYWx5c2lzLmFuYWx5c2lzLFxuICAgICAgICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuXG4gICAgdmlzaXQoc2YpO1xuICAgIHJldHVybiBkaWFnbm9zdGljcztcbiAgfVxuXG4gIC8qKlxuICAgKiBQZXJmb3JtIGEgY29tcGlsYXRpb24gb3BlcmF0aW9uIG9uIHRoZSBnaXZlbiBjbGFzcyBkZWNsYXJhdGlvbiBhbmQgcmV0dXJuIGluc3RydWN0aW9ucyB0byBhblxuICAgKiBBU1QgdHJhbnNmb3JtZXIgaWYgYW55IGFyZSBhdmFpbGFibGUuXG4gICAqL1xuICBjb21waWxlSXZ5RmllbGRGb3Iobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbik6IEFkZFN0YXRpY0ZpZWxkSW5zdHJ1Y3Rpb258dW5kZWZpbmVkIHtcbiAgICAvLyBMb29rIHRvIHNlZSB3aGV0aGVyIHRoZSBvcmlnaW5hbCBub2RlIHdhcyBhbmFseXplZC4gSWYgbm90LCB0aGVyZSdzIG5vdGhpbmcgdG8gZG8uXG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3Qgb3AgPSB0aGlzLmFuYWx5c2lzLmdldChvcmlnaW5hbCkgITtcblxuICAgIC8vIFJ1biB0aGUgYWN0dWFsIGNvbXBpbGF0aW9uLCB3aGljaCBnZW5lcmF0ZXMgYW4gRXhwcmVzc2lvbiBmb3IgdGhlIEl2eSBmaWVsZC5cbiAgICBjb25zdCByZXMgPSBvcC5hZGFwdGVyLmNvbXBpbGUobm9kZSwgb3AuYW5hbHlzaXMpO1xuXG4gICAgLy8gTG9vayB1cCB0aGUgLmQudHMgdHJhbnNmb3JtZXIgZm9yIHRoZSBpbnB1dCBmaWxlIGFuZCByZWNvcmQgdGhhdCBhIGZpZWxkIHdhcyBnZW5lcmF0ZWQsXG4gICAgLy8gd2hpY2ggd2lsbCBhbGxvdyB0aGUgLmQudHMgdG8gYmUgdHJhbnNmb3JtZWQgbGF0ZXIuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICBjb25zdCBkdHNUcmFuc2Zvcm1lciA9IHRoaXMuZ2V0RHRzVHJhbnNmb3JtZXIoZmlsZU5hbWUpO1xuICAgIGR0c1RyYW5zZm9ybWVyLnJlY29yZFN0YXRpY0ZpZWxkKG5vZGUubmFtZSAhLnRleHQsIHJlcyk7XG5cbiAgICAvLyBSZXR1cm4gdGhlIGluc3RydWN0aW9uIHRvIHRoZSB0cmFuc2Zvcm1lciBzbyB0aGUgZmllbGQgd2lsbCBiZSBhZGRlZC5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2t1cCB0aGUgYHRzLkRlY29yYXRvcmAgd2hpY2ggdHJpZ2dlcmVkIHRyYW5zZm9ybWF0aW9uIG9mIGEgcGFydGljdWxhciBjbGFzcyBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGl2eURlY29yYXRvckZvcihub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uKTogdHMuRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSB0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbjtcbiAgICBpZiAoIXRoaXMuYW5hbHlzaXMuaGFzKG9yaWdpbmFsKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5hbmFseXNpcy5nZXQob3JpZ2luYWwpICEuZGVjb3JhdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3MgYSAuZC50cyBzb3VyY2Ugc3RyaW5nIGFuZCByZXR1cm4gYSB0cmFuc2Zvcm1lZCB2ZXJzaW9uIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSBjaGFuZ2VzXG4gICAqIG1hZGUgdG8gdGhlIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgdHJhbnNmb3JtZWREdHNGb3IodHNGaWxlTmFtZTogc3RyaW5nLCBkdHNPcmlnaW5hbFNvdXJjZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAvLyBObyBuZWVkIHRvIHRyYW5zZm9ybSBpZiBubyBjaGFuZ2VzIGhhdmUgYmVlbiByZXF1ZXN0ZWQgdG8gdGhlIGlucHV0IGZpbGUuXG4gICAgaWYgKCF0aGlzLmR0c01hcC5oYXModHNGaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBkdHNPcmlnaW5hbFNvdXJjZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdGhlIHRyYW5zZm9ybWVkIC5kLnRzIHNvdXJjZS5cbiAgICByZXR1cm4gdGhpcy5kdHNNYXAuZ2V0KHRzRmlsZU5hbWUpICEudHJhbnNmb3JtKGR0c09yaWdpbmFsU291cmNlKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0RHRzVHJhbnNmb3JtZXIodHNGaWxlTmFtZTogc3RyaW5nKTogRHRzRmlsZVRyYW5zZm9ybWVyIHtcbiAgICBpZiAoIXRoaXMuZHRzTWFwLmhhcyh0c0ZpbGVOYW1lKSkge1xuICAgICAgdGhpcy5kdHNNYXAuc2V0KHRzRmlsZU5hbWUsIG5ldyBEdHNGaWxlVHJhbnNmb3JtZXIoKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmR0c01hcC5nZXQodHNGaWxlTmFtZSkgITtcbiAgfVxufVxuIl19