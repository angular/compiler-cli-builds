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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX21hcHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3NvdXJjZV9tYXBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILHlEQUEwRjtJQUkxRiwyRUFBMEc7SUFHMUcsbUdBQWtFO0lBVWxFOzs7T0FHRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixNQUFjLEVBQUUsRUFBYyxFQUFFLFVBQXlCLEVBQ3pELG9CQUFpQzs7UUFDbkMsSUFBTSxhQUFhLEdBQUcsb0NBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekQsSUFBTSxnQkFBZ0IsR0FBRywwQkFBWSxDQUFJLGFBQWEsU0FBTSxDQUFDLENBQUM7UUFDOUQsSUFBTSxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6RCxJQUFNLFlBQVksR0FBaUIsb0JBQW9CLENBQUMsV0FBVyxDQUMvRCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsTUFBTSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUV4RSxJQUFJO1lBQ0YsSUFBTSxNQUFNLEdBQUcsSUFBSSxxQ0FBZ0IsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FDdkMsYUFBYSxFQUFFLGdCQUFnQixFQUFFLEVBQUMsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUMsQ0FBQyxDQUFDO1lBRXJGLElBQU0sWUFBWSxHQUFpQixhQUFhLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUM1RSxJQUFNLFNBQVMsR0FBRywrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzNDLFVBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsMENBQUUsTUFBTSxFQUFFO2dCQUNwQyxxRUFBcUU7Z0JBQ3JFLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLFNBQVMsQ0FBQyxTQUFTLEVBQUksRUFBQztpQkFDdkYsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLElBQU0sZ0JBQWdCLEdBQUcsMkNBQXNCLENBQUksc0JBQVEsQ0FBQyxhQUFhLENBQUMsU0FBTSxDQUFDLENBQUM7Z0JBQ2xGLE9BQU87b0JBQ0wsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBSyxhQUFhLENBQUMsUUFBUSxVQUFLLGdCQUFrQixFQUFDO29CQUNqRixFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFDO2lCQUN2RCxDQUFDO2FBQ0g7U0FDRjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyw0Q0FBeUMsZ0JBQWdCLGlCQUNsRSxhQUFhLFlBQU0sQ0FBQyxDQUFDLFFBQVEsRUFBSSxDQUFDLENBQUM7WUFDdkMsT0FBTztnQkFDTCxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFDO2dCQUNqRCxFQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsK0JBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBQzthQUN0RSxDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBcENELGdEQW9DQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7ZnJvbU9iamVjdCwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgU291cmNlTWFwQ29udmVydGVyfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHthYnNvbHV0ZUZyb20sIGFic29sdXRlRnJvbVNvdXJjZUZpbGUsIGJhc2VuYW1lLCBGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuLi9zb3VyY2VtYXBzL3Jhd19zb3VyY2VfbWFwJztcbmltcG9ydCB7U291cmNlRmlsZUxvYWRlcn0gZnJvbSAnLi4vc291cmNlbWFwcy9zb3VyY2VfZmlsZV9sb2FkZXInO1xuXG5pbXBvcnQge0ZpbGVUb1dyaXRlfSBmcm9tICcuL3V0aWxzJztcblxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIE1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZS1tYXBzLCByZXBsYWNpbmcgdGhlIHNvdXJjZS1tYXAgY29tbWVudCBpbiB0aGUgb3V0cHV0IGZpbGVcbiAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlclNvdXJjZUFuZE1hcChcbiAgICBsb2dnZXI6IExvZ2dlciwgZnM6IEZpbGVTeXN0ZW0sIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgZ2VuZXJhdGVkTWFnaWNTdHJpbmc6IE1hZ2ljU3RyaW5nKTogRmlsZVRvV3JpdGVbXSB7XG4gIGNvbnN0IGdlbmVyYXRlZFBhdGggPSBhYnNvbHV0ZUZyb21Tb3VyY2VGaWxlKHNvdXJjZUZpbGUpO1xuICBjb25zdCBnZW5lcmF0ZWRNYXBQYXRoID0gYWJzb2x1dGVGcm9tKGAke2dlbmVyYXRlZFBhdGh9Lm1hcGApO1xuICBjb25zdCBnZW5lcmF0ZWRDb250ZW50ID0gZ2VuZXJhdGVkTWFnaWNTdHJpbmcudG9TdHJpbmcoKTtcbiAgY29uc3QgZ2VuZXJhdGVkTWFwOiBSYXdTb3VyY2VNYXAgPSBnZW5lcmF0ZWRNYWdpY1N0cmluZy5nZW5lcmF0ZU1hcChcbiAgICAgIHtmaWxlOiBnZW5lcmF0ZWRQYXRoLCBzb3VyY2U6IGdlbmVyYXRlZFBhdGgsIGluY2x1ZGVDb250ZW50OiB0cnVlfSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBsb2FkZXIgPSBuZXcgU291cmNlRmlsZUxvYWRlcihmcywgbG9nZ2VyKTtcbiAgICBjb25zdCBnZW5lcmF0ZWRGaWxlID0gbG9hZGVyLmxvYWRTb3VyY2VGaWxlKFxuICAgICAgICBnZW5lcmF0ZWRQYXRoLCBnZW5lcmF0ZWRDb250ZW50LCB7bWFwOiBnZW5lcmF0ZWRNYXAsIG1hcFBhdGg6IGdlbmVyYXRlZE1hcFBhdGh9KTtcblxuICAgIGNvbnN0IHJhd01lcmdlZE1hcDogUmF3U291cmNlTWFwID0gZ2VuZXJhdGVkRmlsZS5yZW5kZXJGbGF0dGVuZWRTb3VyY2VNYXAoKTtcbiAgICBjb25zdCBtZXJnZWRNYXAgPSBmcm9tT2JqZWN0KHJhd01lcmdlZE1hcCk7XG4gICAgaWYgKGdlbmVyYXRlZEZpbGUuc291cmNlc1swXT8uaW5saW5lKSB7XG4gICAgICAvLyBUaGUgaW5wdXQgc291cmNlLW1hcCB3YXMgaW5saW5lIHNvIG1ha2UgdGhlIG91dHB1dCBvbmUgaW5saW5lIHRvby5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtwYXRoOiBnZW5lcmF0ZWRQYXRoLCBjb250ZW50czogYCR7Z2VuZXJhdGVkRmlsZS5jb250ZW50c31cXG4ke21lcmdlZE1hcC50b0NvbW1lbnQoKX1gfVxuICAgICAgXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc291cmNlTWFwQ29tbWVudCA9IGdlbmVyYXRlTWFwRmlsZUNvbW1lbnQoYCR7YmFzZW5hbWUoZ2VuZXJhdGVkUGF0aCl9Lm1hcGApO1xuICAgICAgcmV0dXJuIFtcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZFBhdGgsIGNvbnRlbnRzOiBgJHtnZW5lcmF0ZWRGaWxlLmNvbnRlbnRzfVxcbiR7c291cmNlTWFwQ29tbWVudH1gfSxcbiAgICAgICAge3BhdGg6IGdlbmVyYXRlZE1hcFBhdGgsIGNvbnRlbnRzOiBtZXJnZWRNYXAudG9KU09OKCl9XG4gICAgICBdO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZ2dlci5lcnJvcihgRXJyb3Igd2hlbiBmbGF0dGVuaW5nIHRoZSBzb3VyY2UtbWFwIFwiJHtnZW5lcmF0ZWRNYXBQYXRofVwiIGZvciBcIiR7XG4gICAgICAgIGdlbmVyYXRlZFBhdGh9XCI6ICR7ZS50b1N0cmluZygpfWApO1xuICAgIHJldHVybiBbXG4gICAgICB7cGF0aDogZ2VuZXJhdGVkUGF0aCwgY29udGVudHM6IGdlbmVyYXRlZENvbnRlbnR9LFxuICAgICAge3BhdGg6IGdlbmVyYXRlZE1hcFBhdGgsIGNvbnRlbnRzOiBmcm9tT2JqZWN0KGdlbmVyYXRlZE1hcCkudG9KU09OKCl9LFxuICAgIF07XG4gIH1cbn1cbiJdfQ==