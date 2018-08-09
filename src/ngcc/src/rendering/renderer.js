(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "@angular/compiler", "convert-source-map", "fs", "magic-string", "path", "source-map", "typescript", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngcc/src/constants"], factory);
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
    var compiler_1 = require("@angular/compiler");
    var convert_source_map_1 = require("convert-source-map");
    var fs_1 = require("fs");
    var magic_string_1 = require("magic-string");
    var path_1 = require("path");
    var source_map_1 = require("source-map");
    var ts = require("typescript");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
    var constants_1 = require("@angular/compiler-cli/src/ngcc/src/constants");
    /**
     * A base-class for rendering an `AnalyzedFile`.
     *
     * Package formats have output files that must be rendered differently. Concrete sub-classes must
     * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer(host) {
            this.host = host;
        }
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param file The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
        Renderer.prototype.renderFile = function (file, targetPath) {
            var _this = this;
            var importManager = new transform_1.ImportManager(false, constants_1.IMPORT_PREFIX);
            var input = this.extractSourceMap(file.sourceFile);
            var outputText = new magic_string_1.default(input.source);
            var decoratorsToRemove = new Map();
            file.analyzedClasses.forEach(function (clazz) {
                var renderedDefinition = renderDefinitions(file.sourceFile, clazz, importManager);
                _this.addDefinitions(outputText, clazz, renderedDefinition);
                _this.trackDecorators(clazz.decorators, decoratorsToRemove);
            });
            this.addConstants(outputText, renderConstantPool(file.sourceFile, file.constantPool, importManager), file.sourceFile);
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
                    if (e.code === 'ENOENT') {
                        console.warn("The external map file specified in the source code comment \"" + e.path + "\" was not found on the file system.");
                        var mapPath = file.fileName + '.map';
                        if (path_1.basename(e.path) !== path_1.basename(mapPath) && fs_1.statSync(mapPath).isFile()) {
                            console.warn("Guessing the map file name from the source file name: \"" + path_1.basename(mapPath) + "\"");
                            try {
                                externalSourceMap = convert_source_map_1.fromObject(JSON.parse(fs_1.readFileSync(mapPath, 'utf8')));
                            }
                            catch (e) {
                                console.error(e);
                            }
                        }
                    }
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
     * Render the constant pool as source code for the given class.
     */
    function renderConstantPool(sourceFile, constantPool, imports) {
        var printer = ts.createPrinter();
        return constantPool.statements.map(function (stmt) { return transform_1.translateStatement(stmt, imports); })
            .map(function (stmt) { return printer.printNode(ts.EmitHint.Unspecified, stmt, sourceFile); })
            .join('\n');
    }
    exports.renderConstantPool = renderConstantPool;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryx5REFBNk07SUFDN00seUJBQTBDO0lBQzFDLDZDQUF1QztJQUN2Qyw2QkFBdUM7SUFDdkMseUNBQStFO0lBQy9FLCtCQUFpQztJQUdqQyx1RUFBMkU7SUFFM0UsMEVBQTJDO0lBeUMzQzs7Ozs7T0FLRztJQUNIO1FBQ0Usa0JBQXNCLElBQXdCO1lBQXhCLFNBQUksR0FBSixJQUFJLENBQW9CO1FBQUcsQ0FBQztRQUVsRDs7OztXQUlHO1FBQ0gsNkJBQVUsR0FBVixVQUFXLElBQWtCLEVBQUUsVUFBa0I7WUFBakQsaUJBc0JDO1lBckJDLElBQU0sYUFBYSxHQUFHLElBQUkseUJBQWEsQ0FBQyxLQUFLLEVBQUUseUJBQWEsQ0FBQyxDQUFDO1lBQzlELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFckQsSUFBTSxVQUFVLEdBQUcsSUFBSSxzQkFBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqRCxJQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFzQixDQUFDO1lBRXpELElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztnQkFDaEMsSUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDcEYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUM7Z0JBQzNELEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQzdELENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFlBQVksQ0FDYixVQUFVLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxFQUNqRixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3pGLG9GQUFvRjtZQUNwRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFFdEQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQVVEOzs7V0FHRztRQUNPLGtDQUFlLEdBQXpCLFVBQTBCLFVBQXVCLEVBQUUsa0JBQTJDO1lBRTVGLFVBQVUsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNwQixJQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQVEsQ0FBQztnQkFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRTtvQkFDM0Msa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNwRDtxQkFBTTtvQkFDTCxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDekQ7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRDs7V0FFRztRQUNPLG1DQUFnQixHQUExQixVQUEyQixJQUFtQjtZQUM1QyxJQUFNLE1BQU0sR0FBRyxpQ0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBTSxRQUFRLEdBQUcsd0NBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVyRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFNLGVBQWUsR0FBRywrQkFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUMsT0FBTztvQkFDTCxNQUFNLEVBQUUsbUNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7b0JBQ3hELEdBQUcsRUFBRSxlQUFlO29CQUNwQixRQUFRLEVBQUUsSUFBSTtpQkFDZixDQUFDO2FBQ0g7aUJBQU0sSUFBSSxRQUFRLEVBQUU7Z0JBQ25CLElBQUksaUJBQWlCLEdBQTRCLElBQUksQ0FBQztnQkFDdEQsSUFBSTtvQkFDRixpQkFBaUIsR0FBRyxzQ0FBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztpQkFDMUU7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTt3QkFDdkIsT0FBTyxDQUFDLElBQUksQ0FDUixrRUFBK0QsQ0FBQyxDQUFDLElBQUkseUNBQXFDLENBQUMsQ0FBQzt3QkFDaEgsSUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7d0JBQ3ZDLElBQUksZUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxlQUFRLENBQUMsT0FBTyxDQUFDLElBQUksYUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOzRCQUN4RSxPQUFPLENBQUMsSUFBSSxDQUNSLDZEQUEwRCxlQUFRLENBQUMsT0FBTyxDQUFDLE9BQUcsQ0FBQyxDQUFDOzRCQUNwRixJQUFJO2dDQUNGLGlCQUFpQixHQUFHLCtCQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBWSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQzNFOzRCQUFDLE9BQU8sQ0FBQyxFQUFFO2dDQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NkJBQ2xCO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNELE9BQU87b0JBQ0wsTUFBTSxFQUFFLDBDQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztvQkFDL0QsR0FBRyxFQUFFLGlCQUFpQjtvQkFDdEIsUUFBUSxFQUFFLEtBQUs7aUJBQ2hCLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxPQUFPLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUM7YUFDeEQ7UUFDSCxDQUFDO1FBRUQ7OztXQUdHO1FBQ08scUNBQWtCLEdBQTVCLFVBQ0ksSUFBa0IsRUFBRSxLQUFvQixFQUFFLE1BQW1CLEVBQzdELFVBQWtCO1lBQ3BCLElBQU0sYUFBYSxHQUFNLFVBQVUsU0FBTSxDQUFDO1lBQzFDLElBQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVE7Z0JBQ2hDLGNBQWMsRUFBRSxJQUFJO2FBR3JCLENBQUMsQ0FBQztZQUVILG9GQUFvRjtZQUNwRixTQUFTLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUU1QixJQUFNLFNBQVMsR0FDWCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV6RixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLE9BQU87b0JBQ0wsSUFBSSxNQUFBO29CQUNKLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBSyxTQUFTLENBQUMsU0FBUyxFQUFJLEVBQUM7b0JBQ3RGLEdBQUcsRUFBRSxJQUFJO2lCQUNWLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxPQUFPO29CQUNMLElBQUksTUFBQTtvQkFDSixNQUFNLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFVBQVU7d0JBQ2hCLFFBQVEsRUFBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUssMkNBQXNCLENBQUMsYUFBYSxDQUFHO3FCQUMzRTtvQkFDRCxHQUFHLEVBQUUsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUM7aUJBQ3pELENBQUM7YUFDSDtRQUNILENBQUM7UUFDSCxlQUFDO0lBQUQsQ0FBQyxBQTFJRCxJQTBJQztJQTFJcUIsNEJBQVE7SUE0STlCOzs7Ozs7Ozs7Ozs7OztPQWNHO0lBQ0gseUJBQ0ksTUFBMkIsRUFBRSxNQUFvQjtRQUNuRCxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ1gsT0FBTywrQkFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsSUFBTSxjQUFjLEdBQUcsSUFBSSw4QkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFNLGNBQWMsR0FBRyxJQUFJLDhCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELElBQU0sa0JBQWtCLEdBQUcsK0JBQWtCLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzVFLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNsRCxJQUFNLE1BQU0sR0FBRyw2QkFBUSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdkQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQVhELDBDQVdDO0lBRUQ7O09BRUc7SUFDSCw0QkFDSSxVQUF5QixFQUFFLFlBQTBCLEVBQUUsT0FBc0I7UUFDL0UsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSw4QkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWpDLENBQWlDLENBQUM7YUFDeEUsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQTVELENBQTRELENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFORCxnREFNQztJQUVEOzs7Ozs7O09BT0c7SUFDSCwyQkFDSSxVQUF5QixFQUFFLGFBQTRCLEVBQUUsT0FBc0I7UUFDakYsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLElBQU0sSUFBSSxHQUFJLGFBQWEsQ0FBQyxXQUFtQyxDQUFDLElBQU0sQ0FBQztRQUN2RSxJQUFNLFdBQVcsR0FDYixhQUFhLENBQUMsV0FBVzthQUNwQixHQUFHLENBQ0EsVUFBQSxDQUFDLElBQUksT0FBQSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFNBQVMsSUFBSSxPQUFBLDhCQUFrQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBdEMsQ0FBc0MsQ0FBQzthQUNoRSxNQUFNLENBQUMsOEJBQWtCLENBQ3RCLHlCQUF5QixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNwRSxHQUFHLENBQ0EsVUFBQSxTQUFTO1lBQ0wsT0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7UUFBakUsQ0FBaUUsQ0FBQzthQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBTmYsQ0FNZSxDQUFDO2FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBaEJELDhDQWdCQztJQUVEOzs7O09BSUc7SUFDSCxtQ0FDSSxZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtTb3VyY2VNYXBDb252ZXJ0ZXIsIGNvbW1lbnRSZWdleCwgZnJvbUpTT04sIGZyb21NYXBGaWxlU291cmNlLCBmcm9tT2JqZWN0LCBmcm9tU291cmNlLCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBtYXBGaWxlQ29tbWVudFJlZ2V4LCByZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmMsIHN0YXRTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7YmFzZW5hbWUsIGRpcm5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtTb3VyY2VNYXBDb25zdW1lciwgU291cmNlTWFwR2VuZXJhdG9yLCBSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlU3RhdGVtZW50fSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHtBbmFseXplZENsYXNzLCBBbmFseXplZEZpbGV9IGZyb20gJy4uL2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFRoZSByZXN1bHRzIG9mIHJlbmRlcmluZyBhbiBhbmFseXplZCBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlclJlc3VsdCB7XG4gIC8qKlxuICAgKiBUaGUgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICAgKi9cbiAgZmlsZTogQW5hbHl6ZWRGaWxlO1xuICAvKipcbiAgICogVGhlIHJlbmRlcmVkIHNvdXJjZSBmaWxlLlxuICAgKi9cbiAgc291cmNlOiBGaWxlSW5mbztcbiAgLyoqXG4gICAqIFRoZSByZW5kZXJlZCBzb3VyY2UgbWFwIGZpbGUuXG4gICAqL1xuICBtYXA6IEZpbGVJbmZvfG51bGw7XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUluZm8ge1xuICAvKipcbiAgICogUGF0aCB0byB3aGVyZSB0aGUgZmlsZSBzaG91bGQgYmUgd3JpdHRlbi5cbiAgICovXG4gIHBhdGg6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBjb250ZW50cyBvZiB0aGUgZmlsZSB0byBiZSBiZSB3cml0dGVuLlxuICAgKi9cbiAgY29udGVudHM6IHN0cmluZztcbn1cblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRGaWxlYC5cbiAqXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0XG4gKiBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmQgYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSZW5kZXJlciB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QpIHt9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIGNvZGUgYW5kIHNvdXJjZS1tYXAgZm9yIGFuIEFuYWx5emVkIGZpbGUuXG4gICAqIEBwYXJhbSBmaWxlIFRoZSBhbmFseXplZCBmaWxlIHRvIHJlbmRlci5cbiAgICogQHBhcmFtIHRhcmdldFBhdGggVGhlIGFic29sdXRlIHBhdGggd2hlcmUgdGhlIHJlbmRlcmVkIGZpbGUgd2lsbCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcmVuZGVyRmlsZShmaWxlOiBBbmFseXplZEZpbGUsIHRhcmdldFBhdGg6IHN0cmluZyk6IFJlbmRlclJlc3VsdCB7XG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKGZhbHNlLCBJTVBPUlRfUFJFRklYKTtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZXh0cmFjdFNvdXJjZU1hcChmaWxlLnNvdXJjZUZpbGUpO1xuXG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPigpO1xuXG4gICAgZmlsZS5hbmFseXplZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhmaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG4gICAgICB0aGlzLnRyYWNrRGVjb3JhdG9ycyhjbGF6ei5kZWNvcmF0b3JzLCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRDb25zdGFudHMoXG4gICAgICAgIG91dHB1dFRleHQsIHJlbmRlckNvbnN0YW50UG9vbChmaWxlLnNvdXJjZUZpbGUsIGZpbGUuY29uc3RhbnRQb29sLCBpbXBvcnRNYW5hZ2VyKSxcbiAgICAgICAgZmlsZS5zb3VyY2VGaWxlKTtcblxuICAgIHRoaXMuYWRkSW1wb3J0cyhvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lLCBudWxsKSk7XG4gICAgLy8gUVVFU1RJT046IGRvIHdlIG5lZWQgdG8gcmVtb3ZlIGNvbnRydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnM/XG4gICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTb3VyY2VBbmRNYXAoZmlsZSwgaW5wdXQsIG91dHB1dFRleHQsIHRhcmdldFBhdGgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6XG4gICAgICB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7bmFtZTogc3RyaW5nLCBhczogc3RyaW5nfVtdKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZERlZmluaXRpb25zKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW1vdmVEZWNvcmF0b3JzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZGVjb3JhdG9yIG5vZGVzIHRoYXQgYXJlIHRvIGJlIHJlbW92ZWQgdG8gYSBtYXBcbiAgICogU28gdGhhdCB3ZSBjYW4gdGVsbCBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5XG4gICAqL1xuICBwcm90ZWN0ZWQgdHJhY2tEZWNvcmF0b3JzKGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KTpcbiAgICAgIHZvaWQge1xuICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgY29uc3QgZGVjb3JhdG9yQXJyYXkgPSBkZWMubm9kZS5wYXJlbnQgITtcbiAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSAhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbWFwIGZyb20gdGhlIHNvdXJjZSAobm90ZSB3aGV0aGVyIGl0IGlzIGlubGluZSBvciBleHRlcm5hbClcbiAgICovXG4gIHByb3RlY3RlZCBleHRyYWN0U291cmNlTWFwKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VNYXBJbmZvIHtcbiAgICBjb25zdCBpbmxpbmUgPSBjb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuICAgIGNvbnN0IGV4dGVybmFsID0gbWFwRmlsZUNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBjb25zdCBpbmxpbmVTb3VyY2VNYXAgPSBmcm9tU291cmNlKGZpbGUudGV4dCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHJlbW92ZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgICAgIGlzSW5saW5lOiB0cnVlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV4dGVybmFsKSB7XG4gICAgICBsZXQgZXh0ZXJuYWxTb3VyY2VNYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsID0gbnVsbDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU1hcEZpbGVTb3VyY2UoZmlsZS50ZXh0LCBkaXJuYW1lKGZpbGUuZmlsZU5hbWUpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgIGBUaGUgZXh0ZXJuYWwgbWFwIGZpbGUgc3BlY2lmaWVkIGluIHRoZSBzb3VyY2UgY29kZSBjb21tZW50IFwiJHtlLnBhdGh9XCIgd2FzIG5vdCBmb3VuZCBvbiB0aGUgZmlsZSBzeXN0ZW0uYCk7XG4gICAgICAgICAgY29uc3QgbWFwUGF0aCA9IGZpbGUuZmlsZU5hbWUgKyAnLm1hcCc7XG4gICAgICAgICAgaWYgKGJhc2VuYW1lKGUucGF0aCkgIT09IGJhc2VuYW1lKG1hcFBhdGgpICYmIHN0YXRTeW5jKG1hcFBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgICAgYEd1ZXNzaW5nIHRoZSBtYXAgZmlsZSBuYW1lIGZyb20gdGhlIHNvdXJjZSBmaWxlIG5hbWU6IFwiJHtiYXNlbmFtZShtYXBQYXRoKX1cImApO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tT2JqZWN0KEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hcFBhdGgsICd1dGY4JykpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtzb3VyY2U6IGZpbGUudGV4dCwgbWFwOiBudWxsLCBpc0lubGluZTogZmFsc2V9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gICAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAgICovXG4gIHByb3RlY3RlZCByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgICBmaWxlOiBBbmFseXplZEZpbGUsIGlucHV0OiBTb3VyY2VNYXBJbmZvLCBvdXRwdXQ6IE1hZ2ljU3RyaW5nLFxuICAgICAgb3V0cHV0UGF0aDogc3RyaW5nKTogUmVuZGVyUmVzdWx0IHtcbiAgICBjb25zdCBvdXRwdXRNYXBQYXRoID0gYCR7b3V0cHV0UGF0aH0ubWFwYDtcbiAgICBjb25zdCBvdXRwdXRNYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBmaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICBpbmNsdWRlQ29udGVudDogdHJ1ZSxcbiAgICAgIC8vIGhpcmVzOiB0cnVlIC8vIFRPRE86IFRoaXMgcmVzdWx0cyBpbiBhY2N1cmF0ZSBidXQgaHVnZSBzb3VyY2VtYXBzLiBJbnN0ZWFkIHdlIHNob3VsZCBmaXhcbiAgICAgIC8vIHRoZSBtZXJnZSBhbGdvcml0aG0uXG4gICAgfSk7XG5cbiAgICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICAgIG91dHB1dE1hcC5maWxlID0gb3V0cHV0UGF0aDtcblxuICAgIGNvbnN0IG1lcmdlZE1hcCA9XG4gICAgICAgIG1lcmdlU291cmNlTWFwcyhpbnB1dC5tYXAgJiYgaW5wdXQubWFwLnRvT2JqZWN0KCksIEpTT04ucGFyc2Uob3V0cHV0TWFwLnRvU3RyaW5nKCkpKTtcblxuICAgIGlmIChpbnB1dC5pc0lubGluZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZmlsZSxcbiAgICAgICAgc291cmNlOiB7cGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9LFxuICAgICAgICBtYXA6IG51bGxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGZpbGUsXG4gICAgICAgIHNvdXJjZToge1xuICAgICAgICAgIHBhdGg6IG91dHB1dFBhdGgsXG4gICAgICAgICAgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChvdXRwdXRNYXBQYXRoKX1gXG4gICAgICAgIH0sXG4gICAgICAgIG1hcDoge3BhdGg6IG91dHB1dE1hcFBhdGgsIGNvbnRlbnRzOiBtZXJnZWRNYXAudG9KU09OKCl9XG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIE1lcmdlIHRoZSB0d28gc3BlY2lmaWVkIHNvdXJjZS1tYXBzIGludG8gYSBzaW5nbGUgc291cmNlLW1hcCB0aGF0IGhpZGVzIHRoZSBpbnRlcm1lZGlhdGVcbiAqIHNvdXJjZS1tYXAuXG4gKiBFLmcuIENvbnNpZGVyIHRoZXNlIG1hcHBpbmdzOlxuICpcbiAqIGBgYFxuICogT0xEX1NSQyAtPiBPTERfTUFQIC0+IElOVEVSTUVESUFURV9TUkMgLT4gTkVXX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqXG4gKiB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aDpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gTUVSR0VEX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlU291cmNlTWFwcyhcbiAgICBvbGRNYXA6IFJhd1NvdXJjZU1hcCB8IG51bGwsIG5ld01hcDogUmF3U291cmNlTWFwKTogU291cmNlTWFwQ29udmVydGVyIHtcbiAgaWYgKCFvbGRNYXApIHtcbiAgICByZXR1cm4gZnJvbU9iamVjdChuZXdNYXApO1xuICB9XG4gIGNvbnN0IG9sZE1hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG9sZE1hcCk7XG4gIGNvbnN0IG5ld01hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG5ld01hcCk7XG4gIGNvbnN0IG1lcmdlZE1hcEdlbmVyYXRvciA9IFNvdXJjZU1hcEdlbmVyYXRvci5mcm9tU291cmNlTWFwKG5ld01hcENvbnN1bWVyKTtcbiAgbWVyZ2VkTWFwR2VuZXJhdG9yLmFwcGx5U291cmNlTWFwKG9sZE1hcENvbnN1bWVyKTtcbiAgY29uc3QgbWVyZ2VkID0gZnJvbUpTT04obWVyZ2VkTWFwR2VuZXJhdG9yLnRvU3RyaW5nKCkpO1xuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgY29uc3RhbnQgcG9vbCBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29uc3RhbnRQb29sKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgcmV0dXJuIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzKSlcbiAgICAgIC5tYXAoc3RtdCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgc291cmNlRmlsZSkpXG4gICAgICAuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgYW5hbHl6ZWRDbGFzczogQW5hbHl6ZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoYW5hbHl6ZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lICE7XG4gIGNvbnN0IGRlZmluaXRpb25zID1cbiAgICAgIGFuYWx5emVkQ2xhc3MuY29tcGlsYXRpb25cbiAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICBjID0+IGMuc3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQsIGltcG9ydHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KHRyYW5zbGF0ZVN0YXRlbWVudChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSwgaW1wb3J0cykpXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpKVxuICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGRlZmluaXRpb25zO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChcbiAgICByZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pOiBTdGF0ZW1lbnQge1xuICBjb25zdCByZWNlaXZlciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVjZWl2ZXJOYW1lKTtcbiAgcmV0dXJuIG5ldyBXcml0ZVByb3BFeHByKHJlY2VpdmVyLCBwcm9wTmFtZSwgaW5pdGlhbGl6ZXIpLnRvU3RtdCgpO1xufVxuIl19