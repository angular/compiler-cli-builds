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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Compiles @NgModule annotations to ngModuleDef fields.
     *
     * TODO(alxhub): handle injector side of things as well.
     */
    var NgModuleDecoratorHandler = /** @class */ (function () {
        function NgModuleDecoratorHandler(reflector, evaluator, scopeRegistry, referencesRegistry, isCore, routeAnalyzer) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
            this.referencesRegistry = referencesRegistry;
            this.isCore = isCore;
            this.routeAnalyzer = routeAnalyzer;
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
            var _a;
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
            var ngModule = reflection_1.reflectObjectLiteral(meta);
            if (ngModule.has('jit')) {
                // The only allowed value is true, so there's no need to expand further.
                return {};
            }
            // Extract the module declarations, imports, and exports.
            var declarations = [];
            if (ngModule.has('declarations')) {
                var expr = ngModule.get('declarations');
                var declarationMeta = this.evaluator.evaluate(expr);
                declarations = this.resolveTypeList(expr, declarationMeta, 'declarations');
            }
            var imports = [];
            var rawImports = null;
            if (ngModule.has('imports')) {
                rawImports = ngModule.get('imports');
                var importsMeta = this.evaluator.evaluate(rawImports, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                imports = this.resolveTypeList(rawImports, importsMeta, 'imports');
            }
            var exports = [];
            var rawExports = null;
            if (ngModule.has('exports')) {
                rawExports = ngModule.get('exports');
                var exportsMeta = this.evaluator.evaluate(rawExports, function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); });
                exports = this.resolveTypeList(rawExports, exportsMeta, 'exports');
                (_a = this.referencesRegistry).add.apply(_a, tslib_1.__spread([node], exports));
            }
            var bootstrap = [];
            if (ngModule.has('bootstrap')) {
                var expr = ngModule.get('bootstrap');
                var bootstrapMeta = this.evaluator.evaluate(expr);
                bootstrap = this.resolveTypeList(expr, bootstrapMeta, 'bootstrap');
            }
            // Register this module's information with the SelectorScopeRegistry. This ensures that during
            // the compile() phase, the module's metadata is available for selector scope computation.
            this.scopeRegistry.registerModule(node, { declarations: declarations, imports: imports, exports: exports });
            var valueContext = node.getSourceFile();
            var typeContext = valueContext;
            var typeNode = this.reflector.getDtsDeclaration(node);
            if (typeNode !== null) {
                typeContext = typeNode.getSourceFile();
            }
            var ngModuleDef = {
                type: new compiler_1.WrappedNodeExpr(node.name),
                bootstrap: bootstrap.map(function (bootstrap) { return _this._toR3Reference(bootstrap, valueContext, typeContext); }),
                declarations: declarations.map(function (decl) { return _this._toR3Reference(decl, valueContext, typeContext); }),
                exports: exports.map(function (exp) { return _this._toR3Reference(exp, valueContext, typeContext); }),
                imports: imports.map(function (imp) { return _this._toR3Reference(imp, valueContext, typeContext); }),
                emitInline: false,
            };
            var providers = ngModule.has('providers') ?
                new compiler_1.WrappedNodeExpr(ngModule.get('providers')) :
                new compiler_1.LiteralArrayExpr([]);
            var rawProviders = ngModule.has('providers') ? ngModule.get('providers') : null;
            var injectorImports = [];
            if (ngModule.has('imports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('imports')));
            }
            if (ngModule.has('exports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('exports')));
            }
            if (this.routeAnalyzer !== null) {
                this.routeAnalyzer.add(node.getSourceFile(), node.name.text, rawImports, rawExports, rawProviders);
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
                    declarations: declarations,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.isCore),
                },
                factorySymbolName: node.name !== undefined ? node.name.text : undefined,
            };
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis) {
            var e_1, _a;
            var ngInjectorDef = compiler_1.compileInjector(analysis.ngInjectorDef);
            var ngModuleDef = compiler_1.compileNgModule(analysis.ngModuleDef);
            var ngModuleStatements = ngModuleDef.additionalStatements;
            if (analysis.metadataStmt !== null) {
                ngModuleStatements.push(analysis.metadataStmt);
            }
            var context = node.getSourceFile();
            var _loop_1 = function (decl) {
                if (this_1.scopeRegistry.requiresRemoteScope(decl.node)) {
                    var scope = this_1.scopeRegistry.lookupCompilationScopeAsRefs(decl.node);
                    if (scope === null) {
                        return "continue";
                    }
                    var directives_1 = [];
                    var pipes_1 = [];
                    scope.directives.forEach(function (directive, _) { directives_1.push(directive.ref.toExpression(context)); });
                    scope.pipes.forEach(function (pipe) { return pipes_1.push(pipe.toExpression(context)); });
                    var directiveArray = new compiler_1.LiteralArrayExpr(directives_1);
                    var pipesArray = new compiler_1.LiteralArrayExpr(pipes_1);
                    var declExpr = decl.toExpression(context);
                    var setComponentScope = new compiler_1.ExternalExpr(compiler_1.R3Identifiers.setComponentScope);
                    var callExpr = new compiler_1.InvokeFunctionExpr(setComponentScope, [declExpr, directiveArray, pipesArray]);
                    ngModuleStatements.push(callExpr.toStmt());
                }
            };
            var this_1 = this;
            try {
                for (var _b = tslib_1.__values(analysis.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    _loop_1(decl);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
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
        NgModuleDecoratorHandler.prototype._toR3Reference = function (valueRef, valueContext, typeContext) {
            if (!(valueRef instanceof imports_1.ResolvedReference)) {
                return util_1.toR3Reference(valueRef, valueRef, valueContext, valueContext);
            }
            else {
                var typeRef = valueRef;
                var typeNode = this.reflector.getDtsDeclaration(typeRef.node);
                if (typeNode !== null && ts.isClassDeclaration(typeNode)) {
                    typeRef = new imports_1.ResolvedReference(typeNode, typeNode.name);
                }
                return util_1.toR3Reference(valueRef, typeRef, valueContext, typeContext);
            }
        };
        /**
         * Given a `FunctionDeclaration`, `MethodDeclaration` or `FunctionExpression`, check if it is
         * typed as a `ModuleWithProviders` and return an expression referencing the module if available.
         */
        NgModuleDecoratorHandler.prototype._extractModuleFromModuleWithProvidersFn = function (node) {
            var type = node.type || null;
            return type &&
                (this._reflectModuleFromTypeParam(type) || this._reflectModuleFromLiteralType(type));
        };
        /**
         * Retrieve an `NgModule` identifier (T) from the specified `type`, if it is of the form:
         * `ModuleWithProviders<T>`
         * @param type The type to reflect on.
         * @returns the identifier of the NgModule type if found, or null otherwise.
         */
        NgModuleDecoratorHandler.prototype._reflectModuleFromTypeParam = function (type) {
            // Examine the type of the function to see if it's a ModuleWithProviders reference.
            if (!ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) {
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
            return reflection_1.typeNodeToValueExpr(arg);
        };
        /**
         * Retrieve an `NgModule` identifier (T) from the specified `type`, if it is of the form:
         * `A|B|{ngModule: T}|C`.
         * @param type The type to reflect on.
         * @returns the identifier of the NgModule type if found, or null otherwise.
         */
        NgModuleDecoratorHandler.prototype._reflectModuleFromLiteralType = function (type) {
            var e_2, _a, e_3, _b;
            if (!ts.isIntersectionTypeNode(type)) {
                return null;
            }
            try {
                for (var _c = tslib_1.__values(type.types), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var t = _d.value;
                    if (ts.isTypeLiteralNode(t)) {
                        try {
                            for (var _e = tslib_1.__values(t.members), _f = _e.next(); !_f.done; _f = _e.next()) {
                                var m = _f.value;
                                var ngModuleType = ts.isPropertySignature(m) && ts.isIdentifier(m.name) &&
                                    m.name.text === 'ngModule' && m.type ||
                                    null;
                                var ngModuleExpression = ngModuleType && reflection_1.typeNodeToValueExpr(ngModuleType);
                                if (ngModuleExpression) {
                                    return ngModuleExpression;
                                }
                            }
                        }
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
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
        return ref instanceof imports_1.Reference &&
            (ts.isClassDeclaration(ref.node) || ts.isFunctionDeclaration(ref.node) ||
                ts.isVariableDeclaration(ref.node));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFtTztJQUNuTywrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUEyRDtJQUUzRCx5RUFBc0c7SUFJdEcscUZBQXdEO0lBR3hELDZFQUFrRztJQVNsRzs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELGFBQW9DLEVBQVUsa0JBQXNDLEVBQ3BGLE1BQWUsRUFBVSxhQUF5QztZQUZsRSxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7WUFDcEYsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUFVLGtCQUFhLEdBQWIsYUFBYSxDQUE0QjtRQUFHLENBQUM7UUFFbEYseUNBQU0sR0FBTixVQUFPLElBQW9CLEVBQUUsVUFBNEI7WUFBekQsaUJBTUM7WUFMQyxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNsQixVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxJQUFJLENBQUMsS0FBSSxDQUFDLE1BQU0sSUFBSSxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTFFLENBQTBFLENBQUMsQ0FBQztRQUMvRixDQUFDO1FBRUQsMENBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsU0FBb0I7WUFBdkQsaUJBK0dDOztZQTlHQyxJQUFJLFNBQVMsQ0FB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QixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQzFDLGlEQUErQyxJQUFJLFdBQVEsQ0FBQyxDQUFDO3FCQUNsRTtvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNyQjtxQkFBTTtvQkFDTCw0Q0FBNEM7b0JBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXFCLEdBQUcsWUFBTyxJQUFJLG1DQUE4QixLQUFPLENBQUMsQ0FBQztpQkFDM0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUEzU0QsSUEyU0M7SUEzU1ksNERBQXdCO0lBNlNyQyxTQUFTLHNCQUFzQixDQUFDLEdBQVE7UUFDdEMsT0FBTyxHQUFHLFlBQVksbUJBQVM7WUFDM0IsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNyRSxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUluamVjdG9yLCBjb21waWxlTmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7UmVmZXJlbmNlLCBSZXNvbHZlZFJlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YTtcbiAgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXTtcbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogaGFuZGxlIGluamVjdG9yIHNpZGUgb2YgdGhpbmdzIGFzIHdlbGwuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPE5nTW9kdWxlQW5hbHlzaXMsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IFNlbGVjdG9yU2NvcGVSZWdpc3RyeSwgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLCBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsKSB7fVxuXG4gIGRldGVjdChub2RlOiB0cy5EZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRlY29yYXRvcnMuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnTmdNb2R1bGUnICYmICh0aGlzLmlzQ29yZSB8fCBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpKTtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQE5nTW9kdWxlIGRlY29yYXRvcmApO1xuICAgIH1cblxuICAgIC8vIEBOZ01vZHVsZSBjYW4gYmUgaW52b2tlZCB3aXRob3V0IGFyZ3VtZW50cy4gSW4gY2FzZSBpdCBpcywgcHJldGVuZCBhcyBpZiBhIGJsYW5rIG9iamVjdFxuICAgIC8vIGxpdGVyYWwgd2FzIHNwZWNpZmllZC4gVGhpcyBzaW1wbGlmaWVzIHRoZSBjb2RlIGJlbG93LlxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEgPyB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoW10pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsXG4gICAgICAgICAgJ0BOZ01vZHVsZSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gICAgfVxuICAgIGNvbnN0IG5nTW9kdWxlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdqaXQnKSkge1xuICAgICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCB0aGUgbW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMuXG4gICAgbGV0IGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICE7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByKTtcbiAgICAgIGRlY2xhcmF0aW9ucyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGRlY2xhcmF0aW9uTWV0YSwgJ2RlY2xhcmF0aW9ucycpO1xuICAgIH1cbiAgICBsZXQgaW1wb3J0czogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0ltcG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICByYXdJbXBvcnRzID0gbmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoXG4gICAgICAgICAgcmF3SW1wb3J0cywgcmVmID0+IHRoaXMuX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKHJlZi5ub2RlKSk7XG4gICAgICBpbXBvcnRzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3SW1wb3J0cywgaW1wb3J0c01ldGEsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRzOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3RXhwb3J0czogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIHJhd0V4cG9ydHMgPSBuZ01vZHVsZS5nZXQoJ2V4cG9ydHMnKSAhO1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShcbiAgICAgICAgICByYXdFeHBvcnRzLCByZWYgPT4gdGhpcy5fZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4ocmVmLm5vZGUpKTtcbiAgICAgIGV4cG9ydHMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdFeHBvcnRzLCBleHBvcnRzTWV0YSwgJ2V4cG9ydHMnKTtcbiAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChub2RlLCAuLi5leHBvcnRzKTtcbiAgICB9XG4gICAgbGV0IGJvb3RzdHJhcDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnYm9vdHN0cmFwJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2Jvb3RzdHJhcCcpICE7XG4gICAgICBjb25zdCBib290c3RyYXBNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwcik7XG4gICAgICBib290c3RyYXAgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBib290c3RyYXBNZXRhLCAnYm9vdHN0cmFwJyk7XG4gICAgfVxuXG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBTZWxlY3RvclNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0IGR1cmluZ1xuICAgIC8vIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3Rlck1vZHVsZShub2RlLCB7ZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBleHBvcnRzfSk7XG5cbiAgICBjb25zdCB2YWx1ZUNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgIGxldCB0eXBlQ29udGV4dCA9IHZhbHVlQ29udGV4dDtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmICh0eXBlTm9kZSAhPT0gbnVsbCkge1xuICAgICAgdHlwZUNvbnRleHQgPSB0eXBlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgYm9vdHN0cmFwOlxuICAgICAgICAgIGJvb3RzdHJhcC5tYXAoYm9vdHN0cmFwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoYm9vdHN0cmFwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSksXG4gICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKSxcbiAgICAgIGV4cG9ydHM6IGV4cG9ydHMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpLFxuICAgICAgaW1wb3J0czogaW1wb3J0cy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSksXG4gICAgICBlbWl0SW5saW5lOiBmYWxzZSxcbiAgICB9O1xuXG4gICAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9uID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG5ldyBMaXRlcmFsQXJyYXlFeHByKFtdKTtcbiAgICBjb25zdCByYXdQcm92aWRlcnMgPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID8gbmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhIDogbnVsbDtcblxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQoXG4gICAgICAgICAgbm9kZS5nZXRTb3VyY2VGaWxlKCksIG5vZGUubmFtZSAhLnRleHQsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZTogbm9kZS5uYW1lICEudGV4dCxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lICEpLFxuICAgICAgZGVwczogZ2V0Q29uc3RydWN0b3JEZXBlbmRlbmNpZXMobm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogbmV3IExpdGVyYWxBcnJheUV4cHIoaW5qZWN0b3JJbXBvcnRzKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG5nTW9kdWxlRGVmLFxuICAgICAgICBuZ0luamVjdG9yRGVmLFxuICAgICAgICBkZWNsYXJhdGlvbnMsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5pc0NvcmUpLFxuICAgICAgfSxcbiAgICAgIGZhY3RvcnlTeW1ib2xOYW1lOiBub2RlLm5hbWUgIT09IHVuZGVmaW5lZCA/IG5vZGUubmFtZS50ZXh0IDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKGFuYWx5c2lzLm5nSW5qZWN0b3JEZWYpO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm5nTW9kdWxlRGVmKTtcbiAgICBjb25zdCBuZ01vZHVsZVN0YXRlbWVudHMgPSBuZ01vZHVsZURlZi5hZGRpdGlvbmFsU3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgaWYgKHRoaXMuc2NvcGVSZWdpc3RyeS5yZXF1aXJlc1JlbW90ZVNjb3BlKGRlY2wubm9kZSkpIHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkubG9va3VwQ29tcGlsYXRpb25TY29wZUFzUmVmcyhkZWNsLm5vZGUpO1xuICAgICAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXJlY3RpdmVzOiBFeHByZXNzaW9uW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGlwZXM6IEV4cHJlc3Npb25bXSA9IFtdO1xuICAgICAgICBzY29wZS5kaXJlY3RpdmVzLmZvckVhY2goXG4gICAgICAgICAgICAoZGlyZWN0aXZlLCBfKSA9PiB7IGRpcmVjdGl2ZXMucHVzaChkaXJlY3RpdmUucmVmLnRvRXhwcmVzc2lvbihjb250ZXh0KSAhKTsgfSk7XG4gICAgICAgIHNjb3BlLnBpcGVzLmZvckVhY2gocGlwZSA9PiBwaXBlcy5wdXNoKHBpcGUudG9FeHByZXNzaW9uKGNvbnRleHQpICEpKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihkaXJlY3RpdmVzKTtcbiAgICAgICAgY29uc3QgcGlwZXNBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKHBpcGVzKTtcbiAgICAgICAgY29uc3QgZGVjbEV4cHIgPSBkZWNsLnRvRXhwcmVzc2lvbihjb250ZXh0KSAhO1xuICAgICAgICBjb25zdCBzZXRDb21wb25lbnRTY29wZSA9IG5ldyBFeHRlcm5hbEV4cHIoUjNJZGVudGlmaWVycy5zZXRDb21wb25lbnRTY29wZSk7XG4gICAgICAgIGNvbnN0IGNhbGxFeHByID1cbiAgICAgICAgICAgIG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoc2V0Q29tcG9uZW50U2NvcGUsIFtkZWNsRXhwciwgZGlyZWN0aXZlQXJyYXksIHBpcGVzQXJyYXldKTtcblxuICAgICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChjYWxsRXhwci50b1N0bXQoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICduZ01vZHVsZURlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ01vZHVsZVN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdJbmplY3RvckRlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nSW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdJbmplY3RvckRlZi50eXBlLFxuICAgICAgfSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9SM1JlZmVyZW5jZShcbiAgICAgIHZhbHVlUmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSk6IFIzUmVmZXJlbmNlIHtcbiAgICBpZiAoISh2YWx1ZVJlZiBpbnN0YW5jZW9mIFJlc29sdmVkUmVmZXJlbmNlKSkge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB0eXBlUmVmID0gdmFsdWVSZWY7XG4gICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbih0eXBlUmVmLm5vZGUpO1xuICAgICAgaWYgKHR5cGVOb2RlICE9PSBudWxsICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0eXBlTm9kZSkpIHtcbiAgICAgICAgdHlwZVJlZiA9IG5ldyBSZXNvbHZlZFJlZmVyZW5jZSh0eXBlTm9kZSwgdHlwZU5vZGUubmFtZSAhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB0eXBlUmVmLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSB8fCAhdHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIHR5cGVOb2RlVG9WYWx1ZUV4cHIoYXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgQXxCfHtuZ01vZHVsZTogVH18Q2AuXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdHMuaXNJbnRlcnNlY3Rpb25UeXBlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdCBvZiB0eXBlLnR5cGVzKSB7XG4gICAgICBpZiAodHMuaXNUeXBlTGl0ZXJhbE5vZGUodCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBtIG9mIHQubWVtYmVycykge1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlVHlwZSA9IHRzLmlzUHJvcGVydHlTaWduYXR1cmUobSkgJiYgdHMuaXNJZGVudGlmaWVyKG0ubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgIG0ubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnICYmIG0udHlwZSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlRXhwcmVzc2lvbiA9IG5nTW9kdWxlVHlwZSAmJiB0eXBlTm9kZVRvVmFsdWVFeHByKG5nTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKG5nTW9kdWxlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5nTW9kdWxlRXhwcmVzc2lvbjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KGV4cHI6IHRzLk5vZGUsIHJlc29sdmVkTGlzdDogUmVzb2x2ZWRWYWx1ZSwgbmFtZTogc3RyaW5nKTpcbiAgICAgIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj5bXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsIGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgcHJvcGVydHkgJHtuYW1lfWApO1xuICAgIH1cblxuICAgIHJlc29sdmVkTGlzdC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7XG4gICAgICAvLyBVbndyYXAgTW9kdWxlV2l0aFByb3ZpZGVycyBmb3IgbW9kdWxlcyB0aGF0IGFyZSBsb2NhbGx5IGRlY2xhcmVkIChhbmQgdGh1cyBzdGF0aWNcbiAgICAgIC8vIHJlc29sdXRpb24gd2FzIGFibGUgdG8gZGVzY2VuZCBpbnRvIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIGFuIG9iamVjdCBsaXRlcmFsLCBhIE1hcCkuXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBNYXAgJiYgZW50cnkuaGFzKCduZ01vZHVsZScpKSB7XG4gICAgICAgIGVudHJ5ID0gZW50cnkuZ2V0KCduZ01vZHVsZScpICE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBuYW1lKSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgIGlmICghZW50cnkuZXhwcmVzc2FibGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwciwgYE9uZSBlbnRyeSBpbiAke25hbWV9IGlzIG5vdCBhIHR5cGVgKTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhlbnRyeS5ub2RlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBlbnRyeS5ub2RlLFxuICAgICAgICAgICAgICBgRW50cnkgaXMgbm90IGEgdHlwZSwgYnV0IGlzIHVzZWQgYXMgc3VjaCBpbiAke25hbWV9IGFycmF5YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogZXhwYW5kIE1vZHVsZVdpdGhQcm92aWRlcnMuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluICR7bmFtZX0gYXJyYXkgaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNEZWNsYXJhdGlvblJlZmVyZW5jZShyZWY6IGFueSk6IHJlZiBpcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJlxuICAgICAgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihyZWYubm9kZSkpO1xufVxuIl19