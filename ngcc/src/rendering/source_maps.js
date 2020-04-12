(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/source_maps", ["require", "exports", "convert-source-map", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/sourcemaps/source_file_loader"], factory);
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
    var convert_source_map_1 = require("convert-source-map");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var source_file_loader_1 = require("@angular/compiler-cli/ngcc/src/sourcemaps/source_file_loader");
    /**
     * Merge the input and output source-maps, replacing the source-map comment in the output file
     * with an appropriate source-map comment pointing to the merged source-map.
     */
    function renderSourceAndMap(logger, fs, sourceFile, generatedMagicString) {
        var _a;
        var generatedPath = file_system_1.absoluteFromSourceFile(sourceFile);
        var generatedMapPath = file_system_1.absoluteFrom(generatedPath + ".map");
        var generatedContent = generatedMagicString.toString();
        var generatedMap = generatedMagicString.generateMap({ file: generatedPath, source: generatedPath, includeContent: true });
        try {
            var loader = new source_file_loader_1.SourceFileLoader(fs, logger);
            var generatedFile = loader.loadSourceFile(generatedPath, generatedContent, { map: generatedMap, mapPath: generatedMapPath });
            var rawMergedMap = generatedFile.renderFlattenedSourceMap();
            var mergedMap = convert_source_map_1.fromObject(rawMergedMap);
            if ((_a = generatedFile.sources[0]) === null || _a === void 0 ? void 0 : _a.inline) {
                // The input source-map was inline so make the output one inline too.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQTBGO0lBSzFGLDJFQUEwRztJQUcxRyxtR0FBa0U7SUFVbEU7OztPQUdHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLE1BQWMsRUFBRSxFQUFjLEVBQUUsVUFBeUIsRUFDekQsb0JBQWlDOztRQUNuQyxJQUFNLGFBQWEsR0FBRyxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RCxJQUFNLGdCQUFnQixHQUFHLDBCQUFZLENBQUksYUFBYSxTQUFNLENBQUMsQ0FBQztRQUM5RCxJQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pELElBQU0sWUFBWSxHQUFpQixvQkFBb0IsQ0FBQyxXQUFXLENBQy9ELEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBRXhFLElBQUk7WUFDRixJQUFNLE1BQU0sR0FBRyxJQUFJLHFDQUFnQixDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNoRCxJQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUN2QyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsRUFBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBQyxDQUFDLENBQUM7WUFFckYsSUFBTSxZQUFZLEdBQWlCLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQzVFLElBQU0sU0FBUyxHQUFHLCtCQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0MsVUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQywwQ0FBRSxNQUFNLEVBQUU7Z0JBQ3BDLHFFQUFxRTtnQkFDckUsT0FBTztvQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFLLGFBQWEsQ0FBQyxRQUFRLFVBQUssU0FBUyxDQUFDLFNBQVMsRUFBSSxFQUFDO2lCQUN2RixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsSUFBTSxnQkFBZ0IsR0FBRywyQ0FBc0IsQ0FBSSxzQkFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFNLENBQUMsQ0FBQztnQkFDbEYsT0FBTztvQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFLLGFBQWEsQ0FBQyxRQUFRLFVBQUssZ0JBQWtCLEVBQUM7b0JBQ2pGLEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUM7aUJBQ3ZELENBQUM7YUFDSDtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLENBQUMsS0FBSyxDQUFDLDRDQUF5QyxnQkFBZ0IsaUJBQ2xFLGFBQWEsWUFBTSxDQUFDLENBQUMsUUFBUSxFQUFJLENBQUMsQ0FBQztZQUN2QyxPQUFPO2dCQUNMLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUM7Z0JBQ2pELEVBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSwrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFDO2FBQ3RFLENBQUM7U0FDSDtJQUNILENBQUM7SUFwQ0QsZ0RBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtTb3VyY2VNYXBDb252ZXJ0ZXIsIGZyb21PYmplY3QsIGdlbmVyYXRlTWFwRmlsZUNvbW1lbnR9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5cbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBiYXNlbmFtZSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnLi4vc291cmNlbWFwcy9yYXdfc291cmNlX21hcCc7XG5pbXBvcnQge1NvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyJztcblxuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gKiB3aXRoIGFuIGFwcHJvcHJpYXRlIHNvdXJjZS1tYXAgY29tbWVudCBwb2ludGluZyB0byB0aGUgbWVyZ2VkIHNvdXJjZS1tYXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGdlbmVyYXRlZE1hZ2ljU3RyaW5nOiBNYWdpY1N0cmluZyk6IEZpbGVUb1dyaXRlW10ge1xuICBjb25zdCBnZW5lcmF0ZWRQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwUGF0aCA9IGFic29sdXRlRnJvbShgJHtnZW5lcmF0ZWRQYXRofS5tYXBgKTtcbiAgY29uc3QgZ2VuZXJhdGVkQ29udGVudCA9IGdlbmVyYXRlZE1hZ2ljU3RyaW5nLnRvU3RyaW5nKCk7XG4gIGNvbnN0IGdlbmVyYXRlZE1hcDogUmF3U291cmNlTWFwID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcuZ2VuZXJhdGVNYXAoXG4gICAgICB7ZmlsZTogZ2VuZXJhdGVkUGF0aCwgc291cmNlOiBnZW5lcmF0ZWRQYXRoLCBpbmNsdWRlQ29udGVudDogdHJ1ZX0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgbG9hZGVyID0gbmV3IFNvdXJjZUZpbGVMb2FkZXIoZnMsIGxvZ2dlcik7XG4gICAgY29uc3QgZ2VuZXJhdGVkRmlsZSA9IGxvYWRlci5sb2FkU291cmNlRmlsZShcbiAgICAgICAgZ2VuZXJhdGVkUGF0aCwgZ2VuZXJhdGVkQ29udGVudCwge21hcDogZ2VuZXJhdGVkTWFwLCBtYXBQYXRoOiBnZW5lcmF0ZWRNYXBQYXRofSk7XG5cbiAgICBjb25zdCByYXdNZXJnZWRNYXA6IFJhd1NvdXJjZU1hcCA9IGdlbmVyYXRlZEZpbGUucmVuZGVyRmxhdHRlbmVkU291cmNlTWFwKCk7XG4gICAgY29uc3QgbWVyZ2VkTWFwID0gZnJvbU9iamVjdChyYXdNZXJnZWRNYXApO1xuICAgIGlmIChnZW5lcmF0ZWRGaWxlLnNvdXJjZXNbMF0/LmlubGluZSkge1xuICAgICAgLy8gVGhlIGlucHV0IHNvdXJjZS1tYXAgd2FzIGlubGluZSBzbyBtYWtlIHRoZSBvdXRwdXQgb25lIGlubGluZSB0b28uXG4gICAgICByZXR1cm4gW1xuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHttZXJnZWRNYXAudG9Db21tZW50KCl9YH1cbiAgICAgIF07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNvdXJjZU1hcENvbW1lbnQgPSBnZW5lcmF0ZU1hcEZpbGVDb21tZW50KGAke2Jhc2VuYW1lKGdlbmVyYXRlZFBhdGgpfS5tYXBgKTtcbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogYCR7Z2VuZXJhdGVkRmlsZS5jb250ZW50c31cXG4ke3NvdXJjZU1hcENvbW1lbnR9YH0sXG4gICAgICAgIHtwYXRoOiBnZW5lcmF0ZWRNYXBQYXRoLCBjb250ZW50czogbWVyZ2VkTWFwLnRvSlNPTigpfVxuICAgICAgXTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2dnZXIuZXJyb3IoYEVycm9yIHdoZW4gZmxhdHRlbmluZyB0aGUgc291cmNlLW1hcCBcIiR7Z2VuZXJhdGVkTWFwUGF0aH1cIiBmb3IgXCIke1xuICAgICAgICBnZW5lcmF0ZWRQYXRofVwiOiAke2UudG9TdHJpbmcoKX1gKTtcbiAgICByZXR1cm4gW1xuICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBnZW5lcmF0ZWRDb250ZW50fSxcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRNYXBQYXRoLCBjb250ZW50czogZnJvbU9iamVjdChnZW5lcmF0ZWRNYXApLnRvSlNPTigpfSxcbiAgICBdO1xuICB9XG59XG4iXX0=