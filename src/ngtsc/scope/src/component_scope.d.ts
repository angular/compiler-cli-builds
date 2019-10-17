/// <amd-module name="@angular/compiler-cli/src/ngtsc/scope/src/component_scope" />
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ClassDeclaration } from '../../reflection';
import { LocalModuleScope } from './local';
/**
 * Register information about the compilation scope of components.
 */
export interface ComponentScopeRegistry {
    registerComponentScope(clazz: ClassDeclaration, scope: LocalModuleScope): void;
    setComponentAsRequiringRemoteScoping(clazz: ClassDeclaration): void;
}
/**
 * Read information about the compilation scope of components.
 */
export interface ComponentScopeReader {
    getScopeForComponent(clazz: ClassDeclaration): LocalModuleScope | null;
    getRequiresRemoteScope(clazz: ClassDeclaration): boolean | null;
}
/**
 * A noop registry that doesn't do anything.
 *
 * This can be used in tests and cases where we don't care about the compilation scopes
 * being registered.
 */
export declare class NoopComponentScopeRegistry implements ComponentScopeRegistry {
    registerComponentScope(clazz: ClassDeclaration, scope: LocalModuleScope): void;
    setComponentAsRequiringRemoteScoping(clazz: ClassDeclaration): void;
}
/**
 * A `ComponentScopeReader` that reads from an ordered set of child readers until it obtains the
 * requested scope.
 *
 * This is used to combine `ComponentScopeReader`s that read from different sources (e.g. from a
 * registry and from the incremental state).
 */
export declare class CompoundComponentScopeReader implements ComponentScopeReader {
    private readers;
    constructor(readers: ComponentScopeReader[]);
    getScopeForComponent(clazz: ClassDeclaration): LocalModuleScope | null;
    getRequiresRemoteScope(clazz: ClassDeclaration): boolean | null;
}
