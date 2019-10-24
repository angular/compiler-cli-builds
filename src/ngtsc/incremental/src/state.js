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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/state", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * Accumulates state between compilations.
     */
    var IncrementalState = /** @class */ (function () {
        function IncrementalState(unchangedFiles, metadata, modifiedResourceFiles) {
            this.unchangedFiles = unchangedFiles;
            this.metadata = metadata;
            this.modifiedResourceFiles = modifiedResourceFiles;
        }
        IncrementalState.reconcile = function (previousState, oldProgram, newProgram, modifiedResourceFiles) {
            var e_1, _a;
            var unchangedFiles = new Set();
            var metadata = new Map();
            var oldFiles = new Set(oldProgram.getSourceFiles());
            var newFiles = new Set(newProgram.getSourceFiles());
            try {
                // Compute the set of files that are unchanged (both in themselves and their dependencies).
                for (var _b = tslib_1.__values(newProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var newFile = _c.value;
                    if (oldFiles.has(newFile)) {
                        var oldDeps = previousState.getFileDependencies(newFile);
                        if (oldDeps.every(function (oldDep) { return newFiles.has(oldDep); })) {
                            // The file and its dependencies are unchanged.
                            unchangedFiles.add(newFile);
                            // Copy over its metadata too
                            var meta = previousState.metadata.get(newFile);
                            if (meta) {
                                metadata.set(newFile, meta);
                            }
                        }
                    }
                    else if (newFile.isDeclarationFile) {
                        // A typings file has changed so trigger a full rebuild of the Angular analyses
                        return IncrementalState.fresh();
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
            return new IncrementalState(unchangedFiles, metadata, modifiedResourceFiles);
        };
        IncrementalState.fresh = function () {
            return new IncrementalState(new Set(), new Map(), null);
        };
        IncrementalState.prototype.safeToSkip = function (sf) {
            return this.unchangedFiles.has(sf) && !this.hasChangedResourceDependencies(sf);
        };
        IncrementalState.prototype.trackFileDependency = function (dep, src) {
            var metadata = this.ensureMetadata(src);
            metadata.fileDependencies.add(dep);
        };
        IncrementalState.prototype.getFileDependencies = function (file) {
            if (!this.metadata.has(file)) {
                return [];
            }
            var meta = this.metadata.get(file);
            return Array.from(meta.fileDependencies);
        };
        IncrementalState.prototype.getNgModuleMetadata = function (ref) {
            if (!this.metadata.has(ref.node.getSourceFile())) {
                return null;
            }
            var metadata = this.metadata.get(ref.node.getSourceFile());
            if (!metadata.ngModuleMeta.has(ref.node)) {
                return null;
            }
            return metadata.ngModuleMeta.get(ref.node);
        };
        IncrementalState.prototype.registerNgModuleMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.ngModuleMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.getDirectiveMetadata = function (ref) {
            if (!this.metadata.has(ref.node.getSourceFile())) {
                return null;
            }
            var metadata = this.metadata.get(ref.node.getSourceFile());
            if (!metadata.directiveMeta.has(ref.node)) {
                return null;
            }
            return metadata.directiveMeta.get(ref.node);
        };
        IncrementalState.prototype.registerDirectiveMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.directiveMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.getPipeMetadata = function (ref) {
            if (!this.metadata.has(ref.node.getSourceFile())) {
                return null;
            }
            var metadata = this.metadata.get(ref.node.getSourceFile());
            if (!metadata.pipeMeta.has(ref.node)) {
                return null;
            }
            return metadata.pipeMeta.get(ref.node);
        };
        IncrementalState.prototype.registerPipeMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.pipeMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.recordResourceDependency = function (file, resourcePath) {
            var metadata = this.ensureMetadata(file);
            metadata.resourcePaths.add(resourcePath);
        };
        IncrementalState.prototype.registerComponentScope = function (clazz, scope) {
            var metadata = this.ensureMetadata(clazz.getSourceFile());
            metadata.componentScope.set(clazz, scope);
        };
        IncrementalState.prototype.getScopeForComponent = function (clazz) {
            if (!this.metadata.has(clazz.getSourceFile())) {
                return null;
            }
            var metadata = this.metadata.get(clazz.getSourceFile());
            if (!metadata.componentScope.has(clazz)) {
                return null;
            }
            return metadata.componentScope.get(clazz);
        };
        IncrementalState.prototype.setComponentAsRequiringRemoteScoping = function (clazz) {
            var metadata = this.ensureMetadata(clazz.getSourceFile());
            metadata.remoteScoping.add(clazz);
        };
        IncrementalState.prototype.getRequiresRemoteScope = function (clazz) {
            // TODO: https://angular-team.atlassian.net/browse/FW-1501
            // Handle the incremental build case where a component requires remote scoping.
            // This means that if the the component's template changes, it requires the module to be
            // re-emitted.
            // Also, we need to make sure the cycle detector works well across rebuilds.
            if (!this.metadata.has(clazz.getSourceFile())) {
                return null;
            }
            var metadata = this.metadata.get(clazz.getSourceFile());
            return metadata.remoteScoping.has(clazz);
        };
        IncrementalState.prototype.ensureMetadata = function (sf) {
            var metadata = this.metadata.get(sf) || new FileMetadata();
            this.metadata.set(sf, metadata);
            return metadata;
        };
        IncrementalState.prototype.hasChangedResourceDependencies = function (sf) {
            var _this = this;
            if (this.modifiedResourceFiles === null || !this.metadata.has(sf)) {
                return false;
            }
            var resourceDeps = this.metadata.get(sf).resourcePaths;
            return Array.from(resourceDeps.keys())
                .some(function (resourcePath) { return _this.modifiedResourceFiles.has(resourcePath); });
        };
        return IncrementalState;
    }());
    exports.IncrementalState = IncrementalState;
    /**
     * Information about the whether a source file can have analysis or emission can be skipped.
     */
    var FileMetadata = /** @class */ (function () {
        function FileMetadata() {
            /** A set of source files that this file depends upon. */
            this.fileDependencies = new Set();
            this.resourcePaths = new Set();
            this.directiveMeta = new Map();
            this.ngModuleMeta = new Map();
            this.pipeMeta = new Map();
            this.componentScope = new Map();
            this.remoteScoping = new Set();
        }
        return FileMetadata;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFXSDs7T0FFRztJQUNIO1FBRUUsMEJBQ1ksY0FBa0MsRUFDbEMsUUFBMEMsRUFDMUMscUJBQXVDO1lBRnZDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUNsQyxhQUFRLEdBQVIsUUFBUSxDQUFrQztZQUMxQywwQkFBcUIsR0FBckIscUJBQXFCLENBQWtCO1FBQUcsQ0FBQztRQUVoRCwwQkFBUyxHQUFoQixVQUNJLGFBQStCLEVBQUUsVUFBc0IsRUFBRSxVQUFzQixFQUMvRSxxQkFBdUM7O1lBQ3pDLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBQ2hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBQ3hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFnQixVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNyRSxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBZ0IsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7O2dCQUVyRSwyRkFBMkY7Z0JBQzNGLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3pCLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsUUFBUSxD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USxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDakUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRyxDQUFDLGFBQWEsQ0FBQztZQUMzRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUNqQyxJQUFJLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxLQUFJLENBQUMscUJBQXVCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUE5QyxDQUE4QyxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWhLRCxJQWdLQztJQWhLWSw0Q0FBZ0I7SUFrSzdCOztPQUVHO0lBQ0g7UUFBQTtZQUNFLHlEQUF5RDtZQUN6RCxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUM1QyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7WUFDbEMsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUMzRCxpQkFBWSxHQUFHLElBQUksR0FBRyxFQUFrQyxDQUFDO1lBQ3pELGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUNqRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1lBQy9ELGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFDOUMsQ0FBQztRQUFELG1CQUFDO0lBQUQsQ0FBQyxBQVRELElBU0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vaW1wb3J0cyc7XG5pbXBvcnQge0RpcmVjdGl2ZU1ldGEsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LCBOZ01vZHVsZU1ldGEsIFBpcGVNZXRhfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDb21wb25lbnRTY29wZVJlYWRlciwgQ29tcG9uZW50U2NvcGVSZWdpc3RyeSwgTG9jYWxNb2R1bGVTY29wZX0gZnJvbSAnLi4vLi4vc2NvcGUnO1xuaW1wb3J0IHtSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlcn0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvcmVzb3VyY2VfcmVjb3JkZXInO1xuXG4vKipcbiAqIEFjY3VtdWxhdGVzIHN0YXRlIGJldHdlZW4gY29tcGlsYXRpb25zLlxuICovXG5leHBvcnQgY2xhc3MgSW5jcmVtZW50YWxTdGF0ZSBpbXBsZW1lbnRzIERlcGVuZGVuY3lUcmFja2VyLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSxcbiAgICBSZXNvdXJjZURlcGVuZGVuY3lSZWNvcmRlciwgQ29tcG9uZW50U2NvcGVSZWdpc3RyeSwgQ29tcG9uZW50U2NvcGVSZWFkZXIge1xuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB1bmNoYW5nZWRGaWxlczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgICAgcHJpdmF0ZSBtZXRhZGF0YTogTWFwPHRzLlNvdXJjZUZpbGUsIEZpbGVNZXRhZGF0YT4sXG4gICAgICBwcml2YXRlIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCkge31cblxuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgcHJldmlvdXNTdGF0ZTogSW5jcmVtZW50YWxTdGF0ZSwgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCk6IEluY3JlbWVudGFsU3RhdGUge1xuICAgIGNvbnN0IHVuY2hhbmdlZEZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGNvbnN0IG1ldGFkYXRhID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+KCk7XG4gICAgY29uc3Qgb2xkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG4gICAgY29uc3QgbmV3RmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG5ld1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG5cbiAgICAvLyBDb21wdXRlIHRoZSBzZXQgb2YgZmlsZXMgdGhhdCBhcmUgdW5jaGFuZ2VkIChib3RoIGluIHRoZW1zZWx2ZXMgYW5kIHRoZWlyIGRlcGVuZGVuY2llcykuXG4gICAgZm9yIChjb25zdCBuZXdGaWxlIG9mIG5ld1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKG9sZEZpbGVzLmhhcyhuZXdGaWxlKSkge1xuICAgICAgICBjb25zdCBvbGREZXBzID0gcHJldmlvdXNTdGF0ZS5nZXRGaWxlRGVwZW5kZW5jaWVzKG5ld0ZpbGUpO1xuICAgICAgICBpZiAob2xkRGVwcy5ldmVyeShvbGREZXAgPT4gbmV3RmlsZXMuaGFzKG9sZERlcCkpKSB7XG4gICAgICAgICAgLy8gVGhlIGZpbGUgYW5kIGl0cyBkZXBlbmRlbmNpZXMgYXJlIHVuY2hhbmdlZC5cbiAgICAgICAgICB1bmNoYW5nZWRGaWxlcy5hZGQobmV3RmlsZSk7XG4gICAgICAgICAgLy8gQ29weSBvdmVyIGl0cyBtZXRhZGF0YSB0b29cbiAgICAgICAgICBjb25zdCBtZXRhID0gcHJldmlvdXNTdGF0ZS5tZXRhZGF0YS5nZXQobmV3RmlsZSk7XG4gICAgICAgICAgaWYgKG1ldGEpIHtcbiAgICAgICAgICAgIG1ldGFkYXRhLnNldChuZXdGaWxlLCBtZXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBBIHR5cGluZ3MgZmlsZSBoYXMgY2hhbmdlZCBzbyB0cmlnZ2VyIGEgZnVsbCByZWJ1aWxkIG9mIHRoZSBBbmd1bGFyIGFuYWx5c2VzXG4gICAgICAgIHJldHVybiBJbmNyZW1lbnRhbFN0YXRlLmZyZXNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbFN0YXRlKHVuY2hhbmdlZEZpbGVzLCBtZXRhZGF0YSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKTtcbiAgfVxuXG4gIHN0YXRpYyBmcmVzaCgpOiBJbmNyZW1lbnRhbFN0YXRlIHtcbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsU3RhdGUoXG4gICAgICAgIG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKSwgbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+KCksIG51bGwpO1xuICB9XG5cbiAgc2FmZVRvU2tpcChzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW58UHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuIHRoaXMudW5jaGFuZ2VkRmlsZXMuaGFzKHNmKSAmJiAhdGhpcy5oYXNDaGFuZ2VkUmVzb3VyY2VEZXBlbmRlbmNpZXMoc2YpO1xuICB9XG5cbiAgdHJhY2tGaWxlRGVwZW5kZW5jeShkZXA6IHRzLlNvdXJjZUZpbGUsIHNyYzogdHMuU291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShzcmMpO1xuICAgIG1ldGFkYXRhLmZpbGVEZXBlbmRlbmNpZXMuYWRkKGRlcCk7XG4gIH1cblxuICBnZXRGaWxlRGVwZW5kZW5jaWVzKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIGlmICghdGhpcy5tZXRhZGF0YS5oYXMoZmlsZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KGZpbGUpICE7XG4gICAgcmV0dXJuIEFycmF5LmZyb20obWV0YS5maWxlRGVwZW5kZW5jaWVzKTtcbiAgfVxuXG4gIGdldE5nTW9kdWxlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBOZ01vZHVsZU1ldGF8bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpICE7XG4gICAgaWYgKCFtZXRhZGF0YS5uZ01vZHVsZU1ldGEuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBtZXRhZGF0YS5uZ01vZHVsZU1ldGEuZ2V0KHJlZi5ub2RlKSAhO1xuICB9XG5cbiAgcmVnaXN0ZXJOZ01vZHVsZU1ldGFkYXRhKG1ldGE6IE5nTW9kdWxlTWV0YSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShtZXRhLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgbWV0YWRhdGEubmdNb2R1bGVNZXRhLnNldChtZXRhLnJlZi5ub2RlLCBtZXRhKTtcbiAgfVxuXG4gIGdldERpcmVjdGl2ZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogRGlyZWN0aXZlTWV0YXxudWxsIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGEuaGFzKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSkgITtcbiAgICBpZiAoIW1ldGFkYXRhLmRpcmVjdGl2ZU1ldGEuaGFzKHJlZi5ub2RlKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBtZXRhZGF0YS5kaXJlY3RpdmVNZXRhLmdldChyZWYubm9kZSkgITtcbiAgfVxuXG4gIHJlZ2lzdGVyRGlyZWN0aXZlTWV0YWRhdGEobWV0YTogRGlyZWN0aXZlTWV0YSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShtZXRhLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgbWV0YWRhdGEuZGlyZWN0aXZlTWV0YS5zZXQobWV0YS5yZWYubm9kZSwgbWV0YSk7XG4gIH1cblxuICBnZXRQaXBlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBQaXBlTWV0YXxudWxsIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGEuaGFzKHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSkgITtcbiAgICBpZiAoIW1ldGFkYXRhLnBpcGVNZXRhLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YWRhdGEucGlwZU1ldGEuZ2V0KHJlZi5ub2RlKSAhO1xuICB9XG5cbiAgcmVnaXN0ZXJQaXBlTWV0YWRhdGEobWV0YTogUGlwZU1ldGEpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEobWV0YS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIG1ldGFkYXRhLnBpcGVNZXRhLnNldChtZXRhLnJlZi5ub2RlLCBtZXRhKTtcbiAgfVxuXG4gIHJlY29yZFJlc291cmNlRGVwZW5kZW5jeShmaWxlOiB0cy5Tb3VyY2VGaWxlLCByZXNvdXJjZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShmaWxlKTtcbiAgICBtZXRhZGF0YS5yZXNvdXJjZVBhdGhzLmFkZChyZXNvdXJjZVBhdGgpO1xuICB9XG5cbiAgcmVnaXN0ZXJDb21wb25lbnRTY29wZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbiwgc2NvcGU6IExvY2FsTW9kdWxlU2NvcGUpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEoY2xhenouZ2V0U291cmNlRmlsZSgpKTtcbiAgICBtZXRhZGF0YS5jb21wb25lbnRTY29wZS5zZXQoY2xhenosIHNjb3BlKTtcbiAgfVxuXG4gIGdldFNjb3BlRm9yQ29tcG9uZW50KGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogTG9jYWxNb2R1bGVTY29wZXxudWxsIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGEuaGFzKGNsYXp6LmdldFNvdXJjZUZpbGUoKSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KGNsYXp6LmdldFNvdXJjZUZpbGUoKSkgITtcbiAgICBpZiAoIW1ldGFkYXRhLmNvbXBvbmVudFNjb3BlLmhhcyhjbGF6eikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YWRhdGEuY29tcG9uZW50U2NvcGUuZ2V0KGNsYXp6KSAhO1xuICB9XG5cbiAgc2V0Q29tcG9uZW50QXNSZXF1aXJpbmdSZW1vdGVTY29waW5nKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgbWV0YWRhdGEucmVtb3RlU2NvcGluZy5hZGQoY2xhenopO1xuICB9XG5cbiAgZ2V0UmVxdWlyZXNSZW1vdGVTY29wZShjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW58bnVsbCB7XG4gICAgLy8gVE9ETzogaHR0cHM6Ly9hbmd1bGFyLXRlYW0uYXRsYXNzaWFuLm5ldC9icm93c2UvRlctMTUwMVxuICAgIC8vIEhhbmRsZSB0aGUgaW5jcmVtZW50YWwgYnVpbGQgY2FzZSB3aGVyZSBhIGNvbXBvbmVudCByZXF1aXJlcyByZW1vdGUgc2NvcGluZy5cbiAgICAvLyBUaGlzIG1lYW5zIHRoYXQgaWYgdGhlIHRoZSBjb21wb25lbnQncyB0ZW1wbGF0ZSBjaGFuZ2VzLCBpdCByZXF1aXJlcyB0aGUgbW9kdWxlIHRvIGJlXG4gICAgLy8gcmUtZW1pdHRlZC5cbiAgICAvLyBBbHNvLCB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGUgY3ljbGUgZGV0ZWN0b3Igd29ya3Mgd2VsbCBhY3Jvc3MgcmVidWlsZHMuXG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhjbGF6ei5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChjbGF6ei5nZXRTb3VyY2VGaWxlKCkpICE7XG4gICAgcmV0dXJuIG1ldGFkYXRhLnJlbW90ZVNjb3BpbmcuaGFzKGNsYXp6KTtcbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlTWV0YWRhdGEoc2Y6IHRzLlNvdXJjZUZpbGUpOiBGaWxlTWV0YWRhdGEge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YS5nZXQoc2YpIHx8IG5ldyBGaWxlTWV0YWRhdGEoKTtcbiAgICB0aGlzLm1ldGFkYXRhLnNldChzZiwgbWV0YWRhdGEpO1xuICAgIHJldHVybiBtZXRhZGF0YTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzQ2hhbmdlZFJlc291cmNlRGVwZW5kZW5jaWVzKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzID09PSBudWxsIHx8ICF0aGlzLm1ldGFkYXRhLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgcmVzb3VyY2VEZXBzID0gdGhpcy5tZXRhZGF0YS5nZXQoc2YpICEucmVzb3VyY2VQYXRocztcbiAgICByZXR1cm4gQXJyYXkuZnJvbShyZXNvdXJjZURlcHMua2V5cygpKVxuICAgICAgICAuc29tZShyZXNvdXJjZVBhdGggPT4gdGhpcy5tb2RpZmllZFJlc291cmNlRmlsZXMgIS5oYXMocmVzb3VyY2VQYXRoKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgd2hldGhlciBhIHNvdXJjZSBmaWxlIGNhbiBoYXZlIGFuYWx5c2lzIG9yIGVtaXNzaW9uIGNhbiBiZSBza2lwcGVkLlxuICovXG5jbGFzcyBGaWxlTWV0YWRhdGEge1xuICAvKiogQSBzZXQgb2Ygc291cmNlIGZpbGVzIHRoYXQgdGhpcyBmaWxlIGRlcGVuZHMgdXBvbi4gKi9cbiAgZmlsZURlcGVuZGVuY2llcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcbiAgcmVzb3VyY2VQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBkaXJlY3RpdmVNZXRhID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBEaXJlY3RpdmVNZXRhPigpO1xuICBuZ01vZHVsZU1ldGEgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIE5nTW9kdWxlTWV0YT4oKTtcbiAgcGlwZU1ldGEgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFBpcGVNZXRhPigpO1xuICBjb21wb25lbnRTY29wZSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTG9jYWxNb2R1bGVTY29wZT4oKTtcbiAgcmVtb3RlU2NvcGluZyA9IG5ldyBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4oKTtcbn1cbiJdfQ==