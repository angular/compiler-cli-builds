/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/typecheck/api/completion" />
import { TmplAstReference, TmplAstVariable } from '@angular/compiler';
import { ShimLocation } from './symbols';
/**
 * An autocompletion source of any kind.
 */
export declare type Completion = CompletionContextComponent | CompletionReference | CompletionVariable;
/**
 * An autocompletion source that drives completion in a global context.
 */
export declare type GlobalCompletion = CompletionContextComponent | CompletionReference | CompletionVariable;
/**
 * Discriminant of an autocompletion source (a `Completion`).
 */
export declare enum CompletionKind {
    ContextComponent = 0,
    Reference = 1,
    Variable = 2
}
/**
 * An autocompletion source backed by a shim file position where TS APIs can be used to retrieve
 * completions for the context component of a template.
 */
export interface CompletionContextComponent extends ShimLocation {
    kind: CompletionKind.ContextComponent;
}
/**
 * An autocompletion result representing a local reference declared in the template.
 */
export interface CompletionReference {
    kind: CompletionKind.Reference;
    /**
     * The `TmplAstReference` from the template which should be available as a completion.
     */
    node: TmplAstReference;
}
/**
 * An autocompletion result representing a variable declared in the template.
 */
export interface CompletionVariable {
    kind: CompletionKind.Variable;
    /**
     * The `TmplAstVariable` from the template which should be available as a completion.
     */
    node: TmplAstVariable;
}
