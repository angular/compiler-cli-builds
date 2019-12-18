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
                type: type,
                internalType: internalType,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUF1VDtJQUN2VCwrQkFBaUM7SUFFakMsMkVBQWtGO0lBQ2xGLG1FQUFpRjtJQUdqRix5RUFBd0g7SUFJeEgsdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCxxRkFBd0Q7SUFFeEQsNkVBQXdRO0lBaUJ4UTs7OztPQUlHO0lBQ0g7UUFFRSxrQ0FDWSxTQUF5QixFQUFVLFNBQTJCLEVBQzlELFVBQTBCLEVBQVUsWUFBOEIsRUFDbEUsYUFBdUMsRUFDdkMsa0JBQXNDLEVBQVUsTUFBZSxFQUMvRCxhQUF5QyxFQUFVLFVBQTRCLEVBQy9FLGNBQW1DLEVBQ25DLHFCQUE0QyxFQUM1QywwQkFBbUMsRUFBVSxRQUFpQjtZQVA5RCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGVBQVUsR0FBVixVQUFVLENBQWdCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQWtCO1lBQ2xFLGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtZQUN2Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUMvRCxrQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUMvRSxtQkFBYyxHQUFkLGNBQWMsQ0FBcUI7WUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtZQUM1QywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQVM7WUFBVSxhQUFRLEdBQVIsUUFBUSxDQUFTO1lBRWpFLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7WUFDdkMsU0FBSSxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQztRQUgrQixDQUFDO1FBSzlFLHlDQUFNLEdBQU4sVUFBTyxJQUFzQixFQUFFLFVBQTRCO1lBQ3pELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLFNBQVMsR0FBRywyQkFBb0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RSxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7Z0JBQzNCLE9BQU87b0JBQ0wsT0FBTyxFQUFFLFNBQVMsQ0FBQyxJQUFJO29CQUN2QixRQUFRLEVBQUUsU0FBUztpQkFDcEIsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1FBQ0gsQ0FBQztRQUVELDBDQUFPLEdBQVAsVUFBUSxJQUFzQixFQUFFLFNBQThCOztZQUE5RCxpQkFpTkM7WUEvTUMsSUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3hELE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxxQkFBcUIsRUFBRSxzQkFBUyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFDbEUsc0RBQXNELENBQUMsQ0FBQzthQUM3RDtZQUVELDBGQUEwRjtZQUMxRix5REFBeUQ7WUFDekQsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyx1QkFBZ0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXRFLElBQUksQ0FBQyxFQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZDLE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLEVBQ3pDLDhDQUE4QyxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFNLFFBQVEsR0FBRyxpQ0FBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ3ZCLHdFQUF3RTtnQkFDeEUsT0FBTyxFQUFFLENBQUM7YUFDWDtZQUVELElBQU0sZUFBZSxHQUFHLHVCQUFnQixDQUFDO2dCQUN2QyxVQUFBLEdBQUcsSUFBSSxPQUFBLEtBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQXRELENBQXNEO2dCQUM3RCx5QkFBa0I7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUV4Qyx5REFBeUQ7WUFDekQsSUFBSSxlQUFlLEdBQWtDLEVBQUUsQ0FBQztZQUN4RCxJQUFJLGVBQWUsR0FBdUIsSUFBSSxDQUFDO1lBQy9DLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDaEMsZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFHLENBQUM7Z0JBQ2pELElBQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSx5QkFBa0IsQ0FBQyxDQUFDO2dCQUNyRixlQUFlO29CQUNYLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7O29CQUVqRiw0RkFBNEY7b0JBQzVGLEtBQWtCLElBQUEsb0JBQUEsaUJBQUEsZUFBZSxDQUFBLGdEQUFBLDZFQUFFO3dCQUE5QixJQUFNLEdBQUcsNEJBQUE7d0JBQ1osSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLGlCQUFpQixFQUFFOzRCQUM5QyxJQUFNLFNBQVMsR0FBa0IsdUNBQWdDLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFDOzRCQUV4RixXQUFXLENBQUMsSUFBSSxDQUFDLDRCQUFjLENBQzNCLHVCQUFTLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxFQUNqRCxxQkFBbUIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxvRUFBaUUsRUFDdEcsQ0FBQztvQ0FDQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO29DQUNuQixXQUFXLEVBQUUsTUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHdCQUFxQjtpQ0FDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDVjtxQkFDRjs7Ozs7Ozs7O2FBQ0Y7WUFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQixPQUFPLEVBQUMsV0FBVyxhQUFBLEVBQUMsQ0FBQzthQUN0QjtZQUVELElBQUksVUFBVSxHQUFrQyxFQUFFLENBQUM7WUFDbkQsSUFBSSxVQUFVLEdBQXVCLElBQUksQ0FBQztZQUMxQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzNCLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRyxDQUFDO2dCQUN2QyxJQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDLENBQUM7Z0JBQ3pFLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQzdFO1lBQ0QsSUFBSSxVQUFVLEdBQWtDLEVBQUUsQ0FBQztZQUNuRCxJQUFJLFVBQVUsR0FBdUIsSUFBSSxDQUFDO1lBQzFDLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDM0IsVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFHLENBQUM7Z0JBQ3ZDLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxlQUFlLENBQUMsQ0FBQztnQkFDekUsVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzVFLENBQUEsS0FBQSxJQUFJLENBQUMsa0JBQWtCLENBQUEsQ0FBQyxHQUFHLDZCQUFDLElBQUksR0FBSyxVQUFVLEdBQUU7YUFDbEQ7WUFDRCxJQUFJLGFBQWEsR0FBa0MsRUFBRSxDQUFDO1lBQ3RELElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDN0IsSUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUcsQ0FBQztnQkFDekMsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUFrQixDQUFDLENBQUM7Z0JBQ3hFLGFBQWEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQzlFO1lBRUQsSUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7Z0JBQzNCLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFHLENBQUM7Z0JBQzFDLElBQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDMUIsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO2lCQUNuRjs7b0JBRUQsS0FBd0IsSUFBQSxXQUFBLGlCQUFBLE1BQU0sQ0FBQSw4QkFBQSxrREFBRTt3QkFBM0IsSUFBTSxTQUFTLG1CQUFBO3dCQUNsQixJQUFJLENBQUMsQ0FBQyxTQUFTLFlBQVksbUJBQVMsQ0FBQyxFQUFFOzRCQUNyQyxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxFQUN2Qyw4Q0FBOEMsQ0FBQyxDQUFDO3lCQUNyRDt3QkFDRCxJQUFNLElBQUUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQzt3QkFDbkUsSUFBSSxJQUFFLEtBQUssSUFBSSxJQUFJLFNBQVMsQ0FBQyxrQkFBa0IsS0FBSyxlQUFlLEVBQUU7NEJBQ25FLE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxPQUFPLEVBQ3ZDLDhDQUE4QyxDQUFDLENBQUM7eUJBQ3JEO3dCQUNELDBGQUEwRjt3QkFDMUYsNEZBQTRGO3dCQUM1Riw2REFBNkQ7d0JBQzdELFFBQVEsSUFBRSxDQUFDLElBQUksRUFBRTs0QkFDZixLQUFLLHdCQUF3QjtnQ0FDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBc0IsQ0FBQyxDQUFDO2dDQUNyQyxNQUFNOzRCQUNSLEtBQUssa0JBQWtCO2dDQUNyQixPQUFPLENBQUMsSUFBSSxDQUFDLDJCQUFnQixDQUFDLENBQUM7Z0NBQy9CLE1BQU07NEJBQ1I7Z0NBQ0UsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLG9CQUFvQixFQUFFLE9BQU8sRUFDdkMsTUFBSSxTQUFTLENBQUMsU0FBUyxxQ0FBa0MsQ0FBQyxDQUFDO3lCQUNsRTtxQkFDRjs7Ozs7Ozs7O2FBQ0Y7WUFFRCxJQUFNLEVBQUUsR0FDSixRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLDBCQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUUsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBRTFDLElBQUksV0FBVyxHQUFHLFlBQVksQ0FBQztZQUMvQixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hELElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsV0FBVyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQzthQUN4QztZQUVELElBQU0sU0FBUyxHQUNYLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxLQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLEVBQXpELENBQXlELENBQUMsQ0FBQztZQUM5RixJQUFNLFlBQVksR0FDZCxlQUFlLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsQ0FBQyxFQUFwRCxDQUFvRCxDQUFDLENBQUM7WUFDdEYsSUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLEtBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxXQUFXLENBQUMsRUFBbkQsQ0FBbUQsQ0FBQyxDQUFDO1lBQzNGLElBQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxHQUFHLElBQUksT0FBQSxLQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLEVBQW5ELENBQW1ELENBQUMsQ0FBQztZQUUzRixJQUFNLGtCQUFrQixHQUFHLFVBQUMsR0FBZ0I7Z0JBQ3hDLE9BQUEsbUNBQTRCLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBTSxFQUFFLFlBQVksQ0FBQztZQUFsRSxDQUFrRSxDQUFDO1lBQ3ZFLElBQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztnQkFDM0QsWUFBWSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3pFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUVyQyxJQUFNLElBQUksR0FBRyx3QkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3JELElBQU0sWUFBWSxHQUFHLElBQUksMEJBQWUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEYsSUFBTSxZQUFZLEdBQUcsSUFBSSwwQkFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUV0RixJQUFNLFdBQVcsR0FBdUI7Z0JBQ3RDLElBQUksTUFBQTtnQkFDSixZQUFZLGNBQUE7Z0JBQ1osWUFBWSxjQUFBO2dCQUNaLFNBQVMsV0FBQTtnQkFDVCxZQUFZLGNBQUE7Z0JBQ1osT0FBTyxTQUFBO2dCQUNQLE9BQU8sU0FBQTtnQkFDUCxvQkFBb0Isc0JBQUE7Z0JBQ3BCLEVBQUUsSUFBQTtnQkFDRixVQUFVLEVBQUUsS0FBSztnQkFDakIsZ0RBQWdEO2dCQUNoRCxPQUFPLEVBQUUsRUFBRTthQUNaLENBQUM7WUFFRixJQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDcEYsSUFBTSxTQUFTLEdBQUcsWUFBWSxLQUFLLElBQUksQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLDBCQUFlLENBQ2YsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxzQ0FBK0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUMvQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLENBQUM7WUFFVCwrRkFBK0Y7WUFDL0YsK0ZBQStGO1lBQy9GLHFDQUFxQztZQUNyQyxJQUFNLGVBQWUsR0FBcUMsRUFBRSxDQUFDO1lBQzdELElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDM0IsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLDBCQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUcsQ0FBQyxDQUFDLENBQUM7YUFDdEU7WUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxFQUFFO2dCQUMvQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDMUY7WUFFRCxJQUFNLGFBQWEsR0FBdUI7Z0JBQ3hDLElBQUksTUFBQTtnQkFDSixJQUFJLE1BQUE7Z0JBQ0osWUFBWSxjQUFBO2dCQUNaLElBQUksRUFBRSxzQ0FBK0IsQ0FDakMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7Z0JBQ2xFLFNBQVMsV0FBQTtnQkFDVCxPQUFPLEVBQUUsZUFBZTthQUN6QixDQUFDO1lBRUYsT0FBTztnQkFDTCxRQUFRLEVBQUU7b0JBQ1IsRUFBRSxJQUFBO29CQUNGLE9BQU8sRUFBRSxPQUFPO29CQUNoQixHQUFHLEVBQUUsV0FBVztvQkFDaEIsR0FBRyxFQUFFLGFBQWE7b0JBQ2xCLFlBQVksRUFBRSxlQUFlLEVBQUUsZUFBZSxpQkFBQTtvQkFDOUMsT0FBTyxFQUFFLFVBQVU7b0JBQ25CLE9BQU8sRUFBRSxVQUFVO29CQUNuQixZQUFZLEVBQUUsdUNBQTRCLENBQ3RDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUM3RCxJQUFJLENBQUMsMEJBQTBCLENBQUM7b0JBQ3BDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtpQkFDbEM7YUFDRixDQUFDO1FBQ0osQ0FBQztRQUVELDJDQUFRLEdBQVIsVUFBUyxJQUFzQixFQUFFLFFBQTBCO1lBQ3pELDBGQUEwRjtZQUMxRixvRkFBb0Y7WUFDcEYsZUFBZTtZQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsd0JBQXdCLENBQUM7Z0JBQ3pDLEdBQUcsRUFBRSxJQUFJLG1CQUFTLENBQUMsSUFBSSxDQUFDO2dCQUN4QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLFlBQVksRUFBRSxRQUFRLENBQUMsWUFBWTtnQkFDbkMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO2dCQUN6QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLGVBQWUsRUFBRSxRQUFRLENBQUMsZUFBZTthQUMxQyxDQUFDLENBQUM7WUFFSCxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFO2dCQUNoQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDN0U7UUFDSCxDQUFDO1FBRUQsMENBQU8sR0FBUCxVQUFRLElBQXNCLEVBQUUsUUFBb0M7O1lBRWxFLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEQsSUFBTSxXQUFXLEdBQW9CLEVBQUUsQ0FBQztZQUV4QyxJQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekUsSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLEVBQUU7Z0JBQzdCLFdBQVcsQ0FBQyxJQUFJLE9BQWhCLFdBQVcsbUJBQVMsZ0JBQWdCLEdBQUU7YUFDdkM7WUFFRCxJQUFNLElBQUksR0FBdUI7Z0JBQy9CLGVBQWUsRUFBRSxFQUFFO2FBQ3BCLENBQUM7O2dCQUVGLEtBQW1CLElBQUEsS0FBQSxpQkFBQSxRQUFRLENBQUMsWUFBWSxDQUFBLGdCQUFBLDRCQUFFO29CQUFyQyxJQUFNLElBQUksV0FBQTtvQkFDYixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSTt3QkFDbkQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO3dCQUNsRCw0RkFBNEY7d0JBQzVGLFVBQVU7d0JBRVYsbUZBQW1GO3dCQUNuRixJQUFNLFNBQVMsR0FDWCx1Q0FBZ0MsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLGVBQWlCLENBQUMsQ0FBQzt3QkFDdkUsV0FBVyxDQUFDLElBQUksQ0FBQyw0QkFBYyxDQUMzQix1QkFBUyxDQUFDLDRCQUE0QixFQUFFLFNBQVMsRUFDakQsZ0JBQWMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSx5REFBb0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHNKQUVuQixFQUNoRixDQUFDLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksd0JBQXFCLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDM0Y7aUJBQ0Y7Ozs7Ozs7OztZQUVELElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtnQkFDbEIsd0ZBQXdGO2dCQUN4RiwrQkFBK0I7Z0JBQy9CLElBQU0sT0FBTyxHQUFHLDBCQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUNwQyxLQUF3QixJQUFBLEtBQUEsaUJBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQSxnQkFBQSw0QkFBRTt3QkFBckMsSUFBTSxTQUFTLFdBQUE7d0JBQ2xCLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFOzRCQUNqRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQzt5QkFDckU7cUJBQ0Y7Ozs7Ozs7Ozs7b0JBRUQsS0FBbUIsSUFBQSxLQUFBLGlCQUFBLFFBQVEsQ0FBQyxZQUFZLENBQUEsZ0JBQUEsNEJBQUU7d0JBQXJDLElBQU0sSUFBSSxXQUFBO3dCQUNiLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBRTVELElBQUksUUFBUSxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTs0QkFDbkQsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxJQUFJLEVBQy9DLGVBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxxQ0FBa0MsQ0FBQyxDQUFDO3lCQUN6RTtxQkFDRjs7Ozs7Ozs7O2FBQ0Y7WUFFRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQixPQUFPLEVBQUMsV0FBVyxhQUFBLEVBQUMsQ0FBQzthQUN0QjtZQUVELElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLElBQUksRUFBRTtnQkFDOUMsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFDLENBQUM7YUFDZjtpQkFBTTtnQkFDTCxPQUFPO29CQUNMLElBQUksTUFBQTtvQkFDSixTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7aUJBQzNCLENBQUM7YUFDSDtRQUNILENBQUM7UUFFRCwwQ0FBTyxHQUFQLFVBQ0ksSUFBc0IsRUFBRSxRQUFvQyxFQUM1RCxVQUF3Qzs7WUFGNUMsaUJBMkRDO1lBeERDLDBGQUEwRjtZQUMxRiwyREFBMkQ7WUFDM0QsSUFBTSxhQUFhLEdBQUcsMEJBQWUsdUNBQ2hDLFFBQVEsQ0FBQyxHQUFHLEtBQ2YsT0FBTyxtQkFBTSxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBSyxVQUFVLENBQUMsZUFBZSxLQUNoRSxDQUFDO1lBQ0gsSUFBTSxXQUFXLEdBQUcsMEJBQWUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEQsSUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsb0JBQW9CLENBQUM7WUFDNUQsSUFBSSxRQUFRLENBQUMsWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDbEMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUNoRDtZQUNELElBQU0sT0FBTyxHQUFHLDBCQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7O2dCQUNwQyxLQUFtQixJQUFBLEtBQUEsaUJBQUEsUUFBUSxDQUFDLFlBQVksQ0FBQSxnQkFBQSw0QkFBRTtvQkFBckMsSUFBTSxJQUFJLFdBQUE7b0JBQ2IsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDeEQsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBZ0IsQ0FBQyxDQUFDO3dCQUMzRixJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7NEJBQ2xCLFNBQVM7eUJBQ1Y7d0JBQ0QsSUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUMvQyxVQUFBLFNBQVMsSUFBSSxPQUFBLEtBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEVBQTVDLENBQTRDLENBQUMsQ0FBQzt3QkFDL0QsSUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsS0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDO3dCQUMzRixJQUFNLGNBQWMsR0FBRyxJQUFJLDJCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO3dCQUN4RCxJQUFNLFVBQVUsR0FBRyxJQUFJLDJCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMvQyxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFHLENBQUM7d0JBQ3ZELElBQU0saUJBQWlCLEdBQUcsSUFBSSx1QkFBWSxDQUFDLHdCQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQzt3QkFDNUUsSUFBTSxRQUFRLEdBQ1YsSUFBSSw2QkFBa0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFFdEYsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO3FCQUM1QztpQkFDRjs7Ozs7Ozs7O1lBQ0QsSUFBTSxHQUFHLEdBQW9CO2dCQUMzQjtvQkFDRSxJQUFJLEVBQUUsTUFBTTtvQkFDWixXQUFXLEVBQUUsV0FBVyxDQUFDLFVBQVU7b0JBQ25DLFVBQVUsRUFBRSxrQkFBa0I7b0JBQzlCLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtpQkFDdkI7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLE1BQU07b0JBQ1osV0FBVyxFQUFFLGFBQWEsQ0FBQyxVQUFVO29CQUNyQyxVQUFVLEVBQUUsYUFBYSxDQUFDLFVBQVU7b0JBQ3BDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSTtpQkFDekI7YUFDRixDQUFDO1lBRUYsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO2dCQUNqQixHQUFHLENBQUMsSUFBSSxDQUFDO29CQUNQLElBQUksRUFBRSxNQUFNO29CQUNaLFdBQVcsRUFBRSxJQUFJLHNCQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztvQkFDM0MsVUFBVSxFQUFFLEVBQUU7b0JBQ2QsSUFBSSxFQUFFLHNCQUFXO2lCQUNsQixDQUFDLENBQUM7YUFDSjtZQUVELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUVPLGlEQUFjLEdBQXRCLFVBQ0ksUUFBbUMsRUFBRSxZQUEyQixFQUNoRSxXQUEwQjtZQUM1QixJQUFJLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRTtnQkFDakMsT0FBTyxvQkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDdkY7aUJBQU07Z0JBQ0wsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDO2dCQUN2QixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxRQUFRLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDeEQsT0FBTyxHQUFHLElBQUksbUJBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDbkM7Z0JBQ0QsT0FBTyxvQkFBYSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDckY7UUFDSCxDQUFDO1FBRUQ7OztXQUdHO1FBQ0ssMEVBQXVDLEdBQS9DLFVBQWdELElBRXFCO1lBQ25FLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO1lBQy9CLE9BQU8sSUFBSTtnQkFDUCxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakcsQ0FBQztRQUVEOzs7OztXQUtHO1FBQ0ssOERBQTJCLEdBQW5DLFVBQ0ksSUFBaUIsRUFDakIsSUFBdUU7WUFDekUsbUZBQW1GO1lBQ25GLElBQUksQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUTtnQkFDL0MsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQy9FLElBQUksQ0FBQztZQUNULElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDckIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHNEQUFzRDtZQUN0RCxJQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTFELCtDQUErQztZQUMvQyxJQUFJLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxxQkFBcUIsRUFBRTtnQkFDcEQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELHdDQUF3QztZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRTtnQkFDL0MsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELGdEQUFnRDtZQUNoRCxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDdkUsSUFBTSxRQUFNLEdBQ1IsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDNUYsSUFBTSxVQUFVLEdBQUcsQ0FBQyxRQUFNLElBQUksUUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDekUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLGtDQUFvQixDQUMxQix1QkFBUyxDQUFDLDhDQUE4QyxFQUFFLElBQUksRUFDM0QsVUFBVSwwRUFBdUU7b0JBQ2hGLDhFQUE4RTtvQkFDOUUsc0ZBQXNGLENBQUMsQ0FBQzthQUNqRztZQUVELElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEMsT0FBTyxnQ0FBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQ7Ozs7O1dBS0c7UUFDSyxnRUFBNkIsR0FBckMsVUFBc0MsSUFBaUI7O1lBQ3JELElBQUksQ0FBQyxFQUFFLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDO2FBQ2I7O2dCQUNELEtBQWdCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsS0FBSyxDQUFBLGdCQUFBLDRCQUFFO29CQUF2QixJQUFNLENBQUMsV0FBQTtvQkFDVixJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRTs7NEJBQzNCLEtBQWdCLElBQUEsb0JBQUEsaUJBQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQSxDQUFBLGdCQUFBLDRCQUFFO2dDQUF0QixJQUFNLENBQUMsV0FBQTtnQ0FDVixJQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO29DQUNqRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLElBQUk7b0NBQ3hDLElBQUksQ0FBQztnQ0FDVCxJQUFNLGtCQUFrQixHQUFHLFlBQVksSUFBSSxnQ0FBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQ0FDN0UsSUFBSSxrQkFBa0IsRUFBRTtvQ0FDdEIsT0FBTyxrQkFBa0IsQ0FBQztpQ0FDM0I7NkJBQ0Y7Ozs7Ozs7OztxQkFDRjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsOEVBQThFO1FBQ3RFLDhEQUEyQixHQUFuQyxVQUFvQyxHQUE4QjtZQUVoRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQ7O1dBRUc7UUFDSyxrREFBZSxHQUF2QixVQUNJLElBQWEsRUFBRSxZQUEyQixFQUFFLFNBQWlCLEVBQzdELFNBQWlCO1lBRnJCLGlCQW9DQztZQWpDQyxJQUFNLE9BQU8sR0FBa0MsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUNoQyxNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUNwQyw4Q0FBNEMsU0FBUyxZQUFPLFNBQVcsQ0FBQyxDQUFDO2FBQzlFO1lBRUQsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFDLEtBQUssRUFBRSxHQUFHO2dCQUM5QixvRkFBb0Y7Z0JBQ3BGLHlGQUF5RjtnQkFDekYsSUFBSSxLQUFLLFlBQVksR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2pELEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRyxDQUFDO2lCQUNqQztnQkFFRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3hCLDhCQUE4QjtvQkFDOUIsT0FBTyxDQUFDLElBQUksT0FBWixPQUFPLG1CQUFTLEtBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEdBQUU7aUJBQzFFO3FCQUFNLElBQUksc0JBQXNCLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ3hDLElBQUksQ0FBQyxLQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDLEVBQUU7d0JBQzVDLE1BQU0sSUFBSSxrQ0FBb0IsQ0FDMUIsdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUMxQyx1QkFBcUIsR0FBRyx5QkFBb0IsU0FBUyxZQUFPLFNBQVMsb0JBQWlCLENBQUMsQ0FBQztxQkFDN0Y7b0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDckI7cUJBQU07b0JBQ0wsMEZBQTBGO29CQUMxRixNQUFNLElBQUksa0NBQW9CLENBQzFCLHVCQUFTLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxFQUNwQyx1QkFBcUIsR0FBRyx5QkFBb0IsU0FBUyxZQUFPLFNBQVMsNkJBQXdCLEtBQU8sQ0FBQyxDQUFDO2lCQUMzRztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUNILCtCQUFDO0lBQUQsQ0FBQyxBQTFoQkQsSUEwaEJDO0lBMWhCWSw0REFBd0I7SUE0aEJyQyxTQUFTLFVBQVUsQ0FBQyxJQUFzQixFQUFFLFdBQXNCO1FBQ2hFLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLElBQUksRUFBM0IsQ0FBMkIsQ0FBQztZQUN6RSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUF0QixDQUFzQixDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELFNBQVMsc0JBQXNCLENBQUMsR0FBUTtRQUN0QyxPQUFPLEdBQUcsWUFBWSxtQkFBUztZQUMzQixDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0JBQ3JFLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0NVU1RPTV9FTEVNRU5UU19TQ0hFTUEsIEV4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgSW52b2tlRnVuY3Rpb25FeHByLCBMaXRlcmFsQXJyYXlFeHByLCBMaXRlcmFsRXhwciwgTk9fRVJST1JTX1NDSEVNQSwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTVFJJTkdfVFlQRSwgU2NoZW1hTWV0YWRhdGEsIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlSW5qZWN0b3IsIGNvbXBpbGVOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBGYXRhbERpYWdub3N0aWNFcnJvciwgbWFrZURpYWdub3N0aWN9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCB0eXBlTm9kZVRvVmFsdWVFeHByfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LCBTY29wZURhdGF9IGZyb20gJy4uLy4uL3Njb3BlJztcbmltcG9ydCB7RmFjdG9yeVRyYWNrZXJ9IGZyb20gJy4uLy4uL3NoaW1zJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2UsIFJlc29sdmVSZXN1bHR9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2dldFNvdXJjZUZpbGV9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2dlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGx9IGZyb20gJy4vbWV0YWRhdGEnO1xuaW1wb3J0IHtSZWZlcmVuY2VzUmVnaXN0cnl9IGZyb20gJy4vcmVmZXJlbmNlc19yZWdpc3RyeSc7XG5pbXBvcnQge2NvbWJpbmVSZXNvbHZlcnMsIGZpbmRBbmd1bGFyRGVjb3JhdG9yLCBmb3J3YXJkUmVmUmVzb2x2ZXIsIGdldFJlZmVyZW5jZU9yaWdpbkZvckRpYWdub3N0aWNzLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCB0b1IzUmVmZXJlbmNlLCB1bndyYXBFeHByZXNzaW9uLCB3cmFwRnVuY3Rpb25FeHByZXNzaW9uc0luUGFyZW5zLCB3cmFwVHlwZVJlZmVyZW5jZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGludGVyZmFjZSBOZ01vZHVsZUFuYWx5c2lzIHtcbiAgbW9kOiBSM05nTW9kdWxlTWV0YWRhdGE7XG4gIGluajogUjNJbmplY3Rvck1ldGFkYXRhO1xuICBtZXRhZGF0YVN0bXQ6IFN0YXRlbWVudHxudWxsO1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbDtcbiAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBpZDogRXhwcmVzc2lvbnxudWxsO1xuICBmYWN0b3J5U3ltYm9sTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlUmVzb2x1dGlvbiB7IGluamVjdG9ySW1wb3J0czogRXhwcmVzc2lvbltdOyB9XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHNcbiAgICBEZWNvcmF0b3JIYW5kbGVyPERlY29yYXRvciwgTmdNb2R1bGVBbmFseXNpcywgTmdNb2R1bGVSZXNvbHV0aW9uPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgbWV0YVJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIHByaXZhdGUgbWV0YVJlZ2lzdHJ5OiBNZXRhZGF0YVJlZ2lzdHJ5LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZmFjdG9yeVRyYWNrZXI6IEZhY3RvcnlUcmFja2VyfG51bGwsXG4gICAgICBwcml2YXRlIGRlZmF1bHRJbXBvcnRSZWNvcmRlcjogRGVmYXVsdEltcG9ydFJlY29yZGVyLFxuICAgICAgcHJpdmF0ZSBhbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlcjogYm9vbGVhbiwgcHJpdmF0ZSBsb2NhbGVJZD86IHN0cmluZykge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuUFJJTUFSWTtcbiAgcmVhZG9ubHkgbmFtZSA9IE5nTW9kdWxlRGVjb3JhdG9ySGFuZGxlci5uYW1lO1xuXG4gIGRldGVjdChub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogRGV0ZWN0UmVzdWx0PERlY29yYXRvcj58dW5kZWZpbmVkIHtcbiAgICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGNvbnN0IGRlY29yYXRvciA9IGZpbmRBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvcnMsICdOZ01vZHVsZScsIHRoaXMuaXNDb3JlKTtcbiAgICBpZiAoZGVjb3JhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyaWdnZXI6IGRlY29yYXRvci5ub2RlLFxuICAgICAgICBtZXRhZGF0YTogZGVjb3JhdG9yLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogUmVhZG9ubHk8RGVjb3JhdG9yPik6XG4gICAgICBBbmFseXNpc091dHB1dDxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgRGVjb3JhdG9yLm5vZGVGb3JFcnJvcihkZWNvcmF0b3IpLFxuICAgICAgICAgIGBJbmNvcnJlY3QgbnVtYmVyIG9mIGFyZ3VtZW50cyB0byBATmdNb2R1bGUgZGVjb3JhdG9yYCk7XG4gICAgfVxuXG4gICAgLy8gQE5nTW9kdWxlIGNhbiBiZSBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLiBJbiBjYXNlIGl0IGlzLCBwcmV0ZW5kIGFzIGlmIGEgYmxhbmsgb2JqZWN0XG4gICAgLy8gbGl0ZXJhbCB3YXMgc3BlY2lmaWVkLiBUaGlzIHNpbXBsaWZpZXMgdGhlIGNvZGUgYmVsb3cuXG4gICAgY29uc3QgbWV0YSA9IGRlY29yYXRvci5hcmdzLmxlbmd0aCA9PT0gMSA/IHVud3JhcEV4cHJlc3Npb24oZGVjb3JhdG9yLmFyZ3NbMF0pIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChbXSk7XG5cbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuREVDT1JBVE9SX0FSR19OT1RfTElURVJBTCwgbWV0YSxcbiAgICAgICAgICAnQE5nTW9kdWxlIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0IGxpdGVyYWwnKTtcbiAgICB9XG4gICAgY29uc3QgbmdNb2R1bGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ppdCcpKSB7XG4gICAgICAvLyBUaGUgb25seSBhbGxvd2VkIHZhbHVlIGlzIHRydWUsIHNvIHRoZXJlJ3Mgbm8gbmVlZCB0byBleHBhbmQgZnVydGhlci5cbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVSZXNvbHZlcnMgPSBjb21iaW5lUmVzb2x2ZXJzKFtcbiAgICAgIHJlZiA9PiB0aGlzLl9leHRyYWN0TW9kdWxlRnJvbU1vZHVsZVdpdGhQcm92aWRlcnNGbihyZWYubm9kZSksXG4gICAgICBmb3J3YXJkUmVmUmVzb2x2ZXIsXG4gICAgXSk7XG5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBFeHRyYWN0IHRoZSBtb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cy5cbiAgICBsZXQgZGVjbGFyYXRpb25SZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIHJhd0RlY2xhcmF0aW9ucyA9IG5nTW9kdWxlLmdldCgnZGVjbGFyYXRpb25zJykgITtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0RlY2xhcmF0aW9ucywgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGRlY2xhcmF0aW9uUmVmcyA9XG4gICAgICAgICAgdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RGVjbGFyYXRpb25zLCBkZWNsYXJhdGlvbk1ldGEsIG5hbWUsICdkZWNsYXJhdGlvbnMnKTtcblxuICAgICAgLy8gTG9vayB0aHJvdWdoIHRoZSBkZWNsYXJhdGlvbnMgdG8gbWFrZSBzdXJlIHRoZXkncmUgYWxsIGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICAgIGZvciAoY29uc3QgcmVmIG9mIGRlY2xhcmF0aW9uUmVmcykge1xuICAgICAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgY29uc3QgZXJyb3JOb2RlOiB0cy5FeHByZXNzaW9uID0gZ2V0UmVmZXJlbmNlT3JpZ2luRm9yRGlhZ25vc3RpY3MocmVmLCByYXdEZWNsYXJhdGlvbnMpO1xuXG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04sIGVycm9yTm9kZSxcbiAgICAgICAgICAgICAgYENhbm5vdCBkZWNsYXJlICcke3JlZi5ub2RlLm5hbWUudGV4dH0nIGluIGFuIE5nTW9kdWxlIGFzIGl0J3Mgbm90IGEgcGFydCBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5gLFxuICAgICAgICAgICAgICBbe1xuICAgICAgICAgICAgICAgIG5vZGU6IHJlZi5ub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZVRleHQ6IGAnJHtyZWYubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmAsXG4gICAgICAgICAgICAgIH1dKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtkaWFnbm9zdGljc307XG4gICAgfVxuXG4gICAgbGV0IGltcG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0ltcG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaW1wb3J0cycpKSB7XG4gICAgICByYXdJbXBvcnRzID0gbmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgITtcbiAgICAgIGNvbnN0IGltcG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3SW1wb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGltcG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdJbXBvcnRzLCBpbXBvcnRzTWV0YSwgbmFtZSwgJ2ltcG9ydHMnKTtcbiAgICB9XG4gICAgbGV0IGV4cG9ydFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgbGV0IHJhd0V4cG9ydHM6IHRzLkV4cHJlc3Npb258bnVsbCA9IG51bGw7XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZXhwb3J0cycpKSB7XG4gICAgICByYXdFeHBvcnRzID0gbmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgITtcbiAgICAgIGNvbnN0IGV4cG9ydHNNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUocmF3RXhwb3J0cywgbW9kdWxlUmVzb2x2ZXJzKTtcbiAgICAgIGV4cG9ydFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChyYXdFeHBvcnRzLCBleHBvcnRzTWV0YSwgbmFtZSwgJ2V4cG9ydHMnKTtcbiAgICAgIHRoaXMucmVmZXJlbmNlc1JlZ2lzdHJ5LmFkZChub2RlLCAuLi5leHBvcnRSZWZzKTtcbiAgICB9XG4gICAgbGV0IGJvb3RzdHJhcFJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnYm9vdHN0cmFwJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2Jvb3RzdHJhcCcpICE7XG4gICAgICBjb25zdCBib290c3RyYXBNZXRhID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoZXhwciwgZm9yd2FyZFJlZlJlc29sdmVyKTtcbiAgICAgIGJvb3RzdHJhcFJlZnMgPSB0aGlzLnJlc29sdmVUeXBlTGlzdChleHByLCBib290c3RyYXBNZXRhLCBuYW1lLCAnYm9vdHN0cmFwJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ3NjaGVtYXMnKSkge1xuICAgICAgY29uc3QgcmF3RXhwciA9IG5nTW9kdWxlLmdldCgnc2NoZW1hcycpICE7XG4gICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShyYXdFeHByKTtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwciwgYE5nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheWApO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHNjaGVtYVJlZiBvZiByZXN1bHQpIHtcbiAgICAgICAgaWYgKCEoc2NoZW1hUmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLFxuICAgICAgICAgICAgICAnTmdNb2R1bGUuc2NoZW1hcyBtdXN0IGJlIGFuIGFycmF5IG9mIHNjaGVtYXMnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpZCA9IHNjaGVtYVJlZi5nZXRJZGVudGl0eUluKHNjaGVtYVJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBzY2hlbWFSZWYub3duZWRCeU1vZHVsZUd1ZXNzICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgcmF3RXhwcixcbiAgICAgICAgICAgICAgJ05nTW9kdWxlLnNjaGVtYXMgbXVzdCBiZSBhbiBhcnJheSBvZiBzY2hlbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU2luY2UgYGlkYCBpcyB0aGUgYHRzLklkZW50aWZlcmAgd2l0aGluIHRoZSBzY2hlbWEgcmVmJ3MgZGVjbGFyYXRpb24gZmlsZSwgaXQncyBzYWZlIHRvXG4gICAgICAgIC8vIHVzZSBgaWQudGV4dGAgaGVyZSB0byBmaWd1cmUgb3V0IHdoaWNoIHNjaGVtYSBpcyBpbiB1c2UuIEV2ZW4gaWYgdGhlIGFjdHVhbCByZWZlcmVuY2Ugd2FzXG4gICAgICAgIC8vIHJlbmFtZWQgd2hlbiB0aGUgdXNlciBpbXBvcnRlZCBpdCwgdGhlc2UgbmFtZXMgd2lsbCBtYXRjaC5cbiAgICAgICAgc3dpdGNoIChpZC50ZXh0KSB7XG4gICAgICAgICAgY2FzZSAnQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSc6XG4gICAgICAgICAgICBzY2hlbWFzLnB1c2goQ1VTVE9NX0VMRU1FTlRTX1NDSEVNQSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdOT19FUlJPUlNfU0NIRU1BJzpcbiAgICAgICAgICAgIHNjaGVtYXMucHVzaChOT19FUlJPUlNfU0NIRU1BKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCByYXdFeHByLFxuICAgICAgICAgICAgICAgIGAnJHtzY2hlbWFSZWYuZGVidWdOYW1lfScgaXMgbm90IGEgdmFsaWQgTmdNb2R1bGUgc2NoZW1hYCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBpZDogRXhwcmVzc2lvbnxudWxsID1cbiAgICAgICAgbmdNb2R1bGUuaGFzKCdpZCcpID8gbmV3IFdyYXBwZWROb2RlRXhwcihuZ01vZHVsZS5nZXQoJ2lkJykgISkgOiBudWxsO1xuICAgIGNvbnN0IHZhbHVlQ29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgbGV0IHR5cGVDb250ZXh0ID0gdmFsdWVDb250ZXh0O1xuICAgIGNvbnN0IHR5cGVOb2RlID0gdGhpcy5yZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKHR5cGVOb2RlICE9PSBudWxsKSB7XG4gICAgICB0eXBlQ29udGV4dCA9IHR5cGVOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICB9XG5cbiAgICBjb25zdCBib290c3RyYXAgPVxuICAgICAgICBib290c3RyYXBSZWZzLm1hcChib290c3RyYXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShib290c3RyYXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPVxuICAgICAgICBkZWNsYXJhdGlvblJlZnMubWFwKGRlY2wgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShkZWNsLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgaW1wb3J0cyA9IGltcG9ydFJlZnMubWFwKGltcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGltcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBleHBvcnRSZWZzLm1hcChleHAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShleHAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcblxuICAgIGNvbnN0IGlzRm9yd2FyZFJlZmVyZW5jZSA9IChyZWY6IFIzUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHJlZi52YWx1ZSwgbm9kZS5uYW1lICEsIHZhbHVlQ29udGV4dCk7XG4gICAgY29uc3QgY29udGFpbnNGb3J3YXJkRGVjbHMgPSBib290c3RyYXAuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGRlY2xhcmF0aW9ucy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHwgaW1wb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZXhwb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSk7XG5cbiAgICBjb25zdCB0eXBlID0gd3JhcFR5cGVSZWZlcmVuY2UodGhpcy5yZWZsZWN0b3IsIG5vZGUpO1xuICAgIGNvbnN0IGludGVybmFsVHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIodGhpcy5yZWZsZWN0b3IuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhub2RlKSk7XG4gICAgY29uc3QgYWRqYWNlbnRUeXBlID0gbmV3IFdyYXBwZWROb2RlRXhwcih0aGlzLnJlZmxlY3Rvci5nZXRBZGphY2VudE5hbWVPZkNsYXNzKG5vZGUpKTtcblxuICAgIGNvbnN0IG5nTW9kdWxlRGVmOiBSM05nTW9kdWxlTWV0YWRhdGEgPSB7XG4gICAgICB0eXBlLFxuICAgICAgaW50ZXJuYWxUeXBlLFxuICAgICAgYWRqYWNlbnRUeXBlLFxuICAgICAgYm9vdHN0cmFwLFxuICAgICAgZGVjbGFyYXRpb25zLFxuICAgICAgZXhwb3J0cyxcbiAgICAgIGltcG9ydHMsXG4gICAgICBjb250YWluc0ZvcndhcmREZWNscyxcbiAgICAgIGlkLFxuICAgICAgZW1pdElubGluZTogZmFsc2UsXG4gICAgICAvLyBUT0RPOiB0byBiZSBpbXBsZW1lbnRlZCBhcyBhIHBhcnQgb2YgRlctMTAwNC5cbiAgICAgIHNjaGVtYXM6IFtdLFxuICAgIH07XG5cbiAgICBjb25zdCByYXdQcm92aWRlcnMgPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID8gbmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhIDogbnVsbDtcbiAgICBjb25zdCBwcm92aWRlcnMgPSByYXdQcm92aWRlcnMgIT09IG51bGwgP1xuICAgICAgICBuZXcgV3JhcHBlZE5vZGVFeHByKFxuICAgICAgICAgICAgdGhpcy5hbm5vdGF0ZUZvckNsb3N1cmVDb21waWxlciA/IHdyYXBGdW5jdGlvbkV4cHJlc3Npb25zSW5QYXJlbnMocmF3UHJvdmlkZXJzKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmF3UHJvdmlkZXJzKSA6XG4gICAgICAgIG51bGw7XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCBvbmx5IGFkZCB0aGUgbW9kdWxlJ3MgaW1wb3J0cyBhcyB0aGUgaW5qZWN0b3JzJyBpbXBvcnRzLiBBbnkgZXhwb3J0ZWQgbW9kdWxlc1xuICAgIC8vIGFyZSBhZGRlZCBkdXJpbmcgYHJlc29sdmVgLCBhcyB3ZSBuZWVkIHNjb3BlIGluZm9ybWF0aW9uIHRvIGJlIGFibGUgdG8gZmlsdGVyIG91dCBkaXJlY3RpdmVzXG4gICAgLy8gYW5kIHBpcGVzIGZyb20gdGhlIG1vZHVsZSBleHBvcnRzLlxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGUsXG4gICAgICBpbnRlcm5hbFR5cGUsXG4gICAgICBkZXBzOiBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzKFxuICAgICAgICAgIG5vZGUsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmRlZmF1bHRJbXBvcnRSZWNvcmRlciwgdGhpcy5pc0NvcmUpLFxuICAgICAgcHJvdmlkZXJzLFxuICAgICAgaW1wb3J0czogaW5qZWN0b3JJbXBvcnRzLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgaWQsXG4gICAgICAgIHNjaGVtYXM6IHNjaGVtYXMsXG4gICAgICAgIG1vZDogbmdNb2R1bGVEZWYsXG4gICAgICAgIGluajogbmdJbmplY3RvckRlZixcbiAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsIHJhd0RlY2xhcmF0aW9ucyxcbiAgICAgICAgaW1wb3J0czogaW1wb3J0UmVmcyxcbiAgICAgICAgZXhwb3J0czogZXhwb3J0UmVmcyxcbiAgICAgICAgbWV0YWRhdGFTdG10OiBnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsKFxuICAgICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSxcbiAgICAgICAgICAgIHRoaXMuYW5ub3RhdGVGb3JDbG9zdXJlQ29tcGlsZXIpLFxuICAgICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICByZWdpc3Rlcihub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogTmdNb2R1bGVBbmFseXNpcyk6IHZvaWQge1xuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZVxuICAgIC8vIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMubWV0YVJlZ2lzdHJ5LnJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YSh7XG4gICAgICByZWY6IG5ldyBSZWZlcmVuY2Uobm9kZSksXG4gICAgICBzY2hlbWFzOiBhbmFseXNpcy5zY2hlbWFzLFxuICAgICAgZGVjbGFyYXRpb25zOiBhbmFseXNpcy5kZWNsYXJhdGlvbnMsXG4gICAgICBpbXBvcnRzOiBhbmFseXNpcy5pbXBvcnRzLFxuICAgICAgZXhwb3J0czogYW5hbHlzaXMuZXhwb3J0cyxcbiAgICAgIHJhd0RlY2xhcmF0aW9uczogYW5hbHlzaXMucmF3RGVjbGFyYXRpb25zLFxuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMuZmFjdG9yeVRyYWNrZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuZmFjdG9yeVRyYWNrZXIudHJhY2sobm9kZS5nZXRTb3VyY2VGaWxlKCksIGFuYWx5c2lzLmZhY3RvcnlTeW1ib2xOYW1lKTtcbiAgICB9XG4gIH1cblxuICByZXNvbHZlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSZWFkb25seTxOZ01vZHVsZUFuYWx5c2lzPik6XG4gICAgICBSZXNvbHZlUmVzdWx0PE5nTW9kdWxlUmVzb2x1dGlvbj4ge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUobm9kZSk7XG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgY29uc3Qgc2NvcGVEaWFnbm9zdGljcyA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXREaWFnbm9zdGljc09mTW9kdWxlKG5vZGUpO1xuICAgIGlmIChzY29wZURpYWdub3N0aWNzICE9PSBudWxsKSB7XG4gICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnNjb3BlRGlhZ25vc3RpY3MpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGE6IE5nTW9kdWxlUmVzb2x1dGlvbiA9IHtcbiAgICAgIGluamVjdG9ySW1wb3J0czogW10sXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLm1ldGFSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCkgPT09IG51bGwgJiZcbiAgICAgICAgICB0aGlzLm1ldGFSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpID09PSBudWxsKSB7XG4gICAgICAgIC8vIFRoaXMgZGVjbGFyYXRpb24gaXMgbmVpdGhlciBhIGRpcmVjdGl2ZShvciBjb21wb25lbnQpIG5vciBhIHBpcGUsIHNvIHByb2R1Y2UgYSBkaWFnbm9zdGljXG4gICAgICAgIC8vIGZvciBpdC5cblxuICAgICAgICAvLyBMb2NhdGUgdGhlIGVycm9yIG9uIHRoZSAnZGVjbGFyYXRpb25zJyBmaWVsZCBvZiB0aGUgTmdNb2R1bGUgZGVjb3JhdG9yIHRvIHN0YXJ0LlxuICAgICAgICBjb25zdCBlcnJvck5vZGU6IHRzLkV4cHJlc3Npb24gPVxuICAgICAgICAgICAgZ2V0UmVmZXJlbmNlT3JpZ2luRm9yRGlhZ25vc3RpY3MoZGVjbCwgYW5hbHlzaXMucmF3RGVjbGFyYXRpb25zICEpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04sIGVycm9yTm9kZSxcbiAgICAgICAgICAgIGBUaGUgY2xhc3MgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGxpc3RlZCBpbiB0aGUgZGVjbGFyYXRpb25zIG9mIHRoZSBOZ01vZHVsZSAnJHtub2RlLm5hbWUudGV4dH0nLCBidXQgaXMgbm90IGEgZGlyZWN0aXZlLCBhIGNvbXBvbmVudCwgb3IgYSBwaXBlLlxuXG5FaXRoZXIgcmVtb3ZlIGl0IGZyb20gdGhlIE5nTW9kdWxlJ3MgZGVjbGFyYXRpb25zLCBvciBhZGQgYW4gYXBwcm9wcmlhdGUgQW5ndWxhciBkZWNvcmF0b3IuYCxcbiAgICAgICAgICAgIFt7bm9kZTogZGVjbC5ub2RlLm5hbWUsIG1lc3NhZ2VUZXh0OiBgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGRlY2xhcmVkIGhlcmUuYH1dKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAvLyBVc2luZyB0aGUgc2NvcGUgaW5mb3JtYXRpb24sIGV4dGVuZCB0aGUgaW5qZWN0b3IncyBpbXBvcnRzIHVzaW5nIHRoZSBtb2R1bGVzIHRoYXQgYXJlXG4gICAgICAvLyBzcGVjaWZpZWQgYXMgbW9kdWxlIGV4cG9ydHMuXG4gICAgICBjb25zdCBjb250ZXh0ID0gZ2V0U291cmNlRmlsZShub2RlKTtcbiAgICAgIGZvciAoY29uc3QgZXhwb3J0UmVmIG9mIGFuYWx5c2lzLmV4cG9ydHMpIHtcbiAgICAgICAgaWYgKGlzTmdNb2R1bGUoZXhwb3J0UmVmLm5vZGUsIHNjb3BlLmNvbXBpbGF0aW9uKSkge1xuICAgICAgICAgIGRhdGEuaW5qZWN0b3JJbXBvcnRzLnB1c2godGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLCBjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YVJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcblxuICAgICAgICBpZiAobWV0YWRhdGEgIT09IG51bGwgJiYgbWV0YWRhdGEuc2VsZWN0b3IgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgICAgIEVycm9yQ29kZS5ESVJFQ1RJVkVfTUlTU0lOR19TRUxFQ1RPUiwgZGVjbC5ub2RlLFxuICAgICAgICAgICAgICBgRGlyZWN0aXZlICR7ZGVjbC5ub2RlLm5hbWUudGV4dH0gaGFzIG5vIHNlbGVjdG9yLCBwbGVhc2UgYWRkIGl0IWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH1cblxuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5yZWV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGF0YX07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRhdGEsXG4gICAgICAgIHJlZXhwb3J0czogc2NvcGUucmVleHBvcnRzLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBjb21waWxlKFxuICAgICAgbm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFJlYWRvbmx5PE5nTW9kdWxlQW5hbHlzaXM+LFxuICAgICAgcmVzb2x1dGlvbjogUmVhZG9ubHk8TmdNb2R1bGVSZXNvbHV0aW9uPik6IENvbXBpbGVSZXN1bHRbXSB7XG4gICAgLy8gIE1lcmdlIHRoZSBpbmplY3RvciBpbXBvcnRzICh3aGljaCBhcmUgJ2V4cG9ydHMnIHRoYXQgd2VyZSBsYXRlciBmb3VuZCB0byBiZSBOZ01vZHVsZXMpXG4gICAgLy8gIGNvbXB1dGVkIGR1cmluZyByZXNvbHV0aW9uIHdpdGggdGhlIG9uZXMgZnJvbSBhbmFseXNpcy5cbiAgICBjb25zdCBuZ0luamVjdG9yRGVmID0gY29tcGlsZUluamVjdG9yKHtcbiAgICAgIC4uLmFuYWx5c2lzLmluaixcbiAgICAgIGltcG9ydHM6IFsuLi5hbmFseXNpcy5pbmouaW1wb3J0cywgLi4ucmVzb2x1dGlvbi5pbmplY3RvckltcG9ydHNdLFxuICAgIH0pO1xuICAgIGNvbnN0IG5nTW9kdWxlRGVmID0gY29tcGlsZU5nTW9kdWxlKGFuYWx5c2lzLm1vZCk7XG4gICAgY29uc3QgbmdNb2R1bGVTdGF0ZW1lbnRzID0gbmdNb2R1bGVEZWYuYWRkaXRpb25hbFN0YXRlbWVudHM7XG4gICAgaWYgKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCAhPT0gbnVsbCkge1xuICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2goYW5hbHlzaXMubWV0YWRhdGFTdG10KTtcbiAgICB9XG4gICAgY29uc3QgY29udGV4dCA9IGdldFNvdXJjZUZpbGUobm9kZSk7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGFuYWx5c2lzLmRlY2xhcmF0aW9ucykge1xuICAgICAgaWYgKHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRSZXF1aXJlc1JlbW90ZVNjb3BlKGRlY2wubm9kZSkpIHtcbiAgICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0U2NvcGVPZk1vZHVsZSh0cy5nZXRPcmlnaW5hbE5vZGUobm9kZSkgYXMgdHlwZW9mIG5vZGUpO1xuICAgICAgICBpZiAoc2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXJlY3RpdmVzID0gc2NvcGUuY29tcGlsYXRpb24uZGlyZWN0aXZlcy5tYXAoXG4gICAgICAgICAgICBkaXJlY3RpdmUgPT4gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGlyZWN0aXZlLnJlZiwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBwaXBlcyA9IHNjb3BlLmNvbXBpbGF0aW9uLnBpcGVzLm1hcChwaXBlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KHBpcGUucmVmLCBjb250ZXh0KSk7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZUFycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIoZGlyZWN0aXZlcyk7XG4gICAgICAgIGNvbnN0IHBpcGVzQXJyYXkgPSBuZXcgTGl0ZXJhbEFycmF5RXhwcihwaXBlcyk7XG4gICAgICAgIGNvbnN0IGRlY2xFeHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZGVjbCwgY29udGV4dCkgITtcbiAgICAgICAgY29uc3Qgc2V0Q29tcG9uZW50U2NvcGUgPSBuZXcgRXh0ZXJuYWxFeHByKFIzSWRlbnRpZmllcnMuc2V0Q29tcG9uZW50U2NvcGUpO1xuICAgICAgICBjb25zdCBjYWxsRXhwciA9XG4gICAgICAgICAgICBuZXcgSW52b2tlRnVuY3Rpb25FeHByKHNldENvbXBvbmVudFNjb3BlLCBbZGVjbEV4cHIsIGRpcmVjdGl2ZUFycmF5LCBwaXBlc0FycmF5XSk7XG5cbiAgICAgICAgbmdNb2R1bGVTdGF0ZW1lbnRzLnB1c2goY2FsbEV4cHIudG9TdG10KCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCByZXM6IENvbXBpbGVSZXN1bHRbXSA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ8m1bW9kJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nTW9kdWxlRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nTW9kdWxlU3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdNb2R1bGVEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICfJtWluaicsXG4gICAgICAgIGluaXRpYWxpemVyOiBuZ0luamVjdG9yRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nSW5qZWN0b3JEZWYuc3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdJbmplY3RvckRlZi50eXBlLFxuICAgICAgfVxuICAgIF07XG5cbiAgICBpZiAodGhpcy5sb2NhbGVJZCkge1xuICAgICAgcmVzLnB1c2goe1xuICAgICAgICBuYW1lOiAnybVsb2MnLFxuICAgICAgICBpbml0aWFsaXplcjogbmV3IExpdGVyYWxFeHByKHRoaXMubG9jYWxlSWQpLFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgICAgdHlwZTogU1RSSU5HX1RZUEVcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBwcml2YXRlIF90b1IzUmVmZXJlbmNlKFxuICAgICAgdmFsdWVSZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSwgbm9kZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKFxuICAgICAgdHlwZTogdHMuVHlwZU5vZGUsXG4gICAgICBub2RlOiB0cy5GdW5jdGlvbkRlY2xhcmF0aW9ufHRzLk1ldGhvZERlY2xhcmF0aW9ufHRzLkZ1bmN0aW9uRXhwcmVzc2lvbik6IHRzLkV4cHJlc3Npb258bnVsbCB7XG4gICAgLy8gRXhhbWluZSB0aGUgdHlwZSBvZiB0aGUgZnVuY3Rpb24gdG8gc2VlIGlmIGl0J3MgYSBNb2R1bGVXaXRoUHJvdmlkZXJzIHJlZmVyZW5jZS5cbiAgICBpZiAoIXRzLmlzVHlwZVJlZmVyZW5jZU5vZGUodHlwZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHR5cGVOYW1lID0gdHlwZSAmJiAodHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpICYmIHR5cGUudHlwZU5hbWUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLmlzUXVhbGlmaWVkTmFtZSh0eXBlLnR5cGVOYW1lKSAmJiB0eXBlLnR5cGVOYW1lLnJpZ2h0KSB8fFxuICAgICAgICBudWxsO1xuICAgIGlmICh0eXBlTmFtZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gTG9vayBhdCB0aGUgdHlwZSBpdHNlbGYgdG8gc2VlIHdoZXJlIGl0IGNvbWVzIGZyb20uXG4gICAgY29uc3QgaWQgPSB0aGlzLnJlZmxlY3Rvci5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZU5hbWUpO1xuXG4gICAgLy8gSWYgaXQncyBub3QgbmFtZWQgTW9kdWxlV2l0aFByb3ZpZGVycywgYmFpbC5cbiAgICBpZiAoaWQgPT09IG51bGwgfHwgaWQubmFtZSAhPT0gJ01vZHVsZVdpdGhQcm92aWRlcnMnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiBpdCdzIG5vdCBmcm9tIEBhbmd1bGFyL2NvcmUsIGJhaWwuXG4gICAgaWYgKCF0aGlzLmlzQ29yZSAmJiBpZC5mcm9tICE9PSAnQGFuZ3VsYXIvY29yZScpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIElmIHRoZXJlJ3Mgbm8gdHlwZSBwYXJhbWV0ZXIgc3BlY2lmaWVkLCBiYWlsLlxuICAgIGlmICh0eXBlLnR5cGVBcmd1bWVudHMgPT09IHVuZGVmaW5lZCB8fCB0eXBlLnR5cGVBcmd1bWVudHMubGVuZ3RoICE9PSAxKSB7XG4gICAgICBjb25zdCBwYXJlbnQgPVxuICAgICAgICAgIHRzLmlzTWV0aG9kRGVjbGFyYXRpb24obm9kZSkgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKG5vZGUucGFyZW50KSA/IG5vZGUucGFyZW50IDogbnVsbDtcbiAgICAgIGNvbnN0IHN5bWJvbE5hbWUgPSAocGFyZW50ICYmIHBhcmVudC5uYW1lID8gcGFyZW50Lm5hbWUuZ2V0VGV4dCgpICsgJy4nIDogJycpICtcbiAgICAgICAgICAobm9kZS5uYW1lID8gbm9kZS5uYW1lLmdldFRleHQoKSA6ICdhbm9ueW1vdXMnKTtcbiAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfTU9EVUxFX1dJVEhfUFJPVklERVJTX01JU1NJTkdfR0VORVJJQywgdHlwZSxcbiAgICAgICAgICBgJHtzeW1ib2xOYW1lfSByZXR1cm5zIGEgTW9kdWxlV2l0aFByb3ZpZGVycyB0eXBlIHdpdGhvdXQgYSBnZW5lcmljIHR5cGUgYXJndW1lbnQuIGAgK1xuICAgICAgICAgICAgICBgUGxlYXNlIGFkZCBhIGdlbmVyaWMgdHlwZSBhcmd1bWVudCB0byB0aGUgTW9kdWxlV2l0aFByb3ZpZGVycyB0eXBlLiBJZiB0aGlzIGAgK1xuICAgICAgICAgICAgICBgb2NjdXJyZW5jZSBpcyBpbiBsaWJyYXJ5IGNvZGUgeW91IGRvbid0IGNvbnRyb2wsIHBsZWFzZSBjb250YWN0IHRoZSBsaWJyYXJ5IGF1dGhvcnMuYCk7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIHR5cGVOb2RlVG9WYWx1ZUV4cHIoYXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgQXxCfHtuZ01vZHVsZTogVH18Q2AuXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdHMuaXNJbnRlcnNlY3Rpb25UeXBlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdCBvZiB0eXBlLnR5cGVzKSB7XG4gICAgICBpZiAodHMuaXNUeXBlTGl0ZXJhbE5vZGUodCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBtIG9mIHQubWVtYmVycykge1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlVHlwZSA9IHRzLmlzUHJvcGVydHlTaWduYXR1cmUobSkgJiYgdHMuaXNJZGVudGlmaWVyKG0ubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgIG0ubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnICYmIG0udHlwZSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlRXhwcmVzc2lvbiA9IG5nTW9kdWxlVHlwZSAmJiB0eXBlTm9kZVRvVmFsdWVFeHByKG5nTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKG5nTW9kdWxlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5nTW9kdWxlRXhwcmVzc2lvbjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCBhIGB0cy5EZWNsYXJhdGlvbmAgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTpcbiAgICAgIHJlZiBpcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKHJlZi5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlVHlwZUxpc3QoXG4gICAgICBleHByOiB0cy5Ob2RlLCByZXNvbHZlZExpc3Q6IFJlc29sdmVkVmFsdWUsIGNsYXNzTmFtZTogc3RyaW5nLFxuICAgICAgYXJyYXlOYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX0gb2YgJHtjbGFzc05hbWV9YCk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRMaXN0LmZvckVhY2goKGVudHJ5LCBpZHgpID0+IHtcbiAgICAgIC8vIFVud3JhcCBNb2R1bGVXaXRoUHJvdmlkZXJzIGZvciBtb2R1bGVzIHRoYXQgYXJlIGxvY2FsbHkgZGVjbGFyZWQgKGFuZCB0aHVzIHN0YXRpY1xuICAgICAgLy8gcmVzb2x1dGlvbiB3YXMgYWJsZSB0byBkZXNjZW5kIGludG8gdGhlIGZ1bmN0aW9uIGFuZCByZXR1cm4gYW4gb2JqZWN0IGxpdGVyYWwsIGEgTWFwKS5cbiAgICAgIGlmIChlbnRyeSBpbnN0YW5jZW9mIE1hcCAmJiBlbnRyeS5oYXMoJ25nTW9kdWxlJykpIHtcbiAgICAgICAgZW50cnkgPSBlbnRyeS5nZXQoJ25nTW9kdWxlJykgITtcbiAgICAgIH1cblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZW50cnkpKSB7XG4gICAgICAgIC8vIFJlY3Vyc2UgaW50byBuZXN0ZWQgYXJyYXlzLlxuICAgICAgICByZWZMaXN0LnB1c2goLi4udGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZW50cnksIGNsYXNzTmFtZSwgYXJyYXlOYW1lKSk7XG4gICAgICB9IGVsc2UgaWYgKGlzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UoZW50cnkpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgICBFcnJvckNvZGUuVkFMVUVfSEFTX1dST05HX1RZUEUsIGVudHJ5Lm5vZGUsXG4gICAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgY2xhc3NgKTtcbiAgICAgICAgfVxuICAgICAgICByZWZMaXN0LnB1c2goZW50cnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBQcm9kdWNlIGEgYmV0dGVyIGRpYWdub3N0aWMgaGVyZSAtIHRoZSBhcnJheSBpbmRleCBtYXkgYmUgYW4gaW5uZXIgYXJyYXkuXG4gICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICAgIGBWYWx1ZSBhdCBwb3NpdGlvbiAke2lkeH0gaW4gdGhlIE5nTW9kdWxlLiR7YXJyYXlOYW1lfSBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNOZ01vZHVsZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogU2NvcGVEYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiAhY29tcGlsYXRpb24uZGlyZWN0aXZlcy5zb21lKGRpcmVjdGl2ZSA9PiBkaXJlY3RpdmUucmVmLm5vZGUgPT09IG5vZGUpICYmXG4gICAgICAhY29tcGlsYXRpb24ucGlwZXMuc29tZShwaXBlID0+IHBpcGUucmVmLm5vZGUgPT09IG5vZGUpO1xufVxuXG5mdW5jdGlvbiBpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKHJlZjogYW55KTogcmVmIGlzIFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4ge1xuICByZXR1cm4gcmVmIGluc3RhbmNlb2YgUmVmZXJlbmNlICYmXG4gICAgICAodHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fCB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24ocmVmLm5vZGUpIHx8XG4gICAgICAgdHMuaXNWYXJpYWJsZURlY2xhcmF0aW9uKHJlZi5ub2RlKSk7XG59XG4iXX0=