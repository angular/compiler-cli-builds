/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { DirectiveOwner, TmplAstComponent, TmplAstDirective, TmplAstElement, TmplAstNode, TmplAstTemplate } from '@angular/compiler';
import { TypeCheckableDirectiveMeta } from '../../api';
import { TcbOp } from './base';
import { TcbBoundAttribute } from './bindings';
import type { Context } from './context';
import type { Scope } from './scope';
/** Possible types of custom form control directives. */
export type CustomFormControlType = 'value' | 'checkbox';
/** Names of input fields to which users aren't allowed to bind when using a `field` directive. */
export declare const customFormControlBannedInputFields: Set<string>;
/**
 * A `TcbOp` which constructs an instance of the signal forms `Field` directive on a native element.
 */
export declare class TcbNativeFieldOp extends TcbOp {
    protected tcb: Context;
    protected scope: Scope;
    protected node: TmplAstElement;
    private inputType;
    /** Bindings that aren't supported on signal form fields. */
    protected readonly unsupportedBindingFields: Set<string>;
    get optional(): boolean;
    constructor(tcb: Context, scope: Scope, node: TmplAstElement, inputType: string | null);
    execute(): null;
    private getExpectedTypeFromDomNode;
    private getUnsupportedType;
}
/**
 * A variation of the `TcbNativeFieldOp` with specific logic for radio buttons.
 */
export declare class TcbNativeRadioButtonFieldOp extends TcbNativeFieldOp {
    constructor(tcb: Context, scope: Scope, node: TmplAstElement);
    execute(): null;
}
/** Expands the set of bound inputs with the ones from custom field directives. */
export declare function expandBoundAttributesForField(directive: TypeCheckableDirectiveMeta, node: TmplAstTemplate | TmplAstElement | TmplAstComponent | TmplAstDirective, customFormControlType: CustomFormControlType | null): TcbBoundAttribute[] | null;
export declare function isFieldDirective(meta: TypeCheckableDirectiveMeta): boolean;
/** Determines if a directive is a custom field and its type. */
export declare function getCustomFieldDirectiveType(meta: TypeCheckableDirectiveMeta): CustomFormControlType | null;
/** Determines if a directive usage is on a native field. */
export declare function isNativeField(dir: TypeCheckableDirectiveMeta, node: TmplAstNode, allDirectiveMatches: TypeCheckableDirectiveMeta[]): node is TmplAstElement & {
    name: 'input' | 'select' | 'textarea';
};
/** Checks whether a node has bindings that aren't supported on fields. */
export declare function checkUnsupportedFieldBindings(node: DirectiveOwner, unsupportedBindingFields: Set<string>, tcb: Context): void;
/**
 * Determines whether a node is a form control based on its matching directives.
 *
 * A node is a form control if it has a matching `Field` directive, and no other directives match
 * the `field` input.
 */
export declare function isFormControl(allDirectiveMatches: TypeCheckableDirectiveMeta[]): boolean;
