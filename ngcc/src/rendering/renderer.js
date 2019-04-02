(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "convert-source-map", "fs", "magic-string", "canonical-path", "source-map", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter", "@angular/compiler-cli/ngcc/src/constants"], factory);
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
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var ngcc_import_rewriter_1 = require("@angular/compiler-cli/ngcc/src/rendering/ngcc_import_rewriter");
    var constants_1 = require("@angular/compiler-cli/ngcc/src/constants");
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
        function Renderer(logger, host, isCore, bundle, sourcePath) {
            this.logger = logger;
            this.host = host;
            this.isCore = isCore;
            this.bundle = bundle;
            this.sourcePath = sourcePath;
        }
        Renderer.prototype.renderProgram = function (decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
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
                this.addImports(outputText, importManager_1.getAllImports(compiledFile.sourceFile.fileName));
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
            this.addImports(outputText, importManager.getAllImports(dtsFile.fileName));
            this.addExports(outputText, dtsFile.fileName, renderInfo.privateExports);
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
                var declarationFile = info.declaration.getSourceFile().fileName;
                var ngModuleFile = info.ngModule.node.getSourceFile().fileName;
                var importPath = info.ngModule.viaModule ||
                    (declarationFile !== ngModuleFile ?
                        stripExtension("./" + canonical_path_1.relative(canonical_path_1.dirname(declarationFile), ngModuleFile)) :
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
                        this.logger.warn("The external map file specified in the source code comment \"" + e.path + "\" was not found on the file system.");
                        var mapPath = file.fileName + '.map';
                        if (canonical_path_1.basename(e.path) !== canonical_path_1.basename(mapPath) && fs_1.statSync(mapPath).isFile()) {
                            this.logger.warn("Guessing the map file name from the source file name: \"" + canonical_path_1.basename(mapPath) + "\"");
                            try {
                                externalSourceMap = convert_source_map_1.fromObject(JSON.parse(fs_1.readFileSync(mapPath, 'utf8')));
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
            var outputPath = sourceFile.fileName;
            var outputMapPath = outputPath + ".map";
            var relativeSourcePath = canonical_path_1.basename(outputPath);
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
        var definitions = compiledClass.compilation
            .map(function (c) { return c.statements.map(function (statement) { return translate(statement); })
            .concat(translate(createAssignmentStatement(name, c.name, c.initializer)))
            .map(function (statement) {
            return printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile);
        })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryx5REFBNk07SUFDN00seUJBQTBDO0lBQzFDLDZDQUF1QztJQUN2QyxpREFBb0U7SUFDcEUseUNBQStFO0lBQy9FLCtCQUFpQztJQUVqQyxtRUFBa0o7SUFFbEoseUVBQStGO0lBQy9GLHNHQUE4RDtJQUs5RCxzRUFBMkM7SUE4QjNDOzs7Ozs7O09BT0c7SUFDSDtRQUFBO1lBQ0UsY0FBUyxHQUFtQixFQUFFLENBQUM7WUFDL0Isd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztZQUNwRCxtQkFBYyxHQUFpQixFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUFELG9CQUFDO0lBQUQsQ0FBQyxBQUpELElBSUM7SUFRWSxRQUFBLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztJQUV6Qzs7Ozs7T0FLRztJQUNIO1FBQ0Usa0JBQ2MsTUFBYyxFQUFZLElBQXdCLEVBQVksTUFBZSxFQUM3RSxNQUF3QixFQUFZLFVBQWtCO1lBRHRELFdBQU0sR0FBTixNQUFNLENBQVE7WUFBWSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFZLFdBQU0sR0FBTixNQUFNLENBQVM7WUFDN0UsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7WUFBWSxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQUcsQ0FBQztRQUV4RSxnQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQUUsb0JBQTBDLEVBQ2xGLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBZ0NDO1lBNUJDLElBQU0sYUFBYSxHQUFlLEVBQUUsQ0FBQztZQUVyQyw4QkFBOEI7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FB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RSxVQUFVLENBQUM7UUFBakUsQ0FBaUUsQ0FBQzthQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBTGYsQ0FLZSxDQUFDO2FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBakJELDhDQWlCQztJQUVELFNBQWdCLGNBQWMsQ0FBQyxRQUFnQjtRQUM3QyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFGRCx3Q0FFQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLHlCQUF5QixDQUM5QixZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUNwQixhQUE0QixFQUFFLFVBQXlCLEVBQUUsVUFBa0I7UUFDN0UsSUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDL0YsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFJLFFBQVEsQ0FBQyxZQUFZLFNBQUksUUFBUSxDQUFDLE1BQVEsQ0FBQyxDQUFDLENBQUMsS0FBRyxVQUFZLENBQUM7SUFDcEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IHtTb3VyY2VNYXBDb252ZXJ0ZXIsIGNvbW1lbnRSZWdleCwgZnJvbUpTT04sIGZyb21NYXBGaWxlU291cmNlLCBmcm9tT2JqZWN0LCBmcm9tU291cmNlLCBnZW5lcmF0ZU1hcEZpbGVDb21tZW50LCBtYXBGaWxlQ29tbWVudFJlZ2V4LCByZW1vdmVDb21tZW50cywgcmVtb3ZlTWFwRmlsZUNvbW1lbnRzfSBmcm9tICdjb252ZXJ0LXNvdXJjZS1tYXAnO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmMsIHN0YXRTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7YmFzZW5hbWUsIGRpcm5hbWUsIHJlbGF0aXZlLCByZXNvbHZlfSBmcm9tICdjYW5vbmljYWwtcGF0aCc7XG5pbXBvcnQge1NvdXJjZU1hcENvbnN1bWVyLCBTb3VyY2VNYXBHZW5lcmF0b3IsIFJhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOb29wSW1wb3J0UmV3cml0ZXIsIEltcG9ydFJld3JpdGVyLCBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlciwgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy90cmFuc2Zvcm0nO1xuaW1wb3J0IHt0cmFuc2xhdGVTdGF0ZW1lbnQsIHRyYW5zbGF0ZVR5cGUsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7TmdjY0ZsYXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi9uZ2NjX2ltcG9ydF9yZXdyaXRlcic7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0luZm8sIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXNpc30gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdCwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi5cbiAgICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEdHNDbGFzc0luZm8ge1xuICBkdHNEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogQSBzdHJ1Y3R1cmUgdGhhdCBjYXB0dXJlcyBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IG5lZWRzIHRvIGJlIHJlbmRlcmVkXG4gKiBpbiBhIHR5cGluZ3MgZmlsZS5cbiAqXG4gKiBJdCBpcyBjcmVhdGVkIGFzIGEgcmVzdWx0IG9mIHByb2Nlc3NpbmcgdGhlIGFuYWx5c2lzIHBhc3NlZCB0byB0aGUgcmVuZGVyZXIuXG4gKlxuICogVGhlIGByZW5kZXJEdHNGaWxlKClgIG1ldGhvZCBjb25zdW1lcyBpdCB3aGVuIHJlbmRlcmluZyBhIHR5cGluZ3MgZmlsZS5cbiAqL1xuY2xhc3MgRHRzUmVuZGVySW5mbyB7XG4gIGNsYXNzSW5mbzogRHRzQ2xhc3NJbmZvW10gPSBbXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSA9IFtdO1xuICBwcml2YXRlRXhwb3J0czogRXhwb3J0SW5mb1tdID0gW107XG59XG5cbi8qKlxuICogVGhlIGNvbGxlY3RlZCBkZWNvcmF0b3JzIHRoYXQgaGF2ZSBiZWNvbWUgcmVkdW5kYW50IGFmdGVyIHRoZSBjb21waWxhdGlvblxuICogb2YgSXZ5IHN0YXRpYyBmaWVsZHMuIFRoZSBtYXAgaXMga2V5ZWQgYnkgdGhlIGNvbnRhaW5lciBub2RlLCBzdWNoIHRoYXQgd2VcbiAqIGNhbiB0ZWxsIGlmIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHlcbiAqL1xuZXhwb3J0IHR5cGUgUmVkdW5kYW50RGVjb3JhdG9yTWFwID0gTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT47XG5leHBvcnQgY29uc3QgUmVkdW5kYW50RGVjb3JhdG9yTWFwID0gTWFwO1xuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgbG9nZ2VyOiBMb2dnZXIsIHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcm90ZWN0ZWQgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCBwcm90ZWN0ZWQgc291cmNlUGF0aDogc3RyaW5nKSB7fVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZUluZm9bXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAgdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5tYXAoc291cmNlRmlsZSA9PiB7XG4gICAgICBjb25zdCBjb21waWxlZEZpbGUgPSBkZWNvcmF0aW9uQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzaXMgPSBzd2l0Y2hNYXJrZXJBbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG5cbiAgICAgIGlmIChjb21waWxlZEZpbGUgfHwgc3dpdGNoTWFya2VyQW5hbHlzaXMgfHwgc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgICAgcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRmlsZShcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcykpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSAuZC50cyBmaWxlc1xuICAgIGlmICh0aGlzLmJ1bmRsZS5kdHMpIHtcbiAgICAgIGNvbnN0IGR0c0ZpbGVzID0gdGhpcy5nZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihcbiAgICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzKTtcblxuICAgICAgLy8gSWYgdGhlIGR0cyBlbnRyeS1wb2ludCBpcyBub3QgYWxyZWFkeSB0aGVyZSAoaXQgZGlkIG5vdCBoYXZlIGNvbXBpbGVkIGNsYXNzZXMpXG4gICAgICAvLyB0aGVuIGFkZCBpdCBub3csIHRvIGVuc3VyZSBpdCBnZXRzIGl0cyBleHRyYSBleHBvcnRzIHJlbmRlcmVkLlxuICAgICAgaWYgKCFkdHNGaWxlcy5oYXModGhpcy5idW5kbGUuZHRzLmZpbGUpKSB7XG4gICAgICAgIGR0c0ZpbGVzLnNldCh0aGlzLmJ1bmRsZS5kdHMuZmlsZSwgbmV3IER0c1JlbmRlckluZm8oKSk7XG4gICAgICB9XG4gICAgICBkdHNGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChyZW5kZXJJbmZvLCBmaWxlKSA9PiByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJEdHNGaWxlKGZpbGUsIHJlbmRlckluZm8pKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZXh0cmFjdFNvdXJjZU1hcChzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG5cbiAgICBpZiAoc3dpdGNoTWFya2VyQW5hbHlzaXMpIHtcbiAgICAgIHRoaXMucmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgc3dpdGNoTWFya2VyQW5hbHlzaXMuc291cmNlRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMuZGVjbGFyYXRpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlKSB7XG4gICAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgICAgdGhpcy5nZXRJbXBvcnRSZXdyaXRlcih0aGlzLmJ1bmRsZS5zcmMucjNTeW1ib2xzRmlsZSwgdGhpcy5idW5kbGUuaXNGbGF0Q29yZSksXG4gICAgICAgICAgSU1QT1JUX1BSRUZJWCk7XG5cbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zdHJ1Y3RvciBwYXJhbSBtZXRhZGF0YSBhbmQgcHJvcGVydHkgZGVjb3JhdG9ycyAod2UgbmVlZCBpbmZvIGZyb20gdGhlXG4gICAgICAvLyBoYW5kbGVycyB0byBkbyB0aGlzKVxuICAgICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gdGhpcy5jb21wdXRlRGVjb3JhdG9yc1RvUmVtb3ZlKGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMpO1xuICAgICAgdGhpcy5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVkRGVmaW5pdGlvbiA9IHJlbmRlckRlZmluaXRpb25zKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5hZGRDb25zdGFudHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICByZW5kZXJDb25zdGFudFBvb2woY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZS5jb25zdGFudFBvb2wsIGltcG9ydE1hbmFnZXIpLFxuICAgICAgICAgIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcblxuICAgICAgdGhpcy5hZGRJbXBvcnRzKG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhjb21waWxlZEZpbGUuc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgIH1cblxuICAgIC8vIEFkZCBleHBvcnRzIHRvIHRoZSBlbnRyeS1wb2ludCBmaWxlXG4gICAgaWYgKHNvdXJjZUZpbGUgPT09IHRoaXMuYnVuZGxlLnNyYy5maWxlKSB7XG4gICAgICBjb25zdCBlbnRyeVBvaW50QmFzZVBhdGggPSBzdHJpcEV4dGVuc2lvbih0aGlzLmJ1bmRsZS5zcmMucGF0aCk7XG4gICAgICB0aGlzLmFkZEV4cG9ydHMob3V0cHV0VGV4dCwgZW50cnlQb2ludEJhc2VQYXRoLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlbmRlclNvdXJjZUFuZE1hcChzb3VyY2VGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gIH1cblxuICByZW5kZXJEdHNGaWxlKGR0c0ZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlbmRlckluZm86IER0c1JlbmRlckluZm8pOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZXh0cmFjdFNvdXJjZU1hcChkdHNGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIHRoaXMuZ2V0SW1wb3J0UmV3cml0ZXIodGhpcy5idW5kbGUuZHRzICEucjNTeW1ib2xzRmlsZSwgZmFsc2UpLCBJTVBPUlRfUFJFRklYKTtcblxuICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLmZvckVhY2goZHRzQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgZW5kT2ZDbGFzcyA9IGR0c0NsYXNzLmR0c0RlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgICAgZHRzQ2xhc3MuY29tcGlsYXRpb24uZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlY2xhcmF0aW9uLnR5cGUsIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICBjb25zdCB0eXBlU3RyID0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHR5cGUsIGR0c0ZpbGUpO1xuICAgICAgICBjb25zdCBuZXdTdGF0ZW1lbnQgPSBgICAgIHN0YXRpYyAke2RlY2xhcmF0aW9uLm5hbWV9OiAke3R5cGVTdHJ9O1xcbmA7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kUmlnaHQoZW5kT2ZDbGFzcyAtIDEsIG5ld1N0YXRlbWVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRoaXMuYWRkTW9kdWxlV2l0aFByb3ZpZGVyc1BhcmFtcyhvdXRwdXRUZXh0LCByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMsIGltcG9ydE1hbmFnZXIpO1xuICAgIHRoaXMuYWRkSW1wb3J0cyhvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZHRzRmlsZS5maWxlTmFtZSkpO1xuXG4gICAgdGhpcy5hZGRFeHBvcnRzKG91dHB1dFRleHQsIGR0c0ZpbGUuZmlsZU5hbWUsIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMpO1xuXG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTb3VyY2VBbmRNYXAoZHRzRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCB0aGUgdHlwZSBwYXJhbWV0ZXJzIHRvIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbnMgdGhhdCByZXR1cm4gYE1vZHVsZVdpdGhQcm92aWRlcnNgXG4gICAqIHN0cnVjdHVyZXMuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gb25seSBnZXRzIGNhbGxlZCBvbiB0eXBpbmdzIGZpbGVzLCBzbyBpdCBkb2Vzbid0IG5lZWQgZGlmZmVyZW50IGltcGxlbWVudGF0aW9uc1xuICAgKiBmb3IgZWFjaCBidW5kbGUgZm9ybWF0LlxuICAgKi9cbiAgcHJvdGVjdGVkIGFkZE1vZHVsZVdpdGhQcm92aWRlcnNQYXJhbXMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSxcbiAgICAgIGltcG9ydE1hbmFnZXI6IEltcG9ydE1hbmFnZXIpOiB2b2lkIHtcbiAgICBtb2R1bGVXaXRoUHJvdmlkZXJzLmZvckVhY2goaW5mbyA9PiB7XG4gICAgICBjb25zdCBuZ01vZHVsZU5hbWUgPSBpbmZvLm5nTW9kdWxlLm5vZGUubmFtZS50ZXh0O1xuICAgICAgY29uc3QgZGVjbGFyYXRpb25GaWxlID0gaW5mby5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICBjb25zdCBuZ01vZHVsZUZpbGUgPSBpbmZvLm5nTW9kdWxlLm5vZGUuZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgaW1wb3J0UGF0aCA9IGluZm8ubmdNb2R1bGUudmlhTW9kdWxlIHx8XG4gICAgICAgICAgKGRlY2xhcmF0aW9uRmlsZSAhPT0gbmdNb2R1bGVGaWxlID9cbiAgICAgICAgICAgICAgIHN0cmlwRXh0ZW5zaW9uKGAuLyR7cmVsYXRpdmUoZGlybmFtZShkZWNsYXJhdGlvbkZpbGUpLCBuZ01vZHVsZUZpbGUpfWApIDpcbiAgICAgICAgICAgICAgIG51bGwpO1xuICAgICAgY29uc3QgbmdNb2R1bGUgPSBnZXRJbXBvcnRTdHJpbmcoaW1wb3J0TWFuYWdlciwgaW1wb3J0UGF0aCwgbmdNb2R1bGVOYW1lKTtcblxuICAgICAgaWYgKGluZm8uZGVjbGFyYXRpb24udHlwZSkge1xuICAgICAgICBjb25zdCB0eXBlTmFtZSA9IGluZm8uZGVjbGFyYXRpb24udHlwZSAmJiB0cy5pc1R5cGVSZWZlcmVuY2VOb2RlKGluZm8uZGVjbGFyYXRpb24udHlwZSkgP1xuICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi50eXBlLnR5cGVOYW1lIDpcbiAgICAgICAgICAgIG51bGw7XG4gICAgICAgIGlmICh0aGlzLmlzQ29yZU1vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHR5cGVOYW1lKSkge1xuICAgICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBhbHJlYWR5IHJldHVybnMgYE1vZHVsZVdpdGhQcm92aWRlcmAgYnV0IGl0IG5lZWRzIHRoZSBgTmdNb2R1bGVgIHR5cGVcbiAgICAgICAgICAvLyBwYXJhbWV0ZXIgYWRkaW5nLlxuICAgICAgICAgIG91dHB1dFRleHQub3ZlcndyaXRlKFxuICAgICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0U3RhcnQoKSwgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldEVuZCgpLFxuICAgICAgICAgICAgICBgTW9kdWxlV2l0aFByb3ZpZGVyczwke25nTW9kdWxlfT5gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBUaGUgZGVjbGFyYXRpb24gcmV0dXJucyBhbiB1bmtub3duIHR5cGUgc28gd2UgbmVlZCB0byBjb252ZXJ0IGl0IHRvIGEgdW5pb24gdGhhdFxuICAgICAgICAgIC8vIGluY2x1ZGVzIHRoZSBuZ01vZHVsZSBwcm9wZXJ0eS5cbiAgICAgICAgICBjb25zdCBvcmlnaW5hbFR5cGVTdHJpbmcgPSBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0VGV4dCgpO1xuICAgICAgICAgIG91dHB1dFRleHQub3ZlcndyaXRlKFxuICAgICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0U3RhcnQoKSwgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldEVuZCgpLFxuICAgICAgICAgICAgICBgKCR7b3JpZ2luYWxUeXBlU3RyaW5nfSkme25nTW9kdWxlOiR7bmdNb2R1bGV9fWApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBUaGUgZGVjbGFyYXRpb24gaGFzIG5vIHJldHVybiB0eXBlIHNvIHByb3ZpZGUgb25lLlxuICAgICAgICBjb25zdCBsYXN0VG9rZW4gPSBpbmZvLmRlY2xhcmF0aW9uLmdldExhc3RUb2tlbigpO1xuICAgICAgICBjb25zdCBpbnNlcnRQb2ludCA9IGxhc3RUb2tlbiAmJiBsYXN0VG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5TZW1pY29sb25Ub2tlbiA/XG4gICAgICAgICAgICBsYXN0VG9rZW4uZ2V0U3RhcnQoKSA6XG4gICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgICAgICBvdXRwdXRUZXh0LmFwcGVuZExlZnQoXG4gICAgICAgICAgICBpbnNlcnRQb2ludCxcbiAgICAgICAgICAgIGA6ICR7Z2V0SW1wb3J0U3RyaW5nKGltcG9ydE1hbmFnZXIsICdAYW5ndWxhci9jb3JlJywgJ01vZHVsZVdpdGhQcm92aWRlcnMnKX08JHtuZ01vZHVsZX0+YCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkQ29uc3RhbnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbnN0YW50czogc3RyaW5nLCBmaWxlOiB0cy5Tb3VyY2VGaWxlKTpcbiAgICAgIHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRJbXBvcnRzKG91dHB1dDogTWFnaWNTdHJpbmcsIGltcG9ydHM6IHtzcGVjaWZpZXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1YWxpZmllcjogc3RyaW5nfVtdKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZEV4cG9ydHMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBlbnRyeVBvaW50QmFzZVBhdGg6IHN0cmluZywgZXhwb3J0czogRXhwb3J0SW5mb1tdKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZERlZmluaXRpb25zKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW1vdmVEZWNvcmF0b3JzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZGVjb3JhdG9yc1RvUmVtb3ZlOiBSZWR1bmRhbnREZWNvcmF0b3JNYXApOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICBvdXRwdXRUZXh0OiBNYWdpY1N0cmluZywgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSxcbiAgICAgIGRlY2xhcmF0aW9uczogU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb25bXSk6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEZyb20gdGhlIGdpdmVuIGxpc3Qgb2YgY2xhc3NlcywgY29tcHV0ZXMgYSBtYXAgb2YgZGVjb3JhdG9ycyB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgKiBUaGUgZGVjb3JhdG9ycyB0byByZW1vdmUgYXJlIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLCBzdWNoIHRoYXQgd2UgY2FuIHRlbGwgaWZcbiAgICogd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eS5cbiAgICogQHBhcmFtIGNsYXNzZXMgVGhlIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG1heSBoYXZlIGRlY29yYXRvcnMgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBBIG1hcCBvZiBkZWNvcmF0b3JzIHRvIHJlbW92ZSwga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUuXG4gICAqL1xuICBwcm90ZWN0ZWQgY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjbGFzc2VzOiBDb21waWxlZENsYXNzW10pOiBSZWR1bmRhbnREZWNvcmF0b3JNYXAge1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBSZWR1bmRhbnREZWNvcmF0b3JNYXAoKTtcbiAgICBjbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgY2xhenouZGVjb3JhdG9ycy5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ICE7XG4gICAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuc2V0KGRlY29yYXRvckFycmF5LCBbZGVjLm5vZGVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSAhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVjb3JhdG9yc1RvUmVtb3ZlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgbWFwIGZyb20gdGhlIHNvdXJjZSAobm90ZSB3aGV0aGVyIGl0IGlzIGlubGluZSBvciBleHRlcm5hbClcbiAgICovXG4gIHByb3RlY3RlZCBleHRyYWN0U291cmNlTWFwKGZpbGU6IHRzLlNvdXJjZUZpbGUpOiBTb3VyY2VNYXBJbmZvIHtcbiAgICBjb25zdCBpbmxpbmUgPSBjb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuICAgIGNvbnN0IGV4dGVybmFsID0gbWFwRmlsZUNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG5cbiAgICBpZiAoaW5saW5lKSB7XG4gICAgICBjb25zdCBpbmxpbmVTb3VyY2VNYXAgPSBmcm9tU291cmNlKGZpbGUudGV4dCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHJlbW92ZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgICAgIGlzSW5saW5lOiB0cnVlLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGV4dGVybmFsKSB7XG4gICAgICBsZXQgZXh0ZXJuYWxTb3VyY2VNYXA6IFNvdXJjZU1hcENvbnZlcnRlcnxudWxsID0gbnVsbDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU1hcEZpbGVTb3VyY2UoZmlsZS50ZXh0LCBkaXJuYW1lKGZpbGUuZmlsZU5hbWUpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICBgVGhlIGV4dGVybmFsIG1hcCBmaWxlIHNwZWNpZmllZCBpbiB0aGUgc291cmNlIGNvZGUgY29tbWVudCBcIiR7ZS5wYXRofVwiIHdhcyBub3QgZm91bmQgb24gdGhlIGZpbGUgc3lzdGVtLmApO1xuICAgICAgICAgIGNvbnN0IG1hcFBhdGggPSBmaWxlLmZpbGVOYW1lICsgJy5tYXAnO1xuICAgICAgICAgIGlmIChiYXNlbmFtZShlLnBhdGgpICE9PSBiYXNlbmFtZShtYXBQYXRoKSAmJiBzdGF0U3luYyhtYXBQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgICBgR3Vlc3NpbmcgdGhlIG1hcCBmaWxlIG5hbWUgZnJvbSB0aGUgc291cmNlIGZpbGUgbmFtZTogXCIke2Jhc2VuYW1lKG1hcFBhdGgpfVwiYCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21PYmplY3QoSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFwUGF0aCwgJ3V0ZjgnKSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcihlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlTWFwRmlsZUNvbW1lbnRzKGZpbGUudGV4dCkucmVwbGFjZSgvXFxuXFxuJC8sICdcXG4nKSxcbiAgICAgICAgbWFwOiBleHRlcm5hbFNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtzb3VyY2U6IGZpbGUudGV4dCwgbWFwOiBudWxsLCBpc0lubGluZTogZmFsc2V9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBNZXJnZSB0aGUgaW5wdXQgYW5kIG91dHB1dCBzb3VyY2UtbWFwcywgcmVwbGFjaW5nIHRoZSBzb3VyY2UtbWFwIGNvbW1lbnQgaW4gdGhlIG91dHB1dCBmaWxlXG4gICAqIHdpdGggYW4gYXBwcm9wcmlhdGUgc291cmNlLW1hcCBjb21tZW50IHBvaW50aW5nIHRvIHRoZSBtZXJnZWQgc291cmNlLW1hcC5cbiAgICovXG4gIHByb3RlY3RlZCByZW5kZXJTb3VyY2VBbmRNYXAoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBpbnB1dDogU291cmNlTWFwSW5mbywgb3V0cHV0OiBNYWdpY1N0cmluZyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IG91dHB1dFBhdGggPSBzb3VyY2VGaWxlLmZpbGVOYW1lO1xuICAgIGNvbnN0IG91dHB1dE1hcFBhdGggPSBgJHtvdXRwdXRQYXRofS5tYXBgO1xuICAgIGNvbnN0IHJlbGF0aXZlU291cmNlUGF0aCA9IGJhc2VuYW1lKG91dHB1dFBhdGgpO1xuICAgIGNvbnN0IHJlbGF0aXZlTWFwUGF0aCA9IGAke3JlbGF0aXZlU291cmNlUGF0aH0ubWFwYDtcblxuICAgIGNvbnN0IG91dHB1dE1hcCA9IG91dHB1dC5nZW5lcmF0ZU1hcCh7XG4gICAgICBzb3VyY2U6IG91dHB1dFBhdGgsXG4gICAgICBpbmNsdWRlQ29udGVudDogdHJ1ZSxcbiAgICAgIC8vIGhpcmVzOiB0cnVlIC8vIFRPRE86IFRoaXMgcmVzdWx0cyBpbiBhY2N1cmF0ZSBidXQgaHVnZSBzb3VyY2VtYXBzLiBJbnN0ZWFkIHdlIHNob3VsZCBmaXhcbiAgICAgIC8vIHRoZSBtZXJnZSBhbGdvcml0aG0uXG4gICAgfSk7XG5cbiAgICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICAgIG91dHB1dE1hcC5maWxlID0gcmVsYXRpdmVTb3VyY2VQYXRoO1xuXG4gICAgY29uc3QgbWVyZ2VkTWFwID1cbiAgICAgICAgbWVyZ2VTb3VyY2VNYXBzKGlucHV0Lm1hcCAmJiBpbnB1dC5tYXAudG9PYmplY3QoKSwgSlNPTi5wYXJzZShvdXRwdXRNYXAudG9TdHJpbmcoKSkpO1xuXG4gICAgY29uc3QgcmVzdWx0OiBGaWxlSW5mb1tdID0gW107XG4gICAgaWYgKGlucHV0LmlzSW5saW5lKSB7XG4gICAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0UGF0aCwgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7bWVyZ2VkTWFwLnRvQ29tbWVudCgpfWB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2goe1xuICAgICAgICBwYXRoOiBvdXRwdXRQYXRoLFxuICAgICAgICBjb250ZW50czogYCR7b3V0cHV0LnRvU3RyaW5nKCl9XFxuJHtnZW5lcmF0ZU1hcEZpbGVDb21tZW50KHJlbGF0aXZlTWFwUGF0aCl9YFxuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0TWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfFxuICAgICAgbnVsbCk6IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPiB7XG4gICAgY29uc3QgZHRzTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPigpO1xuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcmVuZGVyaW5nIGluZm8gZnJvbSB0aGUgZGVjb3JhdGlvbiBhbmFseXNlc1xuICAgIGRlY29yYXRpb25BbmFseXNlcy5mb3JFYWNoKGNvbXBpbGVkRmlsZSA9PiB7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZHRzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuZ2V0KGR0c0ZpbGUpIHx8IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICAgICAgcmVuZGVySW5mby5jbGFzc0luZm8ucHVzaCh7ZHRzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9ufSk7XG4gICAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIGZ1bmN0aW9ucy9tZXRob2RzIHRoYXQgbmVlZCB1cGRhdGluZ1xuICAgIGlmIChtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgIT09IG51bGwpIHtcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcy5mb3JFYWNoKChtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXgsIGR0c0ZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5nZXQoZHRzRmlsZSkgfHwgbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzID0gbW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4O1xuICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcHJpdmF0ZSBkZWNsYXJhdGlvbnMgdGhhdCBuZWVkIHRvIGJlIHJlLWV4cG9ydGVkXG4gICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5sZW5ndGgpIHtcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAoIWUuZHRzRnJvbSAmJiAhZS5hbGlhcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZXJlIGlzIG5vIHR5cGluZ3MgcGF0aCBmb3IgJHtlLmlkZW50aWZpZXJ9IGluICR7ZS5mcm9tfS5cXG5gICtcbiAgICAgICAgICAgICAgYFdlIG5lZWQgdG8gYWRkIGFuIGV4cG9ydCBmb3IgdGhpcyBjbGFzcyB0byBhIC5kLnRzIHR5cGluZ3MgZmlsZSBiZWNhdXNlIGAgK1xuICAgICAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBuZWVkcyB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSB0aGlzIGNsYXNzIGluIGNvbXBpbGVkIGNvZGUsIHN1Y2ggYXMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhlIHNpbXBsZXN0IGZpeCBmb3IgdGhpcyBpcyB0byBlbnN1cmUgdGhhdCB0aGlzIGNsYXNzIGlzIGV4cG9ydGVkIGZyb20gdGhlIHBhY2thZ2UncyBlbnRyeS1wb2ludC5gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkdHNFbnRyeVBvaW50ID0gdGhpcy5idW5kbGUuZHRzICEuZmlsZTtcbiAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuZ2V0KGR0c0VudHJ5UG9pbnQpIHx8IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzID0gcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzO1xuICAgICAgZHRzTWFwLnNldChkdHNFbnRyeVBvaW50LCByZW5kZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZHRzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIHR5cGUgaXMgdGhlIGNvcmUgQW5ndWxhciBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgaW50ZXJmYWNlLlxuICAgKiBAcGFyYW0gdHlwZU5hbWUgVGhlIHR5cGUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHR5cGUgaXMgdGhlIGNvcmUgQW5ndWxhciBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgaW50ZXJmYWNlLlxuICAgKi9cbiAgcHJpdmF0ZSBpc0NvcmVNb2R1bGVXaXRoUHJvdmlkZXJzVHlwZSh0eXBlTmFtZTogdHMuRW50aXR5TmFtZXxudWxsKSB7XG4gICAgY29uc3QgaWQgPVxuICAgICAgICB0eXBlTmFtZSAmJiB0cy5pc0lkZW50aWZpZXIodHlwZU5hbWUpID8gdGhpcy5ob3N0LmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlTmFtZSkgOiBudWxsO1xuICAgIHJldHVybiAoXG4gICAgICAgIGlkICYmIGlkLm5hbWUgPT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJyAmJiAodGhpcy5pc0NvcmUgfHwgaWQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSk7XG4gIH1cblxuICBwcml2YXRlIGdldEltcG9ydFJld3JpdGVyKHIzU3ltYm9sc0ZpbGU6IHRzLlNvdXJjZUZpbGV8bnVsbCwgaXNGbGF0OiBib29sZWFuKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLmlzQ29yZSAmJiBpc0ZsYXQpIHtcbiAgICAgIHJldHVybiBuZXcgTmdjY0ZsYXRJbXBvcnRSZXdyaXRlcigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIocjNTeW1ib2xzRmlsZSAhLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgdHdvIHNwZWNpZmllZCBzb3VyY2UtbWFwcyBpbnRvIGEgc2luZ2xlIHNvdXJjZS1tYXAgdGhhdCBoaWRlcyB0aGUgaW50ZXJtZWRpYXRlXG4gKiBzb3VyY2UtbWFwLlxuICogRS5nLiBDb25zaWRlciB0aGVzZSBtYXBwaW5nczpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gT0xEX01BUCAtPiBJTlRFUk1FRElBVEVfU1JDIC0+IE5FV19NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKlxuICogdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGg6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE1FUkdFRF9NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVNvdXJjZU1hcHMoXG4gICAgb2xkTWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBuZXdNYXA6IFJhd1NvdXJjZU1hcCk6IFNvdXJjZU1hcENvbnZlcnRlciB7XG4gIGlmICghb2xkTWFwKSB7XG4gICAgcmV0dXJuIGZyb21PYmplY3QobmV3TWFwKTtcbiAgfVxuICBjb25zdCBvbGRNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihvbGRNYXApO1xuICBjb25zdCBuZXdNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihuZXdNYXApO1xuICBjb25zdCBtZXJnZWRNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChuZXdNYXBDb25zdW1lcik7XG4gIG1lcmdlZE1hcEdlbmVyYXRvci5hcHBseVNvdXJjZU1hcChvbGRNYXBDb25zdW1lcik7XG4gIGNvbnN0IG1lcmdlZCA9IGZyb21KU09OKG1lcmdlZE1hcEdlbmVyYXRvci50b1N0cmluZygpKTtcbiAgcmV0dXJuIG1lcmdlZDtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIHJldHVybiBjb25zdGFudFBvb2wuc3RhdGVtZW50c1xuICAgICAgLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKSlcbiAgICAgIC5tYXAoc3RtdCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgc291cmNlRmlsZSkpXG4gICAgICAuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSBjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLm5hbWU7XG4gIGNvbnN0IHRyYW5zbGF0ZSA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gIGNvbnN0IGRlZmluaXRpb25zID1cbiAgICAgIGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb25cbiAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICBjID0+IGMuc3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZShzdGF0ZW1lbnQpKVxuICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KHRyYW5zbGF0ZShjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplcikpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSlcbiAgICAgICAgICAuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRXh0ZW5zaW9uKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZVBhdGgucmVwbGFjZSgvXFwuKGpzfGRcXC50cykkLywgJycpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChcbiAgICByZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pOiBTdGF0ZW1lbnQge1xuICBjb25zdCByZWNlaXZlciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVjZWl2ZXJOYW1lKTtcbiAgcmV0dXJuIG5ldyBXcml0ZVByb3BFeHByKHJlY2VpdmVyLCBwcm9wTmFtZSwgaW5pdGlhbGl6ZXIpLnRvU3RtdCgpO1xufVxuXG5mdW5jdGlvbiBnZXRJbXBvcnRTdHJpbmcoXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgaW1wb3J0UGF0aDogc3RyaW5nIHwgbnVsbCwgaW1wb3J0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGltcG9ydEFzID0gaW1wb3J0UGF0aCA/IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChpbXBvcnRQYXRoLCBpbXBvcnROYW1lKSA6IG51bGw7XG4gIHJldHVybiBpbXBvcnRBcyA/IGAke2ltcG9ydEFzLm1vZHVsZUltcG9ydH0uJHtpbXBvcnRBcy5zeW1ib2x9YCA6IGAke2ltcG9ydE5hbWV9YDtcbn1cbiJdfQ==