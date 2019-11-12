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
        IncrementalState.prototype.trackFileDependencies = function (deps, src) {
            var e_2, _a;
            var metadata = this.ensureMetadata(src);
            try {
                for (var deps_1 = tslib_1.__values(deps), deps_1_1 = deps_1.next(); !deps_1_1.done; deps_1_1 = deps_1.next()) {
                    var dep = deps_1_1.value;
                    metadata.fileDependencies.add(dep);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (deps_1_1 && !deps_1_1.done && (_a = deps_1.return)) _a.call(deps_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFXSDs7T0FFRztJQUNIO1FBRUUsMEJBQ1ksY0FBa0MsRUFDbEMsUUFBMEMsRUFDMUMscUJBQXVDO1lBRnZDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUNsQyxhQUFRLEdBQVIsUUFBUSxDQUFrQztZQUMxQywwQkFBcUIsR0FBckIscUJBQXFCLENBQWtCO1FBQUcsQ0FBQztRQUVoRCwwQkFBUyxHQUFoQixVQUNJLGFBQStCLEVBQUUsVUFBc0IsRUFBRSxVQUFzQixFQUMvRSxxQkFBdUM7O1lBQ3pDLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBQ2hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBQ3hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFnQixVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNyRSxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBZ0IsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7O2dCQUVyRSwyRkFBMkY7Z0JBQzNGLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3pCLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsUUFBUSxD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QUM5QyxDQUFDO1FBQUQsbUJBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7UmVmZXJlbmNlfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7RGlyZWN0aXZlTWV0YSwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnksIE5nTW9kdWxlTWV0YSwgUGlwZU1ldGF9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi4vLi4vcmVmbGVjdGlvbic7XG5pbXBvcnQge0NvbXBvbmVudFNjb3BlUmVhZGVyLCBDb21wb25lbnRTY29wZVJlZ2lzdHJ5LCBMb2NhbE1vZHVsZVNjb3BlfSBmcm9tICcuLi8uLi9zY29wZSc7XG5pbXBvcnQge1Jlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyfSBmcm9tICcuLi8uLi91dGlsL3NyYy9yZXNvdXJjZV9yZWNvcmRlcic7XG5cbi8qKlxuICogQWNjdW11bGF0ZXMgc3RhdGUgYmV0d2VlbiBjb21waWxhdGlvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbFN0YXRlIGltcGxlbWVudHMgRGVwZW5kZW5jeVRyYWNrZXIsIE1ldGFkYXRhUmVhZGVyLCBNZXRhZGF0YVJlZ2lzdHJ5LFxuICAgIFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyLCBDb21wb25lbnRTY29wZVJlZ2lzdHJ5LCBDb21wb25lbnRTY29wZVJlYWRlciB7XG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHVuY2hhbmdlZEZpbGVzOiBTZXQ8dHMuU291cmNlRmlsZT4sXG4gICAgICBwcml2YXRlIG1ldGFkYXRhOiBNYXA8dHMuU291cmNlRmlsZSwgRmlsZU1ldGFkYXRhPixcbiAgICAgIHByaXZhdGUgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPnxudWxsKSB7fVxuXG4gIHN0YXRpYyByZWNvbmNpbGUoXG4gICAgICBwcmV2aW91c1N0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLCBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPnxudWxsKTogSW5jcmVtZW50YWxTdGF0ZSB7XG4gICAgY29uc3QgdW5jaGFuZ2VkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG4gICAgY29uc3QgbWV0YWRhdGEgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEZpbGVNZXRhZGF0YT4oKTtcbiAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4ob2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcbiAgICBjb25zdCBuZXdGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4obmV3UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcblxuICAgIC8vIENvbXB1dGUgdGhlIHNldCBvZiBmaWxlcyB0aGF0IGFyZSB1bmNoYW5nZWQgKGJvdGggaW4gdGhlbXNlbHZlcyBhbmQgdGhlaXIgZGVwZW5kZW5jaWVzKS5cbiAgICBmb3IgKGNvbnN0IG5ld0ZpbGUgb2YgbmV3UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIGNvbnN0IG9sZERlcHMgPSBwcmV2aW91c1N0YXRlLmdldEZpbGVEZXBlbmRlbmNpZXMobmV3RmlsZSk7XG4gICAgICAgIGlmIChvbGREZXBzLmV2ZXJ5KG9sZERlcCA9PiBuZXdGaWxlcy5oYXMob2xkRGVwKSkpIHtcbiAgICAgICAgICAvLyBUaGUgZmlsZSBhbmQgaXRzIGRlcGVuZGVuY2llcyBhcmUgdW5jaGFuZ2VkLlxuICAgICAgICAgIHVuY2hhbmdlZEZpbGVzLmFkZChuZXdGaWxlKTtcbiAgICAgICAgICAvLyBDb3B5IG92ZXIgaXRzIG1ldGFkYXRhIHRvb1xuICAgICAgICAgIGNvbnN0IG1ldGEgPSBwcmV2aW91c1N0YXRlLm1ldGFkYXRhLmdldChuZXdGaWxlKTtcbiAgICAgICAgICBpZiAobWV0YSkge1xuICAgICAgICAgICAgbWV0YWRhdGEuc2V0KG5ld0ZpbGUsIG1ldGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChuZXdGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIC8vIEEgdHlwaW5ncyBmaWxlIGhhcyBjaGFuZ2VkIHNvIHRyaWdnZXIgYSBmdWxsIHJlYnVpbGQgb2YgdGhlIEFuZ3VsYXIgYW5hbHlzZXNcbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsU3RhdGUuZnJlc2goKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsU3RhdGUodW5jaGFuZ2VkRmlsZXMsIG1ldGFkYXRhLCBtb2RpZmllZFJlc291cmNlRmlsZXMpO1xuICB9XG5cbiAgc3RhdGljIGZyZXNoKCk6IEluY3JlbWVudGFsU3RhdGUge1xuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxTdGF0ZShcbiAgICAgICAgbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpLCBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEZpbGVNZXRhZGF0YT4oKSwgbnVsbCk7XG4gIH1cblxuICBzYWZlVG9Ta2lwKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbnxQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdGhpcy51bmNoYW5nZWRGaWxlcy5oYXMoc2YpICYmICF0aGlzLmhhc0NoYW5nZWRSZXNvdXJjZURlcGVuZGVuY2llcyhzZik7XG4gIH1cblxuICB0cmFja0ZpbGVEZXBlbmRlbmN5KGRlcDogdHMuU291cmNlRmlsZSwgc3JjOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKHNyYyk7XG4gICAgbWV0YWRhdGEuZmlsZURlcGVuZGVuY2llcy5hZGQoZGVwKTtcbiAgfVxuXG4gIHRyYWNrRmlsZURlcGVuZGVuY2llcyhkZXBzOiB0cy5Tb3VyY2VGaWxlW10sIHNyYzogdHMuU291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShzcmMpO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIGRlcHMpIHtcbiAgICAgIG1ldGFkYXRhLmZpbGVEZXBlbmRlbmNpZXMuYWRkKGRlcCk7XG4gICAgfVxuICB9XG5cbiAgZ2V0RmlsZURlcGVuZGVuY2llcyhmaWxlOiB0cy5Tb3VyY2VGaWxlKTogdHMuU291cmNlRmlsZVtdIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGEuaGFzKGZpbGUpKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSB0aGlzLm1ldGFkYXRhLmdldChmaWxlKSAhO1xuICAgIHJldHVybiBBcnJheS5mcm9tKG1ldGEuZmlsZURlcGVuZGVuY2llcyk7XG4gIH1cblxuICBnZXROZ01vZHVsZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogTmdNb2R1bGVNZXRhfG51bGwge1xuICAgIGlmICghdGhpcy5tZXRhZGF0YS5oYXMocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YS5nZXQocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKSAhO1xuICAgIGlmICghbWV0YWRhdGEubmdNb2R1bGVNZXRhLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YWRhdGEubmdNb2R1bGVNZXRhLmdldChyZWYubm9kZSkgITtcbiAgfVxuXG4gIHJlZ2lzdGVyTmdNb2R1bGVNZXRhZGF0YShtZXRhOiBOZ01vZHVsZU1ldGEpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEobWV0YS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIG1ldGFkYXRhLm5nTW9kdWxlTWV0YS5zZXQobWV0YS5yZWYubm9kZSwgbWV0YSk7XG4gIH1cblxuICBnZXREaXJlY3RpdmVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IERpcmVjdGl2ZU1ldGF8bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpICE7XG4gICAgaWYgKCFtZXRhZGF0YS5kaXJlY3RpdmVNZXRhLmhhcyhyZWYubm9kZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gbWV0YWRhdGEuZGlyZWN0aXZlTWV0YS5nZXQocmVmLm5vZGUpICE7XG4gIH1cblxuICByZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKG1ldGE6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEobWV0YS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIG1ldGFkYXRhLmRpcmVjdGl2ZU1ldGEuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG5cbiAgZ2V0UGlwZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogUGlwZU1ldGF8bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpICE7XG4gICAgaWYgKCFtZXRhZGF0YS5waXBlTWV0YS5oYXMocmVmLm5vZGUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG1ldGFkYXRhLnBpcGVNZXRhLmdldChyZWYubm9kZSkgITtcbiAgfVxuXG4gIHJlZ2lzdGVyUGlwZU1ldGFkYXRhKG1ldGE6IFBpcGVNZXRhKTogdm9pZCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKG1ldGEucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBtZXRhZGF0YS5waXBlTWV0YS5zZXQobWV0YS5yZWYubm9kZSwgbWV0YSk7XG4gIH1cblxuICByZWNvcmRSZXNvdXJjZURlcGVuZGVuY3koZmlsZTogdHMuU291cmNlRmlsZSwgcmVzb3VyY2VQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEoZmlsZSk7XG4gICAgbWV0YWRhdGEucmVzb3VyY2VQYXRocy5hZGQocmVzb3VyY2VQYXRoKTtcbiAgfVxuXG4gIHJlZ2lzdGVyQ29tcG9uZW50U2NvcGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24sIHNjb3BlOiBMb2NhbE1vZHVsZVNjb3BlKTogdm9pZCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKGNsYXp6LmdldFNvdXJjZUZpbGUoKSk7XG4gICAgbWV0YWRhdGEuY29tcG9uZW50U2NvcGUuc2V0KGNsYXp6LCBzY29wZSk7XG4gIH1cblxuICBnZXRTY29wZUZvckNvbXBvbmVudChjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IExvY2FsTW9kdWxlU2NvcGV8bnVsbCB7XG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhjbGF6ei5nZXRTb3VyY2VGaWxlKCkpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChjbGF6ei5nZXRTb3VyY2VGaWxlKCkpICE7XG4gICAgaWYgKCFtZXRhZGF0YS5jb21wb25lbnRTY29wZS5oYXMoY2xhenopKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIG1ldGFkYXRhLmNvbXBvbmVudFNjb3BlLmdldChjbGF6eikgITtcbiAgfVxuXG4gIHNldENvbXBvbmVudEFzUmVxdWlyaW5nUmVtb3RlU2NvcGluZyhjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShjbGF6ei5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIG1ldGFkYXRhLnJlbW90ZVNjb3BpbmcuYWRkKGNsYXp6KTtcbiAgfVxuXG4gIGdldFJlcXVpcmVzUmVtb3RlU2NvcGUoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFufG51bGwge1xuICAgIC8vIFRPRE86IGh0dHBzOi8vYW5ndWxhci10ZWFtLmF0bGFzc2lhbi5uZXQvYnJvd3NlL0ZXLTE1MDFcbiAgICAvLyBIYW5kbGUgdGhlIGluY3JlbWVudGFsIGJ1aWxkIGNhc2Ugd2hlcmUgYSBjb21wb25lbnQgcmVxdWlyZXMgcmVtb3RlIHNjb3BpbmcuXG4gICAgLy8gVGhpcyBtZWFucyB0aGF0IGlmIHRoZSB0aGUgY29tcG9uZW50J3MgdGVtcGxhdGUgY2hhbmdlcywgaXQgcmVxdWlyZXMgdGhlIG1vZHVsZSB0byBiZVxuICAgIC8vIHJlLWVtaXR0ZWQuXG4gICAgLy8gQWxzbywgd2UgbmVlZCB0byBtYWtlIHN1cmUgdGhlIGN5Y2xlIGRldGVjdG9yIHdvcmtzIHdlbGwgYWNyb3NzIHJlYnVpbGRzLlxuICAgIGlmICghdGhpcy5tZXRhZGF0YS5oYXMoY2xhenouZ2V0U291cmNlRmlsZSgpKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YS5nZXQoY2xhenouZ2V0U291cmNlRmlsZSgpKSAhO1xuICAgIHJldHVybiBtZXRhZGF0YS5yZW1vdGVTY29waW5nLmhhcyhjbGF6eik7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZU1ldGFkYXRhKHNmOiB0cy5Tb3VyY2VGaWxlKTogRmlsZU1ldGFkYXRhIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KHNmKSB8fCBuZXcgRmlsZU1ldGFkYXRhKCk7XG4gICAgdGhpcy5tZXRhZGF0YS5zZXQoc2YsIG1ldGFkYXRhKTtcbiAgICByZXR1cm4gbWV0YWRhdGE7XG4gIH1cblxuICBwcml2YXRlIGhhc0NoYW5nZWRSZXNvdXJjZURlcGVuZGVuY2llcyhzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9PT0gbnVsbCB8fCAhdGhpcy5tZXRhZGF0YS5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHJlc291cmNlRGVwcyA9IHRoaXMubWV0YWRhdGEuZ2V0KHNmKSAhLnJlc291cmNlUGF0aHM7XG4gICAgcmV0dXJuIEFycmF5LmZyb20ocmVzb3VyY2VEZXBzLmtleXMoKSlcbiAgICAgICAgLnNvbWUocmVzb3VyY2VQYXRoID0+IHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzICEuaGFzKHJlc291cmNlUGF0aCkpO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBjYW4gaGF2ZSBhbmFseXNpcyBvciBlbWlzc2lvbiBjYW4gYmUgc2tpcHBlZC5cbiAqL1xuY2xhc3MgRmlsZU1ldGFkYXRhIHtcbiAgLyoqIEEgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IHRoaXMgZmlsZSBkZXBlbmRzIHVwb24uICovXG4gIGZpbGVEZXBlbmRlbmNpZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG4gIHJlc291cmNlUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZGlyZWN0aXZlTWV0YSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgRGlyZWN0aXZlTWV0YT4oKTtcbiAgbmdNb2R1bGVNZXRhID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBOZ01vZHVsZU1ldGE+KCk7XG4gIHBpcGVNZXRhID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBQaXBlTWV0YT4oKTtcbiAgY29tcG9uZW50U2NvcGUgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIExvY2FsTW9kdWxlU2NvcGU+KCk7XG4gIHJlbW90ZVNjb3BpbmcgPSBuZXcgU2V0PENsYXNzRGVjbGFyYXRpb24+KCk7XG59XG4iXX0=