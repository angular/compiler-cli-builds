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
                    pendingTypeCheckEmit: oldDriver.state.pendingTypeCheckEmit,
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
                    state.pendingTypeCheckEmit.delete(filePath);
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
                        state.pendingTypeCheckEmit.add(change);
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
                pendingTypeCheckEmit: new Set(tsFiles.map(function (sf) { return sf.fileName; })),
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
            var e_6, _a, e_7, _b;
            if (this.state.kind !== BuildStateKind.Pending) {
                // Changes have already been incorporated.
                return;
            }
            var _c = this.state.semanticDepGraphUpdater.finalize(), needsEmit = _c.needsEmit, needsTypeCheckEmit = _c.needsTypeCheckEmit, newGraph = _c.newGraph;
            var pendingEmit = this.state.pendingEmit;
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
            var pendingTypeCheckEmit = this.state.pendingTypeCheckEmit;
            try {
                for (var needsTypeCheckEmit_1 = tslib_1.__values(needsTypeCheckEmit), needsTypeCheckEmit_1_1 = needsTypeCheckEmit_1.next(); !needsTypeCheckEmit_1_1.done; needsTypeCheckEmit_1_1 = needsTypeCheckEmit_1.next()) {
                    var path = needsTypeCheckEmit_1_1.value;
                    pendingTypeCheckEmit.add(path);
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (needsTypeCheckEmit_1_1 && !needsTypeCheckEmit_1_1.done && (_b = needsTypeCheckEmit_1.return)) _b.call(needsTypeCheckEmit_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
            // Update the state to an `AnalyzedBuildState`.
            this.state = {
                kind: BuildStateKind.Analyzed,
                pendingEmit: pendingEmit,
                pendingTypeCheckEmit: pendingTypeCheckEmit,
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
            var e_8, _a;
            if (this.state.lastGood === null || this.state.kind !== BuildStateKind.Analyzed) {
                return;
            }
            this.state.lastGood.typeCheckingResults = results;
            try {
                for (var _b = tslib_1.__values(results.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var fileName = _c.value;
                    this.state.pendingTypeCheckEmit.delete(fileName);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_8) throw e_8.error; }
            }
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
            if (this.logicalChanges.has(sf.fileName) || this.state.pendingTypeCheckEmit.has(sf.fileName)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVGO0lBS3ZGLDZGQUE0RTtJQUU1RSwyR0FBMEQ7SUFFMUQ7O09BRUc7SUFDSDtRQVFFLDJCQUNJLEtBQXdCLEVBQVcsUUFBNkIsRUFDeEQsY0FBZ0M7WUFETCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtZQUN4RCxtQkFBYyxHQUFkLGNBQWMsQ0FBa0I7WUFDMUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNJLDJCQUFTLEdBQWhCLFVBQ0ksVUFBc0IsRUFBRSxTQUE0QixFQUFFLFVBQXNCLEVBQzVFLHFCQUF1Qzs7WUFDekMsdUVBQXVFO1lBQ3ZFLElBQUksS0FBd0IsQ0FBQztZQUM3QixJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ25ELDhGQUE4RjtnQkFDOUYsY0FBYztnQkFDZCxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCxJQUFJLFVBQVUsR0FBMEIsSUFBSSxDQUFDO2dCQUM3QyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtvQkFDckMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2lCQUN4RDtnQkFFRCx3RkFBd0Y7Z0JBQ3hGLDJCQUEyQjtnQkFDM0IsS0FBSyxHQUFHO29CQUNOLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTztvQkFDNUIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENB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LElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUYsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sUUFBUSxHQUFHLG9DQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1lBQ2hFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDbkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQTdQRCxJQTZQQztJQTdQWSw4Q0FBaUI7SUFpUTlCLElBQUssY0FHSjtJQUhELFdBQUssY0FBYztRQUNqQix5REFBTyxDQUFBO1FBQ1AsMkRBQVEsQ0FBQTtJQUNWLENBQUMsRUFISSxjQUFjLEtBQWQsY0FBYyxRQUdsQjtJQWlIRCxTQUFTLFdBQVcsQ0FBQyxPQUFtQjtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBckIsQ0FBcUIsQ0FBQyxDQUFDO0lBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q2xhc3NSZWNvcmQsIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge0ZpbGVUeXBlQ2hlY2tpbmdEYXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2svc3JjL2NoZWNrZXInO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtTZW1hbnRpY0RlcEdyYXBoLCBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcn0gZnJvbSAnLi4vc2VtYW50aWNfZ3JhcGgnO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cbi8qKlxuICogRHJpdmVzIGFuIGluY3JlbWVudGFsIGJ1aWxkLCBieSB0cmFja2luZyBjaGFuZ2VzIGFuZCBkZXRlcm1pbmluZyB3aGljaCBmaWxlcyBuZWVkIHRvIGJlIGVtaXR0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbERyaXZlciBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPiB7XG4gIC8qKlxuICAgKiBTdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZC5cbiAgICpcbiAgICogVGhpcyB0cmFuc2l0aW9ucyBhcyB0aGUgY29tcGlsYXRpb24gcHJvZ3Jlc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgc3RhdGU6IEJ1aWxkU3RhdGU7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSwgcmVhZG9ubHkgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGgsXG4gICAgICBwcml2YXRlIGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhbiBgSW5jcmVtZW50YWxEcml2ZXJgIHdpdGggYSBzdGFydGluZyBzdGF0ZSB0aGF0IGluY29ycG9yYXRlcyB0aGUgcmVzdWx0cyBvZiBhXG4gICAqIHByZXZpb3VzIGJ1aWxkLlxuICAgKlxuICAgKiBUaGUgcHJldmlvdXMgYnVpbGQncyBgQnVpbGRTdGF0ZWAgaXMgcmVjb25jaWxlZCB3aXRoIHRoZSBuZXcgcHJvZ3JhbSdzIGNoYW5nZXMsIGFuZCB0aGUgcmVzdWx0c1xuICAgKiBhcmUgbWVyZ2VkIGludG8gdGhlIG5ldyBidWlsZCdzIGBQZW5kaW5nQnVpbGRTdGF0ZWAuXG4gICAqL1xuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZCBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lLlxuICAgIGxldCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGU7XG4gICAgaWYgKG9sZERyaXZlci5zdGF0ZS5raW5kID09PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgbmV2ZXIgbWFkZSBpdCBwYXN0IHRoZSBwZW5kaW5nIHN0YXRlLiBSZXVzZSBpdCBhcyB0aGUgc3RhcnRpbmcgc3RhdGUgZm9yXG4gICAgICAvLyB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSBvbGREcml2ZXIuc3RhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBwcmlvckdyYXBoOiBTZW1hbnRpY0RlcEdyYXBofG51bGwgPSBudWxsO1xuICAgICAgaWYgKG9sZERyaXZlci5zdGF0ZS5sYXN0R29vZCAhPT0gbnVsbCkge1xuICAgICAgICBwcmlvckdyYXBoID0gb2xkRHJpdmVyLnN0YXRlLmxhc3RHb29kLnNlbWFudGljRGVwR3JhcGg7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLiBgcGVuZGluZ0VtaXRgIGlzIHRoZSBvbmx5IHN0YXRlIGNhcnJpZWRcbiAgICAgIC8vIGZvcndhcmQgaW50byB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSB7XG4gICAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ0VtaXQsXG4gICAgICAgIHBlbmRpbmdUeXBlQ2hlY2tFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQsXG4gICAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpLFxuICAgICAgICBjaGFuZ2VkVHNQYXRoczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICAgIGxhc3RHb29kOiBvbGREcml2ZXIuc3RhdGUubGFzdEdvb2QsXG4gICAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBuZXcgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIocHJpb3JHcmFwaCksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE1lcmdlIHRoZSBmcmVzaGx5IG1vZGlmaWVkIHJlc291cmNlIGZpbGVzIHdpdGggYW55IHByaW9yIG9uZXMuXG4gICAgaWYgKG1vZGlmaWVkUmVzb3VyY2VGaWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCByZXNGaWxlIG9mIG1vZGlmaWVkUmVzb3VyY2VGaWxlcykge1xuICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocy5hZGQoYWJzb2x1dGVGcm9tKHJlc0ZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOZXh0LCBwcm9jZXNzIHRoZSBmaWxlcyBpbiB0aGUgbmV3IHByb2dyYW0sIHdpdGggYSBjb3VwbGUgb2YgZ29hbHM6XG4gICAgLy8gMSkgRGV0ZXJtaW5lIHdoaWNoIFRTIGZpbGVzIGhhdmUgY2hhbmdlZCwgaWYgYW55LCBhbmQgbWVyZ2UgdGhlbSBpbnRvIGBjaGFuZ2VkVHNGaWxlc2AuXG4gICAgLy8gMikgUHJvZHVjZSBhIGxpc3Qgb2YgVFMgZmlsZXMgd2hpY2ggbm8gbG9uZ2VyIGV4aXN0IGluIHRoZSBwcm9ncmFtICh0aGV5J3ZlIGJlZW4gZGVsZXRlZFxuICAgIC8vICAgIHNpbmNlIHRoZSBwcmV2aW91cyBjb21waWxhdGlvbikuIFRoZXNlIG5lZWQgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBzdGF0ZSB0cmFja2luZyB0byBhdm9pZFxuICAgIC8vICAgIGxlYWtpbmcgbWVtb3J5LlxuXG4gICAgLy8gQWxsIGZpbGVzIGluIHRoZSBvbGQgcHJvZ3JhbSwgZm9yIGVhc3kgZGV0ZWN0aW9uIG9mIGNoYW5nZXMuXG4gICAgY29uc3Qgb2xkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG5cbiAgICAvLyBBc3N1bWUgYWxsIHRoZSBvbGQgZmlsZXMgd2VyZSBkZWxldGVkIHRvIGJlZ2luIHdpdGguIE9ubHkgVFMgZmlsZXMgYXJlIHRyYWNrZWQuXG4gICAgY29uc3QgZGVsZXRlZFRzUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4odHNPbmx5RmlsZXMob2xkUHJvZ3JhbSkubWFwKHNmID0+IHNmLmZpbGVOYW1lKSk7XG5cbiAgICBmb3IgKGNvbnN0IG5ld0ZpbGUgb2YgbmV3UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gVGhpcyBmaWxlIGV4aXN0cyBpbiB0aGUgbmV3IHByb2dyYW0sIHNvIHJlbW92ZSBpdCBmcm9tIGBkZWxldGVkVHNQYXRoc2AuXG4gICAgICAgIGRlbGV0ZWRUc1BhdGhzLmRlbGV0ZShuZXdGaWxlLmZpbGVOYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9sZEZpbGVzLmhhcyhuZXdGaWxlKSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgaGFzbid0IGNoYW5nZWQ7IG5vIG5lZWQgdG8gbG9vayBhdCBpdCBmdXJ0aGVyLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGZpbGUgaGFzIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBidWlsZC4gVGhlIGFwcHJvcHJpYXRlIHJlYWN0aW9uIGRlcGVuZHMgb25cbiAgICAgIC8vIHdoYXQga2luZCBvZiBmaWxlIGl0IGlzLlxuICAgICAgaWYgKCFuZXdGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIC8vIEl0J3MgYSAudHMgZmlsZSwgc28gdHJhY2sgaXQgYXMgYSBjaGFuZ2UuXG4gICAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmFkZChuZXdGaWxlLmZpbGVOYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0J3MgYSAuZC50cyBmaWxlLiBDdXJyZW50bHkgdGhlIGNvbXBpbGVyIGRvZXMgbm90IGRvIGEgZ3JlYXQgam9iIG9mIHRyYWNraW5nXG4gICAgICAgIC8vIGRlcGVuZGVuY2llcyBvbiAuZC50cyBmaWxlcywgc28gYmFpbCBvdXQgb2YgaW5jcmVtZW50YWwgYnVpbGRzIGhlcmUgYW5kIGRvIGEgZnVsbCBidWlsZC5cbiAgICAgICAgLy8gVGhpcyB1c3VhbGx5IG9ubHkgaGFwcGVucyBpZiBzb21ldGhpbmcgaW4gbm9kZV9tb2R1bGVzIGNoYW5nZXMuXG4gICAgICAgIHJldHVybiBJbmNyZW1lbnRhbERyaXZlci5mcmVzaChuZXdQcm9ncmFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgbmV4dCBzdGVwIGlzIHRvIHJlbW92ZSBhbnkgZGVsZXRlZCBmaWxlcyBmcm9tIHRoZSBzdGF0ZS5cbiAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGRlbGV0ZWRUc1BhdGhzKSB7XG4gICAgICBzdGF0ZS5wZW5kaW5nRW1pdC5kZWxldGUoZmlsZVBhdGgpO1xuICAgICAgc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQuZGVsZXRlKGZpbGVQYXRoKTtcblxuICAgICAgLy8gRXZlbiBpZiB0aGUgZmlsZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLCBpdCBzdGlsbCBtaWdodCBoYXZlIGJlZW4gY2hhbmdlZFxuICAgICAgLy8gaW4gYSBwcmV2aW91cyBvbmUsIHNvIGRlbGV0ZSBpdCBmcm9tIHRoZSBzZXQgb2YgY2hhbmdlZCBUUyBmaWxlcywganVzdCBpbiBjYXNlLlxuICAgICAgc3RhdGUuY2hhbmdlZFRzUGF0aHMuZGVsZXRlKGZpbGVQYXRoKTtcbiAgICB9XG5cbiAgICAvLyBOb3csIGNoYW5nZWRUc1BhdGhzIGNvbnRhaW5zIHBoeXNpY2FsbHkgY2hhbmdlZCBUUyBwYXRocy4gVXNlIHRoZSBwcmV2aW91cyBwcm9ncmFtJ3MgbG9naWNhbFxuICAgIC8vIGRlcGVuZGVuY3kgZ3JhcGggdG8gZGV0ZXJtaW5lIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzLlxuICAgIGNvbnN0IGRlcEdyYXBoID0gbmV3IEZpbGVEZXBlbmRlbmN5R3JhcGgoKTtcblxuICAgIC8vIElmIGEgcHJldmlvdXMgY29tcGlsYXRpb24gZXhpc3RzLCB1c2UgaXRzIGRlcGVuZGVuY3kgZ3JhcGggdG8gZGV0ZXJtaW5lIHRoZSBzZXQgb2YgbG9naWNhbGx5XG4gICAgLy8gY2hhbmdlZCBmaWxlcy5cbiAgICBsZXQgbG9naWNhbENoYW5nZXM6IFNldDxzdHJpbmc+fG51bGwgPSBudWxsO1xuICAgIGlmIChzdGF0ZS5sYXN0R29vZCAhPT0gbnVsbCkge1xuICAgICAgLy8gRXh0cmFjdCB0aGUgc2V0IG9mIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzLiBBdCB0aGUgc2FtZSB0aW1lLCB0aGlzIG9wZXJhdGlvbiBwb3B1bGF0ZXMgdGhlXG4gICAgICAvLyBjdXJyZW50IChmcmVzaCkgZGVwZW5kZW5jeSBncmFwaCB3aXRoIGluZm9ybWF0aW9uIGFib3V0IHRob3NlIGZpbGVzIHdoaWNoIGhhdmUgbm90XG4gICAgICAvLyBsb2dpY2FsbHkgY2hhbmdlZC5cbiAgICAgIGxvZ2ljYWxDaGFuZ2VzID0gZGVwR3JhcGgudXBkYXRlV2l0aFBoeXNpY2FsQ2hhbmdlcyhcbiAgICAgICAgICBzdGF0ZS5sYXN0R29vZC5kZXBHcmFwaCwgc3RhdGUuY2hhbmdlZFRzUGF0aHMsIGRlbGV0ZWRUc1BhdGhzLFxuICAgICAgICAgIHN0YXRlLmNoYW5nZWRSZXNvdXJjZVBhdGhzKTtcbiAgICAgIGZvciAoY29uc3QgZmlsZU5hbWUgb2Ygc3RhdGUuY2hhbmdlZFRzUGF0aHMpIHtcbiAgICAgICAgbG9naWNhbENoYW5nZXMuYWRkKGZpbGVOYW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8gQW55IGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzIG5lZWQgdG8gYmUgcmUtZW1pdHRlZC4gTW9zdCBvZiB0aGUgdGltZSB0aGlzIHdvdWxkIGhhcHBlblxuICAgICAgLy8gcmVnYXJkbGVzcyBiZWNhdXNlIHRoZSBuZXcgZGVwZW5kZW5jeSBncmFwaCB3b3VsZCBfYWxzb18gaWRlbnRpZnkgdGhlIGZpbGUgYXMgc3RhbGUuXG4gICAgICAvLyBIb3dldmVyIHRoZXJlIGFyZSBlZGdlIGNhc2VzIHN1Y2ggYXMgcmVtb3ZpbmcgYSBjb21wb25lbnQgZnJvbSBhbiBOZ01vZHVsZSB3aXRob3V0IGFkZGluZ1xuICAgICAgLy8gaXQgdG8gYW5vdGhlciBvbmUsIHdoZXJlIHRoZSBwcmV2aW91cyBncmFwaCBpZGVudGlmaWVzIHRoZSBmaWxlIGFzIGxvZ2ljYWxseSBjaGFuZ2VkLCBidXRcbiAgICAgIC8vIHRoZSBuZXcgZ3JhcGggKHdoaWNoIGRvZXMgbm90IGhhdmUgdGhhdCBlZGdlKSBmYWlscyB0byBpZGVudGlmeSB0aGF0IHRoZSBmaWxlIHNob3VsZCBiZVxuICAgICAgLy8gcmUtZW1pdHRlZC5cbiAgICAgIGZvciAoY29uc3QgY2hhbmdlIG9mIGxvZ2ljYWxDaGFuZ2VzKSB7XG4gICAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmFkZChjaGFuZ2UpO1xuICAgICAgICBzdGF0ZS5wZW5kaW5nVHlwZUNoZWNrRW1pdC5hZGQoY2hhbmdlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBgc3RhdGVgIG5vdyByZWZsZWN0cyB0aGUgaW5pdGlhbCBwZW5kaW5nIHN0YXRlIG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihzdGF0ZSwgZGVwR3JhcGgsIGxvZ2ljYWxDaGFuZ2VzKTtcbiAgfVxuXG4gIHN0YXRpYyBmcmVzaChwcm9ncmFtOiB0cy5Qcm9ncmFtKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIC8vIEluaXRpYWxpemUgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWQgdG8gdGhlIHNldCBvZiBhbGwgVFMgZmlsZXMgaW4gdGhlXG4gICAgLy8gcHJvZ3JhbS5cbiAgICBjb25zdCB0c0ZpbGVzID0gdHNPbmx5RmlsZXMocHJvZ3JhbSk7XG5cbiAgICBjb25zdCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nLFxuICAgICAgcGVuZGluZ0VtaXQ6IG5ldyBTZXQ8c3RyaW5nPih0c0ZpbGVzLm1hcChzZiA9PiBzZi5maWxlTmFtZSkpLFxuICAgICAgcGVuZGluZ1R5cGVDaGVja0VtaXQ6IG5ldyBTZXQ8c3RyaW5nPih0c0ZpbGVzLm1hcChzZiA9PiBzZi5maWxlTmFtZSkpLFxuICAgICAgY2hhbmdlZFJlc291cmNlUGF0aHM6IG5ldyBTZXQ8QWJzb2x1dGVGc1BhdGg+KCksXG4gICAgICBjaGFuZ2VkVHNQYXRoczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICBsYXN0R29vZDogbnVsbCxcbiAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBuZXcgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIoLyogcHJpb3JHcmFwaCAqLyBudWxsKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbERyaXZlcihzdGF0ZSwgbmV3IEZpbGVEZXBlbmRlbmN5R3JhcGgoKSwgLyogbG9naWNhbENoYW5nZXMgKi8gbnVsbCk7XG4gIH1cblxuICBnZXRTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcigpOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlciB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZW1hbnRpYyBkZXBlbmRlbmN5IHVwZGF0ZXIgaXMgb25seSBhdmFpbGFibGUgd2hlbiBwZW5kaW5nIGFuYWx5c2lzJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnN0YXRlLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBDaGFuZ2VzIGhhdmUgYWxyZWFkeSBiZWVuIGluY29ycG9yYXRlZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB7bmVlZHNFbWl0LCBuZWVkc1R5cGVDaGVja0VtaXQsIG5ld0dyYXBofSA9IHRoaXMuc3RhdGUuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIuZmluYWxpemUoKTtcblxuICAgIGNvbnN0IHBlbmRpbmdFbWl0ID0gdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdDtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgbmVlZHNFbWl0KSB7XG4gICAgICBwZW5kaW5nRW1pdC5hZGQocGF0aCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGVuZGluZ1R5cGVDaGVja0VtaXQgPSB0aGlzLnN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0O1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBuZWVkc1R5cGVDaGVja0VtaXQpIHtcbiAgICAgIHBlbmRpbmdUeXBlQ2hlY2tFbWl0LmFkZChwYXRoKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIHRvIGFuIGBBbmFseXplZEJ1aWxkU3RhdGVgLlxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZCxcbiAgICAgIHBlbmRpbmdFbWl0LFxuICAgICAgcGVuZGluZ1R5cGVDaGVja0VtaXQsXG5cbiAgICAgIC8vIFNpbmNlIHRoaXMgY29tcGlsYXRpb24gd2FzIHN1Y2Nlc3NmdWxseSBhbmFseXplZCwgdXBkYXRlIHRoZSBcImxhc3QgZ29vZFwiIGFydGlmYWN0cyB0byB0aGVcbiAgICAgIC8vIG9uZXMgZnJvbSB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICAgIGxhc3RHb29kOiB7XG4gICAgICAgIGRlcEdyYXBoOiB0aGlzLmRlcEdyYXBoLFxuICAgICAgICBzZW1hbnRpY0RlcEdyYXBoOiBuZXdHcmFwaCxcbiAgICAgICAgdHJhaXRDb21waWxlcjogdHJhaXRDb21waWxlcixcbiAgICAgICAgdHlwZUNoZWNraW5nUmVzdWx0czogbnVsbCxcbiAgICAgIH0sXG5cbiAgICAgIHByaW9yVHlwZUNoZWNraW5nUmVzdWx0czpcbiAgICAgICAgICB0aGlzLnN0YXRlLmxhc3RHb29kICE9PSBudWxsID8gdGhpcy5zdGF0ZS5sYXN0R29vZC50eXBlQ2hlY2tpbmdSZXN1bHRzIDogbnVsbCxcbiAgICB9O1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayhyZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPik6IHZvaWQge1xuICAgIGlmICh0aGlzLnN0YXRlLmxhc3RHb29kID09PSBudWxsIHx8IHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zdGF0ZS5sYXN0R29vZC50eXBlQ2hlY2tpbmdSZXN1bHRzID0gcmVzdWx0cztcblxuICAgIGZvciAoY29uc3QgZmlsZU5hbWUgb2YgcmVzdWx0cy5rZXlzKCkpIHtcbiAgICAgIHRoaXMuc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQuZGVsZXRlKGZpbGVOYW1lKTtcbiAgICB9XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsRW1pdChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGUucGVuZGluZ0VtaXQuZGVsZXRlKHNmLmZpbGVOYW1lKTtcbiAgfVxuXG4gIHNhZmVUb1NraXBFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLnN0YXRlLnBlbmRpbmdFbWl0LmhhcyhzZi5maWxlTmFtZSk7XG4gIH1cblxuICBwcmlvcldvcmtGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICh0aGlzLnN0YXRlLmxhc3RHb29kID09PSBudWxsIHx8IHRoaXMubG9naWNhbENoYW5nZXMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIHByZXZpb3VzIGdvb2QgYnVpbGQsIHNvIG5vIHByaW9yIHdvcmsgZXhpc3RzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGlzLmxvZ2ljYWxDaGFuZ2VzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIC8vIFByaW9yIHdvcmsgbWlnaHQgZXhpc3QsIGJ1dCB3b3VsZCBiZSBzdGFsZSBhcyB0aGUgZmlsZSBpbiBxdWVzdGlvbiBoYXMgbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJpb3Igd29yayBtaWdodCBleGlzdCwgYW5kIGlmIGl0IGRvZXMgdGhlbiBpdCdzIHVzYWJsZSFcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmxhc3RHb29kLnRyYWl0Q29tcGlsZXIucmVjb3Jkc0ZvcihzZik7XG4gICAgfVxuICB9XG5cbiAgcHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogRmlsZVR5cGVDaGVja2luZ0RhdGF8bnVsbCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQgfHxcbiAgICAgICAgdGhpcy5zdGF0ZS5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHMgPT09IG51bGwgfHwgdGhpcy5sb2dpY2FsQ2hhbmdlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9naWNhbENoYW5nZXMuaGFzKHNmLmZpbGVOYW1lKSB8fCB0aGlzLnN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0LmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVOYW1lID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgaWYgKCF0aGlzLnN0YXRlLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0cy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuc3RhdGUucHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzLmdldChmaWxlTmFtZSkhO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG59XG5cbnR5cGUgQnVpbGRTdGF0ZSA9IFBlbmRpbmdCdWlsZFN0YXRlfEFuYWx5emVkQnVpbGRTdGF0ZTtcblxuZW51bSBCdWlsZFN0YXRlS2luZCB7XG4gIFBlbmRpbmcsXG4gIEFuYWx5emVkLFxufVxuXG5pbnRlcmZhY2UgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZDtcblxuICAvKipcbiAgICogVGhlIGhlYXJ0IG9mIGluY3JlbWVudGFsIGJ1aWxkcy4gVGhpcyBgU2V0YCB0cmFja3MgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWRcbiAgICogZHVyaW5nIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIHN0YXJ0cyBvdXQgYXMgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBhcmUgc3RpbGwgcGVuZGluZyBmcm9tIHRoZSBwcmV2aW91cyBwcm9ncmFtIChvciB0aGVcbiAgICogZnVsbCBzZXQgb2YgLnRzIGZpbGVzIG9uIGEgZnJlc2ggYnVpbGQpLlxuICAgKlxuICAgKiBBZnRlciBhbmFseXNpcywgaXQncyB1cGRhdGVkIHRvIGluY2x1ZGUgYW55IGZpbGVzIHdoaWNoIG1pZ2h0IGhhdmUgY2hhbmdlZCBhbmQgbmVlZCBhIHJlLWVtaXRcbiAgICogYXMgYSByZXN1bHQgb2YgaW5jcmVtZW50YWwgY2hhbmdlcy5cbiAgICpcbiAgICogSWYgYW4gZW1pdCBoYXBwZW5zLCBhbnkgd3JpdHRlbiBmaWxlcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSBgU2V0YCwgYXMgdGhleSdyZSBubyBsb25nZXJcbiAgICogcGVuZGluZy5cbiAgICpcbiAgICogVGh1cywgYWZ0ZXIgY29tcGlsYXRpb24gYHBlbmRpbmdFbWl0YCBzaG91bGQgYmUgZW1wdHkgKG9uIGEgc3VjY2Vzc2Z1bCBidWlsZCkgb3IgY29udGFpbiB0aGVcbiAgICogZmlsZXMgd2hpY2ggc3RpbGwgbmVlZCB0byBiZSBlbWl0dGVkIGJ1dCBoYXZlIG5vdCB5ZXQgYmVlbiAoZHVlIHRvIGVycm9ycykuXG4gICAqXG4gICAqIGBwZW5kaW5nRW1pdGAgaXMgdHJhY2tlZCBhcyBhcyBgU2V0PHN0cmluZz5gIGluc3RlYWQgb2YgYSBgU2V0PHRzLlNvdXJjZUZpbGU+YCwgYmVjYXVzZSB0aGVcbiAgICogY29udGVudHMgb2YgdGhlIGZpbGUgYXJlIG5vdCBpbXBvcnRhbnQgaGVyZSwgb25seSB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIGl0XG4gICAqIG5lZWRzIHRvIGJlIGVtaXR0ZWQuIFRoZSBgc3RyaW5nYHMgaGVyZSBhcmUgVFMgZmlsZSBwYXRocy5cbiAgICpcbiAgICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhpcyBhbGdvcml0aG0uXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG4gIHBlbmRpbmdUeXBlQ2hlY2tFbWl0OiBTZXQ8c3RyaW5nPjtcblxuXG4gIC8qKlxuICAgKiBTcGVjaWZpYyBhc3BlY3RzIG9mIHRoZSBsYXN0IGNvbXBpbGF0aW9uIHdoaWNoIHN1Y2Nlc3NmdWxseSBjb21wbGV0ZWQgYW5hbHlzaXMsIGlmIGFueS5cbiAgICovXG4gIGxhc3RHb29kOiB7XG4gICAgLyoqXG4gICAgICogVGhlIGRlcGVuZGVuY3kgZ3JhcGggZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2dpY2FsIGltcGFjdCBvZiBwaHlzaWNhbCBmaWxlIGNoYW5nZXMuXG4gICAgICovXG4gICAgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGg7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaCBmcm9tIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgdXNlZCB0byBwZXJmb3JtIGluLWRlcHRoIGNvbXBhcmlzb24gb2YgQW5ndWxhciBkZWNvcmF0ZWQgY2xhc3NlcywgdG8gZGV0ZXJtaW5lXG4gICAgICogd2hpY2ggZmlsZXMgaGF2ZSB0byBiZSByZS1lbWl0dGVkIGFuZC9vciByZS10eXBlLWNoZWNrZWQuXG4gICAgICovXG4gICAgc2VtYW50aWNEZXBHcmFwaDogU2VtYW50aWNEZXBHcmFwaDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgVHJhaXRDb21waWxlcmAgZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZXh0cmFjdCBcInByaW9yIHdvcmtcIiB3aGljaCBtaWdodCBiZSByZXVzYWJsZSBpbiB0aGlzIGNvbXBpbGF0aW9uLlxuICAgICAqL1xuICAgIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG5cbiAgICAvKipcbiAgICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgd2hpY2ggd2lsbCBiZSBwYXNzZWQgb250byB0aGUgbmV4dCBidWlsZC5cbiAgICAgKi9cbiAgICB0eXBlQ2hlY2tpbmdSZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPnwgbnVsbDtcbiAgfXxudWxsO1xufVxuXG4vKipcbiAqIFN0YXRlIG9mIGEgYnVpbGQgYmVmb3JlIHRoZSBBbmd1bGFyIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcy5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQmVmb3JlIHRoZSBjb21waWxlcidzIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcywgYHBlbmRpbmdFbWl0YCBvbmx5IGNvbnRhaW5zIGZpbGVzIHRoYXQgd2VyZVxuICAgKiBzdGlsbCBwZW5kaW5nIGFmdGVyIHRoZSBwcmV2aW91cyBidWlsZC5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogU2V0IG9mIFR5cGVTY3JpcHQgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFRzUGF0aHM6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgcmVzb3VyY2UgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFJlc291cmNlUGF0aHM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIEluIGEgcGVuZGluZyBzdGF0ZSwgdGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggaXMgYXZhaWxhYmxlIHRvIHRoZSBjb21waWxhdGlvbiB0byByZWdpc3RlclxuICAgKiB0aGUgaW5jcmVtZW50YWwgc3ltYm9scyBpbnRvLlxuICAgKi9cbiAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xufVxuXG5pbnRlcmZhY2UgQW5hbHl6ZWRCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZDtcblxuICAvKipcbiAgICogU2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBrbm93biB0byBuZWVkIGFuIGVtaXQuXG4gICAqXG4gICAqIEFmdGVyIGFuYWx5c2lzIGNvbXBsZXRlcyAodGhhdCBpcywgdGhlIHN0YXRlIHRyYW5zaXRpb25zIHRvIGBBbmFseXplZEJ1aWxkU3RhdGVgKSwgdGhlXG4gICAqIGBwZW5kaW5nRW1pdGAgc2V0IHRha2VzIGludG8gYWNjb3VudCBhbnkgb24tZGlzayBjaGFuZ2VzIG1hZGUgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5XG4gICAqIGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgZnJvbSB0aGUgcHJldmlvdXMgY29tcGlsYXRpb24sIHdoaWNoIGNhbiBiZSByZXVzZWQgaW4gdGhpcyBvbmUuXG4gICAqL1xuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+fG51bGw7XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==