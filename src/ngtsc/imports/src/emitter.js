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
        define("@angular/compiler-cli/src/ngtsc/imports/src/emitter", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler/src/compiler", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/imports/src/find_export", "@angular/compiler-cli/src/ngtsc/imports/src/references"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var compiler_2 = require("@angular/compiler/src/compiler");
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
        function AbsoluteModuleStrategy(program, checker, options, host, reflectionHost) {
            this.program = program;
            this.checker = checker;
            this.options = options;
            this.host = host;
            this.reflectionHost = reflectionHost;
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
            // First, resolve the module specifier to its entry point, and get the ts.Symbol for it.
            var resolvedModule = typescript_1.resolveModuleName(specifier, fromFile, this.options, this.host);
            if (resolvedModule === undefined) {
                return null;
            }
            var entryPointFile = this.program.getSourceFile(resolvedModule.resolvedFileName);
            if (entryPointFile === undefined) {
                return null;
            }
            var exports = this.reflectionHost.getExportsOfModule(entryPointFile);
            if (exports === null) {
                return null;
            }
            var exportMap = new Map();
            exports.forEach(function (declaration, name) { exportMap.set(declaration.node, name); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNEU7SUFDNUUsMkRBQWlFO0lBR2pFLDZEQUFpRTtJQUVqRSxrRkFBNEc7SUFFNUcsdUZBQXFEO0lBQ3JELHFGQUFtRDtJQXNDbkQ7Ozs7O09BS0c7SUFDSDtRQUNFLDBCQUFvQixVQUFtQztZQUFuQyxlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQUFHLENBQUM7UUFFM0QsK0JBQUksR0FBSixVQUNJLEdBQWMsRUFBRSxPQUFzQixFQUN0QyxVQUFxRDs7WUFBckQsMkJBQUEsRUFBQSxhQUF5Qix1QkFBVSxDQUFDLGlCQUFpQjs7Z0JBQ3ZELEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7d0JBQ3BCLE9BQU8sT0FBTyxDQUFDO3FCQUNoQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCxvQ0FBa0MsNkJBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxjQUFTLE9BQU8sQ0FBQyxRQUFVLENBQUMsQ0FBQztRQUN2SSxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLDRDQUFnQjtJQWlCN0I7OztPQUdHO0lBQ0g7UUFBQTtRQWtCQSxD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SUFBSSx1QkFBWSxDQUFDLEVBQUMsVUFBVSxZQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDSCw2QkFBQztJQUFELENBQUMsQUFwQ0QsSUFvQ0M7SUFwQ1ksd0RBQXNCO0lBc0NuQzs7T0FFRztJQUNIO1FBQ0UsOEJBQW9CLE9BQXVCLEVBQVUsZ0JBQWtDO1lBQW5FLFlBQU8sR0FBUCxPQUFPLENBQWdCO1lBQVUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUFHLENBQUM7UUFFM0YsbUNBQUksR0FBSixVQUFLLEdBQXVCLEVBQUUsT0FBc0I7WUFDbEQsSUFBTSxNQUFNLEdBQUcsMEJBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3BFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVsRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtFeHByZXNzaW9uLCBFeHRlcm5hbEV4cHIsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtFeHRlcm5hbFJlZmVyZW5jZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXIvc3JjL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0xvZ2ljYWxGaWxlU3lzdGVtLCBMb2dpY2FsUHJvamVjdFBhdGh9IGZyb20gJy4uLy4uL3BhdGgnO1xuaW1wb3J0IHtSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge2dldFNvdXJjZUZpbGUsIGlzRGVjbGFyYXRpb24sIG5vZGVOYW1lRm9yRXJyb3IsIHJlc29sdmVNb2R1bGVOYW1lfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcblxuaW1wb3J0IHtmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlfSBmcm9tICcuL2ZpbmRfZXhwb3J0JztcbmltcG9ydCB7SW1wb3J0TW9kZSwgUmVmZXJlbmNlfSBmcm9tICcuL3JlZmVyZW5jZXMnO1xuXG5cbi8qKlxuICogQSBob3N0IHdoaWNoIHN1cHBvcnRzIGFuIG9wZXJhdGlvbiB0byBjb252ZXJ0IGEgZmlsZSBuYW1lIGludG8gYSBtb2R1bGUgbmFtZS5cbiAqXG4gKiBUaGlzIG9wZXJhdGlvbiBpcyB0eXBpY2FsbHkgaW1wbGVtZW50ZWQgYXMgcGFydCBvZiB0aGUgY29tcGlsZXIgaG9zdCBwYXNzZWQgdG8gbmd0c2Mgd2hlbiBydW5uaW5nXG4gKiB1bmRlciBhIGJ1aWxkIHRvb2wgbGlrZSBCYXplbCBvciBCbGF6ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVG9Nb2R1bGVIb3N0IHtcbiAgZmlsZU5hbWVUb01vZHVsZU5hbWUoaW1wb3J0ZWRGaWxlUGF0aDogc3RyaW5nLCBjb250YWluaW5nRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcnRpY3VsYXIgc3RyYXRlZ3kgZm9yIGdlbmVyYXRpbmcgYW4gZXhwcmVzc2lvbiB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYC5cbiAqXG4gKiBUaGVyZSBhcmUgbWFueSBwb3RlbnRpYWwgd2F5cyBhIGdpdmVuIGBSZWZlcmVuY2VgIGNvdWxkIGJlIHJlZmVycmVkIHRvIGluIHRoZSBjb250ZXh0IG9mIGEgZ2l2ZW5cbiAqIGZpbGUuIEEgbG9jYWwgZGVjbGFyYXRpb24gY291bGQgYmUgYXZhaWxhYmxlLCB0aGUgYFJlZmVyZW5jZWAgY291bGQgYmUgaW1wb3J0YWJsZSB2aWEgYSByZWxhdGl2ZVxuICogaW1wb3J0IHdpdGhpbiB0aGUgcHJvamVjdCwgb3IgYW4gYWJzb2x1dGUgaW1wb3J0IGludG8gYG5vZGVfbW9kdWxlc2AgbWlnaHQgYmUgbmVjZXNzYXJ5LlxuICpcbiAqIERpZmZlcmVudCBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgaW1wbGVtZW50IHNwZWNpZmljIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHN1Y2hcbiAqIHJlZmVyZW5jZXMuIEEgc2luZ2xlIHN0cmF0ZWd5IChzdWNoIGFzIHVzaW5nIGEgbG9jYWwgZGVjbGFyYXRpb24pIG1heSBub3QgYWx3YXlzIGJlIGFibGUgdG9cbiAqIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGV2ZXJ5IGBSZWZlcmVuY2VgIChmb3IgZXhhbXBsZSwgaWYgbm8gbG9jYWwgaWRlbnRpZmllciBpcyBhdmFpbGFibGUpLFxuICogYW5kIG1heSByZXR1cm4gYG51bGxgIGluIHN1Y2ggYSBjYXNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBFbWl0IGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIGdpdmVuIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhclxuICAgKiBzb3VyY2UgZmlsZSwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgdGhlIGBSZWZlcmVuY2VgIGZvciB3aGljaCB0byBnZW5lcmF0ZSBhbiBleHByZXNzaW9uXG4gICAqIEBwYXJhbSBjb250ZXh0IHRoZSBzb3VyY2UgZmlsZSBpbiB3aGljaCB0aGUgYEV4cHJlc3Npb25gIG11c3QgYmUgdmFsaWRcbiAgICogQHBhcmFtIGltcG9ydE1vZGUgYSBmbGFnIHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgaW1wb3J0cyBzaG91bGQgYmUgZ2VuZXJhdGVkIG9yIG5vdFxuICAgKiBAcmV0dXJucyBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSBgUmVmZXJlbmNlYCwgb3IgYG51bGxgIGlmIG5vbmUgY2FuIGJlIGdlbmVyYXRlZFxuICAgKi9cbiAgZW1pdChyZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0TW9kZTogSW1wb3J0TW9kZSk6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYEV4cHJlc3Npb25gcyB3aGljaCByZWZlciB0byBgUmVmZXJlbmNlYHMgaW4gYSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEEgYFJlZmVyZW5jZUVtaXR0ZXJgIHVzZXMgb25lIG9yIG1vcmUgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgaW1wbGVtZW50YXRpb25zIHRvIHByb2R1Y2UgYW5cbiAqIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcnRpY3VsYXIgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN0cmF0ZWdpZXM6IFJlZmVyZW5jZUVtaXRTdHJhdGVneVtdKSB7fVxuXG4gIGVtaXQoXG4gICAgICByZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIGltcG9ydE1vZGU6IEltcG9ydE1vZGXCoD0gSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk6IEV4cHJlc3Npb24ge1xuICAgIGZvciAoY29uc3Qgc3RyYXRlZ3kgb2YgdGhpcy5zdHJhdGVnaWVzKSB7XG4gICAgICBjb25zdCBlbWl0dGVkID0gc3RyYXRlZ3kuZW1pdChyZWYsIGNvbnRleHQsIGltcG9ydE1vZGUpO1xuICAgICAgaWYgKGVtaXR0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFVuYWJsZSB0byB3cml0ZSBhIHJlZmVyZW5jZSB0byAke25vZGVOYW1lRm9yRXJyb3IocmVmLm5vZGUpfSBpbiAke3JlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0gZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIGJ5IGFueSBsb2NhbCBgdHMuSWRlbnRpZmllcmBzLCBpZlxuICogc3VjaCBpZGVudGlmaWVycyBhcmUgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBJZiB0aGUgZW1pdHRlciBoYXMgc3BlY2lmaWVkIEZvcmNlTmV3SW1wb3J0LCB0aGVuIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5IHNob3VsZCBub3QgdXNlIGFcbiAgICAvLyBsb2NhbCBpZGVudGlmaWVyIGF0IGFsbCwgKmV4Y2VwdCogaW4gdGhlIHNvdXJjZSBmaWxlIHdoZXJlIHRoZSBub2RlIGlzIGFjdHVhbGx5IGRlY2xhcmVkLlxuICAgIGlmIChpbXBvcnRNb2RlID09PSBJbXBvcnRNb2RlLkZvcmNlTmV3SW1wb3J0ICYmXG4gICAgICAgIGdldFNvdXJjZUZpbGUocmVmLm5vZGUpICE9PSBnZXRTb3VyY2VGaWxlKGNvbnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBBIFJlZmVyZW5jZSBjYW4gaGF2ZSBtdWx0aXBsZSBpZGVudGl0aWVzIGluIGRpZmZlcmVudCBmaWxlcywgc28gaXQgbWF5IGFscmVhZHkgaGF2ZSBhblxuICAgIC8vIElkZW50aWZpZXIgaW4gdGhlIHJlcXVlc3RlZCBjb250ZXh0IGZpbGUuXG4gICAgY29uc3QgaWRlbnRpZmllciA9IHJlZi5nZXRJZGVudGl0eUluKGNvbnRleHQpO1xuICAgIGlmIChpZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbmV3IFdyYXBwZWROb2RlRXhwcihpZGVudGlmaWVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB3aWxsIHJlZmVyIHRvIGRlY2xhcmF0aW9ucyB0aGF0IGNvbWUgZnJvbSBgbm9kZV9tb2R1bGVzYCB1c2luZ1xuICogYW4gYWJzb2x1dGUgaW1wb3J0LlxuICpcbiAqIFBhcnQgb2YgdGhpcyBzdHJhdGVneSBpbnZvbHZlcyBsb29raW5nIGF0IHRoZSB0YXJnZXQgZW50cnkgcG9pbnQgYW5kIGlkZW50aWZ5aW5nIHRoZSBleHBvcnRlZFxuICogbmFtZSBvZiB0aGUgdGFyZ2V0ZWQgZGVjbGFyYXRpb24sIGFzIGl0IG1pZ2h0IGJlIGRpZmZlcmVudCBmcm9tIHRoZSBkZWNsYXJlZCBuYW1lIChlLmcuIGFcbiAqIGRpcmVjdGl2ZSBtaWdodCBiZSBkZWNsYXJlZCBhcyBGb29EaXJJbXBsLCBidXQgZXhwb3J0ZWQgYXMgRm9vRGlyKS4gSWYgbm8gZXhwb3J0IGNhbiBiZSBmb3VuZFxuICogd2hpY2ggbWFwcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBkaXJlY3RpdmUsIGFuIGVycm9yIGlzIHRocm93bi5cbiAqL1xuZXhwb3J0IGNsYXNzIEFic29sdXRlTW9kdWxlU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICAvKipcbiAgICogQSBjYWNoZSBvZiB0aGUgZXhwb3J0cyBvZiBzcGVjaWZpYyBtb2R1bGVzLCBiZWNhdXNlIHJlc29sdmluZyBhIG1vZHVsZSB0byBpdHMgZXhwb3J0cyBpcyBhXG4gICAqIGNvc3RseSBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIG1vZHVsZUV4cG9ydHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcm90ZWN0ZWQgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcm90ZWN0ZWQgaG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0TW9kZTogSW1wb3J0TW9kZSk6IEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIG1vZHVsZSBuYW1lIGF2YWlsYWJsZSBmb3IgdGhpcyBSZWZlcmVuY2UsIG1lYW5pbmcgaXQgd2FzIGFycml2ZWQgYXQgdmlhIGFcbiAgICAgIC8vIHJlbGF0aXZlIHBhdGguXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCFpc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSkge1xuICAgICAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gaW1wb3J0IHNvbWV0aGluZyB3aGljaCBpc24ndCBhIGRlY2xhcmF0aW9uLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWJ1ZyBhc3NlcnQ6IGltcG9ydGluZyBhIFJlZmVyZW5jZSB0byBub24tZGVjbGFyYXRpb24/Jyk7XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgdGhlIGV4cG9ydGVkIG5hbWUgb2YgdGhlIGRlY2xhcmF0aW9uLCBpZiBvbmUgaXMgYXZhaWxhYmxlLlxuICAgIGNvbnN0IHtzcGVjaWZpZXIsIHJlc29sdXRpb25Db250ZXh0fSA9IHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGU7XG4gICAgY29uc3Qgc3ltYm9sTmFtZSA9IHRoaXMucmVzb2x2ZUltcG9ydE5hbWUoc3BlY2lmaWVyLCByZWYubm9kZSwgcmVzb2x1dGlvbkNvbnRleHQpO1xuICAgIGlmIChzeW1ib2xOYW1lID09PSBudWxsKSB7XG4gICAgICAvLyBUT0RPKGFseGh1Yik6IG1ha2UgdGhpcyBlcnJvciBhIHRzLkRpYWdub3N0aWMgcG9pbnRpbmcgYXQgd2hhdGV2ZXIgY2F1c2VkIHRoaXMgaW1wb3J0IHRvIGJlXG4gICAgICAvLyB0cmlnZ2VyZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFN5bWJvbCAke3JlZi5kZWJ1Z05hbWV9IGRlY2xhcmVkIGluICR7Z2V0U291cmNlRmlsZShyZWYubm9kZSkuZmlsZU5hbWV9IGlzIG5vdCBleHBvcnRlZCBmcm9tICR7c3BlY2lmaWVyfSAoaW1wb3J0IGludG8gJHtjb250ZXh0LmZpbGVOYW1lfSlgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcihuZXcgRXh0ZXJuYWxSZWZlcmVuY2Uoc3BlY2lmaWVyLCBzeW1ib2xOYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVJbXBvcnROYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgdGFyZ2V0OiB0cy5EZWNsYXJhdGlvbiwgZnJvbUZpbGU6IHN0cmluZyk6IHN0cmluZ1xuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSk7XG4gICAgaWYgKGV4cG9ydHMgIT09IG51bGwgJiYgZXhwb3J0cy5oYXModGFyZ2V0KSkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZ2V0KHRhcmdldCkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsIHtcbiAgICBpZiAoIXRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLmhhcyhtb2R1bGVOYW1lKSkge1xuICAgICAgdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuc2V0KG1vZHVsZU5hbWUsIHRoaXMuZW51bWVyYXRlRXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWUsIGZyb21GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5nZXQobW9kdWxlTmFtZSkgITtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUoc3BlY2lmaWVyOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIC8vIEZpcnN0LCByZXNvbHZlIHRoZSBtb2R1bGUgc3BlY2lmaWVyIHRvIGl0cyBlbnRyeSBwb2ludCwgYW5kIGdldCB0aGUgdHMuU3ltYm9sIGZvciBpdC5cbiAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9IHJlc29sdmVNb2R1bGVOYW1lKHNwZWNpZmllciwgZnJvbUZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICBpZiAocmVzb2x2ZWRNb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSB0aGlzLnByb2dyYW0uZ2V0U291cmNlRmlsZShyZXNvbHZlZE1vZHVsZS5yZXNvbHZlZEZpbGVOYW1lKTtcbiAgICBpZiAoZW50cnlQb2ludEZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZXhwb3J0cyA9IHRoaXMucmVmbGVjdGlvbkhvc3QuZ2V0RXhwb3J0c09mTW9kdWxlKGVudHJ5UG9pbnRGaWxlKTtcbiAgICBpZiAoZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGV4cG9ydE1hcCA9IG5ldyBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz4oKTtcbiAgICBleHBvcnRzLmZvckVhY2goKGRlY2xhcmF0aW9uLCBuYW1lKSA9PiB7IGV4cG9ydE1hcC5zZXQoZGVjbGFyYXRpb24ubm9kZSwgbmFtZSk7IH0pO1xuICAgIHJldHVybiBleHBvcnRNYXA7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHZpYSByZWxhdGl2ZSBwYXRocywgcHJvdmlkZWQgdGhleSdyZVxuICogYm90aCBpbiB0aGUgbG9naWNhbCBwcm9qZWN0IFwic3BhY2VcIiBvZiBwYXRocy5cbiAqXG4gKiBUaGlzIGlzIHRyaWNraWVyIHRoYW4gaXQgc291bmRzLCBhcyB0aGUgdHdvIGZpbGVzIG1heSBiZSBpbiBkaWZmZXJlbnQgcm9vdCBkaXJlY3RvcmllcyBpbiB0aGVcbiAqIHByb2plY3QuIFNpbXBseSBjYWxjdWxhdGluZyBhIGZpbGUgc3lzdGVtIHJlbGF0aXZlIHBhdGggYmV0d2VlbiB0aGUgdHdvIGlzIG5vdCBzdWZmaWNpZW50LlxuICogSW5zdGVhZCwgYExvZ2ljYWxQcm9qZWN0UGF0aGBzIGFyZSB1c2VkLlxuICovXG5leHBvcnQgY2xhc3MgTG9naWNhbFByb2plY3RTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgbG9naWNhbEZzOiBMb2dpY2FsRmlsZVN5c3RlbSkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcblxuICAgIC8vIENvbXB1dGUgdGhlIHJlbGF0aXZlIHBhdGggZnJvbSB0aGUgaW1wb3J0aW5nIGZpbGUgdG8gdGhlIGZpbGUgYmVpbmcgaW1wb3J0ZWQuIFRoaXMgaXMgZG9uZVxuICAgIC8vIGFzIGEgbG9naWNhbCBwYXRoIGNvbXB1dGF0aW9uLCBiZWNhdXNlIHRoZSB0d28gZmlsZXMgbWlnaHQgYmUgaW4gZGlmZmVyZW50IHJvb3REaXJzLlxuICAgIGNvbnN0IGRlc3RQYXRoID0gdGhpcy5sb2dpY2FsRnMubG9naWNhbFBhdGhPZlNmKGRlc3RTZik7XG4gICAgaWYgKGRlc3RQYXRoID09PSBudWxsKSB7XG4gICAgICAvLyBUaGUgaW1wb3J0ZWQgZmlsZSBpcyBub3Qgd2l0aGluIHRoZSBsb2dpY2FsIHByb2plY3QgZmlsZXN5c3RlbS5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG9yaWdpblBhdGggPSB0aGlzLmxvZ2ljYWxGcy5sb2dpY2FsUGF0aE9mU2YoY29udGV4dCk7XG4gICAgaWYgKG9yaWdpblBhdGggPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgRGVidWcgYXNzZXJ0OiBhdHRlbXB0IHRvIGltcG9ydCBmcm9tICR7Y29udGV4dC5maWxlTmFtZX0gYnV0IGl0J3Mgb3V0c2lkZSB0aGUgcHJvZ3JhbT9gKTtcbiAgICB9XG5cbiAgICAvLyBUaGVyZSdzIG5vIHdheSB0byBlbWl0IGEgcmVsYXRpdmUgcmVmZXJlbmNlIGZyb20gYSBmaWxlIHRvIGl0c2VsZi5cbiAgICBpZiAoZGVzdFBhdGggPT09IG9yaWdpblBhdGgpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWUgPSBmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlKHJlZi5ub2RlLCBkZXN0U2YsIHRoaXMuY2hlY2tlcik7XG4gICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSB0YXJnZXQgZGVjbGFyYXRpb24gaXNuJ3QgZXhwb3J0ZWQgZnJvbSB0aGUgZmlsZSBpdCdzIGRlY2xhcmVkIGluLiBUaGlzIGlzIGFuIGlzc3VlIVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2l0aCBib3RoIGZpbGVzIGV4cHJlc3NlZCBhcyBMb2dpY2FsUHJvamVjdFBhdGhzLCBnZXR0aW5nIHRoZSBtb2R1bGUgc3BlY2lmaWVyIGFzIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIGlzIG5vdyBzdHJhaWdodGZvcndhcmQuXG4gICAgY29uc3QgbW9kdWxlTmFtZSA9IExvZ2ljYWxQcm9qZWN0UGF0aC5yZWxhdGl2ZVBhdGhCZXR3ZWVuKG9yaWdpblBhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZX0pO1xuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB1c2VzIGEgYEZpbGVUb01vZHVsZUhvc3RgIHRvIGdlbmVyYXRlIGFic29sdXRlIGltcG9ydCByZWZlcmVuY2VzLlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVRvTW9kdWxlU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIGZpbGVUb01vZHVsZUhvc3Q6IEZpbGVUb01vZHVsZUhvc3QpIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IEV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgZGVzdFNmID0gZ2V0U291cmNlRmlsZShyZWYubm9kZSk7XG4gICAgY29uc3QgbmFtZSA9IGZpbmRFeHBvcnRlZE5hbWVPZk5vZGUocmVmLm5vZGUsIGRlc3RTZiwgdGhpcy5jaGVja2VyKTtcbiAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlTmFtZSA9XG4gICAgICAgIHRoaXMuZmlsZVRvTW9kdWxlSG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZShkZXN0U2YuZmlsZU5hbWUsIGNvbnRleHQuZmlsZU5hbWUpO1xuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuIl19