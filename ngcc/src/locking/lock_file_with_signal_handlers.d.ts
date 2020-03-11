/// <amd-module name="@angular/compiler-cli/ngcc/src/locking/lock_file_with_signal_handlers" />
import { FileSystem } from '../../../src/ngtsc/file_system';
import { LockFile } from './lock_file';
export declare class LockFileWithSignalHandlers implements LockFile {
    protected fs: FileSystem;
    constructor(fs: FileSystem);
    path: import("@angular/compiler-cli/src/ngtsc/file_system/src/types").BrandedPath<"AbsoluteFsPath">;
    write(): void;
    read(): string;
    remove(): void;
    /**
     * Capture CTRL-C and terminal closing events.
     * When these occur we remove the lock-file and exit.
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
