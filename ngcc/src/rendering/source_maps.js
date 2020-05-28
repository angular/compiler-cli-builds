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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlEQUEwRjtJQUkxRiwyRUFBMEc7SUFHMUcsbUdBQWtFO0lBVWxFOzs7T0FHRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixNQUFjLEVBQUUsRUFBYyxFQUFFLFVBQXlCLEVBQ3pELG9CQUFpQzs7UUFDbkMsSUFBTSxhQUFhLEdBQUcsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsSUFBTSxnQkFBZ0IsR0FBRywwQkFBWSxDQUFJLGFBQWEsU0FBTSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6RCxJQUFNLFlBQVksR0FBaUIsb0JBQW9CLENBQUMsV0FBVyxDQUMvRCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUV4RSxJQUFJO1lBQ0YsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FDdkMsYUFBYSxFQUFFLGdCQUFnQixFQUFFLEVBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO1lBRXJGLElBQU0sWUFBWSxHQUFpQixhQUFhLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUM1RSxJQUFNLFNBQVMsR0FBRywrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLFVBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsMENBQUUsTUFBTSxFQUFFO2dCQUNwQyxxRUFBcUU7Z0JBQ3JFLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLFNBQVMsQ0FBQyxTQUFTLEVBQUksRUFBQztpQkFDdkYsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLElBQU0sZ0JBQWdCLEdBQUcsMkNBQXNCLENBQUksc0JBQVEsQ0FBQyxhQUFhLENBQUMsU0FBTSxDQUFDLENBQUM7Z0JBQ2xGLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLGdCQUFrQixFQUFDO29CQUNqRixFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFDO2lCQUN2RCxDQUFDO2FBQ0g7U0FDRjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBeUMsZ0JBQWdCLGlCQUNsRSxhQUFhLFlBQU0sQ0FBQyxDQUFDLFFBQVEsRUFBSSxDQUFDLENBQUM7WUFDdkMsT0FBTztnQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFDO2dCQUNqRCxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBQzthQUN0RSxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBcENELGdEQW9DQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtmcm9tT2JqZWN0LCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBTb3VyY2VNYXBDb252ZXJ0ZXJ9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge2Fic29sdXRlRnJvbSwgYWJzb2x1dGVGcm9tU291cmNlRmlsZSwgYmFzZW5hbWUsIEZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJy4uL3NvdXJjZW1hcHMvcmF3X3NvdXJjZV9tYXAnO1xuaW1wb3J0IHtTb3VyY2VGaWxlTG9hZGVyfSBmcm9tICcuLi9zb3VyY2VtYXBzL3NvdXJjZV9maWxlX2xvYWRlcic7XG5cbmltcG9ydCB7RmlsZVRvV3JpdGV9IGZyb20gJy4vdXRpbHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNvdXJjZU1hcEluZm8ge1xuICBzb3VyY2U6IHN0cmluZztcbiAgbWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbDtcbiAgaXNJbmxpbmU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogTWVyZ2UgdGhlIGlucHV0IGFuZCBvdXRwdXQgc291cmNlLW1hcHMsIHJlcGxhY2luZyB0aGUgc291cmNlLW1hcCBjb21tZW50IGluIHRoZSBvdXRwdXQgZmlsZVxuICogd2l0aCBhbiBhcHByb3ByaWF0ZSBzb3VyY2UtbWFwIGNvbW1lbnQgcG9pbnRpbmcgdG8gdGhlIG1lcmdlZCBzb3VyY2UtbWFwLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyU291cmNlQW5kTWFwKFxuICAgIGxvZ2dlcjogTG9nZ2VyLCBmczogRmlsZVN5c3RlbSwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICBnZW5lcmF0ZWRNYWdpY1N0cmluZzogTWFnaWNTdHJpbmcpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgY29uc3QgZ2VuZXJhdGVkUGF0aCA9IGFic29sdXRlRnJvbVNvdXJjZUZpbGUoc291cmNlRmlsZSk7XG4gIGNvbnN0IGdlbmVyYXRlZE1hcFBhdGggPSBhYnNvbHV0ZUZyb20oYCR7Z2VuZXJhdGVkUGF0aH0ubWFwYCk7XG4gIGNvbnN0IGdlbmVyYXRlZENvbnRlbnQgPSBnZW5lcmF0ZWRNYWdpY1N0cmluZy50b1N0cmluZygpO1xuICBjb25zdCBnZW5lcmF0ZWRNYXA6IFJhd1NvdXJjZU1hcCA9IGdlbmVyYXRlZE1hZ2ljU3RyaW5nLmdlbmVyYXRlTWFwKFxuICAgICAge2ZpbGU6IGdlbmVyYXRlZFBhdGgsIHNvdXJjZTogZ2VuZXJhdGVkUGF0aCwgaW5jbHVkZUNvbnRlbnQ6IHRydWV9KTtcblxuICB0cnkge1xuICAgIGNvbnN0IGxvYWRlciA9IG5ldyBTb3VyY2VGaWxlTG9hZGVyKGZzLCBsb2dnZXIpO1xuICAgIGNvbnN0IGdlbmVyYXRlZEZpbGUgPSBsb2FkZXIubG9hZFNvdXJjZUZpbGUoXG4gICAgICAgIGdlbmVyYXRlZFBhdGgsIGdlbmVyYXRlZENvbnRlbnQsIHttYXA6IGdlbmVyYXRlZE1hcCwgbWFwUGF0aDogZ2VuZXJhdGVkTWFwUGF0aH0pO1xuXG4gICAgY29uc3QgcmF3TWVyZ2VkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRGaWxlLnJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpO1xuICAgIGNvbnN0IG1lcmdlZE1hcCA9IGZyb21PYmplY3QocmF3TWVyZ2VkTWFwKTtcbiAgICBpZiAoZ2VuZXJhdGVkRmlsZS5zb3VyY2VzWzBdPy5pbmxpbmUpIHtcbiAgICAgIC8vIFRoZSBpbnB1dCBzb3VyY2UtbWFwIHdhcyBpbmxpbmUgc28gbWFrZSB0aGUgb3V0cHV0IG9uZSBpbmxpbmUgdG9vLlxuICAgICAgcmV0dXJuIFtcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9XG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzb3VyY2VNYXBDb21tZW50ID0gZ2VuZXJhdGVNYXBGaWxlQ29tbWVudChgJHtiYXNlbmFtZShnZW5lcmF0ZWRQYXRoKX0ubWFwYCk7XG4gICAgICByZXR1cm4gW1xuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGAke2dlbmVyYXRlZEZpbGUuY29udGVudHN9XFxuJHtzb3VyY2VNYXBDb21tZW50fWB9LFxuICAgICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX1cbiAgICAgIF07XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nZ2VyLmVycm9yKGBFcnJvciB3aGVuIGZsYXR0ZW5pbmcgdGhlIHNvdXJjZS1tYXAgXCIke2dlbmVyYXRlZE1hcFBhdGh9XCIgZm9yIFwiJHtcbiAgICAgICAgZ2VuZXJhdGVkUGF0aH1cIjogJHtlLnRvU3RyaW5nKCl9YCk7XG4gICAgcmV0dXJuIFtcbiAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogZ2VuZXJhdGVkQ29udGVudH0sXG4gICAgICB7cGF0aDogZ2VuZXJhdGVkTWFwUGF0aCwgY29udGVudHM6IGZyb21PYmplY3QoZ2VuZXJhdGVkTWFwKS50b0pTT04oKX0sXG4gICAgXTtcbiAgfVxufVxuIl19