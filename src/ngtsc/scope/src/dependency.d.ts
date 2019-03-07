/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/scope/src/dependency" />
import * as ts from 'typescript';
import { AliasGenerator, Reference } from '../../imports';
import { ReflectionHost } from '../../reflection';
import { ExportScope } from './api';
export interface DtsModuleScopeResolver {
    resolve(ref: Reference<ts.ClassDeclaration>): ExportScope | null;
}
/**
 * Reads Angular metadata from classes declared in .d.ts files and computes an `ExportScope`.
 *
 * Given an NgModule declared in a .d.ts file, this resolver can produce a transitive `ExportScope`
 * of all of the directives/pipes it exports. It does this by reading metadata off of Ivy static
 * fields on directives, components, pipes, and NgModules.
 */
export declare class MetadataDtsModuleScopeResolver {
    private checker;
    private reflector;
    private aliasGenerator;
    /**
     * Cache which holds fully resolved scopes for NgModule classes from .d.ts files.
     */
    private cache;
    constructor(checker: ts.TypeChecker, reflector: ReflectionHost, aliasGenerator: AliasGenerator | null);
    /**
     * Resolve a `Reference`'d NgModule from a .d.ts file and produce a transitive `ExportScope`
     * listing the directives and pipes which that NgModule exports to others.
     *
     * This operation relies on a `Reference` instead of a direct TypeScrpt node as the `Reference`s
     * produced depend on how the original NgModule was imported.
     */
    resolve(ref: Reference<ts.ClassDeclaration>): ExportScope | null;
    /**
     * Read the metadata from a class that has already been compiled somehow (either it's in a .d.ts
     * file, or in a .ts file with a handwritten definition).
     *
     * @param ref `Reference` to the class of interest, with the context of how it was obtained.
     */
    private readModuleMetadataFromClass;
    /**
     * Read directive (or component) metadata from a referenced class in a .d.ts file.
     */
    private readScopeDirectiveFromClassWithDef;
    /**
     * Read pipe metadata from a referenced class in a .d.ts file.
     */
    private readScopePipeFromClassWithDef;
    private maybeAlias;
}
