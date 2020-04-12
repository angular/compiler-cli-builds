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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/state", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var dependency_tracking_1 = require("@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking");
    /**
     * Drives an incremental build, by tracking changes and determining which files need to be emitted.
     */
    var IncrementalDriver = /** @class */ (function () {
        function IncrementalDriver(state, allTsFiles, depGraph, logicalChanges) {
            this.allTsFiles = allTsFiles;
            this.depGraph = depGraph;
            this.logicalChanges = logicalChanges;
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
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
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
                    lastGood: oldDriver.state.lastGood,
                };
            }
            // Merge the freshly modified resource files with any prior ones.
            if (modifiedResourceFiles !== null) {
                try {
                    for (var modifiedResourceFiles_1 = tslib_1.__values(modifiedResourceFiles), modifiedResourceFiles_1_1 = modifiedResourceFiles_1.next(); !modifiedResourceFiles_1_1.done; modifiedResourceFiles_1_1 = modifiedResourceFiles_1.next()) {
                        var resFile = modifiedResourceFiles_1_1.value;
                        state.changedResourcePaths.add(file_system_1.absoluteFrom(resFile));
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
                for (var _f = tslib_1.__values(newProgram.getSourceFiles()), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var newFile = _g.value;
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
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                // The next step is to remove any deleted files from the state.
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
            // Now, changedTsPaths contains physically changed TS paths. Use the previous program's logical
            // dependency graph to determine logically changed files.
            var depGraph = new dependency_tracking_1.FileDependencyGraph();
            // If a previous compilation exists, use its dependency graph to determine the set of logically
            // changed files.
            var logicalChanges = null;
            if (state.lastGood !== null) {
                // Extract the set of logically changed files. At the same time, this operation populates the
                // current (fresh) dependency graph with information about those files which have not
                // logically changed.
                logicalChanges = depGraph.updateWithPhysicalChanges(state.lastGood.depGraph, state.changedTsPaths, deletedTsPaths, state.changedResourcePaths);
                try {
                    for (var _h = tslib_1.__values(state.changedTsPaths), _j = _h.next(); !_j.done; _j = _h.next()) {
                        var fileName = _j.value;
                        logicalChanges.add(fileName);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_j && !_j.done && (_d = _h.return)) _d.call(_h);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                try {
                    // Any logically changed files need to be re-emitted. Most of the time this would happen
                    // regardless because the new dependency graph would _also_ identify the file as stale.
                    // However there are edge cases such as removing a component from an NgModule without adding
                    // it to another one, where the previous graph identifies the file as logically changed, but
                    // the new graph (which does not have that edge) fails to identify that the file should be
                    // re-emitted.
                    for (var logicalChanges_1 = tslib_1.__values(logicalChanges), logicalChanges_1_1 = logicalChanges_1.next(); !logicalChanges_1_1.done; logicalChanges_1_1 = logicalChanges_1.next()) {
                        var change = logicalChanges_1_1.value;
                        state.pendingEmit.add(change);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (logicalChanges_1_1 && !logicalChanges_1_1.done && (_e = logicalChanges_1.return)) _e.call(logicalChanges_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
            }
            // `state` now reflects the initial pending state of the current compilation.
            return new IncrementalDriver(state, new Set(tsOnlyFiles(newProgram)), depGraph, logicalChanges);
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
                lastGood: null,
            };
            return new IncrementalDriver(state, new Set(tsFiles), new dependency_tracking_1.FileDependencyGraph(), /* logicalChanges */ null);
        };
        IncrementalDriver.prototype.recordSuccessfulAnalysis = function (traitCompiler) {
            var e_6, _a;
            if (this.state.kind !== BuildStateKind.Pending) {
                // Changes have already been incorporated.
                return;
            }
            var pendingEmit = this.state.pendingEmit;
            var state = this.state;
            try {
                for (var _b = tslib_1.__values(this.allTsFiles), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var sf = _c.value;
                    if (this.depGraph.isStale(sf, state.changedTsPaths, state.changedResourcePaths)) {
                        // Something has changed which requires this file be re-emitted.
                        pendingEmit.add(sf.fileName);
                    }
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_6) throw e_6.error; }
            }
            // Update the state to an `AnalyzedBuildState`.
            this.state = {
                kind: BuildStateKind.Analyzed,
                pendingEmit: pendingEmit,
                // Since this compilation was successfully analyzed, update the "last good" artifacts to the
                // ones from the current compilation.
                lastGood: {
                    depGraph: this.depGraph,
                    traitCompiler: traitCompiler,
                }
            };
        };
        IncrementalDriver.prototype.recordSuccessfulEmit = function (sf) { this.state.pendingEmit.delete(sf.fileName); };
        IncrementalDriver.prototype.safeToSkipEmit = function (sf) { return !this.state.pendingEmit.has(sf.fileName); };
        IncrementalDriver.prototype.priorWorkFor = function (sf) {
            if (this.state.lastGood === null || this.logicalChanges === null) {
                // There is no previous good build, so no prior work exists.
                return null;
            }
            else if (this.logicalChanges.has(sf.fileName)) {
                // Prior work might exist, but would be stale as the file in question has logically changed.
                return null;
            }
            else {
                // Prior work might exist, and if it does then it's usable!
                return this.state.lastGood.traitCompiler.recordsFor(sf);
            }
        };
        return IncrementalDriver;
    }());
    exports.IncrementalDriver = IncrementalDriver;
    var BuildStateKind;
    (function (BuildStateKind) {
        BuildStateKind[BuildStateKind["Pending"] = 0] = "Pending";
        BuildStateKind[BuildStateKind["Analyzed"] = 1] = "Analyzed";
    })(BuildStateKind || (BuildStateKind = {}));
    function tsOnlyFiles(program) {
        return program.getSourceFiles().filter(function (sf) { return !sf.isDeclarationFile; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFJSCwyRUFBK0Q7SUFJL0QsMkdBQTBEO0lBRzFEOztPQUVHO0lBQ0g7UUFRRSwyQkFDSSxLQUF3QixFQUFVLFVBQThCLEVBQ3ZELFFBQTZCLEVBQVUsY0FBZ0M7WUFEOUMsZUFBVSxHQUFWLFVBQVUsQ0FBb0I7WUFDdkQsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7WUFBVSxtQkFBYyxHQUFkLGNBQWMsQ0FBa0I7WUFDbEYsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNJLDJCQUFTLEdBQWhCLFVBQ0ksVUFBc0IsRUFBRSxTQUE0QixFQUFFLFVBQXNCLEVBQzVFLHFCQUF1Qzs7WUFDekMsdUVBQXVFO1lBQ3ZFLElBQUksS0FBd0IsQ0FBQztZQUM3QixJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ25ELDhGQUE4RjtnQkFDOUYsY0FBYztnQkFDZCxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCx3RkFBd0Y7Z0JBQ3hGLDJCQUEyQjtnQkFDM0IsS0FBSyxHQUFHO29CQUNOLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTztvQkFDNUIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVztvQkFDeEMsb0JBQW9CLEVBQUUsSUFBSSxHQUFHLEVBQWtCO29CQUMvQyxjQUFjLEVBQUUsSUFBSSxHQUFHLEVBQVU7b0JBQ2pDLFFBQVEsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVE7aUJBQ25DLENB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QUssSUFBSSxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFO2dCQUNoRSw0REFBNEQ7Z0JBQzVELE9BQU8sSUFBSSxDQUFDO2FBQ2I7aUJBQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQy9DLDRGQUE0RjtnQkFDNUYsT0FBTyxJQUFJLENBQUM7YUFDYjtpQkFBTTtnQkFDTCwyREFBMkQ7Z0JBQzNELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6RDtRQUNILENBQUM7UUFDSCx3QkFBQztJQUFELENBQUMsQUFqTUQsSUFpTUM7SUFqTVksOENBQWlCO0lBcU05QixJQUFLLGNBR0o7SUFIRCxXQUFLLGNBQWM7UUFDakIseURBQU8sQ0FBQTtRQUNQLDJEQUFRLENBQUE7SUFDVixDQUFDLEVBSEksY0FBYyxLQUFkLGNBQWMsUUFHbEI7SUF1RkQsU0FBUyxXQUFXLENBQUMsT0FBbUI7UUFDdEMsT0FBTyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQUEsRUFBRSxJQUFJLE9BQUEsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQXJCLENBQXFCLENBQUMsQ0FBQztJQUN0RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgYWJzb2x1dGVGcm9tfSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzUmVjb3JkLCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cblxuLyoqXG4gKiBEcml2ZXMgYW4gaW5jcmVtZW50YWwgYnVpbGQsIGJ5IHRyYWNraW5nIGNoYW5nZXMgYW5kIGRldGVybWluaW5nIHdoaWNoIGZpbGVzIG5lZWQgdG8gYmUgZW1pdHRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEluY3JlbWVudGFsRHJpdmVyIGltcGxlbWVudHMgSW5jcmVtZW50YWxCdWlsZDxDbGFzc1JlY29yZD4ge1xuICAvKipcbiAgICogU3RhdGUgb2YgdGhlIGN1cnJlbnQgYnVpbGQuXG4gICAqXG4gICAqIFRoaXMgdHJhbnNpdGlvbnMgYXMgdGhlIGNvbXBpbGF0aW9uIHByb2dyZXNzZXMuXG4gICAqL1xuICBwcml2YXRlIHN0YXRlOiBCdWlsZFN0YXRlO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgICBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGUsIHByaXZhdGUgYWxsVHNGaWxlczogU2V0PHRzLlNvdXJjZUZpbGU+LFxuICAgICAgcmVhZG9ubHkgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGgsIHByaXZhdGUgbG9naWNhbENoYW5nZXM6IFNldDxzdHJpbmc+fG51bGwpIHtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogQ29uc3RydWN0IGFuIGBJbmNyZW1lbnRhbERyaXZlcmAgd2l0aCBhIHN0YXJ0aW5nIHN0YXRlIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSByZXN1bHRzIG9mIGFcbiAgICogcHJldmlvdXMgYnVpbGQuXG4gICAqXG4gICAqIFRoZSBwcmV2aW91cyBidWlsZCdzIGBCdWlsZFN0YXRlYCBpcyByZWNvbmNpbGVkIHdpdGggdGhlIG5ldyBwcm9ncmFtJ3MgY2hhbmdlcywgYW5kIHRoZSByZXN1bHRzXG4gICAqIGFyZSBtZXJnZWQgaW50byB0aGUgbmV3IGJ1aWxkJ3MgYFBlbmRpbmdCdWlsZFN0YXRlYC5cbiAgICovXG4gIHN0YXRpYyByZWNvbmNpbGUoXG4gICAgICBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGREcml2ZXI6IEluY3JlbWVudGFsRHJpdmVyLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPnxudWxsKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIC8vIEluaXRpYWxpemUgdGhlIHN0YXRlIG9mIHRoZSBjdXJyZW50IGJ1aWxkIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBvbmUuXG4gICAgbGV0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZTtcbiAgICBpZiAob2xkRHJpdmVyLnN0YXRlLmtpbmQgPT09IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcpIHtcbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCBuZXZlciBtYWRlIGl0IHBhc3QgdGhlIHBlbmRpbmcgc3RhdGUuIFJldXNlIGl0IGFzIHRoZSBzdGFydGluZyBzdGF0ZSBmb3JcbiAgICAgIC8vIHRoaXMgYnVpbGQuXG4gICAgICBzdGF0ZSA9IG9sZERyaXZlci5zdGF0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVGhlIHByZXZpb3VzIGJ1aWxkIHdhcyBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQuIGBwZW5kaW5nRW1pdGAgaXMgdGhlIG9ubHkgc3RhdGUgY2FycmllZFxuICAgICAgLy8gZm9yd2FyZCBpbnRvIHRoaXMgYnVpbGQuXG4gICAgICBzdGF0ZSA9IHtcbiAgICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuUGVuZGluZyxcbiAgICAgICAgcGVuZGluZ0VtaXQ6IG9sZERyaXZlci5zdGF0ZS5wZW5kaW5nRW1pdCxcbiAgICAgICAgY2hhbmdlZFJlc291cmNlUGF0aHM6IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCksXG4gICAgICAgIGNoYW5nZWRUc1BhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgbGFzdEdvb2Q6IG9sZERyaXZlci5zdGF0ZS5sYXN0R29vZCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgdGhlIGZyZXNobHkgbW9kaWZpZWQgcmVzb3VyY2UgZmlsZXMgd2l0aCBhbnkgcHJpb3Igb25lcy5cbiAgICBpZiAobW9kaWZpZWRSZXNvdXJjZUZpbGVzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHJlc0ZpbGUgb2YgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICAgIHN0YXRlLmNoYW5nZWRSZXNvdXJjZVBhdGhzLmFkZChhYnNvbHV0ZUZyb20ocmVzRmlsZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5leHQsIHByb2Nlc3MgdGhlIGZpbGVzIGluIHRoZSBuZXcgcHJvZ3JhbSwgd2l0aCBhIGNvdXBsZSBvZiBnb2FsczpcbiAgICAvLyAxKSBEZXRlcm1pbmUgd2hpY2ggVFMgZmlsZXMgaGF2ZSBjaGFuZ2VkLCBpZiBhbnksIGFuZCBtZXJnZSB0aGVtIGludG8gYGNoYW5nZWRUc0ZpbGVzYC5cbiAgICAvLyAyKSBQcm9kdWNlIGEgbGlzdCBvZiBUUyBmaWxlcyB3aGljaCBubyBsb25nZXIgZXhpc3QgaW4gdGhlIHByb2dyYW0gKHRoZXkndmUgYmVlbiBkZWxldGVkXG4gICAgLy8gICAgc2luY2UgdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uKS4gVGhlc2UgbmVlZCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0YXRlIHRyYWNraW5nIHRvIGF2b2lkXG4gICAgLy8gICAgbGVha2luZyBtZW1vcnkuXG5cbiAgICAvLyBBbGwgZmlsZXMgaW4gdGhlIG9sZCBwcm9ncmFtLCBmb3IgZWFzeSBkZXRlY3Rpb24gb2YgY2hhbmdlcy5cbiAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4ob2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcblxuICAgIC8vIEFzc3VtZSBhbGwgdGhlIG9sZCBmaWxlcyB3ZXJlIGRlbGV0ZWQgdG8gYmVnaW4gd2l0aC4gT25seSBUUyBmaWxlcyBhcmUgdHJhY2tlZC5cbiAgICBjb25zdCBkZWxldGVkVHNQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPih0c09ubHlGaWxlcyhvbGRQcm9ncmFtKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgbmV3RmlsZSBvZiBuZXdQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghbmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgZXhpc3RzIGluIHRoZSBuZXcgcHJvZ3JhbSwgc28gcmVtb3ZlIGl0IGZyb20gYGRlbGV0ZWRUc1BhdGhzYC5cbiAgICAgICAgZGVsZXRlZFRzUGF0aHMuZGVsZXRlKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIC8vIFRoaXMgZmlsZSBoYXNuJ3QgY2hhbmdlZDsgbm8gbmVlZCB0byBsb29rIGF0IGl0IGZ1cnRoZXIuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZmlsZSBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsIGJ1aWxkLiBUaGUgYXBwcm9wcmlhdGUgcmVhY3Rpb24gZGVwZW5kcyBvblxuICAgICAgLy8gd2hhdCBraW5kIG9mIGZpbGUgaXQgaXMuXG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gSXQncyBhIC50cyBmaWxlLCBzbyB0cmFjayBpdCBhcyBhIGNoYW5nZS5cbiAgICAgICAgc3RhdGUuY2hhbmdlZFRzUGF0aHMuYWRkKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQncyBhIC5kLnRzIGZpbGUuIEN1cnJlbnRseSB0aGUgY29tcGlsZXIgZG9lcyBub3QgZG8gYSBncmVhdCBqb2Igb2YgdHJhY2tpbmdcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzIG9uIC5kLnRzIGZpbGVzLCBzbyBiYWlsIG91dCBvZiBpbmNyZW1lbnRhbCBidWlsZHMgaGVyZSBhbmQgZG8gYSBmdWxsIGJ1aWxkLlxuICAgICAgICAvLyBUaGlzIHVzdWFsbHkgb25seSBoYXBwZW5zIGlmIHNvbWV0aGluZyBpbiBub2RlX21vZHVsZXMgY2hhbmdlcy5cbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsRHJpdmVyLmZyZXNoKG5ld1Byb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBuZXh0IHN0ZXAgaXMgdG8gcmVtb3ZlIGFueSBkZWxldGVkIGZpbGVzIGZyb20gdGhlIHN0YXRlLlxuICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgZGVsZXRlZFRzUGF0aHMpIHtcbiAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG5cbiAgICAgIC8vIEV2ZW4gaWYgdGhlIGZpbGUgZG9lc24ndCBleGlzdCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiwgaXQgc3RpbGwgbWlnaHQgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgIC8vIGluIGEgcHJldmlvdXMgb25lLCBzbyBkZWxldGUgaXQgZnJvbSB0aGUgc2V0IG9mIGNoYW5nZWQgVFMgZmlsZXMsIGp1c3QgaW4gY2FzZS5cbiAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gTm93LCBjaGFuZ2VkVHNQYXRocyBjb250YWlucyBwaHlzaWNhbGx5IGNoYW5nZWQgVFMgcGF0aHMuIFVzZSB0aGUgcHJldmlvdXMgcHJvZ3JhbSdzIGxvZ2ljYWxcbiAgICAvLyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy5cbiAgICBjb25zdCBkZXBHcmFwaCA9IG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCk7XG5cbiAgICAvLyBJZiBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGV4aXN0cywgdXNlIGl0cyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSB0aGUgc2V0IG9mIGxvZ2ljYWxseVxuICAgIC8vIGNoYW5nZWQgZmlsZXMuXG4gICAgbGV0IGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsID0gbnVsbDtcbiAgICBpZiAoc3RhdGUubGFzdEdvb2QgIT09IG51bGwpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHNldCBvZiBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy4gQXQgdGhlIHNhbWUgdGltZSwgdGhpcyBvcGVyYXRpb24gcG9wdWxhdGVzIHRoZVxuICAgICAgLy8gY3VycmVudCAoZnJlc2gpIGRlcGVuZGVuY3kgZ3JhcGggd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aG9zZSBmaWxlcyB3aGljaCBoYXZlIG5vdFxuICAgICAgLy8gbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICBsb2dpY2FsQ2hhbmdlcyA9IGRlcEdyYXBoLnVwZGF0ZVdpdGhQaHlzaWNhbENoYW5nZXMoXG4gICAgICAgICAgc3RhdGUubGFzdEdvb2QuZGVwR3JhcGgsIHN0YXRlLmNoYW5nZWRUc1BhdGhzLCBkZWxldGVkVHNQYXRocyxcbiAgICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocyk7XG4gICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIHN0YXRlLmNoYW5nZWRUc1BhdGhzKSB7XG4gICAgICAgIGxvZ2ljYWxDaGFuZ2VzLmFkZChmaWxlTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEFueSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcyBuZWVkIHRvIGJlIHJlLWVtaXR0ZWQuIE1vc3Qgb2YgdGhlIHRpbWUgdGhpcyB3b3VsZCBoYXBwZW5cbiAgICAgIC8vIHJlZ2FyZGxlc3MgYmVjYXVzZSB0aGUgbmV3IGRlcGVuZGVuY3kgZ3JhcGggd291bGQgX2Fsc29fIGlkZW50aWZ5IHRoZSBmaWxlIGFzIHN0YWxlLlxuICAgICAgLy8gSG93ZXZlciB0aGVyZSBhcmUgZWRnZSBjYXNlcyBzdWNoIGFzIHJlbW92aW5nIGEgY29tcG9uZW50IGZyb20gYW4gTmdNb2R1bGUgd2l0aG91dCBhZGRpbmdcbiAgICAgIC8vIGl0IHRvIGFub3RoZXIgb25lLCB3aGVyZSB0aGUgcHJldmlvdXMgZ3JhcGggaWRlbnRpZmllcyB0aGUgZmlsZSBhcyBsb2dpY2FsbHkgY2hhbmdlZCwgYnV0XG4gICAgICAvLyB0aGUgbmV3IGdyYXBoICh3aGljaCBkb2VzIG5vdCBoYXZlIHRoYXQgZWRnZSkgZmFpbHMgdG8gaWRlbnRpZnkgdGhhdCB0aGUgZmlsZSBzaG91bGQgYmVcbiAgICAgIC8vIHJlLWVtaXR0ZWQuXG4gICAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBsb2dpY2FsQ2hhbmdlcykge1xuICAgICAgICBzdGF0ZS5wZW5kaW5nRW1pdC5hZGQoY2hhbmdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBgc3RhdGVgIG5vdyByZWZsZWN0cyB0aGUgaW5pdGlhbCBwZW5kaW5nIHN0YXRlIG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihcbiAgICAgICAgc3RhdGUsIG5ldyBTZXQ8dHMuU291cmNlRmlsZT4odHNPbmx5RmlsZXMobmV3UHJvZ3JhbSkpLCBkZXBHcmFwaCwgbG9naWNhbENoYW5nZXMpO1xuICB9XG5cbiAgc3RhdGljIGZyZXNoKHByb2dyYW06IHRzLlByb2dyYW0pOiBJbmNyZW1lbnRhbERyaXZlciB7XG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIG5lZWQgdG8gYmUgZW1pdHRlZCB0byB0aGUgc2V0IG9mIGFsbCBUUyBmaWxlcyBpbiB0aGVcbiAgICAvLyBwcm9ncmFtLlxuICAgIGNvbnN0IHRzRmlsZXMgPSB0c09ubHlGaWxlcyhwcm9ncmFtKTtcblxuICAgIGNvbnN0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICBwZW5kaW5nRW1pdDogbmV3IFNldDxzdHJpbmc+KHRzRmlsZXMubWFwKHNmID0+IHNmLmZpbGVOYW1lKSksXG4gICAgICBjaGFuZ2VkUmVzb3VyY2VQYXRoczogbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKSxcbiAgICAgIGNoYW5nZWRUc1BhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgIGxhc3RHb29kOiBudWxsLFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsRHJpdmVyKFxuICAgICAgICBzdGF0ZSwgbmV3IFNldCh0c0ZpbGVzKSwgbmV3IEZpbGVEZXBlbmRlbmN5R3JhcGgoKSwgLyogbG9naWNhbENoYW5nZXMgKi8gbnVsbCk7XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLnN0YXRlLmtpbmQgIT09IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcpIHtcbiAgICAgIC8vIENoYW5nZXMgaGF2ZSBhbHJlYWR5IGJlZW4gaW5jb3Jwb3JhdGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBlbmRpbmdFbWl0ID0gdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdDtcblxuICAgIGNvbnN0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSA9IHRoaXMuc3RhdGU7XG5cbiAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMuYWxsVHNGaWxlcykge1xuICAgICAgaWYgKHRoaXMuZGVwR3JhcGguaXNTdGFsZShzZiwgc3RhdGUuY2hhbmdlZFRzUGF0aHMsIHN0YXRlLmNoYW5nZWRSZXNvdXJjZVBhdGhzKSkge1xuICAgICAgICAvLyBTb21ldGhpbmcgaGFzIGNoYW5nZWQgd2hpY2ggcmVxdWlyZXMgdGhpcyBmaWxlIGJlIHJlLWVtaXR0ZWQuXG4gICAgICAgIHBlbmRpbmdFbWl0LmFkZChzZi5maWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRoZSBzdGF0ZSB0byBhbiBgQW5hbHl6ZWRCdWlsZFN0YXRlYC5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQsXG4gICAgICBwZW5kaW5nRW1pdCxcblxuICAgICAgLy8gU2luY2UgdGhpcyBjb21waWxhdGlvbiB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLCB1cGRhdGUgdGhlIFwibGFzdCBnb29kXCIgYXJ0aWZhY3RzIHRvIHRoZVxuICAgICAgLy8gb25lcyBmcm9tIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgICAgbGFzdEdvb2Q6IHtcbiAgICAgICAgZGVwR3JhcGg6IHRoaXMuZGVwR3JhcGgsXG4gICAgICAgIHRyYWl0Q29tcGlsZXI6IHRyYWl0Q29tcGlsZXIsXG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7IHRoaXMuc3RhdGUucGVuZGluZ0VtaXQuZGVsZXRlKHNmLmZpbGVOYW1lKTsgfVxuXG4gIHNhZmVUb1NraXBFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7IHJldHVybiAhdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdC5oYXMoc2YuZmlsZU5hbWUpOyB9XG5cbiAgcHJpb3JXb3JrRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogQ2xhc3NSZWNvcmRbXXxudWxsIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5sYXN0R29vZCA9PT0gbnVsbCB8fCB0aGlzLmxvZ2ljYWxDaGFuZ2VzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyBwcmV2aW91cyBnb29kIGJ1aWxkLCBzbyBubyBwcmlvciB3b3JrIGV4aXN0cy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhpcy5sb2dpY2FsQ2hhbmdlcy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAvLyBQcmlvciB3b3JrIG1pZ2h0IGV4aXN0LCBidXQgd291bGQgYmUgc3RhbGUgYXMgdGhlIGZpbGUgaW4gcXVlc3Rpb24gaGFzIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFByaW9yIHdvcmsgbWlnaHQgZXhpc3QsIGFuZCBpZiBpdCBkb2VzIHRoZW4gaXQncyB1c2FibGUhXG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5sYXN0R29vZC50cmFpdENvbXBpbGVyLnJlY29yZHNGb3Ioc2YpO1xuICAgIH1cbiAgfVxufVxuXG50eXBlIEJ1aWxkU3RhdGUgPSBQZW5kaW5nQnVpbGRTdGF0ZSB8IEFuYWx5emVkQnVpbGRTdGF0ZTtcblxuZW51bSBCdWlsZFN0YXRlS2luZCB7XG4gIFBlbmRpbmcsXG4gIEFuYWx5emVkLFxufVxuXG5pbnRlcmZhY2UgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZDtcblxuICAvKipcbiAgICogVGhlIGhlYXJ0IG9mIGluY3JlbWVudGFsIGJ1aWxkcy4gVGhpcyBgU2V0YCB0cmFja3MgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWRcbiAgICogZHVyaW5nIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIHN0YXJ0cyBvdXQgYXMgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBhcmUgc3RpbGwgcGVuZGluZyBmcm9tIHRoZSBwcmV2aW91cyBwcm9ncmFtIChvciB0aGVcbiAgICogZnVsbCBzZXQgb2YgLnRzIGZpbGVzIG9uIGEgZnJlc2ggYnVpbGQpLlxuICAgKlxuICAgKiBBZnRlciBhbmFseXNpcywgaXQncyB1cGRhdGVkIHRvIGluY2x1ZGUgYW55IGZpbGVzIHdoaWNoIG1pZ2h0IGhhdmUgY2hhbmdlZCBhbmQgbmVlZCBhIHJlLWVtaXRcbiAgICogYXMgYSByZXN1bHQgb2YgaW5jcmVtZW50YWwgY2hhbmdlcy5cbiAgICpcbiAgICogSWYgYW4gZW1pdCBoYXBwZW5zLCBhbnkgd3JpdHRlbiBmaWxlcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSBgU2V0YCwgYXMgdGhleSdyZSBubyBsb25nZXIgcGVuZGluZy5cbiAgICpcbiAgICogVGh1cywgYWZ0ZXIgY29tcGlsYXRpb24gYHBlbmRpbmdFbWl0YCBzaG91bGQgYmUgZW1wdHkgKG9uIGEgc3VjY2Vzc2Z1bCBidWlsZCkgb3IgY29udGFpbiB0aGVcbiAgICogZmlsZXMgd2hpY2ggc3RpbGwgbmVlZCB0byBiZSBlbWl0dGVkIGJ1dCBoYXZlIG5vdCB5ZXQgYmVlbiAoZHVlIHRvIGVycm9ycykuXG4gICAqXG4gICAqIGBwZW5kaW5nRW1pdGAgaXMgdHJhY2tlZCBhcyBhcyBgU2V0PHN0cmluZz5gIGluc3RlYWQgb2YgYSBgU2V0PHRzLlNvdXJjZUZpbGU+YCwgYmVjYXVzZSB0aGVcbiAgICogY29udGVudHMgb2YgdGhlIGZpbGUgYXJlIG5vdCBpbXBvcnRhbnQgaGVyZSwgb25seSB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIGl0XG4gICAqIG5lZWRzIHRvIGJlIGVtaXR0ZWQuIFRoZSBgc3RyaW5nYHMgaGVyZSBhcmUgVFMgZmlsZSBwYXRocy5cbiAgICpcbiAgICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhpcyBhbGdvcml0aG0uXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG5cblxuICAvKipcbiAgICogU3BlY2lmaWMgYXNwZWN0cyBvZiB0aGUgbGFzdCBjb21waWxhdGlvbiB3aGljaCBzdWNjZXNzZnVsbHkgY29tcGxldGVkIGFuYWx5c2lzLCBpZiBhbnkuXG4gICAqL1xuICBsYXN0R29vZDoge1xuICAgIC8qKlxuICAgICAqIFRoZSBkZXBlbmRlbmN5IGdyYXBoIGZyb20gdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgICAqXG4gICAgICogVGhpcyBpcyB1c2VkIHRvIGRldGVybWluZSB0aGUgbG9naWNhbCBpbXBhY3Qgb2YgcGh5c2ljYWwgZmlsZSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGRlcEdyYXBoOiBGaWxlRGVwZW5kZW5jeUdyYXBoO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGBUcmFpdENvbXBpbGVyYCBmcm9tIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgdXNlZCB0byBleHRyYWN0IFwicHJpb3Igd29ya1wiIHdoaWNoIG1pZ2h0IGJlIHJldXNhYmxlIGluIHRoaXMgY29tcGlsYXRpb24uXG4gICAgICovXG4gICAgdHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcjtcbiAgfXxudWxsO1xufVxuXG4vKipcbiAqIFN0YXRlIG9mIGEgYnVpbGQgYmVmb3JlIHRoZSBBbmd1bGFyIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcy5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQmVmb3JlIHRoZSBjb21waWxlcidzIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcywgYHBlbmRpbmdFbWl0YCBvbmx5IGNvbnRhaW5zIGZpbGVzIHRoYXQgd2VyZVxuICAgKiBzdGlsbCBwZW5kaW5nIGFmdGVyIHRoZSBwcmV2aW91cyBidWlsZC5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogU2V0IG9mIFR5cGVTY3JpcHQgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFRzUGF0aHM6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgcmVzb3VyY2UgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFJlc291cmNlUGF0aHM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG59XG5cbmludGVyZmFjZSBBbmFseXplZEJ1aWxkU3RhdGUgZXh0ZW5kcyBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQWZ0ZXIgYW5hbHlzaXMgY29tcGxldGVzICh0aGF0IGlzLCB0aGUgc3RhdGUgdHJhbnNpdGlvbnMgdG8gYEFuYWx5emVkQnVpbGRTdGF0ZWApLCB0aGVcbiAgICogYHBlbmRpbmdFbWl0YCBzZXQgdGFrZXMgaW50byBhY2NvdW50IGFueSBvbi1kaXNrIGNoYW5nZXMgbWFkZSBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHlcbiAgICogYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==