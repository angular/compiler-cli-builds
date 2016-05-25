/**
 * Transform template html and css into executable code.
 * Intended to be used in a build step.
 */
import * as ts from 'typescript';
import { AngularCompilerOptions } from 'tsc-wrapped';
import * as compiler from '@angular/compiler';
import { StaticReflector } from './static_reflector';
import { CompileMetadataResolver } from './compiler_private';
import { NodeReflectorHost } from './reflector_host';
export declare class CodeGenerator {
    private options;
    private program;
    host: ts.CompilerHost;
    private staticReflector;
    private resolver;
    private compiler;
    private reflectorHost;
    constructor(options: AngularCompilerOptions, program: ts.Program, host: ts.CompilerHost, staticReflector: StaticReflector, resolver: CompileMetadataResolver, compiler: compiler.OfflineCompiler, reflectorHost: NodeReflectorHost);
    private generateSource(metadatas);
    private readComponents(absSourcePath);
    private calculateEmitPath(filePath);
    private generateStylesheet(filepath, shim);
    codegen(): Promise<any>;
    static create(options: AngularCompilerOptions, program: ts.Program, compilerHost: ts.CompilerHost): CodeGenerator;
}
