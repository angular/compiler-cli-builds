/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { DirectiveOwner, TmplAstComponent, TmplAstDirective, TmplAstElement, TmplAstTemplate } from '@angular/compiler';
import { TcbOp } from './base';
import type { Context } from './context';
import type { Scope } from './scope';
import { TypeCheckableDirectiveMeta } from '../../api';
import { TcbBoundAttribute } from './bindings';
/** Possible types of custom field directives. */
export type CustomFieldType = 'value' | 'checkbox';
/** Names of input fields to which users aren't allowed to bind when using a `field` directive. */
export declare const customFormControlBannedInputFields: Set<string>;
/**
 * A `TcbOp` which constructs an instance of the signal forms `Field` directive on a native element.
 */
export declare class TcbNativeFieldDirectiveTypeOp extends TcbOp {
    private tcb;
    private scope;
    private node;
    /** Bindings that aren't supported on signal form fields. */
    protected readonly unsupportedBindingFields: Set<string>;
    private readonly inputType;
    get optional(): boolean;
    constructor(tcb: Context, scope: Scope, node: TmplAstElement);
    execute(): null;
    private getExpectedTypeFromDomNode;
    private getUnsupportedType;
}
/** Expands the set of bound inputs with the ones from custom field directives. */
export declare function expandBoundAttributesForField(directive: TypeCheckableDirectiveMeta, node: TmplAstTemplate | TmplAstElement | TmplAstComponent | TmplAstDirective, customFieldType: CustomFieldType): TcbBoundAttribute[] | null;
export declare function isFieldDirective(meta: TypeCheckableDirectiveMeta): boolean;
/** Determines if a directive is a custom field and its type. */
export declare function getCustomFieldDirectiveType(meta: TypeCheckableDirectiveMeta): CustomFieldType | null;
/** Checks whether a node has bindings that aren't supported on fields. */
export declare function checkUnsupportedFieldBindings(node: DirectiveOwner, unsupportedBindingFields: Set<string>, tcb: Context): void;
