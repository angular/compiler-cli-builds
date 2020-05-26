/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/// <amd-module name="@angular/compiler-cli/src/ngtsc/shims" />
export { PerFileShimGenerator, TopLevelShimGenerator } from './api';
export { ShimAdapter } from './src/adapter';
export { copyFileShimData, isShim } from './src/expando';
export { FactoryGenerator, FactoryInfo, FactoryTracker, generatedFactoryTransform } from './src/factory_generator';
export { ShimReferenceTagger } from './src/reference_tagger';
export { SummaryGenerator } from './src/summary_generator';
