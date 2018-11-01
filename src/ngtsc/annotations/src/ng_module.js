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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var metadata_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, decorator.node, "Incorrect number of arguments to @NgModule decorator");
            }
            // @NgModule can be invoked without arguments. In case it is, pretend as if a blank object
            // literal was specified. This simplifies the code below.
            var meta = decorator.args.length === 1 ? util_1.unwrapExpression(decorator.args[0]) :
                ts.createObjectLiteral([]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, '@NgModule argument must be an object literal');
            }
            var ngModule = metadata_1.reflectObjectLiteral(meta);
            if (ngModule.has('jit')) {
                // The only allowed value is true, so there's no need to expand further.
                return {};
            }
            // Extract the module declarations, imports, and exports.
            var declarations = [];
            if (ngModule.has('declarations')) {
                var expr = ngModule.get('declarations');
                var declarationMeta = metadata_1.staticallyResolve(expr, this.reflector, this.checker);
                declarations = this.resolveTypeList(expr, declarationMeta, 'declarations');
            }
            var imports = [];
            if (ngModule.has('imports')) {
                var expr = ngModule.get('imports');
                var importsMeta = metadata_1.staticallyResolve(expr, this.reflector, this.checker, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                imports = this.resolveTypeList(expr, importsMeta, 'imports');
            }
            var exports = [];
            if (ngModule.has('exports')) {
                var expr = ngModule.get('exports');
                var exportsMeta = metadata_1.staticallyResolve(expr, this.reflector, this.checker, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                exports = this.resolveTypeList(expr, exportsMeta, 'exports');
            }
            var bootstrap = [];
            if (ngModule.has('bootstrap')) {
                var expr = ngModule.get('bootstrap');
                var bootstrapMeta = metadata_1.staticallyResolve(expr, this.reflector, this.checker);
                bootstrap = this.resolveTypeList(expr, bootstrapMeta, 'bootstrap');
            }
            // Register this module's information with the SelectorScopeRegistry. This ensures that during
            // the compile() phase, the module's metadata is available for selector scope computation.
            this.scopeRegistry.registerModule(node, { declarations: declarations, imports: imports, exports: exports });
            var context = node.getSourceFile();
            var ngModuleDef = {
                type: new compiler_1.WrappedNodeExpr(node.name),
                bootstrap: bootstrap.map(function (bootstrap) { return util_1.toR3Reference(bootstrap, context); }),
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
                    ngModuleDef: ngModuleDef,
                    ngInjectorDef: ngInjectorDef,
                    metadataStmt: metadata_2.generateSetClassMetadataCall(node, this.reflector, this.isCore),
                },
                factorySymbolName: node.name !== undefined ? node.name.text : undefined,
            };
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis) {
            var ngInjectorDef = compiler_1.compileInjector(analysis.ngInjectorDef);
            var ngModuleDef = compiler_1.compileNgModule(analysis.ngModuleDef);
            var ngModuleStatements = ngModuleDef.additionalStatements;
            if (analysis.metadataStmt !== null) {
                ngModuleStatements.push(analysis.metadataStmt);
            }
            return [
                {
                    name: 'ngModuleDef',
                    initializer: ngModuleDef.expression,
                    statements: ngModuleStatements,
                    type: ngModuleDef.type,
                },
                {
                    name: 'ngInjectorDef',
                    initializer: ngInjectorDef.expression,
                    statements: ngInjectorDef.statements,
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
        NgModuleDecoratorHandler.prototype.resolveTypeList = function (expr, resolvedList, name) {
            var _this = this;
            var refList = [];
            if (!Array.isArray(resolvedList)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "Expected array when reading property " + name);
            }
            resolvedList.forEach(function (entry, idx) {
                // Unwrap ModuleWithProviders for modules that are locally declared (and thus static
                // resolution was able to descend into the function and return an object literal, a Map).
                if (entry instanceof Map && entry.has('ngModule')) {
                    entry = entry.get('ngModule');
                }
                if (Array.isArray(entry)) {
                    // Recurse into nested arrays.
                    refList.push.apply(refList, tslib_1.__spread(_this.resolveTypeList(expr, entry, name)));
                }
                else if (isDeclarationReference(entry)) {
                    if (!entry.expressable) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "One entry in " + name + " is not a type");
                    }
                    else if (!_this.reflector.isClass(entry.node)) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, entry.node, "Entry is not a type, but is used as such in " + name + " array");
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
    function isDeclarationReference(ref) {
        return ref instanceof metadata_1.Reference &&
            (ts.isClassDeclaration(ref.node) || ts.isFunctionDeclaration(ref.node) ||
                ts.isVariableDeclaration(ref.node));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUEwTztJQUMxTywrQkFBaUM7SUFFakMsMkVBQWtFO0lBRWxFLHFFQUFpRztJQUdqRyxxRkFBd0Q7SUFFeEQsNkVBQWtHO0lBUWxHOzs7O09BSUc7SUFDSDtRQUNFLGtDQUNZLE9BQXVCLEVBQVUsU0FBeUIsRUFDMUQsYUFBb0MsRUFBVSxNQUFlO1lBRDdELFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFDMUQsa0JBQWEsR0FBYixhQUFhLENBQXVCO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUFHLENBQUM7UUFFN0UseUNBQU0sR0FBTixVQUFPLElBQW9CLEVBQUUsVUFBNEI7WUFBekQsaUJBTUM7WUFMQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLENBQUMsS0FBSSxDQUFDLE1BQU0sSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTFFLENBQTBFLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsMENBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsU0FBb0I7WUFBdkQsaUJBZ0dDO1lBL0ZDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUN4RCxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFT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ck5ZLDREQUF3QjtJQXVOckMsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRO1FBQ3RDLE9BQU8sR0FBRyxZQUFZLG9CQUFTO1lBQzNCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDckUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBMaXRlcmFsQXJyYXlFeHByLCBSM0RpcmVjdGl2ZU1ldGFkYXRhLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlLCBtYWtlQmluZGluZ1BhcnNlciwgcGFyc2VUZW1wbGF0ZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7UmVmZXJlbmNlLCBSZXNvbHZlZFZhbHVlLCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgc3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlLCB0b1IzUmVmZXJlbmNlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG59XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxOZ01vZHVsZUFuYWx5c2lzLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4pIHt9XG5cbiAgZGV0ZWN0KG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVjb3JhdG9ycy5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdOZ01vZHVsZScgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PE5nTW9kdWxlQW5hbHlzaXM+IHtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdkZWNsYXJhdGlvbnMnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykgITtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YSA9IHN0YXRpY2FsbHlSZXNvbHZlKGV4cHIsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgZGVjbGFyYXRpb25zID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZGVjbGFyYXRpb25NZXRhLCAnZGVjbGFyYXRpb25zJyk7XG4gICAgfVxuICAgIGxldCBpbXBvcnRzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhO1xuICAgICAgY29uc3QgaW1wb3J0c01ldGEgPSBzdGF0aWNhbGx5UmVzb2x2ZShcbiAgICAgICAgICBleHByLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyLFxuICAgICAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSkpO1xuICAgICAgaW1wb3J0cyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGltcG9ydHNNZXRhLCAnaW1wb3J0cycpO1xuICAgIH1cbiAgICBsZXQgZXhwb3J0czogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgITtcbiAgICAgIGNvbnN0IGV4cG9ydHNNZXRhID0gc3RhdGljYWxseVJlc29sdmUoXG4gICAgICAgICAgZXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcixcbiAgICAgICAgICByZWYgPT4gdGhpcy5fZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4ocmVmLm5vZGUpKTtcbiAgICAgIGV4cG9ydHMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBleHBvcnRzTWV0YSwgJ2V4cG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGJvb3RzdHJhcDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnYm9vdHN0cmFwJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2Jvb3RzdHJhcCcpICE7XG4gICAgICBjb25zdCBib290c3RyYXBNZXRhID0gc3RhdGljYWxseVJlc29sdmUoZXhwciwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuY2hlY2tlcik7XG4gICAgICBib290c3RyYXAgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBib290c3RyYXBNZXRhLCAnYm9vdHN0cmFwJyk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0IGR1cmluZ1xuICAgIC8vIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3Rlck1vZHVsZShub2RlLCB7ZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBleHBvcnRzfSk7XG5cbiAgICBjb25zdCBjb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBjb25zdCBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihub2RlLm5hbWUgISksXG4gICAgICBib290c3RyYXA6IGJvb3RzdHJhcC5tYXAoYm9vdHN0cmFwID0+IHRvUjNSZWZlcmVuY2UoYm9vdHN0cmFwLCBjb250ZXh0KSksXG4gICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucy5tYXAoZGVjbCA9PiB0b1IzUmVmZXJlbmNlKGRlY2wsIGNvbnRleHQpKSxcbiAgICAgIGV4cG9ydHM6IGV4cG9ydHMubWFwKGV4cCA9PiB0b1IzUmVmZXJlbmNlKGV4cCwgY29udGV4dCkpLFxuICAgICAgaW1wb3J0czogaW1wb3J0cy5tYXAoaW1wID0+IHRvUjNSZWZlcmVuY2UoaW1wLCBjb250ZXh0KSksXG4gICAgICBlbWl0SW5saW5lOiBmYWxzZSxcbiAgICB9O1xuXG4gICAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9uID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG5ldyBMaXRlcmFsQXJyYXlFeHByKFtdKTtcblxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWY6IFIzSW5qZWN0b3JNZXRhZGF0YSA9IHtcbiAgICAgIG5hbWU6IG5vZGUubmFtZSAhLnRleHQsXG4gICAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUubmFtZSAhKSxcbiAgICAgIGRlcHM6IGdldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSksIHByb3ZpZGVycyxcbiAgICAgIGltcG9ydHM6IG5ldyBMaXRlcmFsQXJyYXlFeHByKGluamVjdG9ySW1wb3J0cyksXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBuZ01vZHVsZURlZixcbiAgICAgICAgbmdJbmplY3RvckRlZixcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmlzQ29yZSksXG4gICAgICB9LFxuICAgICAgZmFjdG9yeVN5bWJvbE5hbWU6IG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkID8gbm9kZS5uYW1lLnRleHQgOiB1bmRlZmluZWQsXG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3IoYW5hbHlzaXMubmdJbmplY3RvckRlZik7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUoYW5hbHlzaXMubmdNb2R1bGVEZWYpO1xuICAgIGNvbnN0IG5nTW9kdWxlU3RhdGVtZW50cyA9IG5nTW9kdWxlRGVmLmFkZGl0aW9uYWxTdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICduZ01vZHVsZURlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ01vZHVsZVN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdJbmplY3RvckRlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nSW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdJbmplY3RvckRlZi50eXBlLFxuICAgICAgfSxcbiAgICBdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgYEZ1bmN0aW9uRGVjbGFyYXRpb25gIG9yIGBNZXRob2REZWNsYXJhdGlvbmAsIGNoZWNrIGlmIGl0IGlzIHR5cGVkIGFzIGFcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCB0eXBlID0gbm9kZS50eXBlO1xuICAgIC8vIEV4YW1pbmUgdGhlIHR5cGUgb2YgdGhlIGZ1bmN0aW9uIHRvIHNlZSBpZiBpdCdzIGEgTW9kdWxlV2l0aFByb3ZpZGVycyByZWZlcmVuY2UuXG4gICAgaWYgKHR5cGUgPT09IHVuZGVmaW5lZCB8fCAhdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSB8fCAhdHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgLy8gSWYgdGhlIGFyZ3VtZW50IGlzbid0IGFuIElkZW50aWZpZXIsIGJhaWwuXG4gICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGFyZykgfHwgIXRzLmlzSWRlbnRpZmllcihhcmcudHlwZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gYXJnLnR5cGVOYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGUgYSBsaXN0IG9mIGBSZWZlcmVuY2VgcyBmcm9tIGEgcmVzb2x2ZWQgbWV0YWRhdGEgdmFsdWUuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVUeXBlTGlzdChleHByOiB0cy5Ob2RlLCByZXNvbHZlZExpc3Q6IFJlc29sdmVkVmFsdWUsIG5hbWU6IHN0cmluZyk6XG4gICAgICBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZExpc3QpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLCBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHByb3BlcnR5ICR7bmFtZX1gKTtcbiAgICB9XG5cbiAgICByZXNvbHZlZExpc3QuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4ge1xuICAgICAgLy8gVW53cmFwIE1vZHVsZVdpdGhQcm92aWRlcnMgZm9yIG1vZHVsZXMgdGhhdCBhcmUgbG9jYWxseSBkZWNsYXJlZCAoYW5kIHRodXMgc3RhdGljXG4gICAgICAvLyByZXNvbHV0aW9uIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTWFwICYmIGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICBlbnRyeSA9IGVudHJ5LmdldCgnbmdNb2R1bGUnKSAhO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgICAgLy8gUmVjdXJzZSBpbnRvIG5lc3RlZCBhcnJheXMuXG4gICAgICAgIHJlZkxpc3QucHVzaCguLi50aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBlbnRyeSwgbmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICBpZiAoIWVudHJ5LmV4cHJlc3NhYmxlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsIGBPbmUgZW50cnkgaW4gJHtuYW1lfSBpcyBub3QgYSB0eXBlYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMucmVmbGVjdG9yLmlzQ2xhc3MoZW50cnkubm9kZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZW50cnkubm9kZSxcbiAgICAgICAgICAgICAgYEVudHJ5IGlzIG5vdCBhIHR5cGUsIGJ1dCBpcyB1c2VkIGFzIHN1Y2ggaW4gJHtuYW1lfSBhcnJheWApO1xuICAgICAgICB9XG4gICAgICAgIHJlZkxpc3QucHVzaChlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IGV4cGFuZCBNb2R1bGVXaXRoUHJvdmlkZXJzLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiAke25hbWV9IGFycmF5IGlzIG5vdCBhIHJlZmVyZW5jZTogJHtlbnRyeX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZWZMaXN0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBhbnkpOiByZWYgaXMgUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPiB7XG4gIHJldHVybiByZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UgJiZcbiAgICAgICh0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8IHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihyZWYubm9kZSkgfHxcbiAgICAgICB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24ocmVmLm5vZGUpKTtcbn1cbiJdfQ==