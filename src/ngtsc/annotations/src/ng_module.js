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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/factory", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var factory_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/factory");
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
        NgModuleSymbol.prototype.isTypeCheckApiAffected = function (previousSymbol) {
            if (!(previousSymbol instanceof NgModuleSymbol)) {
                return true;
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
     */
    var NgModuleDecoratorHandler = /** @class */ (function () {
        function NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, factoryTracker, defaultImportRecorder, annotateForClosureCompiler, injectableRegistry, perf, localeId) {
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
            this.perf = perf;
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
            this.perf.eventCount(perf_1.PerfEvent.AnalyzeNgModule);
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
                providers: wrapperProviders,
                imports: injectorImports,
            };
            return {
                analysis: {
                    id: id,
                    schemas: schemas,
                    mod: ngModuleDef,
                    inj: ngInjectorDef,
                    deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
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
                            data.injectorImports.push(this.refEmitter.emit(exportRef, context).expression);
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
        NgModuleDecoratorHandler.prototype.compileFull = function (node, _a, resolution) {
            var e_6, _b;
            var _this = this;
            var inj = _a.inj, mod = _a.mod, deps = _a.deps, metadataStmt = _a.metadataStmt, declarations = _a.declarations;
            //  Merge the injector imports (which are 'exports' that were later found to be NgModules)
            //  computed during resolution with the ones from analysis.
            var ngInjectorDef = compiler_1.compileInjector(tslib_1.__assign(tslib_1.__assign({}, inj), { imports: tslib_1.__spread(inj.imports, resolution.injectorImports) }));
            var ngModuleDef = compiler_1.compileNgModule(mod);
            var ngModuleStatements = ngModuleDef.additionalStatements;
            if (metadataStmt !== null) {
                ngModuleStatements.push(metadataStmt);
            }
            var context = typescript_1.getSourceFile(node);
            try {
                for (var declarations_1 = tslib_1.__values(declarations), declarations_1_1 = declarations_1.next(); !declarations_1_1.done; declarations_1_1 = declarations_1.next()) {
                    var decl = declarations_1_1.value;
                    var remoteScope = this.scopeRegistry.getRemoteScope(decl.node);
                    if (remoteScope !== null) {
                        var directives = remoteScope.directives.map(function (directive) { return _this.refEmitter.emit(directive, context).expression; });
                        var pipes = remoteScope.pipes.map(function (pipe) { return _this.refEmitter.emit(pipe, context).expression; });
                        var directiveArray = new compiler_1.LiteralArrayExpr(directives);
                        var pipesArray = new compiler_1.LiteralArrayExpr(pipes);
                        var declExpr = this.refEmitter.emit(decl, context).expression;
                        var setComponentScope = new compiler_1.ExternalExpr(compiler_1.R3Identifiers.setComponentScope);
                        var callExpr = new compiler_1.InvokeFunctionExpr(setComponentScope, [declExpr, directiveArray, pipesArray]);
                        ngModuleStatements.push(callExpr.toStmt());
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (declarations_1_1 && !declarations_1_1.done && (_b = declarations_1.return)) _b.call(declarations_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
            var res = [
                factory_1.compileNgFactoryDefField({
                    name: inj.name,
                    type: inj.type,
                    internalType: inj.internalType,
                    typeArgumentCount: 0,
                    deps: deps,
                    injectFn: compiler_1.Identifiers.inject,
                    target: compiler_1.R3FactoryTarget.NgModule,
                }),
                {
                    name: 'ɵmod',
                    initializer: ngModuleDef.expression,
                    statements: ngModuleStatements,
                    type: ngModuleDef.type,
                },
                {
                    name: 'ɵinj',
                    initializer: ngInjectorDef.expression,
                    statements: [],
                    type: ngInjectorDef.type,
                },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBaVg7SUFDalgsK0JBQWlDO0lBRWpDLDJFQUEwRztJQUMxRyxtRUFBaUY7SUFDakYsNkZBQWtJO0lBR2xJLDZEQUFtRDtJQUNuRCx5RUFBaUo7SUFJakosdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCwyRkFBbUY7SUFDbkYsbUZBQW1EO0lBQ25ELHFGQUF3RDtJQUV4RCw2RUFBd1E7SUFzQnhROztPQUVHO0lBQ0g7UUFBb0MsMENBQWM7UUFBbEQ7WUFBQSxxRUFrRUM7WUFqRVMsOEJBQXdCLEdBSTFCLEVBQUUsQ0FBQzs7UUE2RFgsQ0FBQztRQTNEQyw0Q0FBbUIsR0FBbkIsVUFBb0IsY0FBOEI7WUFDaEQsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQseUZBQXlGO1lBQ3pGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELHVDQUFjLEdBQWQsVUFBZSxjQUE4Qjs7WUFDM0MsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsOERBQThEO1lBQzlELElBQUksY0FBYyxDQUFDLHdCQUF3QixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFO2dCQUMzRixPQUFPLElBQUksQ0FBQzthQUNiO29DQUVVLFNBQVM7Z0JBQ2xCLElBQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTO29C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QUFJLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUM1QyxNQUFNLDBDQUE0QixDQUM5QixLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFDakIsdUJBQXFCLEdBQUcseUJBQW9CLFNBQVMsWUFDakQsU0FBUyxvQkFBaUIsQ0FBQyxDQUFDO3FCQUNyQztvQkFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNyQjtxQkFBTTtvQkFDTCwwRkFBMEY7b0JBQzFGLE1BQU0sMENBQTRCLENBQzlCLElBQUksRUFBRSxLQUFLLEVBQ1gsdUJBQXFCLEdBQUcseUJBQW9CLFNBQVMsWUFDakQsU0FBUyx3QkFBcUIsQ0FBQyxDQUFDO2lCQUN6QztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQXJpQkQsSUFxaUJDO0lBcmlCWSw0REFBd0I7SUF1aUJyQyxTQUFTLFVBQVUsQ0FBQyxJQUFzQixFQUFFLFdBQXNCO1FBQ2hFLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBM0IsQ0FBMkIsQ0FBQztZQUN6RSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUF0QixDQUFzQixDQUFDLENBQUM7SUFDOUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge2NvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlLCBDVVNUT01fRUxFTUVOVFNfU0NIRU1BLCBFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIElkZW50aWZpZXJzIGFzIFIzLCBJbnZva2VGdW5jdGlvbkV4cHIsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBOT19FUlJPUlNfU0NIRU1BLCBSM0RlcGVuZGVuY3lNZXRhZGF0YSwgUjNGYWN0b3J5VGFyZ2V0LCBSM0lkZW50aWZpZXJzLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFNjaGVtYU1ldGFkYXRhLCBTdGF0ZW1lbnQsIFNUUklOR19UWVBFLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7aXNBcnJheUVxdWFsLCBpc1JlZmVyZW5jZUVxdWFsLCBpc1N5bWJvbEVxdWFsLCBTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjb21waWxlTmdGYWN0b3J5RGVmRmllbGR9IGZyb20gJy4vZmFjdG9yeSc7XG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge2NvbWJpbmVSZXNvbHZlcnMsIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBmb3J3YXJkUmVmUmVzb2x2ZXIsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UsIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCB0b1IzUmVmZXJlbmNlLCB1bndyYXBFeHByZXNzaW9uLCB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zLCB3cmFwVHlwZVJlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgbW9kOiBSM05nTW9kdWxlTWV0YWRhdGE7XG4gIGluajogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBkZXBzOiBSM0RlcGVuZGVuY3lNZXRhZGF0YVtdfG51bGw7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsO1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGlkOiBFeHByZXNzaW9ufG51bGw7XG4gIGZhY3RvcnlTeW1ib2xOYW1lOiBzdHJpbmc7XG4gIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG4gIHByb3ZpZGVyczogdHMuRXhwcmVzc2lvbnxudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlUmVzb2x1dGlvbiB7XG4gIGluamVjdG9ySW1wb3J0czogRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBOZ01vZHVsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nTW9kdWxlU3ltYm9sIGV4dGVuZHMgU2VtYW50aWNTeW1ib2wge1xuICBwcml2YXRlIHJlbW90ZWx5U2NvcGVkQ29tcG9uZW50czoge1xuICAgIGNvbXBvbmVudDogU2VtYW50aWNTeW1ib2wsXG4gICAgdXNlZERpcmVjdGl2ZXM6IFNlbWFudGljUmVmZXJlbmNlW10sXG4gICAgdXNlZFBpcGVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdXG4gIH1bXSA9IFtdO1xuXG4gIGlzUHVibGljQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIE5nTW9kdWxlcyBkb24ndCBoYXZlIGEgcHVibGljIEFQSSB0aGF0IGNvdWxkIGFmZmVjdCBlbWl0IG9mIEFuZ3VsYXIgZGVjb3JhdGVkIGNsYXNzZXMuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNFbWl0QWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgb3VyIHJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cyB0byB0aGUgcHJldmlvdXMgc3ltYm9sXG4gICAgaWYgKHByZXZpb3VzU3ltYm9sLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5sZW5ndGggIT09IHRoaXMucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBjdXJyRW50cnkgb2YgdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMpIHtcbiAgICAgIGNvbnN0IHByZXZFbnRyeSA9IHByZXZpb3VzU3ltYm9sLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5maW5kKHByZXZFbnRyeSA9PiB7XG4gICAgICAgIHJldHVybiBpc1N5bWJvbEVxdWFsKHByZXZFbnRyeS5jb21wb25lbnQsIGN1cnJFbnRyeS5jb21wb25lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2RW50cnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBObyBwcmV2aW91cyBlbnRyeSB3YXMgZm91bmQsIHdoaWNoIG1lYW5zIHRoYXQgdGhpcyBjb21wb25lbnQgYmVjYW1lIHJlbW90ZWx5IHNjb3BlZCBhbmRcbiAgICAgICAgLy8gaGVuY2UgdGhpcyBOZ01vZHVsZSBuZWVkcyB0byBiZSByZS1lbWl0dGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc0FycmF5RXF1YWwoY3VyckVudHJ5LnVzZWREaXJlY3RpdmVzLCBwcmV2RW50cnkudXNlZERpcmVjdGl2ZXMsIGlzUmVmZXJlbmNlRXF1YWwpKSB7XG4gICAgICAgIC8vIFRoZSBsaXN0IG9mIHVzZWQgZGlyZWN0aXZlcyBvciB0aGVpciBvcmRlciBoYXMgY2hhbmdlZC4gU2luY2UgdGhpcyBOZ01vZHVsZSBlbWl0c1xuICAgICAgICAvLyByZWZlcmVuY2VzIHRvIHRoZSBsaXN0IG9mIHVzZWQgZGlyZWN0aXZlcywgaXQgc2hvdWxkIGJlIHJlLWVtaXR0ZWQgdG8gdXBkYXRlIHRoaXMgbGlzdC5cbiAgICAgICAgLy8gTm90ZTogdGhlIE5nTW9kdWxlIGRvZXMgbm90IGhhdmUgdG8gYmUgcmUtZW1pdHRlZCB3aGVuIGFueSBvZiB0aGUgZGlyZWN0aXZlcyBoYXMgaGFkXG4gICAgICAgIC8vIHRoZWlyIHB1YmxpYyBBUEkgY2hhbmdlZCwgYXMgdGhlIE5nTW9kdWxlIG9ubHkgZW1pdHMgYSByZWZlcmVuY2UgdG8gdGhlIHN5bWJvbCBieSBpdHNcbiAgICAgICAgLy8gbmFtZS4gVGhlcmVmb3JlLCB0ZXN0aW5nIGZvciBzeW1ib2wgZXF1YWxpdHkgaXMgc3VmZmljaWVudC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNBcnJheUVxdWFsKGN1cnJFbnRyeS51c2VkUGlwZXMsIHByZXZFbnRyeS51c2VkUGlwZXMsIGlzUmVmZXJlbmNlRXF1YWwpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhZGRSZW1vdGVseVNjb3BlZENvbXBvbmVudChcbiAgICAgIGNvbXBvbmVudDogU2VtYW50aWNTeW1ib2wsIHVzZWREaXJlY3RpdmVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdLFxuICAgICAgdXNlZFBpcGVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdKTogdm9pZCB7XG4gICAgdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMucHVzaCh7Y29tcG9uZW50LCB1c2VkRGlyZWN0aXZlcywgdXNlZFBpcGVzfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgTmdNb2R1bGVBbmFseXNpcywgTmdNb2R1bGVTeW1ib2wsIE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGZhY3RvcnlUcmFja2VyOiBGYWN0b3J5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBsb2NhbGVJZD86IHN0cmluZykge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplTmdNb2R1bGUpO1xuXG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlcnMgPSBjb21iaW5lUmVzb2x2ZXJzKFtcbiAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSksXG4gICAgICBmb3J3YXJkUmVmUmVzb2x2ZXIsXG4gICAgXSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25SZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIHJhd0RlY2xhcmF0aW9ucyA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykhO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25NZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RGVjbGFyYXRpb25zLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgZGVjbGFyYXRpb25SZWZzID1cbiAgICAgICAgICB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdEZWNsYXJhdGlvbnMsIGRlY2xhcmF0aW9uTWV0YSwgbmFtZSwgJ2RlY2xhcmF0aW9ucycpO1xuXG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIGRlY2xhcmF0aW9ucyB0byBtYWtlIHN1cmUgdGhleSdyZSBhbGwgYSBwYXJ0IG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgICAgZm9yIChjb25zdCByZWYgb2YgZGVjbGFyYXRpb25SZWZzKSB7XG4gICAgICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb25zdCBlcnJvck5vZGU6IHRzLkV4cHJlc3Npb24gPSByZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MocmF3RGVjbGFyYXRpb25zKTtcblxuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICAgIGBDYW5ub3QgZGVjbGFyZSAnJHtcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nIGluIGFuIE5nTW9kdWxlIGFzIGl0J3Mgbm90IGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5gLFxuICAgICAgICAgICAgICBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWUsIGAnJHtyZWYubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmApXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3SW1wb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGltcG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdJbXBvcnRzLCBpbXBvcnRzTWV0YSwgbmFtZSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0V4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICByYXdFeHBvcnRzID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykhO1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgZXhwb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0V4cG9ydHMsIGV4cG9ydHNNZXRhLCBuYW1lLCAnZXhwb3J0cycpO1xuICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKG5vZGUsIC4uLmV4cG9ydFJlZnMpO1xuICAgIH1cbiAgICBsZXQgYm9vdHN0cmFwUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdib290c3RyYXAnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnYm9vdHN0cmFwJykhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdzY2hlbWFzJykpIHtcbiAgICAgIGNvbnN0IHJhd0V4cHIgPSBuZ01vZHVsZS5nZXQoJ3NjaGVtYXMnKSE7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IocmF3RXhwciwgcmVzdWx0LCBgTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hUmVmIG9mIHJlc3VsdCkge1xuICAgICAgICBpZiAoIShzY2hlbWFSZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgcmF3RXhwciwgcmVzdWx0LCAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZCA9IHNjaGVtYVJlZi5nZXRJZGVudGl0eUluKHNjaGVtYVJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBzY2hlbWFSZWYub3duZWRCeU1vZHVsZUd1ZXNzICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICByYXdFeHByLCByZXN1bHQsICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNpbmNlIGBpZGAgaXMgdGhlIGB0cy5JZGVudGlmZXJgIHdpdGhpbiB0aGUgc2NoZW1hIHJlZidzIGRlY2xhcmF0aW9uIGZpbGUsIGl0J3Mgc2FmZSB0b1xuICAgICAgICAvLyB1c2UgYGlkLnRleHRgIGhlcmUgdG8gZmlndXJlIG91dCB3aGljaCBzY2hlbWEgaXMgaW4gdXNlLiBFdmVuIGlmIHRoZSBhY3R1YWwgcmVmZXJlbmNlIHdhc1xuICAgICAgICAvLyByZW5hbWVkIHdoZW4gdGhlIHVzZXIgaW1wb3J0ZWQgaXQsIHRoZXNlIG5hbWVzIHdpbGwgbWF0Y2guXG4gICAgICAgIHN3aXRjaCAoaWQudGV4dCkge1xuICAgICAgICAgIGNhc2UgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKENVU1RPTV9FTEVNRU5UU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnTk9fRVJST1JTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goTk9fRVJST1JTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICByYXdFeHByLCBzY2hlbWFSZWYsIGAnJHtzY2hlbWFSZWYuZGVidWdOYW1lfScgaXMgbm90IGEgdmFsaWQgTmdNb2R1bGUgc2NoZW1hYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpZDogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgICAgbmdNb2R1bGUuaGFzKCdpZCcpID8gbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2lkJykhKSA6IG51bGw7XG4gICAgY29uc3QgdmFsdWVDb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBsZXQgdHlwZUNvbnRleHQgPSB2YWx1ZUNvbnRleHQ7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAodHlwZU5vZGUgIT09IG51bGwpIHtcbiAgICAgIHR5cGVDb250ZXh0ID0gdHlwZU5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb3RzdHJhcCA9XG4gICAgICAgIGJvb3RzdHJhcFJlZnMubWFwKGJvb3RzdHJhcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGJvb3RzdHJhcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9XG4gICAgICAgIGRlY2xhcmF0aW9uUmVmcy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBpbXBvcnRzID0gaW1wb3J0UmVmcy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFJlZnMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuXG4gICAgY29uc3QgaXNGb3J3YXJkUmVmZXJlbmNlID0gKHJlZjogUjNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocmVmLnZhbHVlLCBub2RlLm5hbWUhLCB2YWx1ZUNvbnRleHQpO1xuICAgIGNvbnN0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gYm9vdHN0cmFwLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbnMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8IGltcG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGV4cG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IHdyYXBUeXBlUmVmZXJlbmNlKHRoaXMucmVmbGVjdG9yLCBub2RlKTtcbiAgICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRoaXMucmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3Mobm9kZSkpO1xuICAgIGNvbnN0IGFkamFjZW50VHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhub2RlKSk7XG5cbiAgICBjb25zdCBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIGFkamFjZW50VHlwZSxcbiAgICAgIGJvb3RzdHJhcCxcbiAgICAgIGRlY2xhcmF0aW9ucyxcbiAgICAgIGV4cG9ydHMsXG4gICAgICBpbXBvcnRzLFxuICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMsXG4gICAgICBpZCxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmF3UHJvdmlkZXJzID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/IG5nTW9kdWxlLmdldCgncHJvdmlkZXJzJykhIDogbnVsbDtcbiAgICBjb25zdCB3cmFwcGVyUHJvdmlkZXJzID0gcmF3UHJvdmlkZXJzICE9PSBudWxsID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHJhd1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1Byb3ZpZGVycykgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgb25seSBhZGQgdGhlIG1vZHVsZSdzIGltcG9ydHMgYXMgdGhlIGluamVjdG9ycycgaW1wb3J0cy4gQW55IGV4cG9ydGVkIG1vZHVsZXNcbiAgICAvLyBhcmUgYWRkZWQgZHVyaW5nIGByZXNvbHZlYCwgYXMgd2UgbmVlZCBzY29wZSBpbmZvcm1hdGlvbiB0byBiZSBhYmxlIHRvIGZpbHRlciBvdXQgZGlyZWN0aXZlc1xuICAgIC8vIGFuZCBwaXBlcyBmcm9tIHRoZSBtb2R1bGUgZXhwb3J0cy5cbiAgICBjb25zdCBpbmplY3RvckltcG9ydHM6IFdyYXBwZWROb2RlRXhwcjx0cy5FeHByZXNzaW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBpbmplY3RvckltcG9ydHMucHVzaChuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaW1wb3J0cycpISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBwcm92aWRlcnM6IHdyYXBwZXJQcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBpbmplY3RvckltcG9ydHMsXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBpZCxcbiAgICAgICAgc2NoZW1hczogc2NoZW1hcyxcbiAgICAgICAgbW9kOiBuZ01vZHVsZURlZixcbiAgICAgICAgaW5qOiBuZ0luamVjdG9yRGVmLFxuICAgICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgICByYXdEZWNsYXJhdGlvbnMsXG4gICAgICAgIGltcG9ydHM6IGltcG9ydFJlZnMsXG4gICAgICAgIGV4cG9ydHM6IGV4cG9ydFJlZnMsXG4gICAgICAgIHByb3ZpZGVyczogcmF3UHJvdmlkZXJzLFxuICAgICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiByYXdQcm92aWRlcnMgP1xuICAgICAgICAgICAgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkocmF3UHJvdmlkZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpIDpcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgZmFjdG9yeVN5bWJvbE5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBOZ01vZHVsZVN5bWJvbCB7XG4gICAgcmV0dXJuIG5ldyBOZ01vZHVsZVN5bWJvbChub2RlKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlXG4gICAgLy8gY29tcHV0YXRpb24uXG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKHtcbiAgICAgIHJlZjogbmV3IFJlZmVyZW5jZShub2RlKSxcbiAgICAgIHNjaGVtYXM6IGFuYWx5c2lzLnNjaGVtYXMsXG4gICAgICBkZWNsYXJhdGlvbnM6IGFuYWx5c2lzLmRlY2xhcmF0aW9ucyxcbiAgICAgIGltcG9ydHM6IGFuYWx5c2lzLmltcG9ydHMsXG4gICAgICBleHBvcnRzOiBhbmFseXNpcy5leHBvcnRzLFxuICAgICAgcmF3RGVjbGFyYXRpb25zOiBhbmFseXNpcy5yYXdEZWNsYXJhdGlvbnMsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5mYWN0b3J5VHJhY2tlci50cmFjayhub2RlLmdldFNvdXJjZUZpbGUoKSwge1xuICAgICAgICBuYW1lOiBhbmFseXNpcy5mYWN0b3J5U3ltYm9sTmFtZSxcbiAgICAgICAgaGFzSWQ6IGFuYWx5c2lzLmlkICE9PSBudWxsLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgcmVzb2x2ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8TmdNb2R1bGVBbmFseXNpcz4pOlxuICAgICAgUmVzb2x2ZVJlc3VsdDxOZ01vZHVsZVJlc29sdXRpb24+IHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKG5vZGUpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGNvbnN0IHNjb3BlRGlhZ25vc3RpY3MgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0RGlhZ25vc3RpY3NPZk1vZHVsZShub2RlKTtcbiAgICBpZiAoc2NvcGVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zY29wZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMucHJvdmlkZXJzISwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhOiBOZ01vZHVsZVJlc29sdXRpb24gPSB7XG4gICAgICBpbmplY3RvckltcG9ydHM6IFtdLFxuICAgIH07XG5cbiAgICBpZiAoc2NvcGUgIT09IG51bGwgJiYgIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQpIHtcbiAgICAgIC8vIFVzaW5nIHRoZSBzY29wZSBpbmZvcm1hdGlvbiwgZXh0ZW5kIHRoZSBpbmplY3RvcidzIGltcG9ydHMgdXNpbmcgdGhlIG1vZHVsZXMgdGhhdCBhcmVcbiAgICAgIC8vIHNwZWNpZmllZCBhcyBtb2R1bGUgZXhwb3J0cy5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgICAgZm9yIChjb25zdCBleHBvcnRSZWYgb2YgYW5hbHlzaXMuZXhwb3J0cykge1xuICAgICAgICBpZiAoaXNOZ01vZHVsZShleHBvcnRSZWYubm9kZSwgc2NvcGUuY29tcGlsYXRpb24pKSB7XG4gICAgICAgICAgZGF0YS5pbmplY3RvckltcG9ydHMucHVzaCh0aGlzLnJlZkVtaXR0ZXIuZW1pdChleHBvcnRSZWYsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG5cbiAgICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsICYmIG1ldGFkYXRhLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGRlY2wubm9kZSxcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAke2RlY2wubm9kZS5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICBpZiAoc2NvcGUgPT09IG51bGwgfHwgc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCB8fCBzY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkIHx8XG4gICAgICAgIHNjb3BlLnJlZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtkYXRhfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGF0YSxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIHtpbmosIG1vZCwgZGVwcywgbWV0YWRhdGFTdG10LCBkZWNsYXJhdGlvbnN9OiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPixcbiAgICAgIHJlc29sdXRpb246IFJlYWRvbmx5PE5nTW9kdWxlUmVzb2x1dGlvbj4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIC8vICBNZXJnZSB0aGUgaW5qZWN0b3IgaW1wb3J0cyAod2hpY2ggYXJlICdleHBvcnRzJyB0aGF0IHdlcmUgbGF0ZXIgZm91bmQgdG8gYmUgTmdNb2R1bGVzKVxuICAgIC8vICBjb21wdXRlZCBkdXJpbmcgcmVzb2x1dGlvbiB3aXRoIHRoZSBvbmVzIGZyb20gYW5hbHlzaXMuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZiA9XG4gICAgICAgIGNvbXBpbGVJbmplY3Rvcih7Li4uaW5qLCBpbXBvcnRzOiBbLi4uaW5qLmltcG9ydHMsIC4uLnJlc29sdXRpb24uaW5qZWN0b3JJbXBvcnRzXX0pO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKG1vZCk7XG4gICAgY29uc3QgbmdNb2R1bGVTdGF0ZW1lbnRzID0gbmdNb2R1bGVEZWYuYWRkaXRpb25hbFN0YXRlbWVudHM7XG4gICAgaWYgKG1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2gobWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGRlY2xhcmF0aW9ucykge1xuICAgICAgY29uc3QgcmVtb3RlU2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0UmVtb3RlU2NvcGUoZGVjbC5ub2RlKTtcbiAgICAgIGlmIChyZW1vdGVTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gcmVtb3RlU2NvcGUuZGlyZWN0aXZlcy5tYXAoXG4gICAgICAgICAgICBkaXJlY3RpdmUgPT4gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGlyZWN0aXZlLCBjb250ZXh0KS5leHByZXNzaW9uKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSByZW1vdGVTY29wZS5waXBlcy5tYXAocGlwZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLCBjb250ZXh0KS5leHByZXNzaW9uKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihkaXJlY3RpdmVzKTtcbiAgICAgICAgY29uc3QgcGlwZXNBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKHBpcGVzKTtcbiAgICAgICAgY29uc3QgZGVjbEV4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkZWNsLCBjb250ZXh0KS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCBzZXRDb21wb25lbnRTY29wZSA9IG5ldyBFeHRlcm5hbEV4cHIoUjNJZGVudGlmaWVycy5zZXRDb21wb25lbnRTY29wZSk7XG4gICAgICAgIGNvbnN0IGNhbGxFeHByID1cbiAgICAgICAgICAgIG5ldyBJbnZva2VGdW5jdGlvbkV4cHIoc2V0Q29tcG9uZW50U2NvcGUsIFtkZWNsRXhwciwgZGlyZWN0aXZlQXJyYXksIHBpcGVzQXJyYXldKTtcblxuICAgICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChjYWxsRXhwci50b1N0bXQoKSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IHJlczogQ29tcGlsZVJlc3VsdFtdID0gW1xuICAgICAgY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKHtcbiAgICAgICAgbmFtZTogaW5qLm5hbWUsXG4gICAgICAgIHR5cGU6IGluai50eXBlLFxuICAgICAgICBpbnRlcm5hbFR5cGU6IGluai5pbnRlcm5hbFR5cGUsXG4gICAgICAgIHR5cGVBcmd1bWVudENvdW50OiAwLFxuICAgICAgICBkZXBzLFxuICAgICAgICBpbmplY3RGbjogUjMuaW5qZWN0LFxuICAgICAgICB0YXJnZXQ6IFIzRmFjdG9yeVRhcmdldC5OZ01vZHVsZSxcbiAgICAgIH0pLFxuICAgICAge1xuICAgICAgICBuYW1lOiAnybVtb2QnLFxuICAgICAgICBpbml0aWFsaXplcjogbmdNb2R1bGVEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogbmdNb2R1bGVTdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlOiBuZ01vZHVsZURlZi50eXBlLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1aW5qJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nSW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IG5nSW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGlmICh0aGlzLmxvY2FsZUlkKSB7XG4gICAgICByZXMucHVzaCh7XG4gICAgICAgIG5hbWU6ICfJtWxvYycsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZXcgTGl0ZXJhbEV4cHIodGhpcy5sb2NhbGVJZCksXG4gICAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgICAgICB0eXBlOiBTVFJJTkdfVFlQRVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHByaXZhdGUgX3RvUjNSZWZlcmVuY2UoXG4gICAgICB2YWx1ZVJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCB2YWx1ZUNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsXG4gICAgICB0eXBlQ29udGV4dDogdHMuU291cmNlRmlsZSk6IFIzUmVmZXJlbmNlIHtcbiAgICBpZiAodmFsdWVSZWYuaGFzT3duaW5nTW9kdWxlR3Vlc3MpIHtcbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB2YWx1ZVJlZiwgdmFsdWVDb250ZXh0LCB2YWx1ZUNvbnRleHQsIHRoaXMucmVmRW1pdHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB0eXBlUmVmID0gdmFsdWVSZWY7XG4gICAgICBsZXQgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbih0eXBlUmVmLm5vZGUpO1xuICAgICAgaWYgKHR5cGVOb2RlICE9PSBudWxsICYmIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSwgbm9kZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKFxuICAgICAgdHlwZTogdHMuVHlwZU5vZGUsXG4gICAgICBub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRXhhbWluZSB0aGUgdHlwZSBvZiB0aGUgZnVuY3Rpb24gdG8gc2VlIGlmIGl0J3MgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHJlZmVyZW5jZS5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVOYW1lID0gdHlwZSAmJlxuICAgICAgICAgICAgKHRzLmlzSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lIHx8XG4gICAgICAgICAgICAgdHMuaXNRdWFsaWZpZWROYW1lKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUucmlnaHQpIHx8XG4gICAgICAgIG51bGw7XG4gICAgaWYgKHR5cGVOYW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlTmFtZSk7XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBuYW1lZCBNb2R1bGVXaXRoUHJvdmlkZXJzLCBiYWlsLlxuICAgIGlmIChpZCA9PT0gbnVsbCB8fCBpZC5uYW1lICE9PSAnTW9kdWxlV2l0aFByb3ZpZGVycycpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIGl0J3Mgbm90IGZyb20gQGFuZ3VsYXIvY29yZSwgYmFpbC5cbiAgICBpZiAoIXRoaXMuaXNDb3JlICYmIGlkLmZyb20gIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgdGhlcmUncyBubyB0eXBlIHBhcmFtZXRlciBzcGVjaWZpZWQsIGJhaWwuXG4gICAgaWYgKHR5cGUudHlwZUFyZ3VtZW50cyA9PT0gdW5kZWZpbmVkIHx8IHR5cGUudHlwZUFyZ3VtZW50cy5sZW5ndGggIT09IDEpIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9XG4gICAgICAgICAgdHMuaXNNZXRob2REZWNsYXJhdGlvbihub2RlKSAmJiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZS5wYXJlbnQpID8gbm9kZS5wYXJlbnQgOiBudWxsO1xuICAgICAgY29uc3Qgc3ltYm9sTmFtZSA9IChwYXJlbnQgJiYgcGFyZW50Lm5hbWUgPyBwYXJlbnQubmFtZS5nZXRUZXh0KCkgKyAnLicgOiAnJykgK1xuICAgICAgICAgIChub2RlLm5hbWUgPyBub2RlLm5hbWUuZ2V0VGV4dCgpIDogJ2Fub255bW91cycpO1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9NT0RVTEVfV0lUSF9QUk9WSURFUlNfTUlTU0lOR19HRU5FUklDLCB0eXBlLFxuICAgICAgICAgIGAke3N5bWJvbE5hbWV9IHJldHVybnMgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHR5cGUgd2l0aG91dCBhIGdlbmVyaWMgdHlwZSBhcmd1bWVudC4gYCArXG4gICAgICAgICAgICAgIGBQbGVhc2UgYWRkIGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50IHRvIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIHR5cGUuIElmIHRoaXMgYCArXG4gICAgICAgICAgICAgIGBvY2N1cnJlbmNlIGlzIGluIGxpYnJhcnkgY29kZSB5b3UgZG9uJ3QgY29udHJvbCwgcGxlYXNlIGNvbnRhY3QgdGhlIGxpYnJhcnkgYXV0aG9ycy5gKTtcbiAgICB9XG5cbiAgICBjb25zdCBhcmcgPSB0eXBlLnR5cGVBcmd1bWVudHNbMF07XG5cbiAgICByZXR1cm4gdHlwZU5vZGVUb1ZhbHVlRXhwcihhcmcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuIGBOZ01vZHVsZWAgaWRlbnRpZmllciAoVCkgZnJvbSB0aGUgc3BlY2lmaWVkIGB0eXBlYCwgaWYgaXQgaXMgb2YgdGhlIGZvcm06XG4gICAqIGBBfEJ8e25nTW9kdWxlOiBUfXxDYC5cbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlOiB0cy5UeXBlTm9kZSk6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKCF0cy5pc0ludGVyc2VjdGlvblR5cGVOb2RlKHR5cGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZm9yIChjb25zdCB0IG9mIHR5cGUudHlwZXMpIHtcbiAgICAgIGlmICh0cy5pc1R5cGVMaXRlcmFsTm9kZSh0KSkge1xuICAgICAgICBmb3IgKGNvbnN0IG0gb2YgdC5tZW1iZXJzKSB7XG4gICAgICAgICAgY29uc3QgbmdNb2R1bGVUeXBlID0gdHMuaXNQcm9wZXJ0eVNpZ25hdHVyZShtKSAmJiB0cy5pc0lkZW50aWZpZXIobS5uYW1lKSAmJlxuICAgICAgICAgICAgICAgICAgbS5uYW1lLnRleHQgPT09ICduZ01vZHVsZScgJiYgbS50eXBlIHx8XG4gICAgICAgICAgICAgIG51bGw7XG4gICAgICAgICAgY29uc3QgbmdNb2R1bGVFeHByZXNzaW9uID0gbmdNb2R1bGVUeXBlICYmIHR5cGVOb2RlVG9WYWx1ZUV4cHIobmdNb2R1bGVUeXBlKTtcbiAgICAgICAgICBpZiAobmdNb2R1bGVFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gbmdNb2R1bGVFeHByZXNzaW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIFZlcmlmeSB0aGF0IGEgXCJEZWNsYXJhdGlvblwiIHJlZmVyZW5jZSBpcyBhIGBDbGFzc0RlY2xhcmF0aW9uYCByZWZlcmVuY2UuXG4gIHByaXZhdGUgaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlKTogcmVmIGlzIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgcmV0dXJuIHRoaXMucmVmbGVjdG9yLmlzQ2xhc3MocmVmLm5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGUgYSBsaXN0IG9mIGBSZWZlcmVuY2VgcyBmcm9tIGEgcmVzb2x2ZWQgbWV0YWRhdGEgdmFsdWUuXG4gICAqL1xuICBwcml2YXRlIHJlc29sdmVUeXBlTGlzdChcbiAgICAgIGV4cHI6IHRzLk5vZGUsIHJlc29sdmVkTGlzdDogUmVzb2x2ZWRWYWx1ZSwgY2xhc3NOYW1lOiBzdHJpbmcsXG4gICAgICBhcnJheU5hbWU6IHN0cmluZyk6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdIHtcbiAgICBjb25zdCByZWZMaXN0OiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShyZXNvbHZlZExpc3QpKSB7XG4gICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgIGV4cHIsIHJlc29sdmVkTGlzdCxcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAgIC8vIFVud3JhcCBNb2R1bGVXaXRoUHJvdmlkZXJzIGZvciBtb2R1bGVzIHRoYXQgYXJlIGxvY2FsbHkgZGVjbGFyZWQgKGFuZCB0aHVzIHN0YXRpY1xuICAgICAgLy8gcmVzb2x1dGlvbiB3YXMgYWJsZSB0byBkZXNjZW5kIGludG8gdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gYW4gb2JqZWN0IGxpdGVyYWwsIGEgTWFwKS5cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgZW50cnkgPSBlbnRyeS5nZXQoJ25nTW9kdWxlJykhO1xuICAgICAgfVxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShlbnRyeSkpIHtcbiAgICAgICAgLy8gUmVjdXJzZSBpbnRvIG5lc3RlZCBhcnJheXMuXG4gICAgICAgIHJlZkxpc3QucHVzaCguLi50aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBlbnRyeSwgY2xhc3NOYW1lLCBhcnJheU5hbWUpKTtcbiAgICAgIH0gZWxzZSBpZiAoZW50cnkgaW5zdGFuY2VvZiBSZWZlcmVuY2UpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzQ2xhc3NEZWNsYXJhdGlvblJlZmVyZW5jZShlbnRyeSkpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICBlbnRyeS5ub2RlLCBlbnRyeSxcbiAgICAgICAgICAgICAgYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiB0aGUgTmdNb2R1bGUuJHthcnJheU5hbWV9IG9mICR7XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWV9IGlzIG5vdCBhIGNsYXNzYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVmTGlzdC5wdXNoKGVudHJ5KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogUHJvZHVjZSBhIGJldHRlciBkaWFnbm9zdGljIGhlcmUgLSB0aGUgYXJyYXkgaW5kZXggbWF5IGJlIGFuIGlubmVyIGFycmF5LlxuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgZXhwciwgZW50cnksXG4gICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtcbiAgICAgICAgICAgICAgICBjbGFzc05hbWV9IGlzIG5vdCBhIHJlZmVyZW5jZWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOZ01vZHVsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogU2NvcGVEYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY29tcGlsYXRpb24uZGlyZWN0aXZlcy5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUucmVmLm5vZGUgPT09IG5vZGUpICYmXG4gICAgICAhY29tcGlsYXRpb24ucGlwZXMuc29tZShwaXBlID0+IHBpcGUucmVmLm5vZGUgPT09IG5vZGUpO1xufVxuIl19