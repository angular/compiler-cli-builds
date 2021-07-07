/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { absoluteFromSourceFile, resolve } from '../../file_system';
import { PerfPhase } from '../../perf';
import { NgOriginalFile } from '../../program_driver';
import { toUnredirectedSourceFile } from '../../util/src/typescript';
import { SemanticDepGraphUpdater } from '../semantic_graph';
import { FileDependencyGraph } from './dependency_tracking';
import { IncrementalStateKind } from './state';
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
export class IncrementalCompilation {
    constructor(state, depGraph, versions, step) {
        this.depGraph = depGraph;
        this.versions = versions;
        this.step = step;
        this._state = state;
        // The compilation begins in analysis phase.
        this.phase = {
            kind: PhaseKind.Analysis,
            semanticDepGraphUpdater: new SemanticDepGraphUpdater(step !== null ? step.priorState.semanticDepGraph : null),
        };
    }
    /**
     * Begin a fresh `IncrementalCompilation`.
     */
    static fresh(program, versions) {
        const state = {
            kind: IncrementalStateKind.Fresh,
        };
        return new IncrementalCompilation(state, new FileDependencyGraph(), versions, /* reuse */ null);
    }
    static incremental(program, newVersions, oldProgram, oldState, modifiedResourceFiles, perf) {
        return perf.inPhase(PerfPhase.Reconciliation, () => {
            const physicallyChangedTsFiles = new Set();
            const changedResourceFiles = new Set(modifiedResourceFiles !== null && modifiedResourceFiles !== void 0 ? modifiedResourceFiles : []);
            let priorAnalysis;
            switch (oldState.kind) {
                case IncrementalStateKind.Fresh:
                    // Since this line of program has never been successfully analyzed to begin with, treat
                    // this as a fresh compilation.
                    return IncrementalCompilation.fresh(program, newVersions);
                case IncrementalStateKind.Analyzed:
                    // The most recent program was analyzed successfully, so we can use that as our prior
                    // state and don't need to consider any other deltas except changes in the most recent
                    // program.
                    priorAnalysis = oldState;
                    break;
                case IncrementalStateKind.Delta:
                    // There is an ancestor program which was analyzed successfully and can be used as a
                    // starting point, but we need to determine what's changed since that program.
                    priorAnalysis = oldState.lastAnalyzedState;
                    for (const sfPath of oldState.physicallyChangedTsFiles) {
                        physicallyChangedTsFiles.add(sfPath);
                    }
                    for (const resourcePath of oldState.changedResourceFiles) {
                        changedResourceFiles.add(resourcePath);
                    }
                    break;
            }
            const oldVersions = priorAnalysis.versions;
            const oldFilesArray = oldProgram.getSourceFiles().map(toOriginalSourceFile);
            const oldFiles = new Set(oldFilesArray);
            const deletedTsFiles = new Set(oldFilesArray.map(sf => absoluteFromSourceFile(sf)));
            for (const possiblyRedirectedNewFile of program.getSourceFiles()) {
                const sf = toOriginalSourceFile(possiblyRedirectedNewFile);
                const sfPath = absoluteFromSourceFile(sf);
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
            // Remove any files that have been deleted from the list of physical changes.
            for (const deletedFileName of deletedTsFiles) {
                physicallyChangedTsFiles.delete(resolve(deletedFileName));
            }
            // Use the prior dependency graph to project physical changes into a set of logically changed
            // files.
            const depGraph = new FileDependencyGraph();
            const logicallyChangedTsFiles = depGraph.updateWithPhysicalChanges(priorAnalysis.depGraph, physicallyChangedTsFiles, deletedTsFiles, changedResourceFiles);
            // Physically changed files aren't necessarily counted as logically changed by the dependency
            // graph (files do not have edges to themselves), so add them to the logical changes
            // explicitly.
            for (const sfPath of physicallyChangedTsFiles) {
                logicallyChangedTsFiles.add(sfPath);
            }
            // Start off in a `DeltaIncrementalState` as a delta against the previous successful analysis,
            // until this compilation completes its own analysis.
            const state = {
                kind: IncrementalStateKind.Delta,
                physicallyChangedTsFiles,
                changedResourceFiles,
                lastAnalyzedState: priorAnalysis,
            };
            return new IncrementalCompilation(state, depGraph, newVersions, {
                priorState: priorAnalysis,
                logicallyChangedTsFiles,
            });
        });
    }
    get state() {
        return this._state;
    }
    get semanticDepGraphUpdater() {
        if (this.phase.kind !== PhaseKind.Analysis) {
            throw new Error(`AssertionError: Cannot update the SemanticDepGraph after analysis completes`);
        }
        return this.phase.semanticDepGraphUpdater;
    }
    recordSuccessfulAnalysis(traitCompiler) {
        if (this.phase.kind !== PhaseKind.Analysis) {
            throw new Error(`AssertionError: Incremental compilation in phase ${PhaseKind[this.phase.kind]}, expected Analysis`);
        }
        const { needsEmit, needsTypeCheckEmit, newGraph } = this.phase.semanticDepGraphUpdater.finalize();
        // Determine the set of files which have already been emitted.
        let emitted;
        if (this.step === null) {
            // Since there is no prior compilation, no files have yet been emitted.
            emitted = new Set();
        }
        else {
            // Begin with the files emitted by the prior successful compilation, but remove those which we
            // know need to bee re-emitted.
            emitted = new Set(this.step.priorState.emitted);
            // Files need re-emitted if they've logically changed.
            for (const sfPath of this.step.logicallyChangedTsFiles) {
                emitted.delete(sfPath);
            }
            // Files need re-emitted if they've semantically changed.
            for (const sfPath of needsEmit) {
                emitted.delete(sfPath);
            }
        }
        // Transition to a successfully analyzed compilation. At this point, a subsequent compilation
        // could use this state as a starting point.
        this._state = {
            kind: IncrementalStateKind.Analyzed,
            versions: this.versions,
            depGraph: this.depGraph,
            semanticDepGraph: newGraph,
            priorAnalysis: traitCompiler.getAnalyzedRecords(),
            typeCheckResults: null,
            emitted,
        };
        // We now enter the type-check and emit phase of compilation.
        this.phase = {
            kind: PhaseKind.TypeCheckAndEmit,
            needsEmit,
            needsTypeCheckEmit,
        };
    }
    recordSuccessfulTypeCheck(results) {
        if (this._state.kind !== IncrementalStateKind.Analyzed) {
            throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
        }
        else if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
            throw new Error(`AssertionError: Incremental compilation in phase ${PhaseKind[this.phase.kind]}, expected TypeCheck`);
        }
        this._state.typeCheckResults = results;
    }
    recordSuccessfulEmit(sf) {
        if (this._state.kind !== IncrementalStateKind.Analyzed) {
            throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
        }
        this._state.emitted.add(absoluteFromSourceFile(sf));
    }
    priorAnalysisFor(sf) {
        if (this.step === null) {
            return null;
        }
        const sfPath = absoluteFromSourceFile(sf);
        // If the file has logically changed, its previous analysis cannot be reused.
        if (this.step.logicallyChangedTsFiles.has(sfPath)) {
            return null;
        }
        const priorAnalysis = this.step.priorState.priorAnalysis;
        if (!priorAnalysis.has(sf)) {
            return null;
        }
        return priorAnalysis.get(sf);
    }
    priorTypeCheckingResultsFor(sf) {
        if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
            throw new Error(`AssertionError: Expected successfully analyzed compilation.`);
        }
        if (this.step === null) {
            return null;
        }
        const sfPath = absoluteFromSourceFile(sf);
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
        const priorResults = this.step.priorState.typeCheckResults.get(sfPath);
        // If the past results relied on inlining, they're not safe for reuse.
        if (priorResults.hasInlines) {
            return null;
        }
        return priorResults;
    }
    safeToSkipEmit(sf) {
        // If this is a fresh compilation, it's never safe to skip an emit.
        if (this.step === null) {
            return false;
        }
        const sfPath = absoluteFromSourceFile(sf);
        // If the file has itself logically changed, it must be emitted.
        if (this.step.logicallyChangedTsFiles.has(sfPath)) {
            return false;
        }
        if (this.phase.kind !== PhaseKind.TypeCheckAndEmit) {
            throw new Error(`AssertionError: Expected successful analysis before attempting to emit files`);
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
    }
}
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
    const unredirectedSf = toUnredirectedSourceFile(sf);
    const originalFile = unredirectedSf[NgOriginalFile];
    if (originalFile !== undefined) {
        return originalFile;
    }
    else {
        return unredirectedSf;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5jcmVtZW50YWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2luY3JlbWVudGFsL3NyYy9pbmNyZW1lbnRhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFJSCxPQUFPLEVBQUMsc0JBQXNCLEVBQWtCLE9BQU8sRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2xGLE9BQU8sRUFBQyxTQUFTLEVBQWUsTUFBTSxZQUFZLENBQUM7QUFDbkQsT0FBTyxFQUFrQyxjQUFjLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQUdyRixPQUFPLEVBQUMsd0JBQXdCLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUVuRSxPQUFPLEVBQUMsdUJBQXVCLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUUxRCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRCxPQUFPLEVBQW9FLG9CQUFvQixFQUFDLE1BQU0sU0FBUyxDQUFDO0FBV2hIOztHQUVHO0FBQ0gsSUFBSyxTQUdKO0FBSEQsV0FBSyxTQUFTO0lBQ1osaURBQVEsQ0FBQTtJQUNSLGlFQUFnQixDQUFBO0FBQ2xCLENBQUMsRUFISSxTQUFTLEtBQVQsU0FBUyxRQUdiO0FBeUJEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBV2pDLFlBQ0ksS0FBdUIsRUFBVyxRQUE2QixFQUN2RCxRQUEwQyxFQUFVLElBQTBCO1FBRHBELGFBQVEsR0FBUixRQUFRLENBQXFCO1FBQ3ZELGFBQVEsR0FBUixRQUFRLENBQWtDO1FBQVUsU0FBSSxHQUFKLElBQUksQ0FBc0I7UUFDeEYsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFcEIsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxLQUFLLEdBQUc7WUFDWCxJQUFJLEVBQUUsU0FBUyxDQUFDLFFBQVE7WUFD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QyxDQUFDO1FBRTFDLGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pELE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNsRCxNQUFNLElBQUksS0FBSyxDQUNYLDhFQUE4RSxDQUFDLENBQUM7U0FDckY7UUFFRCwyRkFBMkY7UUFDM0YsV0FBVztRQUNYLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3BDLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFFRCw4RkFBOEY7UUFDOUYsOEZBQThGO1FBQzlGLHlFQUF5RTtRQUN6RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUNGO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUFTLG9CQUFvQixDQUFDLEVBQWlCO0lBQzdDLE1BQU0sY0FBYyxHQUFHLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sWUFBWSxHQUFJLGNBQWtELENBQUMsY0FBYyxDQUFDLENBQUM7SUFDekYsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFO1FBQzlCLE9BQU8sWUFBWSxDQUFDO0tBQ3JCO1NBQU07UUFDTCxPQUFPLGNBQWMsQ0FBQztLQUN2QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tU291cmNlRmlsZSwgQWJzb2x1dGVGc1BhdGgsIHJlc29sdmV9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UGVyZlBoYXNlLCBQZXJmUmVjb3JkZXJ9IGZyb20gJy4uLy4uL3BlcmYnO1xuaW1wb3J0IHtNYXliZVNvdXJjZUZpbGVXaXRoT3JpZ2luYWxGaWxlLCBOZ09yaWdpbmFsRmlsZX0gZnJvbSAnLi4vLi4vcHJvZ3JhbV9kcml2ZXInO1xuaW1wb3J0IHtDbGFzc1JlY29yZCwgVHJhaXRDb21waWxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcbmltcG9ydCB7RmlsZVR5cGVDaGVja2luZ0RhdGF9IGZyb20gJy4uLy4uL3R5cGVjaGVjayc7XG5pbXBvcnQge3RvVW5yZWRpcmVjdGVkU291cmNlRmlsZX0gZnJvbSAnLi4vLi4vdXRpbC9zcmMvdHlwZXNjcmlwdCc7XG5pbXBvcnQge0luY3JlbWVudGFsQnVpbGR9IGZyb20gJy4uL2FwaSc7XG5pbXBvcnQge1NlbWFudGljRGVwR3JhcGhVcGRhdGVyfSBmcm9tICcuLi9zZW1hbnRpY19ncmFwaCc7XG5cbmltcG9ydCB7RmlsZURlcGVuZGVuY3lHcmFwaH0gZnJvbSAnLi9kZXBlbmRlbmN5X3RyYWNraW5nJztcbmltcG9ydCB7QW5hbHl6ZWRJbmNyZW1lbnRhbFN0YXRlLCBEZWx0YUluY3JlbWVudGFsU3RhdGUsIEluY3JlbWVudGFsU3RhdGUsIEluY3JlbWVudGFsU3RhdGVLaW5kfSBmcm9tICcuL3N0YXRlJztcblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCB0aGUgcHJldmlvdXMgY29tcGlsYXRpb24gYmVpbmcgdXNlZCBhcyBhIHN0YXJ0aW5nIHBvaW50IGZvciB0aGUgY3VycmVudCBvbmUsXG4gKiBpbmNsdWRpbmcgdGhlIGRlbHRhIG9mIGZpbGVzIHdoaWNoIGhhdmUgbG9naWNhbGx5IGNoYW5nZWQgYW5kIG5lZWQgdG8gYmUgcmVhbmFseXplZC5cbiAqL1xuaW50ZXJmYWNlIEluY3JlbWVudGFsU3RlcCB7XG4gIHByaW9yU3RhdGU6IEFuYWx5emVkSW5jcmVtZW50YWxTdGF0ZTtcbiAgbG9naWNhbGx5Q2hhbmdlZFRzRmlsZXM6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG59XG5cbi8qKlxuICogRGlzY3JpbWluYW50IG9mIHRoZSBgUGhhc2VgIHR5cGUgdW5pb24uXG4gKi9cbmVudW0gUGhhc2VLaW5kIHtcbiAgQW5hbHlzaXMsXG4gIFR5cGVDaGVja0FuZEVtaXQsXG59XG5cbi8qKlxuICogQW4gaW5jcmVtZW50YWwgY29tcGlsYXRpb24gdW5kZXJnb2luZyBhbmFseXNpcywgYW5kIGJ1aWxkaW5nIGEgc2VtYW50aWMgZGVwZW5kZW5jeSBncmFwaC5cbiAqL1xuaW50ZXJmYWNlIEFuYWx5c2lzUGhhc2Uge1xuICBraW5kOiBQaGFzZUtpbmQuQW5hbHlzaXM7XG4gIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjtcbn1cblxuLyoqXG4gKiBBbiBpbmNyZW1lbnRhbCBjb21waWxhdGlvbiB0aGF0IGNvbXBsZXRlZCBhbmFseXNpcyBhbmQgaXMgdW5kZXJnb2luZyB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIGFuZFxuICogZW1pdC5cbiAqL1xuaW50ZXJmYWNlIFR5cGVDaGVja0FuZEVtaXRQaGFzZSB7XG4gIGtpbmQ6IFBoYXNlS2luZC5UeXBlQ2hlY2tBbmRFbWl0O1xuICBuZWVkc0VtaXQ6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG4gIG5lZWRzVHlwZUNoZWNrRW1pdDogU2V0PEFic29sdXRlRnNQYXRoPjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBjdXJyZW50IHBoYXNlIG9mIGEgY29tcGlsYXRpb24uXG4gKi9cbnR5cGUgUGhhc2UgPSBBbmFseXNpc1BoYXNlfFR5cGVDaGVja0FuZEVtaXRQaGFzZTtcblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBpbmNyZW1lbnRhbCBwb3J0aW9uIG9mIGFuIEFuZ3VsYXIgY29tcGlsYXRpb24sIGFsbG93aW5nIGZvciByZXVzZSBvZiBhIHByaW9yXG4gKiBjb21waWxhdGlvbiBpZiBhdmFpbGFibGUsIGFuZCBwcm9kdWNpbmcgYW4gb3V0cHV0IHN0YXRlIGZvciByZXVzZSBvZiB0aGUgY3VycmVudCBjb21waWxhdGlvbiBpbiBhXG4gKiBmdXR1cmUgb25lLlxuICovXG5leHBvcnQgY2xhc3MgSW5jcmVtZW50YWxDb21waWxhdGlvbiBpbXBsZW1lbnRzIEluY3JlbWVudGFsQnVpbGQ8Q2xhc3NSZWNvcmQsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPiB7XG4gIHByaXZhdGUgcGhhc2U6IFBoYXNlO1xuXG4gIC8qKlxuICAgKiBgSW5jcmVtZW50YWxTdGF0ZWAgb2YgdGhpcyBjb21waWxhdGlvbiBpZiBpdCB3ZXJlIHRvIGJlIHJldXNlZCBpbiBhIHN1YnNlcXVlbnQgaW5jcmVtZW50YWxcbiAgICogY29tcGlsYXRpb24gYXQgdGhlIGN1cnJlbnQgbW9tZW50LlxuICAgKlxuICAgKiBFeHBvc2VkIHZpYSB0aGUgYHN0YXRlYCByZWFkLW9ubHkgZ2V0dGVyLlxuICAgKi9cbiAgcHJpdmF0ZSBfc3RhdGU6IEluY3JlbWVudGFsU3RhdGU7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICAgIHN0YXRlOiBJbmNyZW1lbnRhbFN0YXRlLCByZWFkb25seSBkZXBHcmFwaDogRmlsZURlcGVuZGVuY3lHcmFwaCxcbiAgICAgIHByaXZhdGUgdmVyc2lvbnM6IE1hcDxBYnNvbHV0ZUZzUGF0aCwgc3RyaW5nPnxudWxsLCBwcml2YXRlIHN0ZXA6IEluY3JlbWVudGFsU3RlcHxudWxsKSB7XG4gICAgdGhpcy5fc3RhdGUgPSBzdGF0ZTtcblxuICAgIC8vIFRoZSBjb21waWxhdGlvbiBiZWdpbnMgaW4gYW5hbHlzaXMgcGhhc2UuXG4gICAgdGhpcy5waGFzZSA9IHtcbiAgICAgIGtpbmQ6IFBoYXNlS2luZC5BbmFseXNpcyxcbiAgICAgIHNlbWFudGljRGVwR3JhcGhVcGRhdGVyOlxuICAgICAgICAgIG5ldyBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlcihzdGVwICE9PSBudWxsID8gc3RlcC5wcmlvclN0YXRlLnNlbWFudGljRGVwR3JhcGggOiBudWxsKSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEJlZ2luIGEgZnJlc2ggYEluY3JlbWVudGFsQ29tcGlsYXRpb25gLlxuICAgKi9cbiAgc3RhdGljIGZyZXNoKHByb2dyYW06IHRzLlByb2dyYW0sIHZlcnNpb25zOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz58bnVsbCk6XG4gICAgICBJbmNyZW1lbnRhbENvbXBpbGF0aW9uIHtcbiAgICBjb25zdCBzdGF0ZTogSW5jcmVtZW50YWxTdGF0ZSA9IHtcbiAgICAgIGtpbmQ6IEluY3JlbWVudGFsU3RhdGVLaW5kLkZyZXNoLFxuICAgIH07XG4gICAgcmV0dXJuIG5ldyBJbmNyZW1lbnRhbENvbXBpbGF0aW9uKHN0YXRlLCBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpLCB2ZXJzaW9ucywgLyogcmV1c2UgKi8gbnVsbCk7XG4gIH1cblxuICBzdGF0aWMgaW5jcmVtZW50YWwoXG4gICAgICBwcm9ncmFtOiB0cy5Qcm9ncmFtLCBuZXdWZXJzaW9uczogTWFwPEFic29sdXRlRnNQYXRoLCBzdHJpbmc+fG51bGwsIG9sZFByb2dyYW06IHRzLlByb2dyYW0sXG4gICAgICBvbGRTdGF0ZTogSW5jcmVtZW50YWxTdGF0ZSwgbW9kaWZpZWRSZXNvdXJjZUZpbGVzOiBTZXQ8QWJzb2x1dGVGc1BhdGg+fG51bGwsXG4gICAgICBwZXJmOiBQZXJmUmVjb3JkZXIpOiBJbmNyZW1lbnRhbENvbXBpbGF0aW9uIHtcbiAgICByZXR1cm4gcGVyZi5pblBoYXNlKFBlcmZQaGFzZS5SZWNvbmNpbGlhdGlvbiwgKCkgPT4ge1xuICAgICAgY29uc3QgcGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICAgIGNvbnN0IGNoYW5nZWRSZXNvdXJjZUZpbGVzID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4obW9kaWZpZWRSZXNvdXJjZUZpbGVzID8/IFtdKTtcblxuXG4gICAgICBsZXQgcHJpb3JBbmFseXNpczogQW5hbHl6ZWRJbmNyZW1lbnRhbFN0YXRlO1xuICAgICAgc3dpdGNoIChvbGRTdGF0ZS5raW5kKSB7XG4gICAgICAgIGNhc2UgSW5jcmVtZW50YWxTdGF0ZUtpbmQuRnJlc2g6XG4gICAgICAgICAgLy8gU2luY2UgdGhpcyBsaW5lIG9mIHByb2dyYW0gaGFzIG5ldmVyIGJlZW4gc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIHRvIGJlZ2luIHdpdGgsIHRyZWF0XG4gICAgICAgICAgLy8gdGhpcyBhcyBhIGZyZXNoIGNvbXBpbGF0aW9uLlxuICAgICAgICAgIHJldHVybiBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKHByb2dyYW0sIG5ld1ZlcnNpb25zKTtcbiAgICAgICAgY2FzZSBJbmNyZW1lbnRhbFN0YXRlS2luZC5BbmFseXplZDpcbiAgICAgICAgICAvLyBUaGUgbW9zdCByZWNlbnQgcHJvZ3JhbSB3YXMgYW5hbHl6ZWQgc3VjY2Vzc2Z1bGx5LCBzbyB3ZSBjYW4gdXNlIHRoYXQgYXMgb3VyIHByaW9yXG4gICAgICAgICAgLy8gc3RhdGUgYW5kIGRvbid0IG5lZWQgdG8gY29uc2lkZXIgYW55IG90aGVyIGRlbHRhcyBleGNlcHQgY2hhbmdlcyBpbiB0aGUgbW9zdCByZWNlbnRcbiAgICAgICAgICAvLyBwcm9ncmFtLlxuICAgICAgICAgIHByaW9yQW5hbHlzaXMgPSBvbGRTdGF0ZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBJbmNyZW1lbnRhbFN0YXRlS2luZC5EZWx0YTpcbiAgICAgICAgICAvLyBUaGVyZSBpcyBhbiBhbmNlc3RvciBwcm9ncmFtIHdoaWNoIHdhcyBhbmFseXplZCBzdWNjZXNzZnVsbHkgYW5kIGNhbiBiZSB1c2VkIGFzIGFcbiAgICAgICAgICAvLyBzdGFydGluZyBwb2ludCwgYnV0IHdlIG5lZWQgdG8gZGV0ZXJtaW5lIHdoYXQncyBjaGFuZ2VkIHNpbmNlIHRoYXQgcHJvZ3JhbS5cbiAgICAgICAgICBwcmlvckFuYWx5c2lzID0gb2xkU3RhdGUubGFzdEFuYWx5emVkU3RhdGU7XG4gICAgICAgICAgZm9yIChjb25zdCBzZlBhdGggb2Ygb2xkU3RhdGUucGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzKSB7XG4gICAgICAgICAgICBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMuYWRkKHNmUGF0aCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZvciAoY29uc3QgcmVzb3VyY2VQYXRoIG9mIG9sZFN0YXRlLmNoYW5nZWRSZXNvdXJjZUZpbGVzKSB7XG4gICAgICAgICAgICBjaGFuZ2VkUmVzb3VyY2VGaWxlcy5hZGQocmVzb3VyY2VQYXRoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG9sZFZlcnNpb25zID0gcHJpb3JBbmFseXNpcy52ZXJzaW9ucztcblxuICAgICAgY29uc3Qgb2xkRmlsZXNBcnJheSA9IG9sZFByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAodG9PcmlnaW5hbFNvdXJjZUZpbGUpO1xuICAgICAgY29uc3Qgb2xkRmlsZXMgPSBuZXcgU2V0KG9sZEZpbGVzQXJyYXkpO1xuICAgICAgY29uc3QgZGVsZXRlZFRzRmlsZXMgPSBuZXcgU2V0KG9sZEZpbGVzQXJyYXkubWFwKHNmID0+IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc2YpKSk7XG5cbiAgICAgIGZvciAoY29uc3QgcG9zc2libHlSZWRpcmVjdGVkTmV3RmlsZSBvZiBwcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgY29uc3Qgc2YgPSB0b09yaWdpbmFsU291cmNlRmlsZShwb3NzaWJseVJlZGlyZWN0ZWROZXdGaWxlKTtcbiAgICAgICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG4gICAgICAgIC8vIFNpbmNlIHdlJ3JlIHNlZWluZyBhIGZpbGUgaW4gdGhlIGluY29taW5nIHByb2dyYW0gd2l0aCB0aGlzIG5hbWUsIGl0IGNhbid0IGhhdmUgYmVlblxuICAgICAgICAvLyBkZWxldGVkLlxuICAgICAgICBkZWxldGVkVHNGaWxlcy5kZWxldGUoc2ZQYXRoKTtcblxuICAgICAgICBpZiAob2xkRmlsZXMuaGFzKHNmKSkge1xuICAgICAgICAgIC8vIFRoaXMgc291cmNlIGZpbGUgaGFzIHRoZSBzYW1lIG9iamVjdCBpZGVudGl0eSBhcyBpbiB0aGUgcHJldmlvdXMgcHJvZ3JhbS4gV2UgbmVlZCB0b1xuICAgICAgICAgIC8vIGRldGVybWluZSBpZiBpdCdzIHJlYWxseSB0aGUgc2FtZSBmaWxlLCBvciBpZiBpdCBtaWdodCBoYXZlIGNoYW5nZWQgdmVyc2lvbnMgc2luY2UgdGhlXG4gICAgICAgICAgLy8gbGFzdCBwcm9ncmFtIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGlkZW50aXR5LlxuXG4gICAgICAgICAgLy8gSWYgdGhlcmUncyBubyB2ZXJzaW9uIGluZm9ybWF0aW9uIGF2YWlsYWJsZSwgdGhlbiB0aGlzIGlzIHRoZSBzYW1lIGZpbGUsIGFuZCB3ZSBjYW5cbiAgICAgICAgICAvLyBza2lwIGl0LlxuICAgICAgICAgIGlmIChvbGRWZXJzaW9ucyA9PT0gbnVsbCB8fCBuZXdWZXJzaW9ucyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgYSB2ZXJzaW9uIGlzIGF2YWlsYWJsZSBmb3IgdGhlIGZpbGUgZnJvbSBib3RoIHRoZSBwcmlvciBhbmQgdGhlIGN1cnJlbnQgcHJvZ3JhbSwgYW5kXG4gICAgICAgICAgLy8gdGhhdCB2ZXJzaW9uIGlzIHRoZSBzYW1lLCB0aGVuIHRoaXMgaXMgdGhlIHNhbWUgZmlsZSwgYW5kIHdlIGNhbiBza2lwIGl0LlxuICAgICAgICAgIGlmIChvbGRWZXJzaW9ucy5oYXMoc2ZQYXRoKSAmJiBuZXdWZXJzaW9ucy5oYXMoc2ZQYXRoKSAmJlxuICAgICAgICAgICAgICBvbGRWZXJzaW9ucy5nZXQoc2ZQYXRoKSEgPT09IG5ld1ZlcnNpb25zLmdldChzZlBhdGgpISkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gT3RoZXJ3aXNlLCBhc3N1bWUgdGhhdCB0aGUgZmlsZSBoYXMgY2hhbmdlZC4gRWl0aGVyIGl0cyB2ZXJzaW9ucyBkaWRuJ3QgbWF0Y2gsIG9yIHdlXG4gICAgICAgICAgLy8gd2VyZSBtaXNzaW5nIHZlcnNpb24gaW5mb3JtYXRpb24gYWJvdXQgaXQgb24gb25lIHNpZGUgZm9yIHNvbWUgcmVhc29uLlxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQmFpbCBvdXQgaWYgYSAuZC50cyBmaWxlIGNoYW5nZXMgLSB0aGUgc2VtYW50aWMgZGVwIGdyYXBoIGlzIG5vdCBhYmxlIHRvIHByb2Nlc3Mgc3VjaFxuICAgICAgICAvLyBjaGFuZ2VzIGNvcnJlY3RseSB5ZXQuXG4gICAgICAgIGlmIChzZi5pc0RlY2xhcmF0aW9uRmlsZSkge1xuICAgICAgICAgIHJldHVybiBJbmNyZW1lbnRhbENvbXBpbGF0aW9uLmZyZXNoKHByb2dyYW0sIG5ld1ZlcnNpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBmaWxlIGhhcyBjaGFuZ2VkIHBoeXNpY2FsbHksIHNvIHJlY29yZCBpdC5cbiAgICAgICAgcGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzLmFkZChzZlBhdGgpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZW1vdmUgYW55IGZpbGVzIHRoYXQgaGF2ZSBiZWVuIGRlbGV0ZWQgZnJvbSB0aGUgbGlzdCBvZiBwaHlzaWNhbCBjaGFuZ2VzLlxuICAgICAgZm9yIChjb25zdCBkZWxldGVkRmlsZU5hbWUgb2YgZGVsZXRlZFRzRmlsZXMpIHtcbiAgICAgICAgcGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzLmRlbGV0ZShyZXNvbHZlKGRlbGV0ZWRGaWxlTmFtZSkpO1xuICAgICAgfVxuXG4gICAgICAvLyBVc2UgdGhlIHByaW9yIGRlcGVuZGVuY3kgZ3JhcGggdG8gcHJvamVjdCBwaHlzaWNhbCBjaGFuZ2VzIGludG8gYSBzZXQgb2YgbG9naWNhbGx5IGNoYW5nZWRcbiAgICAgIC8vIGZpbGVzLlxuICAgICAgY29uc3QgZGVwR3JhcGggPSBuZXcgRmlsZURlcGVuZGVuY3lHcmFwaCgpO1xuICAgICAgY29uc3QgbG9naWNhbGx5Q2hhbmdlZFRzRmlsZXMgPSBkZXBHcmFwaC51cGRhdGVXaXRoUGh5c2ljYWxDaGFuZ2VzKFxuICAgICAgICAgIHByaW9yQW5hbHlzaXMuZGVwR3JhcGgsIHBoeXNpY2FsbHlDaGFuZ2VkVHNGaWxlcywgZGVsZXRlZFRzRmlsZXMsIGNoYW5nZWRSZXNvdXJjZUZpbGVzKTtcblxuICAgICAgLy8gUGh5c2ljYWxseSBjaGFuZ2VkIGZpbGVzIGFyZW4ndCBuZWNlc3NhcmlseSBjb3VudGVkIGFzIGxvZ2ljYWxseSBjaGFuZ2VkIGJ5IHRoZSBkZXBlbmRlbmN5XG4gICAgICAvLyBncmFwaCAoZmlsZXMgZG8gbm90IGhhdmUgZWRnZXMgdG8gdGhlbXNlbHZlcyksIHNvIGFkZCB0aGVtIHRvIHRoZSBsb2dpY2FsIGNoYW5nZXNcbiAgICAgIC8vIGV4cGxpY2l0bHkuXG4gICAgICBmb3IgKGNvbnN0IHNmUGF0aCBvZiBwaHlzaWNhbGx5Q2hhbmdlZFRzRmlsZXMpIHtcbiAgICAgICAgbG9naWNhbGx5Q2hhbmdlZFRzRmlsZXMuYWRkKHNmUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0YXJ0IG9mZiBpbiBhIGBEZWx0YUluY3JlbWVudGFsU3RhdGVgIGFzIGEgZGVsdGEgYWdhaW5zdCB0aGUgcHJldmlvdXMgc3VjY2Vzc2Z1bCBhbmFseXNpcyxcbiAgICAgIC8vIHVudGlsIHRoaXMgY29tcGlsYXRpb24gY29tcGxldGVzIGl0cyBvd24gYW5hbHlzaXMuXG4gICAgICBjb25zdCBzdGF0ZTogRGVsdGFJbmNyZW1lbnRhbFN0YXRlID0ge1xuICAgICAgICBraW5kOiBJbmNyZW1lbnRhbFN0YXRlS2luZC5EZWx0YSxcbiAgICAgICAgcGh5c2ljYWxseUNoYW5nZWRUc0ZpbGVzLFxuICAgICAgICBjaGFuZ2VkUmVzb3VyY2VGaWxlcyxcbiAgICAgICAgbGFzdEFuYWx5emVkU3RhdGU6IHByaW9yQW5hbHlzaXMsXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gbmV3IEluY3JlbWVudGFsQ29tcGlsYXRpb24oc3RhdGUsIGRlcEdyYXBoLCBuZXdWZXJzaW9ucywge1xuICAgICAgICBwcmlvclN0YXRlOiBwcmlvckFuYWx5c2lzLFxuICAgICAgICBsb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcyxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0IHN0YXRlKCk6IEluY3JlbWVudGFsU3RhdGUge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZTtcbiAgfVxuXG4gIGdldCBzZW1hbnRpY0RlcEdyYXBoVXBkYXRlcigpOiBTZW1hbnRpY0RlcEdyYXBoVXBkYXRlciB7XG4gICAgaWYgKHRoaXMucGhhc2Uua2luZCAhPT0gUGhhc2VLaW5kLkFuYWx5c2lzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBDYW5ub3QgdXBkYXRlIHRoZSBTZW1hbnRpY0RlcEdyYXBoIGFmdGVyIGFuYWx5c2lzIGNvbXBsZXRlc2ApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5waGFzZS5zZW1hbnRpY0RlcEdyYXBoVXBkYXRlcjtcbiAgfVxuXG4gIHJlY29yZFN1Y2Nlc3NmdWxBbmFseXNpcyh0cmFpdENvbXBpbGVyOiBUcmFpdENvbXBpbGVyKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGhhc2Uua2luZCAhPT0gUGhhc2VLaW5kLkFuYWx5c2lzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBJbmNyZW1lbnRhbCBjb21waWxhdGlvbiBpbiBwaGFzZSAke1xuICAgICAgICAgIFBoYXNlS2luZFt0aGlzLnBoYXNlLmtpbmRdfSwgZXhwZWN0ZWQgQW5hbHlzaXNgKTtcbiAgICB9XG5cbiAgICBjb25zdCB7bmVlZHNFbWl0LCBuZWVkc1R5cGVDaGVja0VtaXQsIG5ld0dyYXBofSA9IHRoaXMucGhhc2Uuc2VtYW50aWNEZXBHcmFwaFVwZGF0ZXIuZmluYWxpemUoKTtcblxuICAgIC8vIERldGVybWluZSB0aGUgc2V0IG9mIGZpbGVzIHdoaWNoIGhhdmUgYWxyZWFkeSBiZWVuIGVtaXR0ZWQuXG4gICAgbGV0IGVtaXR0ZWQ6IFNldDxBYnNvbHV0ZUZzUGF0aD47XG4gICAgaWYgKHRoaXMuc3RlcCA9PT0gbnVsbCkge1xuICAgICAgLy8gU2luY2UgdGhlcmUgaXMgbm8gcHJpb3IgY29tcGlsYXRpb24sIG5vIGZpbGVzIGhhdmUgeWV0IGJlZW4gZW1pdHRlZC5cbiAgICAgIGVtaXR0ZWQgPSBuZXcgU2V0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEJlZ2luIHdpdGggdGhlIGZpbGVzIGVtaXR0ZWQgYnkgdGhlIHByaW9yIHN1Y2Nlc3NmdWwgY29tcGlsYXRpb24sIGJ1dCByZW1vdmUgdGhvc2Ugd2hpY2ggd2VcbiAgICAgIC8vIGtub3cgbmVlZCB0byBiZWUgcmUtZW1pdHRlZC5cbiAgICAgIGVtaXR0ZWQgPSBuZXcgU2V0KHRoaXMuc3RlcC5wcmlvclN0YXRlLmVtaXR0ZWQpO1xuXG4gICAgICAvLyBGaWxlcyBuZWVkIHJlLWVtaXR0ZWQgaWYgdGhleSd2ZSBsb2dpY2FsbHkgY2hhbmdlZC5cbiAgICAgIGZvciAoY29uc3Qgc2ZQYXRoIG9mIHRoaXMuc3RlcC5sb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcykge1xuICAgICAgICBlbWl0dGVkLmRlbGV0ZShzZlBhdGgpO1xuICAgICAgfVxuXG4gICAgICAvLyBGaWxlcyBuZWVkIHJlLWVtaXR0ZWQgaWYgdGhleSd2ZSBzZW1hbnRpY2FsbHkgY2hhbmdlZC5cbiAgICAgIGZvciAoY29uc3Qgc2ZQYXRoIG9mIG5lZWRzRW1pdCkge1xuICAgICAgICBlbWl0dGVkLmRlbGV0ZShzZlBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRyYW5zaXRpb24gdG8gYSBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgY29tcGlsYXRpb24uIEF0IHRoaXMgcG9pbnQsIGEgc3Vic2VxdWVudCBjb21waWxhdGlvblxuICAgIC8vIGNvdWxkIHVzZSB0aGlzIHN0YXRlIGFzIGEgc3RhcnRpbmcgcG9pbnQuXG4gICAgdGhpcy5fc3RhdGUgPSB7XG4gICAgICBraW5kOiBJbmNyZW1lbnRhbFN0YXRlS2luZC5BbmFseXplZCxcbiAgICAgIHZlcnNpb25zOiB0aGlzLnZlcnNpb25zLFxuICAgICAgZGVwR3JhcGg6IHRoaXMuZGVwR3JhcGgsXG4gICAgICBzZW1hbnRpY0RlcEdyYXBoOiBuZXdHcmFwaCxcbiAgICAgIHByaW9yQW5hbHlzaXM6IHRyYWl0Q29tcGlsZXIuZ2V0QW5hbHl6ZWRSZWNvcmRzKCksXG4gICAgICB0eXBlQ2hlY2tSZXN1bHRzOiBudWxsLFxuICAgICAgZW1pdHRlZCxcbiAgICB9O1xuXG4gICAgLy8gV2Ugbm93IGVudGVyIHRoZSB0eXBlLWNoZWNrIGFuZCBlbWl0IHBoYXNlIG9mIGNvbXBpbGF0aW9uLlxuICAgIHRoaXMucGhhc2UgPSB7XG4gICAgICBraW5kOiBQaGFzZUtpbmQuVHlwZUNoZWNrQW5kRW1pdCxcbiAgICAgIG5lZWRzRW1pdCxcbiAgICAgIG5lZWRzVHlwZUNoZWNrRW1pdCxcbiAgICB9O1xuICB9XG5cbiAgcmVjb3JkU3VjY2Vzc2Z1bFR5cGVDaGVjayhyZXN1bHRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIEZpbGVUeXBlQ2hlY2tpbmdEYXRhPik6IHZvaWQge1xuICAgIGlmICh0aGlzLl9zdGF0ZS5raW5kICE9PSBJbmNyZW1lbnRhbFN0YXRlS2luZC5BbmFseXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogRXhwZWN0ZWQgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGNvbXBpbGF0aW9uLmApO1xuICAgIH0gZWxzZSBpZiAodGhpcy5waGFzZS5raW5kICE9PSBQaGFzZUtpbmQuVHlwZUNoZWNrQW5kRW1pdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogSW5jcmVtZW50YWwgY29tcGlsYXRpb24gaW4gcGhhc2UgJHtcbiAgICAgICAgICBQaGFzZUtpbmRbdGhpcy5waGFzZS5raW5kXX0sIGV4cGVjdGVkIFR5cGVDaGVja2ApO1xuICAgIH1cblxuICAgIHRoaXMuX3N0YXRlLnR5cGVDaGVja1Jlc3VsdHMgPSByZXN1bHRzO1xuICB9XG5cblxuICByZWNvcmRTdWNjZXNzZnVsRW1pdChzZjogdHMuU291cmNlRmlsZSk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9zdGF0ZS5raW5kICE9PSBJbmNyZW1lbnRhbFN0YXRlS2luZC5BbmFseXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc3NlcnRpb25FcnJvcjogRXhwZWN0ZWQgc3VjY2Vzc2Z1bGx5IGFuYWx5emVkIGNvbXBpbGF0aW9uLmApO1xuICAgIH1cbiAgICB0aGlzLl9zdGF0ZS5lbWl0dGVkLmFkZChhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKSk7XG4gIH1cblxuICBwcmlvckFuYWx5c2lzRm9yKHNmOiB0cy5Tb3VyY2VGaWxlKTogQ2xhc3NSZWNvcmRbXXxudWxsIHtcbiAgICBpZiAodGhpcy5zdGVwID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzZlBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNmKTtcblxuICAgIC8vIElmIHRoZSBmaWxlIGhhcyBsb2dpY2FsbHkgY2hhbmdlZCwgaXRzIHByZXZpb3VzIGFuYWx5c2lzIGNhbm5vdCBiZSByZXVzZWQuXG4gICAgaWYgKHRoaXMuc3RlcC5sb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcy5oYXMoc2ZQYXRoKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcHJpb3JBbmFseXNpcyA9IHRoaXMuc3RlcC5wcmlvclN0YXRlLnByaW9yQW5hbHlzaXM7XG4gICAgaWYgKCFwcmlvckFuYWx5c2lzLmhhcyhzZikpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcHJpb3JBbmFseXNpcy5nZXQoc2YpITtcbiAgfVxuXG4gIHByaW9yVHlwZUNoZWNraW5nUmVzdWx0c0ZvcihzZjogdHMuU291cmNlRmlsZSk6IEZpbGVUeXBlQ2hlY2tpbmdEYXRhfG51bGwge1xuICAgIGlmICh0aGlzLnBoYXNlLmtpbmQgIT09IFBoYXNlS2luZC5UeXBlQ2hlY2tBbmRFbWl0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCBzdWNjZXNzZnVsbHkgYW5hbHl6ZWQgY29tcGlsYXRpb24uYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RlcCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICAvLyBJZiB0aGUgZmlsZSBoYXMgbG9naWNhbGx5IGNoYW5nZWQsIG9yIGl0cyB0ZW1wbGF0ZSB0eXBlLWNoZWNraW5nIHJlc3VsdHMgaGF2ZSBzZW1hbnRpY2FsbHlcbiAgICAvLyBjaGFuZ2VkLCB0aGVuIHBhc3QgdHlwZS1jaGVja2luZyByZXN1bHRzIGNhbm5vdCBiZSByZXVzZWQuXG4gICAgaWYgKHRoaXMuc3RlcC5sb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcy5oYXMoc2ZQYXRoKSB8fFxuICAgICAgICB0aGlzLnBoYXNlLm5lZWRzVHlwZUNoZWNrRW1pdC5oYXMoc2ZQYXRoKSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gUGFzdCByZXN1bHRzIGFsc28gY2Fubm90IGJlIHJldXNlZCBpZiB0aGV5J3JlIG5vdCBhdmFpbGFibGUuXG4gICAgaWYgKHRoaXMuc3RlcC5wcmlvclN0YXRlLnR5cGVDaGVja1Jlc3VsdHMgPT09IG51bGwgfHxcbiAgICAgICAgIXRoaXMuc3RlcC5wcmlvclN0YXRlLnR5cGVDaGVja1Jlc3VsdHMuaGFzKHNmUGF0aCkpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHByaW9yUmVzdWx0cyA9IHRoaXMuc3RlcC5wcmlvclN0YXRlLnR5cGVDaGVja1Jlc3VsdHMuZ2V0KHNmUGF0aCkhO1xuICAgIC8vIElmIHRoZSBwYXN0IHJlc3VsdHMgcmVsaWVkIG9uIGlubGluaW5nLCB0aGV5J3JlIG5vdCBzYWZlIGZvciByZXVzZS5cbiAgICBpZiAocHJpb3JSZXN1bHRzLmhhc0lubGluZXMpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBwcmlvclJlc3VsdHM7XG4gIH1cblxuICBzYWZlVG9Ta2lwRW1pdChzZjogdHMuU291cmNlRmlsZSk6IGJvb2xlYW4ge1xuICAgIC8vIElmIHRoaXMgaXMgYSBmcmVzaCBjb21waWxhdGlvbiwgaXQncyBuZXZlciBzYWZlIHRvIHNraXAgYW4gZW1pdC5cbiAgICBpZiAodGhpcy5zdGVwID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3Qgc2ZQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzZik7XG5cbiAgICAvLyBJZiB0aGUgZmlsZSBoYXMgaXRzZWxmIGxvZ2ljYWxseSBjaGFuZ2VkLCBpdCBtdXN0IGJlIGVtaXR0ZWQuXG4gICAgaWYgKHRoaXMuc3RlcC5sb2dpY2FsbHlDaGFuZ2VkVHNGaWxlcy5oYXMoc2ZQYXRoKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnBoYXNlLmtpbmQgIT09IFBoYXNlS2luZC5UeXBlQ2hlY2tBbmRFbWl0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEFzc2VydGlvbkVycm9yOiBFeHBlY3RlZCBzdWNjZXNzZnVsIGFuYWx5c2lzIGJlZm9yZSBhdHRlbXB0aW5nIHRvIGVtaXQgZmlsZXNgKTtcbiAgICB9XG5cbiAgICAvLyBJZiBkdXJpbmcgYW5hbHlzaXMgaXQgd2FzIGRldGVybWluZWQgdGhhdCB0aGlzIGZpbGUgaGFzIHNlbWFudGljYWxseSBjaGFuZ2VkLCBpdCBtdXN0IGJlXG4gICAgLy8gZW1pdHRlZC5cbiAgICBpZiAodGhpcy5waGFzZS5uZWVkc0VtaXQuaGFzKHNmUGF0aCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBHZW5lcmFsbHkgaXQgc2hvdWxkIGJlIHNhZmUgdG8gYXNzdW1lIGhlcmUgdGhhdCB0aGUgZmlsZSB3YXMgcHJldmlvdXNseSBlbWl0dGVkIGJ5IHRoZSBsYXN0XG4gICAgLy8gc3VjY2Vzc2Z1bCBjb21waWxhdGlvbi4gSG93ZXZlciwgYXMgYSBkZWZlbnNlLWluLWRlcHRoIGFnYWluc3QgaW5jb3JyZWN0bmVzcywgd2UgZXhwbGljaXRseVxuICAgIC8vIGNoZWNrIHRoYXQgdGhlIGxhc3QgZW1pdCBpbmNsdWRlZCB0aGlzIGZpbGUsIGFuZCByZS1lbWl0IGl0IG90aGVyd2lzZS5cbiAgICByZXR1cm4gdGhpcy5zdGVwLnByaW9yU3RhdGUuZW1pdHRlZC5oYXMoc2ZQYXRoKTtcbiAgfVxufVxuXG4vKipcbiAqIFRvIGFjY3VyYXRlbHkgZGV0ZWN0IHdoZXRoZXIgYSBzb3VyY2UgZmlsZSB3YXMgYWZmZWN0ZWQgZHVyaW5nIGFuIGluY3JlbWVudGFsIHJlYnVpbGQsIHRoZVxuICogXCJvcmlnaW5hbFwiIHNvdXJjZSBmaWxlIG5lZWRzIHRvIGJlIGNvbnNpc3RlbnRseSB1c2VkLlxuICpcbiAqIEZpcnN0LCBUeXBlU2NyaXB0IG1heSBoYXZlIGNyZWF0ZWQgc291cmNlIGZpbGUgcmVkaXJlY3RzIHdoZW4gZGVjbGFyYXRpb24gZmlsZXMgb2YgdGhlIHNhbWVcbiAqIHZlcnNpb24gb2YgYSBsaWJyYXJ5IGFyZSBpbmNsdWRlZCBtdWx0aXBsZSB0aW1lcy4gVGhlIG5vbi1yZWRpcmVjdGVkIHNvdXJjZSBmaWxlIHNob3VsZCBiZSB1c2VkXG4gKiB0byBkZXRlY3QgY2hhbmdlcywgYXMgb3RoZXJ3aXNlIHRoZSByZWRpcmVjdGVkIHNvdXJjZSBmaWxlcyBjYXVzZSBhIG1pc21hdGNoIHdoZW4gY29tcGFyZWQgdG9cbiAqIGEgcHJpb3IgcHJvZ3JhbS5cbiAqXG4gKiBTZWNvbmQsIHRoZSBwcm9ncmFtIHRoYXQgaXMgdXNlZCBmb3IgdGVtcGxhdGUgdHlwZSBjaGVja2luZyBtYXkgY29udGFpbiBtdXRhdGVkIHNvdXJjZSBmaWxlcywgaWZcbiAqIGlubGluZSB0eXBlIGNvbnN0cnVjdG9ycyBvciBpbmxpbmUgdGVtcGxhdGUgdHlwZS1jaGVjayBibG9ja3MgaGFkIHRvIGJlIHVzZWQuIFN1Y2ggc291cmNlIGZpbGVzXG4gKiBzdG9yZSB0aGVpciBvcmlnaW5hbCwgbm9uLW11dGF0ZWQgc291cmNlIGZpbGUgZnJvbSB0aGUgb3JpZ2luYWwgcHJvZ3JhbSBpbiBhIHN5bWJvbC4gRm9yXG4gKiBjb21wdXRpbmcgdGhlIGFmZmVjdGVkIGZpbGVzIGluIGFuIGluY3JlbWVudGFsIGJ1aWxkIHRoaXMgb3JpZ2luYWwgc291cmNlIGZpbGUgc2hvdWxkIGJlIHVzZWQsIGFzXG4gKiB0aGUgbXV0YXRlZCBzb3VyY2UgZmlsZSB3b3VsZCBhbHdheXMgYmUgY29uc2lkZXJlZCBhZmZlY3RlZC5cbiAqL1xuZnVuY3Rpb24gdG9PcmlnaW5hbFNvdXJjZUZpbGUoc2Y6IHRzLlNvdXJjZUZpbGUpOiB0cy5Tb3VyY2VGaWxlIHtcbiAgY29uc3QgdW5yZWRpcmVjdGVkU2YgPSB0b1VucmVkaXJlY3RlZFNvdXJjZUZpbGUoc2YpO1xuICBjb25zdCBvcmlnaW5hbEZpbGUgPSAodW5yZWRpcmVjdGVkU2YgYXMgTWF5YmVTb3VyY2VGaWxlV2l0aE9yaWdpbmFsRmlsZSlbTmdPcmlnaW5hbEZpbGVdO1xuICBpZiAob3JpZ2luYWxGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gb3JpZ2luYWxGaWxlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB1bnJlZGlyZWN0ZWRTZjtcbiAgfVxufVxuIl19