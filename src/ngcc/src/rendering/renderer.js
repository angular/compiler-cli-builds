(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "typescript", "path", "magic-string", "convert-source-map", "source-map", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/transform/src/translator"], factory);
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
    var ts = require("typescript");
    var path_1 = require("path");
    var magic_string_1 = require("magic-string");
    var convert_source_map_1 = require("convert-source-map");
    var source_map_1 = require("source-map");
    var compiler_1 = require("@angular/compiler");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/transform/src/translator");
    /**
     * A base-class for rendering an `AnalyzedClass`.
     * Package formats have output files that must be rendered differently,
     * Concrete sub-classes must implement the `addImports`, `addDefinitions` and
     * `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer() {
        }
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param file The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
        Renderer.prototype.renderFile = function (file, targetPath) {
            var _this = this;
            var importManager = new translator_1.ImportManager(false, 'ɵngcc');
            var input = this.extractSourceMap(file.sourceFile);
            var outputText = new magic_string_1.default(input.source);
            var decoratorsToRemove = new Map();
            file.analyzedClasses.forEach(function (clazz) {
                var renderedDefinition = renderDefinitions(file.sourceFile, clazz, importManager);
                _this.addDefinitions(outputText, clazz, renderedDefinition);
                _this.trackDecorators(clazz.decorators, decoratorsToRemove);
            });
            this.addImports(outputText, importManager.getAllImports(file.sourceFile.fileName, null));
            // QUESTION: do we need to remove contructor param metadata and property decorators?
            this.removeDecorators(outputText, decoratorsToRemove);
            return this.renderSourceAndMap(file, input, outputText, targetPath);
        };
        // Add the decorator nodes that are to be removed to a map
        // So that we can tell if we should remove the entire decorator property
        Renderer.prototype.trackDecorators = function (decorators, decoratorsToRemove) {
            decorators.forEach(function (dec) {
                var decoratorArray = dec.node.parent;
                if (!decoratorsToRemove.has(decoratorArray)) {
                    decoratorsToRemove.set(decoratorArray, [dec.node]);
                }
                else {
                    decoratorsToRemove.get(decoratorArray).push(dec.node);
                }
            });
        };
        // get the map from the source (note whether it is inline or external)
        Renderer.prototype.extractSourceMap = function (file) {
            var inline = convert_source_map_1.commentRegex.test(file.text);
            var external = convert_source_map_1.mapFileCommentRegex.test(file.text);
            if (inline) {
                var inlineSourceMap = convert_source_map_1.fromSource(file.text);
                return {
                    source: convert_source_map_1.removeComments(file.text).replace(/\n\n$/, '\n'),
                    map: inlineSourceMap,
                    isInline: true,
                };
            }
            else if (external) {
                var externalSourceMap = null;
                try {
                    externalSourceMap = convert_source_map_1.fromMapFileSource(file.text, path_1.dirname(file.fileName));
                }
                catch (e) {
                    console.log(e);
                }
                return {
                    source: convert_source_map_1.removeMapFileComments(file.text).replace(/\n\n$/, '\n'),
                    map: externalSourceMap,
                    isInline: false,
                };
            }
            else {
                return {
                    source: file.text,
                    map: null,
                    isInline: false
                };
            }
        };
        // merge the input and output source maps
        // replace the comment in the output content with appropriate comment for merged map
        Renderer.prototype.renderSourceAndMap = function (file, input, output, outputPath) {
            var outputMapPath = outputPath + ".map";
            var outputMap = output.generateMap({
                source: file.sourceFile.fileName,
                includeContent: true,
            });
            // we must set this after generation as magic string does "manipulation" on the path
            outputMap.file = outputPath;
            var mergedMap = mergeSourceMaps(input.map && input.map.toObject(), JSON.parse(outputMap.toString()));
            if (input.isInline) {
                return {
                    file: file,
                    source: { path: outputPath, contents: output.toString() + "\n" + mergedMap.toComment() },
                    map: null
                };
            }
            else {
                return {
                    file: file,
                    source: { path: outputPath, contents: output.toString() + "\n" + convert_source_map_1.generateMapFileComment(outputMapPath) },
                    map: { path: outputMapPath, contents: mergedMap.toJSON() }
                };
            }
        };
        return Renderer;
    }());
    exports.Renderer = Renderer;
    function mergeSourceMaps(oldMap, newMap) {
        if (!oldMap) {
            return convert_source_map_1.fromObject(newMap);
        }
        var oldMapConsumer = new source_map_1.SourceMapConsumer(oldMap);
        var newMapConsumer = new source_map_1.SourceMapConsumer(newMap);
        var mergedMapGenerator = source_map_1.SourceMapGenerator.fromSourceMap(newMapConsumer);
        mergedMapGenerator.applySourceMap(oldMapConsumer);
        var merged = convert_source_map_1.fromJSON(mergedMapGenerator.toString());
        return merged;
    }
    exports.mergeSourceMaps = mergeSourceMaps;
    /**
     * Render the definitions as source code for the given class.
     * @param sourceFile The file containing the class to process.
     * @param clazz The class whose definitions are to be rendered.
     * @param compilation The results of analyzing the class - this is used to generate the rendered definitions.
     * @param imports An object that tracks the imports that are needed by the rendered definitions.
     */
    function renderDefinitions(sourceFile, analyzedClass, imports) {
        var printer = ts.createPrinter();
        var name = analyzedClass.declaration.name;
        var definitions = analyzedClass.compilation.map(function (c) { return c.statements
            .map(function (statement) { return translator_1.translateStatement(statement, imports); })
            .concat(translator_1.translateStatement(createAssignmentStatement(name, c.name, c.initializer), imports))
            .map(function (statement) { return printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile); })
            .join('\n'); }).join('\n');
        return definitions;
    }
    exports.renderDefinitions = renderDefinitions;
    /**
     * Create an Angular AST statement node that contains the assignment of the
     * compiled decorator to be applied to the class.
     * @param analyzedClass The info about the class whose statement we want to create.
     */
    function createAssignmentStatement(receiverName, propName, initializer) {
        var receiver = new compiler_1.WrappedNodeExpr(receiverName);
        return new compiler_1.WritePropExpr(receiver, propName, initializer).toStmt();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyw2QkFBNkI7SUFDN0IsNkNBQXVDO0lBQ3ZDLHlEQUE2TTtJQUM3TSx5Q0FBK0U7SUFDL0UsOENBQTZFO0lBRzdFLHVGQUEwRjtJQXdDMUY7Ozs7O09BS0c7SUFDSDtRQUFBO1FBMEdBLENBQUM7UUF6R0M7Ozs7V0FJRztRQUNILDZCQUFVLEdBQVYsVUFBVyxJQUFrQixFQUFFLFVBQWtCO1lBQWpELGlCQWtCQztZQWpCQyxJQUFNLGFBQWEsR0FBRyxJQUFJLDBCQUFhLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFckQsSUFBTSxVQUFVLEdBQUcsSUFBSSxzQkFBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1lBRXpELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztnQkFDaEMsSUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDcEYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQzNELEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFD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Ozs7O09BSUc7SUFDSCxtQ0FBbUMsWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzVHLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7ZGlybmFtZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7Y29tbWVudFJlZ2V4LCBtYXBGaWxlQ29tbWVudFJlZ2V4LCBmcm9tSlNPTiwgZnJvbVNvdXJjZSwgZnJvbU1hcEZpbGVTb3VyY2UsIGZyb21PYmplY3QsIGdlbmVyYXRlTWFwRmlsZUNvbW1lbnQsIHJlbW92ZUNvbW1lbnRzLCByZW1vdmVNYXBGaWxlQ29tbWVudHMsIFNvdXJjZU1hcENvbnZlcnRlcn0gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCB7U291cmNlTWFwQ29uc3VtZXIsIFNvdXJjZU1hcEdlbmVyYXRvciwgUmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCB7RXhwcmVzc2lvbiwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZVByb3BFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQge0FuYWx5emVkQ2xhc3MsIEFuYWx5emVkRmlsZX0gZnJvbSAnLi4vYW5hbHl6ZXInO1xuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyLCB0cmFuc2xhdGVTdGF0ZW1lbnR9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zZm9ybS9zcmMvdHJhbnNsYXRvcic7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSByZXN1bHRzIG9mIHJlbmRlcmluZyBhbiBhbmFseXplZCBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlclJlc3VsdCB7XG4gIC8qKlxuICAgKiBUaGUgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICAgKi9cbiAgZmlsZTogQW5hbHl6ZWRGaWxlO1xuICAvKipcbiAgICogVGhlIHJlbmRlcmVkIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgc291cmNlOiBGaWxlSW5mbztcbiAgLyoqXG4gICAqIFRoZSByZW5kZXJlZCBzb3VyY2UgbWFwIGZpbGUuXG4gICAqL1xuICBtYXA6IEZpbGVJbmZvfG51bGw7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUluZm8ge1xuICAvKipcbiAgICogUGF0aCB0byB3aGVyZSB0aGUgZmlsZSBzaG91bGQgYmUgd3JpdHRlbi5cbiAgICovXG4gIHBhdGg6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBjb250ZW50cyBvZiB0aGUgZmlsZSB0byBiZSBiZSB3cml0dGVuLlxuICAgKi9cbiAgY29udGVudHM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRDbGFzc2AuXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LFxuICogQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdCBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmRcbiAqIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVuZGVyZXIge1xuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGZpbGUgVGhlIGFuYWx5emVkIGZpbGUgdG8gcmVuZGVyLlxuICAgKiBAcGFyYW0gdGFyZ2V0UGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB3aGVyZSB0aGUgcmVuZGVyZWQgZmlsZSB3aWxsIGJlIHdyaXR0ZW4uXG4gICAqL1xuICByZW5kZXJGaWxlKGZpbGU6IEFuYWx5emVkRmlsZSwgdGFyZ2V0UGF0aDogc3RyaW5nKTogUmVuZGVyUmVzdWx0IHtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoZmFsc2UsICfJtW5nY2MnKTtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZXh0cmFjdFNvdXJjZU1hcChmaWxlLnNvdXJjZUZpbGUpO1xuXG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPigpO1xuXG4gICAgZmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhmaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG4gICAgICB0aGlzLnRyYWNrRGVjb3JhdG9ycyhjbGF6ei5kZWNvcmF0b3JzLCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRJbXBvcnRzKG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsIG51bGwpKTtcbiAgICAvLyBRVUVTVElPTjogZG8gd2UgbmVlZCB0byByZW1vdmUgY29udHJ1Y3RvciBwYXJhbSBtZXRhZGF0YSBhbmQgcHJvcGVydHkgZGVjb3JhdG9ycz9cbiAgICB0aGlzLnJlbW92ZURlY29yYXRvcnMob3V0cHV0VGV4dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgIHJldHVybiB0aGlzLnJlbmRlclNvdXJjZUFuZE1hcChmaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCwgdGFyZ2V0UGF0aCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7IG5hbWU6IHN0cmluZywgYXM6IHN0cmluZyB9W10pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW1vdmVEZWNvcmF0b3JzKG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkO1xuXG4gIC8vIEFkZCB0aGUgZGVjb3JhdG9yIG5vZGVzIHRoYXQgYXJlIHRvIGJlIHJlbW92ZWQgdG8gYSBtYXBcbiAgLy8gU28gdGhhdCB3ZSBjYW4gdGVsbCBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5XG4gIHByb3RlY3RlZCB0cmFja0RlY29yYXRvcnMoZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pIHtcbiAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ITtcbiAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSEucHVzaChkZWMubm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvLyBnZXQgdGhlIG1hcCBmcm9tIHRoZSBzb3VyY2UgKG5vdGUgd2hldGhlciBpdCBpcyBpbmxpbmUgb3IgZXh0ZXJuYWwpXG4gIHByb3RlY3RlZCBleHRyYWN0U291cmNlTWFwKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VNYXBJbmZvIHtcbiAgICBjb25zdCBpbmxpbmUgPSBjb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuICAgIGNvbnN0IGV4dGVybmFsID0gbWFwRmlsZUNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBjb25zdCBpbmxpbmVTb3VyY2VNYXAgPSBmcm9tU291cmNlKGZpbGUudGV4dCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHJlbW92ZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgICAgIGlzSW5saW5lOiB0cnVlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV4dGVybmFsKSB7XG4gICAgICBsZXQgZXh0ZXJuYWxTb3VyY2VNYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsID0gbnVsbDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU1hcEZpbGVTb3VyY2UoZmlsZS50ZXh0LCBkaXJuYW1lKGZpbGUuZmlsZU5hbWUpKTtcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiBmaWxlLnRleHQsXG4gICAgICAgIG1hcDogbnVsbCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIG1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZSBtYXBzXG4gIC8vIHJlcGxhY2UgdGhlIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBjb250ZW50IHdpdGggYXBwcm9wcmlhdGUgY29tbWVudCBmb3IgbWVyZ2VkIG1hcFxuICBwcm90ZWN0ZWQgcmVuZGVyU291cmNlQW5kTWFwKGZpbGU6IEFuYWx5emVkRmlsZSwgaW5wdXQ6IFNvdXJjZU1hcEluZm8sIG91dHB1dDogTWFnaWNTdHJpbmcsIG91dHB1dFBhdGg6IHN0cmluZyk6IFJlbmRlclJlc3VsdCB7XG4gICAgY29uc3Qgb3V0cHV0TWFwUGF0aCA9IGAke291dHB1dFBhdGh9Lm1hcGA7XG4gICAgY29uc3Qgb3V0cHV0TWFwID0gb3V0cHV0LmdlbmVyYXRlTWFwKHtcbiAgICAgIHNvdXJjZTogZmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgaW5jbHVkZUNvbnRlbnQ6IHRydWUsXG4gICAgICAvLyBoaXJlczogdHJ1ZSAvLyBUT0RPOiBUaGlzIHJlc3VsdHMgaW4gYWNjdXJhdGUgYnV0IGh1Z2Ugc291cmNlbWFwcy4gSW5zdGVhZCB3ZSBzaG91bGQgZml4IHRoZSBtZXJnZSBhbGdvcml0aG0uXG4gICAgfSk7XG5cbiAgICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICAgIG91dHB1dE1hcC5maWxlID0gb3V0cHV0UGF0aDtcblxuICAgIGNvbnN0IG1lcmdlZE1hcCA9IG1lcmdlU291cmNlTWFwcyhpbnB1dC5tYXAgJiYgaW5wdXQubWFwLnRvT2JqZWN0KCksIEpTT04ucGFyc2Uob3V0cHV0TWFwLnRvU3RyaW5nKCkpKTtcblxuICAgIGlmIChpbnB1dC5pc0lubGluZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmlsZSxcbiAgICAgICAgc291cmNlOiB7IHBhdGg6IG91dHB1dFBhdGgsIGNvbnRlbnRzOiBgJHtvdXRwdXQudG9TdHJpbmcoKX1cXG4ke21lcmdlZE1hcC50b0NvbW1lbnQoKX1gIH0sXG4gICAgICAgIG1hcDogbnVsbFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBmaWxlLFxuICAgICAgICBzb3VyY2U6IHsgcGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChvdXRwdXRNYXBQYXRoKX1gIH0sXG4gICAgICAgIG1hcDogeyBwYXRoOiBvdXRwdXRNYXBQYXRoLCBjb250ZW50czogbWVyZ2VkTWFwLnRvSlNPTigpIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG5cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VTb3VyY2VNYXBzKG9sZE1hcDogUmF3U291cmNlTWFwfG51bGwsIG5ld01hcDogUmF3U291cmNlTWFwKTogU291cmNlTWFwQ29udmVydGVyIHtcbiAgaWYgKCFvbGRNYXApIHsgcmV0dXJuIGZyb21PYmplY3QobmV3TWFwKTsgfVxuICBjb25zdCBvbGRNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihvbGRNYXApO1xuICBjb25zdCBuZXdNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihuZXdNYXApO1xuICBjb25zdCBtZXJnZWRNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChuZXdNYXBDb25zdW1lcik7XG4gIG1lcmdlZE1hcEdlbmVyYXRvci5hcHBseVNvdXJjZU1hcChvbGRNYXBDb25zdW1lcik7XG4gIGNvbnN0IG1lcmdlZCA9IGZyb21KU09OKG1lcmdlZE1hcEdlbmVyYXRvci50b1N0cmluZygpKTtcbiByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgZGVmaW5pdGlvbnMgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIGRlZmluaXRpb25zIGFyZSB0byBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lITtcbiAgY29uc3QgZGVmaW5pdGlvbnMgPSBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uLm1hcChjID0+IGMuc3RhdGVtZW50c1xuICAgIC5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQsIGltcG9ydHMpKVxuICAgIC5jb25jYXQodHJhbnNsYXRlU3RhdGVtZW50KGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSwgaW1wb3J0cykpXG4gICAgLm1hcChzdGF0ZW1lbnQgPT4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgLmpvaW4oJ1xcbicpXG4gICkuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQocmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKSB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG4iXX0=