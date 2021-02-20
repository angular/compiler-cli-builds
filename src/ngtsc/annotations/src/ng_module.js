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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/ng_module", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api", "@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util", "@angular/compiler-cli/src/ngtsc/reflection", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics", "@angular/compiler-cli/src/ngtsc/annotations/src/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
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
    var api_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/api");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/ngmodule_semantics/src/util");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var diagnostics_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/diagnostics");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/metadata");
    var util_2 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
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
                    return util_1.isSymbolEqual(prevEntry.component, currEntry.component);
                });
                if (prevEntry === undefined) {
                    return { value: true };
                }
                if (!util_1.isArrayEqual(currEntry.usedDirectives, prevEntry.usedDirectives, util_1.isSymbolEqual)) {
                    return { value: true };
                }
                if (!util_1.isArrayEqual(currEntry.usedPipes, prevEntry.usedPipes, util_1.isSymbolEqual)) {
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
    }(api_1.SemanticSymbol));
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
            var decorator = util_2.findAngularDecorator(decorators, 'NgModule', this.isCore);
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
            var meta = decorator.args.length === 1 ? util_2.unwrapExpression(decorator.args[0]) :
                ts.createObjectLiteral([]);
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DECORATOR_ARG_NOT_LITERAL, meta, '@NgModule argument must be an object literal');
            }
            var ngModule = reflection_1.reflectObjectLiteral(meta);
            if (ngModule.has('jit')) {
                // The only allowed value is true, so there's no need to expand further.
                return {};
            }
            var moduleResolvers = util_2.combineResolvers([
                function (ref) { return _this._extractModuleFromModuleWithProvidersFn(ref.node); },
                util_2.forwardRefResolver,
            ]);
            var diagnostics = [];
            // Extract the module declarations, imports, and exports.
            var declarationRefs = [];
            var rawDeclarations = null;
            if (ngModule.has('declarations')) {
                rawDeclarations = ngModule.get('declarations');
                var declarationMeta = this.evaluator.evaluate(rawDeclarations, util_2.forwardRefResolver);
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
                var bootstrapMeta = this.evaluator.evaluate(expr, util_2.forwardRefResolver);
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
                return util_2.isExpressionForwardReference(ref.value, node.name, valueContext);
            };
            var containsForwardDecls = bootstrap.some(isForwardReference) ||
                declarations.some(isForwardReference) || imports.some(isForwardReference) ||
                exports.some(isForwardReference);
            var type = util_2.wrapTypeReference(this.reflector, node);
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
                new compiler_1.WrappedNodeExpr(this.annotateForClosureCompiler ? util_2.wrapFunctionExpressionsInParens(rawProviders) :
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
                deps: util_2.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
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
                        util_2.resolveProvidersRequiringFactory(rawProviders, this.reflector, this.evaluator) :
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
                return util_2.toR3Reference(valueRef, valueRef, valueContext, valueContext, this.refEmitter);
            }
            else {
                var typeRef = valueRef;
                var typeNode = this.reflector.getDtsDeclaration(typeRef.node);
                if (typeNode !== null && reflection_1.isNamedClassDeclaration(typeNode)) {
                    typeRef = new imports_1.Reference(typeNode);
                }
                return util_2.toR3Reference(valueRef, typeRef, valueContext, typeContext, this.refEmitter);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBdVQ7SUFDdlQsK0JBQWlDO0lBRWpDLDJFQUEwRztJQUMxRyxtRUFBaUY7SUFFakYsa0ZBQWdFO0lBQ2hFLG9GQUE4RTtJQUU5RSx5RUFBaUo7SUFJakosdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCwyRkFBbUY7SUFDbkYscUZBQXdEO0lBRXhELDZFQUF3UTtJQXFCeFE7O09BRUc7SUFDSDtRQUFvQywwQ0FBYztRQUFsRDtZQUFBLHFFQXdEQztZQXZEUyw4QkFBd0IsR0FFeEIsRUFBRSxDQUFDOztRQXFEYixDQUFDO1FBbkRDLDRDQUFtQixHQUFuQixVQUFvQixjQUE4QjtZQUNoRCxJQUFJLENBQUMsQ0FBQyxjQUFjLFlBQVksY0FBYyxDQUFDLEVBQUU7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCx5RkFBeUY7WUFDekYsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsdUNBQWMsR0FBZCxVQUFlLGNBQThCOztZQUMzQyxJQUFJLENBQUMsQ0FBQyxjQUFjLFlBQVksY0FBYyxDQUFDLEVBQUU7Z0JBQy9DLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCw4REFBOEQ7WUFDOUQsSUFBSSxjQUFjLENBQUMsd0JBQXdCLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQzNGLE9BQU8sSUFBSSxDQUFDO2FBQ2I7b0NBRVUsU0FBUztnQkFDbEIsSUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVM7b0JBQ3RFLE9BQU8sb0JB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UyxJQUFJLE9BQUEsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUEzQixDQUEyQixDQUFDO1lBQ3pFLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQXRCLENBQXNCLENBQUMsQ0FBQztJQUM5RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Y29tcGlsZUluamVjdG9yLCBjb21waWxlTmdNb2R1bGUsIENVU1RPTV9FTEVNRU5UU19TQ0hFTUEsIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTY2hlbWFNZXRhZGF0YSwgU3RhdGVtZW50LCBTVFJJTkdfVFlQRSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0luamVjdGFibGVDbGFzc1JlZ2lzdHJ5LCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtTZW1hbnRpY1N5bWJvbH0gZnJvbSAnLi4vLi4vbmdtb2R1bGVfc2VtYW50aWNzL3NyYy9hcGknO1xuaW1wb3J0IHtpc0FycmF5RXF1YWwsIGlzU3ltYm9sRXF1YWx9IGZyb20gJy4uLy4uL25nbW9kdWxlX3NlbWFudGljcy9zcmMvdXRpbCc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBpc05hbWVkQ2xhc3NEZWNsYXJhdGlvbiwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCB0eXBlTm9kZVRvVmFsdWVFeHByfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBTY29wZURhdGF9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7RmFjdG9yeVRyYWNrZXJ9IGZyb20gJy4uLy4uL3NoaW1zL2FwaSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yLCBnZXRQcm92aWRlckRpYWdub3N0aWNzfSBmcm9tICcuL2RpYWdub3N0aWNzJztcbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0VmFsaWRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZSwgcmVzb2x2ZVByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIHRvUjNSZWZlcmVuY2UsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMsIHdyYXBUeXBlUmVmZXJlbmNlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBtb2Q6IFIzTmdNb2R1bGVNZXRhZGF0YTtcbiAgaW5qOiBSM0luamVjdG9yTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsO1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGlkOiBFeHByZXNzaW9ufG51bGw7XG4gIGZhY3RvcnlTeW1ib2xOYW1lOiBzdHJpbmc7XG4gIHByb3ZpZGVyc1JlcXVpcmluZ0ZhY3Rvcnk6IFNldDxSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+fG51bGw7XG4gIHByb3ZpZGVyczogdHMuRXhwcmVzc2lvbnxudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlUmVzb2x1dGlvbiB7XG4gIGluamVjdG9ySW1wb3J0czogRXhwcmVzc2lvbltdO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgYW4gQW5ndWxhciBOZ01vZHVsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nTW9kdWxlU3ltYm9sIGV4dGVuZHMgU2VtYW50aWNTeW1ib2wge1xuICBwcml2YXRlIHJlbW90ZWx5U2NvcGVkQ29tcG9uZW50czpcbiAgICAgIHtjb21wb25lbnQ6IFNlbWFudGljU3ltYm9sLCB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNTeW1ib2xbXSwgdXNlZFBpcGVzOiBTZW1hbnRpY1N5bWJvbFtdfVtdID1cbiAgICAgICAgICBbXTtcblxuICBpc1B1YmxpY0FwaUFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBOZ01vZHVsZXMgZG9uJ3QgaGF2ZSBhIHB1YmxpYyBBUEkgdGhhdCBjb3VsZCBhZmZlY3QgZW1pdCBvZiBBbmd1bGFyIGRlY29yYXRlZCBjbGFzc2VzLlxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlzRW1pdEFmZmVjdGVkKHByZXZpb3VzU3ltYm9sOiBTZW1hbnRpY1N5bWJvbCk6IGJvb2xlYW4ge1xuICAgIGlmICghKHByZXZpb3VzU3ltYm9sIGluc3RhbmNlb2YgTmdNb2R1bGVTeW1ib2wpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBjb21wYXJlIG91ciByZW1vdGVseVNjb3BlZENvbXBvbmVudHMgdG8gdGhlIHByZXZpb3VzIHN5bWJvbFxuICAgIGlmIChwcmV2aW91c1N5bWJvbC5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMubGVuZ3RoICE9PSB0aGlzLnJlbW90ZWx5U2NvcGVkQ29tcG9uZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgY3VyckVudHJ5IG9mIHRoaXMucmVtb3RlbHlTY29wZWRDb21wb25lbnRzKSB7XG4gICAgICBjb25zdCBwcmV2RW50cnkgPSBwcmV2aW91c1N5bWJvbC5yZW1vdGVseVNjb3BlZENvbXBvbmVudHMuZmluZChwcmV2RW50cnkgPT4ge1xuICAgICAgICByZXR1cm4gaXNTeW1ib2xFcXVhbChwcmV2RW50cnkuY29tcG9uZW50LCBjdXJyRW50cnkuY29tcG9uZW50KTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAocHJldkVudHJ5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gTm8gcHJldmlvdXMgZW50cnkgd2FzIGZvdW5kLCB3aGljaCBtZWFucyB0aGF0IHRoaXMgY29tcG9uZW50IGJlY2FtZSByZW1vdGVseSBzY29wZWQgYW5kXG4gICAgICAgIC8vIGhlbmNlIHRoaXMgTmdNb2R1bGUgbmVlZHMgdG8gYmUgcmUtZW1pdHRlZC5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNBcnJheUVxdWFsKGN1cnJFbnRyeS51c2VkRGlyZWN0aXZlcywgcHJldkVudHJ5LnVzZWREaXJlY3RpdmVzLCBpc1N5bWJvbEVxdWFsKSkge1xuICAgICAgICAvLyBUaGUgbGlzdCBvZiB1c2VkIGRpcmVjdGl2ZXMgb3IgdGhlaXIgb3JkZXIgaGFzIGNoYW5nZWQuIFNpbmNlIHRoaXMgTmdNb2R1bGUgZW1pdHNcbiAgICAgICAgLy8gcmVmZXJlbmNlcyB0byB0aGUgbGlzdCBvZiB1c2VkIGRpcmVjdGl2ZXMsIGl0IHNob3VsZCBiZSByZS1lbWl0dGVkIHRvIHVwZGF0ZSB0aGlzIGxpc3QuXG4gICAgICAgIC8vIE5vdGU6IHRoZSBOZ01vZHVsZSBkb2VzIG5vdCBoYXZlIHRvIGJlIHJlLWVtaXR0ZWQgd2hlbiBhbnkgb2YgdGhlIGRpcmVjdGl2ZXMgaGFzIGhhZFxuICAgICAgICAvLyB0aGVpciBwdWJsaWMgQVBJIGNoYW5nZWQsIGFzIHRoZSBOZ01vZHVsZSBvbmx5IGVtaXRzIGEgcmVmZXJlbmNlIHRvIHRoZSBzeW1ib2wgYnkgaXRzXG4gICAgICAgIC8vIG5hbWUuIFRoZXJlZm9yZSwgdGVzdGluZyBmb3Igc3ltYm9sIGVxdWFsaXR5IGlzIHN1ZmZpY2llbnQuXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzQXJyYXlFcXVhbChjdXJyRW50cnkudXNlZFBpcGVzLCBwcmV2RW50cnkudXNlZFBpcGVzLCBpc1N5bWJvbEVxdWFsKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgYWRkUmVtb3RlbHlTY29wZWRDb21wb25lbnQoXG4gICAgICBjb21wb25lbnQ6IFNlbWFudGljU3ltYm9sLCB1c2VkRGlyZWN0aXZlczogU2VtYW50aWNTeW1ib2xbXSxcbiAgICAgIHVzZWRQaXBlczogU2VtYW50aWNTeW1ib2xbXSk6IHZvaWQge1xuICAgIHRoaXMucmVtb3RlbHlTY29wZWRDb21wb25lbnRzLnB1c2goe2NvbXBvbmVudCwgdXNlZERpcmVjdGl2ZXMsIHVzZWRQaXBlc30pO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgTmdNb2R1bGVBbmFseXNpcywgTmdNb2R1bGVTeW1ib2wsIE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGZhY3RvcnlUcmFja2VyOiBGYWN0b3J5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIGluamVjdGFibGVSZWdpc3RyeTogSW5qZWN0YWJsZUNsYXNzUmVnaXN0cnksIHByaXZhdGUgbG9jYWxlSWQ/OiBzdHJpbmcpIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gIHJlYWRvbmx5IG5hbWUgPSBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnTmdNb2R1bGUnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgZGVjb3JhdG9yOiBkZWNvcmF0b3IsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBSZWFkb25seTxEZWNvcmF0b3I+KTpcbiAgICAgIEFuYWx5c2lzT3V0cHV0PE5nTW9kdWxlQW5hbHlzaXM+IHtcbiAgICBjb25zdCBuYW1lID0gbm9kZS5uYW1lLnRleHQ7XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsIHx8IGRlY29yYXRvci5hcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSSVRZX1dST05HLCBEZWNvcmF0b3Iubm9kZUZvckVycm9yKGRlY29yYXRvciksXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBOZ01vZHVsZSBkZWNvcmF0b3JgKTtcbiAgICB9XG5cbiAgICAvLyBATmdNb2R1bGUgY2FuIGJlIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMuIEluIGNhc2UgaXQgaXMsIHByZXRlbmQgYXMgaWYgYSBibGFuayBvYmplY3RcbiAgICAvLyBsaXRlcmFsIHdhcyBzcGVjaWZpZWQuIFRoaXMgc2ltcGxpZmllcyB0aGUgY29kZSBiZWxvdy5cbiAgICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxID8gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKFtdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgICdATmdNb2R1bGUgYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbCcpO1xuICAgIH1cbiAgICBjb25zdCBuZ01vZHVsZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaml0JykpIHtcbiAgICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVycyA9IGNvbWJpbmVSZXNvbHZlcnMoW1xuICAgICAgcmVmID0+IHRoaXMuX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKHJlZi5ub2RlKSxcbiAgICAgIGZvcndhcmRSZWZSZXNvbHZlcixcbiAgICBdKTtcblxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIC8vIEV4dHJhY3QgdGhlIG1vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzLlxuICAgIGxldCBkZWNsYXJhdGlvblJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdkZWNsYXJhdGlvbnMnKSkge1xuICAgICAgcmF3RGVjbGFyYXRpb25zID0gbmdNb2R1bGUuZ2V0KCdkZWNsYXJhdGlvbnMnKSE7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdEZWNsYXJhdGlvbnMsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBkZWNsYXJhdGlvblJlZnMgPVxuICAgICAgICAgIHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0RlY2xhcmF0aW9ucywgZGVjbGFyYXRpb25NZXRhLCBuYW1lLCAnZGVjbGFyYXRpb25zJyk7XG5cbiAgICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgZGVjbGFyYXRpb25zIHRvIG1ha2Ugc3VyZSB0aGV5J3JlIGFsbCBhIHBhcnQgb2YgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAgICBmb3IgKGNvbnN0IHJlZiBvZiBkZWNsYXJhdGlvblJlZnMpIHtcbiAgICAgICAgaWYgKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnN0IGVycm9yTm9kZTogdHMuRXhwcmVzc2lvbiA9IHJlZi5nZXRPcmlnaW5Gb3JEaWFnbm9zdGljcyhyYXdEZWNsYXJhdGlvbnMpO1xuXG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04sIGVycm9yTm9kZSxcbiAgICAgICAgICAgICAgYENhbm5vdCBkZWNsYXJlICcke1xuICAgICAgICAgICAgICAgICAgcmVmLm5vZGUubmFtZVxuICAgICAgICAgICAgICAgICAgICAgIC50ZXh0fScgaW4gYW4gTmdNb2R1bGUgYXMgaXQncyBub3QgYSBwYXJ0IG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLmAsXG4gICAgICAgICAgICAgIFttYWtlUmVsYXRlZEluZm9ybWF0aW9uKFxuICAgICAgICAgICAgICAgICAgcmVmLm5vZGUubmFtZSwgYCcke3JlZi5ub2RlLm5hbWUudGV4dH0nIGlzIGRlY2xhcmVkIGhlcmUuYCldKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgbGV0IGltcG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0ltcG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICByYXdJbXBvcnRzID0gbmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykhO1xuICAgICAgY29uc3QgaW1wb3J0c01ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdJbXBvcnRzLCBtb2R1bGVSZXNvbHZlcnMpO1xuICAgICAgaW1wb3J0UmVmcyA9IHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0ltcG9ydHMsIGltcG9ydHNNZXRhLCBuYW1lLCAnaW1wb3J0cycpO1xuICAgIH1cbiAgICBsZXQgZXhwb3J0UmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3RXhwb3J0czogdHMuRXhwcmVzc2lvbnxudWxsID0gbnVsbDtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIHJhd0V4cG9ydHMgPSBuZ01vZHVsZS5nZXQoJ2V4cG9ydHMnKSE7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBleHBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RXhwb3J0cywgZXhwb3J0c01ldGEsIG5hbWUsICdleHBvcnRzJyk7XG4gICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQobm9kZSwgLi4uZXhwb3J0UmVmcyk7XG4gICAgfVxuICAgIGxldCBib290c3RyYXBSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2Jvb3RzdHJhcCcpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdib290c3RyYXAnKSE7XG4gICAgICBjb25zdCBib290c3RyYXBNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGJvb3RzdHJhcFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBib290c3RyYXBNZXRhLCBuYW1lLCAnYm9vdHN0cmFwJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ3NjaGVtYXMnKSkge1xuICAgICAgY29uc3QgcmF3RXhwciA9IG5nTW9kdWxlLmdldCgnc2NoZW1hcycpITtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cHIpO1xuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgdGhyb3cgY3JlYXRlVmFsdWVIYXNXcm9uZ1R5cGVFcnJvcihyYXdFeHByLCByZXN1bHQsIGBOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzY2hlbWFSZWYgb2YgcmVzdWx0KSB7XG4gICAgICAgIGlmICghKHNjaGVtYVJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICByYXdFeHByLCByZXN1bHQsICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGlkID0gc2NoZW1hUmVmLmdldElkZW50aXR5SW4oc2NoZW1hUmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICAgICAgaWYgKGlkID09PSBudWxsIHx8IHNjaGVtYVJlZi5vd25lZEJ5TW9kdWxlR3Vlc3MgIT09ICdAYW5ndWxhci9jb3JlJykge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIHJhd0V4cHIsIHJlc3VsdCwgJ05nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheSBvZiBzY2hlbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2luY2UgYGlkYCBpcyB0aGUgYHRzLklkZW50aWZlcmAgd2l0aGluIHRoZSBzY2hlbWEgcmVmJ3MgZGVjbGFyYXRpb24gZmlsZSwgaXQncyBzYWZlIHRvXG4gICAgICAgIC8vIHVzZSBgaWQudGV4dGAgaGVyZSB0byBmaWd1cmUgb3V0IHdoaWNoIHNjaGVtYSBpcyBpbiB1c2UuIEV2ZW4gaWYgdGhlIGFjdHVhbCByZWZlcmVuY2Ugd2FzXG4gICAgICAgIC8vIHJlbmFtZWQgd2hlbiB0aGUgdXNlciBpbXBvcnRlZCBpdCwgdGhlc2UgbmFtZXMgd2lsbCBtYXRjaC5cbiAgICAgICAgc3dpdGNoIChpZC50ZXh0KSB7XG4gICAgICAgICAgY2FzZSAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdOT19FUlJPUlNfU0NIRU1BJzpcbiAgICAgICAgICAgIHNjaGVtYXMucHVzaChOT19FUlJPUlNfU0NIRU1BKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBjcmVhdGVWYWx1ZUhhc1dyb25nVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgIHJhd0V4cHIsIHNjaGVtYVJlZiwgYCcke3NjaGVtYVJlZi5kZWJ1Z05hbWV9JyBpcyBub3QgYSB2YWxpZCBOZ01vZHVsZSBzY2hlbWFgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGlkOiBFeHByZXNzaW9ufG51bGwgPVxuICAgICAgICBuZ01vZHVsZS5oYXMoJ2lkJykgPyBuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaWQnKSEpIDogbnVsbDtcbiAgICBjb25zdCB2YWx1ZUNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgIGxldCB0eXBlQ29udGV4dCA9IHZhbHVlQ29udGV4dDtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmICh0eXBlTm9kZSAhPT0gbnVsbCkge1xuICAgICAgdHlwZUNvbnRleHQgPSB0eXBlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9vdHN0cmFwID1cbiAgICAgICAgYm9vdHN0cmFwUmVmcy5tYXAoYm9vdHN0cmFwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoYm9vdHN0cmFwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZGVjbGFyYXRpb25zID1cbiAgICAgICAgZGVjbGFyYXRpb25SZWZzLm1hcChkZWNsID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZGVjbCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGltcG9ydHMgPSBpbXBvcnRSZWZzLm1hcChpbXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShpbXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBleHBvcnRzID0gZXhwb3J0UmVmcy5tYXAoZXhwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZXhwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG5cbiAgICBjb25zdCBpc0ZvcndhcmRSZWZlcmVuY2UgPSAocmVmOiBSM1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShyZWYudmFsdWUsIG5vZGUubmFtZSEsIHZhbHVlQ29udGV4dCk7XG4gICAgY29uc3QgY29udGFpbnNGb3J3YXJkRGVjbHMgPSBib290c3RyYXAuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGRlY2xhcmF0aW9ucy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHwgaW1wb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZXhwb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSk7XG5cbiAgICBjb25zdCB0eXBlID0gd3JhcFR5cGVSZWZlcmVuY2UodGhpcy5yZWZsZWN0b3IsIG5vZGUpO1xuICAgIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhub2RlKSk7XG4gICAgY29uc3QgYWRqYWNlbnRUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRBZGphY2VudE5hbWVPZkNsYXNzKG5vZGUpKTtcblxuICAgIGNvbnN0IG5nTW9kdWxlRGVmOiBSM05nTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICB0eXBlLFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgYWRqYWNlbnRUeXBlLFxuICAgICAgYm9vdHN0cmFwLFxuICAgICAgZGVjbGFyYXRpb25zLFxuICAgICAgZXhwb3J0cyxcbiAgICAgIGltcG9ydHMsXG4gICAgICBjb250YWluc0ZvcndhcmREZWNscyxcbiAgICAgIGlkLFxuICAgICAgZW1pdElubGluZTogZmFsc2UsXG4gICAgICAvLyBUT0RPOiB0byBiZSBpbXBsZW1lbnRlZCBhcyBhIHBhcnQgb2YgRlctMTAwNC5cbiAgICAgIHNjaGVtYXM6IFtdLFxuICAgIH07XG5cbiAgICBjb25zdCByYXdQcm92aWRlcnMgPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID8gbmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSEgOiBudWxsO1xuICAgIGNvbnN0IHdyYXBwZXJQcm92aWRlcnMgPSByYXdQcm92aWRlcnMgIT09IG51bGwgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/IHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMocmF3UHJvdmlkZXJzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF3UHJvdmlkZXJzKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBvbmx5IGFkZCB0aGUgbW9kdWxlJ3MgaW1wb3J0cyBhcyB0aGUgaW5qZWN0b3JzJyBpbXBvcnRzLiBBbnkgZXhwb3J0ZWQgbW9kdWxlc1xuICAgIC8vIGFyZSBhZGRlZCBkdXJpbmcgYHJlc29sdmVgLCBhcyB3ZSBuZWVkIHNjb3BlIGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gZmlsdGVyIG91dCBkaXJlY3RpdmVzXG4gICAgLy8gYW5kIHBpcGVzIGZyb20gdGhlIG1vZHVsZSBleHBvcnRzLlxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykhKSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucm91dGVBbmFseXplciAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5yb3V0ZUFuYWx5emVyLmFkZChub2RlLmdldFNvdXJjZUZpbGUoKSwgbmFtZSwgcmF3SW1wb3J0cywgcmF3RXhwb3J0cywgcmF3UHJvdmlkZXJzKTtcbiAgICB9XG5cbiAgICBjb25zdCBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGEgPSB7XG4gICAgICBuYW1lLFxuICAgICAgdHlwZSxcbiAgICAgIGludGVybmFsVHlwZSxcbiAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICBwcm92aWRlcnM6IHdyYXBwZXJQcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBpbmplY3RvckltcG9ydHMsXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBhbmFseXNpczoge1xuICAgICAgICBpZCxcbiAgICAgICAgc2NoZW1hczogc2NoZW1hcyxcbiAgICAgICAgbW9kOiBuZ01vZHVsZURlZixcbiAgICAgICAgaW5qOiBuZ0luamVjdG9yRGVmLFxuICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9uUmVmcyxcbiAgICAgICAgcmF3RGVjbGFyYXRpb25zLFxuICAgICAgICBpbXBvcnRzOiBpbXBvcnRSZWZzLFxuICAgICAgICBleHBvcnRzOiBleHBvcnRSZWZzLFxuICAgICAgICBwcm92aWRlcnM6IHJhd1Byb3ZpZGVycyxcbiAgICAgICAgcHJvdmlkZXJzUmVxdWlyaW5nRmFjdG9yeTogcmF3UHJvdmlkZXJzID9cbiAgICAgICAgICAgIHJlc29sdmVQcm92aWRlcnNSZXF1aXJpbmdGYWN0b3J5KHJhd1Byb3ZpZGVycywgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZXZhbHVhdG9yKSA6XG4gICAgICAgICAgICBudWxsLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlLFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciksXG4gICAgICAgIGZhY3RvcnlTeW1ib2xOYW1lOiBub2RlLm5hbWUudGV4dCxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIHN5bWJvbChub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogTmdNb2R1bGVTeW1ib2wge1xuICAgIHJldHVybiBuZXcgTmdNb2R1bGVTeW1ib2wobm9kZSk7XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogTmdNb2R1bGVBbmFseXNpcyk6IHZvaWQge1xuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZVxuICAgIC8vIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YSh7XG4gICAgICByZWY6IG5ldyBSZWZlcmVuY2Uobm9kZSksXG4gICAgICBzY2hlbWFzOiBhbmFseXNpcy5zY2hlbWFzLFxuICAgICAgZGVjbGFyYXRpb25zOiBhbmFseXNpcy5kZWNsYXJhdGlvbnMsXG4gICAgICBpbXBvcnRzOiBhbmFseXNpcy5pbXBvcnRzLFxuICAgICAgZXhwb3J0czogYW5hbHlzaXMuZXhwb3J0cyxcbiAgICAgIHJhd0RlY2xhcmF0aW9uczogYW5hbHlzaXMucmF3RGVjbGFyYXRpb25zLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZmFjdG9yeVRyYWNrZXIudHJhY2sobm9kZS5nZXRTb3VyY2VGaWxlKCksIHtcbiAgICAgICAgbmFtZTogYW5hbHlzaXMuZmFjdG9yeVN5bWJvbE5hbWUsXG4gICAgICAgIGhhc0lkOiBhbmFseXNpcy5pZCAhPT0gbnVsbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5LnJlZ2lzdGVySW5qZWN0YWJsZShub2RlKTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PE5nTW9kdWxlQW5hbHlzaXM+KTpcbiAgICAgIFJlc29sdmVSZXN1bHQ8TmdNb2R1bGVSZXNvbHV0aW9uPiB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0U2NvcGVPZk1vZHVsZShub2RlKTtcbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICBjb25zdCBzY29wZURpYWdub3N0aWNzID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldERpYWdub3N0aWNzT2ZNb2R1bGUobm9kZSk7XG4gICAgaWYgKHNjb3BlRGlhZ25vc3RpY3MgIT09IG51bGwpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4uc2NvcGVEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgaWYgKGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnkgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyRGlhZ25vc3RpY3MgPSBnZXRQcm92aWRlckRpYWdub3N0aWNzKFxuICAgICAgICAgIGFuYWx5c2lzLnByb3ZpZGVyc1JlcXVpcmluZ0ZhY3RvcnksIGFuYWx5c2lzLnByb3ZpZGVycyEsIHRoaXMuaW5qZWN0YWJsZVJlZ2lzdHJ5KTtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4ucHJvdmlkZXJEaWFnbm9zdGljcyk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YTogTmdNb2R1bGVSZXNvbHV0aW9uID0ge1xuICAgICAgaW5qZWN0b3JJbXBvcnRzOiBbXSxcbiAgICB9O1xuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsICYmICFzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkKSB7XG4gICAgICAvLyBVc2luZyB0aGUgc2NvcGUgaW5mb3JtYXRpb24sIGV4dGVuZCB0aGUgaW5qZWN0b3IncyBpbXBvcnRzIHVzaW5nIHRoZSBtb2R1bGVzIHRoYXQgYXJlXG4gICAgICAvLyBzcGVjaWZpZWQgYXMgbW9kdWxlIGV4cG9ydHMuXG4gICAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgZXhwb3J0UmVmIG9mIGFuYWx5c2lzLmV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGlzTmdNb2R1bGUoZXhwb3J0UmVmLm5vZGUsIHNjb3BlLmNvbXBpbGF0aW9uKSkge1xuICAgICAgICAgIGRhdGEuaW5qZWN0b3JJbXBvcnRzLnB1c2godGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcblxuICAgICAgICBpZiAobWV0YWRhdGEgIT09IG51bGwgJiYgbWV0YWRhdGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiwgZGVjbC5ub2RlLFxuICAgICAgICAgICAgICBgRGlyZWN0aXZlICR7ZGVjbC5ub2RlLm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5jb21waWxhdGlvbi5pc1BvaXNvbmVkIHx8IHNjb3BlLmV4cG9ydGVkLmlzUG9pc29uZWQgfHxcbiAgICAgICAgc2NvcGUucmVleHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4ge2RhdGF9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkYXRhLFxuICAgICAgICByZWV4cG9ydHM6IHNjb3BlLnJlZXhwb3J0cyxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgY29tcGlsZUZ1bGwoXG4gICAgICBub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUmVhZG9ubHk8TmdNb2R1bGVBbmFseXNpcz4sXG4gICAgICByZXNvbHV0aW9uOiBSZWFkb25seTxOZ01vZHVsZVJlc29sdXRpb24+KTogQ29tcGlsZVJlc3VsdFtdIHtcbiAgICAvLyAgTWVyZ2UgdGhlIGluamVjdG9yIGltcG9ydHMgKHdoaWNoIGFyZSAnZXhwb3J0cycgdGhhdCB3ZXJlIGxhdGVyIGZvdW5kIHRvIGJlIE5nTW9kdWxlcylcbiAgICAvLyAgY29tcHV0ZWQgZHVyaW5nIHJlc29sdXRpb24gd2l0aCB0aGUgb25lcyBmcm9tIGFuYWx5c2lzLlxuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3Ioe1xuICAgICAgLi4uYW5hbHlzaXMuaW5qLFxuICAgICAgaW1wb3J0czogWy4uLmFuYWx5c2lzLmluai5pbXBvcnRzLCAuLi5yZXNvbHV0aW9uLmluamVjdG9ySW1wb3J0c10sXG4gICAgfSk7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUoYW5hbHlzaXMubW9kKTtcbiAgICBjb25zdCBuZ01vZHVsZVN0YXRlbWVudHMgPSBuZ01vZHVsZURlZi5hZGRpdGlvbmFsU3RhdGVtZW50cztcbiAgICBpZiAoYW5hbHlzaXMubWV0YWRhdGFTdG10ICE9PSBudWxsKSB7XG4gICAgICBuZ01vZHVsZVN0YXRlbWVudHMucHVzaChhbmFseXNpcy5tZXRhZGF0YVN0bXQpO1xuICAgIH1cbiAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgYW5hbHlzaXMuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCByZW1vdGVTY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRSZW1vdGVTY29wZShkZWNsLm5vZGUpO1xuICAgICAgaWYgKHJlbW90ZVNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZXMgPVxuICAgICAgICAgICAgcmVtb3RlU2NvcGUuZGlyZWN0aXZlcy5tYXAoZGlyZWN0aXZlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZSwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBwaXBlcyA9IHJlbW90ZVNjb3BlLnBpcGVzLm1hcChwaXBlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgZGlyZWN0aXZlQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihkaXJlY3RpdmVzKTtcbiAgICAgICAgY29uc3QgcGlwZXNBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKHBpcGVzKTtcbiAgICAgICAgY29uc3QgZGVjbEV4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChkZWNsLCBjb250ZXh0KSE7XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgcmVzOiBDb21waWxlUmVzdWx0W10gPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtW1vZCcsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ01vZHVsZURlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ01vZHVsZVN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nTW9kdWxlRGVmLnR5cGUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnybVpbmonLFxuICAgICAgICBpbml0aWFsaXplcjogbmdJbmplY3RvckRlZi5leHByZXNzaW9uLFxuICAgICAgICBzdGF0ZW1lbnRzOiBuZ0luamVjdG9yRGVmLnN0YXRlbWVudHMsXG4gICAgICAgIHR5cGU6IG5nSW5qZWN0b3JEZWYudHlwZSxcbiAgICAgIH1cbiAgICBdO1xuXG4gICAgaWYgKHRoaXMubG9jYWxlSWQpIHtcbiAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgbmFtZTogJ8m1bG9jJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5ldyBMaXRlcmFsRXhwcih0aGlzLmxvY2FsZUlkKSxcbiAgICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICAgIHR5cGU6IFNUUklOR19UWVBFXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcHJpdmF0ZSBfdG9SM1JlZmVyZW5jZShcbiAgICAgIHZhbHVlUmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgaXNOYW1lZENsYXNzRGVjbGFyYXRpb24odHlwZU5vZGUpKSB7XG4gICAgICAgIHR5cGVSZWYgPSBuZXcgUmVmZXJlbmNlKHR5cGVOb2RlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b1IzUmVmZXJlbmNlKHZhbHVlUmVmLCB0eXBlUmVmLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0LCB0aGlzLnJlZkVtaXR0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHaXZlbiBhIGBGdW5jdGlvbkRlY2xhcmF0aW9uYCwgYE1ldGhvZERlY2xhcmF0aW9uYCBvciBgRnVuY3Rpb25FeHByZXNzaW9uYCwgY2hlY2sgaWYgaXQgaXNcbiAgICogdHlwZWQgYXMgYSBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgYW5kIHJldHVybiBhbiBleHByZXNzaW9uIHJlZmVyZW5jaW5nIHRoZSBtb2R1bGUgaWYgYXZhaWxhYmxlLlxuICAgKi9cbiAgcHJpdmF0ZSBfZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4obm9kZTogdHMuRnVuY3Rpb25EZWNsYXJhdGlvbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuTWV0aG9kRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgdHlwZSA9IG5vZGUudHlwZSB8fCBudWxsO1xuICAgIHJldHVybiB0eXBlICYmXG4gICAgICAgICh0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbVR5cGVQYXJhbSh0eXBlLCBub2RlKSB8fCB0aGlzLl9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGUpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgTW9kdWxlV2l0aFByb3ZpZGVyczxUPmBcbiAgICogQHBhcmFtIHR5cGUgVGhlIHR5cGUgdG8gcmVmbGVjdCBvbi5cbiAgICogQHJldHVybnMgdGhlIGlkZW50aWZpZXIgb2YgdGhlIE5nTW9kdWxlIHR5cGUgaWYgZm91bmQsIG9yIG51bGwgb3RoZXJ3aXNlLlxuICAgKi9cbiAgcHJpdmF0ZSBfcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0oXG4gICAgICB0eXBlOiB0cy5UeXBlTm9kZSxcbiAgICAgIG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258dHMuTWV0aG9kRGVjbGFyYXRpb258dHMuRnVuY3Rpb25FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgdHlwZU5hbWUgPSB0eXBlICYmXG4gICAgICAgICAgICAodHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUgfHxcbiAgICAgICAgICAgICB0cy5pc1F1YWxpZmllZE5hbWUodHlwZS50eXBlTmFtZSkgJiYgdHlwZS50eXBlTmFtZS5yaWdodCkgfHxcbiAgICAgICAgbnVsbDtcbiAgICBpZiAodHlwZU5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIExvb2sgYXQgdGhlIHR5cGUgaXRzZWxmIHRvIHNlZSB3aGVyZSBpdCBjb21lcyBmcm9tLlxuICAgIGNvbnN0IGlkID0gdGhpcy5yZWZsZWN0b3IuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgY29uc3QgcGFyZW50ID1cbiAgICAgICAgICB0cy5pc01ldGhvZERlY2xhcmF0aW9uKG5vZGUpICYmIHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihub2RlLnBhcmVudCkgPyBub2RlLnBhcmVudCA6IG51bGw7XG4gICAgICBjb25zdCBzeW1ib2xOYW1lID0gKHBhcmVudCAmJiBwYXJlbnQubmFtZSA/IHBhcmVudC5uYW1lLmdldFRleHQoKSArICcuJyA6ICcnKSArXG4gICAgICAgICAgKG5vZGUubmFtZSA/IG5vZGUubmFtZS5nZXRUZXh0KCkgOiAnYW5vbnltb3VzJyk7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX01PRFVMRV9XSVRIX1BST1ZJREVSU19NSVNTSU5HX0dFTkVSSUMsIHR5cGUsXG4gICAgICAgICAgYCR7c3ltYm9sTmFtZX0gcmV0dXJucyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZSB3aXRob3V0IGEgZ2VuZXJpYyB0eXBlIGFyZ3VtZW50LiBgICtcbiAgICAgICAgICAgICAgYFBsZWFzZSBhZGQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQgdG8gdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgdHlwZS4gSWYgdGhpcyBgICtcbiAgICAgICAgICAgICAgYG9jY3VycmVuY2UgaXMgaW4gbGlicmFyeSBjb2RlIHlvdSBkb24ndCBjb250cm9sLCBwbGVhc2UgY29udGFjdCB0aGUgbGlicmFyeSBhdXRob3JzLmApO1xuICAgIH1cblxuICAgIGNvbnN0IGFyZyA9IHR5cGUudHlwZUFyZ3VtZW50c1swXTtcblxuICAgIHJldHVybiB0eXBlTm9kZVRvVmFsdWVFeHByKGFyZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYEF8Qnx7bmdNb2R1bGU6IFR9fENgLlxuICAgKiBAcGFyYW0gdHlwZSBUaGUgdHlwZSB0byByZWZsZWN0IG9uLlxuICAgKiBAcmV0dXJucyB0aGUgaWRlbnRpZmllciBvZiB0aGUgTmdNb2R1bGUgdHlwZSBpZiBmb3VuZCwgb3IgbnVsbCBvdGhlcndpc2UuXG4gICAqL1xuICBwcml2YXRlIF9yZWZsZWN0TW9kdWxlRnJvbUxpdGVyYWxUeXBlKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAoIXRzLmlzSW50ZXJzZWN0aW9uVHlwZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHQgb2YgdHlwZS50eXBlcykge1xuICAgICAgaWYgKHRzLmlzVHlwZUxpdGVyYWxOb2RlKHQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgbSBvZiB0Lm1lbWJlcnMpIHtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZVR5cGUgPSB0cy5pc1Byb3BlcnR5U2lnbmF0dXJlKG0pICYmIHRzLmlzSWRlbnRpZmllcihtLm5hbWUpICYmXG4gICAgICAgICAgICAgICAgICBtLm5hbWUudGV4dCA9PT0gJ25nTW9kdWxlJyAmJiBtLnR5cGUgfHxcbiAgICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZUV4cHJlc3Npb24gPSBuZ01vZHVsZVR5cGUgJiYgdHlwZU5vZGVUb1ZhbHVlRXhwcihuZ01vZHVsZVR5cGUpO1xuICAgICAgICAgIGlmIChuZ01vZHVsZUV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHJldHVybiBuZ01vZHVsZUV4cHJlc3Npb247XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gVmVyaWZ5IHRoYXQgYSBcIkRlY2xhcmF0aW9uXCIgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2UpOiByZWYgaXMgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICByZXR1cm4gdGhpcy5yZWZsZWN0b3IuaXNDbGFzcyhyZWYubm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tcHV0ZSBhIGxpc3Qgb2YgYFJlZmVyZW5jZWBzIGZyb20gYSByZXNvbHZlZCBtZXRhZGF0YSB2YWx1ZS5cbiAgICovXG4gIHByaXZhdGUgcmVzb2x2ZVR5cGVMaXN0KFxuICAgICAgZXhwcjogdHMuTm9kZSwgcmVzb2x2ZWRMaXN0OiBSZXNvbHZlZFZhbHVlLCBjbGFzc05hbWU6IHN0cmluZyxcbiAgICAgIGFycmF5TmFtZTogc3RyaW5nKTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10ge1xuICAgIGNvbnN0IHJlZkxpc3Q6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlc29sdmVkTGlzdCkpIHtcbiAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgZXhwciwgcmVzb2x2ZWRMaXN0LFxuICAgICAgICAgIGBFeHBlY3RlZCBhcnJheSB3aGVuIHJlYWRpbmcgdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX1gKTtcbiAgICB9XG5cbiAgICByZXNvbHZlZExpc3QuZm9yRWFjaCgoZW50cnksIGlkeCkgPT4ge1xuICAgICAgLy8gVW53cmFwIE1vZHVsZVdpdGhQcm92aWRlcnMgZm9yIG1vZHVsZXMgdGhhdCBhcmUgbG9jYWxseSBkZWNsYXJlZCAoYW5kIHRodXMgc3RhdGljXG4gICAgICAvLyByZXNvbHV0aW9uIHdhcyBhYmxlIHRvIGRlc2NlbmQgaW50byB0aGUgZnVuY3Rpb24gYW5kIHJldHVybiBhbiBvYmplY3QgbGl0ZXJhbCwgYSBNYXApLlxuICAgICAgaWYgKGVudHJ5IGluc3RhbmNlb2YgTWFwICYmIGVudHJ5LmhhcygnbmdNb2R1bGUnKSkge1xuICAgICAgICBlbnRyeSA9IGVudHJ5LmdldCgnbmdNb2R1bGUnKSE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBjbGFzc05hbWUsIGFycmF5TmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChlbnRyeSBpbnN0YW5jZW9mIFJlZmVyZW5jZSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICAgIGVudHJ5Lm5vZGUsIGVudHJ5LFxuICAgICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IGNyZWF0ZVZhbHVlSGFzV3JvbmdUeXBlRXJyb3IoXG4gICAgICAgICAgICBleHByLCBlbnRyeSxcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke1xuICAgICAgICAgICAgICAgIGNsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVmTGlzdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc05nTW9kdWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBTY29wZURhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuICFjb21waWxhdGlvbi5kaXJlY3RpdmVzLnNvbWUoZGlyZWN0aXZlID0+IGRpcmVjdGl2ZS5yZWYubm9kZSA9PT0gbm9kZSkgJiZcbiAgICAgICFjb21waWxhdGlvbi5waXBlcy5zb21lKHBpcGUgPT4gcGlwZS5yZWYubm9kZSA9PT0gbm9kZSk7XG59XG4iXX0=