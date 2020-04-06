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
            var loader = new source_file_loader_1.SourceFileLoader(fs);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gseURBQTBGO0lBSTFGLDJFQUEwRztJQUcxRyxtR0FBa0U7SUFVbEU7OztPQUdHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLE1BQWMsRUFBRSxFQUFjLEVBQUUsVUFBeUIsRUFDekQsb0JBQWlDOztRQUNuQyxJQUFNLGFBQWEsR0FBRyxvQ0FBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RCxJQUFNLGdCQUFnQixHQUFHLDBCQUFZLENBQUksYUFBYSxTQUFNLENBQUMsQ0FBQztRQUM5RCxJQUFNLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3pELElBQU0sWUFBWSxHQUFpQixvQkFBb0IsQ0FBQyxXQUFXLENBQy9ELEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBRXhFLElBQUk7WUFDRixJQUFNLE1BQU0sR0FBRyxJQUFJLHFDQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hDLElBQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQ3ZDLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxFQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFDLENBQUMsQ0FBQztZQUVyRixJQUFNLFlBQVksR0FBaUIsYUFBYSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDNUUsSUFBTSxTQUFTLEdBQUcsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQyxVQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLDBDQUFFLE1BQU0sRUFBRTtnQkFDcEMscUVBQXFFO2dCQUNyRSxPQUFPO29CQUNMLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUssYUFBYSxDQUFDLFFBQVEsVUFBSyxTQUFTLENBQUMsU0FBUyxFQUFJLEVBQUM7aUJBQ3ZGLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxJQUFNLGdCQUFnQixHQUFHLDJDQUFzQixDQUFJLHNCQUFRLENBQUMsYUFBYSxDQUFDLFNBQU0sQ0FBQyxDQUFDO2dCQUNsRixPQUFPO29CQUNMLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUssYUFBYSxDQUFDLFFBQVEsVUFBSyxnQkFBa0IsRUFBQztvQkFDakYsRUFBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBQztpQkFDdkQsQ0FBQzthQUNIO1NBQ0Y7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE1BQU0sQ0FBQyxLQUFLLENBQUMsNENBQXlDLGdCQUFnQixpQkFDbEUsYUFBYSxZQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUksQ0FBQyxDQUFDO1lBQ3ZDLE9BQU87Z0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBQztnQkFDakQsRUFBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLCtCQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUM7YUFDdEUsQ0FBQztTQUNIO0lBQ0gsQ0FBQztJQXBDRCxnREFvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Zyb21PYmplY3QsIGdlbmVyYXRlTWFwRmlsZUNvbW1lbnQsIFNvdXJjZU1hcENvbnZlcnRlcn0gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7YWJzb2x1dGVGcm9tLCBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlLCBiYXNlbmFtZSwgRmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnLi4vc291cmNlbWFwcy9yYXdfc291cmNlX21hcCc7XG5pbXBvcnQge1NvdXJjZUZpbGVMb2FkZXJ9IGZyb20gJy4uL3NvdXJjZW1hcHMvc291cmNlX2ZpbGVfbG9hZGVyJztcblxuaW1wb3J0IHtGaWxlVG9Xcml0ZX0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gKiB3aXRoIGFuIGFwcHJvcHJpYXRlIHNvdXJjZS1tYXAgY29tbWVudCBwb2ludGluZyB0byB0aGUgbWVyZ2VkIHNvdXJjZS1tYXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgbG9nZ2VyOiBMb2dnZXIsIGZzOiBGaWxlU3lzdGVtLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgIGdlbmVyYXRlZE1hZ2ljU3RyaW5nOiBNYWdpY1N0cmluZyk6IEZpbGVUb1dyaXRlW10ge1xuICBjb25zdCBnZW5lcmF0ZWRQYXRoID0gYWJzb2x1dGVGcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwUGF0aCA9IGFic29sdXRlRnJvbShgJHtnZW5lcmF0ZWRQYXRofS5tYXBgKTtcbiAgY29uc3QgZ2VuZXJhdGVkQ29udGVudCA9IGdlbmVyYXRlZE1hZ2ljU3RyaW5nLnRvU3RyaW5nKCk7XG4gIGNvbnN0IGdlbmVyYXRlZE1hcDogUmF3U291cmNlTWFwID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcuZ2VuZXJhdGVNYXAoXG4gICAgICB7ZmlsZTogZ2VuZXJhdGVkUGF0aCwgc291cmNlOiBnZW5lcmF0ZWRQYXRoLCBpbmNsdWRlQ29udGVudDogdHJ1ZX0pO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgbG9hZGVyID0gbmV3IFNvdXJjZUZpbGVMb2FkZXIoZnMpO1xuICAgIGNvbnN0IGdlbmVyYXRlZEZpbGUgPSBsb2FkZXIubG9hZFNvdXJjZUZpbGUoXG4gICAgICAgIGdlbmVyYXRlZFBhdGgsIGdlbmVyYXRlZENvbnRlbnQsIHttYXA6IGdlbmVyYXRlZE1hcCwgbWFwUGF0aDogZ2VuZXJhdGVkTWFwUGF0aH0pO1xuXG4gICAgY29uc3QgcmF3TWVyZ2VkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRGaWxlLnJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpO1xuICAgIGNvbnN0IG1lcmdlZE1hcCA9IGZyb21PYmplY3QocmF3TWVyZ2VkTWFwKTtcbiAgICBpZiAoZ2VuZXJhdGVkRmlsZS5zb3VyY2VzWzBdPy5pbmxpbmUpIHtcbiAgICAgIC8vIFRoZSBpbnB1dCBzb3VyY2UtbWFwIHdhcyBpbmxpbmUgc28gbWFrZSB0aGUgb3V0cHV0IG9uZSBpbmxpbmUgdG9vLlxuICAgICAgcmV0dXJuIFtcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9XG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VNYXBDb21tZW50ID0gZ2VuZXJhdGVNYXBGaWxlQ29tbWVudChgJHtiYXNlbmFtZShnZW5lcmF0ZWRQYXRoKX0ubWFwYCk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHtzb3VyY2VNYXBDb21tZW50fWB9LFxuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX1cbiAgICAgIF07XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGVuIGZsYXR0ZW5pbmcgdGhlIHNvdXJjZS1tYXAgXCIke2dlbmVyYXRlZE1hcFBhdGh9XCIgZm9yIFwiJHtcbiAgICAgICAgZ2VuZXJhdGVkUGF0aH1cIjogJHtlLnRvU3RyaW5nKCl9YCk7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogZ2VuZXJhdGVkQ29udGVudH0sXG4gICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IGZyb21PYmplY3QoZ2VuZXJhdGVkTWFwKS50b0pTT04oKX0sXG4gICAgXTtcbiAgfVxufVxuIl19