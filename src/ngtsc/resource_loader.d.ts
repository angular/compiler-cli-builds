/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/resource_loader" />
import { ResourceLoader } from './annotations';
/**
 * `ResourceLoader` which delegates to a `CompilerHost` resource loading method.
 */
export declare class HostResourceLoader implements ResourceLoader {
    private host;
    private cache;
    private fetching;
    constructor(host: (url: string) => string | Promise<string>);
    preload(url: string): Promise<void> | undefined;
    load(url: string): string;
}
/**
 * `ResourceLoader` which directly uses the filesystem to resolve resources synchronously.
 */
export declare class FileResourceLoader implements ResourceLoader {
    load(url: string): string;
}
