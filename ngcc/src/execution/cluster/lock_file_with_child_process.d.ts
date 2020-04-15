/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/execution/cluster/lock_file_with_child_process" />
/// <reference types="node" />
import { ChildProcess } from 'child_process';
import { AbsoluteFsPath } from '../../../../src/ngtsc/file_system';
import { LockFileWithChildProcess } from '../../locking/lock_file_with_child_process';
/**
 * A `LockFileWithChildProcess` that is `cluster`-aware and does not spawn unlocker processes from
 * worker processes (only from the master process, which does the locking).
 */
export declare class ClusterLockFileWithChildProcess extends LockFileWithChildProcess {
    write(): void;
    protected createUnlocker(path: AbsoluteFsPath): ChildProcess | null;
}
