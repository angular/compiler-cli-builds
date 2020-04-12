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
            /**
             * This maps from the directive/pipe class to a map of data for each NgModule that declares the
             * directive/pipe. This data is needed to produce an error for the given class.
             */
            this.duplicateDeclarations = new Map();
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
            /**
             * Tracks which NgModules are unreliable due to errors within their declarations.
             *
             * This provides a unified view of which modules have errors, across all of the different
             * diagnostic categories that can be produced. Theoretically this can be inferred from the other
             * properties of this class, but is tracked explicitly to simplify the logic.
             */
            this.taintedModules = new Set();
        }
        /**
         * Add an NgModule's data to the registry.
         */
        LocalModuleScopeRegistry.prototype.registerNgModuleMetadata = function (data) {
            var e_1, _a;
            this.assertCollecting();
            var ngModule = data.ref.node;
            this.moduleToRef.set(data.ref.node, data.ref);
            try {
                // Iterate over the module's declarations, and add them to declarationToModule. If duplicates
                // are found, they're instead tracked in duplicateDeclarations.
                for (var _b = tslib_1.__values(data.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var decl = _c.value;
                    this.registerDeclarationOfModule(ngModule, decl, data.rawDeclarations);
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
                this.getScopeOfModule(this.declarationToModule.get(clazz).ngModule);
            return scope;
        };
        /**
         * If `node` is declared in more than one NgModule (duplicate declaration), then get the
         * `DeclarationData` for each offending declaration.
         *
         * Ordinarily a class is only declared in one NgModule, in which case this function returns
         * `null`.
         */
        LocalModuleScopeRegistry.prototype.getDuplicateDeclarations = function (node) {
            if (!this.duplicateDeclarations.has(node)) {
                return null;
            }
            return Array.from(this.duplicateDeclarations.get(node).values());
        };
        /**
         * Collects registered data for a module and its directives/pipes and convert it into a full
         * `LocalModuleScope`.
         *
         * This method implements the logic of NgModule imports and exports. It returns the
         * `LocalModuleScope` for the given NgModule if one can be produced, `null` if no scope was ever
         * defined, or the string `'error'` if the scope contained errors.
         */
        LocalModuleScopeRegistry.prototype.getScopeOfModule = function (clazz) {
            var scope = this.moduleToRef.has(clazz) ?
                this.getScopeOfModuleReference(this.moduleToRef.get(clazz)) :
                null;
            // If the NgModule class is marked as tainted, consider it an error.
            if (this.taintedModules.has(clazz)) {
                return 'error';
            }
            // Translate undefined -> 'error'.
            return scope !== undefined ? scope : 'error';
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
            this.declarationToModule.forEach(function (declData, declaration) {
                var scope = _this.getScopeOfModule(declData.ngModule);
                if (scope !== null && scope !== 'error') {
                    scopes.push(tslib_1.__assign({ declaration: declaration, ngModule: declData.ngModule }, scope.compilation));
                }
            });
            return scopes;
        };
        LocalModuleScopeRegistry.prototype.registerDeclarationOfModule = function (ngModule, decl, rawDeclarations) {
            var declData = {
                ngModule: ngModule,
                ref: decl, rawDeclarations: rawDeclarations,
            };
            // First, check for duplicate declarations of the same directive/pipe.
            if (this.duplicateDeclarations.has(decl.node)) {
                // This directive/pipe has already been identified as being duplicated. Add this module to the
                // map of modules for which a duplicate declaration exists.
                this.duplicateDeclarations.get(decl.node).set(ngModule, declData);
            }
            else if (this.declarationToModule.has(decl.node) &&
                this.declarationToModule.get(decl.node).ngModule !== ngModule) {
                // This directive/pipe is already registered as declared in another module. Mark it as a
                // duplicate instead.
                var duplicateDeclMap = new Map();
                var firstDeclData = this.declarationToModule.get(decl.node);
                // Mark both modules as tainted, since their declarations are missing a component.
                this.taintedModules.add(firstDeclData.ngModule);
                this.taintedModules.add(ngModule);
                // Being detected as a duplicate means there are two NgModules (for now) which declare this
                // directive/pipe. Add both of them to the duplicate tracking map.
                duplicateDeclMap.set(firstDeclData.ngModule, firstDeclData);
                duplicateDeclMap.set(ngModule, declData);
                this.duplicateDeclarations.set(decl.node, duplicateDeclMap);
                // Remove the directive/pipe from `declarationToModule` as it's a duplicate declaration, and
                // therefore not valid.
                this.declarationToModule.delete(decl.node);
            }
            else {
                // This is the first declaration of this directive/pipe, so map it.
                this.declarationToModule.set(decl.node, declData);
            }
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
                // 1) Add all of the directives/pipes from each NgModule imported into the current one to the
                //    compilation scope.
                // 2) Add directives/pipes declared in the NgModule to the compilation scope. At this point, the
                //    compilation scope is complete.
                // 3) For each entry in the NgModule's exports:
                //    a) Attempt to resolve it as an NgModule with its own exported directives/pipes. If it is
                //       one, add them to the export scope of this NgModule.
                //    b) Otherwise, it should be a class in the compilation scope of this NgModule. If it is,
                //       add it to the export scope.
                //    c) If it's neither an NgModule nor a directive/pipe in the compilation scope, then this
                //       is an error.
                // 1) process imports.
                for (var _h = tslib_1.__values(ngModule.imports), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var decl = _j.value;
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
                        for (var _k = (e_3 = void 0, tslib_1.__values(importScope.exported.directives)), _l = _k.next(); !_l.done; _l = _k.next()) {
                            var directive = _l.value;
                            compilationDirectives.set(directive.ref.node, directive);
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
                        for (var _m = (e_4 = void 0, tslib_1.__values(importScope.exported.pipes)), _o = _m.next(); !_o.done; _o = _m.next()) {
                            var pipe = _o.value;
                            compilationPipes.set(pipe.ref.node, pipe);
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_o && !_o.done && (_c = _m.return)) _c.call(_m);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
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
                // 2) add declarations.
                for (var _p = tslib_1.__values(ngModule.declarations), _q = _p.next(); !_q.done; _q = _p.next()) {
                    var decl = _q.value;
                    var directive = this.localReader.getDirectiveMetadata(decl);
                    var pipe = this.localReader.getPipeMetadata(decl);
                    if (directive !== null) {
                        compilationDirectives.set(decl.node, tslib_1.__assign(tslib_1.__assign({}, directive), { ref: decl }));
                    }
                    else if (pipe !== null) {
                        compilationPipes.set(decl.node, tslib_1.__assign(tslib_1.__assign({}, pipe), { ref: decl }));
                    }
                    else {
                        this.taintedModules.add(ngModule.ref.node);
                        var errorNode = decl.getOriginForDiagnostics(ngModule.rawDeclarations);
                        diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "The class '" + decl.node.name.text + "' is listed in the declarations " +
                            ("of the NgModule '" + ngModule.ref.node.name
                                .text + "', but is not a directive, a component, or a pipe. ") +
                            "Either remove it from the NgModule's declarations, or add an appropriate Angular decorator.", [{ node: decl.node.name, messageText: "'" + decl.node.name.text + "' is declared here." }]));
                        continue;
                    }
                    declared.add(decl.node);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_d = _p.return)) _d.call(_p);
                }
                finally { if (e_5) throw e_5.error; }
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
                // Mark this module as being tainted.
                this.taintedModules.add(ref.node);
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
        var message = "Appears in the NgModule." + type + "s of " + typescript_1.nodeNameForError(clazz) + ", but could not be resolved to an " + resolveTarget + " class." +
            '\n\n';
        var library = decl.ownedByModuleGuess !== null ? " (" + decl.ownedByModuleGuess + ")" : '';
        var sf = decl.node.getSourceFile();
        // Provide extra context to the error for the user.
        if (!sf.isDeclarationFile) {
            // This is a file in the user's program.
            var annotationType = type === 'import' ? '@NgModule' : 'Angular';
            message += "Is it missing an " + annotationType + " annotation?";
        }
        else if (sf.fileName.indexOf('node_modules') !== -1) {
            // This file comes from a third-party library in node_modules.
            message +=
                "This likely means that the library" + library + " which declares " + decl.debugName + " has not " +
                    'been processed correctly by ngcc, or is not compatible with Angular Ivy. Check if a ' +
                    'newer version of the library is available, and update if so. Also consider checking ' +
                    'with the library\'s authors to see if the library is expected to be compatible with Ivy.';
        }
        else {
            // This is a monorepo style local dependency. Unfortunately these are too different to really
            // offer much more advice than this.
            message += "This likely means that the dependency" + library + " which declares " + decl.debugName + " has not been processed correctly by ngcc.";
        }
        return diagnostics_1.makeDiagnostic(code, typescript_1.identifierOfNode(decl.node) || decl.node, message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBK0Q7SUFDL0QsK0JBQWlDO0lBRWpDLDJFQUE0RDtJQUk1RCxrRkFBNkU7SUE0QjdFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FrQkc7SUFDSDtRQTBERSxrQ0FDWSxXQUEyQixFQUFVLHFCQUE2QyxFQUNsRixVQUE0QixFQUFVLFlBQStCO1lBRHJFLGdCQUFXLEdBQVgsV0FBVyxDQUFnQjtZQUFVLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7WUFDbEYsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7WUEzRGpGOzs7O2VBSUc7WUFDSyxXQUFNLEdBQUcsS0FBSyxDQUFDO1lBRXZCOzs7Ozs7ZUFNRztZQUNLLHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1lBRTNFOzs7ZUFHRztZQUNLLDBCQUFxQixHQUN6QixJQUFJLEdBQUcsRUFBNEQsQ0FBQztZQUVoRSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO1lBRS9FOzs7OztlQUtHO1lBQ0ssVUFBSyxHQUFHLElBQUksR0FBRyxFQUFxRCxDQUFDO1lBRTdFOzs7Ozs7O2VBT0c7WUFDSyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1lBRXBEOztlQUVHO1lBQ0ssZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztZQUVuRTs7Ozs7O2VBTUc7WUFDSyxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBSStCLENBQUM7UUFFckY7O1dBRUc7UUFDSCwyREFBd0IsR0FBeEIsVUFBeUIsSUFBa0I7O1lBQ3pDLElBQUksQ0FB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QixNQUF3QixFQUFFLElBQWlDLEVBQzNELElBQWlDO1FBQ25DLElBQU0sZ0JBQWdCLEdBQUcsb0RBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxtRUFBZ0UsQ0FBQztRQUNyRixPQUFPLDRCQUFjLENBQ2pCLHVCQUFTLENBQUMsZ0NBQWdDLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFBLGlFQUVyRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGtEQUE2QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksNFZBS3ZGLENBQUEsQ0FBQyxJQUFJLEVBQUUsRUFDSjtZQUNFLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBQztZQUNyRCxFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUM7U0FDdEQsQ0FBQyxDQUFDO0lBQ1QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHRlcm5hbEV4cHIsIFNjaGVtYU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFcnJvckNvZGUsIG1ha2VEaWFnbm9zdGljfSBmcm9tICcuLi8uLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge0FsaWFzaW5nSG9zdCwgUmVleHBvcnQsIFJlZmVyZW5jZSwgUmVmZXJlbmNlRW1pdHRlcn0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpZGVudGlmaWVyT2ZOb2RlLCBub2RlTmFtZUZvckVycm9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFeHBvcnRTY29wZSwgU2NvcGVEYXRhfSBmcm9tICcuL2FwaSc7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyfSBmcm9tICcuL2NvbXBvbmVudF9zY29wZSc7XG5pbXBvcnQge0R0c01vZHVsZVNjb3BlUmVzb2x2ZXJ9IGZyb20gJy4vZGVwZW5kZW5jeSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYWxOZ01vZHVsZURhdGEge1xuICBkZWNsYXJhdGlvbnM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBpbXBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgZXhwb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9jYWxNb2R1bGVTY29wZSBleHRlbmRzIEV4cG9ydFNjb3BlIHtcbiAgY29tcGlsYXRpb246IFNjb3BlRGF0YTtcbiAgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGw7XG4gIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW107XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgcmVnaXN0ZXJlZCBkZWNsYXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21waWxhdGlvblNjb3BlIGV4dGVuZHMgU2NvcGVEYXRhIHtcbiAgLyoqIFRoZSBkZWNsYXJhdGlvbiB3aG9zZSBjb21waWxhdGlvbiBzY29wZSBpcyBkZXNjcmliZWQgaGVyZS4gKi9cbiAgZGVjbGFyYXRpb246IENsYXNzRGVjbGFyYXRpb247XG4gIC8qKiBUaGUgZGVjbGFyYXRpb24gb2YgdGhlIE5nTW9kdWxlIHRoYXQgZGVjbGFyZXMgdGhpcyBgZGVjbGFyYXRpb25gLiAqL1xuICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbjtcbn1cblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IHdoaWNoIGNvbGxlY3RzIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgRGlyZWN0aXZlcywgQ29tcG9uZW50cywgYW5kIFBpcGVzIHdoaWNoXG4gKiBhcmUgbG9jYWwgKGRlY2xhcmVkIGluIHRoZSB0cy5Qcm9ncmFtIGJlaW5nIGNvbXBpbGVkKSwgYW5kIGNhbiBwcm9kdWNlIGBMb2NhbE1vZHVsZVNjb3BlYHNcbiAqIHdoaWNoIHN1bW1hcml6ZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBjbGFzcyBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzIGFuZCBjYW4gcHJvZHVjZSxcbiAqIGZvciBhIGdpdmVuIGNvbXBvbmVudCwgdGhlIHNldCBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgXCJ2aXNpYmxlXCIgaW4gdGhhdCBjb21wb25lbnQnc1xuICogdGVtcGxhdGUuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGhhcyB0d28gXCJtb2Rlc1wiIG9mIG9wZXJhdGlvbi4gRHVyaW5nIGFuYWx5c2lzLCBkYXRhIGZvciBlYWNoXG4gKiBpbmRpdmlkdWFsIE5nTW9kdWxlLCBEaXJlY3RpdmUsIENvbXBvbmVudCwgYW5kIFBpcGUgaXMgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBObyBhdHRlbXB0IGlzIG1hZGVcbiAqIHRvIHRyYXZlcnNlIG9yIHZhbGlkYXRlIHRoZSBOZ01vZHVsZSBncmFwaCAoaW1wb3J0cywgZXhwb3J0cywgZXRjKS4gQWZ0ZXIgYW5hbHlzaXMsIG9uZSBvZlxuICogYGdldFNjb3BlT2ZNb2R1bGVgIG9yIGBnZXRTY29wZUZvckNvbXBvbmVudGAgY2FuIGJlIGNhbGxlZCwgd2hpY2ggdHJhdmVyc2VzIHRoZSBOZ01vZHVsZSBncmFwaFxuICogYW5kIGFwcGxpZXMgdGhlIE5nTW9kdWxlIGxvZ2ljIHRvIGdlbmVyYXRlIGEgYExvY2FsTW9kdWxlU2NvcGVgLCB0aGUgZnVsbCBzY29wZSBmb3IgdGhlIGdpdmVuXG4gKiBtb2R1bGUgb3IgY29tcG9uZW50LlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBpcyBhbHNvIGNhcGFibGUgb2YgcHJvZHVjaW5nIGB0cy5EaWFnbm9zdGljYCBlcnJvcnMgd2hlbiBBbmd1bGFyXG4gKiBzZW1hbnRpY3MgYXJlIHZpb2xhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSwgQ29tcG9uZW50U2NvcGVSZWFkZXIge1xuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgdGhlIHJlZ2lzdHJ5IGhhcyBiZWVuIGFza2VkIHRvIHByb2R1Y2Ugc2NvcGVzIGZvciBhIG1vZHVsZSBvciBjb21wb25lbnQuIE9uY2VcbiAgICogdGhpcyBpcyB0cnVlLCB0aGUgcmVnaXN0cnkgY2Fubm90IGFjY2VwdCByZWdpc3RyYXRpb25zIG9mIG5ldyBkaXJlY3RpdmVzL3BpcGVzL21vZHVsZXMgYXMgaXRcbiAgICogd291bGQgaW52YWxpZGF0ZSB0aGUgY2FjaGVkIHNjb3BlIGRhdGEuXG4gICAqL1xuICBwcml2YXRlIHNlYWxlZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBjb21wb25lbnRzIGZyb20gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCB0byB0aGUgTmdNb2R1bGUgd2hpY2ggZGVjbGFyZWQgdGhlbS5cbiAgICpcbiAgICogQXMgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBhcmUgbm90IGRpc3Rpbmd1aXNoZWQgYXQgdGhlIE5nTW9kdWxlIGxldmVsLCB0aGlzIG1hcCBtYXkgYWxzb1xuICAgKiBjb250YWluIGRpcmVjdGl2ZXMuIFRoaXMgZG9lc24ndCBjYXVzZSBhbnkgcHJvYmxlbXMgYnV0IGlzbid0IHVzZWZ1bCBhcyB0aGVyZSBpcyBubyBjb25jZXB0IG9mXG4gICAqIGEgZGlyZWN0aXZlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAqL1xuICBwcml2YXRlIGRlY2xhcmF0aW9uVG9Nb2R1bGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRGF0YT4oKTtcblxuICAvKipcbiAgICogVGhpcyBtYXBzIGZyb20gdGhlIGRpcmVjdGl2ZS9waXBlIGNsYXNzIHRvIGEgbWFwIG9mIGRhdGEgZm9yIGVhY2ggTmdNb2R1bGUgdGhhdCBkZWNsYXJlcyB0aGVcbiAgICogZGlyZWN0aXZlL3BpcGUuIFRoaXMgZGF0YSBpcyBuZWVkZWQgdG8gcHJvZHVjZSBhbiBlcnJvciBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICAgKi9cbiAgcHJpdmF0ZSBkdXBsaWNhdGVEZWNsYXJhdGlvbnMgPVxuICAgICAgbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25EYXRhPj4oKTtcblxuICBwcml2YXRlIG1vZHVsZVRvUmVmID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG5cbiAgLyoqXG4gICAqIEEgY2FjaGUgb2YgY2FsY3VsYXRlZCBgTG9jYWxNb2R1bGVTY29wZWBzIGZvciBlYWNoIE5nTW9kdWxlIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IHByb2dyYW0uXG4gICAqXG4gICAqIEEgdmFsdWUgb2YgYHVuZGVmaW5lZGAgaW5kaWNhdGVzIHRoZSBzY29wZSB3YXMgaW52YWxpZCBhbmQgcHJvZHVjZWQgZXJyb3JzICh0aGVyZWZvcmUsXG4gICAqIGRpYWdub3N0aWNzIHNob3VsZCBleGlzdCBpbiB0aGUgYHNjb3BlRXJyb3JzYCBtYXApLlxuICAgKi9cbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTG9jYWxNb2R1bGVTY29wZXx1bmRlZmluZWR8bnVsbD4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgYSBnaXZlbiBjb21wb25lbnQgcmVxdWlyZXMgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgKlxuICAgKiBSZW1vdGUgc2NvcGluZyBpcyB3aGVuIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyB3aGljaCBhcHBseSB0byBhIGdpdmVuIGNvbXBvbmVudCBpcyBzZXQgaW4gdGhlXG4gICAqIE5nTW9kdWxlJ3MgZmlsZSBpbnN0ZWFkIG9mIGRpcmVjdGx5IG9uIHRoZSBjb21wb25lbnQgZGVmICh3aGljaCBpcyBzb21ldGltZXMgbmVlZGVkIHRvIGdldFxuICAgKiBhcm91bmQgY3ljbGljIGltcG9ydCBpc3N1ZXMpLiBUaGlzIGlzIG5vdCB1c2VkIGluIGNhbGN1bGF0aW9uIG9mIGBMb2NhbE1vZHVsZVNjb3BlYHMsIGJ1dCBpc1xuICAgKiB0cmFja2VkIGhlcmUgZm9yIGNvbnZlbmllbmNlLlxuICAgKi9cbiAgcHJpdmF0ZSByZW1vdGVTY29waW5nID0gbmV3IFNldDxDbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgZXJyb3JzIGFjY3VtdWxhdGVkIGluIHRoZSBwcm9jZXNzaW5nIG9mIHNjb3BlcyBmb3IgZWFjaCBtb2R1bGUgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIHNjb3BlRXJyb3JzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5EaWFnbm9zdGljW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGljaCBOZ01vZHVsZXMgYXJlIHVucmVsaWFibGUgZHVlIHRvIGVycm9ycyB3aXRoaW4gdGhlaXIgZGVjbGFyYXRpb25zLlxuICAgKlxuICAgKiBUaGlzIHByb3ZpZGVzIGEgdW5pZmllZCB2aWV3IG9mIHdoaWNoIG1vZHVsZXMgaGF2ZSBlcnJvcnMsIGFjcm9zcyBhbGwgb2YgdGhlIGRpZmZlcmVudFxuICAgKiBkaWFnbm9zdGljIGNhdGVnb3JpZXMgdGhhdCBjYW4gYmUgcHJvZHVjZWQuIFRoZW9yZXRpY2FsbHkgdGhpcyBjYW4gYmUgaW5mZXJyZWQgZnJvbSB0aGUgb3RoZXJcbiAgICogcHJvcGVydGllcyBvZiB0aGlzIGNsYXNzLCBidXQgaXMgdHJhY2tlZCBleHBsaWNpdGx5IHRvIHNpbXBsaWZ5IHRoZSBsb2dpYy5cbiAgICovXG4gIHByaXZhdGUgdGFpbnRlZE1vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGxvY2FsUmVhZGVyOiBNZXRhZGF0YVJlYWRlciwgcHJpdmF0ZSBkZXBlbmRlbmN5U2NvcGVSZWFkZXI6IER0c01vZHVsZVNjb3BlUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCkge31cblxuICAvKipcbiAgICogQWRkIGFuIE5nTW9kdWxlJ3MgZGF0YSB0byB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoZGF0YTogTmdNb2R1bGVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRDb2xsZWN0aW5nKCk7XG4gICAgY29uc3QgbmdNb2R1bGUgPSBkYXRhLnJlZi5ub2RlO1xuICAgIHRoaXMubW9kdWxlVG9SZWYuc2V0KGRhdGEucmVmLm5vZGUsIGRhdGEucmVmKTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIG1vZHVsZSdzIGRlY2xhcmF0aW9ucywgYW5kIGFkZCB0aGVtIHRvIGRlY2xhcmF0aW9uVG9Nb2R1bGUuIElmIGR1cGxpY2F0ZXNcbiAgICAvLyBhcmUgZm91bmQsIHRoZXkncmUgaW5zdGVhZCB0cmFja2VkIGluIGR1cGxpY2F0ZURlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGF0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJEZWNsYXJhdGlvbk9mTW9kdWxlKG5nTW9kdWxlLCBkZWNsLCBkYXRhLnJhd0RlY2xhcmF0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmU6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHt9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEocGlwZTogUGlwZU1ldGEpOiB2b2lkIHt9XG5cbiAgZ2V0U2NvcGVGb3JDb21wb25lbnQoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGx8J2Vycm9yJyB7XG4gICAgY29uc3Qgc2NvcGUgPSAhdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmhhcyhjbGF6eikgP1xuICAgICAgICBudWxsIDpcbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlKHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5nZXQoY2xhenopICEubmdNb2R1bGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiBgbm9kZWAgaXMgZGVjbGFyZWQgaW4gbW9yZSB0aGFuIG9uZSBOZ01vZHVsZSAoZHVwbGljYXRlIGRlY2xhcmF0aW9uKSwgdGhlbiBnZXQgdGhlXG4gICAqIGBEZWNsYXJhdGlvbkRhdGFgIGZvciBlYWNoIG9mZmVuZGluZyBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogT3JkaW5hcmlseSBhIGNsYXNzIGlzIG9ubHkgZGVjbGFyZWQgaW4gb25lIE5nTW9kdWxlLCBpbiB3aGljaCBjYXNlIHRoaXMgZnVuY3Rpb24gcmV0dXJuc1xuICAgKiBgbnVsbGAuXG4gICAqL1xuICBnZXREdXBsaWNhdGVEZWNsYXJhdGlvbnMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IERlY2xhcmF0aW9uRGF0YVtdfG51bGwge1xuICAgIGlmICghdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmR1cGxpY2F0ZURlY2xhcmF0aW9ucy5nZXQobm9kZSkgIS52YWx1ZXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBgbnVsbGAgaWYgbm8gc2NvcGUgd2FzIGV2ZXJcbiAgICogZGVmaW5lZCwgb3IgdGhlIHN0cmluZyBgJ2Vycm9yJ2AgaWYgdGhlIHNjb3BlIGNvbnRhaW5lZCBlcnJvcnMuXG4gICAqL1xuICBnZXRTY29wZU9mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXwnZXJyb3InfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5tb2R1bGVUb1JlZi5oYXMoY2xhenopID9cbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHRoaXMubW9kdWxlVG9SZWYuZ2V0KGNsYXp6KSAhKSA6XG4gICAgICAgIG51bGw7XG4gICAgLy8gSWYgdGhlIE5nTW9kdWxlIGNsYXNzIGlzIG1hcmtlZCBhcyB0YWludGVkLCBjb25zaWRlciBpdCBhbiBlcnJvci5cbiAgICBpZiAodGhpcy50YWludGVkTW9kdWxlcy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gJ2Vycm9yJztcbiAgICB9XG5cbiAgICAvLyBUcmFuc2xhdGUgdW5kZWZpbmVkIC0+ICdlcnJvcicuXG4gICAgcmV0dXJuIHNjb3BlICE9PSB1bmRlZmluZWQgPyBzY29wZSA6ICdlcnJvcic7XG4gIH1cblxuICAvKipcbiAgICogUmV0cmlldmVzIGFueSBgdHMuRGlhZ25vc3RpY2BzIHByb2R1Y2VkIGR1cmluZyB0aGUgY2FsY3VsYXRpb24gb2YgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCBmb3JcbiAgICogdGhlIGdpdmVuIE5nTW9kdWxlLCBvciBgbnVsbGAgaWYgbm8gZXJyb3JzIHdlcmUgcHJlc2VudC5cbiAgICovXG4gIGdldERpYWdub3N0aWNzT2ZNb2R1bGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiB0cy5EaWFnbm9zdGljW118bnVsbCB7XG4gICAgLy8gUmVxdWlyZWQgdG8gZW5zdXJlIHRoZSBlcnJvcnMgYXJlIHBvcHVsYXRlZCBmb3IgdGhlIGdpdmVuIGNsYXNzLiBJZiBpdCBoYXMgYmVlbiBwcm9jZXNzZWRcbiAgICAvLyBiZWZvcmUsIHRoaXMgd2lsbCBiZSBhIG5vLW9wIGR1ZSB0byB0aGUgc2NvcGUgY2FjaGUuXG4gICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlKGNsYXp6KTtcblxuICAgIGlmICh0aGlzLnNjb3BlRXJyb3JzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiB0aGlzLnNjb3BlRXJyb3JzLmdldChjbGF6eikgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb2xsZWN0aW9uIG9mIHRoZSBjb21waWxhdGlvbiBzY29wZSBmb3IgZWFjaCByZWdpc3RlcmVkIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgZ2V0Q29tcGlsYXRpb25TY29wZXMoKTogQ29tcGlsYXRpb25TY29wZVtdIHtcbiAgICBjb25zdCBzY29wZXM6IENvbXBpbGF0aW9uU2NvcGVbXSA9IFtdO1xuICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5mb3JFYWNoKChkZWNsRGF0YSwgZGVjbGFyYXRpb24pID0+IHtcbiAgICAgIGNvbnN0IHNjb3BlID0gdGhpcy5nZXRTY29wZU9mTW9kdWxlKGRlY2xEYXRhLm5nTW9kdWxlKTtcbiAgICAgIGlmIChzY29wZSAhPT0gbnVsbCAmJiBzY29wZSAhPT0gJ2Vycm9yJykge1xuICAgICAgICBzY29wZXMucHVzaCh7ZGVjbGFyYXRpb24sIG5nTW9kdWxlOiBkZWNsRGF0YS5uZ01vZHVsZSwgLi4uc2NvcGUuY29tcGlsYXRpb259KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc2NvcGVzO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckRlY2xhcmF0aW9uT2ZNb2R1bGUoXG4gICAgICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjbDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBkZWNsRGF0YTogRGVjbGFyYXRpb25EYXRhID0ge1xuICAgICAgbmdNb2R1bGUsXG4gICAgICByZWY6IGRlY2wsIHJhd0RlY2xhcmF0aW9ucyxcbiAgICB9O1xuXG4gICAgLy8gRmlyc3QsIGNoZWNrIGZvciBkdXBsaWNhdGUgZGVjbGFyYXRpb25zIG9mIHRoZSBzYW1lIGRpcmVjdGl2ZS9waXBlLlxuICAgIGlmICh0aGlzLmR1cGxpY2F0ZURlY2xhcmF0aW9ucy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgLy8gVGhpcyBkaXJlY3RpdmUvcGlwZSBoYXMgYWxyZWFkeSBiZWVuIGlkZW50aWZpZWQgYXMgYmVpbmcgZHVwbGljYXRlZC4gQWRkIHRoaXMgbW9kdWxlIHRvIHRoZVxuICAgICAgLy8gbWFwIG9mIG1vZHVsZXMgZm9yIHdoaWNoIGEgZHVwbGljYXRlIGRlY2xhcmF0aW9uIGV4aXN0cy5cbiAgICAgIHRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLmdldChkZWNsLm5vZGUpICEuc2V0KG5nTW9kdWxlLCBkZWNsRGF0YSk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmhhcyhkZWNsLm5vZGUpICYmXG4gICAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5nZXQoZGVjbC5ub2RlKSAhLm5nTW9kdWxlICE9PSBuZ01vZHVsZSkge1xuICAgICAgLy8gVGhpcyBkaXJlY3RpdmUvcGlwZSBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgYXMgZGVjbGFyZWQgaW4gYW5vdGhlciBtb2R1bGUuIE1hcmsgaXQgYXMgYVxuICAgICAgLy8gZHVwbGljYXRlIGluc3RlYWQuXG4gICAgICBjb25zdCBkdXBsaWNhdGVEZWNsTWFwID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkRhdGE+KCk7XG4gICAgICBjb25zdCBmaXJzdERlY2xEYXRhID0gdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChkZWNsLm5vZGUpICE7XG5cbiAgICAgIC8vIE1hcmsgYm90aCBtb2R1bGVzIGFzIHRhaW50ZWQsIHNpbmNlIHRoZWlyIGRlY2xhcmF0aW9ucyBhcmUgbWlzc2luZyBhIGNvbXBvbmVudC5cbiAgICAgIHRoaXMudGFpbnRlZE1vZHVsZXMuYWRkKGZpcnN0RGVjbERhdGEubmdNb2R1bGUpO1xuICAgICAgdGhpcy50YWludGVkTW9kdWxlcy5hZGQobmdNb2R1bGUpO1xuXG4gICAgICAvLyBCZWluZyBkZXRlY3RlZCBhcyBhIGR1cGxpY2F0ZSBtZWFucyB0aGVyZSBhcmUgdHdvIE5nTW9kdWxlcyAoZm9yIG5vdykgd2hpY2ggZGVjbGFyZSB0aGlzXG4gICAgICAvLyBkaXJlY3RpdmUvcGlwZS4gQWRkIGJvdGggb2YgdGhlbSB0byB0aGUgZHVwbGljYXRlIHRyYWNraW5nIG1hcC5cbiAgICAgIGR1cGxpY2F0ZURlY2xNYXAuc2V0KGZpcnN0RGVjbERhdGEubmdNb2R1bGUsIGZpcnN0RGVjbERhdGEpO1xuICAgICAgZHVwbGljYXRlRGVjbE1hcC5zZXQobmdNb2R1bGUsIGRlY2xEYXRhKTtcbiAgICAgIHRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLnNldChkZWNsLm5vZGUsIGR1cGxpY2F0ZURlY2xNYXApO1xuXG4gICAgICAvLyBSZW1vdmUgdGhlIGRpcmVjdGl2ZS9waXBlIGZyb20gYGRlY2xhcmF0aW9uVG9Nb2R1bGVgIGFzIGl0J3MgYSBkdXBsaWNhdGUgZGVjbGFyYXRpb24sIGFuZFxuICAgICAgLy8gdGhlcmVmb3JlIG5vdCB2YWxpZC5cbiAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5kZWxldGUoZGVjbC5ub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgZGVjbGFyYXRpb24gb2YgdGhpcyBkaXJlY3RpdmUvcGlwZSwgc28gbWFwIGl0LlxuICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLnNldChkZWNsLm5vZGUsIGRlY2xEYXRhKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgYGdldFNjb3BlT2ZNb2R1bGVgIHdoaWNoIGFjY2VwdHMgYSByZWZlcmVuY2UgdG8gYSBjbGFzcyBhbmQgZGlmZmVyZW50aWF0ZXNcbiAgICogYmV0d2VlbjpcbiAgICpcbiAgICogKiBubyBzY29wZSBiZWluZyBhdmFpbGFibGUgKHJldHVybnMgYG51bGxgKVxuICAgKiAqIGEgc2NvcGUgYmVpbmcgcHJvZHVjZWQgd2l0aCBlcnJvcnMgKHJldHVybnMgYHVuZGVmaW5lZGApLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTG9jYWxNb2R1bGVTY29wZXxudWxsXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQocmVmLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIFNlYWwgdGhlIHJlZ2lzdHJ5IHRvIHByb3RlY3QgdGhlIGludGVncml0eSBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGNhY2hlLlxuICAgIHRoaXMuc2VhbGVkID0gdHJ1ZTtcblxuICAgIC8vIGByZWZgIHNob3VsZCBiZSBhbiBOZ01vZHVsZSBwcmV2aW91c2x5IGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gSWYgbm90LCBhIHNjb3BlIGZvciBpdFxuICAgIC8vIGNhbm5vdCBiZSBwcm9kdWNlZC5cbiAgICBjb25zdCBuZ01vZHVsZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWYpO1xuICAgIGlmIChuZ01vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIG51bGwpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uUGlwZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcblxuICAgIGNvbnN0IGRlY2xhcmVkID0gbmV3IFNldDx0cy5EZWNsYXJhdGlvbj4oKTtcblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGV4cG9ydGVkIHRvIGFueSBpbXBvcnRpbmcgTmdNb2R1bGVzLlxuICAgIGNvbnN0IGV4cG9ydERpcmVjdGl2ZXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGV4cG9ydFBpcGVzID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgUGlwZU1ldGE+KCk7XG5cbiAgICAvLyBUaGUgYWxnb3JpdGhtIGlzIGFzIGZvbGxvd3M6XG4gICAgLy8gMSkgQWRkIGFsbCBvZiB0aGUgZGlyZWN0aXZlcy9waXBlcyBmcm9tIGVhY2ggTmdNb2R1bGUgaW1wb3J0ZWQgaW50byB0aGUgY3VycmVudCBvbmUgdG8gdGhlXG4gICAgLy8gICAgY29tcGlsYXRpb24gc2NvcGUuXG4gICAgLy8gMikgQWRkIGRpcmVjdGl2ZXMvcGlwZXMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZS4gQXQgdGhpcyBwb2ludCwgdGhlXG4gICAgLy8gICAgY29tcGlsYXRpb24gc2NvcGUgaXMgY29tcGxldGUuXG4gICAgLy8gMykgRm9yIGVhY2ggZW50cnkgaW4gdGhlIE5nTW9kdWxlJ3MgZXhwb3J0czpcbiAgICAvLyAgICBhKSBBdHRlbXB0IHRvIHJlc29sdmUgaXQgYXMgYW4gTmdNb2R1bGUgd2l0aCBpdHMgb3duIGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMuIElmIGl0IGlzXG4gICAgLy8gICAgICAgb25lLCBhZGQgdGhlbSB0byB0aGUgZXhwb3J0IHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgLy8gICAgYikgT3RoZXJ3aXNlLCBpdCBzaG91bGQgYmUgYSBjbGFzcyBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS4gSWYgaXQgaXMsXG4gICAgLy8gICAgICAgYWRkIGl0IHRvIHRoZSBleHBvcnQgc2NvcGUuXG4gICAgLy8gICAgYykgSWYgaXQncyBuZWl0aGVyIGFuIE5nTW9kdWxlIG5vciBhIGRpcmVjdGl2ZS9waXBlIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSwgdGhlbiB0aGlzXG4gICAgLy8gICAgICAgaXMgYW4gZXJyb3IuXG5cbiAgICAvLyAxKSBwcm9jZXNzIGltcG9ydHMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmltcG9ydHMpIHtcbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2ltcG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXNuJ3QgYW4gTmdNb2R1bGUsIHNvIHJlY29yZCBhbiBlcnJvci5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnaW1wb3J0JykpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBBbiBpbXBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBpbXBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAyKSBhZGQgZGVjbGFyYXRpb25zLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBuZ01vZHVsZS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0RGlyZWN0aXZlTWV0YWRhdGEoZGVjbCk7XG4gICAgICBjb25zdCBwaXBlID0gdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCk7XG4gICAgICBpZiAoZGlyZWN0aXZlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGVjbC5ub2RlLCB7Li4uZGlyZWN0aXZlLCByZWY6IGRlY2x9KTtcbiAgICAgIH0gZWxzZSBpZiAocGlwZSAhPT0gbnVsbCkge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChkZWNsLm5vZGUsIHsuLi5waXBlLCByZWY6IGRlY2x9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGFpbnRlZE1vZHVsZXMuYWRkKG5nTW9kdWxlLnJlZi5ub2RlKTtcblxuICAgICAgICBjb25zdCBlcnJvck5vZGUgPSBkZWNsLmdldE9yaWdpbkZvckRpYWdub3N0aWNzKG5nTW9kdWxlLnJhd0RlY2xhcmF0aW9ucyAhKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICBgVGhlIGNsYXNzICcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBsaXN0ZWQgaW4gdGhlIGRlY2xhcmF0aW9ucyBgICtcbiAgICAgICAgICAgICAgICBgb2YgdGhlIE5nTW9kdWxlICcke1xuICAgICAgICAgICAgICAgICAgICBuZ01vZHVsZS5yZWYubm9kZS5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nLCBidXQgaXMgbm90IGEgZGlyZWN0aXZlLCBhIGNvbXBvbmVudCwgb3IgYSBwaXBlLiBgICtcbiAgICAgICAgICAgICAgICBgRWl0aGVyIHJlbW92ZSBpdCBmcm9tIHRoZSBOZ01vZHVsZSdzIGRlY2xhcmF0aW9ucywgb3IgYWRkIGFuIGFwcHJvcHJpYXRlIEFuZ3VsYXIgZGVjb3JhdG9yLmAsXG4gICAgICAgICAgICBbe25vZGU6IGRlY2wubm9kZS5uYW1lLCBtZXNzYWdlVGV4dDogYCcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmB9XSkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGVjbGFyZWQuYWRkKGRlY2wubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gMykgcHJvY2VzcyBleHBvcnRzLlxuICAgIC8vIEV4cG9ydHMgY2FuIGNvbnRhaW4gbW9kdWxlcywgY29tcG9uZW50cywgb3IgZGlyZWN0aXZlcy4gVGhleSdyZSBwcm9jZXNzZWQgZGlmZmVyZW50bHkuXG4gICAgLy8gTW9kdWxlcyBhcmUgc3RyYWlnaHRmb3J3YXJkLiBEaXJlY3RpdmVzIGFuZCBwaXBlcyBmcm9tIGV4cG9ydGVkIG1vZHVsZXMgYXJlIGFkZGVkIHRvIHRoZVxuICAgIC8vIGV4cG9ydCBtYXBzLiBEaXJlY3RpdmVzL3BpcGVzIGFyZSBkaWZmZXJlbnQgLSB0aGV5IG1pZ2h0IGJlIGV4cG9ydHMgb2YgZGVjbGFyZWQgdHlwZXMgb3JcbiAgICAvLyBpbXBvcnRlZCB0eXBlcy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZXhwb3J0cykge1xuICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIGRlY2wgYXMgYW4gTmdNb2R1bGUuXG4gICAgICBjb25zdCBpbXBvcnRTY29wZSA9IHRoaXMuZ2V0RXhwb3J0ZWRTY29wZShkZWNsLCBkaWFnbm9zdGljcywgcmVmLm5vZGUsICdleHBvcnQnKTtcbiAgICAgIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGV4cG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGV4cG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGltcG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gTmdNb2R1bGUuXG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgZXhwb3J0UGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgICAvLyBkZWNsIGlzIGEgZGlyZWN0aXZlIG9yIGNvbXBvbmVudCBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAgICAgY29uc3QgZGlyZWN0aXZlID0gY29tcGlsYXRpb25EaXJlY3RpdmVzLmdldChkZWNsLm5vZGUpICE7XG4gICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25QaXBlcy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgICAvLyBkZWNsIGlzIGEgcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAgICAgY29uc3QgcGlwZSA9IGNvbXBpbGF0aW9uUGlwZXMuZ2V0KGRlY2wubm9kZSkgITtcbiAgICAgICAgZXhwb3J0UGlwZXMuc2V0KGRlY2wubm9kZSwgcGlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIHVua25vd24gZXhwb3J0LlxuICAgICAgICBpZiAodGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCkgIT09IG51bGwpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWV4cG9ydChyZWYubm9kZSwgZGVjbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRlZCA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oZXhwb3J0RGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICBwaXBlczogQXJyYXkuZnJvbShleHBvcnRQaXBlcy52YWx1ZXMoKSksXG4gICAgfTtcblxuICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZ2V0UmVleHBvcnRzKG5nTW9kdWxlLCByZWYsIGRlY2xhcmVkLCBleHBvcnRlZCwgZGlhZ25vc3RpY3MpO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBzY29wZSBoYWQgYW55IGVycm9ycyBkdXJpbmcgcHJvZHVjdGlvbi5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gQ2FjaGUgdW5kZWZpbmVkLCB0byBtYXJrIHRoZSBmYWN0IHRoYXQgdGhlIHNjb3BlIGlzIGludmFsaWQuXG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgdW5kZWZpbmVkKTtcblxuICAgICAgLy8gU2F2ZSB0aGUgZXJyb3JzIGZvciByZXRyaWV2YWwuXG4gICAgICB0aGlzLnNjb3BlRXJyb3JzLnNldChyZWYubm9kZSwgZGlhZ25vc3RpY3MpO1xuXG4gICAgICAvLyBNYXJrIHRoaXMgbW9kdWxlIGFzIGJlaW5nIHRhaW50ZWQuXG4gICAgICB0aGlzLnRhaW50ZWRNb2R1bGVzLmFkZChyZWYubm9kZSk7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIEZpbmFsbHksIHByb2R1Y2UgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCB3aXRoIGJvdGggdGhlIGNvbXBpbGF0aW9uIGFuZCBleHBvcnQgc2NvcGVzLlxuICAgIGNvbnN0IHNjb3BlID0ge1xuICAgICAgY29tcGlsYXRpb246IHtcbiAgICAgICAgZGlyZWN0aXZlczogQXJyYXkuZnJvbShjb21waWxhdGlvbkRpcmVjdGl2ZXMudmFsdWVzKCkpLFxuICAgICAgICBwaXBlczogQXJyYXkuZnJvbShjb21waWxhdGlvblBpcGVzLnZhbHVlcygpKSxcbiAgICAgIH0sXG4gICAgICBleHBvcnRlZCxcbiAgICAgIHJlZXhwb3J0cyxcbiAgICAgIHNjaGVtYXM6IG5nTW9kdWxlLnNjaGVtYXMsXG4gICAgfTtcbiAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgc2NvcGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgY29tcG9uZW50IHJlcXVpcmVzIHJlbW90ZSBzY29waW5nLlxuICAgKi9cbiAgZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogYm9vbGVhbiB7IHJldHVybiB0aGlzLnJlbW90ZVNjb3BpbmcuaGFzKG5vZGUpOyB9XG5cbiAgLyoqXG4gICAqIFNldCBhIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBzZXRDb21wb25lbnRBc1JlcXVpcmluZ1JlbW90ZVNjb3Bpbmcobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIHRoaXMucmVtb3RlU2NvcGluZy5hZGQobm9kZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9vayB1cCB0aGUgYEV4cG9ydFNjb3BlYCBvZiBhIGdpdmVuIGBSZWZlcmVuY2VgIHRvIGFuIE5nTW9kdWxlLlxuICAgKlxuICAgKiBUaGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24gbWF5IGJlIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgdHMuUHJvZ3JhbSwgb3IgaXQgbWF5IGJlXG4gICAqIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZS5cbiAgICpcbiAgICogQHJldHVybnMgYG51bGxgIGlmIG5vIHNjb3BlIGNvdWxkIGJlIGZvdW5kLCBvciBgdW5kZWZpbmVkYCBpZiBhbiBpbnZhbGlkIHNjb3BlXG4gICAqIHdhcyBmb3VuZC5cbiAgICpcbiAgICogTWF5IGFsc28gY29udHJpYnV0ZSBkaWFnbm9zdGljcyBvZiBpdHMgb3duIGJ5IGFkZGluZyB0byB0aGUgZ2l2ZW4gYGRpYWdub3N0aWNzYFxuICAgKiBhcnJheSBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldEV4cG9ydGVkU2NvcGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSxcbiAgICAgIG93bmVyRm9yRXJyb3JzOiB0cy5EZWNsYXJhdGlvbiwgdHlwZTogJ2ltcG9ydCd8J2V4cG9ydCcpOiBFeHBvcnRTY29wZXxudWxsfHVuZGVmaW5lZCB7XG4gICAgaWYgKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZS4gUmVzb2x2ZSBpdCB3aXRoIHRoZSBgRGVwZW5kZW5jeVNjb3BlUmVhZGVyYC5cbiAgICAgIGlmICghdHMuaXNDbGFzc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSkge1xuICAgICAgICAvLyBUaGUgTmdNb2R1bGUgaXMgaW4gYSAuZC50cyBmaWxlIGJ1dCBpcyBub3QgZGVjbGFyZWQgYXMgYSB0cy5DbGFzc0RlY2xhcmF0aW9uLiBUaGlzIGlzIGFuXG4gICAgICAgIC8vIGVycm9yIGluIHRoZSAuZC50cyBtZXRhZGF0YS5cbiAgICAgICAgY29uc3QgY29kZSA9IHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShyZWYubm9kZSkgfHwgcmVmLm5vZGUsIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lRm9yRXJyb3Iob3duZXJGb3JFcnJvcnMpfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiBOZ01vZHVsZWApKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRlcGVuZGVuY3lTY29wZVJlYWRlci5yZXNvbHZlKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHByb2dyYW0uIFJlc29sdmUgaXQgZnJvbSB0aGUgcmVnaXN0cnkuXG4gICAgICByZXR1cm4gdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWV4cG9ydHMoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVNZXRhLCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgZGVjbGFyZWQ6IFNldDx0cy5EZWNsYXJhdGlvbj4sXG4gICAgICBleHBvcnRlZDoge2RpcmVjdGl2ZXM6IERpcmVjdGl2ZU1ldGFbXSwgcGlwZXM6IFBpcGVNZXRhW119LFxuICAgICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IFJlZXhwb3J0W118bnVsbCB7XG4gICAgbGV0IHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgIC8vIFRyYWNrIHJlLWV4cG9ydHMgYnkgc3ltYm9sIG5hbWUsIHRvIHByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgdHdvIGFsaWFzIHJlLWV4cG9ydHMgd291bGQgc2hhcmVcbiAgICAvLyB0aGUgc2FtZSBuYW1lLlxuICAgIGNvbnN0IHJlZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAvLyBBbGlhcyBuZ01vZHVsZVJlZiBhZGRlZCBmb3IgcmVhZGFiaWxpdHkgYmVsb3cuXG4gICAgY29uc3QgbmdNb2R1bGVSZWYgPSByZWY7XG4gICAgY29uc3QgYWRkUmVleHBvcnQgPSAoZXhwb3J0UmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pID0+IHtcbiAgICAgIGlmIChleHBvcnRSZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IHNvdXJjZUZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaXNSZUV4cG9ydCA9ICFkZWNsYXJlZC5oYXMoZXhwb3J0UmVmLm5vZGUpO1xuICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IHRoaXMuYWxpYXNpbmdIb3N0ICEubWF5YmVBbGlhc1N5bWJvbEFzKFxuICAgICAgICAgIGV4cG9ydFJlZiwgc291cmNlRmlsZSwgbmdNb2R1bGUucmVmLm5vZGUubmFtZS50ZXh0LCBpc1JlRXhwb3J0KTtcbiAgICAgIGlmIChleHBvcnROYW1lID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghcmVleHBvcnRNYXAuaGFzKGV4cG9ydE5hbWUpKSB7XG4gICAgICAgIGlmIChleHBvcnRSZWYuYWxpYXMgJiYgZXhwb3J0UmVmLmFsaWFzIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB7XG4gICAgICAgICAgcmVleHBvcnRzICEucHVzaCh7XG4gICAgICAgICAgICBmcm9tTW9kdWxlOiBleHBvcnRSZWYuYWxpYXMudmFsdWUubW9kdWxlTmFtZSAhLFxuICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwb3J0UmVmLmFsaWFzLnZhbHVlLm5hbWUgISxcbiAgICAgICAgICAgIGFzQWxpYXM6IGV4cG9ydE5hbWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZi5jbG9uZVdpdGhOb0lkZW50aWZpZXJzKCksIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHx8IGV4cHIudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBleHByLnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgRXh0ZXJuYWxFeHByJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZXhwb3J0cyAhLnB1c2goe1xuICAgICAgICAgICAgZnJvbU1vZHVsZTogZXhwci52YWx1ZS5tb2R1bGVOYW1lLFxuICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwci52YWx1ZS5uYW1lLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZWV4cG9ydE1hcC5zZXQoZXhwb3J0TmFtZSwgZXhwb3J0UmVmKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEFub3RoZXIgcmUtZXhwb3J0IGFscmVhZHkgdXNlZCB0aGlzIG5hbWUuIFByb2R1Y2UgYSBkaWFnbm9zdGljLlxuICAgICAgICBjb25zdCBwcmV2UmVmID0gcmVleHBvcnRNYXAuZ2V0KGV4cG9ydE5hbWUpICE7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gocmVleHBvcnRDb2xsaXNpb24obmdNb2R1bGVSZWYubm9kZSwgcHJldlJlZiwgZXhwb3J0UmVmKSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IHtyZWZ9IG9mIGV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgfVxuICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGFzc2VydENvbGxlY3RpbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2VhbGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbjogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGlzIG5vdCBDT0xMRUNUSU5HYCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gaW52YWxpZCBpbXBvcnQgb3IgZXhwb3J0IGZyb20gYW4gTmdNb2R1bGUuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgY29uc3QgcmVzb2x2ZVRhcmdldCA9IHR5cGUgPT09ICdpbXBvcnQnID8gJ05nTW9kdWxlJyA6ICdOZ01vZHVsZSwgQ29tcG9uZW50LCBEaXJlY3RpdmUsIG9yIFBpcGUnO1xuICBsZXQgbWVzc2FnZSA9IGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke1xuICAgICAgICAgIG5vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiAke3Jlc29sdmVUYXJnZXR9IGNsYXNzLmAgK1xuICAgICAgJ1xcblxcbic7XG4gIGNvbnN0IGxpYnJhcnkgPSBkZWNsLm93bmVkQnlNb2R1bGVHdWVzcyAhPT0gbnVsbCA/IGAgKCR7ZGVjbC5vd25lZEJ5TW9kdWxlR3Vlc3N9KWAgOiAnJztcbiAgY29uc3Qgc2YgPSBkZWNsLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gIC8vIFByb3ZpZGUgZXh0cmEgY29udGV4dCB0byB0aGUgZXJyb3IgZm9yIHRoZSB1c2VyLlxuICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgLy8gVGhpcyBpcyBhIGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtLlxuICAgIGNvbnN0IGFubm90YXRpb25UeXBlID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnQE5nTW9kdWxlJyA6ICdBbmd1bGFyJztcbiAgICBtZXNzYWdlICs9IGBJcyBpdCBtaXNzaW5nIGFuICR7YW5ub3RhdGlvblR5cGV9IGFubm90YXRpb24/YDtcbiAgfSBlbHNlIGlmIChzZi5maWxlTmFtZS5pbmRleE9mKCdub2RlX21vZHVsZXMnKSAhPT0gLTEpIHtcbiAgICAvLyBUaGlzIGZpbGUgY29tZXMgZnJvbSBhIHRoaXJkLXBhcnR5IGxpYnJhcnkgaW4gbm9kZV9tb2R1bGVzLlxuICAgIG1lc3NhZ2UgKz1cbiAgICAgICAgYFRoaXMgbGlrZWx5IG1lYW5zIHRoYXQgdGhlIGxpYnJhcnkke2xpYnJhcnl9IHdoaWNoIGRlY2xhcmVzICR7ZGVjbC5kZWJ1Z05hbWV9IGhhcyBub3QgYCArXG4gICAgICAgICdiZWVuIHByb2Nlc3NlZCBjb3JyZWN0bHkgYnkgbmdjYywgb3IgaXMgbm90IGNvbXBhdGlibGUgd2l0aCBBbmd1bGFyIEl2eS4gQ2hlY2sgaWYgYSAnICtcbiAgICAgICAgJ25ld2VyIHZlcnNpb24gb2YgdGhlIGxpYnJhcnkgaXMgYXZhaWxhYmxlLCBhbmQgdXBkYXRlIGlmIHNvLiBBbHNvIGNvbnNpZGVyIGNoZWNraW5nICcgK1xuICAgICAgICAnd2l0aCB0aGUgbGlicmFyeVxcJ3MgYXV0aG9ycyB0byBzZWUgaWYgdGhlIGxpYnJhcnkgaXMgZXhwZWN0ZWQgdG8gYmUgY29tcGF0aWJsZSB3aXRoIEl2eS4nO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaXMgYSBtb25vcmVwbyBzdHlsZSBsb2NhbCBkZXBlbmRlbmN5LiBVbmZvcnR1bmF0ZWx5IHRoZXNlIGFyZSB0b28gZGlmZmVyZW50IHRvIHJlYWxseVxuICAgIC8vIG9mZmVyIG11Y2ggbW9yZcKgYWR2aWNlIHRoYW4gdGhpcy5cbiAgICBtZXNzYWdlICs9IGBUaGlzIGxpa2VseSBtZWFucyB0aGF0IHRoZSBkZXBlbmRlbmN5JHtsaWJyYXJ5fSB3aGljaCBkZWNsYXJlcyAke1xuICAgICAgICBkZWNsLmRlYnVnTmFtZX0gaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBjb3JyZWN0bHkgYnkgbmdjYy5gO1xuICB9XG5cbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsIG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGltcG9ydCBvciBleHBvcnQgd2hpY2ggaXRzZWxmIGhhcyBlcnJvcnMuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoXG4gICAgY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+LFxuICAgIHR5cGU6ICdpbXBvcnQnIHwgJ2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGl0c2VsZiBoYXMgZXJyb3JzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gZXhwb3J0ZWQgZGlyZWN0aXZlIG9yIHBpcGUgd2hpY2ggd2FzIG5vdCBkZWNsYXJlZCBvciBpbXBvcnRlZFxuICogYnkgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVleHBvcnQoY2xheno6IHRzLkRlY2xhcmF0aW9uLCBkZWNsOiBSZWZlcmVuY2U8dHMuRGVjbGFyYXRpb24+KTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX1JFRVhQT1JULCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYFByZXNlbnQgaW4gdGhlIE5nTW9kdWxlLmV4cG9ydHMgb2YgJHtcbiAgICAgICAgICBub2RlTmFtZUZvckVycm9yKGNsYXp6KX0gYnV0IG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYSBjb2xsaXNpb24gaW4gcmUtZXhwb3J0IG5hbWVzIGJldHdlZW4gdHdvIGRpcmVjdGl2ZXMvcGlwZXMuXG4gKi9cbmZ1bmN0aW9uIHJlZXhwb3J0Q29sbGlzaW9uKFxuICAgIG1vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmQTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgIHJlZkI6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjaGlsZE1lc3NhZ2VUZXh0ID0gYFRoaXMgZGlyZWN0aXZlL3BpcGUgaXMgcGFydCBvZiB0aGUgZXhwb3J0cyBvZiAnJHtcbiAgICAgIG1vZHVsZS5uYW1lLnRleHR9JyBhbmQgc2hhcmVzIHRoZSBzYW1lIG5hbWUgYXMgYW5vdGhlciBleHBvcnRlZCBkaXJlY3RpdmUvcGlwZS5gO1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBFcnJvckNvZGUuTkdNT0RVTEVfUkVFWFBPUlRfTkFNRV9DT0xMSVNJT04sIG1vZHVsZS5uYW1lLCBgXG4gICAgVGhlcmUgd2FzIGEgbmFtZSBjb2xsaXNpb24gYmV0d2VlbiB0d28gY2xhc3NlcyBuYW1lZCAnJHtcbiAgICAgICAgICByZWZBLm5vZGUubmFtZS50ZXh0fScsIHdoaWNoIGFyZSBib3RoIHBhcnQgb2YgdGhlIGV4cG9ydHMgb2YgJyR7bW9kdWxlLm5hbWUudGV4dH0nLlxuXG4gICAgQW5ndWxhciBnZW5lcmF0ZXMgcmUtZXhwb3J0cyBvZiBhbiBOZ01vZHVsZSdzIGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGUgbW9kdWxlJ3Mgc291cmNlIGZpbGUgaW4gY2VydGFpbiBjYXNlcywgdXNpbmcgdGhlIGRlY2xhcmVkIG5hbWUgb2YgdGhlIGNsYXNzLiBJZiB0d28gY2xhc3NlcyBvZiB0aGUgc2FtZSBuYW1lIGFyZSBleHBvcnRlZCwgdGhpcyBhdXRvbWF0aWMgbmFtaW5nIGRvZXMgbm90IHdvcmsuXG5cbiAgICBUbyBmaXggdGhpcyBwcm9ibGVtIHBsZWFzZSByZS1leHBvcnQgb25lIG9yIGJvdGggY2xhc3NlcyBkaXJlY3RseSBmcm9tIHRoaXMgZmlsZS5cbiAgYC50cmltKCksXG4gICAgICBbXG4gICAgICAgIHtub2RlOiByZWZBLm5vZGUubmFtZSwgbWVzc2FnZVRleHQ6IGNoaWxkTWVzc2FnZVRleHR9LFxuICAgICAgICB7bm9kZTogcmVmQi5ub2RlLm5hbWUsIG1lc3NhZ2VUZXh0OiBjaGlsZE1lc3NhZ2VUZXh0fSxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlY2xhcmF0aW9uRGF0YSB7XG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xuICByZWY6IFJlZmVyZW5jZTtcbiAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGw7XG59XG4iXX0=