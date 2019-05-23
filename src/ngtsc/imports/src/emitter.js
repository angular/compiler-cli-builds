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
     * A `ReferenceEmitter` uses one or more `ReferenceEmitStrategy` implementations to produce an
     * `Expression` which refers to a `Reference` in the context of a particular file.
     */
    var ReferenceEmitter = /** @class */ (function () {
        function ReferenceEmitter(strategies) {
            this.strategies = strategies;
        }
        ReferenceEmitter.prototype.emit = function (ref, context, importMode) {
            var e_1, _a;
            if (importMode === void 0) { importMode = references_1.ImportMode.UseExistingImport; }
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
            var resolvedModule = typescript_1.resolveModuleName(specifier, fromFile, this.options, this.host);
            if (resolvedModule === undefined) {
                return null;
            }
            var entryPointFile = this.program.getSourceFile(resolvedModule.resolvedFileName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEU7SUFDNUUsMkRBQWlFO0lBQ2pFLCtCQUFpQztJQUVqQyw2REFBaUU7SUFDakUsa0ZBQTRHO0lBRTVHLHVGQUFxRDtJQUNyRCxxRkFBbUQ7SUFxQ25EOzs7OztPQUtHO0lBQ0g7UUFDRSwwQkFBb0IsVUFBbUM7WUFBbkMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFBRyxDQUFDO1FBRTNELCtCQUFJLEdBQUosVUFDSSxHQUFjLEVBQUUsT0FBc0IsRUFDdEMsVUFBcUQ7O1lBQXJELDJCQUFBLEVBQUEsYUFBeUIsdUJBQVUsQ0FBQyxpQkFBaUI7O2dCQUN2RCxLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbkMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFDeEQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO3dCQUNwQixPQUFPLE9BQU8sQ0FBQztxQkFDaEI7aUJBQ0Y7Ozs7Ozs7OztZQUNELE1BQU0sSUFBSSxLQUFLLENBQ1gsb0NBQWtDLDZCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBTyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsY0FBUyxPQUFPLENBQUMsUUFBVSxDQUFDLENBQUM7UUFDdkksQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWZELElBZUM7SUFmWSw0Q0FBZ0I7SUFpQjdCOzs7T0FHRztJQUNI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Q3BFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVsRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFeHRlcm5hbFJlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0xvZ2ljYWxGaWxlU3lzdGVtLCBMb2dpY2FsUHJvamVjdFBhdGh9IGZyb20gJy4uLy4uL3BhdGgnO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlLCBpc0RlY2xhcmF0aW9uLCBub2RlTmFtZUZvckVycm9yLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZmluZEV4cG9ydGVkTmFtZU9mTm9kZX0gZnJvbSAnLi9maW5kX2V4cG9ydCc7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9yZWZlcmVuY2VzJztcblxuLyoqXG4gKiBBIGhvc3Qgd2hpY2ggc3VwcG9ydHMgYW4gb3BlcmF0aW9uIHRvIGNvbnZlcnQgYSBmaWxlIG5hbWUgaW50byBhIG1vZHVsZSBuYW1lLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIGlzIHR5cGljYWxseSBpbXBsZW1lbnRlZCBhcyBwYXJ0IG9mIHRoZSBjb21waWxlciBob3N0IHBhc3NlZCB0byBuZ3RzYyB3aGVuIHJ1bm5pbmdcbiAqIHVuZGVyIGEgYnVpbGQgdG9vbCBsaWtlIEJhemVsIG9yIEJsYXplLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVUb01vZHVsZUhvc3Qge1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZShpbXBvcnRlZEZpbGVQYXRoOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFydGljdWxhciBzdHJhdGVneSBmb3IgZ2VuZXJhdGluZyBhbiBleHByZXNzaW9uIHdoaWNoIHJlZmVycyB0byBhIGBSZWZlcmVuY2VgLlxuICpcbiAqIFRoZXJlIGFyZSBtYW55IHBvdGVudGlhbCB3YXlzIGEgZ2l2ZW4gYFJlZmVyZW5jZWAgY291bGQgYmUgcmVmZXJyZWQgdG8gaW4gdGhlIGNvbnRleHQgb2YgYSBnaXZlblxuICogZmlsZS4gQSBsb2NhbCBkZWNsYXJhdGlvbiBjb3VsZCBiZSBhdmFpbGFibGUsIHRoZSBgUmVmZXJlbmNlYCBjb3VsZCBiZSBpbXBvcnRhYmxlIHZpYSBhIHJlbGF0aXZlXG4gKiBpbXBvcnQgd2l0aGluIHRoZSBwcm9qZWN0LCBvciBhbiBhYnNvbHV0ZSBpbXBvcnQgaW50byBgbm9kZV9tb2R1bGVzYCBtaWdodCBiZSBuZWNlc3NhcnkuXG4gKlxuICogRGlmZmVyZW50IGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIGltcGxlbWVudGF0aW9ucyBpbXBsZW1lbnQgc3BlY2lmaWMgbG9naWMgZm9yIGdlbmVyYXRpbmcgc3VjaFxuICogcmVmZXJlbmNlcy4gQSBzaW5nbGUgc3RyYXRlZ3kgKHN1Y2ggYXMgdXNpbmcgYSBsb2NhbCBkZWNsYXJhdGlvbikgbWF5IG5vdCBhbHdheXMgYmUgYWJsZSB0b1xuICogZ2VuZXJhdGUgYW4gZXhwcmVzc2lvbiBmb3IgZXZlcnkgYFJlZmVyZW5jZWAgKGZvciBleGFtcGxlLCBpZiBubyBsb2NhbCBpZGVudGlmaWVyIGlzIGF2YWlsYWJsZSksXG4gKiBhbmQgbWF5IHJldHVybiBgbnVsbGAgaW4gc3VjaCBhIGNhc2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgLyoqXG4gICAqIEVtaXQgYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgZ2l2ZW4gYFJlZmVyZW5jZWAgaW4gdGhlIGNvbnRleHQgb2YgYSBwYXJ0aWN1bGFyXG4gICAqIHNvdXJjZSBmaWxlLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHJlZiB0aGUgYFJlZmVyZW5jZWAgZm9yIHdoaWNoIHRvIGdlbmVyYXRlIGFuIGV4cHJlc3Npb25cbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIHNvdXJjZSBmaWxlIGluIHdoaWNoIHRoZSBgRXhwcmVzc2lvbmAgbXVzdCBiZSB2YWxpZFxuICAgKiBAcGFyYW0gaW1wb3J0TW9kZSBhIGZsYWcgd2hpY2ggY29udHJvbHMgd2hldGhlciBpbXBvcnRzIHNob3VsZCBiZSBnZW5lcmF0ZWQgb3Igbm90XG4gICAqIEByZXR1cm5zIGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIGBSZWZlcmVuY2VgLCBvciBgbnVsbGAgaWYgbm9uZSBjYW4gYmUgZ2VuZXJhdGVkXG4gICAqL1xuICBlbWl0KHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBgRXhwcmVzc2lvbmBzIHdoaWNoIHJlZmVyIHRvIGBSZWZlcmVuY2VgcyBpbiBhIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQSBgUmVmZXJlbmNlRW1pdHRlcmAgdXNlcyBvbmUgb3IgbW9yZSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgdG8gcHJvZHVjZSBhblxuICogYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byBhIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhciBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3RyYXRlZ2llczogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5W10pIHt9XG5cbiAgZW1pdChcbiAgICAgIHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgaW1wb3J0TW9kZTogSW1wb3J0TW9kZcKgPSBJbXBvcnRNb2RlLlVzZUV4aXN0aW5nSW1wb3J0KTogRXhwcmVzc2lvbiB7XG4gICAgZm9yIChjb25zdCBzdHJhdGVneSBvZiB0aGlzLnN0cmF0ZWdpZXMpIHtcbiAgICAgIGNvbnN0IGVtaXR0ZWQgPSBzdHJhdGVneS5lbWl0KHJlZiwgY29udGV4dCwgaW1wb3J0TW9kZSk7XG4gICAgICBpZiAoZW1pdHRlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5hYmxlIHRvIHdyaXRlIGEgcmVmZXJlbmNlIHRvICR7bm9kZU5hbWVGb3JFcnJvcihyZWYubm9kZSl9IGluICR7cmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfSBmcm9tICR7Y29udGV4dC5maWxlTmFtZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggd2lsbCByZWZlciB0byBkZWNsYXJhdGlvbnMgYnkgYW55IGxvY2FsIGB0cy5JZGVudGlmaWVyYHMsIGlmXG4gKiBzdWNoIGlkZW50aWZpZXJzIGFyZSBhdmFpbGFibGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydE1vZGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIC8vIElmIHRoZSBlbWl0dGVyIGhhcyBzcGVjaWZpZWQgRm9yY2VOZXdJbXBvcnQsIHRoZW4gTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgc2hvdWxkIG5vdCB1c2UgYVxuICAgIC8vIGxvY2FsIGlkZW50aWZpZXIgYXQgYWxsLCAqZXhjZXB0KiBpbiB0aGUgc291cmNlIGZpbGUgd2hlcmUgdGhlIG5vZGUgaXMgYWN0dWFsbHkgZGVjbGFyZWQuXG4gICAgaWYgKGltcG9ydE1vZGUgPT09IEltcG9ydE1vZGUuRm9yY2VOZXdJbXBvcnQgJiZcbiAgICAgICAgZ2V0U291cmNlRmlsZShyZWYubm9kZSkgIT09IGdldFNvdXJjZUZpbGUoY29udGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEEgUmVmZXJlbmNlIGNhbiBoYXZlIG11bHRpcGxlIGlkZW50aXRpZXMgaW4gZGlmZmVyZW50IGZpbGVzLCBzbyBpdCBtYXkgYWxyZWFkeSBoYXZlIGFuXG4gICAgLy8gSWRlbnRpZmllciBpbiB0aGUgcmVxdWVzdGVkIGNvbnRleHQgZmlsZS5cbiAgICBjb25zdCBpZGVudGlmaWVyID0gcmVmLmdldElkZW50aXR5SW4oY29udGV4dCk7XG4gICAgaWYgKGlkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBuZXcgV3JhcHBlZE5vZGVFeHByKGlkZW50aWZpZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHRoYXQgY29tZSBmcm9tIGBub2RlX21vZHVsZXNgIHVzaW5nXG4gKiBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gKlxuICogUGFydCBvZiB0aGlzIHN0cmF0ZWd5IGludm9sdmVzIGxvb2tpbmcgYXQgdGhlIHRhcmdldCBlbnRyeSBwb2ludCBhbmQgaWRlbnRpZnlpbmcgdGhlIGV4cG9ydGVkXG4gKiBuYW1lIG9mIHRoZSB0YXJnZXRlZCBkZWNsYXJhdGlvbiwgYXMgaXQgbWlnaHQgYmUgZGlmZmVyZW50IGZyb20gdGhlIGRlY2xhcmVkIG5hbWUgKGUuZy4gYVxuICogZGlyZWN0aXZlIG1pZ2h0IGJlIGRlY2xhcmVkIGFzIEZvb0RpckltcGwsIGJ1dCBleHBvcnRlZCBhcyBGb29EaXIpLiBJZiBubyBleHBvcnQgY2FuIGJlIGZvdW5kXG4gKiB3aGljaCBtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIGRpcmVjdGl2ZSwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICovXG5leHBvcnQgY2xhc3MgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBBIGNhY2hlIG9mIHRoZSBleHBvcnRzIG9mIHNwZWNpZmljIG1vZHVsZXMsIGJlY2F1c2UgcmVzb2x2aW5nIGEgbW9kdWxlIHRvIGl0cyBleHBvcnRzIGlzIGFcbiAgICogY29zdGx5IG9wZXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgbW9kdWxlRXhwb3J0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLFxuICAgICAgcHJpdmF0ZSBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIHByaXZhdGUgaG9zdDogdHMuQ29tcGlsZXJIb3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydE1vZGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyBtb2R1bGUgbmFtZSBhdmFpbGFibGUgZm9yIHRoaXMgUmVmZXJlbmNlLCBtZWFuaW5nIGl0IHdhcyBhcnJpdmVkIGF0IHZpYSBhXG4gICAgICAvLyByZWxhdGl2ZSBwYXRoLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICghaXNEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGltcG9ydCBzb21ldGhpbmcgd2hpY2ggaXNuJ3QgYSBkZWNsYXJhdGlvbi5cbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVidWcgYXNzZXJ0OiBpbXBvcnRpbmcgYSBSZWZlcmVuY2UgdG8gbm9uLWRlY2xhcmF0aW9uPycpO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBleHBvcnRlZCBuYW1lIG9mIHRoZSBkZWNsYXJhdGlvbiwgaWYgb25lIGlzIGF2YWlsYWJsZS5cbiAgICBjb25zdCB7c3BlY2lmaWVyLCByZXNvbHV0aW9uQ29udGV4dH0gPSByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlO1xuICAgIGNvbnN0IHN5bWJvbE5hbWUgPSB0aGlzLnJlc29sdmVJbXBvcnROYW1lKHNwZWNpZmllciwgcmVmLm5vZGUsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBtYWtlIHRoaXMgZXJyb3IgYSB0cy5EaWFnbm9zdGljIHBvaW50aW5nIGF0IHdoYXRldmVyIGNhdXNlZCB0aGlzIGltcG9ydCB0byBiZVxuICAgICAgLy8gdHJpZ2dlcmVkLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBTeW1ib2wgJHtyZWYuZGVidWdOYW1lfSBkZWNsYXJlZCBpbiAke2dldFNvdXJjZUZpbGUocmVmLm5vZGUpLmZpbGVOYW1lfSBpcyBub3QgZXhwb3J0ZWQgZnJvbSAke3NwZWNpZmllcn0gKGltcG9ydCBpbnRvICR7Y29udGV4dC5maWxlTmFtZX0pYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIobmV3IEV4dGVybmFsUmVmZXJlbmNlKHNwZWNpZmllciwgc3ltYm9sTmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlSW1wb3J0TmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIHRhcmdldDogdHMuRGVjbGFyYXRpb24sIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmdcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpO1xuICAgIGlmIChleHBvcnRzICE9PSBudWxsICYmIGV4cG9ydHMuaGFzKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmdldCh0YXJnZXQpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLnNldChtb2R1bGVOYW1lLCB0aGlzLmVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuZ2V0KG1vZHVsZU5hbWUpICE7XG4gIH1cblxuICBwcml2YXRlIGVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShzcGVjaWZpZXI6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbCB7XG4gICAgLy8gRmlyc3QsIHJlc29sdmUgdGhlIG1vZHVsZSBzcGVjaWZpZXIgdG8gaXRzIGVudHJ5IHBvaW50LCBhbmQgZ2V0IHRoZSB0cy5TeW1ib2wgZm9yIGl0LlxuICAgIGNvbnN0IHJlc29sdmVkTW9kdWxlID0gcmVzb2x2ZU1vZHVsZU5hbWUoc3BlY2lmaWVyLCBmcm9tRmlsZSwgdGhpcy5vcHRpb25zLCB0aGlzLmhvc3QpO1xuICAgIGlmIChyZXNvbHZlZE1vZHVsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyeVBvaW50RmlsZSA9IHRoaXMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpO1xuICAgIGlmIChlbnRyeVBvaW50RmlsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBlbnRyeVBvaW50U3ltYm9sID0gdGhpcy5jaGVja2VyLmdldFN5bWJvbEF0TG9jYXRpb24oZW50cnlQb2ludEZpbGUpO1xuICAgIGlmIChlbnRyeVBvaW50U3ltYm9sID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIE5leHQsIGJ1aWxkIGEgTWFwIG9mIGFsbCB0aGUgdHMuRGVjbGFyYXRpb25zIGV4cG9ydGVkIHZpYSB0aGUgc3BlY2lmaWVyIGFuZCB0aGVpciBleHBvcnRlZFxuICAgIC8vIG5hbWVzLlxuICAgIGNvbnN0IGV4cG9ydE1hcCA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcblxuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmNoZWNrZXIuZ2V0RXhwb3J0c09mTW9kdWxlKGVudHJ5UG9pbnRTeW1ib2wpO1xuICAgIGZvciAoY29uc3QgZXhwU3ltYm9sIG9mIGV4cG9ydHMpIHtcbiAgICAgIC8vIFJlc29sdmUgZXhwb3J0IHN5bWJvbHMgdG8gdGhlaXIgYWN0dWFsIGRlY2xhcmF0aW9ucy5cbiAgICAgIGNvbnN0IGRlY2xTeW1ib2wgPSBleHBTeW1ib2wuZmxhZ3MgJiB0cy5TeW1ib2xGbGFncy5BbGlhcyA/XG4gICAgICAgICAgdGhpcy5jaGVja2VyLmdldEFsaWFzZWRTeW1ib2woZXhwU3ltYm9sKSA6XG4gICAgICAgICAgZXhwU3ltYm9sO1xuXG4gICAgICAvLyBBdCB0aGlzIHBvaW50IHRoZSB2YWx1ZURlY2xhcmF0aW9uIG9mIHRoZSBzeW1ib2wgc2hvdWxkIGJlIGRlZmluZWQuXG4gICAgICBjb25zdCBkZWNsID0gZGVjbFN5bWJvbC52YWx1ZURlY2xhcmF0aW9uO1xuICAgICAgaWYgKGRlY2wgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gUHJlZmVyIGltcG9ydGluZyB0aGUgc3ltYm9sIHZpYSBpdHMgZGVjbGFyZWQgbmFtZSwgYnV0IHRha2UgYW55IGV4cG9ydCBvZiBpdCBvdGhlcndpc2UuXG4gICAgICBpZiAoZGVjbFN5bWJvbC5uYW1lID09PSBleHBTeW1ib2wubmFtZSB8fCAhZXhwb3J0TWFwLmhhcyhkZWNsKSkge1xuICAgICAgICBleHBvcnRNYXAuc2V0KGRlY2wsIGV4cFN5bWJvbC5uYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXhwb3J0TWFwO1xuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB3aWxsIHJlZmVyIHRvIGRlY2xhcmF0aW9ucyB2aWEgcmVsYXRpdmUgcGF0aHMsIHByb3ZpZGVkIHRoZXkncmVcbiAqIGJvdGggaW4gdGhlIGxvZ2ljYWwgcHJvamVjdCBcInNwYWNlXCIgb2YgcGF0aHMuXG4gKlxuICogVGhpcyBpcyB0cmlja2llciB0aGFuIGl0IHNvdW5kcywgYXMgdGhlIHR3byBmaWxlcyBtYXkgYmUgaW4gZGlmZmVyZW50IHJvb3QgZGlyZWN0b3JpZXMgaW4gdGhlXG4gKiBwcm9qZWN0LiBTaW1wbHkgY2FsY3VsYXRpbmcgYSBmaWxlIHN5c3RlbSByZWxhdGl2ZSBwYXRoIGJldHdlZW4gdGhlIHR3byBpcyBub3Qgc3VmZmljaWVudC5cbiAqIEluc3RlYWQsIGBMb2dpY2FsUHJvamVjdFBhdGhgcyBhcmUgdXNlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2ljYWxQcm9qZWN0U3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIGxvZ2ljYWxGczogTG9naWNhbEZpbGVTeXN0ZW0pIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IEV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgZGVzdFNmID0gZ2V0U291cmNlRmlsZShyZWYubm9kZSk7XG5cbiAgICAvLyBDb21wdXRlIHRoZSByZWxhdGl2ZSBwYXRoIGZyb20gdGhlIGltcG9ydGluZyBmaWxlIHRvIHRoZSBmaWxlIGJlaW5nIGltcG9ydGVkLiBUaGlzIGlzIGRvbmVcbiAgICAvLyBhcyBhIGxvZ2ljYWwgcGF0aCBjb21wdXRhdGlvbiwgYmVjYXVzZSB0aGUgdHdvIGZpbGVzIG1pZ2h0IGJlIGluIGRpZmZlcmVudCByb290RGlycy5cbiAgICBjb25zdCBkZXN0UGF0aCA9IHRoaXMubG9naWNhbEZzLmxvZ2ljYWxQYXRoT2ZTZihkZXN0U2YpO1xuICAgIGlmIChkZXN0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGltcG9ydGVkIGZpbGUgaXMgbm90IHdpdGhpbiB0aGUgbG9naWNhbCBwcm9qZWN0IGZpbGVzeXN0ZW0uXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5QYXRoID0gdGhpcy5sb2dpY2FsRnMubG9naWNhbFBhdGhPZlNmKGNvbnRleHQpO1xuICAgIGlmIChvcmlnaW5QYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYERlYnVnIGFzc2VydDogYXR0ZW1wdCB0byBpbXBvcnQgZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9IGJ1dCBpdCdzIG91dHNpZGUgdGhlIHByb2dyYW0/YCk7XG4gICAgfVxuXG4gICAgLy8gVGhlcmUncyBubyB3YXkgdG8gZW1pdCBhIHJlbGF0aXZlIHJlZmVyZW5jZSBmcm9tIGEgZmlsZSB0byBpdHNlbGYuXG4gICAgaWYgKGRlc3RQYXRoID09PSBvcmlnaW5QYXRoKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lID0gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShyZWYubm9kZSwgZGVzdFNmLCB0aGlzLmNoZWNrZXIpO1xuICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICAvLyBUaGUgdGFyZ2V0IGRlY2xhcmF0aW9uIGlzbid0IGV4cG9ydGVkIGZyb20gdGhlIGZpbGUgaXQncyBkZWNsYXJlZCBpbi4gVGhpcyBpcyBhbiBpc3N1ZSFcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdpdGggYm90aCBmaWxlcyBleHByZXNzZWQgYXMgTG9naWNhbFByb2plY3RQYXRocywgZ2V0dGluZyB0aGUgbW9kdWxlIHNwZWNpZmllciBhcyBhIHJlbGF0aXZlXG4gICAgLy8gcGF0aCBpcyBub3cgc3RyYWlnaHRmb3J3YXJkLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBMb2dpY2FsUHJvamVjdFBhdGgucmVsYXRpdmVQYXRoQmV0d2VlbihvcmlnaW5QYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggdXNlcyBhIGBGaWxlVG9Nb2R1bGVIb3N0YCB0byBnZW5lcmF0ZSBhYnNvbHV0ZSBpbXBvcnQgcmVmZXJlbmNlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpbGVUb01vZHVsZVN0cmF0ZWd5IGltcGxlbWVudHMgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuICAgIGNvbnN0IG5hbWUgPSBmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlKHJlZi5ub2RlLCBkZXN0U2YsIHRoaXMuY2hlY2tlcik7XG4gICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPVxuICAgICAgICB0aGlzLmZpbGVUb01vZHVsZUhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUoZGVzdFNmLmZpbGVOYW1lLCBjb250ZXh0LmZpbGVOYW1lKTtcblxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gIH1cbn1cbiJdfQ==