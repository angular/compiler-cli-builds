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
        NgModuleDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (!decorators) {
                return undefined;
            }
            return decorators.find(function (decorator) { return decorator.name === 'NgModule' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            var _this = this;
            if (decorator.args === null || decorator.args.length > 1) {
                throw new Error("Incorrect number of arguments to @NgModule decorator");
            }
            // @NgModule can be invoked without arguments. In case it is, pretend as if a blank object
            // literal was specified. This simplifies the code below.
            var meta = decorator.args.length === 1 ? util_1.unwrapExpression(decorator.args[0]) :
                ts.createObjectLiteral([]);
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
                var declarationMeta = metadata_1.staticallyResolve(ngModule.get('declarations'), this.reflector, this.checker);
                declarations = this.resolveTypeList(declarationMeta, 'declarations');
            }
            var imports = [];
            if (ngModule.has('imports')) {
                var importsMeta = metadata_1.staticallyResolve(ngModule.get('imports'), this.reflector, this.checker, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                imports = this.resolveTypeList(importsMeta, 'imports');
            }
            var exports = [];
            if (ngModule.has('exports')) {
                var exportsMeta = metadata_1.staticallyResolve(ngModule.get('exports'), this.reflector, this.checker, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                exports = this.resolveTypeList(exportsMeta, 'exports');
            }
            // Register this module's information with the SelectorScopeRegistry. This ensures that during
            // the compile() phase, the module's metadata is available for selector scope computation.
            this.scopeRegistry.registerModule(node, { declarations: declarations, imports: imports, exports: exports });
            var context = node.getSourceFile();
            var ngModuleDef = {
                type: new compiler_1.WrappedNodeExpr(node.name),
                bootstrap: [],
                declarations: declarations.map(function (decl) { return util_1.toR3Reference(decl, context); }),
                exports: exports.map(function (exp) { return util_1.toR3Reference(exp, context); }),
                imports: imports.map(function (imp) { return util_1.toR3Reference(imp, context); }),
                emitInline: false,
            };
            var providers = ngModule.has('providers') ?
                new compiler_1.WrappedNodeExpr(ngModule.get('providers')) :
                new compiler_1.LiteralArrayExpr([]);
            var injectorImports = [];
            if (ngModule.has('imports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('imports')));
            }
            if (ngModule.has('exports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('exports')));
            }
            var ngInjectorDef = {
                name: node.name.text,
                type: new compiler_1.WrappedNodeExpr(node.name),
                deps: util_1.getConstructorDependencies(node, this.reflector, this.isCore), providers: providers,
                imports: new compiler_1.LiteralArrayExpr(injectorImports),
            };
            return {
                analysis: {
                    ngModuleDef: ngModuleDef, ngInjectorDef: ngInjectorDef,
                },
                factorySymbolName: node.name !== undefined ? node.name.text : undefined,
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
        /**
         * Given a `FunctionDeclaration` or `MethodDeclaration`, check if it is typed as a
         * `ModuleWithProviders` and return an expression referencing the module if available.
         */
        NgModuleDecoratorHandler.prototype._extractModuleFromModuleWithProvidersFn = function (node) {
            var type = node.type;
            // Examine the type of the function to see if it's a ModuleWithProviders reference.
            if (type === undefined || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) {
                return null;
            }
            // Look at the type itself to see where it comes from.
            var id = this.reflector.getImportOfIdentifier(type.typeName);
            // If it's not named ModuleWithProviders, bail.
            if (id === null || id.name !== 'ModuleWithProviders') {
                return null;
            }
            // If it's not from @angular/core, bail.
            if (!this.isCore && id.from !== '@angular/core') {
                return null;
            }
            // If there's no type parameter specified, bail.
            if (type.typeArguments === undefined || type.typeArguments.length !== 1) {
                return null;
            }
            var arg = type.typeArguments[0];
            // If the argument isn't an Identifier, bail.
            if (!ts.isTypeReferenceNode(arg) || !ts.isIdentifier(arg.typeName)) {
                return null;
            }
            return arg.typeName;
        };
        /**
         * Compute a list of `Reference`s from a resolved metadata value.
         */
        NgModuleDecoratorHandler.prototype.resolveTypeList = function (resolvedList, name) {
            var _this = this;
            var refList = [];
            if (!Array.isArray(resolvedList)) {
                throw new Error("Expected array when reading property " + name);
            }
            resolvedList.forEach(function (entry, idx) {
                // Unwrap ModuleWithProviders for modules that are locally declared (and thus static
                // resolution was able to descend into the function and return an object literal, a Map).
                if (entry instanceof Map && entry.has('ngModule')) {
                    entry = entry.get('ngModule');
                }
                if (Array.isArray(entry)) {
                    // Recurse into nested arrays.
                    refList.push.apply(refList, tslib_1.__spread(_this.resolveTypeList(entry, name)));
                }
                else if (entry instanceof metadata_1.Reference) {
                    if (!entry.expressable) {
                        throw new Error("Value at position " + idx + " in " + name + " array is not expressable");
                    }
                    else if (!_this.reflector.isClass(entry.node)) {
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
        };
        return NgModuleDecoratorHandler;
    }());
    exports.NgModuleDecoratorHandler = NgModuleDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUErTjtJQUMvTiwrQkFBaUM7SUFHakMscUVBQWlHO0lBSWpHLDZFQUFrRztJQU9sRzs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZTtZQUQ3RCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7UUFBRyxDQUFDO1FBRTdFLHlDQUFNLEdBQU4sVUFBTyxJQUFvQixFQUFFLFVBQTRCO1lBQXpELGlCQU1DO1lBTEMsSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDZixPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUExRSxDQUEwRSxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVELDBDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQXZELGlCQWtGQztZQWpGQyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDeEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO2FBQ3pFO1lBRUQsMEZBQTBG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QUM5QixvRkFBb0Y7Z0JBQ3BGLHlGQUF5RjtnQkFDekYsSUFBSSxLQUFLLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2pELEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDO2lCQUNqQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3hCLDhCQUE4QjtvQkFDOUIsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFFO2lCQUNwRDtxQkFBTSxJQUFJLEtBQUssWUFBWSxvQkFBUyxFQUFFO29CQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRTt3QkFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBcUIsR0FBRyxZQUFPLElBQUksOEJBQTJCLENBQUMsQ0FBQztxQkFDakY7eUJBQU0sSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBcUIsR0FBRyxZQUFPLElBQUksc0NBQW1DLENBQUMsQ0FBQztxQkFDekY7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckI7cUJBQU07b0JBQ0wsNENBQTRDO29CQUM1QyxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUFxQixHQUFHLFlBQU8sSUFBSSxtQ0FBOEIsS0FBTyxDQUFDLENBQUM7aUJBQzNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBQ0gsK0JBQUM7SUFBRCxDQUFDLEFBOUxELElBOExDO0lBOUxZLDREQUF3QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIExpdGVyYWxBcnJheUV4cHIsIFIzRGlyZWN0aXZlTWV0YWRhdGEsIFIzSW5qZWN0b3JNZXRhZGF0YSwgUjNOZ01vZHVsZU1ldGFkYXRhLCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge1JlZmVyZW5jZSwgUmVzb2x2ZWRWYWx1ZSwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHN0YXRpY2FsbHlSZXNvbHZlfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB0b1IzUmVmZXJlbmNlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGE7XG59XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxOZ01vZHVsZUFuYWx5c2lzLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdOZ01vZHVsZScgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PE5nTW9kdWxlQW5hbHlzaXM+IHtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPVxuICAgICAgICAgIHN0YXRpY2FsbHlSZXNvbHZlKG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykgISwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBkZWNsYXJhdGlvbnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChkZWNsYXJhdGlvbk1ldGEsICdkZWNsYXJhdGlvbnMnKTtcbiAgICB9XG4gICAgbGV0IGltcG9ydHM6IFJlZmVyZW5jZVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKFxuICAgICAgICAgIG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIsXG4gICAgICAgICAgcmVmID0+IHRoaXMuX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKHJlZi5ub2RlKSk7XG4gICAgICBpbXBvcnRzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoaW1wb3J0c01ldGEsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRzOiBSZWZlcmVuY2VbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShcbiAgICAgICAgICBuZ01vZHVsZS5nZXQoJ2V4cG9ydHMnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyLFxuICAgICAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSkpO1xuICAgICAgZXhwb3J0cyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cG9ydHNNZXRhLCAnZXhwb3J0cycpO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdCBkdXJpbmdcbiAgICAvLyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZSBjb21wdXRhdGlvbi5cbiAgICB0aGlzLnNjb3BlUmVnaXN0cnkucmVnaXN0ZXJNb2R1bGUobm9kZSwge2RlY2xhcmF0aW9ucywgaW1wb3J0cywgZXhwb3J0c30pO1xuXG4gICAgY29uc3QgY29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgY29uc3QgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgYm9vdHN0cmFwOiBbXSxcbiAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLm1hcChkZWNsID0+IHRvUjNSZWZlcmVuY2UoZGVjbCwgY29udGV4dCkpLFxuICAgICAgZXhwb3J0czogZXhwb3J0cy5tYXAoZXhwID0+IHRvUjNSZWZlcmVuY2UoZXhwLCBjb250ZXh0KSksXG4gICAgICBpbXBvcnRzOiBpbXBvcnRzLm1hcChpbXAgPT4gdG9SM1JlZmVyZW5jZShpbXAsIGNvbnRleHQpKSxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgIH07XG5cbiAgICBjb25zdCBwcm92aWRlcnM6IEV4cHJlc3Npb24gPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ3Byb3ZpZGVycycpICEpIDpcbiAgICAgICAgbmV3IExpdGVyYWxBcnJheUV4cHIoW10pO1xuXG4gICAgY29uc3QgaW5qZWN0b3JJbXBvcnRzOiBXcmFwcGVkTm9kZUV4cHI8dHMuRXhwcmVzc2lvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgaW5qZWN0b3JJbXBvcnRzLnB1c2gobmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhKSk7XG4gICAgfVxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgaW5qZWN0b3JJbXBvcnRzLnB1c2gobmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2V4cG9ydHMnKSAhKSk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgZGVwczogZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogbmV3IExpdGVyYWxBcnJheUV4cHIoaW5qZWN0b3JJbXBvcnRzKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgICAgbmdNb2R1bGVEZWYsIG5nSW5qZWN0b3JEZWYsXG4gICAgICB9LFxuICAgICAgZmFjdG9yeVN5bWJvbE5hbWU6IG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkID8gbm9kZS5uYW1lLnRleHQgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3IoYW5hbHlzaXMubmdJbmplY3RvckRlZik7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUoYW5hbHlzaXMubmdNb2R1bGVEZWYpO1xuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICduZ01vZHVsZURlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogbmdNb2R1bGVEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICduZ0luamVjdG9yRGVmJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nSW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IG5nSW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBGdW5jdGlvbkRlY2xhcmF0aW9uYCBvciBgTWV0aG9kRGVjbGFyYXRpb25gLCBjaGVjayBpZiBpdCBpcyB0eXBlZCBhcyBhXG4gICAqIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBhbmQgcmV0dXJuIGFuIGV4cHJlc3Npb24gcmVmZXJlbmNpbmcgdGhlIG1vZHVsZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBwcml2YXRlIF9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdHlwZSA9IG5vZGUudHlwZTtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICh0eXBlID09PSB1bmRlZmluZWQgfHwgIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZSkgfHwgIXRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTG9vayBhdCB0aGUgdHlwZSBpdHNlbGYgdG8gc2VlIHdoZXJlIGl0IGNvbWVzIGZyb20uXG4gICAgY29uc3QgaWQgPSB0aGlzLnJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZS50eXBlTmFtZSk7XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBuYW1lZCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBiYWlsLlxuICAgIGlmIChpZCA9PT0gbnVsbCB8fCBpZC5uYW1lICE9PSAnTW9kdWxlV2l0aFByb3ZpZGVycycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIGl0J3Mgbm90IGZyb20gQGFuZ3VsYXIvY29yZSwgYmFpbC5cbiAgICBpZiAoIXRoaXMuaXNDb3JlICYmIGlkLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBubyB0eXBlIHBhcmFtZXRlciBzcGVjaWZpZWQsIGJhaWwuXG4gICAgaWYgKHR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IHR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIC8vIElmIHRoZSBhcmd1bWVudCBpc24ndCBhbiBJZGVudGlmaWVyLCBiYWlsLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShhcmcpIHx8ICF0cy5pc0lkZW50aWZpZXIoYXJnLnR5cGVOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFyZy50eXBlTmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlVHlwZUxpc3QocmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBuYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2VbXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlW10gPSBbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgcHJvcGVydHkgJHtuYW1lfWApO1xuICAgIH1cblxuICAgIHJlc29sdmVkTGlzdC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7XG4gICAgICAvLyBVbndyYXAgTW9kdWxlV2l0aFByb3ZpZGVycyBmb3IgbW9kdWxlcyB0aGF0IGFyZSBsb2NhbGx5IGRlY2xhcmVkIChhbmQgdGh1cyBzdGF0aWNcbiAgICAgIC8vIHJlc29sdXRpb24gd2FzIGFibGUgdG8gZGVzY2VuZCBpbnRvIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIGFuIG9iamVjdCBsaXRlcmFsLCBhIE1hcCkuXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBNYXAgJiYgZW50cnkuaGFzKCduZ01vZHVsZScpKSB7XG4gICAgICAgIGVudHJ5ID0gZW50cnkuZ2V0KCduZ01vZHVsZScpICE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGVudHJ5LCBuYW1lKSk7XG4gICAgICB9IGVsc2UgaWYgKGVudHJ5IGluc3RhbmNlb2YgUmVmZXJlbmNlKSB7XG4gICAgICAgIGlmICghZW50cnkuZXhwcmVzc2FibGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiAke25hbWV9IGFycmF5IGlzIG5vdCBleHByZXNzYWJsZWApO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKGVudHJ5Lm5vZGUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gJHtuYW1lfSBhcnJheSBpcyBub3QgYSBjbGFzcyBkZWNsYXJhdGlvbmApO1xuICAgICAgICB9XG4gICAgICAgIHJlZkxpc3QucHVzaChlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IGV4cGFuZCBNb2R1bGVXaXRoUHJvdmlkZXJzLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiAke25hbWV9IGFycmF5IGlzIG5vdCBhIHJlZmVyZW5jZTogJHtlbnRyeX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZWZMaXN0O1xuICB9XG59XG4iXX0=