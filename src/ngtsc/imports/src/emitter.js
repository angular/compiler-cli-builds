(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/imports/src/emitter", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/file_system/src/util", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/imports/src/find_export", "@angular/compiler-cli/src/ngtsc/imports/src/references"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var compiler_1 = require("@angular/compiler");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/file_system/src/util");
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
            return new compiler_1.ExternalExpr(new compiler_1.ExternalReference(specifier, symbolName));
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
            var entryPointFile = typescript_1.getSourceFileOrNull(this.program, file_system_1.absoluteFrom(resolvedModule.resolvedFileName));
            if (entryPointFile === null) {
                return null;
            }
            var exports = this.reflectionHost.getExportsOfModule(entryPointFile);
            if (exports === null) {
                return null;
            }
            var exportMap = new Map();
            exports.forEach(function (declaration, name) {
                // It's okay to skip inline declarations, since by definition they're not target-able with a
                // ts.Declaration anyway.
                if (declaration.node !== null) {
                    exportMap.set(declaration.node, name);
                }
            });
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
        function LogicalProjectStrategy(reflector, logicalFs) {
            this.reflector = reflector;
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
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.reflector);
            if (name === null) {
                // The target declaration isn't exported from the file it's declared in. This is an issue!
                return null;
            }
            // With both files expressed as LogicalProjectPaths, getting the module specifier as a relative
            // path is now straightforward.
            var moduleName = file_system_1.LogicalProjectPath.relativePathBetween(originPath, destPath);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return LogicalProjectStrategy;
    }());
    exports.LogicalProjectStrategy = LogicalProjectStrategy;
    /**
     * A `ReferenceEmitStrategy` which constructs relatives paths between `ts.SourceFile`s.
     *
     * This strategy can be used if there is no `rootDir`/`rootDirs` structure for the project which
     * necessitates the stronger logic of `LogicalProjectStrategy`.
     */
    var RelativePathStrategy = /** @class */ (function () {
        function RelativePathStrategy(reflector) {
            this.reflector = reflector;
        }
        RelativePathStrategy.prototype.emit = function (ref, context) {
            var destSf = typescript_1.getSourceFile(ref.node);
            var moduleName = util_1.stripExtension(file_system_1.relative(file_system_1.dirname(file_system_1.absoluteFromSourceFile(context)), file_system_1.absoluteFromSourceFile(destSf)));
            if (!moduleName.startsWith('../')) {
                moduleName = ('./' + moduleName);
            }
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.reflector);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return RelativePathStrategy;
    }());
    exports.RelativePathStrategy = RelativePathStrategy;
    /**
     * A `ReferenceEmitStrategy` which uses a `FileToModuleHost` to generate absolute import references.
     */
    var FileToModuleStrategy = /** @class */ (function () {
        function FileToModuleStrategy(reflector, fileToModuleHost) {
            this.reflector = reflector;
            this.fileToModuleHost = fileToModuleHost;
        }
        FileToModuleStrategy.prototype.emit = function (ref, context) {
            var destSf = typescript_1.getSourceFile(ref.node);
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.reflector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0Y7SUFHL0YsMkVBQWlLO0lBQ2pLLDZFQUEwRDtJQUUxRCxrRkFBaUk7SUFFakksdUZBQXFEO0lBQ3JELHFGQUFtRDtJQXVDbkQ7Ozs7O09BS0c7SUFDSDtRQUNFLDBCQUFvQixVQUFtQztZQUFuQyxlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQUFHLENBQUM7UUFFM0QsK0JBQUksR0FBSixVQUNJLEdBQWMsRUFBRSxPQUFzQixFQUN0QyxVQUFxRDs7WUFBckQsMkJBQUEsRUFBQSxhQUF5Qix1QkFBVSxDQUFDLGlCQUFpQjs7Z0JBQ3ZELEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7d0JBQ3BCLE9BQU8sT0FBTyxDQUFDO3FCQUNoQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCxvQ0FBa0MsNkJBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxjQUFTLE9BQU8sQ0FBQyxRQUFVLENBQUMsQ0FBQztRQUN2SSxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLDRDQUFnQjtJQWlCN0I7OztPQUdHO0lBQ0g7UUFBQTtRQWtCQSxD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QWdCO1lBQVUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUFHLENBQUM7UUFFN0YsbUNBQUksR0FBSixVQUFLLEdBQXVCLEVBQUUsT0FBc0I7WUFDbEQsSUFBTSxNQUFNLEdBQUcsMEJBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVsRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsMkJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLG9EQUFvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtMb2dpY2FsRmlsZVN5c3RlbSwgTG9naWNhbFByb2plY3RQYXRoLCBQYXRoU2VnbWVudCwgYWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBiYXNlbmFtZSwgZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7c3RyaXBFeHRlbnNpb259IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtL3NyYy91dGlsJztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtnZXRTb3VyY2VGaWxlLCBnZXRTb3VyY2VGaWxlT3JOdWxsLCBpc0RlY2xhcmF0aW9uLCBub2RlTmFtZUZvckVycm9yLCByZXNvbHZlTW9kdWxlTmFtZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZmluZEV4cG9ydGVkTmFtZU9mTm9kZX0gZnJvbSAnLi9maW5kX2V4cG9ydCc7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9yZWZlcmVuY2VzJztcblxuXG5cbi8qKlxuICogQSBob3N0IHdoaWNoIHN1cHBvcnRzIGFuIG9wZXJhdGlvbiB0byBjb252ZXJ0IGEgZmlsZSBuYW1lIGludG8gYSBtb2R1bGUgbmFtZS5cbiAqXG4gKiBUaGlzIG9wZXJhdGlvbiBpcyB0eXBpY2FsbHkgaW1wbGVtZW50ZWQgYXMgcGFydCBvZiB0aGUgY29tcGlsZXIgaG9zdCBwYXNzZWQgdG8gbmd0c2Mgd2hlbiBydW5uaW5nXG4gKiB1bmRlciBhIGJ1aWxkIHRvb2wgbGlrZSBCYXplbCBvciBCbGF6ZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGaWxlVG9Nb2R1bGVIb3N0IHtcbiAgZmlsZU5hbWVUb01vZHVsZU5hbWUoaW1wb3J0ZWRGaWxlUGF0aDogc3RyaW5nLCBjb250YWluaW5nRmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIHBhcnRpY3VsYXIgc3RyYXRlZ3kgZm9yIGdlbmVyYXRpbmcgYW4gZXhwcmVzc2lvbiB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYC5cbiAqXG4gKiBUaGVyZSBhcmUgbWFueSBwb3RlbnRpYWwgd2F5cyBhIGdpdmVuIGBSZWZlcmVuY2VgIGNvdWxkIGJlIHJlZmVycmVkIHRvIGluIHRoZSBjb250ZXh0IG9mIGEgZ2l2ZW5cbiAqIGZpbGUuIEEgbG9jYWwgZGVjbGFyYXRpb24gY291bGQgYmUgYXZhaWxhYmxlLCB0aGUgYFJlZmVyZW5jZWAgY291bGQgYmUgaW1wb3J0YWJsZSB2aWEgYSByZWxhdGl2ZVxuICogaW1wb3J0IHdpdGhpbiB0aGUgcHJvamVjdCwgb3IgYW4gYWJzb2x1dGUgaW1wb3J0IGludG8gYG5vZGVfbW9kdWxlc2AgbWlnaHQgYmUgbmVjZXNzYXJ5LlxuICpcbiAqIERpZmZlcmVudCBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgaW1wbGVtZW50IHNwZWNpZmljIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHN1Y2hcbiAqIHJlZmVyZW5jZXMuIEEgc2luZ2xlIHN0cmF0ZWd5IChzdWNoIGFzIHVzaW5nIGEgbG9jYWwgZGVjbGFyYXRpb24pIG1heSBub3QgYWx3YXlzIGJlIGFibGUgdG9cbiAqIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGV2ZXJ5IGBSZWZlcmVuY2VgIChmb3IgZXhhbXBsZSwgaWYgbm8gbG9jYWwgaWRlbnRpZmllciBpcyBhdmFpbGFibGUpLFxuICogYW5kIG1heSByZXR1cm4gYG51bGxgIGluIHN1Y2ggYSBjYXNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBFbWl0IGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIGdpdmVuIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhclxuICAgKiBzb3VyY2UgZmlsZSwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgdGhlIGBSZWZlcmVuY2VgIGZvciB3aGljaCB0byBnZW5lcmF0ZSBhbiBleHByZXNzaW9uXG4gICAqIEBwYXJhbSBjb250ZXh0IHRoZSBzb3VyY2UgZmlsZSBpbiB3aGljaCB0aGUgYEV4cHJlc3Npb25gIG11c3QgYmUgdmFsaWRcbiAgICogQHBhcmFtIGltcG9ydE1vZGUgYSBmbGFnIHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgaW1wb3J0cyBzaG91bGQgYmUgZ2VuZXJhdGVkIG9yIG5vdFxuICAgKiBAcmV0dXJucyBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSBgUmVmZXJlbmNlYCwgb3IgYG51bGxgIGlmIG5vbmUgY2FuIGJlIGdlbmVyYXRlZFxuICAgKi9cbiAgZW1pdChyZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0TW9kZTogSW1wb3J0TW9kZSk6IEV4cHJlc3Npb258bnVsbDtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYEV4cHJlc3Npb25gcyB3aGljaCByZWZlciB0byBgUmVmZXJlbmNlYHMgaW4gYSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEEgYFJlZmVyZW5jZUVtaXR0ZXJgIHVzZXMgb25lIG9yIG1vcmUgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgaW1wbGVtZW50YXRpb25zIHRvIHByb2R1Y2UgYW5cbiAqIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYCBpbiB0aGUgY29udGV4dCBvZiBhIHBhcnRpY3VsYXIgZmlsZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlZmVyZW5jZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHN0cmF0ZWdpZXM6IFJlZmVyZW5jZUVtaXRTdHJhdGVneVtdKSB7fVxuXG4gIGVtaXQoXG4gICAgICByZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSxcbiAgICAgIGltcG9ydE1vZGU6IEltcG9ydE1vZGXCoD0gSW1wb3J0TW9kZS5Vc2VFeGlzdGluZ0ltcG9ydCk6IEV4cHJlc3Npb24ge1xuICAgIGZvciAoY29uc3Qgc3RyYXRlZ3kgb2YgdGhpcy5zdHJhdGVnaWVzKSB7XG4gICAgICBjb25zdCBlbWl0dGVkID0gc3RyYXRlZ3kuZW1pdChyZWYsIGNvbnRleHQsIGltcG9ydE1vZGUpO1xuICAgICAgaWYgKGVtaXR0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFVuYWJsZSB0byB3cml0ZSBhIHJlZmVyZW5jZSB0byAke25vZGVOYW1lRm9yRXJyb3IocmVmLm5vZGUpfSBpbiAke3JlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0gZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIGJ5IGFueSBsb2NhbCBgdHMuSWRlbnRpZmllcmBzLCBpZlxuICogc3VjaCBpZGVudGlmaWVycyBhcmUgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICAvLyBJZiB0aGUgZW1pdHRlciBoYXMgc3BlY2lmaWVkIEZvcmNlTmV3SW1wb3J0LCB0aGVuIExvY2FsSWRlbnRpZmllclN0cmF0ZWd5IHNob3VsZCBub3QgdXNlIGFcbiAgICAvLyBsb2NhbCBpZGVudGlmaWVyIGF0IGFsbCwgKmV4Y2VwdCogaW4gdGhlIHNvdXJjZSBmaWxlIHdoZXJlIHRoZSBub2RlIGlzIGFjdHVhbGx5IGRlY2xhcmVkLlxuICAgIGlmIChpbXBvcnRNb2RlID09PSBJbXBvcnRNb2RlLkZvcmNlTmV3SW1wb3J0ICYmXG4gICAgICAgIGdldFNvdXJjZUZpbGUocmVmLm5vZGUpICE9PSBnZXRTb3VyY2VGaWxlKGNvbnRleHQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBBIFJlZmVyZW5jZSBjYW4gaGF2ZSBtdWx0aXBsZSBpZGVudGl0aWVzIGluIGRpZmZlcmVudCBmaWxlcywgc28gaXQgbWF5IGFscmVhZHkgaGF2ZSBhblxuICAgIC8vIElkZW50aWZpZXIgaW4gdGhlIHJlcXVlc3RlZCBjb250ZXh0IGZpbGUuXG4gICAgY29uc3QgaWRlbnRpZmllciA9IHJlZi5nZXRJZGVudGl0eUluKGNvbnRleHQpO1xuICAgIGlmIChpZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbmV3IFdyYXBwZWROb2RlRXhwcihpZGVudGlmaWVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB3aWxsIHJlZmVyIHRvIGRlY2xhcmF0aW9ucyB0aGF0IGNvbWUgZnJvbSBgbm9kZV9tb2R1bGVzYCB1c2luZ1xuICogYW4gYWJzb2x1dGUgaW1wb3J0LlxuICpcbiAqIFBhcnQgb2YgdGhpcyBzdHJhdGVneSBpbnZvbHZlcyBsb29raW5nIGF0IHRoZSB0YXJnZXQgZW50cnkgcG9pbnQgYW5kIGlkZW50aWZ5aW5nIHRoZSBleHBvcnRlZFxuICogbmFtZSBvZiB0aGUgdGFyZ2V0ZWQgZGVjbGFyYXRpb24sIGFzIGl0IG1pZ2h0IGJlIGRpZmZlcmVudCBmcm9tIHRoZSBkZWNsYXJlZCBuYW1lIChlLmcuIGFcbiAqIGRpcmVjdGl2ZSBtaWdodCBiZSBkZWNsYXJlZCBhcyBGb29EaXJJbXBsLCBidXQgZXhwb3J0ZWQgYXMgRm9vRGlyKS4gSWYgbm8gZXhwb3J0IGNhbiBiZSBmb3VuZFxuICogd2hpY2ggbWFwcyBiYWNrIHRvIHRoZSBvcmlnaW5hbCBkaXJlY3RpdmUsIGFuIGVycm9yIGlzIHRocm93bi5cbiAqL1xuZXhwb3J0IGNsYXNzIEFic29sdXRlTW9kdWxlU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICAvKipcbiAgICogQSBjYWNoZSBvZiB0aGUgZXhwb3J0cyBvZiBzcGVjaWZpYyBtb2R1bGVzLCBiZWNhdXNlIHJlc29sdmluZyBhIG1vZHVsZSB0byBpdHMgZXhwb3J0cyBpcyBhXG4gICAqIGNvc3RseSBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIG1vZHVsZUV4cG9ydHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBwcm90ZWN0ZWQgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsXG4gICAgICBwcm90ZWN0ZWQgb3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBwcm90ZWN0ZWQgaG9zdDogdHMuQ29tcGlsZXJIb3N0LFxuICAgICAgcHJpdmF0ZSByZWZsZWN0aW9uSG9zdDogUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0TW9kZTogSW1wb3J0TW9kZSk6IEV4cHJlc3Npb258bnVsbCB7XG4gICAgaWYgKHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIG1vZHVsZSBuYW1lIGF2YWlsYWJsZSBmb3IgdGhpcyBSZWZlcmVuY2UsIG1lYW5pbmcgaXQgd2FzIGFycml2ZWQgYXQgdmlhIGFcbiAgICAgIC8vIHJlbGF0aXZlIHBhdGguXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKCFpc0RlY2xhcmF0aW9uKHJlZi5ub2RlKSkge1xuICAgICAgLy8gSXQncyBub3QgcG9zc2libGUgdG8gaW1wb3J0IHNvbWV0aGluZyB3aGljaCBpc24ndCBhIGRlY2xhcmF0aW9uLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEZWJ1ZyBhc3NlcnQ6IGltcG9ydGluZyBhIFJlZmVyZW5jZSB0byBub24tZGVjbGFyYXRpb24/Jyk7XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgdGhlIGV4cG9ydGVkIG5hbWUgb2YgdGhlIGRlY2xhcmF0aW9uLCBpZiBvbmUgaXMgYXZhaWxhYmxlLlxuICAgIGNvbnN0IHtzcGVjaWZpZXIsIHJlc29sdXRpb25Db250ZXh0fSA9IHJlZi5iZXN0R3Vlc3NPd25pbmdNb2R1bGU7XG4gICAgY29uc3Qgc3ltYm9sTmFtZSA9IHRoaXMucmVzb2x2ZUltcG9ydE5hbWUoc3BlY2lmaWVyLCByZWYubm9kZSwgcmVzb2x1dGlvbkNvbnRleHQpO1xuICAgIGlmIChzeW1ib2xOYW1lID09PSBudWxsKSB7XG4gICAgICAvLyBUT0RPKGFseGh1Yik6IG1ha2UgdGhpcyBlcnJvciBhIHRzLkRpYWdub3N0aWMgcG9pbnRpbmcgYXQgd2hhdGV2ZXIgY2F1c2VkIHRoaXMgaW1wb3J0IHRvIGJlXG4gICAgICAvLyB0cmlnZ2VyZWQuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFN5bWJvbCAke3JlZi5kZWJ1Z05hbWV9IGRlY2xhcmVkIGluICR7Z2V0U291cmNlRmlsZShyZWYubm9kZSkuZmlsZU5hbWV9IGlzIG5vdCBleHBvcnRlZCBmcm9tICR7c3BlY2lmaWVyfSAoaW1wb3J0IGludG8gJHtjb250ZXh0LmZpbGVOYW1lfSlgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcihuZXcgRXh0ZXJuYWxSZWZlcmVuY2Uoc3BlY2lmaWVyLCBzeW1ib2xOYW1lKSk7XG4gIH1cblxuICBwcml2YXRlIHJlc29sdmVJbXBvcnROYW1lKG1vZHVsZU5hbWU6IHN0cmluZywgdGFyZ2V0OiB0cy5EZWNsYXJhdGlvbiwgZnJvbUZpbGU6IHN0cmluZyk6IHN0cmluZ1xuICAgICAgfG51bGwge1xuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLmdldEV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSk7XG4gICAgaWYgKGV4cG9ydHMgIT09IG51bGwgJiYgZXhwb3J0cy5oYXModGFyZ2V0KSkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZ2V0KHRhcmdldCkgITtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZTogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsIHtcbiAgICBpZiAoIXRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLmhhcyhtb2R1bGVOYW1lKSkge1xuICAgICAgdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuc2V0KG1vZHVsZU5hbWUsIHRoaXMuZW51bWVyYXRlRXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWUsIGZyb21GaWxlKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5nZXQobW9kdWxlTmFtZSkgITtcbiAgfVxuXG4gIHByb3RlY3RlZCBlbnVtZXJhdGVFeHBvcnRzT2ZNb2R1bGUoc3BlY2lmaWVyOiBzdHJpbmcsIGZyb21GaWxlOiBzdHJpbmcpOlxuICAgICAgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+fG51bGwge1xuICAgIC8vIEZpcnN0LCByZXNvbHZlIHRoZSBtb2R1bGUgc3BlY2lmaWVyIHRvIGl0cyBlbnRyeSBwb2ludCwgYW5kIGdldCB0aGUgdHMuU3ltYm9sIGZvciBpdC5cbiAgICBjb25zdCByZXNvbHZlZE1vZHVsZSA9IHJlc29sdmVNb2R1bGVOYW1lKHNwZWNpZmllciwgZnJvbUZpbGUsIHRoaXMub3B0aW9ucywgdGhpcy5ob3N0KTtcbiAgICBpZiAocmVzb2x2ZWRNb2R1bGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGUgPVxuICAgICAgICBnZXRTb3VyY2VGaWxlT3JOdWxsKHRoaXMucHJvZ3JhbSwgYWJzb2x1dGVGcm9tKHJlc29sdmVkTW9kdWxlLnJlc29sdmVkRmlsZU5hbWUpKTtcbiAgICBpZiAoZW50cnlQb2ludEZpbGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGV4cG9ydHMgPSB0aGlzLnJlZmxlY3Rpb25Ib3N0LmdldEV4cG9ydHNPZk1vZHVsZShlbnRyeVBvaW50RmlsZSk7XG4gICAgaWYgKGV4cG9ydHMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBleHBvcnRNYXAgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBzdHJpbmc+KCk7XG4gICAgZXhwb3J0cy5mb3JFYWNoKChkZWNsYXJhdGlvbiwgbmFtZSkgPT4ge1xuICAgICAgLy8gSXQncyBva2F5IHRvIHNraXAgaW5saW5lIGRlY2xhcmF0aW9ucywgc2luY2UgYnkgZGVmaW5pdGlvbiB0aGV5J3JlIG5vdCB0YXJnZXQtYWJsZSB3aXRoIGFcbiAgICAgIC8vIHRzLkRlY2xhcmF0aW9uIGFueXdheS5cbiAgICAgIGlmIChkZWNsYXJhdGlvbi5ub2RlICE9PSBudWxsKSB7XG4gICAgICAgIGV4cG9ydE1hcC5zZXQoZGVjbGFyYXRpb24ubm9kZSwgbmFtZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGV4cG9ydE1hcDtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggd2lsbCByZWZlciB0byBkZWNsYXJhdGlvbnMgdmlhIHJlbGF0aXZlIHBhdGhzLCBwcm92aWRlZCB0aGV5J3JlXG4gKiBib3RoIGluIHRoZSBsb2dpY2FsIHByb2plY3QgXCJzcGFjZVwiIG9mIHBhdGhzLlxuICpcbiAqIFRoaXMgaXMgdHJpY2tpZXIgdGhhbiBpdCBzb3VuZHMsIGFzIHRoZSB0d28gZmlsZXMgbWF5IGJlIGluIGRpZmZlcmVudCByb290IGRpcmVjdG9yaWVzIGluIHRoZVxuICogcHJvamVjdC4gU2ltcGx5IGNhbGN1bGF0aW5nIGEgZmlsZSBzeXN0ZW0gcmVsYXRpdmUgcGF0aCBiZXR3ZWVuIHRoZSB0d28gaXMgbm90IHN1ZmZpY2llbnQuXG4gKiBJbnN0ZWFkLCBgTG9naWNhbFByb2plY3RQYXRoYHMgYXJlIHVzZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5IGltcGxlbWVudHMgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGxvZ2ljYWxGczogTG9naWNhbEZpbGVTeXN0ZW0pIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZTx0cy5Ob2RlPiwgY29udGV4dDogdHMuU291cmNlRmlsZSk6IEV4cHJlc3Npb258bnVsbCB7XG4gICAgY29uc3QgZGVzdFNmID0gZ2V0U291cmNlRmlsZShyZWYubm9kZSk7XG5cbiAgICAvLyBDb21wdXRlIHRoZSByZWxhdGl2ZSBwYXRoIGZyb20gdGhlIGltcG9ydGluZyBmaWxlIHRvIHRoZSBmaWxlIGJlaW5nIGltcG9ydGVkLiBUaGlzIGlzIGRvbmVcbiAgICAvLyBhcyBhIGxvZ2ljYWwgcGF0aCBjb21wdXRhdGlvbiwgYmVjYXVzZSB0aGUgdHdvIGZpbGVzIG1pZ2h0IGJlIGluIGRpZmZlcmVudCByb290RGlycy5cbiAgICBjb25zdCBkZXN0UGF0aCA9IHRoaXMubG9naWNhbEZzLmxvZ2ljYWxQYXRoT2ZTZihkZXN0U2YpO1xuICAgIGlmIChkZXN0UGF0aCA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlIGltcG9ydGVkIGZpbGUgaXMgbm90IHdpdGhpbiB0aGUgbG9naWNhbCBwcm9qZWN0IGZpbGVzeXN0ZW0uXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5QYXRoID0gdGhpcy5sb2dpY2FsRnMubG9naWNhbFBhdGhPZlNmKGNvbnRleHQpO1xuICAgIGlmIChvcmlnaW5QYXRoID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYERlYnVnIGFzc2VydDogYXR0ZW1wdCB0byBpbXBvcnQgZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9IGJ1dCBpdCdzIG91dHNpZGUgdGhlIHByb2dyYW0/YCk7XG4gICAgfVxuXG4gICAgLy8gVGhlcmUncyBubyB3YXkgdG8gZW1pdCBhIHJlbGF0aXZlIHJlZmVyZW5jZSBmcm9tIGEgZmlsZSB0byBpdHNlbGYuXG4gICAgaWYgKGRlc3RQYXRoID09PSBvcmlnaW5QYXRoKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBuYW1lID0gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShyZWYubm9kZSwgZGVzdFNmLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSB0YXJnZXQgZGVjbGFyYXRpb24gaXNuJ3QgZXhwb3J0ZWQgZnJvbSB0aGUgZmlsZSBpdCdzIGRlY2xhcmVkIGluLiBUaGlzIGlzIGFuIGlzc3VlIVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gV2l0aCBib3RoIGZpbGVzIGV4cHJlc3NlZCBhcyBMb2dpY2FsUHJvamVjdFBhdGhzLCBnZXR0aW5nIHRoZSBtb2R1bGUgc3BlY2lmaWVyIGFzIGEgcmVsYXRpdmVcbiAgICAvLyBwYXRoIGlzIG5vdyBzdHJhaWdodGZvcndhcmQuXG4gICAgY29uc3QgbW9kdWxlTmFtZSA9IExvZ2ljYWxQcm9qZWN0UGF0aC5yZWxhdGl2ZVBhdGhCZXR3ZWVuKG9yaWdpblBhdGgsIGRlc3RQYXRoKTtcbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZX0pO1xuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCBjb25zdHJ1Y3RzIHJlbGF0aXZlcyBwYXRocyBiZXR3ZWVuIGB0cy5Tb3VyY2VGaWxlYHMuXG4gKlxuICogVGhpcyBzdHJhdGVneSBjYW4gYmUgdXNlZCBpZiB0aGVyZSBpcyBubyBgcm9vdERpcmAvYHJvb3REaXJzYCBzdHJ1Y3R1cmUgZm9yIHRoZSBwcm9qZWN0IHdoaWNoXG4gKiBuZWNlc3NpdGF0ZXMgdGhlIHN0cm9uZ2VyIGxvZ2ljIG9mIGBMb2dpY2FsUHJvamVjdFN0cmF0ZWd5YC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlbGF0aXZlUGF0aFN0cmF0ZWd5IGltcGxlbWVudHMgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuICAgIGxldCBtb2R1bGVOYW1lID0gc3RyaXBFeHRlbnNpb24oXG4gICAgICAgIHJlbGF0aXZlKGRpcm5hbWUoYWJzb2x1dGVGcm9tU291cmNlRmlsZShjb250ZXh0KSksIGFic29sdXRlRnJvbVNvdXJjZUZpbGUoZGVzdFNmKSkpO1xuICAgIGlmICghbW9kdWxlTmFtZS5zdGFydHNXaXRoKCcuLi8nKSkge1xuICAgICAgbW9kdWxlTmFtZSA9ICgnLi8nICsgbW9kdWxlTmFtZSkgYXMgUGF0aFNlZ21lbnQ7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZSA9IGZpbmRFeHBvcnRlZE5hbWVPZk5vZGUocmVmLm5vZGUsIGRlc3RTZiwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHVzZXMgYSBgRmlsZVRvTW9kdWxlSG9zdGAgdG8gZ2VuZXJhdGUgYWJzb2x1dGUgaW1wb3J0IHJlZmVyZW5jZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBGaWxlVG9Nb2R1bGVTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBmaWxlVG9Nb2R1bGVIb3N0OiBGaWxlVG9Nb2R1bGVIb3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuICAgIGNvbnN0IG5hbWUgPSBmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlKHJlZi5ub2RlLCBkZXN0U2YsIHRoaXMucmVmbGVjdG9yKTtcbiAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbW9kdWxlTmFtZSA9XG4gICAgICAgIHRoaXMuZmlsZVRvTW9kdWxlSG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZShkZXN0U2YuZmlsZU5hbWUsIGNvbnRleHQuZmlsZU5hbWUpO1xuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuIl19