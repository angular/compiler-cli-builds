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
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARITY_WRONG, reflection_1.Decorator.nodeForError(decorator), "Incorrect number of arguments to @NgModule decorator");
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
                internalType: new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(node)),
                adjacentType: new compiler_1.WrappedNodeExpr(this.reflector.getAdjacentNameOfClass(node)),
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
                internalType: new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(node)),
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                providers: providers,
                imports: injectorImports,
            };
            return {
                analysis: {
                    id: id,
                    mod: ngModuleDef,
                    inj: ngInjectorDef,
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
                            analysis.inj.imports.push(this.refEmitter.emit(exportRef, context));
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
                        var metadata = this.metaReader.getDirectiveMetadata(decl);
                        if (metadata !== null && metadata.selector === null) {
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
            var ngInjectorDef = compiler_1.compileInjector(analysis.inj);
            var ngModuleDef = compiler_1.compileNgModule(analysis.mod);
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
                    name: 'ɵinj',
                    initializer: ngInjectorDef.expression,
                    statements: ngInjectorDef.statements,
                    type: ngInjectorDef.type,
                }
            ];
            if (this.localeId) {
                res.push({
                    name: 'ɵloc',
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
                (this._reflectModuleFromTypeParam(type, node) || this._reflectModuleFromLiteralType(type));
        };
        /**
         * Retrieve an `NgModule` identifier (T) from the specified `type`, if it is of the form:
         * `ModuleWithProviders<T>`
         * @param type The type to reflect on.
         * @returns the identifier of the NgModule type if found, or null otherwise.
         */
        NgModuleDecoratorHandler.prototype._reflectModuleFromTypeParam = function (type, node) {
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
                var parent_1 = ts.isMethodDeclaration(node) && ts.isClassDeclaration(node.parent) ? node.parent : null;
                var symbolName = (parent_1 && parent_1.name ? parent_1.name.getText() + '.' : '') +
                    (node.name ? node.name.getText() : 'anonymous');
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.NGMODULE_MODULE_WITH_PROVIDERS_MISSING_GENERIC, type, symbolName + " returns a ModuleWithProviders type without a generic type argument. " +
                    "Please add a generic type argument to the ModuleWithProviders type. If this " +
                    "occurrence is in library code you don't control, please contact the library authors.");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF1VDtJQUN2VCwrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUFpRjtJQUdqRix5RUFBd0g7SUFHeEgsdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCxxRkFBd0Q7SUFFeEQsNkVBQWtMO0lBV2xMOzs7O09BSUc7SUFDSDtRQUNFLGtDQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsVUFBMEIsRUFBVSxZQUE4QixFQUNsRSxhQUF1QyxFQUN2QyxrQkFBc0MsRUFBVSxNQUFlLEVBQy9ELGFBQXlDLEVBQVUsVUFBNEIsRUFDL0UscUJBQTRDLEVBQVUsUUFBaUI7WUFMdkUsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxlQUFVLEdBQVYsVUFBVSxDQUFnQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFrQjtZQUNsRSxrQkFBYSxHQUFiLGFBQWEsQ0FBMEI7WUFDdkMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDL0Qsa0JBQWEsR0FBYixhQUFhLENBQTRCO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFDL0UsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUFVLGFBQVEsR0FBUixRQUFRLENBQVM7WUFFMUUsZUFBVSxHQUFHLDZCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUZzQyxDQUFDO1FBSXZGLHlDQUFNLEdBQU4sVUFBTyxJQUFzQixFQUFFLFVBQTRCO1lBQ3pELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxT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bCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEsIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTVFJJTkdfVFlQRSwgU2NoZW1hTWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvcn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge01ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbn0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgbW9kOiBSM05nTW9kdWxlTWV0YWRhdGE7XG4gIGluajogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICpcbiAqIFRPRE8oYWx4aHViKTogaGFuZGxlIGluamVjdG9yIHNpZGUgb2YgdGhpbmdzIGFzIHdlbGwuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPE5nTW9kdWxlQW5hbHlzaXMsIERlY29yYXRvcj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLCBwcml2YXRlIGxvY2FsZUlkPzogc3RyaW5nKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQE5nTW9kdWxlIGRlY29yYXRvcmApO1xuICAgIH1cblxuICAgIC8vIEBOZ01vZHVsZSBjYW4gYmUgaW52b2tlZCB3aXRob3V0IGFyZ3VtZW50cy4gSW4gY2FzZSBpdCBpcywgcHJldGVuZCBhcyBpZiBhIGJsYW5rIG9iamVjdFxuICAgIC8vIGxpdGVyYWwgd2FzIHNwZWNpZmllZC4gVGhpcyBzaW1wbGlmaWVzIHRoZSBjb2RlIGJlbG93LlxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEgPyB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoW10pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsXG4gICAgICAgICAgJ0BOZ01vZHVsZSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gICAgfVxuICAgIGNvbnN0IG5nTW9kdWxlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdqaXQnKSkge1xuICAgICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXJzID0gY29tYmluZVJlc29sdmVycyhbXG4gICAgICByZWYgPT4gdGhpcy5fZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4ocmVmLm5vZGUpLFxuICAgICAgZm9yd2FyZFJlZlJlc29sdmVyLFxuICAgIF0pO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgbW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMuXG4gICAgbGV0IGRlY2xhcmF0aW9uUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdkZWNsYXJhdGlvbnMnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykgITtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBkZWNsYXJhdGlvblJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBkZWNsYXJhdGlvbk1ldGEsIG5hbWUsICdkZWNsYXJhdGlvbnMnKTtcbiAgICB9XG4gICAgbGV0IGltcG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0ltcG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICByYXdJbXBvcnRzID0gbmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3SW1wb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGltcG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdJbXBvcnRzLCBpbXBvcnRzTWV0YSwgbmFtZSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0V4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICByYXdFeHBvcnRzID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgITtcbiAgICAgIGNvbnN0IGV4cG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RXhwb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGV4cG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdFeHBvcnRzLCBleHBvcnRzTWV0YSwgbmFtZSwgJ2V4cG9ydHMnKTtcbiAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChub2RlLCAuLi5leHBvcnRSZWZzKTtcbiAgICB9XG4gICAgbGV0IGJvb3RzdHJhcFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnYm9vdHN0cmFwJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2Jvb3RzdHJhcCcpICE7XG4gICAgICBjb25zdCBib290c3RyYXBNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGJvb3RzdHJhcFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBib290c3RyYXBNZXRhLCBuYW1lLCAnYm9vdHN0cmFwJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ3NjaGVtYXMnKSkge1xuICAgICAgY29uc3QgcmF3RXhwciA9IG5nTW9kdWxlLmdldCgnc2NoZW1hcycpICE7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwciwgYE5nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHNjaGVtYVJlZiBvZiByZXN1bHQpIHtcbiAgICAgICAgaWYgKCEoc2NoZW1hUmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLFxuICAgICAgICAgICAgICAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZCA9IHNjaGVtYVJlZi5nZXRJZGVudGl0eUluKHNjaGVtYVJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBzY2hlbWFSZWYub3duZWRCeU1vZHVsZUd1ZXNzICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwcixcbiAgICAgICAgICAgICAgJ05nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheSBvZiBzY2hlbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2luY2UgYGlkYCBpcyB0aGUgYHRzLklkZW50aWZlcmAgd2l0aGluIHRoZSBzY2hlbWEgcmVmJ3MgZGVjbGFyYXRpb24gZmlsZSwgaXQncyBzYWZlIHRvXG4gICAgICAgIC8vIHVzZSBgaWQudGV4dGAgaGVyZSB0byBmaWd1cmUgb3V0IHdoaWNoIHNjaGVtYSBpcyBpbiB1c2UuIEV2ZW4gaWYgdGhlIGFjdHVhbCByZWZlcmVuY2Ugd2FzXG4gICAgICAgIC8vIHJlbmFtZWQgd2hlbiB0aGUgdXNlciBpbXBvcnRlZCBpdCwgdGhlc2UgbmFtZXMgd2lsbCBtYXRjaC5cbiAgICAgICAgc3dpdGNoIChpZC50ZXh0KSB7XG4gICAgICAgICAgY2FzZSAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdOT19FUlJPUlNfU0NIRU1BJzpcbiAgICAgICAgICAgIHNjaGVtYXMucHVzaChOT19FUlJPUlNfU0NIRU1BKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLFxuICAgICAgICAgICAgICAgIGAnJHtzY2hlbWFSZWYuZGVidWdOYW1lfScgaXMgbm90IGEgdmFsaWQgTmdNb2R1bGUgc2NoZW1hYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpZDogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgICAgbmdNb2R1bGUuaGFzKCdpZCcpID8gbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2lkJykgISkgOiBudWxsO1xuXG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlXG4gICAgLy8gY29tcHV0YXRpb24uXG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKHtcbiAgICAgIHJlZjogbmV3IFJlZmVyZW5jZShub2RlKSxcbiAgICAgIHNjaGVtYXMsXG4gICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9uUmVmcyxcbiAgICAgIGltcG9ydHM6IGltcG9ydFJlZnMsXG4gICAgICBleHBvcnRzOiBleHBvcnRSZWZzLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdmFsdWVDb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBsZXQgdHlwZUNvbnRleHQgPSB2YWx1ZUNvbnRleHQ7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAodHlwZU5vZGUgIT09IG51bGwpIHtcbiAgICAgIHR5cGVDb250ZXh0ID0gdHlwZU5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb3RzdHJhcCA9XG4gICAgICAgIGJvb3RzdHJhcFJlZnMubWFwKGJvb3RzdHJhcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGJvb3RzdHJhcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9XG4gICAgICAgIGRlY2xhcmF0aW9uUmVmcy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBpbXBvcnRzID0gaW1wb3J0UmVmcy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFJlZnMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuXG4gICAgY29uc3QgaXNGb3J3YXJkUmVmZXJlbmNlID0gKHJlZjogUjNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocmVmLnZhbHVlLCBub2RlLm5hbWUgISwgdmFsdWVDb250ZXh0KTtcbiAgICBjb25zdCBjb250YWluc0ZvcndhcmREZWNscyA9IGJvb3RzdHJhcC5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZGVjbGFyYXRpb25zLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fCBpbXBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBleHBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKTtcblxuICAgIGNvbnN0IG5nTW9kdWxlRGVmOiBSM05nTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUubmFtZSksXG4gICAgICBpbnRlcm5hbFR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhub2RlKSksXG4gICAgICBhZGphY2VudFR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhub2RlKSksXG4gICAgICBib290c3RyYXAsXG4gICAgICBkZWNsYXJhdGlvbnMsXG4gICAgICBleHBvcnRzLFxuICAgICAgaW1wb3J0cyxcbiAgICAgIGNvbnRhaW5zRm9yd2FyZERlY2xzLFxuICAgICAgaWQsXG4gICAgICBlbWl0SW5saW5lOiBmYWxzZSxcbiAgICAgIC8vIFRPRE86IHRvIGJlIGltcGxlbWVudGVkIGFzIGEgcGFydCBvZiBGVy0xMDA0LlxuICAgICAgc2NoZW1hczogW10sXG4gICAgfTtcblxuICAgIGNvbnN0IHJhd1Byb3ZpZGVycyA9IG5nTW9kdWxlLmhhcygncHJvdmlkZXJzJykgPyBuZ01vZHVsZS5nZXQoJ3Byb3ZpZGVycycpICEgOiBudWxsO1xuICAgIGNvbnN0IHByb3ZpZGVycyA9IHJhd1Byb3ZpZGVycyAhPT0gbnVsbCA/IG5ldyBXcmFwcGVkTm9kZUV4cHIocmF3UHJvdmlkZXJzKSA6IG51bGw7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBvbmx5IGFkZCB0aGUgbW9kdWxlJ3MgaW1wb3J0cyBhcyB0aGUgaW5qZWN0b3JzJyBpbXBvcnRzLiBBbnkgZXhwb3J0ZWQgbW9kdWxlc1xuICAgIC8vIGFyZSBhZGRlZCBkdXJpbmcgYHJlc29sdmVgLCBhcyB3ZSBuZWVkIHNjb3BlIGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gZmlsdGVyIG91dCBkaXJlY3RpdmVzXG4gICAgLy8gYW5kIHBpcGVzIGZyb20gdGhlIG1vZHVsZSBleHBvcnRzLlxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lKSxcbiAgICAgIGludGVybmFsVHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKG5vZGUpKSxcbiAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICBwcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBpbmplY3RvckltcG9ydHMsXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBpZCxcbiAgICAgICAgbW9kOiBuZ01vZHVsZURlZixcbiAgICAgICAgaW5qOiBuZ0luamVjdG9yRGVmLFxuICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9uUmVmcyxcbiAgICAgICAgZXhwb3J0czogZXhwb3J0UmVmcyxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICB9LFxuICAgICAgZmFjdG9yeVN5bWJvbE5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgIH07XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogUmVzb2x2ZVJlc3VsdCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0U2NvcGVPZk1vZHVsZShub2RlKTtcbiAgICBjb25zdCBkaWFnbm9zdGljcyA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREaWFnbm9zdGljc09mTW9kdWxlKG5vZGUpIHx8IHVuZGVmaW5lZDtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgLy8gVXNpbmcgdGhlIHNjb3BlIGluZm9ybWF0aW9uLCBleHRlbmQgdGhlIGluamVjdG9yJ3MgaW1wb3J0cyB1c2luZyB0aGUgbW9kdWxlcyB0aGF0IGFyZVxuICAgICAgLy8gc3BlY2lmaWVkIGFzIG1vZHVsZSBleHBvcnRzLlxuICAgICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGV4cG9ydFJlZiBvZiBhbmFseXNpcy5leHBvcnRzKSB7XG4gICAgICAgIGlmIChpc05nTW9kdWxlKGV4cG9ydFJlZi5ub2RlLCBzY29wZS5jb21waWxhdGlvbikpIHtcbiAgICAgICAgICBhbmFseXNpcy5pbmouaW1wb3J0cy5wdXNoKHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZiwgY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG5cbiAgICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsICYmIG1ldGFkYXRhLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGRlY2wubm9kZSxcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAke2RlY2wubm9kZS5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5yZWV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljcyxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3IoYW5hbHlzaXMuaW5qKTtcbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IGNvbXBpbGVOZ01vZHVsZShhbmFseXNpcy5tb2QpO1xuICAgIGNvbnN0IG5nTW9kdWxlU3RhdGVtZW50cyA9IG5nTW9kdWxlRGVmLmFkZGl0aW9uYWxTdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShkZWNsLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUodHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlKTtcbiAgICAgICAgaWYgKHNjb3BlID09PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyZWN0aXZlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSBzY29wZS5jb21waWxhdGlvbi5waXBlcy5tYXAocGlwZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLnJlZiwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKGRpcmVjdGl2ZXMpO1xuICAgICAgICBjb25zdCBwaXBlc0FycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIocGlwZXMpO1xuICAgICAgICBjb25zdCBkZWNsRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRlY2wsIGNvbnRleHQpICE7XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtW1vZCcsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ01vZHVsZVN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnybVpbmonLFxuICAgICAgICBpbml0aWFsaXplcjogbmdJbmplY3RvckRlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ0luamVjdG9yRGVmLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nSW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH1cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMubG9jYWxlSWQpIHtcbiAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ8m1bG9jJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5ldyBMaXRlcmFsRXhwcih0aGlzLmxvY2FsZUlkKSxcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IFNUUklOR19UWVBFXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9SM1JlZmVyZW5jZShcbiAgICAgIHZhbHVlUmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSk6IFIzUmVmZXJlbmNlIHtcbiAgICBpZiAodmFsdWVSZWYuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB2YWx1ZVJlZiwgdmFsdWVDb250ZXh0LCB2YWx1ZUNvbnRleHQsIHRoaXMucmVmRW1pdHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB0eXBlUmVmID0gdmFsdWVSZWY7XG4gICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbih0eXBlUmVmLm5vZGUpO1xuICAgICAgaWYgKHR5cGVOb2RlICE9PSBudWxsICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbih0eXBlTm9kZSkpIHtcbiAgICAgICAgdHlwZVJlZiA9IG5ldyBSZWZlcmVuY2UodHlwZU5vZGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHR5cGVSZWYsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQsIHRoaXMucmVmRW1pdHRlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdpdmVuIGEgYEZ1bmN0aW9uRGVjbGFyYXRpb25gLCBgTWV0aG9kRGVjbGFyYXRpb25gIG9yIGBGdW5jdGlvbkV4cHJlc3Npb25gLCBjaGVjayBpZiBpdCBpc1xuICAgKiB0eXBlZCBhcyBhIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBhbmQgcmV0dXJuIGFuIGV4cHJlc3Npb24gcmVmZXJlbmNpbmcgdGhlIG1vZHVsZSBpZiBhdmFpbGFibGUuXG4gICAqL1xuICBwcml2YXRlIF9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5NZXRob2REZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuRnVuY3Rpb25FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCB0eXBlID0gbm9kZS50eXBlIHx8IG51bGw7XG4gICAgcmV0dXJuIHR5cGUgJiZcbiAgICAgICAgKHRoaXMuX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKHR5cGUsIG5vZGUpIHx8IHRoaXMuX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuIGBOZ01vZHVsZWAgaWRlbnRpZmllciAoVCkgZnJvbSB0aGUgc3BlY2lmaWVkIGB0eXBlYCwgaWYgaXQgaXMgb2YgdGhlIGZvcm06XG4gICAqIGBNb2R1bGVXaXRoUHJvdmlkZXJzPFQ+YFxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbVR5cGVQYXJhbShcbiAgICAgIHR5cGU6IHRzLlR5cGVOb2RlLFxuICAgICAgbm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnx0cy5NZXRob2REZWNsYXJhdGlvbnx0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIC8vIEV4YW1pbmUgdGhlIHR5cGUgb2YgdGhlIGZ1bmN0aW9uIHRvIHNlZSBpZiBpdCdzIGEgTW9kdWxlV2l0aFByb3ZpZGVycyByZWZlcmVuY2UuXG4gICAgaWYgKCF0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKHR5cGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlTmFtZSA9IHR5cGUgJiYgKHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5pc1F1YWxpZmllZE5hbWUodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZS5yaWdodCkgfHxcbiAgICAgICAgbnVsbDtcbiAgICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHR5cGUgaXRzZWxmIHRvIHNlZSB3aGVyZSBpdCBjb21lcyBmcm9tLlxuICAgIGNvbnN0IGlkID0gdGhpcy5yZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgY29uc3QgcGFyZW50ID1cbiAgICAgICAgICB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgPyBub2RlLnBhcmVudCA6IG51bGw7XG4gICAgICBjb25zdCBzeW1ib2xOYW1lID0gKHBhcmVudCAmJiBwYXJlbnQubmFtZSA/IHBhcmVudC5uYW1lLmdldFRleHQoKSArICcuJyA6ICcnKSArXG4gICAgICAgICAgKG5vZGUubmFtZSA/IG5vZGUubmFtZS5nZXRUZXh0KCkgOiAnYW5vbnltb3VzJyk7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMsIHR5cGUsXG4gICAgICAgICAgYCR7c3ltYm9sTmFtZX0gcmV0dXJucyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZSB3aXRob3V0IGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50LiBgICtcbiAgICAgICAgICAgICAgYFBsZWFzZSBhZGQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQgdG8gdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZS4gSWYgdGhpcyBgICtcbiAgICAgICAgICAgICAgYG9jY3VycmVuY2UgaXMgaW4gbGlicmFyeSBjb2RlIHlvdSBkb24ndCBjb250cm9sLCBwbGVhc2UgY29udGFjdCB0aGUgbGlicmFyeSBhdXRob3JzLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiB0eXBlTm9kZVRvVmFsdWVFeHByKGFyZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYEF8Qnx7bmdNb2R1bGU6IFR9fENgLlxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzSW50ZXJzZWN0aW9uVHlwZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgdHlwZS50eXBlcykge1xuICAgICAgaWYgKHRzLmlzVHlwZUxpdGVyYWxOb2RlKHQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiB0Lm1lbWJlcnMpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSB0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG0pICYmIHRzLmlzSWRlbnRpZmllcihtLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJyAmJiBtLnR5cGUgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZUV4cHJlc3Npb24gPSBuZ01vZHVsZVR5cGUgJiYgdHlwZU5vZGVUb1ZhbHVlRXhwcihuZ01vZHVsZVR5cGUpO1xuICAgICAgICAgIGlmIChuZ01vZHVsZUV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiBuZ01vZHVsZUV4cHJlc3Npb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgYSBgdHMuRGVjbGFyYXRpb25gIHJlZmVyZW5jZSBpcyBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZWZlcmVuY2UuXG4gIHByaXZhdGUgaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPik6XG4gICAgICByZWYgaXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhyZWYubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KFxuICAgICAgZXhwcjogdHMuTm9kZSwgcmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBjbGFzc05hbWU6IHN0cmluZyxcbiAgICAgIGFycmF5TmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgYEV4cGVjdGVkIGFycmF5IHdoZW4gcmVhZGluZyB0aGUgTmdNb2R1bGUuJHthcnJheU5hbWV9IG9mICR7Y2xhc3NOYW1lfWApO1xuICAgIH1cblxuICAgIHJlc29sdmVkTGlzdC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7XG4gICAgICAvLyBVbndyYXAgTW9kdWxlV2l0aFByb3ZpZGVycyBmb3IgbW9kdWxlcyB0aGF0IGFyZSBsb2NhbGx5IGRlY2xhcmVkIChhbmQgdGh1cyBzdGF0aWNcbiAgICAgIC8vIHJlc29sdXRpb24gd2FzIGFibGUgdG8gZGVzY2VuZCBpbnRvIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIGFuIG9iamVjdCBsaXRlcmFsLCBhIE1hcCkuXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBNYXAgJiYgZW50cnkuaGFzKCduZ01vZHVsZScpKSB7XG4gICAgICAgIGVudHJ5ID0gZW50cnkuZ2V0KCduZ01vZHVsZScpICE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBjbGFzc05hbWUsIGFycmF5TmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBlbnRyeS5ub2RlLFxuICAgICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9IGlzIG5vdCBhIGNsYXNzYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogUHJvZHVjZSBhIGJldHRlciBkaWFnbm9zdGljIGhlcmUgLSB0aGUgYXJyYXkgaW5kZXggbWF5IGJlIGFuIGlubmVyIGFycmF5LlxuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGV4cHIsXG4gICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9IGlzIG5vdCBhIHJlZmVyZW5jZTogJHtlbnRyeX1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZWZMaXN0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzTmdNb2R1bGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IFNjb3BlRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gIWNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMuc29tZShkaXJlY3RpdmUgPT4gZGlyZWN0aXZlLnJlZi5ub2RlID09PSBub2RlKSAmJlxuICAgICAgIWNvbXBpbGF0aW9uLnBpcGVzLnNvbWUocGlwZSA9PiBwaXBlLnJlZi5ub2RlID09PSBub2RlKTtcbn1cblxuZnVuY3Rpb24gaXNEZWNsYXJhdGlvblJlZmVyZW5jZShyZWY6IGFueSk6IHJlZiBpcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJlxuICAgICAgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihyZWYubm9kZSkpO1xufVxuIl19