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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVGO0lBS3ZGLDZGQUE0RTtJQUU1RSwyR0FBMEQ7SUFFMUQ7O09BRUc7SUFDSDtRQVFFLDJCQUNJLEtBQXdCLEVBQVcsUUFBNkIsRUFDeEQsY0FBZ0M7WUFETCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtZQUN4RCxtQkFBYyxHQUFkLGNBQWMsQ0FBa0I7WUFDMUMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDckIsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNJLDJCQUFTLEdBQWhCLFVBQ0ksVUFBc0IsRUFBRSxTQUE0QixFQUFFLFVBQXNCLEVBQzVFLHFCQUF1Qzs7WUFDekMsdUVBQXVFO1lBQ3ZFLElBQUksS0FBd0IsQ0FBQztZQUM3QixJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ25ELDhGQUE4RjtnQkFDOUYsY0FBYztnQkFDZCxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCxJQUFJLFVBQVUsR0FBMEIsSUFBSSxDQUFDO2dCQUM3QyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtvQkFDckMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2lCQUN4RDtnQkFFRCx3RkFBd0Y7Z0JBQ3hGLDJCQUEyQjtnQkFDM0IsS0FBSyxHQUFHO29CQUNOLElBQUksRUFBRSxjQUFjLENBQUMsT0FBTztvQkFDNUIsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENB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Q0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDNUYsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQU0sUUFBUSxHQUFHLG9DQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDdEQsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUNELElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO1lBQ2hFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtnQkFDbkIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQTNQRCxJQTJQQztJQTNQWSw4Q0FBaUI7SUErUDlCLElBQUssY0FHSjtJQUhELFdBQUssY0FBYztRQUNqQix5REFBTyxDQUFBO1FBQ1AsMkRBQVEsQ0FBQTtJQUNWLENBQUMsRUFISSxjQUFjLEtBQWQsY0FBYyxRQUdsQjtJQWlIRCxTQUFTLFdBQVcsQ0FBQyxPQUFtQjtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBckIsQ0FBcUIsQ0FBQyxDQUFDO0lBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q2xhc3NSZWNvcmQsIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge0ZpbGVUeXBlQ2hlY2tpbmdEYXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2svc3JjL2NoZWNrZXInO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtTZW1hbnRpY0RlcEdyYXBoLCBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcn0gZnJvbSAnLi4vc2VtYW50aWNfZ3JhcGgnO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cbi8qKlxuICogRHJpdmVzIGFuIGluY3JlbWVudGFsIGJ1aWxkLCBieSB0cmFja2luZyBjaGFuZ2VzIGFuZCBkZXRlcm1pbmluZyB3aGljaCBmaWxlcyBuZWVkIHRvIGJlIGVtaXR0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbERyaXZlciBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPiB7XG4gIC8qKlxuICAgKiBTdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZC5cbiAgICpcbiAgICogVGhpcyB0cmFuc2l0aW9ucyBhcyB0aGUgY29tcGlsYXRpb24gcHJvZ3Jlc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgc3RhdGU6IEJ1aWxkU3RhdGU7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSwgcmVhZG9ubHkgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGgsXG4gICAgICBwcml2YXRlIGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhbiBgSW5jcmVtZW50YWxEcml2ZXJgIHdpdGggYSBzdGFydGluZyBzdGF0ZSB0aGF0IGluY29ycG9yYXRlcyB0aGUgcmVzdWx0cyBvZiBhXG4gICAqIHByZXZpb3VzIGJ1aWxkLlxuICAgKlxuICAgKiBUaGUgcHJldmlvdXMgYnVpbGQncyBgQnVpbGRTdGF0ZWAgaXMgcmVjb25jaWxlZCB3aXRoIHRoZSBuZXcgcHJvZ3JhbSdzIGNoYW5nZXMsIGFuZCB0aGUgcmVzdWx0c1xuICAgKiBhcmUgbWVyZ2VkIGludG8gdGhlIG5ldyBidWlsZCdzIGBQZW5kaW5nQnVpbGRTdGF0ZWAuXG4gICAqL1xuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZCBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lLlxuICAgIGxldCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGU7XG4gICAgaWYgKG9sZERyaXZlci5zdGF0ZS5raW5kID09PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgbmV2ZXIgbWFkZSBpdCBwYXN0IHRoZSBwZW5kaW5nIHN0YXRlLiBSZXVzZSBpdCBhcyB0aGUgc3RhcnRpbmcgc3RhdGUgZm9yXG4gICAgICAvLyB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSBvbGREcml2ZXIuc3RhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBwcmlvckdyYXBoOiBTZW1hbnRpY0RlcEdyYXBofG51bGwgPSBudWxsO1xuICAgICAgaWYgKG9sZERyaXZlci5zdGF0ZS5sYXN0R29vZCAhPT0gbnVsbCkge1xuICAgICAgICBwcmlvckdyYXBoID0gb2xkRHJpdmVyLnN0YXRlLmxhc3RHb29kLnNlbWFudGljRGVwR3JhcGg7XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLiBgcGVuZGluZ0VtaXRgIGlzIHRoZSBvbmx5IHN0YXRlIGNhcnJpZWRcbiAgICAgIC8vIGZvcndhcmQgaW50byB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSB7XG4gICAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ0VtaXQsXG4gICAgICAgIHBlbmRpbmdUeXBlQ2hlY2tFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQsXG4gICAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpLFxuICAgICAgICBjaGFuZ2VkVHNQYXRoczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICAgIGxhc3RHb29kOiBvbGREcml2ZXIuc3RhdGUubGFzdEdvb2QsXG4gICAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBuZXcgU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIocHJpb3JHcmFwaCksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE1lcmdlIHRoZSBmcmVzaGx5IG1vZGlmaWVkIHJlc291cmNlIGZpbGVzIHdpdGggYW55IHByaW9yIG9uZXMuXG4gICAgaWYgKG1vZGlmaWVkUmVzb3VyY2VGaWxlcyAhPT0gbnVsbCkge1xuICAgICAgZm9yIChjb25zdCByZXNGaWxlIG9mIG1vZGlmaWVkUmVzb3VyY2VGaWxlcykge1xuICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocy5hZGQoYWJzb2x1dGVGcm9tKHJlc0ZpbGUpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOZXh0LCBwcm9jZXNzIHRoZSBmaWxlcyBpbiB0aGUgbmV3IHByb2dyYW0sIHdpdGggYSBjb3VwbGUgb2YgZ29hbHM6XG4gICAgLy8gMSkgRGV0ZXJtaW5lIHdoaWNoIFRTIGZpbGVzIGhhdmUgY2hhbmdlZCwgaWYgYW55LCBhbmQgbWVyZ2UgdGhlbSBpbnRvIGBjaGFuZ2VkVHNGaWxlc2AuXG4gICAgLy8gMikgUHJvZHVjZSBhIGxpc3Qgb2YgVFMgZmlsZXMgd2hpY2ggbm8gbG9uZ2VyIGV4aXN0IGluIHRoZSBwcm9ncmFtICh0aGV5J3ZlIGJlZW4gZGVsZXRlZFxuICAgIC8vICAgIHNpbmNlIHRoZSBwcmV2aW91cyBjb21waWxhdGlvbikuIFRoZXNlIG5lZWQgdG8gYmUgcmVtb3ZlZCBmcm9tIHRoZSBzdGF0ZSB0cmFja2luZyB0byBhdm9pZFxuICAgIC8vICAgIGxlYWtpbmcgbWVtb3J5LlxuXG4gICAgLy8gQWxsIGZpbGVzIGluIHRoZSBvbGQgcHJvZ3JhbSwgZm9yIGVhc3kgZGV0ZWN0aW9uIG9mIGNoYW5nZXMuXG4gICAgY29uc3Qgb2xkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSk7XG5cbiAgICAvLyBBc3N1bWUgYWxsIHRoZSBvbGQgZmlsZXMgd2VyZSBkZWxldGVkIHRvIGJlZ2luIHdpdGguIE9ubHkgVFMgZmlsZXMgYXJlIHRyYWNrZWQuXG4gICAgY29uc3QgZGVsZXRlZFRzUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4odHNPbmx5RmlsZXMob2xkUHJvZ3JhbSkubWFwKHNmID0+IHNmLmZpbGVOYW1lKSk7XG5cbiAgICBmb3IgKGNvbnN0IG5ld0ZpbGUgb2YgbmV3UHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKSB7XG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gVGhpcyBmaWxlIGV4aXN0cyBpbiB0aGUgbmV3IHByb2dyYW0sIHNvIHJlbW92ZSBpdCBmcm9tIGBkZWxldGVkVHNQYXRoc2AuXG4gICAgICAgIGRlbGV0ZWRUc1BhdGhzLmRlbGV0ZShuZXdGaWxlLmZpbGVOYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG9sZEZpbGVzLmhhcyhuZXdGaWxlKSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgaGFzbid0IGNoYW5nZWQ7IG5vIG5lZWQgdG8gbG9vayBhdCBpdCBmdXJ0aGVyLlxuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGZpbGUgaGFzIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bCBidWlsZC4gVGhlIGFwcHJvcHJpYXRlIHJlYWN0aW9uIGRlcGVuZHMgb25cbiAgICAgIC8vIHdoYXQga2luZCBvZiBmaWxlIGl0IGlzLlxuICAgICAgaWYgKCFuZXdGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIC8vIEl0J3MgYSAudHMgZmlsZSwgc28gdHJhY2sgaXQgYXMgYSBjaGFuZ2UuXG4gICAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmFkZChuZXdGaWxlLmZpbGVOYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEl0J3MgYSAuZC50cyBmaWxlLiBDdXJyZW50bHkgdGhlIGNvbXBpbGVyIGRvZXMgbm90IGRvIGEgZ3JlYXQgam9iIG9mIHRyYWNraW5nXG4gICAgICAgIC8vIGRlcGVuZGVuY2llcyBvbiAuZC50cyBmaWxlcywgc28gYmFpbCBvdXQgb2YgaW5jcmVtZW50YWwgYnVpbGRzIGhlcmUgYW5kIGRvIGEgZnVsbCBidWlsZC5cbiAgICAgICAgLy8gVGhpcyB1c3VhbGx5IG9ubHkgaGFwcGVucyBpZiBzb21ldGhpbmcgaW4gbm9kZV9tb2R1bGVzIGNoYW5nZXMuXG4gICAgICAgIHJldHVybiBJbmNyZW1lbnRhbERyaXZlci5mcmVzaChuZXdQcm9ncmFtKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgbmV4dCBzdGVwIGlzIHRvIHJlbW92ZSBhbnkgZGVsZXRlZCBmaWxlcyBmcm9tIHRoZSBzdGF0ZS5cbiAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGRlbGV0ZWRUc1BhdGhzKSB7XG4gICAgICBzdGF0ZS5wZW5kaW5nRW1pdC5kZWxldGUoZmlsZVBhdGgpO1xuXG4gICAgICAvLyBFdmVuIGlmIHRoZSBmaWxlIGRvZXNuJ3QgZXhpc3QgaW4gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24sIGl0IHN0aWxsIG1pZ2h0IGhhdmUgYmVlbiBjaGFuZ2VkXG4gICAgICAvLyBpbiBhIHByZXZpb3VzIG9uZSwgc28gZGVsZXRlIGl0IGZyb20gdGhlIHNldCBvZiBjaGFuZ2VkIFRTIGZpbGVzLCBqdXN0IGluIGNhc2UuXG4gICAgICBzdGF0ZS5jaGFuZ2VkVHNQYXRocy5kZWxldGUoZmlsZVBhdGgpO1xuICAgIH1cblxuICAgIC8vIE5vdywgY2hhbmdlZFRzUGF0aHMgY29udGFpbnMgcGh5c2ljYWxseSBjaGFuZ2VkIFRTIHBhdGhzLiBVc2UgdGhlIHByZXZpb3VzIHByb2dyYW0ncyBsb2dpY2FsXG4gICAgLy8gZGVwZW5kZW5jeSBncmFwaCB0byBkZXRlcm1pbmUgbG9naWNhbGx5IGNoYW5nZWQgZmlsZXMuXG4gICAgY29uc3QgZGVwR3JhcGggPSBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpO1xuXG4gICAgLy8gSWYgYSBwcmV2aW91cyBjb21waWxhdGlvbiBleGlzdHMsIHVzZSBpdHMgZGVwZW5kZW5jeSBncmFwaCB0byBkZXRlcm1pbmUgdGhlIHNldCBvZiBsb2dpY2FsbHlcbiAgICAvLyBjaGFuZ2VkIGZpbGVzLlxuICAgIGxldCBsb2dpY2FsQ2hhbmdlczogU2V0PHN0cmluZz58bnVsbCA9IG51bGw7XG4gICAgaWYgKHN0YXRlLmxhc3RHb29kICE9PSBudWxsKSB7XG4gICAgICAvLyBFeHRyYWN0IHRoZSBzZXQgb2YgbG9naWNhbGx5IGNoYW5nZWQgZmlsZXMuIEF0IHRoZSBzYW1lIHRpbWUsIHRoaXMgb3BlcmF0aW9uIHBvcHVsYXRlcyB0aGVcbiAgICAgIC8vIGN1cnJlbnQgKGZyZXNoKSBkZXBlbmRlbmN5IGdyYXBoIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhvc2UgZmlsZXMgd2hpY2ggaGF2ZSBub3RcbiAgICAgIC8vIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgbG9naWNhbENoYW5nZXMgPSBkZXBHcmFwaC51cGRhdGVXaXRoUGh5c2ljYWxDaGFuZ2VzKFxuICAgICAgICAgIHN0YXRlLmxhc3RHb29kLmRlcEdyYXBoLCBzdGF0ZS5jaGFuZ2VkVHNQYXRocywgZGVsZXRlZFRzUGF0aHMsXG4gICAgICAgICAgc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMpO1xuICAgICAgZm9yIChjb25zdCBmaWxlTmFtZSBvZiBzdGF0ZS5jaGFuZ2VkVHNQYXRocykge1xuICAgICAgICBsb2dpY2FsQ2hhbmdlcy5hZGQoZmlsZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICAvLyBBbnkgbG9naWNhbGx5IGNoYW5nZWQgZmlsZXMgbmVlZCB0byBiZSByZS1lbWl0dGVkLiBNb3N0IG9mIHRoZSB0aW1lIHRoaXMgd291bGQgaGFwcGVuXG4gICAgICAvLyByZWdhcmRsZXNzIGJlY2F1c2UgdGhlIG5ldyBkZXBlbmRlbmN5IGdyYXBoIHdvdWxkIF9hbHNvXyBpZGVudGlmeSB0aGUgZmlsZSBhcyBzdGFsZS5cbiAgICAgIC8vIEhvd2V2ZXIgdGhlcmUgYXJlIGVkZ2UgY2FzZXMgc3VjaCBhcyByZW1vdmluZyBhIGNvbXBvbmVudCBmcm9tIGFuIE5nTW9kdWxlIHdpdGhvdXQgYWRkaW5nXG4gICAgICAvLyBpdCB0byBhbm90aGVyIG9uZSwgd2hlcmUgdGhlIHByZXZpb3VzIGdyYXBoIGlkZW50aWZpZXMgdGhlIGZpbGUgYXMgbG9naWNhbGx5IGNoYW5nZWQsIGJ1dFxuICAgICAgLy8gdGhlIG5ldyBncmFwaCAod2hpY2ggZG9lcyBub3QgaGF2ZSB0aGF0IGVkZ2UpIGZhaWxzIHRvIGlkZW50aWZ5IHRoYXQgdGhlIGZpbGUgc2hvdWxkIGJlXG4gICAgICAvLyByZS1lbWl0dGVkLlxuICAgICAgZm9yIChjb25zdCBjaGFuZ2Ugb2YgbG9naWNhbENoYW5nZXMpIHtcbiAgICAgICAgc3RhdGUucGVuZGluZ0VtaXQuYWRkKGNoYW5nZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYHN0YXRlYCBub3cgcmVmbGVjdHMgdGhlIGluaXRpYWwgcGVuZGluZyBzdGF0ZSBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cblxuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxEcml2ZXIoc3RhdGUsIGRlcEdyYXBoLCBsb2dpY2FsQ2hhbmdlcyk7XG4gIH1cblxuICBzdGF0aWMgZnJlc2gocHJvZ3JhbTogdHMuUHJvZ3JhbSk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzZXQgb2YgZmlsZXMgd2hpY2ggbmVlZCB0byBiZSBlbWl0dGVkIHRvIHRoZSBzZXQgb2YgYWxsIFRTIGZpbGVzIGluIHRoZVxuICAgIC8vIHByb2dyYW0uXG4gICAgY29uc3QgdHNGaWxlcyA9IHRzT25seUZpbGVzKHByb2dyYW0pO1xuXG4gICAgY29uc3Qgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlID0ge1xuICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuUGVuZGluZyxcbiAgICAgIHBlbmRpbmdFbWl0OiBuZXcgU2V0PHN0cmluZz4odHNGaWxlcy5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKSxcbiAgICAgIHBlbmRpbmdUeXBlQ2hlY2tFbWl0OiBuZXcgU2V0PHN0cmluZz4odHNGaWxlcy5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKSxcbiAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpLFxuICAgICAgY2hhbmdlZFRzUGF0aHM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgbGFzdEdvb2Q6IG51bGwsXG4gICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogbmV3IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKC8qIHByaW9yR3JhcGggKi8gbnVsbCksXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxEcml2ZXIoc3RhdGUsIG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCksIC8qIGxvZ2ljYWxDaGFuZ2VzICovIG51bGwpO1xuICB9XG5cbiAgZ2V0U2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIoKTogU2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIge1xuICAgIGlmICh0aGlzLnN0YXRlLmtpbmQgIT09IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignU2VtYW50aWMgZGVwZW5kZW5jeSB1cGRhdGVyIGlzIG9ubHkgYXZhaWxhYmxlIHdoZW4gcGVuZGluZyBhbmFseXNpcycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjtcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyh0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgLy8gQ2hhbmdlcyBoYXZlIGFscmVhZHkgYmVlbiBpbmNvcnBvcmF0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qge25lZWRzRW1pdCwgbmVlZHNUeXBlQ2hlY2tFbWl0LCBuZXdHcmFwaH0gPSB0aGlzLnN0YXRlLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyLmZpbmFsaXplKCk7XG5cbiAgICBjb25zdCBwZW5kaW5nRW1pdCA9IHRoaXMuc3RhdGUucGVuZGluZ0VtaXQ7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIG5lZWRzRW1pdCkge1xuICAgICAgcGVuZGluZ0VtaXQuYWRkKHBhdGgpO1xuICAgIH1cblxuICAgIGNvbnN0IHBlbmRpbmdUeXBlQ2hlY2tFbWl0ID0gdGhpcy5zdGF0ZS5wZW5kaW5nVHlwZUNoZWNrRW1pdDtcbiAgICBmb3IgKGNvbnN0IHBhdGggb2YgbmVlZHNUeXBlQ2hlY2tFbWl0KSB7XG4gICAgICBwZW5kaW5nVHlwZUNoZWNrRW1pdC5hZGQocGF0aCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRoZSBzdGF0ZSB0byBhbiBgQW5hbHl6ZWRCdWlsZFN0YXRlYC5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAga2luZDogQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQsXG4gICAgICBwZW5kaW5nRW1pdCxcbiAgICAgIHBlbmRpbmdUeXBlQ2hlY2tFbWl0LFxuXG4gICAgICAvLyBTaW5jZSB0aGlzIGNvbXBpbGF0aW9uIHdhcyBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQsIHVwZGF0ZSB0aGUgXCJsYXN0IGdvb2RcIiBhcnRpZmFjdHMgdG8gdGhlXG4gICAgICAvLyBvbmVzIGZyb20gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAgICBsYXN0R29vZDoge1xuICAgICAgICBkZXBHcmFwaDogdGhpcy5kZXBHcmFwaCxcbiAgICAgICAgc2VtYW50aWNEZXBHcmFwaDogbmV3R3JhcGgsXG4gICAgICAgIHRyYWl0Q29tcGlsZXI6IHRyYWl0Q29tcGlsZXIsXG4gICAgICAgIHR5cGVDaGVja2luZ1Jlc3VsdHM6IG51bGwsXG4gICAgICB9LFxuXG4gICAgICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHM6XG4gICAgICAgICAgdGhpcy5zdGF0ZS5sYXN0R29vZCAhPT0gbnVsbCA/IHRoaXMuc3RhdGUubGFzdEdvb2QudHlwZUNoZWNraW5nUmVzdWx0cyA6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxUeXBlQ2hlY2socmVzdWx0czogTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT4pOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5sYXN0R29vZCA9PT0gbnVsbCB8fCB0aGlzLnN0YXRlLmtpbmQgIT09IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc3RhdGUubGFzdEdvb2QudHlwZUNoZWNraW5nUmVzdWx0cyA9IHJlc3VsdHM7XG5cbiAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIHJlc3VsdHMua2V5cygpKSB7XG4gICAgICB0aGlzLnN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0LmRlbGV0ZShmaWxlTmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bEVtaXQoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHtcbiAgICB0aGlzLnN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShzZi5maWxlTmFtZSk7XG4gIH1cblxuICBzYWZlVG9Ta2lwRW1pdChzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdC5oYXMoc2YuZmlsZU5hbWUpO1xuICB9XG5cbiAgcHJpb3JXb3JrRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogQ2xhc3NSZWNvcmRbXXxudWxsIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5sYXN0R29vZCA9PT0gbnVsbCB8fCB0aGlzLmxvZ2ljYWxDaGFuZ2VzID09PSBudWxsKSB7XG4gICAgICAvLyBUaGVyZSBpcyBubyBwcmV2aW91cyBnb29kIGJ1aWxkLCBzbyBubyBwcmlvciB3b3JrIGV4aXN0cy5cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSBpZiAodGhpcy5sb2dpY2FsQ2hhbmdlcy5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICAvLyBQcmlvciB3b3JrIG1pZ2h0IGV4aXN0LCBidXQgd291bGQgYmUgc3RhbGUgYXMgdGhlIGZpbGUgaW4gcXVlc3Rpb24gaGFzIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFByaW9yIHdvcmsgbWlnaHQgZXhpc3QsIGFuZCBpZiBpdCBkb2VzIHRoZW4gaXQncyB1c2FibGUhXG4gICAgICByZXR1cm4gdGhpcy5zdGF0ZS5sYXN0R29vZC50cmFpdENvbXBpbGVyLnJlY29yZHNGb3Ioc2YpO1xuICAgIH1cbiAgfVxuXG4gIHByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZjogdHMuU291cmNlRmlsZSk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhfG51bGwge1xuICAgIGlmICh0aGlzLnN0YXRlLmtpbmQgIT09IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkIHx8XG4gICAgICAgIHRoaXMuc3RhdGUucHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzID09PSBudWxsIHx8IHRoaXMubG9naWNhbENoYW5nZXMgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ2ljYWxDaGFuZ2VzLmhhcyhzZi5maWxlTmFtZSkgfHwgdGhpcy5zdGF0ZS5wZW5kaW5nVHlwZUNoZWNrRW1pdC5oYXMoc2YuZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlTmFtZSA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuICAgIGlmICghdGhpcy5zdGF0ZS5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHMuaGFzKGZpbGVOYW1lKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGRhdGEgPSB0aGlzLnN0YXRlLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0cy5nZXQoZmlsZU5hbWUpITtcbiAgICBpZiAoZGF0YS5oYXNJbmxpbmVzKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxufVxuXG50eXBlIEJ1aWxkU3RhdGUgPSBQZW5kaW5nQnVpbGRTdGF0ZXxBbmFseXplZEJ1aWxkU3RhdGU7XG5cbmVudW0gQnVpbGRTdGF0ZUtpbmQge1xuICBQZW5kaW5nLFxuICBBbmFseXplZCxcbn1cblxuaW50ZXJmYWNlIEJhc2VCdWlsZFN0YXRlIHtcbiAga2luZDogQnVpbGRTdGF0ZUtpbmQ7XG5cbiAgLyoqXG4gICAqIFRoZSBoZWFydCBvZiBpbmNyZW1lbnRhbCBidWlsZHMuIFRoaXMgYFNldGAgdHJhY2tzIHRoZSBzZXQgb2YgZmlsZXMgd2hpY2ggbmVlZCB0byBiZSBlbWl0dGVkXG4gICAqIGR1cmluZyB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cbiAgICpcbiAgICogVGhpcyBzdGFydHMgb3V0IGFzIHRoZSBzZXQgb2YgZmlsZXMgd2hpY2ggYXJlIHN0aWxsIHBlbmRpbmcgZnJvbSB0aGUgcHJldmlvdXMgcHJvZ3JhbSAob3IgdGhlXG4gICAqIGZ1bGwgc2V0IG9mIC50cyBmaWxlcyBvbiBhIGZyZXNoIGJ1aWxkKS5cbiAgICpcbiAgICogQWZ0ZXIgYW5hbHlzaXMsIGl0J3MgdXBkYXRlZCB0byBpbmNsdWRlIGFueSBmaWxlcyB3aGljaCBtaWdodCBoYXZlIGNoYW5nZWQgYW5kIG5lZWQgYSByZS1lbWl0XG4gICAqIGFzIGEgcmVzdWx0IG9mIGluY3JlbWVudGFsIGNoYW5nZXMuXG4gICAqXG4gICAqIElmIGFuIGVtaXQgaGFwcGVucywgYW55IHdyaXR0ZW4gZmlsZXMgYXJlIHJlbW92ZWQgZnJvbSB0aGUgYFNldGAsIGFzIHRoZXkncmUgbm8gbG9uZ2VyXG4gICAqIHBlbmRpbmcuXG4gICAqXG4gICAqIFRodXMsIGFmdGVyIGNvbXBpbGF0aW9uIGBwZW5kaW5nRW1pdGAgc2hvdWxkIGJlIGVtcHR5IChvbiBhIHN1Y2Nlc3NmdWwgYnVpbGQpIG9yIGNvbnRhaW4gdGhlXG4gICAqIGZpbGVzIHdoaWNoIHN0aWxsIG5lZWQgdG8gYmUgZW1pdHRlZCBidXQgaGF2ZSBub3QgeWV0IGJlZW4gKGR1ZSB0byBlcnJvcnMpLlxuICAgKlxuICAgKiBgcGVuZGluZ0VtaXRgIGlzIHRyYWNrZWQgYXMgYXMgYFNldDxzdHJpbmc+YCBpbnN0ZWFkIG9mIGEgYFNldDx0cy5Tb3VyY2VGaWxlPmAsIGJlY2F1c2UgdGhlXG4gICAqIGNvbnRlbnRzIG9mIHRoZSBmaWxlIGFyZSBub3QgaW1wb3J0YW50IGhlcmUsIG9ubHkgd2hldGhlciBvciBub3QgdGhlIGN1cnJlbnQgdmVyc2lvbiBvZiBpdFxuICAgKiBuZWVkcyB0byBiZSBlbWl0dGVkLiBUaGUgYHN0cmluZ2BzIGhlcmUgYXJlIFRTIGZpbGUgcGF0aHMuXG4gICAqXG4gICAqIFNlZSB0aGUgUkVBRE1FLm1kIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIHRoaXMgYWxnb3JpdGhtLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuICBwZW5kaW5nVHlwZUNoZWNrRW1pdDogU2V0PHN0cmluZz47XG5cblxuICAvKipcbiAgICogU3BlY2lmaWMgYXNwZWN0cyBvZiB0aGUgbGFzdCBjb21waWxhdGlvbiB3aGljaCBzdWNjZXNzZnVsbHkgY29tcGxldGVkIGFuYWx5c2lzLCBpZiBhbnkuXG4gICAqL1xuICBsYXN0R29vZDoge1xuICAgIC8qKlxuICAgICAqIFRoZSBkZXBlbmRlbmN5IGdyYXBoIGZyb20gdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgICAqXG4gICAgICogVGhpcyBpcyB1c2VkIHRvIGRldGVybWluZSB0aGUgbG9naWNhbCBpbXBhY3Qgb2YgcGh5c2ljYWwgZmlsZSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGRlcEdyYXBoOiBGaWxlRGVwZW5kZW5jeUdyYXBoO1xuXG4gICAgLyoqXG4gICAgICogVGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gcGVyZm9ybSBpbi1kZXB0aCBjb21wYXJpc29uIG9mIEFuZ3VsYXIgZGVjb3JhdGVkIGNsYXNzZXMsIHRvIGRldGVybWluZVxuICAgICAqIHdoaWNoIGZpbGVzIGhhdmUgdG8gYmUgcmUtZW1pdHRlZCBhbmQvb3IgcmUtdHlwZS1jaGVja2VkLlxuICAgICAqL1xuICAgIHNlbWFudGljRGVwR3JhcGg6IFNlbWFudGljRGVwR3JhcGg7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYFRyYWl0Q29tcGlsZXJgIGZyb20gdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgICAqXG4gICAgICogVGhpcyBpcyB1c2VkIHRvIGV4dHJhY3QgXCJwcmlvciB3b3JrXCIgd2hpY2ggbWlnaHQgYmUgcmV1c2FibGUgaW4gdGhpcyBjb21waWxhdGlvbi5cbiAgICAgKi9cbiAgICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuXG4gICAgLyoqXG4gICAgICogVHlwZSBjaGVja2luZyByZXN1bHRzIHdoaWNoIHdpbGwgYmUgcGFzc2VkIG9udG8gdGhlIG5leHQgYnVpbGQuXG4gICAgICovXG4gICAgdHlwZUNoZWNraW5nUmVzdWx0czogTWFwPEFic29sdXRlRnNQYXRoLCBGaWxlVHlwZUNoZWNraW5nRGF0YT58IG51bGw7XG4gIH18bnVsbDtcbn1cblxuLyoqXG4gKiBTdGF0ZSBvZiBhIGJ1aWxkIGJlZm9yZSB0aGUgQW5ndWxhciBhbmFseXNpcyBwaGFzZSBjb21wbGV0ZXMuXG4gKi9cbmludGVyZmFjZSBQZW5kaW5nQnVpbGRTdGF0ZSBleHRlbmRzIEJhc2VCdWlsZFN0YXRlIHtcbiAga2luZDogQnVpbGRTdGF0ZUtpbmQuUGVuZGluZztcblxuICAvKipcbiAgICogU2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBrbm93biB0byBuZWVkIGFuIGVtaXQuXG4gICAqXG4gICAqIEJlZm9yZSB0aGUgY29tcGlsZXIncyBhbmFseXNpcyBwaGFzZSBjb21wbGV0ZXMsIGBwZW5kaW5nRW1pdGAgb25seSBjb250YWlucyBmaWxlcyB0aGF0IHdlcmVcbiAgICogc3RpbGwgcGVuZGluZyBhZnRlciB0aGUgcHJldmlvdXMgYnVpbGQuXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG5cbiAgLyoqXG4gICAqIFNldCBvZiBUeXBlU2NyaXB0IGZpbGUgcGF0aHMgd2hpY2ggaGF2ZSBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICovXG4gIGNoYW5nZWRUc1BhdGhzOiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogU2V0IG9mIHJlc291cmNlIGZpbGUgcGF0aHMgd2hpY2ggaGF2ZSBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICovXG4gIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xuXG4gIC8qKlxuICAgKiBJbiBhIHBlbmRpbmcgc3RhdGUsIHRoZSBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoIGlzIGF2YWlsYWJsZSB0byB0aGUgY29tcGlsYXRpb24gdG8gcmVnaXN0ZXJcbiAgICogdGhlIGluY3JlbWVudGFsIHN5bWJvbHMgaW50by5cbiAgICovXG4gIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjtcbn1cblxuaW50ZXJmYWNlIEFuYWx5emVkQnVpbGRTdGF0ZSBleHRlbmRzIEJhc2VCdWlsZFN0YXRlIHtcbiAga2luZDogQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQ7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBmaWxlcyB3aGljaCBhcmUga25vd24gdG8gbmVlZCBhbiBlbWl0LlxuICAgKlxuICAgKiBBZnRlciBhbmFseXNpcyBjb21wbGV0ZXMgKHRoYXQgaXMsIHRoZSBzdGF0ZSB0cmFuc2l0aW9ucyB0byBgQW5hbHl6ZWRCdWlsZFN0YXRlYCksIHRoZVxuICAgKiBgcGVuZGluZ0VtaXRgIHNldCB0YWtlcyBpbnRvIGFjY291bnQgYW55IG9uLWRpc2sgY2hhbmdlcyBtYWRlIHNpbmNlIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseVxuICAgKiBhbmFseXplZCBidWlsZC5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogVHlwZSBjaGVja2luZyByZXN1bHRzIGZyb20gdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uLCB3aGljaCBjYW4gYmUgcmV1c2VkIGluIHRoaXMgb25lLlxuICAgKi9cbiAgcHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPnxudWxsO1xufVxuXG5mdW5jdGlvbiB0c09ubHlGaWxlcyhwcm9ncmFtOiB0cy5Qcm9ncmFtKTogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPiB7XG4gIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZmlsdGVyKHNmID0+ICFzZi5pc0RlY2xhcmF0aW9uRmlsZSk7XG59XG4iXX0=