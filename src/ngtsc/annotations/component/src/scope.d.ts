/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/annotations/component/src/scope" />
import ts from 'typescript';
import { DirectiveMeta, MetadataReader, PipeMeta } from '../../../metadata';
import { ClassDeclaration } from '../../../reflection';
import { ComponentScopeReader, DtsModuleScopeResolver, LocalModuleScopeRegistry } from '../../../scope';
import { ComponentAnalysisData } from './metadata';
export interface ScopeTemplateResult {
    directives: DirectiveMeta[];
    pipes: PipeMeta[];
    diagnostics: ts.Diagnostic[];
    ngModule: ClassDeclaration | null;
}
export declare function scopeTemplate(scopeReader: ComponentScopeReader, dtsScopeReader: DtsModuleScopeResolver, scopeRegistry: LocalModuleScopeRegistry, metaReader: MetadataReader, node: ClassDeclaration, analysis: Readonly<ComponentAnalysisData>, usePoisonedData: boolean): ScopeTemplateResult | null;
