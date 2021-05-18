/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export * from './src/api';
export { DtsMetadataReader } from './src/dts';
export { flattenInheritedDirectiveMetadata } from './src/inheritance';
export { CompoundMetadataRegistry, LocalMetadataRegistry, InjectableClassRegistry } from './src/registry';
export { ResourceRegistry, isExternalResource } from './src/resource_registry';
export { extractDirectiveTypeCheckMeta, CompoundMetadataReader } from './src/util';
export { ClassPropertyMapping } from './src/property_mapping';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUVILGNBQWMsV0FBVyxDQUFDO0FBQzFCLE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUM1QyxPQUFPLEVBQUMsaUNBQWlDLEVBQUMsTUFBTSxtQkFBbUIsQ0FBQztBQUNwRSxPQUFPLEVBQUMsd0JBQXdCLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4RyxPQUFPLEVBQUMsZ0JBQWdCLEVBQWdDLGtCQUFrQixFQUFtQixNQUFNLHlCQUF5QixDQUFDO0FBQzdILE9BQU8sRUFBQyw2QkFBNkIsRUFBRSxzQkFBc0IsRUFBQyxNQUFNLFlBQVksQ0FBQztBQUNqRixPQUFPLEVBQXNCLG9CQUFvQixFQUFtQyxNQUFNLHdCQUF3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCAqIGZyb20gJy4vc3JjL2FwaSc7XG5leHBvcnQge0R0c01ldGFkYXRhUmVhZGVyfSBmcm9tICcuL3NyYy9kdHMnO1xuZXhwb3J0IHtmbGF0dGVuSW5oZXJpdGVkRGlyZWN0aXZlTWV0YWRhdGF9IGZyb20gJy4vc3JjL2luaGVyaXRhbmNlJztcbmV4cG9ydCB7Q29tcG91bmRNZXRhZGF0YVJlZ2lzdHJ5LCBMb2NhbE1ldGFkYXRhUmVnaXN0cnksIEluamVjdGFibGVDbGFzc1JlZ2lzdHJ5fSBmcm9tICcuL3NyYy9yZWdpc3RyeSc7XG5leHBvcnQge1Jlc291cmNlUmVnaXN0cnksIFJlc291cmNlLCBDb21wb25lbnRSZXNvdXJjZXMsIGlzRXh0ZXJuYWxSZXNvdXJjZSwgRXh0ZXJuYWxSZXNvdXJjZX0gZnJvbSAnLi9zcmMvcmVzb3VyY2VfcmVnaXN0cnknO1xuZXhwb3J0IHtleHRyYWN0RGlyZWN0aXZlVHlwZUNoZWNrTWV0YSwgQ29tcG91bmRNZXRhZGF0YVJlYWRlcn0gZnJvbSAnLi9zcmMvdXRpbCc7XG5leHBvcnQge0JpbmRpbmdQcm9wZXJ0eU5hbWUsIENsYXNzUHJvcGVydHlNYXBwaW5nLCBDbGFzc1Byb3BlcnR5TmFtZSwgSW5wdXRPck91dHB1dH0gZnJvbSAnLi9zcmMvcHJvcGVydHlfbWFwcGluZyc7XG4iXX0=