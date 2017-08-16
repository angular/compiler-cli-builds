import * as ts from 'typescript';
import { CompilerHost, CompilerOptions } from './api';
export declare function createCompilerHost({options, tsHost}: {
    options: CompilerOptions;
    tsHost?: ts.CompilerHost;
}): CompilerHost;
