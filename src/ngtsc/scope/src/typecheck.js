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
        define("@angular/compiler-cli/src/ngtsc/scope/src/typecheck", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TypeCheckScopeRegistry = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    /**
     * Computes scope information to be used in template type checking.
     */
    var TypeCheckScopeRegistry = /** @class */ (function () {
        function TypeCheckScopeRegistry(scopeReader, metaReader) {
            this.scopeReader = scopeReader;
            this.metaReader = metaReader;
            /**
             * Cache of flattened directive metadata. Because flattened metadata is scope-invariant it's
             * cached individually, such that all scopes refer to the same flattened metadata.
             */
            this.flattenedDirectiveMetaCache = new Map();
            /**
             * Cache of the computed type check scope per NgModule declaration.
             */
            this.scopeCache = new Map();
        }
        /**
         * Computes the type-check scope information for the component declaration. If the NgModule
         * contains an error, then 'error' is returned. If the component is not declared in any NgModule,
         * an empty type-check scope is returned.
         */
        TypeCheckScopeRegistry.prototype.getTypeCheckScope = function (node) {
            var e_1, _a, e_2, _b;
            var matcher = new compiler_1.SelectorMatcher();
            var directives = [];
            var pipes = new Map();
            var scope = this.scopeReader.getScopeForComponent(node);
            if (scope === null) {
                return {
                    matcher: matcher,
                    directives: directives,
                    pipes: pipes,
                    schemas: [],
                    isPoisoned: false,
                };
            }
            if (this.scopeCache.has(scope.ngModule)) {
                return this.scopeCache.get(scope.ngModule);
            }
            try {
                for (var _c = (0, tslib_1.__values)(scope.compilation.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var meta = _d.value;
                    if (meta.selector !== null) {
                        var extMeta = this.getTypeCheckDirectiveMetadata(meta.ref);
                        matcher.addSelectables(compiler_1.CssSelector.parse(meta.selector), extMeta);
                        directives.push(extMeta);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            try {
                for (var _e = (0, tslib_1.__values)(scope.compilation.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var _g = _f.value, name_1 = _g.name, ref = _g.ref;
                    if (!ts.isClassDeclaration(ref.node)) {
                        throw new Error("Unexpected non-class declaration " + ts.SyntaxKind[ref.node.kind] + " for pipe " + ref.debugName);
                    }
                    pipes.set(name_1, ref);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var typeCheckScope = {
                matcher: matcher,
                directives: directives,
                pipes: pipes,
                schemas: scope.schemas,
                isPoisoned: scope.compilation.isPoisoned || scope.exported.isPoisoned,
            };
            this.scopeCache.set(scope.ngModule, typeCheckScope);
            return typeCheckScope;
        };
        TypeCheckScopeRegistry.prototype.getTypeCheckDirectiveMetadata = function (ref) {
            var clazz = ref.node;
            if (this.flattenedDirectiveMetaCache.has(clazz)) {
                return this.flattenedDirectiveMetaCache.get(clazz);
            }
            var meta = (0, metadata_1.flattenInheritedDirectiveMetadata)(this.metaReader, ref);
            this.flattenedDirectiveMetaCache.set(clazz, meta);
            return meta;
        };
        return TypeCheckScopeRegistry;
    }());
    exports.TypeCheckScopeRegistry = TypeCheckScopeRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9zY29wZS9zcmMvdHlwZWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0U7SUFDL0UsK0JBQWlDO0lBR2pDLHFFQUFnRztJQXFDaEc7O09BRUc7SUFDSDtRQVlFLGdDQUFvQixXQUFpQyxFQUFVLFVBQTBCO1lBQXJFLGdCQUFXLEdBQVgsV0FBVyxDQUFzQjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBWHpGOzs7ZUFHRztZQUNLLGdDQUEyQixHQUFHLElBQUksR0FBRyxFQUFtQyxDQUFDO1lBRWpGOztlQUVHO1lBQ0ssZUFBVSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBRTJCLENBQUM7UUFFN0Y7Ozs7V0FJRztRQUNILGtEQUFpQixHQUFqQixVQUFrQixJQUFzQjs7WUFDdEMsSUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBZSxFQUFpQixDQUFDO1lBQ3JELElBQU0sVUFBVSxHQUFvQixFQUFFLENBQUM7WUFDdkMsSUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQTRELENBQUM7WUFFbEYsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxRCxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE9BQU87b0JBQ0wsT0FBTyxTQUFBO29CQUNQLFVBQVUsWUFBQTtvQkFDVixLQUFLLE9BQUE7b0JBQ0wsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsVUFBVSxFQUFFLEtBQUs7aUJBQ2xCLENBQUM7YUFDSDtZQUVELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN2QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUUsQ0FBQzthQUM3Qzs7Z0JBRUQsS0FBbUIsSUFBQSxLQUFBLHNCQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUE1QyxJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFO3dCQUMxQixJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUM3RCxPQUFPLENBQUMsY0FBYyxDQUFDLHNCQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQzt3QkFDbEUsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDMUI7aUJBQ0Y7Ozs7Ozs7Ozs7Z0JBRUQsS0FBMEIsSUFBQSxLQUFBLHNCQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBLGdCQUFBLDRCQUFFO29CQUF4QyxJQUFBLGFBQVcsRUFBVixNQUFJLFVBQUEsRUFBRSxHQUFHLFNBQUE7b0JBQ25CLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLHNDQUNaLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWEsR0FBRyxDQUFDLFNBQVcsQ0FBQyxDQUFDO3FCQUMvRDtvQkFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQUksRUFBRSxHQUF1RCxDQUFDLENBQUM7aUJBQzFFOzs7Ozs7Ozs7WUFFRCxJQUFNLGNBQWMsR0FBbUI7Z0JBQ3JDLE9BQU8sU0FBQTtnQkFDUCxVQUFVLFlBQUE7Z0JBQ1YsS0FBSyxPQUFBO2dCQUNMLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztnQkFDdEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVTthQUN0RSxDQUFDO1lBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNwRCxPQUFPLGNBQWMsQ0FBQztRQUN4QixDQUFDO1FBRUQsOERBQTZCLEdBQTdCLFVBQThCLEdBQWdDO1lBQzVELElBQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDdkIsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7YUFDckQ7WUFFRCxJQUFNLElBQUksR0FBRyxJQUFBLDRDQUFpQyxFQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckUsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbEQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBNUVELElBNEVDO0lBNUVZLHdEQUFzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0Nzc1NlbGVjdG9yLCBTY2hlbWFNZXRhZGF0YSwgU2VsZWN0b3JNYXRjaGVyfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEsIE1ldGFkYXRhUmVhZGVyfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuL2NvbXBvbmVudF9zY29wZSc7XG5cbi8qKlxuICogVGhlIHNjb3BlIHRoYXQgaXMgdXNlZCBmb3IgdHlwZS1jaGVjayBjb2RlIGdlbmVyYXRpb24gb2YgYSBjb21wb25lbnQgdGVtcGxhdGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVHlwZUNoZWNrU2NvcGUge1xuICAvKipcbiAgICogQSBgU2VsZWN0b3JNYXRjaGVyYCBpbnN0YW5jZSB0aGF0IGNvbnRhaW5zIHRoZSBmbGF0dGVuZWQgZGlyZWN0aXZlIG1ldGFkYXRhIG9mIGFsbCBkaXJlY3RpdmVzXG4gICAqIHRoYXQgYXJlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGUgZGVjbGFyaW5nIE5nTW9kdWxlLlxuICAgKi9cbiAgbWF0Y2hlcjogU2VsZWN0b3JNYXRjaGVyPERpcmVjdGl2ZU1ldGE+O1xuXG4gIC8qKlxuICAgKiBBbGwgb2YgdGhlIGRpcmVjdGl2ZXMgYXZhaWxhYmxlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGUgZGVjbGFyaW5nIE5nTW9kdWxlLlxuICAgKi9cbiAgZGlyZWN0aXZlczogRGlyZWN0aXZlTWV0YVtdO1xuXG4gIC8qKlxuICAgKiBUaGUgcGlwZXMgdGhhdCBhcmUgYXZhaWxhYmxlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICovXG4gIHBpcGVzOiBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+O1xuXG4gIC8qKlxuICAgKiBUaGUgc2NoZW1hcyB0aGF0IGFyZSB1c2VkIGluIHRoaXMgc2NvcGUuXG4gICAqL1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xuXG4gIC8qKlxuICAgKiBXaGV0aGVyIHRoZSBvcmlnaW5hbCBjb21waWxhdGlvbiBzY29wZSB3aGljaCBwcm9kdWNlZCB0aGlzIGBUeXBlQ2hlY2tTY29wZWAgd2FzIGl0c2VsZiBwb2lzb25lZFxuICAgKiAoY29udGFpbmVkIHNlbWFudGljIGVycm9ycyBkdXJpbmcgaXRzIHByb2R1Y3Rpb24pLlxuICAgKi9cbiAgaXNQb2lzb25lZDogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBDb21wdXRlcyBzY29wZSBpbmZvcm1hdGlvbiB0byBiZSB1c2VkIGluIHRlbXBsYXRlIHR5cGUgY2hlY2tpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBUeXBlQ2hlY2tTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqIENhY2hlIG9mIGZsYXR0ZW5lZCBkaXJlY3RpdmUgbWV0YWRhdGEuIEJlY2F1c2UgZmxhdHRlbmVkIG1ldGFkYXRhIGlzIHNjb3BlLWludmFyaWFudCBpdCdzXG4gICAqIGNhY2hlZCBpbmRpdmlkdWFsbHksIHN1Y2ggdGhhdCBhbGwgc2NvcGVzIHJlZmVyIHRvIHRoZSBzYW1lIGZsYXR0ZW5lZCBtZXRhZGF0YS5cbiAgICovXG4gIHByaXZhdGUgZmxhdHRlbmVkRGlyZWN0aXZlTWV0YUNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuXG4gIC8qKlxuICAgKiBDYWNoZSBvZiB0aGUgY29tcHV0ZWQgdHlwZSBjaGVjayBzY29wZSBwZXIgTmdNb2R1bGUgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIHNjb3BlQ2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFR5cGVDaGVja1Njb3BlPigpO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc2NvcGVSZWFkZXI6IENvbXBvbmVudFNjb3BlUmVhZGVyLCBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyKSB7fVxuXG4gIC8qKlxuICAgKiBDb21wdXRlcyB0aGUgdHlwZS1jaGVjayBzY29wZSBpbmZvcm1hdGlvbiBmb3IgdGhlIGNvbXBvbmVudCBkZWNsYXJhdGlvbi4gSWYgdGhlIE5nTW9kdWxlXG4gICAqIGNvbnRhaW5zIGFuIGVycm9yLCB0aGVuICdlcnJvcicgaXMgcmV0dXJuZWQuIElmIHRoZSBjb21wb25lbnQgaXMgbm90IGRlY2xhcmVkIGluIGFueSBOZ01vZHVsZSxcbiAgICogYW4gZW1wdHkgdHlwZS1jaGVjayBzY29wZSBpcyByZXR1cm5lZC5cbiAgICovXG4gIGdldFR5cGVDaGVja1Njb3BlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBUeXBlQ2hlY2tTY29wZSB7XG4gICAgY29uc3QgbWF0Y2hlciA9IG5ldyBTZWxlY3Rvck1hdGNoZXI8RGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBkaXJlY3RpdmVzOiBEaXJlY3RpdmVNZXRhW10gPSBbXTtcbiAgICBjb25zdCBwaXBlcyA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4+KCk7XG5cbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWFkZXIuZ2V0U2NvcGVGb3JDb21wb25lbnQobm9kZSk7XG4gICAgaWYgKHNjb3BlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtYXRjaGVyLFxuICAgICAgICBkaXJlY3RpdmVzLFxuICAgICAgICBwaXBlcyxcbiAgICAgICAgc2NoZW1hczogW10sXG4gICAgICAgIGlzUG9pc29uZWQ6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zY29wZUNhY2hlLmhhcyhzY29wZS5uZ01vZHVsZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlQ2FjaGUuZ2V0KHNjb3BlLm5nTW9kdWxlKSE7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBtZXRhIG9mIHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGlmIChtZXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGV4dE1ldGEgPSB0aGlzLmdldFR5cGVDaGVja0RpcmVjdGl2ZU1ldGFkYXRhKG1ldGEucmVmKTtcbiAgICAgICAgbWF0Y2hlci5hZGRTZWxlY3RhYmxlcyhDc3NTZWxlY3Rvci5wYXJzZShtZXRhLnNlbGVjdG9yKSwgZXh0TWV0YSk7XG4gICAgICAgIGRpcmVjdGl2ZXMucHVzaChleHRNZXRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IHtuYW1lLCByZWZ9IG9mIHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzKSB7XG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIG5vbi1jbGFzcyBkZWNsYXJhdGlvbiAke1xuICAgICAgICAgICAgdHMuU3ludGF4S2luZFtyZWYubm9kZS5raW5kXX0gZm9yIHBpcGUgJHtyZWYuZGVidWdOYW1lfWApO1xuICAgICAgfVxuICAgICAgcGlwZXMuc2V0KG5hbWUsIHJlZiBhcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPj4pO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVDaGVja1Njb3BlOiBUeXBlQ2hlY2tTY29wZSA9IHtcbiAgICAgIG1hdGNoZXIsXG4gICAgICBkaXJlY3RpdmVzLFxuICAgICAgcGlwZXMsXG4gICAgICBzY2hlbWFzOiBzY29wZS5zY2hlbWFzLFxuICAgICAgaXNQb2lzb25lZDogc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCB8fCBzY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkLFxuICAgIH07XG4gICAgdGhpcy5zY29wZUNhY2hlLnNldChzY29wZS5uZ01vZHVsZSwgdHlwZUNoZWNrU2NvcGUpO1xuICAgIHJldHVybiB0eXBlQ2hlY2tTY29wZTtcbiAgfVxuXG4gIGdldFR5cGVDaGVja0RpcmVjdGl2ZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YSB7XG4gICAgY29uc3QgY2xhenogPSByZWYubm9kZTtcbiAgICBpZiAodGhpcy5mbGF0dGVuZWREaXJlY3RpdmVNZXRhQ2FjaGUuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMuZmxhdHRlbmVkRGlyZWN0aXZlTWV0YUNhY2hlLmdldChjbGF6eikhO1xuICAgIH1cblxuICAgIGNvbnN0IG1ldGEgPSBmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGEodGhpcy5tZXRhUmVhZGVyLCByZWYpO1xuICAgIHRoaXMuZmxhdHRlbmVkRGlyZWN0aXZlTWV0YUNhY2hlLnNldChjbGF6eiwgbWV0YSk7XG4gICAgcmV0dXJuIG1ldGE7XG4gIH1cbn1cbiJdfQ==