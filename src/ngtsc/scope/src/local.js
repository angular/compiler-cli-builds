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
        function LocalModuleScopeRegistry(localReader, dependencyScopeReader, refEmitter, aliasingHost) {
            this.localReader = localReader;
            this.dependencyScopeReader = dependencyScopeReader;
            this.refEmitter = refEmitter;
            this.aliasingHost = aliasingHost;
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
             * NgModule's file instead of directly on the component def (which is sometimes needed to get
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
            var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e, e_7, _f, e_8, _g;
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
                for (var _h = tslib_1.__values(ngModule.declarations), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var decl = _j.value;
                    var directive = this.localReader.getDirectiveMetadata(decl);
                    var pipe = this.localReader.getPipeMetadata(decl);
                    if (directive !== null) {
                        compilationDirectives.set(decl.node, tslib_1.__assign(tslib_1.__assign({}, directive), { ref: decl }));
                    }
                    else if (pipe !== null) {
                        compilationPipes.set(decl.node, tslib_1.__assign(tslib_1.__assign({}, pipe), { ref: decl }));
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
                    if (_j && !_j.done && (_a = _h.return)) _a.call(_h);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // 2) process imports.
                for (var _k = tslib_1.__values(ngModule.imports), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var decl = _l.value;
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
                        for (var _m = (e_4 = void 0, tslib_1.__values(importScope.exported.directives)), _o = _m.next(); !_o.done; _o = _m.next()) {
                            var directive = _o.value;
                            compilationDirectives.set(directive.ref.node, directive);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                    try {
                        for (var _p = (e_5 = void 0, tslib_1.__values(importScope.exported.pipes)), _q = _p.next(); !_q.done; _q = _p.next()) {
                            var pipe = _q.value;
                            compilationPipes.set(pipe.ref.node, pipe);
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_b = _k.return)) _b.call(_k);
                }
                finally { if (e_3) throw e_3.error; }
            }
            try {
                // 3) process exports.
                // Exports can contain modules, components, or directives. They're processed differently.
                // Modules are straightforward. Directives and pipes from exported modules are added to the
                // export maps. Directives/pipes are different - they might be exports of declared types or
                // imported types.
                for (var _r = tslib_1.__values(ngModule.exports), _s = _r.next(); !_s.done; _s = _r.next()) {
                    var decl = _s.value;
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
                            for (var _t = (e_7 = void 0, tslib_1.__values(importScope.exported.directives)), _u = _t.next(); !_u.done; _u = _t.next()) {
                                var directive = _u.value;
                                exportDirectives.set(directive.ref.node, directive);
                            }
                        }
                        catch (e_7_1) { e_7 = { error: e_7_1 }; }
                        finally {
                            try {
                                if (_u && !_u.done && (_f = _t.return)) _f.call(_t);
                            }
                            finally { if (e_7) throw e_7.error; }
                        }
                        try {
                            for (var _v = (e_8 = void 0, tslib_1.__values(importScope.exported.pipes)), _w = _v.next(); !_w.done; _w = _v.next()) {
                                var pipe = _w.value;
                                exportPipes.set(pipe.ref.node, pipe);
                            }
                        }
                        catch (e_8_1) { e_8 = { error: e_8_1 }; }
                        finally {
                            try {
                                if (_w && !_w.done && (_g = _v.return)) _g.call(_v);
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
                    if (_s && !_s.done && (_e = _r.return)) _e.call(_r);
                }
                finally { if (e_6) throw e_6.error; }
            }
            var exported = {
                directives: Array.from(exportDirectives.values()),
                pipes: Array.from(exportPipes.values()),
            };
            var reexports = this.getReexports(ngModule, ref, declared, exported, diagnostics);
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
        LocalModuleScopeRegistry.prototype.getReexports = function (ngModule, ref, declared, exported, diagnostics) {
            var e_9, _a, e_10, _b;
            var _this = this;
            var reexports = null;
            var sourceFile = ref.node.getSourceFile();
            if (this.aliasingHost === null) {
                return null;
            }
            reexports = [];
            // Track re-exports by symbol name, to produce diagnostics if two alias re-exports would share
            // the same name.
            var reexportMap = new Map();
            // Alias ngModuleRef added for readability below.
            var ngModuleRef = ref;
            var addReexport = function (exportRef) {
                if (exportRef.node.getSourceFile() === sourceFile) {
                    return;
                }
                var isReExport = !declared.has(exportRef.node);
                var exportName = _this.aliasingHost.maybeAliasSymbolAs(exportRef, sourceFile, ngModule.ref.node.name.text, isReExport);
                if (exportName === null) {
                    return;
                }
                if (!reexportMap.has(exportName)) {
                    if (exportRef.alias && exportRef.alias instanceof compiler_1.ExternalExpr) {
                        reexports.push({
                            fromModule: exportRef.alias.value.moduleName,
                            symbolName: exportRef.alias.value.name,
                            asAlias: exportName,
                        });
                    }
                    else {
                        var expr = _this.refEmitter.emit(exportRef.cloneWithNoIdentifiers(), sourceFile);
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
                    reexportMap.set(exportName, exportRef);
                }
                else {
                    // Another re-export already used this name. Produce a diagnostic.
                    var prevRef = reexportMap.get(exportName);
                    diagnostics.push(reexportCollision(ngModuleRef.node, prevRef, exportRef));
                }
            };
            try {
                for (var _c = tslib_1.__values(exported.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var ref_1 = _d.value.ref;
                    addReexport(ref_1);
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_9) throw e_9.error; }
            }
            try {
                for (var _e = tslib_1.__values(exported.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var ref_2 = _f.value.ref;
                    addReexport(ref_2);
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_10) throw e_10.error; }
            }
            return reexports;
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
    /**
     * Produce a `ts.Diagnostic` for a collision in re-export names between two directives/pipes.
     */
    function reexportCollision(module, refA, refB) {
        var childMessageText = "This directive/pipe is part of the exports of '" + module.name.text + "' and shares the same name as another exported directive/pipe.";
        return diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_REEXPORT_NAME_COLLISION, module.name, ("\n    There was a name collision between two classes named '" + refA.node.name.text + "', which are both part of the exports of '" + module.name.text + "'.\n\n    Angular generates re-exports of an NgModule's exported directives/pipes from the module's source file in certain cases, using the declared name of the class. If two classes of the same name are exported, this automatic naming does not work.\n\n    To fix this problem please re-export one or both classes directly from this file.\n  ").trim(), [
            { node: refA.node.name, messageText: childMessageText },
            { node: refB.node.name, messageText: childMessageText },
        ]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Q7SUFDL0QsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCxrRkFBNkU7SUE0QjdFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQTBDRSxrQ0FDWSxXQUEyQixFQUFVLHFCQUE2QyxFQUNsRixVQUE0QixFQUFVLFlBQStCO1lBRHJFLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7WUFDbEYsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7WUEzQ2pGOzs7O2VBSUc7WUFDSyxXQUFNLEdBQUcsS0FBSyxDQUFDO1lBRXZCOzs7Ozs7ZUFNRztZQUNLLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1lBRXBFLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWlELENBQUM7WUFFL0U7Ozs7O2VBS0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXFELENBQUM7WUFFN0U7Ozs7Ozs7ZUFPRztZQUNLLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7WUFFcEQ7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBSWlCLENBQUM7UUFFckY7O1dBRUc7UUFDSCwyREFBd0IsR0FBeEIsVUFBeUIsSUFBa0I7O1lBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMs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TUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLDRWQUt6SSxDQUFBLENBQUMsSUFBSSxFQUFFLEVBQ0o7WUFDRSxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUM7WUFDckQsRUFBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFDO1NBQ3RELENBQUMsQ0FBQztJQUNULENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXh0ZXJuYWxFeHByLCBTY2hlbWFNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBtYWtlRGlhZ25vc3RpY30gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtBbGlhc2luZ0hvc3QsIFJlZXhwb3J0LCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aWRlbnRpZmllck9mTm9kZSwgbm9kZU5hbWVGb3JFcnJvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXhwb3J0U2NvcGUsIFNjb3BlRGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi9jb21wb25lbnRfc2NvcGUnO1xuaW1wb3J0IHtEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY3knO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTmdNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTW9kdWxlU2NvcGUgZXh0ZW5kcyBFeHBvcnRTY29wZSB7XG4gIGNvbXBpbGF0aW9uOiBTY29wZURhdGE7XG4gIHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsO1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIHJlZ2lzdGVyZWQgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsYXRpb25TY29wZSBleHRlbmRzIFNjb3BlRGF0YSB7XG4gIC8qKiBUaGUgZGVjbGFyYXRpb24gd2hvc2UgY29tcGlsYXRpb24gc2NvcGUgaXMgZGVzY3JpYmVkIGhlcmUuICovXG4gIGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uO1xuICAvKiogVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBOZ01vZHVsZSB0aGF0IGRlY2xhcmVzIHRoaXMgYGRlY2xhcmF0aW9uYC4gKi9cbiAgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb247XG59XG5cbi8qKlxuICogQSByZWdpc3RyeSB3aGljaCBjb2xsZWN0cyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIERpcmVjdGl2ZXMsIENvbXBvbmVudHMsIGFuZCBQaXBlcyB3aGljaFxuICogYXJlIGxvY2FsIChkZWNsYXJlZCBpbiB0aGUgdHMuUHJvZ3JhbSBiZWluZyBjb21waWxlZCksIGFuZCBjYW4gcHJvZHVjZSBgTG9jYWxNb2R1bGVTY29wZWBzXG4gKiB3aGljaCBzdW1tYXJpemUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgY29tcG9uZW50LlxuICpcbiAqIFRoaXMgY2xhc3MgaW1wbGVtZW50cyB0aGUgbG9naWMgb2YgTmdNb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cyBhbmQgY2FuIHByb2R1Y2UsXG4gKiBmb3IgYSBnaXZlbiBjb21wb25lbnQsIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIFwidmlzaWJsZVwiIGluIHRoYXQgY29tcG9uZW50J3NcbiAqIHRlbXBsYXRlLlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBoYXMgdHdvIFwibW9kZXNcIiBvZiBvcGVyYXRpb24uIER1cmluZyBhbmFseXNpcywgZGF0YSBmb3IgZWFjaFxuICogaW5kaXZpZHVhbCBOZ01vZHVsZSwgRGlyZWN0aXZlLCBDb21wb25lbnQsIGFuZCBQaXBlIGlzIGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gTm8gYXR0ZW1wdCBpcyBtYWRlXG4gKiB0byB0cmF2ZXJzZSBvciB2YWxpZGF0ZSB0aGUgTmdNb2R1bGUgZ3JhcGggKGltcG9ydHMsIGV4cG9ydHMsIGV0YykuIEFmdGVyIGFuYWx5c2lzLCBvbmUgb2ZcbiAqIGBnZXRTY29wZU9mTW9kdWxlYCBvciBgZ2V0U2NvcGVGb3JDb21wb25lbnRgIGNhbiBiZSBjYWxsZWQsIHdoaWNoIHRyYXZlcnNlcyB0aGUgTmdNb2R1bGUgZ3JhcGhcbiAqIGFuZCBhcHBsaWVzIHRoZSBOZ01vZHVsZSBsb2dpYyB0byBnZW5lcmF0ZSBhIGBMb2NhbE1vZHVsZVNjb3BlYCwgdGhlIGZ1bGwgc2NvcGUgZm9yIHRoZSBnaXZlblxuICogbW9kdWxlIG9yIGNvbXBvbmVudC5cbiAqXG4gKiBUaGUgYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWAgaXMgYWxzbyBjYXBhYmxlIG9mIHByb2R1Y2luZyBgdHMuRGlhZ25vc3RpY2AgZXJyb3JzIHdoZW4gQW5ndWxhclxuICogc2VtYW50aWNzIGFyZSB2aW9sYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSBpbXBsZW1lbnRzIE1ldGFkYXRhUmVnaXN0cnksIENvbXBvbmVudFNjb3BlUmVhZGVyIHtcbiAgLyoqXG4gICAqIFRyYWNrcyB3aGV0aGVyIHRoZSByZWdpc3RyeSBoYXMgYmVlbiBhc2tlZCB0byBwcm9kdWNlIHNjb3BlcyBmb3IgYSBtb2R1bGUgb3IgY29tcG9uZW50LiBPbmNlXG4gICAqIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlZ2lzdHJ5IGNhbm5vdCBhY2NlcHQgcmVnaXN0cmF0aW9ucyBvZiBuZXcgZGlyZWN0aXZlcy9waXBlcy9tb2R1bGVzIGFzIGl0XG4gICAqIHdvdWxkIGludmFsaWRhdGUgdGhlIGNhY2hlZCBzY29wZSBkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBzZWFsZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgY29tcG9uZW50cyBmcm9tIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlIE5nTW9kdWxlIHdoaWNoIGRlY2xhcmVkIHRoZW0uXG4gICAqXG4gICAqIEFzIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgYXJlIG5vdCBkaXN0aW5ndWlzaGVkIGF0IHRoZSBOZ01vZHVsZSBsZXZlbCwgdGhpcyBtYXAgbWF5IGFsc29cbiAgICogY29udGFpbiBkaXJlY3RpdmVzLiBUaGlzIGRvZXNuJ3QgY2F1c2UgYW55IHByb2JsZW1zIGJ1dCBpc24ndCB1c2VmdWwgYXMgdGhlcmUgaXMgbm8gY29uY2VwdCBvZlxuICAgKiBhIGRpcmVjdGl2ZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWNsYXJhdGlvblRvTW9kdWxlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIHByaXZhdGUgbW9kdWxlVG9SZWYgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBjYWxjdWxhdGVkIGBMb2NhbE1vZHVsZVNjb3BlYHMgZm9yIGVhY2ggTmdNb2R1bGUgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhlIHNjb3BlIHdhcyBpbnZhbGlkIGFuZCBwcm9kdWNlZCBlcnJvcnMgKHRoZXJlZm9yZSxcbiAgICogZGlhZ25vc3RpY3Mgc2hvdWxkIGV4aXN0IGluIHRoZSBgc2NvcGVFcnJvcnNgIG1hcCkuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE1vZHVsZVNjb3BlfHVuZGVmaW5lZHxudWxsPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hldGhlciBhIGdpdmVuIGNvbXBvbmVudCByZXF1aXJlcyBcInJlbW90ZSBzY29waW5nXCIuXG4gICAqXG4gICAqIFJlbW90ZSBzY29waW5nIGlzIHdoZW4gdGhlIHNldCBvZiBkaXJlY3RpdmVzIHdoaWNoIGFwcGx5IHRvIGEgZ2l2ZW4gY29tcG9uZW50IGlzIHNldCBpbiB0aGVcbiAgICogTmdNb2R1bGUncyBmaWxlIGluc3RlYWQgb2YgZGlyZWN0bHkgb24gdGhlIGNvbXBvbmVudCBkZWYgKHdoaWNoIGlzIHNvbWV0aW1lcyBuZWVkZWQgdG8gZ2V0XG4gICAqIGFyb3VuZCBjeWNsaWMgaW1wb3J0IGlzc3VlcykuIFRoaXMgaXMgbm90IHVzZWQgaW4gY2FsY3VsYXRpb24gb2YgYExvY2FsTW9kdWxlU2NvcGVgcywgYnV0IGlzXG4gICAqIHRyYWNrZWQgaGVyZSBmb3IgY29udmVuaWVuY2UuXG4gICAqL1xuICBwcml2YXRlIHJlbW90ZVNjb3BpbmcgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBlcnJvcnMgYWNjdW11bGF0ZWQgaW4gdGhlIHByb2Nlc3Npbmcgb2Ygc2NvcGVzIGZvciBlYWNoIG1vZHVsZSBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVFcnJvcnMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkRpYWdub3N0aWNbXT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9jYWxSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlcGVuZGVuY3lTY29wZVJlYWRlcjogRHRzTW9kdWxlU2NvcGVSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gTmdNb2R1bGUncyBkYXRhIHRvIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShkYXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydENvbGxlY3RpbmcoKTtcbiAgICB0aGlzLm1vZHVsZVRvUmVmLnNldChkYXRhLnJlZi5ub2RlLCBkYXRhLnJlZik7XG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEuZGVjbGFyYXRpb25zKSB7XG4gICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuc2V0KGRlY2wubm9kZSwgZGF0YS5yZWYubm9kZSk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmU6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHt9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEocGlwZTogUGlwZU1ldGEpOiB2b2lkIHt9XG5cbiAgZ2V0U2NvcGVGb3JDb21wb25lbnQoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gIXRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5oYXMoY2xhenopID9cbiAgICAgICAgbnVsbCA6XG4gICAgICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZSh0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGNsYXp6KSAhKTtcbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBhbmQgYG51bGxgIGlmIG5vIHNjb3BlIGlzXG4gICAqIGF2YWlsYWJsZSBvciB0aGUgc2NvcGUgY29udGFpbnMgZXJyb3JzLlxuICAgKi9cbiAgZ2V0U2NvcGVPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSB0aGlzLm1vZHVsZVRvUmVmLmhhcyhjbGF6eikgP1xuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UodGhpcy5tb2R1bGVUb1JlZi5nZXQoY2xhenopICEpIDpcbiAgICAgICAgbnVsbDtcbiAgICAvLyBUcmFuc2xhdGUgdW5kZWZpbmVkIC0+IG51bGwuXG4gICAgcmV0dXJuIHNjb3BlICE9PSB1bmRlZmluZWQgPyBzY29wZSA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGFueSBgdHMuRGlhZ25vc3RpY2BzIHByb2R1Y2VkIGR1cmluZyB0aGUgY2FsY3VsYXRpb24gb2YgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCBmb3JcbiAgICogdGhlIGdpdmVuIE5nTW9kdWxlLCBvciBgbnVsbGAgaWYgbm8gZXJyb3JzIHdlcmUgcHJlc2VudC5cbiAgICovXG4gIGdldERpYWdub3N0aWNzT2ZNb2R1bGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW118bnVsbCB7XG4gICAgLy8gUmVxdWlyZWQgdG8gZW5zdXJlIHRoZSBlcnJvcnMgYXJlIHBvcHVsYXRlZCBmb3IgdGhlIGdpdmVuIGNsYXNzLiBJZiBpdCBoYXMgYmVlbiBwcm9jZXNzZWRcbiAgICAvLyBiZWZvcmUsIHRoaXMgd2lsbCBiZSBhIG5vLW9wIGR1ZSB0byB0aGUgc2NvcGUgY2FjaGUuXG4gICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlKGNsYXp6KTtcblxuICAgIGlmICh0aGlzLnNjb3BlRXJyb3JzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlRXJyb3JzLmdldChjbGF6eikgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb2xsZWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbiBzY29wZSBmb3IgZWFjaCByZWdpc3RlcmVkIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0Q29tcGlsYXRpb25TY29wZXMoKTogQ29tcGlsYXRpb25TY29wZVtdIHtcbiAgICBjb25zdCBzY29wZXM6IENvbXBpbGF0aW9uU2NvcGVbXSA9IFtdO1xuICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5mb3JFYWNoKChuZ01vZHVsZSwgZGVjbGFyYXRpb24pID0+IHtcbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRTY29wZU9mTW9kdWxlKG5nTW9kdWxlKTtcbiAgICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgICBzY29wZXMucHVzaCh7ZGVjbGFyYXRpb24sIG5nTW9kdWxlLCAuLi5zY29wZS5jb21waWxhdGlvbn0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzY29wZXM7XG4gIH1cblxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgYGdldFNjb3BlT2ZNb2R1bGVgIHdoaWNoIGFjY2VwdHMgYSByZWZlcmVuY2UgdG8gYSBjbGFzcyBhbmQgZGlmZmVyZW50aWF0ZXNcbiAgICogYmV0d2VlbjpcbiAgICpcbiAgICogKiBubyBzY29wZSBiZWluZyBhdmFpbGFibGUgKHJldHVybnMgYG51bGxgKVxuICAgKiAqIGEgc2NvcGUgYmVpbmcgcHJvZHVjZWQgd2l0aCBlcnJvcnMgKHJldHVybnMgYHVuZGVmaW5lZGApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTG9jYWxNb2R1bGVTY29wZXxudWxsXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQocmVmLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIFNlYWwgdGhlIHJlZ2lzdHJ5IHRvIHByb3RlY3QgdGhlIGludGVncml0eSBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGNhY2hlLlxuICAgIHRoaXMuc2VhbGVkID0gdHJ1ZTtcblxuICAgIC8vIGByZWZgIHNob3VsZCBiZSBhbiBOZ01vZHVsZSBwcmV2aW91c2x5IGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gSWYgbm90LCBhIHNjb3BlIGZvciBpdFxuICAgIC8vIGNhbm5vdCBiZSBwcm9kdWNlZC5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWYpO1xuICAgIGlmIChuZ01vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIG51bGwpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uUGlwZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcblxuICAgIGNvbnN0IGRlY2xhcmVkID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGV4cG9ydGVkIHRvIGFueSBpbXBvcnRpbmcgTmdNb2R1bGVzLlxuICAgIGNvbnN0IGV4cG9ydERpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGV4cG9ydFBpcGVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgUGlwZU1ldGE+KCk7XG5cbiAgICAvLyBUaGUgYWxnb3JpdGhtIGlzIGFzIGZvbGxvd3M6XG4gICAgLy8gMSkgQWRkIGRpcmVjdGl2ZXMvcGlwZXMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICAvLyAyKSBBZGQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGZyb20gZWFjaCBOZ01vZHVsZSBpbXBvcnRlZCBpbnRvIHRoZSBjdXJyZW50IG9uZSB0byB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZS4gQXQgdGhpcyBwb2ludCwgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIGlzIGNvbXBsZXRlLlxuICAgIC8vIDMpIEZvciBlYWNoIGVudHJ5IGluIHRoZSBOZ01vZHVsZSdzIGV4cG9ydHM6XG4gICAgLy8gICAgYSkgQXR0ZW1wdCB0byByZXNvbHZlIGl0IGFzIGFuIE5nTW9kdWxlIHdpdGggaXRzIG93biBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzLiBJZiBpdCBpc1xuICAgIC8vICAgICAgIG9uZSwgYWRkIHRoZW0gdG8gdGhlIGV4cG9ydCBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgIC8vICAgIGIpIE90aGVyd2lzZSwgaXQgc2hvdWxkIGJlIGEgY2xhc3MgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuIElmIGl0IGlzLFxuICAgIC8vICAgICAgIGFkZCBpdCB0byB0aGUgZXhwb3J0IHNjb3BlLlxuICAgIC8vICAgIGMpIElmIGl0J3MgbmVpdGhlciBhbiBOZ01vZHVsZSBub3IgYSBkaXJlY3RpdmUvcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUsIHRoZW4gdGhpc1xuICAgIC8vICAgICAgIGlzIGFuIGVycm9yLlxuXG4gICAgLy8gMSkgYWRkIGRlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgY29uc3QgcGlwZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgaWYgKGRpcmVjdGl2ZSAhPT0gbnVsbCkge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgey4uLmRpcmVjdGl2ZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2UgaWYgKHBpcGUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25QaXBlcy5zZXQoZGVjbC5ub2RlLCB7Li4ucGlwZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUT0RPKGFseGh1Yik6IHByb2R1Y2UgYSB0cy5EaWFnbm9zdGljLiBUaGlzIGNhbid0IGJlIGFuIGVycm9yIHJpZ2h0IG5vdyBzaW5jZSBzb21lXG4gICAgICAgIC8vIG5ndG9vbHMgdGVzdHMgcmVseSBvbiBhbmFseXNpcyBvZiBicm9rZW4gY29tcG9uZW50cy5cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRlY2xhcmVkLmFkZChkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIDIpIHByb2Nlc3MgaW1wb3J0cy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuaW1wb3J0cykge1xuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIHJlZi5ub2RlLCAnaW1wb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW4gaW1wb3J0IHdhc24ndCBhbiBOZ01vZHVsZSwgc28gcmVjb3JkIGFuIGVycm9yLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGltcG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2ltcG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDMpIHByb2Nlc3MgZXhwb3J0cy5cbiAgICAvLyBFeHBvcnRzIGNhbiBjb250YWluIG1vZHVsZXMsIGNvbXBvbmVudHMsIG9yIGRpcmVjdGl2ZXMuIFRoZXkncmUgcHJvY2Vzc2VkIGRpZmZlcmVudGx5LlxuICAgIC8vIE1vZHVsZXMgYXJlIHN0cmFpZ2h0Zm9yd2FyZC4gRGlyZWN0aXZlcyBhbmQgcGlwZXMgZnJvbSBleHBvcnRlZCBtb2R1bGVzIGFyZSBhZGRlZCB0byB0aGVcbiAgICAvLyBleHBvcnQgbWFwcy4gRGlyZWN0aXZlcy9waXBlcyBhcmUgZGlmZmVyZW50IC0gdGhleSBtaWdodCBiZSBleHBvcnRzIG9mIGRlY2xhcmVkIHR5cGVzIG9yXG4gICAgLy8gaW1wb3J0ZWQgdHlwZXMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBkZWNsIGFzIGFuIE5nTW9kdWxlLlxuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIHJlZi5ub2RlLCAnZXhwb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBbiBleHBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBleHBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdleHBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChpbXBvcnRTY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIE5nTW9kdWxlLlxuICAgICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgICAgZXhwb3J0RGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICAgIGV4cG9ydFBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21waWxhdGlvbkRpcmVjdGl2ZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5nZXQoZGVjbC5ub2RlKSAhO1xuICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uUGlwZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIHBpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IHBpcGUgPSBjb21waWxhdGlvblBpcGVzLmdldChkZWNsLm5vZGUpICE7XG4gICAgICAgIGV4cG9ydFBpcGVzLnNldChkZWNsLm5vZGUsIHBpcGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhbiB1bmtub3duIGV4cG9ydC5cbiAgICAgICAgaWYgKHRoaXMubG9jYWxSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCkgIT09IG51bGwgfHxcbiAgICAgICAgICAgIHRoaXMubG9jYWxSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpICE9PSBudWxsKSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVleHBvcnQocmVmLm5vZGUsIGRlY2wpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYocmVmLm5vZGUsIGRlY2wsICdleHBvcnQnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0ZWQgPSB7XG4gICAgICBkaXJlY3RpdmVzOiBBcnJheS5mcm9tKGV4cG9ydERpcmVjdGl2ZXMudmFsdWVzKCkpLFxuICAgICAgcGlwZXM6IEFycmF5LmZyb20oZXhwb3J0UGlwZXMudmFsdWVzKCkpLFxuICAgIH07XG5cbiAgICBjb25zdCByZWV4cG9ydHMgPSB0aGlzLmdldFJlZXhwb3J0cyhuZ01vZHVsZSwgcmVmLCBkZWNsYXJlZCwgZXhwb3J0ZWQsIGRpYWdub3N0aWNzKTtcblxuICAgIC8vIENoZWNrIGlmIHRoaXMgc2NvcGUgaGFkIGFueSBlcnJvcnMgZHVyaW5nIHByb2R1Y3Rpb24uXG4gICAgaWYgKGRpYWdub3N0aWNzLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIENhY2hlIHVuZGVmaW5lZCwgdG8gbWFyayB0aGUgZmFjdCB0aGF0IHRoZSBzY29wZSBpcyBpbnZhbGlkLlxuICAgICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIHVuZGVmaW5lZCk7XG5cbiAgICAgIC8vIFNhdmUgdGhlIGVycm9ycyBmb3IgcmV0cmlldmFsLlxuICAgICAgdGhpcy5zY29wZUVycm9ycy5zZXQocmVmLm5vZGUsIGRpYWdub3N0aWNzKTtcblxuICAgICAgLy8gUmV0dXJuIHVuZGVmaW5lZCB0byBpbmRpY2F0ZSB0aGUgc2NvcGUgaXMgaW52YWxpZC5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCB1bmRlZmluZWQpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBGaW5hbGx5LCBwcm9kdWNlIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgd2l0aCBib3RoIHRoZSBjb21waWxhdGlvbiBhbmQgZXhwb3J0IHNjb3Blcy5cbiAgICBjb25zdCBzY29wZSA9IHtcbiAgICAgIGNvbXBpbGF0aW9uOiB7XG4gICAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25EaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgICAgcGlwZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25QaXBlcy52YWx1ZXMoKSksXG4gICAgICB9LFxuICAgICAgZXhwb3J0ZWQsXG4gICAgICByZWV4cG9ydHMsXG4gICAgICBzY2hlbWFzOiBuZ01vZHVsZS5zY2hlbWFzLFxuICAgIH07XG4gICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIHNjb3BlKTtcbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGNvbXBvbmVudCByZXF1aXJlcyByZW1vdGUgc2NvcGluZy5cbiAgICovXG4gIGdldFJlcXVpcmVzUmVtb3RlU2NvcGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4geyByZXR1cm4gdGhpcy5yZW1vdGVTY29waW5nLmhhcyhub2RlKTsgfVxuXG4gIC8qKlxuICAgKiBTZXQgYSBjb21wb25lbnQgYXMgcmVxdWlyaW5nIHJlbW90ZSBzY29waW5nLlxuICAgKi9cbiAgc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICB0aGlzLnJlbW90ZVNjb3BpbmcuYWRkKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgdGhlIGBFeHBvcnRTY29wZWAgb2YgYSBnaXZlbiBgUmVmZXJlbmNlYCB0byBhbiBOZ01vZHVsZS5cbiAgICpcbiAgICogVGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uIG1heSBiZSBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHRzLlByb2dyYW0sIG9yIGl0IG1heSBiZVxuICAgKiBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuXG4gICAqXG4gICAqIEByZXR1cm5zIGBudWxsYCBpZiBubyBzY29wZSBjb3VsZCBiZSBmb3VuZCwgb3IgYHVuZGVmaW5lZGAgaWYgYW4gaW52YWxpZCBzY29wZVxuICAgKiB3YXMgZm91bmQuXG4gICAqXG4gICAqIE1heSBhbHNvIGNvbnRyaWJ1dGUgZGlhZ25vc3RpY3Mgb2YgaXRzIG93biBieSBhZGRpbmcgdG8gdGhlIGdpdmVuIGBkaWFnbm9zdGljc2BcbiAgICogYXJyYXkgcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHBvcnRlZFNjb3BlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgICBvd25lckZvckVycm9yczogdHMuRGVjbGFyYXRpb24sIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogRXhwb3J0U2NvcGV8bnVsbHx1bmRlZmluZWQge1xuICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuIFJlc29sdmUgaXQgd2l0aCB0aGUgYERlcGVuZGVuY3lTY29wZVJlYWRlcmAuXG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGluIGEgLmQudHMgZmlsZSBidXQgaXMgbm90IGRlY2xhcmVkIGFzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbi4gVGhpcyBpcyBhblxuICAgICAgICAvLyBlcnJvciBpbiB0aGUgLmQudHMgbWV0YWRhdGEuXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUocmVmLm5vZGUpIHx8IHJlZi5ub2RlLFxuICAgICAgICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihvd25lckZvckVycm9ycyl9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuIE5nTW9kdWxlYCkpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeVNjb3BlUmVhZGVyLnJlc29sdmUocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS4gUmVzb2x2ZSBpdCBmcm9tIHRoZSByZWdpc3RyeS5cbiAgICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0cyhcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZU1ldGEsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJlZDogU2V0PHRzLkRlY2xhcmF0aW9uPixcbiAgICAgIGV4cG9ydGVkOiB7ZGlyZWN0aXZlczogRGlyZWN0aXZlTWV0YVtdLCBwaXBlczogUGlwZU1ldGFbXX0sXG4gICAgICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogUmVleHBvcnRbXXxudWxsIHtcbiAgICBsZXQgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKHRoaXMuYWxpYXNpbmdIb3N0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmVleHBvcnRzID0gW107XG4gICAgLy8gVHJhY2sgcmUtZXhwb3J0cyBieSBzeW1ib2wgbmFtZSwgdG8gcHJvZHVjZSBkaWFnbm9zdGljcyBpZiB0d28gYWxpYXMgcmUtZXhwb3J0cyB3b3VsZCBzaGFyZVxuICAgIC8vIHRoZSBzYW1lIG5hbWUuXG4gICAgY29uc3QgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuICAgIC8vIEFsaWFzIG5nTW9kdWxlUmVmIGFkZGVkIGZvciByZWFkYWJpbGl0eSBiZWxvdy5cbiAgICBjb25zdCBuZ01vZHVsZVJlZiA9IHJlZjtcbiAgICBjb25zdCBhZGRSZWV4cG9ydCA9IChleHBvcnRSZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPikgPT4ge1xuICAgICAgaWYgKGV4cG9ydFJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBpc1JlRXhwb3J0ID0gIWRlY2xhcmVkLmhhcyhleHBvcnRSZWYubm9kZSk7XG4gICAgICBjb25zdCBleHBvcnROYW1lID0gdGhpcy5hbGlhc2luZ0hvc3QgIS5tYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICAgICAgZXhwb3J0UmVmLCBzb3VyY2VGaWxlLCBuZ01vZHVsZS5yZWYubm9kZS5uYW1lLnRleHQsIGlzUmVFeHBvcnQpO1xuICAgICAgaWYgKGV4cG9ydE5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFyZWV4cG9ydE1hcC5oYXMoZXhwb3J0TmFtZSkpIHtcbiAgICAgICAgaWYgKGV4cG9ydFJlZi5hbGlhcyAmJiBleHBvcnRSZWYuYWxpYXMgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICAgICAgICByZWV4cG9ydHMgIS5wdXNoKHtcbiAgICAgICAgICAgIGZyb21Nb2R1bGU6IGV4cG9ydFJlZi5hbGlhcy52YWx1ZS5tb2R1bGVOYW1lICEsXG4gICAgICAgICAgICBzeW1ib2xOYW1lOiBleHBvcnRSZWYuYWxpYXMudmFsdWUubmFtZSAhLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBleHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLmNsb25lV2l0aE5vSWRlbnRpZmllcnMoKSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikgfHwgZXhwci52YWx1ZS5tb2R1bGVOYW1lID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIGV4cHIudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBFeHRlcm5hbEV4cHInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVleHBvcnRzICEucHVzaCh7XG4gICAgICAgICAgICBmcm9tTW9kdWxlOiBleHByLnZhbHVlLm1vZHVsZU5hbWUsXG4gICAgICAgICAgICBzeW1ib2xOYW1lOiBleHByLnZhbHVlLm5hbWUsXG4gICAgICAgICAgICBhc0FsaWFzOiBleHBvcnROYW1lLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0TWFwLnNldChleHBvcnROYW1lLCBleHBvcnRSZWYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQW5vdGhlciByZS1leHBvcnQgYWxyZWFkeSB1c2VkIHRoaXMgbmFtZS4gUHJvZHVjZSBhIGRpYWdub3N0aWMuXG4gICAgICAgIGNvbnN0IHByZXZSZWYgPSByZWV4cG9ydE1hcC5nZXQoZXhwb3J0TmFtZSkgITtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChyZWV4cG9ydENvbGxpc2lvbihuZ01vZHVsZVJlZi5ub2RlLCBwcmV2UmVmLCBleHBvcnRSZWYpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5waXBlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0Q29sbGVjdGluZygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZWFsZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uOiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaXMgbm90IENPTExFQ1RJTkdgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbnZhbGlkIGltcG9ydCBvciBleHBvcnQgZnJvbSBhbiBOZ01vZHVsZS5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZihcbiAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sXG4gICAgdHlwZTogJ2ltcG9ydCcgfCAnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICBjb25zdCByZXNvbHZlVGFyZ2V0ID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnTmdNb2R1bGUnIDogJ05nTW9kdWxlLCBDb21wb25lbnQsIERpcmVjdGl2ZSwgb3IgUGlwZSc7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgdG8gYW4gJHtyZXNvbHZlVGFyZ2V0fSBjbGFzc2ApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGltcG9ydCBvciBleHBvcnQgd2hpY2ggaXRzZWxmIGhhcyBlcnJvcnMuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGl0c2VsZiBoYXMgZXJyb3JzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gZXhwb3J0ZWQgZGlyZWN0aXZlIG9yIHBpcGUgd2hpY2ggd2FzIG5vdCBkZWNsYXJlZCBvciBpbXBvcnRlZFxuICogYnkgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVleHBvcnQoY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX1JFRVhQT1JULCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYFByZXNlbnQgaW4gdGhlIE5nTW9kdWxlLmV4cG9ydHMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0gYnV0IG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYSBjb2xsaXNpb24gaW4gcmUtZXhwb3J0IG5hbWVzIGJldHdlZW4gdHdvIGRpcmVjdGl2ZXMvcGlwZXMuXG4gKi9cbmZ1bmN0aW9uIHJlZXhwb3J0Q29sbGlzaW9uKFxuICAgIG1vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmQTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgIHJlZkI6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjaGlsZE1lc3NhZ2VUZXh0ID1cbiAgICAgIGBUaGlzIGRpcmVjdGl2ZS9waXBlIGlzIHBhcnQgb2YgdGhlIGV4cG9ydHMgb2YgJyR7bW9kdWxlLm5hbWUudGV4dH0nIGFuZCBzaGFyZXMgdGhlIHNhbWUgbmFtZSBhcyBhbm90aGVyIGV4cG9ydGVkIGRpcmVjdGl2ZS9waXBlLmA7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9SRUVYUE9SVF9OQU1FX0NPTExJU0lPTiwgbW9kdWxlLm5hbWUsIGBcbiAgICBUaGVyZSB3YXMgYSBuYW1lIGNvbGxpc2lvbiBiZXR3ZWVuIHR3byBjbGFzc2VzIG5hbWVkICcke3JlZkEubm9kZS5uYW1lLnRleHR9Jywgd2hpY2ggYXJlIGJvdGggcGFydCBvZiB0aGUgZXhwb3J0cyBvZiAnJHttb2R1bGUubmFtZS50ZXh0fScuXG5cbiAgICBBbmd1bGFyIGdlbmVyYXRlcyByZS1leHBvcnRzIG9mIGFuIE5nTW9kdWxlJ3MgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcyBmcm9tIHRoZSBtb2R1bGUncyBzb3VyY2UgZmlsZSBpbiBjZXJ0YWluIGNhc2VzLCB1c2luZyB0aGUgZGVjbGFyZWQgbmFtZSBvZiB0aGUgY2xhc3MuIElmIHR3byBjbGFzc2VzIG9mIHRoZSBzYW1lIG5hbWUgYXJlIGV4cG9ydGVkLCB0aGlzIGF1dG9tYXRpYyBuYW1pbmcgZG9lcyBub3Qgd29yay5cblxuICAgIFRvIGZpeCB0aGlzIHByb2JsZW0gcGxlYXNlIHJlLWV4cG9ydCBvbmUgb3IgYm90aCBjbGFzc2VzIGRpcmVjdGx5IGZyb20gdGhpcyBmaWxlLlxuICBgLnRyaW0oKSxcbiAgICAgIFtcbiAgICAgICAge25vZGU6IHJlZkEubm9kZS5uYW1lLCBtZXNzYWdlVGV4dDogY2hpbGRNZXNzYWdlVGV4dH0sXG4gICAgICAgIHtub2RlOiByZWZCLm5vZGUubmFtZSwgbWVzc2FnZVRleHQ6IGNoaWxkTWVzc2FnZVRleHR9LFxuICAgICAgXSk7XG59XG4iXX0=