/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { Reference, ReferenceEmitter } from '../../imports';
import { ClassDeclaration, ReflectionHost } from '../../reflection';
import { TypeCheckBlockMetadata, TypeCheckingConfig } from '../api';
import { DomSchemaChecker } from './dom';
import { Environment } from './environment';
import { OutOfBandDiagnosticRecorder } from './oob';
import { TcbGenericContextBehavior } from './type_check_block';
/**
 * An `Environment` representing the single type-checking file into which most (if not all) Type
 * Check Blocks (TCBs) will be generated.
 *
 * The `TypeCheckFile` hosts multiple TCBs and allows the sharing of declarations (e.g. type
 * constructors) between them. Rather than return such declarations via `getPreludeStatements()`, it
 * hoists them to the top of the generated `ts.SourceFile`.
 */
export declare class TypeCheckFile extends Environment {
    readonly fileName: AbsoluteFsPath;
    private nextTcbId;
    private tcbStatements;
    constructor(fileName: AbsoluteFsPath, config: TypeCheckingConfig, refEmitter: ReferenceEmitter, reflector: ReflectionHost, compilerHost: Pick<ts.CompilerHost, 'getCanonicalFileName'>);
    addTypeCheckBlock(ref: Reference<ClassDeclaration<ts.ClassDeclaration>>, meta: TypeCheckBlockMetadata, domSchemaChecker: DomSchemaChecker, oobRecorder: OutOfBandDiagnosticRecorder, genericContextBehavior: TcbGenericContextBehavior): void;
    render(removeComments: boolean): string;
    getPreludeStatements(): ts.Statement[];
}
export declare function typeCheckFilePath(rootDirs: AbsoluteFsPath[]): AbsoluteFsPath;
