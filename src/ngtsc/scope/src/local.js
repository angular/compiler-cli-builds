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
                for (var _b = (0, tslib_1.__values)(data.declarations), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                for (var _k = (0, tslib_1.__values)(ngModule.imports), _l = _k.next(); !_l.done; _l = _k.next()) {
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
                        for (var _m = (e_3 = void 0, (0, tslib_1.__values)(importScope.exported.directives)), _o = _m.next(); !_o.done; _o = _m.next()) {
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
                        for (var _p = (e_4 = void 0, (0, tslib_1.__values)(importScope.exported.pipes)), _q = _p.next(); !_q.done; _q = _p.next()) {
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
                        for (var _r = (e_5 = void 0, (0, tslib_1.__values)(importScope.exported.ngModules)), _s = _r.next(); !_s.done; _s = _r.next()) {
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
                for (var _t = (0, tslib_1.__values)(ngModule.declarations), _u = _t.next(); !_u.done; _u = _t.next()) {
                    var decl = _u.value;
                    var directive = this.localReader.getDirectiveMetadata(decl);
                    var pipe = this.localReader.getPipeMetadata(decl);
                    if (directive !== null) {
                        compilationDirectives.set(decl.node, (0, tslib_1.__assign)((0, tslib_1.__assign)({}, directive), { ref: decl }));
                        if (directive.isPoisoned) {
                            isPoisoned = true;
                        }
                    }
                    else if (pipe !== null) {
                        compilationPipes.set(decl.node, (0, tslib_1.__assign)((0, tslib_1.__assign)({}, pipe), { ref: decl }));
                    }
                    else {
                        var errorNode = decl.getOriginForDiagnostics(ngModule.rawDeclarations);
                        diagnostics.push((0, diagnostics_1.makeDiagnostic)(diagnostics_1.ErrorCode.NGMODULE_INVALID_DECLARATION, errorNode, "The class '" + decl.node.name.text + "' is listed in the declarations " +
                            ("of the NgModule '" + ngModule.ref.node.name
                                .text + "', but is not a directive, a component, or a pipe. ") +
                            "Either remove it from the NgModule's declarations, or add an appropriate Angular decorator.", [(0, diagnostics_1.makeRelatedInformation)(decl.node.name, "'" + decl.node.name.text + "' is declared here.")]));
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
                for (var _v = (0, tslib_1.__values)(ngModule.exports), _w = _v.next(); !_w.done; _w = _v.next()) {
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
                            for (var _x = (e_8 = void 0, (0, tslib_1.__values)(exportScope.exported.directives)), _y = _x.next(); !_y.done; _y = _x.next()) {
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
                            for (var _z = (e_9 = void 0, (0, tslib_1.__values)(exportScope.exported.pipes)), _0 = _z.next(); !_0.done; _0 = _z.next()) {
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
                            for (var _1 = (e_10 = void 0, (0, tslib_1.__values)(exportScope.exported.ngModules)), _2 = _1.next(); !_2.done; _2 = _1.next()) {
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
                    diagnostics.push((0, diagnostics_1.makeDiagnostic)(code, (0, typescript_1.identifierOfNode)(ref.node) || ref.node, "Appears in the NgModule." + type + "s of " + (0, typescript_1.nodeNameForError)(ownerForErrors) + ", but could not be resolved to an NgModule"));
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
                        var expr = _this.refEmitter.emit(exportRef.cloneWithNoIdentifiers(), sourceFile).expression;
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
                for (var _c = (0, tslib_1.__values)(exported.directives), _d = _c.next(); !_d.done; _d = _c.next()) {
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
                for (var _e = (0, tslib_1.__values)(exported.pipes), _f = _e.next(); !_f.done; _f = _e.next()) {
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
        var message = "Appears in the NgModule." + type + "s of " + (0, typescript_1.nodeNameForError)(clazz) + ", but could not be resolved to an " + resolveTarget + " class." +
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
        return (0, diagnostics_1.makeDiagnostic)(code, (0, typescript_1.identifierOfNode)(decl.node) || decl.node, message);
    }
    /**
     * Produce a `ts.Diagnostic` for an import or export which itself has errors.
     */
    function invalidTransitiveNgModuleRef(clazz, decl, type) {
        var code = type === 'import' ? diagnostics_1.ErrorCode.NGMODULE_INVALID_IMPORT : diagnostics_1.ErrorCode.NGMODULE_INVALID_EXPORT;
        return (0, diagnostics_1.makeDiagnostic)(code, (0, typescript_1.identifierOfNode)(decl.node) || decl.node, "Appears in the NgModule." + type + "s of " + (0, typescript_1.nodeNameForError)(clazz) + ", but itself has errors");
    }
    /**
     * Produce a `ts.Diagnostic` for an exported directive or pipe which was not declared or imported
     * by the NgModule in question.
     */
    function invalidReexport(clazz, decl) {
        return (0, diagnostics_1.makeDiagnostic)(diagnostics_1.ErrorCode.NGMODULE_INVALID_REEXPORT, (0, typescript_1.identifierOfNode)(decl.node) || decl.node, "Present in the NgModule.exports of " + (0, typescript_1.nodeNameForError)(clazz) + " but neither declared nor imported");
    }
    /**
     * Produce a `ts.Diagnostic` for a collision in re-export names between two directives/pipes.
     */
    function reexportCollision(module, refA, refB) {
        var childMessageText = "This directive/pipe is part of the exports of '" + module.name.text + "' and shares the same name as another exported directive/pipe.";
        return (0, diagnostics_1.makeDiagnostic)(diagnostics_1.ErrorCode.NGMODULE_REEXPORT_NAME_COLLISION, module.name, ("\n    There was a name collision between two classes named '" + refA.node.name.text + "', which are both part of the exports of '" + module.name.text + "'.\n\n    Angular generates re-exports of an NgModule's exported directives/pipes from the module's source file in certain cases, using the declared name of the class. If two classes of the same name are exported, this automatic naming does not work.\n\n    To fix this problem please re-export one or both classes directly from this file.\n  ").trim(), [
            (0, diagnostics_1.makeRelatedInformation)(refA.node.name, childMessageText),
            (0, diagnostics_1.makeRelatedInformation)(refB.node.name, childMessageText),
        ]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3Njb3BlL3NyYy9sb2NhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBRUgsOENBQStEO0lBQy9ELCtCQUFpQztJQUVqQywyRUFBb0Y7SUFJcEYsa0ZBQTZFO0lBbUI3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Ba0JHO0lBQ0g7UUFvREUsa0NBQ1ksV0FBMkIsRUFBVSxxQkFBNkMsRUFDbEYsVUFBNEIsRUFBVSxZQUErQjtZQURyRSxnQkFBVyxHQUFYLFdBQVcsQ0FBZ0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQXdCO1lBQ2xGLGVBQVUsR0FBVixVQUFVLENBQWtCO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQW1CO1lBckRqRjs7OztlQUlHO1lBQ0ssV0FBTSxHQUFHLEtBQUssQ0FBQztZQUV2Qjs7Ozs7O2VBTUc7WUFDSyx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQztZQUUzRTs7O2VBR0c7WUFDSywwQkFBcUIsR0FDekIsSUFBSSxHQUFHLEVBQTRELENBQUM7WUFFaEUsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFBaUQsQ0FBQztZQUUvRTs7O2VBR0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQTJDLENBQUM7WUFFbkU7Ozs7Ozs7ZUFPRztZQUNLLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7WUFFakU7O2VBRUc7WUFDSyxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1lBRW5FOztlQUVHO1lBQ0ssZ0NBQTJCLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFJa0IsQ0FBQztRQUVyRjs7V0FFRztRQUNILDJEQUF3QixHQUF4QixVQUF5QixJQUFrQjs7WUFDekMsSUFBSSxDQUFDLGdC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QUFJLEVBQUUsRUFDSjtZQUNFLElBQUEsb0NBQXNCLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEQsSUFBQSxvQ0FBc0IsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQztTQUN6RCxDQUFDLENBQUM7SUFDVCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7RXh0ZXJuYWxFeHByLCBTY2hlbWFNZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RXJyb3JDb2RlLCBtYWtlRGlhZ25vc3RpYywgbWFrZVJlbGF0ZWRJbmZvcm1hdGlvbn0gZnJvbSAnLi4vLi4vZGlhZ25vc3RpY3MnO1xuaW1wb3J0IHtBbGlhc2luZ0hvc3QsIFJlZXhwb3J0LCBSZWZlcmVuY2UsIFJlZmVyZW5jZUVtaXR0ZXJ9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNsYXJhdGlvbk5vZGV9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpZGVudGlmaWVyT2ZOb2RlLCBub2RlTmFtZUZvckVycm9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtFeHBvcnRTY29wZSwgUmVtb3RlU2NvcGUsIFNjb3BlRGF0YX0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlcn0gZnJvbSAnLi9jb21wb25lbnRfc2NvcGUnO1xuaW1wb3J0IHtEdHNNb2R1bGVTY29wZVJlc29sdmVyfSBmcm9tICcuL2RlcGVuZGVuY3knO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTmdNb2R1bGVEYXRhIHtcbiAgZGVjbGFyYXRpb25zOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj5bXTtcbiAgaW1wb3J0czogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+W107XG4gIGV4cG9ydHM6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIExvY2FsTW9kdWxlU2NvcGUgZXh0ZW5kcyBFeHBvcnRTY29wZSB7XG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xuICBjb21waWxhdGlvbjogU2NvcGVEYXRhO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W118bnVsbDtcbiAgc2NoZW1hczogU2NoZW1hTWV0YWRhdGFbXTtcbn1cblxuLyoqXG4gKiBBIHJlZ2lzdHJ5IHdoaWNoIGNvbGxlY3RzIGluZm9ybWF0aW9uIGFib3V0IE5nTW9kdWxlcywgRGlyZWN0aXZlcywgQ29tcG9uZW50cywgYW5kIFBpcGVzIHdoaWNoXG4gKiBhcmUgbG9jYWwgKGRlY2xhcmVkIGluIHRoZSB0cy5Qcm9ncmFtIGJlaW5nIGNvbXBpbGVkKSwgYW5kIGNhbiBwcm9kdWNlIGBMb2NhbE1vZHVsZVNjb3BlYHNcbiAqIHdoaWNoIHN1bW1hcml6ZSB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgYSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBjbGFzcyBpbXBsZW1lbnRzIHRoZSBsb2dpYyBvZiBOZ01vZHVsZSBkZWNsYXJhdGlvbnMsIGltcG9ydHMsIGFuZCBleHBvcnRzIGFuZCBjYW4gcHJvZHVjZSxcbiAqIGZvciBhIGdpdmVuIGNvbXBvbmVudCwgdGhlIHNldCBvZiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB3aGljaCBhcmUgXCJ2aXNpYmxlXCIgaW4gdGhhdCBjb21wb25lbnQnc1xuICogdGVtcGxhdGUuXG4gKlxuICogVGhlIGBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnlgIGhhcyB0d28gXCJtb2Rlc1wiIG9mIG9wZXJhdGlvbi4gRHVyaW5nIGFuYWx5c2lzLCBkYXRhIGZvciBlYWNoXG4gKiBpbmRpdmlkdWFsIE5nTW9kdWxlLCBEaXJlY3RpdmUsIENvbXBvbmVudCwgYW5kIFBpcGUgaXMgYWRkZWQgdG8gdGhlIHJlZ2lzdHJ5LiBObyBhdHRlbXB0IGlzIG1hZGVcbiAqIHRvIHRyYXZlcnNlIG9yIHZhbGlkYXRlIHRoZSBOZ01vZHVsZSBncmFwaCAoaW1wb3J0cywgZXhwb3J0cywgZXRjKS4gQWZ0ZXIgYW5hbHlzaXMsIG9uZSBvZlxuICogYGdldFNjb3BlT2ZNb2R1bGVgIG9yIGBnZXRTY29wZUZvckNvbXBvbmVudGAgY2FuIGJlIGNhbGxlZCwgd2hpY2ggdHJhdmVyc2VzIHRoZSBOZ01vZHVsZSBncmFwaFxuICogYW5kIGFwcGxpZXMgdGhlIE5nTW9kdWxlIGxvZ2ljIHRvIGdlbmVyYXRlIGEgYExvY2FsTW9kdWxlU2NvcGVgLCB0aGUgZnVsbCBzY29wZSBmb3IgdGhlIGdpdmVuXG4gKiBtb2R1bGUgb3IgY29tcG9uZW50LlxuICpcbiAqIFRoZSBgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5YCBpcyBhbHNvIGNhcGFibGUgb2YgcHJvZHVjaW5nIGB0cy5EaWFnbm9zdGljYCBlcnJvcnMgd2hlbiBBbmd1bGFyXG4gKiBzZW1hbnRpY3MgYXJlIHZpb2xhdGVkLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxNb2R1bGVTY29wZVJlZ2lzdHJ5IGltcGxlbWVudHMgTWV0YWRhdGFSZWdpc3RyeSwgQ29tcG9uZW50U2NvcGVSZWFkZXIge1xuICAvKipcbiAgICogVHJhY2tzIHdoZXRoZXIgdGhlIHJlZ2lzdHJ5IGhhcyBiZWVuIGFza2VkIHRvIHByb2R1Y2Ugc2NvcGVzIGZvciBhIG1vZHVsZSBvciBjb21wb25lbnQuIE9uY2VcbiAgICogdGhpcyBpcyB0cnVlLCB0aGUgcmVnaXN0cnkgY2Fubm90IGFjY2VwdCByZWdpc3RyYXRpb25zIG9mIG5ldyBkaXJlY3RpdmVzL3BpcGVzL21vZHVsZXMgYXMgaXRcbiAgICogd291bGQgaW52YWxpZGF0ZSB0aGUgY2FjaGVkIHNjb3BlIGRhdGEuXG4gICAqL1xuICBwcml2YXRlIHNlYWxlZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBBIG1hcCBvZiBjb21wb25lbnRzIGZyb20gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24gdW5pdCB0byB0aGUgTmdNb2R1bGUgd2hpY2ggZGVjbGFyZWQgdGhlbS5cbiAgICpcbiAgICogQXMgY29tcG9uZW50cyBhbmQgZGlyZWN0aXZlcyBhcmUgbm90IGRpc3Rpbmd1aXNoZWQgYXQgdGhlIE5nTW9kdWxlIGxldmVsLCB0aGlzIG1hcCBtYXkgYWxzb1xuICAgKiBjb250YWluIGRpcmVjdGl2ZXMuIFRoaXMgZG9lc24ndCBjYXVzZSBhbnkgcHJvYmxlbXMgYnV0IGlzbid0IHVzZWZ1bCBhcyB0aGVyZSBpcyBubyBjb25jZXB0IG9mXG4gICAqIGEgZGlyZWN0aXZlJ3MgY29tcGlsYXRpb24gc2NvcGUuXG4gICAqL1xuICBwcml2YXRlIGRlY2xhcmF0aW9uVG9Nb2R1bGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRGF0YT4oKTtcblxuICAvKipcbiAgICogVGhpcyBtYXBzIGZyb20gdGhlIGRpcmVjdGl2ZS9waXBlIGNsYXNzIHRvIGEgbWFwIG9mIGRhdGEgZm9yIGVhY2ggTmdNb2R1bGUgdGhhdCBkZWNsYXJlcyB0aGVcbiAgICogZGlyZWN0aXZlL3BpcGUuIFRoaXMgZGF0YSBpcyBuZWVkZWQgdG8gcHJvZHVjZSBhbiBlcnJvciBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICAgKi9cbiAgcHJpdmF0ZSBkdXBsaWNhdGVEZWNsYXJhdGlvbnMgPVxuICAgICAgbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGVjbGFyYXRpb25EYXRhPj4oKTtcblxuICBwcml2YXRlIG1vZHVsZVRvUmVmID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG5cbiAgLyoqXG4gICAqIEEgY2FjaGUgb2YgY2FsY3VsYXRlZCBgTG9jYWxNb2R1bGVTY29wZWBzIGZvciBlYWNoIE5nTW9kdWxlIGRlY2xhcmVkIGluIHRoZSBjdXJyZW50IHByb2dyYW0uXG5cbiAgICovXG4gIHByaXZhdGUgY2FjaGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIExvY2FsTW9kdWxlU2NvcGV8bnVsbD4oKTtcblxuICAvKipcbiAgICogVHJhY2tzIHRoZSBgUmVtb3RlU2NvcGVgIGZvciBjb21wb25lbnRzIHJlcXVpcmluZyBcInJlbW90ZSBzY29waW5nXCIuXG4gICAqXG4gICAqIFJlbW90ZSBzY29waW5nIGlzIHdoZW4gdGhlIHNldCBvZiBkaXJlY3RpdmVzIHdoaWNoIGFwcGx5IHRvIGEgZ2l2ZW4gY29tcG9uZW50IGlzIHNldCBpbiB0aGVcbiAgICogTmdNb2R1bGUncyBmaWxlIGluc3RlYWQgb2YgZGlyZWN0bHkgb24gdGhlIGNvbXBvbmVudCBkZWYgKHdoaWNoIGlzIHNvbWV0aW1lcyBuZWVkZWQgdG8gZ2V0XG4gICAqIGFyb3VuZCBjeWNsaWMgaW1wb3J0IGlzc3VlcykuIFRoaXMgaXMgbm90IHVzZWQgaW4gY2FsY3VsYXRpb24gb2YgYExvY2FsTW9kdWxlU2NvcGVgcywgYnV0IGlzXG4gICAqIHRyYWNrZWQgaGVyZSBmb3IgY29udmVuaWVuY2UuXG4gICAqL1xuICBwcml2YXRlIHJlbW90ZVNjb3BpbmcgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFJlbW90ZVNjb3BlPigpO1xuXG4gIC8qKlxuICAgKiBUcmFja3MgZXJyb3JzIGFjY3VtdWxhdGVkIGluIHRoZSBwcm9jZXNzaW5nIG9mIHNjb3BlcyBmb3IgZWFjaCBtb2R1bGUgZGVjbGFyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIHNjb3BlRXJyb3JzID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCB0cy5EaWFnbm9zdGljW10+KCk7XG5cbiAgLyoqXG4gICAqIFRyYWNrcyB3aGljaCBOZ01vZHVsZXMgaGF2ZSBkaXJlY3RpdmVzL3BpcGVzIHRoYXQgYXJlIGRlY2xhcmVkIGluIG1vcmUgdGhhbiBvbmUgbW9kdWxlLlxuICAgKi9cbiAgcHJpdmF0ZSBtb2R1bGVzV2l0aFN0cnVjdHVyYWxFcnJvcnMgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGxvY2FsUmVhZGVyOiBNZXRhZGF0YVJlYWRlciwgcHJpdmF0ZSBkZXBlbmRlbmN5U2NvcGVSZWFkZXI6IER0c01vZHVsZVNjb3BlUmVzb2x2ZXIsXG4gICAgICBwcml2YXRlIHJlZkVtaXR0ZXI6IFJlZmVyZW5jZUVtaXR0ZXIsIHByaXZhdGUgYWxpYXNpbmdIb3N0OiBBbGlhc2luZ0hvc3R8bnVsbCkge31cblxuICAvKipcbiAgICogQWRkIGFuIE5nTW9kdWxlJ3MgZGF0YSB0byB0aGUgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEoZGF0YTogTmdNb2R1bGVNZXRhKTogdm9pZCB7XG4gICAgdGhpcy5hc3NlcnRDb2xsZWN0aW5nKCk7XG4gICAgY29uc3QgbmdNb2R1bGUgPSBkYXRhLnJlZi5ub2RlO1xuICAgIHRoaXMubW9kdWxlVG9SZWYuc2V0KGRhdGEucmVmLm5vZGUsIGRhdGEucmVmKTtcbiAgICAvLyBJdGVyYXRlIG92ZXIgdGhlIG1vZHVsZSdzIGRlY2xhcmF0aW9ucywgYW5kIGFkZCB0aGVtIHRvIGRlY2xhcmF0aW9uVG9Nb2R1bGUuIElmIGR1cGxpY2F0ZXNcbiAgICAvLyBhcmUgZm91bmQsIHRoZXkncmUgaW5zdGVhZCB0cmFja2VkIGluIGR1cGxpY2F0ZURlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgZGF0YS5kZWNsYXJhdGlvbnMpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJEZWNsYXJhdGlvbk9mTW9kdWxlKG5nTW9kdWxlLCBkZWNsLCBkYXRhLnJhd0RlY2xhcmF0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJEaXJlY3RpdmVNZXRhZGF0YShkaXJlY3RpdmU6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHt9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEocGlwZTogUGlwZU1ldGEpOiB2b2lkIHt9XG5cbiAgZ2V0U2NvcGVGb3JDb21wb25lbnQoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIGNvbnN0IHNjb3BlID0gIXRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5oYXMoY2xhenopID9cbiAgICAgICAgbnVsbCA6XG4gICAgICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZSh0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGNsYXp6KSEubmdNb2R1bGUpO1xuICAgIHJldHVybiBzY29wZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiBgbm9kZWAgaXMgZGVjbGFyZWQgaW4gbW9yZSB0aGFuIG9uZSBOZ01vZHVsZSAoZHVwbGljYXRlIGRlY2xhcmF0aW9uKSwgdGhlbiBnZXQgdGhlXG4gICAqIGBEZWNsYXJhdGlvbkRhdGFgIGZvciBlYWNoIG9mZmVuZGluZyBkZWNsYXJhdGlvbi5cbiAgICpcbiAgICogT3JkaW5hcmlseSBhIGNsYXNzIGlzIG9ubHkgZGVjbGFyZWQgaW4gb25lIE5nTW9kdWxlLCBpbiB3aGljaCBjYXNlIHRoaXMgZnVuY3Rpb24gcmV0dXJuc1xuICAgKiBgbnVsbGAuXG4gICAqL1xuICBnZXREdXBsaWNhdGVEZWNsYXJhdGlvbnMobm9kZTogQ2xhc3NEZWNsYXJhdGlvbik6IERlY2xhcmF0aW9uRGF0YVtdfG51bGwge1xuICAgIGlmICghdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuaGFzKG5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmR1cGxpY2F0ZURlY2xhcmF0aW9ucy5nZXQobm9kZSkhLnZhbHVlcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsZWN0cyByZWdpc3RlcmVkIGRhdGEgZm9yIGEgbW9kdWxlIGFuZCBpdHMgZGlyZWN0aXZlcy9waXBlcyBhbmQgY29udmVydCBpdCBpbnRvIGEgZnVsbFxuICAgKiBgTG9jYWxNb2R1bGVTY29wZWAuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIGxvZ2ljIG9mIE5nTW9kdWxlIGltcG9ydHMgYW5kIGV4cG9ydHMuIEl0IHJldHVybnMgdGhlXG4gICAqIGBMb2NhbE1vZHVsZVNjb3BlYCBmb3IgdGhlIGdpdmVuIE5nTW9kdWxlIGlmIG9uZSBjYW4gYmUgcHJvZHVjZWQsIGBudWxsYCBpZiBubyBzY29wZSB3YXMgZXZlclxuICAgKiBkZWZpbmVkLCBvciB0aGUgc3RyaW5nIGAnZXJyb3InYCBpZiB0aGUgc2NvcGUgY29udGFpbmVkIGVycm9ycy5cbiAgICovXG4gIGdldFNjb3BlT2ZNb2R1bGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBMb2NhbE1vZHVsZVNjb3BlfG51bGwge1xuICAgIHJldHVybiB0aGlzLm1vZHVsZVRvUmVmLmhhcyhjbGF6eikgP1xuICAgICAgICB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UodGhpcy5tb2R1bGVUb1JlZi5nZXQoY2xhenopISkgOlxuICAgICAgICBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlcyBhbnkgYHRzLkRpYWdub3N0aWNgcyBwcm9kdWNlZCBkdXJpbmcgdGhlIGNhbGN1bGF0aW9uIG9mIHRoZSBgTG9jYWxNb2R1bGVTY29wZWAgZm9yXG4gICAqIHRoZSBnaXZlbiBOZ01vZHVsZSwgb3IgYG51bGxgIGlmIG5vIGVycm9ycyB3ZXJlIHByZXNlbnQuXG4gICAqL1xuICBnZXREaWFnbm9zdGljc09mTW9kdWxlKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdHMuRGlhZ25vc3RpY1tdfG51bGwge1xuICAgIC8vIFJlcXVpcmVkIHRvIGVuc3VyZSB0aGUgZXJyb3JzIGFyZSBwb3B1bGF0ZWQgZm9yIHRoZSBnaXZlbiBjbGFzcy4gSWYgaXQgaGFzIGJlZW4gcHJvY2Vzc2VkXG4gICAgLy8gYmVmb3JlLCB0aGlzIHdpbGwgYmUgYSBuby1vcCBkdWUgdG8gdGhlIHNjb3BlIGNhY2hlLlxuICAgIHRoaXMuZ2V0U2NvcGVPZk1vZHVsZShjbGF6eik7XG5cbiAgICBpZiAodGhpcy5zY29wZUVycm9ycy5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gdGhpcy5zY29wZUVycm9ycy5nZXQoY2xhenopITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlckRlY2xhcmF0aW9uT2ZNb2R1bGUoXG4gICAgICBuZ01vZHVsZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjbDogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LFxuICAgICAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGwpOiB2b2lkIHtcbiAgICBjb25zdCBkZWNsRGF0YTogRGVjbGFyYXRpb25EYXRhID0ge1xuICAgICAgbmdNb2R1bGUsXG4gICAgICByZWY6IGRlY2wsXG4gICAgICByYXdEZWNsYXJhdGlvbnMsXG4gICAgfTtcblxuICAgIC8vIEZpcnN0LCBjaGVjayBmb3IgZHVwbGljYXRlIGRlY2xhcmF0aW9ucyBvZiB0aGUgc2FtZSBkaXJlY3RpdmUvcGlwZS5cbiAgICBpZiAodGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgIC8vIFRoaXMgZGlyZWN0aXZlL3BpcGUgaGFzIGFscmVhZHkgYmVlbiBpZGVudGlmaWVkIGFzIGJlaW5nIGR1cGxpY2F0ZWQuIEFkZCB0aGlzIG1vZHVsZSB0byB0aGVcbiAgICAgIC8vIG1hcCBvZiBtb2R1bGVzIGZvciB3aGljaCBhIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiBleGlzdHMuXG4gICAgICB0aGlzLmR1cGxpY2F0ZURlY2xhcmF0aW9ucy5nZXQoZGVjbC5ub2RlKSEuc2V0KG5nTW9kdWxlLCBkZWNsRGF0YSk7XG4gICAgfSBlbHNlIGlmIChcbiAgICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmhhcyhkZWNsLm5vZGUpICYmXG4gICAgICAgIHRoaXMuZGVjbGFyYXRpb25Ub01vZHVsZS5nZXQoZGVjbC5ub2RlKSEubmdNb2R1bGUgIT09IG5nTW9kdWxlKSB7XG4gICAgICAvLyBUaGlzIGRpcmVjdGl2ZS9waXBlIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCBhcyBkZWNsYXJlZCBpbiBhbm90aGVyIG1vZHVsZS4gTWFyayBpdCBhcyBhXG4gICAgICAvLyBkdXBsaWNhdGUgaW5zdGVhZC5cbiAgICAgIGNvbnN0IGR1cGxpY2F0ZURlY2xNYXAgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERlY2xhcmF0aW9uRGF0YT4oKTtcbiAgICAgIGNvbnN0IGZpcnN0RGVjbERhdGEgPSB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuZ2V0KGRlY2wubm9kZSkhO1xuXG4gICAgICAvLyBNYXJrIGJvdGggbW9kdWxlcyBhcyBoYXZpbmcgZHVwbGljYXRlIGRlY2xhcmF0aW9ucy5cbiAgICAgIHRoaXMubW9kdWxlc1dpdGhTdHJ1Y3R1cmFsRXJyb3JzLmFkZChmaXJzdERlY2xEYXRhLm5nTW9kdWxlKTtcbiAgICAgIHRoaXMubW9kdWxlc1dpdGhTdHJ1Y3R1cmFsRXJyb3JzLmFkZChuZ01vZHVsZSk7XG5cbiAgICAgIC8vIEJlaW5nIGRldGVjdGVkIGFzIGEgZHVwbGljYXRlIG1lYW5zIHRoZXJlIGFyZSB0d28gTmdNb2R1bGVzIChmb3Igbm93KSB3aGljaCBkZWNsYXJlIHRoaXNcbiAgICAgIC8vIGRpcmVjdGl2ZS9waXBlLiBBZGQgYm90aCBvZiB0aGVtIHRvIHRoZSBkdXBsaWNhdGUgdHJhY2tpbmcgbWFwLlxuICAgICAgZHVwbGljYXRlRGVjbE1hcC5zZXQoZmlyc3REZWNsRGF0YS5uZ01vZHVsZSwgZmlyc3REZWNsRGF0YSk7XG4gICAgICBkdXBsaWNhdGVEZWNsTWFwLnNldChuZ01vZHVsZSwgZGVjbERhdGEpO1xuICAgICAgdGhpcy5kdXBsaWNhdGVEZWNsYXJhdGlvbnMuc2V0KGRlY2wubm9kZSwgZHVwbGljYXRlRGVjbE1hcCk7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgZGlyZWN0aXZlL3BpcGUgZnJvbSBgZGVjbGFyYXRpb25Ub01vZHVsZWAgYXMgaXQncyBhIGR1cGxpY2F0ZSBkZWNsYXJhdGlvbiwgYW5kXG4gICAgICAvLyB0aGVyZWZvcmUgbm90IHZhbGlkLlxuICAgICAgdGhpcy5kZWNsYXJhdGlvblRvTW9kdWxlLmRlbGV0ZShkZWNsLm5vZGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGlzIGlzIHRoZSBmaXJzdCBkZWNsYXJhdGlvbiBvZiB0aGlzIGRpcmVjdGl2ZS9waXBlLCBzbyBtYXAgaXQuXG4gICAgICB0aGlzLmRlY2xhcmF0aW9uVG9Nb2R1bGUuc2V0KGRlY2wubm9kZSwgZGVjbERhdGEpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbXBsZW1lbnRhdGlvbiBvZiBgZ2V0U2NvcGVPZk1vZHVsZWAgd2hpY2ggYWNjZXB0cyBhIHJlZmVyZW5jZSB0byBhIGNsYXNzLlxuICAgKi9cbiAgcHJpdmF0ZSBnZXRTY29wZU9mTW9kdWxlUmVmZXJlbmNlKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICBpZiAodGhpcy5jYWNoZS5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5jYWNoZS5nZXQocmVmLm5vZGUpITtcbiAgICB9XG5cbiAgICAvLyBTZWFsIHRoZSByZWdpc3RyeSB0byBwcm90ZWN0IHRoZSBpbnRlZ3JpdHkgb2YgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCBjYWNoZS5cbiAgICB0aGlzLnNlYWxlZCA9IHRydWU7XG5cbiAgICAvLyBgcmVmYCBzaG91bGQgYmUgYW4gTmdNb2R1bGUgcHJldmlvdXNseSBhZGRlZCB0byB0aGUgcmVnaXN0cnkuIElmIG5vdCwgYSBzY29wZSBmb3IgaXRcbiAgICAvLyBjYW5ub3QgYmUgcHJvZHVjZWQuXG4gICAgY29uc3QgbmdNb2R1bGUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldE5nTW9kdWxlTWV0YWRhdGEocmVmKTtcbiAgICBpZiAobmdNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuY2FjaGUuc2V0KHJlZi5ub2RlLCBudWxsKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE1vZHVsZXMgd2hpY2ggY29udHJpYnV0ZWQgdG8gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgbW9kdWxlLlxuICAgIGNvbnN0IGNvbXBpbGF0aW9uTW9kdWxlcyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oW25nTW9kdWxlLnJlZi5ub2RlXSk7XG4gICAgLy8gTW9kdWxlcyB3aGljaCBjb250cmlidXRlZCB0byB0aGUgZXhwb3J0IHNjb3BlIG9mIHRoaXMgbW9kdWxlLlxuICAgIGNvbnN0IGV4cG9ydGVkTW9kdWxlcyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oW25nTW9kdWxlLnJlZi5ub2RlXSk7XG5cbiAgICAvLyBFcnJvcnMgcHJvZHVjZWQgZHVyaW5nIGNvbXB1dGF0aW9uIG9mIHRoZSBzY29wZSBhcmUgcmVjb3JkZWQgaGVyZS4gQXQgdGhlIGVuZCwgaWYgdGhpcyBhcnJheVxuICAgIC8vIGlzbid0IGVtcHR5IHRoZW4gYHVuZGVmaW5lZGAgd2lsbCBiZSBjYWNoZWQgYW5kIHJldHVybmVkIHRvIGluZGljYXRlIHRoaXMgc2NvcGUgaXMgaW52YWxpZC5cbiAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG5cbiAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZ29hbCBpcyB0byBwcm9kdWNlIHR3byBkaXN0aW5jdCB0cmFuc2l0aXZlIHNldHM6XG4gICAgLy8gLSB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIHZpc2libGUgdG8gY29tcG9uZW50cyBkZWNsYXJlZCBpbiB0aGUgTmdNb2R1bGUuXG4gICAgLy8gLSB0aGUgZGlyZWN0aXZlcyBhbmQgcGlwZXMgd2hpY2ggYXJlIGV4cG9ydGVkIHRvIGFueSBOZ01vZHVsZXMgd2hpY2ggaW1wb3J0IHRoaXMgb25lLlxuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgcGlwZXMgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIGNvbnN0IGNvbXBpbGF0aW9uRGlyZWN0aXZlcyA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGNvbXBpbGF0aW9uUGlwZXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgUGlwZU1ldGE+KCk7XG5cbiAgICBjb25zdCBkZWNsYXJlZCA9IG5ldyBTZXQ8RGVjbGFyYXRpb25Ob2RlPigpO1xuXG4gICAgLy8gRGlyZWN0aXZlcyBhbmQgcGlwZXMgZXhwb3J0ZWQgdG8gYW55IGltcG9ydGluZyBOZ01vZHVsZXMuXG4gICAgY29uc3QgZXhwb3J0RGlyZWN0aXZlcyA9IG5ldyBNYXA8RGVjbGFyYXRpb25Ob2RlLCBEaXJlY3RpdmVNZXRhPigpO1xuICAgIGNvbnN0IGV4cG9ydFBpcGVzID0gbmV3IE1hcDxEZWNsYXJhdGlvbk5vZGUsIFBpcGVNZXRhPigpO1xuXG4gICAgLy8gVGhlIGFsZ29yaXRobSBpcyBhcyBmb2xsb3dzOlxuICAgIC8vIDEpIEFkZCBhbGwgb2YgdGhlIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSBlYWNoIE5nTW9kdWxlIGltcG9ydGVkIGludG8gdGhlIGN1cnJlbnQgb25lIHRvIHRoZVxuICAgIC8vICAgIGNvbXBpbGF0aW9uIHNjb3BlLlxuICAgIC8vIDIpIEFkZCBkaXJlY3RpdmVzL3BpcGVzIGRlY2xhcmVkIGluIHRoZSBOZ01vZHVsZSB0byB0aGUgY29tcGlsYXRpb24gc2NvcGUuIEF0IHRoaXMgcG9pbnQsIHRoZVxuICAgIC8vICAgIGNvbXBpbGF0aW9uIHNjb3BlIGlzIGNvbXBsZXRlLlxuICAgIC8vIDMpIEZvciBlYWNoIGVudHJ5IGluIHRoZSBOZ01vZHVsZSdzIGV4cG9ydHM6XG4gICAgLy8gICAgYSkgQXR0ZW1wdCB0byByZXNvbHZlIGl0IGFzIGFuIE5nTW9kdWxlIHdpdGggaXRzIG93biBleHBvcnRlZCBkaXJlY3RpdmVzL3BpcGVzLiBJZiBpdCBpc1xuICAgIC8vICAgICAgIG9uZSwgYWRkIHRoZW0gdG8gdGhlIGV4cG9ydCBzY29wZSBvZiB0aGlzIE5nTW9kdWxlLlxuICAgIC8vICAgIGIpIE90aGVyd2lzZSwgaXQgc2hvdWxkIGJlIGEgY2xhc3MgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuIElmIGl0IGlzLFxuICAgIC8vICAgICAgIGFkZCBpdCB0byB0aGUgZXhwb3J0IHNjb3BlLlxuICAgIC8vICAgIGMpIElmIGl0J3MgbmVpdGhlciBhbiBOZ01vZHVsZSBub3IgYSBkaXJlY3RpdmUvcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUsIHRoZW4gdGhpc1xuICAgIC8vICAgICAgIGlzIGFuIGVycm9yLlxuXG4gICAgLy9cbiAgICBsZXQgaXNQb2lzb25lZCA9IGZhbHNlO1xuICAgIGlmICh0aGlzLm1vZHVsZXNXaXRoU3RydWN0dXJhbEVycm9ycy5oYXMobmdNb2R1bGUucmVmLm5vZGUpKSB7XG4gICAgICAvLyBJZiB0aGUgbW9kdWxlIGNvbnRhaW5zIGRlY2xhcmF0aW9ucyB0aGF0IGFyZSBkdXBsaWNhdGVzLCB0aGVuIGl0J3MgY29uc2lkZXJlZCBwb2lzb25lZC5cbiAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIDEpIHByb2Nlc3MgaW1wb3J0cy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuaW1wb3J0cykge1xuICAgICAgY29uc3QgaW1wb3J0U2NvcGUgPSB0aGlzLmdldEV4cG9ydGVkU2NvcGUoZGVjbCwgZGlhZ25vc3RpY3MsIHJlZi5ub2RlLCAnaW1wb3J0Jyk7XG4gICAgICBpZiAoaW1wb3J0U2NvcGUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gQW4gaW1wb3J0IHdhc24ndCBhbiBOZ01vZHVsZSwgc28gcmVjb3JkIGFuIGVycm9yLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRSZWYocmVmLm5vZGUsIGRlY2wsICdpbXBvcnQnKSk7XG4gICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSBpZiAoaW1wb3J0U2NvcGUgPT09ICdpbnZhbGlkJyB8fCBpbXBvcnRTY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkKSB7XG4gICAgICAgIC8vIEFuIGltcG9ydCB3YXMgYW4gTmdNb2R1bGUgYnV0IGNvbnRhaW5lZCBlcnJvcnMgb2YgaXRzIG93bi4gUmVjb3JkIHRoaXMgYXMgYW4gZXJyb3IgdG9vLFxuICAgICAgICAvLyBiZWNhdXNlIHRoaXMgc2NvcGUgaXMgYWx3YXlzIGdvaW5nIHRvIGJlIGluY29ycmVjdCBpZiBvbmUgb2YgaXRzIGltcG9ydHMgY291bGQgbm90IGJlXG4gICAgICAgIC8vIHJlYWQuXG4gICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFRyYW5zaXRpdmVOZ01vZHVsZVJlZihyZWYubm9kZSwgZGVjbCwgJ2ltcG9ydCcpKTtcbiAgICAgICAgaXNQb2lzb25lZCA9IHRydWU7XG5cbiAgICAgICAgaWYgKGltcG9ydFNjb3BlID09PSAnaW52YWxpZCcpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGRpcmVjdGl2ZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5kaXJlY3RpdmVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5zZXQoZGlyZWN0aXZlLnJlZi5ub2RlLCBkaXJlY3RpdmUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwaXBlIG9mIGltcG9ydFNjb3BlLmV4cG9ydGVkLnBpcGVzKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uUGlwZXMuc2V0KHBpcGUucmVmLm5vZGUsIHBpcGUpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBpbXBvcnRlZE1vZHVsZSBvZiBpbXBvcnRTY29wZS5leHBvcnRlZC5uZ01vZHVsZXMpIHtcbiAgICAgICAgY29tcGlsYXRpb25Nb2R1bGVzLmFkZChpbXBvcnRlZE1vZHVsZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMikgYWRkIGRlY2xhcmF0aW9ucy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZGVjbGFyYXRpb25zKSB7XG4gICAgICBjb25zdCBkaXJlY3RpdmUgPSB0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgY29uc3QgcGlwZSA9IHRoaXMubG9jYWxSZWFkZXIuZ2V0UGlwZU1ldGFkYXRhKGRlY2wpO1xuICAgICAgaWYgKGRpcmVjdGl2ZSAhPT0gbnVsbCkge1xuICAgICAgICBjb21waWxhdGlvbkRpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgey4uLmRpcmVjdGl2ZSwgcmVmOiBkZWNsfSk7XG4gICAgICAgIGlmIChkaXJlY3RpdmUuaXNQb2lzb25lZCkge1xuICAgICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHBpcGUgIT09IG51bGwpIHtcbiAgICAgICAgY29tcGlsYXRpb25QaXBlcy5zZXQoZGVjbC5ub2RlLCB7Li4ucGlwZSwgcmVmOiBkZWNsfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBlcnJvck5vZGUgPSBkZWNsLmdldE9yaWdpbkZvckRpYWdub3N0aWNzKG5nTW9kdWxlLnJhd0RlY2xhcmF0aW9ucyEpO1xuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKG1ha2VEaWFnbm9zdGljKFxuICAgICAgICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfREVDTEFSQVRJT04sIGVycm9yTm9kZSxcbiAgICAgICAgICAgIGBUaGUgY2xhc3MgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGxpc3RlZCBpbiB0aGUgZGVjbGFyYXRpb25zIGAgK1xuICAgICAgICAgICAgICAgIGBvZiB0aGUgTmdNb2R1bGUgJyR7XG4gICAgICAgICAgICAgICAgICAgIG5nTW9kdWxlLnJlZi5ub2RlLm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIC50ZXh0fScsIGJ1dCBpcyBub3QgYSBkaXJlY3RpdmUsIGEgY29tcG9uZW50LCBvciBhIHBpcGUuIGAgK1xuICAgICAgICAgICAgICAgIGBFaXRoZXIgcmVtb3ZlIGl0IGZyb20gdGhlIE5nTW9kdWxlJ3MgZGVjbGFyYXRpb25zLCBvciBhZGQgYW4gYXBwcm9wcmlhdGUgQW5ndWxhciBkZWNvcmF0b3IuYCxcbiAgICAgICAgICAgIFttYWtlUmVsYXRlZEluZm9ybWF0aW9uKFxuICAgICAgICAgICAgICAgIGRlY2wubm9kZS5uYW1lLCBgJyR7ZGVjbC5ub2RlLm5hbWUudGV4dH0nIGlzIGRlY2xhcmVkIGhlcmUuYCldKSk7XG4gICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgZGVjbGFyZWQuYWRkKGRlY2wubm9kZSk7XG4gICAgfVxuXG4gICAgLy8gMykgcHJvY2VzcyBleHBvcnRzLlxuICAgIC8vIEV4cG9ydHMgY2FuIGNvbnRhaW4gbW9kdWxlcywgY29tcG9uZW50cywgb3IgZGlyZWN0aXZlcy4gVGhleSdyZSBwcm9jZXNzZWQgZGlmZmVyZW50bHkuXG4gICAgLy8gTW9kdWxlcyBhcmUgc3RyYWlnaHRmb3J3YXJkLiBEaXJlY3RpdmVzIGFuZCBwaXBlcyBmcm9tIGV4cG9ydGVkIG1vZHVsZXMgYXJlIGFkZGVkIHRvIHRoZVxuICAgIC8vIGV4cG9ydCBtYXBzLiBEaXJlY3RpdmVzL3BpcGVzIGFyZSBkaWZmZXJlbnQgLSB0aGV5IG1pZ2h0IGJlIGV4cG9ydHMgb2YgZGVjbGFyZWQgdHlwZXMgb3JcbiAgICAvLyBpbXBvcnRlZCB0eXBlcy5cbiAgICBmb3IgKGNvbnN0IGRlY2wgb2YgbmdNb2R1bGUuZXhwb3J0cykge1xuICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIGRlY2wgYXMgYW4gTmdNb2R1bGUuXG4gICAgICBjb25zdCBleHBvcnRTY29wZSA9IHRoaXMuZ2V0RXhwb3J0ZWRTY29wZShkZWNsLCBkaWFnbm9zdGljcywgcmVmLm5vZGUsICdleHBvcnQnKTtcbiAgICAgIGlmIChleHBvcnRTY29wZSA9PT0gJ2ludmFsaWQnIHx8IChleHBvcnRTY29wZSAhPT0gbnVsbCAmJiBleHBvcnRTY29wZS5leHBvcnRlZC5pc1BvaXNvbmVkKSkge1xuICAgICAgICAvLyBBbiBleHBvcnQgd2FzIGFuIE5nTW9kdWxlIGJ1dCBjb250YWluZWQgZXJyb3JzIG9mIGl0cyBvd24uIFJlY29yZCB0aGlzIGFzIGFuIGVycm9yIHRvbyxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGlzIHNjb3BlIGlzIGFsd2F5cyBnb2luZyB0byBiZSBpbmNvcnJlY3QgaWYgb25lIG9mIGl0cyBleHBvcnRzIGNvdWxkIG5vdCBiZVxuICAgICAgICAvLyByZWFkLlxuICAgICAgICBkaWFnbm9zdGljcy5wdXNoKGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYocmVmLm5vZGUsIGRlY2wsICdleHBvcnQnKSk7XG4gICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuXG4gICAgICAgIGlmIChleHBvcnRTY29wZSA9PT0gJ2ludmFsaWQnKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZXhwb3J0U2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhbiBOZ01vZHVsZS5cbiAgICAgICAgZm9yIChjb25zdCBkaXJlY3RpdmUgb2YgZXhwb3J0U2NvcGUuZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRpcmVjdGl2ZS5yZWYubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IHBpcGUgb2YgZXhwb3J0U2NvcGUuZXhwb3J0ZWQucGlwZXMpIHtcbiAgICAgICAgICBleHBvcnRQaXBlcy5zZXQocGlwZS5yZWYubm9kZSwgcGlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBleHBvcnRlZE1vZHVsZSBvZiBleHBvcnRTY29wZS5leHBvcnRlZC5uZ01vZHVsZXMpIHtcbiAgICAgICAgICBleHBvcnRlZE1vZHVsZXMuYWRkKGV4cG9ydGVkTW9kdWxlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjb21waWxhdGlvbkRpcmVjdGl2ZXMuaGFzKGRlY2wubm9kZSkpIHtcbiAgICAgICAgLy8gZGVjbCBpcyBhIGRpcmVjdGl2ZSBvciBjb21wb25lbnQgaW4gdGhlIGNvbXBpbGF0aW9uIHNjb3BlIG9mIHRoaXMgTmdNb2R1bGUuXG4gICAgICAgIGNvbnN0IGRpcmVjdGl2ZSA9IGNvbXBpbGF0aW9uRGlyZWN0aXZlcy5nZXQoZGVjbC5ub2RlKSE7XG4gICAgICAgIGV4cG9ydERpcmVjdGl2ZXMuc2V0KGRlY2wubm9kZSwgZGlyZWN0aXZlKTtcbiAgICAgIH0gZWxzZSBpZiAoY29tcGlsYXRpb25QaXBlcy5oYXMoZGVjbC5ub2RlKSkge1xuICAgICAgICAvLyBkZWNsIGlzIGEgcGlwZSBpbiB0aGUgY29tcGlsYXRpb24gc2NvcGUgb2YgdGhpcyBOZ01vZHVsZS5cbiAgICAgICAgY29uc3QgcGlwZSA9IGNvbXBpbGF0aW9uUGlwZXMuZ2V0KGRlY2wubm9kZSkhO1xuICAgICAgICBleHBvcnRQaXBlcy5zZXQoZGVjbC5ub2RlLCBwaXBlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGRlY2wgaXMgYW4gdW5rbm93biBleHBvcnQuXG4gICAgICAgIGlmICh0aGlzLmxvY2FsUmVhZGVyLmdldERpcmVjdGl2ZU1ldGFkYXRhKGRlY2wpICE9PSBudWxsIHx8XG4gICAgICAgICAgICB0aGlzLmxvY2FsUmVhZGVyLmdldFBpcGVNZXRhZGF0YShkZWNsKSAhPT0gbnVsbCkge1xuICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goaW52YWxpZFJlZXhwb3J0KHJlZi5ub2RlLCBkZWNsKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGlhZ25vc3RpY3MucHVzaChpbnZhbGlkUmVmKHJlZi5ub2RlLCBkZWNsLCAnZXhwb3J0JykpO1xuICAgICAgICB9XG4gICAgICAgIGlzUG9pc29uZWQgPSB0cnVlO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRlZDogU2NvcGVEYXRhID0ge1xuICAgICAgZGlyZWN0aXZlczogQXJyYXkuZnJvbShleHBvcnREaXJlY3RpdmVzLnZhbHVlcygpKSxcbiAgICAgIHBpcGVzOiBBcnJheS5mcm9tKGV4cG9ydFBpcGVzLnZhbHVlcygpKSxcbiAgICAgIG5nTW9kdWxlczogQXJyYXkuZnJvbShleHBvcnRlZE1vZHVsZXMpLFxuICAgICAgaXNQb2lzb25lZCxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVleHBvcnRzID0gdGhpcy5nZXRSZWV4cG9ydHMobmdNb2R1bGUsIHJlZiwgZGVjbGFyZWQsIGV4cG9ydGVkLCBkaWFnbm9zdGljcyk7XG5cblxuICAgIC8vIEZpbmFsbHksIHByb2R1Y2UgdGhlIGBMb2NhbE1vZHVsZVNjb3BlYCB3aXRoIGJvdGggdGhlIGNvbXBpbGF0aW9uIGFuZCBleHBvcnQgc2NvcGVzLlxuICAgIGNvbnN0IHNjb3BlOiBMb2NhbE1vZHVsZVNjb3BlID0ge1xuICAgICAgbmdNb2R1bGU6IG5nTW9kdWxlLnJlZi5ub2RlLFxuICAgICAgY29tcGlsYXRpb246IHtcbiAgICAgICAgZGlyZWN0aXZlczogQXJyYXkuZnJvbShjb21waWxhdGlvbkRpcmVjdGl2ZXMudmFsdWVzKCkpLFxuICAgICAgICBwaXBlczogQXJyYXkuZnJvbShjb21waWxhdGlvblBpcGVzLnZhbHVlcygpKSxcbiAgICAgICAgbmdNb2R1bGVzOiBBcnJheS5mcm9tKGNvbXBpbGF0aW9uTW9kdWxlcyksXG4gICAgICAgIGlzUG9pc29uZWQsXG4gICAgICB9LFxuICAgICAgZXhwb3J0ZWQsXG4gICAgICByZWV4cG9ydHMsXG4gICAgICBzY2hlbWFzOiBuZ01vZHVsZS5zY2hlbWFzLFxuICAgIH07XG5cbiAgICAvLyBDaGVjayBpZiB0aGlzIHNjb3BlIGhhZCBhbnkgZXJyb3JzIGR1cmluZyBwcm9kdWN0aW9uLlxuICAgIGlmIChkaWFnbm9zdGljcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBTYXZlIHRoZSBlcnJvcnMgZm9yIHJldHJpZXZhbC5cbiAgICAgIHRoaXMuc2NvcGVFcnJvcnMuc2V0KHJlZi5ub2RlLCBkaWFnbm9zdGljcyk7XG5cbiAgICAgIC8vIE1hcmsgdGhpcyBtb2R1bGUgYXMgYmVpbmcgdGFpbnRlZC5cbiAgICAgIHRoaXMubW9kdWxlc1dpdGhTdHJ1Y3R1cmFsRXJyb3JzLmFkZChyZWYubm9kZSk7XG4gICAgfVxuXG4gICAgdGhpcy5jYWNoZS5zZXQocmVmLm5vZGUsIHNjb3BlKTtcbiAgICByZXR1cm4gc2NvcGU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciBhIGNvbXBvbmVudCByZXF1aXJlcyByZW1vdGUgc2NvcGluZy5cbiAgICovXG4gIGdldFJlbW90ZVNjb3BlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24pOiBSZW1vdGVTY29wZXxudWxsIHtcbiAgICByZXR1cm4gdGhpcy5yZW1vdGVTY29waW5nLmhhcyhub2RlKSA/IHRoaXMucmVtb3RlU2NvcGluZy5nZXQobm9kZSkhIDogbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgYSBjb21wb25lbnQgYXMgcmVxdWlyaW5nIHJlbW90ZSBzY29waW5nLCB3aXRoIHRoZSBnaXZlbiBkaXJlY3RpdmVzIGFuZCBwaXBlcyB0byBiZVxuICAgKiByZWdpc3RlcmVkIHJlbW90ZWx5LlxuICAgKi9cbiAgc2V0Q29tcG9uZW50UmVtb3RlU2NvcGUobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGlyZWN0aXZlczogUmVmZXJlbmNlW10sIHBpcGVzOiBSZWZlcmVuY2VbXSk6XG4gICAgICB2b2lkIHtcbiAgICB0aGlzLnJlbW90ZVNjb3Bpbmcuc2V0KG5vZGUsIHtkaXJlY3RpdmVzLCBwaXBlc30pO1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgdXAgdGhlIGBFeHBvcnRTY29wZWAgb2YgYSBnaXZlbiBgUmVmZXJlbmNlYCB0byBhbiBOZ01vZHVsZS5cbiAgICpcbiAgICogVGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uIG1heSBiZSBkZWNsYXJlZCBsb2NhbGx5IGluIHRoZSBjdXJyZW50IHRzLlByb2dyYW0sIG9yIGl0IG1heSBiZVxuICAgKiBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuXG4gICAqXG4gICAqIEByZXR1cm5zIGBudWxsYCBpZiBubyBzY29wZSBjb3VsZCBiZSBmb3VuZCwgb3IgYCdpbnZhbGlkJ2AgaWYgdGhlIGBSZWZlcmVuY2VgIGlzIG5vdCBhIHZhbGlkXG4gICAqICAgICBOZ01vZHVsZS5cbiAgICpcbiAgICogTWF5IGFsc28gY29udHJpYnV0ZSBkaWFnbm9zdGljcyBvZiBpdHMgb3duIGJ5IGFkZGluZyB0byB0aGUgZ2l2ZW4gYGRpYWdub3N0aWNzYFxuICAgKiBhcnJheSBwYXJhbWV0ZXIuXG4gICAqL1xuICBwcml2YXRlIGdldEV4cG9ydGVkU2NvcGUoXG4gICAgICByZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPiwgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSxcbiAgICAgIG93bmVyRm9yRXJyb3JzOiBEZWNsYXJhdGlvbk5vZGUsIHR5cGU6ICdpbXBvcnQnfCdleHBvcnQnKTogRXhwb3J0U2NvcGV8bnVsbHwnaW52YWxpZCcge1xuICAgIGlmIChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgIC8vIFRoZSBOZ01vZHVsZSBpcyBkZWNsYXJlZCBpbiBhIC5kLnRzIGZpbGUuIFJlc29sdmUgaXQgd2l0aCB0aGUgYERlcGVuZGVuY3lTY29wZVJlYWRlcmAuXG4gICAgICBpZiAoIXRzLmlzQ2xhc3NEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGluIGEgLmQudHMgZmlsZSBidXQgaXMgbm90IGRlY2xhcmVkIGFzIGEgdHMuQ2xhc3NEZWNsYXJhdGlvbi4gVGhpcyBpcyBhblxuICAgICAgICAvLyBlcnJvciBpbiB0aGUgLmQudHMgbWV0YWRhdGEuXG4gICAgICAgIGNvbnN0IGNvZGUgPSB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChtYWtlRGlhZ25vc3RpYyhcbiAgICAgICAgICAgIGNvZGUsIGlkZW50aWZpZXJPZk5vZGUocmVmLm5vZGUpIHx8IHJlZi5ub2RlLFxuICAgICAgICAgICAgYEFwcGVhcnMgaW4gdGhlIE5nTW9kdWxlLiR7dHlwZX1zIG9mICR7XG4gICAgICAgICAgICAgICAgbm9kZU5hbWVGb3JFcnJvcihvd25lckZvckVycm9ycyl9LCBidXQgY291bGQgbm90IGJlIHJlc29sdmVkIHRvIGFuIE5nTW9kdWxlYCkpO1xuICAgICAgICByZXR1cm4gJ2ludmFsaWQnO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeVNjb3BlUmVhZGVyLnJlc29sdmUocmVmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIE5nTW9kdWxlIGlzIGRlY2xhcmVkIGxvY2FsbHkgaW4gdGhlIGN1cnJlbnQgcHJvZ3JhbS4gUmVzb2x2ZSBpdCBmcm9tIHRoZSByZWdpc3RyeS5cbiAgICAgIHJldHVybiB0aGlzLmdldFNjb3BlT2ZNb2R1bGVSZWZlcmVuY2UocmVmKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldFJlZXhwb3J0cyhcbiAgICAgIG5nTW9kdWxlOiBOZ01vZHVsZU1ldGEsIHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+LCBkZWNsYXJlZDogU2V0PERlY2xhcmF0aW9uTm9kZT4sXG4gICAgICBleHBvcnRlZDoge2RpcmVjdGl2ZXM6IERpcmVjdGl2ZU1ldGFbXSwgcGlwZXM6IFBpcGVNZXRhW119LFxuICAgICAgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSk6IFJlZXhwb3J0W118bnVsbCB7XG4gICAgbGV0IHJlZXhwb3J0czogUmVleHBvcnRbXXxudWxsID0gbnVsbDtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gcmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuICAgIGlmICh0aGlzLmFsaWFzaW5nSG9zdCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJlZXhwb3J0cyA9IFtdO1xuICAgIC8vIFRyYWNrIHJlLWV4cG9ydHMgYnkgc3ltYm9sIG5hbWUsIHRvIHByb2R1Y2UgZGlhZ25vc3RpY3MgaWYgdHdvIGFsaWFzIHJlLWV4cG9ydHMgd291bGQgc2hhcmVcbiAgICAvLyB0aGUgc2FtZSBuYW1lLlxuICAgIGNvbnN0IHJlZXhwb3J0TWFwID0gbmV3IE1hcDxzdHJpbmcsIFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcbiAgICAvLyBBbGlhcyBuZ01vZHVsZVJlZiBhZGRlZCBmb3IgcmVhZGFiaWxpdHkgYmVsb3cuXG4gICAgY29uc3QgbmdNb2R1bGVSZWYgPSByZWY7XG4gICAgY29uc3QgYWRkUmVleHBvcnQgPSAoZXhwb3J0UmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pID0+IHtcbiAgICAgIGlmIChleHBvcnRSZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkgPT09IHNvdXJjZUZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaXNSZUV4cG9ydCA9ICFkZWNsYXJlZC5oYXMoZXhwb3J0UmVmLm5vZGUpO1xuICAgICAgY29uc3QgZXhwb3J0TmFtZSA9IHRoaXMuYWxpYXNpbmdIb3N0IS5tYXliZUFsaWFzU3ltYm9sQXMoXG4gICAgICAgICAgZXhwb3J0UmVmLCBzb3VyY2VGaWxlLCBuZ01vZHVsZS5yZWYubm9kZS5uYW1lLnRleHQsIGlzUmVFeHBvcnQpO1xuICAgICAgaWYgKGV4cG9ydE5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFyZWV4cG9ydE1hcC5oYXMoZXhwb3J0TmFtZSkpIHtcbiAgICAgICAgaWYgKGV4cG9ydFJlZi5hbGlhcyAmJiBleHBvcnRSZWYuYWxpYXMgaW5zdGFuY2VvZiBFeHRlcm5hbEV4cHIpIHtcbiAgICAgICAgICByZWV4cG9ydHMhLnB1c2goe1xuICAgICAgICAgICAgZnJvbU1vZHVsZTogZXhwb3J0UmVmLmFsaWFzLnZhbHVlLm1vZHVsZU5hbWUhLFxuICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwb3J0UmVmLmFsaWFzLnZhbHVlLm5hbWUhLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBleHByID1cbiAgICAgICAgICAgICAgdGhpcy5yZWZFbWl0dGVyLmVtaXQoZXhwb3J0UmVmLmNsb25lV2l0aE5vSWRlbnRpZmllcnMoKSwgc291cmNlRmlsZSkuZXhwcmVzc2lvbjtcbiAgICAgICAgICBpZiAoIShleHByIGluc3RhbmNlb2YgRXh0ZXJuYWxFeHByKSB8fCBleHByLnZhbHVlLm1vZHVsZU5hbWUgPT09IG51bGwgfHxcbiAgICAgICAgICAgICAgZXhwci52YWx1ZS5uYW1lID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4cGVjdGVkIEV4dGVybmFsRXhwcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZWV4cG9ydHMhLnB1c2goe1xuICAgICAgICAgICAgZnJvbU1vZHVsZTogZXhwci52YWx1ZS5tb2R1bGVOYW1lLFxuICAgICAgICAgICAgc3ltYm9sTmFtZTogZXhwci52YWx1ZS5uYW1lLFxuICAgICAgICAgICAgYXNBbGlhczogZXhwb3J0TmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZWV4cG9ydE1hcC5zZXQoZXhwb3J0TmFtZSwgZXhwb3J0UmVmKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEFub3RoZXIgcmUtZXhwb3J0IGFscmVhZHkgdXNlZCB0aGlzIG5hbWUuIFByb2R1Y2UgYSBkaWFnbm9zdGljLlxuICAgICAgICBjb25zdCBwcmV2UmVmID0gcmVleHBvcnRNYXAuZ2V0KGV4cG9ydE5hbWUpITtcbiAgICAgICAgZGlhZ25vc3RpY3MucHVzaChyZWV4cG9ydENvbGxpc2lvbihuZ01vZHVsZVJlZi5ub2RlLCBwcmV2UmVmLCBleHBvcnRSZWYpKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGZvciAoY29uc3Qge3JlZn0gb2YgZXhwb3J0ZWQuZGlyZWN0aXZlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCB7cmVmfSBvZiBleHBvcnRlZC5waXBlcykge1xuICAgICAgYWRkUmVleHBvcnQocmVmKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlZXhwb3J0cztcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0Q29sbGVjdGluZygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZWFsZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uOiBMb2NhbE1vZHVsZVNjb3BlUmVnaXN0cnkgaXMgbm90IENPTExFQ1RJTkdgKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhbiBpbnZhbGlkIGltcG9ydCBvciBleHBvcnQgZnJvbSBhbiBOZ01vZHVsZS5cbiAqL1xuZnVuY3Rpb24gaW52YWxpZFJlZihcbiAgICBjbGF6ejogRGVjbGFyYXRpb25Ob2RlLCBkZWNsOiBSZWZlcmVuY2U8RGVjbGFyYXRpb25Ob2RlPixcbiAgICB0eXBlOiAnaW1wb3J0J3wnZXhwb3J0Jyk6IHRzLkRpYWdub3N0aWMge1xuICBjb25zdCBjb2RlID1cbiAgICAgIHR5cGUgPT09ICdpbXBvcnQnID8gRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfSU1QT1JUIDogRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfRVhQT1JUO1xuICBjb25zdCByZXNvbHZlVGFyZ2V0ID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnTmdNb2R1bGUnIDogJ05nTW9kdWxlLCBDb21wb25lbnQsIERpcmVjdGl2ZSwgb3IgUGlwZSc7XG4gIGxldCBtZXNzYWdlID1cbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke1xuICAgICAgICAgIG5vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGNvdWxkIG5vdCBiZSByZXNvbHZlZCB0byBhbiAke3Jlc29sdmVUYXJnZXR9IGNsYXNzLmAgK1xuICAgICAgJ1xcblxcbic7XG4gIGNvbnN0IGxpYnJhcnkgPSBkZWNsLm93bmVkQnlNb2R1bGVHdWVzcyAhPT0gbnVsbCA/IGAgKCR7ZGVjbC5vd25lZEJ5TW9kdWxlR3Vlc3N9KWAgOiAnJztcbiAgY29uc3Qgc2YgPSBkZWNsLm5vZGUuZ2V0U291cmNlRmlsZSgpO1xuXG4gIC8vIFByb3ZpZGUgZXh0cmEgY29udGV4dCB0byB0aGUgZXJyb3IgZm9yIHRoZSB1c2VyLlxuICBpZiAoIXNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgLy8gVGhpcyBpcyBhIGZpbGUgaW4gdGhlIHVzZXIncyBwcm9ncmFtLlxuICAgIGNvbnN0IGFubm90YXRpb25UeXBlID0gdHlwZSA9PT0gJ2ltcG9ydCcgPyAnQE5nTW9kdWxlJyA6ICdBbmd1bGFyJztcbiAgICBtZXNzYWdlICs9IGBJcyBpdCBtaXNzaW5nIGFuICR7YW5ub3RhdGlvblR5cGV9IGFubm90YXRpb24/YDtcbiAgfSBlbHNlIGlmIChzZi5maWxlTmFtZS5pbmRleE9mKCdub2RlX21vZHVsZXMnKSAhPT0gLTEpIHtcbiAgICAvLyBUaGlzIGZpbGUgY29tZXMgZnJvbSBhIHRoaXJkLXBhcnR5IGxpYnJhcnkgaW4gbm9kZV9tb2R1bGVzLlxuICAgIG1lc3NhZ2UgKz1cbiAgICAgICAgYFRoaXMgbGlrZWx5IG1lYW5zIHRoYXQgdGhlIGxpYnJhcnkke2xpYnJhcnl9IHdoaWNoIGRlY2xhcmVzICR7ZGVjbC5kZWJ1Z05hbWV9IGhhcyBub3QgYCArXG4gICAgICAgICdiZWVuIHByb2Nlc3NlZCBjb3JyZWN0bHkgYnkgbmdjYywgb3IgaXMgbm90IGNvbXBhdGlibGUgd2l0aCBBbmd1bGFyIEl2eS4gQ2hlY2sgaWYgYSAnICtcbiAgICAgICAgJ25ld2VyIHZlcnNpb24gb2YgdGhlIGxpYnJhcnkgaXMgYXZhaWxhYmxlLCBhbmQgdXBkYXRlIGlmIHNvLiBBbHNvIGNvbnNpZGVyIGNoZWNraW5nICcgK1xuICAgICAgICAnd2l0aCB0aGUgbGlicmFyeVxcJ3MgYXV0aG9ycyB0byBzZWUgaWYgdGhlIGxpYnJhcnkgaXMgZXhwZWN0ZWQgdG8gYmUgY29tcGF0aWJsZSB3aXRoIEl2eS4nO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaXMgYSBtb25vcmVwbyBzdHlsZSBsb2NhbCBkZXBlbmRlbmN5LiBVbmZvcnR1bmF0ZWx5IHRoZXNlIGFyZSB0b28gZGlmZmVyZW50IHRvIHJlYWxseVxuICAgIC8vIG9mZmVyIG11Y2ggbW9yZcKgYWR2aWNlIHRoYW4gdGhpcy5cbiAgICBtZXNzYWdlICs9IGBUaGlzIGxpa2VseSBtZWFucyB0aGF0IHRoZSBkZXBlbmRlbmN5JHtsaWJyYXJ5fSB3aGljaCBkZWNsYXJlcyAke1xuICAgICAgICBkZWNsLmRlYnVnTmFtZX0gaGFzIG5vdCBiZWVuIHByb2Nlc3NlZCBjb3JyZWN0bHkgYnkgbmdjYy5gO1xuICB9XG5cbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKGNvZGUsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsIG1lc3NhZ2UpO1xufVxuXG4vKipcbiAqIFByb2R1Y2UgYSBgdHMuRGlhZ25vc3RpY2AgZm9yIGFuIGltcG9ydCBvciBleHBvcnQgd2hpY2ggaXRzZWxmIGhhcyBlcnJvcnMuXG4gKi9cbmZ1bmN0aW9uIGludmFsaWRUcmFuc2l0aXZlTmdNb2R1bGVSZWYoXG4gICAgY2xheno6IERlY2xhcmF0aW9uTm9kZSwgZGVjbDogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT4sXG4gICAgdHlwZTogJ2ltcG9ydCd8J2V4cG9ydCcpOiB0cy5EaWFnbm9zdGljIHtcbiAgY29uc3QgY29kZSA9XG4gICAgICB0eXBlID09PSAnaW1wb3J0JyA/IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0lNUE9SVCA6IEVycm9yQ29kZS5OR01PRFVMRV9JTlZBTElEX0VYUE9SVDtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgY29kZSwgaWRlbnRpZmllck9mTm9kZShkZWNsLm5vZGUpIHx8IGRlY2wubm9kZSxcbiAgICAgIGBBcHBlYXJzIGluIHRoZSBOZ01vZHVsZS4ke3R5cGV9cyBvZiAke25vZGVOYW1lRm9yRXJyb3IoY2xhenopfSwgYnV0IGl0c2VsZiBoYXMgZXJyb3JzYCk7XG59XG5cbi8qKlxuICogUHJvZHVjZSBhIGB0cy5EaWFnbm9zdGljYCBmb3IgYW4gZXhwb3J0ZWQgZGlyZWN0aXZlIG9yIHBpcGUgd2hpY2ggd2FzIG5vdCBkZWNsYXJlZCBvciBpbXBvcnRlZFxuICogYnkgdGhlIE5nTW9kdWxlIGluIHF1ZXN0aW9uLlxuICovXG5mdW5jdGlvbiBpbnZhbGlkUmVleHBvcnQoY2xheno6IERlY2xhcmF0aW9uTm9kZSwgZGVjbDogUmVmZXJlbmNlPERlY2xhcmF0aW9uTm9kZT4pOiB0cy5EaWFnbm9zdGljIHtcbiAgcmV0dXJuIG1ha2VEaWFnbm9zdGljKFxuICAgICAgRXJyb3JDb2RlLk5HTU9EVUxFX0lOVkFMSURfUkVFWFBPUlQsIGlkZW50aWZpZXJPZk5vZGUoZGVjbC5ub2RlKSB8fCBkZWNsLm5vZGUsXG4gICAgICBgUHJlc2VudCBpbiB0aGUgTmdNb2R1bGUuZXhwb3J0cyBvZiAke1xuICAgICAgICAgIG5vZGVOYW1lRm9yRXJyb3IoY2xhenopfSBidXQgbmVpdGhlciBkZWNsYXJlZCBub3IgaW1wb3J0ZWRgKTtcbn1cblxuLyoqXG4gKiBQcm9kdWNlIGEgYHRzLkRpYWdub3N0aWNgIGZvciBhIGNvbGxpc2lvbiBpbiByZS1leHBvcnQgbmFtZXMgYmV0d2VlbiB0d28gZGlyZWN0aXZlcy9waXBlcy5cbiAqL1xuZnVuY3Rpb24gcmVleHBvcnRDb2xsaXNpb24oXG4gICAgbW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uLCByZWZBOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4sXG4gICAgcmVmQjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogdHMuRGlhZ25vc3RpYyB7XG4gIGNvbnN0IGNoaWxkTWVzc2FnZVRleHQgPSBgVGhpcyBkaXJlY3RpdmUvcGlwZSBpcyBwYXJ0IG9mIHRoZSBleHBvcnRzIG9mICcke1xuICAgICAgbW9kdWxlLm5hbWUudGV4dH0nIGFuZCBzaGFyZXMgdGhlIHNhbWUgbmFtZSBhcyBhbm90aGVyIGV4cG9ydGVkIGRpcmVjdGl2ZS9waXBlLmA7XG4gIHJldHVybiBtYWtlRGlhZ25vc3RpYyhcbiAgICAgIEVycm9yQ29kZS5OR01PRFVMRV9SRUVYUE9SVF9OQU1FX0NPTExJU0lPTiwgbW9kdWxlLm5hbWUsXG4gICAgICBgXG4gICAgVGhlcmUgd2FzIGEgbmFtZSBjb2xsaXNpb24gYmV0d2VlbiB0d28gY2xhc3NlcyBuYW1lZCAnJHtcbiAgICAgICAgICByZWZBLm5vZGUubmFtZS50ZXh0fScsIHdoaWNoIGFyZSBib3RoIHBhcnQgb2YgdGhlIGV4cG9ydHMgb2YgJyR7bW9kdWxlLm5hbWUudGV4dH0nLlxuXG4gICAgQW5ndWxhciBnZW5lcmF0ZXMgcmUtZXhwb3J0cyBvZiBhbiBOZ01vZHVsZSdzIGV4cG9ydGVkIGRpcmVjdGl2ZXMvcGlwZXMgZnJvbSB0aGUgbW9kdWxlJ3Mgc291cmNlIGZpbGUgaW4gY2VydGFpbiBjYXNlcywgdXNpbmcgdGhlIGRlY2xhcmVkIG5hbWUgb2YgdGhlIGNsYXNzLiBJZiB0d28gY2xhc3NlcyBvZiB0aGUgc2FtZSBuYW1lIGFyZSBleHBvcnRlZCwgdGhpcyBhdXRvbWF0aWMgbmFtaW5nIGRvZXMgbm90IHdvcmsuXG5cbiAgICBUbyBmaXggdGhpcyBwcm9ibGVtIHBsZWFzZSByZS1leHBvcnQgb25lIG9yIGJvdGggY2xhc3NlcyBkaXJlY3RseSBmcm9tIHRoaXMgZmlsZS5cbiAgYC50cmltKCksXG4gICAgICBbXG4gICAgICAgIG1ha2VSZWxhdGVkSW5mb3JtYXRpb24ocmVmQS5ub2RlLm5hbWUsIGNoaWxkTWVzc2FnZVRleHQpLFxuICAgICAgICBtYWtlUmVsYXRlZEluZm9ybWF0aW9uKHJlZkIubm9kZS5uYW1lLCBjaGlsZE1lc3NhZ2VUZXh0KSxcbiAgICAgIF0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERlY2xhcmF0aW9uRGF0YSB7XG4gIG5nTW9kdWxlOiBDbGFzc0RlY2xhcmF0aW9uO1xuICByZWY6IFJlZmVyZW5jZTtcbiAgcmF3RGVjbGFyYXRpb25zOiB0cy5FeHByZXNzaW9ufG51bGw7XG59XG4iXX0=