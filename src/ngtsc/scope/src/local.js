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
        define("@angular/compiler-cli/src/ngtsc/scope/src/local", ["require", "exports", "tslib", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/diagnostics", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LocalModuleScopeRegistry = void 0;
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
             * Tracks the `RemoteScope` for components requiring "remote scoping".
             *
             * Remote scoping is when the set of directives which apply to a given component is set in the
             * NgModule's file instead of directly on the component def (which is sometimes needed to get
             * around cyclic import issues). This is not used in calculation of `LocalModuleScope`s, but is
             * tracked here for convenience.
             */
            this.remoteScoping = new Map();
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
                ref: decl,
                rawDeclarations: rawDeclarations,
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
            var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e, e_7, _f, e_8, _g, e_9, _h, e_10, _j;
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
            // Modules which contributed to the compilation scope of this module.
            var compilationModules = new Set([ngModule.ref.node]);
            // Modules which contributed to the export scope of this module.
            var exportedModules = new Set([ngModule.ref.node]);
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
                        for (var _m = (e_3 = void 0, tslib_1.__values(importScope.exported.directives)), _o = _m.next(); !_o.done; _o = _m.next()) {
                            var directive = _o.value;
                            compilationDirectives.set(directive.ref.node, directive);
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
                        for (var _p = (e_4 = void 0, tslib_1.__values(importScope.exported.pipes)), _q = _p.next(); !_q.done; _q = _p.next()) {
                            var pipe = _q.value;
                            compilationPipes.set(pipe.ref.node, pipe);
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
                        for (var _r = (e_5 = void 0, tslib_1.__values(importScope.exported.ngModules)), _s = _r.next(); !_s.done; _s = _r.next()) {
                            var importedModule = _s.value;
                            compilationModules.add(importedModule);
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
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_l && !_l.done && (_a = _k.return)) _a.call(_k);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // 2) add declarations.
                for (var _t = tslib_1.__values(ngModule.declarations), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var decl = _u.value;
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
                            "Either remove it from the NgModule's declarations, or add an appropriate Angular decorator.", [diagnostics_1.makeRelatedInformation(decl.node.name, "'" + decl.node.name.text + "' is declared here.")]));
                        continue;
                    }
                    declared.add(decl.node);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_u && !_u.done && (_e = _t.return)) _e.call(_t);
                }
                finally { if (e_6) throw e_6.error; }
            }
            try {
                // 3) process exports.
                // Exports can contain modules, components, or directives. They're processed differently.
                // Modules are straightforward. Directives and pipes from exported modules are added to the
                // export maps. Directives/pipes are different - they might be exports of declared types or
                // imported types.
                for (var _v = tslib_1.__values(ngModule.exports), _w = _v.next(); !_w.done; _w = _v.next()) {
                    var decl = _w.value;
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
                            for (var _x = (e_8 = void 0, tslib_1.__values(importScope.exported.directives)), _y = _x.next(); !_y.done; _y = _x.next()) {
                                var directive = _y.value;
                                exportDirectives.set(directive.ref.node, directive);
                            }
                        }
                        catch (e_8_1) { e_8 = { error: e_8_1 }; }
                        finally {
                            try {
                                if (_y && !_y.done && (_g = _x.return)) _g.call(_x);
                            }
                            finally { if (e_8) throw e_8.error; }
                        }
                        try {
                            for (var _z = (e_9 = void 0, tslib_1.__values(importScope.exported.pipes)), _0 = _z.next(); !_0.done; _0 = _z.next()) {
                                var pipe = _0.value;
                                exportPipes.set(pipe.ref.node, pipe);
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
                            for (var _1 = (e_10 = void 0, tslib_1.__values(importScope.exported.ngModules)), _2 = _1.next(); !_2.done; _2 = _1.next()) {
                                var exportedModule = _2.value;
                                exportedModules.add(exportedModule);
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
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (_w && !_w.done && (_f = _v.return)) _f.call(_v);
                }
                finally { if (e_7) throw e_7.error; }
            }
            var exported = {
                directives: Array.from(exportDirectives.values()),
                pipes: Array.from(exportPipes.values()),
                ngModules: Array.from(exportedModules),
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
                ngModule: ngModule.ref.node,
                compilation: {
                    directives: Array.from(compilationDirectives.values()),
                    pipes: Array.from(compilationPipes.values()),
                    ngModules: Array.from(compilationModules),
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
        LocalModuleScopeRegistry.prototype.getRemoteScope = function (node) {
            return this.remoteScoping.has(node) ? this.remoteScoping.get(node) : null;
        };
        /**
         * Set a component as requiring remote scoping, with the given directives and pipes to be
         * registered remotely.
         */
        LocalModuleScopeRegistry.prototype.setComponentRemoteScope = function (node, directives, pipes) {
            this.remoteScoping.set(node, { directives: directives, pipes: pipes });
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
            var e_11, _a, e_12, _b;
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
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_11) throw e_11.error; }
            }
            try {
                for (var _e = tslib_1.__values(exported.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var ref_2 = _f.value.ref;
                    addReexport(ref_2);
                }
            }
            catch (e_12_1) { e_12 = { error: e_12_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_12) throw e_12.error; }
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
            diagnostics_1.makeRelatedInformation(refA.node.name, childMessageText),
            diagnostics_1.makeRelatedInformation(refB.node.name, childMessageText),
        ]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStEO0lBQy9ELCtCQUFpQztJQUVqQywyRUFBb0Y7SUFJcEYsa0ZBQTZFO0lBNkI3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUEwREUsa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxZQUErQjtZQURyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1lBQ2xGLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQW1CO1lBM0RqRjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztZQUUzRTs7O2VBR0c7WUFDSywwQkFBcUIsR0FDekIsSUFBSSxHQUFHLEVBQTRELENBQUM7WUFFaEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBaUQsQ0FBQztZQUUvRTs7Ozs7ZUFLRztZQUNLLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBcUQsQ0FBQztZQUU3RTs7Ozs7OztlQU9HO1lBQ0ssa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztZQUVqRTs7ZUFFRztZQUNLLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUM7WUFFbkU7Ozs7OztlQU1HO1lBQ0ssbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQztRQUkrQixDQUFDO1FBRXJGOztXQUVHO1FBQ0gsMkRBQXdCLEdBQXhCLFVBQXlCLElBQWtCOztZQUN6QyxJQUFJLENB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Qix1QkFBUyxDQUFDLGdDQUFnQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQ3ZELENBQUEsaUVBRUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxrREFBNkMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLDRWQUt2RixDQUFBLENBQUMsSUFBSSxFQUFFLEVBQ0o7WUFDRSxvQ0FBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztZQUN4RCxvQ0FBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztTQUN6RCxDQUFDLENBQUM7SUFDVCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXh0ZXJuYWxFeHByLCBTY2hlbWFNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtBbGlhc2luZ0hvc3QsIFJlZXhwb3J0LCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbk5vZGV9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpZGVudGlmaWVyT2ZOb2RlLCBub2RlTmFtZUZvckVycm9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFeHBvcnRTY29wZSwgUmVtb3RlU2NvcGUsIFNjb3BlRGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi9jb21wb25lbnRfc2NvcGUnO1xuaW1wb3J0IHtEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY3knO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTmdNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTW9kdWxlU2NvcGUgZXh0ZW5kcyBFeHBvcnRTY29wZSB7XG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBjb21waWxhdGlvbjogU2NvcGVEYXRhO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbDtcbiAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXTtcbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSByZWdpc3RlcmVkIGRlY2xhcmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGF0aW9uU2NvcGUgZXh0ZW5kcyBTY29wZURhdGEge1xuICAvKiogVGhlIGRlY2xhcmF0aW9uIHdob3NlIGNvbXBpbGF0aW9uIHNjb3BlIGlzIGRlc2NyaWJlZCBoZXJlLiAqL1xuICBkZWNsYXJhdGlvbjogQ2xhc3NEZWNsYXJhdGlvbjtcbiAgLyoqIFRoZSBkZWNsYXJhdGlvbiBvZiB0aGUgTmdNb2R1bGUgdGhhdCBkZWNsYXJlcyB0aGlzIGBkZWNsYXJhdGlvbmAuICovXG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xufVxuXG4vKipcbiAqIEEgcmVnaXN0cnkgd2hpY2ggY29sbGVjdHMgaW5mb3JtYXRpb24gYWJvdXQgTmdNb2R1bGVzLCBEaXJlY3RpdmVzLCBDb21wb25lbnRzLCBhbmQgUGlwZXMgd2hpY2hcbiAqIGFyZSBsb2NhbCAoZGVjbGFyZWQgaW4gdGhlIHRzLlByb2dyYW0gYmVpbmcgY29tcGlsZWQpLCBhbmQgY2FuIHByb2R1Y2UgYExvY2FsTW9kdWxlU2NvcGVgc1xuICogd2hpY2ggc3VtbWFyaXplIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiBhIGNvbXBvbmVudC5cbiAqXG4gKiBUaGlzIGNsYXNzIGltcGxlbWVudHMgdGhlIGxvZ2ljIG9mIE5nTW9kdWxlIGRlY2xhcmF0aW9ucywgaW1wb3J0cywgYW5kIGV4cG9ydHMgYW5kIGNhbiBwcm9kdWNlLFxuICogZm9yIGEgZ2l2ZW4gY29tcG9uZW50LCB0aGUgc2V0IG9mIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBcInZpc2libGVcIiBpbiB0aGF0IGNvbXBvbmVudCdzXG4gKiB0ZW1wbGF0ZS5cbiAqXG4gKiBUaGUgYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWAgaGFzIHR3byBcIm1vZGVzXCIgb2Ygb3BlcmF0aW9uLiBEdXJpbmcgYW5hbHlzaXMsIGRhdGEgZm9yIGVhY2hcbiAqIGluZGl2aWR1YWwgTmdNb2R1bGUsIERpcmVjdGl2ZSwgQ29tcG9uZW50LCBhbmQgUGlwZSBpcyBhZGRlZCB0byB0aGUgcmVnaXN0cnkuIE5vIGF0dGVtcHQgaXMgbWFkZVxuICogdG8gdHJhdmVyc2Ugb3IgdmFsaWRhdGUgdGhlIE5nTW9kdWxlIGdyYXBoIChpbXBvcnRzLCBleHBvcnRzLCBldGMpLiBBZnRlciBhbmFseXNpcywgb25lIG9mXG4gKiBgZ2V0U2NvcGVPZk1vZHVsZWAgb3IgYGdldFNjb3BlRm9yQ29tcG9uZW50YCBjYW4gYmUgY2FsbGVkLCB3aGljaCB0cmF2ZXJzZXMgdGhlIE5nTW9kdWxlIGdyYXBoXG4gKiBhbmQgYXBwbGllcyB0aGUgTmdNb2R1bGUgbG9naWMgdG8gZ2VuZXJhdGUgYSBgTG9jYWxNb2R1bGVTY29wZWAsIHRoZSBmdWxsIHNjb3BlIGZvciB0aGUgZ2l2ZW5cbiAqIG1vZHVsZSBvciBjb21wb25lbnQuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGlzIGFsc28gY2FwYWJsZSBvZiBwcm9kdWNpbmcgYHRzLkRpYWdub3N0aWNgIGVycm9ycyB3aGVuIEFuZ3VsYXJcbiAqIHNlbWFudGljcyBhcmUgdmlvbGF0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaW1wbGVtZW50cyBNZXRhZGF0YVJlZ2lzdHJ5LCBDb21wb25lbnRTY29wZVJlYWRlciB7XG4gIC8qKlxuICAgKiBUcmFja3Mgd2hldGhlciB0aGUgcmVnaXN0cnkgaGFzIGJlZW4gYXNrZWQgdG8gcHJvZHVjZSBzY29wZXMgZm9yIGEgbW9kdWxlIG9yIGNvbXBvbmVudC4gT25jZVxuICAgKiB0aGlzIGlzIHRydWUsIHRoZSByZWdpc3RyeSBjYW5ub3QgYWNjZXB0IHJlZ2lzdHJhdGlvbnMgb2YgbmV3IGRpcmVjdGl2ZXMvcGlwZXMvbW9kdWxlcyBhcyBpdFxuICAgKiB3b3VsZCBpbnZhbGlkYXRlIHRoZSBjYWNoZWQgc2NvcGUgZGF0YS5cbiAgICovXG4gIHByaXZhdGUgc2VhbGVkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEEgbWFwIG9mIGNvbXBvbmVudHMgZnJvbSB0aGUgY3VycmVudCBjb21waWxhdGlvbiB1bml0IHRvIHRoZSBOZ01vZHVsZSB3aGljaCBkZWNsYXJlZCB0aGVtLlxuICAgKlxuICAgKiBBcyBjb21wb25lbnRzIGFuZCBkaXJlY3RpdmVzIGFyZSBub3QgZGlzdGluZ3Vpc2hlZCBhdCB0aGUgTmdNb2R1bGUgbGV2ZWwsIHRoaXMgbWFwIG1heSBhbHNvXG4gICAqIGNvbnRhaW4gZGlyZWN0aXZlcy4gVGhpcyBkb2Vzbid0IGNhdXNlIGFueSBwcm9ibGVtcyBidXQgaXNuJ3QgdXNlZnVsIGFzIHRoZXJlIGlzIG5vIGNvbmNlcHQgb2ZcbiAgICogYSBkaXJlY3RpdmUncyBjb21waWxhdGlvbiBzY29wZS5cbiAgICovXG4gIHByaXZhdGUgZGVjbGFyYXRpb25Ub01vZHVsZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25EYXRhPigpO1xuXG4gIC8qKlxuICAgKiBUaGlzIG1hcHMgZnJvbSB0aGUgZGlyZWN0aXZlL3BpcGUgY2xhc3MgdG8gYSBtYXAgb2YgZGF0YSBmb3IgZWFjaCBOZ01vZHVsZSB0aGF0IGRlY2xhcmVzIHRoZVxuICAgKiBkaXJlY3RpdmUvcGlwZS4gVGhpcyBkYXRhIGlzIG5lZWRlZCB0byBwcm9kdWNlIGFuIGVycm9yIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAqL1xuICBwcml2YXRlIGR1cGxpY2F0ZURlY2xhcmF0aW9ucyA9XG4gICAgICBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkRhdGE+PigpO1xuXG4gIHByaXZhdGUgbW9kdWxlVG9SZWYgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcblxuICAvKipcbiAgICogQSBjYWNoZSBvZiBjYWxjdWxhdGVkIGBMb2NhbE1vZHVsZVNjb3BlYHMgZm9yIGVhY2ggTmdNb2R1bGUgZGVjbGFyZWQgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS5cbiAgICpcbiAgICogQSB2YWx1ZSBvZiBgdW5kZWZpbmVkYCBpbmRpY2F0ZXMgdGhlIHNjb3BlIHdhcyBpbnZhbGlkIGFuZCBwcm9kdWNlZCBlcnJvcnMgKHRoZXJlZm9yZSxcbiAgICogZGlhZ25vc3RpY3Mgc2hvdWxkIGV4aXN0IGluIHRoZSBgc2NvcGVFcnJvcnNgIG1hcCkuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE1vZHVsZVNjb3BlfHVuZGVmaW5lZHxudWxsPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgdGhlIGBSZW1vdGVTY29wZWAgZm9yIGNvbXBvbmVudHMgcmVxdWlyaW5nIFwicmVtb3RlIHNjb3BpbmdcIi5cbiAgICpcbiAgICogUmVtb3RlIHNjb3BpbmcgaXMgd2hlbiB0aGUgc2V0IG9mIGRpcmVjdGl2ZXMgd2hpY2ggYXBwbHkgdG8gYSBnaXZlbiBjb21wb25lbnQgaXMgc2V0IGluIHRoZVxuICAgKiBOZ01vZHVsZSdzIGZpbGUgaW5zdGVhZCBvZiBkaXJlY3RseSBvbiB0aGUgY29tcG9uZW50IGRlZiAod2hpY2ggaXMgc29tZXRpbWVzIG5lZWRlZCB0byBnZXRcbiAgICogYXJvdW5kIGN5Y2xpYyBpbXBvcnQgaXNzdWVzKS4gVGhpcyBpcyBub3QgdXNlZCBpbiBjYWxjdWxhdGlvbiBvZiBgTG9jYWxNb2R1bGVTY29wZWBzLCBidXQgaXNcbiAgICogdHJhY2tlZCBoZXJlIGZvciBjb252ZW5pZW5jZS5cbiAgICovXG4gIHByaXZhdGUgcmVtb3RlU2NvcGluZyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUmVtb3RlU2NvcGU+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyBlcnJvcnMgYWNjdW11bGF0ZWQgaW4gdGhlIHByb2Nlc3Npbmcgb2Ygc2NvcGVzIGZvciBlYWNoIG1vZHVsZSBkZWNsYXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgc2NvcGVFcnJvcnMgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIHRzLkRpYWdub3N0aWNbXT4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHdoaWNoIE5nTW9kdWxlcyBhcmUgdW5yZWxpYWJsZSBkdWUgdG8gZXJyb3JzIHdpdGhpbiB0aGVpciBkZWNsYXJhdGlvbnMuXG4gICAqXG4gICAqIFRoaXMgcHJvdmlkZXMgYSB1bmlmaWVkIHZpZXcgb2Ygd2hpY2ggbW9kdWxlcyBoYXZlIGVycm9ycywgYWNyb3NzIGFsbCBvZiB0aGUgZGlmZmVyZW50XG4gICAqIGRpYWdub3N0aWMgY2F0ZWdvcmllcyB0aGF0IGNhbiBiZSBwcm9kdWNlZC4gVGhlb3JldGljYWxseSB0aGlzIGNhbiBiZSBpbmZlcnJlZCBmcm9tIHRoZSBvdGhlclxuICAgKiBwcm9wZXJ0aWVzIG9mIHRoaXMgY2xhc3MsIGJ1dCBpcyB0cmFja2VkIGV4cGxpY2l0bHkgdG8gc2ltcGxpZnkgdGhlIGxvZ2ljLlxuICAgKi9cbiAgcHJpdmF0ZSB0YWludGVkTW9kdWxlcyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgbG9jYWxSZWFkZXI6IE1ldGFkYXRhUmVhZGVyLCBwcml2YXRlIGRlcGVuZGVuY3lTY29wZVJlYWRlcjogRHRzTW9kdWxlU2NvcGVSZXNvbHZlcixcbiAgICAgIHByaXZhdGUgcmVmRW1pdHRlcjogUmVmZXJlbmNlRW1pdHRlciwgcHJpdmF0ZSBhbGlhc2luZ0hvc3Q6IEFsaWFzaW5nSG9zdHxudWxsKSB7fVxuXG4gIC8qKlxuICAgKiBBZGQgYW4gTmdNb2R1bGUncyBkYXRhIHRvIHRoZSByZWdpc3RyeS5cbiAgICovXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShkYXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLmFzc2VydENvbGxlY3RpbmcoKTtcbiAgICBjb25zdCBuZ01vZHVsZSA9IGRhdGEucmVmLm5vZGU7XG4gICAgdGhpcy5tb2R1bGVUb1JlZi5zZXQoZGF0YS5yZWYubm9kZSwgZGF0YS5yZWYpO1xuICAgIC8vIEl0ZXJhdGUgb3ZlciB0aGUgbW9kdWxlJ3MgZGVjbGFyYXRpb25zLCBhbmQgYWRkIHRoZW0gdG8gZGVjbGFyYXRpb25Ub01vZHVsZS4gSWYgZHVwbGljYXRlc1xuICAgIC8vIGFyZSBmb3VuZCwgdGhleSdyZSBpbnN0ZWFkIHRyYWNrZWQgaW4gZHVwbGljYXRlRGVjbGFyYXRpb25zLlxuICAgIGZvciAoY29uc3QgZGVjbCBvZiBkYXRhLmRlY2xhcmF0aW9ucykge1xuICAgICAgdGhpcy5yZWdpc3RlckRlY2xhcmF0aW9uT2ZNb2R1bGUobmdNb2R1bGUsIGRlY2wsIGRhdGEucmF3RGVjbGFyYXRpb25zKTtcbiAgICB9XG4gIH1cblxuICByZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKGRpcmVjdGl2ZTogRGlyZWN0aXZlTWV0YSk6IHZvaWQge31cblxuICByZWdpc3RlclBpcGVNZXRhZGF0YShwaXBlOiBQaXBlTWV0YSk6IHZvaWQge31cblxuICBnZXRTY29wZUZvckNvbXBvbmVudChjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbHwnZXJyb3InIHtcbiAgICBjb25zdCBzY29wZSA9ICF0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuaGFzKGNsYXp6KSA/XG4gICAgICAgIG51bGwgOlxuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUodGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChjbGF6eikhLm5nTW9kdWxlKTtcbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogSWYgYG5vZGVgIGlzIGRlY2xhcmVkIGluIG1vcmUgdGhhbiBvbmUgTmdNb2R1bGUgKGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiksIHRoZW4gZ2V0IHRoZVxuICAgKiBgRGVjbGFyYXRpb25EYXRhYCBmb3IgZWFjaCBvZmZlbmRpbmcgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIE9yZGluYXJpbHkgYSBjbGFzcyBpcyBvbmx5IGRlY2xhcmVkIGluIG9uZSBOZ01vZHVsZSwgaW4gd2hpY2ggY2FzZSB0aGlzIGZ1bmN0aW9uIHJldHVybnNcbiAgICogYG51bGxgLlxuICAgKi9cbiAgZ2V0RHVwbGljYXRlRGVjbGFyYXRpb25zKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBEZWNsYXJhdGlvbkRhdGFbXXxudWxsIHtcbiAgICBpZiAoIXRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuZ2V0KG5vZGUpIS52YWx1ZXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBgbnVsbGAgaWYgbm8gc2NvcGUgd2FzIGV2ZXJcbiAgICogZGVmaW5lZCwgb3IgdGhlIHN0cmluZyBgJ2Vycm9yJ2AgaWYgdGhlIHNjb3BlIGNvbnRhaW5lZCBlcnJvcnMuXG4gICAqL1xuICBnZXRTY29wZU9mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXwnZXJyb3InfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gdGhpcy5tb2R1bGVUb1JlZi5oYXMoY2xhenopID9cbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHRoaXMubW9kdWxlVG9SZWYuZ2V0KGNsYXp6KSEpIDpcbiAgICAgICAgbnVsbDtcbiAgICAvLyBJZiB0aGUgTmdNb2R1bGUgY2xhc3MgaXMgbWFya2VkIGFzIHRhaW50ZWQsIGNvbnNpZGVyIGl0IGFuIGVycm9yLlxuICAgIGlmICh0aGlzLnRhaW50ZWRNb2R1bGVzLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiAnZXJyb3InO1xuICAgIH1cblxuICAgIC8vIFRyYW5zbGF0ZSB1bmRlZmluZWQgLT4gJ2Vycm9yJy5cbiAgICByZXR1cm4gc2NvcGUgIT09IHVuZGVmaW5lZCA/IHNjb3BlIDogJ2Vycm9yJztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYW55IGB0cy5EaWFnbm9zdGljYHMgcHJvZHVjZWQgZHVyaW5nIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGZvclxuICAgKiB0aGUgZ2l2ZW4gTmdNb2R1bGUsIG9yIGBudWxsYCBpZiBubyBlcnJvcnMgd2VyZSBwcmVzZW50LlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXXxudWxsIHtcbiAgICAvLyBSZXF1aXJlZCB0byBlbnN1cmUgdGhlIGVycm9ycyBhcmUgcG9wdWxhdGVkIGZvciB0aGUgZ2l2ZW4gY2xhc3MuIElmIGl0IGhhcyBiZWVuIHByb2Nlc3NlZFxuICAgIC8vIGJlZm9yZSwgdGhpcyB3aWxsIGJlIGEgbm8tb3AgZHVlIHRvIHRoZSBzY29wZSBjYWNoZS5cbiAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUoY2xhenopO1xuXG4gICAgaWYgKHRoaXMuc2NvcGVFcnJvcnMuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVFcnJvcnMuZ2V0KGNsYXp6KSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgY29sbGVjdGlvbiBvZiB0aGUgY29tcGlsYXRpb24gc2NvcGUgZm9yIGVhY2ggcmVnaXN0ZXJlZCBkZWNsYXJhdGlvbi5cbiAgICovXG4gIGdldENvbXBpbGF0aW9uU2NvcGVzKCk6IENvbXBpbGF0aW9uU2NvcGVbXSB7XG4gICAgY29uc3Qgc2NvcGVzOiBDb21waWxhdGlvblNjb3BlW10gPSBbXTtcbiAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZm9yRWFjaCgoZGVjbERhdGEsIGRlY2xhcmF0aW9uKSA9PiB7XG4gICAgICBjb25zdCBzY29wZSA9IHRoaXMuZ2V0U2NvcGVPZk1vZHVsZShkZWNsRGF0YS5uZ01vZHVsZSk7XG4gICAgICBpZiAoc2NvcGUgIT09IG51bGwgJiYgc2NvcGUgIT09ICdlcnJvcicpIHtcbiAgICAgICAgc2NvcGVzLnB1c2goe2RlY2xhcmF0aW9uLCBuZ01vZHVsZTogZGVjbERhdGEubmdNb2R1bGUsIC4uLnNjb3BlLmNvbXBpbGF0aW9ufSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHNjb3BlcztcbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJEZWNsYXJhdGlvbk9mTW9kdWxlKFxuICAgICAgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPixcbiAgICAgIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsKTogdm9pZCB7XG4gICAgY29uc3QgZGVjbERhdGE6IERlY2xhcmF0aW9uRGF0YSA9IHtcbiAgICAgIG5nTW9kdWxlLFxuICAgICAgcmVmOiBkZWNsLFxuICAgICAgcmF3RGVjbGFyYXRpb25zLFxuICAgIH07XG5cbiAgICAvLyBGaXJzdCwgY2hlY2sgZm9yIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbnMgb2YgdGhlIHNhbWUgZGlyZWN0aXZlL3BpcGUuXG4gICAgaWYgKHRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAvLyBUaGlzIGRpcmVjdGl2ZS9waXBlIGhhcyBhbHJlYWR5IGJlZW4gaWRlbnRpZmllZCBhcyBiZWluZyBkdXBsaWNhdGVkLiBBZGQgdGhpcyBtb2R1bGUgdG8gdGhlXG4gICAgICAvLyBtYXAgb2YgbW9kdWxlcyBmb3Igd2hpY2ggYSBkdXBsaWNhdGUgZGVjbGFyYXRpb24gZXhpc3RzLlxuICAgICAgdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuZ2V0KGRlY2wubm9kZSkhLnNldChuZ01vZHVsZSwgZGVjbERhdGEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5oYXMoZGVjbC5ub2RlKSAmJlxuICAgICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGRlY2wubm9kZSkhLm5nTW9kdWxlICE9PSBuZ01vZHVsZSkge1xuICAgICAgLy8gVGhpcyBkaXJlY3RpdmUvcGlwZSBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgYXMgZGVjbGFyZWQgaW4gYW5vdGhlciBtb2R1bGUuIE1hcmsgaXQgYXMgYVxuICAgICAgLy8gZHVwbGljYXRlIGluc3RlYWQuXG4gICAgICBjb25zdCBkdXBsaWNhdGVEZWNsTWFwID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkRhdGE+KCk7XG4gICAgICBjb25zdCBmaXJzdERlY2xEYXRhID0gdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChkZWNsLm5vZGUpITtcblxuICAgICAgLy8gTWFyayBib3RoIG1vZHVsZXMgYXMgdGFpbnRlZCwgc2luY2UgdGhlaXIgZGVjbGFyYXRpb25zIGFyZSBtaXNzaW5nIGEgY29tcG9uZW50LlxuICAgICAgdGhpcy50YWludGVkTW9kdWxlcy5hZGQoZmlyc3REZWNsRGF0YS5uZ01vZHVsZSk7XG4gICAgICB0aGlzLnRhaW50ZWRNb2R1bGVzLmFkZChuZ01vZHVsZSk7XG5cbiAgICAgIC8vIEJlaW5nIGRldGVjdGVkIGFzIGEgZHVwbGljYXRlIG1lYW5zIHRoZXJlIGFyZSB0d28gTmdNb2R1bGVzIChmb3Igbm93KSB3aGljaCBkZWNsYXJlIHRoaXNcbiAgICAgIC8vIGRpcmVjdGl2ZS9waXBlLiBBZGQgYm90aCBvZiB0aGVtIHRvIHRoZSBkdXBsaWNhdGUgdHJhY2tpbmcgbWFwLlxuICAgICAgZHVwbGljYXRlRGVjbE1hcC5zZXQoZmlyc3REZWNsRGF0YS5uZ01vZHVsZSwgZmlyc3REZWNsRGF0YSk7XG4gICAgICBkdXBsaWNhdGVEZWNsTWFwLnNldChuZ01vZHVsZSwgZGVjbERhdGEpO1xuICAgICAgdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuc2V0KGRlY2wubm9kZSwgZHVwbGljYXRlRGVjbE1hcCk7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgZGlyZWN0aXZlL3BpcGUgZnJvbSBgZGVjbGFyYXRpb25Ub01vZHVsZWAgYXMgaXQncyBhIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiwgYW5kXG4gICAgICAvLyB0aGVyZWZvcmUgbm90IHZhbGlkLlxuICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmRlbGV0ZShkZWNsLm5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCBkZWNsYXJhdGlvbiBvZiB0aGlzIGRpcmVjdGl2ZS9waXBlLCBzbyBtYXAgaXQuXG4gICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuc2V0KGRlY2wubm9kZSwgZGVjbERhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBgZ2V0U2NvcGVPZk1vZHVsZWAgd2hpY2ggYWNjZXB0cyBhIHJlZmVyZW5jZSB0byBhIGNsYXNzIGFuZCBkaWZmZXJlbnRpYXRlc1xuICAgKiBiZXR3ZWVuOlxuICAgKlxuICAgKiAqIG5vIHNjb3BlIGJlaW5nIGF2YWlsYWJsZSAocmV0dXJucyBgbnVsbGApXG4gICAqICogYSBzY29wZSBiZWluZyBwcm9kdWNlZCB3aXRoIGVycm9ycyAocmV0dXJucyBgdW5kZWZpbmVkYCkuXG4gICAqL1xuICBwcml2YXRlIGdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGxcbiAgICAgIHx1bmRlZmluZWQge1xuICAgIGlmICh0aGlzLmNhY2hlLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhY2hlLmdldChyZWYubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gU2VhbCB0aGUgcmVnaXN0cnkgdG8gcHJvdGVjdCB0aGUgaW50ZWdyaXR5IG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgY2FjaGUuXG4gICAgdGhpcy5zZWFsZWQgPSB0cnVlO1xuXG4gICAgLy8gYHJlZmAgc2hvdWxkIGJlIGFuIE5nTW9kdWxlIHByZXZpb3VzbHkgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBJZiBub3QsIGEgc2NvcGUgZm9yIGl0XG4gICAgLy8gY2Fubm90IGJlIHByb2R1Y2VkLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5sb2NhbFJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgbnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBNb2R1bGVzIHdoaWNoIGNvbnRyaWJ1dGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIG1vZHVsZS5cbiAgICBjb25zdCBjb21waWxhdGlvbk1vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KFtuZ01vZHVsZS5yZWYubm9kZV0pO1xuICAgIC8vIE1vZHVsZXMgd2hpY2ggY29udHJpYnV0ZWQgdG8gdGhlIGV4cG9ydCBzY29wZSBvZiB0aGlzIG1vZHVsZS5cbiAgICBjb25zdCBleHBvcnRlZE1vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KFtuZ01vZHVsZS5yZWYubm9kZV0pO1xuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBjb21waWxhdGlvblBpcGVzID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIFBpcGVNZXRhPigpO1xuXG4gICAgY29uc3QgZGVjbGFyZWQgPSBuZXcgU2V0PERlY2xhcmF0aW9uTm9kZT4oKTtcblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGV4cG9ydGVkIHRvIGFueSBpbXBvcnRpbmcgTmdNb2R1bGVzLlxuICAgIGNvbnN0IGV4cG9ydERpcmVjdGl2ZXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBleHBvcnRQaXBlcyA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBQaXBlTWV0YT4oKTtcblxuICAgIC8vIFRoZSBhbGdvcml0aG0gaXMgYXMgZm9sbG93czpcbiAgICAvLyAxKSBBZGQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGZyb20gZWFjaCBOZ01vZHVsZSBpbXBvcnRlZCBpbnRvIHRoZSBjdXJyZW50IG9uZSB0byB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZS5cbiAgICAvLyAyKSBBZGQgZGlyZWN0aXZlcy9waXBlcyBkZWNsYXJlZCBpbiB0aGUgTmdNb2R1bGUgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLiBBdCB0aGlzIHBvaW50LCB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZSBpcyBjb21wbGV0ZS5cbiAgICAvLyAzKSBGb3IgZWFjaCBlbnRyeSBpbiB0aGUgTmdNb2R1bGUncyBleHBvcnRzOlxuICAgIC8vICAgIGEpIEF0dGVtcHQgdG8gcmVzb2x2ZSBpdCBhcyBhbiBOZ01vZHVsZSB3aXRoIGl0cyBvd24gZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy4gSWYgaXQgaXNcbiAgICAvLyAgICAgICBvbmUsIGFkZCB0aGVtIHRvIHRoZSBleHBvcnQgc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAvLyAgICBiKSBPdGhlcndpc2UsIGl0IHNob3VsZCBiZSBhIGNsYXNzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLiBJZiBpdCBpcyxcbiAgICAvLyAgICAgICBhZGQgaXQgdG8gdGhlIGV4cG9ydCBzY29wZS5cbiAgICAvLyAgICBjKSBJZiBpdCdzIG5laXRoZXIgYW4gTmdNb2R1bGUgbm9yIGEgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLCB0aGVuIHRoaXNcbiAgICAvLyAgICAgICBpcyBhbiBlcnJvci5cblxuICAgIC8vIDEpIHByb2Nlc3MgaW1wb3J0cy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuaW1wb3J0cykge1xuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIHJlZi5ub2RlLCAnaW1wb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW4gaW1wb3J0IHdhc24ndCBhbiBOZ01vZHVsZSwgc28gcmVjb3JkIGFuIGVycm9yLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGltcG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2ltcG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBpbXBvcnRlZE1vZHVsZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5uZ01vZHVsZXMpIHtcbiAgICAgICAgY29tcGlsYXRpb25Nb2R1bGVzLmFkZChpbXBvcnRlZE1vZHVsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMikgYWRkIGRlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgY29uc3QgcGlwZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgaWYgKGRpcmVjdGl2ZSAhPT0gbnVsbCkge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgey4uLmRpcmVjdGl2ZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2UgaWYgKHBpcGUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25QaXBlcy5zZXQoZGVjbC5ub2RlLCB7Li4ucGlwZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRhaW50ZWRNb2R1bGVzLmFkZChuZ01vZHVsZS5yZWYubm9kZSk7XG5cbiAgICAgICAgY29uc3QgZXJyb3JOb2RlID0gZGVjbC5nZXRPcmlnaW5Gb3JEaWFnbm9zdGljcyhuZ01vZHVsZS5yYXdEZWNsYXJhdGlvbnMhKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICBgVGhlIGNsYXNzICcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBsaXN0ZWQgaW4gdGhlIGRlY2xhcmF0aW9ucyBgICtcbiAgICAgICAgICAgICAgICBgb2YgdGhlIE5nTW9kdWxlICcke1xuICAgICAgICAgICAgICAgICAgICBuZ01vZHVsZS5yZWYubm9kZS5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nLCBidXQgaXMgbm90IGEgZGlyZWN0aXZlLCBhIGNvbXBvbmVudCwgb3IgYSBwaXBlLiBgICtcbiAgICAgICAgICAgICAgICBgRWl0aGVyIHJlbW92ZSBpdCBmcm9tIHRoZSBOZ01vZHVsZSdzIGRlY2xhcmF0aW9ucywgb3IgYWRkIGFuIGFwcHJvcHJpYXRlIEFuZ3VsYXIgZGVjb3JhdG9yLmAsXG4gICAgICAgICAgICBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgICAgICBkZWNsLm5vZGUubmFtZSwgYCcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmApXSkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGVjbGFyZWQuYWRkKGRlY2wubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gMykgcHJvY2VzcyBleHBvcnRzLlxuICAgIC8vIEV4cG9ydHMgY2FuIGNvbnRhaW4gbW9kdWxlcywgY29tcG9uZW50cywgb3IgZGlyZWN0aXZlcy4gVGhleSdyZSBwcm9jZXNzZWQgZGlmZmVyZW50bHkuXG4gICAgLy8gTW9kdWxlcyBhcmUgc3RyYWlnaHRmb3J3YXJkLiBEaXJlY3RpdmVzIGFuZCBwaXBlcyBmcm9tIGV4cG9ydGVkIG1vZHVsZXMgYXJlIGFkZGVkIHRvIHRoZVxuICAgIC8vIGV4cG9ydCBtYXBzLiBEaXJlY3RpdmVzL3BpcGVzIGFyZSBkaWZmZXJlbnQgLSB0aGV5IG1pZ2h0IGJlIGV4cG9ydHMgb2YgZGVjbGFyZWQgdHlwZXMgb3JcbiAgICAvLyBpbXBvcnRlZCB0eXBlcy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZXhwb3J0cykge1xuICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIGRlY2wgYXMgYW4gTmdNb2R1bGUuXG4gICAgICBjb25zdCBpbXBvcnRTY29wZSA9IHRoaXMuZ2V0RXhwb3J0ZWRTY29wZShkZWNsLCBkaWFnbm9zdGljcywgcmVmLm5vZGUsICdleHBvcnQnKTtcbiAgICAgIGlmIChpbXBvcnRTY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIEFuIGV4cG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGV4cG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGltcG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gTmdNb2R1bGUuXG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgZXhwb3J0UGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZXhwb3J0ZWRNb2R1bGUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQubmdNb2R1bGVzKSB7XG4gICAgICAgICAgZXhwb3J0ZWRNb2R1bGVzLmFkZChleHBvcnRlZE1vZHVsZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25EaXJlY3RpdmVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBjb21waWxhdGlvbkRpcmVjdGl2ZXMuZ2V0KGRlY2wubm9kZSkhO1xuICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uUGlwZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIHBpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IHBpcGUgPSBjb21waWxhdGlvblBpcGVzLmdldChkZWNsLm5vZGUpITtcbiAgICAgICAgZXhwb3J0UGlwZXMuc2V0KGRlY2wubm9kZSwgcGlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIHVua25vd24gZXhwb3J0LlxuICAgICAgICBpZiAodGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCkgIT09IG51bGwpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWV4cG9ydChyZWYubm9kZSwgZGVjbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRlZCA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oZXhwb3J0RGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICBwaXBlczogQXJyYXkuZnJvbShleHBvcnRQaXBlcy52YWx1ZXMoKSksXG4gICAgICBuZ01vZHVsZXM6IEFycmF5LmZyb20oZXhwb3J0ZWRNb2R1bGVzKSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5nZXRSZWV4cG9ydHMobmdNb2R1bGUsIHJlZiwgZGVjbGFyZWQsIGV4cG9ydGVkLCBkaWFnbm9zdGljcyk7XG5cbiAgICAvLyBDaGVjayBpZiB0aGlzIHNjb3BlIGhhZCBhbnkgZXJyb3JzIGR1cmluZyBwcm9kdWN0aW9uLlxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBDYWNoZSB1bmRlZmluZWQsIHRvIG1hcmsgdGhlIGZhY3QgdGhhdCB0aGUgc2NvcGUgaXMgaW52YWxpZC5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCB1bmRlZmluZWQpO1xuXG4gICAgICAvLyBTYXZlIHRoZSBlcnJvcnMgZm9yIHJldHJpZXZhbC5cbiAgICAgIHRoaXMuc2NvcGVFcnJvcnMuc2V0KHJlZi5ub2RlLCBkaWFnbm9zdGljcyk7XG5cbiAgICAgIC8vIE1hcmsgdGhpcyBtb2R1bGUgYXMgYmVpbmcgdGFpbnRlZC5cbiAgICAgIHRoaXMudGFpbnRlZE1vZHVsZXMuYWRkKHJlZi5ub2RlKTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gRmluYWxseSwgcHJvZHVjZSB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIHdpdGggYm90aCB0aGUgY29tcGlsYXRpb24gYW5kIGV4cG9ydCBzY29wZXMuXG4gICAgY29uc3Qgc2NvcGU6IExvY2FsTW9kdWxlU2NvcGUgPSB7XG4gICAgICBuZ01vZHVsZTogbmdNb2R1bGUucmVmLm5vZGUsXG4gICAgICBjb21waWxhdGlvbjoge1xuICAgICAgICBkaXJlY3RpdmVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uRGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uUGlwZXMudmFsdWVzKCkpLFxuICAgICAgICBuZ01vZHVsZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25Nb2R1bGVzKSxcbiAgICAgIH0sXG4gICAgICBleHBvcnRlZCxcbiAgICAgIHJlZXhwb3J0cyxcbiAgICAgIHNjaGVtYXM6IG5nTW9kdWxlLnNjaGVtYXMsXG4gICAgfTtcbiAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgc2NvcGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIGEgY29tcG9uZW50IHJlcXVpcmVzIHJlbW90ZSBzY29waW5nLlxuICAgKi9cbiAgZ2V0UmVtb3RlU2NvcGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IFJlbW90ZVNjb3BlfG51bGwge1xuICAgIHJldHVybiB0aGlzLnJlbW90ZVNjb3BpbmcuaGFzKG5vZGUpID8gdGhpcy5yZW1vdGVTY29waW5nLmdldChub2RlKSEgOiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBhIGNvbXBvbmVudCBhcyByZXF1aXJpbmcgcmVtb3RlIHNjb3BpbmcsIHdpdGggdGhlIGdpdmVuIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHRvIGJlXG4gICAqIHJlZ2lzdGVyZWQgcmVtb3RlbHkuXG4gICAqL1xuICBzZXRDb21wb25lbnRSZW1vdGVTY29wZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uLCBkaXJlY3RpdmVzOiBSZWZlcmVuY2VbXSwgcGlwZXM6IFJlZmVyZW5jZVtdKTpcbiAgICAgIHZvaWQge1xuICAgIHRoaXMucmVtb3RlU2NvcGluZy5zZXQobm9kZSwge2RpcmVjdGl2ZXMsIHBpcGVzfSk7XG4gIH1cblxuICAvKipcbiAgICogTG9vayB1cCB0aGUgYEV4cG9ydFNjb3BlYCBvZiBhIGdpdmVuIGBSZWZlcmVuY2VgIHRvIGFuIE5nTW9kdWxlLlxuICAgKlxuICAgKiBUaGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24gbWF5IGJlIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgdHMuUHJvZ3JhbSwgb3IgaXQgbWF5IGJlXG4gICAqIGRlY2xhcmVkIGluIGEgLmQudHMgZmlsZS5cbiAgICpcbiAgICogQHJldHVybnMgYG51bGxgIGlmIG5vIHNjb3BlIGNvdWxkIGJlIGZvdW5kLCBvciBgdW5kZWZpbmVkYCBpZiBhbiBpbnZhbGlkIHNjb3BlXG4gICAqIHdhcyBmb3VuZC5cbiAgICpcbiAgICogTWF5IGFsc28gY29udHJpYnV0ZSBkaWFnbm9zdGljcyBvZiBpdHMgb3duIGJ5IGFkZGluZyB0byB0aGUgZ2l2ZW4gYGRpYWdub3N0aWNzYFxuICAgKiBhcnJheSBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldEV4cG9ydGVkU2NvcGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSxcbiAgICAgIG93bmVyRm9yRXJyb3JzOiBEZWNsYXJhdGlvbk5vZGUsIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogRXhwb3J0U2NvcGV8bnVsbHx1bmRlZmluZWQge1xuICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuIFJlc29sdmUgaXQgd2l0aCB0aGUgYERlcGVuZGVuY3lTY29wZVJlYWRlcmAuXG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGluIGEgLmQudHMgZmlsZSBidXQgaXMgbm90IGRlY2xhcmVkIGFzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbi4gVGhpcyBpcyBhblxuICAgICAgICAvLyBlcnJvciBpbiB0aGUgLmQudHMgbWV0YWRhdGEuXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUocmVmLm5vZGUpIHx8IHJlZi5ub2RlLFxuICAgICAgICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWVGb3JFcnJvcihvd25lckZvckVycm9ycyl9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuIE5nTW9kdWxlYCkpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeVNjb3BlUmVhZGVyLnJlc29sdmUocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS4gUmVzb2x2ZSBpdCBmcm9tIHRoZSByZWdpc3RyeS5cbiAgICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0cyhcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZU1ldGEsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJlZDogU2V0PERlY2xhcmF0aW9uTm9kZT4sXG4gICAgICBleHBvcnRlZDoge2RpcmVjdGl2ZXM6IERpcmVjdGl2ZU1ldGFbXSwgcGlwZXM6IFBpcGVNZXRhW119LFxuICAgICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IFJlZXhwb3J0W118bnVsbCB7XG4gICAgbGV0IHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgIC8vIFRyYWNrIHJlLWV4cG9ydHMgYnkgc3ltYm9sIG5hbWUsIHRvIHByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgdHdvIGFsaWFzIHJlLWV4cG9ydHMgd291bGQgc2hhcmVcbiAgICAvLyB0aGUgc2FtZSBuYW1lLlxuICAgIGNvbnN0IHJlZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAvLyBBbGlhcyBuZ01vZHVsZVJlZiBhZGRlZCBmb3IgcmVhZGFiaWxpdHkgYmVsb3cuXG4gICAgY29uc3QgbmdNb2R1bGVSZWYgPSByZWY7XG4gICAgY29uc3QgYWRkUmVleHBvcnQgPSAoZXhwb3J0UmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pID0+IHtcbiAgICAgIGlmIChleHBvcnRSZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IHNvdXJjZUZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaXNSZUV4cG9ydCA9ICFkZWNsYXJlZC5oYXMoZXhwb3J0UmVmLm5vZGUpO1xuICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IHRoaXMuYWxpYXNpbmdIb3N0IS5tYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICAgICAgZXhwb3J0UmVmLCBzb3VyY2VGaWxlLCBuZ01vZHVsZS5yZWYubm9kZS5uYW1lLnRleHQsIGlzUmVFeHBvcnQpO1xuICAgICAgaWYgKGV4cG9ydE5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFyZWV4cG9ydE1hcC5oYXMoZXhwb3J0TmFtZSkpIHtcbiAgICAgICAgaWYgKGV4cG9ydFJlZi5hbGlhcyAmJiBleHBvcnRSZWYuYWxpYXMgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICAgICAgICByZWV4cG9ydHMhLnB1c2goe1xuICAgICAgICAgICAgZnJvbU1vZHVsZTogZXhwb3J0UmVmLmFsaWFzLnZhbHVlLm1vZHVsZU5hbWUhLFxuICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwb3J0UmVmLmFsaWFzLnZhbHVlLm5hbWUhLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBleHByID0gdGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLmNsb25lV2l0aE5vSWRlbnRpZmllcnMoKSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgaWYgKCEoZXhwciBpbnN0YW5jZW9mIEV4dGVybmFsRXhwcikgfHwgZXhwci52YWx1ZS5tb2R1bGVOYW1lID09PSBudWxsIHx8XG4gICAgICAgICAgICAgIGV4cHIudmFsdWUubmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBFeHRlcm5hbEV4cHInKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVleHBvcnRzIS5wdXNoKHtcbiAgICAgICAgICAgIGZyb21Nb2R1bGU6IGV4cHIudmFsdWUubW9kdWxlTmFtZSxcbiAgICAgICAgICAgIHN5bWJvbE5hbWU6IGV4cHIudmFsdWUubmFtZSxcbiAgICAgICAgICAgIGFzQWxpYXM6IGV4cG9ydE5hbWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVleHBvcnRNYXAuc2V0KGV4cG9ydE5hbWUsIGV4cG9ydFJlZik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBbm90aGVyIHJlLWV4cG9ydCBhbHJlYWR5IHVzZWQgdGhpcyBuYW1lLiBQcm9kdWNlIGEgZGlhZ25vc3RpYy5cbiAgICAgICAgY29uc3QgcHJldlJlZiA9IHJlZXhwb3J0TWFwLmdldChleHBvcnROYW1lKSE7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gocmVleHBvcnRDb2xsaXNpb24obmdNb2R1bGVSZWYubm9kZSwgcHJldlJlZiwgZXhwb3J0UmVmKSk7XG4gICAgICB9XG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IHtyZWZ9IG9mIGV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgfVxuICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgIGFkZFJlZXhwb3J0KHJlZik7XG4gICAgfVxuICAgIHJldHVybiByZWV4cG9ydHM7XG4gIH1cblxuICBwcml2YXRlIGFzc2VydENvbGxlY3RpbmcoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2VhbGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbjogTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGlzIG5vdCBDT0xMRUNUSU5HYCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gaW52YWxpZCBpbXBvcnQgb3IgZXhwb3J0IGZyb20gYW4gTmdNb2R1bGUuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRSZWYoXG4gICAgY2xheno6IERlY2xhcmF0aW9uTm9kZSwgZGVjbDogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT4sXG4gICAgdHlwZTogJ2ltcG9ydCd8J2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgY29uc3QgcmVzb2x2ZVRhcmdldCA9IHR5cGUgPT09ICdpbXBvcnQnID8gJ05nTW9kdWxlJyA6ICdOZ01vZHVsZSwgQ29tcG9uZW50LCBEaXJlY3RpdmUsIG9yIFBpcGUnO1xuICBsZXQgbWVzc2FnZSA9XG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtcbiAgICAgICAgICBub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBjb3VsZCBub3QgYmUgcmVzb2x2ZWQgdG8gYW4gJHtyZXNvbHZlVGFyZ2V0fSBjbGFzcy5gICtcbiAgICAgICdcXG5cXG4nO1xuICBjb25zdCBsaWJyYXJ5ID0gZGVjbC5vd25lZEJ5TW9kdWxlR3Vlc3MgIT09IG51bGwgPyBgICgke2RlY2wub3duZWRCeU1vZHVsZUd1ZXNzfSlgIDogJyc7XG4gIGNvbnN0IHNmID0gZGVjbC5ub2RlLmdldFNvdXJjZUZpbGUoKTtcblxuICAvLyBQcm92aWRlIGV4dHJhIGNvbnRleHQgdG8gdGhlIGVycm9yIGZvciB0aGUgdXNlci5cbiAgaWYgKCFzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgIC8vIFRoaXMgaXMgYSBmaWxlIGluIHRoZSB1c2VyJ3MgcHJvZ3JhbS5cbiAgICBjb25zdCBhbm5vdGF0aW9uVHlwZSA9IHR5cGUgPT09ICdpbXBvcnQnID8gJ0BOZ01vZHVsZScgOiAnQW5ndWxhcic7XG4gICAgbWVzc2FnZSArPSBgSXMgaXQgbWlzc2luZyBhbiAke2Fubm90YXRpb25UeXBlfSBhbm5vdGF0aW9uP2A7XG4gIH0gZWxzZSBpZiAoc2YuZmlsZU5hbWUuaW5kZXhPZignbm9kZV9tb2R1bGVzJykgIT09IC0xKSB7XG4gICAgLy8gVGhpcyBmaWxlIGNvbWVzIGZyb20gYSB0aGlyZC1wYXJ0eSBsaWJyYXJ5IGluIG5vZGVfbW9kdWxlcy5cbiAgICBtZXNzYWdlICs9XG4gICAgICAgIGBUaGlzIGxpa2VseSBtZWFucyB0aGF0IHRoZSBsaWJyYXJ5JHtsaWJyYXJ5fSB3aGljaCBkZWNsYXJlcyAke2RlY2wuZGVidWdOYW1lfSBoYXMgbm90IGAgK1xuICAgICAgICAnYmVlbiBwcm9jZXNzZWQgY29ycmVjdGx5IGJ5IG5nY2MsIG9yIGlzIG5vdCBjb21wYXRpYmxlIHdpdGggQW5ndWxhciBJdnkuIENoZWNrIGlmIGEgJyArXG4gICAgICAgICduZXdlciB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5IGlzIGF2YWlsYWJsZSwgYW5kIHVwZGF0ZSBpZiBzby4gQWxzbyBjb25zaWRlciBjaGVja2luZyAnICtcbiAgICAgICAgJ3dpdGggdGhlIGxpYnJhcnlcXCdzIGF1dGhvcnMgdG8gc2VlIGlmIHRoZSBsaWJyYXJ5IGlzIGV4cGVjdGVkIHRvIGJlIGNvbXBhdGlibGUgd2l0aCBJdnkuJztcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIGEgbW9ub3JlcG8gc3R5bGUgbG9jYWwgZGVwZW5kZW5jeS4gVW5mb3J0dW5hdGVseSB0aGVzZSBhcmUgdG9vIGRpZmZlcmVudCB0byByZWFsbHlcbiAgICAvLyBvZmZlciBtdWNoIG1vcmXCoGFkdmljZSB0aGFuIHRoaXMuXG4gICAgbWVzc2FnZSArPSBgVGhpcyBsaWtlbHkgbWVhbnMgdGhhdCB0aGUgZGVwZW5kZW5jeSR7bGlicmFyeX0gd2hpY2ggZGVjbGFyZXMgJHtcbiAgICAgICAgZGVjbC5kZWJ1Z05hbWV9IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQgY29ycmVjdGx5IGJ5IG5nY2MuYDtcbiAgfVxuXG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLCBtZXNzYWdlKTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbXBvcnQgb3IgZXhwb3J0IHdoaWNoIGl0c2VsZiBoYXMgZXJyb3JzLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKFxuICAgIGNsYXp6OiBEZWNsYXJhdGlvbk5vZGUsIGRlY2w6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+LFxuICAgIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNvZGUgPVxuICAgICAgdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOiBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgQXBwZWFycyBpbiB0aGUgTmdNb2R1bGUuJHt0eXBlfXMgb2YgJHtub2RlTmFtZUZvckVycm9yKGNsYXp6KX0sIGJ1dCBpdHNlbGYgaGFzIGVycm9yc2ApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGV4cG9ydGVkIGRpcmVjdGl2ZSBvciBwaXBlIHdoaWNoIHdhcyBub3QgZGVjbGFyZWQgb3IgaW1wb3J0ZWRcbiAqIGJ5IHRoZSBOZ01vZHVsZSBpbiBxdWVzdGlvbi5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZXhwb3J0KGNsYXp6OiBEZWNsYXJhdGlvbk5vZGUsIGRlY2w6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+KTogdHMuRGlhZ25vc3RpYyB7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX1JFRVhQT1JULCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYFByZXNlbnQgaW4gdGhlIE5nTW9kdWxlLmV4cG9ydHMgb2YgJHtcbiAgICAgICAgICBub2RlTmFtZUZvckVycm9yKGNsYXp6KX0gYnV0IG5laXRoZXIgZGVjbGFyZWQgbm9yIGltcG9ydGVkYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYSBjb2xsaXNpb24gaW4gcmUtZXhwb3J0IG5hbWVzIGJldHdlZW4gdHdvIGRpcmVjdGl2ZXMvcGlwZXMuXG4gKi9cbmZ1bmN0aW9uIHJlZXhwb3J0Q29sbGlzaW9uKFxuICAgIG1vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgcmVmQTogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgIHJlZkI6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjaGlsZE1lc3NhZ2VUZXh0ID0gYFRoaXMgZGlyZWN0aXZlL3BpcGUgaXMgcGFydCBvZiB0aGUgZXhwb3J0cyBvZiAnJHtcbiAgICAgIG1vZHVsZS5uYW1lLnRleHR9JyBhbmQgc2hhcmVzIHRoZSBzYW1lIG5hbWUgYXMgYW5vdGhlciBleHBvcnRlZCBkaXJlY3RpdmUvcGlwZS5gO1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBFcnJvckNvZGUuTkdNT0RVTEVfUkVFWFBPUlRfTkFNRV9DT0xMSVNJT04sIG1vZHVsZS5uYW1lLFxuICAgICAgYFxuICAgIFRoZXJlIHdhcyBhIG5hbWUgY29sbGlzaW9uIGJldHdlZW4gdHdvIGNsYXNzZXMgbmFtZWQgJyR7XG4gICAgICAgICAgcmVmQS5ub2RlLm5hbWUudGV4dH0nLCB3aGljaCBhcmUgYm90aCBwYXJ0IG9mIHRoZSBleHBvcnRzIG9mICcke21vZHVsZS5uYW1lLnRleHR9Jy5cblxuICAgIEFuZ3VsYXIgZ2VuZXJhdGVzIHJlLWV4cG9ydHMgb2YgYW4gTmdNb2R1bGUncyBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzIGZyb20gdGhlIG1vZHVsZSdzIHNvdXJjZSBmaWxlIGluIGNlcnRhaW4gY2FzZXMsIHVzaW5nIHRoZSBkZWNsYXJlZCBuYW1lIG9mIHRoZSBjbGFzcy4gSWYgdHdvIGNsYXNzZXMgb2YgdGhlIHNhbWUgbmFtZSBhcmUgZXhwb3J0ZWQsIHRoaXMgYXV0b21hdGljIG5hbWluZyBkb2VzIG5vdCB3b3JrLlxuXG4gICAgVG8gZml4IHRoaXMgcHJvYmxlbSBwbGVhc2UgcmUtZXhwb3J0IG9uZSBvciBib3RoIGNsYXNzZXMgZGlyZWN0bHkgZnJvbSB0aGlzIGZpbGUuXG4gIGAudHJpbSgpLFxuICAgICAgW1xuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlZkEubm9kZS5uYW1lLCBjaGlsZE1lc3NhZ2VUZXh0KSxcbiAgICAgICAgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWZCLm5vZGUubmFtZSwgY2hpbGRNZXNzYWdlVGV4dCksXG4gICAgICBdKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEZWNsYXJhdGlvbkRhdGEge1xuICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbjtcbiAgcmVmOiBSZWZlcmVuY2U7XG4gIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsO1xufVxuIl19