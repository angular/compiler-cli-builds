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
        define("@angular/compiler-cli/src/ngtsc/imports/src/emitter", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/imports/src/find_export", "@angular/compiler-cli/src/ngtsc/imports/src/references"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_2 = require("@angular/compiler/src/compiler");
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var find_export_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/find_export");
    var references_1 = require("@angular/compiler-cli/src/ngtsc/imports/src/references");
    /**
     * Generates `Expression`s which refer to `Reference`s in a given context.
     *
     * A `ReferenceEmitter` uses one or more `ReferenceEmitStrategy` implementations to produce a
     * an `Expression` which refers to a `Reference` in the context of a particular file.
     */
    var ReferenceEmitter = /** @class */ (function () {
        function ReferenceEmitter(strategies) {
            this.strategies = strategies;
        }
        ReferenceEmitter.prototype.emit = function (ref, context, importMode) {
            if (importMode === void 0) { importMode = references_1.ImportMode.UseExistingImport; }
            var e_1, _a;
            try {
                for (var _b = tslib_1.__values(this.strategies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var strategy = _c.value;
                    var emitted = strategy.emit(ref, context, importMode);
                    if (emitted !== null) {
                        return emitted;
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
            throw new Error("Unable to write a reference to " + typescript_1.nodeNameForError(ref.node) + " in " + ref.node.getSourceFile().fileName + " from " + context.fileName);
        };
        return ReferenceEmitter;
    }());
    exports.ReferenceEmitter = ReferenceEmitter;
    /**
     * A `ReferenceEmitStrategy` which will refer to declarations by any local `ts.Identifier`s, if
     * such identifiers are available.
     */
    var LocalIdentifierStrategy = /** @class */ (function () {
        function LocalIdentifierStrategy() {
        }
        LocalIdentifierStrategy.prototype.emit = function (ref, context, importMode) {
            // If the emitter has specified ForceNewImport, then LocalIdentifierStrategy should not use a
            // local identifier at all, *except* in the source file where the node is actually declared.
            if (importMode === references_1.ImportMode.ForceNewImport &&
                typescript_1.getSourceFile(ref.node) !== typescript_1.getSourceFile(context)) {
                return null;
            }
            // A Reference can have multiple identities in different files, so it may already have an
            // Identifier in the requested context file.
            var identifier = ref.getIdentityIn(context);
            if (identifier !== null) {
                return new compiler_1.WrappedNodeExpr(identifier);
            }
            else {
                return null;
            }
        };
        return LocalIdentifierStrategy;
    }());
    exports.LocalIdentifierStrategy = LocalIdentifierStrategy;
    /**
     * A `ReferenceEmitStrategy` which will refer to declarations that come from `node_modules` using
     * an absolute import.
     *
     * Part of this strategy involves looking at the target entry point and identifying the exported
     * name of the targeted declaration, as it might be different from the declared name (e.g. a
     * directive might be declared as FooDirImpl, but exported as FooDir). If no export can be found
     * which maps back to the original directive, an error is thrown.
     */
    var AbsoluteModuleStrategy = /** @class */ (function () {
        function AbsoluteModuleStrategy(program, checker, options, host) {
            this.program = program;
            this.checker = checker;
            this.options = options;
            this.host = host;
            /**
             * A cache of the exports of specific modules, because resolving a module to its exports is a
             * costly operation.
             */
            this.moduleExportsCache = new Map();
        }
        AbsoluteModuleStrategy.prototype.emit = function (ref, context, importMode) {
            if (ref.bestGuessOwningModule === null) {
                // There is no module name available for this Reference, meaning it was arrived at via a
                // relative path.
                return null;
            }
            else if (!typescript_1.isDeclaration(ref.node)) {
                // It's not possible to import something which isn't a declaration.
                throw new Error('Debug assert: importing a Reference to non-declaration?');
            }
            // Try to find the exported name of the declaration, if one is available.
            var _a = ref.bestGuessOwningModule, specifier = _a.specifier, resolutionContext = _a.resolutionContext;
            var symbolName = this.resolveImportName(specifier, ref.node, resolutionContext);
            if (symbolName === null) {
                // TODO(alxhub): make this error a ts.Diagnostic pointing at whatever caused this import to be
                // triggered.
                throw new Error("Symbol " + ref.debugName + " declared in " + typescript_1.getSourceFile(ref.node).fileName + " is not exported from " + specifier + " (import into " + context.fileName + ")");
            }
            return new compiler_1.ExternalExpr(new compiler_2.ExternalReference(specifier, symbolName));
        };
        AbsoluteModuleStrategy.prototype.resolveImportName = function (moduleName, target, fromFile) {
            var exports = this.getExportsOfModule(moduleName, fromFile);
            if (exports !== null && exports.has(target)) {
                return exports.get(target);
            }
            else {
                return null;
            }
        };
        AbsoluteModuleStrategy.prototype.getExportsOfModule = function (moduleName, fromFile) {
            if (!this.moduleExportsCache.has(moduleName)) {
                this.moduleExportsCache.set(moduleName, this.enumerateExportsOfModule(moduleName, fromFile));
            }
            return this.moduleExportsCache.get(moduleName);
        };
        AbsoluteModuleStrategy.prototype.enumerateExportsOfModule = function (specifier, fromFile) {
            var e_2, _a;
            // First, resolve the module specifier to its entry point, and get the ts.Symbol for it.
            var resolved = ts.resolveModuleName(specifier, fromFile, this.options, this.host);
            if (resolved.resolvedModule === undefined) {
                return null;
            }
            var entryPointFile = this.program.getSourceFile(resolved.resolvedModule.resolvedFileName);
            if (entryPointFile === undefined) {
                return null;
            }
            var entryPointSymbol = this.checker.getSymbolAtLocation(entryPointFile);
            if (entryPointSymbol === undefined) {
                return null;
            }
            // Next, build a Map of all the ts.Declarations exported via the specifier and their exported
            // names.
            var exportMap = new Map();
            var exports = this.checker.getExportsOfModule(entryPointSymbol);
            try {
                for (var exports_1 = tslib_1.__values(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                    var expSymbol = exports_1_1.value;
                    // Resolve export symbols to their actual declarations.
                    var declSymbol = expSymbol.flags & ts.SymbolFlags.Alias ?
                        this.checker.getAliasedSymbol(expSymbol) :
                        expSymbol;
                    // At this point the valueDeclaration of the symbol should be defined.
                    var decl = declSymbol.valueDeclaration;
                    if (decl === undefined) {
                        continue;
                    }
                    // Prefer importing the symbol via its declared name, but take any export of it otherwise.
                    if (declSymbol.name === expSymbol.name || !exportMap.has(decl)) {
                        exportMap.set(decl, expSymbol.name);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return exportMap;
        };
        return AbsoluteModuleStrategy;
    }());
    exports.AbsoluteModuleStrategy = AbsoluteModuleStrategy;
    /**
     * A `ReferenceEmitStrategy` which will refer to declarations via relative paths, provided they're
     * both in the logical project "space" of paths.
     *
     * This is trickier than it sounds, as the two files may be in different root directories in the
     * project. Simply calculating a file system relative path between the two is not sufficient.
     * Instead, `LogicalProjectPath`s are used.
     */
    var LogicalProjectStrategy = /** @class */ (function () {
        function LogicalProjectStrategy(checker, logicalFs) {
            this.checker = checker;
            this.logicalFs = logicalFs;
        }
        LogicalProjectStrategy.prototype.emit = function (ref, context) {
            var destSf = typescript_1.getSourceFile(ref.node);
            // Compute the relative path from the importing file to the file being imported. This is done
            // as a logical path computation, because the two files might be in different rootDirs.
            var destPath = this.logicalFs.logicalPathOfSf(destSf);
            if (destPath === null) {
                // The imported file is not within the logical project filesystem.
                return null;
            }
            var originPath = this.logicalFs.logicalPathOfSf(context);
            if (originPath === null) {
                throw new Error("Debug assert: attempt to import from " + context.fileName + " but it's outside the program?");
            }
            // There's no way to emit a relative reference from a file to itself.
            if (destPath === originPath) {
                return null;
            }
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.checker);
            if (name === null) {
                // The target declaration isn't exported from the file it's declared in. This is an issue!
                return null;
            }
            // With both files expressed as LogicalProjectPaths, getting the module specifier as a relative
            // path is now straightforward.
            var moduleName = path_1.LogicalProjectPath.relativePathBetween(originPath, destPath);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return LogicalProjectStrategy;
    }());
    exports.LogicalProjectStrategy = LogicalProjectStrategy;
    /**
     * A `ReferenceEmitStrategy` which uses a `FileToModuleHost` to generate absolute import references.
     */
    var FileToModuleStrategy = /** @class */ (function () {
        function FileToModuleStrategy(checker, fileToModuleHost) {
            this.checker = checker;
            this.fileToModuleHost = fileToModuleHost;
        }
        FileToModuleStrategy.prototype.emit = function (ref, context) {
            var destSf = typescript_1.getSourceFile(ref.node);
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.checker);
            if (name === null) {
                return null;
            }
            var moduleName = this.fileToModuleHost.fileNameToModuleName(destSf.fileName, context.fileName);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return FileToModuleStrategy;
    }());
    exports.FileToModuleStrategy = FileToModuleStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEU7SUFDNUUsMkRBQWlFO0lBQ2pFLCtCQUFpQztJQUVqQyw2REFBaUU7SUFDakUsa0ZBQXlGO0lBRXpGLHVGQUFxRDtJQUNyRCxxRkFBbUQ7SUFxQ25EOzs7OztPQUtHO0lBQ0g7UUFDRSwwQkFBb0IsVUFBbUM7WUFBbkMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFBRyxDQUFDO1FBRTNELCtCQUFJLEdBQUosVUFDSSxHQUFjLEVBQUUsT0FBc0IsRUFDdEMsVUFBcUQ7WUFBckQsMkJBQUEsRUFBQSxhQUF5Qix1QkFBVSxDQUFDLGlCQUFpQjs7O2dCQUN2RCxLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbkMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFDeEQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO3dCQUNwQixPQUFPLE9BQU8sQ0FBQztxQkFDaEI7aUJBQ0Y7Ozs7Ozs7OztZQUNELE1BQU0sSUFBSSxLQUFLLENBQ1gsb0NBQWtDLDZCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsY0FBUyxPQUFPLENBQUMsUUFBVSxDQUFDLENBQUM7UUFDdkksQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWZELElBZUM7SUFmWSw0Q0FBZ0I7SUFpQjdCOzs7T0FHRztJQUNI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QUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVsRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFeHRlcm5hbFJlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0xvZ2ljYWxGaWxlU3lzdGVtLCBMb2dpY2FsUHJvamVjdFBhdGh9IGZyb20gJy4uLy4uL3BhdGgnO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlLCBpc0RlY2xhcmF0aW9uLCBub2RlTmFtZUZvckVycm9yfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlfSBmcm9tICcuL2ZpbmRfZXhwb3J0JztcbmltcG9ydCB7SW1wb3J0TW9kZSwgUmVmZXJlbmNlfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuXG4vKipcbiAqIEEgaG9zdCB3aGljaCBzdXBwb3J0cyBhbiBvcGVyYXRpb24gdG8gY29udmVydCBhIGZpbGUgbmFtZSBpbnRvIGEgbW9kdWxlIG5hbWUuXG4gKlxuICogVGhpcyBvcGVyYXRpb24gaXMgdHlwaWNhbGx5IGltcGxlbWVudGVkIGFzIHBhcnQgb2YgdGhlIGNvbXBpbGVyIGhvc3QgcGFzc2VkIHRvIG5ndHNjIHdoZW4gcnVubmluZ1xuICogdW5kZXIgYSBidWlsZCB0b29sIGxpa2UgQmF6ZWwgb3IgQmxhemUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVRvTW9kdWxlSG9zdCB7XG4gIGZpbGVOYW1lVG9Nb2R1bGVOYW1lKGltcG9ydGVkRmlsZVBhdGg6IHN0cmluZywgY29udGFpbmluZ0ZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBwYXJ0aWN1bGFyIHN0cmF0ZWd5IGZvciBnZW5lcmF0aW5nIGFuIGV4cHJlc3Npb24gd2hpY2ggcmVmZXJzIHRvIGEgYFJlZmVyZW5jZWAuXG4gKlxuICogVGhlcmUgYXJlIG1hbnkgcG90ZW50aWFsIHdheXMgYSBnaXZlbiBgUmVmZXJlbmNlYCBjb3VsZCBiZSByZWZlcnJlZCB0byBpbiB0aGUgY29udGV4dCBvZiBhIGdpdmVuXG4gKiBmaWxlLiBBIGxvY2FsIGRlY2xhcmF0aW9uIGNvdWxkIGJlIGF2YWlsYWJsZSwgdGhlIGBSZWZlcmVuY2VgIGNvdWxkIGJlIGltcG9ydGFibGUgdmlhIGEgcmVsYXRpdmVcbiAqIGltcG9ydCB3aXRoaW4gdGhlIHByb2plY3QsIG9yIGFuIGFic29sdXRlIGltcG9ydCBpbnRvIGBub2RlX21vZHVsZXNgIG1pZ2h0IGJlIG5lY2Vzc2FyeS5cbiAqXG4gKiBEaWZmZXJlbnQgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgaW1wbGVtZW50YXRpb25zIGltcGxlbWVudCBzcGVjaWZpYyBsb2dpYyBmb3IgZ2VuZXJhdGluZyBzdWNoXG4gKiByZWZlcmVuY2VzLiBBIHNpbmdsZSBzdHJhdGVneSAoc3VjaCBhcyB1c2luZyBhIGxvY2FsIGRlY2xhcmF0aW9uKSBtYXkgbm90IGFsd2F5cyBiZSBhYmxlIHRvXG4gKiBnZW5lcmF0ZSBhbiBleHByZXNzaW9uIGZvciBldmVyeSBgUmVmZXJlbmNlYCAoZm9yIGV4YW1wbGUsIGlmIG5vIGxvY2FsIGlkZW50aWZpZXIgaXMgYXZhaWxhYmxlKSxcbiAqIGFuZCBtYXkgcmV0dXJuIGBudWxsYCBpbiBzdWNoIGEgY2FzZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICAvKipcbiAgICogRW1pdCBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSBnaXZlbiBgUmVmZXJlbmNlYCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcnRpY3VsYXJcbiAgICogc291cmNlIGZpbGUsIGlmIHBvc3NpYmxlLlxuICAgKlxuICAgKiBAcGFyYW0gcmVmIHRoZSBgUmVmZXJlbmNlYCBmb3Igd2hpY2ggdG8gZ2VuZXJhdGUgYW4gZXhwcmVzc2lvblxuICAgKiBAcGFyYW0gY29udGV4dCB0aGUgc291cmNlIGZpbGUgaW4gd2hpY2ggdGhlIGBFeHByZXNzaW9uYCBtdXN0IGJlIHZhbGlkXG4gICAqIEBwYXJhbSBpbXBvcnRNb2RlIGEgZmxhZyB3aGljaCBjb250cm9scyB3aGV0aGVyIGltcG9ydHMgc2hvdWxkIGJlIGdlbmVyYXRlZCBvciBub3RcbiAgICogQHJldHVybnMgYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgYFJlZmVyZW5jZWAsIG9yIGBudWxsYCBpZiBub25lIGNhbiBiZSBnZW5lcmF0ZWRcbiAgICovXG4gIGVtaXQocmVmOiBSZWZlcmVuY2UsIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydE1vZGUpOiBFeHByZXNzaW9ufG51bGw7XG59XG5cbi8qKlxuICogR2VuZXJhdGVzIGBFeHByZXNzaW9uYHMgd2hpY2ggcmVmZXIgdG8gYFJlZmVyZW5jZWBzIGluIGEgZ2l2ZW4gY29udGV4dC5cbiAqXG4gKiBBIGBSZWZlcmVuY2VFbWl0dGVyYCB1c2VzIG9uZSBvciBtb3JlIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIGltcGxlbWVudGF0aW9ucyB0byBwcm9kdWNlIGFcbiAqIGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcnRpY3VsYXIgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN0cmF0ZWdpZXM6IFJlZmVyZW5jZUVtaXRTdHJhdGVneVtdKSB7fVxuXG4gIGVtaXQoXG4gICAgICByZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIGltcG9ydE1vZGU6IEltcG9ydE1vZGXCoD0gSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk6IEV4cHJlc3Npb24ge1xuICAgIGZvciAoY29uc3Qgc3RyYXRlZ3kgb2YgdGhpcy5zdHJhdGVnaWVzKSB7XG4gICAgICBjb25zdCBlbWl0dGVkID0gc3RyYXRlZ3kuZW1pdChyZWYsIGNvbnRleHQsIGltcG9ydE1vZGUpO1xuICAgICAgaWYgKGVtaXR0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFVuYWJsZSB0byB3cml0ZSBhIHJlZmVyZW5jZSB0byAke25vZGVOYW1lRm9yRXJyb3IocmVmLm5vZGUpfSBpbiAke3JlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0gZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIGJ5IGFueSBsb2NhbCBgdHMuSWRlbnRpZmllcmBzLCBpZlxuICogc3VjaCBpZGVudGlmaWVycyBhcmUgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBJZiB0aGUgZW1pdHRlciBoYXMgc3BlY2lmaWVkIEZvcmNlTmV3SW1wb3J0LCB0aGVuIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5IHNob3VsZCBub3QgdXNlIGFcbiAgICAvLyBsb2NhbCBpZGVudGlmaWVyIGF0IGFsbCwgKmV4Y2VwdCogaW4gdGhlIHNvdXJjZSBmaWxlIHdoZXJlIHRoZSBub2RlIGlzIGFjdHVhbGx5IGRlY2xhcmVkLlxuICAgIGlmIChpbXBvcnRNb2RlID09PSBJbXBvcnRNb2RlLkZvcmNlTmV3SW1wb3J0ICYmXG4gICAgICAgIGdldFNvdXJjZUZpbGUocmVmLm5vZGUpICE9PSBnZXRTb3VyY2VGaWxlKGNvbnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBBIFJlZmVyZW5jZSBjYW4gaGF2ZSBtdWx0aXBsZSBpZGVudGl0aWVzIGluIGRpZmZlcmVudCBmaWxlcywgc28gaXQgbWF5IGFscmVhZHkgaGF2ZSBhblxuICAgIC8vIElkZW50aWZpZXIgaW4gdGhlIHJlcXVlc3RlZCBjb250ZXh0IGZpbGUuXG4gICAgY29uc3QgaWRlbnRpZmllciA9IHJlZi5nZXRJZGVudGl0eUluKGNvbnRleHQpO1xuICAgIGlmIChpZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbmV3IFdyYXBwZWROb2RlRXhwcihpZGVudGlmaWVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB3aWxsIHJlZmVyIHRvIGRlY2xhcmF0aW9ucyB0aGF0IGNvbWUgZnJvbSBgbm9kZV9tb2R1bGVzYCB1c2luZ1xuICogYW4gYWJzb2x1dGUgaW1wb3J0LlxuICpcbiAqIFBhcnQgb2YgdGhpcyBzdHJhdGVneSBpbnZvbHZlcyBsb29raW5nIGF0IHRoZSB0YXJnZXQgZW50cnkgcG9pbnQgYW5kIGlkZW50aWZ5aW5nIHRoZSBleHBvcnRlZFxuICogbmFtZSBvZiB0aGUgdGFyZ2V0ZWQgZGVjbGFyYXRpb24sIGFzIGl0IG1pZ2h0IGJlIGRpZmZlcmVudCBmcm9tIHRoZSBkZWNsYXJlZCBuYW1lIChlLmcuIGFcbiAqIGRpcmVjdGl2ZSBtaWdodCBiZSBkZWNsYXJlZCBhcyBGb29EaXJJbXBsLCBidXQgZXhwb3J0ZWQgYXMgRm9vRGlyKS4gSWYgbm8gZXhwb3J0IGNhbiBiZSBmb3VuZFxuICogd2hpY2ggbWFwcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBkaXJlY3RpdmUsIGFuIGVycm9yIGlzIHRocm93bi5cbiAqL1xuZXhwb3J0IGNsYXNzIEFic29sdXRlTW9kdWxlU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICAvKipcbiAgICogQSBjYWNoZSBvZiB0aGUgZXhwb3J0cyBvZiBzcGVjaWZpYyBtb2R1bGVzLCBiZWNhdXNlIHJlc29sdmluZyBhIG1vZHVsZSB0byBpdHMgZXhwb3J0cyBpcyBhXG4gICAqIGNvc3RseSBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIG1vZHVsZUV4cG9ydHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcHJvZ3JhbTogdHMuUHJvZ3JhbSwgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByaXZhdGUgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcml2YXRlIGhvc3Q6IHRzLkNvbXBpbGVySG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBpZiAocmVmLmJlc3RHdWVzc093bmluZ01vZHVsZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUgaXMgbm8gbW9kdWxlIG5hbWUgYXZhaWxhYmxlIGZvciB0aGlzIFJlZmVyZW5jZSwgbWVhbmluZyBpdCB3YXMgYXJyaXZlZCBhdCB2aWEgYVxuICAgICAgLy8gcmVsYXRpdmUgcGF0aC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAoIWlzRGVjbGFyYXRpb24ocmVmLm5vZGUpKSB7XG4gICAgICAvLyBJdCdzIG5vdCBwb3NzaWJsZSB0byBpbXBvcnQgc29tZXRoaW5nIHdoaWNoIGlzbid0IGEgZGVjbGFyYXRpb24uXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RlYnVnIGFzc2VydDogaW1wb3J0aW5nIGEgUmVmZXJlbmNlIHRvIG5vbi1kZWNsYXJhdGlvbj8nKTtcbiAgICB9XG5cbiAgICAvLyBUcnkgdG8gZmluZCB0aGUgZXhwb3J0ZWQgbmFtZSBvZiB0aGUgZGVjbGFyYXRpb24sIGlmIG9uZSBpcyBhdmFpbGFibGUuXG4gICAgY29uc3Qge3NwZWNpZmllciwgcmVzb2x1dGlvbkNvbnRleHR9ID0gcmVmLmJlc3RHdWVzc093bmluZ01vZHVsZTtcbiAgICBjb25zdCBzeW1ib2xOYW1lID0gdGhpcy5yZXNvbHZlSW1wb3J0TmFtZShzcGVjaWZpZXIsIHJlZi5ub2RlLCByZXNvbHV0aW9uQ29udGV4dCk7XG4gICAgaWYgKHN5bWJvbE5hbWUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRPRE8oYWx4aHViKTogbWFrZSB0aGlzIGVycm9yIGEgdHMuRGlhZ25vc3RpYyBwb2ludGluZyBhdCB3aGF0ZXZlciBjYXVzZWQgdGhpcyBpbXBvcnQgdG8gYmVcbiAgICAgIC8vIHRyaWdnZXJlZC5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgU3ltYm9sICR7cmVmLmRlYnVnTmFtZX0gZGVjbGFyZWQgaW4gJHtnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKS5maWxlTmFtZX0gaXMgbm90IGV4cG9ydGVkIGZyb20gJHtzcGVjaWZpZXJ9IChpbXBvcnQgaW50byAke2NvbnRleHQuZmlsZU5hbWV9KWApO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKG5ldyBFeHRlcm5hbFJlZmVyZW5jZShzcGVjaWZpZXIsIHN5bWJvbE5hbWUpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZUltcG9ydE5hbWUobW9kdWxlTmFtZTogc3RyaW5nLCB0YXJnZXQ6IHRzLkRlY2xhcmF0aW9uLCBmcm9tRmlsZTogc3RyaW5nKTogc3RyaW5nXG4gICAgICB8bnVsbCB7XG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMuZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWUsIGZyb21GaWxlKTtcbiAgICBpZiAoZXhwb3J0cyAhPT0gbnVsbCAmJiBleHBvcnRzLmhhcyh0YXJnZXQpKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5nZXQodGFyZ2V0KSAhO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIGlmICghdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuaGFzKG1vZHVsZU5hbWUpKSB7XG4gICAgICB0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5zZXQobW9kdWxlTmFtZSwgdGhpcy5lbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLmdldChtb2R1bGVOYW1lKSAhO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUoc3BlY2lmaWVyOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIC8vIEZpcnN0LCByZXNvbHZlIHRoZSBtb2R1bGUgc3BlY2lmaWVyIHRvIGl0cyBlbnRyeSBwb2ludCwgYW5kIGdldCB0aGUgdHMuU3ltYm9sIGZvciBpdC5cbiAgICBjb25zdCByZXNvbHZlZCA9IHRzLnJlc29sdmVNb2R1bGVOYW1lKHNwZWNpZmllciwgZnJvbUZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICBpZiAocmVzb2x2ZWQucmVzb2x2ZWRNb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShyZXNvbHZlZC5yZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKTtcbiAgICBpZiAoZW50cnlQb2ludEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludFN5bWJvbCA9IHRoaXMuY2hlY2tlci5nZXRTeW1ib2xBdExvY2F0aW9uKGVudHJ5UG9pbnRGaWxlKTtcbiAgICBpZiAoZW50cnlQb2ludFN5bWJvbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBOZXh0LCBidWlsZCBhIE1hcCBvZiBhbGwgdGhlIHRzLkRlY2xhcmF0aW9ucyBleHBvcnRlZCB2aWEgdGhlIHNwZWNpZmllciBhbmQgdGhlaXIgZXhwb3J0ZWRcbiAgICAvLyBuYW1lcy5cbiAgICBjb25zdCBleHBvcnRNYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG5cbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5jaGVja2VyLmdldEV4cG9ydHNPZk1vZHVsZShlbnRyeVBvaW50U3ltYm9sKTtcbiAgICBmb3IgKGNvbnN0IGV4cFN5bWJvbCBvZiBleHBvcnRzKSB7XG4gICAgICAvLyBSZXNvbHZlIGV4cG9ydCBzeW1ib2xzIHRvIHRoZWlyIGFjdHVhbCBkZWNsYXJhdGlvbnMuXG4gICAgICBjb25zdCBkZWNsU3ltYm9sID0gZXhwU3ltYm9sLmZsYWdzICYgdHMuU3ltYm9sRmxhZ3MuQWxpYXMgP1xuICAgICAgICAgIHRoaXMuY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKGV4cFN5bWJvbCkgOlxuICAgICAgICAgIGV4cFN5bWJvbDtcblxuICAgICAgLy8gQXQgdGhpcyBwb2ludCB0aGUgdmFsdWVEZWNsYXJhdGlvbiBvZiB0aGUgc3ltYm9sIHNob3VsZCBiZSBkZWZpbmVkLlxuICAgICAgY29uc3QgZGVjbCA9IGRlY2xTeW1ib2wudmFsdWVEZWNsYXJhdGlvbjtcbiAgICAgIGlmIChkZWNsID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFByZWZlciBpbXBvcnRpbmcgdGhlIHN5bWJvbCB2aWEgaXRzIGRlY2xhcmVkIG5hbWUsIGJ1dCB0YWtlIGFueSBleHBvcnQgb2YgaXQgb3RoZXJ3aXNlLlxuICAgICAgaWYgKGRlY2xTeW1ib2wubmFtZSA9PT0gZXhwU3ltYm9sLm5hbWUgfHwgIWV4cG9ydE1hcC5oYXMoZGVjbCkpIHtcbiAgICAgICAgZXhwb3J0TWFwLnNldChkZWNsLCBleHBTeW1ib2wubmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4cG9ydE1hcDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggd2lsbCByZWZlciB0byBkZWNsYXJhdGlvbnMgdmlhIHJlbGF0aXZlIHBhdGhzLCBwcm92aWRlZCB0aGV5J3JlXG4gKiBib3RoIGluIHRoZSBsb2dpY2FsIHByb2plY3QgXCJzcGFjZVwiIG9mIHBhdGhzLlxuICpcbiAqIFRoaXMgaXMgdHJpY2tpZXIgdGhhbiBpdCBzb3VuZHMsIGFzIHRoZSB0d28gZmlsZXMgbWF5IGJlIGluIGRpZmZlcmVudCByb290IGRpcmVjdG9yaWVzIGluIHRoZVxuICogcHJvamVjdC4gU2ltcGx5IGNhbGN1bGF0aW5nIGEgZmlsZSBzeXN0ZW0gcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHRoZSB0d28gaXMgbm90IHN1ZmZpY2llbnQuXG4gKiBJbnN0ZWFkLCBgTG9naWNhbFByb2plY3RQYXRoYHMgYXJlIHVzZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5IGltcGxlbWVudHMgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBsb2dpY2FsRnM6IExvZ2ljYWxGaWxlU3lzdGVtKSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcmVsYXRpdmUgcGF0aCBmcm9tIHRoZSBpbXBvcnRpbmcgZmlsZSB0byB0aGUgZmlsZSBiZWluZyBpbXBvcnRlZC4gVGhpcyBpcyBkb25lXG4gICAgLy8gYXMgYSBsb2dpY2FsIHBhdGggY29tcHV0YXRpb24sIGJlY2F1c2UgdGhlIHR3byBmaWxlcyBtaWdodCBiZSBpbiBkaWZmZXJlbnQgcm9vdERpcnMuXG4gICAgY29uc3QgZGVzdFBhdGggPSB0aGlzLmxvZ2ljYWxGcy5sb2dpY2FsUGF0aE9mU2YoZGVzdFNmKTtcbiAgICBpZiAoZGVzdFBhdGggPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBpbXBvcnRlZCBmaWxlIGlzIG5vdCB3aXRoaW4gdGhlIGxvZ2ljYWwgcHJvamVjdCBmaWxlc3lzdGVtLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luUGF0aCA9IHRoaXMubG9naWNhbEZzLmxvZ2ljYWxQYXRoT2ZTZihjb250ZXh0KTtcbiAgICBpZiAob3JpZ2luUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBEZWJ1ZyBhc3NlcnQ6IGF0dGVtcHQgdG8gaW1wb3J0IGZyb20gJHtjb250ZXh0LmZpbGVOYW1lfSBidXQgaXQncyBvdXRzaWRlIHRoZSBwcm9ncmFtP2ApO1xuICAgIH1cblxuICAgIC8vIFRoZXJlJ3Mgbm8gd2F5IHRvIGVtaXQgYSByZWxhdGl2ZSByZWZlcmVuY2UgZnJvbSBhIGZpbGUgdG8gaXRzZWxmLlxuICAgIGlmIChkZXN0UGF0aCA9PT0gb3JpZ2luUGF0aCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZSA9IGZpbmRFeHBvcnRlZE5hbWVPZk5vZGUocmVmLm5vZGUsIGRlc3RTZiwgdGhpcy5jaGVja2VyKTtcbiAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlIHRhcmdldCBkZWNsYXJhdGlvbiBpc24ndCBleHBvcnRlZCBmcm9tIHRoZSBmaWxlIGl0J3MgZGVjbGFyZWQgaW4uIFRoaXMgaXMgYW4gaXNzdWUhXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBXaXRoIGJvdGggZmlsZXMgZXhwcmVzc2VkIGFzIExvZ2ljYWxQcm9qZWN0UGF0aHMsIGdldHRpbmcgdGhlIG1vZHVsZSBzcGVjaWZpZXIgYXMgYSByZWxhdGl2ZVxuICAgIC8vIHBhdGggaXMgbm93IHN0cmFpZ2h0Zm9yd2FyZC5cbiAgICBjb25zdCBtb2R1bGVOYW1lID0gTG9naWNhbFByb2plY3RQYXRoLnJlbGF0aXZlUGF0aEJldHdlZW4ob3JpZ2luUGF0aCwgZGVzdFBhdGgpO1xuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHVzZXMgYSBgRmlsZVRvTW9kdWxlSG9zdGAgdG8gZ2VuZXJhdGUgYWJzb2x1dGUgaW1wb3J0IHJlZmVyZW5jZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlVG9Nb2R1bGVTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgZmlsZVRvTW9kdWxlSG9zdDogRmlsZVRvTW9kdWxlSG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcbiAgICBjb25zdCBuYW1lID0gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShyZWYubm9kZSwgZGVzdFNmLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVOYW1lID1cbiAgICAgICAgdGhpcy5maWxlVG9Nb2R1bGVIb3N0LmZpbGVOYW1lVG9Nb2R1bGVOYW1lKGRlc3RTZi5maWxlTmFtZSwgY29udGV4dC5maWxlTmFtZSk7XG5cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZX0pO1xuICB9XG59XG4iXX0=