/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/api/checker" />
import { AST, LiteralPrimitive, ParseSourceSpan, PropertyRead, SafePropertyRead, TmplAstElement, TmplAstNode, TmplAstTemplate, TmplAstTextAttribute } from '@angular/compiler';
import ts from 'typescript';
import { AbsoluteFsPath } from '../../../../src/ngtsc/file_system';
import { ErrorCode } from '../../diagnostics';
import { FullTemplateMapping, NgTemplateDiagnostic, TypeCheckableDirectiveMeta } from './api';
import { GlobalCompletion } from './completion';
import { DirectiveInScope, PipeInScope } from './scope';
import { ElementSymbol, Symbol, TcbLocation, TemplateSymbol } from './symbols';
/**
 * Interface to the Angular Template Type Checker to extract diagnostics and intelligence from the
 * compiler's understanding of component templates.
 *
 * This interface is analogous to TypeScript's own `ts.TypeChecker` API.
 *
 * In general, this interface supports two kinds of operations:
 *  - updating Type Check Blocks (TCB)s that capture the template in the form of TypeScript code
 *  - querying information about available TCBs, including diagnostics
 *
 * Once a TCB is available, information about it can be queried. If no TCB is available to answer a
 * query, depending on the method either `null` will be returned or an error will be thrown.
 */
export interface TemplateTypeChecker {
    /**
     * Retrieve the template in use for the given component.
     */
    getTemplate(component: ts.ClassDeclaration): TmplAstNode[] | null;
    /**
     * Get all `ts.Diagnostic`s currently available for the given `ts.SourceFile`.
     *
     * This method will fail (throw) if there are components within the `ts.SourceFile` that do not
     * have TCBs available.
     *
     * Generating a template type-checking program is expensive, and in some workflows (e.g. checking
     * an entire program before emit), it should ideally only be done once. The `optimizeFor` flag
     * allows the caller to hint to `getDiagnosticsForFile` (which internally will create a template
     * type-checking program if needed) whether the caller is interested in just the results of the
     * single file, or whether they plan to query about other files in the program. Based on this
     * flag, `getDiagnosticsForFile` will determine how much of the user's program to prepare for
     * checking as part of the template type-checking program it creates.
     */
    getDiagnosticsForFile(sf: ts.SourceFile, optimizeFor: OptimizeFor): ts.Diagnostic[];
    /**
     * Given a `shim` and position within the file, returns information for mapping back to a template
     * location.
     */
    getTemplateMappingAtTcbLocation(tcbLocation: TcbLocation): FullTemplateMapping | null;
    /**
     * Get all `ts.Diagnostic`s currently available that pertain to the given component.
     *
     * This method always runs in `OptimizeFor.SingleFile` mode.
     */
    getDiagnosticsForComponent(component: ts.ClassDeclaration): ts.Diagnostic[];
    /**
     * Ensures shims for the whole program are generated. This type of operation would be required by
     * operations like "find references" and "refactor/rename" because references may appear in type
     * check blocks generated from templates anywhere in the program.
     */
    generateAllTypeCheckBlocks(): void;
    /**
     * Returns `true` if the given file is in the record of known shims generated by the compiler,
     * `false` if we cannot find the file in the shim records.
     */
    isTrackedTypeCheckFile(filePath: AbsoluteFsPath): boolean;
    /**
     * Retrieve the top-level node representing the TCB for the given component.
     *
     * This can return `null` if there is no TCB available for the component.
     *
     * This method always runs in `OptimizeFor.SingleFile` mode.
     */
    getTypeCheckBlock(component: ts.ClassDeclaration): ts.Node | null;
    /**
     * Retrieves a `Symbol` for the node in a component's template.
     *
     * This method can return `null` if a valid `Symbol` cannot be determined for the node.
     *
     * @see Symbol
     */
    getSymbolOfNode(node: TmplAstElement, component: ts.ClassDeclaration): ElementSymbol | null;
    getSymbolOfNode(node: TmplAstTemplate, component: ts.ClassDeclaration): TemplateSymbol | null;
    getSymbolOfNode(node: AST | TmplAstNode, component: ts.ClassDeclaration): Symbol | null;
    /**
     * Get "global" `Completion`s in the given context.
     *
     * Global completions are completions in the global context, as opposed to completions within an
     * existing expression. For example, completing inside a new interpolation expression (`{{|}}`) or
     * inside a new property binding `[input]="|" should retrieve global completions, which will
     * include completions from the template's context component, as well as any local references or
     * template variables which are in scope for that expression.
     */
    getGlobalCompletions(context: TmplAstTemplate | null, component: ts.ClassDeclaration, node: AST | TmplAstNode): GlobalCompletion | null;
    /**
     * For the given expression node, retrieve a `TcbLocation` that can be used to perform
     * autocompletion at that point in the expression, if such a location exists.
     */
    getExpressionCompletionLocation(expr: PropertyRead | SafePropertyRead, component: ts.ClassDeclaration): TcbLocation | null;
    /**
     * For the given node represents a `LiteralPrimitive`(the `TextAttribute` represents a string
     * literal), retrieve a `TcbLocation` that can be used to perform autocompletion at that point in
     * the node, if such a location exists.
     */
    getLiteralCompletionLocation(strNode: LiteralPrimitive | TmplAstTextAttribute, component: ts.ClassDeclaration): TcbLocation | null;
    /**
     * Get basic metadata on the directives which are in scope for the given component.
     */
    getDirectivesInScope(component: ts.ClassDeclaration): DirectiveInScope[] | null;
    /**
     * Get basic metadata on the pipes which are in scope for the given component.
     */
    getPipesInScope(component: ts.ClassDeclaration): PipeInScope[] | null;
    /**
     * Retrieve a `Map` of potential template element tags, to either the `DirectiveInScope` that
     * declares them (if the tag is from a directive/component), or `null` if the tag originates from
     * the DOM schema.
     */
    getPotentialElementTags(component: ts.ClassDeclaration): Map<string, DirectiveInScope | null>;
    /**
     * Get the primary decorator for an Angular class (such as @Component). This does not work for
     * `@Injectable`.
     */
    getPrimaryAngularDecorator(target: ts.ClassDeclaration): ts.Decorator | null;
    /**
     * Retrieve any potential DOM bindings for the given element.
     *
     * This returns an array of objects which list both the attribute and property names of each
     * binding, which are usually identical but can vary if the HTML attribute name is for example a
     * reserved keyword in JS, like the `for` attribute which corresponds to the `htmlFor` property.
     */
    getPotentialDomBindings(tagName: string): {
        attribute: string;
        property: string;
    }[];
    /**
     * Retrieve any potential DOM events.
     */
    getPotentialDomEvents(tagName: string): string[];
    /**
     * Retrieve the type checking engine's metadata for the given directive class, if available.
     */
    getDirectiveMetadata(dir: ts.ClassDeclaration): TypeCheckableDirectiveMeta | null;
    /**
     * Reset the `TemplateTypeChecker`'s state for the given class, so that it will be recomputed on
     * the next request.
     */
    invalidateClass(clazz: ts.ClassDeclaration): void;
    /**
     * Constructs a `ts.Diagnostic` for a given `ParseSourceSpan` within a template.
     */
    makeTemplateDiagnostic<T extends ErrorCode>(clazz: ts.ClassDeclaration, sourceSpan: ParseSourceSpan, category: ts.DiagnosticCategory, errorCode: T, message: string, relatedInformation?: {
        text: string;
        start: number;
        end: number;
        sourceFile: ts.SourceFile;
    }[]): NgTemplateDiagnostic<T>;
}
/**
 * Describes the scope of the caller's interest in template type-checking results.
 */
export declare enum OptimizeFor {
    /**
     * Indicates that a consumer of a `TemplateTypeChecker` is only interested in results for a given
     * file, and wants them as fast as possible.
     *
     * Calling `TemplateTypeChecker` methods successively for multiple files while specifying
     * `OptimizeFor.SingleFile` can result in significant unnecessary overhead overall.
     */
    SingleFile = 0,
    /**
     * Indicates that a consumer of a `TemplateTypeChecker` intends to query for results pertaining to
     * the entire user program, and so the type-checker should internally optimize for this case.
     *
     * Initial calls to retrieve type-checking information may take longer, but repeated calls to
     * gather information for the whole user program will be significantly faster with this mode of
     * optimization.
     */
    WholeProgram = 1
}
