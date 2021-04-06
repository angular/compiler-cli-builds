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
                (_b = this.referencesRegistry).add.apply(_b, tslib_1.__spreadArray([node], tslib_1.__read(exportRefs)));
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
                target: compiler_1.FactoryTarget.NgModule,
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
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(scopeDiagnostics)));
            }
            if (analysis.providersRequiringFactory !== null) {
                var providerDiagnostics = diagnostics_2.getProviderDiagnostics(analysis.providersRequiringFactory, analysis.providers, this.injectableRegistry);
                diagnostics.push.apply(diagnostics, tslib_1.__spreadArray([], tslib_1.__read(providerDiagnostics)));
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
            var factoryFn = factory_1.compileNgFactoryDefField(fac);
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
            var factoryFn = factory_1.compileDeclareFactory(fac);
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
            return tslib_1.__assign(tslib_1.__assign({}, inj), { imports: tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(inj.imports)), tslib_1.__read(injectorImports)) });
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
                factoryFn,
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
                    refList.push.apply(refList, tslib_1.__spreadArray([], tslib_1.__read(_this.resolveTypeList(expr, entry, className, arrayName))));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBMGM7SUFDMWMsK0JBQWlDO0lBRWpDLDJFQUEwRztJQUMxRyxtRUFBaUY7SUFDakYsNkZBQWtJO0lBR2xJLDZEQUFtRDtJQUNuRCx5RUFBaUo7SUFJakosdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCwyRkFBbUY7SUFDbkYsbUZBQTBFO0lBQzFFLHFGQUF3RDtJQUV4RCw2RUFBd1E7SUFzQnhROztPQUVHO0lBQ0g7UUFBb0MsMENBQWM7UUFBbEQ7WUFBQSxxRUFrRUM7WUFqRVMsOEJBQXdCLEdBSTFCLEVBQUUsQ0FBQzs7UUE2RFgsQ0FBQztRQTNEQyw0Q0FBbUIsR0FBbkIsVUFBb0IsY0FBOEI7WUFDaEQsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQseUZBQXlGO1lBQ3pGLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELHVDQUFjLEdBQWQsVUFBZSxjQUE4Qjs7WUFDM0MsSUFBSSxDQUFDLENBQUMsY0FBYyxZQUFZLGNBQWMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBRUQsOERBQThEO1lBQzlELElBQUksY0FBYyxDQUFDLHdCQUF3QixDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFO2dCQUMzRixPQUFPLElBQUksQ0FBQzthQUNiO29DQUVVLFNBQVM7Z0JBQ2xCLElBQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTO29C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LFNBQVMsRUFBRSxTQUFTLENBQUMsSUFBRTtpQkFDMUU7cUJBQU0sSUFBSSxLQUFLLFlBQVksbUJBQVMsRUFBRTtvQkFDckMsSUFBSSxDQUFDLEtBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDNUMsTUFBTSwwQ0FBNEIsQ0FDOUIsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQ2pCLHVCQUFxQixHQUFHLHlCQUFvQixTQUFTLFlBQ2pELFNBQVMsb0JBQWlCLENBQUMsQ0FBQztxQkFDckM7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckI7cUJBQU07b0JBQ0wsMEZBQTBGO29CQUMxRixNQUFNLDBDQUE0QixDQUM5QixJQUFJLEVBQUUsS0FBSyxFQUNYLHVCQUFxQixHQUFHLHlCQUFvQixTQUFTLFlBQ2pELFNBQVMsd0JBQXFCLENBQUMsQ0FBQztpQkFDekM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFDSCwrQkFBQztJQUFELENBQUMsQUFsbEJELElBa2xCQztJQWxsQlksNERBQXdCO0lBb2xCckMsU0FBUyxVQUFVLENBQUMsSUFBc0IsRUFBRSxXQUFzQjtRQUNoRSxPQUFPLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQTNCLENBQTJCLENBQUM7WUFDekUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBdEIsQ0FBc0IsQ0FBQyxDQUFDO0lBQzlELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtjb21waWxlRGVjbGFyZUluamVjdG9yRnJvbU1ldGFkYXRhLCBjb21waWxlRGVjbGFyZU5nTW9kdWxlRnJvbU1ldGFkYXRhLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZSwgQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBGYWN0b3J5VGFyZ2V0LCBJZGVudGlmaWVycyBhcyBSMywgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNDb21waWxlZEV4cHJlc3Npb24sIFIzRmFjdG9yeU1ldGFkYXRhLCBSM0lkZW50aWZpZXJzLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFNjaGVtYU1ldGFkYXRhLCBTdGF0ZW1lbnQsIFNUUklOR19UWVBFLCBXcmFwcGVkTm9kZUV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3IsIG1ha2VEaWFnbm9zdGljLCBtYWtlUmVsYXRlZEluZm9ybWF0aW9ufSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0RlZmF1bHRJbXBvcnRSZWNvcmRlciwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7aXNBcnJheUVxdWFsLCBpc1JlZmVyZW5jZUVxdWFsLCBpc1N5bWJvbEVxdWFsLCBTZW1hbnRpY1JlZmVyZW5jZSwgU2VtYW50aWNTeW1ib2x9IGZyb20gJy4uLy4uL2luY3JlbWVudGFsL3NlbWFudGljX2dyYXBoJztcbmltcG9ydCB7SW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UGVyZkV2ZW50LCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlcn0gZnJvbSAnLi4vLi4vc2hpbXMvYXBpJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2NyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IsIGdldFByb3ZpZGVyRGlhZ25vc3RpY3N9IGZyb20gJy4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtjb21waWxlRGVjbGFyZUZhY3RvcnksIGNvbXBpbGVOZ0ZhY3RvcnlEZWZGaWVsZH0gZnJvbSAnLi9mYWN0b3J5JztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHRvUjNSZWZlcmVuY2UsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMsIHdyYXBUeXBlUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBtb2Q6IFIzTmdNb2R1bGVNZXRhZGF0YTtcbiAgaW5qOiBSM0luamVjdG9yTWV0YWRhdGE7XG4gIGZhYzogUjNGYWN0b3J5TWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsO1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGlkOiBFeHByZXNzaW9ufG51bGw7XG4gIGZhY3RvcnlTeW1ib2xOYW1lOiBzdHJpbmc7XG4gIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG4gIHByb3ZpZGVyczogdHMuRXhwcmVzc2lvbnxudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlUmVzb2x1dGlvbiB7XG4gIGluamVjdG9ySW1wb3J0czogRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBOZ01vZHVsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nTW9kdWxlU3ltYm9sIGV4dGVuZHMgU2VtYW50aWNTeW1ib2wge1xuICBwcml2YXRlIHJlbW90ZWx5U2NvcGVkQ29tcG9uZW50czoge1xuICAgIGNvbXBvbmVudDogU2VtYW50aWNTeW1ib2wsXG4gICAgdXNlZERpcmVjdGl2ZXM6IFNlbWFudGljUmVmZXJlbmNlW10sXG4gICAgdXNlZFBpcGVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdXG4gIH1bXSA9IFtdO1xuXG4gIGlzUHVibGljQXBpQWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIE5nTW9kdWxlcyBkb24ndCBoYXZlIGEgcHVibGljIEFQSSB0aGF0IGNvdWxkIGFmZmVjdCBlbWl0IG9mIEFuZ3VsYXIgZGVjb3JhdGVkIGNsYXNzZXMuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaXNFbWl0QWZmZWN0ZWQocHJldmlvdXNTeW1ib2w6IFNlbWFudGljU3ltYm9sKTogYm9vbGVhbiB7XG4gICAgaWYgKCEocHJldmlvdXNTeW1ib2wgaW5zdGFuY2VvZiBOZ01vZHVsZVN5bWJvbCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIGNvbXBhcmUgb3VyIHJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cyB0byB0aGUgcHJldmlvdXMgc3ltYm9sXG4gICAgaWYgKHByZXZpb3VzU3ltYm9sLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5sZW5ndGggIT09IHRoaXMucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBjdXJyRW50cnkgb2YgdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMpIHtcbiAgICAgIGNvbnN0IHByZXZFbnRyeSA9IHByZXZpb3VzU3ltYm9sLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5maW5kKHByZXZFbnRyeSA9PiB7XG4gICAgICAgIHJldHVybiBpc1N5bWJvbEVxdWFsKHByZXZFbnRyeS5jb21wb25lbnQsIGN1cnJFbnRyeS5jb21wb25lbnQpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChwcmV2RW50cnkgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBObyBwcmV2aW91cyBlbnRyeSB3YXMgZm91bmQsIHdoaWNoIG1lYW5zIHRoYXQgdGhpcyBjb21wb25lbnQgYmVjYW1lIHJlbW90ZWx5IHNjb3BlZCBhbmRcbiAgICAgICAgLy8gaGVuY2UgdGhpcyBOZ01vZHVsZSBuZWVkcyB0byBiZSByZS1lbWl0dGVkLlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc0FycmF5RXF1YWwoY3VyckVudHJ5LnVzZWREaXJlY3RpdmVzLCBwcmV2RW50cnkudXNlZERpcmVjdGl2ZXMsIGlzUmVmZXJlbmNlRXF1YWwpKSB7XG4gICAgICAgIC8vIFRoZSBsaXN0IG9mIHVzZWQgZGlyZWN0aXZlcyBvciB0aGVpciBvcmRlciBoYXMgY2hhbmdlZC4gU2luY2UgdGhpcyBOZ01vZHVsZSBlbWl0c1xuICAgICAgICAvLyByZWZlcmVuY2VzIHRvIHRoZSBsaXN0IG9mIHVzZWQgZGlyZWN0aXZlcywgaXQgc2hvdWxkIGJlIHJlLWVtaXR0ZWQgdG8gdXBkYXRlIHRoaXMgbGlzdC5cbiAgICAgICAgLy8gTm90ZTogdGhlIE5nTW9kdWxlIGRvZXMgbm90IGhhdmUgdG8gYmUgcmUtZW1pdHRlZCB3aGVuIGFueSBvZiB0aGUgZGlyZWN0aXZlcyBoYXMgaGFkXG4gICAgICAgIC8vIHRoZWlyIHB1YmxpYyBBUEkgY2hhbmdlZCwgYXMgdGhlIE5nTW9kdWxlIG9ubHkgZW1pdHMgYSByZWZlcmVuY2UgdG8gdGhlIHN5bWJvbCBieSBpdHNcbiAgICAgICAgLy8gbmFtZS4gVGhlcmVmb3JlLCB0ZXN0aW5nIGZvciBzeW1ib2wgZXF1YWxpdHkgaXMgc3VmZmljaWVudC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNBcnJheUVxdWFsKGN1cnJFbnRyeS51c2VkUGlwZXMsIHByZXZFbnRyeS51c2VkUGlwZXMsIGlzUmVmZXJlbmNlRXF1YWwpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpc1R5cGVDaGVja0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhZGRSZW1vdGVseVNjb3BlZENvbXBvbmVudChcbiAgICAgIGNvbXBvbmVudDogU2VtYW50aWNTeW1ib2wsIHVzZWREaXJlY3RpdmVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdLFxuICAgICAgdXNlZFBpcGVzOiBTZW1hbnRpY1JlZmVyZW5jZVtdKTogdm9pZCB7XG4gICAgdGhpcy5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMucHVzaCh7Y29tcG9uZW50LCB1c2VkRGlyZWN0aXZlcywgdXNlZFBpcGVzfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBDb21waWxlcyBATmdNb2R1bGUgYW5ub3RhdGlvbnMgdG8gbmdNb2R1bGVEZWYgZmllbGRzLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgTmdNb2R1bGVBbmFseXNpcywgTmdNb2R1bGVTeW1ib2wsIE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGZhY3RvcnlUcmFja2VyOiBGYWN0b3J5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIHByaXZhdGUgcGVyZjogUGVyZlJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBsb2NhbGVJZD86IHN0cmluZykge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBkZWNvcmF0b3I6IGRlY29yYXRvcixcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIHRoaXMucGVyZi5ldmVudENvdW50KFBlcmZFdmVudC5BbmFseXplTmdNb2R1bGUpO1xuXG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlcnMgPSBjb21iaW5lUmVzb2x2ZXJzKFtcbiAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSksXG4gICAgICBmb3J3YXJkUmVmUmVzb2x2ZXIsXG4gICAgXSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25SZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIHJhd0RlY2xhcmF0aW9ucyA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykhO1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25NZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RGVjbGFyYXRpb25zLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgZGVjbGFyYXRpb25SZWZzID1cbiAgICAgICAgICB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdEZWNsYXJhdGlvbnMsIGRlY2xhcmF0aW9uTWV0YSwgbmFtZSwgJ2RlY2xhcmF0aW9ucycpO1xuXG4gICAgICAvLyBMb29rIHRocm91Z2ggdGhlIGRlY2xhcmF0aW9ucyB0byBtYWtlIHN1cmUgdGhleSdyZSBhbGwgYSBwYXJ0IG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgICAgZm9yIChjb25zdCByZWYgb2YgZGVjbGFyYXRpb25SZWZzKSB7XG4gICAgICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICBjb25zdCBlcnJvck5vZGU6IHRzLkV4cHJlc3Npb24gPSByZWYuZ2V0T3JpZ2luRm9yRGlhZ25vc3RpY3MocmF3RGVjbGFyYXRpb25zKTtcblxuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICAgIGBDYW5ub3QgZGVjbGFyZSAnJHtcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nIGluIGFuIE5nTW9kdWxlIGFzIGl0J3Mgbm90IGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5gLFxuICAgICAgICAgICAgICBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgICAgICAgIHJlZi5ub2RlLm5hbWUsIGAnJHtyZWYubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmApXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3SW1wb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGltcG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdJbXBvcnRzLCBpbXBvcnRzTWV0YSwgbmFtZSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0V4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICByYXdFeHBvcnRzID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykhO1xuICAgICAgY29uc3QgZXhwb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgZXhwb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0V4cG9ydHMsIGV4cG9ydHNNZXRhLCBuYW1lLCAnZXhwb3J0cycpO1xuICAgICAgdGhpcy5yZWZlcmVuY2VzUmVnaXN0cnkuYWRkKG5vZGUsIC4uLmV4cG9ydFJlZnMpO1xuICAgIH1cbiAgICBsZXQgYm9vdHN0cmFwUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdib290c3RyYXAnKSkge1xuICAgICAgY29uc3QgZXhwciA9IG5nTW9kdWxlLmdldCgnYm9vdHN0cmFwJykhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdzY2hlbWFzJykpIHtcbiAgICAgIGNvbnN0IHJhd0V4cHIgPSBuZ01vZHVsZS5nZXQoJ3NjaGVtYXMnKSE7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IocmF3RXhwciwgcmVzdWx0LCBgTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5YCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgc2NoZW1hUmVmIG9mIHJlc3VsdCkge1xuICAgICAgICBpZiAoIShzY2hlbWFSZWYgaW5zdGFuY2VvZiBSZWZlcmVuY2UpKSB7XG4gICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgcmF3RXhwciwgcmVzdWx0LCAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZCA9IHNjaGVtYVJlZi5nZXRJZGVudGl0eUluKHNjaGVtYVJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBzY2hlbWFSZWYub3duZWRCeU1vZHVsZUd1ZXNzICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICByYXdFeHByLCByZXN1bHQsICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNpbmNlIGBpZGAgaXMgdGhlIGB0cy5JZGVudGlmZXJgIHdpdGhpbiB0aGUgc2NoZW1hIHJlZidzIGRlY2xhcmF0aW9uIGZpbGUsIGl0J3Mgc2FmZSB0b1xuICAgICAgICAvLyB1c2UgYGlkLnRleHRgIGhlcmUgdG8gZmlndXJlIG91dCB3aGljaCBzY2hlbWEgaXMgaW4gdXNlLiBFdmVuIGlmIHRoZSBhY3R1YWwgcmVmZXJlbmNlIHdhc1xuICAgICAgICAvLyByZW5hbWVkIHdoZW4gdGhlIHVzZXIgaW1wb3J0ZWQgaXQsIHRoZXNlIG5hbWVzIHdpbGwgbWF0Y2guXG4gICAgICAgIHN3aXRjaCAoaWQudGV4dCkge1xuICAgICAgICAgIGNhc2UgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKENVU1RPTV9FTEVNRU5UU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnTk9fRVJST1JTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goTk9fRVJST1JTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihcbiAgICAgICAgICAgICAgICByYXdFeHByLCBzY2hlbWFSZWYsIGAnJHtzY2hlbWFSZWYuZGVidWdOYW1lfScgaXMgbm90IGEgdmFsaWQgTmdNb2R1bGUgc2NoZW1hYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpZDogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgICAgbmdNb2R1bGUuaGFzKCdpZCcpID8gbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2lkJykhKSA6IG51bGw7XG4gICAgY29uc3QgdmFsdWVDb250ZXh0ID0gbm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICBsZXQgdHlwZUNvbnRleHQgPSB2YWx1ZUNvbnRleHQ7XG4gICAgY29uc3QgdHlwZU5vZGUgPSB0aGlzLnJlZmxlY3Rvci5nZXREdHNEZWNsYXJhdGlvbihub2RlKTtcbiAgICBpZiAodHlwZU5vZGUgIT09IG51bGwpIHtcbiAgICAgIHR5cGVDb250ZXh0ID0gdHlwZU5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGJvb3RzdHJhcCA9XG4gICAgICAgIGJvb3RzdHJhcFJlZnMubWFwKGJvb3RzdHJhcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGJvb3RzdHJhcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGRlY2xhcmF0aW9ucyA9XG4gICAgICAgIGRlY2xhcmF0aW9uUmVmcy5tYXAoZGVjbCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGRlY2wsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBpbXBvcnRzID0gaW1wb3J0UmVmcy5tYXAoaW1wID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoaW1wLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydFJlZnMubWFwKGV4cCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGV4cCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuXG4gICAgY29uc3QgaXNGb3J3YXJkUmVmZXJlbmNlID0gKHJlZjogUjNSZWZlcmVuY2UpID0+XG4gICAgICAgIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UocmVmLnZhbHVlLCBub2RlLm5hbWUhLCB2YWx1ZUNvbnRleHQpO1xuICAgIGNvbnN0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gYm9vdHN0cmFwLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbnMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8IGltcG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGV4cG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpO1xuXG4gICAgY29uc3QgdHlwZSA9IHdyYXBUeXBlUmVmZXJlbmNlKHRoaXMucmVmbGVjdG9yLCBub2RlKTtcbiAgICBjb25zdCBpbnRlcm5hbFR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHRoaXMucmVmbGVjdG9yLmdldEludGVybmFsTmFtZU9mQ2xhc3Mobm9kZSkpO1xuICAgIGNvbnN0IGFkamFjZW50VHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0QWRqYWNlbnROYW1lT2ZDbGFzcyhub2RlKSk7XG5cbiAgICBjb25zdCBuZ01vZHVsZU1ldGFkYXRhOiBSM05nTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICB0eXBlLFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgYWRqYWNlbnRUeXBlLFxuICAgICAgYm9vdHN0cmFwLFxuICAgICAgZGVjbGFyYXRpb25zLFxuICAgICAgZXhwb3J0cyxcbiAgICAgIGltcG9ydHMsXG4gICAgICBjb250YWluc0ZvcndhcmREZWNscyxcbiAgICAgIGlkLFxuICAgICAgZW1pdElubGluZTogZmFsc2UsXG4gICAgICAvLyBUT0RPOiB0byBiZSBpbXBsZW1lbnRlZCBhcyBhIHBhcnQgb2YgRlctMTAwNC5cbiAgICAgIHNjaGVtYXM6IFtdLFxuICAgIH07XG5cbiAgICBjb25zdCByYXdQcm92aWRlcnMgPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID8gbmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSEgOiBudWxsO1xuICAgIGNvbnN0IHdyYXBwZXJQcm92aWRlcnMgPSByYXdQcm92aWRlcnMgIT09IG51bGwgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/IHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMocmF3UHJvdmlkZXJzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF3UHJvdmlkZXJzKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBvbmx5IGFkZCB0aGUgbW9kdWxlJ3MgaW1wb3J0cyBhcyB0aGUgaW5qZWN0b3JzJyBpbXBvcnRzLiBBbnkgZXhwb3J0ZWQgbW9kdWxlc1xuICAgIC8vIGFyZSBhZGRlZCBkdXJpbmcgYHJlc29sdmVgLCBhcyB3ZSBuZWVkIHNjb3BlIGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gZmlsdGVyIG91dCBkaXJlY3RpdmVzXG4gICAgLy8gYW5kIHBpcGVzIGZyb20gdGhlIG1vZHVsZSBleHBvcnRzLlxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykhKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucm91dGVBbmFseXplciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb3V0ZUFuYWx5emVyLmFkZChub2RlLmdldFNvdXJjZUZpbGUoKSwgbmFtZSwgcmF3SW1wb3J0cywgcmF3RXhwb3J0cywgcmF3UHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbmplY3Rvck1ldGFkYXRhOiBSM0luamVjdG9yTWV0YWRhdGEgPSB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIHByb3ZpZGVyczogd3JhcHBlclByb3ZpZGVycyxcbiAgICAgIGltcG9ydHM6IGluamVjdG9ySW1wb3J0cyxcbiAgICB9O1xuXG4gICAgY29uc3QgZmFjdG9yeU1ldGFkYXRhOiBSM0ZhY3RvcnlNZXRhZGF0YSA9IHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgdHlwZUFyZ3VtZW50Q291bnQ6IDAsXG4gICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgdGFyZ2V0OiBGYWN0b3J5VGFyZ2V0Lk5nTW9kdWxlLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaWQsXG4gICAgICAgIHNjaGVtYXMsXG4gICAgICAgIG1vZDogbmdNb2R1bGVNZXRhZGF0YSxcbiAgICAgICAgaW5qOiBpbmplY3Rvck1ldGFkYXRhLFxuICAgICAgICBmYWM6IGZhY3RvcnlNZXRhZGF0YSxcbiAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsXG4gICAgICAgIHJhd0RlY2xhcmF0aW9ucyxcbiAgICAgICAgaW1wb3J0czogaW1wb3J0UmVmcyxcbiAgICAgICAgZXhwb3J0czogZXhwb3J0UmVmcyxcbiAgICAgICAgcHJvdmlkZXJzOiByYXdQcm92aWRlcnMsXG4gICAgICAgIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IHJhd1Byb3ZpZGVycyA/XG4gICAgICAgICAgICByZXNvbHZlUHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeShyYXdQcm92aWRlcnMsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmV2YWx1YXRvcikgOlxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICBzeW1ib2wobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IE5nTW9kdWxlU3ltYm9sIHtcbiAgICByZXR1cm4gbmV3IE5nTW9kdWxlU3ltYm9sKG5vZGUpO1xuICB9XG5cbiAgcmVnaXN0ZXIobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiB2b2lkIHtcbiAgICAvLyBSZWdpc3RlciB0aGlzIG1vZHVsZSdzIGluZm9ybWF0aW9uIHdpdGggdGhlIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeS4gVGhpcyBlbnN1cmVzIHRoYXRcbiAgICAvLyBkdXJpbmcgdGhlIGNvbXBpbGUoKSBwaGFzZSwgdGhlIG1vZHVsZSdzIG1ldGFkYXRhIGlzIGF2YWlsYWJsZSBmb3Igc2VsZWN0b3Igc2NvcGVcbiAgICAvLyBjb21wdXRhdGlvbi5cbiAgICB0aGlzLm1ldGFSZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoe1xuICAgICAgcmVmOiBuZXcgUmVmZXJlbmNlKG5vZGUpLFxuICAgICAgc2NoZW1hczogYW5hbHlzaXMuc2NoZW1hcyxcbiAgICAgIGRlY2xhcmF0aW9uczogYW5hbHlzaXMuZGVjbGFyYXRpb25zLFxuICAgICAgaW1wb3J0czogYW5hbHlzaXMuaW1wb3J0cyxcbiAgICAgIGV4cG9ydHM6IGFuYWx5c2lzLmV4cG9ydHMsXG4gICAgICByYXdEZWNsYXJhdGlvbnM6IGFuYWx5c2lzLnJhd0RlY2xhcmF0aW9ucyxcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLmZhY3RvcnlUcmFja2VyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmZhY3RvcnlUcmFja2VyLnRyYWNrKG5vZGUuZ2V0U291cmNlRmlsZSgpLCB7XG4gICAgICAgIG5hbWU6IGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lLFxuICAgICAgICBoYXNJZDogYW5hbHlzaXMuaWQgIT09IG51bGwsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmluamVjdGFibGVSZWdpc3RyeS5yZWdpc3RlckluamVjdGFibGUobm9kZSk7XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPik6XG4gICAgICBSZXNvbHZlUmVzdWx0PE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUobm9kZSk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGVEaWFnbm9zdGljcyA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREaWFnbm9zdGljc09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChzY29wZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNjb3BlRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGlmIChhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5ICE9PSBudWxsKSB7XG4gICAgICBjb25zdCBwcm92aWRlckRpYWdub3N0aWNzID0gZ2V0UHJvdmlkZXJEaWFnbm9zdGljcyhcbiAgICAgICAgICBhbmFseXNpcy5wcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5LCBhbmFseXNpcy5wcm92aWRlcnMhLCB0aGlzLmluamVjdGFibGVSZWdpc3RyeSk7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnByb3ZpZGVyRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IE5nTW9kdWxlUmVzb2x1dGlvbiA9IHtcbiAgICAgIGluamVjdG9ySW1wb3J0czogW10sXG4gICAgfTtcblxuICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiAhc2NvcGUuY29tcGlsYXRpb24uaXNQb2lzb25lZCkge1xuICAgICAgLy8gVXNpbmcgdGhlIHNjb3BlIGluZm9ybWF0aW9uLCBleHRlbmQgdGhlIGluamVjdG9yJ3MgaW1wb3J0cyB1c2luZyB0aGUgbW9kdWxlcyB0aGF0IGFyZVxuICAgICAgLy8gc3BlY2lmaWVkIGFzIG1vZHVsZSBleHBvcnRzLlxuICAgICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgICBmb3IgKGNvbnN0IGV4cG9ydFJlZiBvZiBhbmFseXNpcy5leHBvcnRzKSB7XG4gICAgICAgIGlmIChpc05nTW9kdWxlKGV4cG9ydFJlZi5ub2RlLCBzY29wZS5jb21waWxhdGlvbikpIHtcbiAgICAgICAgICBkYXRhLmluamVjdG9ySW1wb3J0cy5wdXNoKHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZiwgY29udGV4dCkuZXhwcmVzc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcblxuICAgICAgICBpZiAobWV0YWRhdGEgIT09IG51bGwgJiYgbWV0YWRhdGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiwgZGVjbC5ub2RlLFxuICAgICAgICAgICAgICBgRGlyZWN0aXZlICR7ZGVjbC5ub2RlLm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkIHx8IHNjb3BlLmV4cG9ydGVkLmlzUG9pc29uZWQgfHxcbiAgICAgICAgc2NvcGUucmVleHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge2RhdGF9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkYXRhLFxuICAgICAgICByZWV4cG9ydHM6IHNjb3BlLnJlZXhwb3J0cyxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZUZ1bGwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLFxuICAgICAge2luaiwgbW9kLCBmYWMsIG1ldGFkYXRhU3RtdCwgZGVjbGFyYXRpb25zfTogUmVhZG9ubHk8TmdNb2R1bGVBbmFseXNpcz4sXG4gICAgICB7aW5qZWN0b3JJbXBvcnRzfTogUmVhZG9ubHk8TmdNb2R1bGVSZXNvbHV0aW9uPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjdG9yeUZuID0gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKGZhYyk7XG4gICAgY29uc3QgbmdJbmplY3RvckRlZiA9IGNvbXBpbGVJbmplY3Rvcih0aGlzLm1lcmdlSW5qZWN0b3JJbXBvcnRzKGluaiwgaW5qZWN0b3JJbXBvcnRzKSk7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUobW9kKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzID0gbmdNb2R1bGVEZWYuc3RhdGVtZW50cztcbiAgICB0aGlzLmluc2VydE1ldGFkYXRhU3RhdGVtZW50KHN0YXRlbWVudHMsIG1ldGFkYXRhU3RtdCk7XG4gICAgdGhpcy5hcHBlbmRSZW1vdGVTY29waW5nU3RhdGVtZW50cyhzdGF0ZW1lbnRzLCBub2RlLCBkZWNsYXJhdGlvbnMpO1xuXG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZU5nTW9kdWxlKGZhY3RvcnlGbiwgbmdJbmplY3RvckRlZiwgbmdNb2R1bGVEZWYpO1xuICB9XG5cbiAgY29tcGlsZVBhcnRpYWwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCB7aW5qLCBmYWMsIG1vZCwgbWV0YWRhdGFTdG10fTogUmVhZG9ubHk8TmdNb2R1bGVBbmFseXNpcz4sXG4gICAgICB7aW5qZWN0b3JJbXBvcnRzfTogUmVhZG9ubHk8TmdNb2R1bGVSZXNvbHV0aW9uPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgY29uc3QgZmFjdG9yeUZuID0gY29tcGlsZURlY2xhcmVGYWN0b3J5KGZhYyk7XG4gICAgY29uc3QgaW5qZWN0b3JEZWYgPVxuICAgICAgICBjb21waWxlRGVjbGFyZUluamVjdG9yRnJvbU1ldGFkYXRhKHRoaXMubWVyZ2VJbmplY3RvckltcG9ydHMoaW5qLCBpbmplY3RvckltcG9ydHMpKTtcbiAgICBjb25zdCBuZ01vZHVsZURlZiA9IGNvbXBpbGVEZWNsYXJlTmdNb2R1bGVGcm9tTWV0YWRhdGEobW9kKTtcbiAgICB0aGlzLmluc2VydE1ldGFkYXRhU3RhdGVtZW50KG5nTW9kdWxlRGVmLnN0YXRlbWVudHMsIG1ldGFkYXRhU3RtdCk7XG4gICAgLy8gTk9URTogbm8gcmVtb3RlIHNjb3BpbmcgcmVxdWlyZWQgYXMgdGhpcyBpcyBiYW5uZWQgaW4gcGFydGlhbCBjb21waWxhdGlvbi5cbiAgICByZXR1cm4gdGhpcy5jb21waWxlTmdNb2R1bGUoZmFjdG9yeUZuLCBpbmplY3RvckRlZiwgbmdNb2R1bGVEZWYpO1xuICB9XG5cbiAgLyoqXG4gICAqICBNZXJnZSB0aGUgaW5qZWN0b3IgaW1wb3J0cyAod2hpY2ggYXJlICdleHBvcnRzJyB0aGF0IHdlcmUgbGF0ZXIgZm91bmQgdG8gYmUgTmdNb2R1bGVzKVxuICAgKiAgY29tcHV0ZWQgZHVyaW5nIHJlc29sdXRpb24gd2l0aCB0aGUgb25lcyBmcm9tIGFuYWx5c2lzLlxuICAgKi9cbiAgcHJpdmF0ZSBtZXJnZUluamVjdG9ySW1wb3J0cyhpbmo6IFIzSW5qZWN0b3JNZXRhZGF0YSwgaW5qZWN0b3JJbXBvcnRzOiBFeHByZXNzaW9uW10pOlxuICAgICAgUjNJbmplY3Rvck1ldGFkYXRhIHtcbiAgICByZXR1cm4gey4uLmluaiwgaW1wb3J0czogWy4uLmluai5pbXBvcnRzLCAuLi5pbmplY3RvckltcG9ydHNdfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgY2xhc3MgbWV0YWRhdGEgc3RhdGVtZW50cywgaWYgcHJvdmlkZWQsIHRvIHRoZSBgbmdNb2R1bGVTdGF0ZW1lbnRzYC5cbiAgICovXG4gIHByaXZhdGUgaW5zZXJ0TWV0YWRhdGFTdGF0ZW1lbnQobmdNb2R1bGVTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSwgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbCk6XG4gICAgICB2b2lkIHtcbiAgICBpZiAobWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBuZ01vZHVsZVN0YXRlbWVudHMudW5zaGlmdChtZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgcmVtb3RlIHNjb3Bpbmcgc3RhdGVtZW50cywgYXMgbmVlZGVkLCB0byB0aGUgYG5nTW9kdWxlU3RhdGVtZW50c2AuXG4gICAqL1xuICBwcml2YXRlIGFwcGVuZFJlbW90ZVNjb3BpbmdTdGF0ZW1lbnRzKFxuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSwgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbixcbiAgICAgIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10pOiB2b2lkIHtcbiAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCByZW1vdGVTY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRSZW1vdGVTY29wZShkZWNsLm5vZGUpO1xuICAgICAgaWYgKHJlbW90ZVNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPSByZW1vdGVTY29wZS5kaXJlY3RpdmVzLm1hcChcbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkaXJlY3RpdmUsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICBjb25zdCBwaXBlcyA9IHJlbW90ZVNjb3BlLnBpcGVzLm1hcChwaXBlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUsIGNvbnRleHQpLmV4cHJlc3Npb24pO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKGRpcmVjdGl2ZXMpO1xuICAgICAgICBjb25zdCBwaXBlc0FycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIocGlwZXMpO1xuICAgICAgICBjb25zdCBkZWNsRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRlY2wsIGNvbnRleHQpLmV4cHJlc3Npb247XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvbXBpbGVOZ01vZHVsZShcbiAgICAgIGZhY3RvcnlGbjogQ29tcGlsZVJlc3VsdCwgaW5qZWN0b3JEZWY6IFIzQ29tcGlsZWRFeHByZXNzaW9uLFxuICAgICAgbmdNb2R1bGVEZWY6IFIzQ29tcGlsZWRFeHByZXNzaW9uKTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICBjb25zdCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtcbiAgICAgIGZhY3RvcnlGbixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1bW9kJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nTW9kdWxlRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nTW9kdWxlRGVmLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnybVpbmonLFxuICAgICAgICBpbml0aWFsaXplcjogaW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogaW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogaW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGlmICh0aGlzLmxvY2FsZUlkKSB7XG4gICAgICAvLyBRVUVTVElPTjogY2FuIHRoaXMgc3R1ZmYgYmUgcmVtb3ZlZD9cbiAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ8m1bG9jJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5ldyBMaXRlcmFsRXhwcih0aGlzLmxvY2FsZUlkKSxcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IFNUUklOR19UWVBFXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9SM1JlZmVyZW5jZShcbiAgICAgIHZhbHVlUmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24odHlwZU5vZGUpKSB7XG4gICAgICAgIHR5cGVSZWYgPSBuZXcgUmVmZXJlbmNlKHR5cGVOb2RlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB0eXBlUmVmLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0LCB0aGlzLnJlZkVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBGdW5jdGlvbkRlY2xhcmF0aW9uYCwgYE1ldGhvZERlY2xhcmF0aW9uYCBvciBgRnVuY3Rpb25FeHByZXNzaW9uYCwgY2hlY2sgaWYgaXQgaXNcbiAgICogdHlwZWQgYXMgYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgYW5kIHJldHVybiBhbiBleHByZXNzaW9uIHJlZmVyZW5jaW5nIHRoZSBtb2R1bGUgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4obm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdHlwZSA9IG5vZGUudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB0eXBlICYmXG4gICAgICAgICh0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbVR5cGVQYXJhbSh0eXBlLCBub2RlKSB8fCB0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyczxUPmBcbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0oXG4gICAgICB0eXBlOiB0cy5UeXBlTm9kZSxcbiAgICAgIG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZU5hbWUgPSB0eXBlICYmXG4gICAgICAgICAgICAodHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUgfHxcbiAgICAgICAgICAgICB0cy5pc1F1YWxpZmllZE5hbWUodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZS5yaWdodCkgfHxcbiAgICAgICAgbnVsbDtcbiAgICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHR5cGUgaXRzZWxmIHRvIHNlZSB3aGVyZSBpdCBjb21lcyBmcm9tLlxuICAgIGNvbnN0IGlkID0gdGhpcy5yZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgY29uc3QgcGFyZW50ID1cbiAgICAgICAgICB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgPyBub2RlLnBhcmVudCA6IG51bGw7XG4gICAgICBjb25zdCBzeW1ib2xOYW1lID0gKHBhcmVudCAmJiBwYXJlbnQubmFtZSA/IHBhcmVudC5uYW1lLmdldFRleHQoKSArICcuJyA6ICcnKSArXG4gICAgICAgICAgKG5vZGUubmFtZSA/IG5vZGUubmFtZS5nZXRUZXh0KCkgOiAnYW5vbnltb3VzJyk7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMsIHR5cGUsXG4gICAgICAgICAgYCR7c3ltYm9sTmFtZX0gcmV0dXJucyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZSB3aXRob3V0IGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50LiBgICtcbiAgICAgICAgICAgICAgYFBsZWFzZSBhZGQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQgdG8gdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZS4gSWYgdGhpcyBgICtcbiAgICAgICAgICAgICAgYG9jY3VycmVuY2UgaXMgaW4gbGlicmFyeSBjb2RlIHlvdSBkb24ndCBjb250cm9sLCBwbGVhc2UgY29udGFjdCB0aGUgbGlicmFyeSBhdXRob3JzLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiB0eXBlTm9kZVRvVmFsdWVFeHByKGFyZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYEF8Qnx7bmdNb2R1bGU6IFR9fENgLlxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzSW50ZXJzZWN0aW9uVHlwZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgdHlwZS50eXBlcykge1xuICAgICAgaWYgKHRzLmlzVHlwZUxpdGVyYWxOb2RlKHQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiB0Lm1lbWJlcnMpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSB0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG0pICYmIHRzLmlzSWRlbnRpZmllcihtLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJyAmJiBtLnR5cGUgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZUV4cHJlc3Npb24gPSBuZ01vZHVsZVR5cGUgJiYgdHlwZU5vZGVUb1ZhbHVlRXhwcihuZ01vZHVsZVR5cGUpO1xuICAgICAgICAgIGlmIChuZ01vZHVsZUV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiBuZ01vZHVsZUV4cHJlc3Npb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgYSBcIkRlY2xhcmF0aW9uXCIgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2UpOiByZWYgaXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhyZWYubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KFxuICAgICAgZXhwcjogdHMuTm9kZSwgcmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBjbGFzc05hbWU6IHN0cmluZyxcbiAgICAgIGFycmF5TmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgZXhwciwgcmVzb2x2ZWRMaXN0LFxuICAgICAgICAgIGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX1gKTtcbiAgICB9XG5cbiAgICByZXNvbHZlZExpc3QuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4ge1xuICAgICAgLy8gVW53cmFwIE1vZHVsZVdpdGhQcm92aWRlcnMgZm9yIG1vZHVsZXMgdGhhdCBhcmUgbG9jYWxseSBkZWNsYXJlZCAoYW5kIHRodXMgc3RhdGljXG4gICAgICAvLyByZXNvbHV0aW9uIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTWFwICYmIGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICBlbnRyeSA9IGVudHJ5LmdldCgnbmdNb2R1bGUnKSE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBjbGFzc05hbWUsIGFycmF5TmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChlbnRyeSBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGVudHJ5Lm5vZGUsIGVudHJ5LFxuICAgICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCBlbnRyeSxcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke1xuICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVmTGlzdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc05nTW9kdWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBTY29wZURhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuICFjb21waWxhdGlvbi5kaXJlY3RpdmVzLnNvbWUoZGlyZWN0aXZlID0+IGRpcmVjdGl2ZS5yZWYubm9kZSA9PT0gbm9kZSkgJiZcbiAgICAgICFjb21waWxhdGlvbi5waXBlcy5zb21lKHBpcGUgPT4gcGlwZS5yZWYubm9kZSA9PT0gbm9kZSk7XG59XG4iXX0=