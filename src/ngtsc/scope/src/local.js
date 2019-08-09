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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCxrRkFBNkU7SUFHN0UsNkZBQTJHO0lBd0IzRzs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUEwQ0Usa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxjQUFtQyxFQUN6RSxzQkFBaUY7WUFBakYsdUNBQUEsRUFBQSw2QkFBcUQsNENBQTBCLEVBQUU7WUFGakYsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtZQUNsRixlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFxQjtZQUN6RSwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJEO1lBNUM3Rjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztZQUVwRSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO1lBRS9FOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFDO1lBRTdFOzs7Ozs7O2VBT0c7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBRXBEOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztRQUs2QixDQUFDO1FBRWpHOztXQUVHO1FBQ0gsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOztZQUN6QyxJQUFJLENBQUMsZ0JBQWdCLEVB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RUFBRSw2QkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFDN0Usd0NBQXNDLDZCQUFnQixDQUFDLEtBQUssQ0FBQyx1Q0FBb0MsQ0FBQyxDQUFDO0lBQ3pHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG1ha2VEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0FsaWFzR2VuZXJhdG9yLCBSZWV4cG9ydCwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2lkZW50aWZpZXJPZk5vZGUsIG5vZGVOYW1lRm9yRXJyb3J9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0V4cG9ydFNjb3BlLCBTY29wZURhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXIsIENvbXBvbmVudFNjb3BlUmVnaXN0cnksIE5vb3BDb21wb25lbnRTY29wZVJlZ2lzdHJ5fSBmcm9tICcuL2NvbXBvbmVudF9zY29wZSc7XG5pbXBvcnQge0R0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jeSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYWxOZ01vZHVsZURhdGEge1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYWxNb2R1bGVTY29wZSBleHRlbmRzIEV4cG9ydFNjb3BlIHtcbiAgY29tcGlsYXRpb246IFNjb3BlRGF0YTtcbiAgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGw7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgcmVnaXN0ZXJlZCBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlIGV4dGVuZHMgU2NvcGVEYXRhIHtcbiAgLyoqIFRoZSBkZWNsYXJhdGlvbiB3aG9zZSBjb21waWxhdGlvbiBzY29wZSBpcyBkZXNjcmliZWQgaGVyZS4gKi9cbiAgZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb247XG4gIC8qKiBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIE5nTW9kdWxlIHRoYXQgZGVjbGFyZXMgdGhpcyBgZGVjbGFyYXRpb25gLiAqL1xuICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IHdoaWNoIGNvbGxlY3RzIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgRGlyZWN0aXZlcywgQ29tcG9uZW50cywgYW5kIFBpcGVzIHdoaWNoXG4gKiBhcmUgbG9jYWwgKGRlY2xhcmVkIGluIHRoZSB0cy5Qcm9ncmFtIGJlaW5nIGNvbXBpbGVkKSwgYW5kIGNhbiBwcm9kdWNlIGBMb2NhbE1vZHVsZVNjb3BlYHNcbiAqIHdoaWNoIHN1bW1hcml6ZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBjbGFzcyBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzIGFuZCBjYW4gcHJvZHVjZSxcbiAqIGZvciBhIGdpdmVuIGNvbXBvbmVudCwgdGhlIHNldCBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgXCJ2aXNpYmxlXCIgaW4gdGhhdCBjb21wb25lbnQnc1xuICogdGVtcGxhdGUuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGhhcyB0d28gXCJtb2Rlc1wiIG9mIG9wZXJhdGlvbi4gRHVyaW5nIGFuYWx5c2lzLCBkYXRhIGZvciBlYWNoXG4gKiBpbmRpdmlkdWFsIE5nTW9kdWxlLCBEaXJlY3RpdmUsIENvbXBvbmVudCwgYW5kIFBpcGUgaXMgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBObyBhdHRlbXB0IGlzIG1hZGVcbiAqIHRvIHRyYXZlcnNlIG9yIHZhbGlkYXRlIHRoZSBOZ01vZHVsZSBncmFwaCAoaW1wb3J0cywgZXhwb3J0cywgZXRjKS4gQWZ0ZXIgYW5hbHlzaXMsIG9uZSBvZlxuICogYGdldFNjb3BlT2ZNb2R1bGVgIG9yIGBnZXRTY29wZUZvckNvbXBvbmVudGAgY2FuIGJlIGNhbGxlZCwgd2hpY2ggdHJhdmVyc2VzIHRoZSBOZ01vZHVsZSBncmFwaFxuICogYW5kIGFwcGxpZXMgdGhlIE5nTW9kdWxlIGxvZ2ljIHRvIGdlbmVyYXRlIGEgYExvY2FsTW9kdWxlU2NvcGVgLCB0aGUgZnVsbCBzY29wZSBmb3IgdGhlIGdpdmVuXG4gKiBtb2R1bGUgb3IgY29tcG9uZW50LlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBpcyBhbHNvIGNhcGFibGUgb2YgcHJvZHVjaW5nIGB0cy5EaWFnbm9zdGljYCBlcnJvcnMgd2hlbiBBbmd1bGFyXG4gKiBzZW1hbnRpY3MgYXJlIHZpb2xhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSwgQ29tcG9uZW50U2NvcGVSZWFkZXIge1xuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgdGhlIHJlZ2lzdHJ5IGhhcyBiZWVuIGFza2VkIHRvIHByb2R1Y2Ugc2NvcGVzIGZvciBhIG1vZHVsZSBvciBjb21wb25lbnQuIE9uY2VcbiAgICogdGhpcyBpcyB0cnVlLCB0aGUgcmVnaXN0cnkgY2Fubm90IGFjY2VwdCByZWdpc3RyYXRpb25zIG9mIG5ldyBkaXJlY3RpdmVzL3BpcGVzL21vZHVsZXMgYXMgaXRcbiAgICogd291bGQgaW52YWxpZGF0ZSB0aGUgY2FjaGVkIHNjb3BlIGRhdGEuXG4gICAqL1xuICBwcml2YXRlIHNlYWxlZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBjb21wb25lbnRzIGZyb20gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCB0byB0aGUgTmdNb2R1bGUgd2hpY2ggZGVjbGFyZWQgdGhlbS5cbiAgICpcbiAgICogQXMgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBhcmUgbm90IGRpc3Rpbmd1aXNoZWQgYXQgdGhlIE5nTW9kdWxlIGxldmVsLCB0aGlzIG1hcCBtYXkgYWxzb1xuICAgKiBjb250YWluIGRpcmVjdGl2ZXMuIFRoaXMgZG9lc24ndCBjYXVzZSBhbnkgcHJvYmxlbXMgYnV0IGlzbid0IHVzZWZ1bCBhcyB0aGVyZSBpcyBubyBjb25jZXB0IG9mXG4gICAqIGEgZGlyZWN0aXZlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAqL1xuICBwcml2YXRlIGRlY2xhcmF0aW9uVG9Nb2R1bGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgcHJpdmF0ZSBtb2R1bGVUb1JlZiA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIC8qKlxuICAgKiBBIGNhY2hlIG9mIGNhbGN1bGF0ZWQgYExvY2FsTW9kdWxlU2NvcGVgcyBmb3IgZWFjaCBOZ01vZHVsZSBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBwcm9ncmFtLlxuICAgKlxuICAgKiBBIHZhbHVlIG9mIGB1bmRlZmluZWRgIGluZGljYXRlcyB0aGUgc2NvcGUgd2FzIGludmFsaWQgYW5kIHByb2R1Y2VkIGVycm9ycyAodGhlcmVmb3JlLFxuICAgKiBkaWFnbm9zdGljcyBzaG91bGQgZXhpc3QgaW4gdGhlIGBzY29wZUVycm9yc2AgbWFwKS5cbiAgICovXG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIExvY2FsTW9kdWxlU2NvcGV8dW5kZWZpbmVkfG51bGw+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGV0aGVyIGEgZ2l2ZW4gY29tcG9uZW50IHJlcXVpcmVzIFwicmVtb3RlIHNjb3BpbmdcIi5cbiAgICpcbiAgICogUmVtb3RlIHNjb3BpbmcgaXMgd2hlbiB0aGUgc2V0IG9mIGRpcmVjdGl2ZXMgd2hpY2ggYXBwbHkgdG8gYSBnaXZlbiBjb21wb25lbnQgaXMgc2V0IGluIHRoZVxuICAgKiBOZ01vZHVsZSdzIGZpbGUgaW5zdGVhZCBvZiBkaXJlY3RseSBvbiB0aGUgbmdDb21wb25lbnREZWYgKHdoaWNoIGlzIHNvbWV0aW1lcyBuZWVkZWQgdG8gZ2V0XG4gICAqIGFyb3VuZCBjeWNsaWMgaW1wb3J0IGlzc3VlcykuIFRoaXMgaXMgbm90IHVzZWQgaW4gY2FsY3VsYXRpb24gb2YgYExvY2FsTW9kdWxlU2NvcGVgcywgYnV0IGlzXG4gICAqIHRyYWNrZWQgaGVyZSBmb3IgY29udmVuaWVuY2UuXG4gICAqL1xuICBwcml2YXRlIHJlbW90ZVNjb3BpbmcgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBlcnJvcnMgYWNjdW11bGF0ZWQgaW4gdGhlIHByb2Nlc3Npbmcgb2Ygc2NvcGVzIGZvciBlYWNoIG1vZHVsZSBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVFcnJvcnMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkRpYWdub3N0aWNbXT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9jYWxSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlcGVuZGVuY3lTY29wZVJlYWRlcjogRHRzTW9kdWxlU2NvcGVSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSBhbGlhc0dlbmVyYXRvcjogQWxpYXNHZW5lcmF0b3J8bnVsbCxcbiAgICAgIHByaXZhdGUgY29tcG9uZW50U2NvcGVSZWdpc3RyeTogQ29tcG9uZW50U2NvcGVSZWdpc3RyeSA9IG5ldyBOb29wQ29tcG9uZW50U2NvcGVSZWdpc3RyeSgpKSB7fVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gTmdNb2R1bGUncyBkYXRhIHRvIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShkYXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydENvbGxlY3RpbmcoKTtcbiAgICB0aGlzLm1vZHVsZVRvUmVmLnNldChkYXRhLnJlZi5ub2RlLCBkYXRhLnJlZik7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEuZGVjbGFyYXRpb25zKSB7XG4gICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuc2V0KGRlY2wubm9kZSwgZGF0YS5yZWYubm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmU6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHt9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEocGlwZTogUGlwZU1ldGEpOiB2b2lkIHt9XG5cbiAgZ2V0U2NvcGVGb3JDb21wb25lbnQoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gIXRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5oYXMoY2xhenopID9cbiAgICAgICAgbnVsbCA6XG4gICAgICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZSh0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGNsYXp6KSAhKTtcbiAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMuY29tcG9uZW50U2NvcGVSZWdpc3RyeS5yZWdpc3RlckNvbXBvbmVudFNjb3BlKGNsYXp6LCBzY29wZSk7XG4gICAgfVxuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0cyByZWdpc3RlcmVkIGRhdGEgZm9yIGEgbW9kdWxlIGFuZCBpdHMgZGlyZWN0aXZlcy9waXBlcyBhbmQgY29udmVydCBpdCBpbnRvIGEgZnVsbFxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIGxvZ2ljIG9mIE5nTW9kdWxlIGltcG9ydHMgYW5kIGV4cG9ydHMuIEl0IHJldHVybnMgdGhlXG4gICAqIGBMb2NhbE1vZHVsZVNjb3BlYCBmb3IgdGhlIGdpdmVuIE5nTW9kdWxlIGlmIG9uZSBjYW4gYmUgcHJvZHVjZWQsIGFuZCBgbnVsbGAgaWYgbm8gc2NvcGUgaXNcbiAgICogYXZhaWxhYmxlIG9yIHRoZSBzY29wZSBjb250YWlucyBlcnJvcnMuXG4gICAqL1xuICBnZXRTY29wZU9mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICBjb25zdCBzY29wZSA9IHRoaXMubW9kdWxlVG9SZWYuaGFzKGNsYXp6KSA/XG4gICAgICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZVJlZmVyZW5jZSh0aGlzLm1vZHVsZVRvUmVmLmdldChjbGF6eikgISkgOlxuICAgICAgICBudWxsO1xuICAgIC8vIFRyYW5zbGF0ZSB1bmRlZmluZWQgLT4gbnVsbC5cbiAgICByZXR1cm4gc2NvcGUgIT09IHVuZGVmaW5lZCA/IHNjb3BlIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYW55IGB0cy5EaWFnbm9zdGljYHMgcHJvZHVjZWQgZHVyaW5nIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGZvclxuICAgKiB0aGUgZ2l2ZW4gTmdNb2R1bGUsIG9yIGBudWxsYCBpZiBubyBlcnJvcnMgd2VyZSBwcmVzZW50LlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXXxudWxsIHtcbiAgICAvLyBSZXF1aXJlZCB0byBlbnN1cmUgdGhlIGVycm9ycyBhcmUgcG9wdWxhdGVkIGZvciB0aGUgZ2l2ZW4gY2xhc3MuIElmIGl0IGhhcyBiZWVuIHByb2Nlc3NlZFxuICAgIC8vIGJlZm9yZSwgdGhpcyB3aWxsIGJlIGEgbm8tb3AgZHVlIHRvIHRoZSBzY29wZSBjYWNoZS5cbiAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUoY2xhenopO1xuXG4gICAgaWYgKHRoaXMuc2NvcGVFcnJvcnMuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVFcnJvcnMuZ2V0KGNsYXp6KSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGNvbGxlY3Rpb24gb2YgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIGZvciBlYWNoIHJlZ2lzdGVyZWQgZGVjbGFyYXRpb24uXG4gICAqL1xuICBnZXRDb21waWxhdGlvblNjb3BlcygpOiBDb21waWxhdGlvblNjb3BlW10ge1xuICAgIGNvbnN0IHNjb3BlczogQ29tcGlsYXRpb25TY29wZVtdID0gW107XG4gICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmZvckVhY2goKG5nTW9kdWxlLCBkZWNsYXJhdGlvbikgPT4ge1xuICAgICAgY29uc3Qgc2NvcGUgPSB0aGlzLmdldFNjb3BlT2ZNb2R1bGUobmdNb2R1bGUpO1xuICAgICAgaWYgKHNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIHNjb3Blcy5wdXNoKHtkZWNsYXJhdGlvbiwgbmdNb2R1bGUsIC4uLnNjb3BlLmNvbXBpbGF0aW9ufSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHNjb3BlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBgZ2V0U2NvcGVPZk1vZHVsZWAgd2hpY2ggYWNjZXB0cyBhIHJlZmVyZW5jZSB0byBhIGNsYXNzIGFuZCBkaWZmZXJlbnRpYXRlc1xuICAgKiBiZXR3ZWVuOlxuICAgKlxuICAgKiAqIG5vIHNjb3BlIGJlaW5nIGF2YWlsYWJsZSAocmV0dXJucyBgbnVsbGApXG4gICAqICogYSBzY29wZSBiZWluZyBwcm9kdWNlZCB3aXRoIGVycm9ycyAocmV0dXJucyBgdW5kZWZpbmVkYCkuXG4gICAqL1xuICBwcml2YXRlIGdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGxcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChyZWYubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gU2VhbCB0aGUgcmVnaXN0cnkgdG8gcHJvdGVjdCB0aGUgaW50ZWdyaXR5IG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgY2FjaGUuXG4gICAgdGhpcy5zZWFsZWQgPSB0cnVlO1xuXG4gICAgLy8gYHJlZmAgc2hvdWxkIGJlIGFuIE5nTW9kdWxlIHByZXZpb3VzbHkgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBJZiBub3QsIGEgc2NvcGUgZm9yIGl0XG4gICAgLy8gY2Fubm90IGJlIHByb2R1Y2VkLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5sb2NhbFJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgbnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBFcnJvcnMgcHJvZHVjZWQgZHVyaW5nIGNvbXB1dGF0aW9uIG9mIHRoZSBzY29wZSBhcmUgcmVjb3JkZWQgaGVyZS4gQXQgdGhlIGVuZCwgaWYgdGhpcyBhcnJheVxuICAgIC8vIGlzbid0IGVtcHR5IHRoZW4gYHVuZGVmaW5lZGAgd2lsbCBiZSBjYWNoZWQgYW5kIHJldHVybmVkIHRvIGluZGljYXRlIHRoaXMgc2NvcGUgaXMgaW52YWxpZC5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZ29hbCBpcyB0byBwcm9kdWNlIHR3byBkaXN0aW5jdCB0cmFuc2l0aXZlIHNldHM6XG4gICAgLy8gLSB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIHZpc2libGUgdG8gY29tcG9uZW50cyBkZWNsYXJlZCBpbiB0aGUgTmdNb2R1bGUuXG4gICAgLy8gLSB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIGV4cG9ydGVkIHRvIGFueSBOZ01vZHVsZXMgd2hpY2ggaW1wb3J0IHRoaXMgb25lLlxuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgcGlwZXMgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IGNvbXBpbGF0aW9uRGlyZWN0aXZlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIERpcmVjdGl2ZU1ldGE+KCk7XG4gICAgY29uc3QgY29tcGlsYXRpb25QaXBlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFBpcGVNZXRhPigpO1xuXG4gICAgY29uc3QgZGVjbGFyZWQgPSBuZXcgU2V0PHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICAvLyBEaXJlY3RpdmVzIGFuZCBwaXBlcyBleHBvcnRlZCB0byBhbnkgaW1wb3J0aW5nIE5nTW9kdWxlcy5cbiAgICBjb25zdCBleHBvcnREaXJlY3RpdmVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBleHBvcnRQaXBlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFBpcGVNZXRhPigpO1xuXG4gICAgLy8gVGhlIGFsZ29yaXRobSBpcyBhcyBmb2xsb3dzOlxuICAgIC8vIDEpIEFkZCBkaXJlY3RpdmVzL3BpcGVzIGRlY2xhcmVkIGluIHRoZSBOZ01vZHVsZSB0byB0aGUgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgLy8gMikgQWRkIGFsbCBvZiB0aGUgZGlyZWN0aXZlcy9waXBlcyBmcm9tIGVhY2ggTmdNb2R1bGUgaW1wb3J0ZWQgaW50byB0aGUgY3VycmVudCBvbmUgdG8gdGhlXG4gICAgLy8gICAgY29tcGlsYXRpb24gc2NvcGUuIEF0IHRoaXMgcG9pbnQsIHRoZSBjb21waWxhdGlvbiBzY29wZSBpcyBjb21wbGV0ZS5cbiAgICAvLyAzKSBGb3IgZWFjaCBlbnRyeSBpbiB0aGUgTmdNb2R1bGUncyBleHBvcnRzOlxuICAgIC8vICAgIGEpIEF0dGVtcHQgdG8gcmVzb2x2ZSBpdCBhcyBhbiBOZ01vZHVsZSB3aXRoIGl0cyBvd24gZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy4gSWYgaXQgaXNcbiAgICAvLyAgICAgICBvbmUsIGFkZCB0aGVtIHRvIHRoZSBleHBvcnQgc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAvLyAgICBiKSBPdGhlcndpc2UsIGl0IHNob3VsZCBiZSBhIGNsYXNzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLiBJZiBpdCBpcyxcbiAgICAvLyAgICAgICBhZGQgaXQgdG8gdGhlIGV4cG9ydCBzY29wZS5cbiAgICAvLyAgICBjKSBJZiBpdCdzIG5laXRoZXIgYW4gTmdNb2R1bGUgbm9yIGEgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLCB0aGVuIHRoaXNcbiAgICAvLyAgICAgICBpcyBhbiBlcnJvci5cblxuICAgIC8vIDEpIGFkZCBkZWNsYXJhdGlvbnMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmRlY2xhcmF0aW9ucykge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGNvbnN0IHBpcGUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGlmIChkaXJlY3RpdmUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25EaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIHsuLi5kaXJlY3RpdmUsIHJlZjogZGVjbH0pO1xuICAgICAgfSBlbHNlIGlmIChwaXBlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KGRlY2wubm9kZSwgey4uLnBpcGUsIHJlZjogZGVjbH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBwcm9kdWNlIGEgdHMuRGlhZ25vc3RpYy4gVGhpcyBjYW4ndCBiZSBhbiBlcnJvciByaWdodCBub3cgc2luY2Ugc29tZVxuICAgICAgICAvLyBuZ3Rvb2xzIHRlc3RzIHJlbHkgb24gYW5hbHlzaXMgb2YgYnJva2VuIGNvbXBvbmVudHMuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkZWNsYXJlZC5hZGQoZGVjbC5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyAyKSBwcm9jZXNzIGltcG9ydHMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmltcG9ydHMpIHtcbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2ltcG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXNuJ3QgYW4gTmdNb2R1bGUsIHNvIHJlY29yZCBhbiBlcnJvci5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnaW1wb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBbiBpbXBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBpbXBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAzKSBwcm9jZXNzIGV4cG9ydHMuXG4gICAgLy8gRXhwb3J0cyBjYW4gY29udGFpbiBtb2R1bGVzLCBjb21wb25lbnRzLCBvciBkaXJlY3RpdmVzLiBUaGV5J3JlIHByb2Nlc3NlZCBkaWZmZXJlbnRseS5cbiAgICAvLyBNb2R1bGVzIGFyZSBzdHJhaWdodGZvcndhcmQuIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGZyb20gZXhwb3J0ZWQgbW9kdWxlcyBhcmUgYWRkZWQgdG8gdGhlXG4gICAgLy8gZXhwb3J0IG1hcHMuIERpcmVjdGl2ZXMvcGlwZXMgYXJlIGRpZmZlcmVudCAtIHRoZXkgbWlnaHQgYmUgZXhwb3J0cyBvZiBkZWNsYXJlZCB0eXBlcyBvclxuICAgIC8vIGltcG9ydGVkIHR5cGVzLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBuZ01vZHVsZS5leHBvcnRzKSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgZGVjbCBhcyBhbiBOZ01vZHVsZS5cbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2V4cG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQW4gZXhwb3J0IHdhcyBhbiBOZ01vZHVsZSBidXQgY29udGFpbmVkIGVycm9ycyBvZiBpdHMgb3duLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvciB0b28sXG4gICAgICAgIC8vIGJlY2F1c2UgdGhpcyBzY29wZSBpcyBhbHdheXMgZ29pbmcgdG8gYmUgaW5jb3JyZWN0IGlmIG9uZSBvZiBpdHMgZXhwb3J0cyBjb3VsZCBub3QgYmVcbiAgICAgICAgLy8gcmVhZC5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhbiBOZ01vZHVsZS5cbiAgICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgICAgICBleHBvcnRQaXBlcy5zZXQocGlwZS5yZWYubm9kZSwgcGlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25EaXJlY3RpdmVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBjb21waWxhdGlvbkRpcmVjdGl2ZXMuZ2V0KGRlY2wubm9kZSkgITtcbiAgICAgICAgZXhwb3J0RGlyZWN0aXZlcy5zZXQoZGVjbC5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfSBlbHNlIGlmIChjb21waWxhdGlvblBpcGVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBwaXBlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBwaXBlID0gY29tcGlsYXRpb25QaXBlcy5nZXQoZGVjbC5ub2RlKSAhO1xuICAgICAgICBleHBvcnRQaXBlcy5zZXQoZGVjbC5ub2RlLCBwaXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gdW5rbm93biBleHBvcnQuXG4gICAgICAgIGlmICh0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpICE9PSBudWxsIHx8XG4gICAgICAgICAgICB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZXhwb3J0KHJlZi5ub2RlLCBkZWNsKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydGVkID0ge1xuICAgICAgZGlyZWN0aXZlczogQXJyYXkuZnJvbShleHBvcnREaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGV4cG9ydFBpcGVzLnZhbHVlcygpKSxcbiAgICB9O1xuXG4gICAgbGV0IHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsID0gbnVsbDtcbiAgICBpZiAodGhpcy5hbGlhc0dlbmVyYXRvciAhPT0gbnVsbCkge1xuICAgICAgcmVleHBvcnRzID0gW107XG4gICAgICBjb25zdCBhZGRSZWV4cG9ydCA9IChyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPikgPT4ge1xuICAgICAgICBpZiAoIWRlY2xhcmVkLmhhcyhyZWYubm9kZSkgJiYgcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpICE9PSBzb3VyY2VGaWxlKSB7XG4gICAgICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IHRoaXMuYWxpYXNHZW5lcmF0b3IgIS5hbGlhc1N5bWJvbE5hbWUocmVmLm5vZGUsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIGlmIChyZWYuYWxpYXMgJiYgcmVmLmFsaWFzIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB7XG4gICAgICAgICAgICByZWV4cG9ydHMgIS5wdXNoKHtcbiAgICAgICAgICAgICAgZnJvbU1vZHVsZTogcmVmLmFsaWFzLnZhbHVlLm1vZHVsZU5hbWUgISxcbiAgICAgICAgICAgICAgc3ltYm9sTmFtZTogcmVmLmFsaWFzLnZhbHVlLm5hbWUgISxcbiAgICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBleHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQocmVmLmNsb25lV2l0aE5vSWRlbnRpZmllcnMoKSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgICBpZiAoIShleHByIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB8fCBleHByLnZhbHVlLm1vZHVsZU5hbWUgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgICBleHByLnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBFeHRlcm5hbEV4cHInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlZXhwb3J0cyAhLnB1c2goe1xuICAgICAgICAgICAgICBmcm9tTW9kdWxlOiBleHByLnZhbHVlLm1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgIHN5bWJvbE5hbWU6IGV4cHIudmFsdWUubmFtZSxcbiAgICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICBhZGRSZWV4cG9ydChyZWYpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5waXBlcykge1xuICAgICAgICBhZGRSZWV4cG9ydChyZWYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHRoaXMgc2NvcGUgaGFkIGFueSBlcnJvcnMgZHVyaW5nIHByb2R1Y3Rpb24uXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIENhY2hlIHVuZGVmaW5lZCwgdG8gbWFyayB0aGUgZmFjdCB0aGF0IHRoZSBzY29wZSBpcyBpbnZhbGlkLlxuICAgICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIHVuZGVmaW5lZCk7XG5cbiAgICAgIC8vIFNhdmUgdGhlIGVycm9ycyBmb3IgcmV0cmlldmFsLlxuICAgICAgdGhpcy5zY29wZUVycm9ycy5zZXQocmVmLm5vZGUsIGRpYWdub3N0aWNzKTtcblxuICAgICAgLy8gUmV0dXJuIHVuZGVmaW5lZCB0byBpbmRpY2F0ZSB0aGUgc2NvcGUgaXMgaW52YWxpZC5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCB1bmRlZmluZWQpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCBwcm9kdWNlIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgd2l0aCBib3RoIHRoZSBjb21waWxhdGlvbiBhbmQgZXhwb3J0IHNjb3Blcy5cbiAgICBjb25zdCBzY29wZSA9IHtcbiAgICAgIGNvbXBpbGF0aW9uOiB7XG4gICAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25EaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgICAgcGlwZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25QaXBlcy52YWx1ZXMoKSksXG4gICAgICB9LFxuICAgICAgZXhwb3J0ZWQsXG4gICAgICByZWV4cG9ydHMsXG4gICAgfTtcbiAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgc2NvcGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgY29tcG9uZW50IHJlcXVpcmVzIHJlbW90ZSBzY29waW5nLlxuICAgKi9cbiAgZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnJlbW90ZVNjb3BpbmcuaGFzKG5vZGUpOyB9XG5cbiAgLyoqXG4gICAqIFNldCBhIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBzZXRDb21wb25lbnRBc1JlcXVpcmluZ1JlbW90ZVNjb3Bpbmcobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMucmVtb3RlU2NvcGluZy5hZGQobm9kZSk7XG4gICAgdGhpcy5jb21wb25lbnRTY29wZVJlZ2lzdHJ5LnNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhub2RlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIHVwIHRoZSBgRXhwb3J0U2NvcGVgIG9mIGEgZ2l2ZW4gYFJlZmVyZW5jZWAgdG8gYW4gTmdNb2R1bGUuXG4gICAqXG4gICAqIFRoZSBOZ01vZHVsZSBpbiBxdWVzdGlvbiBtYXkgYmUgZGVjbGFyZWQgbG9jYWxseSBpbiB0aGUgY3VycmVudCB0cy5Qcm9ncmFtLCBvciBpdCBtYXkgYmVcbiAgICogZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBgbnVsbGAgaWYgbm8gc2NvcGUgY291bGQgYmUgZm91bmQsIG9yIGB1bmRlZmluZWRgIGlmIGFuIGludmFsaWQgc2NvcGVcbiAgICogd2FzIGZvdW5kLlxuICAgKlxuICAgKiBNYXkgYWxzbyBjb250cmlidXRlIGRpYWdub3N0aWNzIG9mIGl0cyBvd24gYnkgYWRkaW5nIHRvIHRoZSBnaXZlbiBgZGlhZ25vc3RpY3NgXG4gICAqIGFycmF5IHBhcmFtZXRlci5cbiAgICovXG4gIHByaXZhdGUgZ2V0RXhwb3J0ZWRTY29wZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgICAgb3duZXJGb3JFcnJvcnM6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiAnaW1wb3J0J3wnZXhwb3J0Jyk6IEV4cG9ydFNjb3BlfG51bGx8dW5kZWZpbmVkIHtcbiAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAvLyBUaGUgTmdNb2R1bGUgaXMgZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLiBSZXNvbHZlIGl0IHdpdGggdGhlIGBEZXBlbmRlbmN5U2NvcGVSZWFkZXJgLlxuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBpbiBhIC5kLnRzIGZpbGUgYnV0IGlzIG5vdCBkZWNsYXJlZCBhcyBhIHRzLkNsYXNzRGVjbGFyYXRpb24uIFRoaXMgaXMgYW5cbiAgICAgICAgLy8gZXJyb3IgaW4gdGhlIC5kLnRzIG1ldGFkYXRhLlxuICAgICAgICBjb25zdCBjb2RlID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKHJlZi5ub2RlKSB8fCByZWYubm9kZSxcbiAgICAgICAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3Iob3duZXJGb3JFcnJvcnMpfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiBOZ01vZHVsZWApKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRlcGVuZGVuY3lTY29wZVJlYWRlci5yZXNvbHZlKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHByb2dyYW0uIFJlc29sdmUgaXQgZnJvbSB0aGUgcmVnaXN0cnkuXG4gICAgICByZXR1cm4gdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3NlcnRDb2xsZWN0aW5nKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNlYWxlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb246IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSBpcyBub3QgQ09MTEVDVElOR2ApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGludmFsaWQgaW1wb3J0IG9yIGV4cG9ydCBmcm9tIGFuIE5nTW9kdWxlLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVmKFxuICAgIGNsYXp6OiB0cy5EZWNsYXJhdGlvbiwgZGVjbDogUmVmZXJlbmNlPHRzLkRlY2xhcmF0aW9uPixcbiAgICB0eXBlOiAnaW1wb3J0JyB8ICdleHBvcnQnKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNvZGUgPVxuICAgICAgdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOiBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gIGNvbnN0IHJlc29sdmVUYXJnZXQgPSB0eXBlID09PSAnaW1wb3J0JyA/ICdOZ01vZHVsZScgOiAnTmdNb2R1bGUsIENvbXBvbmVudCwgRGlyZWN0aXZlLCBvciBQaXBlJztcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiAke3Jlc29sdmVUYXJnZXR9IGNsYXNzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gaW1wb3J0IG9yIGV4cG9ydCB3aGljaCBpdHNlbGYgaGFzIGVycm9ycy5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihcbiAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sXG4gICAgdHlwZTogJ2ltcG9ydCcgfCAnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihjbGF6eil9LCBidXQgaXRzZWxmIGhhcyBlcnJvcnNgKTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBleHBvcnRlZCBkaXJlY3RpdmUgb3IgcGlwZSB3aGljaCB3YXMgbm90IGRlY2xhcmVkIG9yIGltcG9ydGVkXG4gKiBieSB0aGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRSZWV4cG9ydChjbGF6ejogdHMuRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4pOiB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfUkVFWFBPUlQsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgUHJlc2VudCBpbiB0aGUgTmdNb2R1bGUuZXhwb3J0cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSBidXQgbmVpdGhlciBkZWNsYXJlZCBub3IgaW1wb3J0ZWRgKTtcbn1cbiJdfQ==