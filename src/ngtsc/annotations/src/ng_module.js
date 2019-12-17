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
        function NgModuleDecoratorHandler(reflector, evaluator, metaReader, metaRegistry, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, factoryTracker, defaultImportRecorder, annotateForClosureCompiler, localeId) {
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
                    metadata: decorator,
                };
            }
            else {
                return undefined;
            }
        };
        NgModuleDecoratorHandler.prototype.analyze = function (node, decorator) {
            var e_1, _a, _b, e_2, _c;
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
                            var errorNode = util_1.getReferenceOriginForDiagnostics(ref, rawDeclarations);
                            diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "Cannot declare '" + ref.node.name.text + "' in an NgModule as it's not a part of the current compilation.", [{
                                    node: ref.node.name,
                                    messageText: "'" + ref.node.name.text + "' is declared here.",
                                }]));
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (declarationRefs_1_1 && !declarationRefs_1_1.done && (_a = declarationRefs_1.return)) _a.call(declarationRefs_1);
                    }
                    finally { if (e_1) throw e_1.error; }
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
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (result_1_1 && !result_1_1.done && (_c = result_1.return)) _c.call(result_1);
                    }
                    finally { if (e_2) throw e_2.error; }
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
            var providers = rawProviders !== null ?
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
                type: new compiler_1.WrappedNodeExpr(node.name),
                internalType: new compiler_1.WrappedNodeExpr(this.reflector.getInternalNameOfClass(node)),
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                providers: providers,
                imports: injectorImports,
            };
            return {
                analysis: {
                    id: id,
                    schemas: schemas,
                    mod: ngModuleDef,
                    inj: ngInjectorDef,
                    declarations: declarationRefs, rawDeclarations: rawDeclarations,
                    imports: importRefs,
                    exports: exportRefs,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore, this.annotateForClosureCompiler),
                    factorySymbolName: node.name.text,
                },
            };
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
                this.factoryTracker.track(node.getSourceFile(), analysis.factorySymbolName);
            }
        };
        NgModuleDecoratorHandler.prototype.resolve = function (node, analysis) {
            var e_3, _a, e_4, _b, e_5, _c;
            var scope = this.scopeRegistry.getScopeOfModule(node);
            var diagnostics = [];
            var scopeDiagnostics = this.scopeRegistry.getDiagnosticsOfModule(node);
            if (scopeDiagnostics !== null) {
                diagnostics.push.apply(diagnostics, tslib_1.__spread(scopeDiagnostics));
            }
            var data = {
                injectorImports: [],
            };
            try {
                for (var _d = tslib_1.__values(analysis.declarations), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var decl = _e.value;
                    if (this.metaReader.getDirectiveMetadata(decl) === null &&
                        this.metaReader.getPipeMetadata(decl) === null) {
                        // This declaration is neither a directive(or component) nor a pipe, so produce a diagnostic
                        // for it.
                        // Locate the error on the 'declarations' field of the NgModule decorator to start.
                        var errorNode = util_1.getReferenceOriginForDiagnostics(decl, analysis.rawDeclarations);
                        diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "The class '" + decl.node.name.text + "' is listed in the declarations of the NgModule '" + node.name.text + "', but is not a directive, a component, or a pipe.\n\nEither remove it from the NgModule's declarations, or add an appropriate Angular decorator.", [{ node: decl.node.name, messageText: "'" + decl.node.name.text + "' is declared here." }]));
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_3) throw e_3.error; }
            }
            if (scope !== null) {
                // Using the scope information, extend the injector's imports using the modules that are
                // specified as module exports.
                var context = typescript_1.getSourceFile(node);
                try {
                    for (var _f = tslib_1.__values(analysis.exports), _g = _f.next(); !_g.done; _g = _f.next()) {
                        var exportRef = _g.value;
                        if (isNgModule(exportRef.node, scope.compilation)) {
                            data.injectorImports.push(this.refEmitter.emit(exportRef, context));
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                try {
                    for (var _h = tslib_1.__values(analysis.declarations), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var decl = _j.value;
                        var metadata = this.metaReader.getDirectiveMetadata(decl);
                        if (metadata !== null && metadata.selector === null) {
                            throw new diagnostics_1.FatalDiagnosticError(diagnostics_1.ErrorCode.DIRECTIVE_MISSING_SELECTOR, decl.node, "Directive " + decl.node.name.text + " has no selector, please add it!");
                        }
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
            if (diagnostics.length > 0) {
                return { diagnostics: diagnostics };
            }
            if (scope === null || scope.reexports === null) {
                return { data: data };
            }
            else {
                return {
                    data: data,
                    reexports: scope.reexports,
                };
            }
        };
        NgModuleDecoratorHandler.prototype.compile = function (node, analysis, resolution) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF1VDtJQUN2VCwrQkFBaUM7SUFFakMsMkVBQWtGO0lBQ2xGLG1FQUFpRjtJQUdqRix5RUFBd0g7SUFJeEgsdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCxxRkFBd0Q7SUFFeEQsNkVBQXFQO0lBaUJyUDs7OztPQUlHO0lBQ0g7UUFFRSxrQ0FDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFVBQTBCLEVBQVUsWUFBOEIsRUFDbEUsYUFBdUMsRUFDdkMsa0JBQXNDLEVBQVUsTUFBZSxFQUMvRCxhQUF5QyxFQUFVLFVBQTRCLEVBQy9FLGNBQW1DLEVBQ25DLHFCQUE0QyxFQUM1QywwQkFBbUMsRUFBVSxRQUFpQjtZQVA5RCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBQ2xFLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtZQUN2Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUMvRCxrQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUMvRSxtQkFBYyxHQUFkLGNBQWMsQ0FBcUI7WUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUM1QywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQVM7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFTO1lBRWpFLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7WUFD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QUMsR0FBRyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQXRCLENBQXNCLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBRUQsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRO1FBQ3RDLE9BQU8sR0FBRyxZQUFZLG1CQUFTO1lBQzNCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDckUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7Q1VTVE9NX0VMRU1FTlRTX1NDSEVNQSwgRXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBJbnZva2VGdW5jdGlvbkV4cHIsIExpdGVyYWxBcnJheUV4cHIsIExpdGVyYWxFeHByLCBOT19FUlJPUlNfU0NIRU1BLCBSM0lkZW50aWZpZXJzLCBSM0luamVjdG9yTWV0YWRhdGEsIFIzTmdNb2R1bGVNZXRhZGF0YSwgUjNSZWZlcmVuY2UsIFNUUklOR19UWVBFLCBTY2hlbWFNZXRhZGF0YSwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVJbmplY3RvciwgY29tcGlsZU5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIEZhdGFsRGlhZ25vc3RpY0Vycm9yLCBtYWtlRGlhZ25vc3RpY30gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtEZWZhdWx0SW1wb3J0UmVjb3JkZXIsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge01ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3IsIFJlc29sdmVkVmFsdWV9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdCwgcmVmbGVjdE9iamVjdExpdGVyYWwsIHR5cGVOb2RlVG9WYWx1ZUV4cHJ9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtOZ01vZHVsZVJvdXRlQW5hbHl6ZXJ9IGZyb20gJy4uLy4uL3JvdXRpbmcnO1xuaW1wb3J0IHtMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksIFNjb3BlRGF0YX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtGYWN0b3J5VHJhY2tlcn0gZnJvbSAnLi4vLi4vc2hpbXMnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZSwgUmVzb2x2ZVJlc3VsdH0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Z2VuZXJhdGVTZXRDbGFzc01ldGFkYXRhQ2FsbH0gZnJvbSAnLi9tZXRhZGF0YSc7XG5pbXBvcnQge1JlZmVyZW5jZXNSZWdpc3RyeX0gZnJvbSAnLi9yZWZlcmVuY2VzX3JlZ2lzdHJ5JztcbmltcG9ydCB7Y29tYmluZVJlc29sdmVycywgZmluZEFuZ3VsYXJEZWNvcmF0b3IsIGZvcndhcmRSZWZSZXNvbHZlciwgZ2V0UmVmZXJlbmNlT3JpZ2luRm9yRGlhZ25vc3RpY3MsIGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMsIGlzRXhwcmVzc2lvbkZvcndhcmRSZWZlcmVuY2UsIHRvUjNSZWZlcmVuY2UsIHVud3JhcEV4cHJlc3Npb24sIHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnN9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmdNb2R1bGVBbmFseXNpcyB7XG4gIG1vZDogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBpbmo6IFIzSW5qZWN0b3JNZXRhZGF0YTtcbiAgbWV0YWRhdGFTdG10OiBTdGF0ZW1lbnR8bnVsbDtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGw7XG4gIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaWQ6IEV4cHJlc3Npb258bnVsbDtcbiAgZmFjdG9yeVN5bWJvbE5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZVJlc29sdXRpb24geyBpbmplY3RvckltcG9ydHM6IEV4cHJlc3Npb25bXTsgfVxuXG4vKipcbiAqIENvbXBpbGVzIEBOZ01vZHVsZSBhbm5vdGF0aW9ucyB0byBuZ01vZHVsZURlZiBmaWVsZHMuXG4gKlxuICogVE9ETyhhbHhodWIpOiBoYW5kbGUgaW5qZWN0b3Igc2lkZSBvZiB0aGluZ3MgYXMgd2VsbC5cbiAqL1xuZXhwb3J0IGNsYXNzIE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxEZWNvcmF0b3IsIE5nTW9kdWxlQW5hbHlzaXMsIE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIG1ldGFSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIG1ldGFSZWdpc3RyeTogTWV0YWRhdGFSZWdpc3RyeSxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSByZWZlcmVuY2VzUmVnaXN0cnk6IFJlZmVyZW5jZXNSZWdpc3RyeSwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcml2YXRlIHJvdXRlQW5hbHl6ZXI6IE5nTW9kdWxlUm91dGVBbmFseXplcnxudWxsLCBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsXG4gICAgICBwcml2YXRlIGZhY3RvcnlUcmFja2VyOiBGYWN0b3J5VHJhY2tlcnxudWxsLFxuICAgICAgcHJpdmF0ZSBkZWZhdWx0SW1wb3J0UmVjb3JkZXI6IERlZmF1bHRJbXBvcnRSZWNvcmRlcixcbiAgICAgIHByaXZhdGUgYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXI6IGJvb2xlYW4sIHByaXZhdGUgbG9jYWxlSWQ/OiBzdHJpbmcpIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG4gIHJlYWRvbmx5IG5hbWUgPSBOZ01vZHVsZURlY29yYXRvckhhbmRsZXIubmFtZTtcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IERldGVjdFJlc3VsdDxEZWNvcmF0b3I+fHVuZGVmaW5lZCB7XG4gICAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjb25zdCBkZWNvcmF0b3IgPSBmaW5kQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3JzLCAnTmdNb2R1bGUnLCB0aGlzLmlzQ29yZSk7XG4gICAgaWYgKGRlY29yYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0cmlnZ2VyOiBkZWNvcmF0b3Iubm9kZSxcbiAgICAgICAgbWV0YWRhdGE6IGRlY29yYXRvcixcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgYW5hbHl6ZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IFJlYWRvbmx5PERlY29yYXRvcj4pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8TmdNb2R1bGVBbmFseXNpcz4ge1xuICAgIGNvbnN0IG5hbWUgPSBub2RlLm5hbWUudGV4dDtcbiAgICBpZiAoZGVjb3JhdG9yLmFyZ3MgPT09IG51bGwgfHwgZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJJVFlfV1JPTkcsIERlY29yYXRvci5ub2RlRm9yRXJyb3IoZGVjb3JhdG9yKSxcbiAgICAgICAgICBgSW5jb3JyZWN0IG51bWJlciBvZiBhcmd1bWVudHMgdG8gQE5nTW9kdWxlIGRlY29yYXRvcmApO1xuICAgIH1cblxuICAgIC8vIEBOZ01vZHVsZSBjYW4gYmUgaW52b2tlZCB3aXRob3V0IGFyZ3VtZW50cy4gSW4gY2FzZSBpdCBpcywgcHJldGVuZCBhcyBpZiBhIGJsYW5rIG9iamVjdFxuICAgIC8vIGxpdGVyYWwgd2FzIHNwZWNpZmllZC4gVGhpcyBzaW1wbGlmaWVzIHRoZSBjb2RlIGJlbG93LlxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJncy5sZW5ndGggPT09IDEgPyB1bndyYXBFeHByZXNzaW9uKGRlY29yYXRvci5hcmdzWzBdKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmNyZWF0ZU9iamVjdExpdGVyYWwoW10pO1xuXG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUkdfTk9UX0xJVEVSQUwsIG1ldGEsXG4gICAgICAgICAgJ0BOZ01vZHVsZSBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCBsaXRlcmFsJyk7XG4gICAgfVxuICAgIGNvbnN0IG5nTW9kdWxlID0gcmVmbGVjdE9iamVjdExpdGVyYWwobWV0YSk7XG5cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdqaXQnKSkge1xuICAgICAgLy8gVGhlIG9ubHkgYWxsb3dlZCB2YWx1ZSBpcyB0cnVlLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZXhwYW5kIGZ1cnRoZXIuXG4gICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlUmVzb2x2ZXJzID0gY29tYmluZVJlc29sdmVycyhbXG4gICAgICByZWYgPT4gdGhpcy5fZXh0cmFjdE1vZHVsZUZyb21Nb2R1bGVXaXRoUHJvdmlkZXJzRm4ocmVmLm5vZGUpLFxuICAgICAgZm9yd2FyZFJlZlJlc29sdmVyLFxuICAgIF0pO1xuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gRXh0cmFjdCB0aGUgbW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMuXG4gICAgbGV0IGRlY2xhcmF0aW9uUmVmczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBsZXQgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2RlY2xhcmF0aW9ucycpKSB7XG4gICAgICByYXdEZWNsYXJhdGlvbnMgPSBuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICE7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdEZWNsYXJhdGlvbnMsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBkZWNsYXJhdGlvblJlZnMgPVxuICAgICAgICAgIHRoaXMucmVzb2x2ZVR5cGVMaXN0KHJhd0RlY2xhcmF0aW9ucywgZGVjbGFyYXRpb25NZXRhLCBuYW1lLCAnZGVjbGFyYXRpb25zJyk7XG5cbiAgICAgIC8vIExvb2sgdGhyb3VnaCB0aGUgZGVjbGFyYXRpb25zIHRvIG1ha2Ugc3VyZSB0aGV5J3JlIGFsbCBhIHBhcnQgb2YgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAgICBmb3IgKGNvbnN0IHJlZiBvZiBkZWNsYXJhdGlvblJlZnMpIHtcbiAgICAgICAgaWYgKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIGNvbnN0IGVycm9yTm9kZTogdHMuRXhwcmVzc2lvbiA9IGdldFJlZmVyZW5jZU9yaWdpbkZvckRpYWdub3N0aWNzKHJlZiwgcmF3RGVjbGFyYXRpb25zKTtcblxuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICAgIGBDYW5ub3QgZGVjbGFyZSAnJHtyZWYubm9kZS5uYW1lLnRleHR9JyBpbiBhbiBOZ01vZHVsZSBhcyBpdCdzIG5vdCBhIHBhcnQgb2YgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uYCxcbiAgICAgICAgICAgICAgW3tcbiAgICAgICAgICAgICAgICBub2RlOiByZWYubm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VUZXh0OiBgJyR7cmVmLm5vZGUubmFtZS50ZXh0fScgaXMgZGVjbGFyZWQgaGVyZS5gLFxuICAgICAgICAgICAgICB9XSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICE7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0ltcG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBpbXBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3SW1wb3J0cywgaW1wb3J0c01ldGEsIG5hbWUsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdFeHBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgcmF3RXhwb3J0cyA9IG5nTW9kdWxlLmdldCgnZXhwb3J0cycpICE7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBleHBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RXhwb3J0cywgZXhwb3J0c01ldGEsIG5hbWUsICdleHBvcnRzJyk7XG4gICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQobm9kZSwgLi4uZXhwb3J0UmVmcyk7XG4gICAgfVxuICAgIGxldCBib290c3RyYXBSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2Jvb3RzdHJhcCcpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdib290c3RyYXAnKSAhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIGNvbnN0IHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdzY2hlbWFzJykpIHtcbiAgICAgIGNvbnN0IHJhd0V4cHIgPSBuZ01vZHVsZS5nZXQoJ3NjaGVtYXMnKSAhO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RXhwcik7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHJhd0V4cHIsIGBOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXlgKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBzY2hlbWFSZWYgb2YgcmVzdWx0KSB7XG4gICAgICAgIGlmICghKHNjaGVtYVJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwcixcbiAgICAgICAgICAgICAgJ05nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheSBvZiBzY2hlbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaWQgPSBzY2hlbWFSZWYuZ2V0SWRlbnRpdHlJbihzY2hlbWFSZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgICBpZiAoaWQgPT09IG51bGwgfHwgc2NoZW1hUmVmLm93bmVkQnlNb2R1bGVHdWVzcyAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIHJhd0V4cHIsXG4gICAgICAgICAgICAgICdOZ01vZHVsZS5zY2hlbWFzIG11c3QgYmUgYW4gYXJyYXkgb2Ygc2NoZW1hcycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNpbmNlIGBpZGAgaXMgdGhlIGB0cy5JZGVudGlmZXJgIHdpdGhpbiB0aGUgc2NoZW1hIHJlZidzIGRlY2xhcmF0aW9uIGZpbGUsIGl0J3Mgc2FmZSB0b1xuICAgICAgICAvLyB1c2UgYGlkLnRleHRgIGhlcmUgdG8gZmlndXJlIG91dCB3aGljaCBzY2hlbWEgaXMgaW4gdXNlLiBFdmVuIGlmIHRoZSBhY3R1YWwgcmVmZXJlbmNlIHdhc1xuICAgICAgICAvLyByZW5hbWVkIHdoZW4gdGhlIHVzZXIgaW1wb3J0ZWQgaXQsIHRoZXNlIG5hbWVzIHdpbGwgbWF0Y2guXG4gICAgICAgIHN3aXRjaCAoaWQudGV4dCkge1xuICAgICAgICAgIGNhc2UgJ0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEnOlxuICAgICAgICAgICAgc2NoZW1hcy5wdXNoKENVU1RPTV9FTEVNRU5UU19TQ0hFTUEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnTk9fRVJST1JTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goTk9fRVJST1JTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwcixcbiAgICAgICAgICAgICAgICBgJyR7c2NoZW1hUmVmLmRlYnVnTmFtZX0nIGlzIG5vdCBhIHZhbGlkIE5nTW9kdWxlIHNjaGVtYWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgaWQ6IEV4cHJlc3Npb258bnVsbCA9XG4gICAgICAgIG5nTW9kdWxlLmhhcygnaWQnKSA/IG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpZCcpICEpIDogbnVsbDtcbiAgICBjb25zdCB2YWx1ZUNvbnRleHQgPSBub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAgIGxldCB0eXBlQ29udGV4dCA9IHZhbHVlQ29udGV4dDtcbiAgICBjb25zdCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKG5vZGUpO1xuICAgIGlmICh0eXBlTm9kZSAhPT0gbnVsbCkge1xuICAgICAgdHlwZUNvbnRleHQgPSB0eXBlTm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9vdHN0cmFwID1cbiAgICAgICAgYm9vdHN0cmFwUmVmcy5tYXAoYm9vdHN0cmFwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoYm9vdHN0cmFwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgZGVjbGFyYXRpb25zID1cbiAgICAgICAgZGVjbGFyYXRpb25SZWZzLm1hcChkZWNsID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZGVjbCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGltcG9ydHMgPSBpbXBvcnRSZWZzLm1hcChpbXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShpbXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBleHBvcnRzID0gZXhwb3J0UmVmcy5tYXAoZXhwID0+IHRoaXMuX3RvUjNSZWZlcmVuY2UoZXhwLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG5cbiAgICBjb25zdCBpc0ZvcndhcmRSZWZlcmVuY2UgPSAocmVmOiBSM1JlZmVyZW5jZSkgPT5cbiAgICAgICAgaXNFeHByZXNzaW9uRm9yd2FyZFJlZmVyZW5jZShyZWYudmFsdWUsIG5vZGUubmFtZSAhLCB2YWx1ZUNvbnRleHQpO1xuICAgIGNvbnN0IGNvbnRhaW5zRm9yd2FyZERlY2xzID0gYm9vdHN0cmFwLnNvbWUoaXNGb3J3YXJkUmVmZXJlbmNlKSB8fFxuICAgICAgICBkZWNsYXJhdGlvbnMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8IGltcG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGV4cG9ydHMuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpO1xuXG4gICAgY29uc3QgbmdNb2R1bGVEZWY6IFIzTmdNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lKSxcbiAgICAgIGludGVybmFsVHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKG5vZGUpKSxcbiAgICAgIGFkamFjZW50VHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRBZGphY2VudE5hbWVPZkNsYXNzKG5vZGUpKSxcbiAgICAgIGJvb3RzdHJhcCxcbiAgICAgIGRlY2xhcmF0aW9ucyxcbiAgICAgIGV4cG9ydHMsXG4gICAgICBpbXBvcnRzLFxuICAgICAgY29udGFpbnNGb3J3YXJkRGVjbHMsXG4gICAgICBpZCxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmF3UHJvdmlkZXJzID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/IG5nTW9kdWxlLmdldCgncHJvdmlkZXJzJykgISA6IG51bGw7XG4gICAgY29uc3QgcHJvdmlkZXJzID0gcmF3UHJvdmlkZXJzICE9PSBudWxsID9cbiAgICAgICAgbmV3IFdyYXBwZWROb2RlRXhwcihcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIgPyB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zKHJhd1Byb3ZpZGVycykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhd1Byb3ZpZGVycykgOlxuICAgICAgICBudWxsO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgb25seSBhZGQgdGhlIG1vZHVsZSdzIGltcG9ydHMgYXMgdGhlIGluamVjdG9ycycgaW1wb3J0cy4gQW55IGV4cG9ydGVkIG1vZHVsZXNcbiAgICAvLyBhcmUgYWRkZWQgZHVyaW5nIGByZXNvbHZlYCwgYXMgd2UgbmVlZCBzY29wZSBpbmZvcm1hdGlvbiB0byBiZSBhYmxlIHRvIGZpbHRlciBvdXQgZGlyZWN0aXZlc1xuICAgIC8vIGFuZCBwaXBlcyBmcm9tIHRoZSBtb2R1bGUgZXhwb3J0cy5cbiAgICBjb25zdCBpbmplY3RvckltcG9ydHM6IFdyYXBwZWROb2RlRXhwcjx0cy5FeHByZXNzaW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICBpbmplY3RvckltcG9ydHMucHVzaChuZXcgV3JhcHBlZE5vZGVFeHByKG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICEpKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yb3V0ZUFuYWx5emVyICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnJvdXRlQW5hbHl6ZXIuYWRkKG5vZGUuZ2V0U291cmNlRmlsZSgpLCBuYW1lLCByYXdJbXBvcnRzLCByYXdFeHBvcnRzLCByYXdQcm92aWRlcnMpO1xuICAgIH1cblxuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWY6IFIzSW5qZWN0b3JNZXRhZGF0YSA9IHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlOiBuZXcgV3JhcHBlZE5vZGVFeHByKG5vZGUubmFtZSksXG4gICAgICBpbnRlcm5hbFR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhub2RlKSksXG4gICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgcHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogaW5qZWN0b3JJbXBvcnRzLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaWQsXG4gICAgICAgIHNjaGVtYXM6IHNjaGVtYXMsXG4gICAgICAgIG1vZDogbmdNb2R1bGVEZWYsXG4gICAgICAgIGluajogbmdJbmplY3RvckRlZixcbiAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsIHJhd0RlY2xhcmF0aW9ucyxcbiAgICAgICAgaW1wb3J0czogaW1wb3J0UmVmcyxcbiAgICAgICAgZXhwb3J0czogZXhwb3J0UmVmcyxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogTmdNb2R1bGVBbmFseXNpcyk6IHZvaWQge1xuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZVxuICAgIC8vIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YSh7XG4gICAgICByZWY6IG5ldyBSZWZlcmVuY2Uobm9kZSksXG4gICAgICBzY2hlbWFzOiBhbmFseXNpcy5zY2hlbWFzLFxuICAgICAgZGVjbGFyYXRpb25zOiBhbmFseXNpcy5kZWNsYXJhdGlvbnMsXG4gICAgICBpbXBvcnRzOiBhbmFseXNpcy5pbXBvcnRzLFxuICAgICAgZXhwb3J0czogYW5hbHlzaXMuZXhwb3J0cyxcbiAgICAgIHJhd0RlY2xhcmF0aW9uczogYW5hbHlzaXMucmF3RGVjbGFyYXRpb25zLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZmFjdG9yeVRyYWNrZXIudHJhY2sobm9kZS5nZXRTb3VyY2VGaWxlKCksIGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lKTtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPik6XG4gICAgICBSZXNvbHZlUmVzdWx0PE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUobm9kZSk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGVEaWFnbm9zdGljcyA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREaWFnbm9zdGljc09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChzY29wZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNjb3BlRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IE5nTW9kdWxlUmVzb2x1dGlvbiA9IHtcbiAgICAgIGluamVjdG9ySW1wb3J0czogW10sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCkgPT09IG51bGwgJiZcbiAgICAgICAgICB0aGlzLm1ldGFSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZGVjbGFyYXRpb24gaXMgbmVpdGhlciBhIGRpcmVjdGl2ZShvciBjb21wb25lbnQpIG5vciBhIHBpcGUsIHNvIHByb2R1Y2UgYSBkaWFnbm9zdGljXG4gICAgICAgIC8vIGZvciBpdC5cblxuICAgICAgICAvLyBMb2NhdGUgdGhlIGVycm9yIG9uIHRoZSAnZGVjbGFyYXRpb25zJyBmaWVsZCBvZiB0aGUgTmdNb2R1bGUgZGVjb3JhdG9yIHRvIHN0YXJ0LlxuICAgICAgICBjb25zdCBlcnJvck5vZGU6IHRzLkV4cHJlc3Npb24gPVxuICAgICAgICAgICAgZ2V0UmVmZXJlbmNlT3JpZ2luRm9yRGlhZ25vc3RpY3MoZGVjbCwgYW5hbHlzaXMucmF3RGVjbGFyYXRpb25zICEpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04sIGVycm9yTm9kZSxcbiAgICAgICAgICAgIGBUaGUgY2xhc3MgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGxpc3RlZCBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBOZ01vZHVsZSAnJHtub2RlLm5hbWUudGV4dH0nLCBidXQgaXMgbm90IGEgZGlyZWN0aXZlLCBhIGNvbXBvbmVudCwgb3IgYSBwaXBlLlxuXG5FaXRoZXIgcmVtb3ZlIGl0IGZyb20gdGhlIE5nTW9kdWxlJ3MgZGVjbGFyYXRpb25zLCBvciBhZGQgYW4gYXBwcm9wcmlhdGUgQW5ndWxhciBkZWNvcmF0b3IuYCxcbiAgICAgICAgICAgIFt7bm9kZTogZGVjbC5ub2RlLm5hbWUsIG1lc3NhZ2VUZXh0OiBgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGRlY2xhcmVkIGhlcmUuYH1dKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBVc2luZyB0aGUgc2NvcGUgaW5mb3JtYXRpb24sIGV4dGVuZCB0aGUgaW5qZWN0b3IncyBpbXBvcnRzIHVzaW5nIHRoZSBtb2R1bGVzIHRoYXQgYXJlXG4gICAgICAvLyBzcGVjaWZpZWQgYXMgbW9kdWxlIGV4cG9ydHMuXG4gICAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgZXhwb3J0UmVmIG9mIGFuYWx5c2lzLmV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGlzTmdNb2R1bGUoZXhwb3J0UmVmLm5vZGUsIHNjb3BlLmNvbXBpbGF0aW9uKSkge1xuICAgICAgICAgIGRhdGEuaW5qZWN0b3JJbXBvcnRzLnB1c2godGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcblxuICAgICAgICBpZiAobWV0YWRhdGEgIT09IG51bGwgJiYgbWV0YWRhdGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiwgZGVjbC5ub2RlLFxuICAgICAgICAgICAgICBgRGlyZWN0aXZlICR7ZGVjbC5ub2RlLm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5yZWV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGF0YX07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRhdGEsXG4gICAgICAgIHJlZXhwb3J0czogc2NvcGUucmVleHBvcnRzLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBjb21waWxlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PE5nTW9kdWxlQW5hbHlzaXM+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8TmdNb2R1bGVSZXNvbHV0aW9uPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgLy8gIE1lcmdlIHRoZSBpbmplY3RvciBpbXBvcnRzICh3aGljaCBhcmUgJ2V4cG9ydHMnIHRoYXQgd2VyZSBsYXRlciBmb3VuZCB0byBiZSBOZ01vZHVsZXMpXG4gICAgLy8gIGNvbXB1dGVkIGR1cmluZyByZXNvbHV0aW9uIHdpdGggdGhlIG9uZXMgZnJvbSBhbmFseXNpcy5cbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKHtcbiAgICAgIC4uLmFuYWx5c2lzLmluaixcbiAgICAgIGltcG9ydHM6IFsuLi5hbmFseXNpcy5pbmouaW1wb3J0cywgLi4ucmVzb2x1dGlvbi5pbmplY3RvckltcG9ydHNdLFxuICAgIH0pO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm1vZCk7XG4gICAgY29uc3QgbmdNb2R1bGVTdGF0ZW1lbnRzID0gbmdNb2R1bGVEZWYuYWRkaXRpb25hbFN0YXRlbWVudHM7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgaWYgKHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRSZXF1aXJlc1JlbW90ZVNjb3BlKGRlY2wubm9kZSkpIHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0U2NvcGVPZk1vZHVsZSh0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHlwZW9mIG5vZGUpO1xuICAgICAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcy5tYXAoXG4gICAgICAgICAgICBkaXJlY3RpdmUgPT4gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGlyZWN0aXZlLnJlZiwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBwaXBlcyA9IHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzLm1hcChwaXBlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUucmVmLCBjb250ZXh0KSk7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUFycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIoZGlyZWN0aXZlcyk7XG4gICAgICAgIGNvbnN0IHBpcGVzQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihwaXBlcyk7XG4gICAgICAgIGNvbnN0IGRlY2xFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGVjbCwgY29udGV4dCkgITtcbiAgICAgICAgY29uc3Qgc2V0Q29tcG9uZW50U2NvcGUgPSBuZXcgRXh0ZXJuYWxFeHByKFIzSWRlbnRpZmllcnMuc2V0Q29tcG9uZW50U2NvcGUpO1xuICAgICAgICBjb25zdCBjYWxsRXhwciA9XG4gICAgICAgICAgICBuZXcgSW52b2tlRnVuY3Rpb25FeHByKHNldENvbXBvbmVudFNjb3BlLCBbZGVjbEV4cHIsIGRpcmVjdGl2ZUFycmF5LCBwaXBlc0FycmF5XSk7XG5cbiAgICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2goY2FsbEV4cHIudG9TdG10KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1bW9kJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nTW9kdWxlRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nTW9kdWxlU3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdNb2R1bGVEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtWluaicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nSW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdJbmplY3RvckRlZi50eXBlLFxuICAgICAgfVxuICAgIF07XG5cbiAgICBpZiAodGhpcy5sb2NhbGVJZCkge1xuICAgICAgcmVzLnB1c2goe1xuICAgICAgICBuYW1lOiAnybVsb2MnLFxuICAgICAgICBpbml0aWFsaXplcjogbmV3IExpdGVyYWxFeHByKHRoaXMubG9jYWxlSWQpLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogU1RSSU5HX1RZUEVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIF90b1IzUmVmZXJlbmNlKFxuICAgICAgdmFsdWVSZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSwgbm9kZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKFxuICAgICAgdHlwZTogdHMuVHlwZU5vZGUsXG4gICAgICBub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRXhhbWluZSB0aGUgdHlwZSBvZiB0aGUgZnVuY3Rpb24gdG8gc2VlIGlmIGl0J3MgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHJlZmVyZW5jZS5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVOYW1lID0gdHlwZSAmJiAodHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lLnJpZ2h0KSB8fFxuICAgICAgICBudWxsO1xuICAgIGlmICh0eXBlTmFtZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTG9vayBhdCB0aGUgdHlwZSBpdHNlbGYgdG8gc2VlIHdoZXJlIGl0IGNvbWVzIGZyb20uXG4gICAgY29uc3QgaWQgPSB0aGlzLnJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZU5hbWUpO1xuXG4gICAgLy8gSWYgaXQncyBub3QgbmFtZWQgTW9kdWxlV2l0aFByb3ZpZGVycywgYmFpbC5cbiAgICBpZiAoaWQgPT09IG51bGwgfHwgaWQubmFtZSAhPT0gJ01vZHVsZVdpdGhQcm92aWRlcnMnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBmcm9tIEBhbmd1bGFyL2NvcmUsIGJhaWwuXG4gICAgaWYgKCF0aGlzLmlzQ29yZSAmJiBpZC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3Mgbm8gdHlwZSBwYXJhbWV0ZXIgc3BlY2lmaWVkLCBiYWlsLlxuICAgIGlmICh0eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCB0eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPVxuICAgICAgICAgIHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUucGFyZW50KSA/IG5vZGUucGFyZW50IDogbnVsbDtcbiAgICAgIGNvbnN0IHN5bWJvbE5hbWUgPSAocGFyZW50ICYmIHBhcmVudC5uYW1lID8gcGFyZW50Lm5hbWUuZ2V0VGV4dCgpICsgJy4nIDogJycpICtcbiAgICAgICAgICAobm9kZS5uYW1lID8gbm9kZS5uYW1lLmdldFRleHQoKSA6ICdhbm9ueW1vdXMnKTtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfTU9EVUxFX1dJVEhfUFJPVklERVJTX01JU1NJTkdfR0VORVJJQywgdHlwZSxcbiAgICAgICAgICBgJHtzeW1ib2xOYW1lfSByZXR1cm5zIGEgTW9kdWxlV2l0aFByb3ZpZGVycyB0eXBlIHdpdGhvdXQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQuIGAgK1xuICAgICAgICAgICAgICBgUGxlYXNlIGFkZCBhIGdlbmVyaWMgdHlwZSBhcmd1bWVudCB0byB0aGUgTW9kdWxlV2l0aFByb3ZpZGVycyB0eXBlLiBJZiB0aGlzIGAgK1xuICAgICAgICAgICAgICBgb2NjdXJyZW5jZSBpcyBpbiBsaWJyYXJ5IGNvZGUgeW91IGRvbid0IGNvbnRyb2wsIHBsZWFzZSBjb250YWN0IHRoZSBsaWJyYXJ5IGF1dGhvcnMuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIHR5cGVOb2RlVG9WYWx1ZUV4cHIoYXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgQXxCfHtuZ01vZHVsZTogVH18Q2AuXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdHMuaXNJbnRlcnNlY3Rpb25UeXBlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdCBvZiB0eXBlLnR5cGVzKSB7XG4gICAgICBpZiAodHMuaXNUeXBlTGl0ZXJhbE5vZGUodCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBtIG9mIHQubWVtYmVycykge1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlVHlwZSA9IHRzLmlzUHJvcGVydHlTaWduYXR1cmUobSkgJiYgdHMuaXNJZGVudGlmaWVyKG0ubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgIG0ubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnICYmIG0udHlwZSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlRXhwcmVzc2lvbiA9IG5nTW9kdWxlVHlwZSAmJiB0eXBlTm9kZVRvVmFsdWVFeHByKG5nTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKG5nTW9kdWxlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5nTW9kdWxlRXhwcmVzc2lvbjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCBhIGB0cy5EZWNsYXJhdGlvbmAgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTpcbiAgICAgIHJlZiBpcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKHJlZi5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlVHlwZUxpc3QoXG4gICAgICBleHByOiB0cy5Ob2RlLCByZXNvbHZlZExpc3Q6IFJlc29sdmVkVmFsdWUsIGNsYXNzTmFtZTogc3RyaW5nLFxuICAgICAgYXJyYXlOYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAgIC8vIFVud3JhcCBNb2R1bGVXaXRoUHJvdmlkZXJzIGZvciBtb2R1bGVzIHRoYXQgYXJlIGxvY2FsbHkgZGVjbGFyZWQgKGFuZCB0aHVzIHN0YXRpY1xuICAgICAgLy8gcmVzb2x1dGlvbiB3YXMgYWJsZSB0byBkZXNjZW5kIGludG8gdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gYW4gb2JqZWN0IGxpdGVyYWwsIGEgTWFwKS5cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgZW50cnkgPSBlbnRyeS5nZXQoJ25nTW9kdWxlJykgITtcbiAgICAgIH1cblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICAgIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgYXJyYXlzLlxuICAgICAgICByZWZMaXN0LnB1c2goLi4udGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZW50cnksIGNsYXNzTmFtZSwgYXJyYXlOYW1lKSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGVudHJ5Lm5vZGUsXG4gICAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOZ01vZHVsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogU2NvcGVEYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY29tcGlsYXRpb24uZGlyZWN0aXZlcy5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUucmVmLm5vZGUgPT09IG5vZGUpICYmXG4gICAgICAhY29tcGlsYXRpb24ucGlwZXMuc29tZShwaXBlID0+IHBpcGUucmVmLm5vZGUgPT09IG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogYW55KTogcmVmIGlzIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4ge1xuICByZXR1cm4gcmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlICYmXG4gICAgICAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8XG4gICAgICAgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHJlZi5ub2RlKSk7XG59XG4iXX0=