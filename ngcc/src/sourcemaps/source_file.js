(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/sourcemaps/source_file", ["require", "exports", "tslib", "convert-source-map", "sourcemap-codec", "@angular/compiler-cli/src/ngtsc/file_system", "@angular/compiler-cli/ngcc/src/sourcemaps/segment_marker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var sourcemap_codec_1 = require("sourcemap-codec");
    var file_system_1 = require("@angular/compiler-cli/src/ngtsc/file_system");
    var segment_marker_1 = require("@angular/compiler-cli/ngcc/src/sourcemaps/segment_marker");
    function removeSourceMapComments(contents) {
        return convert_source_map_1.removeMapFileComments(convert_source_map_1.removeComments(contents)).replace(/\n\n$/, '\n');
    }
    exports.removeSourceMapComments = removeSourceMapComments;
    var SourceFile = /** @class */ (function () {
        function SourceFile(
        /** The path to this source file. */
        sourcePath, 
        /** The contents of this source file. */
        contents, 
        /** The raw source map (if any) associated with this source file. */
        rawMap, 
        /** Whether this source file's source map was inline or external. */
        inline, 
        /** Any source files referenced by the raw source map associated with this source file. */
        sources) {
            this.sourcePath = sourcePath;
            this.contents = contents;
            this.rawMap = rawMap;
            this.inline = inline;
            this.sources = sources;
            this.contents = removeSourceMapComments(contents);
            this.startOfLinePositions = computeStartOfLinePositions(this.contents);
            this.flattenedMappings = this.flattenMappings();
        }
        /**
         * Render the raw source map generated from the flattened mappings.
         */
        SourceFile.prototype.renderFlattenedSourceMap = function () {
            var e_1, _a;
            var sources = [];
            var names = [];
            var mappings = [];
            try {
                for (var _b = tslib_1.__values(this.flattenedMappings), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var mapping = _c.value;
                    var sourceIndex = findIndexOrAdd(sources, mapping.originalSource);
                    var mappingArray = [
                        mapping.generatedSegment.column,
                        sourceIndex,
                        mapping.originalSegment.line,
                        mapping.originalSegment.column,
                    ];
                    if (mapping.name !== undefined) {
                        var nameIndex = findIndexOrAdd(names, mapping.name);
                        mappingArray.push(nameIndex);
                    }
                    // Ensure a mapping line array for this mapping.
                    var line = mapping.generatedSegment.line;
                    while (line >= mappings.length) {
                        mappings.push([]);
                    }
                    // Add this mapping to the line
                    mappings[line].push(mappingArray);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var sourcePathDir = file_system_1.dirname(this.sourcePath);
            var sourceMap = {
                version: 3,
                file: file_system_1.relative(sourcePathDir, this.sourcePath),
                sources: sources.map(function (sf) { return file_system_1.relative(sourcePathDir, sf.sourcePath); }), names: names,
                mappings: sourcemap_codec_1.encode(mappings),
                sourcesContent: sources.map(function (sf) { return sf.contents; }),
            };
            return sourceMap;
        };
        /**
         * Flatten the parsed mappings for this source file, so that all the mappings are to pure original
         * source files with no transitive source maps.
         */
        SourceFile.prototype.flattenMappings = function () {
            var mappings = parseMappings(this.rawMap, this.sources, this.startOfLinePositions);
            ensureOriginalSegmentLinks(mappings);
            var flattenedMappings = [];
            for (var mappingIndex = 0; mappingIndex < mappings.length; mappingIndex++) {
                var aToBmapping = mappings[mappingIndex];
                var bSource = aToBmapping.originalSource;
                if (bSource.flattenedMappings.length === 0) {
                    // The b source file has no mappings of its own (i.e. it is a pure original file)
                    // so just use the mapping as-is.
                    flattenedMappings.push(aToBmapping);
                    continue;
                }
                // The `incomingStart` and `incomingEnd` are the `SegmentMarker`s in `B` that represent the
                // section of `B` source file that is being mapped to by the current `aToBmapping`.
                //
                // For example, consider the mappings from A to B:
                //
                // src A   src B     mapping
                //
                //   a ----- a       [0, 0]
                //   b       b
                //   f -  /- c       [4, 2]
                //   g  \ /  d
                //   c -/\   e
                //   d    \- f       [2, 5]
                //   e
                //
                // For mapping [0,0] the incoming start and end are 0 and 2 (i.e. the range a, b, c)
                // For mapping [4,2] the incoming start and end are 2 and 5 (i.e. the range c, d, e, f)
                //
                var incomingStart = aToBmapping.originalSegment;
                var incomingEnd = incomingStart.next;
                // The `outgoingStartIndex` and `outgoingEndIndex` are the indices of the range of mappings
                // that leave `b` that we are interested in merging with the aToBmapping.
                // We actually care about all the markers from the last bToCmapping directly before the
                // `incomingStart` to the last bToCmaping directly before the `incomingEnd`, inclusive.
                //
                // For example, if we consider the range 2 to 5 from above (i.e. c, d, e, f) with the
                // following mappings from B to C:
                //
                //   src B   src C     mapping
                //     a
                //     b ----- b       [1, 0]
                //   - c       c
                //  |  d       d
                //  |  e ----- 1       [4, 3]
                //   - f  \    2
                //         \   3
                //          \- e       [4, 6]
                //
                // The range with `incomingStart` at 2 and `incomingEnd` at 5 has outgoing start mapping of
                // [1,0] and outgoing end mapping of [4, 6], which also includes [4, 3].
                //
                var outgoingStartIndex = findLastMappingIndexBefore(bSource.flattenedMappings, incomingStart, false, 0);
                if (outgoingStartIndex < 0) {
                    outgoingStartIndex = 0;
                }
                var outgoingEndIndex = incomingEnd !== undefined ?
                    findLastMappingIndexBefore(bSource.flattenedMappings, incomingEnd, true, outgoingStartIndex) :
                    bSource.flattenedMappings.length - 1;
                for (var bToCmappingIndex = outgoingStartIndex; bToCmappingIndex <= outgoingEndIndex; bToCmappingIndex++) {
                    var bToCmapping = bSource.flattenedMappings[bToCmappingIndex];
                    flattenedMappings.push(mergeMappings(this, aToBmapping, bToCmapping));
                }
            }
            return flattenedMappings;
        };
        return SourceFile;
    }());
    exports.SourceFile = SourceFile;
    /**
     *
     * @param mappings The collection of mappings whose segment-markers we are searching.
     * @param marker The segment-marker to match against those of the given `mappings`.
     * @param exclusive If exclusive then we must find a mapping with a segment-marker that is
     * exclusively earlier than the given `marker`.
     * If not exclusive then we can return the highest mappings with an equivalent segment-marker to the
     * given `marker`.
     * @param lowerIndex If provided, this is used as a hint that the marker we are searching for has an
     * index that is no lower than this.
     */
    function findLastMappingIndexBefore(mappings, marker, exclusive, lowerIndex) {
        var upperIndex = mappings.length - 1;
        var test = exclusive ? -1 : 0;
        if (segment_marker_1.compareSegments(mappings[lowerIndex].generatedSegment, marker) > test) {
            // Exit early since the marker is outside the allowed range of mappings.
            return -1;
        }
        var matchingIndex = -1;
        while (lowerIndex <= upperIndex) {
            var index = (upperIndex + lowerIndex) >> 1;
            if (segment_marker_1.compareSegments(mappings[index].generatedSegment, marker) <= test) {
                matchingIndex = index;
                lowerIndex = index + 1;
            }
            else {
                upperIndex = index - 1;
            }
        }
        return matchingIndex;
    }
    exports.findLastMappingIndexBefore = findLastMappingIndexBefore;
    /**
     * Find the index of `item` in the `items` array.
     * If it is not found, then push `item` to the end of the array and return its new index.
     *
     * @param items the collection in which to look for `item`.
     * @param item the item to look for.
     * @returns the index of the `item` in the `items` array.
     */
    function findIndexOrAdd(items, item) {
        var itemIndex = items.indexOf(item);
        if (itemIndex > -1) {
            return itemIndex;
        }
        else {
            items.push(item);
            return items.length - 1;
        }
    }
    /**
     * Merge two mappings that go from A to B and B to C, to result in a mapping that goes from A to C.
     */
    function mergeMappings(generatedSource, ab, bc) {
        var name = bc.name || ab.name;
        // We need to modify the segment-markers of the new mapping to take into account the shifts that
        // occur due to the combination of the two mappings.
        // For example:
        // * Simple map where the B->C starts at the same place the A->B ends:
        //
        // ```
        // A: 1 2 b c d
        //        |        A->B [2,0]
        //        |              |
        // B:     b c d    A->C [2,1]
        //        |                |
        //        |        B->C [0,1]
        // C:   a b c d e
        // ```
        // * More complicated case where diffs of segment-markers is needed:
        //
        // ```
        // A: b 1 2 c d
        //     \
        //      |            A->B  [0,1*]    [0,1*]
        //      |                   |         |+3
        // B: a b 1 2 c d    A->C  [0,1]     [3,2]
        //    |      /                |+1       |
        //    |     /        B->C [0*,0]    [4*,2]
        //    |    /
        // C: a b c d e
        // ```
        //
        // `[0,1]` mapping from A->C:
        // The difference between the "original segment-marker" of A->B (1*) and the "generated
        // segment-marker of B->C (0*): `1 - 0 = +1`.
        // Since it is positive we must increment the "original segment-marker" with `1` to give [0,1].
        //
        // `[3,2]` mapping from A->C:
        // The difference between the "original segment-marker" of A->B (1*) and the "generated
        // segment-marker" of B->C (4*): `1 - 4 = -3`.
        // Since it is negative we must increment the "generated segment-marker" with `3` to give [3,2].
        var diff = segment_marker_1.compareSegments(bc.generatedSegment, ab.originalSegment);
        if (diff > 0) {
            return {
                name: name,
                generatedSegment: segment_marker_1.offsetSegment(generatedSource.startOfLinePositions, ab.generatedSegment, diff),
                originalSource: bc.originalSource,
                originalSegment: bc.originalSegment,
            };
        }
        else {
            return {
                name: name,
                generatedSegment: ab.generatedSegment,
                originalSource: bc.originalSource,
                originalSegment: segment_marker_1.offsetSegment(bc.originalSource.startOfLinePositions, bc.originalSegment, -diff),
            };
        }
    }
    exports.mergeMappings = mergeMappings;
    /**
     * Parse the `rawMappings` into an array of parsed mappings, which reference source-files provided
     * in the `sources` parameter.
     */
    function parseMappings(rawMap, sources, generatedSourceStartOfLinePositions) {
        var e_2, _a;
        if (rawMap === null) {
            return [];
        }
        var rawMappings = sourcemap_codec_1.decode(rawMap.mappings);
        if (rawMappings === null) {
            return [];
        }
        var mappings = [];
        for (var generatedLine = 0; generatedLine < rawMappings.length; generatedLine++) {
            var generatedLineMappings = rawMappings[generatedLine];
            try {
                for (var generatedLineMappings_1 = (e_2 = void 0, tslib_1.__values(generatedLineMappings)), generatedLineMappings_1_1 = generatedLineMappings_1.next(); !generatedLineMappings_1_1.done; generatedLineMappings_1_1 = generatedLineMappings_1.next()) {
                    var rawMapping = generatedLineMappings_1_1.value;
                    if (rawMapping.length >= 4) {
                        var originalSource = sources[rawMapping[1]];
                        if (originalSource === null || originalSource === undefined) {
                            // the original source is missing so ignore this mapping
                            continue;
                        }
                        var generatedColumn = rawMapping[0];
                        var name = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : undefined;
                        var line = rawMapping[2];
                        var column = rawMapping[3];
                        var generatedSegment = {
                            line: generatedLine,
                            column: generatedColumn,
                            position: generatedSourceStartOfLinePositions[generatedLine] + generatedColumn,
                            next: undefined,
                        };
                        var originalSegment = {
                            line: line,
                            column: column,
                            position: originalSource.startOfLinePositions[line] + column,
                            next: undefined,
                        };
                        mappings.push({ name: name, generatedSegment: generatedSegment, originalSegment: originalSegment, originalSource: originalSource });
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (generatedLineMappings_1_1 && !generatedLineMappings_1_1.done && (_a = generatedLineMappings_1.return)) _a.call(generatedLineMappings_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        return mappings;
    }
    exports.parseMappings = parseMappings;
    /**
     * Extract the segment markers from the original source files in each mapping of an array of
     * `mappings`.
     *
     * @param mappings The mappings whose original segments we want to extract
     * @returns Return a map from original source-files (referenced in the `mappings`) to arrays of
     * segment-markers sorted by their order in their source file.
     */
    function extractOriginalSegments(mappings) {
        var e_3, _a;
        var originalSegments = new Map();
        try {
            for (var mappings_1 = tslib_1.__values(mappings), mappings_1_1 = mappings_1.next(); !mappings_1_1.done; mappings_1_1 = mappings_1.next()) {
                var mapping = mappings_1_1.value;
                var originalSource = mapping.originalSource;
                if (!originalSegments.has(originalSource)) {
                    originalSegments.set(originalSource, []);
                }
                var segments = originalSegments.get(originalSource);
                segments.push(mapping.originalSegment);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (mappings_1_1 && !mappings_1_1.done && (_a = mappings_1.return)) _a.call(mappings_1);
            }
            finally { if (e_3) throw e_3.error; }
        }
        originalSegments.forEach(function (segmentMarkers) { return segmentMarkers.sort(segment_marker_1.compareSegments); });
        return originalSegments;
    }
    exports.extractOriginalSegments = extractOriginalSegments;
    /**
     * Update the original segments of each of the given `mappings` to include a link to the next
     * segment in the source file.
     *
     * @param mappings the mappings whose segments should be updated
     */
    function ensureOriginalSegmentLinks(mappings) {
        var segmentsBySource = extractOriginalSegments(mappings);
        segmentsBySource.forEach(function (markers) {
            for (var i = 0; i < markers.length - 1; i++) {
                markers[i].next = markers[i + 1];
            }
        });
    }
    exports.ensureOriginalSegmentLinks = ensureOriginalSegmentLinks;
    function computeStartOfLinePositions(str) {
        // The `1` is to indicate a newline character between the lines.
        // Note that in the actual contents there could be more than one character that indicates a
        // newline
        // - e.g. \r\n - but that is not important here since segment-markers are in line/column pairs and
        // so differences in length due to extra `\r` characters do not affect the algorithms.
        var NEWLINE_MARKER_OFFSET = 1;
        var lineLengths = computeLineLengths(str);
        var startPositions = [0]; // First line starts at position 0
        for (var i = 0; i < lineLengths.length - 1; i++) {
            startPositions.push(startPositions[i] + lineLengths[i] + NEWLINE_MARKER_OFFSET);
        }
        return startPositions;
    }
    exports.computeStartOfLinePositions = computeStartOfLinePositions;
    function computeLineLengths(str) {
        return (str.split(/\r?\n/)).map(function (s) { return s.length; });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvc291cmNlbWFwcy9zb3VyY2VfZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBQ3BGLDJFQUFpRjtJQUVqRiwyRkFBK0U7SUFFL0UsU0FBZ0IsdUJBQXVCLENBQUMsUUFBZ0I7UUFDdEQsT0FBTywwQ0FBcUIsQ0FBQyxtQ0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRDtRQVdFO1FBQ0ksb0NBQW9DO1FBQzNCLFVBQTBCO1FBQ25DLHdDQUF3QztRQUMvQixRQUFnQjtRQUN6QixvRUFBb0U7UUFDM0QsTUFBeUI7UUFDbEMsb0VBQW9FO1FBQzNELE1BQWU7UUFDeEIsMEZBQTBGO1FBQ2pGLE9BQTRCO1lBUjVCLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBRTFCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFFaEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7WUFFekIsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUVmLFlBQU8sR0FBUCxPQUFPLENBQXFCO1lBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2xELENBQUM7UUFFRDs7V0FFRztRQUNILDZDQUF3QixHQUF4Qjs7WUFDRSxJQUFNLE9BQU8sR0FBaUIsRUFBRSxDQUFDO1lB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LENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUNsQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQVBELGdFQU9DO0lBRUQsU0FBZ0IsMkJBQTJCLENBQUMsR0FBVztRQUNyRCxnRUFBZ0U7UUFDaEUsMkZBQTJGO1FBQzNGLFVBQVU7UUFDVixrR0FBa0c7UUFDbEcsc0ZBQXNGO1FBQ3RGLElBQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLElBQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLElBQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxrQ0FBa0M7UUFDL0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9DLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQWJELGtFQWFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFXO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLE1BQU0sRUFBUixDQUFRLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtTb3VyY2VNYXBNYXBwaW5ncywgU291cmNlTWFwU2VnbWVudCwgZGVjb2RlLCBlbmNvZGV9IGZyb20gJ3NvdXJjZW1hcC1jb2RlYyc7XG5pbXBvcnQge0Fic29sdXRlRnNQYXRoLCBkaXJuYW1lLCByZWxhdGl2ZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICcuL3Jhd19zb3VyY2VfbWFwJztcbmltcG9ydCB7U2VnbWVudE1hcmtlciwgY29tcGFyZVNlZ21lbnRzLCBvZmZzZXRTZWdtZW50fSBmcm9tICcuL3NlZ21lbnRfbWFya2VyJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKHJlbW92ZUNvbW1lbnRzKGNvbnRlbnRzKSkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKTtcbn1cblxuZXhwb3J0IGNsYXNzIFNvdXJjZUZpbGUge1xuICAvKipcbiAgICogVGhlIHBhcnNlZCBtYXBwaW5ncyB0aGF0IGhhdmUgYmVlbiBmbGF0dGVuZWQgc28gdGhhdCBhbnkgaW50ZXJtZWRpYXRlIHNvdXJjZSBtYXBwaW5ncyBoYXZlIGJlZW5cbiAgICogZmxhdHRlbmVkLlxuICAgKlxuICAgKiBUaGUgcmVzdWx0IGlzIHRoYXQgYW55IHNvdXJjZSBmaWxlIG1lbnRpb25lZCBpbiB0aGUgZmxhdHRlbmVkIG1hcHBpbmdzIGhhdmUgbm8gc291cmNlIG1hcCAoYXJlXG4gICAqIHB1cmUgb3JpZ2luYWwgc291cmNlIGZpbGVzKS5cbiAgICovXG4gIHJlYWRvbmx5IGZsYXR0ZW5lZE1hcHBpbmdzOiBNYXBwaW5nW107XG4gIHJlYWRvbmx5IHN0YXJ0T2ZMaW5lUG9zaXRpb25zOiBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIC8qKiBUaGUgcGF0aCB0byB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgc291cmNlUGF0aDogQWJzb2x1dGVGc1BhdGgsXG4gICAgICAvKiogVGhlIGNvbnRlbnRzIG9mIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBjb250ZW50czogc3RyaW5nLFxuICAgICAgLyoqIFRoZSByYXcgc291cmNlIG1hcCAoaWYgYW55KSBhc3NvY2lhdGVkIHdpdGggdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHJhd01hcDogUmF3U291cmNlTWFwfG51bGwsXG4gICAgICAvKiogV2hldGhlciB0aGlzIHNvdXJjZSBmaWxlJ3Mgc291cmNlIG1hcCB3YXMgaW5saW5lIG9yIGV4dGVybmFsLiAqL1xuICAgICAgcmVhZG9ubHkgaW5saW5lOiBib29sZWFuLFxuICAgICAgLyoqIEFueSBzb3VyY2UgZmlsZXMgcmVmZXJlbmNlZCBieSB0aGUgcmF3IHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdKSB7XG4gICAgdGhpcy5jb250ZW50cyA9IHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzKTtcbiAgICB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zID0gY29tcHV0ZVN0YXJ0T2ZMaW5lUG9zaXRpb25zKHRoaXMuY29udGVudHMpO1xuICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MgPSB0aGlzLmZsYXR0ZW5NYXBwaW5ncygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgcmF3IHNvdXJjZSBtYXAgZ2VuZXJhdGVkIGZyb20gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncy5cbiAgICovXG4gIHJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpOiBSYXdTb3VyY2VNYXAge1xuICAgIGNvbnN0IHNvdXJjZXM6IFNvdXJjZUZpbGVbXSA9IFtdO1xuICAgIGNvbnN0IG5hbWVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgbWFwcGluZ3M6IFNvdXJjZU1hcE1hcHBpbmdzID0gW107XG5cbiAgICBmb3IgKGNvbnN0IG1hcHBpbmcgb2YgdGhpcy5mbGF0dGVuZWRNYXBwaW5ncykge1xuICAgICAgY29uc3Qgc291cmNlSW5kZXggPSBmaW5kSW5kZXhPckFkZChzb3VyY2VzLCBtYXBwaW5nLm9yaWdpbmFsU291cmNlKTtcbiAgICAgIGNvbnN0IG1hcHBpbmdBcnJheTogU291cmNlTWFwU2VnbWVudCA9IFtcbiAgICAgICAgbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmNvbHVtbixcbiAgICAgICAgc291cmNlSW5kZXgsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmNvbHVtbixcbiAgICAgIF07XG4gICAgICBpZiAobWFwcGluZy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbmFtZUluZGV4ID0gZmluZEluZGV4T3JBZGQobmFtZXMsIG1hcHBpbmcubmFtZSk7XG4gICAgICAgIG1hcHBpbmdBcnJheS5wdXNoKG5hbWVJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSBhIG1hcHBpbmcgbGluZSBhcnJheSBmb3IgdGhpcyBtYXBwaW5nLlxuICAgICAgY29uc3QgbGluZSA9IG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudC5saW5lO1xuICAgICAgd2hpbGUgKGxpbmUgPj0gbWFwcGluZ3MubGVuZ3RoKSB7XG4gICAgICAgIG1hcHBpbmdzLnB1c2goW10pO1xuICAgICAgfVxuICAgICAgLy8gQWRkIHRoaXMgbWFwcGluZyB0byB0aGUgbGluZVxuICAgICAgbWFwcGluZ3NbbGluZV0ucHVzaChtYXBwaW5nQXJyYXkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZVBhdGhEaXIgPSBkaXJuYW1lKHRoaXMuc291cmNlUGF0aCk7XG4gICAgY29uc3Qgc291cmNlTWFwOiBSYXdTb3VyY2VNYXAgPSB7XG4gICAgICB2ZXJzaW9uOiAzLFxuICAgICAgZmlsZTogcmVsYXRpdmUoc291cmNlUGF0aERpciwgdGhpcy5zb3VyY2VQYXRoKSxcbiAgICAgIHNvdXJjZXM6IHNvdXJjZXMubWFwKHNmID0+IHJlbGF0aXZlKHNvdXJjZVBhdGhEaXIsIHNmLnNvdXJjZVBhdGgpKSwgbmFtZXMsXG4gICAgICBtYXBwaW5nczogZW5jb2RlKG1hcHBpbmdzKSxcbiAgICAgIHNvdXJjZXNDb250ZW50OiBzb3VyY2VzLm1hcChzZiA9PiBzZi5jb250ZW50cyksXG4gICAgfTtcbiAgICByZXR1cm4gc291cmNlTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIEZsYXR0ZW4gdGhlIHBhcnNlZCBtYXBwaW5ncyBmb3IgdGhpcyBzb3VyY2UgZmlsZSwgc28gdGhhdCBhbGwgdGhlIG1hcHBpbmdzIGFyZSB0byBwdXJlIG9yaWdpbmFsXG4gICAqIHNvdXJjZSBmaWxlcyB3aXRoIG5vIHRyYW5zaXRpdmUgc291cmNlIG1hcHMuXG4gICAqL1xuICBwcml2YXRlIGZsYXR0ZW5NYXBwaW5ncygpOiBNYXBwaW5nW10ge1xuICAgIGNvbnN0IG1hcHBpbmdzID0gcGFyc2VNYXBwaW5ncyh0aGlzLnJhd01hcCwgdGhpcy5zb3VyY2VzLCB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zKTtcbiAgICBlbnN1cmVPcmlnaW5hbFNlZ21lbnRMaW5rcyhtYXBwaW5ncyk7XG4gICAgY29uc3QgZmxhdHRlbmVkTWFwcGluZ3M6IE1hcHBpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IG1hcHBpbmdJbmRleCA9IDA7IG1hcHBpbmdJbmRleCA8IG1hcHBpbmdzLmxlbmd0aDsgbWFwcGluZ0luZGV4KyspIHtcbiAgICAgIGNvbnN0IGFUb0JtYXBwaW5nID0gbWFwcGluZ3NbbWFwcGluZ0luZGV4XTtcbiAgICAgIGNvbnN0IGJTb3VyY2UgPSBhVG9CbWFwcGluZy5vcmlnaW5hbFNvdXJjZTtcbiAgICAgIGlmIChiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyBUaGUgYiBzb3VyY2UgZmlsZSBoYXMgbm8gbWFwcGluZ3Mgb2YgaXRzIG93biAoaS5lLiBpdCBpcyBhIHB1cmUgb3JpZ2luYWwgZmlsZSlcbiAgICAgICAgLy8gc28ganVzdCB1c2UgdGhlIG1hcHBpbmcgYXMtaXMuXG4gICAgICAgIGZsYXR0ZW5lZE1hcHBpbmdzLnB1c2goYVRvQm1hcHBpbmcpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIGBpbmNvbWluZ1N0YXJ0YCBhbmQgYGluY29taW5nRW5kYCBhcmUgdGhlIGBTZWdtZW50TWFya2VyYHMgaW4gYEJgIHRoYXQgcmVwcmVzZW50IHRoZVxuICAgICAgLy8gc2VjdGlvbiBvZiBgQmAgc291cmNlIGZpbGUgdGhhdCBpcyBiZWluZyBtYXBwZWQgdG8gYnkgdGhlIGN1cnJlbnQgYGFUb0JtYXBwaW5nYC5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhlIG1hcHBpbmdzIGZyb20gQSB0byBCOlxuICAgICAgLy9cbiAgICAgIC8vIHNyYyBBICAgc3JjIEIgICAgIG1hcHBpbmdcbiAgICAgIC8vXG4gICAgICAvLyAgIGEgLS0tLS0gYSAgICAgICBbMCwgMF1cbiAgICAgIC8vICAgYiAgICAgICBiXG4gICAgICAvLyAgIGYgLSAgLy0gYyAgICAgICBbNCwgMl1cbiAgICAgIC8vICAgZyAgXFwgLyAgZFxuICAgICAgLy8gICBjIC0vXFwgICBlXG4gICAgICAvLyAgIGQgICAgXFwtIGYgICAgICAgWzIsIDVdXG4gICAgICAvLyAgIGVcbiAgICAgIC8vXG4gICAgICAvLyBGb3IgbWFwcGluZyBbMCwwXSB0aGUgaW5jb21pbmcgc3RhcnQgYW5kIGVuZCBhcmUgMCBhbmQgMiAoaS5lLiB0aGUgcmFuZ2UgYSwgYiwgYylcbiAgICAgIC8vIEZvciBtYXBwaW5nIFs0LDJdIHRoZSBpbmNvbWluZyBzdGFydCBhbmQgZW5kIGFyZSAyIGFuZCA1IChpLmUuIHRoZSByYW5nZSBjLCBkLCBlLCBmKVxuICAgICAgLy9cbiAgICAgIGNvbnN0IGluY29taW5nU3RhcnQgPSBhVG9CbWFwcGluZy5vcmlnaW5hbFNlZ21lbnQ7XG4gICAgICBjb25zdCBpbmNvbWluZ0VuZCA9IGluY29taW5nU3RhcnQubmV4dDtcblxuICAgICAgLy8gVGhlIGBvdXRnb2luZ1N0YXJ0SW5kZXhgIGFuZCBgb3V0Z29pbmdFbmRJbmRleGAgYXJlIHRoZSBpbmRpY2VzIG9mIHRoZSByYW5nZSBvZiBtYXBwaW5nc1xuICAgICAgLy8gdGhhdCBsZWF2ZSBgYmAgdGhhdCB3ZSBhcmUgaW50ZXJlc3RlZCBpbiBtZXJnaW5nIHdpdGggdGhlIGFUb0JtYXBwaW5nLlxuICAgICAgLy8gV2UgYWN0dWFsbHkgY2FyZSBhYm91dCBhbGwgdGhlIG1hcmtlcnMgZnJvbSB0aGUgbGFzdCBiVG9DbWFwcGluZyBkaXJlY3RseSBiZWZvcmUgdGhlXG4gICAgICAvLyBgaW5jb21pbmdTdGFydGAgdG8gdGhlIGxhc3QgYlRvQ21hcGluZyBkaXJlY3RseSBiZWZvcmUgdGhlIGBpbmNvbWluZ0VuZGAsIGluY2x1c2l2ZS5cbiAgICAgIC8vXG4gICAgICAvLyBGb3IgZXhhbXBsZSwgaWYgd2UgY29uc2lkZXIgdGhlIHJhbmdlIDIgdG8gNSBmcm9tIGFib3ZlIChpLmUuIGMsIGQsIGUsIGYpIHdpdGggdGhlXG4gICAgICAvLyBmb2xsb3dpbmcgbWFwcGluZ3MgZnJvbSBCIHRvIEM6XG4gICAgICAvL1xuICAgICAgLy8gICBzcmMgQiAgIHNyYyBDICAgICBtYXBwaW5nXG4gICAgICAvLyAgICAgYVxuICAgICAgLy8gICAgIGIgLS0tLS0gYiAgICAgICBbMSwgMF1cbiAgICAgIC8vICAgLSBjICAgICAgIGNcbiAgICAgIC8vICB8ICBkICAgICAgIGRcbiAgICAgIC8vICB8ICBlIC0tLS0tIDEgICAgICAgWzQsIDNdXG4gICAgICAvLyAgIC0gZiAgXFwgICAgMlxuICAgICAgLy8gICAgICAgICBcXCAgIDNcbiAgICAgIC8vICAgICAgICAgIFxcLSBlICAgICAgIFs0LCA2XVxuICAgICAgLy9cbiAgICAgIC8vIFRoZSByYW5nZSB3aXRoIGBpbmNvbWluZ1N0YXJ0YCBhdCAyIGFuZCBgaW5jb21pbmdFbmRgIGF0IDUgaGFzIG91dGdvaW5nIHN0YXJ0IG1hcHBpbmcgb2ZcbiAgICAgIC8vIFsxLDBdIGFuZCBvdXRnb2luZyBlbmQgbWFwcGluZyBvZiBbNCwgNl0sIHdoaWNoIGFsc28gaW5jbHVkZXMgWzQsIDNdLlxuICAgICAgLy9cbiAgICAgIGxldCBvdXRnb2luZ1N0YXJ0SW5kZXggPVxuICAgICAgICAgIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MsIGluY29taW5nU3RhcnQsIGZhbHNlLCAwKTtcbiAgICAgIGlmIChvdXRnb2luZ1N0YXJ0SW5kZXggPCAwKSB7XG4gICAgICAgIG91dGdvaW5nU3RhcnRJbmRleCA9IDA7XG4gICAgICB9XG4gICAgICBjb25zdCBvdXRnb2luZ0VuZEluZGV4ID0gaW5jb21pbmdFbmQgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgICAgZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUoXG4gICAgICAgICAgICAgIGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MsIGluY29taW5nRW5kLCB0cnVlLCBvdXRnb2luZ1N0YXJ0SW5kZXgpIDpcbiAgICAgICAgICBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzLmxlbmd0aCAtIDE7XG5cbiAgICAgIGZvciAobGV0IGJUb0NtYXBwaW5nSW5kZXggPSBvdXRnb2luZ1N0YXJ0SW5kZXg7IGJUb0NtYXBwaW5nSW5kZXggPD0gb3V0Z29pbmdFbmRJbmRleDtcbiAgICAgICAgICAgYlRvQ21hcHBpbmdJbmRleCsrKSB7XG4gICAgICAgIGNvbnN0IGJUb0NtYXBwaW5nOiBNYXBwaW5nID0gYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5nc1tiVG9DbWFwcGluZ0luZGV4XTtcbiAgICAgICAgZmxhdHRlbmVkTWFwcGluZ3MucHVzaChtZXJnZU1hcHBpbmdzKHRoaXMsIGFUb0JtYXBwaW5nLCBiVG9DbWFwcGluZykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmxhdHRlbmVkTWFwcGluZ3M7XG4gIH1cbn1cblxuLyoqXG4gKlxuICogQHBhcmFtIG1hcHBpbmdzIFRoZSBjb2xsZWN0aW9uIG9mIG1hcHBpbmdzIHdob3NlIHNlZ21lbnQtbWFya2VycyB3ZSBhcmUgc2VhcmNoaW5nLlxuICogQHBhcmFtIG1hcmtlciBUaGUgc2VnbWVudC1tYXJrZXIgdG8gbWF0Y2ggYWdhaW5zdCB0aG9zZSBvZiB0aGUgZ2l2ZW4gYG1hcHBpbmdzYC5cbiAqIEBwYXJhbSBleGNsdXNpdmUgSWYgZXhjbHVzaXZlIHRoZW4gd2UgbXVzdCBmaW5kIGEgbWFwcGluZyB3aXRoIGEgc2VnbWVudC1tYXJrZXIgdGhhdCBpc1xuICogZXhjbHVzaXZlbHkgZWFybGllciB0aGFuIHRoZSBnaXZlbiBgbWFya2VyYC5cbiAqIElmIG5vdCBleGNsdXNpdmUgdGhlbiB3ZSBjYW4gcmV0dXJuIHRoZSBoaWdoZXN0IG1hcHBpbmdzIHdpdGggYW4gZXF1aXZhbGVudCBzZWdtZW50LW1hcmtlciB0byB0aGVcbiAqIGdpdmVuIGBtYXJrZXJgLlxuICogQHBhcmFtIGxvd2VySW5kZXggSWYgcHJvdmlkZWQsIHRoaXMgaXMgdXNlZCBhcyBhIGhpbnQgdGhhdCB0aGUgbWFya2VyIHdlIGFyZSBzZWFyY2hpbmcgZm9yIGhhcyBhblxuICogaW5kZXggdGhhdCBpcyBubyBsb3dlciB0aGFuIHRoaXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kTGFzdE1hcHBpbmdJbmRleEJlZm9yZShcbiAgICBtYXBwaW5nczogTWFwcGluZ1tdLCBtYXJrZXI6IFNlZ21lbnRNYXJrZXIsIGV4Y2x1c2l2ZTogYm9vbGVhbiwgbG93ZXJJbmRleDogbnVtYmVyKTogbnVtYmVyIHtcbiAgbGV0IHVwcGVySW5kZXggPSBtYXBwaW5ncy5sZW5ndGggLSAxO1xuICBjb25zdCB0ZXN0ID0gZXhjbHVzaXZlID8gLTEgOiAwO1xuXG4gIGlmIChjb21wYXJlU2VnbWVudHMobWFwcGluZ3NbbG93ZXJJbmRleF0uZ2VuZXJhdGVkU2VnbWVudCwgbWFya2VyKSA+IHRlc3QpIHtcbiAgICAvLyBFeGl0IGVhcmx5IHNpbmNlIHRoZSBtYXJrZXIgaXMgb3V0c2lkZSB0aGUgYWxsb3dlZCByYW5nZSBvZiBtYXBwaW5ncy5cbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICBsZXQgbWF0Y2hpbmdJbmRleCA9IC0xO1xuICB3aGlsZSAobG93ZXJJbmRleCA8PSB1cHBlckluZGV4KSB7XG4gICAgY29uc3QgaW5kZXggPSAodXBwZXJJbmRleCArIGxvd2VySW5kZXgpID4+IDE7XG4gICAgaWYgKGNvbXBhcmVTZWdtZW50cyhtYXBwaW5nc1tpbmRleF0uZ2VuZXJhdGVkU2VnbWVudCwgbWFya2VyKSA8PSB0ZXN0KSB7XG4gICAgICBtYXRjaGluZ0luZGV4ID0gaW5kZXg7XG4gICAgICBsb3dlckluZGV4ID0gaW5kZXggKyAxO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cHBlckluZGV4ID0gaW5kZXggLSAxO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2hpbmdJbmRleDtcbn1cblxuLyoqXG4gKiBBIE1hcHBpbmcgY29uc2lzdHMgb2YgdHdvIHNlZ21lbnQgbWFya2Vyczogb25lIGluIHRoZSBnZW5lcmF0ZWQgc291cmNlIGFuZCBvbmUgaW4gdGhlIG9yaWdpbmFsXG4gKiBzb3VyY2UsIHdoaWNoIGluZGljYXRlIHRoZSBzdGFydCBvZiBlYWNoIHNlZ21lbnQuIFRoZSBlbmQgb2YgYSBzZWdtZW50IGlzIGluZGljYXRlZCBieSB0aGUgZmlyc3RcbiAqIHNlZ21lbnQgbWFya2VyIG9mIGFub3RoZXIgbWFwcGluZyB3aG9zZSBzdGFydCBpcyBncmVhdGVyIG9yIGVxdWFsIHRvIHRoaXMgb25lLlxuICpcbiAqIEl0IG1heSBhbHNvIGluY2x1ZGUgYSBuYW1lIGFzc29jaWF0ZWQgd2l0aCB0aGUgc2VnbWVudCBiZWluZyBtYXBwZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWFwcGluZyB7XG4gIHJlYWRvbmx5IGdlbmVyYXRlZFNlZ21lbnQ6IFNlZ21lbnRNYXJrZXI7XG4gIHJlYWRvbmx5IG9yaWdpbmFsU291cmNlOiBTb3VyY2VGaWxlO1xuICByZWFkb25seSBvcmlnaW5hbFNlZ21lbnQ6IFNlZ21lbnRNYXJrZXI7XG4gIHJlYWRvbmx5IG5hbWU/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogRmluZCB0aGUgaW5kZXggb2YgYGl0ZW1gIGluIHRoZSBgaXRlbXNgIGFycmF5LlxuICogSWYgaXQgaXMgbm90IGZvdW5kLCB0aGVuIHB1c2ggYGl0ZW1gIHRvIHRoZSBlbmQgb2YgdGhlIGFycmF5IGFuZCByZXR1cm4gaXRzIG5ldyBpbmRleC5cbiAqXG4gKiBAcGFyYW0gaXRlbXMgdGhlIGNvbGxlY3Rpb24gaW4gd2hpY2ggdG8gbG9vayBmb3IgYGl0ZW1gLlxuICogQHBhcmFtIGl0ZW0gdGhlIGl0ZW0gdG8gbG9vayBmb3IuXG4gKiBAcmV0dXJucyB0aGUgaW5kZXggb2YgdGhlIGBpdGVtYCBpbiB0aGUgYGl0ZW1zYCBhcnJheS5cbiAqL1xuZnVuY3Rpb24gZmluZEluZGV4T3JBZGQ8VD4oaXRlbXM6IFRbXSwgaXRlbTogVCk6IG51bWJlciB7XG4gIGNvbnN0IGl0ZW1JbmRleCA9IGl0ZW1zLmluZGV4T2YoaXRlbSk7XG4gIGlmIChpdGVtSW5kZXggPiAtMSkge1xuICAgIHJldHVybiBpdGVtSW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgaXRlbXMucHVzaChpdGVtKTtcbiAgICByZXR1cm4gaXRlbXMubGVuZ3RoIC0gMTtcbiAgfVxufVxuXG5cbi8qKlxuICogTWVyZ2UgdHdvIG1hcHBpbmdzIHRoYXQgZ28gZnJvbSBBIHRvIEIgYW5kIEIgdG8gQywgdG8gcmVzdWx0IGluIGEgbWFwcGluZyB0aGF0IGdvZXMgZnJvbSBBIHRvIEMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZU1hcHBpbmdzKGdlbmVyYXRlZFNvdXJjZTogU291cmNlRmlsZSwgYWI6IE1hcHBpbmcsIGJjOiBNYXBwaW5nKTogTWFwcGluZyB7XG4gIGNvbnN0IG5hbWUgPSBiYy5uYW1lIHx8IGFiLm5hbWU7XG5cbiAgLy8gV2UgbmVlZCB0byBtb2RpZnkgdGhlIHNlZ21lbnQtbWFya2VycyBvZiB0aGUgbmV3IG1hcHBpbmcgdG8gdGFrZSBpbnRvIGFjY291bnQgdGhlIHNoaWZ0cyB0aGF0XG4gIC8vIG9jY3VyIGR1ZSB0byB0aGUgY29tYmluYXRpb24gb2YgdGhlIHR3byBtYXBwaW5ncy5cbiAgLy8gRm9yIGV4YW1wbGU6XG5cbiAgLy8gKiBTaW1wbGUgbWFwIHdoZXJlIHRoZSBCLT5DIHN0YXJ0cyBhdCB0aGUgc2FtZSBwbGFjZSB0aGUgQS0+QiBlbmRzOlxuICAvL1xuICAvLyBgYGBcbiAgLy8gQTogMSAyIGIgYyBkXG4gIC8vICAgICAgICB8ICAgICAgICBBLT5CIFsyLDBdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICB8XG4gIC8vIEI6ICAgICBiIGMgZCAgICBBLT5DIFsyLDFdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICAgIHxcbiAgLy8gICAgICAgIHwgICAgICAgIEItPkMgWzAsMV1cbiAgLy8gQzogICBhIGIgYyBkIGVcbiAgLy8gYGBgXG5cbiAgLy8gKiBNb3JlIGNvbXBsaWNhdGVkIGNhc2Ugd2hlcmUgZGlmZnMgb2Ygc2VnbWVudC1tYXJrZXJzIGlzIG5lZWRlZDpcbiAgLy9cbiAgLy8gYGBgXG4gIC8vIEE6IGIgMSAyIGMgZFxuICAvLyAgICAgXFxcbiAgLy8gICAgICB8ICAgICAgICAgICAgQS0+QiAgWzAsMSpdICAgIFswLDEqXVxuICAvLyAgICAgIHwgICAgICAgICAgICAgICAgICAgfCAgICAgICAgIHwrM1xuICAvLyBCOiBhIGIgMSAyIGMgZCAgICBBLT5DICBbMCwxXSAgICAgWzMsMl1cbiAgLy8gICAgfCAgICAgIC8gICAgICAgICAgICAgICAgfCsxICAgICAgIHxcbiAgLy8gICAgfCAgICAgLyAgICAgICAgQi0+QyBbMCosMF0gICAgWzQqLDJdXG4gIC8vICAgIHwgICAgL1xuICAvLyBDOiBhIGIgYyBkIGVcbiAgLy8gYGBgXG4gIC8vXG4gIC8vIGBbMCwxXWAgbWFwcGluZyBmcm9tIEEtPkM6XG4gIC8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiBvZiBBLT5CICgxKikgYW5kIHRoZSBcImdlbmVyYXRlZFxuICAvLyBzZWdtZW50LW1hcmtlciBvZiBCLT5DICgwKik6IGAxIC0gMCA9ICsxYC5cbiAgLy8gU2luY2UgaXQgaXMgcG9zaXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiB3aXRoIGAxYCB0byBnaXZlIFswLDFdLlxuICAvL1xuICAvLyBgWzMsMl1gIG1hcHBpbmcgZnJvbSBBLT5DOlxuICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgb2YgQS0+QiAoMSopIGFuZCB0aGUgXCJnZW5lcmF0ZWRcbiAgLy8gc2VnbWVudC1tYXJrZXJcIiBvZiBCLT5DICg0Kik6IGAxIC0gNCA9IC0zYC5cbiAgLy8gU2luY2UgaXQgaXMgbmVnYXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwiZ2VuZXJhdGVkIHNlZ21lbnQtbWFya2VyXCIgd2l0aCBgM2AgdG8gZ2l2ZSBbMywyXS5cblxuICBjb25zdCBkaWZmID0gY29tcGFyZVNlZ21lbnRzKGJjLmdlbmVyYXRlZFNlZ21lbnQsIGFiLm9yaWdpbmFsU2VnbWVudCk7XG4gIGlmIChkaWZmID4gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGdlbmVyYXRlZFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9ucywgYWIuZ2VuZXJhdGVkU2VnbWVudCwgZGlmZiksXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6IGJjLm9yaWdpbmFsU2VnbWVudCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDogYWIuZ2VuZXJhdGVkU2VnbWVudCxcbiAgICAgIG9yaWdpbmFsU291cmNlOiBiYy5vcmlnaW5hbFNvdXJjZSxcbiAgICAgIG9yaWdpbmFsU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGJjLm9yaWdpbmFsU291cmNlLnN0YXJ0T2ZMaW5lUG9zaXRpb25zLCBiYy5vcmlnaW5hbFNlZ21lbnQsIC1kaWZmKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGByYXdNYXBwaW5nc2AgaW50byBhbiBhcnJheSBvZiBwYXJzZWQgbWFwcGluZ3MsIHdoaWNoIHJlZmVyZW5jZSBzb3VyY2UtZmlsZXMgcHJvdmlkZWRcbiAqIGluIHRoZSBgc291cmNlc2AgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNYXBwaW5ncyhcbiAgICByYXdNYXA6IFJhd1NvdXJjZU1hcCB8IG51bGwsIHNvdXJjZXM6IChTb3VyY2VGaWxlIHwgbnVsbClbXSxcbiAgICBnZW5lcmF0ZWRTb3VyY2VTdGFydE9mTGluZVBvc2l0aW9uczogbnVtYmVyW10pOiBNYXBwaW5nW10ge1xuICBpZiAocmF3TWFwID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgcmF3TWFwcGluZ3MgPSBkZWNvZGUocmF3TWFwLm1hcHBpbmdzKTtcbiAgaWYgKHJhd01hcHBpbmdzID09PSBudWxsKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgY29uc3QgbWFwcGluZ3M6IE1hcHBpbmdbXSA9IFtdO1xuICBmb3IgKGxldCBnZW5lcmF0ZWRMaW5lID0gMDsgZ2VuZXJhdGVkTGluZSA8IHJhd01hcHBpbmdzLmxlbmd0aDsgZ2VuZXJhdGVkTGluZSsrKSB7XG4gICAgY29uc3QgZ2VuZXJhdGVkTGluZU1hcHBpbmdzID0gcmF3TWFwcGluZ3NbZ2VuZXJhdGVkTGluZV07XG4gICAgZm9yIChjb25zdCByYXdNYXBwaW5nIG9mIGdlbmVyYXRlZExpbmVNYXBwaW5ncykge1xuICAgICAgaWYgKHJhd01hcHBpbmcubGVuZ3RoID49IDQpIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTb3VyY2UgPSBzb3VyY2VzW3Jhd01hcHBpbmdbMV0gIV07XG4gICAgICAgIGlmIChvcmlnaW5hbFNvdXJjZSA9PT0gbnVsbCB8fCBvcmlnaW5hbFNvdXJjZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gdGhlIG9yaWdpbmFsIHNvdXJjZSBpcyBtaXNzaW5nIHNvIGlnbm9yZSB0aGlzIG1hcHBpbmdcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBnZW5lcmF0ZWRDb2x1bW4gPSByYXdNYXBwaW5nWzBdO1xuICAgICAgICBjb25zdCBuYW1lID0gcmF3TWFwcGluZy5sZW5ndGggPT09IDUgPyByYXdNYXAubmFtZXNbcmF3TWFwcGluZ1s0XV0gOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGxpbmUgPSByYXdNYXBwaW5nWzJdICE7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IHJhd01hcHBpbmdbM10gITtcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkU2VnbWVudDogU2VnbWVudE1hcmtlciA9IHtcbiAgICAgICAgICBsaW5lOiBnZW5lcmF0ZWRMaW5lLFxuICAgICAgICAgIGNvbHVtbjogZ2VuZXJhdGVkQ29sdW1uLFxuICAgICAgICAgIHBvc2l0aW9uOiBnZW5lcmF0ZWRTb3VyY2VTdGFydE9mTGluZVBvc2l0aW9uc1tnZW5lcmF0ZWRMaW5lXSArIGdlbmVyYXRlZENvbHVtbixcbiAgICAgICAgICBuZXh0OiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsU2VnbWVudDogU2VnbWVudE1hcmtlciA9IHtcbiAgICAgICAgICBsaW5lLFxuICAgICAgICAgIGNvbHVtbixcbiAgICAgICAgICBwb3NpdGlvbjogb3JpZ2luYWxTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnNbbGluZV0gKyBjb2x1bW4sXG4gICAgICAgICAgbmV4dDogdW5kZWZpbmVkLFxuICAgICAgICB9O1xuICAgICAgICBtYXBwaW5ncy5wdXNoKHtuYW1lLCBnZW5lcmF0ZWRTZWdtZW50LCBvcmlnaW5hbFNlZ21lbnQsIG9yaWdpbmFsU291cmNlfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXBwaW5ncztcbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSBzZWdtZW50IG1hcmtlcnMgZnJvbSB0aGUgb3JpZ2luYWwgc291cmNlIGZpbGVzIGluIGVhY2ggbWFwcGluZyBvZiBhbiBhcnJheSBvZlxuICogYG1hcHBpbmdzYC5cbiAqXG4gKiBAcGFyYW0gbWFwcGluZ3MgVGhlIG1hcHBpbmdzIHdob3NlIG9yaWdpbmFsIHNlZ21lbnRzIHdlIHdhbnQgdG8gZXh0cmFjdFxuICogQHJldHVybnMgUmV0dXJuIGEgbWFwIGZyb20gb3JpZ2luYWwgc291cmNlLWZpbGVzIChyZWZlcmVuY2VkIGluIHRoZSBgbWFwcGluZ3NgKSB0byBhcnJheXMgb2ZcbiAqIHNlZ21lbnQtbWFya2VycyBzb3J0ZWQgYnkgdGhlaXIgb3JkZXIgaW4gdGhlaXIgc291cmNlIGZpbGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0T3JpZ2luYWxTZWdtZW50cyhtYXBwaW5nczogTWFwcGluZ1tdKTogTWFwPFNvdXJjZUZpbGUsIFNlZ21lbnRNYXJrZXJbXT4ge1xuICBjb25zdCBvcmlnaW5hbFNlZ21lbnRzID0gbmV3IE1hcDxTb3VyY2VGaWxlLCBTZWdtZW50TWFya2VyW10+KCk7XG4gIGZvciAoY29uc3QgbWFwcGluZyBvZiBtYXBwaW5ncykge1xuICAgIGNvbnN0IG9yaWdpbmFsU291cmNlID0gbWFwcGluZy5vcmlnaW5hbFNvdXJjZTtcbiAgICBpZiAoIW9yaWdpbmFsU2VnbWVudHMuaGFzKG9yaWdpbmFsU291cmNlKSkge1xuICAgICAgb3JpZ2luYWxTZWdtZW50cy5zZXQob3JpZ2luYWxTb3VyY2UsIFtdKTtcbiAgICB9XG4gICAgY29uc3Qgc2VnbWVudHMgPSBvcmlnaW5hbFNlZ21lbnRzLmdldChvcmlnaW5hbFNvdXJjZSkgITtcbiAgICBzZWdtZW50cy5wdXNoKG1hcHBpbmcub3JpZ2luYWxTZWdtZW50KTtcbiAgfVxuICBvcmlnaW5hbFNlZ21lbnRzLmZvckVhY2goc2VnbWVudE1hcmtlcnMgPT4gc2VnbWVudE1hcmtlcnMuc29ydChjb21wYXJlU2VnbWVudHMpKTtcbiAgcmV0dXJuIG9yaWdpbmFsU2VnbWVudHM7XG59XG5cbi8qKlxuICogVXBkYXRlIHRoZSBvcmlnaW5hbCBzZWdtZW50cyBvZiBlYWNoIG9mIHRoZSBnaXZlbiBgbWFwcGluZ3NgIHRvIGluY2x1ZGUgYSBsaW5rIHRvIHRoZSBuZXh0XG4gKiBzZWdtZW50IGluIHRoZSBzb3VyY2UgZmlsZS5cbiAqXG4gKiBAcGFyYW0gbWFwcGluZ3MgdGhlIG1hcHBpbmdzIHdob3NlIHNlZ21lbnRzIHNob3VsZCBiZSB1cGRhdGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbnN1cmVPcmlnaW5hbFNlZ21lbnRMaW5rcyhtYXBwaW5nczogTWFwcGluZ1tdKTogdm9pZCB7XG4gIGNvbnN0IHNlZ21lbnRzQnlTb3VyY2UgPSBleHRyYWN0T3JpZ2luYWxTZWdtZW50cyhtYXBwaW5ncyk7XG4gIHNlZ21lbnRzQnlTb3VyY2UuZm9yRWFjaChtYXJrZXJzID0+IHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1hcmtlcnMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBtYXJrZXJzW2ldLm5leHQgPSBtYXJrZXJzW2kgKyAxXTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVN0YXJ0T2ZMaW5lUG9zaXRpb25zKHN0cjogc3RyaW5nKSB7XG4gIC8vIFRoZSBgMWAgaXMgdG8gaW5kaWNhdGUgYSBuZXdsaW5lIGNoYXJhY3RlciBiZXR3ZWVuIHRoZSBsaW5lcy5cbiAgLy8gTm90ZSB0aGF0IGluIHRoZSBhY3R1YWwgY29udGVudHMgdGhlcmUgY291bGQgYmUgbW9yZSB0aGFuIG9uZSBjaGFyYWN0ZXIgdGhhdCBpbmRpY2F0ZXMgYVxuICAvLyBuZXdsaW5lXG4gIC8vIC0gZS5nLiBcXHJcXG4gLSBidXQgdGhhdCBpcyBub3QgaW1wb3J0YW50IGhlcmUgc2luY2Ugc2VnbWVudC1tYXJrZXJzIGFyZSBpbiBsaW5lL2NvbHVtbiBwYWlycyBhbmRcbiAgLy8gc28gZGlmZmVyZW5jZXMgaW4gbGVuZ3RoIGR1ZSB0byBleHRyYSBgXFxyYCBjaGFyYWN0ZXJzIGRvIG5vdCBhZmZlY3QgdGhlIGFsZ29yaXRobXMuXG4gIGNvbnN0IE5FV0xJTkVfTUFSS0VSX09GRlNFVCA9IDE7XG4gIGNvbnN0IGxpbmVMZW5ndGhzID0gY29tcHV0ZUxpbmVMZW5ndGhzKHN0cik7XG4gIGNvbnN0IHN0YXJ0UG9zaXRpb25zID0gWzBdOyAgLy8gRmlyc3QgbGluZSBzdGFydHMgYXQgcG9zaXRpb24gMFxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVMZW5ndGhzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIHN0YXJ0UG9zaXRpb25zLnB1c2goc3RhcnRQb3NpdGlvbnNbaV0gKyBsaW5lTGVuZ3Roc1tpXSArIE5FV0xJTkVfTUFSS0VSX09GRlNFVCk7XG4gIH1cbiAgcmV0dXJuIHN0YXJ0UG9zaXRpb25zO1xufVxuXG5mdW5jdGlvbiBjb21wdXRlTGluZUxlbmd0aHMoc3RyOiBzdHJpbmcpOiBudW1iZXJbXSB7XG4gIHJldHVybiAoc3RyLnNwbGl0KC9cXHI/XFxuLykpLm1hcChzID0+IHMubGVuZ3RoKTtcbn1cbiJdfQ==