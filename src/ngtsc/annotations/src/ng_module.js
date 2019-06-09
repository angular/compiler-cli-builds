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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/output/output_ast", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var output_ast_1 = require("@angular/compiler/src/output/output_ast");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Compiles @NgModule annotations to ngModuleDef fields.
     *
     * TODO(alxhub): handle injector side of things as well.
     */
    var NgModuleDecoratorHandler = /** @class */ (function () {
        function NgModuleDecoratorHandler(reflector, evaluator, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, defaultImportRecorder, localeId) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.referencesRegistry = referencesRegistry;
            this.isCore = isCore;
            this.routeAnalyzer = routeAnalyzer;
            this.refEmitter = refEmitter;
            this.defaultImportRecorder = defaultImportRecorder;
            this.localeId = localeId;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
        }
        NgModuleDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'NgModule', this.isCore);
            if (decorator !== undefined) {
                return {
                    trigger: decorator.node,
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            var _this = this;
            var _a;
            var name = node.name.text;
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
            var moduleResolvers = util_1.combineResolvers([
                function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); },
                util_1.forwardRefResolver,
            ]);
            // Extract the module declarations, imports, and exports.
            var declarationRefs = [];
            if (ngModule.has('declarations')) {
                var expr = ngModule.get('declarations');
                var declarationMeta = this.evaluator.evaluate(expr, util_1.forwardRefResolver);
                declarationRefs = this.resolveTypeList(expr, declarationMeta, name, 'declarations');
            }
            var importRefs = [];
            var rawImports = null;
            if (ngModule.has('imports')) {
                rawImports = ngModule.get('imports');
                var importsMeta = this.evaluator.evaluate(rawImports, moduleResolvers);
                importRefs = this.resolveTypeList(rawImports, importsMeta, name, 'imports');
            }
            var exportRefs = [];
            var rawExports = null;
            if (ngModule.has('exports')) {
                rawExports = ngModule.get('exports');
                var exportsMeta = this.evaluator.evaluate(rawExports, moduleResolvers);
                exportRefs = this.resolveTypeList(rawExports, exportsMeta, name, 'exports');
                (_a = this.referencesRegistry).add.apply(_a, tslib_1.__spread([node], exportRefs));
            }
            var bootstrapRefs = [];
            if (ngModule.has('bootstrap')) {
                var expr = ngModule.get('bootstrap');
                var bootstrapMeta = this.evaluator.evaluate(expr, util_1.forwardRefResolver);
                bootstrapRefs = this.resolveTypeList(expr, bootstrapMeta, name, 'bootstrap');
            }
            var id = ngModule.has('id') ? new compiler_1.WrappedNodeExpr(ngModule.get('id')) : null;
            // Register this module's information with the LocalModuleScopeRegistry. This ensures that
            // during the compile() phase, the module's metadata is available for selector scope
            // computation.
            this.metaRegistry.registerNgModuleMetadata({
                ref: new imports_1.Reference(node),
                declarations: declarationRefs,
                imports: importRefs,
                exports: exportRefs
            });
            var valueContext = node.getSourceFile();
            var typeContext = valueContext;
            var typeNode = this.reflector.getDtsDeclaration(node);
            if (typeNode !== null) {
                typeContext = typeNode.getSourceFile();
            }
            var bootstrap = bootstrapRefs.map(function (bootstrap) { return _this._toR3Reference(bootstrap, valueContext, typeContext); });
            var declarations = declarationRefs.map(function (decl) { return _this._toR3Reference(decl, valueContext, typeContext); });
            var imports = importRefs.map(function (imp) { return _this._toR3Reference(imp, valueContext, typeContext); });
            var exports = exportRefs.map(function (exp) { return _this._toR3Reference(exp, valueContext, typeContext); });
            var isForwardReference = function (ref) {
                return util_1.isExpressionForwardReference(ref.value, node.name, valueContext);
            };
            var containsForwardDecls = bootstrap.some(isForwardReference) ||
                declarations.some(isForwardReference) || imports.some(isForwardReference) ||
                exports.some(isForwardReference);
            var ngModuleDef = {
                type: new compiler_1.WrappedNodeExpr(node.name),
                bootstrap: bootstrap,
                declarations: declarations,
                exports: exports,
                imports: imports,
                containsForwardDecls: containsForwardDecls,
                id: id,
                emitInline: false,
                // TODO: to be implemented as a part of FW-1004.
                schemas: [],
            };
            var rawProviders = ngModule.has('providers') ? ngModule.get('providers') : null;
            var providers = rawProviders !== null ? new compiler_1.WrappedNodeExpr(rawProviders) : null;
            // At this point, only add the module's imports as the injectors' imports. Any exported modules
            // are added during `resolve`, as we need scope information to be able to filter out directives
            // and pipes from the module exports.
            var injectorImports = [];
            if (ngModule.has('imports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('imports')));
            }
            if (this.routeAnalyzer !== null) {
                this.routeAnalyzer.add(node.getSourceFile(), name, rawImports, rawExports, rawProviders);
            }
            var ngInjectorDef = {
                name: name,
                type: new compiler_1.WrappedNodeExpr(node.name),
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                providers: providers,
                imports: injectorImports,
            };
            return {
                analysis: {
                    id: id,
                    ngModuleDef: ngModuleDef,
                    ngInjectorDef: ngInjectorDef,
                    declarations: declarationRefs,
                    exports: exportRefs,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                },
                factorySymbolName: node.name.text,
            };
        };
        NgModuleDecoratorHandler.prototype.resolve = function (node, analysis) {
            var e_1, _a;
            var scope = this.scopeRegistry.getScopeOfModule(node);
            var diagnostics = this.scopeRegistry.getDiagnosticsOfModule(node) || undefined;
            // Using the scope information, extend the injector's imports using the modules that are
            // specified as module exports.
            if (scope !== null) {
                var context = typescript_1.getSourceFile(node);
                try {
                    for (var _b = tslib_1.__values(analysis.exports), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var exportRef = _c.value;
                        if (isNgModule(exportRef.node, scope.compilation)) {
                            analysis.ngInjectorDef.imports.push(this.refEmitter.emit(exportRef, context));
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            if (scope === null || scope.reexports === null) {
                return { diagnostics: diagnostics };
            }
            else {
                return {
                    diagnostics: diagnostics,
                    reexports: scope.reexports,
                };
            }
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis) {
            var _this = this;
            var e_2, _a;
            var ngInjectorDef = compiler_1.compileInjector(analysis.ngInjectorDef);
            var ngModuleDef = compiler_1.compileNgModule(analysis.ngModuleDef);
            var ngModuleStatements = ngModuleDef.additionalStatements;
            if (analysis.metadataStmt !== null) {
                ngModuleStatements.push(analysis.metadataStmt);
            }
            var context = typescript_1.getSourceFile(node);
            try {
                for (var _b = tslib_1.__values(analysis.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    if (this.scopeRegistry.getRequiresRemoteScope(decl.node)) {
                        var scope = this.scopeRegistry.getScopeOfModule(ts.getOriginalNode(node));
                        if (scope === null) {
                            continue;
                        }
                        var directives = scope.compilation.directives.map(function (directive) { return _this.refEmitter.emit(directive.ref, context); });
                        var pipes = scope.compilation.pipes.map(function (pipe) { return _this.refEmitter.emit(pipe.ref, context); });
                        var directiveArray = new compiler_1.LiteralArrayExpr(directives);
                        var pipesArray = new compiler_1.LiteralArrayExpr(pipes);
                        var declExpr = this.refEmitter.emit(decl, context);
                        var setComponentScope = new compiler_1.ExternalExpr(compiler_1.R3Identifiers.setComponentScope);
                        var callExpr = new compiler_1.InvokeFunctionExpr(setComponentScope, [declExpr, directiveArray, pipesArray]);
                        ngModuleStatements.push(callExpr.toStmt());
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            var res = [
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
                }
            ];
            if (this.localeId) {
                res.push({
                    name: 'ngLocaleIdDef',
                    initializer: new compiler_1.LiteralExpr(this.localeId),
                    statements: [],
                    type: output_ast_1.STRING_TYPE
                });
            }
            return res;
        };
        NgModuleDecoratorHandler.prototype._toR3Reference = function (valueRef, valueContext, typeContext) {
            if (valueRef.hasOwningModuleGuess) {
                return util_1.toR3Reference(valueRef, valueRef, valueContext, valueContext, this.refEmitter);
            }
            else {
                var typeRef = valueRef;
                var typeNode = this.reflector.getDtsDeclaration(typeRef.node);
                if (typeNode !== null && ts.isClassDeclaration(typeNode)) {
                    typeRef = new imports_1.Reference(typeNode);
                }
                return util_1.toR3Reference(valueRef, typeRef, valueContext, typeContext, this.refEmitter);
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
            if (!ts.isTypeReferenceNode(type)) {
                return null;
            }
            var typeName = type && (ts.isIdentifier(type.typeName) && type.typeName ||
                ts.isQualifiedName(type.typeName) && type.typeName.right) ||
                null;
            if (typeName === null) {
                return null;
            }
            // Look at the type itself to see where it comes from.
            var id = this.reflector.getImportOfIdentifier(typeName);
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
            var e_3, _a, e_4, _b;
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
                        catch (e_4_1) { e_4 = { error: e_4_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_4) throw e_4.error; }
                        }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return null;
        };
        // Verify that a `ts.Declaration` reference is a `ClassDeclaration` reference.
        NgModuleDecoratorHandler.prototype.isClassDeclarationReference = function (ref) {
            return this.reflector.isClass(ref.node);
        };
        /**
         * Compute a list of `Reference`s from a resolved metadata value.
         */
        NgModuleDecoratorHandler.prototype.resolveTypeList = function (expr, resolvedList, className, arrayName) {
            var _this = this;
            var refList = [];
            if (!Array.isArray(resolvedList)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "Expected array when reading property " + arrayName);
            }
            resolvedList.forEach(function (entry, idx) {
                // Unwrap ModuleWithProviders for modules that are locally declared (and thus static
                // resolution was able to descend into the function and return an object literal, a Map).
                if (entry instanceof Map && entry.has('ngModule')) {
                    entry = entry.get('ngModule');
                }
                if (Array.isArray(entry)) {
                    // Recurse into nested arrays.
                    refList.push.apply(refList, tslib_1.__spread(_this.resolveTypeList(expr, entry, className, arrayName)));
                }
                else if (isDeclarationReference(entry)) {
                    if (!_this.isClassDeclarationReference(entry)) {
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, entry.node, "Value at position " + idx + " in the NgModule." + arrayName + "s of " + className + " is not a class");
                    }
                    refList.push(entry);
                }
                else {
                    // TODO(alxhub): Produce a better diagnostic here - the array index may be an inner array.
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "Value at position " + idx + " in the NgModule." + arrayName + "s of " + className + " is not a reference: " + entry);
                }
            });
            return refList;
        };
        return NgModuleDecoratorHandler;
    }());
    exports.NgModuleDecoratorHandler = NgModuleDecoratorHandler;
    function isNgModule(node, compilation) {
        return !compilation.directives.some(function (directive) { return directive.ref.node === node; }) &&
            !compilation.pipes.some(function (pipe) { return pipe.ref.node === node; });
    }
    function isDeclarationReference(ref) {
        return ref instanceof imports_1.Reference &&
            (ts.isClassDeclaration(ref.node) || ts.isFunctionDeclaration(ref.node) ||
                ts.isVariableDeclaration(ref.node));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFnUDtJQUNoUCxzRUFBb0U7SUFDcEUsK0JBQWlDO0lBRWpDLDJFQUFrRTtJQUNsRSxtRUFBaUY7SUFHakYseUVBQXdIO0lBR3hILHVFQUFnSTtJQUNoSSxrRkFBd0Q7SUFDeEQscUZBQXdEO0lBRXhELDZFQUFrTDtJQVdsTDs7OztPQUlHO0lBQ0g7UUFDRSxrQ0FDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFlBQThCLEVBQVUsYUFBdUMsRUFDL0Usa0JBQXNDLEVBQVUsTUFBZSxFQUMvRCxhQUF5QyxFQUFVLFVBQTRCLEVBQy9FLHFCQUE0QyxFQUFVLFFBQWlCO1lBSnZFLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQVUsY0FBUyxHQUFULFNBQVMsQ0FBa0I7WUFDOUQsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBQVUsa0JBQWEsR0FBYixhQUFhLENBQTBCO1lBQy9FLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQy9ELGtCQUFhLEdBQWIsYUFBYSxDQUE0QjtZQUFVLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQy9FLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFTO1lBRTFFLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFGc0MsQ0FBQztRQUl2Rix5Q0FBTSxHQUFOLFVBQU8sSUFBc0IsRUFBRSxVQUE0QjtZQUN6RCxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNmLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBQ0QsSUFBTSxT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QUksSUFBSSxPQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBdEIsQ0FBc0IsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxTQUFTLHNCQUFzQixDQUFDLEdBQVE7UUFDdEMsT0FBTyxHQUFHLFlBQVksbUJBQVM7WUFDM0IsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNyRSxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIFIzSWRlbnRpZmllcnMsIFIzSW5qZWN0b3JNZXRhZGF0YSwgUjNOZ01vZHVsZU1ldGFkYXRhLCBSM1JlZmVyZW5jZSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge1NUUklOR19UWVBFfSBmcm9tICdAYW5ndWxhci9jb21waWxlci9zcmMvb3V0cHV0L291dHB1dF9hc3QnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge01ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0LCByZWZsZWN0T2JqZWN0TGl0ZXJhbCwgdHlwZU5vZGVUb1ZhbHVlRXhwcn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge05nTW9kdWxlUm91dGVBbmFseXplcn0gZnJvbSAnLi4vLi4vcm91dGluZyc7XG5pbXBvcnQge0xvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSwgU2NvcGVEYXRhfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YTtcbiAgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogaGFuZGxlIGluamVjdG9yIHNpZGUgb2YgdGhpbmdzIGFzIHdlbGwuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPE5nTW9kdWxlQW5hbHlzaXMsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSwgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHByaXZhdGUgbG9jYWxlSWQ/OiBzdHJpbmcpIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ05nTW9kdWxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBOZ01vZHVsZSBkZWNvcmF0b3JgKTtcbiAgICB9XG5cbiAgICAvLyBATmdNb2R1bGUgY2FuIGJlIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMuIEluIGNhc2UgaXQgaXMsIHByZXRlbmQgYXMgaWYgYSBibGFuayBvYmplY3RcbiAgICAvLyBsaXRlcmFsIHdhcyBzcGVjaWZpZWQuIFRoaXMgc2ltcGxpZmllcyB0aGUgY29kZSBiZWxvdy5cbiAgICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxID8gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKFtdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgICdATmdNb2R1bGUgYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbCcpO1xuICAgIH1cbiAgICBjb25zdCBuZ01vZHVsZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaml0JykpIHtcbiAgICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVycyA9IGNvbWJpbmVSZXNvbHZlcnMoW1xuICAgICAgcmVmID0+IHRoaXMuX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKHJlZi5ub2RlKSxcbiAgICAgIGZvcndhcmRSZWZSZXNvbHZlcixcbiAgICBdKTtcblxuICAgIC8vIEV4dHJhY3QgdGhlIG1vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzLlxuICAgIGxldCBkZWNsYXJhdGlvblJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICE7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgZGVjbGFyYXRpb25SZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZGVjbGFyYXRpb25NZXRhLCBuYW1lLCAnZGVjbGFyYXRpb25zJyk7XG4gICAgfVxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICE7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0ltcG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBpbXBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3SW1wb3J0cywgaW1wb3J0c01ldGEsIG5hbWUsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdFeHBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgcmF3RXhwb3J0cyA9IG5nTW9kdWxlLmdldCgnZXhwb3J0cycpICE7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBleHBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RXhwb3J0cywgZXhwb3J0c01ldGEsIG5hbWUsICdleHBvcnRzJyk7XG4gICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQobm9kZSwgLi4uZXhwb3J0UmVmcyk7XG4gICAgfVxuICAgIGxldCBib290c3RyYXBSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2Jvb3RzdHJhcCcpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdib290c3RyYXAnKSAhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGlkOiBFeHByZXNzaW9ufG51bGwgPVxuICAgICAgICBuZ01vZHVsZS5oYXMoJ2lkJykgPyBuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaWQnKSAhKSA6IG51bGw7XG5cbiAgICAvLyBSZWdpc3RlciB0aGlzIG1vZHVsZSdzIGluZm9ybWF0aW9uIHdpdGggdGhlIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeS4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZSwgdGhlIG1vZHVsZSdzIG1ldGFkYXRhIGlzIGF2YWlsYWJsZSBmb3Igc2VsZWN0b3Igc2NvcGVcbiAgICAvLyBjb21wdXRhdGlvbi5cbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoe1xuICAgICAgcmVmOiBuZXcgUmVmZXJlbmNlKG5vZGUpLFxuICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsXG4gICAgICBpbXBvcnRzOiBpbXBvcnRSZWZzLFxuICAgICAgZXhwb3J0czogZXhwb3J0UmVmc1xuICAgIH0pO1xuXG4gICAgY29uc3QgdmFsdWVDb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBsZXQgdHlwZUNvbnRleHQgPSB2YWx1ZUNvbnRleHQ7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAodHlwZU5vZGUgIT09IG51bGwpIHtcbiAgICAgIHR5cGVDb250ZXh0ID0gdHlwZU5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb3RzdHJhcCA9XG4gICAgICAgIGJvb3RzdHJhcFJlZnMubWFwKGJvb3RzdHJhcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGJvb3RzdHJhcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9XG4gICAgICAgIGRlY2xhcmF0aW9uUmVmcy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBpbXBvcnRzID0gaW1wb3J0UmVmcy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFJlZnMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuXG4gICAgY29uc3QgaXNGb3J3YXJkUmVmZXJlbmNlID0gKHJlZjogUjNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocmVmLnZhbHVlLCBub2RlLm5hbWUgISwgdmFsdWVDb250ZXh0KTtcbiAgICBjb25zdCBjb250YWluc0ZvcndhcmREZWNscyA9IGJvb3RzdHJhcC5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZGVjbGFyYXRpb25zLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fCBpbXBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBleHBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKTtcblxuICAgIGNvbnN0IG5nTW9kdWxlRGVmOiBSM05nTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUubmFtZSksXG4gICAgICBib290c3RyYXAsXG4gICAgICBkZWNsYXJhdGlvbnMsXG4gICAgICBleHBvcnRzLFxuICAgICAgaW1wb3J0cyxcbiAgICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzLFxuICAgICAgaWQsXG4gICAgICBlbWl0SW5saW5lOiBmYWxzZSxcbiAgICAgIC8vIFRPRE86IHRvIGJlIGltcGxlbWVudGVkIGFzIGEgcGFydCBvZiBGVy0xMDA0LlxuICAgICAgc2NoZW1hczogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHJhd1Byb3ZpZGVycyA9IG5nTW9kdWxlLmhhcygncHJvdmlkZXJzJykgPyBuZ01vZHVsZS5nZXQoJ3Byb3ZpZGVycycpICEgOiBudWxsO1xuICAgIGNvbnN0IHByb3ZpZGVycyA9IHJhd1Byb3ZpZGVycyAhPT0gbnVsbCA/IG5ldyBXcmFwcGVkTm9kZUV4cHIocmF3UHJvdmlkZXJzKSA6IG51bGw7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBvbmx5IGFkZCB0aGUgbW9kdWxlJ3MgaW1wb3J0cyBhcyB0aGUgaW5qZWN0b3JzJyBpbXBvcnRzLiBBbnkgZXhwb3J0ZWQgbW9kdWxlc1xuICAgIC8vIGFyZSBhZGRlZCBkdXJpbmcgYHJlc29sdmVgLCBhcyB3ZSBuZWVkIHNjb3BlIGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gZmlsdGVyIG91dCBkaXJlY3RpdmVzXG4gICAgLy8gYW5kIHBpcGVzIGZyb20gdGhlIG1vZHVsZSBleHBvcnRzLlxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lKSxcbiAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICBwcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBpbmplY3RvckltcG9ydHMsXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBpZCxcbiAgICAgICAgbmdNb2R1bGVEZWYsXG4gICAgICAgIG5nSW5qZWN0b3JEZWYsXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgICBleHBvcnRzOiBleHBvcnRSZWZzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH0sXG4gICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBSZXNvbHZlUmVzdWx0IHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKG5vZGUpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldERpYWdub3N0aWNzT2ZNb2R1bGUobm9kZSkgfHwgdW5kZWZpbmVkO1xuXG4gICAgLy8gVXNpbmcgdGhlIHNjb3BlIGluZm9ybWF0aW9uLCBleHRlbmQgdGhlIGluamVjdG9yJ3MgaW1wb3J0cyB1c2luZyB0aGUgbW9kdWxlcyB0aGF0IGFyZVxuICAgIC8vIHNwZWNpZmllZCBhcyBtb2R1bGUgZXhwb3J0cy5cbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgICAgZm9yIChjb25zdCBleHBvcnRSZWYgb2YgYW5hbHlzaXMuZXhwb3J0cykge1xuICAgICAgICBpZiAoaXNOZ01vZHVsZShleHBvcnRSZWYubm9kZSwgc2NvcGUuY29tcGlsYXRpb24pKSB7XG4gICAgICAgICAgYW5hbHlzaXMubmdJbmplY3RvckRlZi5pbXBvcnRzLnB1c2godGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2NvcGUgPT09IG51bGwgfHwgc2NvcGUucmVleHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGlhZ25vc3RpY3MsXG4gICAgICAgIHJlZXhwb3J0czogc2NvcGUucmVleHBvcnRzLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKGFuYWx5c2lzLm5nSW5qZWN0b3JEZWYpO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm5nTW9kdWxlRGVmKTtcbiAgICBjb25zdCBuZ01vZHVsZVN0YXRlbWVudHMgPSBuZ01vZHVsZURlZi5hZGRpdGlvbmFsU3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgYW5hbHlzaXMuZGVjbGFyYXRpb25zKSB7XG4gICAgICBpZiAodGhpcy5zY29wZVJlZ2lzdHJ5LmdldFJlcXVpcmVzUmVtb3RlU2NvcGUoZGVjbC5ub2RlKSkge1xuICAgICAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKHRzLmdldE9yaWdpbmFsTm9kZShub2RlKSBhcyB0eXBlb2Ygbm9kZSk7XG4gICAgICAgIGlmIChzY29wZSA9PT0gbnVsbCkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSBzY29wZS5jb21waWxhdGlvbi5kaXJlY3RpdmVzLm1hcChcbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkaXJlY3RpdmUucmVmLCBjb250ZXh0KSk7XG4gICAgICAgIGNvbnN0IHBpcGVzID0gc2NvcGUuY29tcGlsYXRpb24ucGlwZXMubWFwKHBpcGUgPT4gdGhpcy5yZWZFbWl0dGVyLmVtaXQocGlwZS5yZWYsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihkaXJlY3RpdmVzKTtcbiAgICAgICAgY29uc3QgcGlwZXNBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKHBpcGVzKTtcbiAgICAgICAgY29uc3QgZGVjbEV4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkZWNsLCBjb250ZXh0KSAhO1xuICAgICAgICBjb25zdCBzZXRDb21wb25lbnRTY29wZSA9IG5ldyBFeHRlcm5hbEV4cHIoUjNJZGVudGlmaWVycy5zZXRDb21wb25lbnRTY29wZSk7XG4gICAgICAgIGNvbnN0IGNhbGxFeHByID1cbiAgICAgICAgICAgIG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoc2V0Q29tcG9uZW50U2NvcGUsIFtkZWNsRXhwciwgZGlyZWN0aXZlQXJyYXksIHBpcGVzQXJyYXldKTtcblxuICAgICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChjYWxsRXhwci50b1N0bXQoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdNb2R1bGVEZWYnLFxuICAgICAgICBpbml0aWFsaXplcjogbmdNb2R1bGVEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogbmdNb2R1bGVTdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlOiBuZ01vZHVsZURlZi50eXBlLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ25nSW5qZWN0b3JEZWYnLFxuICAgICAgICBpbml0aWFsaXplcjogbmdJbmplY3RvckRlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ0luamVjdG9yRGVmLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nSW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH1cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMubG9jYWxlSWQpIHtcbiAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ25nTG9jYWxlSWREZWYnLFxuICAgICAgICBpbml0aWFsaXplcjogbmV3IExpdGVyYWxFeHByKHRoaXMubG9jYWxlSWQpLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogU1RSSU5HX1RZUEVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIF90b1IzUmVmZXJlbmNlKFxuICAgICAgdmFsdWVSZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZU5hbWUgPSB0eXBlICYmICh0cy5pc0lkZW50aWZpZXIodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuaXNRdWFsaWZpZWROYW1lKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUucmlnaHQpIHx8XG4gICAgICAgIG51bGw7XG4gICAgaWYgKHR5cGVOYW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlTmFtZSk7XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBuYW1lZCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBiYWlsLlxuICAgIGlmIChpZCA9PT0gbnVsbCB8fCBpZC5uYW1lICE9PSAnTW9kdWxlV2l0aFByb3ZpZGVycycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIGl0J3Mgbm90IGZyb20gQGFuZ3VsYXIvY29yZSwgYmFpbC5cbiAgICBpZiAoIXRoaXMuaXNDb3JlICYmIGlkLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBubyB0eXBlIHBhcmFtZXRlciBzcGVjaWZpZWQsIGJhaWwuXG4gICAgaWYgKHR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IHR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiB0eXBlTm9kZVRvVmFsdWVFeHByKGFyZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYEF8Qnx7bmdNb2R1bGU6IFR9fENgLlxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzSW50ZXJzZWN0aW9uVHlwZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgdHlwZS50eXBlcykge1xuICAgICAgaWYgKHRzLmlzVHlwZUxpdGVyYWxOb2RlKHQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiB0Lm1lbWJlcnMpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSB0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG0pICYmIHRzLmlzSWRlbnRpZmllcihtLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJyAmJiBtLnR5cGUgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZUV4cHJlc3Npb24gPSBuZ01vZHVsZVR5cGUgJiYgdHlwZU5vZGVUb1ZhbHVlRXhwcihuZ01vZHVsZVR5cGUpO1xuICAgICAgICAgIGlmIChuZ01vZHVsZUV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiBuZ01vZHVsZUV4cHJlc3Npb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgYSBgdHMuRGVjbGFyYXRpb25gIHJlZmVyZW5jZSBpcyBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZWZlcmVuY2UuXG4gIHByaXZhdGUgaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPik6XG4gICAgICByZWYgaXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhyZWYubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KFxuICAgICAgZXhwcjogdHMuTm9kZSwgcmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBjbGFzc05hbWU6IHN0cmluZyxcbiAgICAgIGFycmF5TmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgYEV4cGVjdGVkIGFycmF5IHdoZW4gcmVhZGluZyBwcm9wZXJ0eSAke2FycmF5TmFtZX1gKTtcbiAgICB9XG5cbiAgICByZXNvbHZlZExpc3QuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4ge1xuICAgICAgLy8gVW53cmFwIE1vZHVsZVdpdGhQcm92aWRlcnMgZm9yIG1vZHVsZXMgdGhhdCBhcmUgbG9jYWxseSBkZWNsYXJlZCAoYW5kIHRodXMgc3RhdGljXG4gICAgICAvLyByZXNvbHV0aW9uIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTWFwICYmIGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICBlbnRyeSA9IGVudHJ5LmdldCgnbmdNb2R1bGUnKSAhO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgICAgLy8gUmVjdXJzZSBpbnRvIG5lc3RlZCBhcnJheXMuXG4gICAgICAgIHJlZkxpc3QucHVzaCguLi50aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBlbnRyeSwgY2xhc3NOYW1lLCBhcnJheU5hbWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNEZWNsYXJhdGlvblJlZmVyZW5jZShlbnRyeSkpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzQ2xhc3NEZWNsYXJhdGlvblJlZmVyZW5jZShlbnRyeSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZW50cnkubm9kZSxcbiAgICAgICAgICAgICAgYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiB0aGUgTmdNb2R1bGUuJHthcnJheU5hbWV9cyBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfXMgb2YgJHtjbGFzc05hbWV9IGlzIG5vdCBhIHJlZmVyZW5jZTogJHtlbnRyeX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZWZMaXN0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTmdNb2R1bGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IFNjb3BlRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gIWNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMuc29tZShkaXJlY3RpdmUgPT4gZGlyZWN0aXZlLnJlZi5ub2RlID09PSBub2RlKSAmJlxuICAgICAgIWNvbXBpbGF0aW9uLnBpcGVzLnNvbWUocGlwZSA9PiBwaXBlLnJlZi5ub2RlID09PSBub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNEZWNsYXJhdGlvblJlZmVyZW5jZShyZWY6IGFueSk6IHJlZiBpcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJlxuICAgICAgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihyZWYubm9kZSkpO1xufVxuIl19