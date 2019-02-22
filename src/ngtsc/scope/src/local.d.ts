/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/scope/src/local" />
import * as ts from 'typescript';
import { AliasGenerator, Reexport, Reference, ReferenceEmitter } from '../../imports';
import { ExportScope, ScopeData, ScopeDirective, ScopePipe } from './api';
import { DtsModuleScopeResolver } from './dependency';
export interface LocalNgModuleData {
    declarations: Reference<ts.Declaration>[];
    imports: Reference<ts.Declaration>[];
    exports: Reference<ts.Declaration>[];
}
export interface LocalModuleScope extends ExportScope {
    compilation: ScopeData;
    reexports: Reexport[] | null;
}
/**
 * A registry which collects information about NgModules, Directives, Components, and Pipes which
 * are local (declared in the ts.Program being compiled), and can produce `LocalModuleScope`s
 * which summarize the compilation scope of a component.
 *
 * This class implements the logic of NgModule declarations, imports, and exports and can produce,
 * for a given component, the set of directives and pipes which are "visible" in that component's
 * template.
 *
 * The `LocalModuleScopeRegistry` has two "modes" of operation. During analysis, data for each
 * individual NgModule, Directive, Component, and Pipe is added to the registry. No attempt is made
 * to traverse or validate the NgModule graph (imports, exports, etc). After analysis, one of
 * `getScopeOfModule` or `getScopeForComponent` can be called, which traverses the NgModule graph
 * and applies the NgModule logic to generate a `LocalModuleScope`, the full scope for the given
 * module or component.
 */
export declare class LocalModuleScopeRegistry {
    private dependencyScopeReader;
    private refEmitter;
    private aliasGenerator;
    /**
     * Tracks whether the registry has been asked to produce scopes for a module or component. Once
     * this is true, the registry cannot accept registrations of new directives/pipes/modules as it
     * would invalidate the cached scope data.
     */
    private sealed;
    /**
     * Metadata for each local NgModule registered.
     */
    private ngModuleData;
    /**
     * Metadata for each local directive registered.
     */
    private directiveData;
    /**
     * Metadata for each local pipe registered.
     */
    private pipeData;
    /**
     * A map of components from the current compilation unit to the NgModule which declared them.
     *
     * As components and directives are not distinguished at the NgModule level, this map may also
     * contain directives. This doesn't cause any problems but isn't useful as there is no concept of
     * a directive's compilation scope.
     */
    private declarationToModule;
    /**
     * A cache of calculated `LocalModuleScope`s for each NgModule declared in the current program.
     */
    private cache;
    /**
     * Tracks whether a given component requires "remote scoping".
     *
     * Remote scoping is when the set of directives which apply to a given component is set in the
     * NgModule's file instead of directly on the ngComponentDef (which is sometimes needed to get
     * around cyclic import issues). This is not used in calculation of `LocalModuleScope`s, but is
     * tracked here for convenience.
     */
    private remoteScoping;
    constructor(dependencyScopeReader: DtsModuleScopeResolver, refEmitter: ReferenceEmitter, aliasGenerator: AliasGenerator | null);
    /**
     * Add an NgModule's data to the registry.
     */
    registerNgModule(clazz: ts.Declaration, data: LocalNgModuleData): void;
    registerDirective(directive: ScopeDirective): void;
    registerPipe(pipe: ScopePipe): void;
    getScopeForComponent(clazz: ts.ClassDeclaration): LocalModuleScope | null;
    /**
     * Collects registered data for a module and its directives/pipes and convert it into a full
     * `LocalModuleScope`.
     *
     * This method implements the logic of NgModule imports and exports.
     */
    getScopeOfModule(clazz: ts.Declaration): LocalModuleScope | null;
    /**
     * Check whether a component requires remote scoping.
     */
    getRequiresRemoteScope(node: ts.Declaration): boolean;
    /**
     * Set a component as requiring remote scoping.
     */
    setComponentAsRequiringRemoteScoping(node: ts.Declaration): void;
    /**
     * Look up the `ExportScope` of a given `Reference` to an NgModule.
     *
     * The NgModule in question may be declared locally in the current ts.Program, or it may be
     * declared in a .d.ts file.
     */
    private getExportedScope;
    private assertCollecting;
}
