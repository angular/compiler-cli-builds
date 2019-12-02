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
     * Drives an incremental build, by tracking changes and determining which files need to be emitted.
     */
    var IncrementalDriver = /** @class */ (function () {
        function IncrementalDriver(state, allTsFiles) {
            this.allTsFiles = allTsFiles;
            /**
             * Tracks metadata related to each `ts.SourceFile` in the program.
             */
            this.metadata = new Map();
            this.state = state;
        }
        /**
         * Construct an `IncrementalDriver` with a starting state that incorporates the results of a
         * previous build.
         *
         * The previous build's `BuildState` is reconciled with the new program's changes, and the results
         * are merged into the new build's `PendingBuildState`.
         */
        IncrementalDriver.reconcile = function (oldProgram, oldDriver, newProgram, modifiedResourceFiles) {
            var e_1, _a, e_2, _b, e_3, _c;
            // Initialize the state of the current build based on the previous one.
            var state;
            if (oldDriver.state.kind === BuildStateKind.Pending) {
                // The previous build never made it past the pending state. Reuse it as the starting state for
                // this build.
                state = oldDriver.state;
            }
            else {
                // The previous build was successfully analyzed. `pendingEmit` is the only state carried
                // forward into this build.
                state = {
                    kind: BuildStateKind.Pending,
                    pendingEmit: oldDriver.state.pendingEmit,
                    changedResourcePaths: new Set(),
                    changedTsPaths: new Set(),
                };
            }
            // Merge the freshly modified resource files with any prior ones.
            if (modifiedResourceFiles !== null) {
                try {
                    for (var modifiedResourceFiles_1 = tslib_1.__values(modifiedResourceFiles), modifiedResourceFiles_1_1 = modifiedResourceFiles_1.next(); !modifiedResourceFiles_1_1.done; modifiedResourceFiles_1_1 = modifiedResourceFiles_1.next()) {
                        var resFile = modifiedResourceFiles_1_1.value;
                        state.changedResourcePaths.add(resFile);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (modifiedResourceFiles_1_1 && !modifiedResourceFiles_1_1.done && (_a = modifiedResourceFiles_1.return)) _a.call(modifiedResourceFiles_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            // Next, process the files in the new program, with a couple of goals:
            // 1) Determine which TS files have changed, if any, and merge them into `changedTsFiles`.
            // 2) Produce a list of TS files which no longer exist in the program (they've been deleted
            //    since the previous compilation). These need to be removed from the state tracking to avoid
            //    leaking memory.
            // All files in the old program, for easy detection of changes.
            var oldFiles = new Set(oldProgram.getSourceFiles());
            // Assume all the old files were deleted to begin with. Only TS files are tracked.
            var deletedTsPaths = new Set(tsOnlyFiles(oldProgram).map(function (sf) { return sf.fileName; }));
            try {
                for (var _d = tslib_1.__values(newProgram.getSourceFiles()), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var newFile = _e.value;
                    if (!newFile.isDeclarationFile) {
                        // This file exists in the new program, so remove it from `deletedTsPaths`.
                        deletedTsPaths.delete(newFile.fileName);
                    }
                    if (oldFiles.has(newFile)) {
                        // This file hasn't changed; no need to look at it further.
                        continue;
                    }
                    // The file has changed since the last successful build. The appropriate reaction depends on
                    // what kind of file it is.
                    if (!newFile.isDeclarationFile) {
                        // It's a .ts file, so track it as a change.
                        state.changedTsPaths.add(newFile.fileName);
                    }
                    else {
                        // It's a .d.ts file. Currently the compiler does not do a great job of tracking
                        // dependencies on .d.ts files, so bail out of incremental builds here and do a full build.
                        // This usually only happens if something in node_modules changes.
                        return IncrementalDriver.fresh(newProgram);
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // The last step is to remove any deleted files from the state.
                for (var deletedTsPaths_1 = tslib_1.__values(deletedTsPaths), deletedTsPaths_1_1 = deletedTsPaths_1.next(); !deletedTsPaths_1_1.done; deletedTsPaths_1_1 = deletedTsPaths_1.next()) {
                    var filePath = deletedTsPaths_1_1.value;
                    state.pendingEmit.delete(filePath);
                    // Even if the file doesn't exist in the current compilation, it still might have been changed
                    // in a previous one, so delete it from the set of changed TS files, just in case.
                    state.changedTsPaths.delete(filePath);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (deletedTsPaths_1_1 && !deletedTsPaths_1_1.done && (_c = deletedTsPaths_1.return)) _c.call(deletedTsPaths_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // `state` now reflects the initial compilation state of the current
            return new IncrementalDriver(state, new Set(tsOnlyFiles(newProgram)));
        };
        IncrementalDriver.fresh = function (program) {
            // Initialize the set of files which need to be emitted to the set of all TS files in the
            // program.
            var tsFiles = tsOnlyFiles(program);
            var state = {
                kind: BuildStateKind.Pending,
                pendingEmit: new Set(tsFiles.map(function (sf) { return sf.fileName; })),
                changedResourcePaths: new Set(),
                changedTsPaths: new Set(),
            };
            return new IncrementalDriver(state, new Set(tsFiles));
        };
        IncrementalDriver.prototype.recordSuccessfulAnalysis = function () {
            var e_4, _a;
            if (this.state.kind !== BuildStateKind.Pending) {
                // Changes have already been incorporated.
                return;
            }
            var pendingEmit = this.state.pendingEmit;
            var state = this.state;
            try {
                for (var _b = tslib_1.__values(this.allTsFiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    // It's safe to skip emitting a file if:
                    // 1) it hasn't changed
                    // 2) none if its resource dependencies have changed
                    // 3) none of its source dependencies have changed
                    if (state.changedTsPaths.has(sf.fileName) || this.hasChangedResourceDependencies(sf) ||
                        this.getFileDependencies(sf).some(function (dep) { return state.changedTsPaths.has(dep.fileName); })) {
                        // Something has changed which requires this file be re-emitted.
                        pendingEmit.add(sf.fileName);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
            // Update the state to an `AnalyzedBuildState`.
            this.state = {
                kind: BuildStateKind.Analyzed,
                pendingEmit: pendingEmit,
            };
        };
        IncrementalDriver.prototype.recordSuccessfulEmit = function (sf) { this.state.pendingEmit.delete(sf.fileName); };
        IncrementalDriver.prototype.safeToSkipEmit = function (sf) { return !this.state.pendingEmit.has(sf.fileName); };
        IncrementalDriver.prototype.trackFileDependency = function (dep, src) {
            var metadata = this.ensureMetadata(src);
            metadata.fileDependencies.add(dep);
        };
        IncrementalDriver.prototype.trackFileDependencies = function (deps, src) {
            var e_5, _a;
            var metadata = this.ensureMetadata(src);
            try {
                for (var deps_1 = tslib_1.__values(deps), deps_1_1 = deps_1.next(); !deps_1_1.done; deps_1_1 = deps_1.next()) {
                    var dep = deps_1_1.value;
                    metadata.fileDependencies.add(dep);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (deps_1_1 && !deps_1_1.done && (_a = deps_1.return)) _a.call(deps_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
        };
        IncrementalDriver.prototype.getFileDependencies = function (file) {
            if (!this.metadata.has(file)) {
                return [];
            }
            var meta = this.metadata.get(file);
            return Array.from(meta.fileDependencies);
        };
        IncrementalDriver.prototype.recordResourceDependency = function (file, resourcePath) {
            var metadata = this.ensureMetadata(file);
            metadata.resourcePaths.add(resourcePath);
        };
        IncrementalDriver.prototype.ensureMetadata = function (sf) {
            var metadata = this.metadata.get(sf) || new FileMetadata();
            this.metadata.set(sf, metadata);
            return metadata;
        };
        IncrementalDriver.prototype.hasChangedResourceDependencies = function (sf) {
            var _this = this;
            if (!this.metadata.has(sf)) {
                return false;
            }
            var resourceDeps = this.metadata.get(sf).resourcePaths;
            return Array.from(resourceDeps.keys())
                .some(function (resourcePath) { return _this.state.kind === BuildStateKind.Pending &&
                _this.state.changedResourcePaths.has(resourcePath); });
        };
        return IncrementalDriver;
    }());
    exports.IncrementalDriver = IncrementalDriver;
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
    var BuildStateKind;
    (function (BuildStateKind) {
        BuildStateKind[BuildStateKind["Pending"] = 0] = "Pending";
        BuildStateKind[BuildStateKind["Analyzed"] = 1] = "Analyzed";
    })(BuildStateKind || (BuildStateKind = {}));
    function tsOnlyFiles(program) {
        return program.getSourceFiles().filter(function (sf) { return !sf.isDeclarationFile; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFPSDs7T0FFRztJQUNIO1FBYUUsMkJBQW9CLEtBQXdCLEVBQVUsVUFBOEI7WUFBOUIsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7WUFMcEY7O2VBRUc7WUFDSyxhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQStCLENBQUM7WUFHeEQsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNJLDJCQUFTLEdBQWhCLFVBQ0ksVUFBc0IsRUFBRSxTQUE0QixFQUFFLFVBQXNCLEVBQzVFLHFCQUF1Qzs7WUFDekMsdUVBQXVFO1lBQ3ZFLElBQUksS0FBd0IsQ0FBQztZQUM3QixJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ25ELDhGQUE4RjtnQkFDOUYsY0FBYztnQkFDZCxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCx3RkFBd0Y7Z0JBQ3hGLDJCQUEyQjtnQkFDM0IsS0FBSyxHQUFHO29CQUNOLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTztvQkFDNUIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVztvQkFDeEMsb0JBQW9CLEVBQUUsSUFBSSxHQUFHLEVBQVU7b0JBQ3ZDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBVTtpQkFDbEMsQ0FBQzthQUNIO1lBRUQsaUVBQWlFO1lBQ2pFLElBQUkscUJBQXFCLEtBQUssSUFBSSxFQUFFOztvQkFDbEMsS0FBc0IsSUFBQSwwQkFBQSxpQkFBQSxxQkFBcUIsQ0FBQSw0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QW1CO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVwZW5kZW5jeVRyYWNrZXJ9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7UmVzb3VyY2VEZXBlbmRlbmN5UmVjb3JkZXJ9IGZyb20gJy4uLy4uL3V0aWwvc3JjL3Jlc291cmNlX3JlY29yZGVyJztcblxuLyoqXG4gKiBEcml2ZXMgYW4gaW5jcmVtZW50YWwgYnVpbGQsIGJ5IHRyYWNraW5nIGNoYW5nZXMgYW5kIGRldGVybWluaW5nIHdoaWNoIGZpbGVzIG5lZWQgdG8gYmUgZW1pdHRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEluY3JlbWVudGFsRHJpdmVyIGltcGxlbWVudHMgRGVwZW5kZW5jeVRyYWNrZXIsIFJlc291cmNlRGVwZW5kZW5jeVJlY29yZGVyIHtcbiAgLyoqXG4gICAqIFN0YXRlIG9mIHRoZSBjdXJyZW50IGJ1aWxkLlxuICAgKlxuICAgKiBUaGlzIHRyYW5zaXRpb25zIGFzIHRoZSBjb21waWxhdGlvbiBwcm9ncmVzc2VzLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZTogQnVpbGRTdGF0ZTtcblxuICAvKipcbiAgICogVHJhY2tzIG1ldGFkYXRhIHJlbGF0ZWQgdG8gZWFjaCBgdHMuU291cmNlRmlsZWAgaW4gdGhlIHByb2dyYW0uXG4gICAqL1xuICBwcml2YXRlIG1ldGFkYXRhID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBGaWxlTWV0YWRhdGE+KCk7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGUsIHByaXZhdGUgYWxsVHNGaWxlczogU2V0PHRzLlNvdXJjZUZpbGU+KSB7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhbiBgSW5jcmVtZW50YWxEcml2ZXJgIHdpdGggYSBzdGFydGluZyBzdGF0ZSB0aGF0IGluY29ycG9yYXRlcyB0aGUgcmVzdWx0cyBvZiBhXG4gICAqIHByZXZpb3VzIGJ1aWxkLlxuICAgKlxuICAgKiBUaGUgcHJldmlvdXMgYnVpbGQncyBgQnVpbGRTdGF0ZWAgaXMgcmVjb25jaWxlZCB3aXRoIHRoZSBuZXcgcHJvZ3JhbSdzIGNoYW5nZXMsIGFuZCB0aGUgcmVzdWx0c1xuICAgKiBhcmUgbWVyZ2VkIGludG8gdGhlIG5ldyBidWlsZCdzIGBQZW5kaW5nQnVpbGRTdGF0ZWAuXG4gICAqL1xuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZCBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lLlxuICAgIGxldCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGU7XG4gICAgaWYgKG9sZERyaXZlci5zdGF0ZS5raW5kID09PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgbmV2ZXIgbWFkZSBpdCBwYXN0IHRoZSBwZW5kaW5nIHN0YXRlLiBSZXVzZSBpdCBhcyB0aGUgc3RhcnRpbmcgc3RhdGUgZm9yXG4gICAgICAvLyB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSBvbGREcml2ZXIuc3RhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLiBgcGVuZGluZ0VtaXRgIGlzIHRoZSBvbmx5IHN0YXRlIGNhcnJpZWRcbiAgICAgIC8vIGZvcndhcmQgaW50byB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSB7XG4gICAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ0VtaXQsXG4gICAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgY2hhbmdlZFRzUGF0aHM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSB0aGUgZnJlc2hseSBtb2RpZmllZCByZXNvdXJjZSBmaWxlcyB3aXRoIGFueSBwcmlvciBvbmVzLlxuICAgIGlmIChtb2RpZmllZFJlc291cmNlRmlsZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgcmVzRmlsZSBvZiBtb2RpZmllZFJlc291cmNlRmlsZXMpIHtcbiAgICAgICAgc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMuYWRkKHJlc0ZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5leHQsIHByb2Nlc3MgdGhlIGZpbGVzIGluIHRoZSBuZXcgcHJvZ3JhbSwgd2l0aCBhIGNvdXBsZSBvZiBnb2FsczpcbiAgICAvLyAxKSBEZXRlcm1pbmUgd2hpY2ggVFMgZmlsZXMgaGF2ZSBjaGFuZ2VkLCBpZiBhbnksIGFuZCBtZXJnZSB0aGVtIGludG8gYGNoYW5nZWRUc0ZpbGVzYC5cbiAgICAvLyAyKSBQcm9kdWNlIGEgbGlzdCBvZiBUUyBmaWxlcyB3aGljaCBubyBsb25nZXIgZXhpc3QgaW4gdGhlIHByb2dyYW0gKHRoZXkndmUgYmVlbiBkZWxldGVkXG4gICAgLy8gICAgc2luY2UgdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uKS4gVGhlc2UgbmVlZCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0YXRlIHRyYWNraW5nIHRvIGF2b2lkXG4gICAgLy8gICAgbGVha2luZyBtZW1vcnkuXG5cbiAgICAvLyBBbGwgZmlsZXMgaW4gdGhlIG9sZCBwcm9ncmFtLCBmb3IgZWFzeSBkZXRlY3Rpb24gb2YgY2hhbmdlcy5cbiAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4ob2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcblxuICAgIC8vIEFzc3VtZSBhbGwgdGhlIG9sZCBmaWxlcyB3ZXJlIGRlbGV0ZWQgdG8gYmVnaW4gd2l0aC4gT25seSBUUyBmaWxlcyBhcmUgdHJhY2tlZC5cbiAgICBjb25zdCBkZWxldGVkVHNQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPih0c09ubHlGaWxlcyhvbGRQcm9ncmFtKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgbmV3RmlsZSBvZiBuZXdQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghbmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgZXhpc3RzIGluIHRoZSBuZXcgcHJvZ3JhbSwgc28gcmVtb3ZlIGl0IGZyb20gYGRlbGV0ZWRUc1BhdGhzYC5cbiAgICAgICAgZGVsZXRlZFRzUGF0aHMuZGVsZXRlKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIC8vIFRoaXMgZmlsZSBoYXNuJ3QgY2hhbmdlZDsgbm8gbmVlZCB0byBsb29rIGF0IGl0IGZ1cnRoZXIuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZmlsZSBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsIGJ1aWxkLiBUaGUgYXBwcm9wcmlhdGUgcmVhY3Rpb24gZGVwZW5kcyBvblxuICAgICAgLy8gd2hhdCBraW5kIG9mIGZpbGUgaXQgaXMuXG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gSXQncyBhIC50cyBmaWxlLCBzbyB0cmFjayBpdCBhcyBhIGNoYW5nZS5cbiAgICAgICAgc3RhdGUuY2hhbmdlZFRzUGF0aHMuYWRkKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQncyBhIC5kLnRzIGZpbGUuIEN1cnJlbnRseSB0aGUgY29tcGlsZXIgZG9lcyBub3QgZG8gYSBncmVhdCBqb2Igb2YgdHJhY2tpbmdcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzIG9uIC5kLnRzIGZpbGVzLCBzbyBiYWlsIG91dCBvZiBpbmNyZW1lbnRhbCBidWlsZHMgaGVyZSBhbmQgZG8gYSBmdWxsIGJ1aWxkLlxuICAgICAgICAvLyBUaGlzIHVzdWFsbHkgb25seSBoYXBwZW5zIGlmIHNvbWV0aGluZyBpbiBub2RlX21vZHVsZXMgY2hhbmdlcy5cbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsRHJpdmVyLmZyZXNoKG5ld1Byb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBsYXN0IHN0ZXAgaXMgdG8gcmVtb3ZlIGFueSBkZWxldGVkIGZpbGVzIGZyb20gdGhlIHN0YXRlLlxuICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgZGVsZXRlZFRzUGF0aHMpIHtcbiAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG5cbiAgICAgIC8vIEV2ZW4gaWYgdGhlIGZpbGUgZG9lc24ndCBleGlzdCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiwgaXQgc3RpbGwgbWlnaHQgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgIC8vIGluIGEgcHJldmlvdXMgb25lLCBzbyBkZWxldGUgaXQgZnJvbSB0aGUgc2V0IG9mIGNoYW5nZWQgVFMgZmlsZXMsIGp1c3QgaW4gY2FzZS5cbiAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gYHN0YXRlYCBub3cgcmVmbGVjdHMgdGhlIGluaXRpYWwgY29tcGlsYXRpb24gc3RhdGUgb2YgdGhlIGN1cnJlbnRcbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsRHJpdmVyKHN0YXRlLCBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KHRzT25seUZpbGVzKG5ld1Byb2dyYW0pKSk7XG4gIH1cblxuICBzdGF0aWMgZnJlc2gocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzZXQgb2YgZmlsZXMgd2hpY2ggbmVlZCB0byBiZSBlbWl0dGVkIHRvIHRoZSBzZXQgb2YgYWxsIFRTIGZpbGVzIGluIHRoZVxuICAgIC8vIHByb2dyYW0uXG4gICAgY29uc3QgdHNGaWxlcyA9IHRzT25seUZpbGVzKHByb2dyYW0pO1xuXG4gICAgY29uc3Qgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlID0ge1xuICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuUGVuZGluZyxcbiAgICAgIHBlbmRpbmdFbWl0OiBuZXcgU2V0PHN0cmluZz4odHNGaWxlcy5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKSxcbiAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgIGNoYW5nZWRUc1BhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihzdGF0ZSwgbmV3IFNldCh0c0ZpbGVzKSk7XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXMoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgLy8gQ2hhbmdlcyBoYXZlIGFscmVhZHkgYmVlbiBpbmNvcnBvcmF0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGVuZGluZ0VtaXQgPSB0aGlzLnN0YXRlLnBlbmRpbmdFbWl0O1xuXG4gICAgY29uc3Qgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5hbGxUc0ZpbGVzKSB7XG4gICAgICAvLyBJdCdzIHNhZmUgdG8gc2tpcCBlbWl0dGluZyBhIGZpbGUgaWY6XG4gICAgICAvLyAxKSBpdCBoYXNuJ3QgY2hhbmdlZFxuICAgICAgLy8gMikgbm9uZSBpZiBpdHMgcmVzb3VyY2UgZGVwZW5kZW5jaWVzIGhhdmUgY2hhbmdlZFxuICAgICAgLy8gMykgbm9uZSBvZiBpdHMgc291cmNlIGRlcGVuZGVuY2llcyBoYXZlIGNoYW5nZWRcbiAgICAgIGlmIChzdGF0ZS5jaGFuZ2VkVHNQYXRocy5oYXMoc2YuZmlsZU5hbWUpIHx8IHRoaXMuaGFzQ2hhbmdlZFJlc291cmNlRGVwZW5kZW5jaWVzKHNmKSB8fFxuICAgICAgICAgIHRoaXMuZ2V0RmlsZURlcGVuZGVuY2llcyhzZikuc29tZShkZXAgPT4gc3RhdGUuY2hhbmdlZFRzUGF0aHMuaGFzKGRlcC5maWxlTmFtZSkpKSB7XG4gICAgICAgIC8vIFNvbWV0aGluZyBoYXMgY2hhbmdlZCB3aGljaCByZXF1aXJlcyB0aGlzIGZpbGUgYmUgcmUtZW1pdHRlZC5cbiAgICAgICAgcGVuZGluZ0VtaXQuYWRkKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIHRvIGFuIGBBbmFseXplZEJ1aWxkU3RhdGVgLlxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZCxcbiAgICAgIHBlbmRpbmdFbWl0LFxuICAgIH07XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsRW1pdChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQgeyB0aGlzLnN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShzZi5maWxlTmFtZSk7IH1cblxuICBzYWZlVG9Ta2lwRW1pdChzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4geyByZXR1cm4gIXRoaXMuc3RhdGUucGVuZGluZ0VtaXQuaGFzKHNmLmZpbGVOYW1lKTsgfVxuXG4gIHRyYWNrRmlsZURlcGVuZGVuY3koZGVwOiB0cy5Tb3VyY2VGaWxlLCBzcmM6IHRzLlNvdXJjZUZpbGUpIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IHRoaXMuZW5zdXJlTWV0YWRhdGEoc3JjKTtcbiAgICBtZXRhZGF0YS5maWxlRGVwZW5kZW5jaWVzLmFkZChkZXApO1xuICB9XG5cbiAgdHJhY2tGaWxlRGVwZW5kZW5jaWVzKGRlcHM6IHRzLlNvdXJjZUZpbGVbXSwgc3JjOiB0cy5Tb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLmVuc3VyZU1ldGFkYXRhKHNyYyk7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgZGVwcykge1xuICAgICAgbWV0YWRhdGEuZmlsZURlcGVuZGVuY2llcy5hZGQoZGVwKTtcbiAgICB9XG4gIH1cblxuICBnZXRGaWxlRGVwZW5kZW5jaWVzKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlW10ge1xuICAgIGlmICghdGhpcy5tZXRhZGF0YS5oYXMoZmlsZSkpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbWV0YSA9IHRoaXMubWV0YWRhdGEuZ2V0KGZpbGUpICE7XG4gICAgcmV0dXJuIEFycmF5LmZyb20obWV0YS5maWxlRGVwZW5kZW5jaWVzKTtcbiAgfVxuXG4gIHJlY29yZFJlc291cmNlRGVwZW5kZW5jeShmaWxlOiB0cy5Tb3VyY2VGaWxlLCByZXNvdXJjZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdGhpcy5lbnN1cmVNZXRhZGF0YShmaWxlKTtcbiAgICBtZXRhZGF0YS5yZXNvdXJjZVBhdGhzLmFkZChyZXNvdXJjZVBhdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVNZXRhZGF0YShzZjogdHMuU291cmNlRmlsZSk6IEZpbGVNZXRhZGF0YSB7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB0aGlzLm1ldGFkYXRhLmdldChzZikgfHwgbmV3IEZpbGVNZXRhZGF0YSgpO1xuICAgIHRoaXMubWV0YWRhdGEuc2V0KHNmLCBtZXRhZGF0YSk7XG4gICAgcmV0dXJuIG1ldGFkYXRhO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNDaGFuZ2VkUmVzb3VyY2VEZXBlbmRlbmNpZXMoc2Y6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGEuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCByZXNvdXJjZURlcHMgPSB0aGlzLm1ldGFkYXRhLmdldChzZikgIS5yZXNvdXJjZVBhdGhzO1xuICAgIHJldHVybiBBcnJheS5mcm9tKHJlc291cmNlRGVwcy5rZXlzKCkpXG4gICAgICAgIC5zb21lKFxuICAgICAgICAgICAgcmVzb3VyY2VQYXRoID0+IHRoaXMuc3RhdGUua2luZCA9PT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZyAmJlxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMuaGFzKHJlc291cmNlUGF0aCkpO1xuICB9XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgdGhlIHdoZXRoZXIgYSBzb3VyY2UgZmlsZSBjYW4gaGF2ZSBhbmFseXNpcyBvciBlbWlzc2lvbiBjYW4gYmUgc2tpcHBlZC5cbiAqL1xuY2xhc3MgRmlsZU1ldGFkYXRhIHtcbiAgLyoqIEEgc2V0IG9mIHNvdXJjZSBmaWxlcyB0aGF0IHRoaXMgZmlsZSBkZXBlbmRzIHVwb24uICovXG4gIGZpbGVEZXBlbmRlbmNpZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG4gIHJlc291cmNlUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbn1cblxuXG50eXBlIEJ1aWxkU3RhdGUgPSBQZW5kaW5nQnVpbGRTdGF0ZSB8IEFuYWx5emVkQnVpbGRTdGF0ZTtcblxuZW51bSBCdWlsZFN0YXRlS2luZCB7XG4gIFBlbmRpbmcsXG4gIEFuYWx5emVkLFxufVxuXG5pbnRlcmZhY2UgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZDtcblxuICAvKipcbiAgICogVGhlIGhlYXJ0IG9mIGluY3JlbWVudGFsIGJ1aWxkcy4gVGhpcyBgU2V0YCB0cmFja3MgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWRcbiAgICogZHVyaW5nIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIHN0YXJ0cyBvdXQgYXMgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBhcmUgc3RpbGwgcGVuZGluZyBmcm9tIHRoZSBwcmV2aW91cyBwcm9ncmFtIChvciB0aGVcbiAgICogZnVsbCBzZXQgb2YgLnRzIGZpbGVzIG9uIGEgZnJlc2ggYnVpbGQpLlxuICAgKlxuICAgKiBBZnRlciBhbmFseXNpcywgaXQncyB1cGRhdGVkIHRvIGluY2x1ZGUgYW55IGZpbGVzIHdoaWNoIG1pZ2h0IGhhdmUgY2hhbmdlZCBhbmQgbmVlZCBhIHJlLWVtaXRcbiAgICogYXMgYSByZXN1bHQgb2YgaW5jcmVtZW50YWwgY2hhbmdlcy5cbiAgICpcbiAgICogSWYgYW4gZW1pdCBoYXBwZW5zLCBhbnkgd3JpdHRlbiBmaWxlcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSBgU2V0YCwgYXMgdGhleSdyZSBubyBsb25nZXIgcGVuZGluZy5cbiAgICpcbiAgICogVGh1cywgYWZ0ZXIgY29tcGlsYXRpb24gYHBlbmRpbmdFbWl0YCBzaG91bGQgYmUgZW1wdHkgKG9uIGEgc3VjY2Vzc2Z1bCBidWlsZCkgb3IgY29udGFpbiB0aGVcbiAgICogZmlsZXMgd2hpY2ggc3RpbGwgbmVlZCB0byBiZSBlbWl0dGVkIGJ1dCBoYXZlIG5vdCB5ZXQgYmVlbiAoZHVlIHRvIGVycm9ycykuXG4gICAqXG4gICAqIGBwZW5kaW5nRW1pdGAgaXMgdHJhY2tlZCBhcyBhcyBgU2V0PHN0cmluZz5gIGluc3RlYWQgb2YgYSBgU2V0PHRzLlNvdXJjZUZpbGU+YCwgYmVjYXVzZSB0aGVcbiAgICogY29udGVudHMgb2YgdGhlIGZpbGUgYXJlIG5vdCBpbXBvcnRhbnQgaGVyZSwgb25seSB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIGl0XG4gICAqIG5lZWRzIHRvIGJlIGVtaXR0ZWQuIFRoZSBgc3RyaW5nYHMgaGVyZSBhcmUgVFMgZmlsZSBwYXRocy5cbiAgICpcbiAgICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhpcyBhbGdvcml0aG0uXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG59XG5cbi8qKlxuICogU3RhdGUgb2YgYSBidWlsZCBiZWZvcmUgdGhlIEFuZ3VsYXIgYW5hbHlzaXMgcGhhc2UgY29tcGxldGVzLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ0J1aWxkU3RhdGUgZXh0ZW5kcyBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmc7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBmaWxlcyB3aGljaCBhcmUga25vd24gdG8gbmVlZCBhbiBlbWl0LlxuICAgKlxuICAgKiBCZWZvcmUgdGhlIGNvbXBpbGVyJ3MgYW5hbHlzaXMgcGhhc2UgY29tcGxldGVzLCBgcGVuZGluZ0VtaXRgIG9ubHkgY29udGFpbnMgZmlsZXMgdGhhdCB3ZXJlXG4gICAqIHN0aWxsIHBlbmRpbmcgYWZ0ZXIgdGhlIHByZXZpb3VzIGJ1aWxkLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVHlwZVNjcmlwdCBmaWxlIHBhdGhzIHdoaWNoIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBjaGFuZ2VkVHNQYXRoczogU2V0PHN0cmluZz47XG5cbiAgLyoqXG4gICAqIFNldCBvZiByZXNvdXJjZSBmaWxlIHBhdGhzIHdoaWNoIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBjaGFuZ2VkUmVzb3VyY2VQYXRoczogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBBbmFseXplZEJ1aWxkU3RhdGUgZXh0ZW5kcyBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQWZ0ZXIgYW5hbHlzaXMgY29tcGxldGVzICh0aGF0IGlzLCB0aGUgc3RhdGUgdHJhbnNpdGlvbnMgdG8gYEFuYWx5emVkQnVpbGRTdGF0ZWApLCB0aGVcbiAgICogYHBlbmRpbmdFbWl0YCBzZXQgdGFrZXMgaW50byBhY2NvdW50IGFueSBvbi1kaXNrIGNoYW5nZXMgbWFkZSBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHlcbiAgICogYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==