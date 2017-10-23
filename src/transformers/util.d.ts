import * as ts from 'typescript';
import { CompilerOptions, Diagnostic } from './api';
export declare const GENERATED_FILES: RegExp;
export declare const DTS: RegExp;
export declare const enum StructureIsReused {
    Not = 0,
    SafeModules = 1,
    Completely = 2,
}
export declare function tsStructureIsReused(program: ts.Program): StructureIsReused;
export declare function createMessageDiagnostic(messageText: string): ts.Diagnostic & Diagnostic;
export declare function isInRootDir(fileName: string, options: CompilerOptions): string | true | null;
export declare function relativeToRootDirs(filePath: string, rootDirs: string[]): string;
