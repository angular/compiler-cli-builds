/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/state", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IncrementalDriver = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var dependency_tracking_1 = require("@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking");
    /**
     * Drives an incremental build, by tracking changes and determining which files need to be emitted.
     */
    var IncrementalDriver = /** @class */ (function () {
        function IncrementalDriver(state, depGraph, logicalChanges) {
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
                var priorGraph = null;
                if (oldDriver.state.lastGood !== null) {
                    priorGraph = oldDriver.state.lastGood.semanticDepGraph;
                }
                // The previous build was successfully analyzed. `pendingEmit` is the only state carried
                // forward into this build.
                state = {
                    kind: BuildStateKind.Pending,
                    pendingEmit: oldDriver.state.pendingEmit,
                    changedResourcePaths: new Set(),
                    changedTsPaths: new Set(),
                    lastGood: oldDriver.state.lastGood,
                    semanticDepGraphUpdater: new semantic_graph_1.SemanticDepGraphUpdater(priorGraph),
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
            return new IncrementalDriver(state, depGraph, logicalChanges);
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
                semanticDepGraphUpdater: new semantic_graph_1.SemanticDepGraphUpdater(/* priorGraph */ null),
            };
            return new IncrementalDriver(state, new dependency_tracking_1.FileDependencyGraph(), /* logicalChanges */ null);
        };
        IncrementalDriver.prototype.getSemanticDepGraphUpdater = function () {
            if (this.state.kind !== BuildStateKind.Pending) {
                throw new Error('Semantic dependency updater is only available when pending analysis');
            }
            return this.state.semanticDepGraphUpdater;
        };
        IncrementalDriver.prototype.recordSuccessfulAnalysis = function (traitCompiler) {
            var e_6, _a;
            if (this.state.kind !== BuildStateKind.Pending) {
                // Changes have already been incorporated.
                return;
            }
            var pendingEmit = this.state.pendingEmit;
            var _b = this.state.semanticDepGraphUpdater.finalize(), needsEmit = _b.needsEmit, newGraph = _b.newGraph;
            try {
                for (var needsEmit_1 = tslib_1.__values(needsEmit), needsEmit_1_1 = needsEmit_1.next(); !needsEmit_1_1.done; needsEmit_1_1 = needsEmit_1.next()) {
                    var path = needsEmit_1_1.value;
                    pendingEmit.add(path);
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (needsEmit_1_1 && !needsEmit_1_1.done && (_a = needsEmit_1.return)) _a.call(needsEmit_1);
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
                    semanticDepGraph: newGraph,
                    traitCompiler: traitCompiler,
                    typeCheckingResults: null,
                },
                priorTypeCheckingResults: this.state.lastGood !== null ? this.state.lastGood.typeCheckingResults : null,
            };
        };
        IncrementalDriver.prototype.recordSuccessfulTypeCheck = function (results) {
            if (this.state.lastGood === null || this.state.kind !== BuildStateKind.Analyzed) {
                return;
            }
            this.state.lastGood.typeCheckingResults = results;
        };
        IncrementalDriver.prototype.recordSuccessfulEmit = function (sf) {
            this.state.pendingEmit.delete(sf.fileName);
        };
        IncrementalDriver.prototype.safeToSkipEmit = function (sf) {
            return !this.state.pendingEmit.has(sf.fileName);
        };
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
        IncrementalDriver.prototype.priorTypeCheckingResultsFor = function (sf) {
            if (this.state.kind !== BuildStateKind.Analyzed ||
                this.state.priorTypeCheckingResults === null || this.logicalChanges === null) {
                return null;
            }
            if (this.logicalChanges.has(sf.fileName) || this.state.pendingEmit.has(sf.fileName)) {
                return null;
            }
            var fileName = file_system_1.absoluteFromSourceFile(sf);
            if (!this.state.priorTypeCheckingResults.has(fileName)) {
                return null;
            }
            var data = this.state.priorTypeCheckingResults.get(fileName);
            if (data.hasInlines) {
                return null;
            }
            return data;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVGO0lBS3ZGLDZGQUE0RTtJQUU1RSwyR0FBMEQ7SUFFMUQ7O09BRUc7SUFDSDtRQVFFLDJCQUNJLEtBQXdCLEVBQVcsUUFBNkIsRUFDeEQsY0FBZ0M7WUFETCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtZQUN4RCxtQkFBYyxHQUFkLGNBQWMsQ0FBa0I7WUFDMUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNJLDJCQUFTLEdBQWhCLFVBQ0ksVUFBc0IsRUFBRSxTQUE0QixFQUFFLFVBQXNCLEVBQzVFLHFCQUF1Qzs7WUFDekMsdUVBQXVFO1lBQ3ZFLElBQUksS0FBd0IsQ0FBQztZQUM3QixJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ25ELDhGQUE4RjtnQkFDOUYsY0FBYztnQkFDZCxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCxJQUFJLFVBQVUsR0FBMEIsSUFBSSxDQUFDO2dCQUM3QyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtvQkFDckMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2lCQUN4RDtnQkFFRCx3RkFBd0Y7Z0JBQ3hGLDJCQUEyQjtnQkFDM0IsS0FBSyxHQUFHO29CQUNOLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTztvQkFDNUIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENB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LGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtDbGFzc1JlY29yZCwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7RmlsZVR5cGVDaGVja2luZ0RhdGF9IGZyb20gJy4uLy4uL3R5cGVjaGVjay9zcmMvY2hlY2tlcic7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge1NlbWFudGljRGVwR3JhcGgsIFNlbWFudGljRGVwR3JhcGhVcGRhdGVyfSBmcm9tICcuLi9zZW1hbnRpY19ncmFwaCc7XG5cbmltcG9ydCB7RmlsZURlcGVuZGVuY3lHcmFwaH0gZnJvbSAnLi9kZXBlbmRlbmN5X3RyYWNraW5nJztcblxuLyoqXG4gKiBEcml2ZXMgYW4gaW5jcmVtZW50YWwgYnVpbGQsIGJ5IHRyYWNraW5nIGNoYW5nZXMgYW5kIGRldGVybWluaW5nIHdoaWNoIGZpbGVzIG5lZWQgdG8gYmUgZW1pdHRlZC5cbiAqL1xuZXhwb3J0IGNsYXNzIEluY3JlbWVudGFsRHJpdmVyIGltcGxlbWVudHMgSW5jcmVtZW50YWxCdWlsZDxDbGFzc1JlY29yZCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+IHtcbiAgLyoqXG4gICAqIFN0YXRlIG9mIHRoZSBjdXJyZW50IGJ1aWxkLlxuICAgKlxuICAgKiBUaGlzIHRyYW5zaXRpb25zIGFzIHRoZSBjb21waWxhdGlvbiBwcm9ncmVzc2VzLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZTogQnVpbGRTdGF0ZTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlLCByZWFkb25seSBkZXBHcmFwaDogRmlsZURlcGVuZGVuY3lHcmFwaCxcbiAgICAgIHByaXZhdGUgbG9naWNhbENoYW5nZXM6IFNldDxzdHJpbmc+fG51bGwpIHtcbiAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gIH1cblxuICAvKipcbiAgICogQ29uc3RydWN0IGFuIGBJbmNyZW1lbnRhbERyaXZlcmAgd2l0aCBhIHN0YXJ0aW5nIHN0YXRlIHRoYXQgaW5jb3Jwb3JhdGVzIHRoZSByZXN1bHRzIG9mIGFcbiAgICogcHJldmlvdXMgYnVpbGQuXG4gICAqXG4gICAqIFRoZSBwcmV2aW91cyBidWlsZCdzIGBCdWlsZFN0YXRlYCBpcyByZWNvbmNpbGVkIHdpdGggdGhlIG5ldyBwcm9ncmFtJ3MgY2hhbmdlcywgYW5kIHRoZSByZXN1bHRzXG4gICAqIGFyZSBtZXJnZWQgaW50byB0aGUgbmV3IGJ1aWxkJ3MgYFBlbmRpbmdCdWlsZFN0YXRlYC5cbiAgICovXG4gIHN0YXRpYyByZWNvbmNpbGUoXG4gICAgICBvbGRQcm9ncmFtOiB0cy5Qcm9ncmFtLCBvbGREcml2ZXI6IEluY3JlbWVudGFsRHJpdmVyLCBuZXdQcm9ncmFtOiB0cy5Qcm9ncmFtLFxuICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8c3RyaW5nPnxudWxsKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIC8vIEluaXRpYWxpemUgdGhlIHN0YXRlIG9mIHRoZSBjdXJyZW50IGJ1aWxkIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBvbmUuXG4gICAgbGV0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZTtcbiAgICBpZiAob2xkRHJpdmVyLnN0YXRlLmtpbmQgPT09IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcpIHtcbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCBuZXZlciBtYWRlIGl0IHBhc3QgdGhlIHBlbmRpbmcgc3RhdGUuIFJldXNlIGl0IGFzIHRoZSBzdGFydGluZyBzdGF0ZSBmb3JcbiAgICAgIC8vIHRoaXMgYnVpbGQuXG4gICAgICBzdGF0ZSA9IG9sZERyaXZlci5zdGF0ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHByaW9yR3JhcGg6IFNlbWFudGljRGVwR3JhcGh8bnVsbCA9IG51bGw7XG4gICAgICBpZiAob2xkRHJpdmVyLnN0YXRlLmxhc3RHb29kICE9PSBudWxsKSB7XG4gICAgICAgIHByaW9yR3JhcGggPSBvbGREcml2ZXIuc3RhdGUubGFzdEdvb2Quc2VtYW50aWNEZXBHcmFwaDtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHByZXZpb3VzIGJ1aWxkIHdhcyBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQuIGBwZW5kaW5nRW1pdGAgaXMgdGhlIG9ubHkgc3RhdGUgY2FycmllZFxuICAgICAgLy8gZm9yd2FyZCBpbnRvIHRoaXMgYnVpbGQuXG4gICAgICBzdGF0ZSA9IHtcbiAgICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuUGVuZGluZyxcbiAgICAgICAgcGVuZGluZ0VtaXQ6IG9sZERyaXZlci5zdGF0ZS5wZW5kaW5nRW1pdCxcbiAgICAgICAgY2hhbmdlZFJlc291cmNlUGF0aHM6IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCksXG4gICAgICAgIGNoYW5nZWRUc1BhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgbGFzdEdvb2Q6IG9sZERyaXZlci5zdGF0ZS5sYXN0R29vZCxcbiAgICAgICAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IG5ldyBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcihwcmlvckdyYXBoKSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgdGhlIGZyZXNobHkgbW9kaWZpZWQgcmVzb3VyY2UgZmlsZXMgd2l0aCBhbnkgcHJpb3Igb25lcy5cbiAgICBpZiAobW9kaWZpZWRSZXNvdXJjZUZpbGVzICE9PSBudWxsKSB7XG4gICAgICBmb3IgKGNvbnN0IHJlc0ZpbGUgb2YgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICAgIHN0YXRlLmNoYW5nZWRSZXNvdXJjZVBhdGhzLmFkZChhYnNvbHV0ZUZyb20ocmVzRmlsZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5leHQsIHByb2Nlc3MgdGhlIGZpbGVzIGluIHRoZSBuZXcgcHJvZ3JhbSwgd2l0aCBhIGNvdXBsZSBvZiBnb2FsczpcbiAgICAvLyAxKSBEZXRlcm1pbmUgd2hpY2ggVFMgZmlsZXMgaGF2ZSBjaGFuZ2VkLCBpZiBhbnksIGFuZCBtZXJnZSB0aGVtIGludG8gYGNoYW5nZWRUc0ZpbGVzYC5cbiAgICAvLyAyKSBQcm9kdWNlIGEgbGlzdCBvZiBUUyBmaWxlcyB3aGljaCBubyBsb25nZXIgZXhpc3QgaW4gdGhlIHByb2dyYW0gKHRoZXkndmUgYmVlbiBkZWxldGVkXG4gICAgLy8gICAgc2luY2UgdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uKS4gVGhlc2UgbmVlZCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0YXRlIHRyYWNraW5nIHRvIGF2b2lkXG4gICAgLy8gICAgbGVha2luZyBtZW1vcnkuXG5cbiAgICAvLyBBbGwgZmlsZXMgaW4gdGhlIG9sZCBwcm9ncmFtLCBmb3IgZWFzeSBkZXRlY3Rpb24gb2YgY2hhbmdlcy5cbiAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4ob2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcblxuICAgIC8vIEFzc3VtZSBhbGwgdGhlIG9sZCBmaWxlcyB3ZXJlIGRlbGV0ZWQgdG8gYmVnaW4gd2l0aC4gT25seSBUUyBmaWxlcyBhcmUgdHJhY2tlZC5cbiAgICBjb25zdCBkZWxldGVkVHNQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPih0c09ubHlGaWxlcyhvbGRQcm9ncmFtKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgbmV3RmlsZSBvZiBuZXdQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghbmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgZXhpc3RzIGluIHRoZSBuZXcgcHJvZ3JhbSwgc28gcmVtb3ZlIGl0IGZyb20gYGRlbGV0ZWRUc1BhdGhzYC5cbiAgICAgICAgZGVsZXRlZFRzUGF0aHMuZGVsZXRlKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIC8vIFRoaXMgZmlsZSBoYXNuJ3QgY2hhbmdlZDsgbm8gbmVlZCB0byBsb29rIGF0IGl0IGZ1cnRoZXIuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZmlsZSBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsIGJ1aWxkLiBUaGUgYXBwcm9wcmlhdGUgcmVhY3Rpb24gZGVwZW5kcyBvblxuICAgICAgLy8gd2hhdCBraW5kIG9mIGZpbGUgaXQgaXMuXG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gSXQncyBhIC50cyBmaWxlLCBzbyB0cmFjayBpdCBhcyBhIGNoYW5nZS5cbiAgICAgICAgc3RhdGUuY2hhbmdlZFRzUGF0aHMuYWRkKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQncyBhIC5kLnRzIGZpbGUuIEN1cnJlbnRseSB0aGUgY29tcGlsZXIgZG9lcyBub3QgZG8gYSBncmVhdCBqb2Igb2YgdHJhY2tpbmdcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzIG9uIC5kLnRzIGZpbGVzLCBzbyBiYWlsIG91dCBvZiBpbmNyZW1lbnRhbCBidWlsZHMgaGVyZSBhbmQgZG8gYSBmdWxsIGJ1aWxkLlxuICAgICAgICAvLyBUaGlzIHVzdWFsbHkgb25seSBoYXBwZW5zIGlmIHNvbWV0aGluZyBpbiBub2RlX21vZHVsZXMgY2hhbmdlcy5cbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsRHJpdmVyLmZyZXNoKG5ld1Byb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBuZXh0IHN0ZXAgaXMgdG8gcmVtb3ZlIGFueSBkZWxldGVkIGZpbGVzIGZyb20gdGhlIHN0YXRlLlxuICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgZGVsZXRlZFRzUGF0aHMpIHtcbiAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG5cbiAgICAgIC8vIEV2ZW4gaWYgdGhlIGZpbGUgZG9lc24ndCBleGlzdCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiwgaXQgc3RpbGwgbWlnaHQgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgIC8vIGluIGEgcHJldmlvdXMgb25lLCBzbyBkZWxldGUgaXQgZnJvbSB0aGUgc2V0IG9mIGNoYW5nZWQgVFMgZmlsZXMsIGp1c3QgaW4gY2FzZS5cbiAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gTm93LCBjaGFuZ2VkVHNQYXRocyBjb250YWlucyBwaHlzaWNhbGx5IGNoYW5nZWQgVFMgcGF0aHMuIFVzZSB0aGUgcHJldmlvdXMgcHJvZ3JhbSdzIGxvZ2ljYWxcbiAgICAvLyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy5cbiAgICBjb25zdCBkZXBHcmFwaCA9IG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCk7XG5cbiAgICAvLyBJZiBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGV4aXN0cywgdXNlIGl0cyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSB0aGUgc2V0IG9mIGxvZ2ljYWxseVxuICAgIC8vIGNoYW5nZWQgZmlsZXMuXG4gICAgbGV0IGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsID0gbnVsbDtcbiAgICBpZiAoc3RhdGUubGFzdEdvb2QgIT09IG51bGwpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHNldCBvZiBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy4gQXQgdGhlIHNhbWUgdGltZSwgdGhpcyBvcGVyYXRpb24gcG9wdWxhdGVzIHRoZVxuICAgICAgLy8gY3VycmVudCAoZnJlc2gpIGRlcGVuZGVuY3kgZ3JhcGggd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aG9zZSBmaWxlcyB3aGljaCBoYXZlIG5vdFxuICAgICAgLy8gbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICBsb2dpY2FsQ2hhbmdlcyA9IGRlcEdyYXBoLnVwZGF0ZVdpdGhQaHlzaWNhbENoYW5nZXMoXG4gICAgICAgICAgc3RhdGUubGFzdEdvb2QuZGVwR3JhcGgsIHN0YXRlLmNoYW5nZWRUc1BhdGhzLCBkZWxldGVkVHNQYXRocyxcbiAgICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocyk7XG4gICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIHN0YXRlLmNoYW5nZWRUc1BhdGhzKSB7XG4gICAgICAgIGxvZ2ljYWxDaGFuZ2VzLmFkZChmaWxlTmFtZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEFueSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcyBuZWVkIHRvIGJlIHJlLWVtaXR0ZWQuIE1vc3Qgb2YgdGhlIHRpbWUgdGhpcyB3b3VsZCBoYXBwZW5cbiAgICAgIC8vIHJlZ2FyZGxlc3MgYmVjYXVzZSB0aGUgbmV3IGRlcGVuZGVuY3kgZ3JhcGggd291bGQgX2Fsc29fIGlkZW50aWZ5IHRoZSBmaWxlIGFzIHN0YWxlLlxuICAgICAgLy8gSG93ZXZlciB0aGVyZSBhcmUgZWRnZSBjYXNlcyBzdWNoIGFzIHJlbW92aW5nIGEgY29tcG9uZW50IGZyb20gYW4gTmdNb2R1bGUgd2l0aG91dCBhZGRpbmdcbiAgICAgIC8vIGl0IHRvIGFub3RoZXIgb25lLCB3aGVyZSB0aGUgcHJldmlvdXMgZ3JhcGggaWRlbnRpZmllcyB0aGUgZmlsZSBhcyBsb2dpY2FsbHkgY2hhbmdlZCwgYnV0XG4gICAgICAvLyB0aGUgbmV3IGdyYXBoICh3aGljaCBkb2VzIG5vdCBoYXZlIHRoYXQgZWRnZSkgZmFpbHMgdG8gaWRlbnRpZnkgdGhhdCB0aGUgZmlsZSBzaG91bGQgYmVcbiAgICAgIC8vIHJlLWVtaXR0ZWQuXG4gICAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBsb2dpY2FsQ2hhbmdlcykge1xuICAgICAgICBzdGF0ZS5wZW5kaW5nRW1pdC5hZGQoY2hhbmdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBgc3RhdGVgIG5vdyByZWZsZWN0cyB0aGUgaW5pdGlhbCBwZW5kaW5nIHN0YXRlIG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihzdGF0ZSwgZGVwR3JhcGgsIGxvZ2ljYWxDaGFuZ2VzKTtcbiAgfVxuXG4gIHN0YXRpYyBmcmVzaChwcm9ncmFtOiB0cy5Qcm9ncmFtKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIC8vIEluaXRpYWxpemUgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWQgdG8gdGhlIHNldCBvZiBhbGwgVFMgZmlsZXMgaW4gdGhlXG4gICAgLy8gcHJvZ3JhbS5cbiAgICBjb25zdCB0c0ZpbGVzID0gdHNPbmx5RmlsZXMocHJvZ3JhbSk7XG5cbiAgICBjb25zdCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nLFxuICAgICAgcGVuZGluZ0VtaXQ6IG5ldyBTZXQ8c3RyaW5nPih0c0ZpbGVzLm1hcChzZiA9PiBzZi5maWxlTmFtZSkpLFxuICAgICAgY2hhbmdlZFJlc291cmNlUGF0aHM6IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCksXG4gICAgICBjaGFuZ2VkVHNQYXRoczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICBsYXN0R29vZDogbnVsbCxcbiAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBuZXcgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIoLyogcHJpb3JHcmFwaCAqLyBudWxsKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihzdGF0ZSwgbmV3IEZpbGVEZXBlbmRlbmN5R3JhcGgoKSwgLyogbG9naWNhbENoYW5nZXMgKi8gbnVsbCk7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcigpOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlciB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZW1hbnRpYyBkZXBlbmRlbmN5IHVwZGF0ZXIgaXMgb25seSBhdmFpbGFibGUgd2hlbiBwZW5kaW5nIGFuYWx5c2lzJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBDaGFuZ2VzIGhhdmUgYWxyZWFkeSBiZWVuIGluY29ycG9yYXRlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBwZW5kaW5nRW1pdCA9IHRoaXMuc3RhdGUucGVuZGluZ0VtaXQ7XG5cbiAgICBjb25zdCB7bmVlZHNFbWl0LCBuZXdHcmFwaH0gPSB0aGlzLnN0YXRlLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmZpbmFsaXplKCk7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIG5lZWRzRW1pdCkge1xuICAgICAgcGVuZGluZ0VtaXQuYWRkKHBhdGgpO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0aGUgc3RhdGUgdG8gYW4gYEFuYWx5emVkQnVpbGRTdGF0ZWAuXG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkLFxuICAgICAgcGVuZGluZ0VtaXQsXG5cbiAgICAgIC8vIFNpbmNlIHRoaXMgY29tcGlsYXRpb24gd2FzIHN1Y2Nlc3NmdWxseSBhbmFseXplZCwgdXBkYXRlIHRoZSBcImxhc3QgZ29vZFwiIGFydGlmYWN0cyB0byB0aGVcbiAgICAgIC8vIG9uZXMgZnJvbSB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICAgIGxhc3RHb29kOiB7XG4gICAgICAgIGRlcEdyYXBoOiB0aGlzLmRlcEdyYXBoLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoOiBuZXdHcmFwaCxcbiAgICAgICAgdHJhaXRDb21waWxlcjogdHJhaXRDb21waWxlcixcbiAgICAgICAgdHlwZUNoZWNraW5nUmVzdWx0czogbnVsbCxcbiAgICAgIH0sXG5cbiAgICAgIHByaW9yVHlwZUNoZWNraW5nUmVzdWx0czpcbiAgICAgICAgICB0aGlzLnN0YXRlLmxhc3RHb29kICE9PSBudWxsID8gdGhpcy5zdGF0ZS5sYXN0R29vZC50eXBlQ2hlY2tpbmdSZXN1bHRzIDogbnVsbCxcbiAgICB9O1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayhyZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPik6IHZvaWQge1xuICAgIGlmICh0aGlzLnN0YXRlLmxhc3RHb29kID09PSBudWxsIHx8IHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5sYXN0R29vZC50eXBlQ2hlY2tpbmdSZXN1bHRzID0gcmVzdWx0cztcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdC5kZWxldGUoc2YuZmlsZU5hbWUpO1xuICB9XG5cbiAgc2FmZVRvU2tpcEVtaXQoc2Y6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHtcbiAgICByZXR1cm4gIXRoaXMuc3RhdGUucGVuZGluZ0VtaXQuaGFzKHNmLmZpbGVOYW1lKTtcbiAgfVxuXG4gIHByaW9yV29ya0ZvcihzZjogdHMuU291cmNlRmlsZSk6IENsYXNzUmVjb3JkW118bnVsbCB7XG4gICAgaWYgKHRoaXMuc3RhdGUubGFzdEdvb2QgPT09IG51bGwgfHwgdGhpcy5sb2dpY2FsQ2hhbmdlcyA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUgaXMgbm8gcHJldmlvdXMgZ29vZCBidWlsZCwgc28gbm8gcHJpb3Igd29yayBleGlzdHMuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKHRoaXMubG9naWNhbENoYW5nZXMuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgLy8gUHJpb3Igd29yayBtaWdodCBleGlzdCwgYnV0IHdvdWxkIGJlIHN0YWxlIGFzIHRoZSBmaWxlIGluIHF1ZXN0aW9uIGhhcyBsb2dpY2FsbHkgY2hhbmdlZC5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBQcmlvciB3b3JrIG1pZ2h0IGV4aXN0LCBhbmQgaWYgaXQgZG9lcyB0aGVuIGl0J3MgdXNhYmxlIVxuICAgICAgcmV0dXJuIHRoaXMuc3RhdGUubGFzdEdvb2QudHJhaXRDb21waWxlci5yZWNvcmRzRm9yKHNmKTtcbiAgICB9XG4gIH1cblxuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBGaWxlVHlwZUNoZWNraW5nRGF0YXxudWxsIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSBCdWlsZFN0YXRlS2luZC5BbmFseXplZCB8fFxuICAgICAgICB0aGlzLnN0YXRlLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0cyA9PT0gbnVsbCB8fCB0aGlzLmxvZ2ljYWxDaGFuZ2VzID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sb2dpY2FsQ2hhbmdlcy5oYXMoc2YuZmlsZU5hbWUpIHx8IHRoaXMuc3RhdGUucGVuZGluZ0VtaXQuaGFzKHNmLmZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZU5hbWUgPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICBpZiAoIXRoaXMuc3RhdGUucHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzLmhhcyhmaWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBkYXRhID0gdGhpcy5zdGF0ZS5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHMuZ2V0KGZpbGVOYW1lKSE7XG4gICAgaWYgKGRhdGEuaGFzSW5saW5lcykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cbn1cblxudHlwZSBCdWlsZFN0YXRlID0gUGVuZGluZ0J1aWxkU3RhdGV8QW5hbHl6ZWRCdWlsZFN0YXRlO1xuXG5lbnVtIEJ1aWxkU3RhdGVLaW5kIHtcbiAgUGVuZGluZyxcbiAgQW5hbHl6ZWQsXG59XG5cbmludGVyZmFjZSBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kO1xuXG4gIC8qKlxuICAgKiBUaGUgaGVhcnQgb2YgaW5jcmVtZW50YWwgYnVpbGRzLiBUaGlzIGBTZXRgIHRyYWNrcyB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIG5lZWQgdG8gYmUgZW1pdHRlZFxuICAgKiBkdXJpbmcgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoaXMgc3RhcnRzIG91dCBhcyB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBzdGlsbCBwZW5kaW5nIGZyb20gdGhlIHByZXZpb3VzIHByb2dyYW0gKG9yIHRoZVxuICAgKiBmdWxsIHNldCBvZiAudHMgZmlsZXMgb24gYSBmcmVzaCBidWlsZCkuXG4gICAqXG4gICAqIEFmdGVyIGFuYWx5c2lzLCBpdCdzIHVwZGF0ZWQgdG8gaW5jbHVkZSBhbnkgZmlsZXMgd2hpY2ggbWlnaHQgaGF2ZSBjaGFuZ2VkIGFuZCBuZWVkIGEgcmUtZW1pdFxuICAgKiBhcyBhIHJlc3VsdCBvZiBpbmNyZW1lbnRhbCBjaGFuZ2VzLlxuICAgKlxuICAgKiBJZiBhbiBlbWl0IGhhcHBlbnMsIGFueSB3cml0dGVuIGZpbGVzIGFyZSByZW1vdmVkIGZyb20gdGhlIGBTZXRgLCBhcyB0aGV5J3JlIG5vIGxvbmdlclxuICAgKiBwZW5kaW5nLlxuICAgKlxuICAgKiBUaHVzLCBhZnRlciBjb21waWxhdGlvbiBgcGVuZGluZ0VtaXRgIHNob3VsZCBiZSBlbXB0eSAob24gYSBzdWNjZXNzZnVsIGJ1aWxkKSBvciBjb250YWluIHRoZVxuICAgKiBmaWxlcyB3aGljaCBzdGlsbCBuZWVkIHRvIGJlIGVtaXR0ZWQgYnV0IGhhdmUgbm90IHlldCBiZWVuIChkdWUgdG8gZXJyb3JzKS5cbiAgICpcbiAgICogYHBlbmRpbmdFbWl0YCBpcyB0cmFja2VkIGFzIGFzIGBTZXQ8c3RyaW5nPmAgaW5zdGVhZCBvZiBhIGBTZXQ8dHMuU291cmNlRmlsZT5gLCBiZWNhdXNlIHRoZVxuICAgKiBjb250ZW50cyBvZiB0aGUgZmlsZSBhcmUgbm90IGltcG9ydGFudCBoZXJlLCBvbmx5IHdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50IHZlcnNpb24gb2YgaXRcbiAgICogbmVlZHMgdG8gYmUgZW1pdHRlZC4gVGhlIGBzdHJpbmdgcyBoZXJlIGFyZSBUUyBmaWxlIHBhdGhzLlxuICAgKlxuICAgKiBTZWUgdGhlIFJFQURNRS5tZCBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGlzIGFsZ29yaXRobS5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuXG4gIC8qKlxuICAgKiBTcGVjaWZpYyBhc3BlY3RzIG9mIHRoZSBsYXN0IGNvbXBpbGF0aW9uIHdoaWNoIHN1Y2Nlc3NmdWxseSBjb21wbGV0ZWQgYW5hbHlzaXMsIGlmIGFueS5cbiAgICovXG4gIGxhc3RHb29kOiB7XG4gICAgLyoqXG4gICAgICogVGhlIGRlcGVuZGVuY3kgZ3JhcGggZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2dpY2FsIGltcGFjdCBvZiBwaHlzaWNhbCBmaWxlIGNoYW5nZXMuXG4gICAgICovXG4gICAgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGg7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaCBmcm9tIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgdXNlZCB0byBwZXJmb3JtIGluLWRlcHRoIGNvbXBhcmlzb24gb2YgQW5ndWxhciBkZWNvcmF0ZWQgY2xhc3NlcywgdG8gZGV0ZXJtaW5lXG4gICAgICogd2hpY2ggZmlsZXMgaGF2ZSB0byBiZSByZS1lbWl0dGVkIGFuZC9vciByZS10eXBlLWNoZWNrZWQuXG4gICAgICovXG4gICAgc2VtYW50aWNEZXBHcmFwaDogU2VtYW50aWNEZXBHcmFwaDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgVHJhaXRDb21waWxlcmAgZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZXh0cmFjdCBcInByaW9yIHdvcmtcIiB3aGljaCBtaWdodCBiZSByZXVzYWJsZSBpbiB0aGlzIGNvbXBpbGF0aW9uLlxuICAgICAqL1xuICAgIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG5cbiAgICAvKipcbiAgICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgd2hpY2ggd2lsbCBiZSBwYXNzZWQgb250byB0aGUgbmV4dCBidWlsZC5cbiAgICAgKi9cbiAgICB0eXBlQ2hlY2tpbmdSZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPnwgbnVsbDtcbiAgfXxudWxsO1xufVxuXG4vKipcbiAqIFN0YXRlIG9mIGEgYnVpbGQgYmVmb3JlIHRoZSBBbmd1bGFyIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcy5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQmVmb3JlIHRoZSBjb21waWxlcidzIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcywgYHBlbmRpbmdFbWl0YCBvbmx5IGNvbnRhaW5zIGZpbGVzIHRoYXQgd2VyZVxuICAgKiBzdGlsbCBwZW5kaW5nIGFmdGVyIHRoZSBwcmV2aW91cyBidWlsZC5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogU2V0IG9mIFR5cGVTY3JpcHQgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFRzUGF0aHM6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgcmVzb3VyY2UgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFJlc291cmNlUGF0aHM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIEluIGEgcGVuZGluZyBzdGF0ZSwgdGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggaXMgYXZhaWxhYmxlIHRvIHRoZSBjb21waWxhdGlvbiB0byByZWdpc3RlclxuICAgKiB0aGUgaW5jcmVtZW50YWwgc3ltYm9scyBpbnRvLlxuICAgKi9cbiAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xufVxuXG5pbnRlcmZhY2UgQW5hbHl6ZWRCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZDtcblxuICAvKipcbiAgICogU2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBrbm93biB0byBuZWVkIGFuIGVtaXQuXG4gICAqXG4gICAqIEFmdGVyIGFuYWx5c2lzIGNvbXBsZXRlcyAodGhhdCBpcywgdGhlIHN0YXRlIHRyYW5zaXRpb25zIHRvIGBBbmFseXplZEJ1aWxkU3RhdGVgKSwgdGhlXG4gICAqIGBwZW5kaW5nRW1pdGAgc2V0IHRha2VzIGludG8gYWNjb3VudCBhbnkgb24tZGlzayBjaGFuZ2VzIG1hZGUgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5XG4gICAqIGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgZnJvbSB0aGUgcHJldmlvdXMgY29tcGlsYXRpb24sIHdoaWNoIGNhbiBiZSByZXVzZWQgaW4gdGhpcyBvbmUuXG4gICAqL1xuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+fG51bGw7XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==