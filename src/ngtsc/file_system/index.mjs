/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export { NgtscCompilerHost } from './src/compiler_host';
export { absoluteFrom, absoluteFromSourceFile, basename, dirname, getFileSystem, isLocalRelativePath, isRoot, isRooted, join, relative, relativeFrom, resolve, setFileSystem, toRelativeImport } from './src/helpers';
export { LogicalFileSystem, LogicalProjectPath } from './src/logical';
export { NodeJSFileSystem } from './src/node_js_file_system';
export { getSourceFileOrError } from './src/util';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ZpbGVfc3lzdGVtL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sRUFBQyxpQkFBaUIsRUFBQyxNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBQyxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3BOLE9BQU8sRUFBQyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUNwRSxPQUFPLEVBQUMsZ0JBQWdCLEVBQUMsTUFBTSwyQkFBMkIsQ0FBQztBQUUzRCxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSxZQUFZLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmV4cG9ydCB7Tmd0c2NDb21waWxlckhvc3R9IGZyb20gJy4vc3JjL2NvbXBpbGVyX2hvc3QnO1xuZXhwb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIGJhc2VuYW1lLCBkaXJuYW1lLCBnZXRGaWxlU3lzdGVtLCBpc0xvY2FsUmVsYXRpdmVQYXRoLCBpc1Jvb3QsIGlzUm9vdGVkLCBqb2luLCByZWxhdGl2ZSwgcmVsYXRpdmVGcm9tLCByZXNvbHZlLCBzZXRGaWxlU3lzdGVtLCB0b1JlbGF0aXZlSW1wb3J0fSBmcm9tICcuL3NyYy9oZWxwZXJzJztcbmV4cG9ydCB7TG9naWNhbEZpbGVTeXN0ZW0sIExvZ2ljYWxQcm9qZWN0UGF0aH0gZnJvbSAnLi9zcmMvbG9naWNhbCc7XG5leHBvcnQge05vZGVKU0ZpbGVTeXN0ZW19IGZyb20gJy4vc3JjL25vZGVfanNfZmlsZV9zeXN0ZW0nO1xuZXhwb3J0IHtBYnNvbHV0ZUZzUGF0aCwgRmlsZVN0YXRzLCBGaWxlU3lzdGVtLCBQYXRoTWFuaXB1bGF0aW9uLCBQYXRoU2VnbWVudCwgUGF0aFN0cmluZywgUmVhZG9ubHlGaWxlU3lzdGVtfSBmcm9tICcuL3NyYy90eXBlcyc7XG5leHBvcnQge2dldFNvdXJjZUZpbGVPckVycm9yfSBmcm9tICcuL3NyYy91dGlsJztcbiJdfQ==