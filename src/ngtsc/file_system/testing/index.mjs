/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { MockFileSystem } from './src/mock_file_system';
export { MockFileSystemNative } from './src/mock_file_system_native';
export { MockFileSystemPosix } from './src/mock_file_system_posix';
export { MockFileSystemWindows } from './src/mock_file_system_windows';
export { initMockFileSystem, runInEachFileSystem } from './src/test_helper';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL3Rlc3RpbmcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUFTLGNBQWMsRUFBQyxNQUFNLHdCQUF3QixDQUFDO0FBQzlELE9BQU8sRUFBQyxvQkFBb0IsRUFBQyxNQUFNLCtCQUErQixDQUFDO0FBQ25FLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBQyxxQkFBcUIsRUFBQyxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JFLE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBVyxNQUFNLG1CQUFtQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmV4cG9ydCB7Rm9sZGVyLCBNb2NrRmlsZVN5c3RlbX0gZnJvbSAnLi9zcmMvbW9ja19maWxlX3N5c3RlbSc7XG5leHBvcnQge01vY2tGaWxlU3lzdGVtTmF0aXZlfSBmcm9tICcuL3NyYy9tb2NrX2ZpbGVfc3lzdGVtX25hdGl2ZSc7XG5leHBvcnQge01vY2tGaWxlU3lzdGVtUG9zaXh9IGZyb20gJy4vc3JjL21vY2tfZmlsZV9zeXN0ZW1fcG9zaXgnO1xuZXhwb3J0IHtNb2NrRmlsZVN5c3RlbVdpbmRvd3N9IGZyb20gJy4vc3JjL21vY2tfZmlsZV9zeXN0ZW1fd2luZG93cyc7XG5leHBvcnQge2luaXRNb2NrRmlsZVN5c3RlbSwgcnVuSW5FYWNoRmlsZVN5c3RlbSwgVGVzdEZpbGV9IGZyb20gJy4vc3JjL3Rlc3RfaGVscGVyJztcbiJdfQ==