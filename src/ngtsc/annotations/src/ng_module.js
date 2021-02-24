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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NgModuleDecoratorHandler = exports.NgModuleSymbol = void 0;
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    /**
     * Represents an Angular NgModule.
     */
    var NgModuleSymbol = /** @class */ (function (_super) {
        tslib_1.__extends(NgModuleSymbol, _super);
        function NgModuleSymbol() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.remotelyScopedComponents = [];
            return _this;
        }
        NgModuleSymbol.prototype.isPublicApiAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof NgModuleSymbol)) {
                return true;
            }
            // NgModules don't have a public API that could affect emit of Angular decorated classes.
            return false;
        };
        NgModuleSymbol.prototype.isEmitAffected = function (previousSymbol) {
            var e_1, _a;
            if (!(previousSymbol instanceof NgModuleSymbol)) {
                return true;
            }
            // compare our remotelyScopedComponents to the previous symbol
            if (previousSymbol.remotelyScopedComponents.length !== this.remotelyScopedComponents.length) {
                return true;
            }
            var _loop_1 = function (currEntry) {
                var prevEntry = previousSymbol.remotelyScopedComponents.find(function (prevEntry) {
                    return semantic_graph_1.isSymbolEqual(prevEntry.component, currEntry.component);
                });
                if (prevEntry === undefined) {
                    return { value: true };
                }
                if (!semantic_graph_1.isArrayEqual(currEntry.usedDirectives, prevEntry.usedDirectives, semantic_graph_1.isReferenceEqual)) {
                    return { value: true };
                }
                if (!semantic_graph_1.isArrayEqual(currEntry.usedPipes, prevEntry.usedPipes, semantic_graph_1.isReferenceEqual)) {
                    return { value: true };
                }
            };
            try {
                for (var _b = tslib_1.__values(this.remotelyScopedComponents), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var currEntry = _c.value;
                    var state_1 = _loop_1(currEntry);
                    if (typeof state_1 === "object")
                        return state_1.value;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return false;
        };
        NgModuleSymbol.prototype.addRemotelyScopedComponent = function (component, usedDirectives, usedPipes) {
            this.remotelyScopedComponents.push({ component: component, usedDirectives: usedDirectives, usedPipes: usedPipes });
        };
        return NgModuleSymbol;
    }(semantic_graph_1.SemanticSymbol));
    exports.NgModuleSymbol = NgModuleSymbol;
    /**
     * Compiles @NgModule annotations to ngModuleDef fields.
     *
     * TODO(alxhub): handle injector side of things as well.
     */
    var NgModuleDecoratorHandler = /** @class */ (function () {
        function NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, factoryTracker, defaultImportRecorder, annotateForClosureCompiler, injectableRegistry, localeId) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.metaReader = metaReader;
            this.metaRegistry = metaRegistry;
            this.scopeRegistry = scopeRegistry;
            this.referencesRegistry = referencesRegistry;
            this.isCore = isCore;
            this.routeAnalyzer = routeAnalyzer;
            this.refEmitter = refEmitter;
            this.factoryTracker = factoryTracker;
            this.defaultImportRecorder = defaultImportRecorder;
            this.annotateForClosureCompiler = annotateForClosureCompiler;
            this.injectableRegistry = injectableRegistry;
            this.localeId = localeId;
            this.precedence = transform_1.HandlerPrecedence.PRIMARY;
            this.name = NgModuleDecoratorHandler.name;
        }
        NgModuleDecoratorHandler.prototype.detect = function (node, decorators) {
            if (!decorators) {
                return undefined;
            }
            var decorator = util_1.findAngularDecorator(decorators, 'NgModule', this.isCore);
            if (decorator !== undefined) {
                return {
                    trigger: decorator.node,
                    decorator: decorator,
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            var e_2, _a, _b, e_3, _c;
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
            var diagnostics = [];
            // Extract the module declarations, imports, and exports.
            var declarationRefs = [];
            var rawDeclarations = null;
            if (ngModule.has('declarations')) {
                rawDeclarations = ngModule.get('declarations');
                var declarationMeta = this.evaluator.evaluate(rawDeclarations, util_1.forwardRefResolver);
                declarationRefs =
                    this.resolveTypeList(rawDeclarations, declarationMeta, name, 'declarations');
                try {
                    // Look through the declarations to make sure they're all a part of the current compilation.
                    for (var declarationRefs_1 = tslib_1.__values(declarationRefs), declarationRefs_1_1 = declarationRefs_1.next(); !declarationRefs_1_1.done; declarationRefs_1_1 = declarationRefs_1.next()) {
                        var ref = declarationRefs_1_1.value;
                        if (ref.node.getSourceFile().isDeclarationFile) {
                            var errorNode = ref.getOriginForDiagnostics(rawDeclarations);
                            diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "Cannot declare '" + ref.node.name
                                .text + "' in an NgModule as it's not a part of the current compilation.", [diagnostics_1.makeRelatedInformation(ref.node.name, "'" + ref.node.name.text + "' is declared here.")]));
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (declarationRefs_1_1 && !declarationRefs_1_1.done && (_a = declarationRefs_1.return)) _a.call(declarationRefs_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
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
                (_b = this.referencesRegistry).add.apply(_b, tslib_1.__spread([node], exportRefs));
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
                    throw diagnostics_2.createValueHasWrongTypeError(rawExpr, result, "NgModule.schemas must be an array");
                }
                try {
                    for (var result_1 = tslib_1.__values(result), result_1_1 = result_1.next(); !result_1_1.done; result_1_1 = result_1.next()) {
                        var schemaRef = result_1_1.value;
                        if (!(schemaRef instanceof imports_1.Reference)) {
                            throw diagnostics_2.createValueHasWrongTypeError(rawExpr, result, 'NgModule.schemas must be an array of schemas');
                        }
                        var id_1 = schemaRef.getIdentityIn(schemaRef.node.getSourceFile());
                        if (id_1 === null || schemaRef.ownedByModuleGuess !== '@angular/core') {
                            throw diagnostics_2.createValueHasWrongTypeError(rawExpr, result, 'NgModule.schemas must be an array of schemas');
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
                                throw diagnostics_2.createValueHasWrongTypeError(rawExpr, schemaRef, "'" + schemaRef.debugName + "' is not a valid NgModule schema");
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (result_1_1 && !result_1_1.done && (_c = result_1.return)) _c.call(result_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
            var id = ngModule.has('id') ? new compiler_1.WrappedNodeExpr(ngModule.get('id')) : null;
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
            var type = util_1.wrapTypeReference(this.reflector, node);
            var internalType = new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(node));
            var adjacentType = new compiler_1.WrappedNodeExpr(this.reflector.getAdjacentNameOfClass(node));
            var ngModuleDef = {
                type: type,
                internalType: internalType,
                adjacentType: adjacentType,
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
            var wrapperProviders = rawProviders !== null ?
                new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ? util_1.wrapFunctionExpressionsInParens(rawProviders) :
                    rawProviders) :
                null;
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
                type: type,
                internalType: internalType,
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                providers: wrapperProviders,
                imports: injectorImports,
            };
            return {
                analysis: {
                    id: id,
                    schemas: schemas,
                    mod: ngModuleDef,
                    inj: ngInjectorDef,
                    declarations: declarationRefs,
                    rawDeclarations: rawDeclarations,
                    imports: importRefs,
                    exports: exportRefs,
                    providers: rawProviders,
                    providersRequiringFactory: rawProviders ?
                        util_1.resolveProvidersRequiringFactory(rawProviders, this.reflector, this.evaluator) :
                        null,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
                    factorySymbolName: node.name.text,
                },
            };
        };
        NgModuleDecoratorHandler.prototype.symbol = function (node) {
            return new NgModuleSymbol(node);
        };
        NgModuleDecoratorHandler.prototype.register = function (node, analysis) {
            // Register this module's information with the LocalModuleScopeRegistry. This ensures that
            // during the compile() phase, the module's metadata is available for selector scope
            // computation.
            this.metaRegistry.registerNgModuleMetadata({
                ref: new imports_1.Reference(node),
                schemas: analysis.schemas,
                declarations: analysis.declarations,
                imports: analysis.imports,
                exports: analysis.exports,
                rawDeclarations: analysis.rawDeclarations,
            });
            if (this.factoryTracker !== null) {
                this.factoryTracker.track(node.getSourceFile(), {
                    name: analysis.factorySymbolName,
                    hasId: analysis.id !== null,
                });
            }
            this.injectableRegistry.registerInjectable(node);
        };
        NgModuleDecoratorHandler.prototype.resolve = function (node, analysis) {
            var e_4, _a, e_5, _b;
            var scope = this.scopeRegistry.getScopeOfModule(node);
            var diagnostics = [];
            var scopeDiagnostics = this.scopeRegistry.getDiagnosticsOfModule(node);
            if (scopeDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(scopeDiagnostics));
            }
            if (analysis.providersRequiringFactory !== null) {
                var providerDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.providersRequiringFactory, analysis.providers, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spread(providerDiagnostics));
            }
            var data = {
                injectorImports: [],
            };
            if (scope !== null && !scope.compilation.isPoisoned) {
                // Using the scope information, extend the injector's imports using the modules that are
                // specified as module exports.
                var context = typescript_1.getSourceFile(node);
                try {
                    for (var _c = tslib_1.__values(analysis.exports), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var exportRef = _d.value;
                        if (isNgModule(exportRef.node, scope.compilation)) {
                            data.injectorImports.push(this.refEmitter.emit(exportRef, context));
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_4) throw e_4.error; }
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
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
            }
            if (scope === null || scope.compilation.isPoisoned || scope.exported.isPoisoned ||
                scope.reexports === null) {
                return { data: data };
            }
            else {
                return {
                    data: data,
                    reexports: scope.reexports,
                };
            }
        };
        NgModuleDecoratorHandler.prototype.compileFull = function (node, analysis, resolution) {
            var e_6, _a;
            var _this = this;
            //  Merge the injector imports (which are 'exports' that were later found to be NgModules)
            //  computed during resolution with the ones from analysis.
            var ngInjectorDef = compiler_1.compileInjector(tslib_1.__assign(tslib_1.__assign({}, analysis.inj), { imports: tslib_1.__spread(analysis.inj.imports, resolution.injectorImports) }));
            var ngModuleDef = compiler_1.compileNgModule(analysis.mod);
            var ngModuleStatements = ngModuleDef.additionalStatements;
            if (analysis.metadataStmt !== null) {
                ngModuleStatements.push(analysis.metadataStmt);
            }
            var context = typescript_1.getSourceFile(node);
            try {
                for (var _b = tslib_1.__values(analysis.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    var remoteScope = this.scopeRegistry.getRemoteScope(decl.node);
                    if (remoteScope !== null) {
                        var directives = remoteScope.directives.map(function (directive) { return _this.refEmitter.emit(directive, context); });
                        var pipes = remoteScope.pipes.map(function (pipe) { return _this.refEmitter.emit(pipe, context); });
                        var directiveArray = new compiler_1.LiteralArrayExpr(directives);
                        var pipesArray = new compiler_1.LiteralArrayExpr(pipes);
                        var declExpr = this.refEmitter.emit(decl, context);
                        var setComponentScope = new compiler_1.ExternalExpr(compiler_1.R3Identifiers.setComponentScope);
                        var callExpr = new compiler_1.InvokeFunctionExpr(setComponentScope, [declExpr, directiveArray, pipesArray]);
                        ngModuleStatements.push(callExpr.toStmt());
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
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
                if (typeNode !== null && reflection_1.isNamedClassDeclaration(typeNode)) {
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
            var typeName = type &&
                (ts.isIdentifier(type.typeName) && type.typeName ||
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
            var e_7, _a, e_8, _b;
            if (!ts.isIntersectionTypeNode(type)) {
                return null;
            }
            try {
                for (var _c = tslib_1.__values(type.types), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var t = _d.value;
                    if (ts.isTypeLiteralNode(t)) {
                        try {
                            for (var _e = (e_8 = void 0, tslib_1.__values(t.members)), _f = _e.next(); !_f.done; _f = _e.next()) {
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
                        catch (e_8_1) { e_8 = { error: e_8_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_8) throw e_8.error; }
                        }
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_7) throw e_7.error; }
            }
            return null;
        };
        // Verify that a "Declaration" reference is a `ClassDeclaration` reference.
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
                throw diagnostics_2.createValueHasWrongTypeError(expr, resolvedList, "Expected array when reading the NgModule." + arrayName + " of " + className);
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
                else if (entry instanceof imports_1.Reference) {
                    if (!_this.isClassDeclarationReference(entry)) {
                        throw diagnostics_2.createValueHasWrongTypeError(entry.node, entry, "Value at position " + idx + " in the NgModule." + arrayName + " of " + className + " is not a class");
                    }
                    refList.push(entry);
                }
                else {
                    // TODO(alxhub): Produce a better diagnostic here - the array index may be an inner array.
                    throw diagnostics_2.createValueHasWrongTypeError(expr, entry, "Value at position " + idx + " in the NgModule." + arrayName + " of " + className + " is not a reference");
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdVQ7SUFDdlQsK0JBQWlDO0lBRWpDLDJFQUEwRztJQUMxRyxtRUFBaUY7SUFDakYsNkZBQWtJO0lBR2xJLHlFQUFpSjtJQUlqSix1RUFBZ0k7SUFDaEksa0ZBQXdEO0lBRXhELDJGQUFtRjtJQUNuRixxRkFBd0Q7SUFFeEQsNkVBQXdRO0lBcUJ4UTs7T0FFRztJQUNIO1FBQW9DLDBDQUFjO1FBQWxEO1lBQUEscUVBMERDO1lBekRTLDhCQUF3QixHQUkxQixFQUFFLENBQUM7O1FBcURYLENBQUM7UUFuREMsNENBQW1CLEdBQW5CLFVBQW9CLGNBQThCO1lBQ2hELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxjQUFjLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHlGQUF5RjtZQUN6RixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCx1Q0FBYyxHQUFkLFVBQWUsY0FBOEI7O1lBQzNDLElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxjQUFjLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDhEQUE4RDtZQUM5RCxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRTtnQkFDM0YsT0FBTyxJQUFJLENBQUM7YUFDYjtvQ0FFVSxTQUFTO2dCQUNsQixJQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFVBQUEsU0FBUztvQkFDdEUsT0FBTyw4QkFBYSxDQUFDLFNBQVMs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LFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBM0IsQ0FBMkIsQ0FBQztZQUN6RSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUF0QixDQUFzQixDQUFDLENBQUM7SUFDOUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlLCBDVVNUT01fRUxFTUVOVFNfU0NIRU1BLCBFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgTGl0ZXJhbEV4cHIsIE5PX0VSUk9SU19TQ0hFTUEsIFIzSWRlbnRpZmllcnMsIFIzSW5qZWN0b3JNZXRhZGF0YSwgUjNOZ01vZHVsZU1ldGFkYXRhLCBSM1JlZmVyZW5jZSwgU2NoZW1hTWV0YWRhdGEsIFN0YXRlbWVudCwgU1RSSU5HX1RZUEUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb259IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWwsIGlzU3ltYm9sRXF1YWwsIFNlbWFudGljUmVmZXJlbmNlLCBTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtjb21iaW5lUmVzb2x2ZXJzLCBmaW5kQW5ndWxhckRlY29yYXRvciwgZm9yd2FyZFJlZlJlc29sdmVyLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdNb2R1bGVBbmFseXNpcyB7XG4gIG1vZDogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBpbmo6IFIzSW5qZWN0b3JNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbiAgZmFjdG9yeVN5bWJvbE5hbWU6IHN0cmluZztcbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbiAgcHJvdmlkZXJzOiB0cy5FeHByZXNzaW9ufG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdNb2R1bGVSZXNvbHV0aW9uIHtcbiAgaW5qZWN0b3JJbXBvcnRzOiBFeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBBbmd1bGFyIE5nTW9kdWxlLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIHByaXZhdGUgcmVtb3RlbHlTY29wZWRDb21wb25lbnRzOiB7XG4gICAgY29tcG9uZW50OiBTZW1hbnRpY1N5bWJvbCxcbiAgICB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNSZWZlcmVuY2VbXSxcbiAgICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW11cbiAgfVtdID0gW107XG5cbiAgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIE5nTW9kdWxlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gTmdNb2R1bGVzIGRvbid0IGhhdmUgYSBwdWJsaWMgQVBJIHRoYXQgY291bGQgYWZmZWN0IGVtaXQgb2YgQW5ndWxhciBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc0VtaXRBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIE5nTW9kdWxlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gY29tcGFyZSBvdXIgcmVtb3RlbHlTY29wZWRDb21wb25lbnRzIHRvIHRoZSBwcmV2aW91cyBzeW1ib2xcbiAgICBpZiAocHJldmlvdXNTeW1ib2wucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmxlbmd0aCAhPT0gdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGN1cnJFbnRyeSBvZiB0aGlzLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cykge1xuICAgICAgY29uc3QgcHJldkVudHJ5ID0gcHJldmlvdXNTeW1ib2wucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmZpbmQocHJldkVudHJ5ID0+IHtcbiAgICAgICAgcmV0dXJuIGlzU3ltYm9sRXF1YWwocHJldkVudHJ5LmNvbXBvbmVudCwgY3VyckVudHJ5LmNvbXBvbmVudCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXZFbnRyeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE5vIHByZXZpb3VzIGVudHJ5IHdhcyBmb3VuZCwgd2hpY2ggbWVhbnMgdGhhdCB0aGlzIGNvbXBvbmVudCBiZWNhbWUgcmVtb3RlbHkgc2NvcGVkIGFuZFxuICAgICAgICAvLyBoZW5jZSB0aGlzIE5nTW9kdWxlIG5lZWRzIHRvIGJlIHJlLWVtaXR0ZWQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyRW50cnkudXNlZERpcmVjdGl2ZXMsIHByZXZFbnRyeS51c2VkRGlyZWN0aXZlcywgaXNSZWZlcmVuY2VFcXVhbCkpIHtcbiAgICAgICAgLy8gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIG9yIHRoZWlyIG9yZGVyIGhhcyBjaGFuZ2VkLiBTaW5jZSB0aGlzIE5nTW9kdWxlIGVtaXRzXG4gICAgICAgIC8vIHJlZmVyZW5jZXMgdG8gdGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzLCBpdCBzaG91bGQgYmUgcmUtZW1pdHRlZCB0byB1cGRhdGUgdGhpcyBsaXN0LlxuICAgICAgICAvLyBOb3RlOiB0aGUgTmdNb2R1bGUgZG9lcyBub3QgaGF2ZSB0byBiZSByZS1lbWl0dGVkIHdoZW4gYW55IG9mIHRoZSBkaXJlY3RpdmVzIGhhcyBoYWRcbiAgICAgICAgLy8gdGhlaXIgcHVibGljIEFQSSBjaGFuZ2VkLCBhcyB0aGUgTmdNb2R1bGUgb25seSBlbWl0cyBhIHJlZmVyZW5jZSB0byB0aGUgc3ltYm9sIGJ5IGl0c1xuICAgICAgICAvLyBuYW1lLiBUaGVyZWZvcmUsIHRlc3RpbmcgZm9yIHN5bWJvbCBlcXVhbGl0eSBpcyBzdWZmaWNpZW50LlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc0FycmF5RXF1YWwoY3VyckVudHJ5LnVzZWRQaXBlcywgcHJldkVudHJ5LnVzZWRQaXBlcywgaXNSZWZlcmVuY2VFcXVhbCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFkZFJlbW90ZWx5U2NvcGVkQ29tcG9uZW50KFxuICAgICAgY29tcG9uZW50OiBTZW1hbnRpY1N5bWJvbCwgdXNlZERpcmVjdGl2ZXM6IFNlbWFudGljUmVmZXJlbmNlW10sXG4gICAgICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW10pOiB2b2lkIHtcbiAgICB0aGlzLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5wdXNoKHtjb21wb25lbnQsIHVzZWREaXJlY3RpdmVzLCB1c2VkUGlwZXN9KTtcbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGVzIEBOZ01vZHVsZSBhbm5vdGF0aW9ucyB0byBuZ01vZHVsZURlZiBmaWVsZHMuXG4gKlxuICogVE9ETyhhbHhodWIpOiBoYW5kbGUgaW5qZWN0b3Igc2lkZSBvZiB0aGluZ3MgYXMgd2VsbC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIE5nTW9kdWxlQW5hbHlzaXMsIE5nTW9kdWxlU3ltYm9sLCBOZ01vZHVsZVJlc29sdXRpb24+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBtZXRhUmVhZGVyOiBNZXRhZGF0YVJlYWRlciwgcHJpdmF0ZSBtZXRhUmVnaXN0cnk6IE1ldGFkYXRhUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHNjb3BlUmVnaXN0cnk6IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgcmVmZXJlbmNlc1JlZ2lzdHJ5OiBSZWZlcmVuY2VzUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSByb3V0ZUFuYWx5emVyOiBOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ8bnVsbCwgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLFxuICAgICAgcHJpdmF0ZSBmYWN0b3J5VHJhY2tlcjogRmFjdG9yeVRyYWNrZXJ8bnVsbCxcbiAgICAgIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIsXG4gICAgICBwcml2YXRlIGFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyOiBib29sZWFuLFxuICAgICAgcHJpdmF0ZSBpbmplY3RhYmxlUmVnaXN0cnk6IEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBwcml2YXRlIGxvY2FsZUlkPzogc3RyaW5nKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5QUklNQVJZO1xuICByZWFkb25seSBuYW1lID0gTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyLm5hbWU7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ05nTW9kdWxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIGRlY29yYXRvcjogZGVjb3JhdG9yLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6XG4gICAgICBBbmFseXNpc091dHB1dDxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlcnMgPSBjb21iaW5lUmVzb2x2ZXJzKFtcbiAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSksXG4gICAgICBmb3J3YXJkUmVmUmVzb2x2ZXIsXG4gICAgXSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25SZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIHJhd0RlY2xhcmF0aW9ucyA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykhO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25NZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RGVjbGFyYXRpb25zLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgZGVjbGFyYXRpb25SZWZzID1cbiAgICAgICAgICB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdEZWNsYXJhdGlvbnMsIGRlY2xhcmF0aW9uTWV0YSwgbmFtZSwgJ2RlY2xhcmF0aW9ucycpO1xuXG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIGRlY2xhcmF0aW9ucyB0byBtYWtlIHN1cmUgdGhleSdyZSBhbGwgYSBwYXJ0IG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgICAgZm9yIChjb25zdCByZWYgb2YgZGVjbGFyYXRpb25SZWZzKSB7XG4gICAgICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb25zdCBlcnJvck5vZGU6IHRzLkV4cHJlc3Npb24gPSByZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MocmF3RGVjbGFyYXRpb25zKTtcblxuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICAgIGBDYW5ub3QgZGVjbGFyZSAnJHtcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nIGluIGFuIE5nTW9kdWxlIGFzIGl0J3Mgbm90IGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5gLFxuICAgICAgICAgICAgICBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWUsIGAnJHtyZWYubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmApXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3SW1wb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGltcG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdJbXBvcnRzLCBpbXBvcnRzTWV0YSwgbmFtZSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0V4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICByYXdFeHBvcnRzID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykhO1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgZXhwb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0V4cG9ydHMsIGV4cG9ydHNNZXRhLCBuYW1lLCAnZXhwb3J0cycpO1xuICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKG5vZGUsIC4uLmV4cG9ydFJlZnMpO1xuICAgIH1cbiAgICBsZXQgYm9vdHN0cmFwUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdib290c3RyYXAnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnYm9vdHN0cmFwJykhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdzY2hlbWFzJykpIHtcbiAgICAgIGNvbnN0IHJhd0V4cHIgPSBuZ01vZHVsZS5nZXQoJ3NjaGVtYXMnKSE7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IocmF3RXhwciwgcmVzdWx0LCBgTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hUmVmIG9mIHJlc3VsdCkge1xuICAgICAgICBpZiAoIShzY2hlbWFSZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgcmF3RXhwciwgcmVzdWx0LCAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZCA9IHNjaGVtYVJlZi5nZXRJZGVudGl0eUluKHNjaGVtYVJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBzY2hlbWFSZWYub3duZWRCeU1vZHVsZUd1ZXNzICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICByYXdFeHByLCByZXN1bHQsICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNpbmNlIGBpZGAgaXMgdGhlIGB0cy5JZGVudGlmZXJgIHdpdGhpbiB0aGUgc2NoZW1hIHJlZidzIGRlY2xhcmF0aW9uIGZpbGUsIGl0J3Mgc2FmZSB0b1xuICAgICAgICAvLyB1c2UgYGlkLnRleHRgIGhlcmUgdG8gZmlndXJlIG91dCB3aGljaCBzY2hlbWEgaXMgaW4gdXNlLiBFdmVuIGlmIHRoZSBhY3R1YWwgcmVmZXJlbmNlIHdhc1xuICAgICAgICAvLyByZW5hbWVkIHdoZW4gdGhlIHVzZXIgaW1wb3J0ZWQgaXQsIHRoZXNlIG5hbWVzIHdpbGwgbWF0Y2guXG4gICAgICAgIHN3aXRjaCAoaWQudGV4dCkge1xuICAgICAgICAgIGNhc2UgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKENVU1RPTV9FTEVNRU5UU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnTk9fRVJST1JTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goTk9fRVJST1JTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICByYXdFeHByLCBzY2hlbWFSZWYsIGAnJHtzY2hlbWFSZWYuZGVidWdOYW1lfScgaXMgbm90IGEgdmFsaWQgTmdNb2R1bGUgc2NoZW1hYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpZDogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgICAgbmdNb2R1bGUuaGFzKCdpZCcpID8gbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2lkJykhKSA6IG51bGw7XG4gICAgY29uc3QgdmFsdWVDb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBsZXQgdHlwZUNvbnRleHQgPSB2YWx1ZUNvbnRleHQ7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAodHlwZU5vZGUgIT09IG51bGwpIHtcbiAgICAgIHR5cGVDb250ZXh0ID0gdHlwZU5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb3RzdHJhcCA9XG4gICAgICAgIGJvb3RzdHJhcFJlZnMubWFwKGJvb3RzdHJhcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGJvb3RzdHJhcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9XG4gICAgICAgIGRlY2xhcmF0aW9uUmVmcy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBpbXBvcnRzID0gaW1wb3J0UmVmcy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFJlZnMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuXG4gICAgY29uc3QgaXNGb3J3YXJkUmVmZXJlbmNlID0gKHJlZjogUjNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocmVmLnZhbHVlLCBub2RlLm5hbWUhLCB2YWx1ZUNvbnRleHQpO1xuICAgIGNvbnN0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gYm9vdHN0cmFwLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbnMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8IGltcG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGV4cG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IHdyYXBUeXBlUmVmZXJlbmNlKHRoaXMucmVmbGVjdG9yLCBub2RlKTtcbiAgICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRoaXMucmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3Mobm9kZSkpO1xuICAgIGNvbnN0IGFkamFjZW50VHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhub2RlKSk7XG5cbiAgICBjb25zdCBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIGFkamFjZW50VHlwZSxcbiAgICAgIGJvb3RzdHJhcCxcbiAgICAgIGRlY2xhcmF0aW9ucyxcbiAgICAgIGV4cG9ydHMsXG4gICAgICBpbXBvcnRzLFxuICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMsXG4gICAgICBpZCxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmF3UHJvdmlkZXJzID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/IG5nTW9kdWxlLmdldCgncHJvdmlkZXJzJykhIDogbnVsbDtcbiAgICBjb25zdCB3cmFwcGVyUHJvdmlkZXJzID0gcmF3UHJvdmlkZXJzICE9PSBudWxsID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHJhd1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1Byb3ZpZGVycykgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgb25seSBhZGQgdGhlIG1vZHVsZSdzIGltcG9ydHMgYXMgdGhlIGluamVjdG9ycycgaW1wb3J0cy4gQW55IGV4cG9ydGVkIG1vZHVsZXNcbiAgICAvLyBhcmUgYWRkZWQgZHVyaW5nIGByZXNvbHZlYCwgYXMgd2UgbmVlZCBzY29wZSBpbmZvcm1hdGlvbiB0byBiZSBhYmxlIHRvIGZpbHRlciBvdXQgZGlyZWN0aXZlc1xuICAgIC8vIGFuZCBwaXBlcyBmcm9tIHRoZSBtb2R1bGUgZXhwb3J0cy5cbiAgICBjb25zdCBpbmplY3RvckltcG9ydHM6IFdyYXBwZWROb2RlRXhwcjx0cy5FeHByZXNzaW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBpbmplY3RvckltcG9ydHMucHVzaChuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaW1wb3J0cycpISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgcHJvdmlkZXJzOiB3cmFwcGVyUHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogaW5qZWN0b3JJbXBvcnRzLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaWQsXG4gICAgICAgIHNjaGVtYXM6IHNjaGVtYXMsXG4gICAgICAgIG1vZDogbmdNb2R1bGVEZWYsXG4gICAgICAgIGluajogbmdJbmplY3RvckRlZixcbiAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsXG4gICAgICAgIHJhd0RlY2xhcmF0aW9ucyxcbiAgICAgICAgaW1wb3J0czogaW1wb3J0UmVmcyxcbiAgICAgICAgZXhwb3J0czogZXhwb3J0UmVmcyxcbiAgICAgICAgcHJvdmlkZXJzOiByYXdQcm92aWRlcnMsXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IHJhd1Byb3ZpZGVycyA/XG4gICAgICAgICAgICByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeShyYXdQcm92aWRlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcikgOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBzeW1ib2wobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IE5nTW9kdWxlU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IE5nTW9kdWxlU3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIG1vZHVsZSdzIGluZm9ybWF0aW9uIHdpdGggdGhlIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeS4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZSwgdGhlIG1vZHVsZSdzIG1ldGFkYXRhIGlzIGF2YWlsYWJsZSBmb3Igc2VsZWN0b3Igc2NvcGVcbiAgICAvLyBjb21wdXRhdGlvbi5cbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoe1xuICAgICAgcmVmOiBuZXcgUmVmZXJlbmNlKG5vZGUpLFxuICAgICAgc2NoZW1hczogYW5hbHlzaXMuc2NoZW1hcyxcbiAgICAgIGRlY2xhcmF0aW9uczogYW5hbHlzaXMuZGVjbGFyYXRpb25zLFxuICAgICAgaW1wb3J0czogYW5hbHlzaXMuaW1wb3J0cyxcbiAgICAgIGV4cG9ydHM6IGFuYWx5c2lzLmV4cG9ydHMsXG4gICAgICByYXdEZWNsYXJhdGlvbnM6IGFuYWx5c2lzLnJhd0RlY2xhcmF0aW9ucyxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLmZhY3RvcnlUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmZhY3RvcnlUcmFja2VyLnRyYWNrKG5vZGUuZ2V0U291cmNlRmlsZSgpLCB7XG4gICAgICAgIG5hbWU6IGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lLFxuICAgICAgICBoYXNJZDogYW5hbHlzaXMuaWQgIT09IG51bGwsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPik6XG4gICAgICBSZXNvbHZlUmVzdWx0PE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUobm9kZSk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGVEaWFnbm9zdGljcyA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREaWFnbm9zdGljc09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChzY29wZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNjb3BlRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBwcm92aWRlckRpYWdub3N0aWNzID0gZ2V0UHJvdmlkZXJEaWFnbm9zdGljcyhcbiAgICAgICAgICBhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCBhbmFseXNpcy5wcm92aWRlcnMhLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnByb3ZpZGVyRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IE5nTW9kdWxlUmVzb2x1dGlvbiA9IHtcbiAgICAgIGluamVjdG9ySW1wb3J0czogW10sXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAhc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCkge1xuICAgICAgLy8gVXNpbmcgdGhlIHNjb3BlIGluZm9ybWF0aW9uLCBleHRlbmQgdGhlIGluamVjdG9yJ3MgaW1wb3J0cyB1c2luZyB0aGUgbW9kdWxlcyB0aGF0IGFyZVxuICAgICAgLy8gc3BlY2lmaWVkIGFzIG1vZHVsZSBleHBvcnRzLlxuICAgICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGV4cG9ydFJlZiBvZiBhbmFseXNpcy5leHBvcnRzKSB7XG4gICAgICAgIGlmIChpc05nTW9kdWxlKGV4cG9ydFJlZi5ub2RlLCBzY29wZS5jb21waWxhdGlvbikpIHtcbiAgICAgICAgICBkYXRhLmluamVjdG9ySW1wb3J0cy5wdXNoKHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZiwgY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG5cbiAgICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsICYmIG1ldGFkYXRhLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGRlY2wubm9kZSxcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAke2RlY2wubm9kZS5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICBpZiAoc2NvcGUgPT09IG51bGwgfHwgc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCB8fCBzY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkIHx8XG4gICAgICAgIHNjb3BlLnJlZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtkYXRhfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGF0YSxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PE5nTW9kdWxlQW5hbHlzaXM+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8TmdNb2R1bGVSZXNvbHV0aW9uPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgLy8gIE1lcmdlIHRoZSBpbmplY3RvciBpbXBvcnRzICh3aGljaCBhcmUgJ2V4cG9ydHMnIHRoYXQgd2VyZSBsYXRlciBmb3VuZCB0byBiZSBOZ01vZHVsZXMpXG4gICAgLy8gIGNvbXB1dGVkIGR1cmluZyByZXNvbHV0aW9uIHdpdGggdGhlIG9uZXMgZnJvbSBhbmFseXNpcy5cbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKHtcbiAgICAgIC4uLmFuYWx5c2lzLmluaixcbiAgICAgIGltcG9ydHM6IFsuLi5hbmFseXNpcy5pbmouaW1wb3J0cywgLi4ucmVzb2x1dGlvbi5pbmplY3RvckltcG9ydHNdLFxuICAgIH0pO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm1vZCk7XG4gICAgY29uc3QgbmdNb2R1bGVTdGF0ZW1lbnRzID0gbmdNb2R1bGVEZWYuYWRkaXRpb25hbFN0YXRlbWVudHM7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgY29uc3QgcmVtb3RlU2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0UmVtb3RlU2NvcGUoZGVjbC5ub2RlKTtcbiAgICAgIGlmIChyZW1vdGVTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVzID1cbiAgICAgICAgICAgIHJlbW90ZVNjb3BlLmRpcmVjdGl2ZXMubWFwKGRpcmVjdGl2ZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkaXJlY3RpdmUsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSByZW1vdGVTY29wZS5waXBlcy5tYXAocGlwZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLCBjb250ZXh0KSk7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUFycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIoZGlyZWN0aXZlcyk7XG4gICAgICAgIGNvbnN0IHBpcGVzQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihwaXBlcyk7XG4gICAgICAgIGNvbnN0IGRlY2xFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGVjbCwgY29udGV4dCkhO1xuICAgICAgICBjb25zdCBzZXRDb21wb25lbnRTY29wZSA9IG5ldyBFeHRlcm5hbEV4cHIoUjNJZGVudGlmaWVycy5zZXRDb21wb25lbnRTY29wZSk7XG4gICAgICAgIGNvbnN0IGNhbGxFeHByID1cbiAgICAgICAgICAgIG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoc2V0Q29tcG9uZW50U2NvcGUsIFtkZWNsRXhwciwgZGlyZWN0aXZlQXJyYXksIHBpcGVzQXJyYXldKTtcblxuICAgICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChjYWxsRXhwci50b1N0bXQoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnybVtb2QnLFxuICAgICAgICBpbml0aWFsaXplcjogbmdNb2R1bGVEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogbmdNb2R1bGVTdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlOiBuZ01vZHVsZURlZi50eXBlLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1aW5qJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nSW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogbmdJbmplY3RvckRlZi5zdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlOiBuZ0luamVjdG9yRGVmLnR5cGUsXG4gICAgICB9XG4gICAgXTtcblxuICAgIGlmICh0aGlzLmxvY2FsZUlkKSB7XG4gICAgICByZXMucHVzaCh7XG4gICAgICAgIG5hbWU6ICfJtWxvYycsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZXcgTGl0ZXJhbEV4cHIodGhpcy5sb2NhbGVJZCksXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlOiBTVFJJTkdfVFlQRVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgX3RvUjNSZWZlcmVuY2UoXG4gICAgICB2YWx1ZVJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSk6IFIzUmVmZXJlbmNlIHtcbiAgICBpZiAodmFsdWVSZWYuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB2YWx1ZVJlZiwgdmFsdWVDb250ZXh0LCB2YWx1ZUNvbnRleHQsIHRoaXMucmVmRW1pdHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB0eXBlUmVmID0gdmFsdWVSZWY7XG4gICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbih0eXBlUmVmLm5vZGUpO1xuICAgICAgaWYgKHR5cGVOb2RlICE9PSBudWxsICYmIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSwgbm9kZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKFxuICAgICAgdHlwZTogdHMuVHlwZU5vZGUsXG4gICAgICBub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRXhhbWluZSB0aGUgdHlwZSBvZiB0aGUgZnVuY3Rpb24gdG8gc2VlIGlmIGl0J3MgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHJlZmVyZW5jZS5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVOYW1lID0gdHlwZSAmJlxuICAgICAgICAgICAgKHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lIHx8XG4gICAgICAgICAgICAgdHMuaXNRdWFsaWZpZWROYW1lKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUucmlnaHQpIHx8XG4gICAgICAgIG51bGw7XG4gICAgaWYgKHR5cGVOYW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlTmFtZSk7XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBuYW1lZCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBiYWlsLlxuICAgIGlmIChpZCA9PT0gbnVsbCB8fCBpZC5uYW1lICE9PSAnTW9kdWxlV2l0aFByb3ZpZGVycycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIGl0J3Mgbm90IGZyb20gQGFuZ3VsYXIvY29yZSwgYmFpbC5cbiAgICBpZiAoIXRoaXMuaXNDb3JlICYmIGlkLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBubyB0eXBlIHBhcmFtZXRlciBzcGVjaWZpZWQsIGJhaWwuXG4gICAgaWYgKHR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IHR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9XG4gICAgICAgICAgdHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpID8gbm9kZS5wYXJlbnQgOiBudWxsO1xuICAgICAgY29uc3Qgc3ltYm9sTmFtZSA9IChwYXJlbnQgJiYgcGFyZW50Lm5hbWUgPyBwYXJlbnQubmFtZS5nZXRUZXh0KCkgKyAnLicgOiAnJykgK1xuICAgICAgICAgIChub2RlLm5hbWUgPyBub2RlLm5hbWUuZ2V0VGV4dCgpIDogJ2Fub255bW91cycpO1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9NT0RVTEVfV0lUSF9QUk9WSURFUlNfTUlTU0lOR19HRU5FUklDLCB0eXBlLFxuICAgICAgICAgIGAke3N5bWJvbE5hbWV9IHJldHVybnMgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHR5cGUgd2l0aG91dCBhIGdlbmVyaWMgdHlwZSBhcmd1bWVudC4gYCArXG4gICAgICAgICAgICAgIGBQbGVhc2UgYWRkIGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50IHRvIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIHR5cGUuIElmIHRoaXMgYCArXG4gICAgICAgICAgICAgIGBvY2N1cnJlbmNlIGlzIGluIGxpYnJhcnkgY29kZSB5b3UgZG9uJ3QgY29udHJvbCwgcGxlYXNlIGNvbnRhY3QgdGhlIGxpYnJhcnkgYXV0aG9ycy5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcmcgPSB0eXBlLnR5cGVBcmd1bWVudHNbMF07XG5cbiAgICByZXR1cm4gdHlwZU5vZGVUb1ZhbHVlRXhwcihhcmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuIGBOZ01vZHVsZWAgaWRlbnRpZmllciAoVCkgZnJvbSB0aGUgc3BlY2lmaWVkIGB0eXBlYCwgaWYgaXQgaXMgb2YgdGhlIGZvcm06XG4gICAqIGBBfEJ8e25nTW9kdWxlOiBUfXxDYC5cbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCF0cy5pc0ludGVyc2VjdGlvblR5cGVOb2RlKHR5cGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZm9yIChjb25zdCB0IG9mIHR5cGUudHlwZXMpIHtcbiAgICAgIGlmICh0cy5pc1R5cGVMaXRlcmFsTm9kZSh0KSkge1xuICAgICAgICBmb3IgKGNvbnN0IG0gb2YgdC5tZW1iZXJzKSB7XG4gICAgICAgICAgY29uc3QgbmdNb2R1bGVUeXBlID0gdHMuaXNQcm9wZXJ0eVNpZ25hdHVyZShtKSAmJiB0cy5pc0lkZW50aWZpZXIobS5uYW1lKSAmJlxuICAgICAgICAgICAgICAgICAgbS5uYW1lLnRleHQgPT09ICduZ01vZHVsZScgJiYgbS50eXBlIHx8XG4gICAgICAgICAgICAgIG51bGw7XG4gICAgICAgICAgY29uc3QgbmdNb2R1bGVFeHByZXNzaW9uID0gbmdNb2R1bGVUeXBlICYmIHR5cGVOb2RlVG9WYWx1ZUV4cHIobmdNb2R1bGVUeXBlKTtcbiAgICAgICAgICBpZiAobmdNb2R1bGVFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbmdNb2R1bGVFeHByZXNzaW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFZlcmlmeSB0aGF0IGEgXCJEZWNsYXJhdGlvblwiIHJlZmVyZW5jZSBpcyBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZWZlcmVuY2UuXG4gIHByaXZhdGUgaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlKTogcmVmIGlzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmlzQ2xhc3MocmVmLm5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGUgYSBsaXN0IG9mIGBSZWZlcmVuY2VgcyBmcm9tIGEgcmVzb2x2ZWQgbWV0YWRhdGEgdmFsdWUuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVUeXBlTGlzdChcbiAgICAgIGV4cHI6IHRzLk5vZGUsIHJlc29sdmVkTGlzdDogUmVzb2x2ZWRWYWx1ZSwgY2xhc3NOYW1lOiBzdHJpbmcsXG4gICAgICBhcnJheU5hbWU6IHN0cmluZyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdIHtcbiAgICBjb25zdCByZWZMaXN0OiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZExpc3QpKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIGV4cHIsIHJlc29sdmVkTGlzdCxcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAgIC8vIFVud3JhcCBNb2R1bGVXaXRoUHJvdmlkZXJzIGZvciBtb2R1bGVzIHRoYXQgYXJlIGxvY2FsbHkgZGVjbGFyZWQgKGFuZCB0aHVzIHN0YXRpY1xuICAgICAgLy8gcmVzb2x1dGlvbiB3YXMgYWJsZSB0byBkZXNjZW5kIGludG8gdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gYW4gb2JqZWN0IGxpdGVyYWwsIGEgTWFwKS5cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgZW50cnkgPSBlbnRyeS5nZXQoJ25nTW9kdWxlJykhO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgICAgLy8gUmVjdXJzZSBpbnRvIG5lc3RlZCBhcnJheXMuXG4gICAgICAgIHJlZkxpc3QucHVzaCguLi50aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBlbnRyeSwgY2xhc3NOYW1lLCBhcnJheU5hbWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZW50cnkgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzQ2xhc3NEZWNsYXJhdGlvblJlZmVyZW5jZShlbnRyeSkpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICBlbnRyeS5ub2RlLCBlbnRyeSxcbiAgICAgICAgICAgICAgYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiB0aGUgTmdNb2R1bGUuJHthcnJheU5hbWV9IG9mICR7XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWV9IGlzIG5vdCBhIGNsYXNzYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogUHJvZHVjZSBhIGJldHRlciBkaWFnbm9zdGljIGhlcmUgLSB0aGUgYXJyYXkgaW5kZXggbWF5IGJlIGFuIGlubmVyIGFycmF5LlxuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZXhwciwgZW50cnksXG4gICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtcbiAgICAgICAgICAgICAgICBjbGFzc05hbWV9IGlzIG5vdCBhIHJlZmVyZW5jZWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOZ01vZHVsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogU2NvcGVEYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY29tcGlsYXRpb24uZGlyZWN0aXZlcy5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUucmVmLm5vZGUgPT09IG5vZGUpICYmXG4gICAgICAhY29tcGlsYXRpb24ucGlwZXMuc29tZShwaXBlID0+IHBpcGUucmVmLm5vZGUgPT09IG5vZGUpO1xufVxuIl19