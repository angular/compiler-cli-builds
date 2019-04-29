(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "convert-source-map", "magic-string", "source-map", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/path", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/constants", "@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter"], factory);
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
    var magic_string_1 = require("magic-string");
    var source_map_1 = require("source-map");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var path_1 = require("@angular/compiler-cli/src/ngtsc/path");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var constants_1 = require("@angular/compiler-cli/ngcc/src/constants");
    var ngcc_import_rewriter_1 = require("@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter");
    /**
     * A structure that captures information about what needs to be rendered
     * in a typings file.
     *
     * It is created as a result of processing the analysis passed to the renderer.
     *
     * The `renderDtsFile()` method consumes it when rendering a typings file.
     */
    var DtsRenderInfo = /** @class */ (function () {
        function DtsRenderInfo() {
            this.classInfo = [];
            this.moduleWithProviders = [];
            this.privateExports = [];
        }
        return DtsRenderInfo;
    }());
    exports.RedundantDecoratorMap = Map;
    /**
     * A base-class for rendering an `AnalyzedFile`.
     *
     * Package formats have output files that must be rendered differently. Concrete sub-classes must
     * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer(fs, logger, host, isCore, bundle) {
            this.fs = fs;
            this.logger = logger;
            this.host = host;
            this.isCore = isCore;
            this.bundle = bundle;
        }
        Renderer.prototype.renderProgram = function (decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
            var _this = this;
            var renderedFiles = [];
            // Transform the source files.
            this.bundle.src.program.getSourceFiles().forEach(function (sourceFile) {
                var compiledFile = decorationAnalyses.get(sourceFile);
                var switchMarkerAnalysis = switchMarkerAnalyses.get(sourceFile);
                if (compiledFile || switchMarkerAnalysis || sourceFile === _this.bundle.src.file) {
                    renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderFile(sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses)));
                }
            });
            // Transform the .d.ts files
            if (this.bundle.dts) {
                var dtsFiles = this.getTypingsFilesToRender(decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses);
                // If the dts entry-point is not already there (it did not have compiled classes)
                // then add it now, to ensure it gets its extra exports rendered.
                if (!dtsFiles.has(this.bundle.dts.file)) {
                    dtsFiles.set(this.bundle.dts.file, new DtsRenderInfo());
                }
                dtsFiles.forEach(function (renderInfo, file) { return renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderDtsFile(file, renderInfo))); });
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
                var importManager_1 = new translator_1.ImportManager(this.getImportRewriter(this.bundle.src.r3SymbolsFile, this.bundle.isFlatCore), constants_1.IMPORT_PREFIX);
                // TODO: remove constructor param metadata and property decorators (we need info from the
                // handlers to do this)
                var decoratorsToRemove = this.computeDecoratorsToRemove(compiledFile.compiledClasses);
                this.removeDecorators(outputText, decoratorsToRemove);
                compiledFile.compiledClasses.forEach(function (clazz) {
                    var renderedDefinition = renderDefinitions(compiledFile.sourceFile, clazz, importManager_1);
                    _this.addDefinitions(outputText, clazz, renderedDefinition);
                });
                this.addConstants(outputText, renderConstantPool(compiledFile.sourceFile, compiledFile.constantPool, importManager_1), compiledFile.sourceFile);
                this.addImports(outputText, importManager_1.getAllImports(compiledFile.sourceFile.fileName), compiledFile.sourceFile);
            }
            // Add exports to the entry-point file
            if (sourceFile === this.bundle.src.file) {
                var entryPointBasePath = stripExtension(this.bundle.src.path);
                this.addExports(outputText, entryPointBasePath, privateDeclarationsAnalyses);
            }
            return this.renderSourceAndMap(sourceFile, input, outputText);
        };
        Renderer.prototype.renderDtsFile = function (dtsFile, renderInfo) {
            var input = this.extractSourceMap(dtsFile);
            var outputText = new magic_string_1.default(input.source);
            var printer = ts.createPrinter();
            var importManager = new translator_1.ImportManager(this.getImportRewriter(this.bundle.dts.r3SymbolsFile, false), constants_1.IMPORT_PREFIX);
            renderInfo.classInfo.forEach(function (dtsClass) {
                var endOfClass = dtsClass.dtsDeclaration.getEnd();
                dtsClass.compilation.forEach(function (declaration) {
                    var type = translator_1.translateType(declaration.type, importManager);
                    var typeStr = printer.printNode(ts.EmitHint.Unspecified, type, dtsFile);
                    var newStatement = "    static " + declaration.name + ": " + typeStr + ";\n";
                    outputText.appendRight(endOfClass - 1, newStatement);
                });
            });
            this.addModuleWithProvidersParams(outputText, renderInfo.moduleWithProviders, importManager);
            this.addImports(outputText, importManager.getAllImports(dtsFile.fileName), dtsFile);
            this.addExports(outputText, path_1.AbsoluteFsPath.fromSourceFile(dtsFile), renderInfo.privateExports);
            return this.renderSourceAndMap(dtsFile, input, outputText);
        };
        /**
         * Add the type parameters to the appropriate functions that return `ModuleWithProviders`
         * structures.
         *
         * This function only gets called on typings files, so it doesn't need different implementations
         * for each bundle format.
         */
        Renderer.prototype.addModuleWithProvidersParams = function (outputText, moduleWithProviders, importManager) {
            var _this = this;
            moduleWithProviders.forEach(function (info) {
                var ngModuleName = info.ngModule.node.name.text;
                var declarationFile = path_1.AbsoluteFsPath.fromSourceFile(info.declaration.getSourceFile());
                var ngModuleFile = path_1.AbsoluteFsPath.fromSourceFile(info.ngModule.node.getSourceFile());
                var importPath = info.ngModule.viaModule ||
                    (declarationFile !== ngModuleFile ?
                        stripExtension("./" + path_1.PathSegment.relative(path_1.AbsoluteFsPath.dirname(declarationFile), ngModuleFile)) :
                        null);
                var ngModule = getImportString(importManager, importPath, ngModuleName);
                if (info.declaration.type) {
                    var typeName = info.declaration.type && ts.isTypeReferenceNode(info.declaration.type) ?
                        info.declaration.type.typeName :
                        null;
                    if (_this.isCoreModuleWithProvidersType(typeName)) {
                        // The declaration already returns `ModuleWithProvider` but it needs the `NgModule` type
                        // parameter adding.
                        outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), "ModuleWithProviders<" + ngModule + ">");
                    }
                    else {
                        // The declaration returns an unknown type so we need to convert it to a union that
                        // includes the ngModule property.
                        var originalTypeString = info.declaration.type.getText();
                        outputText.overwrite(info.declaration.type.getStart(), info.declaration.type.getEnd(), "(" + originalTypeString + ")&{ngModule:" + ngModule + "}");
                    }
                }
                else {
                    // The declaration has no return type so provide one.
                    var lastToken = info.declaration.getLastToken();
                    var insertPoint = lastToken && lastToken.kind === ts.SyntaxKind.SemicolonToken ?
                        lastToken.getStart() :
                        info.declaration.getEnd();
                    outputText.appendLeft(insertPoint, ": " + getImportString(importManager, '@angular/core', 'ModuleWithProviders') + "<" + ngModule + ">");
                }
            });
        };
        /**
         * From the given list of classes, computes a map of decorators that should be removed.
         * The decorators to remove are keyed by their container node, such that we can tell if
         * we should remove the entire decorator property.
         * @param classes The list of classes that may have decorators to remove.
         * @returns A map of decorators to remove, keyed by their container node.
         */
        Renderer.prototype.computeDecoratorsToRemove = function (classes) {
            var decoratorsToRemove = new exports.RedundantDecoratorMap();
            classes.forEach(function (clazz) {
                clazz.decorators.forEach(function (dec) {
                    var decoratorArray = dec.node.parent;
                    if (!decoratorsToRemove.has(decoratorArray)) {
                        decoratorsToRemove.set(decoratorArray, [dec.node]);
                    }
                    else {
                        decoratorsToRemove.get(decoratorArray).push(dec.node);
                    }
                });
            });
            return decoratorsToRemove;
        };
        /**
         * Get the map from the source (note whether it is inline or external)
         */
        Renderer.prototype.extractSourceMap = function (file) {
            var inline = convert_source_map_1.commentRegex.test(file.text);
            var external = convert_source_map_1.mapFileCommentRegex.exec(file.text);
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
                    var fileName = external[1] || external[2];
                    var filePath = path_1.AbsoluteFsPath.resolve(path_1.AbsoluteFsPath.dirname(path_1.AbsoluteFsPath.fromSourceFile(file)), fileName);
                    var mappingFile = this.fs.readFile(filePath);
                    externalSourceMap = convert_source_map_1.fromJSON(mappingFile);
                }
                catch (e) {
                    if (e.code === 'ENOENT') {
                        this.logger.warn("The external map file specified in the source code comment \"" + e.path + "\" was not found on the file system.");
                        var mapPath = path_1.AbsoluteFsPath.fromUnchecked(file.fileName + '.map');
                        if (path_1.PathSegment.basename(e.path) !== path_1.PathSegment.basename(mapPath) &&
                            this.fs.stat(mapPath).isFile()) {
                            this.logger.warn("Guessing the map file name from the source file name: \"" + path_1.PathSegment.basename(mapPath) + "\"");
                            try {
                                externalSourceMap = convert_source_map_1.fromObject(JSON.parse(this.fs.readFile(mapPath)));
                            }
                            catch (e) {
                                this.logger.error(e);
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
            var outputPath = path_1.AbsoluteFsPath.fromSourceFile(sourceFile);
            var outputMapPath = path_1.AbsoluteFsPath.fromUnchecked(outputPath + ".map");
            var relativeSourcePath = path_1.PathSegment.basename(outputPath);
            var relativeMapPath = relativeSourcePath + ".map";
            var outputMap = output.generateMap({
                source: outputPath,
                includeContent: true,
            });
            // we must set this after generation as magic string does "manipulation" on the path
            outputMap.file = relativeSourcePath;
            var mergedMap = mergeSourceMaps(input.map && input.map.toObject(), JSON.parse(outputMap.toString()));
            var result = [];
            if (input.isInline) {
                result.push({ path: outputPath, contents: output.toString() + "\n" + mergedMap.toComment() });
            }
            else {
                result.push({
                    path: outputPath,
                    contents: output.toString() + "\n" + convert_source_map_1.generateMapFileComment(relativeMapPath)
                });
                result.push({ path: outputMapPath, contents: mergedMap.toJSON() });
            }
            return result;
        };
        Renderer.prototype.getTypingsFilesToRender = function (decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
            var _this = this;
            var dtsMap = new Map();
            // Capture the rendering info from the decoration analyses
            decorationAnalyses.forEach(function (compiledFile) {
                compiledFile.compiledClasses.forEach(function (compiledClass) {
                    var dtsDeclaration = _this.host.getDtsDeclaration(compiledClass.declaration);
                    if (dtsDeclaration) {
                        var dtsFile = dtsDeclaration.getSourceFile();
                        var renderInfo = dtsMap.get(dtsFile) || new DtsRenderInfo();
                        renderInfo.classInfo.push({ dtsDeclaration: dtsDeclaration, compilation: compiledClass.compilation });
                        dtsMap.set(dtsFile, renderInfo);
                    }
                });
            });
            // Capture the ModuleWithProviders functions/methods that need updating
            if (moduleWithProvidersAnalyses !== null) {
                moduleWithProvidersAnalyses.forEach(function (moduleWithProvidersToFix, dtsFile) {
                    var renderInfo = dtsMap.get(dtsFile) || new DtsRenderInfo();
                    renderInfo.moduleWithProviders = moduleWithProvidersToFix;
                    dtsMap.set(dtsFile, renderInfo);
                });
            }
            // Capture the private declarations that need to be re-exported
            if (privateDeclarationsAnalyses.length) {
                privateDeclarationsAnalyses.forEach(function (e) {
                    if (!e.dtsFrom && !e.alias) {
                        throw new Error("There is no typings path for " + e.identifier + " in " + e.from + ".\n" +
                            "We need to add an export for this class to a .d.ts typings file because " +
                            "Angular compiler needs to be able to reference this class in compiled code, such as templates.\n" +
                            "The simplest fix for this is to ensure that this class is exported from the package's entry-point.");
                    }
                });
                var dtsEntryPoint = this.bundle.dts.file;
                var renderInfo = dtsMap.get(dtsEntryPoint) || new DtsRenderInfo();
                renderInfo.privateExports = privateDeclarationsAnalyses;
                dtsMap.set(dtsEntryPoint, renderInfo);
            }
            return dtsMap;
        };
        /**
         * Check whether the given type is the core Angular `ModuleWithProviders` interface.
         * @param typeName The type to check.
         * @returns true if the type is the core Angular `ModuleWithProviders` interface.
         */
        Renderer.prototype.isCoreModuleWithProvidersType = function (typeName) {
            var id = typeName && ts.isIdentifier(typeName) ? this.host.getImportOfIdentifier(typeName) : null;
            return (id && id.name === 'ModuleWithProviders' && (this.isCore || id.from === '@angular/core'));
        };
        Renderer.prototype.getImportRewriter = function (r3SymbolsFile, isFlat) {
            if (this.isCore && isFlat) {
                return new ngcc_import_rewriter_1.NgccFlatImportRewriter();
            }
            else if (this.isCore) {
                return new imports_1.R3SymbolsImportRewriter(r3SymbolsFile.fileName);
            }
            else {
                return new imports_1.NoopImportRewriter();
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
        return constantPool.statements
            .map(function (stmt) { return translator_1.translateStatement(stmt, imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER); })
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
        var translate = function (stmt) {
            return translator_1.translateStatement(stmt, imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER);
        };
        var print = function (stmt) {
            return printer.printNode(ts.EmitHint.Unspecified, translate(stmt), sourceFile);
        };
        var definitions = compiledClass.compilation
            .map(function (c) { return [createAssignmentStatement(name, c.name, c.initializer)]
            .concat(c.statements)
            .map(print)
            .join('\n'); })
            .join('\n');
        return definitions;
    }
    exports.renderDefinitions = renderDefinitions;
    function stripExtension(filePath) {
        return filePath.replace(/\.(js|d\.ts)$/, '');
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
    function getImportString(importManager, importPath, importName) {
        var importAs = importPath ? importManager.generateNamedImport(importPath, importName) : null;
        return importAs ? importAs.moduleImport + "." + importAs.symbol : "" + importName;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryx5REFBMEw7SUFDMUwsNkNBQXVDO0lBQ3ZDLHlDQUErRTtJQUMvRSwrQkFBaUM7SUFFakMsbUVBQXFJO0lBQ3JJLDZEQUFvRTtJQUVwRSx5RUFBK0Y7SUFNL0Ysc0VBQTJDO0lBSzNDLHNHQUE4RDtJQTJCOUQ7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7WUFDRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztZQUMvQix3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1lBQ3BELG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBQUQsb0JBQUM7SUFBRCxDQUFDLEFBSkQsSUFJQztJQVFZLFFBQUEscUJBQXFCLEdBQUcsR0FBRyxDQUFDO0lBRXpDOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDYyxFQUFjLEVBQVksTUFBYyxFQUFZLElBQXdCLEVBQzVFLE1BQWUsRUFBWSxNQUF3QjtZQURuRCxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFZLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQzVFLFdBQU0sR0FBTixNQUFNLENBQVM7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQUFHLENBQUM7UUFFckUsZ0NBQWEsR0FBYixVQUNJLGtCQUFzQyxFQUFFLG9CQUEwQyxFQUNsRiwyQkFBd0QsRUFDeEQsMkJBQTZEO1lBSGpFLGlCQWdDQztZQTVCQyxJQUFNLGFBQWEsR0FBZSxFQUFFLENBQUM7WUFFckMsOEJBQThCO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVB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QUFFLFVBQWtCO1FBQzdFLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9GLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBSSxRQUFRLENBQUMsWUFBWSxTQUFJLFFBQVEsQ0FBQyxNQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUcsVUFBWSxDQUFDO0lBQ3BGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlUHJvcEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7U291cmNlTWFwQ29udmVydGVyLCBjb21tZW50UmVnZXgsIGZyb21KU09OLCBmcm9tT2JqZWN0LCBmcm9tU291cmNlLCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBtYXBGaWxlQ29tbWVudFJlZ2V4LCByZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge1NvdXJjZU1hcENvbnN1bWVyLCBTb3VyY2VNYXBHZW5lcmF0b3IsIFJhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIEltcG9ydFJld3JpdGVyLCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aCwgUGF0aFNlZ21lbnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9wYXRoJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge3RyYW5zbGF0ZVN0YXRlbWVudCwgdHJhbnNsYXRlVHlwZSwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuXG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0luZm8sIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXNpc30gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0LCBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbn0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7TmdjY0ZsYXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi9uZ2NjX2ltcG9ydF9yZXdyaXRlcic7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBBYnNvbHV0ZUZzUGF0aDtcbiAgLyoqXG4gICAqIFRoZSBjb250ZW50cyBvZiB0aGUgZmlsZSB0byBiZSBiZSB3cml0dGVuLlxuICAgKi9cbiAgY29udGVudHM6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIER0c0NsYXNzSW5mbyB7XG4gIGR0c0RlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbjtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuLyoqXG4gKiBBIHN0cnVjdHVyZSB0aGF0IGNhcHR1cmVzIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgbmVlZHMgdG8gYmUgcmVuZGVyZWRcbiAqIGluIGEgdHlwaW5ncyBmaWxlLlxuICpcbiAqIEl0IGlzIGNyZWF0ZWQgYXMgYSByZXN1bHQgb2YgcHJvY2Vzc2luZyB0aGUgYW5hbHlzaXMgcGFzc2VkIHRvIHRoZSByZW5kZXJlci5cbiAqXG4gKiBUaGUgYHJlbmRlckR0c0ZpbGUoKWAgbWV0aG9kIGNvbnN1bWVzIGl0IHdoZW4gcmVuZGVyaW5nIGEgdHlwaW5ncyBmaWxlLlxuICovXG5jbGFzcyBEdHNSZW5kZXJJbmZvIHtcbiAgY2xhc3NJbmZvOiBEdHNDbGFzc0luZm9bXSA9IFtdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdID0gW107XG4gIHByaXZhdGVFeHBvcnRzOiBFeHBvcnRJbmZvW10gPSBbXTtcbn1cblxuLyoqXG4gKiBUaGUgY29sbGVjdGVkIGRlY29yYXRvcnMgdGhhdCBoYXZlIGJlY29tZSByZWR1bmRhbnQgYWZ0ZXIgdGhlIGNvbXBpbGF0aW9uXG4gKiBvZiBJdnkgc3RhdGljIGZpZWxkcy4gVGhlIG1hcCBpcyBrZXllZCBieSB0aGUgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZVxuICogY2FuIHRlbGwgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eVxuICovXG5leHBvcnQgdHlwZSBSZWR1bmRhbnREZWNvcmF0b3JNYXAgPSBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPjtcbmV4cG9ydCBjb25zdCBSZWR1bmRhbnREZWNvcmF0b3JNYXAgPSBNYXA7XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBmczogRmlsZVN5c3RlbSwgcHJvdGVjdGVkIGxvZ2dlcjogTG9nZ2VyLCBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJvdGVjdGVkIGlzQ29yZTogYm9vbGVhbiwgcHJvdGVjdGVkIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSkge31cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbCk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVJbmZvW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzLlxuICAgIHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVkRmlsZSA9IGRlY29yYXRpb25BbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcblxuICAgICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcyB8fCBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgICByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJGaWxlKFxuICAgICAgICAgICAgc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIC5kLnRzIGZpbGVzXG4gICAgaWYgKHRoaXMuYnVuZGxlLmR0cykge1xuICAgICAgY29uc3QgZHRzRmlsZXMgPSB0aGlzLmdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuXG4gICAgICAvLyBJZiB0aGUgZHRzIGVudHJ5LXBvaW50IGlzIG5vdCBhbHJlYWR5IHRoZXJlIChpdCBkaWQgbm90IGhhdmUgY29tcGlsZWQgY2xhc3NlcylcbiAgICAgIC8vIHRoZW4gYWRkIGl0IG5vdywgdG8gZW5zdXJlIGl0IGdldHMgaXRzIGV4dHJhIGV4cG9ydHMgcmVuZGVyZWQuXG4gICAgICBpZiAoIWR0c0ZpbGVzLmhhcyh0aGlzLmJ1bmRsZS5kdHMuZmlsZSkpIHtcbiAgICAgICAgZHRzRmlsZXMuc2V0KHRoaXMuYnVuZGxlLmR0cy5maWxlLCBuZXcgRHRzUmVuZGVySW5mbygpKTtcbiAgICAgIH1cbiAgICAgIGR0c0ZpbGVzLmZvckVhY2goXG4gICAgICAgICAgKHJlbmRlckluZm8sIGZpbGUpID0+IHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckR0c0ZpbGUoZmlsZSwgcmVuZGVySW5mbykpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRGaWxlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHNvdXJjZSBjb2RlIGFuZCBzb3VyY2UtbWFwIGZvciBhbiBBbmFseXplZCBmaWxlLlxuICAgKiBAcGFyYW0gY29tcGlsZWRGaWxlIFRoZSBhbmFseXplZCBmaWxlIHRvIHJlbmRlci5cbiAgICogQHBhcmFtIHRhcmdldFBhdGggVGhlIGFic29sdXRlIHBhdGggd2hlcmUgdGhlIHJlbmRlcmVkIGZpbGUgd2lsbCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcmVuZGVyRmlsZShcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZTogQ29tcGlsZWRGaWxlfHVuZGVmaW5lZCxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2lzOiBTd2l0Y2hNYXJrZXJBbmFseXNpc3x1bmRlZmluZWQsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5leHRyYWN0U291cmNlTWFwKHNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcblxuICAgIGlmIChzd2l0Y2hNYXJrZXJBbmFseXNpcykge1xuICAgICAgdGhpcy5yZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5zb3VyY2VGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5kZWNsYXJhdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZpbGUpIHtcbiAgICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgICB0aGlzLmdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLnNyYy5yM1N5bWJvbHNGaWxlLCB0aGlzLmJ1bmRsZS5pc0ZsYXRDb3JlKSxcbiAgICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnN0cnVjdG9yIHBhcmFtIG1ldGFkYXRhIGFuZCBwcm9wZXJ0eSBkZWNvcmF0b3JzICh3ZSBuZWVkIGluZm8gZnJvbSB0aGVcbiAgICAgIC8vIGhhbmRsZXJzIHRvIGRvIHRoaXMpXG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcyk7XG4gICAgICB0aGlzLnJlbW92ZURlY29yYXRvcnMob3V0cHV0VGV4dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID0gcmVuZGVyRGVmaW5pdGlvbnMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5hZGREZWZpbml0aW9ucyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbnN0YW50cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LFxuICAgICAgICAgIHJlbmRlckNvbnN0YW50UG9vbChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLmNvbnN0YW50UG9vbCwgaW1wb3J0TWFuYWdlciksXG4gICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuXG4gICAgICB0aGlzLmFkZEltcG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSxcbiAgICAgICAgICBjb21waWxlZEZpbGUuc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIGV4cG9ydHMgdG8gdGhlIGVudHJ5LXBvaW50IGZpbGVcbiAgICBpZiAoc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuYWRkRXhwb3J0cyhvdXRwdXRUZXh0LCBlbnRyeVBvaW50QmFzZVBhdGgsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU291cmNlQW5kTWFwKHNvdXJjZUZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHJlbmRlckR0c0ZpbGUoZHRzRmlsZTogdHMuU291cmNlRmlsZSwgcmVuZGVySW5mbzogRHRzUmVuZGVySW5mbyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5leHRyYWN0U291cmNlTWFwKGR0c0ZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgdGhpcy5nZXRJbXBvcnRSZXdyaXRlcih0aGlzLmJ1bmRsZS5kdHMgIS5yM1N5bWJvbHNGaWxlLCBmYWxzZSksIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgcmVuZGVySW5mby5jbGFzc0luZm8uZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIGNvbnN0IHR5cGVTdHIgPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdHlwZSwgZHRzRmlsZSk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGAgICAgc3RhdGljICR7ZGVjbGFyYXRpb24ubmFtZX06ICR7dHlwZVN0cn07XFxuYDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRSaWdodChlbmRPZkNsYXNzIC0gMSwgbmV3U3RhdGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKG91dHB1dFRleHQsIHJlbmRlckluZm8ubW9kdWxlV2l0aFByb3ZpZGVycywgaW1wb3J0TWFuYWdlcik7XG4gICAgdGhpcy5hZGRJbXBvcnRzKG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhkdHNGaWxlLmZpbGVOYW1lKSwgZHRzRmlsZSk7XG5cbiAgICB0aGlzLmFkZEV4cG9ydHMob3V0cHV0VGV4dCwgQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoZHRzRmlsZSksIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMpO1xuXG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTb3VyY2VBbmRNYXAoZHRzRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgdHlwZSBwYXJhbWV0ZXJzIHRvIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbnMgdGhhdCByZXR1cm4gYE1vZHVsZVdpdGhQcm92aWRlcnNgXG4gICAqIHN0cnVjdHVyZXMuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gb25seSBnZXRzIGNhbGxlZCBvbiB0eXBpbmdzIGZpbGVzLCBzbyBpdCBkb2Vzbid0IG5lZWQgZGlmZmVyZW50IGltcGxlbWVudGF0aW9uc1xuICAgKiBmb3IgZWFjaCBidW5kbGUgZm9ybWF0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZE1vZHVsZVdpdGhQcm92aWRlcnNQYXJhbXMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpOiB2b2lkIHtcbiAgICBtb2R1bGVXaXRoUHJvdmlkZXJzLmZvckVhY2goaW5mbyA9PiB7XG4gICAgICBjb25zdCBuZ01vZHVsZU5hbWUgPSBpbmZvLm5nTW9kdWxlLm5vZGUubmFtZS50ZXh0O1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25GaWxlID0gQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoaW5mby5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkpO1xuICAgICAgY29uc3QgbmdNb2R1bGVGaWxlID0gQWJzb2x1dGVGc1BhdGguZnJvbVNvdXJjZUZpbGUoaW5mby5uZ01vZHVsZS5ub2RlLmdldFNvdXJjZUZpbGUoKSk7XG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gaW5mby5uZ01vZHVsZS52aWFNb2R1bGUgfHxcbiAgICAgICAgICAoZGVjbGFyYXRpb25GaWxlICE9PSBuZ01vZHVsZUZpbGUgP1xuICAgICAgICAgICAgICAgc3RyaXBFeHRlbnNpb24oXG4gICAgICAgICAgICAgICAgICAgYC4vJHtQYXRoU2VnbWVudC5yZWxhdGl2ZShBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKGRlY2xhcmF0aW9uRmlsZSksIG5nTW9kdWxlRmlsZSl9YCkgOlxuICAgICAgICAgICAgICAgbnVsbCk7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IGdldEltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCBpbXBvcnRQYXRoLCBuZ01vZHVsZU5hbWUpO1xuXG4gICAgICBpZiAoaW5mby5kZWNsYXJhdGlvbi50eXBlKSB7XG4gICAgICAgIGNvbnN0IHR5cGVOYW1lID0gaW5mby5kZWNsYXJhdGlvbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoaW5mby5kZWNsYXJhdGlvbi50eXBlKSA/XG4gICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUudHlwZU5hbWUgOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgcmV0dXJucyBgTW9kdWxlV2l0aFByb3ZpZGVyYCBidXQgaXQgbmVlZHMgdGhlIGBOZ01vZHVsZWAgdHlwZVxuICAgICAgICAgIC8vIHBhcmFtZXRlciBhZGRpbmcuXG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGBNb2R1bGVXaXRoUHJvdmlkZXJzPCR7bmdNb2R1bGV9PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiByZXR1cm5zIGFuIHVua25vd24gdHlwZSBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgaXQgdG8gYSB1bmlvbiB0aGF0XG4gICAgICAgICAgLy8gaW5jbHVkZXMgdGhlIG5nTW9kdWxlIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZVN0cmluZyA9IGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRUZXh0KCk7XG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGAoJHtvcmlnaW5hbFR5cGVTdHJpbmd9KSZ7bmdNb2R1bGU6JHtuZ01vZHVsZX19YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBoYXMgbm8gcmV0dXJuIHR5cGUgc28gcHJvdmlkZSBvbmUuXG4gICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IGluZm8uZGVjbGFyYXRpb24uZ2V0TGFzdFRva2VuKCk7XG4gICAgICAgIGNvbnN0IGluc2VydFBvaW50ID0gbGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuID9cbiAgICAgICAgICAgIGxhc3RUb2tlbi5nZXRTdGFydCgpIDpcbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kTGVmdChcbiAgICAgICAgICAgIGluc2VydFBvaW50LFxuICAgICAgICAgICAgYDogJHtnZXRJbXBvcnRTdHJpbmcoaW1wb3J0TWFuYWdlciwgJ0Bhbmd1bGFyL2NvcmUnLCAnTW9kdWxlV2l0aFByb3ZpZGVycycpfTwke25nTW9kdWxlfT5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZEltcG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7c3BlY2lmaWVyOiBzdHJpbmcsIHF1YWxpZmllcjogc3RyaW5nfVtdLFxuICAgICAgc2Y6IHRzLlNvdXJjZUZpbGUpOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGVudHJ5UG9pbnRCYXNlUGF0aDogQWJzb2x1dGVGc1BhdGgsIGV4cG9ydHM6IEV4cG9ydEluZm9bXSk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogUmVkdW5kYW50RGVjb3JhdG9yTWFwKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBkZWNsYXJhdGlvbnM6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBGcm9tIHRoZSBnaXZlbiBsaXN0IG9mIGNsYXNzZXMsIGNvbXB1dGVzIGEgbWFwIG9mIGRlY29yYXRvcnMgdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICogVGhlIGRlY29yYXRvcnMgdG8gcmVtb3ZlIGFyZSBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZSwgc3VjaCB0aGF0IHdlIGNhbiB0ZWxsIGlmXG4gICAqIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHkuXG4gICAqIEBwYXJhbSBjbGFzc2VzIFRoZSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBtYXkgaGF2ZSBkZWNvcmF0b3JzIHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgQSBtYXAgb2YgZGVjb3JhdG9ycyB0byByZW1vdmUsIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY2xhc3NlczogQ29tcGlsZWRDbGFzc1tdKTogUmVkdW5kYW50RGVjb3JhdG9yTWFwIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgUmVkdW5kYW50RGVjb3JhdG9yTWFwKCk7XG4gICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgIGNsYXp6LmRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCAhO1xuICAgICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkgIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnNUb1JlbW92ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG1hcCBmcm9tIHRoZSBzb3VyY2UgKG5vdGUgd2hldGhlciBpdCBpcyBpbmxpbmUgb3IgZXh0ZXJuYWwpXG4gICAqL1xuICBwcm90ZWN0ZWQgZXh0cmFjdFNvdXJjZU1hcChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTWFwSW5mbyB7XG4gICAgY29uc3QgaW5saW5lID0gY29tbWVudFJlZ2V4LnRlc3QoZmlsZS50ZXh0KTtcbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXguZXhlYyhmaWxlLnRleHQpO1xuXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgY29uc3QgaW5saW5lU291cmNlTWFwID0gZnJvbVNvdXJjZShmaWxlLnRleHQpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiByZW1vdmVDb21tZW50cyhmaWxlLnRleHQpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyksXG4gICAgICAgIG1hcDogaW5saW5lU291cmNlTWFwLFxuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHRlcm5hbCkge1xuICAgICAgbGV0IGV4dGVybmFsU291cmNlTWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbCA9IG51bGw7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGV4dGVybmFsWzFdIHx8IGV4dGVybmFsWzJdO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IEFic29sdXRlRnNQYXRoLnJlc29sdmUoXG4gICAgICAgICAgICBBYnNvbHV0ZUZzUGF0aC5kaXJuYW1lKEFic29sdXRlRnNQYXRoLmZyb21Tb3VyY2VGaWxlKGZpbGUpKSwgZmlsZU5hbWUpO1xuICAgICAgICBjb25zdCBtYXBwaW5nRmlsZSA9IHRoaXMuZnMucmVhZEZpbGUoZmlsZVBhdGgpO1xuICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21KU09OKG1hcHBpbmdGaWxlKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgVGhlIGV4dGVybmFsIG1hcCBmaWxlIHNwZWNpZmllZCBpbiB0aGUgc291cmNlIGNvZGUgY29tbWVudCBcIiR7ZS5wYXRofVwiIHdhcyBub3QgZm91bmQgb24gdGhlIGZpbGUgc3lzdGVtLmApO1xuICAgICAgICAgIGNvbnN0IG1hcFBhdGggPSBBYnNvbHV0ZUZzUGF0aC5mcm9tVW5jaGVja2VkKGZpbGUuZmlsZU5hbWUgKyAnLm1hcCcpO1xuICAgICAgICAgIGlmIChQYXRoU2VnbWVudC5iYXNlbmFtZShlLnBhdGgpICE9PSBQYXRoU2VnbWVudC5iYXNlbmFtZShtYXBQYXRoKSAmJlxuICAgICAgICAgICAgICB0aGlzLmZzLnN0YXQobWFwUGF0aCkuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICAgYEd1ZXNzaW5nIHRoZSBtYXAgZmlsZSBuYW1lIGZyb20gdGhlIHNvdXJjZSBmaWxlIG5hbWU6IFwiJHtQYXRoU2VnbWVudC5iYXNlbmFtZShtYXBQYXRoKX1cImApO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tT2JqZWN0KEpTT04ucGFyc2UodGhpcy5mcy5yZWFkRmlsZShtYXBQYXRoKSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtzb3VyY2U6IGZpbGUudGV4dCwgbWFwOiBudWxsLCBpc0lubGluZTogZmFsc2V9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gICAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAgICovXG4gIHByb3RlY3RlZCByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbnB1dDogU291cmNlTWFwSW5mbywgb3V0cHV0OiBNYWdpY1N0cmluZyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dFBhdGggPSBBYnNvbHV0ZUZzUGF0aC5mcm9tU291cmNlRmlsZShzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRNYXBQYXRoID0gQWJzb2x1dGVGc1BhdGguZnJvbVVuY2hlY2tlZChgJHtvdXRwdXRQYXRofS5tYXBgKTtcbiAgICBjb25zdCByZWxhdGl2ZVNvdXJjZVBhdGggPSBQYXRoU2VnbWVudC5iYXNlbmFtZShvdXRwdXRQYXRoKTtcbiAgICBjb25zdCByZWxhdGl2ZU1hcFBhdGggPSBgJHtyZWxhdGl2ZVNvdXJjZVBhdGh9Lm1hcGA7XG5cbiAgICBjb25zdCBvdXRwdXRNYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBvdXRwdXRQYXRoLFxuICAgICAgaW5jbHVkZUNvbnRlbnQ6IHRydWUsXG4gICAgICAvLyBoaXJlczogdHJ1ZSAvLyBUT0RPOiBUaGlzIHJlc3VsdHMgaW4gYWNjdXJhdGUgYnV0IGh1Z2Ugc291cmNlbWFwcy4gSW5zdGVhZCB3ZSBzaG91bGQgZml4XG4gICAgICAvLyB0aGUgbWVyZ2UgYWxnb3JpdGhtLlxuICAgIH0pO1xuXG4gICAgLy8gd2UgbXVzdCBzZXQgdGhpcyBhZnRlciBnZW5lcmF0aW9uIGFzIG1hZ2ljIHN0cmluZyBkb2VzIFwibWFuaXB1bGF0aW9uXCIgb24gdGhlIHBhdGhcbiAgICBvdXRwdXRNYXAuZmlsZSA9IHJlbGF0aXZlU291cmNlUGF0aDtcblxuICAgIGNvbnN0IG1lcmdlZE1hcCA9XG4gICAgICAgIG1lcmdlU291cmNlTWFwcyhpbnB1dC5tYXAgJiYgaW5wdXQubWFwLnRvT2JqZWN0KCksIEpTT04ucGFyc2Uob3V0cHV0TWFwLnRvU3RyaW5nKCkpKTtcblxuICAgIGNvbnN0IHJlc3VsdDogRmlsZUluZm9bXSA9IFtdO1xuICAgIGlmIChpbnB1dC5pc0lubGluZSkge1xuICAgICAgcmVzdWx0LnB1c2goe3BhdGg6IG91dHB1dFBhdGgsIGNvbnRlbnRzOiBgJHtvdXRwdXQudG9TdHJpbmcoKX1cXG4ke21lcmdlZE1hcC50b0NvbW1lbnQoKX1gfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgcGF0aDogb3V0cHV0UGF0aCxcbiAgICAgICAgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChyZWxhdGl2ZU1hcFBhdGgpfWBcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0LnB1c2goe3BhdGg6IG91dHB1dE1hcFBhdGgsIGNvbnRlbnRzOiBtZXJnZWRNYXAudG9KU09OKCl9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xcbiAgICAgIG51bGwpOiBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4ge1xuICAgIGNvbnN0IGR0c01hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4oKTtcblxuICAgIC8vIENhcHR1cmUgdGhlIHJlbmRlcmluZyBpbmZvIGZyb20gdGhlIGRlY29yYXRpb24gYW5hbHlzZXNcbiAgICBkZWNvcmF0aW9uQW5hbHlzZXMuZm9yRWFjaChjb21waWxlZEZpbGUgPT4ge1xuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNvbXBpbGVkQ2xhc3MgPT4ge1xuICAgICAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgaWYgKGR0c0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmdldChkdHNGaWxlKSB8fCBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLnB1c2goe2R0c0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogY29tcGlsZWRDbGFzcy5jb21waWxhdGlvbn0pO1xuICAgICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgcmVuZGVySW5mbyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gQ2FwdHVyZSB0aGUgTW9kdWxlV2l0aFByb3ZpZGVycyBmdW5jdGlvbnMvbWV0aG9kcyB0aGF0IG5lZWQgdXBkYXRpbmdcbiAgICBpZiAobW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzICE9PSBudWxsKSB7XG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMuZm9yRWFjaCgobW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4LCBkdHNGaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuZ2V0KGR0c0ZpbGUpIHx8IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICAgIHJlbmRlckluZm8ubW9kdWxlV2l0aFByb3ZpZGVycyA9IG1vZHVsZVdpdGhQcm92aWRlcnNUb0ZpeDtcbiAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENhcHR1cmUgdGhlIHByaXZhdGUgZGVjbGFyYXRpb25zIHRoYXQgbmVlZCB0byBiZSByZS1leHBvcnRlZFxuICAgIGlmIChwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMubGVuZ3RoKSB7XG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgaWYgKCFlLmR0c0Zyb20gJiYgIWUuYWxpYXMpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBUaGVyZSBpcyBubyB0eXBpbmdzIHBhdGggZm9yICR7ZS5pZGVudGlmaWVyfSBpbiAke2UuZnJvbX0uXFxuYCArXG4gICAgICAgICAgICAgIGBXZSBuZWVkIHRvIGFkZCBhbiBleHBvcnQgZm9yIHRoaXMgY2xhc3MgdG8gYSAuZC50cyB0eXBpbmdzIGZpbGUgYmVjYXVzZSBgICtcbiAgICAgICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgbmVlZHMgdG8gYmUgYWJsZSB0byByZWZlcmVuY2UgdGhpcyBjbGFzcyBpbiBjb21waWxlZCBjb2RlLCBzdWNoIGFzIHRlbXBsYXRlcy5cXG5gICtcbiAgICAgICAgICAgICAgYFRoZSBzaW1wbGVzdCBmaXggZm9yIHRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgdGhpcyBjbGFzcyBpcyBleHBvcnRlZCBmcm9tIHRoZSBwYWNrYWdlJ3MgZW50cnktcG9pbnQuYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc3QgZHRzRW50cnlQb2ludCA9IHRoaXMuYnVuZGxlLmR0cyAhLmZpbGU7XG4gICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmdldChkdHNFbnRyeVBvaW50KSB8fCBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgcmVuZGVySW5mby5wcml2YXRlRXhwb3J0cyA9IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcztcbiAgICAgIGR0c01hcC5zZXQoZHRzRW50cnlQb2ludCwgcmVuZGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGR0c01hcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBnaXZlbiB0eXBlIGlzIHRoZSBjb3JlIEFuZ3VsYXIgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGludGVyZmFjZS5cbiAgICogQHBhcmFtIHR5cGVOYW1lIFRoZSB0eXBlIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB0cnVlIGlmIHRoZSB0eXBlIGlzIHRoZSBjb3JlIEFuZ3VsYXIgYE1vZHVsZVdpdGhQcm92aWRlcnNgIGludGVyZmFjZS5cbiAgICovXG4gIHByaXZhdGUgaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWU6IHRzLkVudGl0eU5hbWV8bnVsbCkge1xuICAgIGNvbnN0IGlkID1cbiAgICAgICAgdHlwZU5hbWUgJiYgdHMuaXNJZGVudGlmaWVyKHR5cGVOYW1lKSA/IHRoaXMuaG9zdC5nZXRJbXBvcnRPZklkZW50aWZpZXIodHlwZU5hbWUpIDogbnVsbDtcbiAgICByZXR1cm4gKFxuICAgICAgICBpZCAmJiBpZC5uYW1lID09PSAnTW9kdWxlV2l0aFByb3ZpZGVycycgJiYgKHRoaXMuaXNDb3JlIHx8IGlkLmZyb20gPT09ICdAYW5ndWxhci9jb3JlJykpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRJbXBvcnRSZXdyaXRlcihyM1N5bWJvbHNGaWxlOiB0cy5Tb3VyY2VGaWxlfG51bGwsIGlzRmxhdDogYm9vbGVhbik6IEltcG9ydFJld3JpdGVyIHtcbiAgICBpZiAodGhpcy5pc0NvcmUgJiYgaXNGbGF0KSB7XG4gICAgICByZXR1cm4gbmV3IE5nY2NGbGF0SW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuaXNDb3JlKSB7XG4gICAgICByZXR1cm4gbmV3IFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyKHIzU3ltYm9sc0ZpbGUgIS5maWxlTmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBuZXcgTm9vcEltcG9ydFJld3JpdGVyKCk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTWVyZ2UgdGhlIHR3byBzcGVjaWZpZWQgc291cmNlLW1hcHMgaW50byBhIHNpbmdsZSBzb3VyY2UtbWFwIHRoYXQgaGlkZXMgdGhlIGludGVybWVkaWF0ZVxuICogc291cmNlLW1hcC5cbiAqIEUuZy4gQ29uc2lkZXIgdGhlc2UgbWFwcGluZ3M6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE9MRF9NQVAgLT4gSU5URVJNRURJQVRFX1NSQyAtPiBORVdfTUFQIC0+IE5FV19TUkNcbiAqIGBgYFxuICpcbiAqIHRoaXMgd2lsbCBiZSByZXBsYWNlZCB3aXRoOlxuICpcbiAqIGBgYFxuICogT0xEX1NSQyAtPiBNRVJHRURfTUFQIC0+IE5FV19TUkNcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VTb3VyY2VNYXBzKFxuICAgIG9sZE1hcDogUmF3U291cmNlTWFwIHwgbnVsbCwgbmV3TWFwOiBSYXdTb3VyY2VNYXApOiBTb3VyY2VNYXBDb252ZXJ0ZXIge1xuICBpZiAoIW9sZE1hcCkge1xuICAgIHJldHVybiBmcm9tT2JqZWN0KG5ld01hcCk7XG4gIH1cbiAgY29uc3Qgb2xkTWFwQ29uc3VtZXIgPSBuZXcgU291cmNlTWFwQ29uc3VtZXIob2xkTWFwKTtcbiAgY29uc3QgbmV3TWFwQ29uc3VtZXIgPSBuZXcgU291cmNlTWFwQ29uc3VtZXIobmV3TWFwKTtcbiAgY29uc3QgbWVyZ2VkTWFwR2VuZXJhdG9yID0gU291cmNlTWFwR2VuZXJhdG9yLmZyb21Tb3VyY2VNYXAobmV3TWFwQ29uc3VtZXIpO1xuICBtZXJnZWRNYXBHZW5lcmF0b3IuYXBwbHlTb3VyY2VNYXAob2xkTWFwQ29uc3VtZXIpO1xuICBjb25zdCBtZXJnZWQgPSBmcm9tSlNPTihtZXJnZWRNYXBHZW5lcmF0b3IudG9TdHJpbmcoKSk7XG4gIHJldHVybiBtZXJnZWQ7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBjb25zdGFudCBwb29sIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDb25zdGFudFBvb2woXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICByZXR1cm4gY29uc3RhbnRQb29sLnN0YXRlbWVudHNcbiAgICAgIC5tYXAoc3RtdCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUikpXG4gICAgICAubWFwKHN0bXQgPT4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHNvdXJjZUZpbGUpKVxuICAgICAgLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgZGVmaW5pdGlvbnMgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIGRlZmluaXRpb25zIGFyZSB0byBiZSByZW5kZXJlZC5cbiAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZFxuICogZGVmaW5pdGlvbnMuXG4gKiBAcGFyYW0gaW1wb3J0cyBBbiBvYmplY3QgdGhhdCB0cmFja3MgdGhlIGltcG9ydHMgdGhhdCBhcmUgbmVlZGVkIGJ5IHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckRlZmluaXRpb25zKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICBjb25zdCBuYW1lID0gY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5uYW1lO1xuICBjb25zdCB0cmFuc2xhdGUgPSAoc3RtdDogU3RhdGVtZW50KSA9PlxuICAgICAgdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpO1xuICBjb25zdCBwcmludCA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdHJhbnNsYXRlKHN0bXQpLCBzb3VyY2VGaWxlKTtcbiAgY29uc3QgZGVmaW5pdGlvbnMgPSBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjID0+IFtjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplcildXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KGMuc3RhdGVtZW50cylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAocHJpbnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGRlZmluaXRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBFeHRlbnNpb248VCBleHRlbmRzIHN0cmluZz4oZmlsZVBhdGg6IFQpOiBUIHtcbiAgcmV0dXJuIGZpbGVQYXRoLnJlcGxhY2UoL1xcLihqc3xkXFwudHMpJC8sICcnKSBhcyBUO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChcbiAgICByZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pOiBTdGF0ZW1lbnQge1xuICBjb25zdCByZWNlaXZlciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVjZWl2ZXJOYW1lKTtcbiAgcmV0dXJuIG5ldyBXcml0ZVByb3BFeHByKHJlY2VpdmVyLCBwcm9wTmFtZSwgaW5pdGlhbGl6ZXIpLnRvU3RtdCgpO1xufVxuXG5mdW5jdGlvbiBnZXRJbXBvcnRTdHJpbmcoXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgaW1wb3J0UGF0aDogc3RyaW5nIHwgbnVsbCwgaW1wb3J0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGltcG9ydEFzID0gaW1wb3J0UGF0aCA/IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChpbXBvcnRQYXRoLCBpbXBvcnROYW1lKSA6IG51bGw7XG4gIHJldHVybiBpbXBvcnRBcyA/IGAke2ltcG9ydEFzLm1vZHVsZUltcG9ydH0uJHtpbXBvcnRBcy5zeW1ib2x9YCA6IGAke2ltcG9ydE5hbWV9YDtcbn1cbiJdfQ==