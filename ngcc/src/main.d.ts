/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/main" />
import { FileSystem } from '../../src/ngtsc/file_system';
import { Logger } from './logging/logger';
import { PathMappings } from './utils';
/**
 * The options to configure the ngcc compiler for synchronous execution.
 */
export interface SyncNgccOptions {
    /** The absolute path to the `node_modules` folder that contains the packages to process. */
    basePath: string;
    /**
     * The path to the primary package to be processed. If not absolute then it must be relative to
     * `basePath`.
     *
     * All its dependencies will need to be processed too.
     */
    targetEntryPointPath?: string;
    /**
     * Which entry-point properties in the package.json to consider when processing an entry-point.
     * Each property should hold a path to the particular bundle format for the entry-point.
     * Defaults to all the properties in the package.json.
     */
    propertiesToConsider?: string[];
    /**
     * Whether to process all formats specified by (`propertiesToConsider`)  or to stop processing
     * this entry-point at the first matching format. Defaults to `true`.
     */
    compileAllFormats?: boolean;
    /**
     * Whether to create new entry-points bundles rather than overwriting the original files.
     */
    createNewEntryPointFormats?: boolean;
    /**
     * Provide a logger that will be called with log messages.
     */
    logger?: Logger;
    /**
     * Paths mapping configuration (`paths` and `baseUrl`), as found in `ts.CompilerOptions`.
     * These are used to resolve paths to locally built Angular libraries.
     */
    pathMappings?: PathMappings;
    /**
     * Provide a file-system service that will be used by ngcc for all file interactions.
     */
    fileSystem?: FileSystem;
    /**
     * Whether the compilation should run and return asynchronously. Allowing asynchronous execution
     * may speed up the compilation by utilizing multiple CPU cores (if available).
     *
     * Default: `false` (i.e. run synchronously)
     */
    async?: false;
    /**
     * Render `$localize` messages with legacy format ids.
     *
     * The default value is `true`. Only set this to `false` if you do not want legacy message ids to
     * be rendered. For example, if you are not using legacy message ids in your translation files
     * AND are not doing compile-time inlining of translations, in which case the extra message ids
     * would add unwanted size to the final source bundle.
     *
     * It is safe to leave this set to true if you are doing compile-time inlining because the extra
     * legacy message ids will all be stripped during translation.
     */
    enableI18nLegacyMessageIdFormat?: boolean;
    /**
     * Whether to invalidate any entry-point manifest file that is on disk. Instead, walk the
     * directory tree looking for entry-points, and then write a new entry-point manifest, if
     * possible.
     *
     * Default: `false` (i.e. the manifest will be used if available)
     */
    invalidateEntryPointManifest?: boolean;
}
/**
 * The options to configure the ngcc compiler for asynchronous execution.
 */
export declare type AsyncNgccOptions = Omit<SyncNgccOptions, 'async'> & {
    async: true;
};
/**
 * The options to configure the ngcc compiler.
 */
export declare type NgccOptions = AsyncNgccOptions | SyncNgccOptions;
/**
 * This is the main entry-point into ngcc (aNGular Compatibility Compiler).
 *
 * You can call this function to process one or more npm packages, to ensure
 * that they are compatible with the ivy compiler (ngtsc).
 *
 * @param options The options telling ngcc what to compile and how.
 */
export declare function mainNgcc(options: AsyncNgccOptions): Promise<void>;
export declare function mainNgcc(options: SyncNgccOptions): void;
