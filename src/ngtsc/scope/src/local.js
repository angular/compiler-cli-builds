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
             * Tracks which NgModules have directives/pipes that are declared in more than one module.
             */
            this.modulesWithStructuralErrors = new Set();
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
            return this.moduleToRef.has(clazz) ?
                this.getScopeOfModuleReference(this.moduleToRef.get(clazz)) :
                null;
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
                // Mark both modules as having duplicate declarations.
                this.modulesWithStructuralErrors.add(firstDeclData.ngModule);
                this.modulesWithStructuralErrors.add(ngModule);
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
         * Implementation of `getScopeOfModule` which accepts a reference to a class.
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
            //
            var isPoisoned = false;
            if (this.modulesWithStructuralErrors.has(ngModule.ref.node)) {
                // If the module contains declarations that are duplicates, then it's considered poisoned.
                isPoisoned = true;
            }
            try {
                // 1) process imports.
                for (var _k = tslib_1.__values(ngModule.imports), _l = _k.next(); !_l.done; _l = _k.next()) {
                    var decl = _l.value;
                    var importScope = this.getExportedScope(decl, diagnostics, ref.node, 'import');
                    if (importScope === null) {
                        // An import wasn't an NgModule, so record an error.
                        diagnostics.push(invalidRef(ref.node, decl, 'import'));
                        isPoisoned = true;
                        continue;
                    }
                    else if (importScope === 'invalid' || importScope.exported.isPoisoned) {
                        // An import was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its imports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, 'import'));
                        isPoisoned = true;
                        if (importScope === 'invalid') {
                            continue;
                        }
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
                        if (directive.isPoisoned) {
                            isPoisoned = true;
                        }
                    }
                    else if (pipe !== null) {
                        compilationPipes.set(decl.node, tslib_1.__assign(tslib_1.__assign({}, pipe), { ref: decl }));
                    }
                    else {
                        var errorNode = decl.getOriginForDiagnostics(ngModule.rawDeclarations);
                        diagnostics.push(diagnostics_1.makeDiagnostic(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "The class '" + decl.node.name.text + "' is listed in the declarations " +
                            ("of the NgModule '" + ngModule.ref.node.name
                                .text + "', but is not a directive, a component, or a pipe. ") +
                            "Either remove it from the NgModule's declarations, or add an appropriate Angular decorator.", [diagnostics_1.makeRelatedInformation(decl.node.name, "'" + decl.node.name.text + "' is declared here.")]));
                        isPoisoned = true;
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
                    var exportScope = this.getExportedScope(decl, diagnostics, ref.node, 'export');
                    if (exportScope === 'invalid' || (exportScope !== null && exportScope.exported.isPoisoned)) {
                        // An export was an NgModule but contained errors of its own. Record this as an error too,
                        // because this scope is always going to be incorrect if one of its exports could not be
                        // read.
                        diagnostics.push(invalidTransitiveNgModuleRef(ref.node, decl, 'export'));
                        isPoisoned = true;
                        if (exportScope === 'invalid') {
                            continue;
                        }
                    }
                    else if (exportScope !== null) {
                        try {
                            // decl is an NgModule.
                            for (var _x = (e_8 = void 0, tslib_1.__values(exportScope.exported.directives)), _y = _x.next(); !_y.done; _y = _x.next()) {
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
                            for (var _z = (e_9 = void 0, tslib_1.__values(exportScope.exported.pipes)), _0 = _z.next(); !_0.done; _0 = _z.next()) {
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
                            for (var _1 = (e_10 = void 0, tslib_1.__values(exportScope.exported.ngModules)), _2 = _1.next(); !_2.done; _2 = _1.next()) {
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
                        isPoisoned = true;
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
                isPoisoned: isPoisoned,
            };
            var reexports = this.getReexports(ngModule, ref, declared, exported, diagnostics);
            // Finally, produce the `LocalModuleScope` with both the compilation and export scopes.
            var scope = {
                ngModule: ngModule.ref.node,
                compilation: {
                    directives: Array.from(compilationDirectives.values()),
                    pipes: Array.from(compilationPipes.values()),
                    ngModules: Array.from(compilationModules),
                    isPoisoned: isPoisoned,
                },
                exported: exported,
                reexports: reexports,
                schemas: ngModule.schemas,
            };
            // Check if this scope had any errors during production.
            if (diagnostics.length > 0) {
                // Save the errors for retrieval.
                this.scopeErrors.set(ref.node, diagnostics);
                // Mark this module as being tainted.
                this.modulesWithStructuralErrors.add(ref.node);
            }
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
         * @returns `null` if no scope could be found, or `'invalid'` if the `Reference` is not a valid
         *     NgModule.
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
                    return 'invalid';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStEO0lBQy9ELCtCQUFpQztJQUVqQywyRUFBb0Y7SUFJcEYsa0ZBQTZFO0lBbUI3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUFvREUsa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxZQUErQjtZQURyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1lBQ2xGLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQW1CO1lBckRqRjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztZQUUzRTs7O2VBR0c7WUFDSywwQkFBcUIsR0FDekIsSUFBSSxHQUFHLEVBQTRELENBQUM7WUFFaEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBaUQsQ0FBQztZQUUvRTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7WUFFbkU7Ozs7Ozs7ZUFPRztZQUNLLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFakU7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1lBRW5FOztlQUVHO1lBQ0ssZ0NBQTJCLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFJa0IsQ0FBQztRQUVyRjs7V0FFRztRQUNILDJEQUF3QixHQUF4QixVQUF5QixJQUFrQjs7WUFDekMsSUFBSSxDQUFDLGdC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LENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7U0FDekQsQ0FBQyxDQUFDO0lBQ1QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4dGVybmFsRXhwciwgU2NoZW1hTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Vycm9yQ29kZSwgbWFrZURpYWdub3N0aWMsIG1ha2VSZWxhdGVkSW5mb3JtYXRpb259IGZyb20gJy4uLy4uL2RpYWdub3N0aWNzJztcbmltcG9ydCB7QWxpYXNpbmdIb3N0LCBSZWV4cG9ydCwgUmVmZXJlbmNlLCBSZWZlcmVuY2VFbWl0dGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25Ob2RlfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7aWRlbnRpZmllck9mTm9kZSwgbm9kZU5hbWVGb3JFcnJvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXhwb3J0U2NvcGUsIFJlbW90ZVNjb3BlLCBTY29wZURhdGF9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7Q29tcG9uZW50U2NvcGVSZWFkZXJ9IGZyb20gJy4vY29tcG9uZW50X3Njb3BlJztcbmltcG9ydCB7RHRzTW9kdWxlU2NvcGVSZXNvbHZlcn0gZnJvbSAnLi9kZXBlbmRlbmN5JztcblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE5nTW9kdWxlRGF0YSB7XG4gIGRlY2xhcmF0aW9uczogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGltcG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xuICBleHBvcnRzOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBMb2NhbE1vZHVsZVNjb3BlIGV4dGVuZHMgRXhwb3J0U2NvcGUge1xuICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbjtcbiAgY29tcGlsYXRpb246IFNjb3BlRGF0YTtcbiAgcmVleHBvcnRzOiBSZWV4cG9ydFtdfG51bGw7XG4gIHNjaGVtYXM6IFNjaGVtYU1ldGFkYXRhW107XG59XG5cbi8qKlxuICogQSByZWdpc3RyeSB3aGljaCBjb2xsZWN0cyBpbmZvcm1hdGlvbiBhYm91dCBOZ01vZHVsZXMsIERpcmVjdGl2ZXMsIENvbXBvbmVudHMsIGFuZCBQaXBlcyB3aGljaFxuICogYXJlIGxvY2FsIChkZWNsYXJlZCBpbiB0aGUgdHMuUHJvZ3JhbSBiZWluZyBjb21waWxlZCksIGFuZCBjYW4gcHJvZHVjZSBgTG9jYWxNb2R1bGVTY29wZWBzXG4gKiB3aGljaCBzdW1tYXJpemUgdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIGEgY29tcG9uZW50LlxuICpcbiAqIFRoaXMgY2xhc3MgaW1wbGVtZW50cyB0aGUgbG9naWMgb2YgTmdNb2R1bGUgZGVjbGFyYXRpb25zLCBpbXBvcnRzLCBhbmQgZXhwb3J0cyBhbmQgY2FuIHByb2R1Y2UsXG4gKiBmb3IgYSBnaXZlbiBjb21wb25lbnQsIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIFwidmlzaWJsZVwiIGluIHRoYXQgY29tcG9uZW50J3NcbiAqIHRlbXBsYXRlLlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBoYXMgdHdvIFwibW9kZXNcIiBvZiBvcGVyYXRpb24uIER1cmluZyBhbmFseXNpcywgZGF0YSBmb3IgZWFjaFxuICogaW5kaXZpZHVhbCBOZ01vZHVsZSwgRGlyZWN0aXZlLCBDb21wb25lbnQsIGFuZCBQaXBlIGlzIGFkZGVkIHRvIHRoZSByZWdpc3RyeS4gTm8gYXR0ZW1wdCBpcyBtYWRlXG4gKiB0byB0cmF2ZXJzZSBvciB2YWxpZGF0ZSB0aGUgTmdNb2R1bGUgZ3JhcGggKGltcG9ydHMsIGV4cG9ydHMsIGV0YykuIEFmdGVyIGFuYWx5c2lzLCBvbmUgb2ZcbiAqIGBnZXRTY29wZU9mTW9kdWxlYCBvciBgZ2V0U2NvcGVGb3JDb21wb25lbnRgIGNhbiBiZSBjYWxsZWQsIHdoaWNoIHRyYXZlcnNlcyB0aGUgTmdNb2R1bGUgZ3JhcGhcbiAqIGFuZCBhcHBsaWVzIHRoZSBOZ01vZHVsZSBsb2dpYyB0byBnZW5lcmF0ZSBhIGBMb2NhbE1vZHVsZVNjb3BlYCwgdGhlIGZ1bGwgc2NvcGUgZm9yIHRoZSBnaXZlblxuICogbW9kdWxlIG9yIGNvbXBvbmVudC5cbiAqXG4gKiBUaGUgYExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeWAgaXMgYWxzbyBjYXBhYmxlIG9mIHByb2R1Y2luZyBgdHMuRGlhZ25vc3RpY2AgZXJyb3JzIHdoZW4gQW5ndWxhclxuICogc2VtYW50aWNzIGFyZSB2aW9sYXRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSBpbXBsZW1lbnRzIE1ldGFkYXRhUmVnaXN0cnksIENvbXBvbmVudFNjb3BlUmVhZGVyIHtcbiAgLyoqXG4gICAqIFRyYWNrcyB3aGV0aGVyIHRoZSByZWdpc3RyeSBoYXMgYmVlbiBhc2tlZCB0byBwcm9kdWNlIHNjb3BlcyBmb3IgYSBtb2R1bGUgb3IgY29tcG9uZW50LiBPbmNlXG4gICAqIHRoaXMgaXMgdHJ1ZSwgdGhlIHJlZ2lzdHJ5IGNhbm5vdCBhY2NlcHQgcmVnaXN0cmF0aW9ucyBvZiBuZXcgZGlyZWN0aXZlcy9waXBlcy9tb2R1bGVzIGFzIGl0XG4gICAqIHdvdWxkIGludmFsaWRhdGUgdGhlIGNhY2hlZCBzY29wZSBkYXRhLlxuICAgKi9cbiAgcHJpdmF0ZSBzZWFsZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICogQSBtYXAgb2YgY29tcG9uZW50cyBmcm9tIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIHVuaXQgdG8gdGhlIE5nTW9kdWxlIHdoaWNoIGRlY2xhcmVkIHRoZW0uXG4gICAqXG4gICAqIEFzIGNvbXBvbmVudHMgYW5kIGRpcmVjdGl2ZXMgYXJlIG5vdCBkaXN0aW5ndWlzaGVkIGF0IHRoZSBOZ01vZHVsZSBsZXZlbCwgdGhpcyBtYXAgbWF5IGFsc29cbiAgICogY29udGFpbiBkaXJlY3RpdmVzLiBUaGlzIGRvZXNuJ3QgY2F1c2UgYW55IHByb2JsZW1zIGJ1dCBpc24ndCB1c2VmdWwgYXMgdGhlcmUgaXMgbm8gY29uY2VwdCBvZlxuICAgKiBhIGRpcmVjdGl2ZSdzIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgKi9cbiAgcHJpdmF0ZSBkZWNsYXJhdGlvblRvTW9kdWxlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkRhdGE+KCk7XG5cbiAgLyoqXG4gICAqIFRoaXMgbWFwcyBmcm9tIHRoZSBkaXJlY3RpdmUvcGlwZSBjbGFzcyB0byBhIG1hcCBvZiBkYXRhIGZvciBlYWNoIE5nTW9kdWxlIHRoYXQgZGVjbGFyZXMgdGhlXG4gICAqIGRpcmVjdGl2ZS9waXBlLiBUaGlzIGRhdGEgaXMgbmVlZGVkIHRvIHByb2R1Y2UgYW4gZXJyb3IgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAgICovXG4gIHByaXZhdGUgZHVwbGljYXRlRGVjbGFyYXRpb25zID1cbiAgICAgIG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRGF0YT4+KCk7XG5cbiAgcHJpdmF0ZSBtb2R1bGVUb1JlZiA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIC8qKlxuICAgKiBBIGNhY2hlIG9mIGNhbGN1bGF0ZWQgYExvY2FsTW9kdWxlU2NvcGVgcyBmb3IgZWFjaCBOZ01vZHVsZSBkZWNsYXJlZCBpbiB0aGUgY3VycmVudCBwcm9ncmFtLlxuXG4gICAqL1xuICBwcml2YXRlIGNhY2hlID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBMb2NhbE1vZHVsZVNjb3BlfG51bGw+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB0aGUgYFJlbW90ZVNjb3BlYCBmb3IgY29tcG9uZW50cyByZXF1aXJpbmcgXCJyZW1vdGUgc2NvcGluZ1wiLlxuICAgKlxuICAgKiBSZW1vdGUgc2NvcGluZyBpcyB3aGVuIHRoZSBzZXQgb2YgZGlyZWN0aXZlcyB3aGljaCBhcHBseSB0byBhIGdpdmVuIGNvbXBvbmVudCBpcyBzZXQgaW4gdGhlXG4gICAqIE5nTW9kdWxlJ3MgZmlsZSBpbnN0ZWFkIG9mIGRpcmVjdGx5IG9uIHRoZSBjb21wb25lbnQgZGVmICh3aGljaCBpcyBzb21ldGltZXMgbmVlZGVkIHRvIGdldFxuICAgKiBhcm91bmQgY3ljbGljIGltcG9ydCBpc3N1ZXMpLiBUaGlzIGlzIG5vdCB1c2VkIGluIGNhbGN1bGF0aW9uIG9mIGBMb2NhbE1vZHVsZVNjb3BlYHMsIGJ1dCBpc1xuICAgKiB0cmFja2VkIGhlcmUgZm9yIGNvbnZlbmllbmNlLlxuICAgKi9cbiAgcHJpdmF0ZSByZW1vdGVTY29waW5nID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBSZW1vdGVTY29wZT4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIGVycm9ycyBhY2N1bXVsYXRlZCBpbiB0aGUgcHJvY2Vzc2luZyBvZiBzY29wZXMgZm9yIGVhY2ggbW9kdWxlIGRlY2xhcmF0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBzY29wZUVycm9ycyA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgdHMuRGlhZ25vc3RpY1tdPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3Mgd2hpY2ggTmdNb2R1bGVzIGhhdmUgZGlyZWN0aXZlcy9waXBlcyB0aGF0IGFyZSBkZWNsYXJlZCBpbiBtb3JlIHRoYW4gb25lIG1vZHVsZS5cbiAgICovXG4gIHByaXZhdGUgbW9kdWxlc1dpdGhTdHJ1Y3R1cmFsRXJyb3JzID0gbmV3IFNldDxDbGFzc0RlY2xhcmF0aW9uPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBsb2NhbFJlYWRlcjogTWV0YWRhdGFSZWFkZXIsIHByaXZhdGUgZGVwZW5kZW5jeVNjb3BlUmVhZGVyOiBEdHNNb2R1bGVTY29wZVJlc29sdmVyLFxuICAgICAgcHJpdmF0ZSByZWZFbWl0dGVyOiBSZWZlcmVuY2VFbWl0dGVyLCBwcml2YXRlIGFsaWFzaW5nSG9zdDogQWxpYXNpbmdIb3N0fG51bGwpIHt9XG5cbiAgLyoqXG4gICAqIEFkZCBhbiBOZ01vZHVsZSdzIGRhdGEgdG8gdGhlIHJlZ2lzdHJ5LlxuICAgKi9cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKGRhdGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIHRoaXMuYXNzZXJ0Q29sbGVjdGluZygpO1xuICAgIGNvbnN0IG5nTW9kdWxlID0gZGF0YS5yZWYubm9kZTtcbiAgICB0aGlzLm1vZHVsZVRvUmVmLnNldChkYXRhLnJlZi5ub2RlLCBkYXRhLnJlZik7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBtb2R1bGUncyBkZWNsYXJhdGlvbnMsIGFuZCBhZGQgdGhlbSB0byBkZWNsYXJhdGlvblRvTW9kdWxlLiBJZiBkdXBsaWNhdGVzXG4gICAgLy8gYXJlIGZvdW5kLCB0aGV5J3JlIGluc3RlYWQgdHJhY2tlZCBpbiBkdXBsaWNhdGVEZWNsYXJhdGlvbnMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIGRhdGEuZGVjbGFyYXRpb25zKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyRGVjbGFyYXRpb25PZk1vZHVsZShuZ01vZHVsZSwgZGVjbCwgZGF0YS5yYXdEZWNsYXJhdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEoZGlyZWN0aXZlOiBEaXJlY3RpdmVNZXRhKTogdm9pZCB7fVxuXG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKHBpcGU6IFBpcGVNZXRhKTogdm9pZCB7fVxuXG4gIGdldFNjb3BlRm9yQ29tcG9uZW50KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICBjb25zdCBzY29wZSA9ICF0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuaGFzKGNsYXp6KSA/XG4gICAgICAgIG51bGwgOlxuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUodGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChjbGF6eikhLm5nTW9kdWxlKTtcbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogSWYgYG5vZGVgIGlzIGRlY2xhcmVkIGluIG1vcmUgdGhhbiBvbmUgTmdNb2R1bGUgKGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiksIHRoZW4gZ2V0IHRoZVxuICAgKiBgRGVjbGFyYXRpb25EYXRhYCBmb3IgZWFjaCBvZmZlbmRpbmcgZGVjbGFyYXRpb24uXG4gICAqXG4gICAqIE9yZGluYXJpbHkgYSBjbGFzcyBpcyBvbmx5IGRlY2xhcmVkIGluIG9uZSBOZ01vZHVsZSwgaW4gd2hpY2ggY2FzZSB0aGlzIGZ1bmN0aW9uIHJldHVybnNcbiAgICogYG51bGxgLlxuICAgKi9cbiAgZ2V0RHVwbGljYXRlRGVjbGFyYXRpb25zKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBEZWNsYXJhdGlvbkRhdGFbXXxudWxsIHtcbiAgICBpZiAoIXRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLmhhcyhub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuZ2V0KG5vZGUpIS52YWx1ZXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdHMgcmVnaXN0ZXJlZCBkYXRhIGZvciBhIG1vZHVsZSBhbmQgaXRzIGRpcmVjdGl2ZXMvcGlwZXMgYW5kIGNvbnZlcnQgaXQgaW50byBhIGZ1bGxcbiAgICogYExvY2FsTW9kdWxlU2NvcGVgLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBpbXBvcnRzIGFuZCBleHBvcnRzLiBJdCByZXR1cm5zIHRoZVxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAgZm9yIHRoZSBnaXZlbiBOZ01vZHVsZSBpZiBvbmUgY2FuIGJlIHByb2R1Y2VkLCBgbnVsbGAgaWYgbm8gc2NvcGUgd2FzIGV2ZXJcbiAgICogZGVmaW5lZCwgb3IgdGhlIHN0cmluZyBgJ2Vycm9yJ2AgaWYgdGhlIHNjb3BlIGNvbnRhaW5lZCBlcnJvcnMuXG4gICAqL1xuICBnZXRTY29wZU9mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5tb2R1bGVUb1JlZi5oYXMoY2xhenopID9cbiAgICAgICAgdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHRoaXMubW9kdWxlVG9SZWYuZ2V0KGNsYXp6KSEpIDpcbiAgICAgICAgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZXMgYW55IGB0cy5EaWFnbm9zdGljYHMgcHJvZHVjZWQgZHVyaW5nIHRoZSBjYWxjdWxhdGlvbiBvZiB0aGUgYExvY2FsTW9kdWxlU2NvcGVgIGZvclxuICAgKiB0aGUgZ2l2ZW4gTmdNb2R1bGUsIG9yIGBudWxsYCBpZiBubyBlcnJvcnMgd2VyZSBwcmVzZW50LlxuICAgKi9cbiAgZ2V0RGlhZ25vc3RpY3NPZk1vZHVsZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHRzLkRpYWdub3N0aWNbXXxudWxsIHtcbiAgICAvLyBSZXF1aXJlZCB0byBlbnN1cmUgdGhlIGVycm9ycyBhcmUgcG9wdWxhdGVkIGZvciB0aGUgZ2l2ZW4gY2xhc3MuIElmIGl0IGhhcyBiZWVuIHByb2Nlc3NlZFxuICAgIC8vIGJlZm9yZSwgdGhpcyB3aWxsIGJlIGEgbm8tb3AgZHVlIHRvIHRoZSBzY29wZSBjYWNoZS5cbiAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGUoY2xhenopO1xuXG4gICAgaWYgKHRoaXMuc2NvcGVFcnJvcnMuaGFzKGNsYXp6KSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2NvcGVFcnJvcnMuZ2V0KGNsYXp6KSE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVnaXN0ZXJEZWNsYXJhdGlvbk9mTW9kdWxlKFxuICAgICAgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb24sIGRlY2w6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPixcbiAgICAgIHJhd0RlY2xhcmF0aW9uczogdHMuRXhwcmVzc2lvbnxudWxsKTogdm9pZCB7XG4gICAgY29uc3QgZGVjbERhdGE6IERlY2xhcmF0aW9uRGF0YSA9IHtcbiAgICAgIG5nTW9kdWxlLFxuICAgICAgcmVmOiBkZWNsLFxuICAgICAgcmF3RGVjbGFyYXRpb25zLFxuICAgIH07XG5cbiAgICAvLyBGaXJzdCwgY2hlY2sgZm9yIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbnMgb2YgdGhlIHNhbWUgZGlyZWN0aXZlL3BpcGUuXG4gICAgaWYgKHRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAvLyBUaGlzIGRpcmVjdGl2ZS9waXBlIGhhcyBhbHJlYWR5IGJlZW4gaWRlbnRpZmllZCBhcyBiZWluZyBkdXBsaWNhdGVkLiBBZGQgdGhpcyBtb2R1bGUgdG8gdGhlXG4gICAgICAvLyBtYXAgb2YgbW9kdWxlcyBmb3Igd2hpY2ggYSBkdXBsaWNhdGUgZGVjbGFyYXRpb24gZXhpc3RzLlxuICAgICAgdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuZ2V0KGRlY2wubm9kZSkhLnNldChuZ01vZHVsZSwgZGVjbERhdGEpO1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5oYXMoZGVjbC5ub2RlKSAmJlxuICAgICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGRlY2wubm9kZSkhLm5nTW9kdWxlICE9PSBuZ01vZHVsZSkge1xuICAgICAgLy8gVGhpcyBkaXJlY3RpdmUvcGlwZSBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgYXMgZGVjbGFyZWQgaW4gYW5vdGhlciBtb2R1bGUuIE1hcmsgaXQgYXMgYVxuICAgICAgLy8gZHVwbGljYXRlIGluc3RlYWQuXG4gICAgICBjb25zdCBkdXBsaWNhdGVEZWNsTWFwID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbkRhdGE+KCk7XG4gICAgICBjb25zdCBmaXJzdERlY2xEYXRhID0gdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmdldChkZWNsLm5vZGUpITtcblxuICAgICAgLy8gTWFyayBib3RoIG1vZHVsZXMgYXMgaGF2aW5nIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbnMuXG4gICAgICB0aGlzLm1vZHVsZXNXaXRoU3RydWN0dXJhbEVycm9ycy5hZGQoZmlyc3REZWNsRGF0YS5uZ01vZHVsZSk7XG4gICAgICB0aGlzLm1vZHVsZXNXaXRoU3RydWN0dXJhbEVycm9ycy5hZGQobmdNb2R1bGUpO1xuXG4gICAgICAvLyBCZWluZyBkZXRlY3RlZCBhcyBhIGR1cGxpY2F0ZSBtZWFucyB0aGVyZSBhcmUgdHdvIE5nTW9kdWxlcyAoZm9yIG5vdykgd2hpY2ggZGVjbGFyZSB0aGlzXG4gICAgICAvLyBkaXJlY3RpdmUvcGlwZS4gQWRkIGJvdGggb2YgdGhlbSB0byB0aGUgZHVwbGljYXRlIHRyYWNraW5nIG1hcC5cbiAgICAgIGR1cGxpY2F0ZURlY2xNYXAuc2V0KGZpcnN0RGVjbERhdGEubmdNb2R1bGUsIGZpcnN0RGVjbERhdGEpO1xuICAgICAgZHVwbGljYXRlRGVjbE1hcC5zZXQobmdNb2R1bGUsIGRlY2xEYXRhKTtcbiAgICAgIHRoaXMuZHVwbGljYXRlRGVjbGFyYXRpb25zLnNldChkZWNsLm5vZGUsIGR1cGxpY2F0ZURlY2xNYXApO1xuXG4gICAgICAvLyBSZW1vdmUgdGhlIGRpcmVjdGl2ZS9waXBlIGZyb20gYGRlY2xhcmF0aW9uVG9Nb2R1bGVgIGFzIGl0J3MgYSBkdXBsaWNhdGUgZGVjbGFyYXRpb24sIGFuZFxuICAgICAgLy8gdGhlcmVmb3JlIG5vdCB2YWxpZC5cbiAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5kZWxldGUoZGVjbC5ub2RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhpcyBpcyB0aGUgZmlyc3QgZGVjbGFyYXRpb24gb2YgdGhpcyBkaXJlY3RpdmUvcGlwZSwgc28gbWFwIGl0LlxuICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLnNldChkZWNsLm5vZGUsIGRlY2xEYXRhKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSW1wbGVtZW50YXRpb24gb2YgYGdldFNjb3BlT2ZNb2R1bGVgIHdoaWNoIGFjY2VwdHMgYSByZWZlcmVuY2UgdG8gYSBjbGFzcy5cbiAgICovXG4gIHByaXZhdGUgZ2V0U2NvcGVPZk1vZHVsZVJlZmVyZW5jZShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgaWYgKHRoaXMuY2FjaGUuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY2FjaGUuZ2V0KHJlZi5ub2RlKSE7XG4gICAgfVxuXG4gICAgLy8gU2VhbCB0aGUgcmVnaXN0cnkgdG8gcHJvdGVjdCB0aGUgaW50ZWdyaXR5IG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgY2FjaGUuXG4gICAgdGhpcy5zZWFsZWQgPSB0cnVlO1xuXG4gICAgLy8gYHJlZmAgc2hvdWxkIGJlIGFuIE5nTW9kdWxlIHByZXZpb3VzbHkgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBJZiBub3QsIGEgc2NvcGUgZm9yIGl0XG4gICAgLy8gY2Fubm90IGJlIHByb2R1Y2VkLlxuICAgIGNvbnN0IG5nTW9kdWxlID0gdGhpcy5sb2NhbFJlYWRlci5nZXROZ01vZHVsZU1ldGFkYXRhKHJlZik7XG4gICAgaWYgKG5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICB0aGlzLmNhY2hlLnNldChyZWYubm9kZSwgbnVsbCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBNb2R1bGVzIHdoaWNoIGNvbnRyaWJ1dGVkIHRvIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIG1vZHVsZS5cbiAgICBjb25zdCBjb21waWxhdGlvbk1vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KFtuZ01vZHVsZS5yZWYubm9kZV0pO1xuICAgIC8vIE1vZHVsZXMgd2hpY2ggY29udHJpYnV0ZWQgdG8gdGhlIGV4cG9ydCBzY29wZSBvZiB0aGlzIG1vZHVsZS5cbiAgICBjb25zdCBleHBvcnRlZE1vZHVsZXMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KFtuZ01vZHVsZS5yZWYubm9kZV0pO1xuXG4gICAgLy8gRXJyb3JzIHByb2R1Y2VkIGR1cmluZyBjb21wdXRhdGlvbiBvZiB0aGUgc2NvcGUgYXJlIHJlY29yZGVkIGhlcmUuIEF0IHRoZSBlbmQsIGlmIHRoaXMgYXJyYXlcbiAgICAvLyBpc24ndCBlbXB0eSB0aGVuIGB1bmRlZmluZWRgIHdpbGwgYmUgY2FjaGVkIGFuZCByZXR1cm5lZCB0byBpbmRpY2F0ZSB0aGlzIHNjb3BlIGlzIGludmFsaWQuXG4gICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGdvYWwgaXMgdG8gcHJvZHVjZSB0d28gZGlzdGluY3QgdHJhbnNpdGl2ZSBzZXRzOlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSB2aXNpYmxlIHRvIGNvbXBvbmVudHMgZGVjbGFyZWQgaW4gdGhlIE5nTW9kdWxlLlxuICAgIC8vIC0gdGhlIGRpcmVjdGl2ZXMgYW5kIHBpcGVzIHdoaWNoIGFyZSBleHBvcnRlZCB0byBhbnkgTmdNb2R1bGVzIHdoaWNoIGltcG9ydCB0aGlzIG9uZS5cblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZS5cbiAgICBjb25zdCBjb21waWxhdGlvbkRpcmVjdGl2ZXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBjb21waWxhdGlvblBpcGVzID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIFBpcGVNZXRhPigpO1xuXG4gICAgY29uc3QgZGVjbGFyZWQgPSBuZXcgU2V0PERlY2xhcmF0aW9uTm9kZT4oKTtcblxuICAgIC8vIERpcmVjdGl2ZXMgYW5kIHBpcGVzIGV4cG9ydGVkIHRvIGFueSBpbXBvcnRpbmcgTmdNb2R1bGVzLlxuICAgIGNvbnN0IGV4cG9ydERpcmVjdGl2ZXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgICBjb25zdCBleHBvcnRQaXBlcyA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBQaXBlTWV0YT4oKTtcblxuICAgIC8vIFRoZSBhbGdvcml0aG0gaXMgYXMgZm9sbG93czpcbiAgICAvLyAxKSBBZGQgYWxsIG9mIHRoZSBkaXJlY3RpdmVzL3BpcGVzIGZyb20gZWFjaCBOZ01vZHVsZSBpbXBvcnRlZCBpbnRvIHRoZSBjdXJyZW50IG9uZSB0byB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZS5cbiAgICAvLyAyKSBBZGQgZGlyZWN0aXZlcy9waXBlcyBkZWNsYXJlZCBpbiB0aGUgTmdNb2R1bGUgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLiBBdCB0aGlzIHBvaW50LCB0aGVcbiAgICAvLyAgICBjb21waWxhdGlvbiBzY29wZSBpcyBjb21wbGV0ZS5cbiAgICAvLyAzKSBGb3IgZWFjaCBlbnRyeSBpbiB0aGUgTmdNb2R1bGUncyBleHBvcnRzOlxuICAgIC8vICAgIGEpIEF0dGVtcHQgdG8gcmVzb2x2ZSBpdCBhcyBhbiBOZ01vZHVsZSB3aXRoIGl0cyBvd24gZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcy4gSWYgaXQgaXNcbiAgICAvLyAgICAgICBvbmUsIGFkZCB0aGVtIHRvIHRoZSBleHBvcnQgc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAvLyAgICBiKSBPdGhlcndpc2UsIGl0IHNob3VsZCBiZSBhIGNsYXNzIGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLiBJZiBpdCBpcyxcbiAgICAvLyAgICAgICBhZGQgaXQgdG8gdGhlIGV4cG9ydCBzY29wZS5cbiAgICAvLyAgICBjKSBJZiBpdCdzIG5laXRoZXIgYW4gTmdNb2R1bGUgbm9yIGEgZGlyZWN0aXZlL3BpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLCB0aGVuIHRoaXNcbiAgICAvLyAgICAgICBpcyBhbiBlcnJvci5cblxuICAgIC8vXG4gICAgbGV0IGlzUG9pc29uZWQgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5tb2R1bGVzV2l0aFN0cnVjdHVyYWxFcnJvcnMuaGFzKG5nTW9kdWxlLnJlZi5ub2RlKSkge1xuICAgICAgLy8gSWYgdGhlIG1vZHVsZSBjb250YWlucyBkZWNsYXJhdGlvbnMgdGhhdCBhcmUgZHVwbGljYXRlcywgdGhlbiBpdCdzIGNvbnNpZGVyZWQgcG9pc29uZWQuXG4gICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyAxKSBwcm9jZXNzIGltcG9ydHMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmltcG9ydHMpIHtcbiAgICAgIGNvbnN0IGltcG9ydFNjb3BlID0gdGhpcy5nZXRFeHBvcnRlZFNjb3BlKGRlY2wsIGRpYWdub3N0aWNzLCByZWYubm9kZSwgJ2ltcG9ydCcpO1xuICAgICAgaWYgKGltcG9ydFNjb3BlID09PSBudWxsKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXNuJ3QgYW4gTmdNb2R1bGUsIHNvIHJlY29yZCBhbiBlcnJvci5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnaW1wb3J0JykpO1xuICAgICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2UgaWYgKGltcG9ydFNjb3BlID09PSAnaW52YWxpZCcgfHwgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuaXNQb2lzb25lZCkge1xuICAgICAgICAvLyBBbiBpbXBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBpbXBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmIChpbXBvcnRTY29wZSA9PT0gJ2ludmFsaWQnKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGlwZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5waXBlcykge1xuICAgICAgICBjb21waWxhdGlvblBpcGVzLnNldChwaXBlLnJlZi5ub2RlLCBwaXBlKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgaW1wb3J0ZWRNb2R1bGUgb2YgaW1wb3J0U2NvcGUuZXhwb3J0ZWQubmdNb2R1bGVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uTW9kdWxlcy5hZGQoaW1wb3J0ZWRNb2R1bGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDIpIGFkZCBkZWNsYXJhdGlvbnMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmRlY2xhcmF0aW9ucykge1xuICAgICAgY29uc3QgZGlyZWN0aXZlID0gdGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGNvbnN0IHBpcGUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKTtcbiAgICAgIGlmIChkaXJlY3RpdmUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25EaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIHsuLi5kaXJlY3RpdmUsIHJlZjogZGVjbH0pO1xuICAgICAgICBpZiAoZGlyZWN0aXZlLmlzUG9pc29uZWQpIHtcbiAgICAgICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwaXBlICE9PSBudWxsKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KGRlY2wubm9kZSwgey4uLnBpcGUsIHJlZjogZGVjbH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZXJyb3JOb2RlID0gZGVjbC5nZXRPcmlnaW5Gb3JEaWFnbm9zdGljcyhuZ01vZHVsZS5yYXdEZWNsYXJhdGlvbnMhKTtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0RFQ0xBUkFUSU9OLCBlcnJvck5vZGUsXG4gICAgICAgICAgICBgVGhlIGNsYXNzICcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBsaXN0ZWQgaW4gdGhlIGRlY2xhcmF0aW9ucyBgICtcbiAgICAgICAgICAgICAgICBgb2YgdGhlIE5nTW9kdWxlICcke1xuICAgICAgICAgICAgICAgICAgICBuZ01vZHVsZS5yZWYubm9kZS5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICAudGV4dH0nLCBidXQgaXMgbm90IGEgZGlyZWN0aXZlLCBhIGNvbXBvbmVudCwgb3IgYSBwaXBlLiBgICtcbiAgICAgICAgICAgICAgICBgRWl0aGVyIHJlbW92ZSBpdCBmcm9tIHRoZSBOZ01vZHVsZSdzIGRlY2xhcmF0aW9ucywgb3IgYWRkIGFuIGFwcHJvcHJpYXRlIEFuZ3VsYXIgZGVjb3JhdG9yLmAsXG4gICAgICAgICAgICBbbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihcbiAgICAgICAgICAgICAgICBkZWNsLm5vZGUubmFtZSwgYCcke2RlY2wubm9kZS5uYW1lLnRleHR9JyBpcyBkZWNsYXJlZCBoZXJlLmApXSkpO1xuICAgICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGRlY2xhcmVkLmFkZChkZWNsLm5vZGUpO1xuICAgIH1cblxuICAgIC8vIDMpIHByb2Nlc3MgZXhwb3J0cy5cbiAgICAvLyBFeHBvcnRzIGNhbiBjb250YWluIG1vZHVsZXMsIGNvbXBvbmVudHMsIG9yIGRpcmVjdGl2ZXMuIFRoZXkncmUgcHJvY2Vzc2VkIGRpZmZlcmVudGx5LlxuICAgIC8vIE1vZHVsZXMgYXJlIHN0cmFpZ2h0Zm9yd2FyZC4gRGlyZWN0aXZlcyBhbmQgcGlwZXMgZnJvbSBleHBvcnRlZCBtb2R1bGVzIGFyZSBhZGRlZCB0byB0aGVcbiAgICAvLyBleHBvcnQgbWFwcy4gRGlyZWN0aXZlcy9waXBlcyBhcmUgZGlmZmVyZW50IC0gdGhleSBtaWdodCBiZSBleHBvcnRzIG9mIGRlY2xhcmVkIHR5cGVzIG9yXG4gICAgLy8gaW1wb3J0ZWQgdHlwZXMuXG4gICAgZm9yIChjb25zdCBkZWNsIG9mIG5nTW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSBkZWNsIGFzIGFuIE5nTW9kdWxlLlxuICAgICAgY29uc3QgZXhwb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIHJlZi5ub2RlLCAnZXhwb3J0Jyk7XG4gICAgICBpZiAoZXhwb3J0U2NvcGUgPT09ICdpbnZhbGlkJyB8fCAoZXhwb3J0U2NvcGUgIT09IG51bGwgJiYgZXhwb3J0U2NvcGUuZXhwb3J0ZWQuaXNQb2lzb25lZCkpIHtcbiAgICAgICAgLy8gQW4gZXhwb3J0IHdhcyBhbiBOZ01vZHVsZSBidXQgY29udGFpbmVkIGVycm9ycyBvZiBpdHMgb3duLiBSZWNvcmQgdGhpcyBhcyBhbiBlcnJvciB0b28sXG4gICAgICAgIC8vIGJlY2F1c2UgdGhpcyBzY29wZSBpcyBhbHdheXMgZ29pbmcgdG8gYmUgaW5jb3JyZWN0IGlmIG9uZSBvZiBpdHMgZXhwb3J0cyBjb3VsZCBub3QgYmVcbiAgICAgICAgLy8gcmVhZC5cbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkVHJhbnNpdGl2ZU5nTW9kdWxlUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcblxuICAgICAgICBpZiAoZXhwb3J0U2NvcGUgPT09ICdpbnZhbGlkJykge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGV4cG9ydFNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gTmdNb2R1bGUuXG4gICAgICAgIGZvciAoY29uc3QgZGlyZWN0aXZlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLmRpcmVjdGl2ZXMpIHtcbiAgICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkaXJlY3RpdmUucmVmLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGV4cG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgICAgZXhwb3J0UGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgZXhwb3J0ZWRNb2R1bGUgb2YgZXhwb3J0U2NvcGUuZXhwb3J0ZWQubmdNb2R1bGVzKSB7XG4gICAgICAgICAgZXhwb3J0ZWRNb2R1bGVzLmFkZChleHBvcnRlZE1vZHVsZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25EaXJlY3RpdmVzLmhhcyhkZWNsLm5vZGUpKSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYSBkaXJlY3RpdmUgb3IgY29tcG9uZW50IGluIHRoZSBjb21waWxhdGlvbiBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgICAgICBjb25zdCBkaXJlY3RpdmUgPSBjb21waWxhdGlvbkRpcmVjdGl2ZXMuZ2V0KGRlY2wubm9kZSkhO1xuICAgICAgICBleHBvcnREaXJlY3RpdmVzLnNldChkZWNsLm5vZGUsIGRpcmVjdGl2ZSk7XG4gICAgICB9IGVsc2UgaWYgKGNvbXBpbGF0aW9uUGlwZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIHBpcGUgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IHBpcGUgPSBjb21waWxhdGlvblBpcGVzLmdldChkZWNsLm5vZGUpITtcbiAgICAgICAgZXhwb3J0UGlwZXMuc2V0KGRlY2wubm9kZSwgcGlwZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkZWNsIGlzIGFuIHVua25vd24gZXhwb3J0LlxuICAgICAgICBpZiAodGhpcy5sb2NhbFJlYWRlci5nZXREaXJlY3RpdmVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCB8fFxuICAgICAgICAgICAgdGhpcy5sb2NhbFJlYWRlci5nZXRQaXBlTWV0YWRhdGEoZGVjbCkgIT09IG51bGwpIHtcbiAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWV4cG9ydChyZWYubm9kZSwgZGVjbCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZihyZWYubm9kZSwgZGVjbCwgJ2V4cG9ydCcpKTtcbiAgICAgICAgfVxuICAgICAgICBpc1BvaXNvbmVkID0gdHJ1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0ZWQ6IFNjb3BlRGF0YSA9IHtcbiAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oZXhwb3J0RGlyZWN0aXZlcy52YWx1ZXMoKSksXG4gICAgICBwaXBlczogQXJyYXkuZnJvbShleHBvcnRQaXBlcy52YWx1ZXMoKSksXG4gICAgICBuZ01vZHVsZXM6IEFycmF5LmZyb20oZXhwb3J0ZWRNb2R1bGVzKSxcbiAgICAgIGlzUG9pc29uZWQsXG4gICAgfTtcblxuICAgIGNvbnN0IHJlZXhwb3J0cyA9IHRoaXMuZ2V0UmVleHBvcnRzKG5nTW9kdWxlLCByZWYsIGRlY2xhcmVkLCBleHBvcnRlZCwgZGlhZ25vc3RpY3MpO1xuXG5cbiAgICAvLyBGaW5hbGx5LCBwcm9kdWNlIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgd2l0aCBib3RoIHRoZSBjb21waWxhdGlvbiBhbmQgZXhwb3J0IHNjb3Blcy5cbiAgICBjb25zdCBzY29wZTogTG9jYWxNb2R1bGVTY29wZSA9IHtcbiAgICAgIG5nTW9kdWxlOiBuZ01vZHVsZS5yZWYubm9kZSxcbiAgICAgIGNvbXBpbGF0aW9uOiB7XG4gICAgICAgIGRpcmVjdGl2ZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25EaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgICAgcGlwZXM6IEFycmF5LmZyb20oY29tcGlsYXRpb25QaXBlcy52YWx1ZXMoKSksXG4gICAgICAgIG5nTW9kdWxlczogQXJyYXkuZnJvbShjb21waWxhdGlvbk1vZHVsZXMpLFxuICAgICAgICBpc1BvaXNvbmVkLFxuICAgICAgfSxcbiAgICAgIGV4cG9ydGVkLFxuICAgICAgcmVleHBvcnRzLFxuICAgICAgc2NoZW1hczogbmdNb2R1bGUuc2NoZW1hcyxcbiAgICB9O1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhpcyBzY29wZSBoYWQgYW55IGVycm9ycyBkdXJpbmcgcHJvZHVjdGlvbi5cbiAgICBpZiAoZGlhZ25vc3RpY3MubGVuZ3RoID4gMCkge1xuICAgICAgLy8gU2F2ZSB0aGUgZXJyb3JzIGZvciByZXRyaWV2YWwuXG4gICAgICB0aGlzLnNjb3BlRXJyb3JzLnNldChyZWYubm9kZSwgZGlhZ25vc3RpY3MpO1xuXG4gICAgICAvLyBNYXJrIHRoaXMgbW9kdWxlIGFzIGJlaW5nIHRhaW50ZWQuXG4gICAgICB0aGlzLm1vZHVsZXNXaXRoU3RydWN0dXJhbEVycm9ycy5hZGQocmVmLm5vZGUpO1xuICAgIH1cblxuICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCBzY29wZSk7XG4gICAgcmV0dXJuIHNjb3BlO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgYSBjb21wb25lbnQgcmVxdWlyZXMgcmVtb3RlIHNjb3BpbmcuXG4gICAqL1xuICBnZXRSZW1vdGVTY29wZShub2RlOiBDbGFzc0RlY2xhcmF0aW9uKTogUmVtb3RlU2NvcGV8bnVsbCB7XG4gICAgcmV0dXJuIHRoaXMucmVtb3RlU2NvcGluZy5oYXMobm9kZSkgPyB0aGlzLnJlbW90ZVNjb3BpbmcuZ2V0KG5vZGUpISA6IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2V0IGEgY29tcG9uZW50IGFzIHJlcXVpcmluZyByZW1vdGUgc2NvcGluZywgd2l0aCB0aGUgZ2l2ZW4gZGlyZWN0aXZlcyBhbmQgcGlwZXMgdG8gYmVcbiAgICogcmVnaXN0ZXJlZCByZW1vdGVseS5cbiAgICovXG4gIHNldENvbXBvbmVudFJlbW90ZVNjb3BlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGRpcmVjdGl2ZXM6IFJlZmVyZW5jZVtdLCBwaXBlczogUmVmZXJlbmNlW10pOlxuICAgICAgdm9pZCB7XG4gICAgdGhpcy5yZW1vdGVTY29waW5nLnNldChub2RlLCB7ZGlyZWN0aXZlcywgcGlwZXN9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIHVwIHRoZSBgRXhwb3J0U2NvcGVgIG9mIGEgZ2l2ZW4gYFJlZmVyZW5jZWAgdG8gYW4gTmdNb2R1bGUuXG4gICAqXG4gICAqIFRoZSBOZ01vZHVsZSBpbiBxdWVzdGlvbiBtYXkgYmUgZGVjbGFyZWQgbG9jYWxseSBpbiB0aGUgY3VycmVudCB0cy5Qcm9ncmFtLCBvciBpdCBtYXkgYmVcbiAgICogZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLlxuICAgKlxuICAgKiBAcmV0dXJucyBgbnVsbGAgaWYgbm8gc2NvcGUgY291bGQgYmUgZm91bmQsIG9yIGAnaW52YWxpZCdgIGlmIHRoZSBgUmVmZXJlbmNlYCBpcyBub3QgYSB2YWxpZFxuICAgKiAgICAgTmdNb2R1bGUuXG4gICAqXG4gICAqIE1heSBhbHNvIGNvbnRyaWJ1dGUgZGlhZ25vc3RpY3Mgb2YgaXRzIG93biBieSBhZGRpbmcgdG8gdGhlIGdpdmVuIGBkaWFnbm9zdGljc2BcbiAgICogYXJyYXkgcGFyYW1ldGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRFeHBvcnRlZFNjb3BlKFxuICAgICAgcmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10sXG4gICAgICBvd25lckZvckVycm9yczogRGVjbGFyYXRpb25Ob2RlLCB0eXBlOiAnaW1wb3J0J3wnZXhwb3J0Jyk6IEV4cG9ydFNjb3BlfG51bGx8J2ludmFsaWQnIHtcbiAgICBpZiAocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAvLyBUaGUgTmdNb2R1bGUgaXMgZGVjbGFyZWQgaW4gYSAuZC50cyBmaWxlLiBSZXNvbHZlIGl0IHdpdGggdGhlIGBEZXBlbmRlbmN5U2NvcGVSZWFkZXJgLlxuICAgICAgaWYgKCF0cy5pc0NsYXNzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBpbiBhIC5kLnRzIGZpbGUgYnV0IGlzIG5vdCBkZWNsYXJlZCBhcyBhIHRzLkNsYXNzRGVjbGFyYXRpb24uIFRoaXMgaXMgYW5cbiAgICAgICAgLy8gZXJyb3IgaW4gdGhlIC5kLnRzIG1ldGFkYXRhLlxuICAgICAgICBjb25zdCBjb2RlID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2gobWFrZURpYWdub3N0aWMoXG4gICAgICAgICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKHJlZi5ub2RlKSB8fCByZWYubm9kZSxcbiAgICAgICAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lRm9yRXJyb3Iob3duZXJGb3JFcnJvcnMpfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiBOZ01vZHVsZWApKTtcbiAgICAgICAgcmV0dXJuICdpbnZhbGlkJztcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRlcGVuZGVuY3lTY29wZVJlYWRlci5yZXNvbHZlKHJlZik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHByb2dyYW0uIFJlc29sdmUgaXQgZnJvbSB0aGUgcmVnaXN0cnkuXG4gICAgICByZXR1cm4gdGhpcy5nZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRSZWV4cG9ydHMoXG4gICAgICBuZ01vZHVsZTogTmdNb2R1bGVNZXRhLCByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgZGVjbGFyZWQ6IFNldDxEZWNsYXJhdGlvbk5vZGU+LFxuICAgICAgZXhwb3J0ZWQ6IHtkaXJlY3RpdmVzOiBEaXJlY3RpdmVNZXRhW10sIHBpcGVzOiBQaXBlTWV0YVtdfSxcbiAgICAgIGRpYWdub3N0aWNzOiB0cy5EaWFnbm9zdGljW10pOiBSZWV4cG9ydFtdfG51bGwge1xuICAgIGxldCByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbCA9IG51bGw7XG4gICAgY29uc3Qgc291cmNlRmlsZSA9IHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKTtcbiAgICBpZiAodGhpcy5hbGlhc2luZ0hvc3QgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZWV4cG9ydHMgPSBbXTtcbiAgICAvLyBUcmFjayByZS1leHBvcnRzIGJ5IHN5bWJvbCBuYW1lLCB0byBwcm9kdWNlIGRpYWdub3N0aWNzIGlmIHR3byBhbGlhcyByZS1leHBvcnRzIHdvdWxkIHNoYXJlXG4gICAgLy8gdGhlIHNhbWUgbmFtZS5cbiAgICBjb25zdCByZWV4cG9ydE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG4gICAgLy8gQWxpYXMgbmdNb2R1bGVSZWYgYWRkZWQgZm9yIHJlYWRhYmlsaXR5IGJlbG93LlxuICAgIGNvbnN0IG5nTW9kdWxlUmVmID0gcmVmO1xuICAgIGNvbnN0IGFkZFJlZXhwb3J0ID0gKGV4cG9ydFJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KSA9PiB7XG4gICAgICBpZiAoZXhwb3J0UmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpID09PSBzb3VyY2VGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGlzUmVFeHBvcnQgPSAhZGVjbGFyZWQuaGFzKGV4cG9ydFJlZi5ub2RlKTtcbiAgICAgIGNvbnN0IGV4cG9ydE5hbWUgPSB0aGlzLmFsaWFzaW5nSG9zdCEubWF5YmVBbGlhc1N5bWJvbEFzKFxuICAgICAgICAgIGV4cG9ydFJlZiwgc291cmNlRmlsZSwgbmdNb2R1bGUucmVmLm5vZGUubmFtZS50ZXh0LCBpc1JlRXhwb3J0KTtcbiAgICAgIGlmIChleHBvcnROYW1lID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghcmVleHBvcnRNYXAuaGFzKGV4cG9ydE5hbWUpKSB7XG4gICAgICAgIGlmIChleHBvcnRSZWYuYWxpYXMgJiYgZXhwb3J0UmVmLmFsaWFzIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB7XG4gICAgICAgICAgcmVleHBvcnRzIS5wdXNoKHtcbiAgICAgICAgICAgIGZyb21Nb2R1bGU6IGV4cG9ydFJlZi5hbGlhcy52YWx1ZS5tb2R1bGVOYW1lISxcbiAgICAgICAgICAgIHN5bWJvbE5hbWU6IGV4cG9ydFJlZi5hbGlhcy52YWx1ZS5uYW1lISxcbiAgICAgICAgICAgIGFzQWxpYXM6IGV4cG9ydE5hbWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgZXhwciA9IHRoaXMucmVmRW1pdHRlci5lbWl0KGV4cG9ydFJlZi5jbG9uZVdpdGhOb0lkZW50aWZpZXJzKCksIHNvdXJjZUZpbGUpO1xuICAgICAgICAgIGlmICghKGV4cHIgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHx8IGV4cHIudmFsdWUubW9kdWxlTmFtZSA9PT0gbnVsbCB8fFxuICAgICAgICAgICAgICBleHByLnZhbHVlLm5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgRXh0ZXJuYWxFeHByJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZXhwb3J0cyEucHVzaCh7XG4gICAgICAgICAgICBmcm9tTW9kdWxlOiBleHByLnZhbHVlLm1vZHVsZU5hbWUsXG4gICAgICAgICAgICBzeW1ib2xOYW1lOiBleHByLnZhbHVlLm5hbWUsXG4gICAgICAgICAgICBhc0FsaWFzOiBleHBvcnROYW1lLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJlZXhwb3J0TWFwLnNldChleHBvcnROYW1lLCBleHBvcnRSZWYpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQW5vdGhlciByZS1leHBvcnQgYWxyZWFkeSB1c2VkIHRoaXMgbmFtZS4gUHJvZHVjZSBhIGRpYWdub3N0aWMuXG4gICAgICAgIGNvbnN0IHByZXZSZWYgPSByZWV4cG9ydE1hcC5nZXQoZXhwb3J0TmFtZSkhO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKHJlZXhwb3J0Q29sbGlzaW9uKG5nTW9kdWxlUmVmLm5vZGUsIHByZXZSZWYsIGV4cG9ydFJlZikpO1xuICAgICAgfVxuICAgIH07XG4gICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICBhZGRSZWV4cG9ydChyZWYpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHtyZWZ9IG9mIGV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICBhZGRSZWV4cG9ydChyZWYpO1xuICAgIH1cbiAgICByZXR1cm4gcmVleHBvcnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3NlcnRDb2xsZWN0aW5nKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnNlYWxlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb246IExvY2FsTW9kdWxlU2NvcGVSZWdpc3RyeSBpcyBub3QgQ09MTEVDVElOR2ApO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGludmFsaWQgaW1wb3J0IG9yIGV4cG9ydCBmcm9tIGFuIE5nTW9kdWxlLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVmKFxuICAgIGNsYXp6OiBEZWNsYXJhdGlvbk5vZGUsIGRlY2w6IFJlZmVyZW5jZTxEZWNsYXJhdGlvbk5vZGU+LFxuICAgIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNvZGUgPVxuICAgICAgdHlwZSA9PT0gJ2ltcG9ydCcgPyBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9JTVBPUlQgOiBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9FWFBPUlQ7XG4gIGNvbnN0IHJlc29sdmVUYXJnZXQgPSB0eXBlID09PSAnaW1wb3J0JyA/ICdOZ01vZHVsZScgOiAnTmdNb2R1bGUsIENvbXBvbmVudCwgRGlyZWN0aXZlLCBvciBQaXBlJztcbiAgbGV0IG1lc3NhZ2UgPVxuICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7XG4gICAgICAgICAgbm9kZU5hbWVGb3JFcnJvcihjbGF6eil9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuICR7cmVzb2x2ZVRhcmdldH0gY2xhc3MuYCArXG4gICAgICAnXFxuXFxuJztcbiAgY29uc3QgbGlicmFyeSA9IGRlY2wub3duZWRCeU1vZHVsZUd1ZXNzICE9PSBudWxsID8gYCAoJHtkZWNsLm93bmVkQnlNb2R1bGVHdWVzc30pYCA6ICcnO1xuICBjb25zdCBzZiA9IGRlY2wubm9kZS5nZXRTb3VyY2VGaWxlKCk7XG5cbiAgLy8gUHJvdmlkZSBleHRyYSBjb250ZXh0IHRvIHRoZSBlcnJvciBmb3IgdGhlIHVzZXIuXG4gIGlmICghc2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAvLyBUaGlzIGlzIGEgZmlsZSBpbiB0aGUgdXNlcidzIHByb2dyYW0uXG4gICAgY29uc3QgYW5ub3RhdGlvblR5cGUgPSB0eXBlID09PSAnaW1wb3J0JyA/ICdATmdNb2R1bGUnIDogJ0FuZ3VsYXInO1xuICAgIG1lc3NhZ2UgKz0gYElzIGl0IG1pc3NpbmcgYW4gJHthbm5vdGF0aW9uVHlwZX0gYW5ub3RhdGlvbj9gO1xuICB9IGVsc2UgaWYgKHNmLmZpbGVOYW1lLmluZGV4T2YoJ25vZGVfbW9kdWxlcycpICE9PSAtMSkge1xuICAgIC8vIFRoaXMgZmlsZSBjb21lcyBmcm9tIGEgdGhpcmQtcGFydHkgbGlicmFyeSBpbiBub2RlX21vZHVsZXMuXG4gICAgbWVzc2FnZSArPVxuICAgICAgICBgVGhpcyBsaWtlbHkgbWVhbnMgdGhhdCB0aGUgbGlicmFyeSR7bGlicmFyeX0gd2hpY2ggZGVjbGFyZXMgJHtkZWNsLmRlYnVnTmFtZX0gaGFzIG5vdCBgICtcbiAgICAgICAgJ2JlZW4gcHJvY2Vzc2VkIGNvcnJlY3RseSBieSBuZ2NjLCBvciBpcyBub3QgY29tcGF0aWJsZSB3aXRoIEFuZ3VsYXIgSXZ5LiBDaGVjayBpZiBhICcgK1xuICAgICAgICAnbmV3ZXIgdmVyc2lvbiBvZiB0aGUgbGlicmFyeSBpcyBhdmFpbGFibGUsIGFuZCB1cGRhdGUgaWYgc28uIEFsc28gY29uc2lkZXIgY2hlY2tpbmcgJyArXG4gICAgICAgICd3aXRoIHRoZSBsaWJyYXJ5XFwncyBhdXRob3JzIHRvIHNlZSBpZiB0aGUgbGlicmFyeSBpcyBleHBlY3RlZCB0byBiZSBjb21wYXRpYmxlIHdpdGggSXZ5Lic7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBpcyBhIG1vbm9yZXBvIHN0eWxlIGxvY2FsIGRlcGVuZGVuY3kuIFVuZm9ydHVuYXRlbHkgdGhlc2UgYXJlIHRvbyBkaWZmZXJlbnQgdG8gcmVhbGx5XG4gICAgLy8gb2ZmZXIgbXVjaCBtb3JlwqBhZHZpY2UgdGhhbiB0aGlzLlxuICAgIG1lc3NhZ2UgKz0gYFRoaXMgbGlrZWx5IG1lYW5zIHRoYXQgdGhlIGRlcGVuZGVuY3kke2xpYnJhcnl9IHdoaWNoIGRlY2xhcmVzICR7XG4gICAgICAgIGRlY2wuZGVidWdOYW1lfSBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkIGNvcnJlY3RseSBieSBuZ2NjLmA7XG4gIH1cblxuICByZXR1cm4gbWFrZURpYWdub3N0aWMoY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSwgbWVzc2FnZSk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gaW1wb3J0IG9yIGV4cG9ydCB3aGljaCBpdHNlbGYgaGFzIGVycm9ycy5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihcbiAgICBjbGF6ejogRGVjbGFyYXRpb25Ob2RlLCBkZWNsOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPixcbiAgICB0eXBlOiAnaW1wb3J0J3wnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBjb2RlLCBpZGVudGlmaWVyT2ZOb2RlKGRlY2wubm9kZSkgfHwgZGVjbC5ub2RlLFxuICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7bm9kZU5hbWVGb3JFcnJvcihjbGF6eil9LCBidXQgaXRzZWxmIGhhcyBlcnJvcnNgKTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBleHBvcnRlZCBkaXJlY3RpdmUgb3IgcGlwZSB3aGljaCB3YXMgbm90IGRlY2xhcmVkIG9yIGltcG9ydGVkXG4gKiBieSB0aGUgTmdNb2R1bGUgaW4gcXVlc3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRSZWV4cG9ydChjbGF6ejogRGVjbGFyYXRpb25Ob2RlLCBkZWNsOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPik6IHRzLkRpYWdub3N0aWMge1xuICByZXR1cm4gbWFrZURpYWdub3N0aWMoXG4gICAgICBFcnJvckNvZGUuTkdNT0RVTEVfSU5WQUxJRF9SRUVYUE9SVCwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBQcmVzZW50IGluIHRoZSBOZ01vZHVsZS5leHBvcnRzIG9mICR7XG4gICAgICAgICAgbm9kZU5hbWVGb3JFcnJvcihjbGF6eil9IGJ1dCBuZWl0aGVyIGRlY2xhcmVkIG5vciBpbXBvcnRlZGApO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGEgY29sbGlzaW9uIGluIHJlLWV4cG9ydCBuYW1lcyBiZXR3ZWVuIHR3byBkaXJlY3RpdmVzL3BpcGVzLlxuICovXG5mdW5jdGlvbiByZWV4cG9ydENvbGxpc2lvbihcbiAgICBtb2R1bGU6IENsYXNzRGVjbGFyYXRpb24sIHJlZkE6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPixcbiAgICByZWZCOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY2hpbGRNZXNzYWdlVGV4dCA9IGBUaGlzIGRpcmVjdGl2ZS9waXBlIGlzIHBhcnQgb2YgdGhlIGV4cG9ydHMgb2YgJyR7XG4gICAgICBtb2R1bGUubmFtZS50ZXh0fScgYW5kIHNoYXJlcyB0aGUgc2FtZSBuYW1lIGFzIGFub3RoZXIgZXhwb3J0ZWQgZGlyZWN0aXZlL3BpcGUuYDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX1JFRVhQT1JUX05BTUVfQ09MTElTSU9OLCBtb2R1bGUubmFtZSxcbiAgICAgIGBcbiAgICBUaGVyZSB3YXMgYSBuYW1lIGNvbGxpc2lvbiBiZXR3ZWVuIHR3byBjbGFzc2VzIG5hbWVkICcke1xuICAgICAgICAgIHJlZkEubm9kZS5uYW1lLnRleHR9Jywgd2hpY2ggYXJlIGJvdGggcGFydCBvZiB0aGUgZXhwb3J0cyBvZiAnJHttb2R1bGUubmFtZS50ZXh0fScuXG5cbiAgICBBbmd1bGFyIGdlbmVyYXRlcyByZS1leHBvcnRzIG9mIGFuIE5nTW9kdWxlJ3MgZXhwb3J0ZWQgZGlyZWN0aXZlcy9waXBlcyBmcm9tIHRoZSBtb2R1bGUncyBzb3VyY2UgZmlsZSBpbiBjZXJ0YWluIGNhc2VzLCB1c2luZyB0aGUgZGVjbGFyZWQgbmFtZSBvZiB0aGUgY2xhc3MuIElmIHR3byBjbGFzc2VzIG9mIHRoZSBzYW1lIG5hbWUgYXJlIGV4cG9ydGVkLCB0aGlzIGF1dG9tYXRpYyBuYW1pbmcgZG9lcyBub3Qgd29yay5cblxuICAgIFRvIGZpeCB0aGlzIHByb2JsZW0gcGxlYXNlIHJlLWV4cG9ydCBvbmUgb3IgYm90aCBjbGFzc2VzIGRpcmVjdGx5IGZyb20gdGhpcyBmaWxlLlxuICBgLnRyaW0oKSxcbiAgICAgIFtcbiAgICAgICAgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbihyZWZBLm5vZGUubmFtZSwgY2hpbGRNZXNzYWdlVGV4dCksXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmQi5ub2RlLm5hbWUsIGNoaWxkTWVzc2FnZVRleHQpLFxuICAgICAgXSk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGVjbGFyYXRpb25EYXRhIHtcbiAgbmdNb2R1bGU6IENsYXNzRGVjbGFyYXRpb247XG4gIHJlZjogUmVmZXJlbmNlO1xuICByYXdEZWNsYXJhdGlvbnM6IHRzLkV4cHJlc3Npb258bnVsbDtcbn1cbiJdfQ==