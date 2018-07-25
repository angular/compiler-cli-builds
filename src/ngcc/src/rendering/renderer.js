(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "path", "typescript", "magic-string", "convert-source-map", "source-map", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/transform"], factory);
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
    var path_1 = require("path");
    var ts = require("typescript");
    var magic_string_1 = require("magic-string");
    var convert_source_map_1 = require("convert-source-map");
    var source_map_1 = require("source-map");
    var compiler_1 = require("@angular/compiler");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
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
            var importManager = new transform_1.ImportManager(false, 'ɵngcc');
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
        /**
         * Add the decorator nodes that are to be removed to a map
         * So that we can tell if we should remove the entire decorator property
         */
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
        /**
         * Get the map from the source (note whether it is inline or external)
         */
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
                    console.warn(e);
                }
                return {
                    source: convert_source_map_1.removeMapFileComments(file.text).replace(/\n\n$/, '\n'),
                    map: externalSourceMap,
                    isInline: false,
                };
            }
            else {
                return { source: file.text, map: null, isInline: false };
            }
        };
        /**
         * Merge the input and output source-maps, replacing the source-map comment in the output file
         * with an appropriate source-map comment pointing to the merged source-map.
         */
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
                    source: {
                        path: outputPath,
                        contents: output.toString() + "\n" + convert_source_map_1.generateMapFileComment(outputMapPath)
                    },
                    map: { path: outputMapPath, contents: mergedMap.toJSON() }
                };
            }
        };
        return Renderer;
    }());
    exports.Renderer = Renderer;
    /**
     * Merge the two specified source-maps into a single source-map that hides the intermediate
     * source-map.
     * E.g. Consider these mappings:
     *
     * ```
     * OLD_SRC -> OLD_MAP -> INTERMEDIATE_SRC -> NEW_MAP -> NEW_SRC
     * ```
     *
     * this will be replaced with:
     *
     * ```
     * OLD_SRC -> MERGED_MAP -> NEW_SRC
     * ```
     */
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
     * @param compilation The results of analyzing the class - this is used to generate the rendered
     * definitions.
     * @param imports An object that tracks the imports that are needed by the rendered definitions.
     */
    function renderDefinitions(sourceFile, analyzedClass, imports) {
        var printer = ts.createPrinter();
        var name = analyzedClass.declaration.name;
        var definitions = analyzedClass.compilation
            .map(function (c) { return c.statements.map(function (statement) { return transform_1.translateStatement(statement, imports); })
            .concat(transform_1.translateStatement(createAssignmentStatement(name, c.name, c.initializer), imports))
            .map(function (statement) {
            return printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile);
        })
            .join('\n'); })
            .join('\n');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZCQUE2QjtJQUM3QiwrQkFBaUM7SUFFakMsNkNBQXVDO0lBQ3ZDLHlEQUE2TTtJQUM3TSx5Q0FBK0U7SUFDL0UsOENBQXdGO0lBR3hGLHVFQUEyRTtJQXdDM0U7Ozs7O09BS0c7SUFDSDtRQUFBO1FBcUhBLENBQUM7UUFwSEM7Ozs7V0FJRztRQUNILDZCQUFVLEdBQVYsVUFBVyxJQUFrQixFQUFFLFVBQWtCO1lBQWpELGlCQWtCQztZQWpCQyxJQUFNLGFBQWEsR0FBRyxJQUFJLHlCQUFhLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3hELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFckQsSUFBTSxVQUFVLEdBQUcsSUFBSSxzQkFBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1lBRXpELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztnQkFDaEMsSUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDcEYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQzNELEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFD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QUlHO0lBQ0gsbUNBQ0ksWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzdFLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge2Rpcm5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0IHtjb21tZW50UmVnZXgsIG1hcEZpbGVDb21tZW50UmVnZXgsIGZyb21KU09OLCBmcm9tU291cmNlLCBmcm9tTWFwRmlsZVNvdXJjZSwgZnJvbU9iamVjdCwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgcmVtb3ZlQ29tbWVudHMsIHJlbW92ZU1hcEZpbGVDb21tZW50cywgU291cmNlTWFwQ29udmVydGVyfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtTb3VyY2VNYXBDb25zdW1lciwgU291cmNlTWFwR2VuZXJhdG9yLCBSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0IHtFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtBbmFseXplZENsYXNzLCBBbmFseXplZEZpbGV9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlU3RhdGVtZW50fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuXG5pbnRlcmZhY2UgU291cmNlTWFwSW5mbyB7XG4gIHNvdXJjZTogc3RyaW5nO1xuICBtYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsO1xuICBpc0lubGluZTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgcmVzdWx0cyBvZiByZW5kZXJpbmcgYW4gYW5hbHl6ZWQgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJSZXN1bHQge1xuICAvKipcbiAgICogVGhlIGZpbGUgdGhhdCBoYXMgYmVlbiByZW5kZXJlZC5cbiAgICovXG4gIGZpbGU6IEFuYWx5emVkRmlsZTtcbiAgLyoqXG4gICAqIFRoZSByZW5kZXJlZCBzb3VyY2UgZmlsZS5cbiAgICovXG4gIHNvdXJjZTogRmlsZUluZm87XG4gIC8qKlxuICAgKiBUaGUgcmVuZGVyZWQgc291cmNlIG1hcCBmaWxlLlxuICAgKi9cbiAgbWFwOiBGaWxlSW5mb3xudWxsO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi5cbiAgICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkQ2xhc3NgLlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseSxcbiAqIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3QgaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kXG4gKiBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlbmRlcmVyIHtcbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIGNvZGUgYW5kIHNvdXJjZS1tYXAgZm9yIGFuIEFuYWx5emVkIGZpbGUuXG4gICAqIEBwYXJhbSBmaWxlIFRoZSBhbmFseXplZCBmaWxlIHRvIHJlbmRlci5cbiAgICogQHBhcmFtIHRhcmdldFBhdGggVGhlIGFic29sdXRlIHBhdGggd2hlcmUgdGhlIHJlbmRlcmVkIGZpbGUgd2lsbCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcmVuZGVyRmlsZShmaWxlOiBBbmFseXplZEZpbGUsIHRhcmdldFBhdGg6IHN0cmluZyk6IFJlbmRlclJlc3VsdCB7XG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGZhbHNlLCAnybVuZ2NjJyk7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoZmlsZS5zb3VyY2VGaWxlKTtcblxuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4oKTtcblxuICAgIGZpbGUuYW5hbHl6ZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID0gcmVuZGVyRGVmaW5pdGlvbnMoZmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICB0aGlzLmFkZERlZmluaXRpb25zKG91dHB1dFRleHQsIGNsYXp6LCByZW5kZXJlZERlZmluaXRpb24pO1xuICAgICAgdGhpcy50cmFja0RlY29yYXRvcnMoY2xhenouZGVjb3JhdG9ycywgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkSW1wb3J0cyhvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lLCBudWxsKSk7XG4gICAgLy8gUVVFU1RJT046IGRvIHdlIG5lZWQgdG8gcmVtb3ZlIGNvbnRydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnM/XG4gICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTb3VyY2VBbmRNYXAoZmlsZSwgaW5wdXQsIG91dHB1dFRleHQsIHRhcmdldFBhdGgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXSk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGFuYWx5emVkQ2xhc3M6IEFuYWx5emVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBBZGQgdGhlIGRlY29yYXRvciBub2RlcyB0aGF0IGFyZSB0byBiZSByZW1vdmVkIHRvIGEgbWFwXG4gICAqIFNvIHRoYXQgd2UgY2FuIHRlbGwgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eVxuICAgKi9cbiAgcHJvdGVjdGVkIHRyYWNrRGVjb3JhdG9ycyhkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSwgZGVjb3JhdG9yc1RvUmVtb3ZlOiBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPik6XG4gICAgICB2b2lkIHtcbiAgICBkZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ICE7XG4gICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkgIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG1hcCBmcm9tIHRoZSBzb3VyY2UgKG5vdGUgd2hldGhlciBpdCBpcyBpbmxpbmUgb3IgZXh0ZXJuYWwpXG4gICAqL1xuICBwcm90ZWN0ZWQgZXh0cmFjdFNvdXJjZU1hcChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTWFwSW5mbyB7XG4gICAgY29uc3QgaW5saW5lID0gY29tbWVudFJlZ2V4LnRlc3QoZmlsZS50ZXh0KTtcbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgY29uc3QgaW5saW5lU291cmNlTWFwID0gZnJvbVNvdXJjZShmaWxlLnRleHQpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiByZW1vdmVDb21tZW50cyhmaWxlLnRleHQpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyksXG4gICAgICAgIG1hcDogaW5saW5lU291cmNlTWFwLFxuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHRlcm5hbCkge1xuICAgICAgbGV0IGV4dGVybmFsU291cmNlTWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbCA9IG51bGw7XG4gICAgICB0cnkge1xuICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21NYXBGaWxlU291cmNlKGZpbGUudGV4dCwgZGlybmFtZShmaWxlLmZpbGVOYW1lKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtzb3VyY2U6IGZpbGUudGV4dCwgbWFwOiBudWxsLCBpc0lubGluZTogZmFsc2V9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gICAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAgICovXG4gIHByb3RlY3RlZCByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgICBmaWxlOiBBbmFseXplZEZpbGUsIGlucHV0OiBTb3VyY2VNYXBJbmZvLCBvdXRwdXQ6IE1hZ2ljU3RyaW5nLFxuICAgICAgb3V0cHV0UGF0aDogc3RyaW5nKTogUmVuZGVyUmVzdWx0IHtcbiAgICBjb25zdCBvdXRwdXRNYXBQYXRoID0gYCR7b3V0cHV0UGF0aH0ubWFwYDtcbiAgICBjb25zdCBvdXRwdXRNYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICBpbmNsdWRlQ29udGVudDogdHJ1ZSxcbiAgICAgIC8vIGhpcmVzOiB0cnVlIC8vIFRPRE86IFRoaXMgcmVzdWx0cyBpbiBhY2N1cmF0ZSBidXQgaHVnZSBzb3VyY2VtYXBzLiBJbnN0ZWFkIHdlIHNob3VsZCBmaXhcbiAgICAgIC8vIHRoZSBtZXJnZSBhbGdvcml0aG0uXG4gICAgfSk7XG5cbiAgICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICAgIG91dHB1dE1hcC5maWxlID0gb3V0cHV0UGF0aDtcblxuICAgIGNvbnN0IG1lcmdlZE1hcCA9XG4gICAgICAgIG1lcmdlU291cmNlTWFwcyhpbnB1dC5tYXAgJiYgaW5wdXQubWFwLnRvT2JqZWN0KCksIEpTT04ucGFyc2Uob3V0cHV0TWFwLnRvU3RyaW5nKCkpKTtcblxuICAgIGlmIChpbnB1dC5pc0lubGluZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmlsZSxcbiAgICAgICAgc291cmNlOiB7cGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9LFxuICAgICAgICBtYXA6IG51bGxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGUsXG4gICAgICAgIHNvdXJjZToge1xuICAgICAgICAgIHBhdGg6IG91dHB1dFBhdGgsXG4gICAgICAgICAgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChvdXRwdXRNYXBQYXRoKX1gXG4gICAgICAgIH0sXG4gICAgICAgIG1hcDoge3BhdGg6IG91dHB1dE1hcFBhdGgsIGNvbnRlbnRzOiBtZXJnZWRNYXAudG9KU09OKCl9XG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIE1lcmdlIHRoZSB0d28gc3BlY2lmaWVkIHNvdXJjZS1tYXBzIGludG8gYSBzaW5nbGUgc291cmNlLW1hcCB0aGF0IGhpZGVzIHRoZSBpbnRlcm1lZGlhdGVcbiAqIHNvdXJjZS1tYXAuXG4gKiBFLmcuIENvbnNpZGVyIHRoZXNlIG1hcHBpbmdzOlxuICpcbiAqIGBgYFxuICogT0xEX1NSQyAtPiBPTERfTUFQIC0+IElOVEVSTUVESUFURV9TUkMgLT4gTkVXX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqXG4gKiB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aDpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gTUVSR0VEX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlU291cmNlTWFwcyhcbiAgICBvbGRNYXA6IFJhd1NvdXJjZU1hcCB8IG51bGwsIG5ld01hcDogUmF3U291cmNlTWFwKTogU291cmNlTWFwQ29udmVydGVyIHtcbiAgaWYgKCFvbGRNYXApIHtcbiAgICByZXR1cm4gZnJvbU9iamVjdChuZXdNYXApO1xuICB9XG4gIGNvbnN0IG9sZE1hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG9sZE1hcCk7XG4gIGNvbnN0IG5ld01hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG5ld01hcCk7XG4gIGNvbnN0IG1lcmdlZE1hcEdlbmVyYXRvciA9IFNvdXJjZU1hcEdlbmVyYXRvci5mcm9tU291cmNlTWFwKG5ld01hcENvbnN1bWVyKTtcbiAgbWVyZ2VkTWFwR2VuZXJhdG9yLmFwcGx5U291cmNlTWFwKG9sZE1hcENvbnN1bWVyKTtcbiAgY29uc3QgbWVyZ2VkID0gZnJvbUpTT04obWVyZ2VkTWFwR2VuZXJhdG9yLnRvU3RyaW5nKCkpO1xuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgZGVmaW5pdGlvbnMgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIGRlZmluaXRpb25zIGFyZSB0byBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZFxuICogZGVmaW5pdGlvbnMuXG4gKiBAcGFyYW0gaW1wb3J0cyBBbiBvYmplY3QgdGhhdCB0cmFja3MgdGhlIGltcG9ydHMgdGhhdCBhcmUgbmVlZGVkIGJ5IHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckRlZmluaXRpb25zKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGFuYWx5emVkQ2xhc3M6IEFuYWx5emVkQ2xhc3MsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICBjb25zdCBuYW1lID0gKGFuYWx5emVkQ2xhc3MuZGVjbGFyYXRpb24gYXMgdHMuTmFtZWREZWNsYXJhdGlvbikubmFtZSAhO1xuICBjb25zdCBkZWZpbml0aW9ucyA9XG4gICAgICBhbmFseXplZENsYXNzLmNvbXBpbGF0aW9uXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgYyA9PiBjLnN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RhdGVtZW50LCBpbXBvcnRzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmNvbmNhdCh0cmFuc2xhdGVTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplciksIGltcG9ydHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSlcbiAgICAgICAgICAuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cbiJdfQ==