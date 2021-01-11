(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/source_maps", ["require", "exports", "convert-source-map", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/src/ngtsc/sourcemaps"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.renderSourceAndMap = void 0;
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var sourcemaps_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps");
    /**
     * Merge the input and output source-maps, replacing the source-map comment in the output file
     * with an appropriate source-map comment pointing to the merged source-map.
     */
    function renderSourceAndMap(logger, fs, sourceFile, generatedMagicString) {
        var generatedPath = file_system_1.absoluteFromSourceFile(sourceFile);
        var generatedMapPath = file_system_1.absoluteFrom(generatedPath + ".map");
        var generatedContent = generatedMagicString.toString();
        var generatedMap = generatedMagicString.generateMap({ file: generatedPath, source: generatedPath, includeContent: true });
        try {
            var loader = new sourcemaps_1.SourceFileLoader(fs, logger, {});
            var generatedFile = loader.loadSourceFile(generatedPath, generatedContent, { map: generatedMap, mapPath: generatedMapPath });
            var rawMergedMap = generatedFile.renderFlattenedSourceMap();
            var mergedMap = convert_source_map_1.fromObject(rawMergedMap);
            var firstSource = generatedFile.sources[0];
            if (firstSource && (firstSource.rawMap !== null || !sourceFile.isDeclarationFile) &&
                firstSource.inline) {
                // We render an inline source map if one of:
                // * there was no input source map and this is not a typings file;
                // * the input source map exists and was inline.
                //
                // We do not generate inline source maps for typings files unless there explicitly was one in
                // the input file because these inline source maps can be very large and it impacts on the
                // performance of IDEs that need to read them to provide intellisense etc.
                return [
                    { path: generatedPath, contents: generatedFile.contents + "\n" + mergedMap.toComment() }
                ];
            }
            else {
                var sourceMapComment = convert_source_map_1.generateMapFileComment(fs.basename(generatedPath) + ".map");
                return [
                    { path: generatedPath, contents: generatedFile.contents + "\n" + sourceMapComment },
                    { path: generatedMapPath, contents: mergedMap.toJSON() }
                ];
            }
        }
        catch (e) {
            logger.error("Error when flattening the source-map \"" + generatedMapPath + "\" for \"" + generatedPath + "\": " + e.toString());
            return [
                { path: generatedPath, contents: generatedContent },
                { path: generatedMapPath, contents: convert_source_map_1.fromObject(generatedMap).toJSON() },
            ];
        }
    }
    exports.renderSourceAndMap = renderSourceAndMap;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlEQUEwRjtJQUkxRiwyRUFBd0c7SUFFeEcseUVBQTZFO0lBVTdFOzs7T0FHRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixNQUFjLEVBQUUsRUFBc0IsRUFBRSxVQUF5QixFQUNqRSxvQkFBaUM7UUFDbkMsSUFBTSxhQUFhLEdBQUcsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsSUFBTSxnQkFBZ0IsR0FBRywwQkFBWSxDQUFJLGFBQWEsU0FBTSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6RCxJQUFNLFlBQVksR0FBaUIsb0JBQW9CLENBQUMsV0FBVyxDQUMvRCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUV4RSxJQUFJO1lBQ0YsSUFBTSxNQUFNLEdBQUcsSUFBSSw2QkFBZ0IsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELElBQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQ3ZDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQztZQUVyRixJQUFNLFlBQVksR0FBaUIsYUFBYSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDNUUsSUFBTSxTQUFTLEdBQUcsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQyxJQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksV0FBVyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUM7Z0JBQzdFLFdBQVcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3RCLDRDQUE0QztnQkFDNUMsa0VBQWtFO2dCQUNsRSxnREFBZ0Q7Z0JBQ2hELEVBQUU7Z0JBQ0YsNkZBQTZGO2dCQUM3RiwwRkFBMEY7Z0JBQzFGLDBFQUEwRTtnQkFDMUUsT0FBTztvQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFLLGFBQWEsQ0FBQyxRQUFRLFVBQUssU0FBUyxDQUFDLFNBQVMsRUFBSSxFQUFDO2lCQUN2RixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsSUFBTSxnQkFBZ0IsR0FBRywyQ0FBc0IsQ0FBSSxFQUFFLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFNLENBQUMsQ0FBQztnQkFDckYsT0FBTztvQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFLLGFBQWEsQ0FBQyxRQUFRLFVBQUssZ0JBQWtCLEVBQUM7b0JBQ2pGLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUM7aUJBQ3ZELENBQUM7YUFDSDtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLENBQUMsS0FBSyxDQUFDLDRDQUF5QyxnQkFBZ0IsaUJBQ2xFLGFBQWEsWUFBTSxDQUFDLENBQUMsUUFBUSxFQUFJLENBQUMsQ0FBQztZQUN2QyxPQUFPO2dCQUNMLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBQ2pELEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSwrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFDO2FBQ3RFLENBQUM7U0FDSDtJQUNILENBQUM7SUE1Q0QsZ0RBNENDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Zyb21PYmplY3QsIGdlbmVyYXRlTWFwRmlsZUNvbW1lbnQsIFNvdXJjZU1hcENvbnZlcnRlcn0gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBSZWFkb25seUZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXAsIFNvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zb3VyY2VtYXBzJztcblxuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gKiB3aXRoIGFuIGFwcHJvcHJpYXRlIHNvdXJjZS1tYXAgY29tbWVudCBwb2ludGluZyB0byB0aGUgbWVyZ2VkIHNvdXJjZS1tYXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBSZWFkb25seUZpbGVTeXN0ZW0sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgZ2VuZXJhdGVkTWFnaWNTdHJpbmc6IE1hZ2ljU3RyaW5nKTogRmlsZVRvV3JpdGVbXSB7XG4gIGNvbnN0IGdlbmVyYXRlZFBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpO1xuICBjb25zdCBnZW5lcmF0ZWRNYXBQYXRoID0gYWJzb2x1dGVGcm9tKGAke2dlbmVyYXRlZFBhdGh9Lm1hcGApO1xuICBjb25zdCBnZW5lcmF0ZWRDb250ZW50ID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcudG9TdHJpbmcoKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRNYWdpY1N0cmluZy5nZW5lcmF0ZU1hcChcbiAgICAgIHtmaWxlOiBnZW5lcmF0ZWRQYXRoLCBzb3VyY2U6IGdlbmVyYXRlZFBhdGgsIGluY2x1ZGVDb250ZW50OiB0cnVlfSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgU291cmNlRmlsZUxvYWRlcihmcywgbG9nZ2VyLCB7fSk7XG4gICAgY29uc3QgZ2VuZXJhdGVkRmlsZSA9IGxvYWRlci5sb2FkU291cmNlRmlsZShcbiAgICAgICAgZ2VuZXJhdGVkUGF0aCwgZ2VuZXJhdGVkQ29udGVudCwge21hcDogZ2VuZXJhdGVkTWFwLCBtYXBQYXRoOiBnZW5lcmF0ZWRNYXBQYXRofSk7XG5cbiAgICBjb25zdCByYXdNZXJnZWRNYXA6IFJhd1NvdXJjZU1hcCA9IGdlbmVyYXRlZEZpbGUucmVuZGVyRmxhdHRlbmVkU291cmNlTWFwKCk7XG4gICAgY29uc3QgbWVyZ2VkTWFwID0gZnJvbU9iamVjdChyYXdNZXJnZWRNYXApO1xuICAgIGNvbnN0IGZpcnN0U291cmNlID0gZ2VuZXJhdGVkRmlsZS5zb3VyY2VzWzBdO1xuICAgIGlmIChmaXJzdFNvdXJjZSAmJiAoZmlyc3RTb3VyY2UucmF3TWFwICE9PSBudWxsIHx8ICFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSAmJlxuICAgICAgICBmaXJzdFNvdXJjZS5pbmxpbmUpIHtcbiAgICAgIC8vIFdlIHJlbmRlciBhbiBpbmxpbmUgc291cmNlIG1hcCBpZiBvbmUgb2Y6XG4gICAgICAvLyAqIHRoZXJlIHdhcyBubyBpbnB1dCBzb3VyY2UgbWFwIGFuZCB0aGlzIGlzIG5vdCBhIHR5cGluZ3MgZmlsZTtcbiAgICAgIC8vICogdGhlIGlucHV0IHNvdXJjZSBtYXAgZXhpc3RzIGFuZCB3YXMgaW5saW5lLlxuICAgICAgLy9cbiAgICAgIC8vIFdlIGRvIG5vdCBnZW5lcmF0ZSBpbmxpbmUgc291cmNlIG1hcHMgZm9yIHR5cGluZ3MgZmlsZXMgdW5sZXNzIHRoZXJlIGV4cGxpY2l0bHkgd2FzIG9uZSBpblxuICAgICAgLy8gdGhlIGlucHV0IGZpbGUgYmVjYXVzZSB0aGVzZSBpbmxpbmUgc291cmNlIG1hcHMgY2FuIGJlIHZlcnkgbGFyZ2UgYW5kIGl0IGltcGFjdHMgb24gdGhlXG4gICAgICAvLyBwZXJmb3JtYW5jZSBvZiBJREVzIHRoYXQgbmVlZCB0byByZWFkIHRoZW0gdG8gcHJvdmlkZSBpbnRlbGxpc2Vuc2UgZXRjLlxuICAgICAgcmV0dXJuIFtcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9XG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VNYXBDb21tZW50ID0gZ2VuZXJhdGVNYXBGaWxlQ29tbWVudChgJHtmcy5iYXNlbmFtZShnZW5lcmF0ZWRQYXRoKX0ubWFwYCk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHtzb3VyY2VNYXBDb21tZW50fWB9LFxuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX1cbiAgICAgIF07XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGVuIGZsYXR0ZW5pbmcgdGhlIHNvdXJjZS1tYXAgXCIke2dlbmVyYXRlZE1hcFBhdGh9XCIgZm9yIFwiJHtcbiAgICAgICAgZ2VuZXJhdGVkUGF0aH1cIjogJHtlLnRvU3RyaW5nKCl9YCk7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogZ2VuZXJhdGVkQ29udGVudH0sXG4gICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IGZyb21PYmplY3QoZ2VuZXJhdGVkTWFwKS50b0pTT04oKX0sXG4gICAgXTtcbiAgfVxufVxuIl19