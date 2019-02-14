(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/packages/entry_point_bundle", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngcc/src/packages/bundle_program"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var bundle_program_1 = require("@angular/compiler-cli/src/ngcc/src/packages/bundle_program");
    /**
     * Get an object that describes a formatted bundle for an entry-point.
     * @param entryPoint The entry-point that contains the bundle.
     * @param format The format of the bundle.
     * @param transformDts True if processing this bundle should also process its `.d.ts` files.
     */
    function makeEntryPointBundle(entryPoint, isCore, format, transformDts) {
        // Bail out if the entry-point does not have this format.
        var path = entryPoint[format];
        if (!path) {
            return null;
        }
        // Create the TS program and necessary helpers.
        var options = {
            allowJs: true,
            maxNodeModuleJsDepth: Infinity,
            rootDir: entryPoint.path,
        };
        var host = ts.createCompilerHost(options);
        var rootDirs = [path_1.AbsoluteFsPath.from(entryPoint.path)];
        // Create the bundle programs, as necessary.
        var src = bundle_program_1.makeBundleProgram(isCore, path, 'r3_symbols.js', options, host);
        var dts = transformDts ?
            bundle_program_1.makeBundleProgram(isCore, entryPoint.typings, 'r3_symbols.d.ts', options, host) :
            null;
        var isFlat = src.r3SymbolsFile === null;
        return { format: format, rootDirs: rootDirs, isFlat: isFlat, src: src, dts: dts };
    }
    exports.makeEntryPointBundle = makeEntryPointBundle;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50cnlfcG9pbnRfYnVuZGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ2NjL3NyYy9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFFakMsNkRBQW1EO0lBRW5ELDZGQUFrRTtJQWlCbEU7Ozs7O09BS0c7SUFDSCxTQUFnQixvQkFBb0IsQ0FDaEMsVUFBc0IsRUFBRSxNQUFlLEVBQUUsTUFBd0IsRUFDakUsWUFBcUI7UUFDdkIseURBQXlEO1FBQ3pELElBQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ1QsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELCtDQUErQztRQUMvQyxJQUFNLE9BQU8sR0FBdUI7WUFDbEMsT0FBTyxFQUFFLElBQUk7WUFDYixvQkFBb0IsRUFBRSxRQUFRO1lBQzlCLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSTtTQUN6QixDQUFDO1FBQ0YsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLElBQU0sUUFBUSxHQUFHLENBQUMscUJBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFeEQsNENBQTRDO1FBQzVDLElBQU0sR0FBRyxHQUFHLGtDQUFpQixDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RSxJQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsQ0FBQztZQUN0QixrQ0FBaUIsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqRixJQUFJLENBQUM7UUFDVCxJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsYUFBYSxLQUFLLElBQUksQ0FBQztRQUUxQyxPQUFPLEVBQUMsTUFBTSxRQUFBLEVBQUUsUUFBUSxVQUFBLEVBQUUsTUFBTSxRQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUUsR0FBRyxLQUFBLEVBQUMsQ0FBQztJQUM5QyxDQUFDO0lBMUJELG9EQTBCQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0Fic29sdXRlRnNQYXRofSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9wYXRoJztcblxuaW1wb3J0IHtCdW5kbGVQcm9ncmFtLCBtYWtlQnVuZGxlUHJvZ3JhbX0gZnJvbSAnLi9idW5kbGVfcHJvZ3JhbSc7XG5pbXBvcnQge0VudHJ5UG9pbnQsIEVudHJ5UG9pbnRGb3JtYXR9IGZyb20gJy4vZW50cnlfcG9pbnQnO1xuXG5cblxuLyoqXG4gKiBBIGJ1bmRsZSBvZiBmaWxlcyBhbmQgcGF0aHMgKGFuZCBUUyBwcm9ncmFtcykgdGhhdCBjb3JyZXNwb25kIHRvIGEgcGFydGljdWxhclxuICogZm9ybWF0IG9mIGEgcGFja2FnZSBlbnRyeS1wb2ludC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFbnRyeVBvaW50QnVuZGxlIHtcbiAgZm9ybWF0OiBFbnRyeVBvaW50Rm9ybWF0O1xuICBpc0ZsYXQ6IGJvb2xlYW47XG4gIHJvb3REaXJzOiBBYnNvbHV0ZUZzUGF0aFtdO1xuICBzcmM6IEJ1bmRsZVByb2dyYW07XG4gIGR0czogQnVuZGxlUHJvZ3JhbXxudWxsO1xufVxuXG4vKipcbiAqIEdldCBhbiBvYmplY3QgdGhhdCBkZXNjcmliZXMgYSBmb3JtYXR0ZWQgYnVuZGxlIGZvciBhbiBlbnRyeS1wb2ludC5cbiAqIEBwYXJhbSBlbnRyeVBvaW50IFRoZSBlbnRyeS1wb2ludCB0aGF0IGNvbnRhaW5zIHRoZSBidW5kbGUuXG4gKiBAcGFyYW0gZm9ybWF0IFRoZSBmb3JtYXQgb2YgdGhlIGJ1bmRsZS5cbiAqIEBwYXJhbSB0cmFuc2Zvcm1EdHMgVHJ1ZSBpZiBwcm9jZXNzaW5nIHRoaXMgYnVuZGxlIHNob3VsZCBhbHNvIHByb2Nlc3MgaXRzIGAuZC50c2AgZmlsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlRW50cnlQb2ludEJ1bmRsZShcbiAgICBlbnRyeVBvaW50OiBFbnRyeVBvaW50LCBpc0NvcmU6IGJvb2xlYW4sIGZvcm1hdDogRW50cnlQb2ludEZvcm1hdCxcbiAgICB0cmFuc2Zvcm1EdHM6IGJvb2xlYW4pOiBFbnRyeVBvaW50QnVuZGxlfG51bGwge1xuICAvLyBCYWlsIG91dCBpZiB0aGUgZW50cnktcG9pbnQgZG9lcyBub3QgaGF2ZSB0aGlzIGZvcm1hdC5cbiAgY29uc3QgcGF0aCA9IGVudHJ5UG9pbnRbZm9ybWF0XTtcbiAgaWYgKCFwYXRoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIFRTIHByb2dyYW0gYW5kIG5lY2Vzc2FyeSBoZWxwZXJzLlxuICBjb25zdCBvcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMgPSB7XG4gICAgYWxsb3dKczogdHJ1ZSxcbiAgICBtYXhOb2RlTW9kdWxlSnNEZXB0aDogSW5maW5pdHksXG4gICAgcm9vdERpcjogZW50cnlQb2ludC5wYXRoLFxuICB9O1xuICBjb25zdCBob3N0ID0gdHMuY3JlYXRlQ29tcGlsZXJIb3N0KG9wdGlvbnMpO1xuICBjb25zdCByb290RGlycyA9IFtBYnNvbHV0ZUZzUGF0aC5mcm9tKGVudHJ5UG9pbnQucGF0aCldO1xuXG4gIC8vIENyZWF0ZSB0aGUgYnVuZGxlIHByb2dyYW1zLCBhcyBuZWNlc3NhcnkuXG4gIGNvbnN0IHNyYyA9IG1ha2VCdW5kbGVQcm9ncmFtKGlzQ29yZSwgcGF0aCwgJ3IzX3N5bWJvbHMuanMnLCBvcHRpb25zLCBob3N0KTtcbiAgY29uc3QgZHRzID0gdHJhbnNmb3JtRHRzID9cbiAgICAgIG1ha2VCdW5kbGVQcm9ncmFtKGlzQ29yZSwgZW50cnlQb2ludC50eXBpbmdzLCAncjNfc3ltYm9scy5kLnRzJywgb3B0aW9ucywgaG9zdCkgOlxuICAgICAgbnVsbDtcbiAgY29uc3QgaXNGbGF0ID0gc3JjLnIzU3ltYm9sc0ZpbGUgPT09IG51bGw7XG5cbiAgcmV0dXJuIHtmb3JtYXQsIHJvb3REaXJzLCBpc0ZsYXQsIHNyYywgZHRzfTtcbn1cbiJdfQ==