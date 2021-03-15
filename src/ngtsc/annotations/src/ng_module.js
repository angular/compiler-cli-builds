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
            var ngModuleMetadata = {
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
            var injectorMetadata = {
                name: name,
                type: type,
                internalType: internalType,
                providers: wrapperProviders,
                imports: injectorImports,
            };
            var factoryMetadata = {
                name: name,
                type: type,
                internalType: internalType,
                typeArgumentCount: 0,
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                injectFn: compiler_1.Identifiers.inject,
                target: compiler_1.R3FactoryTarget.NgModule,
            };
            return {
                analysis: {
                    id: id,
                    schemas: schemas,
                    mod: ngModuleMetadata,
                    inj: injectorMetadata,
                    fac: factoryMetadata,
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
        NgModuleDecoratorHandler.prototype.compileFull = function (node, _a, _b) {
            var inj = _a.inj, mod = _a.mod, fac = _a.fac, metadataStmt = _a.metadataStmt, declarations = _a.declarations;
            var injectorImports = _b.injectorImports;
            var factoryFn = compiler_1.compileFactoryFunction(fac);
            var ngInjectorDef = compiler_1.compileInjector(this.mergeInjectorImports(inj, injectorImports));
            var ngModuleDef = compiler_1.compileNgModule(mod);
            var statements = ngModuleDef.statements;
            this.insertMetadataStatement(statements, metadataStmt);
            this.appendRemoteScopingStatements(statements, node, declarations);
            return this.compileNgModule(factoryFn, ngInjectorDef, ngModuleDef);
        };
        NgModuleDecoratorHandler.prototype.compilePartial = function (node, _a, _b) {
            var inj = _a.inj, fac = _a.fac, mod = _a.mod, metadataStmt = _a.metadataStmt;
            var injectorImports = _b.injectorImports;
            var factoryFn = compiler_1.compileFactoryFunction(fac);
            var injectorDef = compiler_1.compileDeclareInjectorFromMetadata(this.mergeInjectorImports(inj, injectorImports));
            var ngModuleDef = compiler_1.compileDeclareNgModuleFromMetadata(mod);
            this.insertMetadataStatement(ngModuleDef.statements, metadataStmt);
            // NOTE: no remote scoping required as this is banned in partial compilation.
            return this.compileNgModule(factoryFn, injectorDef, ngModuleDef);
        };
        /**
         *  Merge the injector imports (which are 'exports' that were later found to be NgModules)
         *  computed during resolution with the ones from analysis.
         */
        NgModuleDecoratorHandler.prototype.mergeInjectorImports = function (inj, injectorImports) {
            return tslib_1.__assign(tslib_1.__assign({}, inj), { imports: tslib_1.__spread(inj.imports, injectorImports) });
        };
        /**
         * Add class metadata statements, if provided, to the `ngModuleStatements`.
         */
        NgModuleDecoratorHandler.prototype.insertMetadataStatement = function (ngModuleStatements, metadataStmt) {
            if (metadataStmt !== null) {
                ngModuleStatements.unshift(metadataStmt);
            }
        };
        /**
         * Add remote scoping statements, as needed, to the `ngModuleStatements`.
         */
        NgModuleDecoratorHandler.prototype.appendRemoteScopingStatements = function (ngModuleStatements, node, declarations) {
            var e_6, _a;
            var _this = this;
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
                    if (declarations_1_1 && !declarations_1_1.done && (_a = declarations_1.return)) _a.call(declarations_1);
                }
                finally { if (e_6) throw e_6.error; }
            }
        };
        NgModuleDecoratorHandler.prototype.compileNgModule = function (factoryFn, injectorDef, ngModuleDef) {
            var res = [
                {
                    name: 'ɵfac',
                    initializer: factoryFn.expression,
                    statements: factoryFn.statements,
                    type: factoryFn.type,
                },
                {
                    name: 'ɵmod',
                    initializer: ngModuleDef.expression,
                    statements: ngModuleDef.statements,
                    type: ngModuleDef.type,
                },
                {
                    name: 'ɵinj',
                    initializer: injectorDef.expression,
                    statements: injectorDef.statements,
                    type: injectorDef.type,
                },
            ];
            if (this.localeId) {
                // QUESTION: can this stuff be removed?
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBb2U7SUFDcGUsK0JBQWlDO0lBRWpDLDJFQUEwRztJQUMxRyxtRUFBaUY7SUFDakYsNkZBQWtJO0lBR2xJLHlFQUFpSjtJQUlqSix1RUFBZ0k7SUFDaEksa0ZBQXdEO0lBRXhELDJGQUFtRjtJQUNuRixxRkFBd0Q7SUFFeEQsNkVBQXdRO0lBc0J4UTs7T0FFRztJQUNIO1FBQW9DLDBDQUFjO1FBQWxEO1lBQUEscUVBa0VDO1lBakVTLDhCQUF3QixHQUkxQixFQUFFLENBQUM7O1FBNkRYLENBQUM7UUEzREMsNENBQW1CLEdBQW5CLFVBQW9CLGNBQThCO1lBQ2hELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxjQUFjLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHlGQUF5RjtZQUN6RixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCx1Q0FBYyxHQUFkLFVBQWUsY0FBOEI7O1lBQzNDLElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxjQUFjLENBQUMsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELDhEQUE4RDtZQUM5RCxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRTtnQkFDM0YsT0FBTyxJQUFJLENBQUM7YUFDYjtvQ0FFVSxTQUFTO2dCQUNsQixJQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFVBQUEsU0FBUztvQkFDdEUsT0FBTyw4QkFBYSxDQUFDLFNBQVMs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Q0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsR0FBRTtpQkFDMUU7cUJBQU0sSUFBSSxLQUFLLFlBQVksbUJBQVMsRUFBRTtvQkFDckMsSUFBSSxDQUFDLEtBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDNUMsTUFBTSwwQ0FBNEIsQ0FDOUIsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQ2pCLHVCQUFxQixHQUFHLHlCQUFvQixTQUFTLFlBQ2pELFNBQVMsb0JBQWlCLENBQUMsQ0FBQztxQkFDckM7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckI7cUJBQU07b0JBQ0wsMEZBQTBGO29CQUMxRixNQUFNLDBDQUE0QixDQUM5QixJQUFJLEVBQUUsS0FBSyxFQUNYLHVCQUFxQixHQUFHLHlCQUFvQixTQUFTLFlBQ2pELFNBQVMsd0JBQXFCLENBQUMsQ0FBQztpQkFDekM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUFybEJELElBcWxCQztJQXJsQlksNERBQXdCO0lBdWxCckMsU0FBUyxVQUFVLENBQUMsSUFBc0IsRUFBRSxXQUFzQjtRQUNoRSxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQTNCLENBQTJCLENBQUM7WUFDekUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBdEIsQ0FBc0IsQ0FBQyxDQUFDO0lBQzlELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb21waWxlRGVjbGFyZUluamVjdG9yRnJvbU1ldGFkYXRhLCBjb21waWxlRGVjbGFyZU5nTW9kdWxlRnJvbU1ldGFkYXRhLCBjb21waWxlRmFjdG9yeUZ1bmN0aW9uLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZSwgQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBJZGVudGlmaWVycyBhcyBSMywgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNDb21waWxlZEV4cHJlc3Npb24sIFIzRmFjdG9yeU1ldGFkYXRhLCBSM0ZhY3RvcnlUYXJnZXQsIFIzSWRlbnRpZmllcnMsIFIzSW5qZWN0b3JNZXRhZGF0YSwgUjNOZ01vZHVsZU1ldGFkYXRhLCBSM1JlZmVyZW5jZSwgU2NoZW1hTWV0YWRhdGEsIFN0YXRlbWVudCwgU1RSSU5HX1RZUEUsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb259IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIGlzUmVmZXJlbmNlRXF1YWwsIGlzU3ltYm9sRXF1YWwsIFNlbWFudGljUmVmZXJlbmNlLCBTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vaW5jcmVtZW50YWwvc2VtYW50aWNfZ3JhcGgnO1xuaW1wb3J0IHtJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnl9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7UGFydGlhbEV2YWx1YXRvciwgUmVzb2x2ZWRWYWx1ZX0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtjb21iaW5lUmVzb2x2ZXJzLCBmaW5kQW5ndWxhckRlY29yYXRvciwgZm9yd2FyZFJlZlJlc29sdmVyLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgdG9SM1JlZmVyZW5jZSwgdW53cmFwRXhwcmVzc2lvbiwgd3JhcEZ1bmN0aW9uRXhwcmVzc2lvbnNJblBhcmVucywgd3JhcFR5cGVSZWZlcmVuY2V9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdNb2R1bGVBbmFseXNpcyB7XG4gIG1vZDogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBpbmo6IFIzSW5qZWN0b3JNZXRhZGF0YTtcbiAgZmFjOiBSM0ZhY3RvcnlNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbiAgZmFjdG9yeVN5bWJvbE5hbWU6IHN0cmluZztcbiAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogU2V0PFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj58bnVsbDtcbiAgcHJvdmlkZXJzOiB0cy5FeHByZXNzaW9ufG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdNb2R1bGVSZXNvbHV0aW9uIHtcbiAgaW5qZWN0b3JJbXBvcnRzOiBFeHByZXNzaW9uW107XG59XG5cbi8qKlxuICogUmVwcmVzZW50cyBhbiBBbmd1bGFyIE5nTW9kdWxlLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVTeW1ib2wgZXh0ZW5kcyBTZW1hbnRpY1N5bWJvbCB7XG4gIHByaXZhdGUgcmVtb3RlbHlTY29wZWRDb21wb25lbnRzOiB7XG4gICAgY29tcG9uZW50OiBTZW1hbnRpY1N5bWJvbCxcbiAgICB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNSZWZlcmVuY2VbXSxcbiAgICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW11cbiAgfVtdID0gW107XG5cbiAgaXNQdWJsaWNBcGlBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIE5nTW9kdWxlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gTmdNb2R1bGVzIGRvbid0IGhhdmUgYSBwdWJsaWMgQVBJIHRoYXQgY291bGQgYWZmZWN0IGVtaXQgb2YgQW5ndWxhciBkZWNvcmF0ZWQgY2xhc3Nlcy5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc0VtaXRBZmZlY3RlZChwcmV2aW91c1N5bWJvbDogU2VtYW50aWNTeW1ib2wpOiBib29sZWFuIHtcbiAgICBpZiAoIShwcmV2aW91c1N5bWJvbCBpbnN0YW5jZW9mIE5nTW9kdWxlU3ltYm9sKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gY29tcGFyZSBvdXIgcmVtb3RlbHlTY29wZWRDb21wb25lbnRzIHRvIHRoZSBwcmV2aW91cyBzeW1ib2xcbiAgICBpZiAocHJldmlvdXNTeW1ib2wucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmxlbmd0aCAhPT0gdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGN1cnJFbnRyeSBvZiB0aGlzLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cykge1xuICAgICAgY29uc3QgcHJldkVudHJ5ID0gcHJldmlvdXNTeW1ib2wucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmZpbmQocHJldkVudHJ5ID0+IHtcbiAgICAgICAgcmV0dXJuIGlzU3ltYm9sRXF1YWwocHJldkVudHJ5LmNvbXBvbmVudCwgY3VyckVudHJ5LmNvbXBvbmVudCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHByZXZFbnRyeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIE5vIHByZXZpb3VzIGVudHJ5IHdhcyBmb3VuZCwgd2hpY2ggbWVhbnMgdGhhdCB0aGlzIGNvbXBvbmVudCBiZWNhbWUgcmVtb3RlbHkgc2NvcGVkIGFuZFxuICAgICAgICAvLyBoZW5jZSB0aGlzIE5nTW9kdWxlIG5lZWRzIHRvIGJlIHJlLWVtaXR0ZWQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyRW50cnkudXNlZERpcmVjdGl2ZXMsIHByZXZFbnRyeS51c2VkRGlyZWN0aXZlcywgaXNSZWZlcmVuY2VFcXVhbCkpIHtcbiAgICAgICAgLy8gVGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzIG9yIHRoZWlyIG9yZGVyIGhhcyBjaGFuZ2VkLiBTaW5jZSB0aGlzIE5nTW9kdWxlIGVtaXRzXG4gICAgICAgIC8vIHJlZmVyZW5jZXMgdG8gdGhlIGxpc3Qgb2YgdXNlZCBkaXJlY3RpdmVzLCBpdCBzaG91bGQgYmUgcmUtZW1pdHRlZCB0byB1cGRhdGUgdGhpcyBsaXN0LlxuICAgICAgICAvLyBOb3RlOiB0aGUgTmdNb2R1bGUgZG9lcyBub3QgaGF2ZSB0byBiZSByZS1lbWl0dGVkIHdoZW4gYW55IG9mIHRoZSBkaXJlY3RpdmVzIGhhcyBoYWRcbiAgICAgICAgLy8gdGhlaXIgcHVibGljIEFQSSBjaGFuZ2VkLCBhcyB0aGUgTmdNb2R1bGUgb25seSBlbWl0cyBhIHJlZmVyZW5jZSB0byB0aGUgc3ltYm9sIGJ5IGl0c1xuICAgICAgICAvLyBuYW1lLiBUaGVyZWZvcmUsIHRlc3RpbmcgZm9yIHN5bWJvbCBlcXVhbGl0eSBpcyBzdWZmaWNpZW50LlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc0FycmF5RXF1YWwoY3VyckVudHJ5LnVzZWRQaXBlcywgcHJldkVudHJ5LnVzZWRQaXBlcywgaXNSZWZlcmVuY2VFcXVhbCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzVHlwZUNoZWNrQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGFkZFJlbW90ZWx5U2NvcGVkQ29tcG9uZW50KFxuICAgICAgY29tcG9uZW50OiBTZW1hbnRpY1N5bWJvbCwgdXNlZERpcmVjdGl2ZXM6IFNlbWFudGljUmVmZXJlbmNlW10sXG4gICAgICB1c2VkUGlwZXM6IFNlbWFudGljUmVmZXJlbmNlW10pOiB2b2lkIHtcbiAgICB0aGlzLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5wdXNoKHtjb21wb25lbnQsIHVzZWREaXJlY3RpdmVzLCB1c2VkUGlwZXN9KTtcbiAgfVxufVxuXG4vKipcbiAqIENvbXBpbGVzIEBOZ01vZHVsZSBhbm5vdGF0aW9ucyB0byBuZ01vZHVsZURlZiBmaWVsZHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8RGVjb3JhdG9yLCBOZ01vZHVsZUFuYWx5c2lzLCBOZ01vZHVsZVN5bWJvbCwgTmdNb2R1bGVSZXNvbHV0aW9uPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIHByaXZhdGUgbWV0YVJlZ2lzdHJ5OiBNZXRhZGF0YVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZmFjdG9yeVRyYWNrZXI6IEZhY3RvcnlUcmFja2VyfG51bGwsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgaW5qZWN0YWJsZVJlZ2lzdHJ5OiBJbmplY3RhYmxlQ2xhc3NSZWdpc3RyeSwgcHJpdmF0ZSBsb2NhbGVJZD86IHN0cmluZykge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQE5nTW9kdWxlIGRlY29yYXRvcmApO1xuICAgIH1cblxuICAgIC8vIEBOZ01vZHVsZSBjYW4gYmUgaW52b2tlZCB3aXRob3V0IGFyZ3VtZW50cy4gSW4gY2FzZSBpdCBpcywgcHJldGVuZCBhcyBpZiBhIGJsYW5rIG9iamVjdFxuICAgIC8vIGxpdGVyYWwgd2FzIHNwZWNpZmllZC4gVGhpcyBzaW1wbGlmaWVzIHRoZSBjb2RlIGJlbG93LlxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEgPyB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoW10pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsXG4gICAgICAgICAgJ0BOZ01vZHVsZSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gICAgfVxuICAgIGNvbnN0IG5nTW9kdWxlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdqaXQnKSkge1xuICAgICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXJzID0gY29tYmluZVJlc29sdmVycyhbXG4gICAgICByZWYgPT4gdGhpcy5fZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4ocmVmLm5vZGUpLFxuICAgICAgZm9yd2FyZFJlZlJlc29sdmVyLFxuICAgIF0pO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgbW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMuXG4gICAgbGV0IGRlY2xhcmF0aW9uUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICByYXdEZWNsYXJhdGlvbnMgPSBuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpITtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0RlY2xhcmF0aW9ucywgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGRlY2xhcmF0aW9uUmVmcyA9XG4gICAgICAgICAgdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RGVjbGFyYXRpb25zLCBkZWNsYXJhdGlvbk1ldGEsIG5hbWUsICdkZWNsYXJhdGlvbnMnKTtcblxuICAgICAgLy8gTG9vayB0aHJvdWdoIHRoZSBkZWNsYXJhdGlvbnMgdG8gbWFrZSBzdXJlIHRoZXkncmUgYWxsIGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICAgIGZvciAoY29uc3QgcmVmIG9mIGRlY2xhcmF0aW9uUmVmcykge1xuICAgICAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgY29uc3QgZXJyb3JOb2RlOiB0cy5FeHByZXNzaW9uID0gcmVmLmdldE9yaWdpbkZvckRpYWdub3N0aWNzKHJhd0RlY2xhcmF0aW9ucyk7XG5cbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9ERUNMQVJBVElPTiwgZXJyb3JOb2RlLFxuICAgICAgICAgICAgICBgQ2Fubm90IGRlY2xhcmUgJyR7XG4gICAgICAgICAgICAgICAgICByZWYubm9kZS5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgLnRleHR9JyBpbiBhbiBOZ01vZHVsZSBhcyBpdCdzIG5vdCBhIHBhcnQgb2YgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uYCxcbiAgICAgICAgICAgICAgW21ha2VSZWxhdGVkSW5mb3JtYXRpb24oXG4gICAgICAgICAgICAgICAgICByZWYubm9kZS5uYW1lLCBgJyR7cmVmLm5vZGUubmFtZS50ZXh0fScgaXMgZGVjbGFyZWQgaGVyZS5gKV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICBsZXQgaW1wb3J0UmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3SW1wb3J0czogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIHJhd0ltcG9ydHMgPSBuZ01vZHVsZS5nZXQoJ2ltcG9ydHMnKSE7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0ltcG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBpbXBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3SW1wb3J0cywgaW1wb3J0c01ldGEsIG5hbWUsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdFeHBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgcmF3RXhwb3J0cyA9IG5nTW9kdWxlLmdldCgnZXhwb3J0cycpITtcbiAgICAgIGNvbnN0IGV4cG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RXhwb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGV4cG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdFeHBvcnRzLCBleHBvcnRzTWV0YSwgbmFtZSwgJ2V4cG9ydHMnKTtcbiAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChub2RlLCAuLi5leHBvcnRSZWZzKTtcbiAgICB9XG4gICAgbGV0IGJvb3RzdHJhcFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnYm9vdHN0cmFwJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2Jvb3RzdHJhcCcpITtcbiAgICAgIGNvbnN0IGJvb3RzdHJhcE1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgYm9vdHN0cmFwUmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGJvb3RzdHJhcE1ldGEsIG5hbWUsICdib290c3RyYXAnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnc2NoZW1hcycpKSB7XG4gICAgICBjb25zdCByYXdFeHByID0gbmdNb2R1bGUuZ2V0KCdzY2hlbWFzJykhO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKHJhd0V4cHIsIHJlc3VsdCwgYE5nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHNjaGVtYVJlZiBvZiByZXN1bHQpIHtcbiAgICAgICAgaWYgKCEoc2NoZW1hUmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHJhd0V4cHIsIHJlc3VsdCwgJ05nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheSBvZiBzY2hlbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaWQgPSBzY2hlbWFSZWYuZ2V0SWRlbnRpdHlJbihzY2hlbWFSZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgICBpZiAoaWQgPT09IG51bGwgfHwgc2NoZW1hUmVmLm93bmVkQnlNb2R1bGVHdWVzcyAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgcmF3RXhwciwgcmVzdWx0LCAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTaW5jZSBgaWRgIGlzIHRoZSBgdHMuSWRlbnRpZmVyYCB3aXRoaW4gdGhlIHNjaGVtYSByZWYncyBkZWNsYXJhdGlvbiBmaWxlLCBpdCdzIHNhZmUgdG9cbiAgICAgICAgLy8gdXNlIGBpZC50ZXh0YCBoZXJlIHRvIGZpZ3VyZSBvdXQgd2hpY2ggc2NoZW1hIGlzIGluIHVzZS4gRXZlbiBpZiB0aGUgYWN0dWFsIHJlZmVyZW5jZSB3YXNcbiAgICAgICAgLy8gcmVuYW1lZCB3aGVuIHRoZSB1c2VyIGltcG9ydGVkIGl0LCB0aGVzZSBuYW1lcyB3aWxsIG1hdGNoLlxuICAgICAgICBzd2l0Y2ggKGlkLnRleHQpIHtcbiAgICAgICAgICBjYXNlICdDVVNUT01fRUxFTUVOVFNfU0NIRU1BJzpcbiAgICAgICAgICAgIHNjaGVtYXMucHVzaChDVVNUT01fRUxFTUVOVFNfU0NIRU1BKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ05PX0VSUk9SU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKE5PX0VSUk9SU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgcmF3RXhwciwgc2NoZW1hUmVmLCBgJyR7c2NoZW1hUmVmLmRlYnVnTmFtZX0nIGlzIG5vdCBhIHZhbGlkIE5nTW9kdWxlIHNjaGVtYWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaWQ6IEV4cHJlc3Npb258bnVsbCA9XG4gICAgICAgIG5nTW9kdWxlLmhhcygnaWQnKSA/IG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpZCcpISkgOiBudWxsO1xuICAgIGNvbnN0IHZhbHVlQ29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgbGV0IHR5cGVDb250ZXh0ID0gdmFsdWVDb250ZXh0O1xuICAgIGNvbnN0IHR5cGVOb2RlID0gdGhpcy5yZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKHR5cGVOb2RlICE9PSBudWxsKSB7XG4gICAgICB0eXBlQ29udGV4dCA9IHR5cGVOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICB9XG5cbiAgICBjb25zdCBib290c3RyYXAgPVxuICAgICAgICBib290c3RyYXBSZWZzLm1hcChib290c3RyYXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShib290c3RyYXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPVxuICAgICAgICBkZWNsYXJhdGlvblJlZnMubWFwKGRlY2wgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShkZWNsLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgaW1wb3J0cyA9IGltcG9ydFJlZnMubWFwKGltcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGltcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBleHBvcnRSZWZzLm1hcChleHAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShleHAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcblxuICAgIGNvbnN0IGlzRm9yd2FyZFJlZmVyZW5jZSA9IChyZWY6IFIzUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHJlZi52YWx1ZSwgbm9kZS5uYW1lISwgdmFsdWVDb250ZXh0KTtcbiAgICBjb25zdCBjb250YWluc0ZvcndhcmREZWNscyA9IGJvb3RzdHJhcC5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZGVjbGFyYXRpb25zLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fCBpbXBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBleHBvcnRzLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKTtcblxuICAgIGNvbnN0IHR5cGUgPSB3cmFwVHlwZVJlZmVyZW5jZSh0aGlzLnJlZmxlY3Rvciwgbm9kZSk7XG4gICAgY29uc3QgaW50ZXJuYWxUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKG5vZGUpKTtcbiAgICBjb25zdCBhZGphY2VudFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRoaXMucmVmbGVjdG9yLmdldEFkamFjZW50TmFtZU9mQ2xhc3Mobm9kZSkpO1xuXG4gICAgY29uc3QgbmdNb2R1bGVNZXRhZGF0YTogUjNOZ01vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIGFkamFjZW50VHlwZSxcbiAgICAgIGJvb3RzdHJhcCxcbiAgICAgIGRlY2xhcmF0aW9ucyxcbiAgICAgIGV4cG9ydHMsXG4gICAgICBpbXBvcnRzLFxuICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMsXG4gICAgICBpZCxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmF3UHJvdmlkZXJzID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/IG5nTW9kdWxlLmdldCgncHJvdmlkZXJzJykhIDogbnVsbDtcbiAgICBjb25zdCB3cmFwcGVyUHJvdmlkZXJzID0gcmF3UHJvdmlkZXJzICE9PSBudWxsID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHJhd1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1Byb3ZpZGVycykgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgb25seSBhZGQgdGhlIG1vZHVsZSdzIGltcG9ydHMgYXMgdGhlIGluamVjdG9ycycgaW1wb3J0cy4gQW55IGV4cG9ydGVkIG1vZHVsZXNcbiAgICAvLyBhcmUgYWRkZWQgZHVyaW5nIGByZXNvbHZlYCwgYXMgd2UgbmVlZCBzY29wZSBpbmZvcm1hdGlvbiB0byBiZSBhYmxlIHRvIGZpbHRlciBvdXQgZGlyZWN0aXZlc1xuICAgIC8vIGFuZCBwaXBlcyBmcm9tIHRoZSBtb2R1bGUgZXhwb3J0cy5cbiAgICBjb25zdCBpbmplY3RvckltcG9ydHM6IFdyYXBwZWROb2RlRXhwcjx0cy5FeHByZXNzaW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBpbmplY3RvckltcG9ydHMucHVzaChuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaW1wb3J0cycpISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW5qZWN0b3JNZXRhZGF0YTogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBwcm92aWRlcnM6IHdyYXBwZXJQcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBpbmplY3RvckltcG9ydHMsXG4gICAgfTtcblxuICAgIGNvbnN0IGZhY3RvcnlNZXRhZGF0YTogUjNGYWN0b3J5TWV0YWRhdGEgPSB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIHR5cGVBcmd1bWVudENvdW50OiAwLFxuICAgICAgZGVwczogZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhcbiAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIGluamVjdEZuOiBSMy5pbmplY3QsXG4gICAgICB0YXJnZXQ6IFIzRmFjdG9yeVRhcmdldC5OZ01vZHVsZSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIGlkLFxuICAgICAgICBzY2hlbWFzLFxuICAgICAgICBtb2Q6IG5nTW9kdWxlTWV0YWRhdGEsXG4gICAgICAgIGluajogaW5qZWN0b3JNZXRhZGF0YSxcbiAgICAgICAgZmFjOiBmYWN0b3J5TWV0YWRhdGEsXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgICByYXdEZWNsYXJhdGlvbnMsXG4gICAgICAgIGltcG9ydHM6IGltcG9ydFJlZnMsXG4gICAgICAgIGV4cG9ydHM6IGV4cG9ydFJlZnMsXG4gICAgICAgIHByb3ZpZGVyczogcmF3UHJvdmlkZXJzLFxuICAgICAgICBwcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5OiByYXdQcm92aWRlcnMgP1xuICAgICAgICAgICAgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkocmF3UHJvdmlkZXJzLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5ldmFsdWF0b3IpIDpcbiAgICAgICAgICAgIG51bGwsXG4gICAgICAgIG1ldGFkYXRhU3RtdDogZ2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbChcbiAgICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUsXG4gICAgICAgICAgICB0aGlzLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyKSxcbiAgICAgICAgZmFjdG9yeVN5bWJvbE5hbWU6IG5vZGUubmFtZS50ZXh0LFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgc3ltYm9sKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBOZ01vZHVsZVN5bWJvbCB7XG4gICAgcmV0dXJuIG5ldyBOZ01vZHVsZVN5bWJvbChub2RlKTtcbiAgfVxuXG4gIHJlZ2lzdGVyKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBOZ01vZHVsZUFuYWx5c2lzKTogdm9pZCB7XG4gICAgLy8gUmVnaXN0ZXIgdGhpcyBtb2R1bGUncyBpbmZvcm1hdGlvbiB3aXRoIHRoZSBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkuIFRoaXMgZW5zdXJlcyB0aGF0XG4gICAgLy8gZHVyaW5nIHRoZSBjb21waWxlKCkgcGhhc2UsIHRoZSBtb2R1bGUncyBtZXRhZGF0YSBpcyBhdmFpbGFibGUgZm9yIHNlbGVjdG9yIHNjb3BlXG4gICAgLy8gY29tcHV0YXRpb24uXG4gICAgdGhpcy5tZXRhUmVnaXN0cnkucmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKHtcbiAgICAgIHJlZjogbmV3IFJlZmVyZW5jZShub2RlKSxcbiAgICAgIHNjaGVtYXM6IGFuYWx5c2lzLnNjaGVtYXMsXG4gICAgICBkZWNsYXJhdGlvbnM6IGFuYWx5c2lzLmRlY2xhcmF0aW9ucyxcbiAgICAgIGltcG9ydHM6IGFuYWx5c2lzLmltcG9ydHMsXG4gICAgICBleHBvcnRzOiBhbmFseXNpcy5leHBvcnRzLFxuICAgICAgcmF3RGVjbGFyYXRpb25zOiBhbmFseXNpcy5yYXdEZWNsYXJhdGlvbnMsXG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy5mYWN0b3J5VHJhY2tlciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5mYWN0b3J5VHJhY2tlci50cmFjayhub2RlLmdldFNvdXJjZUZpbGUoKSwge1xuICAgICAgICBuYW1lOiBhbmFseXNpcy5mYWN0b3J5U3ltYm9sTmFtZSxcbiAgICAgICAgaGFzSWQ6IGFuYWx5c2lzLmlkICE9PSBudWxsLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkucmVnaXN0ZXJJbmplY3RhYmxlKG5vZGUpO1xuICB9XG5cbiAgcmVzb2x2ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8TmdNb2R1bGVBbmFseXNpcz4pOlxuICAgICAgUmVzb2x2ZVJlc3VsdDxOZ01vZHVsZVJlc29sdXRpb24+IHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKG5vZGUpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIGNvbnN0IHNjb3BlRGlhZ25vc3RpY3MgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0RGlhZ25vc3RpY3NPZk1vZHVsZShub2RlKTtcbiAgICBpZiAoc2NvcGVEaWFnbm9zdGljcyAhPT0gbnVsbCkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5zY29wZURpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBpZiAoYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSAhPT0gbnVsbCkge1xuICAgICAgY29uc3QgcHJvdmlkZXJEaWFnbm9zdGljcyA9IGdldFByb3ZpZGVyRGlhZ25vc3RpY3MoXG4gICAgICAgICAgYW5hbHlzaXMucHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeSwgYW5hbHlzaXMucHJvdmlkZXJzISwgdGhpcy5pbmplY3RhYmxlUmVnaXN0cnkpO1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCguLi5wcm92aWRlckRpYWdub3N0aWNzKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhOiBOZ01vZHVsZVJlc29sdXRpb24gPSB7XG4gICAgICBpbmplY3RvckltcG9ydHM6IFtdLFxuICAgIH07XG5cbiAgICBpZiAoc2NvcGUgIT09IG51bGwgJiYgIXNjb3BlLmNvbXBpbGF0aW9uLmlzUG9pc29uZWQpIHtcbiAgICAgIC8vIFVzaW5nIHRoZSBzY29wZSBpbmZvcm1hdGlvbiwgZXh0ZW5kIHRoZSBpbmplY3RvcidzIGltcG9ydHMgdXNpbmcgdGhlIG1vZHVsZXMgdGhhdCBhcmVcbiAgICAgIC8vIHNwZWNpZmllZCBhcyBtb2R1bGUgZXhwb3J0cy5cbiAgICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgICAgZm9yIChjb25zdCBleHBvcnRSZWYgb2YgYW5hbHlzaXMuZXhwb3J0cykge1xuICAgICAgICBpZiAoaXNOZ01vZHVsZShleHBvcnRSZWYubm9kZSwgc2NvcGUuY29tcGlsYXRpb24pKSB7XG4gICAgICAgICAgZGF0YS5pbmplY3RvckltcG9ydHMucHVzaCh0aGlzLnJlZkVtaXR0ZXIuZW1pdChleHBvcnRSZWYsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG5cbiAgICAgICAgaWYgKG1ldGFkYXRhICE9PSBudWxsICYmIG1ldGFkYXRhLnNlbGVjdG9yID09PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuRElSRUNUSVZFX01JU1NJTkdfU0VMRUNUT1IsIGRlY2wubm9kZSxcbiAgICAgICAgICAgICAgYERpcmVjdGl2ZSAke2RlY2wubm9kZS5uYW1lLnRleHR9IGhhcyBubyBzZWxlY3RvciwgcGxlYXNlIGFkZCBpdCFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4ge2RpYWdub3N0aWNzfTtcbiAgICB9XG5cbiAgICBpZiAoc2NvcGUgPT09IG51bGwgfHwgc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCB8fCBzY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkIHx8XG4gICAgICAgIHNjb3BlLnJlZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtkYXRhfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGF0YSxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGVGdWxsKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIHtpbmosIG1vZCwgZmFjLCBtZXRhZGF0YVN0bXQsIGRlY2xhcmF0aW9uc306IFJlYWRvbmx5PE5nTW9kdWxlQW5hbHlzaXM+LFxuICAgICAge2luamVjdG9ySW1wb3J0c306IFJlYWRvbmx5PE5nTW9kdWxlUmVzb2x1dGlvbj4pOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IGZhY3RvcnlGbiA9IGNvbXBpbGVGYWN0b3J5RnVuY3Rpb24oZmFjKTtcbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKHRoaXMubWVyZ2VJbmplY3RvckltcG9ydHMoaW5qLCBpbmplY3RvckltcG9ydHMpKTtcbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IGNvbXBpbGVOZ01vZHVsZShtb2QpO1xuICAgIGNvbnN0IHN0YXRlbWVudHMgPSBuZ01vZHVsZURlZi5zdGF0ZW1lbnRzO1xuICAgIHRoaXMuaW5zZXJ0TWV0YWRhdGFTdGF0ZW1lbnQoc3RhdGVtZW50cywgbWV0YWRhdGFTdG10KTtcbiAgICB0aGlzLmFwcGVuZFJlbW90ZVNjb3BpbmdTdGF0ZW1lbnRzKHN0YXRlbWVudHMsIG5vZGUsIGRlY2xhcmF0aW9ucyk7XG5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlTmdNb2R1bGUoZmFjdG9yeUZuLCBuZ0luamVjdG9yRGVmLCBuZ01vZHVsZURlZik7XG4gIH1cblxuICBjb21waWxlUGFydGlhbChcbiAgICAgIG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIHtpbmosIGZhYywgbW9kLCBtZXRhZGF0YVN0bXR9OiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPixcbiAgICAgIHtpbmplY3RvckltcG9ydHN9OiBSZWFkb25seTxOZ01vZHVsZVJlc29sdXRpb24+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCBmYWN0b3J5Rm4gPSBjb21waWxlRmFjdG9yeUZ1bmN0aW9uKGZhYyk7XG4gICAgY29uc3QgaW5qZWN0b3JEZWYgPVxuICAgICAgICBjb21waWxlRGVjbGFyZUluamVjdG9yRnJvbU1ldGFkYXRhKHRoaXMubWVyZ2VJbmplY3RvckltcG9ydHMoaW5qLCBpbmplY3RvckltcG9ydHMpKTtcbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IGNvbXBpbGVEZWNsYXJlTmdNb2R1bGVGcm9tTWV0YWRhdGEobW9kKTtcbiAgICB0aGlzLmluc2VydE1ldGFkYXRhU3RhdGVtZW50KG5nTW9kdWxlRGVmLnN0YXRlbWVudHMsIG1ldGFkYXRhU3RtdCk7XG4gICAgLy8gTk9URTogbm8gcmVtb3RlIHNjb3BpbmcgcmVxdWlyZWQgYXMgdGhpcyBpcyBiYW5uZWQgaW4gcGFydGlhbCBjb21waWxhdGlvbi5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlTmdNb2R1bGUoZmFjdG9yeUZuLCBpbmplY3RvckRlZiwgbmdNb2R1bGVEZWYpO1xuICB9XG5cbiAgLyoqXG4gICAqICBNZXJnZSB0aGUgaW5qZWN0b3IgaW1wb3J0cyAod2hpY2ggYXJlICdleHBvcnRzJyB0aGF0IHdlcmUgbGF0ZXIgZm91bmQgdG8gYmUgTmdNb2R1bGVzKVxuICAgKiAgY29tcHV0ZWQgZHVyaW5nIHJlc29sdXRpb24gd2l0aCB0aGUgb25lcyBmcm9tIGFuYWx5c2lzLlxuICAgKi9cbiAgcHJpdmF0ZSBtZXJnZUluamVjdG9ySW1wb3J0cyhpbmo6IFIzSW5qZWN0b3JNZXRhZGF0YSwgaW5qZWN0b3JJbXBvcnRzOiBFeHByZXNzaW9uW10pOlxuICAgICAgUjNJbmplY3Rvck1ldGFkYXRhIHtcbiAgICByZXR1cm4gey4uLmluaiwgaW1wb3J0czogWy4uLmluai5pbXBvcnRzLCAuLi5pbmplY3RvckltcG9ydHNdfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgY2xhc3MgbWV0YWRhdGEgc3RhdGVtZW50cywgaWYgcHJvdmlkZWQsIHRvIHRoZSBgbmdNb2R1bGVTdGF0ZW1lbnRzYC5cbiAgICovXG4gIHByaXZhdGUgaW5zZXJ0TWV0YWRhdGFTdGF0ZW1lbnQobmdNb2R1bGVTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSwgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbCk6XG4gICAgICB2b2lkIHtcbiAgICBpZiAobWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBuZ01vZHVsZVN0YXRlbWVudHMudW5zaGlmdChtZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgcmVtb3RlIHNjb3Bpbmcgc3RhdGVtZW50cywgYXMgbmVlZGVkLCB0byB0aGUgYG5nTW9kdWxlU3RhdGVtZW50c2AuXG4gICAqL1xuICBwcml2YXRlIGFwcGVuZFJlbW90ZVNjb3BpbmdTdGF0ZW1lbnRzKFxuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCByZW1vdGVTY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRSZW1vdGVTY29wZShkZWNsLm5vZGUpO1xuICAgICAgaWYgKHJlbW90ZVNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSByZW1vdGVTY29wZS5kaXJlY3RpdmVzLm1hcChcbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkaXJlY3RpdmUsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICBjb25zdCBwaXBlcyA9IHJlbW90ZVNjb3BlLnBpcGVzLm1hcChwaXBlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKGRpcmVjdGl2ZXMpO1xuICAgICAgICBjb25zdCBwaXBlc0FycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIocGlwZXMpO1xuICAgICAgICBjb25zdCBkZWNsRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRlY2wsIGNvbnRleHQpLmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbXBpbGVOZ01vZHVsZShcbiAgICAgIGZhY3RvcnlGbjogUjNDb21waWxlZEV4cHJlc3Npb24sIGluamVjdG9yRGVmOiBSM0NvbXBpbGVkRXhwcmVzc2lvbixcbiAgICAgIG5nTW9kdWxlRGVmOiBSM0NvbXBpbGVkRXhwcmVzc2lvbik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtWZhYycsXG4gICAgICAgIGluaXRpYWxpemVyOiBmYWN0b3J5Rm4uZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogZmFjdG9yeUZuLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IGZhY3RvcnlGbi50eXBlLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1bW9kJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nTW9kdWxlRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nTW9kdWxlRGVmLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnybVpbmonLFxuICAgICAgICBpbml0aWFsaXplcjogaW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogaW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogaW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGlmICh0aGlzLmxvY2FsZUlkKSB7XG4gICAgICAvLyBRVUVTVElPTjogY2FuIHRoaXMgc3R1ZmYgYmUgcmVtb3ZlZD9cbiAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ8m1bG9jJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5ldyBMaXRlcmFsRXhwcih0aGlzLmxvY2FsZUlkKSxcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IFNUUklOR19UWVBFXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9SM1JlZmVyZW5jZShcbiAgICAgIHZhbHVlUmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24odHlwZU5vZGUpKSB7XG4gICAgICAgIHR5cGVSZWYgPSBuZXcgUmVmZXJlbmNlKHR5cGVOb2RlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB0eXBlUmVmLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0LCB0aGlzLnJlZkVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBGdW5jdGlvbkRlY2xhcmF0aW9uYCwgYE1ldGhvZERlY2xhcmF0aW9uYCBvciBgRnVuY3Rpb25FeHByZXNzaW9uYCwgY2hlY2sgaWYgaXQgaXNcbiAgICogdHlwZWQgYXMgYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgYW5kIHJldHVybiBhbiBleHByZXNzaW9uIHJlZmVyZW5jaW5nIHRoZSBtb2R1bGUgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4obm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdHlwZSA9IG5vZGUudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB0eXBlICYmXG4gICAgICAgICh0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbVR5cGVQYXJhbSh0eXBlLCBub2RlKSB8fCB0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyczxUPmBcbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0oXG4gICAgICB0eXBlOiB0cy5UeXBlTm9kZSxcbiAgICAgIG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZU5hbWUgPSB0eXBlICYmXG4gICAgICAgICAgICAodHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUgfHxcbiAgICAgICAgICAgICB0cy5pc1F1YWxpZmllZE5hbWUodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZS5yaWdodCkgfHxcbiAgICAgICAgbnVsbDtcbiAgICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHR5cGUgaXRzZWxmIHRvIHNlZSB3aGVyZSBpdCBjb21lcyBmcm9tLlxuICAgIGNvbnN0IGlkID0gdGhpcy5yZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgY29uc3QgcGFyZW50ID1cbiAgICAgICAgICB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgPyBub2RlLnBhcmVudCA6IG51bGw7XG4gICAgICBjb25zdCBzeW1ib2xOYW1lID0gKHBhcmVudCAmJiBwYXJlbnQubmFtZSA/IHBhcmVudC5uYW1lLmdldFRleHQoKSArICcuJyA6ICcnKSArXG4gICAgICAgICAgKG5vZGUubmFtZSA/IG5vZGUubmFtZS5nZXRUZXh0KCkgOiAnYW5vbnltb3VzJyk7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMsIHR5cGUsXG4gICAgICAgICAgYCR7c3ltYm9sTmFtZX0gcmV0dXJucyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZSB3aXRob3V0IGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50LiBgICtcbiAgICAgICAgICAgICAgYFBsZWFzZSBhZGQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQgdG8gdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZS4gSWYgdGhpcyBgICtcbiAgICAgICAgICAgICAgYG9jY3VycmVuY2UgaXMgaW4gbGlicmFyeSBjb2RlIHlvdSBkb24ndCBjb250cm9sLCBwbGVhc2UgY29udGFjdCB0aGUgbGlicmFyeSBhdXRob3JzLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiB0eXBlTm9kZVRvVmFsdWVFeHByKGFyZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYEF8Qnx7bmdNb2R1bGU6IFR9fENgLlxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzSW50ZXJzZWN0aW9uVHlwZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgdHlwZS50eXBlcykge1xuICAgICAgaWYgKHRzLmlzVHlwZUxpdGVyYWxOb2RlKHQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiB0Lm1lbWJlcnMpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSB0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG0pICYmIHRzLmlzSWRlbnRpZmllcihtLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJyAmJiBtLnR5cGUgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZUV4cHJlc3Npb24gPSBuZ01vZHVsZVR5cGUgJiYgdHlwZU5vZGVUb1ZhbHVlRXhwcihuZ01vZHVsZVR5cGUpO1xuICAgICAgICAgIGlmIChuZ01vZHVsZUV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiBuZ01vZHVsZUV4cHJlc3Npb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgYSBcIkRlY2xhcmF0aW9uXCIgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2UpOiByZWYgaXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhyZWYubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KFxuICAgICAgZXhwcjogdHMuTm9kZSwgcmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBjbGFzc05hbWU6IHN0cmluZyxcbiAgICAgIGFycmF5TmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgZXhwciwgcmVzb2x2ZWRMaXN0LFxuICAgICAgICAgIGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX1gKTtcbiAgICB9XG5cbiAgICByZXNvbHZlZExpc3QuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4ge1xuICAgICAgLy8gVW53cmFwIE1vZHVsZVdpdGhQcm92aWRlcnMgZm9yIG1vZHVsZXMgdGhhdCBhcmUgbG9jYWxseSBkZWNsYXJlZCAoYW5kIHRodXMgc3RhdGljXG4gICAgICAvLyByZXNvbHV0aW9uIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTWFwICYmIGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICBlbnRyeSA9IGVudHJ5LmdldCgnbmdNb2R1bGUnKSE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBjbGFzc05hbWUsIGFycmF5TmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChlbnRyeSBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGVudHJ5Lm5vZGUsIGVudHJ5LFxuICAgICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCBlbnRyeSxcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke1xuICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVmTGlzdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc05nTW9kdWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBTY29wZURhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuICFjb21waWxhdGlvbi5kaXJlY3RpdmVzLnNvbWUoZGlyZWN0aXZlID0+IGRpcmVjdGl2ZS5yZWYubm9kZSA9PT0gbm9kZSkgJiZcbiAgICAgICFjb21waWxhdGlvbi5waXBlcy5zb21lKHBpcGUgPT4gcGlwZS5yZWYubm9kZSA9PT0gbm9kZSk7XG59XG4iXX0=