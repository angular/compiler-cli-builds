/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/indexer/src/template" />
import { TmplAstNode } from '@angular/compiler';
import { RestoreTemplateOptions, TemplateIdentifier } from './api';
/**
 * Traverses a template AST and builds identifiers discovered in it.
 * @param template template to extract indentifiers from
 * @param options options for restoring the parsed template to a indexable state
 * @return identifiers in template
 */
export declare function getTemplateIdentifiers(template: TmplAstNode[], options: RestoreTemplateOptions): Set<TemplateIdentifier>;
