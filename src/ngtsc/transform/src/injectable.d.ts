/// <amd-module name="@angular/compiler-cli/src/ngtsc/transform/src/injectable" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { R3InjectableMetadata } from '@angular/compiler';
import * as ts from 'typescript';
import { Decorator } from '../../metadata';
import { AddStaticFieldInstruction, AnalysisOutput, CompilerAdapter } from './api';
/**
 * Adapts the `compileIvyInjectable` compiler for `@Injectable` decorators to the Ivy compiler.
 */
export declare class InjectableCompilerAdapter implements CompilerAdapter<R3InjectableMetadata> {
    private checker;
    constructor(checker: ts.TypeChecker);
    detect(decorator: Decorator[]): Decorator | undefined;
    analyze(node: ts.ClassDeclaration, decorator: Decorator): AnalysisOutput<R3InjectableMetadata>;
    compile(node: ts.ClassDeclaration, analysis: R3InjectableMetadata): AddStaticFieldInstruction;
}
