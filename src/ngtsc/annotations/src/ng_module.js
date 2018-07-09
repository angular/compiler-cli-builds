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
            return decorators.find(function (decorator) { return decorator.name === 'NgModule' && decorator.from === '@angular/core'; });
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF3SztJQUN4SywrQkFBaUM7SUFFakMscUVBQTRHO0lBSTVHLDZFQUE2QztJQUU3Qzs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FBb0IsT0FBdUIsRUFBVSxhQUFvQztZQUFyRSxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtRQUFHLENBQUM7UUFFN0YseUNBQU0sR0FBTixVQUFPLFVBQXVCO1lBQzVCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBbkUsQ0FBbUUsQ0FBQyxDQUFDO1FBQ3hGLENBQUM7UUFFRCwwQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxTQUFvQjtZQUNyRCxJQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQzthQUN4RDtZQUNELElBQU0sUUFBUSxHQUFHLCtCQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTVDLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDdkIsd0VBQXdFO2dCQUN4RSxPQUFPLEVBQUUsQ0FBQzthQUNYO1lBRUQseURBQXlEO1lBQ3pELElBQUksWUFBWSxHQUFnQixF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WUFDOUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN4Qiw4QkFBOEI7Z0JBQzlCLE9BQU8sQ0FBQyxJQUFJLE9BQVosT0FBTyxtQkFBUyxlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFFO2FBQy9DO2lCQUFNLElBQUksS0FBSyxZQUFZLG9CQUFTLEVBQUU7Z0JBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFO29CQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLHVCQUFxQixHQUFHLFlBQU8sSUFBSSw4QkFBMkIsQ0FBQyxDQUFDO2lCQUNqRjtxQkFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBcUIsR0FBRyxZQUFPLElBQUksc0NBQW1DLENBQUMsQ0FBQztpQkFDekY7Z0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNyQjtpQkFBTTtnQkFDTCw0Q0FBNEM7Z0JBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXFCLEdBQUcsWUFBTyxJQUFJLDhCQUEyQixDQUFDLENBQUM7YUFDakY7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZU5nTW9kdWxlLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZlcmVuY2UsIFJlc29sdmVkVmFsdWUsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtyZWZlcmVuY2VUb0V4cHJlc3Npb259IGZyb20gJy4vdXRpbCc7XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM05nTW9kdWxlTWV0YWRhdGE+IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnkpIHt9XG5cbiAgZGV0ZWN0KGRlY29yYXRvcnM6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnTmdNb2R1bGUnICYmIGRlY29yYXRvci5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzTmdNb2R1bGVNZXRhZGF0YT4ge1xuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgICBkZWNsYXJhdGlvbnMgPSByZXNvbHZlVHlwZUxpc3QoZGVjbGFyYXRpb25NZXRhLCAnZGVjbGFyYXRpb25zJyk7XG4gICAgfVxuICAgIGxldCBpbXBvcnRzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgY29uc3QgaW1wb3J0c01ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaW1wb3J0cyA9IHJlc29sdmVUeXBlTGlzdChpbXBvcnRzTWV0YSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydHM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKG5nTW9kdWxlLmdldCgnZXhwb3J0cycpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgICBleHBvcnRzID0gcmVzb2x2ZVR5cGVMaXN0KGV4cG9ydHNNZXRhLCAnZXhwb3J0cycpO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdCBkdXJpbmdcbiAgICAvLyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZSBjb21wdXRhdGlvbi5cbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJNb2R1bGUobm9kZSwge2RlY2xhcmF0aW9ucywgaW1wb3J0cywgZXhwb3J0c30pO1xuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgICBib290c3RyYXA6IFtdLFxuICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucy5tYXAoZGVjbCA9PiByZWZlcmVuY2VUb0V4cHJlc3Npb24oZGVjbCwgY29udGV4dCkpLFxuICAgICAgICBleHBvcnRzOiBleHBvcnRzLm1hcChleHAgPT4gcmVmZXJlbmNlVG9FeHByZXNzaW9uKGV4cCwgY29udGV4dCkpLFxuICAgICAgICBpbXBvcnRzOiBpbXBvcnRzLm1hcChpbXAgPT4gcmVmZXJlbmNlVG9FeHByZXNzaW9uKGltcCwgY29udGV4dCkpLFxuICAgICAgICBlbWl0SW5saW5lOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFIzTmdNb2R1bGVNZXRhZGF0YSk6IENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHJlcyA9IGNvbXBpbGVOZ01vZHVsZShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGZpZWxkOiAnbmdNb2R1bGVEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVR5cGVMaXN0KHJlc29sdmVkTGlzdDogUmVzb2x2ZWRWYWx1ZSwgbmFtZTogc3RyaW5nKTogUmVmZXJlbmNlW10ge1xuICBjb25zdCByZWZMaXN0OiBSZWZlcmVuY2VbXSA9IFtdO1xuICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHByb3BlcnR5ICR7bmFtZX1gKTtcbiAgfVxuXG4gIHJlc29sdmVkTGlzdC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgIHJlZkxpc3QucHVzaCguLi5yZXNvbHZlVHlwZUxpc3QoZW50cnksIG5hbWUpKTtcbiAgICB9IGVsc2UgaWYgKGVudHJ5IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICBpZiAoIWVudHJ5LmV4cHJlc3NhYmxlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluICR7bmFtZX0gYXJyYXkgaXMgbm90IGV4cHJlc3NhYmxlYCk7XG4gICAgICB9IGVsc2UgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24oZW50cnkubm9kZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gJHtuYW1lfSBhcnJheSBpcyBub3QgYSBjbGFzcyBkZWNsYXJhdGlvbmApO1xuICAgICAgfVxuICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBleHBhbmQgTW9kdWxlV2l0aFByb3ZpZGVycy5cbiAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluICR7bmFtZX0gYXJyYXkgaXMgbm90IGEgcmVmZXJlbmNlYCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVmTGlzdDtcbn1cbiJdfQ==