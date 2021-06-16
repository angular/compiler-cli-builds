/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { verifySupportedTypeScriptVersion } from '../typescript_support';
import { freshCompilationTicket, incrementalFromCompilerTicket, NgCompiler, NgCompilerHost } from './core';
import { absoluteFrom, getFileSystem } from './file_system';
import { TrackedIncrementalBuildStrategy } from './incremental';
import { ActivePerfRecorder, PerfCheckpoint as PerfCheckpoint, PerfEvent, PerfPhase } from './perf';
import { TsCreateProgramDriver } from './program_driver';
import { retagAllTsFiles, untagAllTsFiles } from './shims';
import { OptimizeFor } from './typecheck/api';
/**
 * Entrypoint to the Angular Compiler (Ivy+) which sits behind the `api.Program` interface, allowing
 * it to be a drop-in replacement for the legacy View Engine compiler to tooling such as the
 * command-line main() function or the Angular CLI.
 */
export class NgtscProgram {
    constructor(rootNames, options, delegateHost, oldProgram) {
        this.options = options;
        const perfRecorder = ActivePerfRecorder.zeroedToNow();
        perfRecorder.phase(PerfPhase.Setup);
        // First, check whether the current TS version is supported.
        if (!options.disableTypeScriptVersionCheck) {
            verifySupportedTypeScriptVersion();
        }
        this.closureCompilerEnabled = !!options.annotateForClosureCompiler;
        const reuseProgram = oldProgram === null || oldProgram === void 0 ? void 0 : oldProgram.compiler.getCurrentProgram();
        this.host = NgCompilerHost.wrap(delegateHost, rootNames, options, reuseProgram !== null && reuseProgram !== void 0 ? reuseProgram : null);
        if (reuseProgram !== undefined) {
            // Prior to reusing the old program, restore shim tagging for all its `ts.SourceFile`s.
            // TypeScript checks the `referencedFiles` of `ts.SourceFile`s for changes when evaluating
            // incremental reuse of data from the old program, so it's important that these match in order
            // to get the most benefit out of reuse.
            retagAllTsFiles(reuseProgram);
        }
        this.tsProgram = perfRecorder.inPhase(PerfPhase.TypeScriptProgramCreate, () => ts.createProgram(this.host.inputFiles, options, this.host, reuseProgram));
        perfRecorder.phase(PerfPhase.Unaccounted);
        perfRecorder.memory(PerfCheckpoint.TypeScriptProgramCreate);
        this.host.postProgramCreationCleanup();
        // Shim tagging has served its purpose, and tags can now be removed from all `ts.SourceFile`s in
        // the program.
        untagAllTsFiles(this.tsProgram);
        const programDriver = new TsCreateProgramDriver(this.tsProgram, this.host, this.options, this.host.shimExtensionPrefixes);
        this.incrementalStrategy = oldProgram !== undefined ?
            oldProgram.incrementalStrategy.toNextBuildStrategy() :
            new TrackedIncrementalBuildStrategy();
        const modifiedResourceFiles = new Set();
        if (this.host.getModifiedResourceFiles !== undefined) {
            const strings = this.host.getModifiedResourceFiles();
            if (strings !== undefined) {
                for (const fileString of strings) {
                    modifiedResourceFiles.add(absoluteFrom(fileString));
                }
            }
        }
        let ticket;
        if (oldProgram === undefined) {
            ticket = freshCompilationTicket(this.tsProgram, options, this.incrementalStrategy, programDriver, perfRecorder, 
            /* enableTemplateTypeChecker */ false, /* usePoisonedData */ false);
        }
        else {
            ticket = incrementalFromCompilerTicket(oldProgram.compiler, this.tsProgram, this.incrementalStrategy, programDriver, modifiedResourceFiles, perfRecorder);
        }
        // Create the NgCompiler which will drive the rest of the compilation.
        this.compiler = NgCompiler.fromTicket(ticket, this.host);
    }
    getTsProgram() {
        return this.tsProgram;
    }
    getReuseTsProgram() {
        return this.compiler.getCurrentProgram();
    }
    getTsOptionDiagnostics(cancellationToken) {
        return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => this.tsProgram.getOptionsDiagnostics(cancellationToken));
    }
    getTsSyntacticDiagnostics(sourceFile, cancellationToken) {
        return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => {
            const ignoredFiles = this.compiler.ignoreForDiagnostics;
            let res;
            if (sourceFile !== undefined) {
                if (ignoredFiles.has(sourceFile)) {
                    return [];
                }
                res = this.tsProgram.getSyntacticDiagnostics(sourceFile, cancellationToken);
            }
            else {
                const diagnostics = [];
                for (const sf of this.tsProgram.getSourceFiles()) {
                    if (!ignoredFiles.has(sf)) {
                        diagnostics.push(...this.tsProgram.getSyntacticDiagnostics(sf, cancellationToken));
                    }
                }
                res = diagnostics;
            }
            return res;
        });
    }
    getTsSemanticDiagnostics(sourceFile, cancellationToken) {
        return this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptDiagnostics, () => {
            const ignoredFiles = this.compiler.ignoreForDiagnostics;
            let res;
            if (sourceFile !== undefined) {
                if (ignoredFiles.has(sourceFile)) {
                    return [];
                }
                res = this.tsProgram.getSemanticDiagnostics(sourceFile, cancellationToken);
            }
            else {
                const diagnostics = [];
                for (const sf of this.tsProgram.getSourceFiles()) {
                    if (!ignoredFiles.has(sf)) {
                        diagnostics.push(...this.tsProgram.getSemanticDiagnostics(sf, cancellationToken));
                    }
                }
                res = diagnostics;
            }
            return res;
        });
    }
    getNgOptionDiagnostics(cancellationToken) {
        return this.compiler.getOptionDiagnostics();
    }
    getNgStructuralDiagnostics(cancellationToken) {
        return [];
    }
    getNgSemanticDiagnostics(fileName, cancellationToken) {
        let sf = undefined;
        if (fileName !== undefined) {
            sf = this.tsProgram.getSourceFile(fileName);
            if (sf === undefined) {
                // There are no diagnostics for files which don't exist in the program - maybe the caller
                // has stale data?
                return [];
            }
        }
        if (sf === undefined) {
            return this.compiler.getDiagnostics();
        }
        else {
            return this.compiler.getDiagnosticsForFile(sf, OptimizeFor.WholeProgram);
        }
    }
    /**
     * Ensure that the `NgCompiler` has properly analyzed the program, and allow for the asynchronous
     * loading of any resources during the process.
     *
     * This is used by the Angular CLI to allow for spawning (async) child compilations for things
     * like SASS files used in `styleUrls`.
     */
    loadNgStructureAsync() {
        return this.compiler.analyzeAsync();
    }
    listLazyRoutes(entryRoute) {
        return this.compiler.listLazyRoutes(entryRoute);
    }
    emit(opts) {
        this.compiler.perfRecorder.memory(PerfCheckpoint.PreEmit);
        const res = this.compiler.perfRecorder.inPhase(PerfPhase.TypeScriptEmit, () => {
            const { transformers } = this.compiler.prepareEmit();
            const ignoreFiles = this.compiler.ignoreForEmit;
            const emitCallback = opts && opts.emitCallback || defaultEmitCallback;
            const writeFile = (fileName, data, writeByteOrderMark, onError, sourceFiles) => {
                if (sourceFiles !== undefined) {
                    // Record successful writes for any `ts.SourceFile` (that's not a declaration file)
                    // that's an input to this write.
                    for (const writtenSf of sourceFiles) {
                        if (writtenSf.isDeclarationFile) {
                            continue;
                        }
                        this.compiler.incrementalCompilation.recordSuccessfulEmit(writtenSf);
                    }
                }
                this.host.writeFile(fileName, data, writeByteOrderMark, onError, sourceFiles);
            };
            const customTransforms = opts && opts.customTransformers;
            const beforeTransforms = transformers.before || [];
            const afterDeclarationsTransforms = transformers.afterDeclarations;
            if (customTransforms !== undefined && customTransforms.beforeTs !== undefined) {
                beforeTransforms.push(...customTransforms.beforeTs);
            }
            const emitResults = [];
            for (const targetSourceFile of this.tsProgram.getSourceFiles()) {
                if (targetSourceFile.isDeclarationFile || ignoreFiles.has(targetSourceFile)) {
                    continue;
                }
                if (this.compiler.incrementalCompilation.safeToSkipEmit(targetSourceFile)) {
                    this.compiler.perfRecorder.eventCount(PerfEvent.EmitSkipSourceFile);
                    continue;
                }
                this.compiler.perfRecorder.eventCount(PerfEvent.EmitSourceFile);
                emitResults.push(emitCallback({
                    targetSourceFile,
                    program: this.tsProgram,
                    host: this.host,
                    options: this.options,
                    emitOnlyDtsFiles: false,
                    writeFile,
                    customTransformers: {
                        before: beforeTransforms,
                        after: customTransforms && customTransforms.afterTs,
                        afterDeclarations: afterDeclarationsTransforms,
                    },
                }));
            }
            this.compiler.perfRecorder.memory(PerfCheckpoint.Emit);
            // Run the emit, including a custom transformer that will downlevel the Ivy decorators in
            // code.
            return ((opts && opts.mergeEmitResultsCallback) || mergeEmitResults)(emitResults);
        });
        // Record performance analysis information to disk if we've been asked to do so.
        if (this.options.tracePerformance !== undefined) {
            const perf = this.compiler.perfRecorder.finalize();
            getFileSystem().writeFile(getFileSystem().resolve(this.options.tracePerformance), JSON.stringify(perf, null, 2));
        }
        return res;
    }
    getIndexedComponents() {
        return this.compiler.getIndexedComponents();
    }
    getLibrarySummaries() {
        throw new Error('Method not implemented.');
    }
    getEmittedGeneratedFiles() {
        throw new Error('Method not implemented.');
    }
    getEmittedSourceFiles() {
        throw new Error('Method not implemented.');
    }
}
const defaultEmitCallback = ({ program, targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers }) => program.emit(targetSourceFile, writeFile, cancellationToken, emitOnlyDtsFiles, customTransformers);
function mergeEmitResults(emitResults) {
    const diagnostics = [];
    let emitSkipped = false;
    const emittedFiles = [];
    for (const er of emitResults) {
        diagnostics.push(...er.diagnostics);
        emitSkipped = emitSkipped || er.emitSkipped;
        emittedFiles.push(...(er.emittedFiles || []));
    }
    return { diagnostics, emitSkipped, emittedFiles };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3JhbS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcHJvZ3JhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFHSCxPQUFPLEtBQUssRUFBRSxNQUFNLFlBQVksQ0FBQztBQUdqQyxPQUFPLEVBQUMsZ0NBQWdDLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUV2RSxPQUFPLEVBQW9CLHNCQUFzQixFQUFFLDZCQUE2QixFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFFNUgsT0FBTyxFQUFDLFlBQVksRUFBa0IsYUFBYSxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQzFFLE9BQU8sRUFBQywrQkFBK0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUU5RCxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsY0FBYyxJQUFJLGNBQWMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBQ2xHLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBRXZELE9BQU8sRUFBQyxlQUFlLEVBQUUsZUFBZSxFQUFDLE1BQU0sU0FBUyxDQUFDO0FBQ3pELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUk1Qzs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFZdkIsWUFDSSxTQUFnQyxFQUFVLE9BQTBCLEVBQ3BFLFlBQThCLEVBQUUsVUFBeUI7UUFEZixZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQUV0RSxNQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUV0RCxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwQyw0REFBNEQ7UUFDNUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRTtZ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V0FBVyxHQUFHLEtBQUssQ0FBQztJQUN4QixNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7SUFDbEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxXQUFXLEVBQUU7UUFDNUIsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNwQyxXQUFXLEdBQUcsV0FBVyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDNUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQy9DO0lBRUQsT0FBTyxFQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFDLENBQUM7QUFDbEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0dlbmVyYXRlZEZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQgKiBhcyBhcGkgZnJvbSAnLi4vdHJhbnNmb3JtZXJzL2FwaSc7XG5pbXBvcnQge3ZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9ufSBmcm9tICcuLi90eXBlc2NyaXB0X3N1cHBvcnQnO1xuXG5pbXBvcnQge0NvbXBpbGF0aW9uVGlja2V0LCBmcmVzaENvbXBpbGF0aW9uVGlja2V0LCBpbmNyZW1lbnRhbEZyb21Db21waWxlclRpY2tldCwgTmdDb21waWxlciwgTmdDb21waWxlckhvc3R9IGZyb20gJy4vY29yZSc7XG5pbXBvcnQge05nQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL2NvcmUvYXBpJztcbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBBYnNvbHV0ZUZzUGF0aCwgZ2V0RmlsZVN5c3RlbX0gZnJvbSAnLi9maWxlX3N5c3RlbSc7XG5pbXBvcnQge1RyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3l9IGZyb20gJy4vaW5jcmVtZW50YWwnO1xuaW1wb3J0IHtJbmRleGVkQ29tcG9uZW50fSBmcm9tICcuL2luZGV4ZXInO1xuaW1wb3J0IHtBY3RpdmVQZXJmUmVjb3JkZXIsIFBlcmZDaGVja3BvaW50IGFzIFBlcmZDaGVja3BvaW50LCBQZXJmRXZlbnQsIFBlcmZQaGFzZX0gZnJvbSAnLi9wZXJmJztcbmltcG9ydCB7VHNDcmVhdGVQcm9ncmFtRHJpdmVyfSBmcm9tICcuL3Byb2dyYW1fZHJpdmVyJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlfSBmcm9tICcuL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtyZXRhZ0FsbFRzRmlsZXMsIHVudGFnQWxsVHNGaWxlc30gZnJvbSAnLi9zaGltcyc7XG5pbXBvcnQge09wdGltaXplRm9yfSBmcm9tICcuL3R5cGVjaGVjay9hcGknO1xuXG5cblxuLyoqXG4gKiBFbnRyeXBvaW50IHRvIHRoZSBBbmd1bGFyIENvbXBpbGVyIChJdnkrKSB3aGljaCBzaXRzIGJlaGluZCB0aGUgYGFwaS5Qcm9ncmFtYCBpbnRlcmZhY2UsIGFsbG93aW5nXG4gKiBpdCB0byBiZSBhIGRyb3AtaW4gcmVwbGFjZW1lbnQgZm9yIHRoZSBsZWdhY3kgVmlldyBFbmdpbmUgY29tcGlsZXIgdG8gdG9vbGluZyBzdWNoIGFzIHRoZVxuICogY29tbWFuZC1saW5lIG1haW4oKSBmdW5jdGlvbiBvciB0aGUgQW5ndWxhciBDTEkuXG4gKi9cbmV4cG9ydCBjbGFzcyBOZ3RzY1Byb2dyYW0gaW1wbGVtZW50cyBhcGkuUHJvZ3JhbSB7XG4gIHJlYWRvbmx5IGNvbXBpbGVyOiBOZ0NvbXBpbGVyO1xuXG4gIC8qKlxuICAgKiBUaGUgcHJpbWFyeSBUeXBlU2NyaXB0IHByb2dyYW0sIHdoaWNoIGlzIHVzZWQgZm9yIGFuYWx5c2lzIGFuZCBlbWl0LlxuICAgKi9cbiAgcHJpdmF0ZSB0c1Byb2dyYW06IHRzLlByb2dyYW07XG5cbiAgcHJpdmF0ZSBjbG9zdXJlQ29tcGlsZXJFbmFibGVkOiBib29sZWFuO1xuICBwcml2YXRlIGhvc3Q6IE5nQ29tcGlsZXJIb3N0O1xuICBwcml2YXRlIGluY3JlbWVudGFsU3RyYXRlZ3k6IFRyYWNrZWRJbmNyZW1lbnRhbEJ1aWxkU3RyYXRlZ3k7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICByb290TmFtZXM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiwgcHJpdmF0ZSBvcHRpb25zOiBOZ0NvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGRlbGVnYXRlSG9zdDogYXBpLkNvbXBpbGVySG9zdCwgb2xkUHJvZ3JhbT86IE5ndHNjUHJvZ3JhbSkge1xuICAgIGNvbnN0IHBlcmZSZWNvcmRlciA9IEFjdGl2ZVBlcmZSZWNvcmRlci56ZXJvZWRUb05vdygpO1xuXG4gICAgcGVyZlJlY29yZGVyLnBoYXNlKFBlcmZQaGFzZS5TZXR1cCk7XG5cbiAgICAvLyBGaXJzdCwgY2hlY2sgd2hldGhlciB0aGUgY3VycmVudCBUUyB2ZXJzaW9uIGlzIHN1cHBvcnRlZC5cbiAgICBpZiAoIW9wdGlvbnMuZGlzYWJsZVR5cGVTY3JpcHRWZXJzaW9uQ2hlY2spIHtcbiAgICAgIHZlcmlmeVN1cHBvcnRlZFR5cGVTY3JpcHRWZXJzaW9uKCk7XG4gICAgfVxuXG4gICAgdGhpcy5jbG9zdXJlQ29tcGlsZXJFbmFibGVkID0gISFvcHRpb25zLmFubm90YXRlRm9yQ2xvc3VyZUNvbXBpbGVyO1xuXG4gICAgY29uc3QgcmV1c2VQcm9ncmFtID0gb2xkUHJvZ3JhbT8uY29tcGlsZXIuZ2V0Q3VycmVudFByb2dyYW0oKTtcbiAgICB0aGlzLmhvc3QgPSBOZ0NvbXBpbGVySG9zdC53cmFwKGRlbGVnYXRlSG9zdCwgcm9vdE5hbWVzLCBvcHRpb25zLCByZXVzZVByb2dyYW0gPz8gbnVsbCk7XG5cbiAgICBpZiAocmV1c2VQcm9ncmFtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIFByaW9yIHRvIHJldXNpbmcgdGhlIG9sZCBwcm9ncmFtLCByZXN0b3JlIHNoaW0gdGFnZ2luZyBmb3IgYWxsIGl0cyBgdHMuU291cmNlRmlsZWBzLlxuICAgICAgLy8gVHlwZVNjcmlwdCBjaGVja3MgdGhlIGByZWZlcmVuY2VkRmlsZXNgIG9mIGB0cy5Tb3VyY2VGaWxlYHMgZm9yIGNoYW5nZXMgd2hlbiBldmFsdWF0aW5nXG4gICAgICAvLyBpbmNyZW1lbnRhbCByZXVzZSBvZiBkYXRhIGZyb20gdGhlIG9sZCBwcm9ncmFtLCBzbyBpdCdzIGltcG9ydGFudCB0aGF0IHRoZXNlIG1hdGNoIGluIG9yZGVyXG4gICAgICAvLyB0byBnZXQgdGhlIG1vc3QgYmVuZWZpdCBvdXQgb2YgcmV1c2UuXG4gICAgICByZXRhZ0FsbFRzRmlsZXMocmV1c2VQcm9ncmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLnRzUHJvZ3JhbSA9IHBlcmZSZWNvcmRlci5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHlwZVNjcmlwdFByb2dyYW1DcmVhdGUsXG4gICAgICAgICgpID0+IHRzLmNyZWF0ZVByb2dyYW0odGhpcy5ob3N0LmlucHV0RmlsZXMsIG9wdGlvbnMsIHRoaXMuaG9zdCwgcmV1c2VQcm9ncmFtKSk7XG5cbiAgICBwZXJmUmVjb3JkZXIucGhhc2UoUGVyZlBoYXNlLlVuYWNjb3VudGVkKTtcbiAgICBwZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LlR5cGVTY3JpcHRQcm9ncmFtQ3JlYXRlKTtcblxuICAgIHRoaXMuaG9zdC5wb3N0UHJvZ3JhbUNyZWF0aW9uQ2xlYW51cCgpO1xuXG4gICAgLy8gU2hpbSB0YWdnaW5nIGhhcyBzZXJ2ZWQgaXRzIHB1cnBvc2UsIGFuZCB0YWdzIGNhbiBub3cgYmUgcmVtb3ZlZCBmcm9tIGFsbCBgdHMuU291cmNlRmlsZWBzIGluXG4gICAgLy8gdGhlIHByb2dyYW0uXG4gICAgdW50YWdBbGxUc0ZpbGVzKHRoaXMudHNQcm9ncmFtKTtcblxuICAgIGNvbnN0IHByb2dyYW1Ecml2ZXIgPSBuZXcgVHNDcmVhdGVQcm9ncmFtRHJpdmVyKFxuICAgICAgICB0aGlzLnRzUHJvZ3JhbSwgdGhpcy5ob3N0LCB0aGlzLm9wdGlvbnMsIHRoaXMuaG9zdC5zaGltRXh0ZW5zaW9uUHJlZml4ZXMpO1xuXG4gICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5ID0gb2xkUHJvZ3JhbSAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgb2xkUHJvZ3JhbS5pbmNyZW1lbnRhbFN0cmF0ZWd5LnRvTmV4dEJ1aWxkU3RyYXRlZ3koKSA6XG4gICAgICAgIG5ldyBUcmFja2VkSW5jcmVtZW50YWxCdWlsZFN0cmF0ZWd5KCk7XG4gICAgY29uc3QgbW9kaWZpZWRSZXNvdXJjZUZpbGVzID0gbmV3IFNldDxBYnNvbHV0ZUZzUGF0aD4oKTtcbiAgICBpZiAodGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBzdHJpbmdzID0gdGhpcy5ob3N0LmdldE1vZGlmaWVkUmVzb3VyY2VGaWxlcygpO1xuICAgICAgaWYgKHN0cmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGVTdHJpbmcgb2Ygc3RyaW5ncykge1xuICAgICAgICAgIG1vZGlmaWVkUmVzb3VyY2VGaWxlcy5hZGQoYWJzb2x1dGVGcm9tKGZpbGVTdHJpbmcpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCB0aWNrZXQ6IENvbXBpbGF0aW9uVGlja2V0O1xuICAgIGlmIChvbGRQcm9ncmFtID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRpY2tldCA9IGZyZXNoQ29tcGlsYXRpb25UaWNrZXQoXG4gICAgICAgICAgdGhpcy50c1Byb2dyYW0sIG9wdGlvbnMsIHRoaXMuaW5jcmVtZW50YWxTdHJhdGVneSwgcHJvZ3JhbURyaXZlciwgcGVyZlJlY29yZGVyLFxuICAgICAgICAgIC8qIGVuYWJsZVRlbXBsYXRlVHlwZUNoZWNrZXIgKi8gZmFsc2UsIC8qIHVzZVBvaXNvbmVkRGF0YSAqLyBmYWxzZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpY2tldCA9IGluY3JlbWVudGFsRnJvbUNvbXBpbGVyVGlja2V0KFxuICAgICAgICAgIG9sZFByb2dyYW0uY29tcGlsZXIsXG4gICAgICAgICAgdGhpcy50c1Byb2dyYW0sXG4gICAgICAgICAgdGhpcy5pbmNyZW1lbnRhbFN0cmF0ZWd5LFxuICAgICAgICAgIHByb2dyYW1Ecml2ZXIsXG4gICAgICAgICAgbW9kaWZpZWRSZXNvdXJjZUZpbGVzLFxuICAgICAgICAgIHBlcmZSZWNvcmRlcixcbiAgICAgICk7XG4gICAgfVxuXG5cbiAgICAvLyBDcmVhdGUgdGhlIE5nQ29tcGlsZXIgd2hpY2ggd2lsbCBkcml2ZSB0aGUgcmVzdCBvZiB0aGUgY29tcGlsYXRpb24uXG4gICAgdGhpcy5jb21waWxlciA9IE5nQ29tcGlsZXIuZnJvbVRpY2tldCh0aWNrZXQsIHRoaXMuaG9zdCk7XG4gIH1cblxuICBnZXRUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMudHNQcm9ncmFtO1xuICB9XG5cbiAgZ2V0UmV1c2VUc1Byb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0Q3VycmVudFByb2dyYW0oKTtcbiAgfVxuXG4gIGdldFRzT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSB0cy5EaWFnbm9zdGljW10ge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5pblBoYXNlKFxuICAgICAgICBQZXJmUGhhc2UuVHlwZVNjcmlwdERpYWdub3N0aWNzLFxuICAgICAgICAoKSA9PiB0aGlzLnRzUHJvZ3JhbS5nZXRPcHRpb25zRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4pKTtcbiAgfVxuXG4gIGdldFRzU3ludGFjdGljRGlhZ25vc3RpY3MoXG4gICAgICBzb3VyY2VGaWxlPzogdHMuU291cmNlRmlsZXx1bmRlZmluZWQsXG4gICAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmluUGhhc2UoUGVyZlBoYXNlLlR5cGVTY3JpcHREaWFnbm9zdGljcywgKCkgPT4ge1xuICAgICAgY29uc3QgaWdub3JlZEZpbGVzID0gdGhpcy5jb21waWxlci5pZ25vcmVGb3JEaWFnbm9zdGljcztcbiAgICAgIGxldCByZXM6IHJlYWRvbmx5IHRzLkRpYWdub3N0aWNbXTtcbiAgICAgIGlmIChzb3VyY2VGaWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKGlnbm9yZWRGaWxlcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICByZXMgPSB0aGlzLnRzUHJvZ3JhbS5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhzb3VyY2VGaWxlLCBjYW5jZWxsYXRpb25Ub2tlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3Qgc2Ygb2YgdGhpcy50c1Byb2dyYW0uZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICAgIGlmICghaWdub3JlZEZpbGVzLmhhcyhzZikpIHtcbiAgICAgICAgICAgIGRpYWdub3N0aWNzLnB1c2goLi4udGhpcy50c1Byb2dyYW0uZ2V0U3ludGFjdGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGRpYWdub3N0aWNzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIGdldFRzU2VtYW50aWNEaWFnbm9zdGljcyhcbiAgICAgIHNvdXJjZUZpbGU/OiB0cy5Tb3VyY2VGaWxlfHVuZGVmaW5lZCxcbiAgICAgIGNhbmNlbGxhdGlvblRva2VuPzogdHMuQ2FuY2VsbGF0aW9uVG9rZW58dW5kZWZpbmVkKTogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuaW5QaGFzZShQZXJmUGhhc2UuVHlwZVNjcmlwdERpYWdub3N0aWNzLCAoKSA9PiB7XG4gICAgICBjb25zdCBpZ25vcmVkRmlsZXMgPSB0aGlzLmNvbXBpbGVyLmlnbm9yZUZvckRpYWdub3N0aWNzO1xuICAgICAgbGV0IHJlczogcmVhZG9ubHkgdHMuRGlhZ25vc3RpY1tdO1xuICAgICAgaWYgKHNvdXJjZUZpbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoaWdub3JlZEZpbGVzLmhhcyhzb3VyY2VGaWxlKSkge1xuICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcyA9IHRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgZGlhZ25vc3RpY3M6IHRzLkRpYWdub3N0aWNbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHNmIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgICBpZiAoIWlnbm9yZWRGaWxlcy5oYXMoc2YpKSB7XG4gICAgICAgICAgICBkaWFnbm9zdGljcy5wdXNoKC4uLnRoaXMudHNQcm9ncmFtLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc2YsIGNhbmNlbGxhdGlvblRva2VuKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGRpYWdub3N0aWNzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIGdldE5nT3B0aW9uRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQpOiByZWFkb25seSh0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljKVtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRPcHRpb25EaWFnbm9zdGljcygpO1xuICB9XG5cbiAgZ2V0TmdTdHJ1Y3R1cmFsRGlhZ25vc3RpY3MoY2FuY2VsbGF0aW9uVG9rZW4/OiB0cy5DYW5jZWxsYXRpb25Ub2tlbnxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkKTogcmVhZG9ubHkgYXBpLkRpYWdub3N0aWNbXSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgZ2V0TmdTZW1hbnRpY0RpYWdub3N0aWNzKFxuICAgICAgZmlsZU5hbWU/OiBzdHJpbmd8dW5kZWZpbmVkLCBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VufHVuZGVmaW5lZCk6XG4gICAgICByZWFkb25seSh0cy5EaWFnbm9zdGljfGFwaS5EaWFnbm9zdGljKVtdIHtcbiAgICBsZXQgc2Y6IHRzLlNvdXJjZUZpbGV8dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChmaWxlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzZiA9IHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZU5hbWUpO1xuICAgICAgaWYgKHNmID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVGhlcmUgYXJlIG5vIGRpYWdub3N0aWNzIGZvciBmaWxlcyB3aGljaCBkb24ndCBleGlzdCBpbiB0aGUgcHJvZ3JhbSAtIG1heWJlIHRoZSBjYWxsZXJcbiAgICAgICAgLy8gaGFzIHN0YWxlIGRhdGE/XG4gICAgICAgIHJldHVybiBbXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2YgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3MoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKHNmLCBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmUgdGhhdCB0aGUgYE5nQ29tcGlsZXJgIGhhcyBwcm9wZXJseSBhbmFseXplZCB0aGUgcHJvZ3JhbSwgYW5kIGFsbG93IGZvciB0aGUgYXN5bmNocm9ub3VzXG4gICAqIGxvYWRpbmcgb2YgYW55IHJlc291cmNlcyBkdXJpbmcgdGhlIHByb2Nlc3MuXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCBieSB0aGUgQW5ndWxhciBDTEkgdG8gYWxsb3cgZm9yIHNwYXduaW5nIChhc3luYykgY2hpbGQgY29tcGlsYXRpb25zIGZvciB0aGluZ3NcbiAgICogbGlrZSBTQVNTIGZpbGVzIHVzZWQgaW4gYHN0eWxlVXJsc2AuXG4gICAqL1xuICBsb2FkTmdTdHJ1Y3R1cmVBc3luYygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5hbmFseXplQXN5bmMoKTtcbiAgfVxuXG4gIGxpc3RMYXp5Um91dGVzKGVudHJ5Um91dGU/OiBzdHJpbmd8dW5kZWZpbmVkKTogYXBpLkxhenlSb3V0ZVtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5saXN0TGF6eVJvdXRlcyhlbnRyeVJvdXRlKTtcbiAgfVxuXG4gIGVtaXQob3B0cz86IHtcbiAgICBlbWl0RmxhZ3M/OiBhcGkuRW1pdEZsYWdzfHVuZGVmaW5lZDtcbiAgICBjYW5jZWxsYXRpb25Ub2tlbj86IHRzLkNhbmNlbGxhdGlvblRva2VuIHwgdW5kZWZpbmVkO1xuICAgIGN1c3RvbVRyYW5zZm9ybWVycz86IGFwaS5DdXN0b21UcmFuc2Zvcm1lcnMgfCB1bmRlZmluZWQ7XG4gICAgZW1pdENhbGxiYWNrPzogYXBpLlRzRW1pdENhbGxiYWNrIHwgdW5kZWZpbmVkO1xuICAgIG1lcmdlRW1pdFJlc3VsdHNDYWxsYmFjaz86IGFwaS5Uc01lcmdlRW1pdFJlc3VsdHNDYWxsYmFjayB8IHVuZGVmaW5lZDtcbiAgfXx1bmRlZmluZWQpOiB0cy5FbWl0UmVzdWx0IHtcbiAgICB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5tZW1vcnkoUGVyZkNoZWNrcG9pbnQuUHJlRW1pdCk7XG5cbiAgICBjb25zdCByZXMgPSB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5pblBoYXNlKFBlcmZQaGFzZS5UeXBlU2NyaXB0RW1pdCwgKCkgPT4ge1xuICAgICAgY29uc3Qge3RyYW5zZm9ybWVyc30gPSB0aGlzLmNvbXBpbGVyLnByZXBhcmVFbWl0KCk7XG4gICAgICBjb25zdCBpZ25vcmVGaWxlcyA9IHRoaXMuY29tcGlsZXIuaWdub3JlRm9yRW1pdDtcbiAgICAgIGNvbnN0IGVtaXRDYWxsYmFjayA9IG9wdHMgJiYgb3B0cy5lbWl0Q2FsbGJhY2sgfHwgZGVmYXVsdEVtaXRDYWxsYmFjaztcblxuICAgICAgY29uc3Qgd3JpdGVGaWxlOiB0cy5Xcml0ZUZpbGVDYWxsYmFjayA9XG4gICAgICAgICAgKGZpbGVOYW1lOiBzdHJpbmcsIGRhdGE6IHN0cmluZywgd3JpdGVCeXRlT3JkZXJNYXJrOiBib29sZWFuLFxuICAgICAgICAgICBvbkVycm9yOiAoKG1lc3NhZ2U6IHN0cmluZykgPT4gdm9pZCl8dW5kZWZpbmVkLFxuICAgICAgICAgICBzb3VyY2VGaWxlczogUmVhZG9ubHlBcnJheTx0cy5Tb3VyY2VGaWxlPnx1bmRlZmluZWQpID0+IHtcbiAgICAgICAgICAgIGlmIChzb3VyY2VGaWxlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIHdyaXRlcyBmb3IgYW55IGB0cy5Tb3VyY2VGaWxlYCAodGhhdCdzIG5vdCBhIGRlY2xhcmF0aW9uIGZpbGUpXG4gICAgICAgICAgICAgIC8vIHRoYXQncyBhbiBpbnB1dCB0byB0aGlzIHdyaXRlLlxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHdyaXR0ZW5TZiBvZiBzb3VyY2VGaWxlcykge1xuICAgICAgICAgICAgICAgIGlmICh3cml0dGVuU2YuaXNEZWNsYXJhdGlvbkZpbGUpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuY29tcGlsZXIuaW5jcmVtZW50YWxDb21waWxhdGlvbi5yZWNvcmRTdWNjZXNzZnVsRW1pdCh3cml0dGVuU2YpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhvc3Qud3JpdGVGaWxlKGZpbGVOYW1lLCBkYXRhLCB3cml0ZUJ5dGVPcmRlck1hcmssIG9uRXJyb3IsIHNvdXJjZUZpbGVzKTtcbiAgICAgICAgICB9O1xuXG4gICAgICBjb25zdCBjdXN0b21UcmFuc2Zvcm1zID0gb3B0cyAmJiBvcHRzLmN1c3RvbVRyYW5zZm9ybWVycztcbiAgICAgIGNvbnN0IGJlZm9yZVRyYW5zZm9ybXMgPSB0cmFuc2Zvcm1lcnMuYmVmb3JlIHx8IFtdO1xuICAgICAgY29uc3QgYWZ0ZXJEZWNsYXJhdGlvbnNUcmFuc2Zvcm1zID0gdHJhbnNmb3JtZXJzLmFmdGVyRGVjbGFyYXRpb25zO1xuXG4gICAgICBpZiAoY3VzdG9tVHJhbnNmb3JtcyAhPT0gdW5kZWZpbmVkICYmIGN1c3RvbVRyYW5zZm9ybXMuYmVmb3JlVHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBiZWZvcmVUcmFuc2Zvcm1zLnB1c2goLi4uY3VzdG9tVHJhbnNmb3Jtcy5iZWZvcmVUcyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVtaXRSZXN1bHRzOiB0cy5FbWl0UmVzdWx0W10gPSBbXTtcblxuICAgICAgZm9yIChjb25zdCB0YXJnZXRTb3VyY2VGaWxlIG9mIHRoaXMudHNQcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgICAgaWYgKHRhcmdldFNvdXJjZUZpbGUuaXNEZWNsYXJhdGlvbkZpbGUgfHwgaWdub3JlRmlsZXMuaGFzKHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5jb21waWxlci5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnNhZmVUb1NraXBFbWl0KHRhcmdldFNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIuZXZlbnRDb3VudChQZXJmRXZlbnQuRW1pdFNraXBTb3VyY2VGaWxlKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29tcGlsZXIucGVyZlJlY29yZGVyLmV2ZW50Q291bnQoUGVyZkV2ZW50LkVtaXRTb3VyY2VGaWxlKTtcblxuICAgICAgICBlbWl0UmVzdWx0cy5wdXNoKGVtaXRDYWxsYmFjayh7XG4gICAgICAgICAgdGFyZ2V0U291cmNlRmlsZSxcbiAgICAgICAgICBwcm9ncmFtOiB0aGlzLnRzUHJvZ3JhbSxcbiAgICAgICAgICBob3N0OiB0aGlzLmhvc3QsXG4gICAgICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgICAgIGVtaXRPbmx5RHRzRmlsZXM6IGZhbHNlLFxuICAgICAgICAgIHdyaXRlRmlsZSxcbiAgICAgICAgICBjdXN0b21UcmFuc2Zvcm1lcnM6IHtcbiAgICAgICAgICAgIGJlZm9yZTogYmVmb3JlVHJhbnNmb3JtcyxcbiAgICAgICAgICAgIGFmdGVyOiBjdXN0b21UcmFuc2Zvcm1zICYmIGN1c3RvbVRyYW5zZm9ybXMuYWZ0ZXJUcyxcbiAgICAgICAgICAgIGFmdGVyRGVjbGFyYXRpb25zOiBhZnRlckRlY2xhcmF0aW9uc1RyYW5zZm9ybXMsXG4gICAgICAgICAgfSBhcyBhbnksXG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jb21waWxlci5wZXJmUmVjb3JkZXIubWVtb3J5KFBlcmZDaGVja3BvaW50LkVtaXQpO1xuXG4gICAgICAvLyBSdW4gdGhlIGVtaXQsIGluY2x1ZGluZyBhIGN1c3RvbSB0cmFuc2Zvcm1lciB0aGF0IHdpbGwgZG93bmxldmVsIHRoZSBJdnkgZGVjb3JhdG9ycyBpblxuICAgICAgLy8gY29kZS5cbiAgICAgIHJldHVybiAoKG9wdHMgJiYgb3B0cy5tZXJnZUVtaXRSZXN1bHRzQ2FsbGJhY2spIHx8IG1lcmdlRW1pdFJlc3VsdHMpKGVtaXRSZXN1bHRzKTtcbiAgICB9KTtcblxuICAgIC8vIFJlY29yZCBwZXJmb3JtYW5jZSBhbmFseXNpcyBpbmZvcm1hdGlvbiB0byBkaXNrIGlmIHdlJ3ZlIGJlZW4gYXNrZWQgdG8gZG8gc28uXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFjZVBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHBlcmYgPSB0aGlzLmNvbXBpbGVyLnBlcmZSZWNvcmRlci5maW5hbGl6ZSgpO1xuICAgICAgZ2V0RmlsZVN5c3RlbSgpLndyaXRlRmlsZShcbiAgICAgICAgICBnZXRGaWxlU3lzdGVtKCkucmVzb2x2ZSh0aGlzLm9wdGlvbnMudHJhY2VQZXJmb3JtYW5jZSksIEpTT04uc3RyaW5naWZ5KHBlcmYsIG51bGwsIDIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGdldEluZGV4ZWRDb21wb25lbnRzKCk6IE1hcDxEZWNsYXJhdGlvbk5vZGUsIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgICByZXR1cm4gdGhpcy5jb21waWxlci5nZXRJbmRleGVkQ29tcG9uZW50cygpO1xuICB9XG5cbiAgZ2V0TGlicmFyeVN1bW1hcmllcygpOiBNYXA8c3RyaW5nLCBhcGkuTGlicmFyeVN1bW1hcnk+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG4gIH1cblxuICBnZXRFbWl0dGVkR2VuZXJhdGVkRmlsZXMoKTogTWFwPHN0cmluZywgR2VuZXJhdGVkRmlsZT4ge1xuICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbiAgfVxuXG4gIGdldEVtaXR0ZWRTb3VyY2VGaWxlcygpOiBNYXA8c3RyaW5nLCB0cy5Tb3VyY2VGaWxlPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2Qgbm90IGltcGxlbWVudGVkLicpO1xuICB9XG59XG5cbmNvbnN0IGRlZmF1bHRFbWl0Q2FsbGJhY2s6IGFwaS5Uc0VtaXRDYWxsYmFjayA9ICh7XG4gIHByb2dyYW0sXG4gIHRhcmdldFNvdXJjZUZpbGUsXG4gIHdyaXRlRmlsZSxcbiAgY2FuY2VsbGF0aW9uVG9rZW4sXG4gIGVtaXRPbmx5RHRzRmlsZXMsXG4gIGN1c3RvbVRyYW5zZm9ybWVyc1xufSkgPT5cbiAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgIHRhcmdldFNvdXJjZUZpbGUsIHdyaXRlRmlsZSwgY2FuY2VsbGF0aW9uVG9rZW4sIGVtaXRPbmx5RHRzRmlsZXMsIGN1c3RvbVRyYW5zZm9ybWVycyk7XG5cbmZ1bmN0aW9uIG1lcmdlRW1pdFJlc3VsdHMoZW1pdFJlc3VsdHM6IHRzLkVtaXRSZXN1bHRbXSk6IHRzLkVtaXRSZXN1bHQge1xuICBjb25zdCBkaWFnbm9zdGljczogdHMuRGlhZ25vc3RpY1tdID0gW107XG4gIGxldCBlbWl0U2tpcHBlZCA9IGZhbHNlO1xuICBjb25zdCBlbWl0dGVkRmlsZXM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3QgZXIgb2YgZW1pdFJlc3VsdHMpIHtcbiAgICBkaWFnbm9zdGljcy5wdXNoKC4uLmVyLmRpYWdub3N0aWNzKTtcbiAgICBlbWl0U2tpcHBlZCA9IGVtaXRTa2lwcGVkIHx8IGVyLmVtaXRTa2lwcGVkO1xuICAgIGVtaXR0ZWRGaWxlcy5wdXNoKC4uLihlci5lbWl0dGVkRmlsZXMgfHwgW10pKTtcbiAgfVxuXG4gIHJldHVybiB7ZGlhZ25vc3RpY3MsIGVtaXRTa2lwcGVkLCBlbWl0dGVkRmlsZXN9O1xufVxuIl19