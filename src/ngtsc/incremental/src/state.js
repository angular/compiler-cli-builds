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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/state", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IncrementalDriver = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
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
        IncrementalDriver.reconcile = function (oldProgram, oldDriver, newProgram, modifiedResourceFiles, perf) {
            return perf.inPhase(perf_1.PerfPhase.Reconciliation, function () {
                var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
                // Initialize the state of the current build based on the previous one.
                var state;
                if (oldDriver.state.kind === BuildStateKind.Pending) {
                    // The previous build never made it past the pending state. Reuse it as the starting state
                    // for this build.
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
                //    since the previous compilation). These need to be removed from the state tracking to
                //    avoid leaking memory.
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
                            // dependencies on .d.ts files, so bail out of incremental builds here and do a full
                            // build. This usually only happens if something in node_modules changes.
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
                        // Even if the file doesn't exist in the current compilation, it still might have been
                        // changed in a previous one, so delete it from the set of changed TS files, just in case.
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
                perf.eventCount(perf_1.PerfEvent.SourceFilePhysicalChange, state.changedTsPaths.size);
                // Now, changedTsPaths contains physically changed TS paths. Use the previous program's
                // logical dependency graph to determine logically changed files.
                var depGraph = new dependency_tracking_1.FileDependencyGraph();
                // If a previous compilation exists, use its dependency graph to determine the set of
                // logically changed files.
                var logicalChanges = null;
                if (state.lastGood !== null) {
                    // Extract the set of logically changed files. At the same time, this operation populates
                    // the current (fresh) dependency graph with information about those files which have not
                    // logically changed.
                    logicalChanges = depGraph.updateWithPhysicalChanges(state.lastGood.depGraph, state.changedTsPaths, deletedTsPaths, state.changedResourcePaths);
                    perf.eventCount(perf_1.PerfEvent.SourceFileLogicalChange, logicalChanges.size);
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
            });
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
                // Delete the files for which type-check code was generated from the set of pending type-check
                // files.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQXVGO0lBQ3ZGLDZEQUE4RDtJQUs5RCw2RkFBNEU7SUFFNUUsMkdBQTBEO0lBRTFEOztPQUVHO0lBQ0g7UUFRRSwyQkFDSSxLQUF3QixFQUFXLFFBQTZCLEVBQ3hELGNBQWdDO1lBREwsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7WUFDeEQsbUJBQWMsR0FBZCxjQUFjLENBQWtCO1lBQzFDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLENBQUM7UUFFRDs7Ozs7O1dBTUc7UUFDSSwyQkFBUyxHQUFoQixVQUNJLFVBQXNCLEVBQUUsU0FBNEIsRUFBRSxVQUFzQixFQUM1RSxxQkFBdUMsRUFBRSxJQUFrQjtZQUM3RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQVMsQ0FBQyxjQUFjLEVBQUU7O2dCQUM1Qyx1RUFBdUU7Z0JBQ3ZFLElBQUksS0FBd0IsQ0FBQztnQkFDN0IsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsT0FBTyxFQUFFO29CQUNuRCwwRkFBMEY7b0JBQzFGLGtCQUFrQjtvQkFDbEIsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7aUJBQ3pCO3FCQUFNO29CQUNMLElBQUksVUFBVSxHQUEwQixJQUFJLENBQUM7b0JBQzdDLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFO3dCQUNyQyxVQUFVLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUM7cUJBQ3hEO29CQUVELHdGQUF3RjtvQkFDeEYsMkJBQTJC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QUhJLGNBQWMsS0FBZCxjQUFjLFFBR2xCO0lBdUhELFNBQVMsV0FBVyxDQUFDLE9BQW1CO1FBQ3RDLE9BQU8sT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFyQixDQUFxQixDQUFDLENBQUM7SUFDdEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIEFic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1BlcmZFdmVudCwgUGVyZlBoYXNlLCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7Q2xhc3NSZWNvcmQsIFRyYWl0Q29tcGlsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge0ZpbGVUeXBlQ2hlY2tpbmdEYXRhfSBmcm9tICcuLi8uLi90eXBlY2hlY2svc3JjL2NoZWNrZXInO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi9hcGknO1xuaW1wb3J0IHtTZW1hbnRpY0RlcEdyYXBoLCBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcn0gZnJvbSAnLi4vc2VtYW50aWNfZ3JhcGgnO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cbi8qKlxuICogRHJpdmVzIGFuIGluY3JlbWVudGFsIGJ1aWxkLCBieSB0cmFja2luZyBjaGFuZ2VzIGFuZCBkZXRlcm1pbmluZyB3aGljaCBmaWxlcyBuZWVkIHRvIGJlIGVtaXR0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbERyaXZlciBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPiB7XG4gIC8qKlxuICAgKiBTdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZC5cbiAgICpcbiAgICogVGhpcyB0cmFuc2l0aW9ucyBhcyB0aGUgY29tcGlsYXRpb24gcHJvZ3Jlc3Nlcy5cbiAgICovXG4gIHByaXZhdGUgc3RhdGU6IEJ1aWxkU3RhdGU7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSwgcmVhZG9ubHkgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGgsXG4gICAgICBwcml2YXRlIGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhbiBgSW5jcmVtZW50YWxEcml2ZXJgIHdpdGggYSBzdGFydGluZyBzdGF0ZSB0aGF0IGluY29ycG9yYXRlcyB0aGUgcmVzdWx0cyBvZiBhXG4gICAqIHByZXZpb3VzIGJ1aWxkLlxuICAgKlxuICAgKiBUaGUgcHJldmlvdXMgYnVpbGQncyBgQnVpbGRTdGF0ZWAgaXMgcmVjb25jaWxlZCB3aXRoIHRoZSBuZXcgcHJvZ3JhbSdzIGNoYW5nZXMsIGFuZCB0aGUgcmVzdWx0c1xuICAgKiBhcmUgbWVyZ2VkIGludG8gdGhlIG5ldyBidWlsZCdzIGBQZW5kaW5nQnVpbGRTdGF0ZWAuXG4gICAqL1xuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCwgcGVyZjogUGVyZlJlY29yZGVyKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIHJldHVybiBwZXJmLmluUGhhc2UoUGVyZlBoYXNlLlJlY29uY2lsaWF0aW9uLCAoKSA9PiB7XG4gICAgICAvLyBJbml0aWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZCBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lLlxuICAgICAgbGV0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZTtcbiAgICAgIGlmIChvbGREcml2ZXIuc3RhdGUua2luZCA9PT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgbmV2ZXIgbWFkZSBpdCBwYXN0IHRoZSBwZW5kaW5nIHN0YXRlLiBSZXVzZSBpdCBhcyB0aGUgc3RhcnRpbmcgc3RhdGVcbiAgICAgICAgLy8gZm9yIHRoaXMgYnVpbGQuXG4gICAgICAgIHN0YXRlID0gb2xkRHJpdmVyLnN0YXRlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IHByaW9yR3JhcGg6IFNlbWFudGljRGVwR3JhcGh8bnVsbCA9IG51bGw7XG4gICAgICAgIGlmIChvbGREcml2ZXIuc3RhdGUubGFzdEdvb2QgIT09IG51bGwpIHtcbiAgICAgICAgICBwcmlvckdyYXBoID0gb2xkRHJpdmVyLnN0YXRlLmxhc3RHb29kLnNlbWFudGljRGVwR3JhcGg7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgd2FzIHN1Y2Nlc3NmdWxseSBhbmFseXplZC4gYHBlbmRpbmdFbWl0YCBpcyB0aGUgb25seSBzdGF0ZSBjYXJyaWVkXG4gICAgICAgIC8vIGZvcndhcmQgaW50byB0aGlzIGJ1aWxkLlxuICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nLFxuICAgICAgICAgIHBlbmRpbmdFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ0VtaXQsXG4gICAgICAgICAgcGVuZGluZ1R5cGVDaGVja0VtaXQ6IG9sZERyaXZlci5zdGF0ZS5wZW5kaW5nVHlwZUNoZWNrRW1pdCxcbiAgICAgICAgICBjaGFuZ2VkUmVzb3VyY2VQYXRoczogbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKSxcbiAgICAgICAgICBjaGFuZ2VkVHNQYXRoczogbmV3IFNldDxzdHJpbmc+KCksXG4gICAgICAgICAgbGFzdEdvb2Q6IG9sZERyaXZlci5zdGF0ZS5sYXN0R29vZCxcbiAgICAgICAgICBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjogbmV3IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKHByaW9yR3JhcGgpLFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBNZXJnZSB0aGUgZnJlc2hseSBtb2RpZmllZCByZXNvdXJjZSBmaWxlcyB3aXRoIGFueSBwcmlvciBvbmVzLlxuICAgICAgaWYgKG1vZGlmaWVkUmVzb3VyY2VGaWxlcyAhPT0gbnVsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IHJlc0ZpbGUgb2YgbW9kaWZpZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMuYWRkKGFic29sdXRlRnJvbShyZXNGaWxlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTmV4dCwgcHJvY2VzcyB0aGUgZmlsZXMgaW4gdGhlIG5ldyBwcm9ncmFtLCB3aXRoIGEgY291cGxlIG9mIGdvYWxzOlxuICAgICAgLy8gMSkgRGV0ZXJtaW5lIHdoaWNoIFRTIGZpbGVzIGhhdmUgY2hhbmdlZCwgaWYgYW55LCBhbmQgbWVyZ2UgdGhlbSBpbnRvIGBjaGFuZ2VkVHNGaWxlc2AuXG4gICAgICAvLyAyKSBQcm9kdWNlIGEgbGlzdCBvZiBUUyBmaWxlcyB3aGljaCBubyBsb25nZXIgZXhpc3QgaW4gdGhlIHByb2dyYW0gKHRoZXkndmUgYmVlbiBkZWxldGVkXG4gICAgICAvLyAgICBzaW5jZSB0aGUgcHJldmlvdXMgY29tcGlsYXRpb24pLiBUaGVzZSBuZWVkIHRvIGJlIHJlbW92ZWQgZnJvbSB0aGUgc3RhdGUgdHJhY2tpbmcgdG9cbiAgICAgIC8vICAgIGF2b2lkIGxlYWtpbmcgbWVtb3J5LlxuXG4gICAgICAvLyBBbGwgZmlsZXMgaW4gdGhlIG9sZCBwcm9ncmFtLCBmb3IgZWFzeSBkZXRlY3Rpb24gb2YgY2hhbmdlcy5cbiAgICAgIGNvbnN0IG9sZEZpbGVzID0gbmV3IFNldDx0cy5Tb3VyY2VGaWxlPihvbGRQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpO1xuXG4gICAgICAvLyBBc3N1bWUgYWxsIHRoZSBvbGQgZmlsZXMgd2VyZSBkZWxldGVkIHRvIGJlZ2luIHdpdGguIE9ubHkgVFMgZmlsZXMgYXJlIHRyYWNrZWQuXG4gICAgICBjb25zdCBkZWxldGVkVHNQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPih0c09ubHlGaWxlcyhvbGRQcm9ncmFtKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKTtcblxuICAgICAgZm9yIChjb25zdCBuZXdGaWxlIG9mIG5ld1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICAvLyBUaGlzIGZpbGUgZXhpc3RzIGluIHRoZSBuZXcgcHJvZ3JhbSwgc28gcmVtb3ZlIGl0IGZyb20gYGRlbGV0ZWRUc1BhdGhzYC5cbiAgICAgICAgICBkZWxldGVkVHNQYXRocy5kZWxldGUobmV3RmlsZS5maWxlTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgICAgLy8gVGhpcyBmaWxlIGhhc24ndCBjaGFuZ2VkOyBubyBuZWVkIHRvIGxvb2sgYXQgaXQgZnVydGhlci5cbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBmaWxlIGhhcyBjaGFuZ2VkIHNpbmNlIHRoZSBsYXN0IHN1Y2Nlc3NmdWwgYnVpbGQuIFRoZSBhcHByb3ByaWF0ZSByZWFjdGlvbiBkZXBlbmRzIG9uXG4gICAgICAgIC8vIHdoYXQga2luZCBvZiBmaWxlIGl0IGlzLlxuICAgICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICAvLyBJdCdzIGEgLnRzIGZpbGUsIHNvIHRyYWNrIGl0IGFzIGEgY2hhbmdlLlxuICAgICAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmFkZChuZXdGaWxlLmZpbGVOYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBJdCdzIGEgLmQudHMgZmlsZS4gQ3VycmVudGx5IHRoZSBjb21waWxlciBkb2VzIG5vdCBkbyBhIGdyZWF0IGpvYiBvZiB0cmFja2luZ1xuICAgICAgICAgIC8vIGRlcGVuZGVuY2llcyBvbiAuZC50cyBmaWxlcywgc28gYmFpbCBvdXQgb2YgaW5jcmVtZW50YWwgYnVpbGRzIGhlcmUgYW5kIGRvIGEgZnVsbFxuICAgICAgICAgIC8vIGJ1aWxkLiBUaGlzIHVzdWFsbHkgb25seSBoYXBwZW5zIGlmIHNvbWV0aGluZyBpbiBub2RlX21vZHVsZXMgY2hhbmdlcy5cbiAgICAgICAgICByZXR1cm4gSW5jcmVtZW50YWxEcml2ZXIuZnJlc2gobmV3UHJvZ3JhbSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVGhlIG5leHQgc3RlcCBpcyB0byByZW1vdmUgYW55IGRlbGV0ZWQgZmlsZXMgZnJvbSB0aGUgc3RhdGUuXG4gICAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGRlbGV0ZWRUc1BhdGhzKSB7XG4gICAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgICAgIHN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG5cbiAgICAgICAgLy8gRXZlbiBpZiB0aGUgZmlsZSBkb2Vzbid0IGV4aXN0IGluIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLCBpdCBzdGlsbCBtaWdodCBoYXZlIGJlZW5cbiAgICAgICAgLy8gY2hhbmdlZCBpbiBhIHByZXZpb3VzIG9uZSwgc28gZGVsZXRlIGl0IGZyb20gdGhlIHNldCBvZiBjaGFuZ2VkIFRTIGZpbGVzLCBqdXN0IGluIGNhc2UuXG4gICAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIHBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuU291cmNlRmlsZVBoeXNpY2FsQ2hhbmdlLCBzdGF0ZS5jaGFuZ2VkVHNQYXRocy5zaXplKTtcblxuICAgICAgLy8gTm93LCBjaGFuZ2VkVHNQYXRocyBjb250YWlucyBwaHlzaWNhbGx5IGNoYW5nZWQgVFMgcGF0aHMuIFVzZSB0aGUgcHJldmlvdXMgcHJvZ3JhbSdzXG4gICAgICAvLyBsb2dpY2FsIGRlcGVuZGVuY3kgZ3JhcGggdG8gZGV0ZXJtaW5lIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzLlxuICAgICAgY29uc3QgZGVwR3JhcGggPSBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpO1xuXG4gICAgICAvLyBJZiBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGV4aXN0cywgdXNlIGl0cyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSB0aGUgc2V0IG9mXG4gICAgICAvLyBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy5cbiAgICAgIGxldCBsb2dpY2FsQ2hhbmdlczogU2V0PHN0cmluZz58bnVsbCA9IG51bGw7XG4gICAgICBpZiAoc3RhdGUubGFzdEdvb2QgIT09IG51bGwpIHtcbiAgICAgICAgLy8gRXh0cmFjdCB0aGUgc2V0IG9mIGxvZ2ljYWxseSBjaGFuZ2VkIGZpbGVzLiBBdCB0aGUgc2FtZSB0aW1lLCB0aGlzIG9wZXJhdGlvbiBwb3B1bGF0ZXNcbiAgICAgICAgLy8gdGhlIGN1cnJlbnQgKGZyZXNoKSBkZXBlbmRlbmN5IGdyYXBoIHdpdGggaW5mb3JtYXRpb24gYWJvdXQgdGhvc2UgZmlsZXMgd2hpY2ggaGF2ZSBub3RcbiAgICAgICAgLy8gbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICAgIGxvZ2ljYWxDaGFuZ2VzID0gZGVwR3JhcGgudXBkYXRlV2l0aFBoeXNpY2FsQ2hhbmdlcyhcbiAgICAgICAgICAgIHN0YXRlLmxhc3RHb29kLmRlcEdyYXBoLCBzdGF0ZS5jaGFuZ2VkVHNQYXRocywgZGVsZXRlZFRzUGF0aHMsXG4gICAgICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocyk7XG4gICAgICAgIHBlcmYuZXZlbnRDb3VudChQZXJmRXZlbnQuU291cmNlRmlsZUxvZ2ljYWxDaGFuZ2UsIGxvZ2ljYWxDaGFuZ2VzLnNpemUpO1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIHN0YXRlLmNoYW5nZWRUc1BhdGhzKSB7XG4gICAgICAgICAgbG9naWNhbENoYW5nZXMuYWRkKGZpbGVOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFueSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcyBuZWVkIHRvIGJlIHJlLWVtaXR0ZWQuIE1vc3Qgb2YgdGhlIHRpbWUgdGhpcyB3b3VsZCBoYXBwZW5cbiAgICAgICAgLy8gcmVnYXJkbGVzcyBiZWNhdXNlIHRoZSBuZXcgZGVwZW5kZW5jeSBncmFwaCB3b3VsZCBfYWxzb18gaWRlbnRpZnkgdGhlIGZpbGUgYXMgc3RhbGUuXG4gICAgICAgIC8vIEhvd2V2ZXIgdGhlcmUgYXJlIGVkZ2UgY2FzZXMgc3VjaCBhcyByZW1vdmluZyBhIGNvbXBvbmVudCBmcm9tIGFuIE5nTW9kdWxlIHdpdGhvdXQgYWRkaW5nXG4gICAgICAgIC8vIGl0IHRvIGFub3RoZXIgb25lLCB3aGVyZSB0aGUgcHJldmlvdXMgZ3JhcGggaWRlbnRpZmllcyB0aGUgZmlsZSBhcyBsb2dpY2FsbHkgY2hhbmdlZCwgYnV0XG4gICAgICAgIC8vIHRoZSBuZXcgZ3JhcGggKHdoaWNoIGRvZXMgbm90IGhhdmUgdGhhdCBlZGdlKSBmYWlscyB0byBpZGVudGlmeSB0aGF0IHRoZSBmaWxlIHNob3VsZCBiZVxuICAgICAgICAvLyByZS1lbWl0dGVkLlxuICAgICAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBsb2dpY2FsQ2hhbmdlcykge1xuICAgICAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmFkZChjaGFuZ2UpO1xuICAgICAgICAgIHN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0LmFkZChjaGFuZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGBzdGF0ZWAgbm93IHJlZmxlY3RzIHRoZSBpbml0aWFsIHBlbmRpbmcgc3RhdGUgb2YgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsRHJpdmVyKHN0YXRlLCBkZXBHcmFwaCwgbG9naWNhbENoYW5nZXMpO1xuICAgIH0pO1xuICB9XG5cbiAgc3RhdGljIGZyZXNoKHByb2dyYW06IHRzLlByb2dyYW0pOiBJbmNyZW1lbnRhbERyaXZlciB7XG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIG5lZWQgdG8gYmUgZW1pdHRlZCB0byB0aGUgc2V0IG9mIGFsbCBUUyBmaWxlcyBpbiB0aGVcbiAgICAvLyBwcm9ncmFtLlxuICAgIGNvbnN0IHRzRmlsZXMgPSB0c09ubHlGaWxlcyhwcm9ncmFtKTtcblxuICAgIGNvbnN0IHN0YXRlOiBQZW5kaW5nQnVpbGRTdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICBwZW5kaW5nRW1pdDogbmV3IFNldDxzdHJpbmc+KHRzRmlsZXMubWFwKHNmID0+IHNmLmZpbGVOYW1lKSksXG4gICAgICBwZW5kaW5nVHlwZUNoZWNrRW1pdDogbmV3IFNldDxzdHJpbmc+KHRzRmlsZXMubWFwKHNmID0+IHNmLmZpbGVOYW1lKSksXG4gICAgICBjaGFuZ2VkUmVzb3VyY2VQYXRoczogbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKSxcbiAgICAgIGNoYW5nZWRUc1BhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgIGxhc3RHb29kOiBudWxsLFxuICAgICAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IG5ldyBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcigvKiBwcmlvckdyYXBoICovIG51bGwpLFxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsRHJpdmVyKHN0YXRlLCBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpLCAvKiBsb2dpY2FsQ2hhbmdlcyAqLyBudWxsKTtcbiAgfVxuXG4gIGdldFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKCk6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5raW5kICE9PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbWFudGljIGRlcGVuZGVuY3kgdXBkYXRlciBpcyBvbmx5IGF2YWlsYWJsZSB3aGVuIHBlbmRpbmcgYW5hbHlzaXMnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI7XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsQW5hbHlzaXModHJhaXRDb21waWxlcjogVHJhaXRDb21waWxlcik6IHZvaWQge1xuICAgIGlmICh0aGlzLnN0YXRlLmtpbmQgIT09IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcpIHtcbiAgICAgIC8vIENoYW5nZXMgaGF2ZSBhbHJlYWR5IGJlZW4gaW5jb3Jwb3JhdGVkLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHtuZWVkc0VtaXQsIG5lZWRzVHlwZUNoZWNrRW1pdCwgbmV3R3JhcGh9ID0gdGhpcy5zdGF0ZS5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlci5maW5hbGl6ZSgpO1xuXG4gICAgY29uc3QgcGVuZGluZ0VtaXQgPSB0aGlzLnN0YXRlLnBlbmRpbmdFbWl0O1xuICAgIGZvciAoY29uc3QgcGF0aCBvZiBuZWVkc0VtaXQpIHtcbiAgICAgIHBlbmRpbmdFbWl0LmFkZChwYXRoKTtcbiAgICB9XG5cbiAgICBjb25zdCBwZW5kaW5nVHlwZUNoZWNrRW1pdCA9IHRoaXMuc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQ7XG4gICAgZm9yIChjb25zdCBwYXRoIG9mIG5lZWRzVHlwZUNoZWNrRW1pdCkge1xuICAgICAgcGVuZGluZ1R5cGVDaGVja0VtaXQuYWRkKHBhdGgpO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSB0aGUgc3RhdGUgdG8gYW4gYEFuYWx5emVkQnVpbGRTdGF0ZWAuXG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkLFxuICAgICAgcGVuZGluZ0VtaXQsXG4gICAgICBwZW5kaW5nVHlwZUNoZWNrRW1pdCxcblxuICAgICAgLy8gU2luY2UgdGhpcyBjb21waWxhdGlvbiB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLCB1cGRhdGUgdGhlIFwibGFzdCBnb29kXCIgYXJ0aWZhY3RzIHRvIHRoZVxuICAgICAgLy8gb25lcyBmcm9tIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgICAgbGFzdEdvb2Q6IHtcbiAgICAgICAgZGVwR3JhcGg6IHRoaXMuZGVwR3JhcGgsXG4gICAgICAgIHNlbWFudGljRGVwR3JhcGg6IG5ld0dyYXBoLFxuICAgICAgICB0cmFpdENvbXBpbGVyOiB0cmFpdENvbXBpbGVyLFxuICAgICAgICB0eXBlQ2hlY2tpbmdSZXN1bHRzOiBudWxsLFxuICAgICAgfSxcblxuICAgICAgcHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzOlxuICAgICAgICAgIHRoaXMuc3RhdGUubGFzdEdvb2QgIT09IG51bGwgPyB0aGlzLnN0YXRlLmxhc3RHb29kLnR5cGVDaGVja2luZ1Jlc3VsdHMgOiBudWxsLFxuICAgIH07XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsVHlwZUNoZWNrKHJlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RhdGUubGFzdEdvb2QgPT09IG51bGwgfHwgdGhpcy5zdGF0ZS5raW5kICE9PSBCdWlsZFN0YXRlS2luZC5BbmFseXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN0YXRlLmxhc3RHb29kLnR5cGVDaGVja2luZ1Jlc3VsdHMgPSByZXN1bHRzO1xuXG4gICAgLy8gRGVsZXRlIHRoZSBmaWxlcyBmb3Igd2hpY2ggdHlwZS1jaGVjayBjb2RlIHdhcyBnZW5lcmF0ZWQgZnJvbSB0aGUgc2V0IG9mIHBlbmRpbmcgdHlwZS1jaGVja1xuICAgIC8vIGZpbGVzLlxuICAgIGZvciAoY29uc3QgZmlsZU5hbWUgb2YgcmVzdWx0cy5rZXlzKCkpIHtcbiAgICAgIHRoaXMuc3RhdGUucGVuZGluZ1R5cGVDaGVja0VtaXQuZGVsZXRlKGZpbGVOYW1lKTtcbiAgICB9XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsRW1pdChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGUucGVuZGluZ0VtaXQuZGVsZXRlKHNmLmZpbGVOYW1lKTtcbiAgfVxuXG4gIHNhZmVUb1NraXBFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICF0aGlzLnN0YXRlLnBlbmRpbmdFbWl0LmhhcyhzZi5maWxlTmFtZSk7XG4gIH1cblxuICBwcmlvcldvcmtGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICh0aGlzLnN0YXRlLmxhc3RHb29kID09PSBudWxsIHx8IHRoaXMubG9naWNhbENoYW5nZXMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIHByZXZpb3VzIGdvb2QgYnVpbGQsIHNvIG5vIHByaW9yIHdvcmsgZXhpc3RzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGlzLmxvZ2ljYWxDaGFuZ2VzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIC8vIFByaW9yIHdvcmsgbWlnaHQgZXhpc3QsIGJ1dCB3b3VsZCBiZSBzdGFsZSBhcyB0aGUgZmlsZSBpbiBxdWVzdGlvbiBoYXMgbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJpb3Igd29yayBtaWdodCBleGlzdCwgYW5kIGlmIGl0IGRvZXMgdGhlbiBpdCdzIHVzYWJsZSFcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmxhc3RHb29kLnRyYWl0Q29tcGlsZXIucmVjb3Jkc0ZvcihzZik7XG4gICAgfVxuICB9XG5cbiAgcHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogRmlsZVR5cGVDaGVja2luZ0RhdGF8bnVsbCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuQW5hbHl6ZWQgfHxcbiAgICAgICAgdGhpcy5zdGF0ZS5wcmlvclR5cGVDaGVja2luZ1Jlc3VsdHMgPT09IG51bGwgfHwgdGhpcy5sb2dpY2FsQ2hhbmdlcyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubG9naWNhbENoYW5nZXMuaGFzKHNmLmZpbGVOYW1lKSB8fCB0aGlzLnN0YXRlLnBlbmRpbmdUeXBlQ2hlY2tFbWl0LmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGZpbGVOYW1lID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgaWYgKCF0aGlzLnN0YXRlLnByaW9yVHlwZUNoZWNraW5nUmVzdWx0cy5oYXMoZmlsZU5hbWUpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuc3RhdGUucHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzLmdldChmaWxlTmFtZSkhO1xuICAgIGlmIChkYXRhLmhhc0lubGluZXMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG59XG5cbnR5cGUgQnVpbGRTdGF0ZSA9IFBlbmRpbmdCdWlsZFN0YXRlfEFuYWx5emVkQnVpbGRTdGF0ZTtcblxuZW51bSBCdWlsZFN0YXRlS2luZCB7XG4gIFBlbmRpbmcsXG4gIEFuYWx5emVkLFxufVxuXG5pbnRlcmZhY2UgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZDtcblxuICAvKipcbiAgICogVGhlIGhlYXJ0IG9mIGluY3JlbWVudGFsIGJ1aWxkcy4gVGhpcyBgU2V0YCB0cmFja3MgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWRcbiAgICogZHVyaW5nIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uLlxuICAgKlxuICAgKiBUaGlzIHN0YXJ0cyBvdXQgYXMgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBhcmUgc3RpbGwgcGVuZGluZyBmcm9tIHRoZSBwcmV2aW91cyBwcm9ncmFtIChvciB0aGVcbiAgICogZnVsbCBzZXQgb2YgLnRzIGZpbGVzIG9uIGEgZnJlc2ggYnVpbGQpLlxuICAgKlxuICAgKiBBZnRlciBhbmFseXNpcywgaXQncyB1cGRhdGVkIHRvIGluY2x1ZGUgYW55IGZpbGVzIHdoaWNoIG1pZ2h0IGhhdmUgY2hhbmdlZCBhbmQgbmVlZCBhIHJlLWVtaXRcbiAgICogYXMgYSByZXN1bHQgb2YgaW5jcmVtZW50YWwgY2hhbmdlcy5cbiAgICpcbiAgICogSWYgYW4gZW1pdCBoYXBwZW5zLCBhbnkgd3JpdHRlbiBmaWxlcyBhcmUgcmVtb3ZlZCBmcm9tIHRoZSBgU2V0YCwgYXMgdGhleSdyZSBubyBsb25nZXJcbiAgICogcGVuZGluZy5cbiAgICpcbiAgICogVGh1cywgYWZ0ZXIgY29tcGlsYXRpb24gYHBlbmRpbmdFbWl0YCBzaG91bGQgYmUgZW1wdHkgKG9uIGEgc3VjY2Vzc2Z1bCBidWlsZCkgb3IgY29udGFpbiB0aGVcbiAgICogZmlsZXMgd2hpY2ggc3RpbGwgbmVlZCB0byBiZSBlbWl0dGVkIGJ1dCBoYXZlIG5vdCB5ZXQgYmVlbiAoZHVlIHRvIGVycm9ycykuXG4gICAqXG4gICAqIGBwZW5kaW5nRW1pdGAgaXMgdHJhY2tlZCBhcyBhcyBgU2V0PHN0cmluZz5gIGluc3RlYWQgb2YgYSBgU2V0PHRzLlNvdXJjZUZpbGU+YCwgYmVjYXVzZSB0aGVcbiAgICogY29udGVudHMgb2YgdGhlIGZpbGUgYXJlIG5vdCBpbXBvcnRhbnQgaGVyZSwgb25seSB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCB2ZXJzaW9uIG9mIGl0XG4gICAqIG5lZWRzIHRvIGJlIGVtaXR0ZWQuIFRoZSBgc3RyaW5nYHMgaGVyZSBhcmUgVFMgZmlsZSBwYXRocy5cbiAgICpcbiAgICogU2VlIHRoZSBSRUFETUUubWQgZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhpcyBhbGdvcml0aG0uXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG5cbiAgLyoqXG4gICAqIFNpbWlsYXIgdG8gYHBlbmRpbmdFbWl0YCwgYnV0IHRoZW4gZm9yIHJlcHJlc2VudGluZyB0aGUgc2V0IG9mIGZpbGVzIGZvciB3aGljaCB0aGUgdHlwZS1jaGVja1xuICAgKiBmaWxlIHNob3VsZCBiZSByZWdlbmVyYXRlZC4gSXQgYmVoYXZlcyBpZGVudGljYWxseSB3aXRoIHJlc3BlY3QgdG8gZXJyb3JlZCBjb21waWxhdGlvbnMgYXNcbiAgICogYHBlbmRpbmdFbWl0YC5cbiAgICovXG4gIHBlbmRpbmdUeXBlQ2hlY2tFbWl0OiBTZXQ8c3RyaW5nPjtcblxuXG4gIC8qKlxuICAgKiBTcGVjaWZpYyBhc3BlY3RzIG9mIHRoZSBsYXN0IGNvbXBpbGF0aW9uIHdoaWNoIHN1Y2Nlc3NmdWxseSBjb21wbGV0ZWQgYW5hbHlzaXMsIGlmIGFueS5cbiAgICovXG4gIGxhc3RHb29kOiB7XG4gICAgLyoqXG4gICAgICogVGhlIGRlcGVuZGVuY3kgZ3JhcGggZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2dpY2FsIGltcGFjdCBvZiBwaHlzaWNhbCBmaWxlIGNoYW5nZXMuXG4gICAgICovXG4gICAgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGg7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaCBmcm9tIHRoZSBsYXN0IHN1Y2Nlc3NmdWxseSBhbmFseXplZCBidWlsZC5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgdXNlZCB0byBwZXJmb3JtIGluLWRlcHRoIGNvbXBhcmlzb24gb2YgQW5ndWxhciBkZWNvcmF0ZWQgY2xhc3NlcywgdG8gZGV0ZXJtaW5lXG4gICAgICogd2hpY2ggZmlsZXMgaGF2ZSB0byBiZSByZS1lbWl0dGVkIGFuZC9vciByZS10eXBlLWNoZWNrZWQuXG4gICAgICovXG4gICAgc2VtYW50aWNEZXBHcmFwaDogU2VtYW50aWNEZXBHcmFwaDtcblxuICAgIC8qKlxuICAgICAqIFRoZSBgVHJhaXRDb21waWxlcmAgZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZXh0cmFjdCBcInByaW9yIHdvcmtcIiB3aGljaCBtaWdodCBiZSByZXVzYWJsZSBpbiB0aGlzIGNvbXBpbGF0aW9uLlxuICAgICAqL1xuICAgIHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXI7XG5cbiAgICAvKipcbiAgICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgd2hpY2ggd2lsbCBiZSBwYXNzZWQgb250byB0aGUgbmV4dCBidWlsZC5cbiAgICAgKi9cbiAgICB0eXBlQ2hlY2tpbmdSZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPnwgbnVsbDtcbiAgfXxudWxsO1xufVxuXG4vKipcbiAqIFN0YXRlIG9mIGEgYnVpbGQgYmVmb3JlIHRoZSBBbmd1bGFyIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcy5cbiAqL1xuaW50ZXJmYWNlIFBlbmRpbmdCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQmVmb3JlIHRoZSBjb21waWxlcidzIGFuYWx5c2lzIHBoYXNlIGNvbXBsZXRlcywgYHBlbmRpbmdFbWl0YCBvbmx5IGNvbnRhaW5zIGZpbGVzIHRoYXQgd2VyZVxuICAgKiBzdGlsbCBwZW5kaW5nIGFmdGVyIHRoZSBwcmV2aW91cyBidWlsZC5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuICAvKipcbiAgICogU2V0IG9mIFR5cGVTY3JpcHQgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFRzUGF0aHM6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgcmVzb3VyY2UgZmlsZSBwYXRocyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgY2hhbmdlZFJlc291cmNlUGF0aHM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG5cbiAgLyoqXG4gICAqIEluIGEgcGVuZGluZyBzdGF0ZSwgdGhlIHNlbWFudGljIGRlcGVuZGVuY3kgZ3JhcGggaXMgYXZhaWxhYmxlIHRvIHRoZSBjb21waWxhdGlvbiB0byByZWdpc3RlclxuICAgKiB0aGUgaW5jcmVtZW50YWwgc3ltYm9scyBpbnRvLlxuICAgKi9cbiAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xufVxuXG5pbnRlcmZhY2UgQW5hbHl6ZWRCdWlsZFN0YXRlIGV4dGVuZHMgQmFzZUJ1aWxkU3RhdGUge1xuICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZDtcblxuICAvKipcbiAgICogU2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBrbm93biB0byBuZWVkIGFuIGVtaXQuXG4gICAqXG4gICAqIEFmdGVyIGFuYWx5c2lzIGNvbXBsZXRlcyAodGhhdCBpcywgdGhlIHN0YXRlIHRyYW5zaXRpb25zIHRvIGBBbmFseXplZEJ1aWxkU3RhdGVgKSwgdGhlXG4gICAqIGBwZW5kaW5nRW1pdGAgc2V0IHRha2VzIGludG8gYWNjb3VudCBhbnkgb24tZGlzayBjaGFuZ2VzIG1hZGUgc2luY2UgdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5XG4gICAqIGFuYWx5emVkIGJ1aWxkLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBUeXBlIGNoZWNraW5nIHJlc3VsdHMgZnJvbSB0aGUgcHJldmlvdXMgY29tcGlsYXRpb24sIHdoaWNoIGNhbiBiZSByZXVzZWQgaW4gdGhpcyBvbmUuXG4gICAqL1xuICBwcmlvclR5cGVDaGVja2luZ1Jlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+fG51bGw7XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==