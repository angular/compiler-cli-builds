/// <amd-module name="@angular/compiler-cli/ngcc/src/execution/lock_file" />
import { FileSystem } from '../../../src/ngtsc/file_system';
import { Logger } from '../logging/logger';
export declare abstract class LockFileBase {
    protected fs: FileSystem;
    lockFilePath: import("@angular/compiler-cli/src/ngtsc/file_system/src/types").BrandedPath<"AbsoluteFsPath">;
    constructor(fs: FileSystem);
    protected writeLockFile(): void;
    /**
     * Read the pid from the lockfile.
     *
     * It is feasible that the lockfile was removed between the previous check for existence
     * and this file-read. If so then we still error but as gracefully as possible.
     */
    protected readLockFile(): string;
    /**
     * Remove the lock file from disk.
     */
    protected remove(): void;
    /**
     * Capture CTRL-C and terminal closing events.
     * When these occur we remove the lockfile and exit.
     */
    protected addSignalHandlers(): void;
    /**
     * Clear the event handlers to prevent leakage.
     */
    protected removeSignalHandlers(): void;
    /**
     * This handler needs to be defined as a property rather than a method
     * so that it can be passed around as a bound function.
     */
    protected signalHandler: () => void;
    /**
     * This function wraps `process.exit()` which makes it easier to manage in unit tests,
     * since it is not possible to mock out `process.exit()` when it is called from signal handlers.
     */
    protected exit(code: number): void;
}
/**
 * LockFileSync is used to prevent more than one instance of ngcc executing at the same time,
 * when being called in a synchronous context.
 *
 * * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder.
 * * If it finds one is already there then it fails with a suitable error message.
 * * When ngcc completes executing, it removes the file so that future ngcc executions can start.
 */
export declare class LockFileSync extends LockFileBase {
    /**
     * Run the given function guarded by the lock file.
     *
     * @param fn the function to run.
     * @returns the value returned from the `fn` call.
     */
    lock<T>(fn: () => T): T;
    /**
     * Write a lock file to disk, or error if there is already one there.
     */
    protected create(): void;
    /**
     * The lockfile already exists so raise a helpful error.
     */
    protected handleExistingLockFile(): void;
}
/**
 * LockFileAsync is used to prevent more than one instance of ngcc executing at the same time,
 * when being called in an asynchronous context.
 *
 * * When ngcc starts executing, it creates a file in the `compiler-cli/ngcc` folder.
 * * If it finds one is already there then it pauses and waits for the file to be removed by the
 *   other process. If the file is not removed within a set timeout period given by
 *   `retryDelay*retryAttempts` an error is thrown with a suitable error message.
 * * If the process locking the file changes, then we restart the timeout.
 * * When ngcc completes executing, it removes the file so that future ngcc executions can start.
 */
export declare class LockFileAsync extends LockFileBase {
    protected logger: Logger;
    private retryDelay;
    private retryAttempts;
    constructor(fs: FileSystem, logger: Logger, retryDelay: number, retryAttempts: number);
    /**
     * Run a function guarded by the lock file.
     *
     * @param fn The function to run.
     */
    lock<T>(fn: () => Promise<T>): Promise<T>;
    protected create(): Promise<void>;
}
