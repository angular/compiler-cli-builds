/// <amd-module name="@angular/compiler-cli/src/ngtsc/transform/src/compilation" />
import * as ts from 'typescript';
import { Decorator, ReflectionHost } from '../../host';
import { CompileResult, DecoratorHandler } from './api';
/**
 * Manages a compilation of Ivy decorators into static fields across an entire ts.Program.
 *
 * The compilation is stateful - source files are analyzed and records of the operations that need
 * to be performed during the transform/emit process are maintained internally.
 */
export declare class IvyCompilation {
    private handlers;
    private checker;
    private reflector;
    private coreImportsFrom;
    /**
     * Tracks classes which have been analyzed and found to have an Ivy decorator, and the
     * information recorded about them for later compilation.
     */
    private analysis;
    /**
     * Tracks the `DtsFileTransformer`s for each TS file that needs .d.ts transformations.
     */
    private dtsMap;
    /**
     * @param handlers array of `DecoratorHandler`s which will be executed against each class in the
     * program
     * @param checker TypeScript `TypeChecker` instance for the program
     * @param reflector `ReflectionHost` through which all reflection operations will be performed
     * @param coreImportsFrom a TypeScript `SourceFile` which exports symbols needed for Ivy imports
     * when compiling @angular/core, or `null` if the current program is not @angular/core. This is
     * `null` in most cases.
     */
    constructor(handlers: DecoratorHandler<any>[], checker: ts.TypeChecker, reflector: ReflectionHost, coreImportsFrom: ts.SourceFile | null);
    /**
     * Analyze a source file and produce diagnostics for it (if any).
     */
    analyze(sf: ts.SourceFile): ts.Diagnostic[];
    /**
     * Perform a compilation operation on the given class declaration and return instructions to an
     * AST transformer if any are available.
     */
    compileIvyFieldFor(node: ts.Declaration): CompileResult[] | undefined;
    /**
     * Lookup the `ts.Decorator` which triggered transformation of a particular class declaration.
     */
    ivyDecoratorFor(node: ts.Declaration): Decorator | undefined;
    /**
     * Process a .d.ts source string and return a transformed version that incorporates the changes
     * made to the source file.
     */
    transformedDtsFor(tsFileName: string, dtsOriginalSource: string, dtsPath: string): string;
    private getDtsTransformer(tsFileName);
}
