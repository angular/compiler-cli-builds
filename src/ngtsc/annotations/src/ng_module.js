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
        function NgModuleDecoratorHandler(reflector, evaluator, scopeRegistry, referencesRegistry, isCore, routeAnalyzer, refEmitter, defaultImportRecorder) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.scopeRegistry = scopeRegistry;
            this.referencesRegistry = referencesRegistry;
            this.isCore = isCore;
            this.routeAnalyzer = routeAnalyzer;
            this.refEmitter = refEmitter;
            this.defaultImportRecorder = defaultImportRecorder;
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
            // Register this module's information with the LocalModuleScopeRegistry. This ensures that
            // during the compile() phase, the module's metadata is available for selector scope
            // computation.
            this.scopeRegistry.registerNgModule(node, { declarations: declarationRefs, imports: importRefs, exports: exportRefs });
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
                emitInline: false,
                // TODO: to be implemented as a part of FW-1004.
                schemas: [],
            };
            var providers = ngModule.has('providers') ?
                new compiler_1.WrappedNodeExpr(ngModule.get('providers')) :
                new compiler_1.LiteralArrayExpr([]);
            var rawProviders = ngModule.has('providers') ? ngModule.get('providers') : null;
            var injectorImports = [];
            if (ngModule.has('imports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('imports')));
            }
            if (ngModule.has('exports')) {
                injectorImports.push(new compiler_1.WrappedNodeExpr(ngModule.get('exports')));
            }
            if (this.routeAnalyzer !== null) {
                this.routeAnalyzer.add(node.getSourceFile(), name, rawImports, rawExports, rawProviders);
            }
            var ngInjectorDef = {
                name: name,
                type: new compiler_1.WrappedNodeExpr(node.name),
                deps: util_1.getValidConstructorDependencies(node, this.reflector, this.defaultImportRecorder, this.isCore),
                providers: providers,
                imports: new compiler_1.LiteralArrayExpr(injectorImports),
            };
            return {
                analysis: {
                    ngModuleDef: ngModuleDef,
                    ngInjectorDef: ngInjectorDef,
                    declarations: declarationRefs,
                    metadataStmt: metadata_1.generateSetClassMetadataCall(node, this.reflector, this.defaultImportRecorder, this.isCore),
                },
                factorySymbolName: node.name.text,
            };
        };
        NgModuleDecoratorHandler.prototype.resolve = function (node, analysis) {
            var scope = this.scopeRegistry.getScopeOfModule(node);
            var diagnostics = this.scopeRegistry.getDiagnosticsOfModule(node) || undefined;
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
            var e_1, _a;
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
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return [
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
                },
            ];
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
            if (!ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) {
                return null;
            }
            // Look at the type itself to see where it comes from.
            var id = this.reflector.getImportOfIdentifier(type.typeName);
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
            var e_2, _a, e_3, _b;
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
                        catch (e_3_1) { e_3 = { error: e_3_1 }; }
                        finally {
                            try {
                                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                            }
                            finally { if (e_3) throw e_3.error; }
                        }
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
    function isDeclarationReference(ref) {
        return ref instanceof imports_1.Reference &&
            (ts.isClassDeclaration(ref.node) || ts.isFunctionDeclaration(ref.node) ||
                ts.isVariableDeclaration(ref.node));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmdfbW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9hbm5vdGF0aW9ucy9zcmMvbmdfbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILDhDQUFtTztJQUNuTywrQkFBaUM7SUFFakMsMkVBQWtFO0lBQ2xFLG1FQUFpRjtJQUVqRix5RUFBd0g7SUFHeEgsdUVBQWdJO0lBQ2hJLGtGQUF3RDtJQUV4RCxxRkFBd0Q7SUFFeEQsNkVBQWtMO0lBU2xMOzs7O09BSUc7SUFDSDtRQUNFLGtDQUNZLFNBQXlCLEVBQVUsU0FBMkIsRUFDOUQsYUFBdUMsRUFDdkMsa0JBQXNDLEVBQVUsTUFBZSxFQUMvRCxhQUF5QyxFQUFVLFVBQTRCLEVBQy9FLHFCQUE0QztZQUo1QyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1lBQzlELGtCQUFhLEdBQWIsYUFBYSxDQUEwQjtZQUN2Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUMvRCxrQkFBYSxHQUFiLGFBQWEsQ0FBNEI7WUFBVSxlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUMvRSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1lBRS9DLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxPQUFPLENBQUM7UUFGVyxDQUFDO1FBSTVELHlDQUFNLEdBQU4sVUFBTyxJQUFzQixFQUFFLFVBQTRCO1lBQ3pELElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ2YsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFDRCxJQUFNLFNBQVMsR0FBRywyQkFBb0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1RSxJQUFJLFNBQVMsS0FBSyxT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KlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIEludm9rZUZ1bmN0aW9uRXhwciwgTGl0ZXJhbEFycmF5RXhwciwgUjNJZGVudGlmaWVycywgUjNJbmplY3Rvck1ldGFkYXRhLCBSM05nTW9kdWxlTWV0YWRhdGEsIFIzUmVmZXJlbmNlLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUluamVjdG9yLCBjb21waWxlTmdNb2R1bGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgRmF0YWxEaWFnbm9zdGljRXJyb3J9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7RGVmYXVsdEltcG9ydFJlY29yZGVyLCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yLCBSZXNvbHZlZFZhbHVlfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3QsIHJlZmxlY3RPYmplY3RMaXRlcmFsLCB0eXBlTm9kZVRvVmFsdWVFeHByfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7TmdNb2R1bGVSb3V0ZUFuYWx5emVyfSBmcm9tICcuLi8uLi9yb3V0aW5nJztcbmltcG9ydCB7TG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5fSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyLCBEZXRlY3RSZXN1bHQsIEhhbmRsZXJQcmVjZWRlbmNlLCBSZXNvbHZlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtnZW5lcmF0ZVNldENsYXNzTWV0YWRhdGFDYWxsfSBmcm9tICcuL21ldGFkYXRhJztcbmltcG9ydCB7UmVmZXJlbmNlc1JlZ2lzdHJ5fSBmcm9tICcuL3JlZmVyZW5jZXNfcmVnaXN0cnknO1xuaW1wb3J0IHtjb21iaW5lUmVzb2x2ZXJzLCBmaW5kQW5ndWxhckRlY29yYXRvciwgZm9yd2FyZFJlZlJlc29sdmVyLCBnZXRWYWxpZENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlLCB0b1IzUmVmZXJlbmNlLCB1bndyYXBFeHByZXNzaW9ufSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5nTW9kdWxlQW5hbHlzaXMge1xuICBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhO1xuICBuZ0luamVjdG9yRGVmOiBSM0luamVjdG9yTWV0YWRhdGE7XG4gIG1ldGFkYXRhU3RtdDogU3RhdGVtZW50fG51bGw7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG59XG5cbi8qKlxuICogQ29tcGlsZXMgQE5nTW9kdWxlIGFubm90YXRpb25zIHRvIG5nTW9kdWxlRGVmIGZpZWxkcy5cbiAqXG4gKiBUT0RPKGFseGh1Yik6IGhhbmRsZSBpbmplY3RvciBzaWRlIG9mIHRoaW5ncyBhcyB3ZWxsLlxuICovXG5leHBvcnQgY2xhc3MgTmdNb2R1bGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxOZ01vZHVsZUFuYWx5c2lzLCBEZWNvcmF0b3I+IHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yLFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnksXG4gICAgICBwcml2YXRlIHJlZmVyZW5jZXNSZWdpc3RyeTogUmVmZXJlbmNlc1JlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbixcbiAgICAgIHByaXZhdGUgcm91dGVBbmFseXplcjogTmdNb2R1bGVSb3V0ZUFuYWx5emVyfG51bGwsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgZGVmYXVsdEltcG9ydFJlY29yZGVyOiBEZWZhdWx0SW1wb3J0UmVjb3JkZXIpIHt9XG5cbiAgcmVhZG9ubHkgcHJlY2VkZW5jZSA9IEhhbmRsZXJQcmVjZWRlbmNlLlBSSU1BUlk7XG5cbiAgZGV0ZWN0KG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcnM6IERlY29yYXRvcltdfG51bGwpOiBEZXRlY3RSZXN1bHQ8RGVjb3JhdG9yPnx1bmRlZmluZWQge1xuICAgIGlmICghZGVjb3JhdG9ycykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY29uc3QgZGVjb3JhdG9yID0gZmluZEFuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9ycywgJ05nTW9kdWxlJywgdGhpcy5pc0NvcmUpO1xuICAgIGlmIChkZWNvcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJpZ2dlcjogZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgIG1ldGFkYXRhOiBkZWNvcmF0b3IsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxOZ01vZHVsZUFuYWx5c2lzPiB7XG4gICAgY29uc3QgbmFtZSA9IG5vZGUubmFtZS50ZXh0O1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCB8fCBkZWNvcmF0b3IuYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgRmF0YWxEaWFnbm9zdGljRXJyb3IoXG4gICAgICAgICAgRXJyb3JDb2RlLkRFQ09SQVRPUl9BUklUWV9XUk9ORywgZGVjb3JhdG9yLm5vZGUsXG4gICAgICAgICAgYEluY29ycmVjdCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIEBOZ01vZHVsZSBkZWNvcmF0b3JgKTtcbiAgICB9XG5cbiAgICAvLyBATmdNb2R1bGUgY2FuIGJlIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMuIEluIGNhc2UgaXQgaXMsIHByZXRlbmQgYXMgaWYgYSBibGFuayBvYmplY3RcbiAgICAvLyBsaXRlcmFsIHdhcyBzcGVjaWZpZWQuIFRoaXMgc2ltcGxpZmllcyB0aGUgY29kZSBiZWxvdy5cbiAgICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3MubGVuZ3RoID09PSAxID8gdW53cmFwRXhwcmVzc2lvbihkZWNvcmF0b3IuYXJnc1swXSkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5jcmVhdGVPYmplY3RMaXRlcmFsKFtdKTtcblxuICAgIGlmICghdHMuaXNPYmplY3RMaXRlcmFsRXhwcmVzc2lvbihtZXRhKSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5ERUNPUkFUT1JfQVJHX05PVF9MSVRFUkFMLCBtZXRhLFxuICAgICAgICAgICdATmdNb2R1bGUgYXJndW1lbnQgbXVzdCBiZSBhbiBvYmplY3QgbGl0ZXJhbCcpO1xuICAgIH1cbiAgICBjb25zdCBuZ01vZHVsZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKG5nTW9kdWxlLmhhcygnaml0JykpIHtcbiAgICAgIC8vIFRoZSBvbmx5IGFsbG93ZWQgdmFsdWUgaXMgdHJ1ZSwgc28gdGhlcmUncyBubyBuZWVkIHRvIGV4cGFuZCBmdXJ0aGVyLlxuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdmVycyA9IGNvbWJpbmVSZXNvbHZlcnMoW1xuICAgICAgcmVmID0+IHRoaXMuX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKHJlZi5ub2RlKSxcbiAgICAgIGZvcndhcmRSZWZSZXNvbHZlcixcbiAgICBdKTtcblxuICAgIC8vIEV4dHJhY3QgdGhlIG1vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzLlxuICAgIGxldCBkZWNsYXJhdGlvblJlZnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdID0gW107XG4gICAgaWYgKG5nTW9kdWxlLmhhcygnZGVjbGFyYXRpb25zJykpIHtcbiAgICAgIGNvbnN0IGV4cHIgPSBuZ01vZHVsZS5nZXQoJ2RlY2xhcmF0aW9ucycpICE7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbk1ldGEgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShleHByLCBmb3J3YXJkUmVmUmVzb2x2ZXIpO1xuICAgICAgZGVjbGFyYXRpb25SZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgZGVjbGFyYXRpb25NZXRhLCBuYW1lLCAnZGVjbGFyYXRpb25zJyk7XG4gICAgfVxuICAgIGxldCBpbXBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdJbXBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2ltcG9ydHMnKSkge1xuICAgICAgcmF3SW1wb3J0cyA9IG5nTW9kdWxlLmdldCgnaW1wb3J0cycpICE7XG4gICAgICBjb25zdCBpbXBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0ltcG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBpbXBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3SW1wb3J0cywgaW1wb3J0c01ldGEsIG5hbWUsICdpbXBvcnRzJyk7XG4gICAgfVxuICAgIGxldCBleHBvcnRSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGxldCByYXdFeHBvcnRzOiB0cy5FeHByZXNzaW9ufG51bGwgPSBudWxsO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2V4cG9ydHMnKSkge1xuICAgICAgcmF3RXhwb3J0cyA9IG5nTW9kdWxlLmdldCgnZXhwb3J0cycpICE7XG4gICAgICBjb25zdCBleHBvcnRzTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKHJhd0V4cG9ydHMsIG1vZHVsZVJlc29sdmVycyk7XG4gICAgICBleHBvcnRSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QocmF3RXhwb3J0cywgZXhwb3J0c01ldGEsIG5hbWUsICdleHBvcnRzJyk7XG4gICAgICB0aGlzLnJlZmVyZW5jZXNSZWdpc3RyeS5hZGQobm9kZSwgLi4uZXhwb3J0UmVmcyk7XG4gICAgfVxuICAgIGxldCBib290c3RyYXBSZWZzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSA9IFtdO1xuICAgIGlmIChuZ01vZHVsZS5oYXMoJ2Jvb3RzdHJhcCcpKSB7XG4gICAgICBjb25zdCBleHByID0gbmdNb2R1bGUuZ2V0KCdib290c3RyYXAnKSAhO1xuICAgICAgY29uc3QgYm9vdHN0cmFwTWV0YSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGV4cHIsIGZvcndhcmRSZWZSZXNvbHZlcik7XG4gICAgICBib290c3RyYXBSZWZzID0gdGhpcy5yZXNvbHZlVHlwZUxpc3QoZXhwciwgYm9vdHN0cmFwTWV0YSwgbmFtZSwgJ2Jvb3RzdHJhcCcpO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIHRoaXMgbW9kdWxlJ3MgaW5mb3JtYXRpb24gd2l0aCB0aGUgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5LiBUaGlzIGVuc3VyZXMgdGhhdFxuICAgIC8vIGR1cmluZyB0aGUgY29tcGlsZSgpIHBoYXNlLCB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEgaXMgYXZhaWxhYmxlIGZvciBzZWxlY3RvciBzY29wZVxuICAgIC8vIGNvbXB1dGF0aW9uLlxuICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3Rlck5nTW9kdWxlKFxuICAgICAgICBub2RlLCB7ZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvblJlZnMsIGltcG9ydHM6IGltcG9ydFJlZnMsIGV4cG9ydHM6IGV4cG9ydFJlZnN9KTtcblxuICAgIGNvbnN0IHZhbHVlQ29udGV4dCA9IG5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgbGV0IHR5cGVDb250ZXh0ID0gdmFsdWVDb250ZXh0O1xuICAgIGNvbnN0IHR5cGVOb2RlID0gdGhpcy5yZWZsZWN0b3IuZ2V0RHRzRGVjbGFyYXRpb24obm9kZSk7XG4gICAgaWYgKHR5cGVOb2RlICE9PSBudWxsKSB7XG4gICAgICB0eXBlQ29udGV4dCA9IHR5cGVOb2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICB9XG5cbiAgICBjb25zdCBib290c3RyYXAgPVxuICAgICAgICBib290c3RyYXBSZWZzLm1hcChib290c3RyYXAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShib290c3RyYXAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcbiAgICBjb25zdCBkZWNsYXJhdGlvbnMgPVxuICAgICAgICBkZWNsYXJhdGlvblJlZnMubWFwKGRlY2wgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShkZWNsLCB2YWx1ZUNvbnRleHQsIHR5cGVDb250ZXh0KSk7XG4gICAgY29uc3QgaW1wb3J0cyA9IGltcG9ydFJlZnMubWFwKGltcCA9PiB0aGlzLl90b1IzUmVmZXJlbmNlKGltcCwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCkpO1xuICAgIGNvbnN0IGV4cG9ydHMgPSBleHBvcnRSZWZzLm1hcChleHAgPT4gdGhpcy5fdG9SM1JlZmVyZW5jZShleHAsIHZhbHVlQ29udGV4dCwgdHlwZUNvbnRleHQpKTtcblxuICAgIGNvbnN0IGlzRm9yd2FyZFJlZmVyZW5jZSA9IChyZWY6IFIzUmVmZXJlbmNlKSA9PlxuICAgICAgICBpc0V4cHJlc3Npb25Gb3J3YXJkUmVmZXJlbmNlKHJlZi52YWx1ZSwgbm9kZS5uYW1lICEsIHZhbHVlQ29udGV4dCk7XG4gICAgY29uc3QgY29udGFpbnNGb3J3YXJkRGVjbHMgPSBib290c3RyYXAuc29tZShpc0ZvcndhcmRSZWZlcmVuY2UpIHx8XG4gICAgICAgIGRlY2xhcmF0aW9ucy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHwgaW1wb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSkgfHxcbiAgICAgICAgZXhwb3J0cy5zb21lKGlzRm9yd2FyZFJlZmVyZW5jZSk7XG5cbiAgICBjb25zdCBuZ01vZHVsZURlZjogUjNOZ01vZHVsZU1ldGFkYXRhID0ge1xuICAgICAgdHlwZTogbmV3IFdyYXBwZWROb2RlRXhwcihub2RlLm5hbWUpLFxuICAgICAgYm9vdHN0cmFwLFxuICAgICAgZGVjbGFyYXRpb25zLFxuICAgICAgZXhwb3J0cyxcbiAgICAgIGltcG9ydHMsXG4gICAgICBjb250YWluc0ZvcndhcmREZWNscyxcbiAgICAgIGVtaXRJbmxpbmU6IGZhbHNlLFxuICAgICAgLy8gVE9ETzogdG8gYmUgaW1wbGVtZW50ZWQgYXMgYSBwYXJ0IG9mIEZXLTEwMDQuXG4gICAgICBzY2hlbWFzOiBbXSxcbiAgICB9O1xuXG4gICAgY29uc3QgcHJvdmlkZXJzOiBFeHByZXNzaW9uID0gbmdNb2R1bGUuaGFzKCdwcm92aWRlcnMnKSA/XG4gICAgICAgIG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhKSA6XG4gICAgICAgIG5ldyBMaXRlcmFsQXJyYXlFeHByKFtdKTtcbiAgICBjb25zdCByYXdQcm92aWRlcnMgPSBuZ01vZHVsZS5oYXMoJ3Byb3ZpZGVycycpID8gbmdNb2R1bGUuZ2V0KCdwcm92aWRlcnMnKSAhIDogbnVsbDtcblxuICAgIGNvbnN0IGluamVjdG9ySW1wb3J0czogV3JhcHBlZE5vZGVFeHByPHRzLkV4cHJlc3Npb24+W10gPSBbXTtcbiAgICBpZiAobmdNb2R1bGUuaGFzKCdpbXBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdpbXBvcnRzJykgISkpO1xuICAgIH1cbiAgICBpZiAobmdNb2R1bGUuaGFzKCdleHBvcnRzJykpIHtcbiAgICAgIGluamVjdG9ySW1wb3J0cy5wdXNoKG5ldyBXcmFwcGVkTm9kZUV4cHIobmdNb2R1bGUuZ2V0KCdleHBvcnRzJykgISkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJvdXRlQW5hbHl6ZXIgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucm91dGVBbmFseXplci5hZGQobm9kZS5nZXRTb3VyY2VGaWxlKCksIG5hbWUsIHJhd0ltcG9ydHMsIHJhd0V4cG9ydHMsIHJhd1Byb3ZpZGVycyk7XG4gICAgfVxuXG4gICAgY29uc3QgbmdJbmplY3RvckRlZjogUjNJbmplY3Rvck1ldGFkYXRhID0ge1xuICAgICAgbmFtZSxcbiAgICAgIHR5cGU6IG5ldyBXcmFwcGVkTm9kZUV4cHIobm9kZS5uYW1lKSxcbiAgICAgIGRlcHM6IGdldFZhbGlkQ29uc3RydWN0b3JEZXBlbmRlbmNpZXMoXG4gICAgICAgICAgbm9kZSwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuZGVmYXVsdEltcG9ydFJlY29yZGVyLCB0aGlzLmlzQ29yZSksXG4gICAgICBwcm92aWRlcnMsXG4gICAgICBpbXBvcnRzOiBuZXcgTGl0ZXJhbEFycmF5RXhwcihpbmplY3RvckltcG9ydHMpLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgYW5hbHlzaXM6IHtcbiAgICAgICAgbmdNb2R1bGVEZWYsXG4gICAgICAgIG5nSW5qZWN0b3JEZWYsXG4gICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25SZWZzLFxuICAgICAgICBtZXRhZGF0YVN0bXQ6IGdlbmVyYXRlU2V0Q2xhc3NNZXRhZGF0YUNhbGwoXG4gICAgICAgICAgICBub2RlLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5kZWZhdWx0SW1wb3J0UmVjb3JkZXIsIHRoaXMuaXNDb3JlKSxcbiAgICAgIH0sXG4gICAgICBmYWN0b3J5U3ltYm9sTmFtZTogbm9kZS5uYW1lLnRleHQsXG4gICAgfTtcbiAgfVxuXG4gIHJlc29sdmUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBSZXNvbHZlUmVzdWx0IHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMuc2NvcGVSZWdpc3RyeS5nZXRTY29wZU9mTW9kdWxlKG5vZGUpO1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldERpYWdub3N0aWNzT2ZNb2R1bGUobm9kZSkgfHwgdW5kZWZpbmVkO1xuICAgIGlmIChzY29wZSA9PT0gbnVsbCB8fCBzY29wZS5yZWV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiB7ZGlhZ25vc3RpY3N9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBkaWFnbm9zdGljcyxcbiAgICAgICAgcmVleHBvcnRzOiBzY29wZS5yZWV4cG9ydHMsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IE5nTW9kdWxlQW5hbHlzaXMpOiBDb21waWxlUmVzdWx0W10ge1xuICAgIGNvbnN0IG5nSW5qZWN0b3JEZWYgPSBjb21waWxlSW5qZWN0b3IoYW5hbHlzaXMubmdJbmplY3RvckRlZik7XG4gICAgY29uc3QgbmdNb2R1bGVEZWYgPSBjb21waWxlTmdNb2R1bGUoYW5hbHlzaXMubmdNb2R1bGVEZWYpO1xuICAgIGNvbnN0IG5nTW9kdWxlU3RhdGVtZW50cyA9IG5nTW9kdWxlRGVmLmFkZGl0aW9uYWxTdGF0ZW1lbnRzO1xuICAgIGlmIChhbmFseXNpcy5tZXRhZGF0YVN0bXQgIT09IG51bGwpIHtcbiAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGFuYWx5c2lzLm1ldGFkYXRhU3RtdCk7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRleHQgPSBnZXRTb3VyY2VGaWxlKG5vZGUpO1xuICAgIGZvciAoY29uc3QgZGVjbCBvZiBhbmFseXNpcy5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGlmICh0aGlzLnNjb3BlUmVnaXN0cnkuZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShkZWNsLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5zY29wZVJlZ2lzdHJ5LmdldFNjb3BlT2ZNb2R1bGUodHMuZ2V0T3JpZ2luYWxOb2RlKG5vZGUpIGFzIHR5cGVvZiBub2RlKTtcbiAgICAgICAgaWYgKHNjb3BlID09PSBudWxsKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlcyA9IHNjb3BlLmNvbXBpbGF0aW9uLmRpcmVjdGl2ZXMubWFwKFxuICAgICAgICAgICAgZGlyZWN0aXZlID0+IHRoaXMucmVmRW1pdHRlci5lbWl0KGRpcmVjdGl2ZS5yZWYsIGNvbnRleHQpKTtcbiAgICAgICAgY29uc3QgcGlwZXMgPSBzY29wZS5jb21waWxhdGlvbi5waXBlcy5tYXAocGlwZSA9PiB0aGlzLnJlZkVtaXR0ZXIuZW1pdChwaXBlLnJlZiwgY29udGV4dCkpO1xuICAgICAgICBjb25zdCBkaXJlY3RpdmVBcnJheSA9IG5ldyBMaXRlcmFsQXJyYXlFeHByKGRpcmVjdGl2ZXMpO1xuICAgICAgICBjb25zdCBwaXBlc0FycmF5ID0gbmV3IExpdGVyYWxBcnJheUV4cHIocGlwZXMpO1xuICAgICAgICBjb25zdCBkZWNsRXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGRlY2wsIGNvbnRleHQpICE7XG4gICAgICAgIGNvbnN0IHNldENvbXBvbmVudFNjb3BlID0gbmV3IEV4dGVybmFsRXhwcihSM0lkZW50aWZpZXJzLnNldENvbXBvbmVudFNjb3BlKTtcbiAgICAgICAgY29uc3QgY2FsbEV4cHIgPVxuICAgICAgICAgICAgbmV3IEludm9rZUZ1bmN0aW9uRXhwcihzZXRDb21wb25lbnRTY29wZSwgW2RlY2xFeHByLCBkaXJlY3RpdmVBcnJheSwgcGlwZXNBcnJheV0pO1xuXG4gICAgICAgIG5nTW9kdWxlU3RhdGVtZW50cy5wdXNoKGNhbGxFeHByLnRvU3RtdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ25nTW9kdWxlRGVmJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nTW9kdWxlRGVmLmV4cHJlc3Npb24sXG4gICAgICAgIHN0YXRlbWVudHM6IG5nTW9kdWxlU3RhdGVtZW50cyxcbiAgICAgICAgdHlwZTogbmdNb2R1bGVEZWYudHlwZSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICduZ0luamVjdG9yRGVmJyxcbiAgICAgICAgaW5pdGlhbGl6ZXI6IG5nSW5qZWN0b3JEZWYuZXhwcmVzc2lvbixcbiAgICAgICAgc3RhdGVtZW50czogbmdJbmplY3RvckRlZi5zdGF0ZW1lbnRzLFxuICAgICAgICB0eXBlOiBuZ0luamVjdG9yRGVmLnR5cGUsXG4gICAgICB9LFxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIF90b1IzUmVmZXJlbmNlKFxuICAgICAgdmFsdWVSZWY6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sIHZhbHVlQ29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIHR5cGVDb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogUjNSZWZlcmVuY2Uge1xuICAgIGlmICh2YWx1ZVJlZi5oYXNPd25pbmdNb2R1bGVHdWVzcykge1xuICAgICAgcmV0dXJuIHRvUjNSZWZlcmVuY2UodmFsdWVSZWYsIHZhbHVlUmVmLCB2YWx1ZUNvbnRleHQsIHZhbHVlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHR5cGVSZWYgPSB2YWx1ZVJlZjtcbiAgICAgIGxldCB0eXBlTm9kZSA9IHRoaXMucmVmbGVjdG9yLmdldER0c0RlY2xhcmF0aW9uKHR5cGVSZWYubm9kZSk7XG4gICAgICBpZiAodHlwZU5vZGUgIT09IG51bGwgJiYgdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHR5cGVOb2RlKSkge1xuICAgICAgICB0eXBlUmVmID0gbmV3IFJlZmVyZW5jZSh0eXBlTm9kZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9SM1JlZmVyZW5jZSh2YWx1ZVJlZiwgdHlwZVJlZiwgdmFsdWVDb250ZXh0LCB0eXBlQ29udGV4dCwgdGhpcy5yZWZFbWl0dGVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBgRnVuY3Rpb25EZWNsYXJhdGlvbmAsIGBNZXRob2REZWNsYXJhdGlvbmAgb3IgYEZ1bmN0aW9uRXhwcmVzc2lvbmAsIGNoZWNrIGlmIGl0IGlzXG4gICAqIHR5cGVkIGFzIGEgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGFuZCByZXR1cm4gYW4gZXhwcmVzc2lvbiByZWZlcmVuY2luZyB0aGUgbW9kdWxlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHByaXZhdGUgX2V4dHJhY3RNb2R1bGVGcm9tTW9kdWxlV2l0aFByb3ZpZGVyc0ZuKG5vZGU6IHRzLkZ1bmN0aW9uRGVjbGFyYXRpb258XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzLk1ldGhvZERlY2xhcmF0aW9ufFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cy5GdW5jdGlvbkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IHR5cGUgPSBub2RlLnR5cGUgfHwgbnVsbDtcbiAgICByZXR1cm4gdHlwZSAmJlxuICAgICAgICAodGhpcy5fcmVmbGVjdE1vZHVsZUZyb21UeXBlUGFyYW0odHlwZSkgfHwgdGhpcy5fcmVmbGVjdE1vZHVsZUZyb21MaXRlcmFsVHlwZSh0eXBlKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gYE5nTW9kdWxlYCBpZGVudGlmaWVyIChUKSBmcm9tIHRoZSBzcGVjaWZpZWQgYHR5cGVgLCBpZiBpdCBpcyBvZiB0aGUgZm9ybTpcbiAgICogYE1vZHVsZVdpdGhQcm92aWRlcnM8VD5gXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tVHlwZVBhcmFtKHR5cGU6IHRzLlR5cGVOb2RlKTogdHMuRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBFeGFtaW5lIHRoZSB0eXBlIG9mIHRoZSBmdW5jdGlvbiB0byBzZWUgaWYgaXQncyBhIE1vZHVsZVdpdGhQcm92aWRlcnMgcmVmZXJlbmNlLlxuICAgIGlmICghdHMuaXNUeXBlUmVmZXJlbmNlTm9kZSh0eXBlKSB8fCAhdHMuaXNJZGVudGlmaWVyKHR5cGUudHlwZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBMb29rIGF0IHRoZSB0eXBlIGl0c2VsZiB0byBzZWUgd2hlcmUgaXQgY29tZXMgZnJvbS5cbiAgICBjb25zdCBpZCA9IHRoaXMucmVmbGVjdG9yLmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlLnR5cGVOYW1lKTtcblxuICAgIC8vIElmIGl0J3Mgbm90IG5hbWVkIE1vZHVsZVdpdGhQcm92aWRlcnMsIGJhaWwuXG4gICAgaWYgKGlkID09PSBudWxsIHx8IGlkLm5hbWUgIT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gSWYgaXQncyBub3QgZnJvbSBAYW5ndWxhci9jb3JlLCBiYWlsLlxuICAgIGlmICghdGhpcy5pc0NvcmUgJiYgaWQuZnJvbSAhPT0gJ0Bhbmd1bGFyL2NvcmUnKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGVyZSdzIG5vIHR5cGUgcGFyYW1ldGVyIHNwZWNpZmllZCwgYmFpbC5cbiAgICBpZiAodHlwZS50eXBlQXJndW1lbnRzID09PSB1bmRlZmluZWQgfHwgdHlwZS50eXBlQXJndW1lbnRzLmxlbmd0aCAhPT0gMSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgYXJnID0gdHlwZS50eXBlQXJndW1lbnRzWzBdO1xuXG4gICAgcmV0dXJuIHR5cGVOb2RlVG9WYWx1ZUV4cHIoYXJnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBgTmdNb2R1bGVgIGlkZW50aWZpZXIgKFQpIGZyb20gdGhlIHNwZWNpZmllZCBgdHlwZWAsIGlmIGl0IGlzIG9mIHRoZSBmb3JtOlxuICAgKiBgQXxCfHtuZ01vZHVsZTogVH18Q2AuXG4gICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIHRvIHJlZmxlY3Qgb24uXG4gICAqIEByZXR1cm5zIHRoZSBpZGVudGlmaWVyIG9mIHRoZSBOZ01vZHVsZSB0eXBlIGlmIGZvdW5kLCBvciBudWxsIG90aGVyd2lzZS5cbiAgICovXG4gIHByaXZhdGUgX3JlZmxlY3RNb2R1bGVGcm9tTGl0ZXJhbFR5cGUodHlwZTogdHMuVHlwZU5vZGUpOiB0cy5FeHByZXNzaW9ufG51bGwge1xuICAgIGlmICghdHMuaXNJbnRlcnNlY3Rpb25UeXBlTm9kZSh0eXBlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGZvciAoY29uc3QgdCBvZiB0eXBlLnR5cGVzKSB7XG4gICAgICBpZiAodHMuaXNUeXBlTGl0ZXJhbE5vZGUodCkpIHtcbiAgICAgICAgZm9yIChjb25zdCBtIG9mIHQubWVtYmVycykge1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlVHlwZSA9IHRzLmlzUHJvcGVydHlTaWduYXR1cmUobSkgJiYgdHMuaXNJZGVudGlmaWVyKG0ubmFtZSkgJiZcbiAgICAgICAgICAgICAgICAgIG0ubmFtZS50ZXh0ID09PSAnbmdNb2R1bGUnICYmIG0udHlwZSB8fFxuICAgICAgICAgICAgICBudWxsO1xuICAgICAgICAgIGNvbnN0IG5nTW9kdWxlRXhwcmVzc2lvbiA9IG5nTW9kdWxlVHlwZSAmJiB0eXBlTm9kZVRvVmFsdWVFeHByKG5nTW9kdWxlVHlwZSk7XG4gICAgICAgICAgaWYgKG5nTW9kdWxlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5nTW9kdWxlRXhwcmVzc2lvbjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBWZXJpZnkgdGhhdCBhIGB0cy5EZWNsYXJhdGlvbmAgcmVmZXJlbmNlIGlzIGEgYENsYXNzRGVjbGFyYXRpb25gIHJlZmVyZW5jZS5cbiAgcHJpdmF0ZSBpc0NsYXNzRGVjbGFyYXRpb25SZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTpcbiAgICAgIHJlZiBpcyBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIHJldHVybiB0aGlzLnJlZmxlY3Rvci5pc0NsYXNzKHJlZi5ub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlIGEgbGlzdCBvZiBgUmVmZXJlbmNlYHMgZnJvbSBhIHJlc29sdmVkIG1ldGFkYXRhIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSByZXNvbHZlVHlwZUxpc3QoXG4gICAgICBleHByOiB0cy5Ob2RlLCByZXNvbHZlZExpc3Q6IFJlc29sdmVkVmFsdWUsIGNsYXNzTmFtZTogc3RyaW5nLFxuICAgICAgYXJyYXlOYW1lOiBzdHJpbmcpOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXSB7XG4gICAgY29uc3QgcmVmTGlzdDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W10gPSBbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzb2x2ZWRMaXN0KSkge1xuICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgIEVycm9yQ29kZS5WQUxVRV9IQVNfV1JPTkdfVFlQRSwgZXhwcixcbiAgICAgICAgICBgRXhwZWN0ZWQgYXJyYXkgd2hlbiByZWFkaW5nIHByb3BlcnR5ICR7YXJyYXlOYW1lfWApO1xuICAgIH1cblxuICAgIHJlc29sdmVkTGlzdC5mb3JFYWNoKChlbnRyeSwgaWR4KSA9PiB7XG4gICAgICAvLyBVbndyYXAgTW9kdWxlV2l0aFByb3ZpZGVycyBmb3IgbW9kdWxlcyB0aGF0IGFyZSBsb2NhbGx5IGRlY2xhcmVkIChhbmQgdGh1cyBzdGF0aWNcbiAgICAgIC8vIHJlc29sdXRpb24gd2FzIGFibGUgdG8gZGVzY2VuZCBpbnRvIHRoZSBmdW5jdGlvbiBhbmQgcmV0dXJuIGFuIG9iamVjdCBsaXRlcmFsLCBhIE1hcCkuXG4gICAgICBpZiAoZW50cnkgaW5zdGFuY2VvZiBNYXAgJiYgZW50cnkuaGFzKCduZ01vZHVsZScpKSB7XG4gICAgICAgIGVudHJ5ID0gZW50cnkuZ2V0KCduZ01vZHVsZScpICE7XG4gICAgICB9XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGVudHJ5KSkge1xuICAgICAgICAvLyBSZWN1cnNlIGludG8gbmVzdGVkIGFycmF5cy5cbiAgICAgICAgcmVmTGlzdC5wdXNoKC4uLnRoaXMucmVzb2x2ZVR5cGVMaXN0KGV4cHIsIGVudHJ5LCBjbGFzc05hbWUsIGFycmF5TmFtZSkpO1xuICAgICAgfSBlbHNlIGlmIChpc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDbGFzc0RlY2xhcmF0aW9uUmVmZXJlbmNlKGVudHJ5KSkge1xuICAgICAgICAgIHRocm93IG5ldyBGYXRhbERpYWdub3N0aWNFcnJvcihcbiAgICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBlbnRyeS5ub2RlLFxuICAgICAgICAgICAgICBgVmFsdWUgYXQgcG9zaXRpb24gJHtpZHh9IGluIHRoZSBOZ01vZHVsZS4ke2FycmF5TmFtZX1zIG9mICR7Y2xhc3NOYW1lfSBpcyBub3QgYSBjbGFzc2ApO1xuICAgICAgICB9XG4gICAgICAgIHJlZkxpc3QucHVzaChlbnRyeSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IFByb2R1Y2UgYSBiZXR0ZXIgZGlhZ25vc3RpYyBoZXJlIC0gdGhlIGFycmF5IGluZGV4IG1heSBiZSBhbiBpbm5lciBhcnJheS5cbiAgICAgICAgdGhyb3cgbmV3IEZhdGFsRGlhZ25vc3RpY0Vycm9yKFxuICAgICAgICAgICAgRXJyb3JDb2RlLlZBTFVFX0hBU19XUk9OR19UWVBFLCBleHByLFxuICAgICAgICAgICAgYFZhbHVlIGF0IHBvc2l0aW9uICR7aWR4fSBpbiB0aGUgTmdNb2R1bGUuJHthcnJheU5hbWV9cyBvZiAke2NsYXNzTmFtZX0gaXMgbm90IGEgcmVmZXJlbmNlOiAke2VudHJ5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlZkxpc3Q7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNEZWNsYXJhdGlvblJlZmVyZW5jZShyZWY6IGFueSk6IHJlZiBpcyBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+IHtcbiAgcmV0dXJuIHJlZiBpbnN0YW5jZW9mIFJlZmVyZW5jZSAmJlxuICAgICAgKHRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkgfHwgdHMuaXNGdW5jdGlvbkRlY2xhcmF0aW9uKHJlZi5ub2RlKSB8fFxuICAgICAgIHRzLmlzVmFyaWFibGVEZWNsYXJhdGlvbihyZWYubm9kZSkpO1xufVxuIl19