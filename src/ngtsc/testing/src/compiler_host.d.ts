/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { NgtscCompilerHost } from '../../file_system';
/**
 * A compiler host intended to improve test performance by caching default library source files for
 * reuse across tests.
 */
export declare class NgtscTestCompilerHost extends NgtscCompilerHost {
    getSourceFile(fileName: string, languageVersion: ts.ScriptTarget): ts.SourceFile | undefined;
}
