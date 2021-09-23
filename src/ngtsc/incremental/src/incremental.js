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
        define("@angular/compiler-cli/src/ngtsc/incremental/src/incremental", ["require", "exports", "tslib", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/perf", "@angular/compiler-cli/src/ngtsc/program_driver", "@angular/compiler-cli/src/ngtsc/util/src/typescript", "@angular/compiler-cli/src/ngtsc/incremental/semantic_graph", "@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking", "@angular/compiler-cli/src/ngtsc/incremental/src/state"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IncrementalCompilation = void 0;
    var tslib_1 = require("tslib");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var perf_1 = require("@angular/compiler-cli/src/ngtsc/perf");
    var program_driver_1 = require("@angular/compiler-cli/src/ngtsc/program_driver");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    var semantic_graph_1 = require("@angular/compiler-cli/src/ngtsc/incremental/semantic_graph");
    var dependency_tracking_1 = require("@angular/compiler-cli/src/ngtsc/incremental/src/dependency_tracking");
    var state_1 = require("@angular/compiler-cli/src/ngtsc/incremental/src/state");
    /**
     * Discriminant of the `Phase` type union.
     */
    var PhaseKind;
    (function (PhaseKind) {
        PhaseKind[PhaseKind["Analysis"] = 0] = "Analysis";
        PhaseKind[PhaseKind["TypeCheckAndEmit"] = 1] = "TypeCheckAndEmit";
    })(PhaseKind || (PhaseKind = {}));
    /**
     * Manages the incremental portion of an Angular compilation, allowing for reuse of a prior
     * compilation if available, and producing an output state for reuse of the current compilation in a
     * future one.
     */
    var IncrementalCompilation = /** @class */ (function () {
        function IncrementalCompilation(state, depGraph, versions, step) {
            this.depGraph = depGraph;
            this.versions = versions;
            this.step = step;
            this._state = state;
            // The compilation begins in analysis phase.
            this.phase = {
                kind: PhaseKind.Analysis,
                semanticDepGraphUpdater: new semantic_graph_1.SemanticDepGraphUpdater(step !== null ? step.priorState.semanticDepGraph : null),
            };
        }
        /**
         * Begin a fresh `IncrementalCompilation`.
         */
        IncrementalCompilation.fresh = function (program, versions) {
            var state = {
                kind: state_1.IncrementalStateKind.Fresh,
            };
            return new IncrementalCompilation(state, new dependency_tracking_1.FileDependencyGraph(), versions, /* reuse */ null);
        };
        IncrementalCompilation.incremental = function (program, newVersions, oldProgram, oldState, modifiedResourceFiles, perf) {
            return perf.inPhase(perf_1.PerfPhase.Reconciliation, function () {
                var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
                var physicallyChangedTsFiles = new Set();
                var changedResourceFiles = new Set(modifiedResourceFiles !== null && modifiedResourceFiles !== void 0 ? modifiedResourceFiles : []);
                var priorAnalysis;
                switch (oldState.kind) {
                    case state_1.IncrementalStateKind.Fresh:
                        // Since this line of program has never been successfully analyzed to begin with, treat
                        // this as a fresh compilation.
                        return IncrementalCompilation.fresh(program, newVersions);
                    case state_1.IncrementalStateKind.Analyzed:
                        // The most recent program was analyzed successfully, so we can use that as our prior
                        // state and don't need to consider any other deltas except changes in the most recent
                        // program.
                        priorAnalysis = oldState;
                        break;
                    case state_1.IncrementalStateKind.Delta:
                        // There is an ancestor program which was analyzed successfully and can be used as a
                        // starting point, but we need to determine what's changed since that program.
                        priorAnalysis = oldState.lastAnalyzedState;
                        try {
                            for (var _f = (0, tslib_1.__values)(oldState.physicallyChangedTsFiles), _g = _f.next(); !_g.done; _g = _f.next()) {
                                var sfPath = _g.value;
                                physicallyChangedTsFiles.add(sfPath);
                            }
                        }
                        catch (e_1_1) { e_1 = { error: e_1_1 }; }
                        finally {
                            try {
                                if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
                            }
                            finally { if (e_1) throw e_1.error; }
                        }
                        try {
                            for (var _h = (0, tslib_1.__values)(oldState.changedResourceFiles), _j = _h.next(); !_j.done; _j = _h.next()) {
                                var resourcePath = _j.value;
                                changedResourceFiles.add(resourcePath);
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_j && !_j.done && (_b = _h.return)) _b.call(_h);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        break;
                }
                var oldVersions = priorAnalysis.versions;
                var oldFilesArray = oldProgram.getSourceFiles().map(toOriginalSourceFile);
                var oldFiles = new Set(oldFilesArray);
                var deletedTsFiles = new Set(oldFilesArray.map(function (sf) { return (0, file_system_1.absoluteFromSourceFile)(sf); }));
                try {
                    for (var _k = (0, tslib_1.__values)(program.getSourceFiles()), _l = _k.next(); !_l.done; _l = _k.next()) {
                        var possiblyRedirectedNewFile = _l.value;
                        var sf = toOriginalSourceFile(possiblyRedirectedNewFile);
                        var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
                        // Since we're seeing a file in the incoming program with this name, it can't have been
                        // deleted.
                        deletedTsFiles.delete(sfPath);
                        if (oldFiles.has(sf)) {
                            // This source file has the same object identity as in the previous program. We need to
                            // determine if it's really the same file, or if it might have changed versions since the
                            // last program without changing its identity.
                            // If there's no version information available, then this is the same file, and we can
                            // skip it.
                            if (oldVersions === null || newVersions === null) {
                                continue;
                            }
                            // If a version is available for the file from both the prior and the current program, and
                            // that version is the same, then this is the same file, and we can skip it.
                            if (oldVersions.has(sfPath) && newVersions.has(sfPath) &&
                                oldVersions.get(sfPath) === newVersions.get(sfPath)) {
                                continue;
                            }
                            // Otherwise, assume that the file has changed. Either its versions didn't match, or we
                            // were missing version information about it on one side for some reason.
                        }
                        // Bail out if a .d.ts file changes - the semantic dep graph is not able to process such
                        // changes correctly yet.
                        if (sf.isDeclarationFile) {
                            return IncrementalCompilation.fresh(program, newVersions);
                        }
                        // The file has changed physically, so record it.
                        physicallyChangedTsFiles.add(sfPath);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_l && !_l.done && (_c = _k.return)) _c.call(_k);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                try {
                    // Remove any files that have been deleted from the list of physical changes.
                    for (var deletedTsFiles_1 = (0, tslib_1.__values)(deletedTsFiles), deletedTsFiles_1_1 = deletedTsFiles_1.next(); !deletedTsFiles_1_1.done; deletedTsFiles_1_1 = deletedTsFiles_1.next()) {
                        var deletedFileName = deletedTsFiles_1_1.value;
                        physicallyChangedTsFiles.delete((0, file_system_1.resolve)(deletedFileName));
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (deletedTsFiles_1_1 && !deletedTsFiles_1_1.done && (_d = deletedTsFiles_1.return)) _d.call(deletedTsFiles_1);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                // Use the prior dependency graph to project physical changes into a set of logically changed
                // files.
                var depGraph = new dependency_tracking_1.FileDependencyGraph();
                var logicallyChangedTsFiles = depGraph.updateWithPhysicalChanges(priorAnalysis.depGraph, physicallyChangedTsFiles, deletedTsFiles, changedResourceFiles);
                try {
                    // Physically changed files aren't necessarily counted as logically changed by the dependency
                    // graph (files do not have edges to themselves), so add them to the logical changes
                    // explicitly.
                    for (var physicallyChangedTsFiles_1 = (0, tslib_1.__values)(physicallyChangedTsFiles), physicallyChangedTsFiles_1_1 = physicallyChangedTsFiles_1.next(); !physicallyChangedTsFiles_1_1.done; physicallyChangedTsFiles_1_1 = physicallyChangedTsFiles_1.next()) {
                        var sfPath = physicallyChangedTsFiles_1_1.value;
                        logicallyChangedTsFiles.add(sfPath);
                    }
                }
                catch (e_5_1) { e_5 = { error: e_5_1 }; }
                finally {
                    try {
                        if (physicallyChangedTsFiles_1_1 && !physicallyChangedTsFiles_1_1.done && (_e = physicallyChangedTsFiles_1.return)) _e.call(physicallyChangedTsFiles_1);
                    }
                    finally { if (e_5) throw e_5.error; }
                }
                // Start off in a `DeltaIncrementalState` as a delta against the previous successful analysis,
                // until this compilation completes its own analysis.
                var state = {
                    kind: state_1.IncrementalStateKind.Delta,
                    physicallyChangedTsFiles: physicallyChangedTsFiles,
                    changedResourceFiles: changedResourceFiles,
                    lastAnalyzedState: priorAnalysis,
                };
                return new IncrementalCompilation(state, depGraph, newVersions, {
                    priorState: priorAnalysis,
                    logicallyChangedTsFiles: logicallyChangedTsFiles,
                });
            });
        };
        Object.defineProperty(IncrementalCompilation.prototype, "state", {
            get: function () {
                return this._state;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(IncrementalCompilation.prototype, "semanticDepGraphUpdater", {
            get: function () {
                if (this.phase.kind !== PhaseKind.Analysis) {
                    throw new Error("AssertionError: Cannot update the SemanticDepGraph after analysis completes");
                }
                return this.phase.semanticDepGraphUpdater;
            },
            enumerable: false,
            configurable: true
        });
        IncrementalCompilation.prototype.recordSuccessfulAnalysis = function (traitCompiler) {
            var e_6, _a, e_7, _b;
            if (this.phase.kind !== PhaseKind.Analysis) {
                throw new Error("AssertionError: Incremental compilation in phase " + PhaseKind[this.phase.kind] + ", expected Analysis");
            }
            var _c = this.phase.semanticDepGraphUpdater.finalize(), needsEmit = _c.needsEmit, needsTypeCheckEmit = _c.needsTypeCheckEmit, newGraph = _c.newGraph;
            // Determine the set of files which have already been emitted.
            var emitted;
            if (this.step === null) {
                // Since there is no prior compilation, no files have yet been emitted.
                emitted = new Set();
            }
            else {
                // Begin with the files emitted by the prior successful compilation, but remove those which we
                // know need to bee re-emitted.
                emitted = new Set(this.step.priorState.emitted);
                try {
                    // Files need re-emitted if they've logically changed.
                    for (var _d = (0, tslib_1.__values)(this.step.logicallyChangedTsFiles), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var sfPath = _e.value;
                        emitted.delete(sfPath);
                    }
                }
                catch (e_6_1) { e_6 = { error: e_6_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                    }
                    finally { if (e_6) throw e_6.error; }
                }
                try {
                    // Files need re-emitted if they've semantically changed.
                    for (var needsEmit_1 = (0, tslib_1.__values)(needsEmit), needsEmit_1_1 = needsEmit_1.next(); !needsEmit_1_1.done; needsEmit_1_1 = needsEmit_1.next()) {
                        var sfPath = needsEmit_1_1.value;
                        emitted.delete(sfPath);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (needsEmit_1_1 && !needsEmit_1_1.done && (_b = needsEmit_1.return)) _b.call(needsEmit_1);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
            }
            // Transition to a successfully analyzed compilation. At this point, a subsequent compilation
            // could use this state as a starting point.
            this._state = {
                kind: state_1.IncrementalStateKind.Analyzed,
                versions: this.versions,
                depGraph: this.depGraph,
                semanticDepGraph: newGraph,
                priorAnalysis: traitCompiler.getAnalyzedRecords(),
                typeCheckResults: null,
                emitted: emitted,
            };
            // We now enter the type-check and emit phase of compilation.
            this.phase = {
                kind: PhaseKind.TypeCheckAndEmit,
                needsEmit: needsEmit,
                needsTypeCheckEmit: needsTypeCheckEmit,
            };
        };
        IncrementalCompilation.prototype.recordSuccessfulTypeCheck = function (results) {
            if (this._state.kind !== state_1.IncrementalStateKind.Analyzed) {
                throw new Error("AssertionError: Expected successfully analyzed compilation.");
            }
            else if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
                throw new Error("AssertionError: Incremental compilation in phase " + PhaseKind[this.phase.kind] + ", expected TypeCheck");
            }
            this._state.typeCheckResults = results;
        };
        IncrementalCompilation.prototype.recordSuccessfulEmit = function (sf) {
            if (this._state.kind !== state_1.IncrementalStateKind.Analyzed) {
                throw new Error("AssertionError: Expected successfully analyzed compilation.");
            }
            this._state.emitted.add((0, file_system_1.absoluteFromSourceFile)(sf));
        };
        IncrementalCompilation.prototype.priorAnalysisFor = function (sf) {
            if (this.step === null) {
                return null;
            }
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            // If the file has logically changed, its previous analysis cannot be reused.
            if (this.step.logicallyChangedTsFiles.has(sfPath)) {
                return null;
            }
            var priorAnalysis = this.step.priorState.priorAnalysis;
            if (!priorAnalysis.has(sf)) {
                return null;
            }
            return priorAnalysis.get(sf);
        };
        IncrementalCompilation.prototype.priorTypeCheckingResultsFor = function (sf) {
            if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
                throw new Error("AssertionError: Expected successfully analyzed compilation.");
            }
            if (this.step === null) {
                return null;
            }
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            // If the file has logically changed, or its template type-checking results have semantically
            // changed, then past type-checking results cannot be reused.
            if (this.step.logicallyChangedTsFiles.has(sfPath) ||
                this.phase.needsTypeCheckEmit.has(sfPath)) {
                return null;
            }
            // Past results also cannot be reused if they're not available.
            if (this.step.priorState.typeCheckResults === null ||
                !this.step.priorState.typeCheckResults.has(sfPath)) {
                return null;
            }
            var priorResults = this.step.priorState.typeCheckResults.get(sfPath);
            // If the past results relied on inlining, they're not safe for reuse.
            if (priorResults.hasInlines) {
                return null;
            }
            return priorResults;
        };
        IncrementalCompilation.prototype.safeToSkipEmit = function (sf) {
            // If this is a fresh compilation, it's never safe to skip an emit.
            if (this.step === null) {
                return false;
            }
            var sfPath = (0, file_system_1.absoluteFromSourceFile)(sf);
            // If the file has itself logically changed, it must be emitted.
            if (this.step.logicallyChangedTsFiles.has(sfPath)) {
                return false;
            }
            if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
                throw new Error("AssertionError: Expected successful analysis before attempting to emit files");
            }
            // If during analysis it was determined that this file has semantically changed, it must be
            // emitted.
            if (this.phase.needsEmit.has(sfPath)) {
                return false;
            }
            // Generally it should be safe to assume here that the file was previously emitted by the last
            // successful compilation. However, as a defense-in-depth against incorrectness, we explicitly
            // check that the last emit included this file, and re-emit it otherwise.
            return this.step.priorState.emitted.has(sfPath);
        };
        return IncrementalCompilation;
    }());
    exports.IncrementalCompilation = IncrementalCompilation;
    /**
     * To accurately detect whether a source file was affected during an incremental rebuild, the
     * "original" source file needs to be consistently used.
     *
     * First, TypeScript may have created source file redirects when declaration files of the same
     * version of a library are included multiple times. The non-redirected source file should be used
     * to detect changes, as otherwise the redirected source files cause a mismatch when compared to
     * a prior program.
     *
     * Second, the program that is used for template type checking may contain mutated source files, if
     * inline type constructors or inline template type-check blocks had to be used. Such source files
     * store their original, non-mutated source file from the original program in a symbol. For
     * computing the affected files in an incremental build this original source file should be used, as
     * the mutated source file would always be considered affected.
     */
    function toOriginalSourceFile(sf) {
        var unredirectedSf = (0, typescript_1.toUnredirectedSourceFile)(sf);
        var originalFile = unredirectedSf[program_driver_1.NgOriginalFile];
        if (originalFile !== undefined) {
            return originalFile;
        }
        else {
            return unredirectedSf;
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5jcmVtZW50YWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9pbmNyZW1lbnRhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBSUgsMkVBQWtGO0lBQ2xGLDZEQUFtRDtJQUNuRCxpRkFBcUY7SUFHckYsa0ZBQW1FO0lBRW5FLDZGQUEwRDtJQUUxRCwyR0FBMEQ7SUFDMUQsK0VBQWdIO0lBV2hIOztPQUVHO0lBQ0gsSUFBSyxTQUdKO0lBSEQsV0FBSyxTQUFTO1FBQ1osaURBQVEsQ0FBQTtRQUNSLGlFQUFnQixDQUFBO0lBQ2xCLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0lBeUJEOzs7O09BSUc7SUFDSDtRQVdFLGdDQUNJLEtBQXVCLEVBQVcsUUFBNkIsRUFDdkQsUUFBMEMsRUFBVSxJQUEwQjtZQURwRCxhQUFRLEdBQVIsUUFBUSxDQUFxQjtZQUN2RCxhQUFRLEdBQVIsUUFBUSxDQUFrQztZQUFVLFNBQUksR0FBSixJQUFJLENBQXNCO1lBQ3hGLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1lBRXBCLDRDQUE0QztZQUM1QyxJQUFJLENBQUMsS0FBSyxHQUFHO2dCQUNYLElBQUksRUFBRSxTQUFTLENBQUMsUUFBUTtnQkFDeEIsdUJBQXVCLEVBQ25CLElBQUksd0NBQXVCLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2FBQ3pGLENBQUM7UUFDSixDQUFDO1FBRUQ7O1dBRUc7UUFDSSw0QkFBSyxHQUFaLFVBQWEsT0FBbUIsRUFBRSxRQUEwQztZQUUxRSxJQUFNLEtBQUssR0FBcUI7Z0JBQzlCLElBQUksRUFBRSw0QkFBb0Is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QSxxQ0FBd0IsRUFBQyxFQUFFLENBQUMsQ0FBQztRQUNwRCxJQUFNLFlBQVksR0FBSSxjQUFrRCxDQUFDLCtCQUFjLENBQUMsQ0FBQztRQUN6RixJQUFJLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDOUIsT0FBTyxZQUFZLENBQUM7U0FDckI7YUFBTTtZQUNMLE9BQU8sY0FBYyxDQUFDO1NBQ3ZCO0lBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBBYnNvbHV0ZUZzUGF0aCwgcmVzb2x2ZX0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtQZXJmUGhhc2UsIFBlcmZSZWNvcmRlcn0gZnJvbSAnLi4vLi4vcGVyZic7XG5pbXBvcnQge01heWJlU291cmNlRmlsZVdpdGhPcmlnaW5hbEZpbGUsIE5nT3JpZ2luYWxGaWxlfSBmcm9tICcuLi8uLi9wcm9ncmFtX2RyaXZlcic7XG5pbXBvcnQge0NsYXNzUmVjb3JkLCBUcmFpdENvbXBpbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuaW1wb3J0IHtGaWxlVHlwZUNoZWNraW5nRGF0YX0gZnJvbSAnLi4vLi4vdHlwZWNoZWNrJztcbmltcG9ydCB7dG9VbnJlZGlyZWN0ZWRTb3VyY2VGaWxlfSBmcm9tICcuLi8uLi91dGlsL3NyYy90eXBlc2NyaXB0JztcbmltcG9ydCB7SW5jcmVtZW50YWxCdWlsZH0gZnJvbSAnLi4vYXBpJztcbmltcG9ydCB7U2VtYW50aWNEZXBHcmFwaFVwZGF0ZXJ9IGZyb20gJy4uL3NlbWFudGljX2dyYXBoJztcblxuaW1wb3J0IHtGaWxlRGVwZW5kZW5jeUdyYXBofSBmcm9tICcuL2RlcGVuZGVuY3lfdHJhY2tpbmcnO1xuaW1wb3J0IHtBbmFseXplZEluY3JlbWVudGFsU3RhdGUsIERlbHRhSW5jcmVtZW50YWxTdGF0ZSwgSW5jcmVtZW50YWxTdGF0ZSwgSW5jcmVtZW50YWxTdGF0ZUtpbmR9IGZyb20gJy4vc3RhdGUnO1xuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IHRoZSBwcmV2aW91cyBjb21waWxhdGlvbiBiZWluZyB1c2VkIGFzIGEgc3RhcnRpbmcgcG9pbnQgZm9yIHRoZSBjdXJyZW50IG9uZSxcbiAqIGluY2x1ZGluZyB0aGUgZGVsdGEgb2YgZmlsZXMgd2hpY2ggaGF2ZSBsb2dpY2FsbHkgY2hhbmdlZCBhbmQgbmVlZCB0byBiZSByZWFuYWx5emVkLlxuICovXG5pbnRlcmZhY2UgSW5jcmVtZW50YWxTdGVwIHtcbiAgcHJpb3JTdGF0ZTogQW5hbHl6ZWRJbmNyZW1lbnRhbFN0YXRlO1xuICBsb2dpY2FsbHlDaGFuZ2VkVHNGaWxlczogU2V0PEFic29sdXRlRnNQYXRoPjtcbn1cblxuLyoqXG4gKiBEaXNjcmltaW5hbnQgb2YgdGhlIGBQaGFzZWAgdHlwZSB1bmlvbi5cbiAqL1xuZW51bSBQaGFzZUtpbmQge1xuICBBbmFseXNpcyxcbiAgVHlwZUNoZWNrQW5kRW1pdCxcbn1cblxuLyoqXG4gKiBBbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiB1bmRlcmdvaW5nIGFuYWx5c2lzLCBhbmQgYnVpbGRpbmcgYSBzZW1hbnRpYyBkZXBlbmRlbmN5IGdyYXBoLlxuICovXG5pbnRlcmZhY2UgQW5hbHlzaXNQaGFzZSB7XG4gIGtpbmQ6IFBoYXNlS2luZC5BbmFseXNpcztcbiAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xufVxuXG4vKipcbiAqIEFuIGluY3JlbWVudGFsIGNvbXBpbGF0aW9uIHRoYXQgY29tcGxldGVkIGFuYWx5c2lzIGFuZCBpcyB1bmRlcmdvaW5nIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgYW5kXG4gKiBlbWl0LlxuICovXG5pbnRlcmZhY2UgVHlwZUNoZWNrQW5kRW1pdFBoYXNlIHtcbiAga2luZDogUGhhc2VLaW5kLlR5cGVDaGVja0FuZEVtaXQ7XG4gIG5lZWRzRW1pdDogU2V0PEFic29sdXRlRnNQYXRoPjtcbiAgbmVlZHNUeXBlQ2hlY2tFbWl0OiBTZXQ8QWJzb2x1dGVGc1BhdGg+O1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGN1cnJlbnQgcGhhc2Ugb2YgYSBjb21waWxhdGlvbi5cbiAqL1xudHlwZSBQaGFzZSA9IEFuYWx5c2lzUGhhc2V8VHlwZUNoZWNrQW5kRW1pdFBoYXNlO1xuXG4vKipcbiAqIE1hbmFnZXMgdGhlIGluY3JlbWVudGFsIHBvcnRpb24gb2YgYW4gQW5ndWxhciBjb21waWxhdGlvbiwgYWxsb3dpbmcgZm9yIHJldXNlIG9mIGEgcHJpb3JcbiAqIGNvbXBpbGF0aW9uIGlmIGF2YWlsYWJsZSwgYW5kIHByb2R1Y2luZyBhbiBvdXRwdXQgc3RhdGUgZm9yIHJldXNlIG9mIHRoZSBjdXJyZW50IGNvbXBpbGF0aW9uIGluIGFcbiAqIGZ1dHVyZSBvbmUuXG4gKi9cbmV4cG9ydCBjbGFzcyBJbmNyZW1lbnRhbENvbXBpbGF0aW9uIGltcGxlbWVudHMgSW5jcmVtZW50YWxCdWlsZDxDbGFzc1JlY29yZCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+IHtcbiAgcHJpdmF0ZSBwaGFzZTogUGhhc2U7XG5cbiAgLyoqXG4gICAqIGBJbmNyZW1lbnRhbFN0YXRlYCBvZiB0aGlzIGNvbXBpbGF0aW9uIGlmIGl0IHdlcmUgdG8gYmUgcmV1c2VkIGluIGEgc3Vic2VxdWVudCBpbmNyZW1lbnRhbFxuICAgKiBjb21waWxhdGlvbiBhdCB0aGUgY3VycmVudCBtb21lbnQuXG4gICAqXG4gICAqIEV4cG9zZWQgdmlhIHRoZSBgc3RhdGVgIHJlYWQtb25seSBnZXR0ZXIuXG4gICAqL1xuICBwcml2YXRlIF9zdGF0ZTogSW5jcmVtZW50YWxTdGF0ZTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgICAgc3RhdGU6IEluY3JlbWVudGFsU3RhdGUsIHJlYWRvbmx5IGRlcEdyYXBoOiBGaWxlRGVwZW5kZW5jeUdyYXBoLFxuICAgICAgcHJpdmF0ZSB2ZXJzaW9uczogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+fG51bGwsIHByaXZhdGUgc3RlcDogSW5jcmVtZW50YWxTdGVwfG51bGwpIHtcbiAgICB0aGlzLl9zdGF0ZSA9IHN0YXRlO1xuXG4gICAgLy8gVGhlIGNvbXBpbGF0aW9uIGJlZ2lucyBpbiBhbmFseXNpcyBwaGFzZS5cbiAgICB0aGlzLnBoYXNlID0ge1xuICAgICAga2luZDogUGhhc2VLaW5kLkFuYWx5c2lzLFxuICAgICAgc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXI6XG4gICAgICAgICAgbmV3IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyKHN0ZXAgIT09IG51bGwgPyBzdGVwLnByaW9yU3RhdGUuc2VtYW50aWNEZXBHcmFwaCA6IG51bGwpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQmVnaW4gYSBmcmVzaCBgSW5jcmVtZW50YWxDb21waWxhdGlvbmAuXG4gICAqL1xuICBzdGF0aWMgZnJlc2gocHJvZ3JhbTogdHMuUHJvZ3JhbSwgdmVyc2lvbnM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPnxudWxsKTpcbiAgICAgIEluY3JlbWVudGFsQ29tcGlsYXRpb24ge1xuICAgIGNvbnN0IHN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlID0ge1xuICAgICAga2luZDogSW5jcmVtZW50YWxTdGF0ZUtpbmQuRnJlc2gsXG4gICAgfTtcbiAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsQ29tcGlsYXRpb24oc3RhdGUsIG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCksIHZlcnNpb25zLCAvKiByZXVzZSAqLyBudWxsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbmNyZW1lbnRhbChcbiAgICAgIHByb2dyYW06IHRzLlByb2dyYW0sIG5ld1ZlcnNpb25zOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz58bnVsbCwgb2xkUHJvZ3JhbTogdHMuUHJvZ3JhbSxcbiAgICAgIG9sZFN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLCBtb2RpZmllZFJlc291cmNlRmlsZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD58bnVsbCxcbiAgICAgIHBlcmY6IFBlcmZSZWNvcmRlcik6IEluY3JlbWVudGFsQ29tcGlsYXRpb24ge1xuICAgIHJldHVybiBwZXJmLmluUGhhc2UoUGVyZlBoYXNlLlJlY29uY2lsaWF0aW9uLCAoKSA9PiB7XG4gICAgICBjb25zdCBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPigpO1xuICAgICAgY29uc3QgY2hhbmdlZFJlc291cmNlRmlsZXMgPSBuZXcgU2V0PEFic29sdXRlRnNQYXRoPihtb2RpZmllZFJlc291cmNlRmlsZXMgPz8gW10pO1xuXG5cbiAgICAgIGxldCBwcmlvckFuYWx5c2lzOiBBbmFseXplZEluY3JlbWVudGFsU3RhdGU7XG4gICAgICBzd2l0Y2ggKG9sZFN0YXRlLmtpbmQpIHtcbiAgICAgICAgY2FzZSBJbmNyZW1lbnRhbFN0YXRlS2luZC5GcmVzaDpcbiAgICAgICAgICAvLyBTaW5jZSB0aGlzIGxpbmUgb2YgcHJvZ3JhbSBoYXMgbmV2ZXIgYmVlbiBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgdG8gYmVnaW4gd2l0aCwgdHJlYXRcbiAgICAgICAgICAvLyB0aGlzIGFzIGEgZnJlc2ggY29tcGlsYXRpb24uXG4gICAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsQ29tcGlsYXRpb24uZnJlc2gocHJvZ3JhbSwgbmV3VmVyc2lvbnMpO1xuICAgICAgICBjYXNlIEluY3JlbWVudGFsU3RhdGVLaW5kLkFuYWx5emVkOlxuICAgICAgICAgIC8vIFRoZSBtb3N0IHJlY2VudCBwcm9ncmFtIHdhcyBhbmFseXplZCBzdWNjZXNzZnVsbHksIHNvIHdlIGNhbiB1c2UgdGhhdCBhcyBvdXIgcHJpb3JcbiAgICAgICAgICAvLyBzdGF0ZSBhbmQgZG9uJ3QgbmVlZCB0byBjb25zaWRlciBhbnkgb3RoZXIgZGVsdGFzIGV4Y2VwdCBjaGFuZ2VzIGluIHRoZSBtb3N0IHJlY2VudFxuICAgICAgICAgIC8vIHByb2dyYW0uXG4gICAgICAgICAgcHJpb3JBbmFseXNpcyA9IG9sZFN0YXRlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEluY3JlbWVudGFsU3RhdGVLaW5kLkRlbHRhOlxuICAgICAgICAgIC8vIFRoZXJlIGlzIGFuIGFuY2VzdG9yIHByb2dyYW0gd2hpY2ggd2FzIGFuYWx5emVkIHN1Y2Nlc3NmdWxseSBhbmQgY2FuIGJlIHVzZWQgYXMgYVxuICAgICAgICAgIC8vIHN0YXJ0aW5nIHBvaW50LCBidXQgd2UgbmVlZCB0byBkZXRlcm1pbmUgd2hhdCdzIGNoYW5nZWQgc2luY2UgdGhhdCBwcm9ncmFtLlxuICAgICAgICAgIHByaW9yQW5hbHlzaXMgPSBvbGRTdGF0ZS5sYXN0QW5hbHl6ZWRTdGF0ZTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHNmUGF0aCBvZiBvbGRTdGF0ZS5waHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMpIHtcbiAgICAgICAgICAgIHBoeXNpY2FsbHlDaGFuZ2VkVHNGaWxlcy5hZGQoc2ZQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZm9yIChjb25zdCByZXNvdXJjZVBhdGggb2Ygb2xkU3RhdGUuY2hhbmdlZFJlc291cmNlRmlsZXMpIHtcbiAgICAgICAgICAgIGNoYW5nZWRSZXNvdXJjZUZpbGVzLmFkZChyZXNvdXJjZVBhdGgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb2xkVmVyc2lvbnMgPSBwcmlvckFuYWx5c2lzLnZlcnNpb25zO1xuXG4gICAgICBjb25zdCBvbGRGaWxlc0FycmF5ID0gb2xkUHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLm1hcCh0b09yaWdpbmFsU291cmNlRmlsZSk7XG4gICAgICBjb25zdCBvbGRGaWxlcyA9IG5ldyBTZXQob2xkRmlsZXNBcnJheSk7XG4gICAgICBjb25zdCBkZWxldGVkVHNGaWxlcyA9IG5ldyBTZXQob2xkRmlsZXNBcnJheS5tYXAoc2YgPT4gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZikpKTtcblxuICAgICAgZm9yIChjb25zdCBwb3NzaWJseVJlZGlyZWN0ZWROZXdGaWxlIG9mIHByb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICBjb25zdCBzZiA9IHRvT3JpZ2luYWxTb3VyY2VGaWxlKHBvc3NpYmx5UmVkaXJlY3RlZE5ld0ZpbGUpO1xuICAgICAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcbiAgICAgICAgLy8gU2luY2Ugd2UncmUgc2VlaW5nIGEgZmlsZSBpbiB0aGUgaW5jb21pbmcgcHJvZ3JhbSB3aXRoIHRoaXMgbmFtZSwgaXQgY2FuJ3QgaGF2ZSBiZWVuXG4gICAgICAgIC8vIGRlbGV0ZWQuXG4gICAgICAgIGRlbGV0ZWRUc0ZpbGVzLmRlbGV0ZShzZlBhdGgpO1xuXG4gICAgICAgIGlmIChvbGRGaWxlcy5oYXMoc2YpKSB7XG4gICAgICAgICAgLy8gVGhpcyBzb3VyY2UgZmlsZSBoYXMgdGhlIHNhbWUgb2JqZWN0IGlkZW50aXR5IGFzIGluIHRoZSBwcmV2aW91cyBwcm9ncmFtLiBXZSBuZWVkIHRvXG4gICAgICAgICAgLy8gZGV0ZXJtaW5lIGlmIGl0J3MgcmVhbGx5IHRoZSBzYW1lIGZpbGUsIG9yIGlmIGl0IG1pZ2h0IGhhdmUgY2hhbmdlZCB2ZXJzaW9ucyBzaW5jZSB0aGVcbiAgICAgICAgICAvLyBsYXN0IHByb2dyYW0gd2l0aG91dCBjaGFuZ2luZyBpdHMgaWRlbnRpdHkuXG5cbiAgICAgICAgICAvLyBJZiB0aGVyZSdzIG5vIHZlcnNpb24gaW5mb3JtYXRpb24gYXZhaWxhYmxlLCB0aGVuIHRoaXMgaXMgdGhlIHNhbWUgZmlsZSwgYW5kIHdlIGNhblxuICAgICAgICAgIC8vIHNraXAgaXQuXG4gICAgICAgICAgaWYgKG9sZFZlcnNpb25zID09PSBudWxsIHx8IG5ld1ZlcnNpb25zID09PSBudWxsKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBJZiBhIHZlcnNpb24gaXMgYXZhaWxhYmxlIGZvciB0aGUgZmlsZSBmcm9tIGJvdGggdGhlIHByaW9yIGFuZCB0aGUgY3VycmVudCBwcm9ncmFtLCBhbmRcbiAgICAgICAgICAvLyB0aGF0IHZlcnNpb24gaXMgdGhlIHNhbWUsIHRoZW4gdGhpcyBpcyB0aGUgc2FtZSBmaWxlLCBhbmQgd2UgY2FuIHNraXAgaXQuXG4gICAgICAgICAgaWYgKG9sZFZlcnNpb25zLmhhcyhzZlBhdGgpICYmIG5ld1ZlcnNpb25zLmhhcyhzZlBhdGgpICYmXG4gICAgICAgICAgICAgIG9sZFZlcnNpb25zLmdldChzZlBhdGgpISA9PT0gbmV3VmVyc2lvbnMuZ2V0KHNmUGF0aCkhKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBPdGhlcndpc2UsIGFzc3VtZSB0aGF0IHRoZSBmaWxlIGhhcyBjaGFuZ2VkLiBFaXRoZXIgaXRzIHZlcnNpb25zIGRpZG4ndCBtYXRjaCwgb3Igd2VcbiAgICAgICAgICAvLyB3ZXJlIG1pc3NpbmcgdmVyc2lvbiBpbmZvcm1hdGlvbiBhYm91dCBpdCBvbiBvbmUgc2lkZSBmb3Igc29tZSByZWFzb24uXG4gICAgICAgIH1cblxuICAgICAgICAvLyBCYWlsIG91dCBpZiBhIC5kLnRzIGZpbGUgY2hhbmdlcyAtIHRoZSBzZW1hbnRpYyBkZXAgZ3JhcGggaXMgbm90IGFibGUgdG8gcHJvY2VzcyBzdWNoXG4gICAgICAgIC8vIGNoYW5nZXMgY29ycmVjdGx5IHlldC5cbiAgICAgICAgaWYgKHNmLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgcmV0dXJuIEluY3JlbWVudGFsQ29tcGlsYXRpb24uZnJlc2gocHJvZ3JhbSwgbmV3VmVyc2lvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIGZpbGUgaGFzIGNoYW5nZWQgcGh5c2ljYWxseSwgc28gcmVjb3JkIGl0LlxuICAgICAgICBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMuYWRkKHNmUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlbW92ZSBhbnkgZmlsZXMgdGhhdCBoYXZlIGJlZW4gZGVsZXRlZCBmcm9tIHRoZSBsaXN0IG9mIHBoeXNpY2FsIGNoYW5nZXMuXG4gICAgICBmb3IgKGNvbnN0IGRlbGV0ZWRGaWxlTmFtZSBvZiBkZWxldGVkVHNGaWxlcykge1xuICAgICAgICBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMuZGVsZXRlKHJlc29sdmUoZGVsZXRlZEZpbGVOYW1lKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFVzZSB0aGUgcHJpb3IgZGVwZW5kZW5jeSBncmFwaCB0byBwcm9qZWN0IHBoeXNpY2FsIGNoYW5nZXMgaW50byBhIHNldCBvZiBsb2dpY2FsbHkgY2hhbmdlZFxuICAgICAgLy8gZmlsZXMuXG4gICAgICBjb25zdCBkZXBHcmFwaCA9IG5ldyBGaWxlRGVwZW5kZW5jeUdyYXBoKCk7XG4gICAgICBjb25zdCBsb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcyA9IGRlcEdyYXBoLnVwZGF0ZVdpdGhQaHlzaWNhbENoYW5nZXMoXG4gICAgICAgICAgcHJpb3JBbmFseXNpcy5kZXBHcmFwaCwgcGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzLCBkZWxldGVkVHNGaWxlcywgY2hhbmdlZFJlc291cmNlRmlsZXMpO1xuXG4gICAgICAvLyBQaHlzaWNhbGx5IGNoYW5nZWQgZmlsZXMgYXJlbid0IG5lY2Vzc2FyaWx5IGNvdW50ZWQgYXMgbG9naWNhbGx5IGNoYW5nZWQgYnkgdGhlIGRlcGVuZGVuY3lcbiAgICAgIC8vIGdyYXBoIChmaWxlcyBkbyBub3QgaGF2ZSBlZGdlcyB0byB0aGVtc2VsdmVzKSwgc28gYWRkIHRoZW0gdG8gdGhlIGxvZ2ljYWwgY2hhbmdlc1xuICAgICAgLy8gZXhwbGljaXRseS5cbiAgICAgIGZvciAoY29uc3Qgc2ZQYXRoIG9mIHBoeXNpY2FsbHlDaGFuZ2VkVHNGaWxlcykge1xuICAgICAgICBsb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcy5hZGQoc2ZQYXRoKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RhcnQgb2ZmIGluIGEgYERlbHRhSW5jcmVtZW50YWxTdGF0ZWAgYXMgYSBkZWx0YSBhZ2FpbnN0IHRoZSBwcmV2aW91cyBzdWNjZXNzZnVsIGFuYWx5c2lzLFxuICAgICAgLy8gdW50aWwgdGhpcyBjb21waWxhdGlvbiBjb21wbGV0ZXMgaXRzIG93biBhbmFseXNpcy5cbiAgICAgIGNvbnN0IHN0YXRlOiBEZWx0YUluY3JlbWVudGFsU3RhdGUgPSB7XG4gICAgICAgIGtpbmQ6IEluY3JlbWVudGFsU3RhdGVLaW5kLkRlbHRhLFxuICAgICAgICBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMsXG4gICAgICAgIGNoYW5nZWRSZXNvdXJjZUZpbGVzLFxuICAgICAgICBsYXN0QW5hbHl6ZWRTdGF0ZTogcHJpb3JBbmFseXNpcyxcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBuZXcgSW5jcmVtZW50YWxDb21waWxhdGlvbihzdGF0ZSwgZGVwR3JhcGgsIG5ld1ZlcnNpb25zLCB7XG4gICAgICAgIHByaW9yU3RhdGU6IHByaW9yQW5hbHlzaXMsXG4gICAgICAgIGxvZ2ljYWxseUNoYW5nZWRUc0ZpbGVzLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBnZXQgc3RhdGUoKTogSW5jcmVtZW50YWxTdGF0ZSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlO1xuICB9XG5cbiAgZ2V0IHNlbWFudGljRGVwR3JhcGhVcGRhdGVyKCk6IFNlbWFudGljRGVwR3JhcGhVcGRhdGVyIHtcbiAgICBpZiAodGhpcy5waGFzZS5raW5kICE9PSBQaGFzZUtpbmQuQW5hbHlzaXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXNzZXJ0aW9uRXJyb3I6IENhbm5vdCB1cGRhdGUgdGhlIFNlbWFudGljRGVwR3JhcGggYWZ0ZXIgYW5hbHlzaXMgY29tcGxldGVzYCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBoYXNlLnNlbWFudGljRGVwR3JhcGhVcGRhdGVyO1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bEFuYWx5c2lzKHRyYWl0Q29tcGlsZXI6IFRyYWl0Q29tcGlsZXIpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5waGFzZS5raW5kICE9PSBQaGFzZUtpbmQuQW5hbHlzaXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IEluY3JlbWVudGFsIGNvbXBpbGF0aW9uIGluIHBoYXNlICR7XG4gICAgICAgICAgUGhhc2VLaW5kW3RoaXMucGhhc2Uua2luZF19LCBleHBlY3RlZCBBbmFseXNpc2ApO1xuICAgIH1cblxuICAgIGNvbnN0IHtuZWVkc0VtaXQsIG5lZWRzVHlwZUNoZWNrRW1pdCwgbmV3R3JhcGh9ID0gdGhpcy5waGFzZS5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlci5maW5hbGl6ZSgpO1xuXG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBzZXQgb2YgZmlsZXMgd2hpY2ggaGF2ZSBhbHJlYWR5IGJlZW4gZW1pdHRlZC5cbiAgICBsZXQgZW1pdHRlZDogU2V0PEFic29sdXRlRnNQYXRoPjtcbiAgICBpZiAodGhpcy5zdGVwID09PSBudWxsKSB7XG4gICAgICAvLyBTaW5jZSB0aGVyZSBpcyBubyBwcmlvciBjb21waWxhdGlvbiwgbm8gZmlsZXMgaGF2ZSB5ZXQgYmVlbiBlbWl0dGVkLlxuICAgICAgZW1pdHRlZCA9IG5ldyBTZXQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQmVnaW4gd2l0aCB0aGUgZmlsZXMgZW1pdHRlZCBieSB0aGUgcHJpb3Igc3VjY2Vzc2Z1bCBjb21waWxhdGlvbiwgYnV0IHJlbW92ZSB0aG9zZSB3aGljaCB3ZVxuICAgICAgLy8ga25vdyBuZWVkIHRvIGJlZSByZS1lbWl0dGVkLlxuICAgICAgZW1pdHRlZCA9IG5ldyBTZXQodGhpcy5zdGVwLnByaW9yU3RhdGUuZW1pdHRlZCk7XG5cbiAgICAgIC8vIEZpbGVzIG5lZWQgcmUtZW1pdHRlZCBpZiB0aGV5J3ZlIGxvZ2ljYWxseSBjaGFuZ2VkLlxuICAgICAgZm9yIChjb25zdCBzZlBhdGggb2YgdGhpcy5zdGVwLmxvZ2ljYWxseUNoYW5nZWRUc0ZpbGVzKSB7XG4gICAgICAgIGVtaXR0ZWQuZGVsZXRlKHNmUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpbGVzIG5lZWQgcmUtZW1pdHRlZCBpZiB0aGV5J3ZlIHNlbWFudGljYWxseSBjaGFuZ2VkLlxuICAgICAgZm9yIChjb25zdCBzZlBhdGggb2YgbmVlZHNFbWl0KSB7XG4gICAgICAgIGVtaXR0ZWQuZGVsZXRlKHNmUGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbiB0byBhIHN1Y2Nlc3NmdWxseSBhbmFseXplZCBjb21waWxhdGlvbi4gQXQgdGhpcyBwb2ludCwgYSBzdWJzZXF1ZW50IGNvbXBpbGF0aW9uXG4gICAgLy8gY291bGQgdXNlIHRoaXMgc3RhdGUgYXMgYSBzdGFydGluZyBwb2ludC5cbiAgICB0aGlzLl9zdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEluY3JlbWVudGFsU3RhdGVLaW5kLkFuYWx5emVkLFxuICAgICAgdmVyc2lvbnM6IHRoaXMudmVyc2lvbnMsXG4gICAgICBkZXBHcmFwaDogdGhpcy5kZXBHcmFwaCxcbiAgICAgIHNlbWFudGljRGVwR3JhcGg6IG5ld0dyYXBoLFxuICAgICAgcHJpb3JBbmFseXNpczogdHJhaXRDb21waWxlci5nZXRBbmFseXplZFJlY29yZHMoKSxcbiAgICAgIHR5cGVDaGVja1Jlc3VsdHM6IG51bGwsXG4gICAgICBlbWl0dGVkLFxuICAgIH07XG5cbiAgICAvLyBXZSBub3cgZW50ZXIgdGhlIHR5cGUtY2hlY2sgYW5kIGVtaXQgcGhhc2Ugb2YgY29tcGlsYXRpb24uXG4gICAgdGhpcy5waGFzZSA9IHtcbiAgICAgIGtpbmQ6IFBoYXNlS2luZC5UeXBlQ2hlY2tBbmRFbWl0LFxuICAgICAgbmVlZHNFbWl0LFxuICAgICAgbmVlZHNUeXBlQ2hlY2tFbWl0LFxuICAgIH07XG4gIH1cblxuICByZWNvcmRTdWNjZXNzZnVsVHlwZUNoZWNrKHJlc3VsdHM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgRmlsZVR5cGVDaGVja2luZ0RhdGE+KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3N0YXRlLmtpbmQgIT09IEluY3JlbWVudGFsU3RhdGVLaW5kLkFuYWx5emVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgY29tcGlsYXRpb24uYCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnBoYXNlLmtpbmQgIT09IFBoYXNlS2luZC5UeXBlQ2hlY2tBbmRFbWl0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBJbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpbiBwaGFzZSAke1xuICAgICAgICAgIFBoYXNlS2luZFt0aGlzLnBoYXNlLmtpbmRdfSwgZXhwZWN0ZWQgVHlwZUNoZWNrYCk7XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGUudHlwZUNoZWNrUmVzdWx0cyA9IHJlc3VsdHM7XG4gIH1cblxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3N0YXRlLmtpbmQgIT09IEluY3JlbWVudGFsU3RhdGVLaW5kLkFuYWx5emVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgY29tcGlsYXRpb24uYCk7XG4gICAgfVxuICAgIHRoaXMuX3N0YXRlLmVtaXR0ZWQuYWRkKGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpKTtcbiAgfVxuXG4gIHByaW9yQW5hbHlzaXNGb3Ioc2Y6IHRzLlNvdXJjZUZpbGUpOiBDbGFzc1JlY29yZFtdfG51bGwge1xuICAgIGlmICh0aGlzLnN0ZXAgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHNmUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpO1xuXG4gICAgLy8gSWYgdGhlIGZpbGUgaGFzIGxvZ2ljYWxseSBjaGFuZ2VkLCBpdHMgcHJldmlvdXMgYW5hbHlzaXMgY2Fubm90IGJlIHJldXNlZC5cbiAgICBpZiAodGhpcy5zdGVwLmxvZ2ljYWxseUNoYW5nZWRUc0ZpbGVzLmhhcyhzZlBhdGgpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwcmlvckFuYWx5c2lzID0gdGhpcy5zdGVwLnByaW9yU3RhdGUucHJpb3JBbmFseXNpcztcbiAgICBpZiAoIXByaW9yQW5hbHlzaXMuaGFzKHNmKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiBwcmlvckFuYWx5c2lzLmdldChzZikhO1xuICB9XG5cbiAgcHJpb3JUeXBlQ2hlY2tpbmdSZXN1bHRzRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogRmlsZVR5cGVDaGVja2luZ0RhdGF8bnVsbCB7XG4gICAgaWYgKHRoaXMucGhhc2Uua2luZCAhPT0gUGhhc2VLaW5kLlR5cGVDaGVja0FuZEVtaXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXJ0aW9uRXJyb3I6IEV4cGVjdGVkIHN1Y2Nlc3NmdWxseSBhbmFseXplZCBjb21waWxhdGlvbi5gKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGVwID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIC8vIElmIHRoZSBmaWxlIGhhcyBsb2dpY2FsbHkgY2hhbmdlZCwgb3IgaXRzIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcmVzdWx0cyBoYXZlIHNlbWFudGljYWxseVxuICAgIC8vIGNoYW5nZWQsIHRoZW4gcGFzdCB0eXBlLWNoZWNraW5nIHJlc3VsdHMgY2Fubm90IGJlIHJldXNlZC5cbiAgICBpZiAodGhpcy5zdGVwLmxvZ2ljYWxseUNoYW5nZWRUc0ZpbGVzLmhhcyhzZlBhdGgpIHx8XG4gICAgICAgIHRoaXMucGhhc2UubmVlZHNUeXBlQ2hlY2tFbWl0LmhhcyhzZlBhdGgpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBQYXN0IHJlc3VsdHMgYWxzbyBjYW5ub3QgYmUgcmV1c2VkIGlmIHRoZXkncmUgbm90IGF2YWlsYWJsZS5cbiAgICBpZiAodGhpcy5zdGVwLnByaW9yU3RhdGUudHlwZUNoZWNrUmVzdWx0cyA9PT0gbnVsbCB8fFxuICAgICAgICAhdGhpcy5zdGVwLnByaW9yU3RhdGUudHlwZUNoZWNrUmVzdWx0cy5oYXMoc2ZQYXRoKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcHJpb3JSZXN1bHRzID0gdGhpcy5zdGVwLnByaW9yU3RhdGUudHlwZUNoZWNrUmVzdWx0cy5nZXQoc2ZQYXRoKSE7XG4gICAgLy8gSWYgdGhlIHBhc3QgcmVzdWx0cyByZWxpZWQgb24gaW5saW5pbmcsIHRoZXkncmUgbm90IHNhZmUgZm9yIHJldXNlLlxuICAgIGlmIChwcmlvclJlc3VsdHMuaGFzSW5saW5lcykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByaW9yUmVzdWx0cztcbiAgfVxuXG4gIHNhZmVUb1NraXBFbWl0KHNmOiB0cy5Tb3VyY2VGaWxlKTogYm9vbGVhbiB7XG4gICAgLy8gSWYgdGhpcyBpcyBhIGZyZXNoIGNvbXBpbGF0aW9uLCBpdCdzIG5ldmVyIHNhZmUgdG8gc2tpcCBhbiBlbWl0LlxuICAgIGlmICh0aGlzLnN0ZXAgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIC8vIElmIHRoZSBmaWxlIGhhcyBpdHNlbGYgbG9naWNhbGx5IGNoYW5nZWQsIGl0IG11c3QgYmUgZW1pdHRlZC5cbiAgICBpZiAodGhpcy5zdGVwLmxvZ2ljYWxseUNoYW5nZWRUc0ZpbGVzLmhhcyhzZlBhdGgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGhhc2Uua2luZCAhPT0gUGhhc2VLaW5kLlR5cGVDaGVja0FuZEVtaXQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQXNzZXJ0aW9uRXJyb3I6IEV4cGVjdGVkIHN1Y2Nlc3NmdWwgYW5hbHlzaXMgYmVmb3JlIGF0dGVtcHRpbmcgdG8gZW1pdCBmaWxlc2ApO1xuICAgIH1cblxuICAgIC8vIElmIGR1cmluZyBhbmFseXNpcyBpdCB3YXMgZGV0ZXJtaW5lZCB0aGF0IHRoaXMgZmlsZSBoYXMgc2VtYW50aWNhbGx5IGNoYW5nZWQsIGl0IG11c3QgYmVcbiAgICAvLyBlbWl0dGVkLlxuICAgIGlmICh0aGlzLnBoYXNlLm5lZWRzRW1pdC5oYXMoc2ZQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYWxseSBpdCBzaG91bGQgYmUgc2FmZSB0byBhc3N1bWUgaGVyZSB0aGF0IHRoZSBmaWxlIHdhcyBwcmV2aW91c2x5IGVtaXR0ZWQgYnkgdGhlIGxhc3RcbiAgICAvLyBzdWNjZXNzZnVsIGNvbXBpbGF0aW9uLiBIb3dldmVyLCBhcyBhIGRlZmVuc2UtaW4tZGVwdGggYWdhaW5zdCBpbmNvcnJlY3RuZXNzLCB3ZSBleHBsaWNpdGx5XG4gICAgLy8gY2hlY2sgdGhhdCB0aGUgbGFzdCBlbWl0IGluY2x1ZGVkIHRoaXMgZmlsZSwgYW5kIHJlLWVtaXQgaXQgb3RoZXJ3aXNlLlxuICAgIHJldHVybiB0aGlzLnN0ZXAucHJpb3JTdGF0ZS5lbWl0dGVkLmhhcyhzZlBhdGgpO1xuICB9XG59XG5cbi8qKlxuICogVG8gYWNjdXJhdGVseSBkZXRlY3Qgd2hldGhlciBhIHNvdXJjZSBmaWxlIHdhcyBhZmZlY3RlZCBkdXJpbmcgYW4gaW5jcmVtZW50YWwgcmVidWlsZCwgdGhlXG4gKiBcIm9yaWdpbmFsXCIgc291cmNlIGZpbGUgbmVlZHMgdG8gYmUgY29uc2lzdGVudGx5IHVzZWQuXG4gKlxuICogRmlyc3QsIFR5cGVTY3JpcHQgbWF5IGhhdmUgY3JlYXRlZCBzb3VyY2UgZmlsZSByZWRpcmVjdHMgd2hlbiBkZWNsYXJhdGlvbiBmaWxlcyBvZiB0aGUgc2FtZVxuICogdmVyc2lvbiBvZiBhIGxpYnJhcnkgYXJlIGluY2x1ZGVkIG11bHRpcGxlIHRpbWVzLiBUaGUgbm9uLXJlZGlyZWN0ZWQgc291cmNlIGZpbGUgc2hvdWxkIGJlIHVzZWRcbiAqIHRvIGRldGVjdCBjaGFuZ2VzLCBhcyBvdGhlcndpc2UgdGhlIHJlZGlyZWN0ZWQgc291cmNlIGZpbGVzIGNhdXNlIGEgbWlzbWF0Y2ggd2hlbiBjb21wYXJlZCB0b1xuICogYSBwcmlvciBwcm9ncmFtLlxuICpcbiAqIFNlY29uZCwgdGhlIHByb2dyYW0gdGhhdCBpcyB1c2VkIGZvciB0ZW1wbGF0ZSB0eXBlIGNoZWNraW5nIG1heSBjb250YWluIG11dGF0ZWQgc291cmNlIGZpbGVzLCBpZlxuICogaW5saW5lIHR5cGUgY29uc3RydWN0b3JzIG9yIGlubGluZSB0ZW1wbGF0ZSB0eXBlLWNoZWNrIGJsb2NrcyBoYWQgdG8gYmUgdXNlZC4gU3VjaCBzb3VyY2UgZmlsZXNcbiAqIHN0b3JlIHRoZWlyIG9yaWdpbmFsLCBub24tbXV0YXRlZCBzb3VyY2UgZmlsZSBmcm9tIHRoZSBvcmlnaW5hbCBwcm9ncmFtIGluIGEgc3ltYm9sLiBGb3JcbiAqIGNvbXB1dGluZyB0aGUgYWZmZWN0ZWQgZmlsZXMgaW4gYW4gaW5jcmVtZW50YWwgYnVpbGQgdGhpcyBvcmlnaW5hbCBzb3VyY2UgZmlsZSBzaG91bGQgYmUgdXNlZCwgYXNcbiAqIHRoZSBtdXRhdGVkIHNvdXJjZSBmaWxlIHdvdWxkIGFsd2F5cyBiZSBjb25zaWRlcmVkIGFmZmVjdGVkLlxuICovXG5mdW5jdGlvbiB0b09yaWdpbmFsU291cmNlRmlsZShzZjogdHMuU291cmNlRmlsZSk6IHRzLlNvdXJjZUZpbGUge1xuICBjb25zdCB1bnJlZGlyZWN0ZWRTZiA9IHRvVW5yZWRpcmVjdGVkU291cmNlRmlsZShzZik7XG4gIGNvbnN0IG9yaWdpbmFsRmlsZSA9ICh1bnJlZGlyZWN0ZWRTZiBhcyBNYXliZVNvdXJjZUZpbGVXaXRoT3JpZ2luYWxGaWxlKVtOZ09yaWdpbmFsRmlsZV07XG4gIGlmIChvcmlnaW5hbEZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBvcmlnaW5hbEZpbGU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHVucmVkaXJlY3RlZFNmO1xuICB9XG59XG4iXX0=