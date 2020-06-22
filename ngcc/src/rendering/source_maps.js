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
            var loader = new sourcemaps_1.SourceFileLoader(fs, logger);
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
                var sourceMapComment = convert_source_map_1.generateMapFileComment(file_system_1.basename(generatedPath) + ".map");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlEQUEwRjtJQUkxRiwyRUFBMEc7SUFFMUcseUVBQTZFO0lBVTdFOzs7T0FHRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixNQUFjLEVBQUUsRUFBYyxFQUFFLFVBQXlCLEVBQ3pELG9CQUFpQztRQUNuQyxJQUFNLGFBQWEsR0FBRyxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RCxJQUFNLGdCQUFnQixHQUFHLDBCQUFZLENBQUksYUFBYSxTQUFNLENBQUMsQ0FBQztRQUM5RCxJQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pELElBQU0sWUFBWSxHQUFpQixvQkFBb0IsQ0FBQyxXQUFXLENBQy9ELEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBRXhFLElBQUk7WUFDRixJQUFNLE1BQU0sR0FBRyxJQUFJLDZCQUFnQixDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNoRCxJQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUN2QyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsRUFBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7WUFFckYsSUFBTSxZQUFZLEdBQWlCLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQzVFLElBQU0sU0FBUyxHQUFHLCtCQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0MsSUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3QyxJQUFJLFdBQVcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDO2dCQUM3RSxXQUFXLENBQUMsTUFBTSxFQUFFO2dCQUN0Qiw0Q0FBNEM7Z0JBQzVDLGtFQUFrRTtnQkFDbEUsZ0RBQWdEO2dCQUNoRCxFQUFFO2dCQUNGLDZGQUE2RjtnQkFDN0YsMEZBQTBGO2dCQUMxRiwwRUFBMEU7Z0JBQzFFLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLFNBQVMsQ0FBQyxTQUFTLEVBQUksRUFBQztpQkFDdkYsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLElBQU0sZ0JBQWdCLEdBQUcsMkNBQXNCLENBQUksc0JBQVEsQ0FBQyxhQUFhLENBQUMsU0FBTSxDQUFDLENBQUM7Z0JBQ2xGLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLGdCQUFrQixFQUFDO29CQUNqRixFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFDO2lCQUN2RCxDQUFDO2FBQ0g7U0FDRjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBeUMsZ0JBQWdCLGlCQUNsRSxhQUFhLFlBQU0sQ0FBQyxDQUFDLFFBQVEsRUFBSSxDQUFDLENBQUM7WUFDdkMsT0FBTztnQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFDO2dCQUNqRCxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBQzthQUN0RSxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBNUNELGdEQTRDQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtmcm9tT2JqZWN0LCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBTb3VyY2VNYXBDb252ZXJ0ZXJ9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgYmFzZW5hbWUsIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2xvZ2dpbmcnO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXAsIFNvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9zb3VyY2VtYXBzJztcblxuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gKiB3aXRoIGFuIGFwcHJvcHJpYXRlIHNvdXJjZS1tYXAgY29tbWVudCBwb2ludGluZyB0byB0aGUgbWVyZ2VkIHNvdXJjZS1tYXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGdlbmVyYXRlZE1hZ2ljU3RyaW5nOiBNYWdpY1N0cmluZyk6IEZpbGVUb1dyaXRlW10ge1xuICBjb25zdCBnZW5lcmF0ZWRQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwUGF0aCA9IGFic29sdXRlRnJvbShgJHtnZW5lcmF0ZWRQYXRofS5tYXBgKTtcbiAgY29uc3QgZ2VuZXJhdGVkQ29udGVudCA9IGdlbmVyYXRlZE1hZ2ljU3RyaW5nLnRvU3RyaW5nKCk7XG4gIGNvbnN0IGdlbmVyYXRlZE1hcDogUmF3U291cmNlTWFwID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcuZ2VuZXJhdGVNYXAoXG4gICAgICB7ZmlsZTogZ2VuZXJhdGVkUGF0aCwgc291cmNlOiBnZW5lcmF0ZWRQYXRoLCBpbmNsdWRlQ29udGVudDogdHJ1ZX0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgbG9hZGVyID0gbmV3IFNvdXJjZUZpbGVMb2FkZXIoZnMsIGxvZ2dlcik7XG4gICAgY29uc3QgZ2VuZXJhdGVkRmlsZSA9IGxvYWRlci5sb2FkU291cmNlRmlsZShcbiAgICAgICAgZ2VuZXJhdGVkUGF0aCwgZ2VuZXJhdGVkQ29udGVudCwge21hcDogZ2VuZXJhdGVkTWFwLCBtYXBQYXRoOiBnZW5lcmF0ZWRNYXBQYXRofSk7XG5cbiAgICBjb25zdCByYXdNZXJnZWRNYXA6IFJhd1NvdXJjZU1hcCA9IGdlbmVyYXRlZEZpbGUucmVuZGVyRmxhdHRlbmVkU291cmNlTWFwKCk7XG4gICAgY29uc3QgbWVyZ2VkTWFwID0gZnJvbU9iamVjdChyYXdNZXJnZWRNYXApO1xuICAgIGNvbnN0IGZpcnN0U291cmNlID0gZ2VuZXJhdGVkRmlsZS5zb3VyY2VzWzBdO1xuICAgIGlmIChmaXJzdFNvdXJjZSAmJiAoZmlyc3RTb3VyY2UucmF3TWFwICE9PSBudWxsIHx8ICFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSAmJlxuICAgICAgICBmaXJzdFNvdXJjZS5pbmxpbmUpIHtcbiAgICAgIC8vIFdlIHJlbmRlciBhbiBpbmxpbmUgc291cmNlIG1hcCBpZiBvbmUgb2Y6XG4gICAgICAvLyAqIHRoZXJlIHdhcyBubyBpbnB1dCBzb3VyY2UgbWFwIGFuZCB0aGlzIGlzIG5vdCBhIHR5cGluZ3MgZmlsZTtcbiAgICAgIC8vICogdGhlIGlucHV0IHNvdXJjZSBtYXAgZXhpc3RzIGFuZCB3YXMgaW5saW5lLlxuICAgICAgLy9cbiAgICAgIC8vIFdlIGRvIG5vdCBnZW5lcmF0ZSBpbmxpbmUgc291cmNlIG1hcHMgZm9yIHR5cGluZ3MgZmlsZXMgdW5sZXNzIHRoZXJlIGV4cGxpY2l0bHkgd2FzIG9uZSBpblxuICAgICAgLy8gdGhlIGlucHV0IGZpbGUgYmVjYXVzZSB0aGVzZSBpbmxpbmUgc291cmNlIG1hcHMgY2FuIGJlIHZlcnkgbGFyZ2UgYW5kIGl0IGltcGFjdHMgb24gdGhlXG4gICAgICAvLyBwZXJmb3JtYW5jZSBvZiBJREVzIHRoYXQgbmVlZCB0byByZWFkIHRoZW0gdG8gcHJvdmlkZSBpbnRlbGxpc2Vuc2UgZXRjLlxuICAgICAgcmV0dXJuIFtcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9XG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VNYXBDb21tZW50ID0gZ2VuZXJhdGVNYXBGaWxlQ29tbWVudChgJHtiYXNlbmFtZShnZW5lcmF0ZWRQYXRoKX0ubWFwYCk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHtzb3VyY2VNYXBDb21tZW50fWB9LFxuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX1cbiAgICAgIF07XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGVuIGZsYXR0ZW5pbmcgdGhlIHNvdXJjZS1tYXAgXCIke2dlbmVyYXRlZE1hcFBhdGh9XCIgZm9yIFwiJHtcbiAgICAgICAgZ2VuZXJhdGVkUGF0aH1cIjogJHtlLnRvU3RyaW5nKCl9YCk7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogZ2VuZXJhdGVkQ29udGVudH0sXG4gICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IGZyb21PYmplY3QoZ2VuZXJhdGVkTWFwKS50b0pTT04oKX0sXG4gICAgXTtcbiAgfVxufVxuIl19