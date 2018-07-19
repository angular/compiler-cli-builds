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
        function NgModuleDecoratorHandler(checker, reflector, scopeRegistry, isCore) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
        }
        NgModuleDecoratorHandler.prototype.detect = function (decorators) {
            var _this = this;
            return decorators.find(function (decorator) { return decorator.name === 'NgModule' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            if (decorator.args === null || decorator.args.length > 1) {
                throw new Error("Incorrect number of arguments to @NgModule decorator");
            }
            // @NgModule can be invoked without arguments. In case it is, pretend as if a blank object
            // literal was specified. This simplifies the code below.
            var meta = decorator.args.length === 1 ? decorator.args[0] : ts.createObjectLiteral([]);
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
            var ngModuleDef = {
                type: new compiler_1.WrappedNodeExpr(node.name),
                bootstrap: [],
                declarations: declarations.map(function (decl) { return util_1.referenceToExpression(decl, context); }),
                exports: exports.map(function (exp) { return util_1.referenceToExpression(exp, context); }),
                imports: imports.map(function (imp) { return util_1.referenceToExpression(imp, context); }),
                emitInline: false,
            };
            var providers = ngModule.has('providers') ?
                new compiler_1.WrappedNodeExpr(ngModule.get('providers')) :
                new compiler_1.LiteralArrayExpr([]);
            var ngInjectorDef = {
                name: node.name.text,
                type: new compiler_1.WrappedNodeExpr(node.name),
                deps: util_1.getConstructorDependencies(node, this.reflector, this.isCore), providers: providers,
                imports: new compiler_1.LiteralArrayExpr(tslib_1.__spread(imports, exports).map(function (imp) { return util_1.referenceToExpression(imp, context); })),
            };
            return {
                analysis: {
                    ngModuleDef: ngModuleDef, ngInjectorDef: ngInjectorDef,
                },
            };
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis) {
            var ngInjectorDef = compiler_1.compileInjector(analysis.ngInjectorDef);
            var ngModuleDef = compiler_1.compileNgModule(analysis.ngModuleDef);
            return [
                {
                    name: 'ngModuleDef',
                    initializer: ngModuleDef.expression,
                    statements: [],
                    type: ngModuleDef.type,
                },
                {
                    name: 'ngInjectorDef',
                    initializer: ngInjectorDef.expression,
                    statements: [],
                    type: ngInjectorDef.type,
                },
            ];
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
            // Unwrap ModuleWithProviders for modules that are locally declared (and thus static resolution
            // was able to descend into the function and return an object literal, a Map).
            if (entry instanceof Map && entry.has('ngModule')) {
                entry = entry.get('ngModule');
            }
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
                throw new Error("Value at position " + idx + " in " + name + " array is not a reference: " + entry);
            }
        });
        return refList;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUErTjtJQUMvTiwrQkFBaUM7SUFHakMscUVBQWlHO0lBSWpHLDZFQUF3RjtJQU94Rjs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZTtZQUQ3RCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7UUFBRyxDQUFDO1FBRTdFLHlDQUFNLEdBQU4sVUFBTyxVQUF1QjtZQUE5QixpQkFHQztZQUZDLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUExRSxDQUEwRSxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVELDBDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLHNEQUFzRCxDQUFDLENBQUM7YUFDekU7WUFFRCwwRkFBMEY7WUFDMUYseURBQXlEO1lBQ3pELElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxD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QUFNLElBQUksS0FBSyxDQUFDLHVCQUFxQixHQUFHLFlBQU8sSUFBSSxtQ0FBOEIsS0FBTyxDQUFDLENBQUM7YUFDM0Y7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBMaXRlcmFsQXJyYXlFeHByLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZSwgbWFrZUJpbmRpbmdQYXJzZXIsIHBhcnNlVGVtcGxhdGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtSZWZlcmVuY2UsIFJlc29sdmVkVmFsdWUsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZSwgcmVmZXJlbmNlVG9FeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGE7XG59XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgIGRlY29yYXRvciA9PiBkZWNvcmF0b3IubmFtZSA9PT0gJ05nTW9kdWxlJyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBOZ01vZHVsZSBkZWNvcmF0b3JgKTtcbiAgICB9XG5cbiAgICAvLyBATmdNb2R1bGUgY2FuIGJlIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMuIEluIGNhc2UgaXQgaXMsIHByZXRlbmQgYXMgaWYgYSBibGFuayBvYmplY3RcbiAgICAvLyBsaXRlcmFsIHdhcyBzcGVjaWZpZWQuIFRoaXMgc2ltcGxpZmllcyB0aGUgY29kZSBiZWxvdy5cbiAgICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxID8gZGVjb3JhdG9yLmFyZ3NbMF0gOiB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKFtdKTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgICBkZWNsYXJhdGlvbnMgPSByZXNvbHZlVHlwZUxpc3QoZGVjbGFyYXRpb25NZXRhLCAnZGVjbGFyYXRpb25zJyk7XG4gICAgfVxuICAgIGxldCBpbXBvcnRzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgY29uc3QgaW1wb3J0c01ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaW1wb3J0cyA9IHJlc29sdmVUeXBlTGlzdChpbXBvcnRzTWV0YSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydHM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKG5nTW9kdWxlLmdldCgnZXhwb3J0cycpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgICBleHBvcnRzID0gcmVzb2x2ZVR5cGVMaXN0KGV4cG9ydHNNZXRhLCAnZXhwb3J0cycpO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdCBkdXJpbmdcbiAgICAvLyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZSBjb21wdXRhdGlvbi5cbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJNb2R1bGUobm9kZSwge2RlY2xhcmF0aW9ucywgaW1wb3J0cywgZXhwb3J0c30pO1xuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgY29uc3QgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgYm9vdHN0cmFwOiBbXSxcbiAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLm1hcChkZWNsID0+IHJlZmVyZW5jZVRvRXhwcmVzc2lvbihkZWNsLCBjb250ZXh0KSksXG4gICAgICBleHBvcnRzOiBleHBvcnRzLm1hcChleHAgPT4gcmVmZXJlbmNlVG9FeHByZXNzaW9uKGV4cCwgY29udGV4dCkpLFxuICAgICAgaW1wb3J0czogaW1wb3J0cy5tYXAoaW1wID0+IHJlZmVyZW5jZVRvRXhwcmVzc2lvbihpbXAsIGNvbnRleHQpKSxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgIH07XG5cbiAgICBjb25zdCBwcm92aWRlcnM6IEV4cHJlc3Npb24gPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ3Byb3ZpZGVycycpICEpIDpcbiAgICAgICAgbmV3IExpdGVyYWxBcnJheUV4cHIoW10pO1xuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgZGVwczogZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogbmV3IExpdGVyYWxBcnJheUV4cHIoXG4gICAgICAgICAgWy4uLmltcG9ydHMsIC4uLmV4cG9ydHNdLm1hcChpbXAgPT4gcmVmZXJlbmNlVG9FeHByZXNzaW9uKGltcCwgY29udGV4dCkpKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgICAgbmdNb2R1bGVEZWYsIG5nSW5qZWN0b3JEZWYsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKGFuYWx5c2lzLm5nSW5qZWN0b3JEZWYpO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm5nTW9kdWxlRGVmKTtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdNb2R1bGVEZWYnLFxuICAgICAgICBpbml0aWFsaXplcjogbmdNb2R1bGVEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdJbmplY3RvckRlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlOiBuZ0luamVjdG9yRGVmLnR5cGUsXG4gICAgICB9LFxuICAgIF07XG4gIH1cbn1cblxuLyoqXG4gKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICovXG5mdW5jdGlvbiByZXNvbHZlVHlwZUxpc3QocmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBuYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2VbXSB7XG4gIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZVtdID0gW107XG4gIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZExpc3QpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgcHJvcGVydHkgJHtuYW1lfWApO1xuICB9XG5cbiAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAvLyBVbndyYXAgTW9kdWxlV2l0aFByb3ZpZGVycyBmb3IgbW9kdWxlcyB0aGF0IGFyZSBsb2NhbGx5IGRlY2xhcmVkIChhbmQgdGh1cyBzdGF0aWMgcmVzb2x1dGlvblxuICAgIC8vIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgIGVudHJ5ID0gZW50cnkuZ2V0KCduZ01vZHVsZScpICE7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgIHJlZkxpc3QucHVzaCguLi5yZXNvbHZlVHlwZUxpc3QoZW50cnksIG5hbWUpKTtcbiAgICB9IGVsc2UgaWYgKGVudHJ5IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBpZiAoIWVudHJ5LmV4cHJlc3NhYmxlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluICR7bmFtZX0gYXJyYXkgaXMgbm90IGV4cHJlc3NhYmxlYCk7XG4gICAgICB9IGVsc2UgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZW50cnkubm9kZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gJHtuYW1lfSBhcnJheSBpcyBub3QgYSBjbGFzcyBkZWNsYXJhdGlvbmApO1xuICAgICAgfVxuICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBleHBhbmQgTW9kdWxlV2l0aFByb3ZpZGVycy5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluICR7bmFtZX0gYXJyYXkgaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlZkxpc3Q7XG59XG4iXX0=