/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/common/src/util" />
import { Expression, FactoryTarget, ParseSourceSpan, R3CompiledExpression, R3FactoryMetadata, R3Reference, Statement, WrappedNodeExpr } from '@angular/compiler';
import ts from 'typescript';
import { ImportedFile, ModuleResolver, Reference, ReferenceEmitter } from '../../../imports';
import { ForeignFunctionResolver, PartialEvaluator } from '../../../partial_evaluator';
import { ClassDeclaration, Decorator, Import, ImportedTypeValueReference, LocalTypeValueReference, ReflectionHost, TypeValueReference } from '../../../reflection';
import { CompileResult } from '../../../transform';
/**
 * Convert a `TypeValueReference` to an `Expression` which refers to the type as a value.
 *
 * Local references are converted to a `WrappedNodeExpr` of the TypeScript expression, and non-local
 * references are converted to an `ExternalExpr`. Note that this is only valid in the context of the
 * file in which the `TypeValueReference` originated.
 */
export declare function valueReferenceToExpression(valueRef: LocalTypeValueReference | ImportedTypeValueReference): Expression;
export declare function valueReferenceToExpression(valueRef: TypeValueReference): Expression | null;
export declare function toR3Reference(origin: ts.Node, valueRef: Reference, typeRef: Reference, valueContext: ts.SourceFile, typeContext: ts.SourceFile, refEmitter: ReferenceEmitter): R3Reference;
export declare function isAngularCore(decorator: Decorator): decorator is Decorator & {
    import: Import;
};
export declare function isAngularCoreReference(reference: Reference, symbolName: string): boolean;
export declare function findAngularDecorator(decorators: Decorator[], name: string, isCore: boolean): Decorator | undefined;
export declare function isAngularDecorator(decorator: Decorator, name: string, isCore: boolean): boolean;
/**
 * Unwrap a `ts.Expression`, removing outer type-casts or parentheses until the expression is in its
 * lowest level form.
 *
 * For example, the expression "(foo as Type)" unwraps to "foo".
 */
export declare function unwrapExpression(node: ts.Expression): ts.Expression;
/**
 * If the given `node` is a forwardRef() expression then resolve its inner value, otherwise return
 * `null`.
 *
 * @param node the forwardRef() expression to resolve
 * @param reflector a ReflectionHost
 * @returns the resolved expression, if the original expression was a forwardRef(), or `null`
 *     otherwise.
 */
export declare function tryUnwrapForwardRef(node: ts.Expression, reflector: ReflectionHost): ts.Expression | null;
/**
 * A foreign function resolver for `staticallyResolve` which unwraps forwardRef() expressions.
 *
 * @param ref a Reference to the declaration of the function being called (which might be
 * forwardRef)
 * @param args the arguments to the invocation of the forwardRef expression
 * @returns an unwrapped argument if `ref` pointed to forwardRef, or null otherwise
 */
export declare const forwardRefResolver: ForeignFunctionResolver;
/**
 * Combines an array of resolver functions into a one.
 * @param resolvers Resolvers to be combined.
 */
export declare function combineResolvers(resolvers: ForeignFunctionResolver[]): ForeignFunctionResolver;
export declare function isExpressionForwardReference(expr: Expression, context: ts.Node, contextSource: ts.SourceFile): boolean;
export declare function isWrappedTsNodeExpr(expr: Expression): expr is WrappedNodeExpr<ts.Node>;
export declare function readBaseClass(node: ClassDeclaration, reflector: ReflectionHost, evaluator: PartialEvaluator): Reference<ClassDeclaration> | 'dynamic' | null;
/**
 * Wraps all functions in a given expression in parentheses. This is needed to avoid problems
 * where Tsickle annotations added between analyse and transform phases in Angular may trigger
 * automatic semicolon insertion, e.g. if a function is the expression in a `return` statement.
 * More
 * info can be found in Tsickle source code here:
 * https://github.com/angular/tsickle/blob/d7974262571c8a17d684e5ba07680e1b1993afdd/src/jsdoc_transformer.ts#L1021
 *
 * @param expression Expression where functions should be wrapped in parentheses
 */
export declare function wrapFunctionExpressionsInParens(expression: ts.Expression): ts.Expression;
/**
 * Resolves the given `rawProviders` into `ClassDeclarations` and returns
 * a set containing those that are known to require a factory definition.
 * @param rawProviders Expression that declared the providers array in the source.
 */
export declare function resolveProvidersRequiringFactory(rawProviders: ts.Expression, reflector: ReflectionHost, evaluator: PartialEvaluator): Set<Reference<ClassDeclaration>>;
/**
 * Create an R3Reference for a class.
 *
 * The `value` is the exported declaration of the class from its source file.
 * The `type` is an expression that would be used by ngcc in the typings (.d.ts) files.
 */
export declare function wrapTypeReference(reflector: ReflectionHost, clazz: ClassDeclaration): R3Reference;
/** Creates a ParseSourceSpan for a TypeScript node. */
export declare function createSourceSpan(node: ts.Node): ParseSourceSpan;
/**
 * Collate the factory and definition compiled results into an array of CompileResult objects.
 */
export declare function compileResults(fac: CompileResult, def: R3CompiledExpression, metadataStmt: Statement | null, propName: string): CompileResult[];
export declare function toFactoryMetadata(meta: Omit<R3FactoryMetadata, 'target'>, target: FactoryTarget): R3FactoryMetadata;
export declare function resolveImportedFile(moduleResolver: ModuleResolver, importedFile: ImportedFile, expr: Expression, origin: ts.SourceFile): ts.SourceFile | null;
export declare function isAbstractClassDeclaration(clazz: ClassDeclaration): boolean;
