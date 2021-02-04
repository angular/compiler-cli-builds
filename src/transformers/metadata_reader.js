/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/transformers/metadata_reader", ["require", "exports", "tslib", "@angular/compiler-cli/src/metadata/index", "@angular/compiler-cli/src/transformers/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readMetadata = exports.createMetadataReaderCache = void 0;
    var tslib_1 = require("tslib");
    var metadata_1 = require("@angular/compiler-cli/src/metadata/index");
    var util_1 = require("@angular/compiler-cli/src/transformers/util");
    function createMetadataReaderCache() {
        var data = new Map();
        return { data: data };
    }
    exports.createMetadataReaderCache = createMetadataReaderCache;
    function readMetadata(filePath, host, cache) {
        var metadatas = cache && cache.data.get(filePath);
        if (metadatas) {
            return metadatas;
        }
        if (host.fileExists(filePath)) {
            // If the file doesn't exists then we cannot return metadata for the file.
            // This will occur if the user referenced a declared module for which no file
            // exists for the module (i.e. jQuery or angularjs).
            if (util_1.DTS.test(filePath)) {
                metadatas = readMetadataFile(host, filePath);
                if (!metadatas) {
                    // If there is a .d.ts file but no metadata file we need to produce a
                    // metadata from the .d.ts file as metadata files capture reexports
                    // (starting with v3).
                    metadatas = [upgradeMetadataWithDtsData(host, { '__symbolic': 'module', 'version': 1, 'metadata': {} }, filePath)];
                }
            }
            else {
                var metadata = host.getSourceFileMetadata(filePath);
                metadatas = metadata ? [metadata] : [];
            }
        }
        if (cache && (!host.cacheMetadata || host.cacheMetadata(filePath))) {
            cache.data.set(filePath, metadatas);
        }
        return metadatas;
    }
    exports.readMetadata = readMetadata;
    function readMetadataFile(host, dtsFilePath) {
        var metadataPath = dtsFilePath.replace(util_1.DTS, '.metadata.json');
        if (!host.fileExists(metadataPath)) {
            return undefined;
        }
        try {
            var metadataOrMetadatas = JSON.parse(host.readFile(metadataPath));
            var metadatas = metadataOrMetadatas ?
                (Array.isArray(metadataOrMetadatas) ? metadataOrMetadatas : [metadataOrMetadatas]) :
                [];
            if (metadatas.length) {
                var maxMetadata = metadatas.reduce(function (p, c) { return p.version > c.version ? p : c; });
                if (maxMetadata.version < metadata_1.METADATA_VERSION) {
                    metadatas.push(upgradeMetadataWithDtsData(host, maxMetadata, dtsFilePath));
                }
            }
            return metadatas;
        }
        catch (e) {
            console.error("Failed to read JSON file " + metadataPath);
            throw e;
        }
    }
    function upgradeMetadataWithDtsData(host, oldMetadata, dtsFilePath) {
        // patch v1 to v3 by adding exports and the `extends` clause.
        // patch v3 to v4 by adding `interface` symbols for TypeAlias
        var newMetadata = {
            '__symbolic': 'module',
            'version': metadata_1.METADATA_VERSION,
            'metadata': tslib_1.__assign({}, oldMetadata.metadata),
        };
        if (oldMetadata.exports) {
            newMetadata.exports = oldMetadata.exports;
        }
        if (oldMetadata.importAs) {
            newMetadata.importAs = oldMetadata.importAs;
        }
        if (oldMetadata.origins) {
            newMetadata.origins = oldMetadata.origins;
        }
        var dtsMetadata = host.getSourceFileMetadata(dtsFilePath);
        if (dtsMetadata) {
            for (var prop in dtsMetadata.metadata) {
                if (!newMetadata.metadata[prop]) {
                    newMetadata.metadata[prop] = dtsMetadata.metadata[prop];
                }
            }
            if (dtsMetadata['importAs'])
                newMetadata['importAs'] = dtsMetadata['importAs'];
            // Only copy exports from exports from metadata prior to version 3.
            // Starting with version 3 the collector began collecting exports and
            // this should be redundant. Also, with bundler will rewrite the exports
            // which will hoist the exports from modules referenced indirectly causing
            // the imports to be different than the .d.ts files and using the .d.ts file
            // exports would cause the StaticSymbolResolver to redirect symbols to the
            // incorrect location.
            if ((!oldMetadata.version || oldMetadata.version < 3) && dtsMetadata.exports) {
                newMetadata.exports = dtsMetadata.exports;
            }
        }
        return newMetadata;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGFfcmVhZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy90cmFuc2Zvcm1lcnMvbWV0YWRhdGFfcmVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFJSCxxRUFBNkQ7SUFFN0Qsb0VBQTJCO0lBZ0IzQixTQUFnQix5QkFBeUI7UUFDdkMsSUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7UUFDM0QsT0FBTyxFQUFDLElBQUksTUFBQSxFQUFDLENBQUM7SUFDaEIsQ0FBQztJQUhELDhEQUdDO0lBRUQsU0FBZ0IsWUFBWSxDQUN4QixRQUFnQixFQUFFLElBQXdCLEVBQUUsS0FBMkI7UUFFekUsSUFBSSxTQUFTLEdBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2xELElBQUksU0FBUyxFQUFFO1lBQ2IsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDN0IsMEVBQTBFO1lBQzFFLDZFQUE2RTtZQUM3RSxvREFBb0Q7WUFDcEQsSUFBSSxVQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUN0QixTQUFTLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxJQUFJLENBQUMsU0FBUyxFQUFFO29CQUNkLHFFQUFxRTtvQkFDckUsbUVBQW1FO29CQUNuRSxzQkFBc0I7b0JBQ3RCLFNBQVMsR0FBRyxDQUFDLDBCQUEwQixDQUNuQyxJQUFJLEVBQUUsRUFBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBQyxFQUFFLFFBQVEsQ0FBQyxDQUFD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S0FBSyxJQUFJLElBQUksSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFO2dCQUNyQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDL0IsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUN6RDthQUNGO1lBQ0QsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDO2dCQUFFLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFL0UsbUVBQW1FO1lBQ25FLHFFQUFxRTtZQUNyRSx3RUFBd0U7WUFDeEUsMEVBQTBFO1lBQzFFLDRFQUE0RTtZQUM1RSwwRUFBMEU7WUFDMUUsc0JBQXNCO1lBQ3RCLElBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFO2dCQUM1RSxXQUFXLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7YUFDM0M7U0FDRjtRQUNELE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7TUVUQURBVEFfVkVSU0lPTiwgTW9kdWxlTWV0YWRhdGF9IGZyb20gJy4uL21ldGFkYXRhJztcblxuaW1wb3J0IHtEVFN9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0YWRhdGFSZWFkZXJIb3N0IHtcbiAgZ2V0U291cmNlRmlsZU1ldGFkYXRhKGZpbGVQYXRoOiBzdHJpbmcpOiBNb2R1bGVNZXRhZGF0YXx1bmRlZmluZWQ7XG4gIGNhY2hlTWV0YWRhdGE/KGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuO1xuICBmaWxlRXhpc3RzKGZpbGVQYXRoOiBzdHJpbmcpOiBib29sZWFuO1xuICByZWFkRmlsZShmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1ldGFkYXRhUmVhZGVyQ2FjaGUge1xuICAvKipcbiAgICogQGludGVybmFsXG4gICAqL1xuICBkYXRhOiBNYXA8c3RyaW5nLCBNb2R1bGVNZXRhZGF0YVtdfHVuZGVmaW5lZD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNZXRhZGF0YVJlYWRlckNhY2hlKCk6IE1ldGFkYXRhUmVhZGVyQ2FjaGUge1xuICBjb25zdCBkYXRhID0gbmV3IE1hcDxzdHJpbmcsIE1vZHVsZU1ldGFkYXRhW118dW5kZWZpbmVkPigpO1xuICByZXR1cm4ge2RhdGF9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZE1ldGFkYXRhKFxuICAgIGZpbGVQYXRoOiBzdHJpbmcsIGhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdCwgY2FjaGU/OiBNZXRhZGF0YVJlYWRlckNhY2hlKTogTW9kdWxlTWV0YWRhdGFbXXxcbiAgICB1bmRlZmluZWQge1xuICBsZXQgbWV0YWRhdGFzID0gY2FjaGUgJiYgY2FjaGUuZGF0YS5nZXQoZmlsZVBhdGgpO1xuICBpZiAobWV0YWRhdGFzKSB7XG4gICAgcmV0dXJuIG1ldGFkYXRhcztcbiAgfVxuICBpZiAoaG9zdC5maWxlRXhpc3RzKGZpbGVQYXRoKSkge1xuICAgIC8vIElmIHRoZSBmaWxlIGRvZXNuJ3QgZXhpc3RzIHRoZW4gd2UgY2Fubm90IHJldHVybiBtZXRhZGF0YSBmb3IgdGhlIGZpbGUuXG4gICAgLy8gVGhpcyB3aWxsIG9jY3VyIGlmIHRoZSB1c2VyIHJlZmVyZW5jZWQgYSBkZWNsYXJlZCBtb2R1bGUgZm9yIHdoaWNoIG5vIGZpbGVcbiAgICAvLyBleGlzdHMgZm9yIHRoZSBtb2R1bGUgKGkuZS4galF1ZXJ5IG9yIGFuZ3VsYXJqcykuXG4gICAgaWYgKERUUy50ZXN0KGZpbGVQYXRoKSkge1xuICAgICAgbWV0YWRhdGFzID0gcmVhZE1ldGFkYXRhRmlsZShob3N0LCBmaWxlUGF0aCk7XG4gICAgICBpZiAoIW1ldGFkYXRhcykge1xuICAgICAgICAvLyBJZiB0aGVyZSBpcyBhIC5kLnRzIGZpbGUgYnV0IG5vIG1ldGFkYXRhIGZpbGUgd2UgbmVlZCB0byBwcm9kdWNlIGFcbiAgICAgICAgLy8gbWV0YWRhdGEgZnJvbSB0aGUgLmQudHMgZmlsZSBhcyBtZXRhZGF0YSBmaWxlcyBjYXB0dXJlIHJlZXhwb3J0c1xuICAgICAgICAvLyAoc3RhcnRpbmcgd2l0aCB2MykuXG4gICAgICAgIG1ldGFkYXRhcyA9IFt1cGdyYWRlTWV0YWRhdGFXaXRoRHRzRGF0YShcbiAgICAgICAgICAgIGhvc3QsIHsnX19zeW1ib2xpYyc6ICdtb2R1bGUnLCAndmVyc2lvbic6IDEsICdtZXRhZGF0YSc6IHt9fSwgZmlsZVBhdGgpXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBob3N0LmdldFNvdXJjZUZpbGVNZXRhZGF0YShmaWxlUGF0aCk7XG4gICAgICBtZXRhZGF0YXMgPSBtZXRhZGF0YSA/IFttZXRhZGF0YV0gOiBbXTtcbiAgICB9XG4gIH1cbiAgaWYgKGNhY2hlICYmICghaG9zdC5jYWNoZU1ldGFkYXRhIHx8IGhvc3QuY2FjaGVNZXRhZGF0YShmaWxlUGF0aCkpKSB7XG4gICAgY2FjaGUuZGF0YS5zZXQoZmlsZVBhdGgsIG1ldGFkYXRhcyk7XG4gIH1cbiAgcmV0dXJuIG1ldGFkYXRhcztcbn1cblxuXG5mdW5jdGlvbiByZWFkTWV0YWRhdGFGaWxlKGhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdCwgZHRzRmlsZVBhdGg6IHN0cmluZyk6IE1vZHVsZU1ldGFkYXRhW118XG4gICAgdW5kZWZpbmVkIHtcbiAgY29uc3QgbWV0YWRhdGFQYXRoID0gZHRzRmlsZVBhdGgucmVwbGFjZShEVFMsICcubWV0YWRhdGEuanNvbicpO1xuICBpZiAoIWhvc3QuZmlsZUV4aXN0cyhtZXRhZGF0YVBhdGgpKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IG1ldGFkYXRhT3JNZXRhZGF0YXMgPSBKU09OLnBhcnNlKGhvc3QucmVhZEZpbGUobWV0YWRhdGFQYXRoKSkgYXMgYW55O1xuICAgIGNvbnN0IG1ldGFkYXRhczogTW9kdWxlTWV0YWRhdGFbXSA9IG1ldGFkYXRhT3JNZXRhZGF0YXMgP1xuICAgICAgICAoQXJyYXkuaXNBcnJheShtZXRhZGF0YU9yTWV0YWRhdGFzKSA/IG1ldGFkYXRhT3JNZXRhZGF0YXMgOiBbbWV0YWRhdGFPck1ldGFkYXRhc10pIDpcbiAgICAgICAgW107XG4gICAgaWYgKG1ldGFkYXRhcy5sZW5ndGgpIHtcbiAgICAgIGxldCBtYXhNZXRhZGF0YSA9IG1ldGFkYXRhcy5yZWR1Y2UoKHAsIGMpID0+IHAudmVyc2lvbiA+IGMudmVyc2lvbiA/IHAgOiBjKTtcbiAgICAgIGlmIChtYXhNZXRhZGF0YS52ZXJzaW9uIDwgTUVUQURBVEFfVkVSU0lPTikge1xuICAgICAgICBtZXRhZGF0YXMucHVzaCh1cGdyYWRlTWV0YWRhdGFXaXRoRHRzRGF0YShob3N0LCBtYXhNZXRhZGF0YSwgZHRzRmlsZVBhdGgpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1ldGFkYXRhcztcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byByZWFkIEpTT04gZmlsZSAke21ldGFkYXRhUGF0aH1gKTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHVwZ3JhZGVNZXRhZGF0YVdpdGhEdHNEYXRhKFxuICAgIGhvc3Q6IE1ldGFkYXRhUmVhZGVySG9zdCwgb2xkTWV0YWRhdGE6IE1vZHVsZU1ldGFkYXRhLCBkdHNGaWxlUGF0aDogc3RyaW5nKTogTW9kdWxlTWV0YWRhdGEge1xuICAvLyBwYXRjaCB2MSB0byB2MyBieSBhZGRpbmcgZXhwb3J0cyBhbmQgdGhlIGBleHRlbmRzYCBjbGF1c2UuXG4gIC8vIHBhdGNoIHYzIHRvIHY0IGJ5IGFkZGluZyBgaW50ZXJmYWNlYCBzeW1ib2xzIGZvciBUeXBlQWxpYXNcbiAgbGV0IG5ld01ldGFkYXRhOiBNb2R1bGVNZXRhZGF0YSA9IHtcbiAgICAnX19zeW1ib2xpYyc6ICdtb2R1bGUnLFxuICAgICd2ZXJzaW9uJzogTUVUQURBVEFfVkVSU0lPTixcbiAgICAnbWV0YWRhdGEnOiB7Li4ub2xkTWV0YWRhdGEubWV0YWRhdGF9LFxuICB9O1xuICBpZiAob2xkTWV0YWRhdGEuZXhwb3J0cykge1xuICAgIG5ld01ldGFkYXRhLmV4cG9ydHMgPSBvbGRNZXRhZGF0YS5leHBvcnRzO1xuICB9XG4gIGlmIChvbGRNZXRhZGF0YS5pbXBvcnRBcykge1xuICAgIG5ld01ldGFkYXRhLmltcG9ydEFzID0gb2xkTWV0YWRhdGEuaW1wb3J0QXM7XG4gIH1cbiAgaWYgKG9sZE1ldGFkYXRhLm9yaWdpbnMpIHtcbiAgICBuZXdNZXRhZGF0YS5vcmlnaW5zID0gb2xkTWV0YWRhdGEub3JpZ2lucztcbiAgfVxuICBjb25zdCBkdHNNZXRhZGF0YSA9IGhvc3QuZ2V0U291cmNlRmlsZU1ldGFkYXRhKGR0c0ZpbGVQYXRoKTtcbiAgaWYgKGR0c01ldGFkYXRhKSB7XG4gICAgZm9yIChsZXQgcHJvcCBpbiBkdHNNZXRhZGF0YS5tZXRhZGF0YSkge1xuICAgICAgaWYgKCFuZXdNZXRhZGF0YS5tZXRhZGF0YVtwcm9wXSkge1xuICAgICAgICBuZXdNZXRhZGF0YS5tZXRhZGF0YVtwcm9wXSA9IGR0c01ldGFkYXRhLm1ldGFkYXRhW3Byb3BdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZHRzTWV0YWRhdGFbJ2ltcG9ydEFzJ10pIG5ld01ldGFkYXRhWydpbXBvcnRBcyddID0gZHRzTWV0YWRhdGFbJ2ltcG9ydEFzJ107XG5cbiAgICAvLyBPbmx5IGNvcHkgZXhwb3J0cyBmcm9tIGV4cG9ydHMgZnJvbSBtZXRhZGF0YSBwcmlvciB0byB2ZXJzaW9uIDMuXG4gICAgLy8gU3RhcnRpbmcgd2l0aCB2ZXJzaW9uIDMgdGhlIGNvbGxlY3RvciBiZWdhbiBjb2xsZWN0aW5nIGV4cG9ydHMgYW5kXG4gICAgLy8gdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50LiBBbHNvLCB3aXRoIGJ1bmRsZXIgd2lsbCByZXdyaXRlIHRoZSBleHBvcnRzXG4gICAgLy8gd2hpY2ggd2lsbCBob2lzdCB0aGUgZXhwb3J0cyBmcm9tIG1vZHVsZXMgcmVmZXJlbmNlZCBpbmRpcmVjdGx5IGNhdXNpbmdcbiAgICAvLyB0aGUgaW1wb3J0cyB0byBiZSBkaWZmZXJlbnQgdGhhbiB0aGUgLmQudHMgZmlsZXMgYW5kIHVzaW5nIHRoZSAuZC50cyBmaWxlXG4gICAgLy8gZXhwb3J0cyB3b3VsZCBjYXVzZSB0aGUgU3RhdGljU3ltYm9sUmVzb2x2ZXIgdG8gcmVkaXJlY3Qgc3ltYm9scyB0byB0aGVcbiAgICAvLyBpbmNvcnJlY3QgbG9jYXRpb24uXG4gICAgaWYgKCghb2xkTWV0YWRhdGEudmVyc2lvbiB8fCBvbGRNZXRhZGF0YS52ZXJzaW9uIDwgMykgJiYgZHRzTWV0YWRhdGEuZXhwb3J0cykge1xuICAgICAgbmV3TWV0YWRhdGEuZXhwb3J0cyA9IGR0c01ldGFkYXRhLmV4cG9ydHM7XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXdNZXRhZGF0YTtcbn1cbiJdfQ==