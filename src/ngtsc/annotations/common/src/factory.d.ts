/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { R3FactoryMetadata } from '@angular/compiler';
import { CompileResult } from '../../../transform';
export type CompileFactoryFn = (metadata: R3FactoryMetadata) => CompileResult;
export declare function compileNgFactoryDefField(metadata: R3FactoryMetadata): CompileResult;
export declare function compileDeclareFactory(metadata: R3FactoryMetadata): CompileResult;
