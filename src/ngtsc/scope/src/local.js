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
        define("@angular/compiler-cli/src/ngtsc/scope/src/local", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var diagnostics_1 = require("@angular/compiler-cli/src/ngtsc/diagnostics");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
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
        function LocalModuleScopeRegistry(dependencyScopeReader, refEmitter, aliasGenerator) {
            this.dependencyScopeReader = dependencyScopeReader;
            this.refEmitter = refEmitter;
            this.aliasGenerator = aliasGenerator;
            /**
             * Tracks whether the registry has been asked to produce scopes for a module or component. Once
             * this is true, the registry cannot accept registrations of new directives/pipes/modules as it
             * would invalidate the cached scope data.
             */
            this.sealed = false;
            /**
             * Metadata for each local NgModule registered.
             */
            this.ngModuleData = new Map();
            /**
             * Metadata for each local directive registered.
             */
            this.directiveData = new Map();
            /**
             * Metadata for each local pipe registered.
             */
            this.pipeData = new Map();
            /**
             * A map of components from the current compilation unit to the NgModule which declared them.
             *
             * As components and directives are not distinguished at the NgModule level, this map may also
             * contain directives. This doesn't cause any problems but isn't useful as there is no concept of
             * a directive's compilation scope.
             */
            this.declarationToModule = new Map();
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
        LocalModuleScopeRegistry.prototype.registerNgModule = function (clazz, data) {
            var e_1, _a;
            this.assertCollecting();
            this.ngModuleData.set(clazz, data);
            try {
                for (var _b = tslib_1.__values(data.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    this.declarationToModule.set(decl.node, clazz);
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
        LocalModuleScopeRegistry.prototype.registerDirective = function (directive) {
            this.assertCollecting();
            this.directiveData.set(directive.ref.node, directive);
        };
        LocalModuleScopeRegistry.prototype.registerPipe = function (pipe) {
            this.assertCollecting();
            this.pipeData.set(pipe.ref.node, pipe);
        };
        LocalModuleScopeRegistry.prototype.getScopeForComponent = function (clazz) {
            if (!this.declarationToModule.has(clazz)) {
                return null;
            }
            return this.getScopeOfModule(this.declarationToModule.get(clazz));
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
            var scope = this.getScopeOfModuleInternal(clazz);
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
         * Implementation of `getScopeOfModule` which differentiates between no scope being available
         * (returns `null`) and a scope being produced with errors (returns `undefined`).
         */
        LocalModuleScopeRegistry.prototype.getScopeOfModuleInternal = function (clazz) {
            var _this = this;
            var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e, e_7, _f, e_8, _g, e_9, _h, e_10, _j;
            // Seal the registry to protect the integrity of the `LocalModuleScope` cache.
            this.sealed = true;
            // Look for cached data if available.
            if (this.cache.has(clazz)) {
                return this.cache.get(clazz);
            }
            // `clazz` should be an NgModule previously added to the registry. If not, a scope for it
            // cannot be produced.
            if (!this.ngModuleData.has(clazz)) {
                return null;
            }
            var ngModule = this.ngModuleData.get(clazz);
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
            var sourceFile = clazz.getSourceFile();
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
                    if (this.directiveData.has(decl.node)) {
                        var directive = this.directiveData.get(decl.node);
                        compilationDirectives.set(decl.node, tslib_1.__assign({}, directive, { ref: decl }));
                    }
                    else if (this.pipeData.has(decl.node)) {
                        var pipe = this.pipeData.get(decl.node);
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
                    var importScope = this.getExportedScope(decl, diagnostics, clazz, 'import');
                    if (importScope === null) {
                        // An import wasn't an NgModule, so record an error.
                        diagnostics.push(invalidRef(clazz, decl, 'import'));
                        continue;
                    }
                    else if (importScope === undefined) {
                        // An import was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its imports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(clazz, decl, 'import'));
                        continue;
                    }
                    try {
                        for (var _p = tslib_1.__values(importScope.exported.directives), _q = _p.next(); !_q.done; _q = _p.next()) {
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
                        for (var _r = tslib_1.__values(importScope.exported.pipes), _s = _r.next(); !_s.done; _s = _r.next()) {
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
                    var importScope = this.getExportedScope(decl, diagnostics, clazz, 'export');
                    if (importScope === undefined) {
                        // An export was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its exports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(clazz, decl, 'export'));
                        continue;
                    }
                    else if (importScope !== null) {
                        try {
                            // decl is an NgModule.
                            for (var _v = tslib_1.__values(importScope.exported.directives), _w = _v.next(); !_w.done; _w = _v.next()) {
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
                            for (var _x = tslib_1.__values(importScope.exported.pipes), _y = _x.next(); !_y.done; _y = _x.next()) {
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
                        if (this.directiveData.has(decl.node) || this.pipeData.has(decl.node)) {
                            diagnostics.push(invalidReexport(clazz, decl));
                        }
                        else {
                            diagnostics.push(invalidRef(clazz, decl, 'export'));
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
                        var ref = _0.value.ref;
                        addReexport(ref);
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
                        var ref = _2.value.ref;
                        addReexport(ref);
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
                this.cache.set(clazz, undefined);
                // Save the errors for retrieval.
                this.scopeErrors.set(clazz, diagnostics);
                // Return undefined to indicate the scope is invalid.
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
            this.cache.set(clazz, scope);
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
        };
        /**
         * Look up the `ExportScope` of a given `Reference` to an NgModule.
         *
         * The NgModule in question may be declared locally in the current ts.Program, or it may be
         * declared in a .d.ts file.
         *
         * This function will return `null` if no scope could be found, or `undefined` if an invalid scope
         * was found. It can also contribute diagnostics of its own by adding to the given `diagnostics`
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
                return this.getScopeOfModuleInternal(ref.node);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0M7SUFDL0MsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUc1RCxrRkFBNkU7SUFnQjdFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQXVERSxrQ0FDWSxxQkFBNkMsRUFBVSxVQUE0QixFQUNuRixjQUFtQztZQURuQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1lBQVUsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFDbkYsbUJBQWMsR0FBZCxjQUFjLENBQXFCO1lBeEQvQzs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7ZUFFRztZQUNLLGlCQUFZLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUM7WUFFdEU7O2VBRUc7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1lBRXBFOztlQUVHO1lBQ0ssYUFBUSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBRTFEOzs7Ozs7ZUFNRztZQUNLLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1lBRTVFOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFnRCxDQUFDO1lBRXhFOzs7Ozs7O2VBT0c7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBRXBEOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztRQUlqQixDQUFDO1FBRW5EOztXQUVHO1FBQ0gsbURBQWdCLEdBQWhCLFVBQWlCLEtBQXVCLEVBQUUsSUFBdUI7O1lBQy9ELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hC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NEJBQWMsQ0FDakIsSUFBSSxFQUFFLDZCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUM5Qyw2QkFBMkIsSUFBSSxhQUFRLDZCQUFnQixDQUFDLEtBQUssQ0FBQyw0QkFBeUIsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLGVBQWUsQ0FBQyxLQUFxQixFQUFFLElBQStCO1FBQzdFLE9BQU8sNEJBQWMsQ0FDakIsdUJBQVMsQ0FBQyx5QkFBeUIsRUFBRSw2QkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksRUFDN0Usd0NBQXNDLDZCQUFnQixDQUFDLEtBQUssQ0FBQyx1Q0FBb0MsQ0FBQyxDQUFDO0lBQ3pHLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXh0ZXJuYWxFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG1ha2VEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0FsaWFzR2VuZXJhdG9yLCBSZWV4cG9ydCwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2lkZW50aWZpZXJPZk5vZGUsIG5vZGVOYW1lRm9yRXJyb3J9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0V4cG9ydFNjb3BlLCBTY29wZURhdGEsIFNjb3BlRGlyZWN0aXZlLCBTY29wZVBpcGV9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7RHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmN5JztcblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE5nTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE1vZHVsZVNjb3BlIGV4dGVuZHMgRXhwb3J0U2NvcGUge1xuICBjb21waWxhdGlvbjogU2NvcGVEYXRhO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbDtcbn1cblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IHdoaWNoIGNvbGxlY3RzIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgRGlyZWN0aXZlcywgQ29tcG9uZW50cywgYW5kIFBpcGVzIHdoaWNoXG4gKiBhcmUgbG9jYWwgKGRlY2xhcmVkIGluIHRoZSB0cy5Qcm9ncmFtIGJlaW5nIGNvbXBpbGVkKSwgYW5kIGNhbiBwcm9kdWNlIGBMb2NhbE1vZHVsZVNjb3BlYHNcbiAqIHdoaWNoIHN1bW1hcml6ZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBjbGFzcyBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzIGFuZCBjYW4gcHJvZHVjZSxcbiAqIGZvciBhIGdpdmVuIGNvbXBvbmVudCwgdGhlIHNldCBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgXCJ2aXNpYmxlXCIgaW4gdGhhdCBjb21wb25lbnQnc1xuICogdGVtcGxhdGUuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGhhcyB0d28gXCJtb2Rlc1wiIG9mIG9wZXJhdGlvbi4gRHVyaW5nIGFuYWx5c2lzLCBkYXRhIGZvciBlYWNoXG4gKiBpbmRpdmlkdWFsIE5nTW9kdWxlLCBEaXJlY3RpdmUsIENvbXBvbmVudCwgYW5kIFBpcGUgaXMgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBObyBhdHRlbXB0IGlzIG1hZGVcbiAqIHRvIHRyYXZlcnNlIG9yIHZhbGlkYXRlIHRoZSBOZ01vZHVsZSBncmFwaCAoaW1wb3J0cywgZXhwb3J0cywgZXRjKS4gQWZ0ZXIgYW5hbHlzaXMsIG9uZSBvZlxuICogYGdldFNjb3BlT2ZNb2R1bGVgIG9yIGBnZXRTY29wZUZvckNvbXBvbmVudGAgY2FuIGJlIGNhbGxlZCwgd2hpY2ggdHJhdmVyc2VzIHRoZSBOZ01vZHVsZSBncmFwaFxuICogYW5kIGFwcGxpZXMgdGhlIE5nTW9kdWxlIGxvZ2ljIHRvIGdlbmVyYXRlIGEgYExvY2FsTW9kdWxlU2NvcGVgLCB0aGUgZnVsbCBzY29wZSBmb3IgdGhlIGdpdmVuXG4gKiBtb2R1bGUgb3IgY29tcG9uZW50LlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBpcyBhbHNvIGNhcGFibGUgb2YgcHJvZHVjaW5nIGB0cy5EaWFnbm9zdGljYCBlcnJvcnMgd2hlbiBBbmd1bGFyXG4gKiBzZW1hbnRpY3MgYXJlIHZpb2xhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IHtcbiAgLyoqXG4gICAqIFRyYWNrcyB3aGV0aGVyIHRoZSByZWdpc3RyeSBoYXMgYmVlbiBhc2tlZCB0byBwcm9kdWNlIHNjb3BlcyBmb3IgYSBtb2R1bGUgb3IgY29tcG9uZW50LiBPbmNlXG4gICAqIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlZ2lzdHJ5IGNhbm5vdCBhY2NlcHQgcmVnaXN0cmF0aW9ucyBvZiBuZXcgZGlyZWN0aXZlcy9waXBlcy9tb2R1bGVzIGFzIGl0XG4gICAqIHdvdWxkIGludmFsaWRhdGUgdGhlIGNhY2hlZCBzY29wZSBkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBzZWFsZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogTWV0YWRhdGEgZm9yIGVhY2ggbG9jYWwgTmdNb2R1bGUgcmVnaXN0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgbmdNb2R1bGVEYXRhID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE5nTW9kdWxlRGF0YT4oKTtcblxuICAvKipcbiAgICogTWV0YWRhdGEgZm9yIGVhY2ggbG9jYWwgZGlyZWN0aXZlIHJlZ2lzdGVyZWQuXG4gICAqL1xuICBwcml2YXRlIGRpcmVjdGl2ZURhdGEgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFNjb3BlRGlyZWN0aXZlPigpO1xuXG4gIC8qKlxuICAgKiBNZXRhZGF0YSBmb3IgZWFjaCBsb2NhbCBwaXBlIHJlZ2lzdGVyZWQuXG4gICAqL1xuICBwcml2YXRlIHBpcGVEYXRhID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBTY29wZVBpcGU+KCk7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGNvbXBvbmVudHMgZnJvbSB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZSBOZ01vZHVsZSB3aGljaCBkZWNsYXJlZCB0aGVtLlxuICAgKlxuICAgKiBBcyBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGFyZSBub3QgZGlzdGluZ3Vpc2hlZCBhdCB0aGUgTmdNb2R1bGUgbGV2ZWwsIHRoaXMgbWFwIG1heSBhbHNvXG4gICAqIGNvbnRhaW4gZGlyZWN0aXZlcy4gVGhpcyBkb2Vzbid0IGNhdXNlIGFueSBwcm9ibGVtcyBidXQgaXNuJ3QgdXNlZnVsIGFzIHRoZXJlIGlzIG5vIGNvbmNlcHQgb2ZcbiAgICogYSBkaXJlY3RpdmUncyBjb21waWxhdGlvbiBzY29wZS5cbiAgICovXG4gIHByaXZhdGUgZGVjbGFyYXRpb25Ub01vZHVsZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgQ2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBjYWxjdWxhdGVkIGBMb2NhbE1vZHVsZVNjb3BlYHMgZm9yIGVhY2ggTmdNb2R1bGUgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhlIHNjb3BlIHdhcyBpbnZhbGlkIGFuZCBwcm9kdWNlZCBlcnJvcnMgKHRoZXJlZm9yZSxcbiAgICogZGlhZ25vc3RpY3Mgc2hvdWxkIGV4aXN0IGluIHRoZSBgc2NvcGVFcnJvcnNgIG1hcCkuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE1vZHVsZVNjb3BlfHVuZGVmaW5lZD4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgYSBnaXZlbiBjb21wb25lbnQgcmVxdWlyZXMgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgKlxuICAgKiBSZW1vdGUgc2NvcGluZyBpcyB3aGVuIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyB3aGljaCBhcHBseSB0byBhIGdpdmVuIGNvbXBvbmVudCBpcyBzZXQgaW4gdGhlXG4gICAqIE5nTW9kdWxlJ3MgZmlsZSBpbnN0ZWFkIG9mIGRpcmVjdGx5IG9uIHRoZSBuZ0NvbXBvbmVudERlZiAod2hpY2ggaXMgc29tZXRpbWVzIG5lZWRlZCB0byBnZXRcbiAgICogYXJvdW5kIGN5Y2xpYyBpbXBvcnQgaXNzdWVzKS4gVGhpcyBpcyBub3QgdXNlZCBpbiBjYWxjdWxhdGlvbiBvZiBgTG9jYWxNb2R1bGVTY29wZWBzLCBidXQgaXNcbiAgICogdHJhY2tlZCBoZXJlIGZvciBjb252ZW5pZW5jZS5cbiAgICovXG4gIHByaXZhdGUgcmVtb3RlU2NvcGluZyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGVycm9ycyBhY2N1bXVsYXRlZCBpbiB0aGUgcHJvY2Vzc2luZyBvZiBzY29wZXMgZm9yIGVhY2ggbW9kdWxlIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzY29wZUVycm9ycyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRGlhZ25vc3RpY1tdPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBkZXBlbmRlbmN5U2NvcGVSZWFkZXI6IER0c01vZHVsZVNjb3BlUmVzb2x2ZXIsIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlcixcbiAgICAgIHByaXZhdGUgYWxpYXNHZW5lcmF0b3I6IEFsaWFzR2VuZXJhdG9yfG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBOZ01vZHVsZSdzIGRhdGEgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJOZ01vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgZGF0YTogTG9jYWxOZ01vZHVsZURhdGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydENvbGxlY3RpbmcoKTtcbiAgICB0aGlzLm5nTW9kdWxlRGF0YS5zZXQoY2xhenosIGRhdGEpO1xuICAgIGZvciAoY29uc3QgZGVjbCBvZiBkYXRhLmRlY2xhcmF0aW9ucykge1xuICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLnNldChkZWNsLm5vZGUsIGNsYXp6KTtcbiAgICB9XG4gIH1cblxuICByZWdpc3RlckRpcmVjdGl2ZShkaXJlY3RpdmU6IFNjb3BlRGlyZWN0aXZlKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRDb2xsZWN0aW5nKCk7XG4gICAgdGhpcy5kaXJlY3RpdmVEYXRhLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gIH1cblxuICByZWdpc3RlclBpcGUocGlwZTogU2NvcGVQaXBlKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRDb2xsZWN0aW5nKCk7XG4gICAgdGhpcy5waXBlRGF0YS5zZXQocGlwZS5yZWYubm9kZSwgcGlwZSk7XG4gIH1cblxuICBnZXRTY29wZUZvckNvbXBvbmVudChjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgaWYgKCF0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGUodGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChjbGF6eikgISk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBhbmQgYG51bGxgIGlmIG5vIHNjb3BlIGlzXG4gICAqIGF2YWlsYWJsZSBvciB0aGUgc2NvcGUgY29udGFpbnMgZXJyb3JzLlxuICAgKi9cbiAgZ2V0U2NvcGVPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLmdldFNjb3BlT2ZNb2R1bGVJbnRlcm5hbChjbGF6eik7XG4gICAgLy8gVHJhbnNsYXRlIHVuZGVmaW5lZCAtPiBudWxsLlxuICAgIHJldHVybiBzY29wZSAhPT0gdW5kZWZpbmVkID8gc2NvcGUgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhbnkgYHRzLkRpYWdub3N0aWNgcyBwcm9kdWNlZCBkdXJpbmcgdGhlIGNhbGN1bGF0aW9uIG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgZm9yXG4gICAqIHRoZSBnaXZlbiBOZ01vZHVsZSwgb3IgYG51bGxgIGlmIG5vIGVycm9ycyB3ZXJlIHByZXNlbnQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc09mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdfG51bGwge1xuICAgIC8vIFJlcXVpcmVkIHRvIGVuc3VyZSB0aGUgZXJyb3JzIGFyZSBwb3B1bGF0ZWQgZm9yIHRoZSBnaXZlbiBjbGFzcy4gSWYgaXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG4gICAgLy8gYmVmb3JlLCB0aGlzIHdpbGwgYmUgYSBuby1vcCBkdWUgdG8gdGhlIHNjb3BlIGNhY2hlLlxuICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZShjbGF6eik7XG5cbiAgICBpZiAodGhpcy5zY29wZUVycm9ycy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY29wZUVycm9ycy5nZXQoY2xhenopICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBgZ2V0U2NvcGVPZk1vZHVsZWAgd2hpY2ggZGlmZmVyZW50aWF0ZXMgYmV0d2VlbiBubyBzY29wZSBiZWluZyBhdmFpbGFibGVcbiAgICogKHJldHVybnMgYG51bGxgKSBhbmQgYSBzY29wZSBiZWluZyBwcm9kdWNlZCB3aXRoIGVycm9ycyAocmV0dXJucyBgdW5kZWZpbmVkYCkuXG4gICAqL1xuICBwcml2YXRlIGdldFNjb3BlT2ZNb2R1bGVJbnRlcm5hbChjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbHx1bmRlZmluZWQge1xuICAgIC8vIFNlYWwgdGhlIHJlZ2lzdHJ5IHRvIHByb3RlY3QgdGhlIGludGVncml0eSBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGNhY2hlLlxuICAgIHRoaXMuc2VhbGVkID0gdHJ1ZTtcblxuICAgIC8vIExvb2sgZm9yIGNhY2hlZCBkYXRhIGlmIGF2YWlsYWJsZS5cbiAgICBpZiAodGhpcy5jYWNoZS5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQoY2xhenopO1xuICAgIH1cblxuICAgIC8vIGBjbGF6emAgc2hvdWxkIGJlIGFuIE5nTW9kdWxlIHByZXZpb3VzbHkgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBJZiBub3QsIGEgc2NvcGUgZm9yIGl0XG4gICAgLy8gY2Fubm90IGJlIHByb2R1Y2VkLlxuICAgIGlmICghdGhpcy5uZ01vZHVsZURhdGEuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5uZ01vZHVsZURhdGEuZ2V0KGNsYXp6KSAhO1xuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBTY29wZURpcmVjdGl2ZT4oKTtcbiAgICBjb25zdCBjb21waWxhdGlvblBpcGVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgU2NvcGVQaXBlPigpO1xuXG4gICAgY29uc3QgZGVjbGFyZWQgPSBuZXcgU2V0PHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBjbGF6ei5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgICAvLyBEaXJlY3RpdmVzIGFuZCBwaXBlcyBleHBvcnRlZCB0byBhbnkgaW1wb3J0aW5nIE5nTW9kdWxlcy5cbiAgICBjb25zdCBleHBvcnREaXJlY3RpdmVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgU2NvcGVEaXJlY3RpdmU+KCk7XG4gICAgY29uc3QgZXhwb3J0UGlwZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBTY29wZVBpcGU+KCk7XG5cbiAgICAvLyBUaGUgYWxnb3JpdGhtIGlzIGFzIGZvbGxvd3M6XG4gICAgLy8gMSkgQWRkIGRpcmVjdGl2ZXMvcGlwZXMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICAvLyAyKSBBZGQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGZyb20gZWFjaCBOZ01vZHVsZSBpbXBvcnRlZCBpbnRvIHRoZSBjdXJyZW50IG9uZSB0byB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZS4gQXQgdGhpcyBwb2ludCwgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIGlzIGNvbXBsZXRlLlxuICAgIC8vIDMpIEZvciBlYWNoIGVudHJ5IGluIHRoZSBOZ01vZHVsZSdzIGV4cG9ydHM6XG4gICAgLy8gICAgYSkgQXR0ZW1wdCB0byByZXNvbHZlIGl0IGFzIGFuIE5nTW9kdWxlIHdpdGggaXRzIG93biBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzLiBJZiBpdCBpc1xuICAgIC8vICAgICAgIG9uZSwgYWRkIHRoZW0gdG8gdGhlIGV4cG9ydCBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgIC8vICAgIGIpIE90aGVyd2lzZSwgaXQgc2hvdWxkIGJlIGEgY2xhc3MgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuIElmIGl0IGlzLFxuICAgIC8vICAgICAgIGFkZCBpdCB0byB0aGUgZXhwb3J0IHNjb3BlLlxuICAgIC8vICAgIGMpIElmIGl0J3MgbmVpdGhlciBhbiBOZ01vZHVsZSBub3IgYSBkaXJlY3RpdmUvcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUsIHRoZW4gdGhpc1xuICAgIC8vICAgICAgIGlzIGFuIGVycm9yLlxuXG4gICAgLy8gMSkgYWRkIGRlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZGVjbGFyYXRpb25zKSB7XG4gICAgICBpZiAodGhpcy5kaXJlY3RpdmVEYXRhLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMuZGlyZWN0aXZlRGF0YS5nZXQoZGVjbC5ub2RlKSAhO1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgey4uLmRpcmVjdGl2ZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMucGlwZURhdGEuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgY29uc3QgcGlwZSA9IHRoaXMucGlwZURhdGEuZ2V0KGRlY2wubm9kZSkgITtcbiAgICAgICAgY29tcGlsYXRpb25QaXBlcy5zZXQoZGVjbC5ub2RlLCB7Li4ucGlwZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHByb2R1Y2UgYSB0cy5EaWFnbm9zdGljLiBUaGlzIGNhbid0IGJlIGFuIGVycm9yIHJpZ2h0IG5vdyBzaW5jZSBzb21lXG4gICAgICAgIC8vIG5ndG9vbHMgdGVzdHMgcmVseSBvbiBhbmFseXNpcyBvZiBicm9rZW4gY29tcG9uZW50cy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRlY2xhcmVkLmFkZChkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIDIpIHByb2Nlc3MgaW1wb3J0cy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuaW1wb3J0cykge1xuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIGNsYXp6LCAnaW1wb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW4gaW1wb3J0IHdhc24ndCBhbiBOZ01vZHVsZSwgc28gcmVjb3JkIGFuIGVycm9yLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYoY2xhenosIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGltcG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihjbGF6eiwgZGVjbCwgJ2ltcG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDMpIHByb2Nlc3MgZXhwb3J0cy5cbiAgICAvLyBFeHBvcnRzIGNhbiBjb250YWluIG1vZHVsZXMsIGNvbXBvbmVudHMsIG9yIGRpcmVjdGl2ZXMuIFRoZXkncmUgcHJvY2Vzc2VkIGRpZmZlcmVudGx5LlxuICAgIC8vIE1vZHVsZXMgYXJlIHN0cmFpZ2h0Zm9yd2FyZC4gRGlyZWN0aXZlcyBhbmQgcGlwZXMgZnJvbSBleHBvcnRlZCBtb2R1bGVzIGFyZSBhZGRlZCB0byB0aGVcbiAgICAvLyBleHBvcnQgbWFwcy4gRGlyZWN0aXZlcy9waXBlcyBhcmUgZGlmZmVyZW50IC0gdGhleSBtaWdodCBiZSBleHBvcnRzIG9mIGRlY2xhcmVkIHR5cGVzIG9yXG4gICAgLy8gaW1wb3J0ZWQgdHlwZXMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBkZWNsIGFzIGFuIE5nTW9kdWxlLlxuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIGNsYXp6LCAnZXhwb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBbiBleHBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBleHBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoY2xhenosIGRlY2wsICdleHBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChpbXBvcnRTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIE5nTW9kdWxlLlxuICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgZXhwb3J0RGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICAgIGV4cG9ydFBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21waWxhdGlvbkRpcmVjdGl2ZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5nZXQoZGVjbC5ub2RlKSAhO1xuICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uUGlwZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIHBpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IHBpcGUgPSBjb21waWxhdGlvblBpcGVzLmdldChkZWNsLm5vZGUpICE7XG4gICAgICAgIGV4cG9ydFBpcGVzLnNldChkZWNsLm5vZGUsIHBpcGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhbiB1bmtub3duIGV4cG9ydC5cbiAgICAgICAgaWYgKHRoaXMuZGlyZWN0aXZlRGF0YS5oYXMoZGVjbC5ub2RlKSB8fCB0aGlzLnBpcGVEYXRhLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVleHBvcnQoY2xhenosIGRlY2wpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYoY2xhenosIGRlY2wsICdleHBvcnQnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0ZWQgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBBcnJheS5mcm9tKGV4cG9ydERpcmVjdGl2ZXMudmFsdWVzKCkpLFxuICAgICAgcGlwZXM6IEFycmF5LmZyb20oZXhwb3J0UGlwZXMudmFsdWVzKCkpLFxuICAgIH07XG5cbiAgICBsZXQgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGwgPSBudWxsO1xuICAgIGlmICh0aGlzLmFsaWFzR2VuZXJhdG9yICE9PSBudWxsKSB7XG4gICAgICByZWV4cG9ydHMgPSBbXTtcbiAgICAgIGNvbnN0IGFkZFJlZXhwb3J0ID0gKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KSA9PiB7XG4gICAgICAgIGlmICghZGVjbGFyZWQuaGFzKHJlZi5ub2RlKSAmJiByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgIT09IHNvdXJjZUZpbGUpIHtcbiAgICAgICAgICBjb25zdCBleHBvcnROYW1lID0gdGhpcy5hbGlhc0dlbmVyYXRvciAhLmFsaWFzU3ltYm9sTmFtZShyZWYubm9kZSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgaWYgKHJlZi5hbGlhcyAmJiByZWYuYWxpYXMgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICAgICAgICAgIHJlZXhwb3J0cyAhLnB1c2goe1xuICAgICAgICAgICAgICBmcm9tTW9kdWxlOiByZWYuYWxpYXMudmFsdWUubW9kdWxlTmFtZSAhLFxuICAgICAgICAgICAgICBzeW1ib2xOYW1lOiByZWYuYWxpYXMudmFsdWUubmFtZSAhLFxuICAgICAgICAgICAgICBhc0FsaWFzOiBleHBvcnROYW1lLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cHIgPSB0aGlzLnJlZkVtaXR0ZXIuZW1pdChyZWYuY2xvbmVXaXRoTm9JZGVudGlmaWVycygpLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHx8IGV4cHIudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgIGV4cHIudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIEV4dGVybmFsRXhwcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVleHBvcnRzICEucHVzaCh7XG4gICAgICAgICAgICAgIGZyb21Nb2R1bGU6IGV4cHIudmFsdWUubW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwci52YWx1ZS5uYW1lLFxuICAgICAgICAgICAgICBhc0FsaWFzOiBleHBvcnROYW1lLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHtyZWZ9IG9mIGV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBzY29wZSBoYWQgYW55IGVycm9ycyBkdXJpbmcgcHJvZHVjdGlvbi5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQ2FjaGUgdW5kZWZpbmVkLCB0byBtYXJrIHRoZSBmYWN0IHRoYXQgdGhlIHNjb3BlIGlzIGludmFsaWQuXG4gICAgICB0aGlzLmNhY2hlLnNldChjbGF6eiwgdW5kZWZpbmVkKTtcblxuICAgICAgLy8gU2F2ZSB0aGUgZXJyb3JzIGZvciByZXRyaWV2YWwuXG4gICAgICB0aGlzLnNjb3BlRXJyb3JzLnNldChjbGF6eiwgZGlhZ25vc3RpY3MpO1xuXG4gICAgICAvLyBSZXR1cm4gdW5kZWZpbmVkIHRvIGluZGljYXRlIHRoZSBzY29wZSBpcyBpbnZhbGlkLlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCBwcm9kdWNlIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgd2l0aCBib3RoIHRoZSBjb21waWxhdGlvbiBhbmQgZXhwb3J0IHNjb3Blcy5cbiAgICBjb25zdCBzY29wZSA9IHtcbiAgICAgIGNvbXBpbGF0aW9uOiB7XG4gICAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25EaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgICAgcGlwZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25QaXBlcy52YWx1ZXMoKSksXG4gICAgICB9LFxuICAgICAgZXhwb3J0ZWQsXG4gICAgICByZWV4cG9ydHMsXG4gICAgfTtcbiAgICB0aGlzLmNhY2hlLnNldChjbGF6eiwgc2NvcGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgY29tcG9uZW50IHJlcXVpcmVzIHJlbW90ZSBzY29waW5nLlxuICAgKi9cbiAgZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnJlbW90ZVNjb3BpbmcuaGFzKG5vZGUpOyB9XG5cbiAgLyoqXG4gICAqIFNldCBhIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBzZXRDb21wb25lbnRBc1JlcXVpcmluZ1JlbW90ZVNjb3Bpbmcobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMucmVtb3RlU2NvcGluZy5hZGQobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9vayB1cCB0aGUgYEV4cG9ydFNjb3BlYCBvZiBhIGdpdmVuIGBSZWZlcmVuY2VgIHRvIGFuIE5nTW9kdWxlLlxuICAgKlxuICAgKiBUaGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24gbWF5IGJlIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgdHMuUHJvZ3JhbSwgb3IgaXQgbWF5IGJlXG4gICAqIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZS5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiB3aWxsIHJldHVybiBgbnVsbGAgaWYgbm8gc2NvcGUgY291bGQgYmUgZm91bmQsIG9yIGB1bmRlZmluZWRgIGlmIGFuIGludmFsaWQgc2NvcGVcbiAgICogd2FzIGZvdW5kLiBJdCBjYW4gYWxzbyBjb250cmlidXRlIGRpYWdub3N0aWNzIG9mIGl0cyBvd24gYnkgYWRkaW5nIHRvIHRoZSBnaXZlbiBgZGlhZ25vc3RpY3NgXG4gICAqIGFycmF5IHBhcmFtZXRlci5cbiAgICovXG4gIHByaXZhdGUgZ2V0RXhwb3J0ZWRTY29wZShcbiAgICAgIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdLFxuICAgICAgb3duZXJGb3JFcnJvcnM6IHRzLkRlY2xhcmF0aW9uLCB0eXBlOiAnaW1wb3J0J3wnZXhwb3J0Jyk6IEV4cG9ydFNjb3BlfG51bGx8dW5kZWZpbmVkIHtcbiAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAvLyBUaGUgTmdNb2R1bGUgaXMgZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLiBSZXNvbHZlIGl0IHdpdGggdGhlIGBEZXBlbmRlbmN5U2NvcGVSZWFkZXJgLlxuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBpbiBhIC5kLnRzIGZpbGUgYnV0IGlzIG5vdCBkZWNsYXJlZCBhcyBhIHRzLkNsYXNzRGVjbGFyYXRpb24uIFRoaXMgaXMgYW5cbiAgICAgICAgLy8gZXJyb3IgaW4gdGhlIC5kLnRzIG1ldGFkYXRhLlxuICAgICAgICBjb25zdCBjb2RlID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKHJlZi5ub2RlKSB8fCByZWYubm9kZSxcbiAgICAgICAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3Iob3duZXJGb3JFcnJvcnMpfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiBOZ01vZHVsZWApKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRlcGVuZGVuY3lTY29wZVJlYWRlci5yZXNvbHZlKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHByb2dyYW0uIFJlc29sdmUgaXQgZnJvbSB0aGUgcmVnaXN0cnkuXG4gICAgICByZXR1cm4gdGhpcy5nZXRTY29wZU9mTW9kdWxlSW50ZXJuYWwocmVmLm5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0Q29sbGVjdGluZygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZWFsZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uOiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaXMgbm90IENPTExFQ1RJTkdgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbnZhbGlkIGltcG9ydCBvciBleHBvcnQgZnJvbSBhbiBOZ01vZHVsZS5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZihcbiAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sXG4gICAgdHlwZTogJ2ltcG9ydCcgfCAnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICBjb25zdCByZXNvbHZlVGFyZ2V0ID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnTmdNb2R1bGUnIDogJ05nTW9kdWxlLCBDb21wb25lbnQsIERpcmVjdGl2ZSwgb3IgUGlwZSc7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgdG8gYW4gJHtyZXNvbHZlVGFyZ2V0fSBjbGFzc2ApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGltcG9ydCBvciBleHBvcnQgd2hpY2ggaXRzZWxmIGhhcyBlcnJvcnMuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGl0c2VsZiBoYXMgZXJyb3JzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gZXhwb3J0ZWQgZGlyZWN0aXZlIG9yIHBpcGUgd2hpY2ggd2FzIG5vdCBkZWNsYXJlZCBvciBpbXBvcnRlZFxuICogYnkgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVleHBvcnQoY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX1JFRVhQT1JULCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYFByZXNlbnQgaW4gdGhlIE5nTW9kdWxlLmV4cG9ydHMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0gYnV0IG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkYCk7XG59XG4iXX0=