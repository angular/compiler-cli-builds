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
        function IncrementalState(unchangedFiles, metadata) {
            this.unchangedFiles = unchangedFiles;
            this.metadata = metadata;
        }
        IncrementalState.reconcile = function (previousState, oldProgram, newProgram) {
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
            return new IncrementalState(unchangedFiles, metadata);
        };
        IncrementalState.fresh = function () {
            return new IncrementalState(new Set(), new Map());
        };
        IncrementalState.prototype.safeToSkip = function (sf) { return this.unchangedFiles.has(sf); };
        IncrementalState.prototype.trackFileDependency = function (dep, src) {
            var metadata = this.ensureMetadata(src);
            metadata.fileDependencies.add(dep);
        };
        IncrementalState.prototype.getFileDependencies = function (file) {
            var meta = this.metadata.get(file);
            return meta ? Array.from(meta.fileDependencies) : [];
        };
        IncrementalState.prototype.getNgModuleMetadata = function (ref) {
            var metadata = this.metadata.get(ref.node.getSourceFile()) || null;
            return metadata && metadata.ngModuleMeta.get(ref.node) || null;
        };
        IncrementalState.prototype.registerNgModuleMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.ngModuleMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.getDirectiveMetadata = function (ref) {
            var metadata = this.metadata.get(ref.node.getSourceFile()) || null;
            return metadata && metadata.directiveMeta.get(ref.node) || null;
        };
        IncrementalState.prototype.registerDirectiveMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.directiveMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.getPipeMetadata = function (ref) {
            var metadata = this.metadata.get(ref.node.getSourceFile()) || null;
            return metadata && metadata.pipeMeta.get(ref.node) || null;
        };
        IncrementalState.prototype.registerPipeMetadata = function (meta) {
            var metadata = this.ensureMetadata(meta.ref.node.getSourceFile());
            metadata.pipeMeta.set(meta.ref.node, meta);
        };
        IncrementalState.prototype.ensureMetadata = function (sf) {
            var metadata = this.metadata.get(sf) || new FileMetadata();
            this.metadata.set(sf, metadata);
            return metadata;
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
            this.directiveMeta = new Map();
            this.ngModuleMeta = new Map();
            this.pipeMeta = new Map();
        }
        return FileMetadata;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFRSDs7T0FFRztJQUNIO1FBQ0UsMEJBQ1ksY0FBa0MsRUFDbEMsUUFBMEM7WUFEMUMsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1lBQ2xDLGFBQVEsR0FBUixRQUFRLENBQWtDO1FBQUcsQ0FBQztRQUVuRCwwQkFBUyxHQUFoQixVQUFpQixhQUErQixFQUFFLFVBQXNCLEVBQUUsVUFBc0I7O1lBRTlGLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFDO1lBQ2hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1lBQ3hELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFnQixVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNyRSxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBZ0IsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7O2dCQUVyRSwyRkFBMkY7Z0JBQzNGLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3pCLElBQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQUEsTUFBTSxJQUFJLE9BQUEsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxFQUFFOzRCQUNqRCwrQ0FB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QThCLENBQUM7UUFDbkQsQ0FBQztRQUFELG1CQUFDO0lBQUQsQ0FBQyxBQU5ELElBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtSZWZlcmVuY2V9IGZyb20gJy4uLy4uL2ltcG9ydHMnO1xuaW1wb3J0IHtEaXJlY3RpdmVNZXRhLCBNZXRhZGF0YVJlYWRlciwgTWV0YWRhdGFSZWdpc3RyeSwgTmdNb2R1bGVNZXRhLCBQaXBlTWV0YX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtEZXBlbmRlbmN5VHJhY2tlcn0gZnJvbSAnLi4vLi4vcGFydGlhbF9ldmFsdWF0b3InO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBBY2N1bXVsYXRlcyBzdGF0ZSBiZXR3ZWVuIGNvbXBpbGF0aW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIEluY3JlbWVudGFsU3RhdGUgaW1wbGVtZW50cyBEZXBlbmRlbmN5VHJhY2tlciwgTWV0YWRhdGFSZWFkZXIsIE1ldGFkYXRhUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSB1bmNoYW5nZWRGaWxlczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgICAgcHJpdmF0ZSBtZXRhZGF0YTogTWFwPHRzLlNvdXJjZUZpbGUsIEZpbGVNZXRhZGF0YT4pIHt9XG5cbiAgc3RhdGljIHJlY29uY2lsZShwcmV2aW91c1N0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLCBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtKTpcbiAgICAgIEluY3JlbWVudGFsU3RhdGUge1xuICAgIGNvbnN0IHVuY2hhbmdlZEZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPigpO1xuICAgIGNvbnN0IG1ldGFkYXRhID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+KCk7XG4gICAgY29uc3Qgb2xkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG4gICAgY29uc3QgbmV3RmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG5ld1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG5cbiAgICAvLyBDb21wdXRlIHRoZSBzZXQgb2YgZmlsZXMgdGhhdCBhcmUgdW5jaGFuZ2VkIChib3RoIGluIHRoZW1zZWx2ZXMgYW5kIHRoZWlyIGRlcGVuZGVuY2llcykuXG4gICAgZm9yIChjb25zdCBuZXdGaWxlIG9mIG5ld1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKG9sZEZpbGVzLmhhcyhuZXdGaWxlKSkge1xuICAgICAgICBjb25zdCBvbGREZXBzID0gcHJldmlvdXNTdGF0ZS5nZXRGaWxlRGVwZW5kZW5jaWVzKG5ld0ZpbGUpO1xuICAgICAgICBpZiAob2xkRGVwcy5ldmVyeShvbGREZXAgPT4gbmV3RmlsZXMuaGFzKG9sZERlcCkpKSB7XG4gICAgICAgICAgLy8gVGhlIGZpbGUgYW5kIGl0cyBkZXBlbmRlbmNpZXMgYXJlIHVuY2hhbmdlZC5cbiAgICAgICAgICB1bmNoYW5nZWRGaWxlcy5hZGQobmV3RmlsZSk7XG4gICAgICAgICAgLy8gQ29weSBvdmVyIGl0cyBtZXRhZGF0YSB0b29cbiAgICAgICAgICBjb25zdCBtZXRhID0gcHJldmlvdXNTdGF0ZS5tZXRhZGF0YS5nZXQobmV3RmlsZSk7XG4gICAgICAgICAgaWYgKG1ldGEpIHtcbiAgICAgICAgICAgIG1ldGFkYXRhLnNldChuZXdGaWxlLCBtZXRhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAobmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBBIHR5cGluZ3MgZmlsZSBoYXMgY2hhbmdlZCBzbyB0cmlnZ2VyIGEgZnVsbCByZWJ1aWxkIG9mIHRoZSBBbmd1bGFyIGFuYWx5c2VzXG4gICAgICAgIHJldHVybiBJbmNyZW1lbnRhbFN0YXRlLmZyZXNoKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbFN0YXRlKHVuY2hhbmdlZEZpbGVzLCBtZXRhZGF0YSk7XG4gIH1cblxuICBzdGF0aWMgZnJlc2goKTogSW5jcmVtZW50YWxTdGF0ZSB7XG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbFN0YXRlKG5ldyBTZXQ8dHMuU291cmNlRmlsZT4oKSwgbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+KCkpO1xuICB9XG5cbiAgc2FmZVRvU2tpcChzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4geyByZXR1cm4gdGhpcy51bmNoYW5nZWRGaWxlcy5oYXMoc2YpOyB9XG5cbiAgdHJhY2tGaWxlRGVwZW5kZW5jeShkZXA6IHRzLlNvdXJjZUZpbGUsIHNyYzogdHMuU291cmNlRmlsZSkge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShzcmMpO1xuICAgIG1ldGFkYXRhLmZpbGVEZXBlbmRlbmNpZXMuYWRkKGRlcCk7XG4gIH1cblxuICBnZXRGaWxlRGVwZW5kZW5jaWVzKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIGNvbnN0IG1ldGEgPSB0aGlzLm1ldGFkYXRhLmdldChmaWxlKTtcbiAgICByZXR1cm4gbWV0YSA/IEFycmF5LmZyb20obWV0YS5maWxlRGVwZW5kZW5jaWVzKSA6IFtdO1xuICB9XG5cbiAgZ2V0TmdNb2R1bGVNZXRhZGF0YShyZWY6IFJlZmVyZW5jZTxDbGFzc0RlY2xhcmF0aW9uPik6IE5nTW9kdWxlTWV0YXxudWxsIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KHJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSkgfHwgbnVsbDtcbiAgICByZXR1cm4gbWV0YWRhdGEgJiYgbWV0YWRhdGEubmdNb2R1bGVNZXRhLmdldChyZWYubm9kZSkgfHwgbnVsbDtcbiAgfVxuICByZWdpc3Rlck5nTW9kdWxlTWV0YWRhdGEobWV0YTogTmdNb2R1bGVNZXRhKTogdm9pZCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKG1ldGEucmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKTtcbiAgICBtZXRhZGF0YS5uZ01vZHVsZU1ldGEuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG5cbiAgZ2V0RGlyZWN0aXZlTWV0YWRhdGEocmVmOiBSZWZlcmVuY2U8Q2xhc3NEZWNsYXJhdGlvbj4pOiBEaXJlY3RpdmVNZXRhfG51bGwge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YS5nZXQocmVmLm5vZGUuZ2V0U291cmNlRmlsZSgpKSB8fCBudWxsO1xuICAgIHJldHVybiBtZXRhZGF0YSAmJiBtZXRhZGF0YS5kaXJlY3RpdmVNZXRhLmdldChyZWYubm9kZSkgfHwgbnVsbDtcbiAgfVxuICByZWdpc3RlckRpcmVjdGl2ZU1ldGFkYXRhKG1ldGE6IERpcmVjdGl2ZU1ldGEpOiB2b2lkIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEobWV0YS5yZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpO1xuICAgIG1ldGFkYXRhLmRpcmVjdGl2ZU1ldGEuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG5cbiAgZ2V0UGlwZU1ldGFkYXRhKHJlZjogUmVmZXJlbmNlPENsYXNzRGVjbGFyYXRpb24+KTogUGlwZU1ldGF8bnVsbCB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChyZWYubm9kZS5nZXRTb3VyY2VGaWxlKCkpIHx8IG51bGw7XG4gICAgcmV0dXJuIG1ldGFkYXRhICYmIG1ldGFkYXRhLnBpcGVNZXRhLmdldChyZWYubm9kZSkgfHwgbnVsbDtcbiAgfVxuICByZWdpc3RlclBpcGVNZXRhZGF0YShtZXRhOiBQaXBlTWV0YSk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShtZXRhLnJlZi5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgbWV0YWRhdGEucGlwZU1ldGEuc2V0KG1ldGEucmVmLm5vZGUsIG1ldGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVNZXRhZGF0YShzZjogdHMuU291cmNlRmlsZSk6IEZpbGVNZXRhZGF0YSB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChzZikgfHwgbmV3IEZpbGVNZXRhZGF0YSgpO1xuICAgIHRoaXMubWV0YWRhdGEuc2V0KHNmLCBtZXRhZGF0YSk7XG4gICAgcmV0dXJuIG1ldGFkYXRhO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBjYW4gaGF2ZSBhbmFseXNpcyBvciBlbWlzc2lvbiBjYW4gYmUgc2tpcHBlZC5cbiAqL1xuY2xhc3MgRmlsZU1ldGFkYXRhIHtcbiAgLyoqIEEgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IHRoaXMgZmlsZSBkZXBlbmRzIHVwb24uICovXG4gIGZpbGVEZXBlbmRlbmNpZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG4gIGRpcmVjdGl2ZU1ldGEgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIERpcmVjdGl2ZU1ldGE+KCk7XG4gIG5nTW9kdWxlTWV0YSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgTmdNb2R1bGVNZXRhPigpO1xuICBwaXBlTWV0YSA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUGlwZU1ldGE+KCk7XG59XG4iXX0=