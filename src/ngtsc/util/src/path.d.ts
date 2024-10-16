import ts from 'typescript';
export declare function relativePathBetween(from: string, to: string): string | null;
export declare function normalizeSeparators(path: string): string;
/**
 * Attempts to generate a project-relative path
 * @param sourceFile
 * @param rootDirs
 * @param compilerHost
 * @returns
 */
export declare function getProjectRelativePath(sourceFile: ts.SourceFile, rootDirs: readonly string[], compilerHost: Pick<ts.CompilerHost, 'getCanonicalFileName'>): string | null;
