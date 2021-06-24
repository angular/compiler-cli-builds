/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Xliff, Xliff2, Xmb } from '@angular/compiler';
import * as path from 'path';
export function i18nGetExtension(formatName) {
    const format = formatName.toLowerCase();
    switch (format) {
        case 'xmb':
            return 'xmb';
        case 'xlf':
        case 'xlif':
        case 'xliff':
        case 'xlf2':
        case 'xliff2':
            return 'xlf';
    }
    throw new Error(`Unsupported format "${formatName}"`);
}
export function i18nExtract(formatName, outFile, host, options, bundle, pathResolve = path.resolve) {
    formatName = formatName || 'xlf';
    // Checks the format and returns the extension
    const ext = i18nGetExtension(formatName);
    const content = i18nSerialize(bundle, formatName, options);
    const dstFile = outFile || `messages.${ext}`;
    const dstPath = pathResolve(options.outDir || options.basePath, dstFile);
    host.writeFile(dstPath, content, false, undefined, []);
    return [dstPath];
}
export function i18nSerialize(bundle, formatName, options) {
    const format = formatName.toLowerCase();
    let serializer;
    switch (format) {
        case 'xmb':
            serializer = new Xmb();
            break;
        case 'xliff2':
        case 'xlf2':
            serializer = new Xliff2();
            break;
        case 'xlf':
        case 'xliff':
        default:
            serializer = new Xliff();
    }
    return bundle.write(serializer, getPathNormalizer(options.basePath));
}
function getPathNormalizer(basePath) {
    // normalize source paths by removing the base path and always using "/" as a separator
    return (sourcePath) => {
        sourcePath = basePath ? path.relative(basePath, sourcePath) : sourcePath;
        return sourcePath.split(path.sep).join('/');
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaTE4bi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvdHJhbnNmb3JtZXJzL2kxOG4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBRUgsT0FBTyxFQUE0QixLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQ2hGLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBSzdCLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxVQUFrQjtJQUNqRCxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7SUFFeEMsUUFBUSxNQUFNLEVBQUU7UUFDZCxLQUFLLEtBQUs7WUFDUixPQUFPLEtBQUssQ0FBQztRQUNmLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxNQUFNLENBQUM7UUFDWixLQUFLLE9BQU8sQ0FBQztRQUNiLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxRQUFRO1lBQ1gsT0FBTyxLQUFLLENBQUM7S0FDaEI7SUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixVQUFVLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVyxDQUN2QixVQUF1QixFQUFFLE9BQW9CLEVBQUUsSUFBcUIsRUFBRSxPQUF3QixFQUM5RixNQUFxQixFQUNyQixjQUFpRCxJQUFJLENBQUMsT0FBTztJQUMvRCxVQUFVLEdBQUcsVUFBVSxJQUFJLEtBQUssQ0FBQztJQUNqQyw4Q0FBOEM7SUFDOUMsTUFBTSxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDekMsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDM0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUM7SUFDN0MsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLFFBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN2RCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDbkIsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQ3pCLE1BQXFCLEVBQUUsVUFBa0IsRUFBRSxPQUF3QjtJQUNyRSxNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDeEMsSUFBSSxVQUFzQixDQUFDO0lBRTNCLFFBQVEsTUFBTSxFQUFFO1FBQ2QsS0FBSyxLQUFLO1lBQ1IsVUFBVSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7WUFDdkIsTUFBTTtRQUNSLEtBQUssUUFBUSxDQUFDO1FBQ2QsS0FBSyxNQUFNO1lBQ1QsVUFBVSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7WUFDMUIsTUFBTTtRQUNSLEtBQUssS0FBSyxDQUFDO1FBQ1gsS0FBSyxPQUFPLENBQUM7UUFDYjtZQUNFLFVBQVUsR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFDO0tBQzVCO0lBRUQsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxRQUFpQjtJQUMxQyx1RkFBdUY7SUFDdkYsT0FBTyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtRQUM1QixVQUFVLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1FBQ3pFLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtNZXNzYWdlQnVuZGxlLCBTZXJpYWxpemVyLCBYbGlmZiwgWGxpZmYyLCBYbWJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtDb21waWxlck9wdGlvbnN9IGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5HZXRFeHRlbnNpb24oZm9ybWF0TmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZm9ybWF0ID0gZm9ybWF0TmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgY2FzZSAneG1iJzpcbiAgICAgIHJldHVybiAneG1iJztcbiAgICBjYXNlICd4bGYnOlxuICAgIGNhc2UgJ3hsaWYnOlxuICAgIGNhc2UgJ3hsaWZmJzpcbiAgICBjYXNlICd4bGYyJzpcbiAgICBjYXNlICd4bGlmZjInOlxuICAgICAgcmV0dXJuICd4bGYnO1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBmb3JtYXQgXCIke2Zvcm1hdE5hbWV9XCJgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGkxOG5FeHRyYWN0KFxuICAgIGZvcm1hdE5hbWU6IHN0cmluZ3xudWxsLCBvdXRGaWxlOiBzdHJpbmd8bnVsbCwgaG9zdDogdHMuQ29tcGlsZXJIb3N0LCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgYnVuZGxlOiBNZXNzYWdlQnVuZGxlLFxuICAgIHBhdGhSZXNvbHZlOiAoLi4uc2VnbWVudHM6IHN0cmluZ1tdKSA9PiBzdHJpbmcgPSBwYXRoLnJlc29sdmUpOiBzdHJpbmdbXSB7XG4gIGZvcm1hdE5hbWUgPSBmb3JtYXROYW1lIHx8ICd4bGYnO1xuICAvLyBDaGVja3MgdGhlIGZvcm1hdCBhbmQgcmV0dXJucyB0aGUgZXh0ZW5zaW9uXG4gIGNvbnN0IGV4dCA9IGkxOG5HZXRFeHRlbnNpb24oZm9ybWF0TmFtZSk7XG4gIGNvbnN0IGNvbnRlbnQgPSBpMThuU2VyaWFsaXplKGJ1bmRsZSwgZm9ybWF0TmFtZSwgb3B0aW9ucyk7XG4gIGNvbnN0IGRzdEZpbGUgPSBvdXRGaWxlIHx8IGBtZXNzYWdlcy4ke2V4dH1gO1xuICBjb25zdCBkc3RQYXRoID0gcGF0aFJlc29sdmUob3B0aW9ucy5vdXREaXIgfHwgb3B0aW9ucy5iYXNlUGF0aCEsIGRzdEZpbGUpO1xuICBob3N0LndyaXRlRmlsZShkc3RQYXRoLCBjb250ZW50LCBmYWxzZSwgdW5kZWZpbmVkLCBbXSk7XG4gIHJldHVybiBbZHN0UGF0aF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpMThuU2VyaWFsaXplKFxuICAgIGJ1bmRsZTogTWVzc2FnZUJ1bmRsZSwgZm9ybWF0TmFtZTogc3RyaW5nLCBvcHRpb25zOiBDb21waWxlck9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCBmb3JtYXQgPSBmb3JtYXROYW1lLnRvTG93ZXJDYXNlKCk7XG4gIGxldCBzZXJpYWxpemVyOiBTZXJpYWxpemVyO1xuXG4gIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgY2FzZSAneG1iJzpcbiAgICAgIHNlcmlhbGl6ZXIgPSBuZXcgWG1iKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICd4bGlmZjInOlxuICAgIGNhc2UgJ3hsZjInOlxuICAgICAgc2VyaWFsaXplciA9IG5ldyBYbGlmZjIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ3hsZic6XG4gICAgY2FzZSAneGxpZmYnOlxuICAgIGRlZmF1bHQ6XG4gICAgICBzZXJpYWxpemVyID0gbmV3IFhsaWZmKCk7XG4gIH1cblxuICByZXR1cm4gYnVuZGxlLndyaXRlKHNlcmlhbGl6ZXIsIGdldFBhdGhOb3JtYWxpemVyKG9wdGlvbnMuYmFzZVBhdGgpKTtcbn1cblxuZnVuY3Rpb24gZ2V0UGF0aE5vcm1hbGl6ZXIoYmFzZVBhdGg/OiBzdHJpbmcpIHtcbiAgLy8gbm9ybWFsaXplIHNvdXJjZSBwYXRocyBieSByZW1vdmluZyB0aGUgYmFzZSBwYXRoIGFuZCBhbHdheXMgdXNpbmcgXCIvXCIgYXMgYSBzZXBhcmF0b3JcbiAgcmV0dXJuIChzb3VyY2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBzb3VyY2VQYXRoID0gYmFzZVBhdGggPyBwYXRoLnJlbGF0aXZlKGJhc2VQYXRoLCBzb3VyY2VQYXRoKSA6IHNvdXJjZVBhdGg7XG4gICAgcmV0dXJuIHNvdXJjZVBhdGguc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKTtcbiAgfTtcbn1cbiJdfQ==