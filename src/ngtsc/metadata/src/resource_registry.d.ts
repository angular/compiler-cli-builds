/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/metadata/src/resource_registry" />
import * as ts from 'typescript';
import { AbsoluteFsPath } from '../../file_system';
import { ClassDeclaration } from '../../reflection';
/**
 * Represents an external resource for a component and contains the `AbsoluteFsPath`
 * to the file which was resolved by evaluating the `ts.Expression` (generally, a relative or
 * absolute string path to the resource).
 */
export interface Resource {
    path: AbsoluteFsPath;
    expression: ts.Expression;
}
/**
 * Represents the external resources of a component.
 *
 * If the component uses an inline template, the template resource will be `null`.
 * If the component does not have external styles, the `styles` `Set` will be empty.
 */
export interface ComponentResources {
    template: Resource | null;
    styles: ReadonlySet<Resource>;
}
/**
 * Tracks the mapping between external template/style files and the component(s) which use them.
 *
 * This information is produced during analysis of the program and is used mainly to support
 * external tooling, for which such a mapping is challenging to determine without compiler
 * assistance.
 */
export declare class ResourceRegistry {
    private templateToComponentsMap;
    private componentToTemplateMap;
    private componentToStylesMap;
    private styleToComponentsMap;
    getComponentsWithTemplate(template: AbsoluteFsPath): ReadonlySet<ClassDeclaration>;
    registerResources(resources: ComponentResources, component: ClassDeclaration): void;
    registerTemplate(templateResource: Resource, component: ClassDeclaration): void;
    getTemplate(component: ClassDeclaration): Resource | null;
    registerStyle(styleResource: Resource, component: ClassDeclaration): void;
    getStyles(component: ClassDeclaration): Set<Resource>;
    getComponentsWithStyle(styleUrl: AbsoluteFsPath): ReadonlySet<ClassDeclaration>;
}
