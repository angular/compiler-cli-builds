/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/ngcc/src/host/commonjs_host" />
import * as ts from 'typescript';
import { Declaration, Import } from '../../../src/ngtsc/reflection';
import { Logger } from '../logging/logger';
import { BundleProgram } from '../packages/bundle_program';
import { Esm5ReflectionHost } from './esm5_host';
export declare class CommonJsReflectionHost extends Esm5ReflectionHost {
    protected program: ts.Program;
    protected compilerHost: ts.CompilerHost;
    protected commonJsExports: Map<ts.SourceFile, Map<string, Declaration<ts.Declaration>> | null>;
    constructor(logger: Logger, isCore: boolean, program: ts.Program, compilerHost: ts.CompilerHost, dts?: BundleProgram | null);
    getImportOfIdentifier(id: ts.Identifier): Import | null;
    getDeclarationOfIdentifier(id: ts.Identifier): Declaration | null;
    getExportsOfModule(module: ts.Node): Map<string, Declaration> | null;
    getCommonJsExports(sourceFile: ts.SourceFile): Map<string, Declaration> | null;
    private computeExportsOfCommonJsModule;
    private extractCommonJsExportDeclaration;
    private extractCommonJsReexports;
    private findCommonJsImport;
    private getCommonJsImportedDeclaration;
    private resolveModuleName;
}
declare type CommonJsExportStatement = ts.ExpressionStatement & {
    expression: ts.BinaryExpression & {
        left: ts.PropertyAccessExpression & {
            expression: ts.Identifier;
        };
    };
};
export declare function isCommonJsExportStatement(s: ts.Statement): s is CommonJsExportStatement;
export declare type RequireCall = ts.CallExpression & {
    arguments: [ts.StringLiteral];
};
export declare function isRequireCall(node: ts.Node): node is RequireCall;
export declare function stripParentheses(node: ts.Node): ts.Node;
export {};
