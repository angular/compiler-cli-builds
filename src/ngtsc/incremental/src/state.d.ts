/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/incremental/src/state" />
import * as ts from 'typescript';
import { DependencyTracker } from '../../partial_evaluator';
import { ResourceDependencyRecorder } from '../../util/src/resource_recorder';
/**
 * Drives an incremental build, by tracking changes and determining which files need to be emitted.
 */
export declare class IncrementalDriver implements DependencyTracker, ResourceDependencyRecorder {
    private allTsFiles;
    /**
     * State of the current build.
     *
     * This transitions as the compilation progresses.
     */
    private state;
    /**
     * Tracks metadata related to each `ts.SourceFile` in the program.
     */
    private metadata;
    private constructor();
    /**
     * Construct an `IncrementalDriver` with a starting state that incorporates the results of a
     * previous build.
     *
     * The previous build's `BuildState` is reconciled with the new program's changes, and the results
     * are merged into the new build's `PendingBuildState`.
     */
    static reconcile(oldProgram: ts.Program, oldDriver: IncrementalDriver, newProgram: ts.Program, modifiedResourceFiles: Set<string> | null): IncrementalDriver;
    static fresh(program: ts.Program): IncrementalDriver;
    recordSuccessfulAnalysis(): void;
    recordSuccessfulEmit(sf: ts.SourceFile): void;
    safeToSkipEmit(sf: ts.SourceFile): boolean;
    trackFileDependency(dep: ts.SourceFile, src: ts.SourceFile): void;
    trackFileDependencies(deps: ts.SourceFile[], src: ts.SourceFile): void;
    getFileDependencies(file: ts.SourceFile): ts.SourceFile[];
    recordResourceDependency(file: ts.SourceFile, resourcePath: string): void;
    private ensureMetadata;
    private hasChangedResourceDependencies;
}
