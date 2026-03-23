/*!
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import { ParseSourceSpan, TmplAstHostElement } from '@angular/compiler';
import ts from 'typescript';
/** Represents information extracted from the source AST. */
export type SourceNode = StaticSourceNode | {
    kind: 'unspecified';
    sourceSpan: ParseSourceSpan;
};
/** A `SourceNode` which represents a static expression. */
export interface StaticSourceNode {
    kind: 'string' | 'identifier';
    /** Raw source code of the node (e.g. strings include the quotes). */
    source: string;
    /** Actual text of the node (e.g. value inside the quotes in strings). */
    text: string;
    /** Location information about the node. */
    sourceSpan: ParseSourceSpan;
}
/** A single binding inside the `host` object of a directive. */
export interface HostObjectLiteralBinding {
    /** Node representing the key of the binding. */
    key: SourceNode;
    /** Node representing the value of the binding. */
    value: SourceNode;
    /** Location information about the entire binding. */
    sourceSpan: ParseSourceSpan;
}
/** A single binding declared by a `@HostListener` decorator on a class member. */
export interface HostListenerDecorator {
    /** Node declaring the name of the event (e.g. first argument of `@HostListener`). */
    eventName: SourceNode | null;
    /** Node representing the name of the member that was decorated. */
    memberName: StaticSourceNode;
    /** Location information about the member that the decorator is set on. */
    memberSpan: ParseSourceSpan;
    /** Arguments passed to the event. */
    arguments: SourceNode[];
    /** Location information about the decorator. */
    decoratorSpan: ParseSourceSpan;
}
/** A single binding declared by the `@HostBinding` decorator on a class member. */
export interface HostBindingDecorator {
    /** Node representing the name of the member that was decorated. */
    memberName: StaticSourceNode;
    /** Location information about the member that the decorator is set on. */
    memberSpan: ParseSourceSpan;
    /** Arguments passed into the decorator */
    arguments: SourceNode[];
    /** Location information about the decorator. */
    decoratorSpan: ParseSourceSpan;
}
/**
 * Creates an AST node that represents the host element of a directive.
 * Can return null if there are no valid bindings to be checked.
 * @param meta Metadata used to construct the host element.
 */
export declare function createHostElement(type: 'component' | 'directive', selector: string | null, nameSpan: ParseSourceSpan, hostObjectLiteralBindings: HostObjectLiteralBinding[], hostBindingDecorators: HostBindingDecorator[], hostListenerDecorators: HostListenerDecorator[]): TmplAstHostElement | null;
/**
 * Creates an AST node that can be used as a guard in `if` statements to distinguish TypeScript
 * nodes used for checking host bindings from ones used for checking templates.
 */
export declare function createHostBindingsBlockGuard(): string;
/**
 * Determines if a given node is a guard that indicates that descendant nodes are used to check
 * host bindings.
 */
export declare function isHostBindingsBlockGuard(node: ts.Node): boolean;
