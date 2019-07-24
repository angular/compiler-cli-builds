/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/indexer/src/api" />
import { ParseSourceFile } from '@angular/compiler';
import * as ts from 'typescript';
import { ClassDeclaration } from '../../reflection';
/**
 * Describes the kind of identifier found in a template.
 */
export declare enum IdentifierKind {
    Property = 0,
    Method = 1,
    Element = 2,
    Attribute = 3
}
/**
 * Describes a semantically-interesting identifier in a template, such as an interpolated variable
 * or selector.
 */
export interface TemplateIdentifier {
    name: string;
    span: AbsoluteSourceSpan;
    kind: IdentifierKind;
}
/** Describes a property accessed in a template. */
export interface PropertyIdentifier extends TemplateIdentifier {
    kind: IdentifierKind.Property;
}
/** Describes a method accessed in a template. */
export interface MethodIdentifier extends TemplateIdentifier {
    kind: IdentifierKind.Method;
}
/** Describes an element attribute in a template. */
export interface AttributeIdentifier extends TemplateIdentifier {
    kind: IdentifierKind.Attribute;
}
/** A reference to a directive node and its selector. */
interface DirectiveReference {
    node: ClassDeclaration;
    selector: string;
}
/**
 * Describes an indexed element in a template. The name of an `ElementIdentifier` is the entire
 * element tag, which can be parsed by an indexer to determine where used directives should be
 * referenced.
 */
export interface ElementIdentifier extends TemplateIdentifier {
    kind: IdentifierKind.Element;
    /** Attributes on an element. */
    attributes: Set<AttributeIdentifier>;
    /** Directives applied to an element. */
    usedDirectives: Set<DirectiveReference>;
}
/**
 * Identifiers recorded at the top level of the template, without any context about the HTML nodes
 * they were discovered in.
 */
export declare type TopLevelIdentifier = PropertyIdentifier | MethodIdentifier | ElementIdentifier;
/**
 * Describes the absolute byte offsets of a text anchor in a source code.
 */
export declare class AbsoluteSourceSpan {
    start: number;
    end: number;
    constructor(start: number, end: number);
}
/**
 * Describes an analyzed, indexed component and its template.
 */
export interface IndexedComponent {
    name: string;
    selector: string | null;
    file: ParseSourceFile;
    template: {
        identifiers: Set<TopLevelIdentifier>;
        usedComponents: Set<ts.Declaration>;
        isInline: boolean;
        file: ParseSourceFile;
    };
}
export {};
