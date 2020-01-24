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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/state", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
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
            var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
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
                for (var _e = tslib_1.__values(newProgram.getSourceFiles()), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var newFile = _f.value;
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
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
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
                    for (var _g = tslib_1.__values(state.changedTsPaths), _h = _g.next(); !_h.done; _h = _g.next()) {
                        var fileName = _h.value;
                        logicalChanges.add(fileName);
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_h && !_h.done && (_d = _g.return)) _d.call(_g);
                    }
                    finally { if (e_4) throw e_4.error; }
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
            var e_5, _a;
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
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9zdGF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFPSCwyR0FBMEQ7SUFFMUQ7O09BRUc7SUFDSDtRQVFFLDJCQUNJLEtBQXdCLEVBQVUsVUFBOEIsRUFDdkQsUUFBNkIsRUFBVSxjQUFnQztZQUQ5QyxlQUFVLEdBQVYsVUFBVSxDQUFvQjtZQUN2RCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtZQUFVLG1CQUFjLEdBQWQsY0FBYyxDQUFrQjtZQUNsRixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNyQixDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0ksMkJBQVMsR0FBaEIsVUFDSSxVQUFzQixFQUFFLFNBQTRCLEVBQUUsVUFBc0IsRUFDNUUscUJBQXVDOztZQUN6Qyx1RUFBdUU7WUFDdkUsSUFBSSxLQUF3QixDQUFDO1lBQzdCLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssY0FBYyxDQUFDLE9BQU8sRUFBRTtnQkFDbkQsOEZBQThGO2dCQUM5RixjQUFjO2dCQUNkLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDO2FBQ3pCO2lCQUFNO2dCQUNMLHdGQUF3RjtnQkFDeEYsMkJBQTJCO2dCQUMzQixLQUFLLEdBQUc7b0JBQ04sSUFBSSxFQUFFLGNBQWMsQ0FBQyxPQUFPO29CQUM1QixXQUFXLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxXQUFXO29CQUN4QyxvQkFBb0IsRUFBRSxJQUFJLEdBQUcsRUFBVTtvQkFDdkMsY0FBYyxFQUFFLElBQUksR0FBRyxFQUFVO29CQUNqQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRO2lCQUNuQyxDQUFDO2FBQ0g7WUFFRCxpRUFBaUU7WUFDakUsSUFBSSxxQkFBcUIsS0FBSyxJQUFJLEVBQUU7O29CQUNsQyxLQUFzQixJQUFBLDBCQUFBLGlCQUFBLHFCQUFxQixDQUFBLDREQUFBLCtGQUFFO3dCQUF4QyxJQUFNLE9BQU8sa0NBQUE7d0JBQ2hCLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQ3pDOzs7Ozs7Ozs7YUFDRjtZQUVELHNFQUFzRTtZQUN0RSwwRkFBMEY7WUFDMUYsMkZBQTJGO1lBQzNGLGdHQUFnRztZQUNoRyxxQkFBcUI7WUFFckIsK0RBQStEO1lBQy9ELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFnQixVQUFVLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUVyRSxrRkFBa0Y7WUFDbEYsSUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQVMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxRQUFRLEVBQVgsQ0FBVyxDQUFDLENBQUMsQ0FBQzs7Z0JBRXZGLEtBQXNCLElBQUEsS0FBQSxpQkFBQSxVQUFVLENBQUMsY0FBYyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQTlDLElBQU0sT0FBTyxXQUFBO29CQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFO3dCQUM5QiwyRUFBMkU7d0JBQzNFLGNBQWMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUN6QztvQkFFRCxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3pCLDJEQUEyRDt3QkFDM0QsU0FBUztxQkFDVjtvQkFFRCw0RkFBNEY7b0JBQzVGLDJCQUEyQjtvQkFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTt3QkFDOUIsNENBQTRDO3dCQUM1QyxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNMLGdGQUFnRjt3QkFDaEYsMkZBQTJGO3dCQUMzRixrRUFBa0U7d0JBQ2xFLE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO3FCQUM1QztpQkFDRjs7Ozs7Ozs7OztnQkFFRCwrREFBK0Q7Z0JBQy9ELEtBQXVCLElBQUEsbUJBQUEsaUJBQUEsY0FBYyxDQUFBLDhDQUFBLDBFQUFFO29CQUFsQyxJQUFNLFFBQVEsMkJBQUE7b0JBQ2pCLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUVuQyw4RkFBOEY7b0JBQzlGLGtGQUFrRjtvQkFDbEYsS0FBSyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3ZDOzs7Ozs7Ozs7WUFFRCwrRkFBK0Y7WUFDL0YseURBQXlEO1lBQ3pELElBQU0sUUFBUSxHQUFHLElBQUkseUNBQW1CLEVBQUUsQ0FBQztZQUUzQywrRkFBK0Y7WUFDL0YsaUJBQWlCO1lBQ2pCLElBQUksY0FBYyxHQUFxQixJQUFJLENBQUM7WUFDNUMsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtnQkFDM0IsNkZBQTZGO2dCQUM3RixxRkFBcUY7Z0JBQ3JGLHFCQUFxQjtnQkFDckIsY0FBYyxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsQ0FDL0MsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQzdELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDOztvQkFDaEMsS0FBdUIsSUFBQSxLQUFBLGlCQUFBLEtBQUssQ0FBQyxjQUFjLENBQUEsZ0JBQUEsNEJBQUU7d0JBQXhDLElBQU0sUUFBUSxXQUFBO3dCQUNqQixjQUFjLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3FCQUM5Qjs7Ozs7Ozs7O2FBQ0Y7WUFFRCw2RUFBNkU7WUFFN0UsT0FBTyxJQUFJLGlCQUFpQixDQUN4QixLQUFLLEVBQUUsSUFBSSxHQUFHLENBQWdCLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUN4RixDQUFDO1FBRU0sdUJBQUssR0FBWixVQUFhLE9BQW1CO1lBQzlCLHlGQUF5RjtZQUN6RixXQUFXO1lBQ1gsSUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXJDLElBQU0sS0FBSyxHQUFzQjtnQkFDL0IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxPQUFPO2dCQUM1QixXQUFXLEVBQUUsSUFBSSxHQUFHLENBQVMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFBLEVBQUUsSUFBSSxPQUFBLEVBQUUsQ0FBQyxRQUFRLEVBQVgsQ0FBVyxDQUFDLENBQUM7Z0JBQzVELG9CQUFvQixFQUFFLElBQUksR0FBRyxFQUFVO2dCQUN2QyxjQUFjLEVBQUUsSUFBSSxHQUFHLEVBQVU7Z0JBQ2pDLFFBQVEsRUFBRSxJQUFJO2FBQ2YsQ0FBQztZQUVGLE9BQU8sSUFBSSxpQkFBaUIsQ0FDeEIsS0FBSyxFQUFFLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUkseUNBQW1CLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRixDQUFDO1FBRUQsb0RBQXdCLEdBQXhCLFVBQXlCLGFBQTRCOztZQUNuRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWMsQ0FBQyxPQUFPLEVBQUU7Z0JBQzlDLDBDQUEwQztnQkFDMUMsT0FBTzthQUNSO1lBRUQsSUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7WUFFM0MsSUFBTSxLQUFLLEdBQXNCLElBQUksQ0FBQyxLQUFLLENBQUM7O2dCQUU1QyxLQUFpQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLFVBQVUsQ0FBQSxnQkFBQSw0QkFBRTtvQkFBN0IsSUFBTSxFQUFFLFdBQUE7b0JBQ1gsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsRUFBRTt3QkFDL0UsZ0VBQWdFO3dCQUNoRSxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztxQkFDOUI7aUJBQ0Y7Ozs7Ozs7OztZQUVELCtDQUErQztZQUMvQyxJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsUUFBUTtnQkFDN0IsV0FBVyxhQUFBO2dCQUVYLDRGQUE0RjtnQkFDNUYscUNBQXFDO2dCQUNyQyxRQUFRLEVBQUU7b0JBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO29CQUN2QixhQUFhLEVBQUUsYUFBYTtpQkFDN0I7YUFDRixDQUFDO1FBQ0osQ0FBQztRQUVELGdEQUFvQixHQUFwQixVQUFxQixFQUFpQixJQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTdGLDBDQUFjLEdBQWQsVUFBZSxFQUFpQixJQUFhLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUvRix3Q0FBWSxHQUFaLFVBQWEsRUFBaUI7WUFDNUIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxJQUFJLEVBQUU7Z0JBQ2hFLDREQUE0RDtnQkFDNUQsT0FBTyxJQUFJLENBQUM7YUFDYjtpQkFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDL0MsNEZBQTRGO2dCQUM1RixPQUFPLElBQUksQ0FBQzthQUNiO2lCQUFNO2dCQUNMLDJEQUEyRDtnQkFDM0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pEO1FBQ0gsQ0FBQztRQUNILHdCQUFDO0lBQUQsQ0FBQyxBQXZMRCxJQXVMQztJQXZMWSw4Q0FBaUI7SUEyTDlCLElBQUssY0FHSjtJQUhELFdBQUssY0FBYztRQUNqQix5REFBTyxDQUFBO1FBQ1AsMkRBQVEsQ0FBQTtJQUNWLENBQUMsRUFISSxjQUFjLEtBQWQsY0FBYyxRQUdsQjtJQXVGRCxTQUFTLFdBQVcsQ0FBQyxPQUFtQjtRQUN0QyxPQUFPLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBQSxFQUFFLElBQUksT0FBQSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBckIsQ0FBcUIsQ0FBQyxDQUFDO0lBQ3RFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzUmVjb3JkLCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtJbmNyZW1lbnRhbEJ1aWxkfSBmcm9tICcuLi9hcGknO1xuXG5pbXBvcnQge0ZpbGVEZXBlbmRlbmN5R3JhcGh9IGZyb20gJy4vZGVwZW5kZW5jeV90cmFja2luZyc7XG5cbi8qKlxuICogRHJpdmVzIGFuIGluY3JlbWVudGFsIGJ1aWxkLCBieSB0cmFja2luZyBjaGFuZ2VzIGFuZCBkZXRlcm1pbmluZyB3aGljaCBmaWxlcyBuZWVkIHRvIGJlIGVtaXR0ZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbERyaXZlciBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQ+IHtcbiAgLyoqXG4gICAqIFN0YXRlIG9mIHRoZSBjdXJyZW50IGJ1aWxkLlxuICAgKlxuICAgKiBUaGlzIHRyYW5zaXRpb25zIGFzIHRoZSBjb21waWxhdGlvbiBwcm9ncmVzc2VzLlxuICAgKi9cbiAgcHJpdmF0ZSBzdGF0ZTogQnVpbGRTdGF0ZTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlLCBwcml2YXRlIGFsbFRzRmlsZXM6IFNldDx0cy5Tb3VyY2VGaWxlPixcbiAgICAgIHJlYWRvbmx5IGRlcEdyYXBoOiBGaWxlRGVwZW5kZW5jeUdyYXBoLCBwcml2YXRlIGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsKSB7XG4gICAgdGhpcy5zdGF0ZSA9IHN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdCBhbiBgSW5jcmVtZW50YWxEcml2ZXJgIHdpdGggYSBzdGFydGluZyBzdGF0ZSB0aGF0IGluY29ycG9yYXRlcyB0aGUgcmVzdWx0cyBvZiBhXG4gICAqIHByZXZpb3VzIGJ1aWxkLlxuICAgKlxuICAgKiBUaGUgcHJldmlvdXMgYnVpbGQncyBgQnVpbGRTdGF0ZWAgaXMgcmVjb25jaWxlZCB3aXRoIHRoZSBuZXcgcHJvZ3JhbSdzIGNoYW5nZXMsIGFuZCB0aGUgcmVzdWx0c1xuICAgKiBhcmUgbWVyZ2VkIGludG8gdGhlIG5ldyBidWlsZCdzIGBQZW5kaW5nQnVpbGRTdGF0ZWAuXG4gICAqL1xuICBzdGF0aWMgcmVjb25jaWxlKFxuICAgICAgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSwgb2xkRHJpdmVyOiBJbmNyZW1lbnRhbERyaXZlciwgbmV3UHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlczogU2V0PHN0cmluZz58bnVsbCk6IEluY3JlbWVudGFsRHJpdmVyIHtcbiAgICAvLyBJbml0aWFsaXplIHRoZSBzdGF0ZSBvZiB0aGUgY3VycmVudCBidWlsZCBiYXNlZCBvbiB0aGUgcHJldmlvdXMgb25lLlxuICAgIGxldCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGU7XG4gICAgaWYgKG9sZERyaXZlci5zdGF0ZS5raW5kID09PSBCdWlsZFN0YXRlS2luZC5QZW5kaW5nKSB7XG4gICAgICAvLyBUaGUgcHJldmlvdXMgYnVpbGQgbmV2ZXIgbWFkZSBpdCBwYXN0IHRoZSBwZW5kaW5nIHN0YXRlLiBSZXVzZSBpdCBhcyB0aGUgc3RhcnRpbmcgc3RhdGUgZm9yXG4gICAgICAvLyB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSBvbGREcml2ZXIuc3RhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBwcmV2aW91cyBidWlsZCB3YXMgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkLiBgcGVuZGluZ0VtaXRgIGlzIHRoZSBvbmx5IHN0YXRlIGNhcnJpZWRcbiAgICAgIC8vIGZvcndhcmQgaW50byB0aGlzIGJ1aWxkLlxuICAgICAgc3RhdGUgPSB7XG4gICAgICAgIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdFbWl0OiBvbGREcml2ZXIuc3RhdGUucGVuZGluZ0VtaXQsXG4gICAgICAgIGNoYW5nZWRSZXNvdXJjZVBhdGhzOiBuZXcgU2V0PHN0cmluZz4oKSxcbiAgICAgICAgY2hhbmdlZFRzUGF0aHM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgICBsYXN0R29vZDogb2xkRHJpdmVyLnN0YXRlLmxhc3RHb29kLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBNZXJnZSB0aGUgZnJlc2hseSBtb2RpZmllZCByZXNvdXJjZSBmaWxlcyB3aXRoIGFueSBwcmlvciBvbmVzLlxuICAgIGlmIChtb2RpZmllZFJlc291cmNlRmlsZXMgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgcmVzRmlsZSBvZiBtb2RpZmllZFJlc291cmNlRmlsZXMpIHtcbiAgICAgICAgc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMuYWRkKHJlc0ZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5leHQsIHByb2Nlc3MgdGhlIGZpbGVzIGluIHRoZSBuZXcgcHJvZ3JhbSwgd2l0aCBhIGNvdXBsZSBvZiBnb2FsczpcbiAgICAvLyAxKSBEZXRlcm1pbmUgd2hpY2ggVFMgZmlsZXMgaGF2ZSBjaGFuZ2VkLCBpZiBhbnksIGFuZCBtZXJnZSB0aGVtIGludG8gYGNoYW5nZWRUc0ZpbGVzYC5cbiAgICAvLyAyKSBQcm9kdWNlIGEgbGlzdCBvZiBUUyBmaWxlcyB3aGljaCBubyBsb25nZXIgZXhpc3QgaW4gdGhlIHByb2dyYW0gKHRoZXkndmUgYmVlbiBkZWxldGVkXG4gICAgLy8gICAgc2luY2UgdGhlIHByZXZpb3VzIGNvbXBpbGF0aW9uKS4gVGhlc2UgbmVlZCB0byBiZSByZW1vdmVkIGZyb20gdGhlIHN0YXRlIHRyYWNraW5nIHRvIGF2b2lkXG4gICAgLy8gICAgbGVha2luZyBtZW1vcnkuXG5cbiAgICAvLyBBbGwgZmlsZXMgaW4gdGhlIG9sZCBwcm9ncmFtLCBmb3IgZWFzeSBkZXRlY3Rpb24gb2YgY2hhbmdlcy5cbiAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQ8dHMuU291cmNlRmlsZT4ob2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpKTtcblxuICAgIC8vIEFzc3VtZSBhbGwgdGhlIG9sZCBmaWxlcyB3ZXJlIGRlbGV0ZWQgdG8gYmVnaW4gd2l0aC4gT25seSBUUyBmaWxlcyBhcmUgdHJhY2tlZC5cbiAgICBjb25zdCBkZWxldGVkVHNQYXRocyA9IG5ldyBTZXQ8c3RyaW5nPih0c09ubHlGaWxlcyhvbGRQcm9ncmFtKS5tYXAoc2YgPT4gc2YuZmlsZU5hbWUpKTtcblxuICAgIGZvciAoY29uc3QgbmV3RmlsZSBvZiBuZXdQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmICghbmV3RmlsZS5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAvLyBUaGlzIGZpbGUgZXhpc3RzIGluIHRoZSBuZXcgcHJvZ3JhbSwgc28gcmVtb3ZlIGl0IGZyb20gYGRlbGV0ZWRUc1BhdGhzYC5cbiAgICAgICAgZGVsZXRlZFRzUGF0aHMuZGVsZXRlKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAob2xkRmlsZXMuaGFzKG5ld0ZpbGUpKSB7XG4gICAgICAgIC8vIFRoaXMgZmlsZSBoYXNuJ3QgY2hhbmdlZDsgbm8gbmVlZCB0byBsb29rIGF0IGl0IGZ1cnRoZXIuXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgZmlsZSBoYXMgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsIGJ1aWxkLiBUaGUgYXBwcm9wcmlhdGUgcmVhY3Rpb24gZGVwZW5kcyBvblxuICAgICAgLy8gd2hhdCBraW5kIG9mIGZpbGUgaXQgaXMuXG4gICAgICBpZiAoIW5ld0ZpbGUuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgLy8gSXQncyBhIC50cyBmaWxlLCBzbyB0cmFjayBpdCBhcyBhIGNoYW5nZS5cbiAgICAgICAgc3RhdGUuY2hhbmdlZFRzUGF0aHMuYWRkKG5ld0ZpbGUuZmlsZU5hbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gSXQncyBhIC5kLnRzIGZpbGUuIEN1cnJlbnRseSB0aGUgY29tcGlsZXIgZG9lcyBub3QgZG8gYSBncmVhdCBqb2Igb2YgdHJhY2tpbmdcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzIG9uIC5kLnRzIGZpbGVzLCBzbyBiYWlsIG91dCBvZiBpbmNyZW1lbnRhbCBidWlsZHMgaGVyZSBhbmQgZG8gYSBmdWxsIGJ1aWxkLlxuICAgICAgICAvLyBUaGlzIHVzdWFsbHkgb25seSBoYXBwZW5zIGlmIHNvbWV0aGluZyBpbiBub2RlX21vZHVsZXMgY2hhbmdlcy5cbiAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsRHJpdmVyLmZyZXNoKG5ld1Byb2dyYW0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBuZXh0IHN0ZXAgaXMgdG8gcmVtb3ZlIGFueSBkZWxldGVkIGZpbGVzIGZyb20gdGhlIHN0YXRlLlxuICAgIGZvciAoY29uc3QgZmlsZVBhdGggb2YgZGVsZXRlZFRzUGF0aHMpIHtcbiAgICAgIHN0YXRlLnBlbmRpbmdFbWl0LmRlbGV0ZShmaWxlUGF0aCk7XG5cbiAgICAgIC8vIEV2ZW4gaWYgdGhlIGZpbGUgZG9lc24ndCBleGlzdCBpbiB0aGUgY3VycmVudCBjb21waWxhdGlvbiwgaXQgc3RpbGwgbWlnaHQgaGF2ZSBiZWVuIGNoYW5nZWRcbiAgICAgIC8vIGluIGEgcHJldmlvdXMgb25lLCBzbyBkZWxldGUgaXQgZnJvbSB0aGUgc2V0IG9mIGNoYW5nZWQgVFMgZmlsZXMsIGp1c3QgaW4gY2FzZS5cbiAgICAgIHN0YXRlLmNoYW5nZWRUc1BhdGhzLmRlbGV0ZShmaWxlUGF0aCk7XG4gICAgfVxuXG4gICAgLy8gTm93LCBjaGFuZ2VkVHNQYXRocyBjb250YWlucyBwaHlzaWNhbGx5IGNoYW5nZWQgVFMgcGF0aHMuIFVzZSB0aGUgcHJldmlvdXMgcHJvZ3JhbSdzIGxvZ2ljYWxcbiAgICAvLyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy5cbiAgICBjb25zdCBkZXBHcmFwaCA9IG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCk7XG5cbiAgICAvLyBJZiBhIHByZXZpb3VzIGNvbXBpbGF0aW9uIGV4aXN0cywgdXNlIGl0cyBkZXBlbmRlbmN5IGdyYXBoIHRvIGRldGVybWluZSB0aGUgc2V0IG9mIGxvZ2ljYWxseVxuICAgIC8vIGNoYW5nZWQgZmlsZXMuXG4gICAgbGV0IGxvZ2ljYWxDaGFuZ2VzOiBTZXQ8c3RyaW5nPnxudWxsID0gbnVsbDtcbiAgICBpZiAoc3RhdGUubGFzdEdvb2QgIT09IG51bGwpIHtcbiAgICAgIC8vIEV4dHJhY3QgdGhlIHNldCBvZiBsb2dpY2FsbHkgY2hhbmdlZCBmaWxlcy4gQXQgdGhlIHNhbWUgdGltZSwgdGhpcyBvcGVyYXRpb24gcG9wdWxhdGVzIHRoZVxuICAgICAgLy8gY3VycmVudCAoZnJlc2gpIGRlcGVuZGVuY3kgZ3JhcGggd2l0aCBpbmZvcm1hdGlvbiBhYm91dCB0aG9zZSBmaWxlcyB3aGljaCBoYXZlIG5vdFxuICAgICAgLy8gbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICBsb2dpY2FsQ2hhbmdlcyA9IGRlcEdyYXBoLnVwZGF0ZVdpdGhQaHlzaWNhbENoYW5nZXMoXG4gICAgICAgICAgc3RhdGUubGFzdEdvb2QuZGVwR3JhcGgsIHN0YXRlLmNoYW5nZWRUc1BhdGhzLCBkZWxldGVkVHNQYXRocyxcbiAgICAgICAgICBzdGF0ZS5jaGFuZ2VkUmVzb3VyY2VQYXRocyk7XG4gICAgICBmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIHN0YXRlLmNoYW5nZWRUc1BhdGhzKSB7XG4gICAgICAgIGxvZ2ljYWxDaGFuZ2VzLmFkZChmaWxlTmFtZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gYHN0YXRlYCBub3cgcmVmbGVjdHMgdGhlIGluaXRpYWwgcGVuZGluZyBzdGF0ZSBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbi5cblxuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxEcml2ZXIoXG4gICAgICAgIHN0YXRlLCBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KHRzT25seUZpbGVzKG5ld1Byb2dyYW0pKSwgZGVwR3JhcGgsIGxvZ2ljYWxDaGFuZ2VzKTtcbiAgfVxuXG4gIHN0YXRpYyBmcmVzaChwcm9ncmFtOiB0cy5Qcm9ncmFtKTogSW5jcmVtZW50YWxEcml2ZXIge1xuICAgIC8vIEluaXRpYWxpemUgdGhlIHNldCBvZiBmaWxlcyB3aGljaCBuZWVkIHRvIGJlIGVtaXR0ZWQgdG8gdGhlIHNldCBvZiBhbGwgVFMgZmlsZXMgaW4gdGhlXG4gICAgLy8gcHJvZ3JhbS5cbiAgICBjb25zdCB0c0ZpbGVzID0gdHNPbmx5RmlsZXMocHJvZ3JhbSk7XG5cbiAgICBjb25zdCBzdGF0ZTogUGVuZGluZ0J1aWxkU3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5QZW5kaW5nLFxuICAgICAgcGVuZGluZ0VtaXQ6IG5ldyBTZXQ8c3RyaW5nPih0c0ZpbGVzLm1hcChzZiA9PiBzZi5maWxlTmFtZSkpLFxuICAgICAgY2hhbmdlZFJlc291cmNlUGF0aHM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgY2hhbmdlZFRzUGF0aHM6IG5ldyBTZXQ8c3RyaW5nPigpLFxuICAgICAgbGFzdEdvb2Q6IG51bGwsXG4gICAgfTtcblxuICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxEcml2ZXIoXG4gICAgICAgIHN0YXRlLCBuZXcgU2V0KHRzRmlsZXMpLCBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpLCAvKiBsb2dpY2FsQ2hhbmdlcyAqLyBudWxsKTtcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyh0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc3RhdGUua2luZCAhPT0gQnVpbGRTdGF0ZUtpbmQuUGVuZGluZykge1xuICAgICAgLy8gQ2hhbmdlcyBoYXZlIGFscmVhZHkgYmVlbiBpbmNvcnBvcmF0ZWQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGVuZGluZ0VtaXQgPSB0aGlzLnN0YXRlLnBlbmRpbmdFbWl0O1xuXG4gICAgY29uc3Qgc3RhdGU6IFBlbmRpbmdCdWlsZFN0YXRlID0gdGhpcy5zdGF0ZTtcblxuICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy5hbGxUc0ZpbGVzKSB7XG4gICAgICBpZiAodGhpcy5kZXBHcmFwaC5pc1N0YWxlKHNmLCBzdGF0ZS5jaGFuZ2VkVHNQYXRocywgc3RhdGUuY2hhbmdlZFJlc291cmNlUGF0aHMpKSB7XG4gICAgICAgIC8vIFNvbWV0aGluZyBoYXMgY2hhbmdlZCB3aGljaCByZXF1aXJlcyB0aGlzIGZpbGUgYmUgcmUtZW1pdHRlZC5cbiAgICAgICAgcGVuZGluZ0VtaXQuYWRkKHNmLmZpbGVOYW1lKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIHRvIGFuIGBBbmFseXplZEJ1aWxkU3RhdGVgLlxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBraW5kOiBCdWlsZFN0YXRlS2luZC5BbmFseXplZCxcbiAgICAgIHBlbmRpbmdFbWl0LFxuXG4gICAgICAvLyBTaW5jZSB0aGlzIGNvbXBpbGF0aW9uIHdhcyBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQsIHVwZGF0ZSB0aGUgXCJsYXN0IGdvb2RcIiBhcnRpZmFjdHMgdG8gdGhlXG4gICAgICAvLyBvbmVzIGZyb20gdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAgICBsYXN0R29vZDoge1xuICAgICAgICBkZXBHcmFwaDogdGhpcy5kZXBHcmFwaCxcbiAgICAgICAgdHJhaXRDb21waWxlcjogdHJhaXRDb21waWxlcixcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bEVtaXQoc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkIHsgdGhpcy5zdGF0ZS5wZW5kaW5nRW1pdC5kZWxldGUoc2YuZmlsZU5hbWUpOyB9XG5cbiAgc2FmZVRvU2tpcEVtaXQoc2Y6IHRzLlNvdXJjZUZpbGUpOiBib29sZWFuIHsgcmV0dXJuICF0aGlzLnN0YXRlLnBlbmRpbmdFbWl0LmhhcyhzZi5maWxlTmFtZSk7IH1cblxuICBwcmlvcldvcmtGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICh0aGlzLnN0YXRlLmxhc3RHb29kID09PSBudWxsIHx8IHRoaXMubG9naWNhbENoYW5nZXMgPT09IG51bGwpIHtcbiAgICAgIC8vIFRoZXJlIGlzIG5vIHByZXZpb3VzIGdvb2QgYnVpbGQsIHNvIG5vIHByaW9yIHdvcmsgZXhpc3RzLlxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmICh0aGlzLmxvZ2ljYWxDaGFuZ2VzLmhhcyhzZi5maWxlTmFtZSkpIHtcbiAgICAgIC8vIFByaW9yIHdvcmsgbWlnaHQgZXhpc3QsIGJ1dCB3b3VsZCBiZSBzdGFsZSBhcyB0aGUgZmlsZSBpbiBxdWVzdGlvbiBoYXMgbG9naWNhbGx5IGNoYW5nZWQuXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gUHJpb3Igd29yayBtaWdodCBleGlzdCwgYW5kIGlmIGl0IGRvZXMgdGhlbiBpdCdzIHVzYWJsZSFcbiAgICAgIHJldHVybiB0aGlzLnN0YXRlLmxhc3RHb29kLnRyYWl0Q29tcGlsZXIucmVjb3Jkc0ZvcihzZik7XG4gICAgfVxuICB9XG59XG5cbnR5cGUgQnVpbGRTdGF0ZSA9IFBlbmRpbmdCdWlsZFN0YXRlIHwgQW5hbHl6ZWRCdWlsZFN0YXRlO1xuXG5lbnVtIEJ1aWxkU3RhdGVLaW5kIHtcbiAgUGVuZGluZyxcbiAgQW5hbHl6ZWQsXG59XG5cbmludGVyZmFjZSBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kO1xuXG4gIC8qKlxuICAgKiBUaGUgaGVhcnQgb2YgaW5jcmVtZW50YWwgYnVpbGRzLiBUaGlzIGBTZXRgIHRyYWNrcyB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIG5lZWQgdG8gYmUgZW1pdHRlZFxuICAgKiBkdXJpbmcgdGhlIGN1cnJlbnQgY29tcGlsYXRpb24uXG4gICAqXG4gICAqIFRoaXMgc3RhcnRzIG91dCBhcyB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIGFyZSBzdGlsbCBwZW5kaW5nIGZyb20gdGhlIHByZXZpb3VzIHByb2dyYW0gKG9yIHRoZVxuICAgKiBmdWxsIHNldCBvZiAudHMgZmlsZXMgb24gYSBmcmVzaCBidWlsZCkuXG4gICAqXG4gICAqIEFmdGVyIGFuYWx5c2lzLCBpdCdzIHVwZGF0ZWQgdG8gaW5jbHVkZSBhbnkgZmlsZXMgd2hpY2ggbWlnaHQgaGF2ZSBjaGFuZ2VkIGFuZCBuZWVkIGEgcmUtZW1pdFxuICAgKiBhcyBhIHJlc3VsdCBvZiBpbmNyZW1lbnRhbCBjaGFuZ2VzLlxuICAgKlxuICAgKiBJZiBhbiBlbWl0IGhhcHBlbnMsIGFueSB3cml0dGVuIGZpbGVzIGFyZSByZW1vdmVkIGZyb20gdGhlIGBTZXRgLCBhcyB0aGV5J3JlIG5vIGxvbmdlciBwZW5kaW5nLlxuICAgKlxuICAgKiBUaHVzLCBhZnRlciBjb21waWxhdGlvbiBgcGVuZGluZ0VtaXRgIHNob3VsZCBiZSBlbXB0eSAob24gYSBzdWNjZXNzZnVsIGJ1aWxkKSBvciBjb250YWluIHRoZVxuICAgKiBmaWxlcyB3aGljaCBzdGlsbCBuZWVkIHRvIGJlIGVtaXR0ZWQgYnV0IGhhdmUgbm90IHlldCBiZWVuIChkdWUgdG8gZXJyb3JzKS5cbiAgICpcbiAgICogYHBlbmRpbmdFbWl0YCBpcyB0cmFja2VkIGFzIGFzIGBTZXQ8c3RyaW5nPmAgaW5zdGVhZCBvZiBhIGBTZXQ8dHMuU291cmNlRmlsZT5gLCBiZWNhdXNlIHRoZVxuICAgKiBjb250ZW50cyBvZiB0aGUgZmlsZSBhcmUgbm90IGltcG9ydGFudCBoZXJlLCBvbmx5IHdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50IHZlcnNpb24gb2YgaXRcbiAgICogbmVlZHMgdG8gYmUgZW1pdHRlZC4gVGhlIGBzdHJpbmdgcyBoZXJlIGFyZSBUUyBmaWxlIHBhdGhzLlxuICAgKlxuICAgKiBTZWUgdGhlIFJFQURNRS5tZCBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGlzIGFsZ29yaXRobS5cbiAgICovXG4gIHBlbmRpbmdFbWl0OiBTZXQ8c3RyaW5nPjtcblxuXG4gIC8qKlxuICAgKiBTcGVjaWZpYyBhc3BlY3RzIG9mIHRoZSBsYXN0IGNvbXBpbGF0aW9uIHdoaWNoIHN1Y2Nlc3NmdWxseSBjb21wbGV0ZWQgYW5hbHlzaXMsIGlmIGFueS5cbiAgICovXG4gIGxhc3RHb29kOiB7XG4gICAgLyoqXG4gICAgICogVGhlIGRlcGVuZGVuY3kgZ3JhcGggZnJvbSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBsb2dpY2FsIGltcGFjdCBvZiBwaHlzaWNhbCBmaWxlIGNoYW5nZXMuXG4gICAgICovXG4gICAgZGVwR3JhcGg6IEZpbGVEZXBlbmRlbmN5R3JhcGg7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYFRyYWl0Q29tcGlsZXJgIGZyb20gdGhlIGxhc3Qgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGJ1aWxkLlxuICAgICAqXG4gICAgICogVGhpcyBpcyB1c2VkIHRvIGV4dHJhY3QgXCJwcmlvciB3b3JrXCIgd2hpY2ggbWlnaHQgYmUgcmV1c2FibGUgaW4gdGhpcyBjb21waWxhdGlvbi5cbiAgICAgKi9cbiAgICB0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyO1xuICB9fG51bGw7XG59XG5cbi8qKlxuICogU3RhdGUgb2YgYSBidWlsZCBiZWZvcmUgdGhlIEFuZ3VsYXIgYW5hbHlzaXMgcGhhc2UgY29tcGxldGVzLlxuICovXG5pbnRlcmZhY2UgUGVuZGluZ0J1aWxkU3RhdGUgZXh0ZW5kcyBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLlBlbmRpbmc7XG5cbiAgLyoqXG4gICAqIFNldCBvZiBmaWxlcyB3aGljaCBhcmUga25vd24gdG8gbmVlZCBhbiBlbWl0LlxuICAgKlxuICAgKiBCZWZvcmUgdGhlIGNvbXBpbGVyJ3MgYW5hbHlzaXMgcGhhc2UgY29tcGxldGVzLCBgcGVuZGluZ0VtaXRgIG9ubHkgY29udGFpbnMgZmlsZXMgdGhhdCB3ZXJlXG4gICAqIHN0aWxsIHBlbmRpbmcgYWZ0ZXIgdGhlIHByZXZpb3VzIGJ1aWxkLlxuICAgKi9cbiAgcGVuZGluZ0VtaXQ6IFNldDxzdHJpbmc+O1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgVHlwZVNjcmlwdCBmaWxlIHBhdGhzIHdoaWNoIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBjaGFuZ2VkVHNQYXRoczogU2V0PHN0cmluZz47XG5cbiAgLyoqXG4gICAqIFNldCBvZiByZXNvdXJjZSBmaWxlIHBhdGhzIHdoaWNoIGhhdmUgY2hhbmdlZCBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBjaGFuZ2VkUmVzb3VyY2VQYXRoczogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBBbmFseXplZEJ1aWxkU3RhdGUgZXh0ZW5kcyBCYXNlQnVpbGRTdGF0ZSB7XG4gIGtpbmQ6IEJ1aWxkU3RhdGVLaW5kLkFuYWx5emVkO1xuXG4gIC8qKlxuICAgKiBTZXQgb2YgZmlsZXMgd2hpY2ggYXJlIGtub3duIHRvIG5lZWQgYW4gZW1pdC5cbiAgICpcbiAgICogQWZ0ZXIgYW5hbHlzaXMgY29tcGxldGVzICh0aGF0IGlzLCB0aGUgc3RhdGUgdHJhbnNpdGlvbnMgdG8gYEFuYWx5emVkQnVpbGRTdGF0ZWApLCB0aGVcbiAgICogYHBlbmRpbmdFbWl0YCBzZXQgdGFrZXMgaW50byBhY2NvdW50IGFueSBvbi1kaXNrIGNoYW5nZXMgbWFkZSBzaW5jZSB0aGUgbGFzdCBzdWNjZXNzZnVsbHlcbiAgICogYW5hbHl6ZWQgYnVpbGQuXG4gICAqL1xuICBwZW5kaW5nRW1pdDogU2V0PHN0cmluZz47XG59XG5cbmZ1bmN0aW9uIHRzT25seUZpbGVzKHByb2dyYW06IHRzLlByb2dyYW0pOiBSZWFkb25seUFycmF5PHRzLlNvdXJjZUZpbGU+IHtcbiAgcmV0dXJuIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5maWx0ZXIoc2YgPT4gIXNmLmlzRGVjbGFyYXRpb25GaWxlKTtcbn1cbiJdfQ==