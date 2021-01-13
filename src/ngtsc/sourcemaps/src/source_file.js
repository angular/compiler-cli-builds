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
        sources, fs) {
            this.sourcePath = sourcePath;
            this.contents = contents;
            this.rawMap = rawMap;
            this.inline = inline;
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
                for (var _b = tslib_1.__values(this.flattenedMappings), _c = _b.next(); !_c.done; _c = _b.next()) {
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
                mappings: sourcemap_codec_1.encode(mappings),
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
            var offsetOriginalSegment = segment_marker_1.offsetSegment(originalSource.startOfLinePositions, originalSegment, offset);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic291cmNlX2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3NvdXJjZW1hcHMvc3JjL3NvdXJjZV9maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCx5REFBeUU7SUFDekUsbURBQW9GO0lBS3BGLGdHQUErRTtJQUUvRSxTQUFnQix1QkFBdUIsQ0FBQyxRQUFnQjtRQUN0RCxPQUFPLDBDQUFxQixDQUFDLG1DQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFGRCwwREFFQztJQUVEO1FBV0U7UUFDSSxvQ0FBb0M7UUFDM0IsVUFBMEI7UUFDbkMsd0NBQXdDO1FBQy9CLFFBQWdCO1FBQ3pCLG9FQUFvRTtRQUMzRCxNQUF5QjtRQUNsQyxvRUFBb0U7UUFDM0QsTUFBZTtRQUN4QiwwRkFBMEY7UUFDakYsT0FBNEIsRUFDN0IsRUFBb0I7WUFUbkIsZUFBVSxHQUFWLFVBQVUsQ0FBZ0I7WUFFMUIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtZQUVoQixXQUFNLEdBQU4sTUFBTSxDQUFtQjtZQUV6QixXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRWYsWUFBTyxHQUFQLE9BQU8sQ0FBcUI7WUFDN0IsT0FBRSxHQUFGLEVBQUUsQ0FBa0I7WUFFOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDbEQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsNkNBQXdCLEdBQXhCOztZQUFBLGlCQTJDQztZQTFDQyxJQUFNLE9BQU8sR0FBRyxJQUFJLFVBQVUsRUFBa0IsQ0FBQztZQUNqRCxJQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsRUFBVSxDQUFDO1lBQ3ZDLElBQU0sUUFBUSxHQUFzQixFQUFFLENBQUM7WUFDdkMsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZELDRGQUE0RjtZQUM1RiwrQkFBK0I7WUFDL0IsSUFBTSx1QkFBdUIsR0FDekIsSUFBSSxLQUFLLENBQWlCLFVBQUEsS0FBSyxJQUFJLE9BQUEsS0FBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUF0QyxDQUFzQyxDQUFDLENBQUM7O2dCQUUvRSxLQUFzQixJQUFBLEtBQUEsaUJBQUEsSUFBSSxDQUFDLGlCQUFpQixDQUFBLGdCQUFBLDRCQUFFO29CQUF6QyxJQUFNLE9BQU8sV0FBQTtvQkFDaEIsSUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FDM0IsdUJBQXVCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQzlELE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JDLElBQU0sWUFBWSxHQUFxQjt3QkFDckMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU07d0JBQy9CLFdBQVc7d0JBQ1gsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJO3dCQUM1QixPQUFPLENBQUMsZUFBZSxDQUFDLE1BQU07cUJBQy9CLENBQUM7b0JBQ0YsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTt3QkFDOUIsSUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7cUJBQzlCO29CQUVELGdEQUFnRDtvQkFDaEQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztvQkFDM0MsT0FBTyxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTt3QkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDbkI7b0JBQ0QsK0JBQStCO29CQUMvQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2lCQUNuQzs7Ozs7Ozs7O1lBRUQsSUFBTSxTQUFTLEdBQWlCO2dCQUM5QixPQUFPLEVBQUUsQ0FBQztnQkFDVixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ3RELE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDckIsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNO2dCQUNuQixRQUFRLEVBQUUsd0JBQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQzFCLGNBQWMsRUFBRSxPQUFPLENBQUMsTUFBTTthQUMvQixDQUFDO1lBQ0YsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztRQUVEOzs7Ozs7O1dBT0c7UUFDSCx3Q0FBbUIsR0FBbkIsVUFBb0IsSUFBWSxFQUFFLE1BQWM7WUFFOUMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDdkMsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUVELElBQUksUUFBZ0IsQ0FBQztZQUNyQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFO2dCQUMzQyxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQzthQUNyRDtpQkFBTTtnQkFDTCxxRkFBcUY7Z0JBQ3JGLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQzthQUNqQztZQUVELElBQU0sZUFBZSxHQUFrQixFQUFDLElBQUksTUFBQSxFQUFFLE1BQU0sUUFBQSxFQUFFLFFBQVEsVUFBQSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUMsQ0FBQztZQUVqRixJQUFJLFlBQVksR0FDWiwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNsRixJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUU7Z0JBQ3BCLFlBQVksR0FBRyxDQUFDLENBQUM7YUFDbEI7WUFDSyxJQUFBLEtBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxFQURqQyxlQUFlLHFCQUFBLEVBQUUsY0FBYyxvQkFBQSxFQUFFLGdCQUFnQixzQkFDaEIsQ0FBQztZQUN6QyxJQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsUUFBUSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztZQUNwRSxJQUFNLHFCQUFxQixHQUN2Qiw4QkFBYSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFaEYsT0FBTztnQkFDTCxJQUFJLEVBQUUsY0FBYyxDQUFDLFVBQVU7Z0JBQy9CLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxJQUFJO2dCQUNoQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsTUFBTTthQUNyQyxDQUFDO1FBQ0osQ0FBQztRQUVEOzs7V0FHRztRQUNLLG9DQUFlLEdBQXZCO1lBQ0UsSUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUNyRiwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxJQUFNLGlCQUFpQixHQUFjLEVBQUUsQ0FBQztZQUN4QyxLQUFLLElBQUksWUFBWSxHQUFHLENBQUMsRUFBRSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsRUFBRTtnQkFDekUsSUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUMzQyxJQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDO2dCQUMzQyxJQUFJLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO29CQUMxQyxpRkFBaUY7b0JBQ2pGLGlDQUFpQztvQkFDakMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNwQyxTQUFTO2lCQUNWO2dCQUVELDJGQUEyRjtnQkFDM0YsbUZBQW1GO2dCQUNuRixFQUFFO2dCQUNGLGtEQUFrRDtnQkFDbEQsRUFBRTtnQkFDRiw0QkFBNEI7Z0JBQzVCLEVBQUU7Z0JBQ0YsMkJBQTJCO2dCQUMzQixjQUFjO2dCQUNkLDJCQUEyQjtnQkFDM0IsY0FBYztnQkFDZCxjQUFjO2dCQUNkLDJCQUEyQjtnQkFDM0IsTUFBTTtnQkFDTixFQUFFO2dCQUNGLG9GQUFvRjtnQkFDcEYsdUZBQXVGO2dCQUN2RixFQUFFO2dCQUNGLElBQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUM7Z0JBQ2xELElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUM7Z0JBRXZDLDJGQUEyRjtnQkFDM0YseUVBQXlFO2dCQUN6RSx1RkFBdUY7Z0JBQ3ZGLHVGQUF1RjtnQkFDdkYsRUFBRTtnQkFDRixxRkFBcUY7Z0JBQ3JGLGtDQUFrQztnQkFDbEMsRUFBRTtnQkFDRiw4QkFBOEI7Z0JBQzlCLFFBQVE7Z0JBQ1IsNkJBQTZCO2dCQUM3QixnQkFBZ0I7Z0JBQ2hCLGdCQUFnQjtnQkFDaEIsNkJBQTZCO2dCQUM3QixnQkFBZ0I7Z0JBQ2hCLGdCQUFnQjtnQkFDaEIsNkJBQTZCO2dCQUM3QixFQUFFO2dCQUNGLDJGQUEyRjtnQkFDM0Ysd0VBQXdFO2dCQUN4RSxFQUFFO2dCQUNGLElBQUksa0JBQWtCLEdBQ2xCLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRixJQUFJLGtCQUFrQixHQUFHLENBQUMsRUFBRTtvQkFDMUIsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDO2lCQUN4QjtnQkFDRCxJQUFNLGdCQUFnQixHQUFHLFdBQVcsS0FBSyxTQUFTLENBQUMsQ0FBQztvQkFDaEQsMEJBQTBCLENBQ3RCLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztvQkFDdkUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBRXpDLEtBQUssSUFBSSxnQkFBZ0IsR0FBRyxrQkFBa0IsRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsRUFDL0UsZ0JBQWdCLEVBQUUsRUFBRTtvQkFDdkIsSUFBTSxXQUFXLEdBQVksT0FBTyxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUM7b0JBQ3pFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO2lCQUN2RTthQUNGO1lBQ0QsT0FBTyxpQkFBaUIsQ0FBQztRQUMzQixDQUFDO1FBQ0gsaUJBQUM7SUFBRCxDQUFDLEFBck1ELElBcU1DO0lBck1ZLGdDQUFVO0lBdU12Qjs7Ozs7Ozs7OztPQVVHO0lBQ0gsU0FBZ0IsMEJBQTBCLENBQ3RDLFFBQW1CLEVBQUUsTUFBcUIsRUFBRSxTQUFrQixFQUFFLFVBQWtCO1FBQ3BGLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVoQyxJQUFJLGdDQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRTtZQUN6RSx3RUFBd0U7WUFDeEUsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNYO1FBRUQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkIsT0FBTyxVQUFVLElBQUksVUFBVSxFQUFFO1lBQy9CLElBQU0sS0FBSyxHQUFHLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxJQUFJLGdDQUFlLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRTtnQkFDckUsYUFBYSxHQUFHLEtBQUssQ0FBQztnQkFDdEIsVUFBVSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7YUFDeEI7aUJBQU07Z0JBQ0wsVUFBVSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7YUFDeEI7U0FDRjtRQUNELE9BQU8sYUFBYSxDQUFDO0lBQ3ZCLENBQUM7SUFyQkQsZ0VBcUJDO0lBa0JEOztPQUVHO0lBQ0gsU0FBZ0IsYUFBYSxDQUFDLGVBQTJCLEVBQUUsRUFBVyxFQUFFLEVBQVc7UUFDakYsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO1FBRWhDLGdHQUFnRztRQUNoRyxvREFBb0Q7UUFDcEQsZUFBZTtRQUVmLHNFQUFzRTtRQUN0RSxFQUFFO1FBQ0YsTUFBTTtRQUNOLGVBQWU7UUFDZiw2QkFBNkI7UUFDN0IsMEJBQTBCO1FBQzFCLDZCQUE2QjtRQUM3Qiw0QkFBNEI7UUFDNUIsNkJBQTZCO1FBQzdCLGlCQUFpQjtRQUNqQixNQUFNO1FBRU4sb0VBQW9FO1FBQ3BFLEVBQUU7UUFDRixNQUFNO1FBQ04sZUFBZTtRQUNmLFFBQVE7UUFDUiwyQ0FBMkM7UUFDM0MseUNBQXlDO1FBQ3pDLDBDQUEwQztRQUMxQyx5Q0FBeUM7UUFDekMsMENBQTBDO1FBQzFDLFlBQVk7UUFDWixlQUFlO1FBQ2YsTUFBTTtRQUNOLEVBQUU7UUFDRiw2QkFBNkI7UUFDN0IsdUZBQXVGO1FBQ3ZGLDZDQUE2QztRQUM3QywrRkFBK0Y7UUFDL0YsRUFBRTtRQUNGLDZCQUE2QjtRQUM3Qix1RkFBdUY7UUFDdkYsOENBQThDO1FBQzlDLGdHQUFnRztRQUVoRyxJQUFNLElBQUksR0FBRyxnQ0FBZSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDdEUsSUFBSSxJQUFJLEdBQUcsQ0FBQyxFQUFFO1lBQ1osT0FBTztnQkFDTCxJQUFJLE1BQUE7Z0JBQ0osZ0JBQWdCLEVBQ1osOEJBQWEsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQztnQkFDbEYsY0FBYyxFQUFFLEVBQUUsQ0FBQyxjQUFjO2dCQUNqQyxlQUFlLEVBQUUsRUFBRSxDQUFDLGVBQWU7YUFDcEMsQ0FBQztTQUNIO2FBQU07WUFDTCxPQUFPO2dCQUNMLElBQUksTUFBQTtnQkFDSixnQkFBZ0IsRUFBRSxFQUFFLENBQUMsZ0JBQWdCO2dCQUNyQyxjQUFjLEVBQUUsRUFBRSxDQUFDLGNBQWM7Z0JBQ2pDLGVBQWUsRUFDWCw4QkFBYSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLElBQUksQ0FBQzthQUNyRixDQUFDO1NBQ0g7SUFDSCxDQUFDO0lBN0RELHNDQTZEQztJQUVEOzs7T0FHRztJQUNILFNBQWdCLGFBQWEsQ0FDekIsTUFBeUIsRUFBRSxPQUE0QixFQUN2RCxtQ0FBNkM7O1FBQy9DLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtZQUNuQixPQUFPLEVBQUUsQ0FBQztTQUNYO1FBRUQsSUFBTSxXQUFXLEdBQUcsd0JBQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO1lBQ3hCLE9BQU8sRUFBRSxDQUFDO1NBQ1g7UUFFRCxJQUFNLFFBQVEsR0FBYyxFQUFFLENBQUM7UUFDL0IsS0FBSyxJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsYUFBYSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDL0UsSUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7O2dCQUN6RCxLQUF5QixJQUFBLHlDQUFBLGlCQUFBLHFCQUFxQixDQUFBLENBQUEsNERBQUEsK0ZBQUU7b0JBQTNDLElBQU0sVUFBVSxrQ0FBQTtvQkFDbkIsSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTt3QkFDMUIsSUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDO3dCQUMvQyxJQUFJLGNBQWMsS0FBSyxJQUFJLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRTs0QkFDM0Qsd0RBQXdEOzRCQUN4RCxTQUFTO3lCQUNWO3dCQUNELElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDdEMsSUFBTSxNQUFJLEdBQUcsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQzt3QkFDL0UsSUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBRSxDQUFDO3dCQUM1QixJQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7d0JBQzlCLElBQU0sZ0JBQWdCLEdBQWtCOzRCQUN0QyxJQUFJLEVBQUUsYUFBYTs0QkFDbkIsTUFBTSxFQUFFLGVBQWU7NEJBQ3ZCLFFBQVEsRUFBRSxtQ0FBbUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxlQUFlOzRCQUM5RSxJQUFJLEVBQUUsU0FBUzt5QkFDaEIsQ0FBQzt3QkFDRixJQUFNLGVBQWUsR0FBa0I7NEJBQ3JDLElBQUksTUFBQTs0QkFDSixNQUFNLFFBQUE7NEJBQ04sUUFBUSxFQUFFLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNOzRCQUM1RCxJQUFJLEVBQUUsU0FBUzt5QkFDaEIsQ0FBQzt3QkFDRixRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxRQUFBLEVBQUUsZ0JBQWdCLGtCQUFBLEVBQUUsZUFBZSxpQkFBQSxFQUFFLGNBQWMsZ0JBQUEsRUFBQyxDQUFDLENBQUM7cUJBQzFFO2lCQUNGOzs7Ozs7Ozs7U0FDRjtRQUNELE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUEzQ0Qsc0NBMkNDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLHVCQUF1QixDQUFDLFFBQW1COztRQUN6RCxJQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFDOztZQUNoRSxLQUFzQixJQUFBLGFBQUEsaUJBQUEsUUFBUSxDQUFBLGtDQUFBLHdEQUFFO2dCQUEzQixJQUFNLE9BQU8scUJBQUE7Z0JBQ2hCLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQ3pDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQzFDO2dCQUNELElBQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUUsQ0FBQztnQkFDdkQsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7YUFDeEM7Ozs7Ozs7OztRQUNELGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxVQUFBLGNBQWMsSUFBSSxPQUFBLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0NBQWUsQ0FBQyxFQUFwQyxDQUFvQyxDQUFDLENBQUM7UUFDakYsT0FBTyxnQkFBZ0IsQ0FBQztJQUMxQixDQUFDO0lBWkQsMERBWUM7SUFFRDs7Ozs7T0FLRztJQUNILFNBQWdCLDBCQUEwQixDQUFDLFFBQW1CO1FBQzVELElBQU0sZ0JBQWdCLEdBQUcsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0QsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUEsT0FBTztZQUM5QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUNsQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQVBELGdFQU9DO0lBRUQsU0FBZ0IsMkJBQTJCLENBQUMsR0FBVztRQUNyRCxnRUFBZ0U7UUFDaEUsMkZBQTJGO1FBQzNGLFVBQVU7UUFDVixrR0FBa0c7UUFDbEcsc0ZBQXNGO1FBQ3RGLElBQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFDO1FBQ2hDLElBQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLElBQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxrQ0FBa0M7UUFDL0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9DLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQWJELGtFQWFDO0lBRUQsU0FBUyxrQkFBa0IsQ0FBQyxHQUFXO1FBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLE1BQU0sRUFBUixDQUFRLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0g7UUFBQTtZQUNVLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO1lBRW5DOzs7O2VBSUc7WUFDTSxTQUFJLEdBQVEsRUFBRSxDQUFDO1lBRXhCOzs7OztlQUtHO1lBQ00sV0FBTSxHQUFRLEVBQUUsQ0FBQztRQXNCNUIsQ0FBQztRQXBCQzs7Ozs7Ozs7OztXQVVHO1FBQ0gsd0JBQUcsR0FBSCxVQUFJLEdBQU0sRUFBRSxLQUFRO1lBQ2xCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUM7YUFDM0I7WUFDRCxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNILGlCQUFDO0lBQUQsQ0FBQyxBQXRDRCxJQXNDQztJQUVEOzs7OztPQUtHO0lBQ0g7UUFBQTtZQUNVLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBYSxDQUFDO1lBRW5DOzs7ZUFHRztZQUNNLFdBQU0sR0FBUSxFQUFFLENBQUM7UUFvQjVCLENBQUM7UUFsQkM7Ozs7Ozs7OztXQVNHO1FBQ0gsd0JBQUcsR0FBSCxVQUFJLEtBQVE7WUFDVixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN2QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO2FBQzdCO1lBQ0QsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFDSCxpQkFBQztJQUFELENBQUMsQUEzQkQsSUEyQkM7SUFFRDtRQUVFLGVBQW9CLFNBQW1DO1lBQW5DLGNBQVMsR0FBVCxTQUFTLENBQTBCO1lBRC9DLFFBQUcsR0FBRyxJQUFJLEdBQUcsRUFBaUIsQ0FBQztRQUNtQixDQUFDO1FBQzNELG1CQUFHLEdBQUgsVUFBSSxLQUFZO1lBQ2QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2FBQzVDO1lBQ0QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQztRQUM5QixDQUFDO1FBQ0gsWUFBQztJQUFELENBQUMsQUFURCxJQVNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge3JlbW92ZUNvbW1lbnRzLCByZW1vdmVNYXBGaWxlQ29tbWVudHN9IGZyb20gJ2NvbnZlcnQtc291cmNlLW1hcCc7XG5pbXBvcnQge2RlY29kZSwgZW5jb2RlLCBTb3VyY2VNYXBNYXBwaW5ncywgU291cmNlTWFwU2VnbWVudH0gZnJvbSAnc291cmNlbWFwLWNvZGVjJztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUGF0aE1hbmlwdWxhdGlvbn0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuXG5pbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnLi9yYXdfc291cmNlX21hcCc7XG5pbXBvcnQge2NvbXBhcmVTZWdtZW50cywgb2Zmc2V0U2VnbWVudCwgU2VnbWVudE1hcmtlcn0gZnJvbSAnLi9zZWdtZW50X21hcmtlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVTb3VyY2VNYXBDb21tZW50cyhjb250ZW50czogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlbW92ZU1hcEZpbGVDb21tZW50cyhyZW1vdmVDb21tZW50cyhjb250ZW50cykpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VGaWxlIHtcbiAgLyoqXG4gICAqIFRoZSBwYXJzZWQgbWFwcGluZ3MgdGhhdCBoYXZlIGJlZW4gZmxhdHRlbmVkIHNvIHRoYXQgYW55IGludGVybWVkaWF0ZSBzb3VyY2UgbWFwcGluZ3MgaGF2ZSBiZWVuXG4gICAqIGZsYXR0ZW5lZC5cbiAgICpcbiAgICogVGhlIHJlc3VsdCBpcyB0aGF0IGFueSBzb3VyY2UgZmlsZSBtZW50aW9uZWQgaW4gdGhlIGZsYXR0ZW5lZCBtYXBwaW5ncyBoYXZlIG5vIHNvdXJjZSBtYXAgKGFyZVxuICAgKiBwdXJlIG9yaWdpbmFsIHNvdXJjZSBmaWxlcykuXG4gICAqL1xuICByZWFkb25seSBmbGF0dGVuZWRNYXBwaW5nczogTWFwcGluZ1tdO1xuICByZWFkb25seSBzdGFydE9mTGluZVBvc2l0aW9uczogbnVtYmVyW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICAvKiogVGhlIHBhdGggdG8gdGhpcyBzb3VyY2UgZmlsZS4gKi9cbiAgICAgIHJlYWRvbmx5IHNvdXJjZVBhdGg6IEFic29sdXRlRnNQYXRoLFxuICAgICAgLyoqIFRoZSBjb250ZW50cyBvZiB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgY29udGVudHM6IHN0cmluZyxcbiAgICAgIC8qKiBUaGUgcmF3IHNvdXJjZSBtYXAgKGlmIGFueSkgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc291cmNlIGZpbGUuICovXG4gICAgICByZWFkb25seSByYXdNYXA6IFJhd1NvdXJjZU1hcHxudWxsLFxuICAgICAgLyoqIFdoZXRoZXIgdGhpcyBzb3VyY2UgZmlsZSdzIHNvdXJjZSBtYXAgd2FzIGlubGluZSBvciBleHRlcm5hbC4gKi9cbiAgICAgIHJlYWRvbmx5IGlubGluZTogYm9vbGVhbixcbiAgICAgIC8qKiBBbnkgc291cmNlIGZpbGVzIHJlZmVyZW5jZWQgYnkgdGhlIHJhdyBzb3VyY2UgbWFwIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHNvdXJjZSBmaWxlLiAqL1xuICAgICAgcmVhZG9ubHkgc291cmNlczogKFNvdXJjZUZpbGV8bnVsbClbXSxcbiAgICAgIHByaXZhdGUgZnM6IFBhdGhNYW5pcHVsYXRpb24sXG4gICkge1xuICAgIHRoaXMuY29udGVudHMgPSByZW1vdmVTb3VyY2VNYXBDb21tZW50cyhjb250ZW50cyk7XG4gICAgdGhpcy5zdGFydE9mTGluZVBvc2l0aW9ucyA9IGNvbXB1dGVTdGFydE9mTGluZVBvc2l0aW9ucyh0aGlzLmNvbnRlbnRzKTtcbiAgICB0aGlzLmZsYXR0ZW5lZE1hcHBpbmdzID0gdGhpcy5mbGF0dGVuTWFwcGluZ3MoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHJhdyBzb3VyY2UgbWFwIGdlbmVyYXRlZCBmcm9tIHRoZSBmbGF0dGVuZWQgbWFwcGluZ3MuXG4gICAqL1xuICByZW5kZXJGbGF0dGVuZWRTb3VyY2VNYXAoKTogUmF3U291cmNlTWFwIHtcbiAgICBjb25zdCBzb3VyY2VzID0gbmV3IEluZGV4ZWRNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgY29uc3QgbmFtZXMgPSBuZXcgSW5kZXhlZFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgbWFwcGluZ3M6IFNvdXJjZU1hcE1hcHBpbmdzID0gW107XG4gICAgY29uc3Qgc291cmNlUGF0aERpciA9IHRoaXMuZnMuZGlybmFtZSh0aGlzLnNvdXJjZVBhdGgpO1xuICAgIC8vIENvbXB1dGluZyB0aGUgcmVsYXRpdmUgcGF0aCBjYW4gYmUgZXhwZW5zaXZlLCBhbmQgd2UgYXJlIGxpa2VseSB0byBoYXZlIHRoZSBzYW1lIHBhdGggZm9yXG4gICAgLy8gbWFueSAoaWYgbm90IGFsbCEpIG1hcHBpbmdzLlxuICAgIGNvbnN0IHJlbGF0aXZlU291cmNlUGF0aENhY2hlID1cbiAgICAgICAgbmV3IENhY2hlPHN0cmluZywgc3RyaW5nPihpbnB1dCA9PiB0aGlzLmZzLnJlbGF0aXZlKHNvdXJjZVBhdGhEaXIsIGlucHV0KSk7XG5cbiAgICBmb3IgKGNvbnN0IG1hcHBpbmcgb2YgdGhpcy5mbGF0dGVuZWRNYXBwaW5ncykge1xuICAgICAgY29uc3Qgc291cmNlSW5kZXggPSBzb3VyY2VzLnNldChcbiAgICAgICAgICByZWxhdGl2ZVNvdXJjZVBhdGhDYWNoZS5nZXQobWFwcGluZy5vcmlnaW5hbFNvdXJjZS5zb3VyY2VQYXRoKSxcbiAgICAgICAgICBtYXBwaW5nLm9yaWdpbmFsU291cmNlLmNvbnRlbnRzKTtcbiAgICAgIGNvbnN0IG1hcHBpbmdBcnJheTogU291cmNlTWFwU2VnbWVudCA9IFtcbiAgICAgICAgbWFwcGluZy5nZW5lcmF0ZWRTZWdtZW50LmNvbHVtbixcbiAgICAgICAgc291cmNlSW5kZXgsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmxpbmUsXG4gICAgICAgIG1hcHBpbmcub3JpZ2luYWxTZWdtZW50LmNvbHVtbixcbiAgICAgIF07XG4gICAgICBpZiAobWFwcGluZy5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3QgbmFtZUluZGV4ID0gbmFtZXMuYWRkKG1hcHBpbmcubmFtZSk7XG4gICAgICAgIG1hcHBpbmdBcnJheS5wdXNoKG5hbWVJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSBhIG1hcHBpbmcgbGluZSBhcnJheSBmb3IgdGhpcyBtYXBwaW5nLlxuICAgICAgY29uc3QgbGluZSA9IG1hcHBpbmcuZ2VuZXJhdGVkU2VnbWVudC5saW5lO1xuICAgICAgd2hpbGUgKGxpbmUgPj0gbWFwcGluZ3MubGVuZ3RoKSB7XG4gICAgICAgIG1hcHBpbmdzLnB1c2goW10pO1xuICAgICAgfVxuICAgICAgLy8gQWRkIHRoaXMgbWFwcGluZyB0byB0aGUgbGluZVxuICAgICAgbWFwcGluZ3NbbGluZV0ucHVzaChtYXBwaW5nQXJyYXkpO1xuICAgIH1cblxuICAgIGNvbnN0IHNvdXJjZU1hcDogUmF3U291cmNlTWFwID0ge1xuICAgICAgdmVyc2lvbjogMyxcbiAgICAgIGZpbGU6IHRoaXMuZnMucmVsYXRpdmUoc291cmNlUGF0aERpciwgdGhpcy5zb3VyY2VQYXRoKSxcbiAgICAgIHNvdXJjZXM6IHNvdXJjZXMua2V5cyxcbiAgICAgIG5hbWVzOiBuYW1lcy52YWx1ZXMsXG4gICAgICBtYXBwaW5nczogZW5jb2RlKG1hcHBpbmdzKSxcbiAgICAgIHNvdXJjZXNDb250ZW50OiBzb3VyY2VzLnZhbHVlcyxcbiAgICB9O1xuICAgIHJldHVybiBzb3VyY2VNYXA7XG4gIH1cblxuICAvKipcbiAgICogRmluZCB0aGUgb3JpZ2luYWwgbWFwcGVkIGxvY2F0aW9uIGZvciB0aGUgZ2l2ZW4gYGxpbmVgIGFuZCBgY29sdW1uYCBpbiB0aGUgZ2VuZXJhdGVkIGZpbGUuXG4gICAqXG4gICAqIEZpcnN0IHdlIHNlYXJjaCBmb3IgYSBtYXBwaW5nIHdob3NlIGdlbmVyYXRlZCBzZWdtZW50IGlzIGF0IG9yIGRpcmVjdGx5IGJlZm9yZSB0aGUgZ2l2ZW5cbiAgICogbG9jYXRpb24uIFRoZW4gd2UgY29tcHV0ZSB0aGUgb2Zmc2V0IGJldHdlZW4gdGhlIGdpdmVuIGxvY2F0aW9uIGFuZCB0aGUgbWF0Y2hpbmcgZ2VuZXJhdGVkXG4gICAqIHNlZ21lbnQuIEZpbmFsbHkgd2UgYXBwbHkgdGhpcyBvZmZzZXQgdG8gdGhlIG9yaWdpbmFsIHNvdXJjZSBzZWdtZW50IHRvIGdldCB0aGUgZGVzaXJlZFxuICAgKiBvcmlnaW5hbCBsb2NhdGlvbi5cbiAgICovXG4gIGdldE9yaWdpbmFsTG9jYXRpb24obGluZTogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6XG4gICAgICB7ZmlsZTogQWJzb2x1dGVGc1BhdGgsIGxpbmU6IG51bWJlciwgY29sdW1uOiBudW1iZXJ9fG51bGwge1xuICAgIGlmICh0aGlzLmZsYXR0ZW5lZE1hcHBpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgbGV0IHBvc2l0aW9uOiBudW1iZXI7XG4gICAgaWYgKGxpbmUgPCB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zLmxlbmd0aCkge1xuICAgICAgcG9zaXRpb24gPSB0aGlzLnN0YXJ0T2ZMaW5lUG9zaXRpb25zW2xpbmVdICsgY29sdW1uO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgbGluZSBpcyBvZmYgdGhlIGVuZCBvZiB0aGUgZmlsZSwgc28ganVzdCBhc3N1bWUgd2UgYXJlIGF0IHRoZSBlbmQgb2YgdGhlIGZpbGUuXG4gICAgICBwb3NpdGlvbiA9IHRoaXMuY29udGVudHMubGVuZ3RoO1xuICAgIH1cblxuICAgIGNvbnN0IGxvY2F0aW9uU2VnbWVudDogU2VnbWVudE1hcmtlciA9IHtsaW5lLCBjb2x1bW4sIHBvc2l0aW9uLCBuZXh0OiB1bmRlZmluZWR9O1xuXG4gICAgbGV0IG1hcHBpbmdJbmRleCA9XG4gICAgICAgIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKHRoaXMuZmxhdHRlbmVkTWFwcGluZ3MsIGxvY2F0aW9uU2VnbWVudCwgZmFsc2UsIDApO1xuICAgIGlmIChtYXBwaW5nSW5kZXggPCAwKSB7XG4gICAgICBtYXBwaW5nSW5kZXggPSAwO1xuICAgIH1cbiAgICBjb25zdCB7b3JpZ2luYWxTZWdtZW50LCBvcmlnaW5hbFNvdXJjZSwgZ2VuZXJhdGVkU2VnbWVudH0gPVxuICAgICAgICB0aGlzLmZsYXR0ZW5lZE1hcHBpbmdzW21hcHBpbmdJbmRleF07XG4gICAgY29uc3Qgb2Zmc2V0ID0gbG9jYXRpb25TZWdtZW50LnBvc2l0aW9uIC0gZ2VuZXJhdGVkU2VnbWVudC5wb3NpdGlvbjtcbiAgICBjb25zdCBvZmZzZXRPcmlnaW5hbFNlZ21lbnQgPVxuICAgICAgICBvZmZzZXRTZWdtZW50KG9yaWdpbmFsU291cmNlLnN0YXJ0T2ZMaW5lUG9zaXRpb25zLCBvcmlnaW5hbFNlZ21lbnQsIG9mZnNldCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZTogb3JpZ2luYWxTb3VyY2Uuc291cmNlUGF0aCxcbiAgICAgIGxpbmU6IG9mZnNldE9yaWdpbmFsU2VnbWVudC5saW5lLFxuICAgICAgY29sdW1uOiBvZmZzZXRPcmlnaW5hbFNlZ21lbnQuY29sdW1uLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRmxhdHRlbiB0aGUgcGFyc2VkIG1hcHBpbmdzIGZvciB0aGlzIHNvdXJjZSBmaWxlLCBzbyB0aGF0IGFsbCB0aGUgbWFwcGluZ3MgYXJlIHRvIHB1cmUgb3JpZ2luYWxcbiAgICogc291cmNlIGZpbGVzIHdpdGggbm8gdHJhbnNpdGl2ZSBzb3VyY2UgbWFwcy5cbiAgICovXG4gIHByaXZhdGUgZmxhdHRlbk1hcHBpbmdzKCk6IE1hcHBpbmdbXSB7XG4gICAgY29uc3QgbWFwcGluZ3MgPSBwYXJzZU1hcHBpbmdzKHRoaXMucmF3TWFwLCB0aGlzLnNvdXJjZXMsIHRoaXMuc3RhcnRPZkxpbmVQb3NpdGlvbnMpO1xuICAgIGVuc3VyZU9yaWdpbmFsU2VnbWVudExpbmtzKG1hcHBpbmdzKTtcbiAgICBjb25zdCBmbGF0dGVuZWRNYXBwaW5nczogTWFwcGluZ1tdID0gW107XG4gICAgZm9yIChsZXQgbWFwcGluZ0luZGV4ID0gMDsgbWFwcGluZ0luZGV4IDwgbWFwcGluZ3MubGVuZ3RoOyBtYXBwaW5nSW5kZXgrKykge1xuICAgICAgY29uc3QgYVRvQm1hcHBpbmcgPSBtYXBwaW5nc1ttYXBwaW5nSW5kZXhdO1xuICAgICAgY29uc3QgYlNvdXJjZSA9IGFUb0JtYXBwaW5nLm9yaWdpbmFsU291cmNlO1xuICAgICAgaWYgKGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIFRoZSBiIHNvdXJjZSBmaWxlIGhhcyBubyBtYXBwaW5ncyBvZiBpdHMgb3duIChpLmUuIGl0IGlzIGEgcHVyZSBvcmlnaW5hbCBmaWxlKVxuICAgICAgICAvLyBzbyBqdXN0IHVzZSB0aGUgbWFwcGluZyBhcy1pcy5cbiAgICAgICAgZmxhdHRlbmVkTWFwcGluZ3MucHVzaChhVG9CbWFwcGluZyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgYGluY29taW5nU3RhcnRgIGFuZCBgaW5jb21pbmdFbmRgIGFyZSB0aGUgYFNlZ21lbnRNYXJrZXJgcyBpbiBgQmAgdGhhdCByZXByZXNlbnQgdGhlXG4gICAgICAvLyBzZWN0aW9uIG9mIGBCYCBzb3VyY2UgZmlsZSB0aGF0IGlzIGJlaW5nIG1hcHBlZCB0byBieSB0aGUgY3VycmVudCBgYVRvQm1hcHBpbmdgLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGUgbWFwcGluZ3MgZnJvbSBBIHRvIEI6XG4gICAgICAvL1xuICAgICAgLy8gc3JjIEEgICBzcmMgQiAgICAgbWFwcGluZ1xuICAgICAgLy9cbiAgICAgIC8vICAgYSAtLS0tLSBhICAgICAgIFswLCAwXVxuICAgICAgLy8gICBiICAgICAgIGJcbiAgICAgIC8vICAgZiAtICAvLSBjICAgICAgIFs0LCAyXVxuICAgICAgLy8gICBnICBcXCAvICBkXG4gICAgICAvLyAgIGMgLS9cXCAgIGVcbiAgICAgIC8vICAgZCAgICBcXC0gZiAgICAgICBbMiwgNV1cbiAgICAgIC8vICAgZVxuICAgICAgLy9cbiAgICAgIC8vIEZvciBtYXBwaW5nIFswLDBdIHRoZSBpbmNvbWluZyBzdGFydCBhbmQgZW5kIGFyZSAwIGFuZCAyIChpLmUuIHRoZSByYW5nZSBhLCBiLCBjKVxuICAgICAgLy8gRm9yIG1hcHBpbmcgWzQsMl0gdGhlIGluY29taW5nIHN0YXJ0IGFuZCBlbmQgYXJlIDIgYW5kIDUgKGkuZS4gdGhlIHJhbmdlIGMsIGQsIGUsIGYpXG4gICAgICAvL1xuICAgICAgY29uc3QgaW5jb21pbmdTdGFydCA9IGFUb0JtYXBwaW5nLm9yaWdpbmFsU2VnbWVudDtcbiAgICAgIGNvbnN0IGluY29taW5nRW5kID0gaW5jb21pbmdTdGFydC5uZXh0O1xuXG4gICAgICAvLyBUaGUgYG91dGdvaW5nU3RhcnRJbmRleGAgYW5kIGBvdXRnb2luZ0VuZEluZGV4YCBhcmUgdGhlIGluZGljZXMgb2YgdGhlIHJhbmdlIG9mIG1hcHBpbmdzXG4gICAgICAvLyB0aGF0IGxlYXZlIGBiYCB0aGF0IHdlIGFyZSBpbnRlcmVzdGVkIGluIG1lcmdpbmcgd2l0aCB0aGUgYVRvQm1hcHBpbmcuXG4gICAgICAvLyBXZSBhY3R1YWxseSBjYXJlIGFib3V0IGFsbCB0aGUgbWFya2VycyBmcm9tIHRoZSBsYXN0IGJUb0NtYXBwaW5nIGRpcmVjdGx5IGJlZm9yZSB0aGVcbiAgICAgIC8vIGBpbmNvbWluZ1N0YXJ0YCB0byB0aGUgbGFzdCBiVG9DbWFwaW5nIGRpcmVjdGx5IGJlZm9yZSB0aGUgYGluY29taW5nRW5kYCwgaW5jbHVzaXZlLlxuICAgICAgLy9cbiAgICAgIC8vIEZvciBleGFtcGxlLCBpZiB3ZSBjb25zaWRlciB0aGUgcmFuZ2UgMiB0byA1IGZyb20gYWJvdmUgKGkuZS4gYywgZCwgZSwgZikgd2l0aCB0aGVcbiAgICAgIC8vIGZvbGxvd2luZyBtYXBwaW5ncyBmcm9tIEIgdG8gQzpcbiAgICAgIC8vXG4gICAgICAvLyAgIHNyYyBCICAgc3JjIEMgICAgIG1hcHBpbmdcbiAgICAgIC8vICAgICBhXG4gICAgICAvLyAgICAgYiAtLS0tLSBiICAgICAgIFsxLCAwXVxuICAgICAgLy8gICAtIGMgICAgICAgY1xuICAgICAgLy8gIHwgIGQgICAgICAgZFxuICAgICAgLy8gIHwgIGUgLS0tLS0gMSAgICAgICBbNCwgM11cbiAgICAgIC8vICAgLSBmICBcXCAgICAyXG4gICAgICAvLyAgICAgICAgIFxcICAgM1xuICAgICAgLy8gICAgICAgICAgXFwtIGUgICAgICAgWzQsIDZdXG4gICAgICAvL1xuICAgICAgLy8gVGhlIHJhbmdlIHdpdGggYGluY29taW5nU3RhcnRgIGF0IDIgYW5kIGBpbmNvbWluZ0VuZGAgYXQgNSBoYXMgb3V0Z29pbmcgc3RhcnQgbWFwcGluZyBvZlxuICAgICAgLy8gWzEsMF0gYW5kIG91dGdvaW5nIGVuZCBtYXBwaW5nIG9mIFs0LCA2XSwgd2hpY2ggYWxzbyBpbmNsdWRlcyBbNCwgM10uXG4gICAgICAvL1xuICAgICAgbGV0IG91dGdvaW5nU3RhcnRJbmRleCA9XG4gICAgICAgICAgZmluZExhc3RNYXBwaW5nSW5kZXhCZWZvcmUoYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncywgaW5jb21pbmdTdGFydCwgZmFsc2UsIDApO1xuICAgICAgaWYgKG91dGdvaW5nU3RhcnRJbmRleCA8IDApIHtcbiAgICAgICAgb3V0Z29pbmdTdGFydEluZGV4ID0gMDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG91dGdvaW5nRW5kSW5kZXggPSBpbmNvbWluZ0VuZCAhPT0gdW5kZWZpbmVkID9cbiAgICAgICAgICBmaW5kTGFzdE1hcHBpbmdJbmRleEJlZm9yZShcbiAgICAgICAgICAgICAgYlNvdXJjZS5mbGF0dGVuZWRNYXBwaW5ncywgaW5jb21pbmdFbmQsIHRydWUsIG91dGdvaW5nU3RhcnRJbmRleCkgOlxuICAgICAgICAgIGJTb3VyY2UuZmxhdHRlbmVkTWFwcGluZ3MubGVuZ3RoIC0gMTtcblxuICAgICAgZm9yIChsZXQgYlRvQ21hcHBpbmdJbmRleCA9IG91dGdvaW5nU3RhcnRJbmRleDsgYlRvQ21hcHBpbmdJbmRleCA8PSBvdXRnb2luZ0VuZEluZGV4O1xuICAgICAgICAgICBiVG9DbWFwcGluZ0luZGV4KyspIHtcbiAgICAgICAgY29uc3QgYlRvQ21hcHBpbmc6IE1hcHBpbmcgPSBiU291cmNlLmZsYXR0ZW5lZE1hcHBpbmdzW2JUb0NtYXBwaW5nSW5kZXhdO1xuICAgICAgICBmbGF0dGVuZWRNYXBwaW5ncy5wdXNoKG1lcmdlTWFwcGluZ3ModGhpcywgYVRvQm1hcHBpbmcsIGJUb0NtYXBwaW5nKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmbGF0dGVuZWRNYXBwaW5ncztcbiAgfVxufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0gbWFwcGluZ3MgVGhlIGNvbGxlY3Rpb24gb2YgbWFwcGluZ3Mgd2hvc2Ugc2VnbWVudC1tYXJrZXJzIHdlIGFyZSBzZWFyY2hpbmcuXG4gKiBAcGFyYW0gbWFya2VyIFRoZSBzZWdtZW50LW1hcmtlciB0byBtYXRjaCBhZ2FpbnN0IHRob3NlIG9mIHRoZSBnaXZlbiBgbWFwcGluZ3NgLlxuICogQHBhcmFtIGV4Y2x1c2l2ZSBJZiBleGNsdXNpdmUgdGhlbiB3ZSBtdXN0IGZpbmQgYSBtYXBwaW5nIHdpdGggYSBzZWdtZW50LW1hcmtlciB0aGF0IGlzXG4gKiBleGNsdXNpdmVseSBlYXJsaWVyIHRoYW4gdGhlIGdpdmVuIGBtYXJrZXJgLlxuICogSWYgbm90IGV4Y2x1c2l2ZSB0aGVuIHdlIGNhbiByZXR1cm4gdGhlIGhpZ2hlc3QgbWFwcGluZ3Mgd2l0aCBhbiBlcXVpdmFsZW50IHNlZ21lbnQtbWFya2VyIHRvIHRoZVxuICogZ2l2ZW4gYG1hcmtlcmAuXG4gKiBAcGFyYW0gbG93ZXJJbmRleCBJZiBwcm92aWRlZCwgdGhpcyBpcyB1c2VkIGFzIGEgaGludCB0aGF0IHRoZSBtYXJrZXIgd2UgYXJlIHNlYXJjaGluZyBmb3IgaGFzIGFuXG4gKiBpbmRleCB0aGF0IGlzIG5vIGxvd2VyIHRoYW4gdGhpcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRMYXN0TWFwcGluZ0luZGV4QmVmb3JlKFxuICAgIG1hcHBpbmdzOiBNYXBwaW5nW10sIG1hcmtlcjogU2VnbWVudE1hcmtlciwgZXhjbHVzaXZlOiBib29sZWFuLCBsb3dlckluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICBsZXQgdXBwZXJJbmRleCA9IG1hcHBpbmdzLmxlbmd0aCAtIDE7XG4gIGNvbnN0IHRlc3QgPSBleGNsdXNpdmUgPyAtMSA6IDA7XG5cbiAgaWYgKGNvbXBhcmVTZWdtZW50cyhtYXBwaW5nc1tsb3dlckluZGV4XS5nZW5lcmF0ZWRTZWdtZW50LCBtYXJrZXIpID4gdGVzdCkge1xuICAgIC8vIEV4aXQgZWFybHkgc2luY2UgdGhlIG1hcmtlciBpcyBvdXRzaWRlIHRoZSBhbGxvd2VkIHJhbmdlIG9mIG1hcHBpbmdzLlxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIGxldCBtYXRjaGluZ0luZGV4ID0gLTE7XG4gIHdoaWxlIChsb3dlckluZGV4IDw9IHVwcGVySW5kZXgpIHtcbiAgICBjb25zdCBpbmRleCA9ICh1cHBlckluZGV4ICsgbG93ZXJJbmRleCkgPj4gMTtcbiAgICBpZiAoY29tcGFyZVNlZ21lbnRzKG1hcHBpbmdzW2luZGV4XS5nZW5lcmF0ZWRTZWdtZW50LCBtYXJrZXIpIDw9IHRlc3QpIHtcbiAgICAgIG1hdGNoaW5nSW5kZXggPSBpbmRleDtcbiAgICAgIGxvd2VySW5kZXggPSBpbmRleCArIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVwcGVySW5kZXggPSBpbmRleCAtIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGluZ0luZGV4O1xufVxuXG4vKipcbiAqIEEgTWFwcGluZyBjb25zaXN0cyBvZiB0d28gc2VnbWVudCBtYXJrZXJzOiBvbmUgaW4gdGhlIGdlbmVyYXRlZCBzb3VyY2UgYW5kIG9uZSBpbiB0aGUgb3JpZ2luYWxcbiAqIHNvdXJjZSwgd2hpY2ggaW5kaWNhdGUgdGhlIHN0YXJ0IG9mIGVhY2ggc2VnbWVudC4gVGhlIGVuZCBvZiBhIHNlZ21lbnQgaXMgaW5kaWNhdGVkIGJ5IHRoZSBmaXJzdFxuICogc2VnbWVudCBtYXJrZXIgb2YgYW5vdGhlciBtYXBwaW5nIHdob3NlIHN0YXJ0IGlzIGdyZWF0ZXIgb3IgZXF1YWwgdG8gdGhpcyBvbmUuXG4gKlxuICogSXQgbWF5IGFsc28gaW5jbHVkZSBhIG5hbWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBzZWdtZW50IGJlaW5nIG1hcHBlZC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBNYXBwaW5nIHtcbiAgcmVhZG9ubHkgZ2VuZXJhdGVkU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgb3JpZ2luYWxTb3VyY2U6IFNvdXJjZUZpbGU7XG4gIHJlYWRvbmx5IG9yaWdpbmFsU2VnbWVudDogU2VnbWVudE1hcmtlcjtcbiAgcmVhZG9ubHkgbmFtZT86IHN0cmluZztcbn1cblxuXG5cbi8qKlxuICogTWVyZ2UgdHdvIG1hcHBpbmdzIHRoYXQgZ28gZnJvbSBBIHRvIEIgYW5kIEIgdG8gQywgdG8gcmVzdWx0IGluIGEgbWFwcGluZyB0aGF0IGdvZXMgZnJvbSBBIHRvIEMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZU1hcHBpbmdzKGdlbmVyYXRlZFNvdXJjZTogU291cmNlRmlsZSwgYWI6IE1hcHBpbmcsIGJjOiBNYXBwaW5nKTogTWFwcGluZyB7XG4gIGNvbnN0IG5hbWUgPSBiYy5uYW1lIHx8IGFiLm5hbWU7XG5cbiAgLy8gV2UgbmVlZCB0byBtb2RpZnkgdGhlIHNlZ21lbnQtbWFya2VycyBvZiB0aGUgbmV3IG1hcHBpbmcgdG8gdGFrZSBpbnRvIGFjY291bnQgdGhlIHNoaWZ0cyB0aGF0XG4gIC8vIG9jY3VyIGR1ZSB0byB0aGUgY29tYmluYXRpb24gb2YgdGhlIHR3byBtYXBwaW5ncy5cbiAgLy8gRm9yIGV4YW1wbGU6XG5cbiAgLy8gKiBTaW1wbGUgbWFwIHdoZXJlIHRoZSBCLT5DIHN0YXJ0cyBhdCB0aGUgc2FtZSBwbGFjZSB0aGUgQS0+QiBlbmRzOlxuICAvL1xuICAvLyBgYGBcbiAgLy8gQTogMSAyIGIgYyBkXG4gIC8vICAgICAgICB8ICAgICAgICBBLT5CIFsyLDBdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICB8XG4gIC8vIEI6ICAgICBiIGMgZCAgICBBLT5DIFsyLDFdXG4gIC8vICAgICAgICB8ICAgICAgICAgICAgICAgIHxcbiAgLy8gICAgICAgIHwgICAgICAgIEItPkMgWzAsMV1cbiAgLy8gQzogICBhIGIgYyBkIGVcbiAgLy8gYGBgXG5cbiAgLy8gKiBNb3JlIGNvbXBsaWNhdGVkIGNhc2Ugd2hlcmUgZGlmZnMgb2Ygc2VnbWVudC1tYXJrZXJzIGlzIG5lZWRlZDpcbiAgLy9cbiAgLy8gYGBgXG4gIC8vIEE6IGIgMSAyIGMgZFxuICAvLyAgICAgXFxcbiAgLy8gICAgICB8ICAgICAgICAgICAgQS0+QiAgWzAsMSpdICAgIFswLDEqXVxuICAvLyAgICAgIHwgICAgICAgICAgICAgICAgICAgfCAgICAgICAgIHwrM1xuICAvLyBCOiBhIGIgMSAyIGMgZCAgICBBLT5DICBbMCwxXSAgICAgWzMsMl1cbiAgLy8gICAgfCAgICAgIC8gICAgICAgICAgICAgICAgfCsxICAgICAgIHxcbiAgLy8gICAgfCAgICAgLyAgICAgICAgQi0+QyBbMCosMF0gICAgWzQqLDJdXG4gIC8vICAgIHwgICAgL1xuICAvLyBDOiBhIGIgYyBkIGVcbiAgLy8gYGBgXG4gIC8vXG4gIC8vIGBbMCwxXWAgbWFwcGluZyBmcm9tIEEtPkM6XG4gIC8vIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiBvZiBBLT5CICgxKikgYW5kIHRoZSBcImdlbmVyYXRlZFxuICAvLyBzZWdtZW50LW1hcmtlciBvZiBCLT5DICgwKik6IGAxIC0gMCA9ICsxYC5cbiAgLy8gU2luY2UgaXQgaXMgcG9zaXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwib3JpZ2luYWwgc2VnbWVudC1tYXJrZXJcIiB3aXRoIGAxYCB0byBnaXZlIFswLDFdLlxuICAvL1xuICAvLyBgWzMsMl1gIG1hcHBpbmcgZnJvbSBBLT5DOlxuICAvLyBUaGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBcIm9yaWdpbmFsIHNlZ21lbnQtbWFya2VyXCIgb2YgQS0+QiAoMSopIGFuZCB0aGUgXCJnZW5lcmF0ZWRcbiAgLy8gc2VnbWVudC1tYXJrZXJcIiBvZiBCLT5DICg0Kik6IGAxIC0gNCA9IC0zYC5cbiAgLy8gU2luY2UgaXQgaXMgbmVnYXRpdmUgd2UgbXVzdCBpbmNyZW1lbnQgdGhlIFwiZ2VuZXJhdGVkIHNlZ21lbnQtbWFya2VyXCIgd2l0aCBgM2AgdG8gZ2l2ZSBbMywyXS5cblxuICBjb25zdCBkaWZmID0gY29tcGFyZVNlZ21lbnRzKGJjLmdlbmVyYXRlZFNlZ21lbnQsIGFiLm9yaWdpbmFsU2VnbWVudCk7XG4gIGlmIChkaWZmID4gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGdlbmVyYXRlZFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9ucywgYWIuZ2VuZXJhdGVkU2VnbWVudCwgZGlmZiksXG4gICAgICBvcmlnaW5hbFNvdXJjZTogYmMub3JpZ2luYWxTb3VyY2UsXG4gICAgICBvcmlnaW5hbFNlZ21lbnQ6IGJjLm9yaWdpbmFsU2VnbWVudCxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lLFxuICAgICAgZ2VuZXJhdGVkU2VnbWVudDogYWIuZ2VuZXJhdGVkU2VnbWVudCxcbiAgICAgIG9yaWdpbmFsU291cmNlOiBiYy5vcmlnaW5hbFNvdXJjZSxcbiAgICAgIG9yaWdpbmFsU2VnbWVudDpcbiAgICAgICAgICBvZmZzZXRTZWdtZW50KGJjLm9yaWdpbmFsU291cmNlLnN0YXJ0T2ZMaW5lUG9zaXRpb25zLCBiYy5vcmlnaW5hbFNlZ21lbnQsIC1kaWZmKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGByYXdNYXBwaW5nc2AgaW50byBhbiBhcnJheSBvZiBwYXJzZWQgbWFwcGluZ3MsIHdoaWNoIHJlZmVyZW5jZSBzb3VyY2UtZmlsZXMgcHJvdmlkZWRcbiAqIGluIHRoZSBgc291cmNlc2AgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNYXBwaW5ncyhcbiAgICByYXdNYXA6IFJhd1NvdXJjZU1hcHxudWxsLCBzb3VyY2VzOiAoU291cmNlRmlsZXxudWxsKVtdLFxuICAgIGdlbmVyYXRlZFNvdXJjZVN0YXJ0T2ZMaW5lUG9zaXRpb25zOiBudW1iZXJbXSk6IE1hcHBpbmdbXSB7XG4gIGlmIChyYXdNYXAgPT09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCByYXdNYXBwaW5ncyA9IGRlY29kZShyYXdNYXAubWFwcGluZ3MpO1xuICBpZiAocmF3TWFwcGluZ3MgPT09IG51bGwpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBjb25zdCBtYXBwaW5nczogTWFwcGluZ1tdID0gW107XG4gIGZvciAobGV0IGdlbmVyYXRlZExpbmUgPSAwOyBnZW5lcmF0ZWRMaW5lIDwgcmF3TWFwcGluZ3MubGVuZ3RoOyBnZW5lcmF0ZWRMaW5lKyspIHtcbiAgICBjb25zdCBnZW5lcmF0ZWRMaW5lTWFwcGluZ3MgPSByYXdNYXBwaW5nc1tnZW5lcmF0ZWRMaW5lXTtcbiAgICBmb3IgKGNvbnN0IHJhd01hcHBpbmcgb2YgZ2VuZXJhdGVkTGluZU1hcHBpbmdzKSB7XG4gICAgICBpZiAocmF3TWFwcGluZy5sZW5ndGggPj0gNCkge1xuICAgICAgICBjb25zdCBvcmlnaW5hbFNvdXJjZSA9IHNvdXJjZXNbcmF3TWFwcGluZ1sxXSFdO1xuICAgICAgICBpZiAob3JpZ2luYWxTb3VyY2UgPT09IG51bGwgfHwgb3JpZ2luYWxTb3VyY2UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIHRoZSBvcmlnaW5hbCBzb3VyY2UgaXMgbWlzc2luZyBzbyBpZ25vcmUgdGhpcyBtYXBwaW5nXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZ2VuZXJhdGVkQ29sdW1uID0gcmF3TWFwcGluZ1swXTtcbiAgICAgICAgY29uc3QgbmFtZSA9IHJhd01hcHBpbmcubGVuZ3RoID09PSA1ID8gcmF3TWFwLm5hbWVzW3Jhd01hcHBpbmdbNF1dIDogdW5kZWZpbmVkO1xuICAgICAgICBjb25zdCBsaW5lID0gcmF3TWFwcGluZ1syXSE7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IHJhd01hcHBpbmdbM10hO1xuICAgICAgICBjb25zdCBnZW5lcmF0ZWRTZWdtZW50OiBTZWdtZW50TWFya2VyID0ge1xuICAgICAgICAgIGxpbmU6IGdlbmVyYXRlZExpbmUsXG4gICAgICAgICAgY29sdW1uOiBnZW5lcmF0ZWRDb2x1bW4sXG4gICAgICAgICAgcG9zaXRpb246IGdlbmVyYXRlZFNvdXJjZVN0YXJ0T2ZMaW5lUG9zaXRpb25zW2dlbmVyYXRlZExpbmVdICsgZ2VuZXJhdGVkQ29sdW1uLFxuICAgICAgICAgIG5leHQ6IHVuZGVmaW5lZCxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxTZWdtZW50OiBTZWdtZW50TWFya2VyID0ge1xuICAgICAgICAgIGxpbmUsXG4gICAgICAgICAgY29sdW1uLFxuICAgICAgICAgIHBvc2l0aW9uOiBvcmlnaW5hbFNvdXJjZS5zdGFydE9mTGluZVBvc2l0aW9uc1tsaW5lXSArIGNvbHVtbixcbiAgICAgICAgICBuZXh0OiB1bmRlZmluZWQsXG4gICAgICAgIH07XG4gICAgICAgIG1hcHBpbmdzLnB1c2goe25hbWUsIGdlbmVyYXRlZFNlZ21lbnQsIG9yaWdpbmFsU2VnbWVudCwgb3JpZ2luYWxTb3VyY2V9KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hcHBpbmdzO1xufVxuXG4vKipcbiAqIEV4dHJhY3QgdGhlIHNlZ21lbnQgbWFya2VycyBmcm9tIHRoZSBvcmlnaW5hbCBzb3VyY2UgZmlsZXMgaW4gZWFjaCBtYXBwaW5nIG9mIGFuIGFycmF5IG9mXG4gKiBgbWFwcGluZ3NgLlxuICpcbiAqIEBwYXJhbSBtYXBwaW5ncyBUaGUgbWFwcGluZ3Mgd2hvc2Ugb3JpZ2luYWwgc2VnbWVudHMgd2Ugd2FudCB0byBleHRyYWN0XG4gKiBAcmV0dXJucyBSZXR1cm4gYSBtYXAgZnJvbSBvcmlnaW5hbCBzb3VyY2UtZmlsZXMgKHJlZmVyZW5jZWQgaW4gdGhlIGBtYXBwaW5nc2ApIHRvIGFycmF5cyBvZlxuICogc2VnbWVudC1tYXJrZXJzIHNvcnRlZCBieSB0aGVpciBvcmRlciBpbiB0aGVpciBzb3VyY2UgZmlsZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RPcmlnaW5hbFNlZ21lbnRzKG1hcHBpbmdzOiBNYXBwaW5nW10pOiBNYXA8U291cmNlRmlsZSwgU2VnbWVudE1hcmtlcltdPiB7XG4gIGNvbnN0IG9yaWdpbmFsU2VnbWVudHMgPSBuZXcgTWFwPFNvdXJjZUZpbGUsIFNlZ21lbnRNYXJrZXJbXT4oKTtcbiAgZm9yIChjb25zdCBtYXBwaW5nIG9mIG1hcHBpbmdzKSB7XG4gICAgY29uc3Qgb3JpZ2luYWxTb3VyY2UgPSBtYXBwaW5nLm9yaWdpbmFsU291cmNlO1xuICAgIGlmICghb3JpZ2luYWxTZWdtZW50cy5oYXMob3JpZ2luYWxTb3VyY2UpKSB7XG4gICAgICBvcmlnaW5hbFNlZ21lbnRzLnNldChvcmlnaW5hbFNvdXJjZSwgW10pO1xuICAgIH1cbiAgICBjb25zdCBzZWdtZW50cyA9IG9yaWdpbmFsU2VnbWVudHMuZ2V0KG9yaWdpbmFsU291cmNlKSE7XG4gICAgc2VnbWVudHMucHVzaChtYXBwaW5nLm9yaWdpbmFsU2VnbWVudCk7XG4gIH1cbiAgb3JpZ2luYWxTZWdtZW50cy5mb3JFYWNoKHNlZ21lbnRNYXJrZXJzID0+IHNlZ21lbnRNYXJrZXJzLnNvcnQoY29tcGFyZVNlZ21lbnRzKSk7XG4gIHJldHVybiBvcmlnaW5hbFNlZ21lbnRzO1xufVxuXG4vKipcbiAqIFVwZGF0ZSB0aGUgb3JpZ2luYWwgc2VnbWVudHMgb2YgZWFjaCBvZiB0aGUgZ2l2ZW4gYG1hcHBpbmdzYCB0byBpbmNsdWRlIGEgbGluayB0byB0aGUgbmV4dFxuICogc2VnbWVudCBpbiB0aGUgc291cmNlIGZpbGUuXG4gKlxuICogQHBhcmFtIG1hcHBpbmdzIHRoZSBtYXBwaW5ncyB3aG9zZSBzZWdtZW50cyBzaG91bGQgYmUgdXBkYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5zdXJlT3JpZ2luYWxTZWdtZW50TGlua3MobWFwcGluZ3M6IE1hcHBpbmdbXSk6IHZvaWQge1xuICBjb25zdCBzZWdtZW50c0J5U291cmNlID0gZXh0cmFjdE9yaWdpbmFsU2VnbWVudHMobWFwcGluZ3MpO1xuICBzZWdtZW50c0J5U291cmNlLmZvckVhY2gobWFya2VycyA9PiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXJrZXJzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgbWFya2Vyc1tpXS5uZXh0ID0gbWFya2Vyc1tpICsgMV07XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVTdGFydE9mTGluZVBvc2l0aW9ucyhzdHI6IHN0cmluZykge1xuICAvLyBUaGUgYDFgIGlzIHRvIGluZGljYXRlIGEgbmV3bGluZSBjaGFyYWN0ZXIgYmV0d2VlbiB0aGUgbGluZXMuXG4gIC8vIE5vdGUgdGhhdCBpbiB0aGUgYWN0dWFsIGNvbnRlbnRzIHRoZXJlIGNvdWxkIGJlIG1vcmUgdGhhbiBvbmUgY2hhcmFjdGVyIHRoYXQgaW5kaWNhdGVzIGFcbiAgLy8gbmV3bGluZVxuICAvLyAtIGUuZy4gXFxyXFxuIC0gYnV0IHRoYXQgaXMgbm90IGltcG9ydGFudCBoZXJlIHNpbmNlIHNlZ21lbnQtbWFya2VycyBhcmUgaW4gbGluZS9jb2x1bW4gcGFpcnMgYW5kXG4gIC8vIHNvIGRpZmZlcmVuY2VzIGluIGxlbmd0aCBkdWUgdG8gZXh0cmEgYFxccmAgY2hhcmFjdGVycyBkbyBub3QgYWZmZWN0IHRoZSBhbGdvcml0aG1zLlxuICBjb25zdCBORVdMSU5FX01BUktFUl9PRkZTRVQgPSAxO1xuICBjb25zdCBsaW5lTGVuZ3RocyA9IGNvbXB1dGVMaW5lTGVuZ3RocyhzdHIpO1xuICBjb25zdCBzdGFydFBvc2l0aW9ucyA9IFswXTsgIC8vIEZpcnN0IGxpbmUgc3RhcnRzIGF0IHBvc2l0aW9uIDBcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lTGVuZ3Rocy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICBzdGFydFBvc2l0aW9ucy5wdXNoKHN0YXJ0UG9zaXRpb25zW2ldICsgbGluZUxlbmd0aHNbaV0gKyBORVdMSU5FX01BUktFUl9PRkZTRVQpO1xuICB9XG4gIHJldHVybiBzdGFydFBvc2l0aW9ucztcbn1cblxuZnVuY3Rpb24gY29tcHV0ZUxpbmVMZW5ndGhzKHN0cjogc3RyaW5nKTogbnVtYmVyW10ge1xuICByZXR1cm4gKHN0ci5zcGxpdCgvXFxuLykpLm1hcChzID0+IHMubGVuZ3RoKTtcbn1cblxuLyoqXG4gKiBBIGNvbGxlY3Rpb24gb2YgbWFwcGluZ3MgYmV0d2VlbiBga2V5c2AgYW5kIGB2YWx1ZXNgIHN0b3JlZCBpbiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhlIGtleXMgYXJlXG4gKiBmaXJzdCBzZWVuLlxuICpcbiAqIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcyBhbmQgYSBzdGFuZGFyZCBgTWFwYCBpcyB0aGF0IHdoZW4geW91IGFkZCBhIGtleS12YWx1ZSBwYWlyIHRoZSBpbmRleFxuICogb2YgdGhlIGBrZXlgIGlzIHJldHVybmVkLlxuICovXG5jbGFzcyBJbmRleGVkTWFwPEssIFY+IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPEssIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogQW4gYXJyYXkgb2Yga2V5cyBhZGRlZCB0byB0aGlzIG1hcC5cbiAgICpcbiAgICogVGhpcyBhcnJheSBpcyBndWFyYW50ZWVkIHRvIGJlIGluIHRoZSBvcmRlciBvZiB0aGUgZmlyc3QgdGltZSB0aGUga2V5IHdhcyBhZGRlZCB0byB0aGUgbWFwLlxuICAgKi9cbiAgcmVhZG9ubHkga2V5czogS1tdID0gW107XG5cbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIHZhbHVlcyBhZGRlZCB0byB0aGlzIG1hcC5cbiAgICpcbiAgICogVGhpcyBhcnJheSBpcyBndWFyYW50ZWVkIHRvIGJlIGluIHRoZSBvcmRlciBvZiB0aGUgZmlyc3QgdGltZSB0aGUgYXNzb2NpYXRlZCBrZXkgd2FzIGFkZGVkIHRvXG4gICAqIHRoZSBtYXAuXG4gICAqL1xuICByZWFkb25seSB2YWx1ZXM6IFZbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBBc3NvY2lhdGUgdGhlIGB2YWx1ZWAgd2l0aCB0aGUgYGtleWAgYW5kIHJldHVybiB0aGUgaW5kZXggb2YgdGhlIGtleSBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogSWYgdGhlIGBrZXlgIGFscmVhZHkgZXhpc3RzIHRoZW4gdGhlIGB2YWx1ZWAgaXMgbm90IHNldCBhbmQgdGhlIGluZGV4IG9mIHRoYXQgYGtleWAgaXNcbiAgICogcmV0dXJuZWQ7IG90aGVyd2lzZSB0aGUgYGtleWAgYW5kIGB2YWx1ZWAgYXJlIHN0b3JlZCBhbmQgdGhlIGluZGV4IG9mIHRoZSBuZXcgYGtleWAgaXNcbiAgICogcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSBrZXkgdGhlIGtleSB0byBhc3NvY2lhdGVkIHdpdGggdGhlIGB2YWx1ZWAuXG4gICAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYXNzb2NpYXRlZCB3aXRoIHRoZSBga2V5YC5cbiAgICogQHJldHVybnMgdGhlIGluZGV4IG9mIHRoZSBga2V5YCBpbiB0aGUgYGtleXNgIGFycmF5LlxuICAgKi9cbiAgc2V0KGtleTogSywgdmFsdWU6IFYpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLm1hcC5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwLmdldChrZXkpITtcbiAgICB9XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnZhbHVlcy5wdXNoKHZhbHVlKSAtIDE7XG4gICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcbiAgICB0aGlzLm1hcC5zZXQoa2V5LCBpbmRleCk7XG4gICAgcmV0dXJuIGluZGV4O1xuICB9XG59XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIGB2YWx1ZXNgIHN0b3JlZCBpbiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhleSB3ZXJlIGFkZGVkLlxuICpcbiAqIFRoZSBkaWZmZXJlbmNlIGJldHdlZW4gdGhpcyBhbmQgYSBzdGFuZGFyZCBgU2V0YCBpcyB0aGF0IHdoZW4geW91IGFkZCBhIHZhbHVlIHRoZSBpbmRleCBvZiB0aGF0XG4gKiBpdGVtIGlzIHJldHVybmVkLlxuICovXG5jbGFzcyBJbmRleGVkU2V0PFY+IHtcbiAgcHJpdmF0ZSBtYXAgPSBuZXcgTWFwPFYsIG51bWJlcj4oKTtcblxuICAvKipcbiAgICogQW4gYXJyYXkgb2YgdmFsdWVzIGFkZGVkIHRvIHRoaXMgc2V0LlxuICAgKiBUaGlzIGFycmF5IGlzIGd1YXJhbnRlZWQgdG8gYmUgaW4gdGhlIG9yZGVyIG9mIHRoZSBmaXJzdCB0aW1lIHRoZSB2YWx1ZSB3YXMgYWRkZWQgdG8gdGhlIHNldC5cbiAgICovXG4gIHJlYWRvbmx5IHZhbHVlczogVltdID0gW107XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgYHZhbHVlYCB0byB0aGUgYHZhbHVlc2AgYXJyYXksIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdDsgcmV0dXJuaW5nIHRoZSBpbmRleCBvZiB0aGVcbiAgICogYHZhbHVlYCBpbiB0aGUgYHZhbHVlc2AgYXJyYXkuXG4gICAqXG4gICAqIElmIHRoZSBgdmFsdWVgIGFscmVhZHkgZXhpc3RzIHRoZW4gdGhlIGluZGV4IG9mIHRoYXQgYHZhbHVlYCBpcyByZXR1cm5lZCwgb3RoZXJ3aXNlIHRoZSBuZXdcbiAgICogYHZhbHVlYCBpcyBzdG9yZWQgYW5kIHRoZSBuZXcgaW5kZXggcmV0dXJuZWQuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSB0aGUgdmFsdWUgdG8gYWRkIHRvIHRoZSBzZXQuXG4gICAqIEByZXR1cm5zIHRoZSBpbmRleCBvZiB0aGUgYHZhbHVlYCBpbiB0aGUgYHZhbHVlc2AgYXJyYXkuXG4gICAqL1xuICBhZGQodmFsdWU6IFYpOiBudW1iZXIge1xuICAgIGlmICh0aGlzLm1hcC5oYXModmFsdWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXAuZ2V0KHZhbHVlKSE7XG4gICAgfVxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy52YWx1ZXMucHVzaCh2YWx1ZSkgLSAxO1xuICAgIHRoaXMubWFwLnNldCh2YWx1ZSwgaW5kZXgpO1xuICAgIHJldHVybiBpbmRleDtcbiAgfVxufVxuXG5jbGFzcyBDYWNoZTxJbnB1dCwgQ2FjaGVkPiB7XG4gIHByaXZhdGUgbWFwID0gbmV3IE1hcDxJbnB1dCwgQ2FjaGVkPigpO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNvbXB1dGVGbjogKGlucHV0OiBJbnB1dCkgPT4gQ2FjaGVkKSB7fVxuICBnZXQoaW5wdXQ6IElucHV0KTogQ2FjaGVkIHtcbiAgICBpZiAoIXRoaXMubWFwLmhhcyhpbnB1dCkpIHtcbiAgICAgIHRoaXMubWFwLnNldChpbnB1dCwgdGhpcy5jb21wdXRlRm4oaW5wdXQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWFwLmdldChpbnB1dCkhO1xuICB9XG59XG4iXX0=