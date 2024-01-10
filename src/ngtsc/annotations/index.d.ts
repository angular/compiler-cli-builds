/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { forwardRefResolver, isAngularDecorator, NoopReferencesRegistry, ReferencesRegistry, ResourceLoader, ResourceLoaderContext } from './common';
export { ComponentDecoratorHandler } from './component';
export { DirectiveDecoratorHandler, tryParseSignalInputMapping } from './directive';
export { NgModuleDecoratorHandler } from './ng_module';
export { InjectableDecoratorHandler } from './src/injectable';
export { PipeDecoratorHandler } from './src/pipe';
