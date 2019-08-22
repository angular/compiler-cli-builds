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
        define("@angular/compiler-cli/src/ngtsc/scope/src/local", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/scope/src/component_scope"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var component_scope_1 = require("@angular/compiler-cli/src/ngtsc/scope/src/component_scope");
    /**
     * A registry which collects information about NgModules, Directives, Components, and Pipes which
     * are local (declared in the ts.Program being compiled), and can produce `LocalModuleScope`s
     * which summarize the compilation scope of a component.
     *
     * This class implements the logic of NgModule declarations, imports, and exports and can produce,
     * for a given component, the set of directives and pipes which are "visible" in that component's
     * template.
     *
     * The `LocalModuleScopeRegistry` has two "modes" of operation. During analysis, data for each
     * individual NgModule, Directive, Component, and Pipe is added to the registry. No attempt is made
     * to traverse or validate the NgModule graph (imports, exports, etc). After analysis, one of
     * `getScopeOfModule` or `getScopeForComponent` can be called, which traverses the NgModule graph
     * and applies the NgModule logic to generate a `LocalModuleScope`, the full scope for the given
     * module or component.
     *
     * The `LocalModuleScopeRegistry` is also capable of producing `ts.Diagnostic` errors when Angular
     * semantics are violated.
     */
    var LocalModuleScopeRegistry = /** @class */ (function () {
        function LocalModuleScopeRegistry(localReader, dependencyScopeReader, refEmitter, aliasGenerator, componentScopeRegistry) {
            if (componentScopeRegistry === void 0) { componentScopeRegistry = new component_scope_1.NoopComponentScopeRegistry(); }
            this.localReader = localReader;
            this.dependencyScopeReader = dependencyScopeReader;
            this.refEmitter = refEmitter;
            this.aliasGenerator = aliasGenerator;
            this.componentScopeRegistry = componentScopeRegistry;
            /**
             * Tracks whether the registry has been asked to produce scopes for a module or component. Once
             * this is true, the registry cannot accept registrations of new directives/pipes/modules as it
             * would invalidate the cached scope data.
             */
            this.sealed = false;
            /**
             * A map of components from the current compilation unit to the NgModule which declared them.
             *
             * As components and directives are not distinguished at the NgModule level, this map may also
             * contain directives. This doesn't cause any problems but isn't useful as there is no concept of
             * a directive's compilation scope.
             */
            this.declarationToModule = new Map();
            this.moduleToRef = new Map();
            /**
             * A cache of calculated `LocalModuleScope`s for each NgModule declared in the current program.
             *
             * A value of `undefined` indicates the scope was invalid and produced errors (therefore,
             * diagnostics should exist in the `scopeErrors` map).
             */
            this.cache = new Map();
            /**
             * Tracks whether a given component requires "remote scoping".
             *
             * Remote scoping is when the set of directives which apply to a given component is set in the
             * NgModule's file instead of directly on the ngComponentDef (which is sometimes needed to get
             * around cyclic import issues). This is not used in calculation of `LocalModuleScope`s, but is
             * tracked here for convenience.
             */
            this.remoteScoping = new Set();
            /**
             * Tracks errors accumulated in the processing of scopes for each module declaration.
             */
            this.scopeErrors = new Map();
        }
        /**
         * Add an NgModule's data to the registry.
         */
        LocalModuleScopeRegistry.prototype.registerNgModuleMetadata = function (data) {
            var e_1, _a;
            this.assertCollecting();
            this.moduleToRef.set(data.ref.node, data.ref);
            try {
                for (var _b = tslib_1.__values(data.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    this.declarationToModule.set(decl.node, data.ref.node);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        LocalModuleScopeRegistry.prototype.registerAbstractDirective = function (clazz) { };
        LocalModuleScopeRegistry.prototype.registerDirectiveMetadata = function (directive) { };
        LocalModuleScopeRegistry.prototype.registerPipeMetadata = function (pipe) { };
        LocalModuleScopeRegistry.prototype.getScopeForComponent = function (clazz) {
            var scope = !this.declarationToModule.has(clazz) ?
                null :
                this.getScopeOfModule(this.declarationToModule.get(clazz));
            if (scope !== null) {
                this.componentScopeRegistry.registerComponentScope(clazz, scope);
            }
            return scope;
        };
        /**
         * Collects registered data for a module and its directives/pipes and convert it into a full
         * `LocalModuleScope`.
         *
         * This method implements the logic of NgModule imports and exports. It returns the
         * `LocalModuleScope` for the given NgModule if one can be produced, and `null` if no scope is
         * available or the scope contains errors.
         */
        LocalModuleScopeRegistry.prototype.getScopeOfModule = function (clazz) {
            var scope = this.moduleToRef.has(clazz) ?
                this.getScopeOfModuleReference(this.moduleToRef.get(clazz)) :
                null;
            // Translate undefined -> null.
            return scope !== undefined ? scope : null;
        };
        /**
         * Retrieves any `ts.Diagnostic`s produced during the calculation of the `LocalModuleScope` for
         * the given NgModule, or `null` if no errors were present.
         */
        LocalModuleScopeRegistry.prototype.getDiagnosticsOfModule = function (clazz) {
            // Required to ensure the errors are populated for the given class. If it has been processed
            // before, this will be a no-op due to the scope cache.
            this.getScopeOfModule(clazz);
            if (this.scopeErrors.has(clazz)) {
                return this.scopeErrors.get(clazz);
            }
            else {
                return null;
            }
        };
        /**
         * Returns a collection of the compilation scope for each registered declaration.
         */
        LocalModuleScopeRegistry.prototype.getCompilationScopes = function () {
            var _this = this;
            var scopes = [];
            this.declarationToModule.forEach(function (ngModule, declaration) {
                var scope = _this.getScopeOfModule(ngModule);
                if (scope !== null) {
                    scopes.push(tslib_1.__assign({ declaration: declaration, ngModule: ngModule }, scope.compilation));
                }
            });
            return scopes;
        };
        /**
         * Implementation of `getScopeOfModule` which accepts a reference to a class and differentiates
         * between:
         *
         * * no scope being available (returns `null`)
         * * a scope being produced with errors (returns `undefined`).
         */
        LocalModuleScopeRegistry.prototype.getScopeOfModuleReference = function (ref) {
            var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e, e_7, _f, e_8, _g, e_9, _h, e_10, _j;
            var _this = this;
            if (this.cache.has(ref.node)) {
                return this.cache.get(ref.node);
            }
            // Seal the registry to protect the integrity of the `LocalModuleScope` cache.
            this.sealed = true;
            // `ref` should be an NgModule previously added to the registry. If not, a scope for it
            // cannot be produced.
            var ngModule = this.localReader.getNgModuleMetadata(ref);
            if (ngModule === null) {
                this.cache.set(ref.node, null);
                return null;
            }
            // Errors produced during computation of the scope are recorded here. At the end, if this array
            // isn't empty then `undefined` will be cached and returned to indicate this scope is invalid.
            var diagnostics = [];
            // At this point, the goal is to produce two distinct transitive sets:
            // - the directives and pipes which are visible to components declared in the NgModule.
            // - the directives and pipes which are exported to any NgModules which import this one.
            // Directives and pipes in the compilation scope.
            var compilationDirectives = new Map();
            var compilationPipes = new Map();
            var declared = new Set();
            var sourceFile = ref.node.getSourceFile();
            // Directives and pipes exported to any importing NgModules.
            var exportDirectives = new Map();
            var exportPipes = new Map();
            try {
                // The algorithm is as follows:
                // 1) Add directives/pipes declared in the NgModule to the compilation scope.
                // 2) Add all of the directives/pipes from each NgModule imported into the current one to the
                //    compilation scope. At this point, the compilation scope is complete.
                // 3) For each entry in the NgModule's exports:
                //    a) Attempt to resolve it as an NgModule with its own exported directives/pipes. If it is
                //       one, add them to the export scope of this NgModule.
                //    b) Otherwise, it should be a class in the compilation scope of this NgModule. If it is,
                //       add it to the export scope.
                //    c) If it's neither an NgModule nor a directive/pipe in the compilation scope, then this
                //       is an error.
                // 1) add declarations.
                for (var _k = tslib_1.__values(ngModule.declarations), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var decl = _l.value;
                    var directive = this.localReader.getDirectiveMetadata(decl);
                    var pipe = this.localReader.getPipeMetadata(decl);
                    if (directive !== null) {
                        compilationDirectives.set(decl.node, tslib_1.__assign({}, directive, { ref: decl }));
                    }
                    else if (pipe !== null) {
                        compilationPipes.set(decl.node, tslib_1.__assign({}, pipe, { ref: decl }));
                    }
                    else {
                        // TODO(alxhub): produce a ts.Diagnostic. This can't be an error right now since some
                        // ngtools tests rely on analysis of broken components.
                        continue;
                    }
                    declared.add(decl.node);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_a = _k.return)) _a.call(_k);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // 2) process imports.
                for (var _m = tslib_1.__values(ngModule.imports), _o = _m.next(); !_o.done; _o = _m.next()) {
                    var decl = _o.value;
                    var importScope = this.getExportedScope(decl, diagnostics, ref.node, 'import');
                    if (importScope === null) {
                        // An import wasn't an NgModule, so record an error.
                        diagnostics.push(invalidRef(ref.node, decl, 'import'));
                        continue;
                    }
                    else if (importScope === undefined) {
                        // An import was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its imports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, 'import'));
                        continue;
                    }
                    try {
                        for (var _p = (e_4 = void 0, tslib_1.__values(importScope.exported.directives)), _q = _p.next(); !_q.done; _q = _p.next()) {
                            var directive = _q.value;
                            compilationDirectives.set(directive.ref.node, directive);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_q && !_q.done && (_c = _p.return)) _c.call(_p);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    try {
                        for (var _r = (e_5 = void 0, tslib_1.__values(importScope.exported.pipes)), _s = _r.next(); !_s.done; _s = _r.next()) {
                            var pipe = _s.value;
                            compilationPipes.set(pipe.ref.node, pipe);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_s && !_s.done && (_d = _r.return)) _d.call(_r);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_o && !_o.done && (_b = _m.return)) _b.call(_m);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                // 3) process exports.
                // Exports can contain modules, components, or directives. They're processed differently.
                // Modules are straightforward. Directives and pipes from exported modules are added to the
                // export maps. Directives/pipes are different - they might be exports of declared types or
                // imported types.
                for (var _t = tslib_1.__values(ngModule.exports), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var decl = _u.value;
                    // Attempt to resolve decl as an NgModule.
                    var importScope = this.getExportedScope(decl, diagnostics, ref.node, 'export');
                    if (importScope === undefined) {
                        // An export was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its exports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, 'export'));
                        continue;
                    }
                    else if (importScope !== null) {
                        try {
                            // decl is an NgModule.
                            for (var _v = (e_7 = void 0, tslib_1.__values(importScope.exported.directives)), _w = _v.next(); !_w.done; _w = _v.next()) {
                                var directive = _w.value;
                                exportDirectives.set(directive.ref.node, directive);
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_w && !_w.done && (_f = _v.return)) _f.call(_v);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                        try {
                            for (var _x = (e_8 = void 0, tslib_1.__values(importScope.exported.pipes)), _y = _x.next(); !_y.done; _y = _x.next()) {
                                var pipe = _y.value;
                                exportPipes.set(pipe.ref.node, pipe);
                            }
                        }
                        catch (e_8_1) { e_8 = { error: e_8_1 }; }
                        finally {
                            try {
                                if (_y && !_y.done && (_g = _x.return)) _g.call(_x);
                            }
                            finally { if (e_8) throw e_8.error; }
                        }
                    }
                    else if (compilationDirectives.has(decl.node)) {
                        // decl is a directive or component in the compilation scope of this NgModule.
                        var directive = compilationDirectives.get(decl.node);
                        exportDirectives.set(decl.node, directive);
                    }
                    else if (compilationPipes.has(decl.node)) {
                        // decl is a pipe in the compilation scope of this NgModule.
                        var pipe = compilationPipes.get(decl.node);
                        exportPipes.set(decl.node, pipe);
                    }
                    else {
                        // decl is an unknown export.
                        if (this.localReader.getDirectiveMetadata(decl) !== null ||
                            this.localReader.getPipeMetadata(decl) !== null) {
                            diagnostics.push(invalidReexport(ref.node, decl));
                        }
                        else {
                            diagnostics.push(invalidRef(ref.node, decl, 'export'));
                        }
                        continue;
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_e = _t.return)) _e.call(_t);
                }
                finally { if (e_6) throw e_6.error; }
            }
            var exported = {
                directives: Array.from(exportDirectives.values()),
                pipes: Array.from(exportPipes.values()),
            };
            var reexports = null;
            if (this.aliasGenerator !== null) {
                reexports = [];
                var addReexport = function (ref) {
                    if (!declared.has(ref.node) && ref.node.getSourceFile() !== sourceFile) {
                        var exportName = _this.aliasGenerator.aliasSymbolName(ref.node, sourceFile);
                        if (ref.alias && ref.alias instanceof compiler_1.ExternalExpr) {
                            reexports.push({
                                fromModule: ref.alias.value.moduleName,
                                symbolName: ref.alias.value.name,
                                asAlias: exportName,
                            });
                        }
                        else {
                            var expr = _this.refEmitter.emit(ref.cloneWithNoIdentifiers(), sourceFile);
                            if (!(expr instanceof compiler_1.ExternalExpr) || expr.value.moduleName === null ||
                                expr.value.name === null) {
                                throw new Error('Expected ExternalExpr');
                            }
                            reexports.push({
                                fromModule: expr.value.moduleName,
                                symbolName: expr.value.name,
                                asAlias: exportName,
                            });
                        }
                    }
                };
                try {
                    for (var _z = tslib_1.__values(exported.directives), _0 = _z.next(); !_0.done; _0 = _z.next()) {
                        var ref_1 = _0.value.ref;
                        addReexport(ref_1);
                    }
                }
                catch (e_9_1) { e_9 = { error: e_9_1 }; }
                finally {
                    try {
                        if (_0 && !_0.done && (_h = _z.return)) _h.call(_z);
                    }
                    finally { if (e_9) throw e_9.error; }
                }
                try {
                    for (var _1 = tslib_1.__values(exported.pipes), _2 = _1.next(); !_2.done; _2 = _1.next()) {
                        var ref_2 = _2.value.ref;
                        addReexport(ref_2);
                    }
                }
                catch (e_10_1) { e_10 = { error: e_10_1 }; }
                finally {
                    try {
                        if (_2 && !_2.done && (_j = _1.return)) _j.call(_1);
                    }
                    finally { if (e_10) throw e_10.error; }
                }
            }
            // Check if this scope had any errors during production.
            if (diagnostics.length > 0) {
                // Cache undefined, to mark the fact that the scope is invalid.
                this.cache.set(ref.node, undefined);
                // Save the errors for retrieval.
                this.scopeErrors.set(ref.node, diagnostics);
                // Return undefined to indicate the scope is invalid.
                this.cache.set(ref.node, undefined);
                return undefined;
            }
            // Finally, produce the `LocalModuleScope` with both the compilation and export scopes.
            var scope = {
                compilation: {
                    directives: Array.from(compilationDirectives.values()),
                    pipes: Array.from(compilationPipes.values()),
                },
                exported: exported,
                reexports: reexports,
                schemas: ngModule.schemas,
            };
            this.cache.set(ref.node, scope);
            return scope;
        };
        /**
         * Check whether a component requires remote scoping.
         */
        LocalModuleScopeRegistry.prototype.getRequiresRemoteScope = function (node) { return this.remoteScoping.has(node); };
        /**
         * Set a component as requiring remote scoping.
         */
        LocalModuleScopeRegistry.prototype.setComponentAsRequiringRemoteScoping = function (node) {
            this.remoteScoping.add(node);
            this.componentScopeRegistry.setComponentAsRequiringRemoteScoping(node);
        };
        /**
         * Look up the `ExportScope` of a given `Reference` to an NgModule.
         *
         * The NgModule in question may be declared locally in the current ts.Program, or it may be
         * declared in a .d.ts file.
         *
         * @returns `null` if no scope could be found, or `undefined` if an invalid scope
         * was found.
         *
         * May also contribute diagnostics of its own by adding to the given `diagnostics`
         * array parameter.
         */
        LocalModuleScopeRegistry.prototype.getExportedScope = function (ref, diagnostics, ownerForErrors, type) {
            if (ref.node.getSourceFile().isDeclarationFile) {
                // The NgModule is declared in a .d.ts file. Resolve it with the `DependencyScopeReader`.
                if (!ts.isClassDeclaration(ref.node)) {
                    // The NgModule is in a .d.ts file but is not declared as a ts.ClassDeclaration. This is an
                    // error in the .d.ts metadata.
                    var code = type === 'import' ? diagnostics_1.ErrorCode.NGMODULE_INVALID_IMPORT :
                        diagnostics_1.ErrorCode.NGMODULE_INVALID_EXPORT;
                    diagnostics.push(diagnostics_1.makeDiagnostic(code, typescript_1.identifierOfNode(ref.node) || ref.node, "Appears in the NgModule." + type + "s of " + typescript_1.nodeNameForError(ownerForErrors) + ", but could not be resolved to an NgModule"));
                    return undefined;
                }
                return this.dependencyScopeReader.resolve(ref);
            }
            else {
                // The NgModule is declared locally in the current program. Resolve it from the registry.
                return this.getScopeOfModuleReference(ref);
            }
        };
        LocalModuleScopeRegistry.prototype.assertCollecting = function () {
            if (this.sealed) {
                throw new Error("Assertion: LocalModuleScopeRegistry is not COLLECTING");
            }
        };
        return LocalModuleScopeRegistry;
    }());
    exports.LocalModuleScopeRegistry = LocalModuleScopeRegistry;
    /**
     * Produce a `ts.Diagnostic` for an invalid import or export from an NgModule.
     */
    function invalidRef(clazz, decl, type) {
        var code = type === 'import' ? diagnostics_1.ErrorCode.NGMODULE_INVALID_IMPORT : diagnostics_1.ErrorCode.NGMODULE_INVALID_EXPORT;
        var resolveTarget = type === 'import' ? 'NgModule' : 'NgModule, Component, Directive, or Pipe';
        return diagnostics_1.makeDiagnostic(code, typescript_1.identifierOfNode(decl.node) || decl.node, "Appears in the NgModule." + type + "s of " + typescript_1.nodeNameForError(clazz) + ", but could not be resolved to an " + resolveTarget + " class");
    }
    /**
     * Produce a `ts.Diagnostic` for an import or export which itself has errors.
     */
    function invalidTransitiveNgModuleRef(clazz, decl, type) {
        var code = type === 'import' ? diagnostics_1.ErrorCode.NGMODULE_INVALID_IMPORT : diagnostics_1.ErrorCode.NGMODULE_INVALID_EXPORT;
        return diagnostics_1.makeDiagnostic(code, typescript_1.identifierOfNode(decl.node) || decl.node, "Appears in the NgModule." + type + "s of " + typescript_1.nodeNameForError(clazz) + ", but itself has errors");
    }
    /**
     * Produce a `ts.Diagnostic` for an exported directive or pipe which was not declared or imported
     * by the NgModule in question.
     */
    function invalidReexport(clazz, decl) {
        return diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_REEXPORT, typescript_1.identifierOfNode(decl.node) || decl.node, "Present in the NgModule.exports of " + typescript_1.nodeNameForError(clazz) + " but neither declared nor imported");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Q7SUFDL0QsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCxrRkFBNkU7SUFHN0UsNkZBQTJHO0lBeUIzRzs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUEwQ0Usa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxjQUFtQyxFQUN6RSxzQkFBaUY7WUFBakYsdUNBQUEsRUFBQSw2QkFBcUQsNENBQTBCLEVBQUU7WUFGakYsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtZQUNsRixlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFxQjtZQUN6RSwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJEO1lBNUM3Rjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztZQUVwRSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO1lBRS9FOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFDO1lBRTdFOzs7Ozs7O2VBT0c7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBRXBEOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztRQUs2QixDQUFDO1FBRWpHOztXQUVHO1FBQ0gsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOztZQUN6QyxJQUFJLENBQUMsZ0JBQWdCLEVB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U0FBUyxlQUFlLENBQUMsS0FBcUIsRUFBRSxJQUErQjtRQUM3RSxPQUFPLDRCQUFjLENBQ2pCLHVCQUFTLENBQUMseUJBQXlCLEVBQUUsNkJBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQzdFLHdDQUFzQyw2QkFBZ0IsQ0FBQyxLQUFLLENBQUMsdUNBQW9DLENBQUMsQ0FBQztJQUN6RyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4dGVybmFsRXhwciwgU2NoZW1hTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgbWFrZURpYWdub3N0aWN9IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWxpYXNHZW5lcmF0b3IsIFJlZXhwb3J0LCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aWRlbnRpZmllck9mTm9kZSwgbm9kZU5hbWVGb3JFcnJvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXhwb3J0U2NvcGUsIFNjb3BlRGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgQ29tcG9uZW50U2NvcGVSZWdpc3RyeSwgTm9vcENvbXBvbmVudFNjb3BlUmVnaXN0cnl9IGZyb20gJy4vY29tcG9uZW50X3Njb3BlJztcbmltcG9ydCB7RHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmN5JztcblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE5nTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE1vZHVsZVNjb3BlIGV4dGVuZHMgRXhwb3J0U2NvcGUge1xuICBjb21waWxhdGlvbjogU2NvcGVEYXRhO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbDtcbiAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXTtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSByZWdpc3RlcmVkIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGF0aW9uU2NvcGUgZXh0ZW5kcyBTY29wZURhdGEge1xuICAvKiogVGhlIGRlY2xhcmF0aW9uIHdob3NlIGNvbXBpbGF0aW9uIHNjb3BlIGlzIGRlc2NyaWJlZCBoZXJlLiAqL1xuICBkZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbjtcbiAgLyoqIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgTmdNb2R1bGUgdGhhdCBkZWNsYXJlcyB0aGlzIGBkZWNsYXJhdGlvbmAuICovXG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIEEgcmVnaXN0cnkgd2hpY2ggY29sbGVjdHMgaW5mb3JtYXRpb24gYWJvdXQgTmdNb2R1bGVzLCBEaXJlY3RpdmVzLCBDb21wb25lbnRzLCBhbmQgUGlwZXMgd2hpY2hcbiAqIGFyZSBsb2NhbCAoZGVjbGFyZWQgaW4gdGhlIHRzLlByb2dyYW0gYmVpbmcgY29tcGlsZWQpLCBhbmQgY2FuIHByb2R1Y2UgYExvY2FsTW9kdWxlU2NvcGVgc1xuICogd2hpY2ggc3VtbWFyaXplIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudC5cbiAqXG4gKiBUaGlzIGNsYXNzIGltcGxlbWVudHMgdGhlIGxvZ2ljIG9mIE5nTW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMgYW5kIGNhbiBwcm9kdWNlLFxuICogZm9yIGEgZ2l2ZW4gY29tcG9uZW50LCB0aGUgc2V0IG9mIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBcInZpc2libGVcIiBpbiB0aGF0IGNvbXBvbmVudCdzXG4gKiB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWAgaGFzIHR3byBcIm1vZGVzXCIgb2Ygb3BlcmF0aW9uLiBEdXJpbmcgYW5hbHlzaXMsIGRhdGEgZm9yIGVhY2hcbiAqIGluZGl2aWR1YWwgTmdNb2R1bGUsIERpcmVjdGl2ZSwgQ29tcG9uZW50LCBhbmQgUGlwZSBpcyBhZGRlZCB0byB0aGUgcmVnaXN0cnkuIE5vIGF0dGVtcHQgaXMgbWFkZVxuICogdG8gdHJhdmVyc2Ugb3IgdmFsaWRhdGUgdGhlIE5nTW9kdWxlIGdyYXBoIChpbXBvcnRzLCBleHBvcnRzLCBldGMpLiBBZnRlciBhbmFseXNpcywgb25lIG9mXG4gKiBgZ2V0U2NvcGVPZk1vZHVsZWAgb3IgYGdldFNjb3BlRm9yQ29tcG9uZW50YCBjYW4gYmUgY2FsbGVkLCB3aGljaCB0cmF2ZXJzZXMgdGhlIE5nTW9kdWxlIGdyYXBoXG4gKiBhbmQgYXBwbGllcyB0aGUgTmdNb2R1bGUgbG9naWMgdG8gZ2VuZXJhdGUgYSBgTG9jYWxNb2R1bGVTY29wZWAsIHRoZSBmdWxsIHNjb3BlIGZvciB0aGUgZ2l2ZW5cbiAqIG1vZHVsZSBvciBjb21wb25lbnQuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGlzIGFsc28gY2FwYWJsZSBvZiBwcm9kdWNpbmcgYHRzLkRpYWdub3N0aWNgIGVycm9ycyB3aGVuIEFuZ3VsYXJcbiAqIHNlbWFudGljcyBhcmUgdmlvbGF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaW1wbGVtZW50cyBNZXRhZGF0YVJlZ2lzdHJ5LCBDb21wb25lbnRTY29wZVJlYWRlciB7XG4gIC8qKlxuICAgKiBUcmFja3Mgd2hldGhlciB0aGUgcmVnaXN0cnkgaGFzIGJlZW4gYXNrZWQgdG8gcHJvZHVjZSBzY29wZXMgZm9yIGEgbW9kdWxlIG9yIGNvbXBvbmVudC4gT25jZVxuICAgKiB0aGlzIGlzIHRydWUsIHRoZSByZWdpc3RyeSBjYW5ub3QgYWNjZXB0IHJlZ2lzdHJhdGlvbnMgb2YgbmV3IGRpcmVjdGl2ZXMvcGlwZXMvbW9kdWxlcyBhcyBpdFxuICAgKiB3b3VsZCBpbnZhbGlkYXRlIHRoZSBjYWNoZWQgc2NvcGUgZGF0YS5cbiAgICovXG4gIHByaXZhdGUgc2VhbGVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGNvbXBvbmVudHMgZnJvbSB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZSBOZ01vZHVsZSB3aGljaCBkZWNsYXJlZCB0aGVtLlxuICAgKlxuICAgKiBBcyBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGFyZSBub3QgZGlzdGluZ3Vpc2hlZCBhdCB0aGUgTmdNb2R1bGUgbGV2ZWwsIHRoaXMgbWFwIG1heSBhbHNvXG4gICAqIGNvbnRhaW4gZGlyZWN0aXZlcy4gVGhpcyBkb2Vzbid0IGNhdXNlIGFueSBwcm9ibGVtcyBidXQgaXNuJ3QgdXNlZnVsIGFzIHRoZXJlIGlzIG5vIGNvbmNlcHQgb2ZcbiAgICogYSBkaXJlY3RpdmUncyBjb21waWxhdGlvbiBzY29wZS5cbiAgICovXG4gIHByaXZhdGUgZGVjbGFyYXRpb25Ub01vZHVsZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICBwcml2YXRlIG1vZHVsZVRvUmVmID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG5cbiAgLyoqXG4gICAqIEEgY2FjaGUgb2YgY2FsY3VsYXRlZCBgTG9jYWxNb2R1bGVTY29wZWBzIGZvciBlYWNoIE5nTW9kdWxlIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IHByb2dyYW0uXG4gICAqXG4gICAqIEEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaW5kaWNhdGVzIHRoZSBzY29wZSB3YXMgaW52YWxpZCBhbmQgcHJvZHVjZWQgZXJyb3JzICh0aGVyZWZvcmUsXG4gICAqIGRpYWdub3N0aWNzIHNob3VsZCBleGlzdCBpbiB0aGUgYHNjb3BlRXJyb3JzYCBtYXApLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTG9jYWxNb2R1bGVTY29wZXx1bmRlZmluZWR8bnVsbD4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgYSBnaXZlbiBjb21wb25lbnQgcmVxdWlyZXMgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgKlxuICAgKiBSZW1vdGUgc2NvcGluZyBpcyB3aGVuIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyB3aGljaCBhcHBseSB0byBhIGdpdmVuIGNvbXBvbmVudCBpcyBzZXQgaW4gdGhlXG4gICAqIE5nTW9kdWxlJ3MgZmlsZSBpbnN0ZWFkIG9mIGRpcmVjdGx5IG9uIHRoZSBuZ0NvbXBvbmVudERlZiAod2hpY2ggaXMgc29tZXRpbWVzIG5lZWRlZCB0byBnZXRcbiAgICogYXJvdW5kIGN5Y2xpYyBpbXBvcnQgaXNzdWVzKS4gVGhpcyBpcyBub3QgdXNlZCBpbiBjYWxjdWxhdGlvbiBvZiBgTG9jYWxNb2R1bGVTY29wZWBzLCBidXQgaXNcbiAgICogdHJhY2tlZCBoZXJlIGZvciBjb252ZW5pZW5jZS5cbiAgICovXG4gIHByaXZhdGUgcmVtb3RlU2NvcGluZyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGVycm9ycyBhY2N1bXVsYXRlZCBpbiB0aGUgcHJvY2Vzc2luZyBvZiBzY29wZXMgZm9yIGVhY2ggbW9kdWxlIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzY29wZUVycm9ycyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRGlhZ25vc3RpY1tdPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBsb2NhbFJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIHByaXZhdGUgZGVwZW5kZW5jeVNjb3BlUmVhZGVyOiBEdHNNb2R1bGVTY29wZVJlc29sdmVyLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIGFsaWFzR2VuZXJhdG9yOiBBbGlhc0dlbmVyYXRvcnxudWxsLFxuICAgICAgcHJpdmF0ZSBjb21wb25lbnRTY29wZVJlZ2lzdHJ5OiBDb21wb25lbnRTY29wZVJlZ2lzdHJ5ID0gbmV3IE5vb3BDb21wb25lbnRTY29wZVJlZ2lzdHJ5KCkpIHt9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBOZ01vZHVsZSdzIGRhdGEgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKGRhdGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0Q29sbGVjdGluZygpO1xuICAgIHRoaXMubW9kdWxlVG9SZWYuc2V0KGRhdGEucmVmLm5vZGUsIGRhdGEucmVmKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGF0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5zZXQoZGVjbC5ub2RlLCBkYXRhLnJlZi5ub2RlKTtcbiAgICB9XG4gIH1cblxuICByZWdpc3RlckFic3RyYWN0RGlyZWN0aXZlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7fVxuXG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7fVxuXG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKHBpcGU6IFBpcGVNZXRhKTogdm9pZCB7fVxuXG4gIGdldFNjb3BlRm9yQ29tcG9uZW50KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICBjb25zdCBzY29wZSA9ICF0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuaGFzKGNsYXp6KSA/XG4gICAgICAgIG51bGwgOlxuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUodGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChjbGF6eikgISk7XG4gICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICB0aGlzLmNvbXBvbmVudFNjb3BlUmVnaXN0cnkucmVnaXN0ZXJDb21wb25lbnRTY29wZShjbGF6eiwgc2NvcGUpO1xuICAgIH1cbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBhbmQgYG51bGxgIGlmIG5vIHNjb3BlIGlzXG4gICAqIGF2YWlsYWJsZSBvciB0aGUgc2NvcGUgY29udGFpbnMgZXJyb3JzLlxuICAgKi9cbiAgZ2V0U2NvcGVPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLm1vZHVsZVRvUmVmLmhhcyhjbGF6eikgP1xuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UodGhpcy5tb2R1bGVUb1JlZi5nZXQoY2xhenopICEpIDpcbiAgICAgICAgbnVsbDtcbiAgICAvLyBUcmFuc2xhdGUgdW5kZWZpbmVkIC0+IG51bGwuXG4gICAgcmV0dXJuIHNjb3BlICE9PSB1bmRlZmluZWQgPyBzY29wZSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGFueSBgdHMuRGlhZ25vc3RpY2BzIHByb2R1Y2VkIGR1cmluZyB0aGUgY2FsY3VsYXRpb24gb2YgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCBmb3JcbiAgICogdGhlIGdpdmVuIE5nTW9kdWxlLCBvciBgbnVsbGAgaWYgbm8gZXJyb3JzIHdlcmUgcHJlc2VudC5cbiAgICovXG4gIGdldERpYWdub3N0aWNzT2ZNb2R1bGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW118bnVsbCB7XG4gICAgLy8gUmVxdWlyZWQgdG8gZW5zdXJlIHRoZSBlcnJvcnMgYXJlIHBvcHVsYXRlZCBmb3IgdGhlIGdpdmVuIGNsYXNzLiBJZiBpdCBoYXMgYmVlbiBwcm9jZXNzZWRcbiAgICAvLyBiZWZvcmUsIHRoaXMgd2lsbCBiZSBhIG5vLW9wIGR1ZSB0byB0aGUgc2NvcGUgY2FjaGUuXG4gICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlKGNsYXp6KTtcblxuICAgIGlmICh0aGlzLnNjb3BlRXJyb3JzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlRXJyb3JzLmdldChjbGF6eikgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb2xsZWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbiBzY29wZSBmb3IgZWFjaCByZWdpc3RlcmVkIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0Q29tcGlsYXRpb25TY29wZXMoKTogQ29tcGlsYXRpb25TY29wZVtdIHtcbiAgICBjb25zdCBzY29wZXM6IENvbXBpbGF0aW9uU2NvcGVbXSA9IFtdO1xuICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5mb3JFYWNoKChuZ01vZHVsZSwgZGVjbGFyYXRpb24pID0+IHtcbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRTY29wZU9mTW9kdWxlKG5nTW9kdWxlKTtcbiAgICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgICBzY29wZXMucHVzaCh7ZGVjbGFyYXRpb24sIG5nTW9kdWxlLCAuLi5zY29wZS5jb21waWxhdGlvbn0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzY29wZXM7XG4gIH1cblxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgYGdldFNjb3BlT2ZNb2R1bGVgIHdoaWNoIGFjY2VwdHMgYSByZWZlcmVuY2UgdG8gYSBjbGFzcyBhbmQgZGlmZmVyZW50aWF0ZXNcbiAgICogYmV0d2VlbjpcbiAgICpcbiAgICogKiBubyBzY29wZSBiZWluZyBhdmFpbGFibGUgKHJldHVybnMgYG51bGxgKVxuICAgKiAqIGEgc2NvcGUgYmVpbmcgcHJvZHVjZWQgd2l0aCBlcnJvcnMgKHJldHVybnMgYHVuZGVmaW5lZGApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTG9jYWxNb2R1bGVTY29wZXxudWxsXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQocmVmLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIFNlYWwgdGhlIHJlZ2lzdHJ5IHRvIHByb3RlY3QgdGhlIGludGVncml0eSBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGNhY2hlLlxuICAgIHRoaXMuc2VhbGVkID0gdHJ1ZTtcblxuICAgIC8vIGByZWZgIHNob3VsZCBiZSBhbiBOZ01vZHVsZSBwcmV2aW91c2x5IGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gSWYgbm90LCBhIHNjb3BlIGZvciBpdFxuICAgIC8vIGNhbm5vdCBiZSBwcm9kdWNlZC5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWYpO1xuICAgIGlmIChuZ01vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIG51bGwpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uUGlwZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcblxuICAgIGNvbnN0IGRlY2xhcmVkID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgcGlwZXMgZXhwb3J0ZWQgdG8gYW55IGltcG9ydGluZyBOZ01vZHVsZXMuXG4gICAgY29uc3QgZXhwb3J0RGlyZWN0aXZlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgY29uc3QgZXhwb3J0UGlwZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcblxuICAgIC8vIFRoZSBhbGdvcml0aG0gaXMgYXMgZm9sbG93czpcbiAgICAvLyAxKSBBZGQgZGlyZWN0aXZlcy9waXBlcyBkZWNsYXJlZCBpbiB0aGUgTmdNb2R1bGUgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIC8vIDIpIEFkZCBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSBlYWNoIE5nTW9kdWxlIGltcG9ydGVkIGludG8gdGhlIGN1cnJlbnQgb25lIHRvIHRoZVxuICAgIC8vICAgIGNvbXBpbGF0aW9uIHNjb3BlLiBBdCB0aGlzIHBvaW50LCB0aGUgY29tcGlsYXRpb24gc2NvcGUgaXMgY29tcGxldGUuXG4gICAgLy8gMykgRm9yIGVhY2ggZW50cnkgaW4gdGhlIE5nTW9kdWxlJ3MgZXhwb3J0czpcbiAgICAvLyAgICBhKSBBdHRlbXB0IHRvIHJlc29sdmUgaXQgYXMgYW4gTmdNb2R1bGUgd2l0aCBpdHMgb3duIGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMuIElmIGl0IGlzXG4gICAgLy8gICAgICAgb25lLCBhZGQgdGhlbSB0byB0aGUgZXhwb3J0IHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgLy8gICAgYikgT3RoZXJ3aXNlLCBpdCBzaG91bGQgYmUgYSBjbGFzcyBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS4gSWYgaXQgaXMsXG4gICAgLy8gICAgICAgYWRkIGl0IHRvIHRoZSBleHBvcnQgc2NvcGUuXG4gICAgLy8gICAgYykgSWYgaXQncyBuZWl0aGVyIGFuIE5nTW9kdWxlIG5vciBhIGRpcmVjdGl2ZS9waXBlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSwgdGhlbiB0aGlzXG4gICAgLy8gICAgICAgaXMgYW4gZXJyb3IuXG5cbiAgICAvLyAxKSBhZGQgZGVjbGFyYXRpb25zLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBuZ01vZHVsZS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG4gICAgICBjb25zdCBwaXBlID0gdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCk7XG4gICAgICBpZiAoZGlyZWN0aXZlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGVjbC5ub2RlLCB7Li4uZGlyZWN0aXZlLCByZWY6IGRlY2x9KTtcbiAgICAgIH0gZWxzZSBpZiAocGlwZSAhPT0gbnVsbCkge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChkZWNsLm5vZGUsIHsuLi5waXBlLCByZWY6IGRlY2x9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8oYWx4aHViKTogcHJvZHVjZSBhIHRzLkRpYWdub3N0aWMuIFRoaXMgY2FuJ3QgYmUgYW4gZXJyb3IgcmlnaHQgbm93IHNpbmNlIHNvbWVcbiAgICAgICAgLy8gbmd0b29scyB0ZXN0cyByZWx5IG9uIGFuYWx5c2lzIG9mIGJyb2tlbiBjb21wb25lbnRzLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGVjbGFyZWQuYWRkKGRlY2wubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gMikgcHJvY2VzcyBpbXBvcnRzLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBuZ01vZHVsZS5pbXBvcnRzKSB7XG4gICAgICBjb25zdCBpbXBvcnRTY29wZSA9IHRoaXMuZ2V0RXhwb3J0ZWRTY29wZShkZWNsLCBkaWFnbm9zdGljcywgcmVmLm5vZGUsICdpbXBvcnQnKTtcbiAgICAgIGlmIChpbXBvcnRTY29wZSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBBbiBpbXBvcnQgd2Fzbid0IGFuIE5nTW9kdWxlLCBzbyByZWNvcmQgYW4gZXJyb3IuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZihyZWYubm9kZSwgZGVjbCwgJ2ltcG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGltcG9ydFNjb3BlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQW4gaW1wb3J0IHdhcyBhbiBOZ01vZHVsZSBidXQgY29udGFpbmVkIGVycm9ycyBvZiBpdHMgb3duLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvciB0b28sXG4gICAgICAgIC8vIGJlY2F1c2UgdGhpcyBzY29wZSBpcyBhbHdheXMgZ29pbmcgdG8gYmUgaW5jb3JyZWN0IGlmIG9uZSBvZiBpdHMgaW1wb3J0cyBjb3VsZCBub3QgYmVcbiAgICAgICAgLy8gcmVhZC5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKHJlZi5ub2RlLCBkZWNsLCAnaW1wb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgY29tcGlsYXRpb25EaXJlY3RpdmVzLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHBpcGUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgICAgY29tcGlsYXRpb25QaXBlcy5zZXQocGlwZS5yZWYubm9kZSwgcGlwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMykgcHJvY2VzcyBleHBvcnRzLlxuICAgIC8vIEV4cG9ydHMgY2FuIGNvbnRhaW4gbW9kdWxlcywgY29tcG9uZW50cywgb3IgZGlyZWN0aXZlcy4gVGhleSdyZSBwcm9jZXNzZWQgZGlmZmVyZW50bHkuXG4gICAgLy8gTW9kdWxlcyBhcmUgc3RyYWlnaHRmb3J3YXJkLiBEaXJlY3RpdmVzIGFuZCBwaXBlcyBmcm9tIGV4cG9ydGVkIG1vZHVsZXMgYXJlIGFkZGVkIHRvIHRoZVxuICAgIC8vIGV4cG9ydCBtYXBzLiBEaXJlY3RpdmVzL3BpcGVzIGFyZSBkaWZmZXJlbnQgLSB0aGV5IG1pZ2h0IGJlIGV4cG9ydHMgb2YgZGVjbGFyZWQgdHlwZXMgb3JcbiAgICAvLyBpbXBvcnRlZCB0eXBlcy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZXhwb3J0cykge1xuICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIGRlY2wgYXMgYW4gTmdNb2R1bGUuXG4gICAgICBjb25zdCBpbXBvcnRTY29wZSA9IHRoaXMuZ2V0RXhwb3J0ZWRTY29wZShkZWNsLCBkaWFnbm9zdGljcywgcmVmLm5vZGUsICdleHBvcnQnKTtcbiAgICAgIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGV4cG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGV4cG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGltcG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gTmdNb2R1bGUuXG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgZXhwb3J0UGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgICAvLyBkZWNsIGlzIGEgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gY29tcGlsYXRpb25EaXJlY3RpdmVzLmdldChkZWNsLm5vZGUpICE7XG4gICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25QaXBlcy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgICAvLyBkZWNsIGlzIGEgcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAgICAgY29uc3QgcGlwZSA9IGNvbXBpbGF0aW9uUGlwZXMuZ2V0KGRlY2wubm9kZSkgITtcbiAgICAgICAgZXhwb3J0UGlwZXMuc2V0KGRlY2wubm9kZSwgcGlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIHVua25vd24gZXhwb3J0LlxuICAgICAgICBpZiAodGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCkgIT09IG51bGwpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWV4cG9ydChyZWYubm9kZSwgZGVjbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRlZCA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oZXhwb3J0RGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICBwaXBlczogQXJyYXkuZnJvbShleHBvcnRQaXBlcy52YWx1ZXMoKSksXG4gICAgfTtcblxuICAgIGxldCByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbCA9IG51bGw7XG4gICAgaWYgKHRoaXMuYWxpYXNHZW5lcmF0b3IgIT09IG51bGwpIHtcbiAgICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgICAgY29uc3QgYWRkUmVleHBvcnQgPSAocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pID0+IHtcbiAgICAgICAgaWYgKCFkZWNsYXJlZC5oYXMocmVmLm5vZGUpICYmIHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSAhPT0gc291cmNlRmlsZSkge1xuICAgICAgICAgIGNvbnN0IGV4cG9ydE5hbWUgPSB0aGlzLmFsaWFzR2VuZXJhdG9yICEuYWxpYXNTeW1ib2xOYW1lKHJlZi5ub2RlLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICBpZiAocmVmLmFsaWFzICYmIHJlZi5hbGlhcyBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikge1xuICAgICAgICAgICAgcmVleHBvcnRzICEucHVzaCh7XG4gICAgICAgICAgICAgIGZyb21Nb2R1bGU6IHJlZi5hbGlhcy52YWx1ZS5tb2R1bGVOYW1lICEsXG4gICAgICAgICAgICAgIHN5bWJvbE5hbWU6IHJlZi5hbGlhcy52YWx1ZS5uYW1lICEsXG4gICAgICAgICAgICAgIGFzQWxpYXM6IGV4cG9ydE5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KHJlZi5jbG9uZVdpdGhOb0lkZW50aWZpZXJzKCksIHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikgfHwgZXhwci52YWx1ZS5tb2R1bGVOYW1lID09PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgZXhwci52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgRXh0ZXJuYWxFeHByJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZWV4cG9ydHMgIS5wdXNoKHtcbiAgICAgICAgICAgICAgZnJvbU1vZHVsZTogZXhwci52YWx1ZS5tb2R1bGVOYW1lLFxuICAgICAgICAgICAgICBzeW1ib2xOYW1lOiBleHByLnZhbHVlLm5hbWUsXG4gICAgICAgICAgICAgIGFzQWxpYXM6IGV4cG9ydE5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBmb3IgKGNvbnN0IHtyZWZ9IG9mIGV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB0aGlzIHNjb3BlIGhhZCBhbnkgZXJyb3JzIGR1cmluZyBwcm9kdWN0aW9uLlxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBDYWNoZSB1bmRlZmluZWQsIHRvIG1hcmsgdGhlIGZhY3QgdGhhdCB0aGUgc2NvcGUgaXMgaW52YWxpZC5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBTYXZlIHRoZSBlcnJvcnMgZm9yIHJldHJpZXZhbC5cbiAgICAgIHRoaXMuc2NvcGVFcnJvcnMuc2V0KHJlZi5ub2RlLCBkaWFnbm9zdGljcyk7XG5cbiAgICAgIC8vIFJldHVybiB1bmRlZmluZWQgdG8gaW5kaWNhdGUgdGhlIHNjb3BlIGlzIGludmFsaWQuXG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgdW5kZWZpbmVkKTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gRmluYWxseSwgcHJvZHVjZSB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIHdpdGggYm90aCB0aGUgY29tcGlsYXRpb24gYW5kIGV4cG9ydCBzY29wZXMuXG4gICAgY29uc3Qgc2NvcGUgPSB7XG4gICAgICBjb21waWxhdGlvbjoge1xuICAgICAgICBkaXJlY3RpdmVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uRGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uUGlwZXMudmFsdWVzKCkpLFxuICAgICAgfSxcbiAgICAgIGV4cG9ydGVkLFxuICAgICAgcmVleHBvcnRzLFxuICAgICAgc2NoZW1hczogbmdNb2R1bGUuc2NoZW1hcyxcbiAgICB9O1xuICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCBzY29wZSk7XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBjb21wb25lbnQgcmVxdWlyZXMgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBnZXRSZXF1aXJlc1JlbW90ZVNjb3BlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucmVtb3RlU2NvcGluZy5oYXMobm9kZSk7IH1cblxuICAvKipcbiAgICogU2V0IGEgY29tcG9uZW50IGFzIHJlcXVpcmluZyByZW1vdGUgc2NvcGluZy5cbiAgICovXG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5yZW1vdGVTY29waW5nLmFkZChub2RlKTtcbiAgICB0aGlzLmNvbXBvbmVudFNjb3BlUmVnaXN0cnkuc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgdGhlIGBFeHBvcnRTY29wZWAgb2YgYSBnaXZlbiBgUmVmZXJlbmNlYCB0byBhbiBOZ01vZHVsZS5cbiAgICpcbiAgICogVGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uIG1heSBiZSBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHRzLlByb2dyYW0sIG9yIGl0IG1heSBiZVxuICAgKiBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuXG4gICAqXG4gICAqIEByZXR1cm5zIGBudWxsYCBpZiBubyBzY29wZSBjb3VsZCBiZSBmb3VuZCwgb3IgYHVuZGVmaW5lZGAgaWYgYW4gaW52YWxpZCBzY29wZVxuICAgKiB3YXMgZm91bmQuXG4gICAqXG4gICAqIE1heSBhbHNvIGNvbnRyaWJ1dGUgZGlhZ25vc3RpY3Mgb2YgaXRzIG93biBieSBhZGRpbmcgdG8gdGhlIGdpdmVuIGBkaWFnbm9zdGljc2BcbiAgICogYXJyYXkgcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHBvcnRlZFNjb3BlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgICBvd25lckZvckVycm9yczogdHMuRGVjbGFyYXRpb24sIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogRXhwb3J0U2NvcGV8bnVsbHx1bmRlZmluZWQge1xuICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuIFJlc29sdmUgaXQgd2l0aCB0aGUgYERlcGVuZGVuY3lTY29wZVJlYWRlcmAuXG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGluIGEgLmQudHMgZmlsZSBidXQgaXMgbm90IGRlY2xhcmVkIGFzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbi4gVGhpcyBpcyBhblxuICAgICAgICAvLyBlcnJvciBpbiB0aGUgLmQudHMgbWV0YWRhdGEuXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUocmVmLm5vZGUpIHx8IHJlZi5ub2RlLFxuICAgICAgICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihvd25lckZvckVycm9ycyl9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuIE5nTW9kdWxlYCkpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeVNjb3BlUmVhZGVyLnJlc29sdmUocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS4gUmVzb2x2ZSBpdCBmcm9tIHRoZSByZWdpc3RyeS5cbiAgICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzc2VydENvbGxlY3RpbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2VhbGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbjogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGlzIG5vdCBDT0xMRUNUSU5HYCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gaW52YWxpZCBpbXBvcnQgb3IgZXhwb3J0IGZyb20gYW4gTmdNb2R1bGUuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgY29uc3QgcmVzb2x2ZVRhcmdldCA9IHR5cGUgPT09ICdpbXBvcnQnID8gJ05nTW9kdWxlJyA6ICdOZ01vZHVsZSwgQ29tcG9uZW50LCBEaXJlY3RpdmUsIG9yIFBpcGUnO1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihjbGF6eil9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuICR7cmVzb2x2ZVRhcmdldH0gY2xhc3NgKTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbXBvcnQgb3IgZXhwb3J0IHdoaWNoIGl0c2VsZiBoYXMgZXJyb3JzLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKFxuICAgIGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgZGVjbDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPixcbiAgICB0eXBlOiAnaW1wb3J0JyB8ICdleHBvcnQnKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNvZGUgPVxuICAgICAgdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOiBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBpdHNlbGYgaGFzIGVycm9yc2ApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGV4cG9ydGVkIGRpcmVjdGl2ZSBvciBwaXBlIHdoaWNoIHdhcyBub3QgZGVjbGFyZWQgb3IgaW1wb3J0ZWRcbiAqIGJ5IHRoZSBOZ01vZHVsZSBpbiBxdWVzdGlvbi5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZXhwb3J0KGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgZGVjbDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPik6IHRzLkRpYWdub3N0aWMge1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9SRUVYUE9SVCwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBQcmVzZW50IGluIHRoZSBOZ01vZHVsZS5leHBvcnRzIG9mICR7bm9kZU5hbWVGb3JFcnJvcihjbGF6eil9IGJ1dCBuZWl0aGVyIGRlY2xhcmVkIG5vciBpbXBvcnRlZGApO1xufVxuIl19