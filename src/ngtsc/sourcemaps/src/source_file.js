(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/sourcemaps/src/source_file", ["require", "exports", "tslib", "convert-source-map", "sourcemap-codec", "@angular/compiler-cli/src/ngtsc/sourcemaps/src/segment_marker"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.computeStartOfLinePositions = exports.ensureOriginalSegmentLinks = exports.extractOriginalSegments = exports.parseMappings = exports.mergeMappings = exports.findLastMappingIndexBefore = exports.SourceFile = exports.removeSourceMapComments = void 0;
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var convert_source_map_1 = require("convert-source-map");
    var sourcemap_codec_1 = require("sourcemap-codec");
    var segment_marker_1 = require("@angular/compiler-cli/src/ngtsc/sourcemaps/src/segment_marker");
    function removeSourceMapComments(contents) {
        return (0, convert_source_map_1.removeMapFileComments)((0, convert_source_map_1.removeComments)(contents)).replace(/\n\n$/, '\n');
    }
    exports.removeSourceMapComments = removeSourceMapComments;
    var SourceFile = /** @class */ (function () {
        function SourceFile(
        /** The path to this source file. */
        sourcePath, 
        /** The contents of this source file. */
        contents, 
        /** The raw source map (if any) referenced by this source file. */
        rawMap, 
        /** Any source files referenced by the raw source map associated with this source file. */
        sources, fs) {
            this.sourcePath = sourcePath;
            this.contents = contents;
            this.rawMap = rawMap;
            this.sources = sources;
            this.fs = fs;
            this.contents = removeSourceMapComments(contents);
            this.startOfLinePositions = computeStartOfLinePositions(this.contents);
            this.flattenedMappings = this.flattenMappings();
        }
        /**
         * Render the raw source map generated from the flattened mappings.
         */
        SourceFile.prototype.renderFlattenedSourceMap = function () {
            var e_1, _a;
            var _this = this;
            var sources = new IndexedMap();
            var names = new IndexedSet();
            var mappings = [];
            var sourcePathDir = this.fs.dirname(this.sourcePath);
            // Computing the relative path can be expensive, and we are likely to have the same path for
            // many (if not all!) mappings.
            var relativeSourcePathCache = new Cache(function (input) { return _this.fs.relative(sourcePathDir, input); });
            try {
                for (var _b = (0, tslib_1.__values)(this.flattenedMappings), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var mapping = _c.value;
                    var sourceIndex = sources.set(relativeSourcePathCache.get(mapping.originalSource.sourcePath), mapping.originalSource.contents);
                    var mappingArray = [
                        mapping.generatedSegment.column,
                        sourceIndex,
                        mapping.originalSegment.line,
                        mapping.originalSegment.column,
                    ];
                    if (mapping.name !== undefined) {
                        var nameIndex = names.add(mapping.name);
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
            var sourceMap = {
                version: 3,
                file: this.fs.relative(sourcePathDir, this.sourcePath),
                sources: sources.keys,
                names: names.values,
                mappings: (0, sourcemap_codec_1.encode)(mappings),
                sourcesContent: sources.values,
            };
            return sourceMap;
        };
        /**
         * Find the original mapped location for the given `line` and `column` in the generated file.
         *
         * First we search for a mapping whose generated segment is at or directly before the given
         * location. Then we compute the offset between the given location and the matching generated
         * segment. Finally we apply this offset to the original source segment to get the desired
         * original location.
         */
        SourceFile.prototype.getOriginalLocation = function (line, column) {
            if (this.flattenedMappings.length === 0) {
                return null;
            }
            var position;
            if (line < this.startOfLinePositions.length) {
                position = this.startOfLinePositions[line] + column;
            }
            else {
                // The line is off the end of the file, so just assume we are at the end of the file.
                position = this.contents.length;
            }
            var locationSegment = { line: line, column: column, position: position, next: undefined };
            var mappingIndex = findLastMappingIndexBefore(this.flattenedMappings, locationSegment, false, 0);
            if (mappingIndex < 0) {
                mappingIndex = 0;
            }
            var _a = this.flattenedMappings[mappingIndex], originalSegment = _a.originalSegment, originalSource = _a.originalSource, generatedSegment = _a.generatedSegment;
            var offset = locationSegment.position - generatedSegment.position;
            var offsetOriginalSegment = (0, segment_marker_1.offsetSegment)(originalSource.startOfLinePositions, originalSegment, offset);
            return {
                file: originalSource.sourcePath,
                line: offsetOriginalSegment.line,
                column: offsetOriginalSegment.column,
            };
        };
        /**
         * Flatten the parsed mappings for this source file, so that all the mappings are to pure original
         * source files with no transitive source maps.
         */
        SourceFile.prototype.flattenMappings = function () {
            var mappings = parseMappings(this.rawMap && this.rawMap.map, this.sources, this.startOfLinePositions);
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
        if ((0, segment_marker_1.compareSegments)(mappings[lowerIndex].generatedSegment, marker) > test) {
            // Exit early since the marker is outside the allowed range of mappings.
            return -1;
        }
        var matchingIndex = -1;
        while (lowerIndex <= upperIndex) {
            var index = (upperIndex + lowerIndex) >> 1;
            if ((0, segment_marker_1.compareSegments)(mappings[index].generatedSegment, marker) <= test) {
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
        var diff = (0, segment_marker_1.compareSegments)(bc.generatedSegment, ab.originalSegment);
        if (diff > 0) {
            return {
                name: name,
                generatedSegment: (0, segment_marker_1.offsetSegment)(generatedSource.startOfLinePositions, ab.generatedSegment, diff),
                originalSource: bc.originalSource,
                originalSegment: bc.originalSegment,
            };
        }
        else {
            return {
                name: name,
                generatedSegment: ab.generatedSegment,
                originalSource: bc.originalSource,
                originalSegment: (0, segment_marker_1.offsetSegment)(bc.originalSource.startOfLinePositions, bc.originalSegment, -diff),
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
        var rawMappings = (0, sourcemap_codec_1.decode)(rawMap.mappings);
        if (rawMappings === null) {
            return [];
        }
        var mappings = [];
        for (var generatedLine = 0; generatedLine < rawMappings.length; generatedLine++) {
            var generatedLineMappings = rawMappings[generatedLine];
            try {
                for (var generatedLineMappings_1 = (e_2 = void 0, (0, tslib_1.__values)(generatedLineMappings)), generatedLineMappings_1_1 = generatedLineMappings_1.next(); !generatedLineMappings_1_1.done; generatedLineMappings_1_1 = generatedLineMappings_1.next()) {
                    var rawMapping = generatedLineMappings_1_1.value;
                    if (rawMapping.length >= 4) {
                        var originalSource = sources[rawMapping[1]];
                        if (originalSource === null || originalSource === undefined) {
                            // the original source is missing so ignore this mapping
                            continue;
                        }
                        var generatedColumn = rawMapping[0];
                        var name_1 = rawMapping.length === 5 ? rawMap.names[rawMapping[4]] : undefined;
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
                        mappings.push({ name: name_1, generatedSegment: generatedSegment, originalSegment: originalSegment, originalSource: originalSource });
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
            for (var mappings_1 = (0, tslib_1.__values)(mappings), mappings_1_1 = mappings_1.next(); !mappings_1_1.done; mappings_1_1 = mappings_1.next()) {
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
        return (str.split(/\n/)).map(function (s) { return s.length; });
    }
    /**
     * A collection of mappings between `keys` and `values` stored in the order in which the keys are
     * first seen.
     *
     * The difference between this and a standard `Map` is that when you add a key-value pair the index
     * of the `key` is returned.
     */
    var IndexedMap = /** @class */ (function () {
        function IndexedMap() {
            this.map = new Map();
            /**
             * An array of keys added to this map.
             *
             * This array is guaranteed to be in the order of the first time the key was added to the map.
             */
            this.keys = [];
            /**
             * An array of values added to this map.
             *
             * This array is guaranteed to be in the order of the first time the associated key was added to
             * the map.
             */
            this.values = [];
        }
        /**
         * Associate the `value` with the `key` and return the index of the key in the collection.
         *
         * If the `key` already exists then the `value` is not set and the index of that `key` is
         * returned; otherwise the `key` and `value` are stored and the index of the new `key` is
         * returned.
         *
         * @param key the key to associated with the `value`.
         * @param value the value to associated with the `key`.
         * @returns the index of the `key` in the `keys` array.
         */
        IndexedMap.prototype.set = function (key, value) {
            if (this.map.has(key)) {
                return this.map.get(key);
            }
            var index = this.values.push(value) - 1;
            this.keys.push(key);
            this.map.set(key, index);
            return index;
        };
        return IndexedMap;
    }());
    /**
     * A collection of `values` stored in the order in which they were added.
     *
     * The difference between this and a standard `Set` is that when you add a value the index of that
     * item is returned.
     */
    var IndexedSet = /** @class */ (function () {
        function IndexedSet() {
            this.map = new Map();
            /**
             * An array of values added to this set.
             * This array is guaranteed to be in the order of the first time the value was added to the set.
             */
            this.values = [];
        }
        /**
         * Add the `value` to the `values` array, if it doesn't already exist; returning the index of the
         * `value` in the `values` array.
         *
         * If the `value` already exists then the index of that `value` is returned, otherwise the new
         * `value` is stored and the new index returned.
         *
         * @param value the value to add to the set.
         * @returns the index of the `value` in the `values` array.
         */
        IndexedSet.prototype.add = function (value) {
            if (this.map.has(value)) {
                return this.map.get(value);
            }
            var index = this.values.push(value) - 1;
            this.map.set(value, index);
            return index;
        };
        return IndexedSet;
    }());
    var Cache = /** @class */ (function () {
        function Cache(computeFn) {
            this.computeFn = computeFn;
            this.map = new Map();
        }
        Cache.prototype.get = function (input) {
            if (!this.map.has(input)) {
                this.map.set(input, this.computeFn(input));
            }
            return this.map.get(input);
        };
        return Cache;
    }());
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NvdXJjZW1hcHMvc3JjL3NvdXJjZV9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBS3BGLGdHQUErRTtJQUUvRSxTQUFnQix1QkFBdUIsQ0FBQyxRQUFnQjtRQUN0RCxPQUFPLElBQUEsMENBQXFCLEVBQUMsSUFBQSxtQ0FBYyxFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRkQsMERBRUM7SUFFRDtRQVdFO1FBQ0ksb0NBQW9DO1FBQzNCLFVBQTBCO1FBQ25DLHdDQUF3QztRQUMvQixRQUFnQjtRQUN6QixrRUFBa0U7UUFDekQsTUFBMEI7UUFDbkMsMEZBQTBGO1FBQ2pGLE9BQTRCLEVBQzdCLEVBQW9CO1lBUG5CLGVBQVUsR0FBVixVQUFVLENBQWdCO1lBRTFCLGFBQVEsR0FBUixRQUFRLENBQVE7WUFFaEIsV0FBTSxHQUFOLE1BQU0sQ0FBb0I7WUFFMUIsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFDN0IsT0FBRSxHQUFGLEVBQUUsQ0FBa0I7WUFFOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDbEQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsNkNBQXdCLEdBQXhCOztZQUFBLGlCQTJDQztZQTFDQyxJQUFNLE9BQU8sR0FBRyxJQUFJ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RyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBM0JELElBMkJDO0lBRUQ7UUFFRSxlQUFvQixTQUFtQztZQUFuQyxjQUFTLEdBQVQsU0FBUyxDQUEwQjtZQUQvQyxRQUFHLEdBQUcsSUFBSSxHQUFHLEVBQWlCLENBQUM7UUFDbUIsQ0FBQztRQUMzRCxtQkFBRyxHQUFILFVBQUksS0FBWTtZQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUM1QztZQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7UUFDOUIsQ0FBQztRQUNILFlBQUM7SUFBRCxDQUFDLEFBVEQsSUFTQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtyZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtkZWNvZGUsIGVuY29kZSwgU291cmNlTWFwTWFwcGluZ3MsIFNvdXJjZU1hcFNlZ21lbnR9IGZyb20gJ3NvdXJjZW1hcC1jb2RlYyc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGgsIFBhdGhNYW5pcHVsYXRpb259IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtSYXdTb3VyY2VNYXAsIFNvdXJjZU1hcEluZm99IGZyb20gJy4vcmF3X3NvdXJjZV9tYXAnO1xuaW1wb3J0IHtjb21wYXJlU2VnbWVudHMsIG9mZnNldFNlZ21lbnQsIFNlZ21lbnRNYXJrZXJ9IGZyb20gJy4vc2VnbWVudF9tYXJrZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlU291cmNlTWFwQ29tbWVudHMoY29udGVudHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiByZW1vdmVNYXBGaWxlQ29tbWVudHMocmVtb3ZlQ29tbWVudHMoY29udGVudHMpKS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpO1xufVxuXG5leHBvcnQgY2xhc3MgU291cmNlRmlsZSB7XG4gIC8qKlxuICAgKiBUaGUgcGFyc2VkIG1hcHBpbmdzIHRoYXQgaGF2ZSBiZWVuIGZsYXR0ZW5lZCBzbyB0aGF0IGFueSBpbnRlcm1lZGlhdGUgc291cmNlIG1hcHBpbmdzIGhhdmUgYmVlblxuICAgKiBmbGF0dGVuZWQuXG4gICAqXG4gICAqIFRoZSByZXN1bHQgaXMgdGhhdCBhbnkgc291cmNlIGZpbGUgbWVudGlvbmVkIGluIHRoZSBmbGF0dGVuZWQgbWFwcGluZ3MgaGF2ZSBubyBzb3VyY2UgbWFwIChhcmVcbiAgICogcHVyZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMpLlxuICAgKi9cbiAgcmVhZG9ubHkgZmxhdHRlbmVkTWFwcGluZ3M6IE1hcHBpbmdbXTtcbiAgcmVhZG9ubHkgc3RhcnRPZkxpbmVQb3NpdGlvbnM6IG51bWJlcltdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgICAgLyoqIFRoZSBwYXRoIHRvIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBzb3VyY2VQYXRoOiBBYnNvbHV0ZUZzUGF0aCxcbiAgICAgIC8qKiBUaGUgY29udGVudHMgb2YgdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IGNvbnRlbnRzOiBzdHJpbmcsXG4gICAgICAvKiogVGhlIHJhdyBzb3VyY2UgbWFwIChpZiBhbnkpIHJlZmVyZW5jZWQgYnkgdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHJhd01hcDogU291cmNlTWFwSW5mb3xudWxsLFxuICAgICAgLyoqIEFueSBzb3VyY2UgZmlsZXMgcmVmZXJlbmNlZCBieSB0aGUgcmF3IHNvdXJjZSBtYXAgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdLFxuICAgICAgcHJpdmF0ZSBmczogUGF0aE1hbmlwdWxhdGlvbixcbiAgKSB7XG4gICAgdGhpcy5jb250ZW50cyA9IHJlbW92ZVNvdXJjZU1hcENvbW1lbnRzKGNvbnRlbnRzKTtcbiAgICB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zID0gY29tcHV0ZVN0YXJ0T2ZMaW5lUG9zaXRpb25zKHRoaXMuY29udGVudHMpO1xuICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MgPSB0aGlzLmZsYXR0ZW5NYXBwaW5ncygpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgcmF3IHNvdXJjZSBtYXAgZ2VuZXJhdGVkIGZyb20gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncy5cbiAgICovXG4gIHJlbmRlckZsYXR0ZW5lZFNvdXJjZU1hcCgpOiBSYXdTb3VyY2VNYXAge1xuICAgIGNvbnN0IHNvdXJjZXMgPSBuZXcgSW5kZXhlZE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICBjb25zdCBuYW1lcyA9IG5ldyBJbmRleGVkU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBtYXBwaW5nczogU291cmNlTWFwTWFwcGluZ3MgPSBbXTtcbiAgICBjb25zdCBzb3VyY2VQYXRoRGlyID0gdGhpcy5mcy5kaXJuYW1lKHRoaXMuc291cmNlUGF0aCk7XG4gICAgLy8gQ29tcHV0aW5nIHRoZSByZWxhdGl2ZSBwYXRoIGNhbiBiZSBleHBlbnNpdmUsIGFuZCB3ZSBhcmUgbGlrZWx5IHRvIGhhdmUgdGhlIHNhbWUgcGF0aCBmb3JcbiAgICAvLyBtYW55IChpZiBub3QgYWxsISkgbWFwcGluZ3MuXG4gICAgY29uc3QgcmVsYXRpdmVTb3VyY2VQYXRoQ2FjaGUgPVxuICAgICAgICBuZXcgQ2FjaGU8c3RyaW5nLCBzdHJpbmc+KGlucHV0ID0+IHRoaXMuZnMucmVsYXRpdmUoc291cmNlUGF0aERpciwgaW5wdXQpKTtcblxuICAgIGZvciAoY29uc3QgbWFwcGluZyBvZiB0aGlzLmZsYXR0ZW5lZE1hcHBpbmdzKSB7XG4gICAgICBjb25zdCBzb3VyY2VJbmRleCA9IHNvdXJjZXMuc2V0KFxuICAgICAgICAgIHJlbGF0aXZlU291cmNlUGF0aENhY2hlLmdldChtYXBwaW5nLm9yaWdpbmFsU291cmNlLnNvdXJjZVBhdGgpLFxuICAgICAgICAgIG1hcHBpbmcub3JpZ2luYWxTb3VyY2UuY29udGVudHMpO1xuICAgICAgY29uc3QgbWFwcGluZ0FycmF5OiBTb3VyY2VNYXBTZWdtZW50ID0gW1xuICAgICAgICBtYXBwaW5nLmdlbmVyYXRlZFNlZ21lbnQuY29sdW1uLFxuICAgICAgICBzb3VyY2VJbmRleCxcbiAgICAgICAgbWFwcGluZy5vcmlnaW5hbFNlZ21lbnQubGluZSxcbiAgICAgICAgbWFwcGluZy5vcmlnaW5hbFNlZ21lbnQuY29sdW1uLFxuICAgICAgXTtcbiAgICAgIGlmIChtYXBwaW5nLm5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zdCBuYW1lSW5kZXggPSBuYW1lcy5hZGQobWFwcGluZy5uYW1lKTtcbiAgICAgICAgbWFwcGluZ0FycmF5LnB1c2gobmFtZUluZGV4KTtcbiAgICAgIH1cblxuICAgICAgLy8gRW5zdXJlIGEgbWFwcGluZyBsaW5lIGFycmF5IGZvciB0aGlzIG1hcHBpbmcuXG4gICAgICBjb25zdCBsaW5lID0gbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmxpbmU7XG4gICAgICB3aGlsZSAobGluZSA+PSBtYXBwaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgbWFwcGluZ3MucHVzaChbXSk7XG4gICAgICB9XG4gICAgICAvLyBBZGQgdGhpcyBtYXBwaW5nIHRvIHRoZSBsaW5lXG4gICAgICBtYXBwaW5nc1tsaW5lXS5wdXNoKG1hcHBpbmdBcnJheSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc291cmNlTWFwOiBSYXdTb3VyY2VNYXAgPSB7XG4gICAgICB2ZXJzaW9uOiAzLFxuICAgICAgZmlsZTogdGhpcy5mcy5yZWxhdGl2ZShzb3VyY2VQYXRoRGlyLCB0aGlzLnNvdXJjZVBhdGgpLFxuICAgICAgc291cmNlczogc291cmNlcy5rZXlzLFxuICAgICAgbmFtZXM6IG5hbWVzLnZhbHVlcyxcbiAgICAgIG1hcHBpbmdzOiBlbmNvZGUobWFwcGluZ3MpLFxuICAgICAgc291cmNlc0NvbnRlbnQ6IHNvdXJjZXMudmFsdWVzLFxuICAgIH07XG4gICAgcmV0dXJuIHNvdXJjZU1hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kIHRoZSBvcmlnaW5hbCBtYXBwZWQgbG9jYXRpb24gZm9yIHRoZSBnaXZlbiBgbGluZWAgYW5kIGBjb2x1bW5gIGluIHRoZSBnZW5lcmF0ZWQgZmlsZS5cbiAgICpcbiAgICogRmlyc3Qgd2Ugc2VhcmNoIGZvciBhIG1hcHBpbmcgd2hvc2UgZ2VuZXJhdGVkIHNlZ21lbnQgaXMgYXQgb3IgZGlyZWN0bHkgYmVmb3JlIHRoZSBnaXZlblxuICAgKiBsb2NhdGlvbi4gVGhlbiB3ZSBjb21wdXRlIHRoZSBvZmZzZXQgYmV0d2VlbiB0aGUgZ2l2ZW4gbG9jYXRpb24gYW5kIHRoZSBtYXRjaGluZyBnZW5lcmF0ZWRcbiAgICogc2VnbWVudC4gRmluYWxseSB3ZSBhcHBseSB0aGlzIG9mZnNldCB0byB0aGUgb3JpZ2luYWwgc291cmNlIHNlZ21lbnQgdG8gZ2V0IHRoZSBkZXNpcmVkXG4gICAqIG9yaWdpbmFsIGxvY2F0aW9uLlxuICAgKi9cbiAgZ2V0T3JpZ2luYWxMb2NhdGlvbihsaW5lOiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTpcbiAgICAgIHtmaWxlOiBBYnNvbHV0ZUZzUGF0aCwgbGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcn18bnVsbCB7XG4gICAgaWYgKHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBsZXQgcG9zaXRpb246IG51bWJlcjtcbiAgICBpZiAobGluZSA8IHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnMubGVuZ3RoKSB7XG4gICAgICBwb3NpdGlvbiA9IHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnNbbGluZV0gKyBjb2x1bW47XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRoZSBsaW5lIGlzIG9mZiB0aGUgZW5kIG9mIHRoZSBmaWxlLCBzbyBqdXN0IGFzc3VtZSB3ZSBhcmUgYXQgdGhlIGVuZCBvZiB0aGUgZmlsZS5cbiAgICAgIHBvc2l0aW9uID0gdGhpcy5jb250ZW50cy5sZW5ndGg7XG4gICAgfVxuXG4gICAgY29uc3QgbG9jYXRpb25TZWdtZW50OiBTZWdtZW50TWFya2VyID0ge2xpbmUsIGNvbHVtbiwgcG9zaXRpb24sIG5leHQ6IHVuZGVmaW5lZH07XG5cbiAgICBsZXQgbWFwcGluZ0luZGV4ID1cbiAgICAgICAgZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUodGhpcy5mbGF0dGVuZWRNYXBwaW5ncywgbG9jYXRpb25TZWdtZW50LCBmYWxzZSwgMCk7XG4gICAgaWYgKG1hcHBpbmdJbmRleCA8IDApIHtcbiAgICAgIG1hcHBpbmdJbmRleCA9IDA7XG4gICAgfVxuICAgIGNvbnN0IHtvcmlnaW5hbFNlZ21lbnQsIG9yaWdpbmFsU291cmNlLCBnZW5lcmF0ZWRTZWdtZW50fSA9XG4gICAgICAgIHRoaXMuZmxhdHRlbmVkTWFwcGluZ3NbbWFwcGluZ0luZGV4XTtcbiAgICBjb25zdCBvZmZzZXQgPSBsb2NhdGlvblNlZ21lbnQucG9zaXRpb24gLSBnZW5lcmF0ZWRTZWdtZW50LnBvc2l0aW9uO1xuICAgIGNvbnN0IG9mZnNldE9yaWdpbmFsU2VnbWVudCA9XG4gICAgICAgIG9mZnNldFNlZ21lbnQob3JpZ2luYWxTb3VyY2Uuc3RhcnRPZkxpbmVQb3NpdGlvbnMsIG9yaWdpbmFsU2VnbWVudCwgb2Zmc2V0KTtcblxuICAgIHJldHVybiB7XG4gICAgICBmaWxlOiBvcmlnaW5hbFNvdXJjZS5zb3VyY2VQYXRoLFxuICAgICAgbGluZTogb2Zmc2V0T3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICBjb2x1bW46IG9mZnNldE9yaWdpbmFsU2VnbWVudC5jb2x1bW4sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGbGF0dGVuIHRoZSBwYXJzZWQgbWFwcGluZ3MgZm9yIHRoaXMgc291cmNlIGZpbGUsIHNvIHRoYXQgYWxsIHRoZSBtYXBwaW5ncyBhcmUgdG8gcHVyZSBvcmlnaW5hbFxuICAgKiBzb3VyY2UgZmlsZXMgd2l0aCBubyB0cmFuc2l0aXZlIHNvdXJjZSBtYXBzLlxuICAgKi9cbiAgcHJpdmF0ZSBmbGF0dGVuTWFwcGluZ3MoKTogTWFwcGluZ1tdIHtcbiAgICBjb25zdCBtYXBwaW5ncyA9XG4gICAgICAgIHBhcnNlTWFwcGluZ3ModGhpcy5yYXdNYXAgJiYgdGhpcy5yYXdNYXAubWFwLCB0aGlzLnNvdXJjZXMsIHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnMpO1xuICAgIGVuc3VyZU9yaWdpbmFsU2VnbWVudExpbmtzKG1hcHBpbmdzKTtcbiAgICBjb25zdCBmbGF0dGVuZWRNYXBwaW5nczogTWFwcGluZ1tdID0gW107XG4gICAgZm9yIChsZXQgbWFwcGluZ0luZGV4ID0gMDsgbWFwcGluZ0luZGV4IDwgbWFwcGluZ3MubGVuZ3RoOyBtYXBwaW5nSW5kZXgrKykge1xuICAgICAgY29uc3QgYVRvQm1hcHBpbmcgPSBtYXBwaW5nc1ttYXBwaW5nSW5kZXhdO1xuICAgICAgY29uc3QgYlNvdXJjZSA9IGFUb0JtYXBwaW5nLm9yaWdpbmFsU291cmNlO1xuICAgICAgaWYgKGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoZSBiIHNvdXJjZSBmaWxlIGhhcyBubyBtYXBwaW5ncyBvZiBpdHMgb3duIChpLmUuIGl0IGlzIGEgcHVyZSBvcmlnaW5hbCBmaWxlKVxuICAgICAgICAvLyBzbyBqdXN0IHVzZSB0aGUgbWFwcGluZyBhcy1pcy5cbiAgICAgICAgZmxhdHRlbmVkTWFwcGluZ3MucHVzaChhVG9CbWFwcGluZyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgYGluY29taW5nU3RhcnRgIGFuZCBgaW5jb21pbmdFbmRgIGFyZSB0aGUgYFNlZ21lbnRNYXJrZXJgcyBpbiBgQmAgdGhhdCByZXByZXNlbnQgdGhlXG4gICAgICAvLyBzZWN0aW9uIG9mIGBCYCBzb3VyY2UgZmlsZSB0aGF0IGlzIGJlaW5nIG1hcHBlZCB0byBieSB0aGUgY3VycmVudCBgYVRvQm1hcHBpbmdgLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgbWFwcGluZ3MgZnJvbSBBIHRvIEI6XG4gICAgICAvL1xuICAgICAgLy8gc3JjIEEgICBzcmMgQiAgICAgbWFwcGluZ1xuICAgICAgLy9cbiAgICAgIC8vICAgYSAtLS0tLSBhICAgICAgIFswLCAwXVxuICAgICAgLy8gICBiICAgICAgIGJcbiAgICAgIC8vICAgZiAtICAvLSBjICAgICAgIFs0LCAyXVxuICAgICAgLy8gICBnICBcXCAvICBkXG4gICAgICAvLyAgIGMgLS9cXCAgIGVcbiAgICAgIC8vICAgZCAgICBcXC0gZiAgICAgICBbMiwgNV1cbiAgICAgIC8vICAgZVxuICAgICAgLy9cbiAgICAgIC8vIEZvciBtYXBwaW5nIFswLDBdIHRoZSBpbmNvbWluZyBzdGFydCBhbmQgZW5kIGFyZSAwIGFuZCAyIChpLmUuIHRoZSByYW5nZSBhLCBiLCBjKVxuICAgICAgLy8gRm9yIG1hcHBpbmcgWzQsMl0gdGhlIGluY29taW5nIHN0YXJ0IGFuZCBlbmQgYXJlIDIgYW5kIDUgKGkuZS4gdGhlIHJhbmdlIGMsIGQsIGUsIGYpXG4gICAgICAvL1xuICAgICAgY29uc3QgaW5jb21pbmdTdGFydCA9IGFUb0JtYXBwaW5nLm9yaWdpbmFsU2VnbWVudDtcbiAgICAgIGNvbnN0IGluY29taW5nRW5kID0gaW5jb21pbmdTdGFydC5uZXh0O1xuXG4gICAgICAvLyBUaGUgYG91dGdvaW5nU3RhcnRJbmRleGAgYW5kIGBvdXRnb2luZ0VuZEluZGV4YCBhcmUgdGhlIGluZGljZXMgb2YgdGhlIHJhbmdlIG9mIG1hcHBpbmdzXG4gICAgICAvLyB0aGF0IGxlYXZlIGBiYCB0aGF0IHdlIGFyZSBpbnRlcmVzdGVkIGluIG1lcmdpbmcgd2l0aCB0aGUgYVRvQm1hcHBpbmcuXG4gICAgICAvLyBXZSBhY3R1YWxseSBjYXJlIGFib3V0IGFsbCB0aGUgbWFya2VycyBmcm9tIHRoZSBsYXN0IGJUb0NtYXBwaW5nIGRpcmVjdGx5IGJlZm9yZSB0aGVcbiAgICAgIC8vIGBpbmNvbWluZ1N0YXJ0YCB0byB0aGUgbGFzdCBiVG9DbWFwaW5nIGRpcmVjdGx5IGJlZm9yZSB0aGUgYGluY29taW5nRW5kYCwgaW5jbHVzaXZlLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciBleGFtcGxlLCBpZiB3ZSBjb25zaWRlciB0aGUgcmFuZ2UgMiB0byA1IGZyb20gYWJvdmUgKGkuZS4gYywgZCwgZSwgZikgd2l0aCB0aGVcbiAgICAgIC8vIGZvbGxvd2luZyBtYXBwaW5ncyBmcm9tIEIgdG8gQzpcbiAgICAgIC8vXG4gICAgICAvLyAgIHNyYyBCICAgc3JjIEMgICAgIG1hcHBpbmdcbiAgICAgIC8vICAgICBhXG4gICAgICAvLyAgICAgYiAtLS0tLSBiICAgICAgIFsxLCAwXVxuICAgICAgLy8gICAtIGMgICAgICAgY1xuICAgICAgLy8gIHwgIGQgICAgICAgZFxuICAgICAgLy8gIHwgIGUgLS0tLS0gMSAgICAgICBbNCwgM11cbiAgICAgIC8vICAgLSBmICBcXCAgICAyXG4gICAgICAvLyAgICAgICAgIFxcICAgM1xuICAgICAgLy8gICAgICAgICAgXFwtIGUgICAgICAgWzQsIDZdXG4gICAgICAvL1xuICAgICAgLy8gVGhlIHJhbmdlIHdpdGggYGluY29taW5nU3RhcnRgIGF0IDIgYW5kIGBpbmNvbWluZ0VuZGAgYXQgNSBoYXMgb3V0Z29pbmcgc3RhcnQgbWFwcGluZyBvZlxuICAgICAgLy8gWzEsMF0gYW5kIG91dGdvaW5nIGVuZCBtYXBwaW5nIG9mIFs0LCA2XSwgd2hpY2ggYWxzbyBpbmNsdWRlcyBbNCwgM10uXG4gICAgICAvL1xuICAgICAgbGV0IG91dGdvaW5nU3RhcnRJbmRleCA9XG4gICAgICAgICAgZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUoYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncywgaW5jb21pbmdTdGFydCwgZmFsc2UsIDApO1xuICAgICAgaWYgKG91dGdvaW5nU3RhcnRJbmRleCA8IDApIHtcbiAgICAgICAgb3V0Z29pbmdTdGFydEluZGV4ID0gMDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG91dGdvaW5nRW5kSW5kZXggPSBpbmNvbWluZ0VuZCAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgICBmaW5kTGFzdE1hcHBpbmdJbmRleEJlZm9yZShcbiAgICAgICAgICAgICAgYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncywgaW5jb21pbmdFbmQsIHRydWUsIG91dGdvaW5nU3RhcnRJbmRleCkgOlxuICAgICAgICAgIGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoIC0gMTtcblxuICAgICAgZm9yIChsZXQgYlRvQ21hcHBpbmdJbmRleCA9IG91dGdvaW5nU3RhcnRJbmRleDsgYlRvQ21hcHBpbmdJbmRleCA8PSBvdXRnb2luZ0VuZEluZGV4O1xuICAgICAgICAgICBiVG9DbWFwcGluZ0luZGV4KyspIHtcbiAgICAgICAgY29uc3QgYlRvQ21hcHBpbmc6IE1hcHBpbmcgPSBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzW2JUb0NtYXBwaW5nSW5kZXhdO1xuICAgICAgICBmbGF0dGVuZWRNYXBwaW5ncy5wdXNoKG1lcmdlTWFwcGluZ3ModGhpcywgYVRvQm1hcHBpbmcsIGJUb0NtYXBwaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmbGF0dGVuZWRNYXBwaW5ncztcbiAgfVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gbWFwcGluZ3MgVGhlIGNvbGxlY3Rpb24gb2YgbWFwcGluZ3Mgd2hvc2Ugc2VnbWVudC1tYXJrZXJzIHdlIGFyZSBzZWFyY2hpbmcuXG4gKiBAcGFyYW0gbWFya2VyIFRoZSBzZWdtZW50LW1hcmtlciB0byBtYXRjaCBhZ2FpbnN0IHRob3NlIG9mIHRoZSBnaXZlbiBgbWFwcGluZ3NgLlxuICogQHBhcmFtIGV4Y2x1c2l2ZSBJZiBleGNsdXNpdmUgdGhlbiB3ZSBtdXN0IGZpbmQgYSBtYXBwaW5nIHdpdGggYSBzZWdtZW50LW1hcmtlciB0aGF0IGlzXG4gKiBleGNsdXNpdmVseSBlYXJsaWVyIHRoYW4gdGhlIGdpdmVuIGBtYXJrZXJgLlxuICogSWYgbm90IGV4Y2x1c2l2ZSB0aGVuIHdlIGNhbiByZXR1cm4gdGhlIGhpZ2hlc3QgbWFwcGluZ3Mgd2l0aCBhbiBlcXVpdmFsZW50IHNlZ21lbnQtbWFya2VyIHRvIHRoZVxuICogZ2l2ZW4gYG1hcmtlcmAuXG4gKiBAcGFyYW0gbG93ZXJJbmRleCBJZiBwcm92aWRlZCwgdGhpcyBpcyB1c2VkIGFzIGEgaGludCB0aGF0IHRoZSBtYXJrZXIgd2UgYXJlIHNlYXJjaGluZyBmb3IgaGFzIGFuXG4gKiBpbmRleCB0aGF0IGlzIG5vIGxvd2VyIHRoYW4gdGhpcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKFxuICAgIG1hcHBpbmdzOiBNYXBwaW5nW10sIG1hcmtlcjogU2VnbWVudE1hcmtlciwgZXhjbHVzaXZlOiBib29sZWFuLCBsb3dlckluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICBsZXQgdXBwZXJJbmRleCA9IG1hcHBpbmdzLmxlbmd0aCAtIDE7XG4gIGNvbnN0IHRlc3QgPSBleGNsdXNpdmUgPyAtMSA6IDA7XG5cbiAgaWYgKGNvbXBhcmVTZWdtZW50cyhtYXBwaW5nc1tsb3dlckluZGV4XS5nZW5lcmF0ZWRTZWdtZW50LCBtYXJrZXIpID4gdGVzdCkge1xuICAgIC8vIEV4aXQgZWFybHkgc2luY2UgdGhlIG1hcmtlciBpcyBvdXRzaWRlIHRoZSBhbGxvd2VkIHJhbmdlIG9mIG1hcHBpbmdzLlxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIGxldCBtYXRjaGluZ0luZGV4ID0gLTE7XG4gIHdoaWxlIChsb3dlckluZGV4IDw9IHVwcGVySW5kZXgpIHtcbiAgICBjb25zdCBpbmRleCA9ICh1cHBlckluZGV4ICsgbG93ZXJJbmRleCkgPj4gMTtcbiAgICBpZiAoY29tcGFyZVNlZ21lbnRzKG1hcHBpbmdzW2luZGV4XS5nZW5lcmF0ZWRTZWdtZW50LCBtYXJrZXIpIDw9IHRlc3QpIHtcbiAgICAgIG1hdGNoaW5nSW5kZXggPSBpbmRleDtcbiAgICAgIGxvd2VySW5kZXggPSBpbmRleCArIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVwcGVySW5kZXggPSBpbmRleCAtIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGluZ0luZGV4O1xufVxuXG4vKipcbiAqIEEgTWFwcGluZyBjb25zaXN0cyBvZiB0d28gc2VnbWVudCBtYXJrZXJzOiBvbmUgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UgYW5kIG9uZSBpbiB0aGUgb3JpZ2luYWxcbiAqIHNvdXJjZSwgd2hpY2ggaW5kaWNhdGUgdGhlIHN0YXJ0IG9mIGVhY2ggc2VnbWVudC4gVGhlIGVuZCBvZiBhIHNlZ21lbnQgaXMgaW5kaWNhdGVkIGJ5IHRoZSBmaXJzdFxuICogc2VnbWVudCBtYXJrZXIgb2YgYW5vdGhlciBtYXBwaW5nIHdob3NlIHN0YXJ0IGlzIGdyZWF0ZXIgb3IgZXF1YWwgdG8gdGhpcyBvbmUuXG4gKlxuICogSXQgbWF5IGFsc28gaW5jbHVkZSBhIG5hbWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZWdtZW50IGJlaW5nIG1hcHBlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXBwaW5nIHtcbiAgcmVhZG9ubHkgZ2VuZXJhdGVkU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgb3JpZ2luYWxTb3VyY2U6IFNvdXJjZUZpbGU7XG4gIHJlYWRvbmx5IG9yaWdpbmFsU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgbmFtZT86IHN0cmluZztcbn1cblxuXG5cbi8qKlxuICogTWVyZ2UgdHdvIG1hcHBpbmdzIHRoYXQgZ28gZnJvbSBBIHRvIEIgYW5kIEIgdG8gQywgdG8gcmVzdWx0IGluIGEgbWFwcGluZyB0aGF0IGdvZXMgZnJvbSBBIHRvIEMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZU1hcHBpbmdzKGdlbmVyYXRlZFNvdXJjZTogU291cmNlRmlsZSwgYWI6IE1hcHBpbmcsIGJjOiBNYXBwaW5nKTogTWFwcGluZyB7XG4gIGNvbnN0IG5hbWUgPSBiYy5uYW1lIHx8IGFiLm5hbWU7XG5cbiAgLy8gV2UgbmVlZCB0byBtb2RpZnkgdGhlIHNlZ21lbnQtbWFya2VycyBvZiB0aGUgbmV3IG1hcHBpbmcgdG8gdGFrZSBpbnRvIGFjY291bnQgdGhlIHNoaWZ0cyB0aGF0XG4gIC8vIG9jY3VyIGR1ZSB0byB0aGUgY29tYmluYXRpb24gb2YgdGhlIHR3byBtYXBwaW5ncy5cbiAgLy8gRm9yIGV4YW1wbGU6XG5cbiAgLy8gKiBTaW1wbGUgbWFwIHdoZXJlIHRoZSBCLT5DIHN0YXJ0cyBhdCB0aGUgc2FtZSBwbGFjZSB0aGUgQS0+QiBlbmRzOlxuICAvL1xuICAvLyBgYGBcbiAgLy8gQTogMSAyIGIgYyBkXG4gIC8vICAgICAgICB8ICAgICAgICBBLT5CIFsyLDBdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICB8XG4gIC8vIEI6ICAgICBiIGMgZCAgICBBLT5DIFsyLDFdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICAgIHxcbiAgLy8gICAgICAgIHwgICAgICAgIEItPkMgWzAsMV1cbiAgLy8gQzogICBhIGIgYyBkIGVcbiAgLy8gYGBgXG5cbiAgLy8gKiBNb3JlIGNvbXBsaWNhdGVkIGNhc2Ugd2hlcmUgZGlmZnMgb2Ygc2VnbWVudC1tYXJrZXJzIGlzIG5lZWRlZDpcbiAgLy9cbiAgLy8gYGBgXG4gIC8vIEE6IGIgMSAyIGMgZFxuICAvLyAgICAgXFxcbiAgLy8gICAgICB8ICAgICAgICAgICAgQS0+QiAgWzAsMSpdICAgIFswLDEqXVxuICAvLyAgICAgIHwgICAgICAgICAgICAgICAgICAgfCAgICAgICAgIHwrM1xuICAvLyBCOiBhIGIgMSAyIGMgZCAgICBBLT5DICBbMCwxXSAgICAgWzMsMl1cbiAgLy8gICAgfCAgICAgIC8gICAgICAgICAgICAgICAgfCsxICAgICAgIHxcbiAgLy8gICAgfCAgICAgLyAgICAgICAgQi0+QyBbMCosMF0gICAgWzQqLDJdXG4gIC8vICAgIHwgICAgL1xuICAvLyBDOiBhIGIgYyBkIGVcbiAgLy8gYGBgXG4gIC8vXG4gIC8vIGBbMCwxXWAgbWFwcGluZyBmcm9tIEEtPkM6XG4gIC8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiBvZiBBLT5CICgxKikgYW5kIHRoZSBcImdlbmVyYXRlZFxuICAvLyBzZWdtZW50LW1hcmtlciBvZiBCLT5DICgwKik6IGAxIC0gMCA9ICsxYC5cbiAgLy8gU2luY2UgaXQgaXMgcG9zaXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiB3aXRoIGAxYCB0byBnaXZlIFswLDFdLlxuICAvL1xuICAvLyBgWzMsMl1gIG1hcHBpbmcgZnJvbSBBLT5DOlxuICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgb2YgQS0+QiAoMSopIGFuZCB0aGUgXCJnZW5lcmF0ZWRcbiAgLy8gc2VnbWVudC1tYXJrZXJcIiBvZiBCLT5DICg0Kik6IGAxIC0gNCA9IC0zYC5cbiAgLy8gU2luY2UgaXQgaXMgbmVnYXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwiZ2VuZXJhdGVkIHNlZ21lbnQtbWFya2VyXCIgd2l0aCBgM2AgdG8gZ2l2ZSBbMywyXS5cblxuICBjb25zdCBkaWZmID0gY29tcGFyZVNlZ21lbnRzKGJjLmdlbmVyYXRlZFNlZ21lbnQsIGFiLm9yaWdpbmFsU2VnbWVudCk7XG4gIGlmIChkaWZmID4gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGdlbmVyYXRlZFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9ucywgYWIuZ2VuZXJhdGVkU2VnbWVudCwgZGlmZiksXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6IGJjLm9yaWdpbmFsU2VnbWVudCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDogYWIuZ2VuZXJhdGVkU2VnbWVudCxcbiAgICAgIG9yaWdpbmFsU291cmNlOiBiYy5vcmlnaW5hbFNvdXJjZSxcbiAgICAgIG9yaWdpbmFsU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGJjLm9yaWdpbmFsU291cmNlLnN0YXJ0T2ZMaW5lUG9zaXRpb25zLCBiYy5vcmlnaW5hbFNlZ21lbnQsIC1kaWZmKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGByYXdNYXBwaW5nc2AgaW50byBhbiBhcnJheSBvZiBwYXJzZWQgbWFwcGluZ3MsIHdoaWNoIHJlZmVyZW5jZSBzb3VyY2UtZmlsZXMgcHJvdmlkZWRcbiAqIGluIHRoZSBgc291cmNlc2AgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNYXBwaW5ncyhcbiAgICByYXdNYXA6IFJhd1NvdXJjZU1hcHxudWxsLCBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdLFxuICAgIGdlbmVyYXRlZFNvdXJjZVN0YXJ0T2ZMaW5lUG9zaXRpb25zOiBudW1iZXJbXSk6IE1hcHBpbmdbXSB7XG4gIGlmIChyYXdNYXAgPT09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCByYXdNYXBwaW5ncyA9IGRlY29kZShyYXdNYXAubWFwcGluZ3MpO1xuICBpZiAocmF3TWFwcGluZ3MgPT09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBtYXBwaW5nczogTWFwcGluZ1tdID0gW107XG4gIGZvciAobGV0IGdlbmVyYXRlZExpbmUgPSAwOyBnZW5lcmF0ZWRMaW5lIDwgcmF3TWFwcGluZ3MubGVuZ3RoOyBnZW5lcmF0ZWRMaW5lKyspIHtcbiAgICBjb25zdCBnZW5lcmF0ZWRMaW5lTWFwcGluZ3MgPSByYXdNYXBwaW5nc1tnZW5lcmF0ZWRMaW5lXTtcbiAgICBmb3IgKGNvbnN0IHJhd01hcHBpbmcgb2YgZ2VuZXJhdGVkTGluZU1hcHBpbmdzKSB7XG4gICAgICBpZiAocmF3TWFwcGluZy5sZW5ndGggPj0gNCkge1xuICAgICAgICBjb25zdCBvcmlnaW5hbFNvdXJjZSA9IHNvdXJjZXNbcmF3TWFwcGluZ1sxXSFdO1xuICAgICAgICBpZiAob3JpZ2luYWxTb3VyY2UgPT09IG51bGwgfHwgb3JpZ2luYWxTb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIHRoZSBvcmlnaW5hbCBzb3VyY2UgaXMgbWlzc2luZyBzbyBpZ25vcmUgdGhpcyBtYXBwaW5nXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkQ29sdW1uID0gcmF3TWFwcGluZ1swXTtcbiAgICAgICAgY29uc3QgbmFtZSA9IHJhd01hcHBpbmcubGVuZ3RoID09PSA1ID8gcmF3TWFwLm5hbWVzW3Jhd01hcHBpbmdbNF1dIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBsaW5lID0gcmF3TWFwcGluZ1syXSE7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IHJhd01hcHBpbmdbM10hO1xuICAgICAgICBjb25zdCBnZW5lcmF0ZWRTZWdtZW50OiBTZWdtZW50TWFya2VyID0ge1xuICAgICAgICAgIGxpbmU6IGdlbmVyYXRlZExpbmUsXG4gICAgICAgICAgY29sdW1uOiBnZW5lcmF0ZWRDb2x1bW4sXG4gICAgICAgICAgcG9zaXRpb246IGdlbmVyYXRlZFNvdXJjZVN0YXJ0T2ZMaW5lUG9zaXRpb25zW2dlbmVyYXRlZExpbmVdICsgZ2VuZXJhdGVkQ29sdW1uLFxuICAgICAgICAgIG5leHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTZWdtZW50OiBTZWdtZW50TWFya2VyID0ge1xuICAgICAgICAgIGxpbmUsXG4gICAgICAgICAgY29sdW1uLFxuICAgICAgICAgIHBvc2l0aW9uOiBvcmlnaW5hbFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9uc1tsaW5lXSArIGNvbHVtbixcbiAgICAgICAgICBuZXh0OiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIG1hcHBpbmdzLnB1c2goe25hbWUsIGdlbmVyYXRlZFNlZ21lbnQsIG9yaWdpbmFsU2VnbWVudCwgb3JpZ2luYWxTb3VyY2V9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hcHBpbmdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGhlIHNlZ21lbnQgbWFya2VycyBmcm9tIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMgaW4gZWFjaCBtYXBwaW5nIG9mIGFuIGFycmF5IG9mXG4gKiBgbWFwcGluZ3NgLlxuICpcbiAqIEBwYXJhbSBtYXBwaW5ncyBUaGUgbWFwcGluZ3Mgd2hvc2Ugb3JpZ2luYWwgc2VnbWVudHMgd2Ugd2FudCB0byBleHRyYWN0XG4gKiBAcmV0dXJucyBSZXR1cm4gYSBtYXAgZnJvbSBvcmlnaW5hbCBzb3VyY2UtZmlsZXMgKHJlZmVyZW5jZWQgaW4gdGhlIGBtYXBwaW5nc2ApIHRvIGFycmF5cyBvZlxuICogc2VnbWVudC1tYXJrZXJzIHNvcnRlZCBieSB0aGVpciBvcmRlciBpbiB0aGVpciBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RPcmlnaW5hbFNlZ21lbnRzKG1hcHBpbmdzOiBNYXBwaW5nW10pOiBNYXA8U291cmNlRmlsZSwgU2VnbWVudE1hcmtlcltdPiB7XG4gIGNvbnN0IG9yaWdpbmFsU2VnbWVudHMgPSBuZXcgTWFwPFNvdXJjZUZpbGUsIFNlZ21lbnRNYXJrZXJbXT4oKTtcbiAgZm9yIChjb25zdCBtYXBwaW5nIG9mIG1hcHBpbmdzKSB7XG4gICAgY29uc3Qgb3JpZ2luYWxTb3VyY2UgPSBtYXBwaW5nLm9yaWdpbmFsU291cmNlO1xuICAgIGlmICghb3JpZ2luYWxTZWdtZW50cy5oYXMob3JpZ2luYWxTb3VyY2UpKSB7XG4gICAgICBvcmlnaW5hbFNlZ21lbnRzLnNldChvcmlnaW5hbFNvdXJjZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50cyA9IG9yaWdpbmFsU2VnbWVudHMuZ2V0KG9yaWdpbmFsU291cmNlKSE7XG4gICAgc2VnbWVudHMucHVzaChtYXBwaW5nLm9yaWdpbmFsU2VnbWVudCk7XG4gIH1cbiAgb3JpZ2luYWxTZWdtZW50cy5mb3JFYWNoKHNlZ21lbnRNYXJrZXJzID0+IHNlZ21lbnRNYXJrZXJzLnNvcnQoY29tcGFyZVNlZ21lbnRzKSk7XG4gIHJldHVybiBvcmlnaW5hbFNlZ21lbnRzO1xufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgb3JpZ2luYWwgc2VnbWVudHMgb2YgZWFjaCBvZiB0aGUgZ2l2ZW4gYG1hcHBpbmdzYCB0byBpbmNsdWRlIGEgbGluayB0byB0aGUgbmV4dFxuICogc2VnbWVudCBpbiB0aGUgc291cmNlIGZpbGUuXG4gKlxuICogQHBhcmFtIG1hcHBpbmdzIHRoZSBtYXBwaW5ncyB3aG9zZSBzZWdtZW50cyBzaG91bGQgYmUgdXBkYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT3JpZ2luYWxTZWdtZW50TGlua3MobWFwcGluZ3M6IE1hcHBpbmdbXSk6IHZvaWQge1xuICBjb25zdCBzZWdtZW50c0J5U291cmNlID0gZXh0cmFjdE9yaWdpbmFsU2VnbWVudHMobWFwcGluZ3MpO1xuICBzZWdtZW50c0J5U291cmNlLmZvckVhY2gobWFya2VycyA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXJrZXJzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgbWFya2Vyc1tpXS5uZXh0ID0gbWFya2Vyc1tpICsgMV07XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTdGFydE9mTGluZVBvc2l0aW9ucyhzdHI6IHN0cmluZykge1xuICAvLyBUaGUgYDFgIGlzIHRvIGluZGljYXRlIGEgbmV3bGluZSBjaGFyYWN0ZXIgYmV0d2VlbiB0aGUgbGluZXMuXG4gIC8vIE5vdGUgdGhhdCBpbiB0aGUgYWN0dWFsIGNvbnRlbnRzIHRoZXJlIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmUgY2hhcmFjdGVyIHRoYXQgaW5kaWNhdGVzIGFcbiAgLy8gbmV3bGluZVxuICAvLyAtIGUuZy4gXFxyXFxuIC0gYnV0IHRoYXQgaXMgbm90IGltcG9ydGFudCBoZXJlIHNpbmNlIHNlZ21lbnQtbWFya2VycyBhcmUgaW4gbGluZS9jb2x1bW4gcGFpcnMgYW5kXG4gIC8vIHNvIGRpZmZlcmVuY2VzIGluIGxlbmd0aCBkdWUgdG8gZXh0cmEgYFxccmAgY2hhcmFjdGVycyBkbyBub3QgYWZmZWN0IHRoZSBhbGdvcml0aG1zLlxuICBjb25zdCBORVdMSU5FX01BUktFUl9PRkZTRVQgPSAxO1xuICBjb25zdCBsaW5lTGVuZ3RocyA9IGNvbXB1dGVMaW5lTGVuZ3RocyhzdHIpO1xuICBjb25zdCBzdGFydFBvc2l0aW9ucyA9IFswXTsgIC8vIEZpcnN0IGxpbmUgc3RhcnRzIGF0IHBvc2l0aW9uIDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lTGVuZ3Rocy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICBzdGFydFBvc2l0aW9ucy5wdXNoKHN0YXJ0UG9zaXRpb25zW2ldICsgbGluZUxlbmd0aHNbaV0gKyBORVdMSU5FX01BUktFUl9PRkZTRVQpO1xuICB9XG4gIHJldHVybiBzdGFydFBvc2l0aW9ucztcbn1cblxuZnVuY3Rpb24gY29tcHV0ZUxpbmVMZW5ndGhzKHN0cjogc3RyaW5nKTogbnVtYmVyW10ge1xuICByZXR1cm4gKHN0ci5zcGxpdCgvXFxuLykpLm1hcChzID0+IHMubGVuZ3RoKTtcbn1cblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgbWFwcGluZ3MgYmV0d2VlbiBga2V5c2AgYW5kIGB2YWx1ZXNgIHN0b3JlZCBpbiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhlIGtleXMgYXJlXG4gKiBmaXJzdCBzZWVuLlxuICpcbiAqIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcyBhbmQgYSBzdGFuZGFyZCBgTWFwYCBpcyB0aGF0IHdoZW4geW91IGFkZCBhIGtleS12YWx1ZSBwYWlyIHRoZSBpbmRleFxuICogb2YgdGhlIGBrZXlgIGlzIHJldHVybmVkLlxuICovXG5jbGFzcyBJbmRleGVkTWFwPEssIFY+IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPEssIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogQW4gYXJyYXkgb2Yga2V5cyBhZGRlZCB0byB0aGlzIG1hcC5cbiAgICpcbiAgICogVGhpcyBhcnJheSBpcyBndWFyYW50ZWVkIHRvIGJlIGluIHRoZSBvcmRlciBvZiB0aGUgZmlyc3QgdGltZSB0aGUga2V5IHdhcyBhZGRlZCB0byB0aGUgbWFwLlxuICAgKi9cbiAgcmVhZG9ubHkga2V5czogS1tdID0gW107XG5cbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIHZhbHVlcyBhZGRlZCB0byB0aGlzIG1hcC5cbiAgICpcbiAgICogVGhpcyBhcnJheSBpcyBndWFyYW50ZWVkIHRvIGJlIGluIHRoZSBvcmRlciBvZiB0aGUgZmlyc3QgdGltZSB0aGUgYXNzb2NpYXRlZCBrZXkgd2FzIGFkZGVkIHRvXG4gICAqIHRoZSBtYXAuXG4gICAqL1xuICByZWFkb25seSB2YWx1ZXM6IFZbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBBc3NvY2lhdGUgdGhlIGB2YWx1ZWAgd2l0aCB0aGUgYGtleWAgYW5kIHJldHVybiB0aGUgaW5kZXggb2YgdGhlIGtleSBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogSWYgdGhlIGBrZXlgIGFscmVhZHkgZXhpc3RzIHRoZW4gdGhlIGB2YWx1ZWAgaXMgbm90IHNldCBhbmQgdGhlIGluZGV4IG9mIHRoYXQgYGtleWAgaXNcbiAgICogcmV0dXJuZWQ7IG90aGVyd2lzZSB0aGUgYGtleWAgYW5kIGB2YWx1ZWAgYXJlIHN0b3JlZCBhbmQgdGhlIGluZGV4IG9mIHRoZSBuZXcgYGtleWAgaXNcbiAgICogcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBrZXkgdGhlIGtleSB0byBhc3NvY2lhdGVkIHdpdGggdGhlIGB2YWx1ZWAuXG4gICAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYXNzb2NpYXRlZCB3aXRoIHRoZSBga2V5YC5cbiAgICogQHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBga2V5YCBpbiB0aGUgYGtleXNgIGFycmF5LlxuICAgKi9cbiAgc2V0KGtleTogSywgdmFsdWU6IFYpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLm1hcC5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwLmdldChrZXkpITtcbiAgICB9XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnZhbHVlcy5wdXNoKHZhbHVlKSAtIDE7XG4gICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcbiAgICB0aGlzLm1hcC5zZXQoa2V5LCBpbmRleCk7XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGB2YWx1ZXNgIHN0b3JlZCBpbiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhleSB3ZXJlIGFkZGVkLlxuICpcbiAqIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcyBhbmQgYSBzdGFuZGFyZCBgU2V0YCBpcyB0aGF0IHdoZW4geW91IGFkZCBhIHZhbHVlIHRoZSBpbmRleCBvZiB0aGF0XG4gKiBpdGVtIGlzIHJldHVybmVkLlxuICovXG5jbGFzcyBJbmRleGVkU2V0PFY+IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPFYsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogQW4gYXJyYXkgb2YgdmFsdWVzIGFkZGVkIHRvIHRoaXMgc2V0LlxuICAgKiBUaGlzIGFycmF5IGlzIGd1YXJhbnRlZWQgdG8gYmUgaW4gdGhlIG9yZGVyIG9mIHRoZSBmaXJzdCB0aW1lIHRoZSB2YWx1ZSB3YXMgYWRkZWQgdG8gdGhlIHNldC5cbiAgICovXG4gIHJlYWRvbmx5IHZhbHVlczogVltdID0gW107XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgYHZhbHVlYCB0byB0aGUgYHZhbHVlc2AgYXJyYXksIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdDsgcmV0dXJuaW5nIHRoZSBpbmRleCBvZiB0aGVcbiAgICogYHZhbHVlYCBpbiB0aGUgYHZhbHVlc2AgYXJyYXkuXG4gICAqXG4gICAqIElmIHRoZSBgdmFsdWVgIGFscmVhZHkgZXhpc3RzIHRoZW4gdGhlIGluZGV4IG9mIHRoYXQgYHZhbHVlYCBpcyByZXR1cm5lZCwgb3RoZXJ3aXNlIHRoZSBuZXdcbiAgICogYHZhbHVlYCBpcyBzdG9yZWQgYW5kIHRoZSBuZXcgaW5kZXggcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYWRkIHRvIHRoZSBzZXQuXG4gICAqIEByZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgYHZhbHVlYCBpbiB0aGUgYHZhbHVlc2AgYXJyYXkuXG4gICAqL1xuICBhZGQodmFsdWU6IFYpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLm1hcC5oYXModmFsdWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KHZhbHVlKSE7XG4gICAgfVxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy52YWx1ZXMucHVzaCh2YWx1ZSkgLSAxO1xuICAgIHRoaXMubWFwLnNldCh2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxufVxuXG5jbGFzcyBDYWNoZTxJbnB1dCwgQ2FjaGVkPiB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDxJbnB1dCwgQ2FjaGVkPigpO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbXB1dGVGbjogKGlucHV0OiBJbnB1dCkgPT4gQ2FjaGVkKSB7fVxuICBnZXQoaW5wdXQ6IElucHV0KTogQ2FjaGVkIHtcbiAgICBpZiAoIXRoaXMubWFwLmhhcyhpbnB1dCkpIHtcbiAgICAgIHRoaXMubWFwLnNldChpbnB1dCwgdGhpcy5jb21wdXRlRm4oaW5wdXQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWFwLmdldChpbnB1dCkhO1xuICB9XG59XG4iXX0=