(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/imports/src/emitter", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/file_system/src/util", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/imports/src/find_export"], factory);
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
    /**
     * Flags which alter the imports generated by the `ReferenceEmitter`.
     */
    var ImportFlags;
    (function (ImportFlags) {
        ImportFlags[ImportFlags["None"] = 0] = "None";
        /**
         * Force the generation of a new import when generating a reference, even if an identifier already
         * exists in the target file which could be used instead.
         *
         * This is sometimes required if there's a risk TypeScript might remove imports during emit.
         */
        ImportFlags[ImportFlags["ForceNewImport"] = 1] = "ForceNewImport";
        /**
         * Don't make use of any aliasing information when emitting a reference.
         *
         * This is sometimes required if emitting into a context where generated references will be fed
         * into TypeScript and type-checked (such as in template type-checking).
         */
        ImportFlags[ImportFlags["NoAliasing"] = 2] = "NoAliasing";
    })(ImportFlags = exports.ImportFlags || (exports.ImportFlags = {}));
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
        ReferenceEmitter.prototype.emit = function (ref, context, importFlags) {
            var e_1, _a;
            if (importFlags === void 0) { importFlags = ImportFlags.None; }
            try {
                for (var _b = tslib_1.__values(this.strategies), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var strategy = _c.value;
                    var emitted = strategy.emit(ref, context, importFlags);
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
        LocalIdentifierStrategy.prototype.emit = function (ref, context, importFlags) {
            // If the emitter has specified ForceNewImport, then LocalIdentifierStrategy should not use a
            // local identifier at all, *except* in the source file where the node is actually declared.
            if (importFlags & ImportFlags.ForceNewImport &&
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
        function AbsoluteModuleStrategy(program, checker, moduleResolver, reflectionHost) {
            this.program = program;
            this.checker = checker;
            this.moduleResolver = moduleResolver;
            this.reflectionHost = reflectionHost;
            /**
             * A cache of the exports of specific modules, because resolving a module to its exports is a
             * costly operation.
             */
            this.moduleExportsCache = new Map();
        }
        AbsoluteModuleStrategy.prototype.emit = function (ref, context) {
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
            var entryPointFile = this.moduleResolver.resolveModule(specifier, fromFile);
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
     * A `ReferenceEmitStrategy` which uses a `UnifiedModulesHost` to generate absolute import
     * references.
     */
    var UnifiedModulesStrategy = /** @class */ (function () {
        function UnifiedModulesStrategy(reflector, unifiedModulesHost) {
            this.reflector = reflector;
            this.unifiedModulesHost = unifiedModulesHost;
        }
        UnifiedModulesStrategy.prototype.emit = function (ref, context) {
            var destSf = typescript_1.getSourceFile(ref.node);
            var name = find_export_1.findExportedNameOfNode(ref.node, destSf, this.reflector);
            if (name === null) {
                return null;
            }
            var moduleName = this.unifiedModulesHost.fileNameToModuleName(destSf.fileName, context.fileName);
            return new compiler_1.ExternalExpr({ moduleName: moduleName, name: name });
        };
        return UnifiedModulesStrategy;
    }());
    exports.UnifiedModulesStrategy = UnifiedModulesStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0Y7SUFJL0YsMkVBQWdJO0lBQ2hJLDZFQUEwRDtJQUUxRCxrRkFBeUY7SUFFekYsdUZBQXFEO0lBS3JEOztPQUVHO0lBQ0gsSUFBWSxXQWtCWDtJQWxCRCxXQUFZLFdBQVc7UUFDckIsNkNBQVcsQ0FBQTtRQUVYOzs7OztXQUtHO1FBQ0gsaUVBQXFCLENBQUE7UUFFckI7Ozs7O1dBS0c7UUFDSCx5REFBaUIsQ0FBQTtJQUNuQixDQUFDLEVBbEJXLFdBQVcsR0FBWCxtQkFBVyxLQUFYLG1CQUFXLFFBa0J0QjtJQTJCRDs7Ozs7T0FLRztJQUNIO1FBQ0UsMEJBQW9CLFVBQW1DO1lBQW5DLGVBQVUsR0FBVixVQUFVLENBQXlCO1FBQUcsQ0FBQztRQUUzRCwrQkFBSSxHQUFKLFVBQUssR0FBYyxFQUFFLE9BQXNCLEVBQUUsV0FBMkM7O1lBQTNDLDRCQUFBLEVBQUEsY0FBMkIsV0FBVyxDQUFDLElBQUk7O2dCQUV0RixLQUF1QixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBbkMsSUFBTSxRQUFRLFdBQUE7b0JBQ2pCLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztvQkFDekQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO3dCQUNwQixPQUFPLE9BQU8sQ0FBQztxQkFDaEI7aUJBQ0Y7Ozs7Ozs7OztZQUNELE1BQU0sSUFBSSxLQUFLLENBQ1gsb0NBQWtDLDZCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFB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QXVCLEVBQUUsT0FBc0I7WUFDbEQsSUFBTSxNQUFNLEdBQUcsMEJBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBTSxJQUFJLEdBQUcsb0NBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sVUFBVSxHQUNaLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVwRixPQUFPLElBQUksdUJBQVksQ0FBQyxFQUFDLFVBQVUsWUFBQSxFQUFFLElBQUksTUFBQSxFQUFDLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0gsNkJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLHdEQUFzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7RXhwcmVzc2lvbiwgRXh0ZXJuYWxFeHByLCBFeHRlcm5hbFJlZmVyZW5jZSwgV3JhcHBlZE5vZGVFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtVbmlmaWVkTW9kdWxlc0hvc3R9IGZyb20gJy4uLy4uL2NvcmUvYXBpJztcbmltcG9ydCB7TG9naWNhbEZpbGVTeXN0ZW0sIExvZ2ljYWxQcm9qZWN0UGF0aCwgUGF0aFNlZ21lbnQsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIGRpcm5hbWUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbS9zcmMvdXRpbCc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNEZWNsYXJhdGlvbiwgbm9kZU5hbWVGb3JFcnJvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZmluZEV4cG9ydGVkTmFtZU9mTm9kZX0gZnJvbSAnLi9maW5kX2V4cG9ydCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi9yZWZlcmVuY2VzJztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vcmVzb2x2ZXInO1xuXG5cbi8qKlxuICogRmxhZ3Mgd2hpY2ggYWx0ZXIgdGhlIGltcG9ydHMgZ2VuZXJhdGVkIGJ5IHRoZSBgUmVmZXJlbmNlRW1pdHRlcmAuXG4gKi9cbmV4cG9ydCBlbnVtIEltcG9ydEZsYWdzIHtcbiAgTm9uZSA9IDB4MDAsXG5cbiAgLyoqXG4gICAqIEZvcmNlIHRoZSBnZW5lcmF0aW9uIG9mIGEgbmV3IGltcG9ydCB3aGVuIGdlbmVyYXRpbmcgYSByZWZlcmVuY2UsIGV2ZW4gaWYgYW4gaWRlbnRpZmllciBhbHJlYWR5XG4gICAqIGV4aXN0cyBpbiB0aGUgdGFyZ2V0IGZpbGUgd2hpY2ggY291bGQgYmUgdXNlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBUaGlzIGlzIHNvbWV0aW1lcyByZXF1aXJlZCBpZiB0aGVyZSdzIGEgcmlzayBUeXBlU2NyaXB0IG1pZ2h0IHJlbW92ZSBpbXBvcnRzIGR1cmluZyBlbWl0LlxuICAgKi9cbiAgRm9yY2VOZXdJbXBvcnQgPSAweDAxLFxuXG4gIC8qKlxuICAgKiBEb24ndCBtYWtlIHVzZSBvZiBhbnkgYWxpYXNpbmcgaW5mb3JtYXRpb24gd2hlbiBlbWl0dGluZyBhIHJlZmVyZW5jZS5cbiAgICpcbiAgICogVGhpcyBpcyBzb21ldGltZXMgcmVxdWlyZWQgaWYgZW1pdHRpbmcgaW50byBhIGNvbnRleHQgd2hlcmUgZ2VuZXJhdGVkIHJlZmVyZW5jZXMgd2lsbCBiZSBmZWRcbiAgICogaW50byBUeXBlU2NyaXB0IGFuZCB0eXBlLWNoZWNrZWQgKHN1Y2ggYXMgaW4gdGVtcGxhdGUgdHlwZS1jaGVja2luZykuXG4gICAqL1xuICBOb0FsaWFzaW5nID0gMHgwMixcbn1cblxuLyoqXG4gKiBBIHBhcnRpY3VsYXIgc3RyYXRlZ3kgZm9yIGdlbmVyYXRpbmcgYW4gZXhwcmVzc2lvbiB3aGljaCByZWZlcnMgdG8gYSBgUmVmZXJlbmNlYC5cbiAqXG4gKiBUaGVyZSBhcmUgbWFueSBwb3RlbnRpYWwgd2F5cyBhIGdpdmVuIGBSZWZlcmVuY2VgIGNvdWxkIGJlIHJlZmVycmVkIHRvIGluIHRoZSBjb250ZXh0IG9mIGEgZ2l2ZW5cbiAqIGZpbGUuIEEgbG9jYWwgZGVjbGFyYXRpb24gY291bGQgYmUgYXZhaWxhYmxlLCB0aGUgYFJlZmVyZW5jZWAgY291bGQgYmUgaW1wb3J0YWJsZSB2aWEgYSByZWxhdGl2ZVxuICogaW1wb3J0IHdpdGhpbiB0aGUgcHJvamVjdCwgb3IgYW4gYWJzb2x1dGUgaW1wb3J0IGludG8gYG5vZGVfbW9kdWxlc2AgbWlnaHQgYmUgbmVjZXNzYXJ5LlxuICpcbiAqIERpZmZlcmVudCBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgaW1wbGVtZW50IHNwZWNpZmljIGxvZ2ljIGZvciBnZW5lcmF0aW5nIHN1Y2hcbiAqIHJlZmVyZW5jZXMuIEEgc2luZ2xlIHN0cmF0ZWd5IChzdWNoIGFzIHVzaW5nIGEgbG9jYWwgZGVjbGFyYXRpb24pIG1heSBub3QgYWx3YXlzIGJlIGFibGUgdG9cbiAqIGdlbmVyYXRlIGFuIGV4cHJlc3Npb24gZm9yIGV2ZXJ5IGBSZWZlcmVuY2VgIChmb3IgZXhhbXBsZSwgaWYgbm8gbG9jYWwgaWRlbnRpZmllciBpcyBhdmFpbGFibGUpLFxuICogYW5kIG1heSByZXR1cm4gYG51bGxgIGluIHN1Y2ggYSBjYXNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBFbWl0IGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIGdpdmVuIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhclxuICAgKiBzb3VyY2UgZmlsZSwgaWYgcG9zc2libGUuXG4gICAqXG4gICAqIEBwYXJhbSByZWYgdGhlIGBSZWZlcmVuY2VgIGZvciB3aGljaCB0byBnZW5lcmF0ZSBhbiBleHByZXNzaW9uXG4gICAqIEBwYXJhbSBjb250ZXh0IHRoZSBzb3VyY2UgZmlsZSBpbiB3aGljaCB0aGUgYEV4cHJlc3Npb25gIG11c3QgYmUgdmFsaWRcbiAgICogQHBhcmFtIGltcG9ydE1vZGUgYSBmbGFnIHdoaWNoIGNvbnRyb2xzIHdoZXRoZXIgaW1wb3J0cyBzaG91bGQgYmUgZ2VuZXJhdGVkIG9yIG5vdFxuICAgKiBAcmV0dXJucyBhbiBgRXhwcmVzc2lvbmAgd2hpY2ggcmVmZXJzIHRvIHRoZSBgUmVmZXJlbmNlYCwgb3IgYG51bGxgIGlmIG5vbmUgY2FuIGJlIGdlbmVyYXRlZFxuICAgKi9cbiAgZW1pdChyZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0RmxhZ3M6IEltcG9ydEZsYWdzKTogRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBgRXhwcmVzc2lvbmBzIHdoaWNoIHJlZmVyIHRvIGBSZWZlcmVuY2VgcyBpbiBhIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQSBgUmVmZXJlbmNlRW1pdHRlcmAgdXNlcyBvbmUgb3IgbW9yZSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgdG8gcHJvZHVjZSBhblxuICogYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byBhIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhciBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3RyYXRlZ2llczogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5W10pIHt9XG5cbiAgZW1pdChyZWY6IFJlZmVyZW5jZSwgY29udGV4dDogdHMuU291cmNlRmlsZSwgaW1wb3J0RmxhZ3M6IEltcG9ydEZsYWdzwqA9IEltcG9ydEZsYWdzLk5vbmUpOlxuICAgICAgRXhwcmVzc2lvbiB7XG4gICAgZm9yIChjb25zdCBzdHJhdGVneSBvZiB0aGlzLnN0cmF0ZWdpZXMpIHtcbiAgICAgIGNvbnN0IGVtaXR0ZWQgPSBzdHJhdGVneS5lbWl0KHJlZiwgY29udGV4dCwgaW1wb3J0RmxhZ3MpO1xuICAgICAgaWYgKGVtaXR0ZWQgIT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGVtaXR0ZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYFVuYWJsZSB0byB3cml0ZSBhIHJlZmVyZW5jZSB0byAke25vZGVOYW1lRm9yRXJyb3IocmVmLm5vZGUpfSBpbiAke3JlZi5ub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZX0gZnJvbSAke2NvbnRleHQuZmlsZU5hbWV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIGJ5IGFueSBsb2NhbCBgdHMuSWRlbnRpZmllcmBzLCBpZlxuICogc3VjaCBpZGVudGlmaWVycyBhcmUgYXZhaWxhYmxlLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRGbGFnczogSW1wb3J0RmxhZ3MpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIC8vIElmIHRoZSBlbWl0dGVyIGhhcyBzcGVjaWZpZWQgRm9yY2VOZXdJbXBvcnQsIHRoZW4gTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgc2hvdWxkIG5vdCB1c2UgYVxuICAgIC8vIGxvY2FsIGlkZW50aWZpZXIgYXQgYWxsLCAqZXhjZXB0KiBpbiB0aGUgc291cmNlIGZpbGUgd2hlcmUgdGhlIG5vZGUgaXMgYWN0dWFsbHkgZGVjbGFyZWQuXG4gICAgaWYgKGltcG9ydEZsYWdzICYgSW1wb3J0RmxhZ3MuRm9yY2VOZXdJbXBvcnQgJiZcbiAgICAgICAgZ2V0U291cmNlRmlsZShyZWYubm9kZSkgIT09IGdldFNvdXJjZUZpbGUoY29udGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEEgUmVmZXJlbmNlIGNhbiBoYXZlIG11bHRpcGxlIGlkZW50aXRpZXMgaW4gZGlmZmVyZW50IGZpbGVzLCBzbyBpdCBtYXkgYWxyZWFkeSBoYXZlIGFuXG4gICAgLy8gSWRlbnRpZmllciBpbiB0aGUgcmVxdWVzdGVkIGNvbnRleHQgZmlsZS5cbiAgICBjb25zdCBpZGVudGlmaWVyID0gcmVmLmdldElkZW50aXR5SW4oY29udGV4dCk7XG4gICAgaWYgKGlkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBuZXcgV3JhcHBlZE5vZGVFeHByKGlkZW50aWZpZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHRoYXQgY29tZSBmcm9tIGBub2RlX21vZHVsZXNgIHVzaW5nXG4gKiBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gKlxuICogUGFydCBvZiB0aGlzIHN0cmF0ZWd5IGludm9sdmVzIGxvb2tpbmcgYXQgdGhlIHRhcmdldCBlbnRyeSBwb2ludCBhbmQgaWRlbnRpZnlpbmcgdGhlIGV4cG9ydGVkXG4gKiBuYW1lIG9mIHRoZSB0YXJnZXRlZCBkZWNsYXJhdGlvbiwgYXMgaXQgbWlnaHQgYmUgZGlmZmVyZW50IGZyb20gdGhlIGRlY2xhcmVkIG5hbWUgKGUuZy4gYVxuICogZGlyZWN0aXZlIG1pZ2h0IGJlIGRlY2xhcmVkIGFzIEZvb0RpckltcGwsIGJ1dCBleHBvcnRlZCBhcyBGb29EaXIpLiBJZiBubyBleHBvcnQgY2FuIGJlIGZvdW5kXG4gKiB3aGljaCBtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIGRpcmVjdGl2ZSwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICovXG5leHBvcnQgY2xhc3MgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBBIGNhY2hlIG9mIHRoZSBleHBvcnRzIG9mIHNwZWNpZmljIG1vZHVsZXMsIGJlY2F1c2UgcmVzb2x2aW5nIGEgbW9kdWxlIHRvIGl0cyBleHBvcnRzIGlzIGFcbiAgICogY29zdGx5IG9wZXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgbW9kdWxlRXhwb3J0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIHByb2dyYW06IHRzLlByb2dyYW0sIHByb3RlY3RlZCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByb3RlY3RlZCBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyBtb2R1bGUgbmFtZSBhdmFpbGFibGUgZm9yIHRoaXMgUmVmZXJlbmNlLCBtZWFuaW5nIGl0IHdhcyBhcnJpdmVkIGF0IHZpYSBhXG4gICAgICAvLyByZWxhdGl2ZSBwYXRoLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICghaXNEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGltcG9ydCBzb21ldGhpbmcgd2hpY2ggaXNuJ3QgYSBkZWNsYXJhdGlvbi5cbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVidWcgYXNzZXJ0OiBpbXBvcnRpbmcgYSBSZWZlcmVuY2UgdG8gbm9uLWRlY2xhcmF0aW9uPycpO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBleHBvcnRlZCBuYW1lIG9mIHRoZSBkZWNsYXJhdGlvbiwgaWYgb25lIGlzIGF2YWlsYWJsZS5cbiAgICBjb25zdCB7c3BlY2lmaWVyLCByZXNvbHV0aW9uQ29udGV4dH0gPSByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlO1xuICAgIGNvbnN0IHN5bWJvbE5hbWUgPSB0aGlzLnJlc29sdmVJbXBvcnROYW1lKHNwZWNpZmllciwgcmVmLm5vZGUsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBtYWtlIHRoaXMgZXJyb3IgYSB0cy5EaWFnbm9zdGljIHBvaW50aW5nIGF0IHdoYXRldmVyIGNhdXNlZCB0aGlzIGltcG9ydCB0byBiZVxuICAgICAgLy8gdHJpZ2dlcmVkLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBTeW1ib2wgJHtyZWYuZGVidWdOYW1lfSBkZWNsYXJlZCBpbiAke2dldFNvdXJjZUZpbGUocmVmLm5vZGUpLmZpbGVOYW1lfSBpcyBub3QgZXhwb3J0ZWQgZnJvbSAke3NwZWNpZmllcn0gKGltcG9ydCBpbnRvICR7Y29udGV4dC5maWxlTmFtZX0pYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIobmV3IEV4dGVybmFsUmVmZXJlbmNlKHNwZWNpZmllciwgc3ltYm9sTmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlSW1wb3J0TmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIHRhcmdldDogdHMuRGVjbGFyYXRpb24sIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmdcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpO1xuICAgIGlmIChleHBvcnRzICE9PSBudWxsICYmIGV4cG9ydHMuaGFzKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmdldCh0YXJnZXQpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLnNldChtb2R1bGVOYW1lLCB0aGlzLmVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuZ2V0KG1vZHVsZU5hbWUpICE7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW51bWVyYXRlRXhwb3J0c09mTW9kdWxlKHNwZWNpZmllcjogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsIHtcbiAgICAvLyBGaXJzdCwgcmVzb2x2ZSB0aGUgbW9kdWxlIHNwZWNpZmllciB0byBpdHMgZW50cnkgcG9pbnQsIGFuZCBnZXQgdGhlIHRzLlN5bWJvbCBmb3IgaXQuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGUoc3BlY2lmaWVyLCBmcm9tRmlsZSk7XG4gICAgaWYgKGVudHJ5UG9pbnRGaWxlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoZW50cnlQb2ludEZpbGUpO1xuICAgIGlmIChleHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZXhwb3J0TWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIC8vIEl0J3Mgb2theSB0byBza2lwIGlubGluZSBkZWNsYXJhdGlvbnMsIHNpbmNlIGJ5IGRlZmluaXRpb24gdGhleSdyZSBub3QgdGFyZ2V0LWFibGUgd2l0aCBhXG4gICAgICAvLyB0cy5EZWNsYXJhdGlvbiBhbnl3YXkuXG4gICAgICBpZiAoZGVjbGFyYXRpb24ubm9kZSAhPT0gbnVsbCkge1xuICAgICAgICBleHBvcnRNYXAuc2V0KGRlY2xhcmF0aW9uLm5vZGUsIG5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBleHBvcnRNYXA7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHZpYSByZWxhdGl2ZSBwYXRocywgcHJvdmlkZWQgdGhleSdyZVxuICogYm90aCBpbiB0aGUgbG9naWNhbCBwcm9qZWN0IFwic3BhY2VcIiBvZiBwYXRocy5cbiAqXG4gKiBUaGlzIGlzIHRyaWNraWVyIHRoYW4gaXQgc291bmRzLCBhcyB0aGUgdHdvIGZpbGVzIG1heSBiZSBpbiBkaWZmZXJlbnQgcm9vdCBkaXJlY3RvcmllcyBpbiB0aGVcbiAqIHByb2plY3QuIFNpbXBseSBjYWxjdWxhdGluZyBhIGZpbGUgc3lzdGVtIHJlbGF0aXZlIHBhdGggYmV0d2VlbiB0aGUgdHdvIGlzIG5vdCBzdWZmaWNpZW50LlxuICogSW5zdGVhZCwgYExvZ2ljYWxQcm9qZWN0UGF0aGBzIGFyZSB1c2VkLlxuICovXG5leHBvcnQgY2xhc3MgTG9naWNhbFByb2plY3RTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBsb2dpY2FsRnM6IExvZ2ljYWxGaWxlU3lzdGVtKSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcmVsYXRpdmUgcGF0aCBmcm9tIHRoZSBpbXBvcnRpbmcgZmlsZSB0byB0aGUgZmlsZSBiZWluZyBpbXBvcnRlZC4gVGhpcyBpcyBkb25lXG4gICAgLy8gYXMgYSBsb2dpY2FsIHBhdGggY29tcHV0YXRpb24sIGJlY2F1c2UgdGhlIHR3byBmaWxlcyBtaWdodCBiZSBpbiBkaWZmZXJlbnQgcm9vdERpcnMuXG4gICAgY29uc3QgZGVzdFBhdGggPSB0aGlzLmxvZ2ljYWxGcy5sb2dpY2FsUGF0aE9mU2YoZGVzdFNmKTtcbiAgICBpZiAoZGVzdFBhdGggPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBpbXBvcnRlZCBmaWxlIGlzIG5vdCB3aXRoaW4gdGhlIGxvZ2ljYWwgcHJvamVjdCBmaWxlc3lzdGVtLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luUGF0aCA9IHRoaXMubG9naWNhbEZzLmxvZ2ljYWxQYXRoT2ZTZihjb250ZXh0KTtcbiAgICBpZiAob3JpZ2luUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBEZWJ1ZyBhc3NlcnQ6IGF0dGVtcHQgdG8gaW1wb3J0IGZyb20gJHtjb250ZXh0LmZpbGVOYW1lfSBidXQgaXQncyBvdXRzaWRlIHRoZSBwcm9ncmFtP2ApO1xuICAgIH1cblxuICAgIC8vIFRoZXJlJ3Mgbm8gd2F5IHRvIGVtaXQgYSByZWxhdGl2ZSByZWZlcmVuY2UgZnJvbSBhIGZpbGUgdG8gaXRzZWxmLlxuICAgIGlmIChkZXN0UGF0aCA9PT0gb3JpZ2luUGF0aCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZSA9IGZpbmRFeHBvcnRlZE5hbWVPZk5vZGUocmVmLm5vZGUsIGRlc3RTZiwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICAvLyBUaGUgdGFyZ2V0IGRlY2xhcmF0aW9uIGlzbid0IGV4cG9ydGVkIGZyb20gdGhlIGZpbGUgaXQncyBkZWNsYXJlZCBpbi4gVGhpcyBpcyBhbiBpc3N1ZSFcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdpdGggYm90aCBmaWxlcyBleHByZXNzZWQgYXMgTG9naWNhbFByb2plY3RQYXRocywgZ2V0dGluZyB0aGUgbW9kdWxlIHNwZWNpZmllciBhcyBhIHJlbGF0aXZlXG4gICAgLy8gcGF0aCBpcyBub3cgc3RyYWlnaHRmb3J3YXJkLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBMb2dpY2FsUHJvamVjdFBhdGgucmVsYXRpdmVQYXRoQmV0d2VlbihvcmlnaW5QYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggY29uc3RydWN0cyByZWxhdGl2ZXMgcGF0aHMgYmV0d2VlbiBgdHMuU291cmNlRmlsZWBzLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgY2FuIGJlIHVzZWQgaWYgdGhlcmUgaXMgbm8gYHJvb3REaXJgL2Byb290RGlyc2Agc3RydWN0dXJlIGZvciB0aGUgcHJvamVjdCB3aGljaFxuICogbmVjZXNzaXRhdGVzIHRoZSBzdHJvbmdlciBsb2dpYyBvZiBgTG9naWNhbFByb2plY3RTdHJhdGVneWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWxhdGl2ZVBhdGhTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcbiAgICBsZXQgbW9kdWxlTmFtZSA9IHN0cmlwRXh0ZW5zaW9uKFxuICAgICAgICByZWxhdGl2ZShkaXJuYW1lKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29udGV4dCkpLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGRlc3RTZikpKTtcbiAgICBpZiAoIW1vZHVsZU5hbWUuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIG1vZHVsZU5hbWUgPSAoJy4vJyArIG1vZHVsZU5hbWUpIGFzIFBhdGhTZWdtZW50O1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWUgPSBmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlKHJlZi5ub2RlLCBkZXN0U2YsIHRoaXMucmVmbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZX0pO1xuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB1c2VzIGEgYFVuaWZpZWRNb2R1bGVzSG9zdGAgdG8gZ2VuZXJhdGUgYWJzb2x1dGUgaW1wb3J0XG4gKiByZWZlcmVuY2VzLlxuICovXG5leHBvcnQgY2xhc3MgVW5pZmllZE1vZHVsZXNTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSB1bmlmaWVkTW9kdWxlc0hvc3Q6IFVuaWZpZWRNb2R1bGVzSG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcbiAgICBjb25zdCBuYW1lID0gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShyZWYubm9kZSwgZGVzdFNmLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPVxuICAgICAgICB0aGlzLnVuaWZpZWRNb2R1bGVzSG9zdC5maWxlTmFtZVRvTW9kdWxlTmFtZShkZXN0U2YuZmlsZU5hbWUsIGNvbnRleHQuZmlsZU5hbWUpO1xuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuIl19