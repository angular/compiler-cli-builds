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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1pdHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvZW1pdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBK0Y7SUFHL0YsMkVBQWdJO0lBQ2hJLDZFQUEwRDtJQUUxRCxrRkFBeUY7SUFFekYsdUZBQXFEO0lBQ3JELHFGQUFtRDtJQXdDbkQ7Ozs7O09BS0c7SUFDSDtRQUNFLDBCQUFvQixVQUFtQztZQUFuQyxlQUFVLEdBQVYsVUFBVSxDQUF5QjtRQUFHLENBQUM7UUFFM0QsK0JBQUksR0FBSixVQUNJLEdBQWMsRUFBRSxPQUFzQixFQUN0QyxVQUFxRDs7WUFBckQsMkJBQUEsRUFBQSxhQUF5Qix1QkFBVSxDQUFDLGlCQUFpQjs7Z0JBQ3ZELEtBQXVCLElBQUEsS0FBQSxpQkFBQSxJQUFJLENBQUMsVUFBVSxDQUFBLGdCQUFBLDRCQUFFO29CQUFuQyxJQUFNLFFBQVEsV0FBQTtvQkFDakIsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7d0JBQ3BCLE9BQU8sT0FBTyxDQUFDO3FCQUNoQjtpQkFDRjs7Ozs7Ozs7O1lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FDWCxvQ0FBa0MsNkJBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBUSxjQUFTLE9BQU8sQ0FBQyxRQUFVLENBQUMsQ0FBQztRQUN2SSxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBZkQsSUFlQztJQWZZLDRDQUFnQjtJQWlCN0I7OztPQUdHO0lBQ0g7UUFBQTtRQWtCQSxD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QUFTLENBQUMsQ0FBQztZQUN0RSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFFRCxJQUFNLFVBQVUsR0FDWixJQUFJLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFbEYsT0FBTyxJQUFJLHVCQUFZLENBQUMsRUFBQyxVQUFVLFlBQUEsRUFBRSxJQUFJLE1BQUEsRUFBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQWZELElBZUM7SUFmWSxvREFBb0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4dGVybmFsRXhwciwgRXh0ZXJuYWxSZWZlcmVuY2UsIFdyYXBwZWROb2RlRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TG9naWNhbEZpbGVTeXN0ZW0sIExvZ2ljYWxQcm9qZWN0UGF0aCwgUGF0aFNlZ21lbnQsIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIGRpcm5hbWUsIHJlbGF0aXZlfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge3N0cmlwRXh0ZW5zaW9ufSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbS9zcmMvdXRpbCc7XG5pbXBvcnQge1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Z2V0U291cmNlRmlsZSwgaXNEZWNsYXJhdGlvbiwgbm9kZU5hbWVGb3JFcnJvcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7ZmluZEV4cG9ydGVkTmFtZU9mTm9kZX0gZnJvbSAnLi9maW5kX2V4cG9ydCc7XG5pbXBvcnQge0ltcG9ydE1vZGUsIFJlZmVyZW5jZX0gZnJvbSAnLi9yZWZlcmVuY2VzJztcbmltcG9ydCB7TW9kdWxlUmVzb2x2ZXJ9IGZyb20gJy4vcmVzb2x2ZXInO1xuXG5cblxuLyoqXG4gKiBBIGhvc3Qgd2hpY2ggc3VwcG9ydHMgYW4gb3BlcmF0aW9uIHRvIGNvbnZlcnQgYSBmaWxlIG5hbWUgaW50byBhIG1vZHVsZSBuYW1lLlxuICpcbiAqIFRoaXMgb3BlcmF0aW9uIGlzIHR5cGljYWxseSBpbXBsZW1lbnRlZCBhcyBwYXJ0IG9mIHRoZSBjb21waWxlciBob3N0IHBhc3NlZCB0byBuZ3RzYyB3aGVuIHJ1bm5pbmdcbiAqIHVuZGVyIGEgYnVpbGQgdG9vbCBsaWtlIEJhemVsIG9yIEJsYXplLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVUb01vZHVsZUhvc3Qge1xuICBmaWxlTmFtZVRvTW9kdWxlTmFtZShpbXBvcnRlZEZpbGVQYXRoOiBzdHJpbmcsIGNvbnRhaW5pbmdGaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEEgcGFydGljdWxhciBzdHJhdGVneSBmb3IgZ2VuZXJhdGluZyBhbiBleHByZXNzaW9uIHdoaWNoIHJlZmVycyB0byBhIGBSZWZlcmVuY2VgLlxuICpcbiAqIFRoZXJlIGFyZSBtYW55IHBvdGVudGlhbCB3YXlzIGEgZ2l2ZW4gYFJlZmVyZW5jZWAgY291bGQgYmUgcmVmZXJyZWQgdG8gaW4gdGhlIGNvbnRleHQgb2YgYSBnaXZlblxuICogZmlsZS4gQSBsb2NhbCBkZWNsYXJhdGlvbiBjb3VsZCBiZSBhdmFpbGFibGUsIHRoZSBgUmVmZXJlbmNlYCBjb3VsZCBiZSBpbXBvcnRhYmxlIHZpYSBhIHJlbGF0aXZlXG4gKiBpbXBvcnQgd2l0aGluIHRoZSBwcm9qZWN0LCBvciBhbiBhYnNvbHV0ZSBpbXBvcnQgaW50byBgbm9kZV9tb2R1bGVzYCBtaWdodCBiZSBuZWNlc3NhcnkuXG4gKlxuICogRGlmZmVyZW50IGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIGltcGxlbWVudGF0aW9ucyBpbXBsZW1lbnQgc3BlY2lmaWMgbG9naWMgZm9yIGdlbmVyYXRpbmcgc3VjaFxuICogcmVmZXJlbmNlcy4gQSBzaW5nbGUgc3RyYXRlZ3kgKHN1Y2ggYXMgdXNpbmcgYSBsb2NhbCBkZWNsYXJhdGlvbikgbWF5IG5vdCBhbHdheXMgYmUgYWJsZSB0b1xuICogZ2VuZXJhdGUgYW4gZXhwcmVzc2lvbiBmb3IgZXZlcnkgYFJlZmVyZW5jZWAgKGZvciBleGFtcGxlLCBpZiBubyBsb2NhbCBpZGVudGlmaWVyIGlzIGF2YWlsYWJsZSksXG4gKiBhbmQgbWF5IHJldHVybiBgbnVsbGAgaW4gc3VjaCBhIGNhc2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5IHtcbiAgLyoqXG4gICAqIEVtaXQgYW4gYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byB0aGUgZ2l2ZW4gYFJlZmVyZW5jZWAgaW4gdGhlIGNvbnRleHQgb2YgYSBwYXJ0aWN1bGFyXG4gICAqIHNvdXJjZSBmaWxlLCBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogQHBhcmFtIHJlZiB0aGUgYFJlZmVyZW5jZWAgZm9yIHdoaWNoIHRvIGdlbmVyYXRlIGFuIGV4cHJlc3Npb25cbiAgICogQHBhcmFtIGNvbnRleHQgdGhlIHNvdXJjZSBmaWxlIGluIHdoaWNoIHRoZSBgRXhwcmVzc2lvbmAgbXVzdCBiZSB2YWxpZFxuICAgKiBAcGFyYW0gaW1wb3J0TW9kZSBhIGZsYWcgd2hpY2ggY29udHJvbHMgd2hldGhlciBpbXBvcnRzIHNob3VsZCBiZSBnZW5lcmF0ZWQgb3Igbm90XG4gICAqIEByZXR1cm5zIGFuIGBFeHByZXNzaW9uYCB3aGljaCByZWZlcnMgdG8gdGhlIGBSZWZlcmVuY2VgLCBvciBgbnVsbGAgaWYgbm9uZSBjYW4gYmUgZ2VuZXJhdGVkXG4gICAqL1xuICBlbWl0KHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLCBpbXBvcnRNb2RlOiBJbXBvcnRNb2RlKTogRXhwcmVzc2lvbnxudWxsO1xufVxuXG4vKipcbiAqIEdlbmVyYXRlcyBgRXhwcmVzc2lvbmBzIHdoaWNoIHJlZmVyIHRvIGBSZWZlcmVuY2VgcyBpbiBhIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQSBgUmVmZXJlbmNlRW1pdHRlcmAgdXNlcyBvbmUgb3IgbW9yZSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCBpbXBsZW1lbnRhdGlvbnMgdG8gcHJvZHVjZSBhblxuICogYEV4cHJlc3Npb25gIHdoaWNoIHJlZmVycyB0byBhIGBSZWZlcmVuY2VgIGluIHRoZSBjb250ZXh0IG9mIGEgcGFydGljdWxhciBmaWxlLlxuICovXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgc3RyYXRlZ2llczogUmVmZXJlbmNlRW1pdFN0cmF0ZWd5W10pIHt9XG5cbiAgZW1pdChcbiAgICAgIHJlZjogUmVmZXJlbmNlLCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgaW1wb3J0TW9kZTogSW1wb3J0TW9kZcKgPSBJbXBvcnRNb2RlLlVzZUV4aXN0aW5nSW1wb3J0KTogRXhwcmVzc2lvbiB7XG4gICAgZm9yIChjb25zdCBzdHJhdGVneSBvZiB0aGlzLnN0cmF0ZWdpZXMpIHtcbiAgICAgIGNvbnN0IGVtaXR0ZWQgPSBzdHJhdGVneS5lbWl0KHJlZiwgY29udGV4dCwgaW1wb3J0TW9kZSk7XG4gICAgICBpZiAoZW1pdHRlZCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZW1pdHRlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVW5hYmxlIHRvIHdyaXRlIGEgcmVmZXJlbmNlIHRvICR7bm9kZU5hbWVGb3JFcnJvcihyZWYubm9kZSl9IGluICR7cmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfSBmcm9tICR7Y29udGV4dC5maWxlTmFtZX1gKTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggd2lsbCByZWZlciB0byBkZWNsYXJhdGlvbnMgYnkgYW55IGxvY2FsIGB0cy5JZGVudGlmaWVyYHMsIGlmXG4gKiBzdWNoIGlkZW50aWZpZXJzIGFyZSBhdmFpbGFibGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbElkZW50aWZpZXJTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydE1vZGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIC8vIElmIHRoZSBlbWl0dGVyIGhhcyBzcGVjaWZpZWQgRm9yY2VOZXdJbXBvcnQsIHRoZW4gTG9jYWxJZGVudGlmaWVyU3RyYXRlZ3kgc2hvdWxkIG5vdCB1c2UgYVxuICAgIC8vIGxvY2FsIGlkZW50aWZpZXIgYXQgYWxsLCAqZXhjZXB0KiBpbiB0aGUgc291cmNlIGZpbGUgd2hlcmUgdGhlIG5vZGUgaXMgYWN0dWFsbHkgZGVjbGFyZWQuXG4gICAgaWYgKGltcG9ydE1vZGUgPT09IEltcG9ydE1vZGUuRm9yY2VOZXdJbXBvcnQgJiZcbiAgICAgICAgZ2V0U291cmNlRmlsZShyZWYubm9kZSkgIT09IGdldFNvdXJjZUZpbGUoY29udGV4dCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIEEgUmVmZXJlbmNlIGNhbiBoYXZlIG11bHRpcGxlIGlkZW50aXRpZXMgaW4gZGlmZmVyZW50IGZpbGVzLCBzbyBpdCBtYXkgYWxyZWFkeSBoYXZlIGFuXG4gICAgLy8gSWRlbnRpZmllciBpbiB0aGUgcmVxdWVzdGVkIGNvbnRleHQgZmlsZS5cbiAgICBjb25zdCBpZGVudGlmaWVyID0gcmVmLmdldElkZW50aXR5SW4oY29udGV4dCk7XG4gICAgaWYgKGlkZW50aWZpZXIgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBuZXcgV3JhcHBlZE5vZGVFeHByKGlkZW50aWZpZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHRoYXQgY29tZSBmcm9tIGBub2RlX21vZHVsZXNgIHVzaW5nXG4gKiBhbiBhYnNvbHV0ZSBpbXBvcnQuXG4gKlxuICogUGFydCBvZiB0aGlzIHN0cmF0ZWd5IGludm9sdmVzIGxvb2tpbmcgYXQgdGhlIHRhcmdldCBlbnRyeSBwb2ludCBhbmQgaWRlbnRpZnlpbmcgdGhlIGV4cG9ydGVkXG4gKiBuYW1lIG9mIHRoZSB0YXJnZXRlZCBkZWNsYXJhdGlvbiwgYXMgaXQgbWlnaHQgYmUgZGlmZmVyZW50IGZyb20gdGhlIGRlY2xhcmVkIG5hbWUgKGUuZy4gYVxuICogZGlyZWN0aXZlIG1pZ2h0IGJlIGRlY2xhcmVkIGFzIEZvb0RpckltcGwsIGJ1dCBleHBvcnRlZCBhcyBGb29EaXIpLiBJZiBubyBleHBvcnQgY2FuIGJlIGZvdW5kXG4gKiB3aGljaCBtYXBzIGJhY2sgdG8gdGhlIG9yaWdpbmFsIGRpcmVjdGl2ZSwgYW4gZXJyb3IgaXMgdGhyb3duLlxuICovXG5leHBvcnQgY2xhc3MgQWJzb2x1dGVNb2R1bGVTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIC8qKlxuICAgKiBBIGNhY2hlIG9mIHRoZSBleHBvcnRzIG9mIHNwZWNpZmljIG1vZHVsZXMsIGJlY2F1c2UgcmVzb2x2aW5nIGEgbW9kdWxlIHRvIGl0cyBleHBvcnRzIGlzIGFcbiAgICogY29zdGx5IG9wZXJhdGlvbi5cbiAgICovXG4gIHByaXZhdGUgbW9kdWxlRXhwb3J0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsPigpO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJvdGVjdGVkIHByb2dyYW06IHRzLlByb2dyYW0sIHByb3RlY3RlZCBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcixcbiAgICAgIHByb3RlY3RlZCBtb2R1bGVSZXNvbHZlcjogTW9kdWxlUmVzb2x2ZXIsIHByaXZhdGUgcmVmbGVjdGlvbkhvc3Q6IFJlZmxlY3Rpb25Ib3N0KSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUsIGltcG9ydE1vZGU6IEltcG9ydE1vZGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGlmIChyZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyBtb2R1bGUgbmFtZSBhdmFpbGFibGUgZm9yIHRoaXMgUmVmZXJlbmNlLCBtZWFuaW5nIGl0IHdhcyBhcnJpdmVkIGF0IHZpYSBhXG4gICAgICAvLyByZWxhdGl2ZSBwYXRoLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICghaXNEZWNsYXJhdGlvbihyZWYubm9kZSkpIHtcbiAgICAgIC8vIEl0J3Mgbm90IHBvc3NpYmxlIHRvIGltcG9ydCBzb21ldGhpbmcgd2hpY2ggaXNuJ3QgYSBkZWNsYXJhdGlvbi5cbiAgICAgIHRocm93IG5ldyBFcnJvcignRGVidWcgYXNzZXJ0OiBpbXBvcnRpbmcgYSBSZWZlcmVuY2UgdG8gbm9uLWRlY2xhcmF0aW9uPycpO1xuICAgIH1cblxuICAgIC8vIFRyeSB0byBmaW5kIHRoZSBleHBvcnRlZCBuYW1lIG9mIHRoZSBkZWNsYXJhdGlvbiwgaWYgb25lIGlzIGF2YWlsYWJsZS5cbiAgICBjb25zdCB7c3BlY2lmaWVyLCByZXNvbHV0aW9uQ29udGV4dH0gPSByZWYuYmVzdEd1ZXNzT3duaW5nTW9kdWxlO1xuICAgIGNvbnN0IHN5bWJvbE5hbWUgPSB0aGlzLnJlc29sdmVJbXBvcnROYW1lKHNwZWNpZmllciwgcmVmLm5vZGUsIHJlc29sdXRpb25Db250ZXh0KTtcbiAgICBpZiAoc3ltYm9sTmFtZSA9PT0gbnVsbCkge1xuICAgICAgLy8gVE9ETyhhbHhodWIpOiBtYWtlIHRoaXMgZXJyb3IgYSB0cy5EaWFnbm9zdGljIHBvaW50aW5nIGF0IHdoYXRldmVyIGNhdXNlZCB0aGlzIGltcG9ydCB0byBiZVxuICAgICAgLy8gdHJpZ2dlcmVkLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBTeW1ib2wgJHtyZWYuZGVidWdOYW1lfSBkZWNsYXJlZCBpbiAke2dldFNvdXJjZUZpbGUocmVmLm5vZGUpLmZpbGVOYW1lfSBpcyBub3QgZXhwb3J0ZWQgZnJvbSAke3NwZWNpZmllcn0gKGltcG9ydCBpbnRvICR7Y29udGV4dC5maWxlTmFtZX0pYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIobmV3IEV4dGVybmFsUmVmZXJlbmNlKHNwZWNpZmllciwgc3ltYm9sTmFtZSkpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlSW1wb3J0TmFtZShtb2R1bGVOYW1lOiBzdHJpbmcsIHRhcmdldDogdHMuRGVjbGFyYXRpb24sIGZyb21GaWxlOiBzdHJpbmcpOiBzdHJpbmdcbiAgICAgIHxudWxsIHtcbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5nZXRFeHBvcnRzT2ZNb2R1bGUobW9kdWxlTmFtZSwgZnJvbUZpbGUpO1xuICAgIGlmIChleHBvcnRzICE9PSBudWxsICYmIGV4cG9ydHMuaGFzKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmdldCh0YXJnZXQpICE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RXhwb3J0c09mTW9kdWxlKG1vZHVsZU5hbWU6IHN0cmluZywgZnJvbUZpbGU6IHN0cmluZyk6XG4gICAgICBNYXA8dHMuRGVjbGFyYXRpb24sIHN0cmluZz58bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1vZHVsZUV4cG9ydHNDYWNoZS5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMubW9kdWxlRXhwb3J0c0NhY2hlLnNldChtb2R1bGVOYW1lLCB0aGlzLmVudW1lcmF0ZUV4cG9ydHNPZk1vZHVsZShtb2R1bGVOYW1lLCBmcm9tRmlsZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tb2R1bGVFeHBvcnRzQ2FjaGUuZ2V0KG1vZHVsZU5hbWUpICE7XG4gIH1cblxuICBwcm90ZWN0ZWQgZW51bWVyYXRlRXhwb3J0c09mTW9kdWxlKHNwZWNpZmllcjogc3RyaW5nLCBmcm9tRmlsZTogc3RyaW5nKTpcbiAgICAgIE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPnxudWxsIHtcbiAgICAvLyBGaXJzdCwgcmVzb2x2ZSB0aGUgbW9kdWxlIHNwZWNpZmllciB0byBpdHMgZW50cnkgcG9pbnQsIGFuZCBnZXQgdGhlIHRzLlN5bWJvbCBmb3IgaXQuXG4gICAgY29uc3QgZW50cnlQb2ludEZpbGUgPSB0aGlzLm1vZHVsZVJlc29sdmVyLnJlc29sdmVNb2R1bGUoc3BlY2lmaWVyLCBmcm9tRmlsZSk7XG4gICAgaWYgKGVudHJ5UG9pbnRGaWxlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBleHBvcnRzID0gdGhpcy5yZWZsZWN0aW9uSG9zdC5nZXRFeHBvcnRzT2ZNb2R1bGUoZW50cnlQb2ludEZpbGUpO1xuICAgIGlmIChleHBvcnRzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZXhwb3J0TWFwID0gbmV3IE1hcDx0cy5EZWNsYXJhdGlvbiwgc3RyaW5nPigpO1xuICAgIGV4cG9ydHMuZm9yRWFjaCgoZGVjbGFyYXRpb24sIG5hbWUpID0+IHtcbiAgICAgIC8vIEl0J3Mgb2theSB0byBza2lwIGlubGluZSBkZWNsYXJhdGlvbnMsIHNpbmNlIGJ5IGRlZmluaXRpb24gdGhleSdyZSBub3QgdGFyZ2V0LWFibGUgd2l0aCBhXG4gICAgICAvLyB0cy5EZWNsYXJhdGlvbiBhbnl3YXkuXG4gICAgICBpZiAoZGVjbGFyYXRpb24ubm9kZSAhPT0gbnVsbCkge1xuICAgICAgICBleHBvcnRNYXAuc2V0KGRlY2xhcmF0aW9uLm5vZGUsIG5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBleHBvcnRNYXA7XG4gIH1cbn1cblxuLyoqXG4gKiBBIGBSZWZlcmVuY2VFbWl0U3RyYXRlZ3lgIHdoaWNoIHdpbGwgcmVmZXIgdG8gZGVjbGFyYXRpb25zIHZpYSByZWxhdGl2ZSBwYXRocywgcHJvdmlkZWQgdGhleSdyZVxuICogYm90aCBpbiB0aGUgbG9naWNhbCBwcm9qZWN0IFwic3BhY2VcIiBvZiBwYXRocy5cbiAqXG4gKiBUaGlzIGlzIHRyaWNraWVyIHRoYW4gaXQgc291bmRzLCBhcyB0aGUgdHdvIGZpbGVzIG1heSBiZSBpbiBkaWZmZXJlbnQgcm9vdCBkaXJlY3RvcmllcyBpbiB0aGVcbiAqIHByb2plY3QuIFNpbXBseSBjYWxjdWxhdGluZyBhIGZpbGUgc3lzdGVtIHJlbGF0aXZlIHBhdGggYmV0d2VlbiB0aGUgdHdvIGlzIG5vdCBzdWZmaWNpZW50LlxuICogSW5zdGVhZCwgYExvZ2ljYWxQcm9qZWN0UGF0aGBzIGFyZSB1c2VkLlxuICovXG5leHBvcnQgY2xhc3MgTG9naWNhbFByb2plY3RTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBsb2dpY2FsRnM6IExvZ2ljYWxGaWxlU3lzdGVtKSB7fVxuXG4gIGVtaXQocmVmOiBSZWZlcmVuY2U8dHMuTm9kZT4sIGNvbnRleHQ6IHRzLlNvdXJjZUZpbGUpOiBFeHByZXNzaW9ufG51bGwge1xuICAgIGNvbnN0IGRlc3RTZiA9IGdldFNvdXJjZUZpbGUocmVmLm5vZGUpO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgcmVsYXRpdmUgcGF0aCBmcm9tIHRoZSBpbXBvcnRpbmcgZmlsZSB0byB0aGUgZmlsZSBiZWluZyBpbXBvcnRlZC4gVGhpcyBpcyBkb25lXG4gICAgLy8gYXMgYSBsb2dpY2FsIHBhdGggY29tcHV0YXRpb24sIGJlY2F1c2UgdGhlIHR3byBmaWxlcyBtaWdodCBiZSBpbiBkaWZmZXJlbnQgcm9vdERpcnMuXG4gICAgY29uc3QgZGVzdFBhdGggPSB0aGlzLmxvZ2ljYWxGcy5sb2dpY2FsUGF0aE9mU2YoZGVzdFNmKTtcbiAgICBpZiAoZGVzdFBhdGggPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZSBpbXBvcnRlZCBmaWxlIGlzIG5vdCB3aXRoaW4gdGhlIGxvZ2ljYWwgcHJvamVjdCBmaWxlc3lzdGVtLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgb3JpZ2luUGF0aCA9IHRoaXMubG9naWNhbEZzLmxvZ2ljYWxQYXRoT2ZTZihjb250ZXh0KTtcbiAgICBpZiAob3JpZ2luUGF0aCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBEZWJ1ZyBhc3NlcnQ6IGF0dGVtcHQgdG8gaW1wb3J0IGZyb20gJHtjb250ZXh0LmZpbGVOYW1lfSBidXQgaXQncyBvdXRzaWRlIHRoZSBwcm9ncmFtP2ApO1xuICAgIH1cblxuICAgIC8vIFRoZXJlJ3Mgbm8gd2F5IHRvIGVtaXQgYSByZWxhdGl2ZSByZWZlcmVuY2UgZnJvbSBhIGZpbGUgdG8gaXRzZWxmLlxuICAgIGlmIChkZXN0UGF0aCA9PT0gb3JpZ2luUGF0aCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZSA9IGZpbmRFeHBvcnRlZE5hbWVPZk5vZGUocmVmLm5vZGUsIGRlc3RTZiwgdGhpcy5yZWZsZWN0b3IpO1xuICAgIGlmIChuYW1lID09PSBudWxsKSB7XG4gICAgICAvLyBUaGUgdGFyZ2V0IGRlY2xhcmF0aW9uIGlzbid0IGV4cG9ydGVkIGZyb20gdGhlIGZpbGUgaXQncyBkZWNsYXJlZCBpbi4gVGhpcyBpcyBhbiBpc3N1ZSFcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIFdpdGggYm90aCBmaWxlcyBleHByZXNzZWQgYXMgTG9naWNhbFByb2plY3RQYXRocywgZ2V0dGluZyB0aGUgbW9kdWxlIHNwZWNpZmllciBhcyBhIHJlbGF0aXZlXG4gICAgLy8gcGF0aCBpcyBub3cgc3RyYWlnaHRmb3J3YXJkLlxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPSBMb2dpY2FsUHJvamVjdFBhdGgucmVsYXRpdmVQYXRoQmV0d2VlbihvcmlnaW5QYXRoLCBkZXN0UGF0aCk7XG4gICAgcmV0dXJuIG5ldyBFeHRlcm5hbEV4cHIoe21vZHVsZU5hbWUsIG5hbWV9KTtcbiAgfVxufVxuXG4vKipcbiAqIEEgYFJlZmVyZW5jZUVtaXRTdHJhdGVneWAgd2hpY2ggY29uc3RydWN0cyByZWxhdGl2ZXMgcGF0aHMgYmV0d2VlbiBgdHMuU291cmNlRmlsZWBzLlxuICpcbiAqIFRoaXMgc3RyYXRlZ3kgY2FuIGJlIHVzZWQgaWYgdGhlcmUgaXMgbm8gYHJvb3REaXJgL2Byb290RGlyc2Agc3RydWN0dXJlIGZvciB0aGUgcHJvamVjdCB3aGljaFxuICogbmVjZXNzaXRhdGVzIHRoZSBzdHJvbmdlciBsb2dpYyBvZiBgTG9naWNhbFByb2plY3RTdHJhdGVneWAuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWxhdGl2ZVBhdGhTdHJhdGVneSBpbXBsZW1lbnRzIFJlZmVyZW5jZUVtaXRTdHJhdGVneSB7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcbiAgICBsZXQgbW9kdWxlTmFtZSA9IHN0cmlwRXh0ZW5zaW9uKFxuICAgICAgICByZWxhdGl2ZShkaXJuYW1lKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoY29udGV4dCkpLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKGRlc3RTZikpKTtcbiAgICBpZiAoIW1vZHVsZU5hbWUuc3RhcnRzV2l0aCgnLi4vJykpIHtcbiAgICAgIG1vZHVsZU5hbWUgPSAoJy4vJyArIG1vZHVsZU5hbWUpIGFzIFBhdGhTZWdtZW50O1xuICAgIH1cblxuICAgIGNvbnN0IG5hbWUgPSBmaW5kRXhwb3J0ZWROYW1lT2ZOb2RlKHJlZi5ub2RlLCBkZXN0U2YsIHRoaXMucmVmbGVjdG9yKTtcbiAgICByZXR1cm4gbmV3IEV4dGVybmFsRXhwcih7bW9kdWxlTmFtZSwgbmFtZX0pO1xuICB9XG59XG5cbi8qKlxuICogQSBgUmVmZXJlbmNlRW1pdFN0cmF0ZWd5YCB3aGljaCB1c2VzIGEgYEZpbGVUb01vZHVsZUhvc3RgIHRvIGdlbmVyYXRlIGFic29sdXRlIGltcG9ydCByZWZlcmVuY2VzLlxuICovXG5leHBvcnQgY2xhc3MgRmlsZVRvTW9kdWxlU3RyYXRlZ3kgaW1wbGVtZW50cyBSZWZlcmVuY2VFbWl0U3RyYXRlZ3kge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZmlsZVRvTW9kdWxlSG9zdDogRmlsZVRvTW9kdWxlSG9zdCkge31cblxuICBlbWl0KHJlZjogUmVmZXJlbmNlPHRzLk5vZGU+LCBjb250ZXh0OiB0cy5Tb3VyY2VGaWxlKTogRXhwcmVzc2lvbnxudWxsIHtcbiAgICBjb25zdCBkZXN0U2YgPSBnZXRTb3VyY2VGaWxlKHJlZi5ub2RlKTtcbiAgICBjb25zdCBuYW1lID0gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShyZWYubm9kZSwgZGVzdFNmLCB0aGlzLnJlZmxlY3Rvcik7XG4gICAgaWYgKG5hbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IG1vZHVsZU5hbWUgPVxuICAgICAgICB0aGlzLmZpbGVUb01vZHVsZUhvc3QuZmlsZU5hbWVUb01vZHVsZU5hbWUoZGVzdFNmLmZpbGVOYW1lLCBjb250ZXh0LmZpbGVOYW1lKTtcblxuICAgIHJldHVybiBuZXcgRXh0ZXJuYWxFeHByKHttb2R1bGVOYW1lLCBuYW1lfSk7XG4gIH1cbn1cbiJdfQ==