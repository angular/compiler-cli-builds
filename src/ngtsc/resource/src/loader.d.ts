/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { ResourceLoader, ResourceLoaderContext } from '../../annotations';
import { NgCompilerAdapter } from '../../core/api';
/**
 * `ResourceLoader` which delegates to an `NgCompilerAdapter`'s resource loading methods.
 */
export declare class AdapterResourceLoader implements ResourceLoader {
    private adapter;
    private options;
    private cache;
    private fetching;
    private lookupResolutionHost;
    canPreload: boolean;
    canPreprocess: boolean;
    constructor(adapter: NgCompilerAdapter, options: ts.CompilerOptions);
    /**
     * Resolve the url of a resource relative to the file that contains the reference to it.
     * The return value of this method can be used in the `load()` and `preload()` methods.
     *
     * Uses the provided CompilerHost if it supports mapping resources to filenames.
     * Otherwise, uses a fallback mechanism that searches the module resolution candidates.
     *
     * @param url The, possibly relative, url of the resource.
     * @param fromFile The path to the file that contains the URL of the resource.
     * @returns A resolved url of resource.
     * @throws An error if the resource cannot be resolved.
     */
    resolve(url: string, fromFile: string): string;
    /**
     * Preload the specified resource, asynchronously.
     *
     * Once the resource is loaded, its value is cached so it can be accessed synchronously via the
     * `load()` method.
     *
     * @param resolvedUrl The url (resolved by a call to `resolve()`) of the resource to preload.
     * @param context Information about the resource such as the type and containing file.
     * @returns A Promise that is resolved once the resource has been loaded or `undefined` if the
     * file has already been loaded.
     * @throws An Error if pre-loading is not available.
     */
    preload(resolvedUrl: string, context: ResourceLoaderContext): Promise<void> | undefined;
    /**
     * Preprocess the content data of an inline resource, asynchronously.
     *
     * @param data The existing content data from the inline resource.
     * @param context Information regarding the resource such as the type and containing file.
     * @returns A Promise that resolves to the processed data. If no processing occurs, the
     * same data string that was passed to the function will be resolved.
     */
    preprocessInline(data: string, context: ResourceLoaderContext): Promise<string>;
    /**
     * Load the resource at the given url, synchronously.
     *
     * The contents of the resource may have been cached by a previous call to `preload()`.
     *
     * @param resolvedUrl The url (resolved by a call to `resolve()`) of the resource to load.
     * @returns The contents of the resource.
     */
    load(resolvedUrl: string): string;
    /**
     * Invalidate the entire resource cache.
     */
    invalidate(): void;
    /**
     * Attempt to resolve `url` in the context of `fromFile`, while respecting the rootDirs
     * option from the tsconfig. First, normalize the file name.
     */
    private fallbackResolve;
    private getRootedCandidateLocations;
    /**
     * TypeScript provides utilities to resolve module names, but not resource files (which aren't
     * a part of the ts.Program). However, TypeScript's module resolution can be used creatively
     * to locate where resource files should be expected to exist. Since module resolution returns
     * a list of file names that were considered, the loader can enumerate the possible locations
     * for the file by setting up a module resolution for it that will fail.
     */
    private getResolvedCandidateLocations;
}
