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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Compiles @NgModule annotations to ngModuleDef fields.
     *
     * TODO(alxhub): handle injector side of things as well.
     */
    var NgModuleDecoratorHandler = /** @class */ (function () {
        function NgModuleDecoratorHandler(checker, scopeRegistry) {
            this.checker = checker;
            this.scopeRegistry = scopeRegistry;
        }
        NgModuleDecoratorHandler.prototype.detect = function (decorators) {
            return decorators.find(function (decorator) { return decorator.name === 'NgModule' && util_1.isAngularCore(decorator); });
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            if (decorator.args === null || decorator.args.length !== 1) {
                throw new Error("Incorrect number of arguments to @NgModule decorator");
            }
            var meta = decorator.args[0];
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new Error("Decorator argument must be literal.");
            }
            var ngModule = metadata_1.reflectObjectLiteral(meta);
            if (ngModule.has('jit')) {
                // The only allowed value is true, so there's no need to expand further.
                return {};
            }
            // Extract the module declarations, imports, and exports.
            var declarations = [];
            if (ngModule.has('declarations')) {
                var declarationMeta = metadata_1.staticallyResolve(ngModule.get('declarations'), this.checker);
                declarations = resolveTypeList(declarationMeta, 'declarations');
            }
            var imports = [];
            if (ngModule.has('imports')) {
                var importsMeta = metadata_1.staticallyResolve(ngModule.get('imports'), this.checker);
                imports = resolveTypeList(importsMeta, 'imports');
            }
            var exports = [];
            if (ngModule.has('exports')) {
                var exportsMeta = metadata_1.staticallyResolve(ngModule.get('exports'), this.checker);
                exports = resolveTypeList(exportsMeta, 'exports');
            }
            // Register this module's information with the SelectorScopeRegistry. This ensures that during
            // the compile() phase, the module's metadata is available for selector scope computation.
            this.scopeRegistry.registerModule(node, { declarations: declarations, imports: imports, exports: exports });
            var context = node.getSourceFile();
            return {
                analysis: {
                    type: new compiler_1.WrappedNodeExpr(node.name),
                    bootstrap: [],
                    declarations: declarations.map(function (decl) { return util_1.referenceToExpression(decl, context); }),
                    exports: exports.map(function (exp) { return util_1.referenceToExpression(exp, context); }),
                    imports: imports.map(function (imp) { return util_1.referenceToExpression(imp, context); }),
                    emitInline: false,
                },
            };
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compileNgModule(analysis);
            return {
                field: 'ngModuleDef',
                initializer: res.expression,
                statements: [],
                type: res.type,
            };
        };
        return NgModuleDecoratorHandler;
    }());
    exports.NgModuleDecoratorHandler = NgModuleDecoratorHandler;
    /**
     * Compute a list of `Reference`s from a resolved metadata value.
     */
    function resolveTypeList(resolvedList, name) {
        var refList = [];
        if (!Array.isArray(resolvedList)) {
            throw new Error("Expected array when reading property " + name);
        }
        resolvedList.forEach(function (entry, idx) {
            if (Array.isArray(entry)) {
                // Recurse into nested arrays.
                refList.push.apply(refList, tslib_1.__spread(resolveTypeList(entry, name)));
            }
            else if (entry instanceof metadata_1.Reference) {
                if (!entry.expressable) {
                    throw new Error("Value at position " + idx + " in " + name + " array is not expressable");
                }
                else if (!ts.isClassDeclaration(entry.node)) {
                    throw new Error("Value at position " + idx + " in " + name + " array is not a class declaration");
                }
                refList.push(entry);
            }
            else {
                // TODO(alxhub): expand ModuleWithProviders.
                throw new Error("Value at position " + idx + " in " + name + " array is not a reference");
            }
        });
        return refList;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF3SztJQUN4SywrQkFBaUM7SUFHakMscUVBQWlHO0lBSWpHLDZFQUE0RDtJQUU1RDs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FBb0IsT0FBdUIsRUFBVSxhQUFvQztZQUFyRSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUFHLENBQUM7UUFFN0YseUNBQU0sR0FBTixVQUFPLFVBQXVCO1lBQzVCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLG9CQUFhLENBQUMsU0FBUyxDQUFDLEVBQXpELENBQXlELENBQUMsQ0FBQztRQUNqRyxDQUFDO1FBRUQsMENBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsU0FBb0I7WUFDckQsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQzFELE1BQU0sSUFBSSxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQzthQUN6RTtZQUNELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO2FBQ3hEO1lBQ0QsSUFBTSxRQUFRLEdBQUcsK0JBQW9CLENBQUMsSUFBSSxDQUFDLENB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LE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUF3QyxJQUFNLENBQUMsQ0FBQztTQUNqRTtRQUVELFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBQyxLQUFLLEVBQUUsR0FBRztZQUM5QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3hCLDhCQUE4QjtnQkFDOUIsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUU7YUFDL0M7aUJBQU0sSUFBSSxLQUFLLFlBQVksb0JBQVMsRUFBRTtnQkFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7b0JBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXFCLEdBQUcsWUFBTyxJQUFJLDhCQUEyQixDQUFDLENBQUM7aUJBQ2pGO3FCQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUFxQixHQUFHLFlBQU8sSUFBSSxzQ0FBbUMsQ0FBQyxDQUFDO2lCQUN6RjtnQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3JCO2lCQUFNO2dCQUNMLDRDQUE0QztnQkFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBcUIsR0FBRyxZQUFPLElBQUksOEJBQTJCLENBQUMsQ0FBQzthQUNqRjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlTmdNb2R1bGUsIG1ha2VCaW5kaW5nUGFyc2VyLCBwYXJzZVRlbXBsYXRlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtSZWZlcmVuY2UsIFJlc29sdmVkVmFsdWUsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtpc0FuZ3VsYXJDb3JlLCByZWZlcmVuY2VUb0V4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM05nTW9kdWxlTWV0YWRhdGE+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnkpIHt9XG5cbiAgZGV0ZWN0KGRlY29yYXRvcnM6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdOZ01vZHVsZScgJiYgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxSM05nTW9kdWxlTWV0YWRhdGE+IHtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBOZ01vZHVsZSBkZWNvcmF0b3JgKTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzWzBdO1xuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZWNvcmF0b3IgYXJndW1lbnQgbXVzdCBiZSBsaXRlcmFsLmApO1xuICAgIH1cbiAgICBjb25zdCBuZ01vZHVsZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaml0JykpIHtcbiAgICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgdGhlIG1vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzLlxuICAgIGxldCBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykgISwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGRlY2xhcmF0aW9ucyA9IHJlc29sdmVUeXBlTGlzdChkZWNsYXJhdGlvbk1ldGEsICdkZWNsYXJhdGlvbnMnKTtcbiAgICB9XG4gICAgbGV0IGltcG9ydHM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgICBpbXBvcnRzID0gcmVzb2x2ZVR5cGVMaXN0KGltcG9ydHNNZXRhLCAnaW1wb3J0cycpO1xuICAgIH1cbiAgICBsZXQgZXhwb3J0czogUmVmZXJlbmNlW10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIGNvbnN0IGV4cG9ydHNNZXRhID0gc3RhdGljYWxseVJlc29sdmUobmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgISwgdGhpcy5jaGVja2VyKTtcbiAgICAgIGV4cG9ydHMgPSByZXNvbHZlVHlwZUxpc3QoZXhwb3J0c01ldGEsICdleHBvcnRzJyk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0IGR1cmluZ1xuICAgIC8vIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3Rlck1vZHVsZShub2RlLCB7ZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBleHBvcnRzfSk7XG5cbiAgICBjb25zdCBjb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihub2RlLm5hbWUgISksXG4gICAgICAgIGJvb3RzdHJhcDogW10sXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLm1hcChkZWNsID0+IHJlZmVyZW5jZVRvRXhwcmVzc2lvbihkZWNsLCBjb250ZXh0KSksXG4gICAgICAgIGV4cG9ydHM6IGV4cG9ydHMubWFwKGV4cCA9PiByZWZlcmVuY2VUb0V4cHJlc3Npb24oZXhwLCBjb250ZXh0KSksXG4gICAgICAgIGltcG9ydHM6IGltcG9ydHMubWFwKGltcCA9PiByZWZlcmVuY2VUb0V4cHJlc3Npb24oaW1wLCBjb250ZXh0KSksXG4gICAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNOZ01vZHVsZU1ldGFkYXRhKTogQ29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3QgcmVzID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzKTtcbiAgICByZXR1cm4ge1xuICAgICAgZmllbGQ6ICduZ01vZHVsZURlZicsXG4gICAgICBpbml0aWFsaXplcjogcmVzLmV4cHJlc3Npb24sXG4gICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgIHR5cGU6IHJlcy50eXBlLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICovXG5mdW5jdGlvbiByZXNvbHZlVHlwZUxpc3QocmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBuYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2VbXSB7XG4gIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZVtdID0gW107XG4gIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZExpc3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgcHJvcGVydHkgJHtuYW1lfWApO1xuICB9XG5cbiAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgYXJyYXlzLlxuICAgICAgcmVmTGlzdC5wdXNoKC4uLnJlc29sdmVUeXBlTGlzdChlbnRyeSwgbmFtZSkpO1xuICAgIH0gZWxzZSBpZiAoZW50cnkgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgIGlmICghZW50cnkuZXhwcmVzc2FibGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gJHtuYW1lfSBhcnJheSBpcyBub3QgZXhwcmVzc2FibGVgKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihlbnRyeS5ub2RlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiAke25hbWV9IGFycmF5IGlzIG5vdCBhIGNsYXNzIGRlY2xhcmF0aW9uYCk7XG4gICAgICB9XG4gICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPKGFseGh1Yik6IGV4cGFuZCBNb2R1bGVXaXRoUHJvdmlkZXJzLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gJHtuYW1lfSBhcnJheSBpcyBub3QgYSByZWZlcmVuY2VgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZWZMaXN0O1xufVxuIl19