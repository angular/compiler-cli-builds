/// <amd-module name="@angular/compiler-cli/src/ngtsc/transform/src/translator" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArrayType, AssertNotNull, BinaryOperatorExpr, BuiltinType, CastExpr, CommaExpr, ConditionalExpr, Expression, ExpressionType, ExpressionVisitor, ExternalExpr, FunctionExpr, InstantiateExpr, InvokeFunctionExpr, InvokeMethodExpr, LiteralArrayExpr, LiteralExpr, LiteralMapExpr, MapType, NotExpr, ReadKeyExpr, ReadPropExpr, ReadVarExpr, Type, TypeVisitor, WrappedNodeExpr, WriteKeyExpr, WritePropExpr, WriteVarExpr } from '@angular/compiler';
import * as ts from 'typescript';
export declare class ImportManager {
    private moduleToIndex;
    private nextIndex;
    generateNamedImport(moduleName: string): string;
    getAllImports(): {
        name: string;
        as: string;
    }[];
}
export declare function translateExpression(expression: Expression, imports: ImportManager): ts.Expression;
export declare function translateType(type: Type, imports: ImportManager): string;
export declare class TypeTranslatorVisitor implements ExpressionVisitor, TypeVisitor {
    private imports;
    constructor(imports: ImportManager);
    visitBuiltinType(type: BuiltinType, context: any): string;
    visitExpressionType(type: ExpressionType, context: any): any;
    visitArrayType(type: ArrayType, context: any): string;
    visitMapType(type: MapType, context: any): string;
    visitReadVarExpr(ast: ReadVarExpr, context: any): string;
    visitWriteVarExpr(expr: WriteVarExpr, context: any): never;
    visitWriteKeyExpr(expr: WriteKeyExpr, context: any): never;
    visitWritePropExpr(expr: WritePropExpr, context: any): never;
    visitInvokeMethodExpr(ast: InvokeMethodExpr, context: any): never;
    visitInvokeFunctionExpr(ast: InvokeFunctionExpr, context: any): never;
    visitInstantiateExpr(ast: InstantiateExpr, context: any): never;
    visitLiteralExpr(ast: LiteralExpr, context: any): string;
    visitExternalExpr(ast: ExternalExpr, context: any): string;
    visitConditionalExpr(ast: ConditionalExpr, context: any): void;
    visitNotExpr(ast: NotExpr, context: any): void;
    visitAssertNotNullExpr(ast: AssertNotNull, context: any): void;
    visitCastExpr(ast: CastExpr, context: any): void;
    visitFunctionExpr(ast: FunctionExpr, context: any): void;
    visitBinaryOperatorExpr(ast: BinaryOperatorExpr, context: any): void;
    visitReadPropExpr(ast: ReadPropExpr, context: any): void;
    visitReadKeyExpr(ast: ReadKeyExpr, context: any): void;
    visitLiteralArrayExpr(ast: LiteralArrayExpr, context: any): void;
    visitLiteralMapExpr(ast: LiteralMapExpr, context: any): void;
    visitCommaExpr(ast: CommaExpr, context: any): void;
    visitWrappedNodeExpr(ast: WrappedNodeExpr<any>, context: any): string;
}
