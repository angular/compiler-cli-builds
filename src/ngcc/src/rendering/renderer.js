(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "convert-source-map", "fs", "magic-string", "canonical-path", "source-map", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngcc/src/rendering/ngcc_import_manager", "@angular/compiler-cli/src/ngcc/src/constants"], factory);
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
    var compiler_1 = require("@angular/compiler");
    var convert_source_map_1 = require("convert-source-map");
    var fs_1 = require("fs");
    var magic_string_1 = require("magic-string");
    var canonical_path_1 = require("canonical-path");
    var source_map_1 = require("source-map");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var ngcc_import_manager_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/ngcc_import_manager");
    var constants_1 = require("@angular/compiler-cli/src/ngcc/src/constants");
    /**
     * A base-class for rendering an `AnalyzedFile`.
     *
     * Package formats have output files that must be rendered differently. Concrete sub-classes must
     * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer(host, isCore, rewriteCoreImportsTo, sourcePath, targetPath, transformDts) {
            this.host = host;
            this.isCore = isCore;
            this.rewriteCoreImportsTo = rewriteCoreImportsTo;
            this.sourcePath = sourcePath;
            this.targetPath = targetPath;
            this.transformDts = transformDts;
        }
        Renderer.prototype.renderProgram = function (program, decorationAnalyses, switchMarkerAnalyses) {
            var _this = this;
            var renderedFiles = [];
            // Transform the source files.
            program.getSourceFiles().map(function (sourceFile) {
                var compiledFile = decorationAnalyses.get(sourceFile);
                var switchMarkerAnalysis = switchMarkerAnalyses.get(sourceFile);
                if (compiledFile || switchMarkerAnalysis) {
                    renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderFile(sourceFile, compiledFile, switchMarkerAnalysis)));
                }
            });
            if (this.transformDts) {
                // Transform the .d.ts files
                var dtsFiles = this.getTypingsFilesToRender(decorationAnalyses);
                dtsFiles.forEach(function (classes, file) { return renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderDtsFile(file, classes))); });
            }
            return renderedFiles;
        };
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param compiledFile The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
        Renderer.prototype.renderFile = function (sourceFile, compiledFile, switchMarkerAnalysis) {
            var _this = this;
            var input = this.extractSourceMap(sourceFile);
            var outputText = new magic_string_1.default(input.source);
            if (switchMarkerAnalysis) {
                this.rewriteSwitchableDeclarations(outputText, switchMarkerAnalysis.sourceFile, switchMarkerAnalysis.declarations);
            }
            if (compiledFile) {
                var importManager_1 = new ngcc_import_manager_1.NgccImportManager(!this.rewriteCoreImportsTo, this.isCore, constants_1.IMPORT_PREFIX);
                var decoratorsToRemove_1 = new Map();
                compiledFile.compiledClasses.forEach(function (clazz) {
                    var renderedDefinition = renderDefinitions(compiledFile.sourceFile, clazz, importManager_1);
                    _this.addDefinitions(outputText, clazz, renderedDefinition);
                    _this.trackDecorators(clazz.decorators, decoratorsToRemove_1);
                });
                this.addConstants(outputText, renderConstantPool(compiledFile.sourceFile, compiledFile.constantPool, importManager_1), compiledFile.sourceFile);
                this.addImports(outputText, importManager_1.getAllImports(compiledFile.sourceFile.fileName, this.rewriteCoreImportsTo));
                // TODO: remove contructor param metadata and property decorators (we need info from the
                // handlers to do this)
                this.removeDecorators(outputText, decoratorsToRemove_1);
            }
            return this.renderSourceAndMap(sourceFile, input, outputText);
        };
        Renderer.prototype.renderDtsFile = function (dtsFile, dtsClasses) {
            var input = this.extractSourceMap(dtsFile);
            var outputText = new magic_string_1.default(input.source);
            var importManager = new ngcc_import_manager_1.NgccImportManager(false, this.isCore, constants_1.IMPORT_PREFIX);
            dtsClasses.forEach(function (dtsClass) {
                var endOfClass = dtsClass.dtsDeclaration.getEnd();
                dtsClass.compilation.forEach(function (declaration) {
                    var type = translator_1.translateType(declaration.type, importManager);
                    var newStatement = "    static " + declaration.name + ": " + type + ";\n";
                    outputText.appendRight(endOfClass - 1, newStatement);
                });
            });
            this.addImports(outputText, importManager.getAllImports(dtsFile.fileName, this.rewriteCoreImportsTo));
            return this.renderSourceAndMap(dtsFile, input, outputText);
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
                    externalSourceMap = convert_source_map_1.fromMapFileSource(file.text, canonical_path_1.dirname(file.fileName));
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        console.warn("The external map file specified in the source code comment \"" + e.path + "\" was not found on the file system.");
                        var mapPath = file.fileName + '.map';
                        if (canonical_path_1.basename(e.path) !== canonical_path_1.basename(mapPath) && fs_1.statSync(mapPath).isFile()) {
                            console.warn("Guessing the map file name from the source file name: \"" + canonical_path_1.basename(mapPath) + "\"");
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
        Renderer.prototype.renderSourceAndMap = function (sourceFile, input, output) {
            var outputPath = canonical_path_1.resolve(this.targetPath, canonical_path_1.relative(this.sourcePath, sourceFile.fileName));
            var outputMapPath = outputPath + ".map";
            var outputMap = output.generateMap({
                source: sourceFile.fileName,
                includeContent: true,
            });
            // we must set this after generation as magic string does "manipulation" on the path
            outputMap.file = outputPath;
            var mergedMap = mergeSourceMaps(input.map && input.map.toObject(), JSON.parse(outputMap.toString()));
            var result = [];
            if (input.isInline) {
                result.push({ path: outputPath, contents: output.toString() + "\n" + mergedMap.toComment() });
            }
            else {
                result.push({
                    path: outputPath,
                    contents: output.toString() + "\n" + convert_source_map_1.generateMapFileComment(outputMapPath)
                });
                result.push({ path: outputMapPath, contents: mergedMap.toJSON() });
            }
            return result;
        };
        Renderer.prototype.getTypingsFilesToRender = function (analyses) {
            var _this = this;
            var dtsMap = new Map();
            analyses.forEach(function (compiledFile) {
                compiledFile.compiledClasses.forEach(function (compiledClass) {
                    var dtsDeclaration = _this.host.getDtsDeclarationOfClass(compiledClass.declaration);
                    if (dtsDeclaration) {
                        var dtsFile = dtsDeclaration.getSourceFile();
                        var classes = dtsMap.get(dtsFile) || [];
                        classes.push({ dtsDeclaration: dtsDeclaration, compilation: compiledClass.compilation });
                        dtsMap.set(dtsFile, classes);
                    }
                });
            });
            return dtsMap;
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
        return constantPool.statements.map(function (stmt) { return translator_1.translateStatement(stmt, imports); })
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
    function renderDefinitions(sourceFile, compiledClass, imports) {
        var printer = ts.createPrinter();
        var name = compiledClass.declaration.name;
        var definitions = compiledClass.compilation
            .map(function (c) { return c.statements.map(function (statement) { return translator_1.translateStatement(statement, imports); })
            .concat(translator_1.translateStatement(createAssignmentStatement(name, c.name, c.initializer), imports))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBc0c7SUFDdEcseURBQTZNO0lBQzdNLHlCQUEwQztJQUMxQyw2Q0FBdUM7SUFDdkMsaURBQW9FO0lBQ3BFLHlDQUErRTtJQUMvRSwrQkFBaUM7SUFJakMseUVBQTRFO0lBQzVFLHdHQUF3RDtJQUd4RCwwRUFBMkM7SUE0QjNDOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDYyxJQUF3QixFQUFZLE1BQWUsRUFDbkQsb0JBQXdDLEVBQVksVUFBa0IsRUFDdEUsVUFBa0IsRUFBWSxZQUFxQjtZQUZuRCxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFZLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDbkQseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFvQjtZQUFZLGVBQVUsR0FBVixVQUFVLENBQVE7WUFDdEUsZUFBVSxHQUFWLFVBQVUsQ0FBUTtZQUFZLGlCQUFZLEdBQVosWUFBWSxDQUFTO1FBQUcsQ0FBQztRQUVyRSxnQ0FBYSxHQUFiLFVBQ0ksT0FBbUIsRUFBRSxrQkFBc0MsRUFDM0Qsb0JBQTBDO1lBRjlDLGlCQXNCQztZQW5CQyxJQUFNLGFBQWEsR0FBZSxFQUFFLENBQUM7WUFFckMsOEJBQThCO1lBQzlCLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVO2dCQUNyQyxJQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hELElBQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUVsRSxJQUFJLFlBQVksSUFBSSxvQkFBb0IsRUFBRTtvQkFDeEMsYUFBYSxDQUFDLElBQUksT0FBbEIsYUFBYSxtQkFBUyxLQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLENBQUMsR0FBRTtpQkFDeEY7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtnQkFDckIsNEJBQTRCO2dCQUM1QixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDbEUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxJQUFJLElBQUssT0FBQSxhQUFhLENBQUMsSUFBSSxPQUFsQixhQUFhLG1CQUFTLEtBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUF2RCxDQUF3RCxDQUFDLENBQUM7YUFDL0Y7WUFFRCxPQUFPLGFBQWEsQ0FBQztRQUN2QixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILDZCQUFVLEdBQVYsVUFDSSxVQUF5QixFQUFFLFlBQW9DLEVBQy9ELG9CQUFvRDtZQUZ4RCxpQkFxQ0M7WUFsQ0MsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELElBQU0sVUFBVSxHQUFHLElBQUksc0JBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsSUFBSSxvQkFBb0IsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLDZCQUE2QixDQUM5QixVQUFVLEVBQUUsb0JBQW9CLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ3JGO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLElBQU0sZUFBYSxHQUNmLElBQUksdUNBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSx5QkFBYSxDQUFDLENBQUM7Z0JBQ2xGLElBQU0sb0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7Z0JBRXpELFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsS0FBSztvQkFDeEMsSUFBTSxrQkFBa0IsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxlQUFhLENBQUMsQ0FBQztvQkFDNUYsS0FBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLENBQUM7b0JBQzNELEtBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxvQkFBa0IsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsWUFBWSxDQUNiLFVBQVUsRUFDVixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxZQUFZLEVBQUUsZUFBYSxDQUFDLEVBQ3JGLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFN0IsSUFBSSxDQUFDLFVBQVUsQ0FDWCxVQUFVLEVBQ1YsZUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2dCQUU5Rix3RkFBd0Y7Z0JBQ3hGLHVCQUF1QjtnQkFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxvQkFBa0IsQ0FBQyxDQUFDO2FBQ3ZEO1lBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsZ0NBQWEsR0FBYixVQUFjLE9BQXNCLEVBQUUsVUFBMEI7WUFDOUQsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzdDLElBQU0sVUFBVSxHQUFHLElBQUksc0JBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakQsSUFBTSxhQUFhLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSx5QkFBYSxDQUFDLENBQUM7WUFFL0UsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVE7Z0JBQ3pCLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BELFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQUEsV0FBVztvQkFDdEMsSUFBTSxJQUFJLEdBQUcsMEJBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUM1RCxJQUFNLFlBQVksR0FBRyxnQkFBYyxXQUFXLENBQUMsSUFBSSxVQUFLLElBQUksUUFBSyxDQUFDO29CQUNsRSxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZELENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsVUFBVSxDQUNYLFVBQVUsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUUxRixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdELENBQUM7UUFhRDs7O1dBR0c7UUFDTyxrQ0FBZSxHQUF6QixVQUEwQixVQUF1QixFQUFFLGtCQUEyQztZQUU1RixVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztnQkFDcEIsSUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFRLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7b0JBQzNDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDcEQ7cUJBQU07b0JBQ0wsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ3pEO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQ7O1dBRUc7UUFDTyxtQ0FBZ0IsR0FBMUIsVUFBMkIsSUFBbUI7WUFDNUMsSUFBTSxNQUFNLEdBQUcsaUNBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzVDLElBQU0sUUFBUSxHQUFHLHdDQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFckQsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsSUFBTSxlQUFlLEdBQUcsK0JBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlDLE9BQU87b0JBQ0wsTUFBTSxFQUFFLG1DQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO29CQUN4RCxHQUFHLEVBQUUsZUFBZTtvQkFDcEIsUUFBUSxFQUFFLElBQUk7aUJBQ2YsQ0FBQzthQUNIO2lCQUFNLElBQUksUUFBUSxFQUFFO2dCQUNuQixJQUFJLGlCQUFpQixHQUE0QixJQUFJLENBQUM7Z0JBQ3RELElBQUk7b0JBQ0YsaUJBQWlCLEdBQUcsc0NBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx3QkFBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2lCQUMxRTtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUNSLGtFQUErRCxDQUFDLENBQUMsSUFBSSx5Q0FBcUMsQ0FBQyxDQUFDO3dCQUNoSCxJQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQzt3QkFDdkMsSUFBSSx5QkFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyx5QkFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLGFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTs0QkFDeEUsT0FBTyxDQUFDLElBQUksQ0FDUiw2REFBMEQseUJBQVEsQ0FBQyxPQUFPLENBQUMsT0FBRyxDQUFDLENBQUM7NEJBQ3BGLElBQUk7Z0NBQ0YsaUJBQWlCLEdBQUcsK0JBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDM0U7NEJBQUMsT0FBTyxDQUFDLEVBQUU7Z0NBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDbEI7eUJBQ0Y7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsT0FBTztvQkFDTCxNQUFNLEVBQUUsMENBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO29CQUMvRCxHQUFHLEVBQUUsaUJBQWlCO29CQUN0QixRQUFRLEVBQUUsS0FBSztpQkFDaEIsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLE9BQU8sRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUMsQ0FBQzthQUN4RDtRQUNILENBQUM7UUFFRDs7O1dBR0c7UUFDTyxxQ0FBa0IsR0FBNUIsVUFDSSxVQUF5QixFQUFFLEtBQW9CLEVBQUUsTUFBbUI7WUFDdEUsSUFBTSxVQUFVLEdBQUcsd0JBQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLHlCQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM1RixJQUFNLGFBQWEsR0FBTSxVQUFVLFNBQU0sQ0FBQztZQUMxQyxJQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO2dCQUNuQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQzNCLGNBQWMsRUFBRSxJQUFJO2FBR3JCLENBQUMsQ0FBQztZQUVILG9GQUFvRjtZQUNwRixTQUFTLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUU1QixJQUFNLFNBQVMsR0FDWCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUV6RixJQUFNLE1BQU0sR0FBZSxFQUFFLENBQUM7WUFDOUIsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFLLFNBQVMsQ0FBQyxTQUFTLEVBQUksRUFBQyxDQUFDLENBQUM7YUFDN0Y7aUJBQU07Z0JBQ0wsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDVixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsUUFBUSxFQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBSywyQ0FBc0IsQ0FBQyxhQUFhLENBQUc7aUJBQzNFLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFDLENBQUMsQ0FBQzthQUNsRTtZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFUywwQ0FBdUIsR0FBakMsVUFBa0MsUUFBNEI7WUFBOUQsaUJBZUM7WUFiQyxJQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztZQUN4RCxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsWUFBWTtnQkFDM0IsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsVUFBQSxhQUFhO29CQUNoRCxJQUFNLGNBQWMsR0FBRyxLQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDckYsSUFBSSxjQUFjLEVBQUU7d0JBQ2xCLElBQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxhQUFhLEVBQUUsQ0FBQzt3QkFDL0MsSUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBQyxjQUFjLGdCQUFBLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDO3dCQUN2RSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztxQkFDOUI7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxlQUFDO0lBQUQsQ0FBQyxBQXZORCxJQXVOQztJQXZOcUIsNEJBQVE7SUF5TjlCOzs7Ozs7Ozs7Ozs7OztPQWNHO0lBQ0gsU0FBZ0IsZUFBZSxDQUMzQixNQUEyQixFQUFFLE1BQW9CO1FBQ25ELElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDWCxPQUFPLCtCQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDM0I7UUFDRCxJQUFNLGNBQWMsR0FBRyxJQUFJLDhCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JELElBQU0sY0FBYyxHQUFHLElBQUksOEJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsSUFBTSxrQkFBa0IsR0FBRywrQkFBa0IsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDNUUsa0JBQWtCLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELElBQU0sTUFBTSxHQUFHLDZCQUFRLENBQUMsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN2RCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBWEQsMENBV0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixVQUF5QixFQUFFLFlBQTBCLEVBQUUsT0FBMEI7UUFDbkYsSUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ25DLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSwrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWpDLENBQWlDLENBQUM7YUFDeEUsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQTVELENBQTRELENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFORCxnREFNQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsVUFBeUIsRUFBRSxhQUE0QixFQUFFLE9BQTBCO1FBQ3JGLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLElBQUksR0FBSSxhQUFhLENBQUMsV0FBbUMsQ0FBQyxJQUFNLENBQUM7UUFDdkUsSUFBTSxXQUFXLEdBQ2IsYUFBYSxDQUFDLFdBQVc7YUFDcEIsR0FBRyxDQUNBLFVBQUEsQ0FBQyxJQUFJLE9BQUEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSwrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQXRDLENBQXNDLENBQUM7YUFDaEUsTUFBTSxDQUFDLCtCQUFrQixDQUN0Qix5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7YUFDcEUsR0FBRyxDQUNBLFVBQUEsU0FBUztZQUNMLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQWpFLENBQWlFLENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQU5mLENBTWUsQ0FBQzthQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQWhCRCw4Q0FnQkM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyx5QkFBeUIsQ0FDOUIsWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzdFLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlUHJvcEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7U291cmNlTWFwQ29udmVydGVyLCBjb21tZW50UmVnZXgsIGZyb21KU09OLCBmcm9tTWFwRmlsZVNvdXJjZSwgZnJvbU9iamVjdCwgZnJvbVNvdXJjZSwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgbWFwRmlsZUNvbW1lbnRSZWdleCwgcmVtb3ZlQ29tbWVudHMsIHJlbW92ZU1hcEZpbGVDb21tZW50c30gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCB7cmVhZEZpbGVTeW5jLCBzdGF0U3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge2Jhc2VuYW1lLCBkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtTb3VyY2VNYXBDb25zdW1lciwgU291cmNlTWFwR2VuZXJhdG9yLCBSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy9ob3N0JztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHt0cmFuc2xhdGVTdGF0ZW1lbnQsIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4uLy4uLy4uL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtOZ2NjSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi9uZ2NjX2ltcG9ydF9tYW5hZ2VyJztcbmltcG9ydCB7Q29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHlzaXN9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi5cbiAgICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEdHNDbGFzc0luZm8ge1xuICBkdHNEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcm90ZWN0ZWQgcmV3cml0ZUNvcmVJbXBvcnRzVG86IHRzLlNvdXJjZUZpbGV8bnVsbCwgcHJvdGVjdGVkIHNvdXJjZVBhdGg6IHN0cmluZyxcbiAgICAgIHByb3RlY3RlZCB0YXJnZXRQYXRoOiBzdHJpbmcsIHByb3RlY3RlZCB0cmFuc2Zvcm1EdHM6IGJvb2xlYW4pIHt9XG5cbiAgcmVuZGVyUHJvZ3JhbShcbiAgICAgIHByb2dyYW06IHRzLlByb2dyYW0sIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAgcHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLm1hcChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVkRmlsZSA9IGRlY29yYXRpb25BbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcblxuICAgICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcykge1xuICAgICAgICByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJGaWxlKHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICh0aGlzLnRyYW5zZm9ybUR0cykge1xuICAgICAgLy8gVHJhbnNmb3JtIHRoZSAuZC50cyBmaWxlc1xuICAgICAgY29uc3QgZHRzRmlsZXMgPSB0aGlzLmdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKGRlY29yYXRpb25BbmFseXNlcyk7XG4gICAgICBkdHNGaWxlcy5mb3JFYWNoKChjbGFzc2VzLCBmaWxlKSA9PiByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJEdHNGaWxlKGZpbGUsIGNsYXNzZXMpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoc291cmNlRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuXG4gICAgaWYgKHN3aXRjaE1hcmtlckFuYWx5c2lzKSB7XG4gICAgICB0aGlzLnJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgICAgIG91dHB1dFRleHQsIHN3aXRjaE1hcmtlckFuYWx5c2lzLnNvdXJjZUZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLmRlY2xhcmF0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSkge1xuICAgICAgY29uc3QgaW1wb3J0TWFuYWdlciA9XG4gICAgICAgICAgbmV3IE5nY2NJbXBvcnRNYW5hZ2VyKCF0aGlzLnJld3JpdGVDb3JlSW1wb3J0c1RvLCB0aGlzLmlzQ29yZSwgSU1QT1JUX1BSRUZJWCk7XG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4oKTtcblxuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID0gcmVuZGVyRGVmaW5pdGlvbnMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5hZGREZWZpbml0aW9ucyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgICAgdGhpcy50cmFja0RlY29yYXRvcnMoY2xhenouZGVjb3JhdG9ycywgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbnN0YW50cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LFxuICAgICAgICAgIHJlbmRlckNvbnN0YW50UG9vbChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLmNvbnN0YW50UG9vbCwgaW1wb3J0TWFuYWdlciksXG4gICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuXG4gICAgICB0aGlzLmFkZEltcG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsIHRoaXMucmV3cml0ZUNvcmVJbXBvcnRzVG8pKTtcblxuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnRydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnMgKHdlIG5lZWQgaW5mbyBmcm9tIHRoZVxuICAgICAgLy8gaGFuZGxlcnMgdG8gZG8gdGhpcylcbiAgICAgIHRoaXMucmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXRUZXh0LCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlbmRlclNvdXJjZUFuZE1hcChzb3VyY2VGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gIH1cblxuICByZW5kZXJEdHNGaWxlKGR0c0ZpbGU6IHRzLlNvdXJjZUZpbGUsIGR0c0NsYXNzZXM6IER0c0NsYXNzSW5mb1tdKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoZHRzRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgTmdjY0ltcG9ydE1hbmFnZXIoZmFsc2UsIHRoaXMuaXNDb3JlLCBJTVBPUlRfUFJFRklYKTtcblxuICAgIGR0c0NsYXNzZXMuZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGAgICAgc3RhdGljICR7ZGVjbGFyYXRpb24ubmFtZX06ICR7dHlwZX07XFxuYDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRSaWdodChlbmRPZkNsYXNzIC0gMSwgbmV3U3RhdGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRJbXBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZHRzRmlsZS5maWxlTmFtZSwgdGhpcy5yZXdyaXRlQ29yZUltcG9ydHNUbykpO1xuXG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU291cmNlQW5kTWFwKGR0c0ZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge25hbWU6IHN0cmluZywgYXM6IHN0cmluZ31bXSk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICAgIGRlY2xhcmF0aW9uczogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgZGVjb3JhdG9yIG5vZGVzIHRoYXQgYXJlIHRvIGJlIHJlbW92ZWQgdG8gYSBtYXBcbiAgICogU28gdGhhdCB3ZSBjYW4gdGVsbCBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5XG4gICAqL1xuICBwcm90ZWN0ZWQgdHJhY2tEZWNvcmF0b3JzKGRlY29yYXRvcnM6IERlY29yYXRvcltdLCBkZWNvcmF0b3JzVG9SZW1vdmU6IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KTpcbiAgICAgIHZvaWQge1xuICAgIGRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgY29uc3QgZGVjb3JhdG9yQXJyYXkgPSBkZWMubm9kZS5wYXJlbnQgITtcbiAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSAhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbWFwIGZyb20gdGhlIHNvdXJjZSAobm90ZSB3aGV0aGVyIGl0IGlzIGlubGluZSBvciBleHRlcm5hbClcbiAgICovXG4gIHByb3RlY3RlZCBleHRyYWN0U291cmNlTWFwKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VNYXBJbmZvIHtcbiAgICBjb25zdCBpbmxpbmUgPSBjb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuICAgIGNvbnN0IGV4dGVybmFsID0gbWFwRmlsZUNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBjb25zdCBpbmxpbmVTb3VyY2VNYXAgPSBmcm9tU291cmNlKGZpbGUudGV4dCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHJlbW92ZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgICAgIGlzSW5saW5lOiB0cnVlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV4dGVybmFsKSB7XG4gICAgICBsZXQgZXh0ZXJuYWxTb3VyY2VNYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsID0gbnVsbDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU1hcEZpbGVTb3VyY2UoZmlsZS50ZXh0LCBkaXJuYW1lKGZpbGUuZmlsZU5hbWUpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgIGBUaGUgZXh0ZXJuYWwgbWFwIGZpbGUgc3BlY2lmaWVkIGluIHRoZSBzb3VyY2UgY29kZSBjb21tZW50IFwiJHtlLnBhdGh9XCIgd2FzIG5vdCBmb3VuZCBvbiB0aGUgZmlsZSBzeXN0ZW0uYCk7XG4gICAgICAgICAgY29uc3QgbWFwUGF0aCA9IGZpbGUuZmlsZU5hbWUgKyAnLm1hcCc7XG4gICAgICAgICAgaWYgKGJhc2VuYW1lKGUucGF0aCkgIT09IGJhc2VuYW1lKG1hcFBhdGgpICYmIHN0YXRTeW5jKG1hcFBhdGgpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgICAgYEd1ZXNzaW5nIHRoZSBtYXAgZmlsZSBuYW1lIGZyb20gdGhlIHNvdXJjZSBmaWxlIG5hbWU6IFwiJHtiYXNlbmFtZShtYXBQYXRoKX1cImApO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tT2JqZWN0KEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hcFBhdGgsICd1dGY4JykpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtzb3VyY2U6IGZpbGUudGV4dCwgbWFwOiBudWxsLCBpc0lubGluZTogZmFsc2V9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gICAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAgICovXG4gIHByb3RlY3RlZCByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbnB1dDogU291cmNlTWFwSW5mbywgb3V0cHV0OiBNYWdpY1N0cmluZyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dFBhdGggPSByZXNvbHZlKHRoaXMudGFyZ2V0UGF0aCwgcmVsYXRpdmUodGhpcy5zb3VyY2VQYXRoLCBzb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgY29uc3Qgb3V0cHV0TWFwUGF0aCA9IGAke291dHB1dFBhdGh9Lm1hcGA7XG4gICAgY29uc3Qgb3V0cHV0TWFwID0gb3V0cHV0LmdlbmVyYXRlTWFwKHtcbiAgICAgIHNvdXJjZTogc291cmNlRmlsZS5maWxlTmFtZSxcbiAgICAgIGluY2x1ZGVDb250ZW50OiB0cnVlLFxuICAgICAgLy8gaGlyZXM6IHRydWUgLy8gVE9ETzogVGhpcyByZXN1bHRzIGluIGFjY3VyYXRlIGJ1dCBodWdlIHNvdXJjZW1hcHMuIEluc3RlYWQgd2Ugc2hvdWxkIGZpeFxuICAgICAgLy8gdGhlIG1lcmdlIGFsZ29yaXRobS5cbiAgICB9KTtcblxuICAgIC8vIHdlIG11c3Qgc2V0IHRoaXMgYWZ0ZXIgZ2VuZXJhdGlvbiBhcyBtYWdpYyBzdHJpbmcgZG9lcyBcIm1hbmlwdWxhdGlvblwiIG9uIHRoZSBwYXRoXG4gICAgb3V0cHV0TWFwLmZpbGUgPSBvdXRwdXRQYXRoO1xuXG4gICAgY29uc3QgbWVyZ2VkTWFwID1cbiAgICAgICAgbWVyZ2VTb3VyY2VNYXBzKGlucHV0Lm1hcCAmJiBpbnB1dC5tYXAudG9PYmplY3QoKSwgSlNPTi5wYXJzZShvdXRwdXRNYXAudG9TdHJpbmcoKSkpO1xuXG4gICAgY29uc3QgcmVzdWx0OiBGaWxlSW5mb1tdID0gW107XG4gICAgaWYgKGlucHV0LmlzSW5saW5lKSB7XG4gICAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBwYXRoOiBvdXRwdXRQYXRoLFxuICAgICAgICBjb250ZW50czogYCR7b3V0cHV0LnRvU3RyaW5nKCl9XFxuJHtnZW5lcmF0ZU1hcEZpbGVDb21tZW50KG91dHB1dE1hcFBhdGgpfWBcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0LnB1c2goe3BhdGg6IG91dHB1dE1hcFBhdGgsIGNvbnRlbnRzOiBtZXJnZWRNYXAudG9KU09OKCl9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihhbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzKTpcbiAgICAgIE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNDbGFzc0luZm9bXT4ge1xuICAgIGNvbnN0IGR0c01hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgRHRzQ2xhc3NJbmZvW10+KCk7XG4gICAgYW5hbHlzZXMuZm9yRWFjaChjb21waWxlZEZpbGUgPT4ge1xuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNvbXBpbGVkQ2xhc3MgPT4ge1xuICAgICAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbk9mQ2xhc3MoY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgICAgIGlmIChkdHNEZWNsYXJhdGlvbikge1xuICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgY29uc3QgY2xhc3NlcyA9IGR0c01hcC5nZXQoZHRzRmlsZSkgfHwgW107XG4gICAgICAgICAgY2xhc3Nlcy5wdXNoKHtkdHNEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb259KTtcbiAgICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIGNsYXNzZXMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZHRzTWFwO1xuICB9XG59XG5cbi8qKlxuICogTWVyZ2UgdGhlIHR3byBzcGVjaWZpZWQgc291cmNlLW1hcHMgaW50byBhIHNpbmdsZSBzb3VyY2UtbWFwIHRoYXQgaGlkZXMgdGhlIGludGVybWVkaWF0ZVxuICogc291cmNlLW1hcC5cbiAqIEUuZy4gQ29uc2lkZXIgdGhlc2UgbWFwcGluZ3M6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE9MRF9NQVAgLT4gSU5URVJNRURJQVRFX1NSQyAtPiBORVdfTUFQIC0+IE5FV19TUkNcbiAqIGBgYFxuICpcbiAqIHRoaXMgd2lsbCBiZSByZXBsYWNlZCB3aXRoOlxuICpcbiAqIGBgYFxuICogT0xEX1NSQyAtPiBNRVJHRURfTUFQIC0+IE5FV19TUkNcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VTb3VyY2VNYXBzKFxuICAgIG9sZE1hcDogUmF3U291cmNlTWFwIHwgbnVsbCwgbmV3TWFwOiBSYXdTb3VyY2VNYXApOiBTb3VyY2VNYXBDb252ZXJ0ZXIge1xuICBpZiAoIW9sZE1hcCkge1xuICAgIHJldHVybiBmcm9tT2JqZWN0KG5ld01hcCk7XG4gIH1cbiAgY29uc3Qgb2xkTWFwQ29uc3VtZXIgPSBuZXcgU291cmNlTWFwQ29uc3VtZXIob2xkTWFwKTtcbiAgY29uc3QgbmV3TWFwQ29uc3VtZXIgPSBuZXcgU291cmNlTWFwQ29uc3VtZXIobmV3TWFwKTtcbiAgY29uc3QgbWVyZ2VkTWFwR2VuZXJhdG9yID0gU291cmNlTWFwR2VuZXJhdG9yLmZyb21Tb3VyY2VNYXAobmV3TWFwQ29uc3VtZXIpO1xuICBtZXJnZWRNYXBHZW5lcmF0b3IuYXBwbHlTb3VyY2VNYXAob2xkTWFwQ29uc3VtZXIpO1xuICBjb25zdCBtZXJnZWQgPSBmcm9tSlNPTihtZXJnZWRNYXBHZW5lcmF0b3IudG9TdHJpbmcoKSk7XG4gIHJldHVybiBtZXJnZWQ7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBjb25zdGFudCBwb29sIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDb25zdGFudFBvb2woXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsIGltcG9ydHM6IE5nY2NJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgcmV0dXJuIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzKSlcbiAgICAgIC5tYXAoc3RtdCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgc291cmNlRmlsZSkpXG4gICAgICAuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgaW1wb3J0czogTmdjY0ltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICBjb25zdCBuYW1lID0gKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24gYXMgdHMuTmFtZWREZWNsYXJhdGlvbikubmFtZSAhO1xuICBjb25zdCBkZWZpbml0aW9ucyA9XG4gICAgICBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9uXG4gICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgYyA9PiBjLnN0YXRlbWVudHMubWFwKHN0YXRlbWVudCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RhdGVtZW50LCBpbXBvcnRzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmNvbmNhdCh0cmFuc2xhdGVTdGF0ZW1lbnQoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplciksIGltcG9ydHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSlcbiAgICAgICAgICAuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cbiJdfQ==