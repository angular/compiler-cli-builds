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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
        function NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, defaultImportRecorder, localeId) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaReader = metaReader;
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
            var _a, e_1, _b;
            var _this = this;
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
            var schemas = [];
            if (ngModule.has('schemas')) {
                var rawExpr = ngModule.get('schemas');
                var result = this.evaluator.evaluate(rawExpr);
                if (!Array.isArray(result)) {
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, rawExpr, "NgModule.schemas must be an array");
                }
                try {
                    for (var result_1 = tslib_1.__values(result), result_1_1 = result_1.next(); !result_1_1.done; result_1_1 = result_1.next()) {
                        var schemaRef = result_1_1.value;
                        if (!(schemaRef instanceof imports_1.Reference)) {
                            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, rawExpr, 'NgModule.schemas must be an array of schemas');
                        }
                        var id_1 = schemaRef.getIdentityIn(schemaRef.node.getSourceFile());
                        if (id_1 === null || schemaRef.ownedByModuleGuess !== '@angular/core') {
                            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, rawExpr, 'NgModule.schemas must be an array of schemas');
                        }
                        // Since `id` is the `ts.Identifer` within the schema ref's declaration file, it's safe to
                        // use `id.text` here to figure out which schema is in use. Even if the actual reference was
                        // renamed when the user imported it, these names will match.
                        switch (id_1.text) {
                            case 'CUSTOM_ELEMENTS_SCHEMA':
                                schemas.push(compiler_1.CUSTOM_ELEMENTS_SCHEMA);
                                break;
                            case 'NO_ERRORS_SCHEMA':
                                schemas.push(compiler_1.NO_ERRORS_SCHEMA);
                                break;
                            default:
                                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, rawExpr, "'" + schemaRef.debugName + "' is not a valid NgModule schema");
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (result_1_1 && !result_1_1.done && (_b = result_1.return)) _b.call(result_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            var id = ngModule.has('id') ? new compiler_1.WrappedNodeExpr(ngModule.get('id')) : null;
            // Register this module's information with the LocalModuleScopeRegistry. This ensures that
            // during the compile() phase, the module's metadata is available for selector scope
            // computation.
            this.metaRegistry.registerNgModuleMetadata({
                ref: new imports_1.Reference(node),
                schemas: schemas,
                declarations: declarationRefs,
                imports: importRefs,
                exports: exportRefs,
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
                    ɵmod: ngModuleDef, ngInjectorDef: ngInjectorDef,
                    declarations: declarationRefs,
                    exports: exportRefs,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                },
                factorySymbolName: node.name.text,
            };
        };
        NgModuleDecoratorHandler.prototype.resolve = function (node, analysis) {
            var e_2, _a, e_3, _b;
            var scope = this.scopeRegistry.getScopeOfModule(node);
            var diagnostics = this.scopeRegistry.getDiagnosticsOfModule(node) || undefined;
            if (scope !== null) {
                // Using the scope information, extend the injector's imports using the modules that are
                // specified as module exports.
                var context = typescript_1.getSourceFile(node);
                try {
                    for (var _c = tslib_1.__values(analysis.exports), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var exportRef = _d.value;
                        if (isNgModule(exportRef.node, scope.compilation)) {
                            analysis.ngInjectorDef.imports.push(this.refEmitter.emit(exportRef, context));
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
                try {
                    for (var _e = tslib_1.__values(analysis.declarations), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var decl = _f.value;
                        if (this.metaReader.isAbstractDirective(decl)) {
                            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DIRECTIVE_MISSING_SELECTOR, decl.node, "Directive " + decl.node.name.text + " has no selector, please add it!");
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
            var e_4, _a;
            var _this = this;
            var ngInjectorDef = compiler_1.compileInjector(analysis.ngInjectorDef);
            var ngModuleDef = compiler_1.compileNgModule(analysis.ɵmod);
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
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            var res = [
                {
                    name: 'ɵmod',
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
                    type: compiler_1.STRING_TYPE
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
            var e_5, _a, e_6, _b;
            if (!ts.isIntersectionTypeNode(type)) {
                return null;
            }
            try {
                for (var _c = tslib_1.__values(type.types), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var t = _d.value;
                    if (ts.isTypeLiteralNode(t)) {
                        try {
                            for (var _e = (e_6 = void 0, tslib_1.__values(t.members)), _f = _e.next(); !_f.done; _f = _e.next()) {
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
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_5) throw e_5.error; }
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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "Expected array when reading the NgModule." + arrayName + " of " + className);
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
                        throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, entry.node, "Value at position " + idx + " in the NgModule." + arrayName + " of " + className + " is not a class");
                    }
                    refList.push(entry);
                }
                else {
                    // TODO(alxhub): Produce a better diagnostic here - the array index may be an inner array.
                    throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.VALUE_HAS_WRONG_TYPE, expr, "Value at position " + idx + " in the NgModule." + arrayName + " of " + className + " is not a reference: " + entry);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF1VDtJQUN2VCwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUFpRjtJQUdqRix5RUFBd0g7SUFHeEgsdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCxxRkFBd0Q7SUFFeEQsNkVBQWtMO0lBV2xMOzs7O09BSUc7SUFDSDtRQUNFLGtDQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsVUFBMEIsRUFBVSxZQUE4QixFQUNsRSxhQUF1QyxFQUN2QyxrQkFBc0MsRUFBVSxNQUFlLEVBQy9ELGFBQXlDLEVBQVUsVUFBNEIsRUFDL0UscUJBQTRDLEVBQVUsUUFBaUI7WUFMdkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxlQUFVLEdBQVYsVUFBVSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUNsRSxrQkFBYSxHQUFiLGFBQWEsQ0FBMEI7WUFDdkMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDL0Qsa0JBQWEsR0FBYixhQUFhLENBQTRCO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFDL0UsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQVM7WUFFMUUsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUZzQyxDQUFDO1FBSXZGLHlDQUFNLEdBQU4sVUFBTyxJQUFzQixFQUFFLFVBQTRCO1lBQ3pELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxT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c291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEsIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTVFJJTkdfVFlQRSwgU2NoZW1hTWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge01ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgybVtb2Q6IFIzTmdNb2R1bGVNZXRhZGF0YTtcbiAgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogaGFuZGxlIGluamVjdG9yIHNpZGUgb2YgdGhpbmdzIGFzIHdlbGwuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPE5nTW9kdWxlQW5hbHlzaXMsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBwcml2YXRlIGxvY2FsZUlkPzogc3RyaW5nKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIGRlY29yYXRvci5ub2RlLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlcnMgPSBjb21iaW5lUmVzb2x2ZXJzKFtcbiAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSksXG4gICAgICBmb3J3YXJkUmVmUmVzb2x2ZXIsXG4gICAgXSk7XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25SZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdkZWNsYXJhdGlvbnMnKSAhO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25NZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGRlY2xhcmF0aW9uUmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGRlY2xhcmF0aW9uTWV0YSwgbmFtZSwgJ2RlY2xhcmF0aW9ucycpO1xuICAgIH1cbiAgICBsZXQgaW1wb3J0UmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3SW1wb3J0czogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIHJhd0ltcG9ydHMgPSBuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhO1xuICAgICAgY29uc3QgaW1wb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdJbXBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgaW1wb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0ltcG9ydHMsIGltcG9ydHNNZXRhLCBuYW1lLCAnaW1wb3J0cycpO1xuICAgIH1cbiAgICBsZXQgZXhwb3J0UmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3RXhwb3J0czogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIHJhd0V4cG9ydHMgPSBuZ01vZHVsZS5nZXQoJ2V4cG9ydHMnKSAhO1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgZXhwb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0V4cG9ydHMsIGV4cG9ydHNNZXRhLCBuYW1lLCAnZXhwb3J0cycpO1xuICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKG5vZGUsIC4uLmV4cG9ydFJlZnMpO1xuICAgIH1cbiAgICBsZXQgYm9vdHN0cmFwUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdib290c3RyYXAnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnYm9vdHN0cmFwJykgITtcbiAgICAgIGNvbnN0IGJvb3RzdHJhcE1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgYm9vdHN0cmFwUmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGJvb3RzdHJhcE1ldGEsIG5hbWUsICdib290c3RyYXAnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnc2NoZW1hcycpKSB7XG4gICAgICBjb25zdCByYXdFeHByID0gbmdNb2R1bGUuZ2V0KCdzY2hlbWFzJykgITtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cHIpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLCBgTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hUmVmIG9mIHJlc3VsdCkge1xuICAgICAgICBpZiAoIShzY2hlbWFSZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHJhd0V4cHIsXG4gICAgICAgICAgICAgICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlkID0gc2NoZW1hUmVmLmdldElkZW50aXR5SW4oc2NoZW1hUmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgaWYgKGlkID09PSBudWxsIHx8IHNjaGVtYVJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MgIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLFxuICAgICAgICAgICAgICAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTaW5jZSBgaWRgIGlzIHRoZSBgdHMuSWRlbnRpZmVyYCB3aXRoaW4gdGhlIHNjaGVtYSByZWYncyBkZWNsYXJhdGlvbiBmaWxlLCBpdCdzIHNhZmUgdG9cbiAgICAgICAgLy8gdXNlIGBpZC50ZXh0YCBoZXJlIHRvIGZpZ3VyZSBvdXQgd2hpY2ggc2NoZW1hIGlzIGluIHVzZS4gRXZlbiBpZiB0aGUgYWN0dWFsIHJlZmVyZW5jZSB3YXNcbiAgICAgICAgLy8gcmVuYW1lZCB3aGVuIHRoZSB1c2VyIGltcG9ydGVkIGl0LCB0aGVzZSBuYW1lcyB3aWxsIG1hdGNoLlxuICAgICAgICBzd2l0Y2ggKGlkLnRleHQpIHtcbiAgICAgICAgICBjYXNlICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJzpcbiAgICAgICAgICAgIHNjaGVtYXMucHVzaChDVVNUT01fRUxFTUVOVFNfU0NIRU1BKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ05PX0VSUk9SU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKE5PX0VSUk9SU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHJhd0V4cHIsXG4gICAgICAgICAgICAgICAgYCcke3NjaGVtYVJlZi5kZWJ1Z05hbWV9JyBpcyBub3QgYSB2YWxpZCBOZ01vZHVsZSBzY2hlbWFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGlkOiBFeHByZXNzaW9ufG51bGwgPVxuICAgICAgICBuZ01vZHVsZS5oYXMoJ2lkJykgPyBuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaWQnKSAhKSA6IG51bGw7XG5cbiAgICAvLyBSZWdpc3RlciB0aGlzIG1vZHVsZSdzIGluZm9ybWF0aW9uIHdpdGggdGhlIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeS4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZSwgdGhlIG1vZHVsZSdzIG1ldGFkYXRhIGlzIGF2YWlsYWJsZSBmb3Igc2VsZWN0b3Igc2NvcGVcbiAgICAvLyBjb21wdXRhdGlvbi5cbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoe1xuICAgICAgcmVmOiBuZXcgUmVmZXJlbmNlKG5vZGUpLFxuICAgICAgc2NoZW1hcyxcbiAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgaW1wb3J0czogaW1wb3J0UmVmcyxcbiAgICAgIGV4cG9ydHM6IGV4cG9ydFJlZnMsXG4gICAgfSk7XG5cbiAgICBjb25zdCB2YWx1ZUNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgIGxldCB0eXBlQ29udGV4dCA9IHZhbHVlQ29udGV4dDtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmICh0eXBlTm9kZSAhPT0gbnVsbCkge1xuICAgICAgdHlwZUNvbnRleHQgPSB0eXBlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9vdHN0cmFwID1cbiAgICAgICAgYm9vdHN0cmFwUmVmcy5tYXAoYm9vdHN0cmFwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoYm9vdHN0cmFwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZGVjbGFyYXRpb25zID1cbiAgICAgICAgZGVjbGFyYXRpb25SZWZzLm1hcChkZWNsID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZGVjbCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGltcG9ydHMgPSBpbXBvcnRSZWZzLm1hcChpbXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShpbXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBleHBvcnRzID0gZXhwb3J0UmVmcy5tYXAoZXhwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZXhwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG5cbiAgICBjb25zdCBpc0ZvcndhcmRSZWZlcmVuY2UgPSAocmVmOiBSM1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShyZWYudmFsdWUsIG5vZGUubmFtZSAhLCB2YWx1ZUNvbnRleHQpO1xuICAgIGNvbnN0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gYm9vdHN0cmFwLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbnMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8IGltcG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGV4cG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpO1xuXG4gICAgY29uc3QgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lKSxcbiAgICAgIGJvb3RzdHJhcCxcbiAgICAgIGRlY2xhcmF0aW9ucyxcbiAgICAgIGV4cG9ydHMsXG4gICAgICBpbXBvcnRzLFxuICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMsXG4gICAgICBpZCxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmF3UHJvdmlkZXJzID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/IG5nTW9kdWxlLmdldCgncHJvdmlkZXJzJykgISA6IG51bGw7XG4gICAgY29uc3QgcHJvdmlkZXJzID0gcmF3UHJvdmlkZXJzICE9PSBudWxsID8gbmV3IFdyYXBwZWROb2RlRXhwcihyYXdQcm92aWRlcnMpIDogbnVsbDtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIG9ubHkgYWRkIHRoZSBtb2R1bGUncyBpbXBvcnRzIGFzIHRoZSBpbmplY3RvcnMnIGltcG9ydHMuIEFueSBleHBvcnRlZCBtb2R1bGVzXG4gICAgLy8gYXJlIGFkZGVkIGR1cmluZyBgcmVzb2x2ZWAsIGFzIHdlIG5lZWQgc2NvcGUgaW5mb3JtYXRpb24gdG8gYmUgYWJsZSB0byBmaWx0ZXIgb3V0IGRpcmVjdGl2ZXNcbiAgICAvLyBhbmQgcGlwZXMgZnJvbSB0aGUgbW9kdWxlIGV4cG9ydHMuXG4gICAgY29uc3QgaW5qZWN0b3JJbXBvcnRzOiBXcmFwcGVkTm9kZUV4cHI8dHMuRXhwcmVzc2lvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgaW5qZWN0b3JJbXBvcnRzLnB1c2gobmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSAhKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucm91dGVBbmFseXplciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb3V0ZUFuYWx5emVyLmFkZChub2RlLmdldFNvdXJjZUZpbGUoKSwgbmFtZSwgcmF3SW1wb3J0cywgcmF3RXhwb3J0cywgcmF3UHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGEgPSB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihub2RlLm5hbWUpLFxuICAgICAgZGVwczogZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIHByb3ZpZGVycyxcbiAgICAgIGltcG9ydHM6IGluamVjdG9ySW1wb3J0cyxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGlkLFxuICAgICAgICDJtW1vZDogbmdNb2R1bGVEZWYsIG5nSW5qZWN0b3JEZWYsXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgICBleHBvcnRzOiBleHBvcnRSZWZzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH0sXG4gICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBSZXNvbHZlUmVzdWx0IHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKG5vZGUpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldERpYWdub3N0aWNzT2ZNb2R1bGUobm9kZSkgfHwgdW5kZWZpbmVkO1xuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBVc2luZyB0aGUgc2NvcGUgaW5mb3JtYXRpb24sIGV4dGVuZCB0aGUgaW5qZWN0b3IncyBpbXBvcnRzIHVzaW5nIHRoZSBtb2R1bGVzIHRoYXQgYXJlXG4gICAgICAvLyBzcGVjaWZpZWQgYXMgbW9kdWxlIGV4cG9ydHMuXG4gICAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgZXhwb3J0UmVmIG9mIGFuYWx5c2lzLmV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGlzTmdNb2R1bGUoZXhwb3J0UmVmLm5vZGUsIHNjb3BlLmNvbXBpbGF0aW9uKSkge1xuICAgICAgICAgIGFuYWx5c2lzLm5nSW5qZWN0b3JEZWYuaW1wb3J0cy5wdXNoKHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZiwgY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgaWYgKHRoaXMubWV0YVJlYWRlci5pc0Fic3RyYWN0RGlyZWN0aXZlKGRlY2wpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGRlY2wubm9kZSxcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAke2RlY2wubm9kZS5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5yZWV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljcyxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3IoYW5hbHlzaXMubmdJbmplY3RvckRlZik7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUoYW5hbHlzaXMuybVtb2QpO1xuICAgIGNvbnN0IG5nTW9kdWxlU3RhdGVtZW50cyA9IG5nTW9kdWxlRGVmLmFkZGl0aW9uYWxTdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShkZWNsLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUodHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlKTtcbiAgICAgICAgaWYgKHNjb3BlID09PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyZWN0aXZlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSBzY29wZS5jb21waWxhdGlvbi5waXBlcy5tYXAocGlwZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLnJlZiwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKGRpcmVjdGl2ZXMpO1xuICAgICAgICBjb25zdCBwaXBlc0FycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIocGlwZXMpO1xuICAgICAgICBjb25zdCBkZWNsRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRlY2wsIGNvbnRleHQpICE7XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtW1vZCcsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ01vZHVsZVN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnbmdJbmplY3RvckRlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nSW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdJbmplY3RvckRlZi50eXBlLFxuICAgICAgfVxuICAgIF07XG5cbiAgICBpZiAodGhpcy5sb2NhbGVJZCkge1xuICAgICAgcmVzLnB1c2goe1xuICAgICAgICBuYW1lOiAnbmdMb2NhbGVJZERlZicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZXcgTGl0ZXJhbEV4cHIodGhpcy5sb2NhbGVJZCksXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlOiBTVFJJTkdfVFlQRVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgX3RvUjNSZWZlcmVuY2UoXG4gICAgICB2YWx1ZVJlZjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPiwgdmFsdWVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgdHlwZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBSM1JlZmVyZW5jZSB7XG4gICAgaWYgKHZhbHVlUmVmLmhhc093bmluZ01vZHVsZUd1ZXNzKSB7XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdmFsdWVSZWYsIHZhbHVlQ29udGV4dCwgdmFsdWVDb250ZXh0LCB0aGlzLnJlZkVtaXR0ZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgdHlwZVJlZiA9IHZhbHVlUmVmO1xuICAgICAgbGV0IHR5cGVOb2RlID0gdGhpcy5yZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24odHlwZVJlZi5ub2RlKTtcbiAgICAgIGlmICh0eXBlTm9kZSAhPT0gbnVsbCAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24odHlwZU5vZGUpKSB7XG4gICAgICAgIHR5cGVSZWYgPSBuZXcgUmVmZXJlbmNlKHR5cGVOb2RlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB0eXBlUmVmLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0LCB0aGlzLnJlZkVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBGdW5jdGlvbkRlY2xhcmF0aW9uYCwgYE1ldGhvZERlY2xhcmF0aW9uYCBvciBgRnVuY3Rpb25FeHByZXNzaW9uYCwgY2hlY2sgaWYgaXQgaXNcbiAgICogdHlwZWQgYXMgYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgYW5kIHJldHVybiBhbiBleHByZXNzaW9uIHJlZmVyZW5jaW5nIHRoZSBtb2R1bGUgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4obm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdHlwZSA9IG5vZGUudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB0eXBlICYmXG4gICAgICAgICh0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbVR5cGVQYXJhbSh0eXBlKSB8fCB0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyczxUPmBcbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIC8vIEV4YW1pbmUgdGhlIHR5cGUgb2YgdGhlIGZ1bmN0aW9uIHRvIHNlZSBpZiBpdCdzIGEgTW9kdWxlV2l0aFByb3ZpZGVycyByZWZlcmVuY2UuXG4gICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlTmFtZSA9IHR5cGUgJiYgKHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5pc1F1YWxpZmllZE5hbWUodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZS5yaWdodCkgfHxcbiAgICAgICAgbnVsbDtcbiAgICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHR5cGUgaXRzZWxmIHRvIHNlZSB3aGVyZSBpdCBjb21lcyBmcm9tLlxuICAgIGNvbnN0IGlkID0gdGhpcy5yZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIHR5cGVOb2RlVG9WYWx1ZUV4cHIoYXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgQXxCfHtuZ01vZHVsZTogVH18Q2AuXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdHMuaXNJbnRlcnNlY3Rpb25UeXBlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdCBvZiB0eXBlLnR5cGVzKSB7XG4gICAgICBpZiAodHMuaXNUeXBlTGl0ZXJhbE5vZGUodCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBtIG9mIHQubWVtYmVycykge1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlVHlwZSA9IHRzLmlzUHJvcGVydHlTaWduYXR1cmUobSkgJiYgdHMuaXNJZGVudGlmaWVyKG0ubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgIG0ubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnICYmIG0udHlwZSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlRXhwcmVzc2lvbiA9IG5nTW9kdWxlVHlwZSAmJiB0eXBlTm9kZVRvVmFsdWVFeHByKG5nTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKG5nTW9kdWxlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5nTW9kdWxlRXhwcmVzc2lvbjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCBhIGB0cy5EZWNsYXJhdGlvbmAgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTpcbiAgICAgIHJlZiBpcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKHJlZi5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlVHlwZUxpc3QoXG4gICAgICBleHByOiB0cy5Ob2RlLCByZXNvbHZlZExpc3Q6IFJlc29sdmVkVmFsdWUsIGNsYXNzTmFtZTogc3RyaW5nLFxuICAgICAgYXJyYXlOYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAgIC8vIFVud3JhcCBNb2R1bGVXaXRoUHJvdmlkZXJzIGZvciBtb2R1bGVzIHRoYXQgYXJlIGxvY2FsbHkgZGVjbGFyZWQgKGFuZCB0aHVzIHN0YXRpY1xuICAgICAgLy8gcmVzb2x1dGlvbiB3YXMgYWJsZSB0byBkZXNjZW5kIGludG8gdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gYW4gb2JqZWN0IGxpdGVyYWwsIGEgTWFwKS5cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgZW50cnkgPSBlbnRyeS5nZXQoJ25nTW9kdWxlJykgITtcbiAgICAgIH1cblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICAgIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgYXJyYXlzLlxuICAgICAgICByZWZMaXN0LnB1c2goLi4udGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZW50cnksIGNsYXNzTmFtZSwgYXJyYXlOYW1lKSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGVudHJ5Lm5vZGUsXG4gICAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOZ01vZHVsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogU2NvcGVEYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY29tcGlsYXRpb24uZGlyZWN0aXZlcy5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUucmVmLm5vZGUgPT09IG5vZGUpICYmXG4gICAgICAhY29tcGlsYXRpb24ucGlwZXMuc29tZShwaXBlID0+IHBpcGUucmVmLm5vZGUgPT09IG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogYW55KTogcmVmIGlzIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4ge1xuICByZXR1cm4gcmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlICYmXG4gICAgICAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8XG4gICAgICAgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHJlZi5ub2RlKSk7XG59XG4iXX0=