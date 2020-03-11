/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/execution/single_process_executor" />
import { SyncLocker } from '../locking/sync_locker';
import { Logger } from '../logging/logger';
import { PackageJsonUpdater } from '../writing/package_json_updater';
import { AnalyzeEntryPointsFn, CreateCompileFn, Executor } from './api';
export declare abstract class SingleProcessorExecutorBase {
    private logger;
    private pkgJsonUpdater;
    constructor(logger: Logger, pkgJsonUpdater: PackageJsonUpdater);
    doExecute(analyzeEntryPoints: AnalyzeEntryPointsFn, createCompileFn: CreateCompileFn): void | Promise<void>;
}
/**
 * An `Executor` that processes all tasks serially and completes synchronously.
 */
export declare class SingleProcessExecutorSync extends SingleProcessorExecutorBase implements Executor {
    private lockFile;
    constructor(logger: Logger, pkgJsonUpdater: PackageJsonUpdater, lockFile: SyncLocker);
    execute(analyzeEntryPoints: AnalyzeEntryPointsFn, createCompileFn: CreateCompileFn): void;
}
/**
 * An `Executor` that processes all tasks serially, but still completes asynchronously.
 */
export declare class SingleProcessExecutorAsync extends SingleProcessorExecutorBase implements Executor {
    private lockFile;
    constructor(logger: Logger, pkgJsonUpdater: PackageJsonUpdater, lockFile: SyncLocker);
    execute(analyzeEntryPoints: AnalyzeEntryPointsFn, createCompileFn: CreateCompileFn): Promise<void>;
}
