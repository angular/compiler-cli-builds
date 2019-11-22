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
        IncrementalState.reconcile = function (oldProgram, newProgram, modifiedResourceFiles) {
            var e_1, _a;
            var unchangedFiles = new Set();
            var metadata = new Map();
            var oldFiles = new Set(oldProgram.getSourceFiles());
            try {
                // Compute the set of files that are unchanged (both in themselves and their dependencies).
                for (var _b = tslib_1.__values(newProgram.getSourceFiles()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var newFile = _c.value;
                    if (newFile.isDeclarationFile && !oldFiles.has(newFile)) {
                        // Bail out and re-emit everything if a .d.ts file has changed - currently the compiler does
                        // not track dependencies into .d.ts files very well.
                        return IncrementalState.fresh();
                    }
                    else if (oldFiles.has(newFile)) {
                        unchangedFiles.add(newFile);
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
            var _this = this;
            // It's safe to skip emitting a file if:
            // 1) it hasn't changed
            // 2) none if its resource dependencies have changed
            // 3) none of its source dependencies have changed
            return this.unchangedFiles.has(sf) && !this.hasChangedResourceDependencies(sf) &&
                this.getFileDependencies(sf).every(function (dep) { return _this.unchangedFiles.has(dep); });
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
        IncrementalState.prototype.recordResourceDependency = function (file, resourcePath) {
            var metadata = this.ensureMetadata(file);
            metadata.resourcePaths.add(resourcePath);
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
        }
        return FileMetadata;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFPSDs7T0FFRztJQUNIO1FBQ0UsMEJBQ1ksY0FBa0MsRUFDbEMsUUFBMEMsRUFDMUMscUJBQXVDO1lBRnZDLG1CQUFjLEdBQWQsY0FBYyxDQUFvQjtZQUNsQyxhQUFRLEdBQVIsUUFBUSxDQUFrQztZQUMxQywwQkFBcUIsR0FBckIscUJBQXFCLENBQWtCO1FBQUcsQ0FBQztRQUVoRCwwQkFBUyxHQUFoQixVQUNJLFVBQXNCLEVBQUUsVUFBc0IsRUFDOUMscUJBQXVDOztZQUN6QyxJQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUNoRCxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztZQUN4RCxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBZ0IsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7O2dCQUVyRSwyRkFBMkY7Z0JBQzNGLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3ZELDRGQUE0Rjt3QkFDNUYscURBQXFEO3dCQUNyRCxPQUFPLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO3FCQUNqQzt5QkFBTSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ2hDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQzdC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QUMzRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUNqQyxJQUFJLENBQUMsVUFBQSxZQUFZLElBQUksT0FBQSxLQUFJLENBQUMscUJBQXVCLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUE5QyxDQUE4QyxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUNILHVCQUFDO0lBQUQsQ0FBQyxBQWhGRCxJQWdGQztJQWhGWSw0Q0FBZ0I7SUFrRjdCOztPQUVHO0lBQ0g7UUFBQTtZQUNFLHlEQUF5RDtZQUN6RCxxQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztZQUM1QyxrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDcEMsQ0FBQztRQUFELG1CQUFDO0lBQUQsQ0FBQyxBQUpELElBSUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlcGVuZGVuY3lUcmFja2VyfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge1Jlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyfSBmcm9tICcuLi8uLi91dGlsL3NyYy9yZXNvdXJjZV9yZWNvcmRlcic7XG5cbi8qKlxuICogQWNjdW11bGF0ZXMgc3RhdGUgYmV0d2VlbiBjb21waWxhdGlvbnMuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbFN0YXRlIGltcGxlbWVudHMgRGVwZW5kZW5jeVRyYWNrZXIsIFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyIHtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgdW5jaGFuZ2VkRmlsZXM6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICAgIHByaXZhdGUgbWV0YWRhdGE6IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+LFxuICAgICAgcHJpdmF0ZSBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGwpIHt9XG5cbiAgc3RhdGljIHJlY29uY2lsZShcbiAgICAgIG9sZFByb2dyYW06IHRzLlByb2dyYW0sIG5ld1Byb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxzdHJpbmc+fG51bGwpOiBJbmNyZW1lbnRhbFN0YXRlIHtcbiAgICBjb25zdCB1bmNoYW5nZWRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKTtcbiAgICBjb25zdCBtZXRhZGF0YSA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgRmlsZU1ldGFkYXRhPigpO1xuICAgIGNvbnN0IG9sZEZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPihvbGRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpO1xuXG4gICAgLy8gQ29tcHV0ZSB0aGUgc2V0IG9mIGZpbGVzIHRoYXQgYXJlIHVuY2hhbmdlZCAoYm90aCBpbiB0aGVtc2VsdmVzIGFuZCB0aGVpciBkZXBlbmRlbmNpZXMpLlxuICAgIGZvciAoY29uc3QgbmV3RmlsZSBvZiBuZXdQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChuZXdGaWxlLmlzRGVjbGFyYXRpb25GaWxlICYmICFvbGRGaWxlcy5oYXMobmV3RmlsZSkpIHtcbiAgICAgICAgLy8gQmFpbCBvdXQgYW5kIHJlLWVtaXQgZXZlcnl0aGluZyBpZiBhIC5kLnRzIGZpbGUgaGFzIGNoYW5nZWQgLSBjdXJyZW50bHkgdGhlIGNvbXBpbGVyIGRvZXNcbiAgICAgICAgLy8gbm90IHRyYWNrIGRlcGVuZGVuY2llcyBpbnRvIC5kLnRzIGZpbGVzIHZlcnkgd2VsbC5cbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsU3RhdGUuZnJlc2goKTtcbiAgICAgIH0gZWxzZSBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIHVuY2hhbmdlZEZpbGVzLmFkZChuZXdGaWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsU3RhdGUodW5jaGFuZ2VkRmlsZXMsIG1ldGFkYXRhLCBtb2RpZmllZFJlc291cmNlRmlsZXMpO1xuICB9XG5cbiAgc3RhdGljIGZyZXNoKCk6IEluY3JlbWVudGFsU3RhdGUge1xuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxTdGF0ZShcbiAgICAgICAgbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpLCBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIEZpbGVNZXRhZGF0YT4oKSwgbnVsbCk7XG4gIH1cblxuICBzYWZlVG9Ta2lwKHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgLy8gSXQncyBzYWZlIHRvIHNraXAgZW1pdHRpbmcgYSBmaWxlIGlmOlxuICAgIC8vIDEpIGl0IGhhc24ndCBjaGFuZ2VkXG4gICAgLy8gMikgbm9uZSBpZiBpdHMgcmVzb3VyY2UgZGVwZW5kZW5jaWVzIGhhdmUgY2hhbmdlZFxuICAgIC8vIDMpIG5vbmUgb2YgaXRzIHNvdXJjZSBkZXBlbmRlbmNpZXMgaGF2ZSBjaGFuZ2VkXG4gICAgcmV0dXJuIHRoaXMudW5jaGFuZ2VkRmlsZXMuaGFzKHNmKSAmJiAhdGhpcy5oYXNDaGFuZ2VkUmVzb3VyY2VEZXBlbmRlbmNpZXMoc2YpICYmXG4gICAgICAgIHRoaXMuZ2V0RmlsZURlcGVuZGVuY2llcyhzZikuZXZlcnkoZGVwID0+IHRoaXMudW5jaGFuZ2VkRmlsZXMuaGFzKGRlcCkpO1xuICB9XG5cbiAgdHJhY2tGaWxlRGVwZW5kZW5jeShkZXA6IHRzLlNvdXJjZUZpbGUsIHNyYzogdHMuU291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShzcmMpO1xuICAgIG1ldGFkYXRhLmZpbGVEZXBlbmRlbmNpZXMuYWRkKGRlcCk7XG4gIH1cblxuICB0cmFja0ZpbGVEZXBlbmRlbmNpZXMoZGVwczogdHMuU291cmNlRmlsZVtdLCBzcmM6IHRzLlNvdXJjZUZpbGUpIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEoc3JjKTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBkZXBzKSB7XG4gICAgICBtZXRhZGF0YS5maWxlRGVwZW5kZW5jaWVzLmFkZChkZXApO1xuICAgIH1cbiAgfVxuXG4gIGdldEZpbGVEZXBlbmRlbmNpZXMoZmlsZTogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGVbXSB7XG4gICAgaWYgKCF0aGlzLm1ldGFkYXRhLmhhcyhmaWxlKSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gdGhpcy5tZXRhZGF0YS5nZXQoZmlsZSkgITtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShtZXRhLmZpbGVEZXBlbmRlbmNpZXMpO1xuICB9XG5cbiAgcmVjb3JkUmVzb3VyY2VEZXBlbmRlbmN5KGZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlc291cmNlUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKGZpbGUpO1xuICAgIG1ldGFkYXRhLnJlc291cmNlUGF0aHMuYWRkKHJlc291cmNlUGF0aCk7XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZU1ldGFkYXRhKHNmOiB0cy5Tb3VyY2VGaWxlKTogRmlsZU1ldGFkYXRhIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KHNmKSB8fCBuZXcgRmlsZU1ldGFkYXRhKCk7XG4gICAgdGhpcy5tZXRhZGF0YS5zZXQoc2YsIG1ldGFkYXRhKTtcbiAgICByZXR1cm4gbWV0YWRhdGE7XG4gIH1cblxuICBwcml2YXRlIGhhc0NoYW5nZWRSZXNvdXJjZURlcGVuZGVuY2llcyhzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLm1vZGlmaWVkUmVzb3VyY2VGaWxlcyA9PT0gbnVsbCB8fCAhdGhpcy5tZXRhZGF0YS5oYXMoc2YpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNvbnN0IHJlc291cmNlRGVwcyA9IHRoaXMubWV0YWRhdGEuZ2V0KHNmKSAhLnJlc291cmNlUGF0aHM7XG4gICAgcmV0dXJuIEFycmF5LmZyb20ocmVzb3VyY2VEZXBzLmtleXMoKSlcbiAgICAgICAgLnNvbWUocmVzb3VyY2VQYXRoID0+IHRoaXMubW9kaWZpZWRSZXNvdXJjZUZpbGVzICEuaGFzKHJlc291cmNlUGF0aCkpO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBjYW4gaGF2ZSBhbmFseXNpcyBvciBlbWlzc2lvbiBjYW4gYmUgc2tpcHBlZC5cbiAqL1xuY2xhc3MgRmlsZU1ldGFkYXRhIHtcbiAgLyoqIEEgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IHRoaXMgZmlsZSBkZXBlbmRzIHVwb24uICovXG4gIGZpbGVEZXBlbmRlbmNpZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG4gIHJlc291cmNlUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbn1cbiJdfQ==