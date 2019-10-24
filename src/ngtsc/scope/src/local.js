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
        function LocalModuleScopeRegistry(localReader, dependencyScopeReader, refEmitter, aliasingHost, componentScopeRegistry) {
            if (componentScopeRegistry === void 0) { componentScopeRegistry = new component_scope_1.NoopComponentScopeRegistry(); }
            this.localReader = localReader;
            this.dependencyScopeReader = dependencyScopeReader;
            this.refEmitter = refEmitter;
            this.aliasingHost = aliasingHost;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Q7SUFDL0QsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCxrRkFBNkU7SUFHN0UsNkZBQTJHO0lBeUIzRzs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUEwQ0Usa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxZQUErQixFQUNyRSxzQkFBaUY7WUFBakYsdUNBQUEsRUFBQSw2QkFBcUQsNENBQTBCLEVBQUU7WUFGakYsZ0JBQVcsR0FBWCxXQUFXLENBQWdCO1lBQVUsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtZQUNsRixlQUFVLEdBQVYsVUFBVSxDQUFrQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtZQUNyRSwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQTJEO1lBNUM3Rjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBc0MsQ0FBQztZQUVwRSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO1lBRS9FOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFDO1lBRTdFOzs7Ozs7O2VBT0c7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBRXBEOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztRQUs2QixDQUFDO1FBRWpHOztXQUVHO1FBQ0gsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOztZQUN6QyxJQUFJLENBQUMsZ0JBQWdCLEVB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O0lBRUQ7O09BRUc7SUFDSCxTQUFTLGlCQUFpQixDQUN0QixNQUF3QixFQUFFLElBQWlDLEVBQzNELElBQWlDO1FBQ25DLElBQU0sZ0JBQWdCLEdBQ2xCLG9EQUFrRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksbUVBQWdFLENBQUM7UUFDdkksT0FBTyw0QkFBYyxDQUNqQix1QkFBUyxDQUFDLGdDQUFnQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQSxpRUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGtEQUE2QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksNFZBS3pJLENBQUEsQ0FBQyxJQUFJLEVBQUUsRUFDSjtZQUNFLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBQztZQUNyRCxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUM7U0FDdEQsQ0FBQyxDQUFDO0lBQ1QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHRlcm5hbEV4cHIsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG1ha2VEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0FsaWFzaW5nSG9zdCwgUmVleHBvcnQsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpZGVudGlmaWVyT2ZOb2RlLCBub2RlTmFtZUZvckVycm9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFeHBvcnRTY29wZSwgU2NvcGVEYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBDb21wb25lbnRTY29wZVJlZ2lzdHJ5LCBOb29wQ29tcG9uZW50U2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9jb21wb25lbnRfc2NvcGUnO1xuaW1wb3J0IHtEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY3knO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTmdNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTW9kdWxlU2NvcGUgZXh0ZW5kcyBFeHBvcnRTY29wZSB7XG4gIGNvbXBpbGF0aW9uOiBTY29wZURhdGE7XG4gIHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsO1xuICBzY2hlbWFzOiBTY2hlbWFNZXRhZGF0YVtdO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIHJlZ2lzdGVyZWQgZGVjbGFyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsYXRpb25TY29wZSBleHRlbmRzIFNjb3BlRGF0YSB7XG4gIC8qKiBUaGUgZGVjbGFyYXRpb24gd2hvc2UgY29tcGlsYXRpb24gc2NvcGUgaXMgZGVzY3JpYmVkIGhlcmUuICovXG4gIGRlY2xhcmF0aW9uOiBDbGFzc0RlY2xhcmF0aW9uO1xuICAvKiogVGhlIGRlY2xhcmF0aW9uIG9mIHRoZSBOZ01vZHVsZSB0aGF0IGRlY2xhcmVzIHRoaXMgYGRlY2xhcmF0aW9uYC4gKi9cbiAgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb247XG59XG5cbi8qKlxuICogQSByZWdpc3RyeSB3aGljaCBjb2xsZWN0cyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIERpcmVjdGl2ZXMsIENvbXBvbmVudHMsIGFuZCBQaXBlcyB3aGljaFxuICogYXJlIGxvY2FsIChkZWNsYXJlZCBpbiB0aGUgdHMuUHJvZ3JhbSBiZWluZyBjb21waWxlZCksIGFuZCBjYW4gcHJvZHVjZSBgTG9jYWxNb2R1bGVTY29wZWBzXG4gKiB3aGljaCBzdW1tYXJpemUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgY29tcG9uZW50LlxuICpcbiAqIFRoaXMgY2xhc3MgaW1wbGVtZW50cyB0aGUgbG9naWMgb2YgTmdNb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cyBhbmQgY2FuIHByb2R1Y2UsXG4gKiBmb3IgYSBnaXZlbiBjb21wb25lbnQsIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIFwidmlzaWJsZVwiIGluIHRoYXQgY29tcG9uZW50J3NcbiAqIHRlbXBsYXRlLlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBoYXMgdHdvIFwibW9kZXNcIiBvZiBvcGVyYXRpb24uIER1cmluZyBhbmFseXNpcywgZGF0YSBmb3IgZWFjaFxuICogaW5kaXZpZHVhbCBOZ01vZHVsZSwgRGlyZWN0aXZlLCBDb21wb25lbnQsIGFuZCBQaXBlIGlzIGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gTm8gYXR0ZW1wdCBpcyBtYWRlXG4gKiB0byB0cmF2ZXJzZSBvciB2YWxpZGF0ZSB0aGUgTmdNb2R1bGUgZ3JhcGggKGltcG9ydHMsIGV4cG9ydHMsIGV0YykuIEFmdGVyIGFuYWx5c2lzLCBvbmUgb2ZcbiAqIGBnZXRTY29wZU9mTW9kdWxlYCBvciBgZ2V0U2NvcGVGb3JDb21wb25lbnRgIGNhbiBiZSBjYWxsZWQsIHdoaWNoIHRyYXZlcnNlcyB0aGUgTmdNb2R1bGUgZ3JhcGhcbiAqIGFuZCBhcHBsaWVzIHRoZSBOZ01vZHVsZSBsb2dpYyB0byBnZW5lcmF0ZSBhIGBMb2NhbE1vZHVsZVNjb3BlYCwgdGhlIGZ1bGwgc2NvcGUgZm9yIHRoZSBnaXZlblxuICogbW9kdWxlIG9yIGNvbXBvbmVudC5cbiAqXG4gKiBUaGUgYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWAgaXMgYWxzbyBjYXBhYmxlIG9mIHByb2R1Y2luZyBgdHMuRGlhZ25vc3RpY2AgZXJyb3JzIHdoZW4gQW5ndWxhclxuICogc2VtYW50aWNzIGFyZSB2aW9sYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSBpbXBsZW1lbnRzIE1ldGFkYXRhUmVnaXN0cnksIENvbXBvbmVudFNjb3BlUmVhZGVyIHtcbiAgLyoqXG4gICAqIFRyYWNrcyB3aGV0aGVyIHRoZSByZWdpc3RyeSBoYXMgYmVlbiBhc2tlZCB0byBwcm9kdWNlIHNjb3BlcyBmb3IgYSBtb2R1bGUgb3IgY29tcG9uZW50LiBPbmNlXG4gICAqIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlZ2lzdHJ5IGNhbm5vdCBhY2NlcHQgcmVnaXN0cmF0aW9ucyBvZiBuZXcgZGlyZWN0aXZlcy9waXBlcy9tb2R1bGVzIGFzIGl0XG4gICAqIHdvdWxkIGludmFsaWRhdGUgdGhlIGNhY2hlZCBzY29wZSBkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBzZWFsZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgY29tcG9uZW50cyBmcm9tIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlIE5nTW9kdWxlIHdoaWNoIGRlY2xhcmVkIHRoZW0uXG4gICAqXG4gICAqIEFzIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgYXJlIG5vdCBkaXN0aW5ndWlzaGVkIGF0IHRoZSBOZ01vZHVsZSBsZXZlbCwgdGhpcyBtYXAgbWF5IGFsc29cbiAgICogY29udGFpbiBkaXJlY3RpdmVzLiBUaGlzIGRvZXNuJ3QgY2F1c2UgYW55IHByb2JsZW1zIGJ1dCBpc24ndCB1c2VmdWwgYXMgdGhlcmUgaXMgbm8gY29uY2VwdCBvZlxuICAgKiBhIGRpcmVjdGl2ZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWNsYXJhdGlvblRvTW9kdWxlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBDbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIHByaXZhdGUgbW9kdWxlVG9SZWYgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBjYWxjdWxhdGVkIGBMb2NhbE1vZHVsZVNjb3BlYHMgZm9yIGVhY2ggTmdNb2R1bGUgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhlIHNjb3BlIHdhcyBpbnZhbGlkIGFuZCBwcm9kdWNlZCBlcnJvcnMgKHRoZXJlZm9yZSxcbiAgICogZGlhZ25vc3RpY3Mgc2hvdWxkIGV4aXN0IGluIHRoZSBgc2NvcGVFcnJvcnNgIG1hcCkuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE1vZHVsZVNjb3BlfHVuZGVmaW5lZHxudWxsPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hldGhlciBhIGdpdmVuIGNvbXBvbmVudCByZXF1aXJlcyBcInJlbW90ZSBzY29waW5nXCIuXG4gICAqXG4gICAqIFJlbW90ZSBzY29waW5nIGlzIHdoZW4gdGhlIHNldCBvZiBkaXJlY3RpdmVzIHdoaWNoIGFwcGx5IHRvIGEgZ2l2ZW4gY29tcG9uZW50IGlzIHNldCBpbiB0aGVcbiAgICogTmdNb2R1bGUncyBmaWxlIGluc3RlYWQgb2YgZGlyZWN0bHkgb24gdGhlIGNvbXBvbmVudCBkZWYgKHdoaWNoIGlzIHNvbWV0aW1lcyBuZWVkZWQgdG8gZ2V0XG4gICAqIGFyb3VuZCBjeWNsaWMgaW1wb3J0IGlzc3VlcykuIFRoaXMgaXMgbm90IHVzZWQgaW4gY2FsY3VsYXRpb24gb2YgYExvY2FsTW9kdWxlU2NvcGVgcywgYnV0IGlzXG4gICAqIHRyYWNrZWQgaGVyZSBmb3IgY29udmVuaWVuY2UuXG4gICAqL1xuICBwcml2YXRlIHJlbW90ZVNjb3BpbmcgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBlcnJvcnMgYWNjdW11bGF0ZWQgaW4gdGhlIHByb2Nlc3Npbmcgb2Ygc2NvcGVzIGZvciBlYWNoIG1vZHVsZSBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVFcnJvcnMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkRpYWdub3N0aWNbXT4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9jYWxSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlcGVuZGVuY3lTY29wZVJlYWRlcjogRHRzTW9kdWxlU2NvcGVSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsLFxuICAgICAgcHJpdmF0ZSBjb21wb25lbnRTY29wZVJlZ2lzdHJ5OiBDb21wb25lbnRTY29wZVJlZ2lzdHJ5ID0gbmV3IE5vb3BDb21wb25lbnRTY29wZVJlZ2lzdHJ5KCkpIHt9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBOZ01vZHVsZSdzIGRhdGEgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKGRhdGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0Q29sbGVjdGluZygpO1xuICAgIHRoaXMubW9kdWxlVG9SZWYuc2V0KGRhdGEucmVmLm5vZGUsIGRhdGEucmVmKTtcbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGF0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5zZXQoZGVjbC5ub2RlLCBkYXRhLnJlZi5ub2RlKTtcbiAgICB9XG4gIH1cblxuICByZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKGRpcmVjdGl2ZTogRGlyZWN0aXZlTWV0YSk6IHZvaWQge31cblxuICByZWdpc3RlclBpcGVNZXRhZGF0YShwaXBlOiBQaXBlTWV0YSk6IHZvaWQge31cblxuICBnZXRTY29wZUZvckNvbXBvbmVudChjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgY29uc3Qgc2NvcGUgPSAhdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmhhcyhjbGF6eikgP1xuICAgICAgICBudWxsIDpcbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlKHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5nZXQoY2xhenopICEpO1xuICAgIGlmIChzY29wZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5jb21wb25lbnRTY29wZVJlZ2lzdHJ5LnJlZ2lzdGVyQ29tcG9uZW50U2NvcGUoY2xhenosIHNjb3BlKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxlY3RzIHJlZ2lzdGVyZWQgZGF0YSBmb3IgYSBtb2R1bGUgYW5kIGl0cyBkaXJlY3RpdmVzL3BpcGVzIGFuZCBjb252ZXJ0IGl0IGludG8gYSBmdWxsXG4gICAqIGBMb2NhbE1vZHVsZVNjb3BlYC5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgaW1wbGVtZW50cyB0aGUgbG9naWMgb2YgTmdNb2R1bGUgaW1wb3J0cyBhbmQgZXhwb3J0cy4gSXQgcmV0dXJucyB0aGVcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgIGZvciB0aGUgZ2l2ZW4gTmdNb2R1bGUgaWYgb25lIGNhbiBiZSBwcm9kdWNlZCwgYW5kIGBudWxsYCBpZiBubyBzY29wZSBpc1xuICAgKiBhdmFpbGFibGUgb3IgdGhlIHNjb3BlIGNvbnRhaW5zIGVycm9ycy5cbiAgICovXG4gIGdldFNjb3BlT2ZNb2R1bGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5tb2R1bGVUb1JlZi5oYXMoY2xhenopID9cbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHRoaXMubW9kdWxlVG9SZWYuZ2V0KGNsYXp6KSAhKSA6XG4gICAgICAgIG51bGw7XG4gICAgLy8gVHJhbnNsYXRlIHVuZGVmaW5lZCAtPiBudWxsLlxuICAgIHJldHVybiBzY29wZSAhPT0gdW5kZWZpbmVkID8gc2NvcGUgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhbnkgYHRzLkRpYWdub3N0aWNgcyBwcm9kdWNlZCBkdXJpbmcgdGhlIGNhbGN1bGF0aW9uIG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgZm9yXG4gICAqIHRoZSBnaXZlbiBOZ01vZHVsZSwgb3IgYG51bGxgIGlmIG5vIGVycm9ycyB3ZXJlIHByZXNlbnQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc09mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdfG51bGwge1xuICAgIC8vIFJlcXVpcmVkIHRvIGVuc3VyZSB0aGUgZXJyb3JzIGFyZSBwb3B1bGF0ZWQgZm9yIHRoZSBnaXZlbiBjbGFzcy4gSWYgaXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG4gICAgLy8gYmVmb3JlLCB0aGlzIHdpbGwgYmUgYSBuby1vcCBkdWUgdG8gdGhlIHNjb3BlIGNhY2hlLlxuICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZShjbGF6eik7XG5cbiAgICBpZiAodGhpcy5zY29wZUVycm9ycy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY29wZUVycm9ycy5nZXQoY2xhenopICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgY29sbGVjdGlvbiBvZiB0aGUgY29tcGlsYXRpb24gc2NvcGUgZm9yIGVhY2ggcmVnaXN0ZXJlZCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbXBpbGF0aW9uU2NvcGVzKCk6IENvbXBpbGF0aW9uU2NvcGVbXSB7XG4gICAgY29uc3Qgc2NvcGVzOiBDb21waWxhdGlvblNjb3BlW10gPSBbXTtcbiAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZm9yRWFjaCgobmdNb2R1bGUsIGRlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBjb25zdCBzY29wZSA9IHRoaXMuZ2V0U2NvcGVPZk1vZHVsZShuZ01vZHVsZSk7XG4gICAgICBpZiAoc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgc2NvcGVzLnB1c2goe2RlY2xhcmF0aW9uLCBuZ01vZHVsZSwgLi4uc2NvcGUuY29tcGlsYXRpb259KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc2NvcGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEltcGxlbWVudGF0aW9uIG9mIGBnZXRTY29wZU9mTW9kdWxlYCB3aGljaCBhY2NlcHRzIGEgcmVmZXJlbmNlIHRvIGEgY2xhc3MgYW5kIGRpZmZlcmVudGlhdGVzXG4gICAqIGJldHdlZW46XG4gICAqXG4gICAqICogbm8gc2NvcGUgYmVpbmcgYXZhaWxhYmxlIChyZXR1cm5zIGBudWxsYClcbiAgICogKiBhIHNjb3BlIGJlaW5nIHByb2R1Y2VkIHdpdGggZXJyb3JzIChyZXR1cm5zIGB1bmRlZmluZWRgKS5cbiAgICovXG4gIHByaXZhdGUgZ2V0U2NvcGVPZk1vZHVsZVJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbFxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KHJlZi5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyBTZWFsIHRoZSByZWdpc3RyeSB0byBwcm90ZWN0IHRoZSBpbnRlZ3JpdHkgb2YgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCBjYWNoZS5cbiAgICB0aGlzLnNlYWxlZCA9IHRydWU7XG5cbiAgICAvLyBgcmVmYCBzaG91bGQgYmUgYW4gTmdNb2R1bGUgcHJldmlvdXNseSBhZGRlZCB0byB0aGUgcmVnaXN0cnkuIElmIG5vdCwgYSBzY29wZSBmb3IgaXRcbiAgICAvLyBjYW5ub3QgYmUgcHJvZHVjZWQuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldE5nTW9kdWxlTWV0YWRhdGEocmVmKTtcbiAgICBpZiAobmdNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCBudWxsKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEVycm9ycyBwcm9kdWNlZCBkdXJpbmcgY29tcHV0YXRpb24gb2YgdGhlIHNjb3BlIGFyZSByZWNvcmRlZCBoZXJlLiBBdCB0aGUgZW5kLCBpZiB0aGlzIGFycmF5XG4gICAgLy8gaXNuJ3QgZW1wdHkgdGhlbiBgdW5kZWZpbmVkYCB3aWxsIGJlIGNhY2hlZCBhbmQgcmV0dXJuZWQgdG8gaW5kaWNhdGUgdGhpcyBzY29wZSBpcyBpbnZhbGlkLlxuICAgIGNvbnN0IGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10gPSBbXTtcblxuICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBnb2FsIGlzIHRvIHByb2R1Y2UgdHdvIGRpc3RpbmN0IHRyYW5zaXRpdmUgc2V0czpcbiAgICAvLyAtIHRoZSBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgdmlzaWJsZSB0byBjb21wb25lbnRzIGRlY2xhcmVkIGluIHRoZSBOZ01vZHVsZS5cbiAgICAvLyAtIHRoZSBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgZXhwb3J0ZWQgdG8gYW55IE5nTW9kdWxlcyB3aGljaCBpbXBvcnQgdGhpcyBvbmUuXG5cbiAgICAvLyBEaXJlY3RpdmVzIGFuZCBwaXBlcyBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgY29uc3QgY29tcGlsYXRpb25EaXJlY3RpdmVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBjb21waWxhdGlvblBpcGVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgUGlwZU1ldGE+KCk7XG5cbiAgICBjb25zdCBkZWNsYXJlZCA9IG5ldyBTZXQ8dHMuRGVjbGFyYXRpb24+KCk7XG5cbiAgICAvLyBEaXJlY3RpdmVzIGFuZCBwaXBlcyBleHBvcnRlZCB0byBhbnkgaW1wb3J0aW5nIE5nTW9kdWxlcy5cbiAgICBjb25zdCBleHBvcnREaXJlY3RpdmVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBleHBvcnRQaXBlcyA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIFBpcGVNZXRhPigpO1xuXG4gICAgLy8gVGhlIGFsZ29yaXRobSBpcyBhcyBmb2xsb3dzOlxuICAgIC8vIDEpIEFkZCBkaXJlY3RpdmVzL3BpcGVzIGRlY2xhcmVkIGluIHRoZSBOZ01vZHVsZSB0byB0aGUgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgLy8gMikgQWRkIGFsbCBvZiB0aGUgZGlyZWN0aXZlcy9waXBlcyBmcm9tIGVhY2ggTmdNb2R1bGUgaW1wb3J0ZWQgaW50byB0aGUgY3VycmVudCBvbmUgdG8gdGhlXG4gICAgLy8gICAgY29tcGlsYXRpb24gc2NvcGUuIEF0IHRoaXMgcG9pbnQsIHRoZSBjb21waWxhdGlvbiBzY29wZSBpcyBjb21wbGV0ZS5cbiAgICAvLyAzKSBGb3IgZWFjaCBlbnRyeSBpbiB0aGUgTmdNb2R1bGUncyBleHBvcnRzOlxuICAgIC8vICAgIGEpIEF0dGVtcHQgdG8gcmVzb2x2ZSBpdCBhcyBhbiBOZ01vZHVsZSB3aXRoIGl0cyBvd24gZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy4gSWYgaXQgaXNcbiAgICAvLyAgICAgICBvbmUsIGFkZCB0aGVtIHRvIHRoZSBleHBvcnQgc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAvLyAgICBiKSBPdGhlcndpc2UsIGl0IHNob3VsZCBiZSBhIGNsYXNzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLiBJZiBpdCBpcyxcbiAgICAvLyAgICAgICBhZGQgaXQgdG8gdGhlIGV4cG9ydCBzY29wZS5cbiAgICAvLyAgICBjKSBJZiBpdCdzIG5laXRoZXIgYW4gTmdNb2R1bGUgbm9yIGEgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLCB0aGVuIHRoaXNcbiAgICAvLyAgICAgICBpcyBhbiBlcnJvci5cblxuICAgIC8vIDEpIGFkZCBkZWNsYXJhdGlvbnMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmRlY2xhcmF0aW9ucykge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGNvbnN0IHBpcGUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGlmIChkaXJlY3RpdmUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25EaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIHsuLi5kaXJlY3RpdmUsIHJlZjogZGVjbH0pO1xuICAgICAgfSBlbHNlIGlmIChwaXBlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KGRlY2wubm9kZSwgey4uLnBpcGUsIHJlZjogZGVjbH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyhhbHhodWIpOiBwcm9kdWNlIGEgdHMuRGlhZ25vc3RpYy4gVGhpcyBjYW4ndCBiZSBhbiBlcnJvciByaWdodCBub3cgc2luY2Ugc29tZVxuICAgICAgICAvLyBuZ3Rvb2xzIHRlc3RzIHJlbHkgb24gYW5hbHlzaXMgb2YgYnJva2VuIGNvbXBvbmVudHMuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBkZWNsYXJlZC5hZGQoZGVjbC5ub2RlKTtcbiAgICB9XG5cbiAgICAvLyAyKSBwcm9jZXNzIGltcG9ydHMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmltcG9ydHMpIHtcbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2ltcG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXNuJ3QgYW4gTmdNb2R1bGUsIHNvIHJlY29yZCBhbiBlcnJvci5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnaW1wb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBbiBpbXBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBpbXBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAzKSBwcm9jZXNzIGV4cG9ydHMuXG4gICAgLy8gRXhwb3J0cyBjYW4gY29udGFpbiBtb2R1bGVzLCBjb21wb25lbnRzLCBvciBkaXJlY3RpdmVzLiBUaGV5J3JlIHByb2Nlc3NlZCBkaWZmZXJlbnRseS5cbiAgICAvLyBNb2R1bGVzIGFyZSBzdHJhaWdodGZvcndhcmQuIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGZyb20gZXhwb3J0ZWQgbW9kdWxlcyBhcmUgYWRkZWQgdG8gdGhlXG4gICAgLy8gZXhwb3J0IG1hcHMuIERpcmVjdGl2ZXMvcGlwZXMgYXJlIGRpZmZlcmVudCAtIHRoZXkgbWlnaHQgYmUgZXhwb3J0cyBvZiBkZWNsYXJlZCB0eXBlcyBvclxuICAgIC8vIGltcG9ydGVkIHR5cGVzLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBuZ01vZHVsZS5leHBvcnRzKSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgZGVjbCBhcyBhbiBOZ01vZHVsZS5cbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2V4cG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQW4gZXhwb3J0IHdhcyBhbiBOZ01vZHVsZSBidXQgY29udGFpbmVkIGVycm9ycyBvZiBpdHMgb3duLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvciB0b28sXG4gICAgICAgIC8vIGJlY2F1c2UgdGhpcyBzY29wZSBpcyBhbHdheXMgZ29pbmcgdG8gYmUgaW5jb3JyZWN0IGlmIG9uZSBvZiBpdHMgZXhwb3J0cyBjb3VsZCBub3QgYmVcbiAgICAgICAgLy8gcmVhZC5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhbiBOZ01vZHVsZS5cbiAgICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgICAgICBleHBvcnRQaXBlcy5zZXQocGlwZS5yZWYubm9kZSwgcGlwZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25EaXJlY3RpdmVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBjb21waWxhdGlvbkRpcmVjdGl2ZXMuZ2V0KGRlY2wubm9kZSkgITtcbiAgICAgICAgZXhwb3J0RGlyZWN0aXZlcy5zZXQoZGVjbC5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfSBlbHNlIGlmIChjb21waWxhdGlvblBpcGVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBwaXBlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBwaXBlID0gY29tcGlsYXRpb25QaXBlcy5nZXQoZGVjbC5ub2RlKSAhO1xuICAgICAgICBleHBvcnRQaXBlcy5zZXQoZGVjbC5ub2RlLCBwaXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gdW5rbm93biBleHBvcnQuXG4gICAgICAgIGlmICh0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpICE9PSBudWxsIHx8XG4gICAgICAgICAgICB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZXhwb3J0KHJlZi5ub2RlLCBkZWNsKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydGVkID0ge1xuICAgICAgZGlyZWN0aXZlczogQXJyYXkuZnJvbShleHBvcnREaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGV4cG9ydFBpcGVzLnZhbHVlcygpKSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5nZXRSZWV4cG9ydHMobmdNb2R1bGUsIHJlZiwgZGVjbGFyZWQsIGV4cG9ydGVkLCBkaWFnbm9zdGljcyk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGlzIHNjb3BlIGhhZCBhbnkgZXJyb3JzIGR1cmluZyBwcm9kdWN0aW9uLlxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBDYWNoZSB1bmRlZmluZWQsIHRvIG1hcmsgdGhlIGZhY3QgdGhhdCB0aGUgc2NvcGUgaXMgaW52YWxpZC5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBTYXZlIHRoZSBlcnJvcnMgZm9yIHJldHJpZXZhbC5cbiAgICAgIHRoaXMuc2NvcGVFcnJvcnMuc2V0KHJlZi5ub2RlLCBkaWFnbm9zdGljcyk7XG5cbiAgICAgIC8vIFJldHVybiB1bmRlZmluZWQgdG8gaW5kaWNhdGUgdGhlIHNjb3BlIGlzIGludmFsaWQuXG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgdW5kZWZpbmVkKTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gRmluYWxseSwgcHJvZHVjZSB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIHdpdGggYm90aCB0aGUgY29tcGlsYXRpb24gYW5kIGV4cG9ydCBzY29wZXMuXG4gICAgY29uc3Qgc2NvcGUgPSB7XG4gICAgICBjb21waWxhdGlvbjoge1xuICAgICAgICBkaXJlY3RpdmVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uRGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uUGlwZXMudmFsdWVzKCkpLFxuICAgICAgfSxcbiAgICAgIGV4cG9ydGVkLFxuICAgICAgcmVleHBvcnRzLFxuICAgICAgc2NoZW1hczogbmdNb2R1bGUuc2NoZW1hcyxcbiAgICB9O1xuICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCBzY29wZSk7XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBjb21wb25lbnQgcmVxdWlyZXMgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBnZXRSZXF1aXJlc1JlbW90ZVNjb3BlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHsgcmV0dXJuIHRoaXMucmVtb3RlU2NvcGluZy5oYXMobm9kZSk7IH1cblxuICAvKipcbiAgICogU2V0IGEgY29tcG9uZW50IGFzIHJlcXVpcmluZyByZW1vdGUgc2NvcGluZy5cbiAgICovXG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5yZW1vdGVTY29waW5nLmFkZChub2RlKTtcbiAgICB0aGlzLmNvbXBvbmVudFNjb3BlUmVnaXN0cnkuc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKG5vZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgdGhlIGBFeHBvcnRTY29wZWAgb2YgYSBnaXZlbiBgUmVmZXJlbmNlYCB0byBhbiBOZ01vZHVsZS5cbiAgICpcbiAgICogVGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uIG1heSBiZSBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHRzLlByb2dyYW0sIG9yIGl0IG1heSBiZVxuICAgKiBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuXG4gICAqXG4gICAqIEByZXR1cm5zIGBudWxsYCBpZiBubyBzY29wZSBjb3VsZCBiZSBmb3VuZCwgb3IgYHVuZGVmaW5lZGAgaWYgYW4gaW52YWxpZCBzY29wZVxuICAgKiB3YXMgZm91bmQuXG4gICAqXG4gICAqIE1heSBhbHNvIGNvbnRyaWJ1dGUgZGlhZ25vc3RpY3Mgb2YgaXRzIG93biBieSBhZGRpbmcgdG8gdGhlIGdpdmVuIGBkaWFnbm9zdGljc2BcbiAgICogYXJyYXkgcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHBvcnRlZFNjb3BlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgICBvd25lckZvckVycm9yczogdHMuRGVjbGFyYXRpb24sIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogRXhwb3J0U2NvcGV8bnVsbHx1bmRlZmluZWQge1xuICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuIFJlc29sdmUgaXQgd2l0aCB0aGUgYERlcGVuZGVuY3lTY29wZVJlYWRlcmAuXG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGluIGEgLmQudHMgZmlsZSBidXQgaXMgbm90IGRlY2xhcmVkIGFzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbi4gVGhpcyBpcyBhblxuICAgICAgICAvLyBlcnJvciBpbiB0aGUgLmQudHMgbWV0YWRhdGEuXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUocmVmLm5vZGUpIHx8IHJlZi5ub2RlLFxuICAgICAgICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihvd25lckZvckVycm9ycyl9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuIE5nTW9kdWxlYCkpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeVNjb3BlUmVhZGVyLnJlc29sdmUocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS4gUmVzb2x2ZSBpdCBmcm9tIHRoZSByZWdpc3RyeS5cbiAgICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0cyhcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZU1ldGEsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJlZDogU2V0PHRzLkRlY2xhcmF0aW9uPixcbiAgICAgIGV4cG9ydGVkOiB7ZGlyZWN0aXZlczogRGlyZWN0aXZlTWV0YVtdLCBwaXBlczogUGlwZU1ldGFbXX0sXG4gICAgICBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdKTogUmVleHBvcnRbXXxudWxsIHtcbiAgICBsZXQgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGwgPSBudWxsO1xuICAgIGNvbnN0IHNvdXJjZUZpbGUgPSByZWYubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG4gICAgaWYgKHRoaXMuYWxpYXNpbmdIb3N0ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmVleHBvcnRzID0gW107XG4gICAgLy8gVHJhY2sgcmUtZXhwb3J0cyBieSBzeW1ib2wgbmFtZSwgdG8gcHJvZHVjZSBkaWFnbm9zdGljcyBpZiB0d28gYWxpYXMgcmUtZXhwb3J0cyB3b3VsZCBzaGFyZVxuICAgIC8vIHRoZSBzYW1lIG5hbWUuXG4gICAgY29uc3QgcmVleHBvcnRNYXAgPSBuZXcgTWFwPHN0cmluZywgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuICAgIC8vIEFsaWFzIG5nTW9kdWxlUmVmIGFkZGVkIGZvciByZWFkYWJpbGl0eSBiZWxvdy5cbiAgICBjb25zdCBuZ01vZHVsZVJlZiA9IHJlZjtcbiAgICBjb25zdCBhZGRSZWV4cG9ydCA9IChleHBvcnRSZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPikgPT4ge1xuICAgICAgaWYgKGV4cG9ydFJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSA9PT0gc291cmNlRmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBpc1JlRXhwb3J0ID0gIWRlY2xhcmVkLmhhcyhleHBvcnRSZWYubm9kZSk7XG4gICAgICBjb25zdCBleHBvcnROYW1lID0gdGhpcy5hbGlhc2luZ0hvc3QgIS5tYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICAgICAgZXhwb3J0UmVmLCBzb3VyY2VGaWxlLCBuZ01vZHVsZS5yZWYubm9kZS5uYW1lLnRleHQsIGlzUmVFeHBvcnQpO1xuICAgICAgaWYgKGV4cG9ydE5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFyZWV4cG9ydE1hcC5oYXMoZXhwb3J0TmFtZSkpIHtcbiAgICAgICAgaWYgKGV4cG9ydFJlZi5hbGlhcyAmJiBleHBvcnRSZWYuYWxpYXMgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICAgICAgICByZWV4cG9ydHMgIS5wdXNoKHtcbiAgICAgICAgICAgIGZyb21Nb2R1bGU6IGV4cG9ydFJlZi5hbGlhcy52YWx1ZS5tb2R1bGVOYW1lICEsXG4gICAgICAgICAgICBzeW1ib2xOYW1lOiBleHBvcnRSZWYuYWxpYXMudmFsdWUubmFtZSAhLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBleHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLmNsb25lV2l0aE5vSWRlbnRpZmllcnMoKSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikgfHwgZXhwci52YWx1ZS5tb2R1bGVOYW1lID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIGV4cHIudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBFeHRlcm5hbEV4cHInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVleHBvcnRzICEucHVzaCh7XG4gICAgICAgICAgICBmcm9tTW9kdWxlOiBleHByLnZhbHVlLm1vZHVsZU5hbWUsXG4gICAgICAgICAgICBzeW1ib2xOYW1lOiBleHByLnZhbHVlLm5hbWUsXG4gICAgICAgICAgICBhc0FsaWFzOiBleHBvcnROYW1lLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0TWFwLnNldChleHBvcnROYW1lLCBleHBvcnRSZWYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQW5vdGhlciByZS1leHBvcnQgYWxyZWFkeSB1c2VkIHRoaXMgbmFtZS4gUHJvZHVjZSBhIGRpYWdub3N0aWMuXG4gICAgICAgIGNvbnN0IHByZXZSZWYgPSByZWV4cG9ydE1hcC5nZXQoZXhwb3J0TmFtZSkgITtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChyZWV4cG9ydENvbGxpc2lvbihuZ01vZHVsZVJlZi5ub2RlLCBwcmV2UmVmLCBleHBvcnRSZWYpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5waXBlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0Q29sbGVjdGluZygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZWFsZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uOiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaXMgbm90IENPTExFQ1RJTkdgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbnZhbGlkIGltcG9ydCBvciBleHBvcnQgZnJvbSBhbiBOZ01vZHVsZS5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZihcbiAgICBjbGF6ejogdHMuRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTx0cy5EZWNsYXJhdGlvbj4sXG4gICAgdHlwZTogJ2ltcG9ydCcgfCAnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICBjb25zdCByZXNvbHZlVGFyZ2V0ID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnTmdNb2R1bGUnIDogJ05nTW9kdWxlLCBDb21wb25lbnQsIERpcmVjdGl2ZSwgb3IgUGlwZSc7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgdG8gYW4gJHtyZXNvbHZlVGFyZ2V0fSBjbGFzc2ApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGltcG9ydCBvciBleHBvcnQgd2hpY2ggaXRzZWxmIGhhcyBlcnJvcnMuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGl0c2VsZiBoYXMgZXJyb3JzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gZXhwb3J0ZWQgZGlyZWN0aXZlIG9yIHBpcGUgd2hpY2ggd2FzIG5vdCBkZWNsYXJlZCBvciBpbXBvcnRlZFxuICogYnkgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVleHBvcnQoY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX1JFRVhQT1JULCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYFByZXNlbnQgaW4gdGhlIE5nTW9kdWxlLmV4cG9ydHMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0gYnV0IG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYSBjb2xsaXNpb24gaW4gcmUtZXhwb3J0IG5hbWVzIGJldHdlZW4gdHdvIGRpcmVjdGl2ZXMvcGlwZXMuXG4gKi9cbmZ1bmN0aW9uIHJlZXhwb3J0Q29sbGlzaW9uKFxuICAgIG1vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmQTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgIHJlZkI6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjaGlsZE1lc3NhZ2VUZXh0ID1cbiAgICAgIGBUaGlzIGRpcmVjdGl2ZS9waXBlIGlzIHBhcnQgb2YgdGhlIGV4cG9ydHMgb2YgJyR7bW9kdWxlLm5hbWUudGV4dH0nIGFuZCBzaGFyZXMgdGhlIHNhbWUgbmFtZSBhcyBhbm90aGVyIGV4cG9ydGVkIGRpcmVjdGl2ZS9waXBlLmA7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9SRUVYUE9SVF9OQU1FX0NPTExJU0lPTiwgbW9kdWxlLm5hbWUsIGBcbiAgICBUaGVyZSB3YXMgYSBuYW1lIGNvbGxpc2lvbiBiZXR3ZWVuIHR3byBjbGFzc2VzIG5hbWVkICcke3JlZkEubm9kZS5uYW1lLnRleHR9Jywgd2hpY2ggYXJlIGJvdGggcGFydCBvZiB0aGUgZXhwb3J0cyBvZiAnJHttb2R1bGUubmFtZS50ZXh0fScuXG5cbiAgICBBbmd1bGFyIGdlbmVyYXRlcyByZS1leHBvcnRzIG9mIGFuIE5nTW9kdWxlJ3MgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcyBmcm9tIHRoZSBtb2R1bGUncyBzb3VyY2UgZmlsZSBpbiBjZXJ0YWluIGNhc2VzLCB1c2luZyB0aGUgZGVjbGFyZWQgbmFtZSBvZiB0aGUgY2xhc3MuIElmIHR3byBjbGFzc2VzIG9mIHRoZSBzYW1lIG5hbWUgYXJlIGV4cG9ydGVkLCB0aGlzIGF1dG9tYXRpYyBuYW1pbmcgZG9lcyBub3Qgd29yay5cblxuICAgIFRvIGZpeCB0aGlzIHByb2JsZW0gcGxlYXNlIHJlLWV4cG9ydCBvbmUgb3IgYm90aCBjbGFzc2VzIGRpcmVjdGx5IGZyb20gdGhpcyBmaWxlLlxuICBgLnRyaW0oKSxcbiAgICAgIFtcbiAgICAgICAge25vZGU6IHJlZkEubm9kZS5uYW1lLCBtZXNzYWdlVGV4dDogY2hpbGRNZXNzYWdlVGV4dH0sXG4gICAgICAgIHtub2RlOiByZWZCLm5vZGUubmFtZSwgbWVzc2FnZVRleHQ6IGNoaWxkTWVzc2FnZVRleHR9LFxuICAgICAgXSk7XG59XG4iXX0=