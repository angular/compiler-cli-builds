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
        function Renderer(host, isCore, bundle, sourcePath, targetPath) {
            this.host = host;
            this.isCore = isCore;
            this.bundle = bundle;
            this.sourcePath = sourcePath;
            this.targetPath = targetPath;
        }
        Renderer.prototype.renderProgram = function (decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses) {
            var _this = this;
            var renderedFiles = [];
            // Transform the source files.
            this.bundle.src.program.getSourceFiles().map(function (sourceFile) {
                var compiledFile = decorationAnalyses.get(sourceFile);
                var switchMarkerAnalysis = switchMarkerAnalyses.get(sourceFile);
                if (compiledFile || switchMarkerAnalysis || sourceFile === _this.bundle.src.file) {
                    renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderFile(sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses)));
                }
            });
            // Transform the .d.ts files
            if (this.bundle.dts) {
                var dtsFiles = this.getTypingsFilesToRender(decorationAnalyses);
                // If the dts entry-point is not already there (it did not have compiled classes)
                // then add it now, to ensure it gets its extra exports rendered.
                if (!dtsFiles.has(this.bundle.dts.file)) {
                    dtsFiles.set(this.bundle.dts.file, []);
                }
                dtsFiles.forEach(function (classes, file) { return renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderDtsFile(file, classes, privateDeclarationsAnalyses))); });
            }
            return renderedFiles;
        };
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param compiledFile The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
        Renderer.prototype.renderFile = function (sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses) {
            var _this = this;
            var input = this.extractSourceMap(sourceFile);
            var outputText = new magic_string_1.default(input.source);
            if (switchMarkerAnalysis) {
                this.rewriteSwitchableDeclarations(outputText, switchMarkerAnalysis.sourceFile, switchMarkerAnalysis.declarations);
            }
            if (compiledFile) {
                var importManager_1 = new ngcc_import_manager_1.NgccImportManager(this.bundle.isFlat, this.isCore, constants_1.IMPORT_PREFIX);
                var decoratorsToRemove_1 = new Map();
                compiledFile.compiledClasses.forEach(function (clazz) {
                    var renderedDefinition = renderDefinitions(compiledFile.sourceFile, clazz, importManager_1);
                    _this.addDefinitions(outputText, clazz, renderedDefinition);
                    _this.trackDecorators(clazz.decorators, decoratorsToRemove_1);
                });
                this.addConstants(outputText, renderConstantPool(compiledFile.sourceFile, compiledFile.constantPool, importManager_1), compiledFile.sourceFile);
                this.addImports(outputText, importManager_1.getAllImports(compiledFile.sourceFile.fileName, this.bundle.src.r3SymbolsFile));
                // TODO: remove constructor param metadata and property decorators (we need info from the
                // handlers to do this)
                this.removeDecorators(outputText, decoratorsToRemove_1);
            }
            // Add exports to the entry-point file
            if (sourceFile === this.bundle.src.file) {
                var entryPointBasePath = stripExtension(this.bundle.src.path);
                this.addExports(outputText, entryPointBasePath, privateDeclarationsAnalyses);
            }
            return this.renderSourceAndMap(sourceFile, input, outputText);
        };
        Renderer.prototype.renderDtsFile = function (dtsFile, dtsClasses, privateDeclarationsAnalyses) {
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
            this.addImports(outputText, importManager.getAllImports(dtsFile.fileName, this.bundle.dts.r3SymbolsFile));
            if (dtsFile === this.bundle.dts.file) {
                var dtsExports = privateDeclarationsAnalyses.map(function (e) {
                    if (!e.dtsFrom) {
                        throw new Error("There is no typings path for " + e.identifier + " in " + e.from + ".\n" +
                            "We need to add an export for this class to a .d.ts typings file because " +
                            "Angular compiler needs to be able to reference this class in compiled code, such as templates.\n" +
                            "The simplest fix for this is to ensure that this class is exported from the package's entry-point.");
                    }
                    return { identifier: e.identifier, from: e.dtsFrom };
                });
                this.addExports(outputText, dtsFile.fileName, dtsExports);
            }
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
    function stripExtension(filePath) {
        return filePath.replace(/\.(js|d\.ts$)/, '');
    }
    exports.stripExtension = stripExtension;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiLi4vLi4vLi4vLi4vIiwic291cmNlcyI6WyJwYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBc0c7SUFDdEcseURBQTZNO0lBQzdNLHlCQUEwQztJQUMxQyw2Q0FBdUM7SUFDdkMsaURBQW9FO0lBQ3BFLHlDQUErRTtJQUMvRSwrQkFBaUM7SUFJakMseUVBQTRFO0lBQzVFLHdHQUF3RDtJQUl4RCwwRUFBMkM7SUE2QjNDOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDYyxJQUF3QixFQUFZLE1BQWUsRUFDbkQsTUFBd0IsRUFBWSxVQUFrQixFQUN0RCxVQUFrQjtZQUZsQixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFZLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDbkQsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7WUFBWSxlQUFVLEdBQVYsVUFBVSxDQUFRO1lBQ3RELGVBQVUsR0FBVixVQUFVLENBQVE7UUFBRyxDQUFDO1FBRXBDLGdDQUFhLEdBQWIsVUFDSSxrQkFBc0MsRUFBRSxvQkFBMEMsRUFDbEYsMkJBQXdEO1lBRjVELGlCQStCQztZQTVCQyxJQUFNLGFBQWEsR0FBZSxFQUFFLENBQUM7WUFFckMsOEJBQThCO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVO2dCQUNyRCxJQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hELElBQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUVsRSxJQUFJLFlBQVksSUFBSSxvQkFBb0IsSUFBSSxVQUFVLEtBQUssS0FBSSxDQUFD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QUMsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNwRSxHQUFHLENBQ0EsVUFBQSxTQUFTO1lBQ0wsT0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUM7UUFBakUsQ0FBaUUsQ0FBQzthQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBTmYsQ0FNZSxDQUFDO2FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBaEJELDhDQWdCQztJQUVELFNBQWdCLGNBQWMsQ0FBQyxRQUFnQjtRQUM3QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFGRCx3Q0FFQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLHlCQUF5QixDQUM5QixZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtTb3VyY2VNYXBDb252ZXJ0ZXIsIGNvbW1lbnRSZWdleCwgZnJvbUpTT04sIGZyb21NYXBGaWxlU291cmNlLCBmcm9tT2JqZWN0LCBmcm9tU291cmNlLCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBtYXBGaWxlQ29tbWVudFJlZ2V4LCByZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmMsIHN0YXRTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7YmFzZW5hbWUsIGRpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge1NvdXJjZU1hcENvbnN1bWVyLCBTb3VyY2VNYXBHZW5lcmF0b3IsIFJhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNvcmF0b3J9IGZyb20gJy4uLy4uLy4uL25ndHNjL2hvc3QnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge3RyYW5zbGF0ZVN0YXRlbWVudCwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vLi4vbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge05nY2NJbXBvcnRNYW5hZ2VyfSBmcm9tICcuL25nY2NfaW1wb3J0X21hbmFnZXInO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgRXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHlzaXN9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi5cbiAgICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEdHNDbGFzc0luZm8ge1xuICBkdHNEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcm90ZWN0ZWQgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCBwcm90ZWN0ZWQgc291cmNlUGF0aDogc3RyaW5nLFxuICAgICAgcHJvdGVjdGVkIHRhcmdldFBhdGg6IHN0cmluZykge31cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAgdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc291cmNlRmlsZSA9PiB7XG4gICAgICBjb25zdCBjb21waWxlZEZpbGUgPSBkZWNvcmF0aW9uQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzaXMgPSBzd2l0Y2hNYXJrZXJBbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG5cbiAgICAgIGlmIChjb21waWxlZEZpbGUgfHwgc3dpdGNoTWFya2VyQW5hbHlzaXMgfHwgc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgICAgcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRmlsZShcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcykpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSAuZC50cyBmaWxlc1xuICAgIGlmICh0aGlzLmJ1bmRsZS5kdHMpIHtcbiAgICAgIGNvbnN0IGR0c0ZpbGVzID0gdGhpcy5nZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihkZWNvcmF0aW9uQW5hbHlzZXMpO1xuXG4gICAgICAvLyBJZiB0aGUgZHRzIGVudHJ5LXBvaW50IGlzIG5vdCBhbHJlYWR5IHRoZXJlIChpdCBkaWQgbm90IGhhdmUgY29tcGlsZWQgY2xhc3NlcylcbiAgICAgIC8vIHRoZW4gYWRkIGl0IG5vdywgdG8gZW5zdXJlIGl0IGdldHMgaXRzIGV4dHJhIGV4cG9ydHMgcmVuZGVyZWQuXG4gICAgICBpZiAoIWR0c0ZpbGVzLmhhcyh0aGlzLmJ1bmRsZS5kdHMuZmlsZSkpIHtcbiAgICAgICAgZHRzRmlsZXMuc2V0KHRoaXMuYnVuZGxlLmR0cy5maWxlLCBbXSk7XG4gICAgICB9XG4gICAgICBkdHNGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChjbGFzc2VzLCBmaWxlKSA9PiByZW5kZXJlZEZpbGVzLnB1c2goXG4gICAgICAgICAgICAgIC4uLnRoaXMucmVuZGVyRHRzRmlsZShmaWxlLCBjbGFzc2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZXh0cmFjdFNvdXJjZU1hcChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG5cbiAgICBpZiAoc3dpdGNoTWFya2VyQW5hbHlzaXMpIHtcbiAgICAgIHRoaXMucmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgc3dpdGNoTWFya2VyQW5hbHlzaXMuc291cmNlRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMuZGVjbGFyYXRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlKSB7XG4gICAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IE5nY2NJbXBvcnRNYW5hZ2VyKHRoaXMuYnVuZGxlLmlzRmxhdCwgdGhpcy5pc0NvcmUsIElNUE9SVF9QUkVGSVgpO1xuICAgICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gbmV3IE1hcDx0cy5Ob2RlLCB0cy5Ob2RlW10+KCk7XG5cbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVkRGVmaW5pdGlvbiA9IHJlbmRlckRlZmluaXRpb25zKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG4gICAgICAgIHRoaXMudHJhY2tEZWNvcmF0b3JzKGNsYXp6LmRlY29yYXRvcnMsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb25zdGFudHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICByZW5kZXJDb25zdGFudFBvb2woY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZS5jb25zdGFudFBvb2wsIGltcG9ydE1hbmFnZXIpLFxuICAgICAgICAgIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcblxuICAgICAgdGhpcy5hZGRJbXBvcnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUsIHRoaXMuYnVuZGxlLnNyYy5yM1N5bWJvbHNGaWxlKSk7XG5cbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zdHJ1Y3RvciBwYXJhbSBtZXRhZGF0YSBhbmQgcHJvcGVydHkgZGVjb3JhdG9ycyAod2UgbmVlZCBpbmZvIGZyb20gdGhlXG4gICAgICAvLyBoYW5kbGVycyB0byBkbyB0aGlzKVxuICAgICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIGV4cG9ydHMgdG8gdGhlIGVudHJ5LXBvaW50IGZpbGVcbiAgICBpZiAoc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuYWRkRXhwb3J0cyhvdXRwdXRUZXh0LCBlbnRyeVBvaW50QmFzZVBhdGgsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU291cmNlQW5kTWFwKHNvdXJjZUZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHJlbmRlckR0c0ZpbGUoXG4gICAgICBkdHNGaWxlOiB0cy5Tb3VyY2VGaWxlLCBkdHNDbGFzc2VzOiBEdHNDbGFzc0luZm9bXSxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoZHRzRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgTmdjY0ltcG9ydE1hbmFnZXIoZmFsc2UsIHRoaXMuaXNDb3JlLCBJTVBPUlRfUFJFRklYKTtcblxuICAgIGR0c0NsYXNzZXMuZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGAgICAgc3RhdGljICR7ZGVjbGFyYXRpb24ubmFtZX06ICR7dHlwZX07XFxuYDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRSaWdodChlbmRPZkNsYXNzIC0gMSwgbmV3U3RhdGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRJbXBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZHRzRmlsZS5maWxlTmFtZSwgdGhpcy5idW5kbGUuZHRzICEucjNTeW1ib2xzRmlsZSkpO1xuXG4gICAgaWYgKGR0c0ZpbGUgPT09IHRoaXMuYnVuZGxlLmR0cyAhLmZpbGUpIHtcbiAgICAgIGNvbnN0IGR0c0V4cG9ydHMgPSBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMubWFwKGUgPT4ge1xuICAgICAgICBpZiAoIWUuZHRzRnJvbSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZXJlIGlzIG5vIHR5cGluZ3MgcGF0aCBmb3IgJHtlLmlkZW50aWZpZXJ9IGluICR7ZS5mcm9tfS5cXG5gICtcbiAgICAgICAgICAgICAgYFdlIG5lZWQgdG8gYWRkIGFuIGV4cG9ydCBmb3IgdGhpcyBjbGFzcyB0byBhIC5kLnRzIHR5cGluZ3MgZmlsZSBiZWNhdXNlIGAgK1xuICAgICAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBuZWVkcyB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSB0aGlzIGNsYXNzIGluIGNvbXBpbGVkIGNvZGUsIHN1Y2ggYXMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhlIHNpbXBsZXN0IGZpeCBmb3IgdGhpcyBpcyB0byBlbnN1cmUgdGhhdCB0aGlzIGNsYXNzIGlzIGV4cG9ydGVkIGZyb20gdGhlIHBhY2thZ2UncyBlbnRyeS1wb2ludC5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge2lkZW50aWZpZXI6IGUuaWRlbnRpZmllciwgZnJvbTogZS5kdHNGcm9tfTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hZGRFeHBvcnRzKG91dHB1dFRleHQsIGR0c0ZpbGUuZmlsZU5hbWUsIGR0c0V4cG9ydHMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlbmRlclNvdXJjZUFuZE1hcChkdHNGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkQ29uc3RhbnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbnN0YW50czogc3RyaW5nLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRJbXBvcnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGltcG9ydHM6IHtuYW1lOiBzdHJpbmcsIGFzOiBzdHJpbmd9W10pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRXhwb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBlbnRyeVBvaW50QmFzZVBhdGg6IHN0cmluZywgZXhwb3J0czoge1xuICAgIGlkZW50aWZpZXI6IHN0cmluZyxcbiAgICBmcm9tOiBzdHJpbmdcbiAgfVtdKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZERlZmluaXRpb25zKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW1vdmVEZWNvcmF0b3JzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPik6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgIG91dHB1dFRleHQ6IE1hZ2ljU3RyaW5nLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgZGVjbGFyYXRpb25zOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdKTogdm9pZDtcblxuICAvKipcbiAgICogQWRkIHRoZSBkZWNvcmF0b3Igbm9kZXMgdGhhdCBhcmUgdG8gYmUgcmVtb3ZlZCB0byBhIG1hcFxuICAgKiBTbyB0aGF0IHdlIGNhbiB0ZWxsIGlmIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHlcbiAgICovXG4gIHByb3RlY3RlZCB0cmFja0RlY29yYXRvcnMoZGVjb3JhdG9yczogRGVjb3JhdG9yW10sIGRlY29yYXRvcnNUb1JlbW92ZTogTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT4pOlxuICAgICAgdm9pZCB7XG4gICAgZGVjb3JhdG9ycy5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCAhO1xuICAgICAgaWYgKCFkZWNvcmF0b3JzVG9SZW1vdmUuaGFzKGRlY29yYXRvckFycmF5KSkge1xuICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuc2V0KGRlY29yYXRvckFycmF5LCBbZGVjLm5vZGVdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5nZXQoZGVjb3JhdG9yQXJyYXkpICEucHVzaChkZWMubm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBtYXAgZnJvbSB0aGUgc291cmNlIChub3RlIHdoZXRoZXIgaXQgaXMgaW5saW5lIG9yIGV4dGVybmFsKVxuICAgKi9cbiAgcHJvdGVjdGVkIGV4dHJhY3RTb3VyY2VNYXAoZmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZU1hcEluZm8ge1xuICAgIGNvbnN0IGlubGluZSA9IGNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG4gICAgY29uc3QgZXh0ZXJuYWwgPSBtYXBGaWxlQ29tbWVudFJlZ2V4LnRlc3QoZmlsZS50ZXh0KTtcblxuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIGNvbnN0IGlubGluZVNvdXJjZU1hcCA9IGZyb21Tb3VyY2UoZmlsZS50ZXh0KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgICBtYXA6IGlubGluZVNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IHRydWUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXh0ZXJuYWwpIHtcbiAgICAgIGxldCBleHRlcm5hbFNvdXJjZU1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGwgPSBudWxsO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tTWFwRmlsZVNvdXJjZShmaWxlLnRleHQsIGRpcm5hbWUoZmlsZS5maWxlTmFtZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgYFRoZSBleHRlcm5hbCBtYXAgZmlsZSBzcGVjaWZpZWQgaW4gdGhlIHNvdXJjZSBjb2RlIGNvbW1lbnQgXCIke2UucGF0aH1cIiB3YXMgbm90IGZvdW5kIG9uIHRoZSBmaWxlIHN5c3RlbS5gKTtcbiAgICAgICAgICBjb25zdCBtYXBQYXRoID0gZmlsZS5maWxlTmFtZSArICcubWFwJztcbiAgICAgICAgICBpZiAoYmFzZW5hbWUoZS5wYXRoKSAhPT0gYmFzZW5hbWUobWFwUGF0aCkgJiYgc3RhdFN5bmMobWFwUGF0aCkuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICBgR3Vlc3NpbmcgdGhlIG1hcCBmaWxlIG5hbWUgZnJvbSB0aGUgc291cmNlIGZpbGUgbmFtZTogXCIke2Jhc2VuYW1lKG1hcFBhdGgpfVwiYCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21PYmplY3QoSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFwUGF0aCwgJ3V0ZjgnKSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiByZW1vdmVNYXBGaWxlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgICBtYXA6IGV4dGVybmFsU291cmNlTWFwLFxuICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge3NvdXJjZTogZmlsZS50ZXh0LCBtYXA6IG51bGwsIGlzSW5saW5lOiBmYWxzZX07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZS1tYXBzLCByZXBsYWNpbmcgdGhlIHNvdXJjZS1tYXAgY29tbWVudCBpbiB0aGUgb3V0cHV0IGZpbGVcbiAgICogd2l0aCBhbiBhcHByb3ByaWF0ZSBzb3VyY2UtbWFwIGNvbW1lbnQgcG9pbnRpbmcgdG8gdGhlIG1lcmdlZCBzb3VyY2UtbWFwLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlbmRlclNvdXJjZUFuZE1hcChcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGlucHV0OiBTb3VyY2VNYXBJbmZvLCBvdXRwdXQ6IE1hZ2ljU3RyaW5nKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUodGhpcy50YXJnZXRQYXRoLCByZWxhdGl2ZSh0aGlzLnNvdXJjZVBhdGgsIHNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcbiAgICBjb25zdCBvdXRwdXRNYXBQYXRoID0gYCR7b3V0cHV0UGF0aH0ubWFwYDtcbiAgICBjb25zdCBvdXRwdXRNYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBzb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgaW5jbHVkZUNvbnRlbnQ6IHRydWUsXG4gICAgICAvLyBoaXJlczogdHJ1ZSAvLyBUT0RPOiBUaGlzIHJlc3VsdHMgaW4gYWNjdXJhdGUgYnV0IGh1Z2Ugc291cmNlbWFwcy4gSW5zdGVhZCB3ZSBzaG91bGQgZml4XG4gICAgICAvLyB0aGUgbWVyZ2UgYWxnb3JpdGhtLlxuICAgIH0pO1xuXG4gICAgLy8gd2UgbXVzdCBzZXQgdGhpcyBhZnRlciBnZW5lcmF0aW9uIGFzIG1hZ2ljIHN0cmluZyBkb2VzIFwibWFuaXB1bGF0aW9uXCIgb24gdGhlIHBhdGhcbiAgICBvdXRwdXRNYXAuZmlsZSA9IG91dHB1dFBhdGg7XG5cbiAgICBjb25zdCBtZXJnZWRNYXAgPVxuICAgICAgICBtZXJnZVNvdXJjZU1hcHMoaW5wdXQubWFwICYmIGlucHV0Lm1hcC50b09iamVjdCgpLCBKU09OLnBhcnNlKG91dHB1dE1hcC50b1N0cmluZygpKSk7XG5cbiAgICBjb25zdCByZXN1bHQ6IEZpbGVJbmZvW10gPSBbXTtcbiAgICBpZiAoaW5wdXQuaXNJbmxpbmUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtwYXRoOiBvdXRwdXRQYXRoLCBjb250ZW50czogYCR7b3V0cHV0LnRvU3RyaW5nKCl9XFxuJHttZXJnZWRNYXAudG9Db21tZW50KCl9YH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHBhdGg6IG91dHB1dFBhdGgsXG4gICAgICAgIGNvbnRlbnRzOiBgJHtvdXRwdXQudG9TdHJpbmcoKX1cXG4ke2dlbmVyYXRlTWFwRmlsZUNvbW1lbnQob3V0cHV0TWFwUGF0aCl9YFxuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0TWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKGFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMpOlxuICAgICAgTWFwPHRzLlNvdXJjZUZpbGUsIER0c0NsYXNzSW5mb1tdPiB7XG4gICAgY29uc3QgZHRzTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNDbGFzc0luZm9bXT4oKTtcbiAgICBhbmFseXNlcy5mb3JFYWNoKGNvbXBpbGVkRmlsZSA9PiB7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uT2ZDbGFzcyhjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgaWYgKGR0c0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICBjb25zdCBjbGFzc2VzID0gZHRzTWFwLmdldChkdHNGaWxlKSB8fCBbXTtcbiAgICAgICAgICBjbGFzc2VzLnB1c2goe2R0c0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogY29tcGlsZWRDbGFzcy5jb21waWxhdGlvbn0pO1xuICAgICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgY2xhc3Nlcyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBkdHNNYXA7XG4gIH1cbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgdHdvIHNwZWNpZmllZCBzb3VyY2UtbWFwcyBpbnRvIGEgc2luZ2xlIHNvdXJjZS1tYXAgdGhhdCBoaWRlcyB0aGUgaW50ZXJtZWRpYXRlXG4gKiBzb3VyY2UtbWFwLlxuICogRS5nLiBDb25zaWRlciB0aGVzZSBtYXBwaW5nczpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gT0xEX01BUCAtPiBJTlRFUk1FRElBVEVfU1JDIC0+IE5FV19NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKlxuICogdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGg6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE1FUkdFRF9NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVNvdXJjZU1hcHMoXG4gICAgb2xkTWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBuZXdNYXA6IFJhd1NvdXJjZU1hcCk6IFNvdXJjZU1hcENvbnZlcnRlciB7XG4gIGlmICghb2xkTWFwKSB7XG4gICAgcmV0dXJuIGZyb21PYmplY3QobmV3TWFwKTtcbiAgfVxuICBjb25zdCBvbGRNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihvbGRNYXApO1xuICBjb25zdCBuZXdNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihuZXdNYXApO1xuICBjb25zdCBtZXJnZWRNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChuZXdNYXBDb25zdW1lcik7XG4gIG1lcmdlZE1hcEdlbmVyYXRvci5hcHBseVNvdXJjZU1hcChvbGRNYXBDb25zdW1lcik7XG4gIGNvbnN0IG1lcmdlZCA9IGZyb21KU09OKG1lcmdlZE1hcEdlbmVyYXRvci50b1N0cmluZygpKTtcbiAgcmV0dXJuIG1lcmdlZDtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCwgaW1wb3J0czogTmdjY0ltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICByZXR1cm4gY29uc3RhbnRQb29sLnN0YXRlbWVudHMubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMpKVxuICAgICAgLm1hcChzdG10ID0+IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCBzb3VyY2VGaWxlKSlcbiAgICAgIC5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAqIGRlZmluaXRpb25zLlxuICogQHBhcmFtIGltcG9ydHMgQW4gb2JqZWN0IHRoYXQgdHJhY2tzIHRoZSBpbXBvcnRzIHRoYXQgYXJlIG5lZWRlZCBieSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJEZWZpbml0aW9ucyhcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBOZ2NjSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lICE7XG4gIGNvbnN0IGRlZmluaXRpb25zID1cbiAgICAgIGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb25cbiAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICBjID0+IGMuc3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdGF0ZW1lbnQsIGltcG9ydHMpKVxuICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KHRyYW5zbGF0ZVN0YXRlbWVudChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSwgaW1wb3J0cykpXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpKVxuICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGRlZmluaXRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBFeHRlbnNpb24oZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC4oanN8ZFxcLnRzJCkvLCAnJyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFuZ3VsYXIgQVNUIHN0YXRlbWVudCBub2RlIHRoYXQgY29udGFpbnMgdGhlIGFzc2lnbm1lbnQgb2YgdGhlXG4gKiBjb21waWxlZCBkZWNvcmF0b3IgdG8gYmUgYXBwbGllZCB0byB0aGUgY2xhc3MuXG4gKiBAcGFyYW0gYW5hbHl6ZWRDbGFzcyBUaGUgaW5mbyBhYm91dCB0aGUgY2xhc3Mgd2hvc2Ugc3RhdGVtZW50IHdlIHdhbnQgdG8gY3JlYXRlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KFxuICAgIHJlY2VpdmVyTmFtZTogdHMuRGVjbGFyYXRpb25OYW1lLCBwcm9wTmFtZTogc3RyaW5nLCBpbml0aWFsaXplcjogRXhwcmVzc2lvbik6IFN0YXRlbWVudCB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG4iXX0=