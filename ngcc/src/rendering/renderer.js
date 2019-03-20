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
        function Renderer(host, isCore, bundle, sourcePath, targetPath) {
            this.host = host;
            this.isCore = isCore;
            this.bundle = bundle;
            this.sourcePath = sourcePath;
            this.targetPath = targetPath;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryx5REFBNk07SUFDN00seUJBQTBDO0lBQzFDLDZDQUF1QztJQUN2QyxpREFBb0U7SUFDcEUseUNBQStFO0lBQy9FLCtCQUFpQztJQUVqQyxtRUFBa0o7SUFFbEoseUVBQStGO0lBQy9GLHNHQUE4RDtJQUs5RCxzRUFBMkM7SUE2QjNDOzs7Ozs7O09BT0c7SUFDSDtRQUFBO1lBQ0UsY0FBUyxHQUFtQixFQUFFLENBQUM7WUFDL0Isd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztZQUNwRCxtQkFBYyxHQUFpQixFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUFELG9CQUFDO0lBQUQsQ0FBQyxBQUpELElBSUM7SUFRWSxRQUFBLHFCQUFxQixHQUFHLEdBQUcsQ0FBQztJQUV6Qzs7Ozs7T0FLRztJQUNIO1FBQ0Usa0JBQ2MsSUFBd0IsRUFBWSxNQUFlLEVBQ25ELE1BQXdCLEVBQVksVUFBa0IsRUFDdEQsVUFBa0I7WUFGbEIsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBQ25ELFdBQU0sR0FBTixNQUFNLENBQWtCO1lBQVksZUFBVSxHQUFWLFVBQVUsQ0FBUTtZQUN0RCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQUcsQ0FBQztRQUVwQyxnQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQUUsb0JBQTBDLEVBQ2xGLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBZ0NDO1lBNUJDLElBQU0sYUFBYSxHQUFlLEVBQUUsQ0FBQztZQUVyQyw4QkFBOEI7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFBLFVBQVU7Z0JBQ3JELElBQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDeEQsSUFBTSxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBRWxFLElBQUksWUFBWSxJQUFJLG9CQUFvQixJQUFJLFVBQVUsS0FBSyxLQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQy9FLGFBQWEsQ0FBQyxJQUFJLE9BQWxCLGFBQWEsbUJBQVMsS0FBSSxDQUFDLFVBQVUsQ0FDakMsVUFBVSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsQ0FBQyxHQUFFO2lCQUNuRjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDekMsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztnQkFFbEYsaUZBQWlGO2dCQUNqRixpRUFBaUU7Z0JBQ2pFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN2QyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLGFBQWEsRUFBRSxDQUFDLENBQUM7aUJBQ3pEO2dCQUNELFFBQVEsQ0FBQyxPQUFPLENBQ1osVUFBQyxVQUFVLEVBQUUsSUFBSSxJQUFLLE9BQUEsYUFBYSxDQUFDLElBQUksT0FBbEIsYUFBYSxtQkFBUyxLQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBMUQsQ0FBMkQsQ0FBQyxDQUFDO2FBQ3hGO1lBRUQsT0FBTyxhQUFhLENBQUM7UUFDdkIsQ0FBQztRQUVEOzs7O1dBSUc7UUFDSCw2QkFBVSxHQUFWLFVBQ0ksVUFBeUIsRUFBRSxZQUFvQyxFQUMvRCxvQkFBb0QsRUFDcEQsMkJBQXdEO1lBSDVELGlCQTBDQztZQXRDQyxJQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEQsSUFBTSxVQUFVLEdBQUcsSUFBSSxzQkFBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVqRCxJQUFJLG9CQUFvQixFQUFFO2dCQUN4QixJQUFJLENBQUMsNkJBQTZCLENBQzlCLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDckY7WUFFRCxJQUFJLFlBQVksRUFBRTtnQkFDaEIsSUFBTSxlQUFhLEdBQUcsSUFBSSwwQkFBYSxDQUNuQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQzdFLHlCQUFhLENBQUMsQ0FBQztnQkFFbkIseUZBQXlGO2dCQUN6Rix1QkFBdUI7Z0JBQ3ZCLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUV0RCxZQUFZLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7b0JBQ3hDLElBQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsZUFBYSxDQUFDLENBQUM7b0JBQzVGLEtBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsWUFBWSxDQUNiLFVBQVUsRUFDVixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxZQUFZLEVBQUUsZUFBYSxDQUFDLEVBQ3JGLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDNUY7WUFFRCxzQ0FBc0M7WUFDdEMsSUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO2dCQUN2QyxJQUFNLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQzthQUM5RTtZQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELGdDQUFhLEdBQWIsVUFBYyxPQUFzQixFQUFFLFVBQXlCO1lBQzdELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFNLFVBQVUsR0FBRyxJQUFJLHNCQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQyxJQUFNLGFBQWEsR0FBRyxJQUFJLDBCQUFhLENBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEVBQUUseUJBQWEsQ0FBQyxDQUFDO1lBRW5GLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTtnQkFDbkMsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEQsUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxXQUFXO29CQUN0QyxJQUFNLElBQUksR0FBRywwQkFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQzVELElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUMxRSxJQUFNLFlBQVksR0FBRyxnQkFBYyxXQUFXLENBQUMsSUFBSSxVQUFLLE9BQU8sUUFBSyxDQUFDO29CQUNyRSxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZELENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsNEJBQTRCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRTNFLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBR3pFLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNPLCtDQUE0QixHQUF0QyxVQUNJLFVBQXVCLEVBQUUsbUJBQThDLEVBQ3ZFLGFBQTRCO1lBRmhDLGlCQTBDQztZQXZDQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO2dCQUM5QixJQUFNLFlBQVksR0FBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQTRCLENBQUMsSUFBTSxDQUFDLElBQUksQ0FBQztnQkFDN0UsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ2xFLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDakUsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTO29CQUN0QyxDQUFDLGVBQWUsS0FBSyxZQUFZLENBQUMsQ0FBQzt3QkFDOUIsY0FBYyxDQUFDLE9BQUsseUJBQVEsQ0FBQyx3QkFBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFlBQVksQ0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDekUsSUFBSSxDQUFDLENBQUM7Z0JBQ2YsSUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRTFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3pCLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3JGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNoQyxJQUFJLENBQUM7b0JBQ1QsSUFBSSxLQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ2hELHdGQUF3Rjt3QkFDeEYsb0JBQW9CO3dCQUNwQixVQUFVLENBQUMsU0FBUyxDQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFDaEUseUJBQXVCLFFBQVEsTUFBRyxDQUFDLENBQUM7cUJBQ3pDO3lCQUFNO3dCQUNMLG1GQUFtRjt3QkFDbkYsa0NBQWtDO3dCQUNsQyxJQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMzRCxVQUFVLENBQUMsU0FBUyxDQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFDaEUsTUFBSSxrQkFBa0Isb0JBQWUsUUFBUSxNQUFHLENBQUMsQ0FBQztxQkFDdkQ7aUJBQ0Y7cUJBQU07b0JBQ0wscURBQXFEO29CQUNyRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNsRCxJQUFNLFdBQVcsR0FBRyxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUM5RSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzt3QkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUIsVUFBVSxDQUFDLFVBQVUsQ0FDakIsV0FBVyxFQUNYLE9BQUssZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUUscUJBQXFCLENBQUMsU0FBSSxRQUFRLE1BQUcsQ0FBQyxDQUFDO2lCQUNqRztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQWdCRDs7Ozs7O1dBTUc7UUFDTyw0Q0FBeUIsR0FBbkMsVUFBb0MsT0FBd0I7WUFDMUQsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLDZCQUFxQixFQUFFLENBQUM7WUFDdkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7Z0JBQ25CLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztvQkFDMUIsSUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFRLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7d0JBQzNDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDcEQ7eUJBQU07d0JBQ0wsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3pEO2dCQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLGtCQUFrQixDQUFDO1FBQzVCLENBQUM7UUFFRDs7V0FFRztRQUNPLG1DQUFnQixHQUExQixVQUEyQixJQUFtQjtZQUM1QyxJQUFNLE1BQU0sR0FBRyxpQ0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBTSxRQUFRLEdBQUcsd0NBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVyRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFNLGVBQWUsR0FBRywrQkFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUMsT0FBTztvQkFDTCxNQUFNLEVBQUUsbUNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7b0JBQ3hELEdBQUcsRUFBRSxlQUFlO29CQUNwQixRQUFRLEVBQUUsSUFBSTtpQkFDZixDQUFDO2FBQ0g7aUJBQU0sSUFBSSxRQUFRLEVBQUU7Z0JBQ25CLElBQUksaUJBQWlCLEdBQTRCLElBQUksQ0FBQztnQkFDdEQsSUFBSTtvQkFDRixpQkFBaUIsR0FBRyxzQ0FBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7aUJBQzFFO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7d0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQ1Isa0VBQStELENBQUMsQ0FBQyxJQUFJLHlDQUFxQyxDQUFDLENBQUM7d0JBQ2hILElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO3dCQUN2QyxJQUFJLHlCQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLHlCQUFRLENBQUMsT0FBTyxDQUFDLElBQUksYUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOzRCQUN4RSxPQUFPLENBQUMsSUFBSSxDQUNSLDZEQUEwRCx5QkFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFHLENBQUMsQ0FBQzs0QkFDcEYsSUFBSTtnQ0FDRixpQkFBaUIsR0FBRywrQkFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQVksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUMzRTs0QkFBQyxPQUFPLENBQUMsRUFBRTtnQ0FDVixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUNsQjt5QkFDRjtxQkFDRjtpQkFDRjtnQkFDRCxPQUFPO29CQUNMLE1BQU0sRUFBRSwwQ0FBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7b0JBQy9ELEdBQUcsRUFBRSxpQkFBaUI7b0JBQ3RCLFFBQVEsRUFBRSxLQUFLO2lCQUNoQixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQyxDQUFDO2FBQ3hEO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNPLHFDQUFrQixHQUE1QixVQUNJLFVBQXlCLEVBQUUsS0FBb0IsRUFBRSxNQUFtQjtZQUN0RSxJQUFNLFVBQVUsR0FBRyx3QkFBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUseUJBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzVGLElBQU0sYUFBYSxHQUFNLFVBQVUsU0FBTSxDQUFDO1lBQzFDLElBQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLE1BQU0sRUFBRSxVQUFVLENBQUMsUUFBUTtnQkFDM0IsY0FBYyxFQUFFLElBQUk7YUFHckIsQ0FBQyxDQUFDO1lBRUgsb0ZBQW9GO1lBQ3BGLFNBQVMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBRTVCLElBQU0sU0FBUyxHQUNYLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXpGLElBQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztZQUM5QixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUssU0FBUyxDQUFDLFNBQVMsRUFBSSxFQUFDLENBQUMsQ0FBQzthQUM3RjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNWLElBQUksRUFBRSxVQUFVO29CQUNoQixRQUFRLEVBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFLLDJDQUFzQixDQUFDLGFBQWEsQ0FBRztpQkFDM0UsQ0FBQyxDQUFDO2dCQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUMsQ0FBQyxDQUFDO2FBQ2xFO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVTLDBDQUF1QixHQUFqQyxVQUNJLGtCQUFzQyxFQUN0QywyQkFBd0QsRUFDeEQsMkJBQ0k7WUFKUixpQkErQ0M7WUExQ0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUM7WUFFdkQsMERBQTBEO1lBQzFELGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxVQUFBLFlBQVk7Z0JBQ3JDLFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsYUFBYTtvQkFDaEQsSUFBTSxjQUFjLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQzlFLElBQUksY0FBYyxFQUFFO3dCQUNsQixJQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQy9DLElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDOUQsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxjQUFjLGdCQUFBLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDO3dCQUNwRixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztxQkFDakM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILHVFQUF1RTtZQUN2RSxJQUFJLDJCQUEyQixLQUFLLElBQUksRUFBRTtnQkFDeEMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLFVBQUMsd0JBQXdCLEVBQUUsT0FBTztvQkFDcEUsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUM5RCxVQUFVLENBQUMsbUJBQW1CLEdBQUcsd0JBQXdCLENBQUM7b0JBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBRUQsK0RBQStEO1lBQy9ELElBQUksMkJBQTJCLENBQUMsTUFBTSxFQUFFO2dCQUN0QywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDO29CQUNuQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7d0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0NBQWdDLENBQUMsQ0FBQyxVQUFVLFlBQU8sQ0FBQyxDQUFDLElBQUksUUFBSzs0QkFDOUQsMEVBQTBFOzRCQUMxRSxrR0FBa0c7NEJBQ2xHLG9HQUFvRyxDQUFDLENBQUM7cUJBQzNHO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBSyxDQUFDLElBQUksQ0FBQztnQkFDN0MsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNwRSxVQUFVLENBQUMsY0FBYyxHQUFHLDJCQUEyQixDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRDs7OztXQUlHO1FBQ0ssZ0RBQTZCLEdBQXJDLFVBQXNDLFFBQTRCO1lBQ2hFLElBQU0sRUFBRSxHQUNKLFFBQVEsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDN0YsT0FBTyxDQUNILEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVPLG9DQUFpQixHQUF6QixVQUEwQixhQUFpQyxFQUFFLE1BQWU7WUFDMUUsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRTtnQkFDekIsT0FBTyxJQUFJLDZDQUFzQixFQUFFLENBQUM7YUFDckM7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUN0QixPQUFPLElBQUksaUNBQXVCLENBQUMsYUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlEO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSw0QkFBa0IsRUFBRSxDQUFDO2FBQ2pDO1FBQ0gsQ0FBQztRQUNILGVBQUM7SUFBRCxDQUFDLEFBOVZELElBOFZDO0lBOVZxQiw0QkFBUTtJQWdXOUI7Ozs7Ozs7Ozs7Ozs7O09BY0c7SUFDSCxTQUFnQixlQUFlLENBQzNCLE1BQTJCLEVBQUUsTUFBb0I7UUFDbkQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE9BQU8sK0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMzQjtRQUNELElBQU0sY0FBYyxHQUFHLElBQUksOEJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsSUFBTSxjQUFjLEdBQUcsSUFBSSw4QkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFNLGtCQUFrQixHQUFHLCtCQUFrQixDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM1RSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEQsSUFBTSxNQUFNLEdBQUcsNkJBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFYRCwwQ0FXQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLFVBQXlCLEVBQUUsWUFBMEIsRUFBRSxPQUFzQjtRQUMvRSxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsT0FBTyxZQUFZLENBQUMsVUFBVTthQUN6QixHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSwrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLHNDQUE0QixDQUFDLEVBQS9ELENBQStELENBQUM7YUFDNUUsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQTVELENBQTRELENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFQRCxnREFPQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsVUFBeUIsRUFBRSxhQUE0QixFQUFFLE9BQXNCO1FBQ2pGLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLElBQUksR0FBSSxhQUFhLENBQUMsV0FBbUMsQ0FBQyxJQUFNLENBQUM7UUFDdkUsSUFBTSxTQUFTLEdBQUcsVUFBQyxJQUFlO1lBQzlCLE9BQUEsK0JBQWtCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxzQ0FBNEIsQ0FBQztRQUEvRCxDQUErRCxDQUFDO1FBQ3BFLElBQU0sV0FBVyxHQUNiLGFBQWEsQ0FBQyxXQUFXO2FBQ3BCLEdBQUcsQ0FDQSxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFwQixDQUFvQixDQUFDO2FBQzlDLE1BQU0sQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDekUsR0FBRyxDQUNBLFVBQUEsU0FBUztZQUNMLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQWpFLENBQWlFLENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUxmLENBS2UsQ0FBQzthQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQWpCRCw4Q0FpQkM7SUFFRCxTQUFnQixjQUFjLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRkQsd0NBRUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyx5QkFBeUIsQ0FDOUIsWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzdFLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FDcEIsYUFBNEIsRUFBRSxVQUF5QixFQUFFLFVBQWtCO1FBQzdFLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9GLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBSSxRQUFRLENBQUMsWUFBWSxTQUFJLFFBQVEsQ0FBQyxNQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUcsVUFBWSxDQUFDO0lBQ3BGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlUHJvcEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7U291cmNlTWFwQ29udmVydGVyLCBjb21tZW50UmVnZXgsIGZyb21KU09OLCBmcm9tTWFwRmlsZVNvdXJjZSwgZnJvbU9iamVjdCwgZnJvbVNvdXJjZSwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgbWFwRmlsZUNvbW1lbnRSZWdleCwgcmVtb3ZlQ29tbWVudHMsIHJlbW92ZU1hcEZpbGVDb21tZW50c30gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCB7cmVhZEZpbGVTeW5jLCBzdGF0U3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge2Jhc2VuYW1lLCBkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtTb3VyY2VNYXBDb25zdW1lciwgU291cmNlTWFwR2VuZXJhdG9yLCBSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBJbXBvcnRSZXdyaXRlciwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7dHJhbnNsYXRlU3RhdGVtZW50LCB0cmFuc2xhdGVUeXBlLCBJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge05nY2NGbGF0SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4vbmdjY19pbXBvcnRfcmV3cml0ZXInO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvZGVjb3JhdGlvbl9hbmFseXplcic7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNJbmZvLCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgRXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHlzaXN9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3QsIFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9ufSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmludGVyZmFjZSBTb3VyY2VNYXBJbmZvIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIG1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGw7XG4gIGlzSW5saW5lOiBib29sZWFuO1xufVxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgZmlsZSB0aGF0IGhhcyBiZWVuIHJlbmRlcmVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVJbmZvIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gd2hlcmUgdGhlIGZpbGUgc2hvdWxkIGJlIHdyaXR0ZW4uXG4gICAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgY29udGVudHMgb2YgdGhlIGZpbGUgdG8gYmUgYmUgd3JpdHRlbi5cbiAgICovXG4gIGNvbnRlbnRzOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBEdHNDbGFzc0luZm8ge1xuICBkdHNEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogQSBzdHJ1Y3R1cmUgdGhhdCBjYXB0dXJlcyBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IG5lZWRzIHRvIGJlIHJlbmRlcmVkXG4gKiBpbiBhIHR5cGluZ3MgZmlsZS5cbiAqXG4gKiBJdCBpcyBjcmVhdGVkIGFzIGEgcmVzdWx0IG9mIHByb2Nlc3NpbmcgdGhlIGFuYWx5c2lzIHBhc3NlZCB0byB0aGUgcmVuZGVyZXIuXG4gKlxuICogVGhlIGByZW5kZXJEdHNGaWxlKClgIG1ldGhvZCBjb25zdW1lcyBpdCB3aGVuIHJlbmRlcmluZyBhIHR5cGluZ3MgZmlsZS5cbiAqL1xuY2xhc3MgRHRzUmVuZGVySW5mbyB7XG4gIGNsYXNzSW5mbzogRHRzQ2xhc3NJbmZvW10gPSBbXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSA9IFtdO1xuICBwcml2YXRlRXhwb3J0czogRXhwb3J0SW5mb1tdID0gW107XG59XG5cbi8qKlxuICogVGhlIGNvbGxlY3RlZCBkZWNvcmF0b3JzIHRoYXQgaGF2ZSBiZWNvbWUgcmVkdW5kYW50IGFmdGVyIHRoZSBjb21waWxhdGlvblxuICogb2YgSXZ5IHN0YXRpYyBmaWVsZHMuIFRoZSBtYXAgaXMga2V5ZWQgYnkgdGhlIGNvbnRhaW5lciBub2RlLCBzdWNoIHRoYXQgd2VcbiAqIGNhbiB0ZWxsIGlmIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHlcbiAqL1xuZXhwb3J0IHR5cGUgUmVkdW5kYW50RGVjb3JhdG9yTWFwID0gTWFwPHRzLk5vZGUsIHRzLk5vZGVbXT47XG5leHBvcnQgY29uc3QgUmVkdW5kYW50RGVjb3JhdG9yTWFwID0gTWFwO1xuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcm90ZWN0ZWQgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcm90ZWN0ZWQgaXNDb3JlOiBib29sZWFuLFxuICAgICAgcHJvdGVjdGVkIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSwgcHJvdGVjdGVkIHNvdXJjZVBhdGg6IHN0cmluZyxcbiAgICAgIHByb3RlY3RlZCB0YXJnZXRQYXRoOiBzdHJpbmcpIHt9XG5cbiAgcmVuZGVyUHJvZ3JhbShcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfG51bGwpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzOiBGaWxlSW5mb1tdID0gW107XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcy5cbiAgICB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLm1hcChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGNvbnN0IGNvbXBpbGVkRmlsZSA9IGRlY29yYXRpb25BbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcblxuICAgICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcyB8fCBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgICByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJGaWxlKFxuICAgICAgICAgICAgc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIC5kLnRzIGZpbGVzXG4gICAgaWYgKHRoaXMuYnVuZGxlLmR0cykge1xuICAgICAgY29uc3QgZHRzRmlsZXMgPSB0aGlzLmdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuXG4gICAgICAvLyBJZiB0aGUgZHRzIGVudHJ5LXBvaW50IGlzIG5vdCBhbHJlYWR5IHRoZXJlIChpdCBkaWQgbm90IGhhdmUgY29tcGlsZWQgY2xhc3NlcylcbiAgICAgIC8vIHRoZW4gYWRkIGl0IG5vdywgdG8gZW5zdXJlIGl0IGdldHMgaXRzIGV4dHJhIGV4cG9ydHMgcmVuZGVyZWQuXG4gICAgICBpZiAoIWR0c0ZpbGVzLmhhcyh0aGlzLmJ1bmRsZS5kdHMuZmlsZSkpIHtcbiAgICAgICAgZHRzRmlsZXMuc2V0KHRoaXMuYnVuZGxlLmR0cy5maWxlLCBuZXcgRHRzUmVuZGVySW5mbygpKTtcbiAgICAgIH1cbiAgICAgIGR0c0ZpbGVzLmZvckVhY2goXG4gICAgICAgICAgKHJlbmRlckluZm8sIGZpbGUpID0+IHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckR0c0ZpbGUoZmlsZSwgcmVuZGVySW5mbykpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRGaWxlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHNvdXJjZSBjb2RlIGFuZCBzb3VyY2UtbWFwIGZvciBhbiBBbmFseXplZCBmaWxlLlxuICAgKiBAcGFyYW0gY29tcGlsZWRGaWxlIFRoZSBhbmFseXplZCBmaWxlIHRvIHJlbmRlci5cbiAgICogQHBhcmFtIHRhcmdldFBhdGggVGhlIGFic29sdXRlIHBhdGggd2hlcmUgdGhlIHJlbmRlcmVkIGZpbGUgd2lsbCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcmVuZGVyRmlsZShcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZTogQ29tcGlsZWRGaWxlfHVuZGVmaW5lZCxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2lzOiBTd2l0Y2hNYXJrZXJBbmFseXNpc3x1bmRlZmluZWQsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5leHRyYWN0U291cmNlTWFwKHNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcblxuICAgIGlmIChzd2l0Y2hNYXJrZXJBbmFseXNpcykge1xuICAgICAgdGhpcy5yZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5zb3VyY2VGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5kZWNsYXJhdGlvbnMpO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZpbGUpIHtcbiAgICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgICB0aGlzLmdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLnNyYy5yM1N5bWJvbHNGaWxlLCB0aGlzLmJ1bmRsZS5pc0ZsYXRDb3JlKSxcbiAgICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnN0cnVjdG9yIHBhcmFtIG1ldGFkYXRhIGFuZCBwcm9wZXJ0eSBkZWNvcmF0b3JzICh3ZSBuZWVkIGluZm8gZnJvbSB0aGVcbiAgICAgIC8vIGhhbmRsZXJzIHRvIGRvIHRoaXMpXG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcyk7XG4gICAgICB0aGlzLnJlbW92ZURlY29yYXRvcnMob3V0cHV0VGV4dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID0gcmVuZGVyRGVmaW5pdGlvbnMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5hZGREZWZpbml0aW9ucyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFkZENvbnN0YW50cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LFxuICAgICAgICAgIHJlbmRlckNvbnN0YW50UG9vbChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLmNvbnN0YW50UG9vbCwgaW1wb3J0TWFuYWdlciksXG4gICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuXG4gICAgICB0aGlzLmFkZEltcG9ydHMob3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLmZpbGVOYW1lKSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIGV4cG9ydHMgdG8gdGhlIGVudHJ5LXBvaW50IGZpbGVcbiAgICBpZiAoc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuYWRkRXhwb3J0cyhvdXRwdXRUZXh0LCBlbnRyeVBvaW50QmFzZVBhdGgsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU291cmNlQW5kTWFwKHNvdXJjZUZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHJlbmRlckR0c0ZpbGUoZHRzRmlsZTogdHMuU291cmNlRmlsZSwgcmVuZGVySW5mbzogRHRzUmVuZGVySW5mbyk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5leHRyYWN0U291cmNlTWFwKGR0c0ZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgdGhpcy5nZXRJbXBvcnRSZXdyaXRlcih0aGlzLmJ1bmRsZS5kdHMgIS5yM1N5bWJvbHNGaWxlLCBmYWxzZSksIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgcmVuZGVySW5mby5jbGFzc0luZm8uZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIGNvbnN0IHR5cGVTdHIgPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdHlwZSwgZHRzRmlsZSk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGAgICAgc3RhdGljICR7ZGVjbGFyYXRpb24ubmFtZX06ICR7dHlwZVN0cn07XFxuYDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRSaWdodChlbmRPZkNsYXNzIC0gMSwgbmV3U3RhdGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5hZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKG91dHB1dFRleHQsIHJlbmRlckluZm8ubW9kdWxlV2l0aFByb3ZpZGVycywgaW1wb3J0TWFuYWdlcik7XG4gICAgdGhpcy5hZGRJbXBvcnRzKG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhkdHNGaWxlLmZpbGVOYW1lKSk7XG5cbiAgICB0aGlzLmFkZEV4cG9ydHMob3V0cHV0VGV4dCwgZHRzRmlsZS5maWxlTmFtZSwgcmVuZGVySW5mby5wcml2YXRlRXhwb3J0cyk7XG5cblxuICAgIHJldHVybiB0aGlzLnJlbmRlclNvdXJjZUFuZE1hcChkdHNGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSB0eXBlIHBhcmFtZXRlcnMgdG8gdGhlIGFwcHJvcHJpYXRlIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBgTW9kdWxlV2l0aFByb3ZpZGVyc2BcbiAgICogc3RydWN0dXJlcy5cbiAgICpcbiAgICogVGhpcyBmdW5jdGlvbiBvbmx5IGdldHMgY2FsbGVkIG9uIHR5cGluZ3MgZmlsZXMsIHNvIGl0IGRvZXNuJ3QgbmVlZCBkaWZmZXJlbnQgaW1wbGVtZW50YXRpb25zXG4gICAqIGZvciBlYWNoIGJ1bmRsZSBmb3JtYXQuXG4gICAqL1xuICBwcm90ZWN0ZWQgYWRkTW9kdWxlV2l0aFByb3ZpZGVyc1BhcmFtcyhcbiAgICAgIG91dHB1dFRleHQ6IE1hZ2ljU3RyaW5nLCBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdLFxuICAgICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlcik6IHZvaWQge1xuICAgIG1vZHVsZVdpdGhQcm92aWRlcnMuZm9yRWFjaChpbmZvID0+IHtcbiAgICAgIGNvbnN0IG5nTW9kdWxlTmFtZSA9IChpbmZvLm5nTW9kdWxlLm5vZGUgYXMgdHMuQ2xhc3NEZWNsYXJhdGlvbikubmFtZSAhLnRleHQ7XG4gICAgICBjb25zdCBkZWNsYXJhdGlvbkZpbGUgPSBpbmZvLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlRmlsZSA9IGluZm8ubmdNb2R1bGUubm9kZS5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWU7XG4gICAgICBjb25zdCBpbXBvcnRQYXRoID0gaW5mby5uZ01vZHVsZS52aWFNb2R1bGUgfHxcbiAgICAgICAgICAoZGVjbGFyYXRpb25GaWxlICE9PSBuZ01vZHVsZUZpbGUgP1xuICAgICAgICAgICAgICAgc3RyaXBFeHRlbnNpb24oYC4vJHtyZWxhdGl2ZShkaXJuYW1lKGRlY2xhcmF0aW9uRmlsZSksIG5nTW9kdWxlRmlsZSl9YCkgOlxuICAgICAgICAgICAgICAgbnVsbCk7XG4gICAgICBjb25zdCBuZ01vZHVsZSA9IGdldEltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCBpbXBvcnRQYXRoLCBuZ01vZHVsZU5hbWUpO1xuXG4gICAgICBpZiAoaW5mby5kZWNsYXJhdGlvbi50eXBlKSB7XG4gICAgICAgIGNvbnN0IHR5cGVOYW1lID0gaW5mby5kZWNsYXJhdGlvbi50eXBlICYmIHRzLmlzVHlwZVJlZmVyZW5jZU5vZGUoaW5mby5kZWNsYXJhdGlvbi50eXBlKSA/XG4gICAgICAgICAgICBpbmZvLmRlY2xhcmF0aW9uLnR5cGUudHlwZU5hbWUgOlxuICAgICAgICAgICAgbnVsbDtcbiAgICAgICAgaWYgKHRoaXMuaXNDb3JlTW9kdWxlV2l0aFByb3ZpZGVyc1R5cGUodHlwZU5hbWUpKSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGFscmVhZHkgcmV0dXJucyBgTW9kdWxlV2l0aFByb3ZpZGVyYCBidXQgaXQgbmVlZHMgdGhlIGBOZ01vZHVsZWAgdHlwZVxuICAgICAgICAgIC8vIHBhcmFtZXRlciBhZGRpbmcuXG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGBNb2R1bGVXaXRoUHJvdmlkZXJzPCR7bmdNb2R1bGV9PmApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiByZXR1cm5zIGFuIHVua25vd24gdHlwZSBzbyB3ZSBuZWVkIHRvIGNvbnZlcnQgaXQgdG8gYSB1bmlvbiB0aGF0XG4gICAgICAgICAgLy8gaW5jbHVkZXMgdGhlIG5nTW9kdWxlIHByb3BlcnR5LlxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVHlwZVN0cmluZyA9IGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRUZXh0KCk7XG4gICAgICAgICAgb3V0cHV0VGV4dC5vdmVyd3JpdGUoXG4gICAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRTdGFydCgpLCBpbmZvLmRlY2xhcmF0aW9uLnR5cGUuZ2V0RW5kKCksXG4gICAgICAgICAgICAgIGAoJHtvcmlnaW5hbFR5cGVTdHJpbmd9KSZ7bmdNb2R1bGU6JHtuZ01vZHVsZX19YCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRoZSBkZWNsYXJhdGlvbiBoYXMgbm8gcmV0dXJuIHR5cGUgc28gcHJvdmlkZSBvbmUuXG4gICAgICAgIGNvbnN0IGxhc3RUb2tlbiA9IGluZm8uZGVjbGFyYXRpb24uZ2V0TGFzdFRva2VuKCk7XG4gICAgICAgIGNvbnN0IGluc2VydFBvaW50ID0gbGFzdFRva2VuICYmIGxhc3RUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLlNlbWljb2xvblRva2VuID9cbiAgICAgICAgICAgIGxhc3RUb2tlbi5nZXRTdGFydCgpIDpcbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kTGVmdChcbiAgICAgICAgICAgIGluc2VydFBvaW50LFxuICAgICAgICAgICAgYDogJHtnZXRJbXBvcnRTdHJpbmcoaW1wb3J0TWFuYWdlciwgJ0Bhbmd1bGFyL2NvcmUnLCAnTW9kdWxlV2l0aFByb3ZpZGVycycpfTwke25nTW9kdWxlfT5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRDb25zdGFudHMob3V0cHV0OiBNYWdpY1N0cmluZywgY29uc3RhbnRzOiBzdHJpbmcsIGZpbGU6IHRzLlNvdXJjZUZpbGUpOlxuICAgICAgdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZEltcG9ydHMob3V0cHV0OiBNYWdpY1N0cmluZywgaW1wb3J0czoge3NwZWNpZmllcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVhbGlmaWVyOiBzdHJpbmd9W10pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRXhwb3J0cyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGVudHJ5UG9pbnRCYXNlUGF0aDogc3RyaW5nLCBleHBvcnRzOiBFeHBvcnRJbmZvW10pOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkRGVmaW5pdGlvbnMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBkZWZpbml0aW9uczogc3RyaW5nKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHJlbW92ZURlY29yYXRvcnMoXG4gICAgICBvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBkZWNvcmF0b3JzVG9SZW1vdmU6IFJlZHVuZGFudERlY29yYXRvck1hcCk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgIG91dHB1dFRleHQ6IE1hZ2ljU3RyaW5nLCBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLFxuICAgICAgZGVjbGFyYXRpb25zOiBTd2l0Y2hhYmxlVmFyaWFibGVEZWNsYXJhdGlvbltdKTogdm9pZDtcblxuICAvKipcbiAgICogRnJvbSB0aGUgZ2l2ZW4gbGlzdCBvZiBjbGFzc2VzLCBjb21wdXRlcyBhIG1hcCBvZiBkZWNvcmF0b3JzIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAqIFRoZSBkZWNvcmF0b3JzIHRvIHJlbW92ZSBhcmUga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZSBjYW4gdGVsbCBpZlxuICAgKiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5LlxuICAgKiBAcGFyYW0gY2xhc3NlcyBUaGUgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbWF5IGhhdmUgZGVjb3JhdG9ycyB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIGRlY29yYXRvcnMgdG8gcmVtb3ZlLCBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZS5cbiAgICovXG4gIHByb3RlY3RlZCBjb21wdXRlRGVjb3JhdG9yc1RvUmVtb3ZlKGNsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSk6IFJlZHVuZGFudERlY29yYXRvck1hcCB7XG4gICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gbmV3IFJlZHVuZGFudERlY29yYXRvck1hcCgpO1xuICAgIGNsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBjbGF6ei5kZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yQXJyYXkgPSBkZWMubm9kZS5wYXJlbnQgITtcbiAgICAgICAgaWYgKCFkZWNvcmF0b3JzVG9SZW1vdmUuaGFzKGRlY29yYXRvckFycmF5KSkge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5nZXQoZGVjb3JhdG9yQXJyYXkpICEucHVzaChkZWMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWNvcmF0b3JzVG9SZW1vdmU7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBtYXAgZnJvbSB0aGUgc291cmNlIChub3RlIHdoZXRoZXIgaXQgaXMgaW5saW5lIG9yIGV4dGVybmFsKVxuICAgKi9cbiAgcHJvdGVjdGVkIGV4dHJhY3RTb3VyY2VNYXAoZmlsZTogdHMuU291cmNlRmlsZSk6IFNvdXJjZU1hcEluZm8ge1xuICAgIGNvbnN0IGlubGluZSA9IGNvbW1lbnRSZWdleC50ZXN0KGZpbGUudGV4dCk7XG4gICAgY29uc3QgZXh0ZXJuYWwgPSBtYXBGaWxlQ29tbWVudFJlZ2V4LnRlc3QoZmlsZS50ZXh0KTtcblxuICAgIGlmIChpbmxpbmUpIHtcbiAgICAgIGNvbnN0IGlubGluZVNvdXJjZU1hcCA9IGZyb21Tb3VyY2UoZmlsZS50ZXh0KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNvdXJjZTogcmVtb3ZlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgICBtYXA6IGlubGluZVNvdXJjZU1hcCxcbiAgICAgICAgaXNJbmxpbmU6IHRydWUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXh0ZXJuYWwpIHtcbiAgICAgIGxldCBleHRlcm5hbFNvdXJjZU1hcDogU291cmNlTWFwQ29udmVydGVyfG51bGwgPSBudWxsO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZXh0ZXJuYWxTb3VyY2VNYXAgPSBmcm9tTWFwRmlsZVNvdXJjZShmaWxlLnRleHQsIGRpcm5hbWUoZmlsZS5maWxlTmFtZSkpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoZS5jb2RlID09PSAnRU5PRU5UJykge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgYFRoZSBleHRlcm5hbCBtYXAgZmlsZSBzcGVjaWZpZWQgaW4gdGhlIHNvdXJjZSBjb2RlIGNvbW1lbnQgXCIke2UucGF0aH1cIiB3YXMgbm90IGZvdW5kIG9uIHRoZSBmaWxlIHN5c3RlbS5gKTtcbiAgICAgICAgICBjb25zdCBtYXBQYXRoID0gZmlsZS5maWxlTmFtZSArICcubWFwJztcbiAgICAgICAgICBpZiAoYmFzZW5hbWUoZS5wYXRoKSAhPT0gYmFzZW5hbWUobWFwUGF0aCkgJiYgc3RhdFN5bmMobWFwUGF0aCkuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICBgR3Vlc3NpbmcgdGhlIG1hcCBmaWxlIG5hbWUgZnJvbSB0aGUgc291cmNlIGZpbGUgbmFtZTogXCIke2Jhc2VuYW1lKG1hcFBhdGgpfVwiYCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21PYmplY3QoSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMobWFwUGF0aCwgJ3V0ZjgnKSkpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiByZW1vdmVNYXBGaWxlQ29tbWVudHMoZmlsZS50ZXh0KS5yZXBsYWNlKC9cXG5cXG4kLywgJ1xcbicpLFxuICAgICAgICBtYXA6IGV4dGVybmFsU291cmNlTWFwLFxuICAgICAgICBpc0lubGluZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4ge3NvdXJjZTogZmlsZS50ZXh0LCBtYXA6IG51bGwsIGlzSW5saW5lOiBmYWxzZX07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE1lcmdlIHRoZSBpbnB1dCBhbmQgb3V0cHV0IHNvdXJjZS1tYXBzLCByZXBsYWNpbmcgdGhlIHNvdXJjZS1tYXAgY29tbWVudCBpbiB0aGUgb3V0cHV0IGZpbGVcbiAgICogd2l0aCBhbiBhcHByb3ByaWF0ZSBzb3VyY2UtbWFwIGNvbW1lbnQgcG9pbnRpbmcgdG8gdGhlIG1lcmdlZCBzb3VyY2UtbWFwLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlbmRlclNvdXJjZUFuZE1hcChcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGlucHV0OiBTb3VyY2VNYXBJbmZvLCBvdXRwdXQ6IE1hZ2ljU3RyaW5nKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IHJlc29sdmUodGhpcy50YXJnZXRQYXRoLCByZWxhdGl2ZSh0aGlzLnNvdXJjZVBhdGgsIHNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcbiAgICBjb25zdCBvdXRwdXRNYXBQYXRoID0gYCR7b3V0cHV0UGF0aH0ubWFwYDtcbiAgICBjb25zdCBvdXRwdXRNYXAgPSBvdXRwdXQuZ2VuZXJhdGVNYXAoe1xuICAgICAgc291cmNlOiBzb3VyY2VGaWxlLmZpbGVOYW1lLFxuICAgICAgaW5jbHVkZUNvbnRlbnQ6IHRydWUsXG4gICAgICAvLyBoaXJlczogdHJ1ZSAvLyBUT0RPOiBUaGlzIHJlc3VsdHMgaW4gYWNjdXJhdGUgYnV0IGh1Z2Ugc291cmNlbWFwcy4gSW5zdGVhZCB3ZSBzaG91bGQgZml4XG4gICAgICAvLyB0aGUgbWVyZ2UgYWxnb3JpdGhtLlxuICAgIH0pO1xuXG4gICAgLy8gd2UgbXVzdCBzZXQgdGhpcyBhZnRlciBnZW5lcmF0aW9uIGFzIG1hZ2ljIHN0cmluZyBkb2VzIFwibWFuaXB1bGF0aW9uXCIgb24gdGhlIHBhdGhcbiAgICBvdXRwdXRNYXAuZmlsZSA9IG91dHB1dFBhdGg7XG5cbiAgICBjb25zdCBtZXJnZWRNYXAgPVxuICAgICAgICBtZXJnZVNvdXJjZU1hcHMoaW5wdXQubWFwICYmIGlucHV0Lm1hcC50b09iamVjdCgpLCBKU09OLnBhcnNlKG91dHB1dE1hcC50b1N0cmluZygpKSk7XG5cbiAgICBjb25zdCByZXN1bHQ6IEZpbGVJbmZvW10gPSBbXTtcbiAgICBpZiAoaW5wdXQuaXNJbmxpbmUpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtwYXRoOiBvdXRwdXRQYXRoLCBjb250ZW50czogYCR7b3V0cHV0LnRvU3RyaW5nKCl9XFxuJHttZXJnZWRNYXAudG9Db21tZW50KCl9YH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgIHBhdGg6IG91dHB1dFBhdGgsXG4gICAgICAgIGNvbnRlbnRzOiBgJHtvdXRwdXQudG9TdHJpbmcoKX1cXG4ke2dlbmVyYXRlTWFwRmlsZUNvbW1lbnQob3V0cHV0TWFwUGF0aCl9YFxuICAgICAgfSk7XG4gICAgICByZXN1bHQucHVzaCh7cGF0aDogb3V0cHV0TWFwUGF0aCwgY29udGVudHM6IG1lcmdlZE1hcC50b0pTT04oKX0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfFxuICAgICAgbnVsbCk6IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPiB7XG4gICAgY29uc3QgZHRzTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPigpO1xuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcmVuZGVyaW5nIGluZm8gZnJvbSB0aGUgZGVjb3JhdGlvbiBhbmFseXNlc1xuICAgIGRlY29yYXRpb25BbmFseXNlcy5mb3JFYWNoKGNvbXBpbGVkRmlsZSA9PiB7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZHRzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuZ2V0KGR0c0ZpbGUpIHx8IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICAgICAgcmVuZGVySW5mby5jbGFzc0luZm8ucHVzaCh7ZHRzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9ufSk7XG4gICAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIGZ1bmN0aW9ucy9tZXRob2RzIHRoYXQgbmVlZCB1cGRhdGluZ1xuICAgIGlmIChtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgIT09IG51bGwpIHtcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcy5mb3JFYWNoKChtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXgsIGR0c0ZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5nZXQoZHRzRmlsZSkgfHwgbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzID0gbW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4O1xuICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcHJpdmF0ZSBkZWNsYXJhdGlvbnMgdGhhdCBuZWVkIHRvIGJlIHJlLWV4cG9ydGVkXG4gICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5sZW5ndGgpIHtcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAoIWUuZHRzRnJvbSAmJiAhZS5hbGlhcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZXJlIGlzIG5vIHR5cGluZ3MgcGF0aCBmb3IgJHtlLmlkZW50aWZpZXJ9IGluICR7ZS5mcm9tfS5cXG5gICtcbiAgICAgICAgICAgICAgYFdlIG5lZWQgdG8gYWRkIGFuIGV4cG9ydCBmb3IgdGhpcyBjbGFzcyB0byBhIC5kLnRzIHR5cGluZ3MgZmlsZSBiZWNhdXNlIGAgK1xuICAgICAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBuZWVkcyB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSB0aGlzIGNsYXNzIGluIGNvbXBpbGVkIGNvZGUsIHN1Y2ggYXMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhlIHNpbXBsZXN0IGZpeCBmb3IgdGhpcyBpcyB0byBlbnN1cmUgdGhhdCB0aGlzIGNsYXNzIGlzIGV4cG9ydGVkIGZyb20gdGhlIHBhY2thZ2UncyBlbnRyeS1wb2ludC5gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkdHNFbnRyeVBvaW50ID0gdGhpcy5idW5kbGUuZHRzICEuZmlsZTtcbiAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuZ2V0KGR0c0VudHJ5UG9pbnQpIHx8IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzID0gcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzO1xuICAgICAgZHRzTWFwLnNldChkdHNFbnRyeVBvaW50LCByZW5kZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZHRzTWFwO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIGdpdmVuIHR5cGUgaXMgdGhlIGNvcmUgQW5ndWxhciBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgaW50ZXJmYWNlLlxuICAgKiBAcGFyYW0gdHlwZU5hbWUgVGhlIHR5cGUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHRydWUgaWYgdGhlIHR5cGUgaXMgdGhlIGNvcmUgQW5ndWxhciBgTW9kdWxlV2l0aFByb3ZpZGVyc2AgaW50ZXJmYWNlLlxuICAgKi9cbiAgcHJpdmF0ZSBpc0NvcmVNb2R1bGVXaXRoUHJvdmlkZXJzVHlwZSh0eXBlTmFtZTogdHMuRW50aXR5TmFtZXxudWxsKSB7XG4gICAgY29uc3QgaWQgPVxuICAgICAgICB0eXBlTmFtZSAmJiB0cy5pc0lkZW50aWZpZXIodHlwZU5hbWUpID8gdGhpcy5ob3N0LmdldEltcG9ydE9mSWRlbnRpZmllcih0eXBlTmFtZSkgOiBudWxsO1xuICAgIHJldHVybiAoXG4gICAgICAgIGlkICYmIGlkLm5hbWUgPT09ICdNb2R1bGVXaXRoUHJvdmlkZXJzJyAmJiAodGhpcy5pc0NvcmUgfHwgaWQuZnJvbSA9PT0gJ0Bhbmd1bGFyL2NvcmUnKSk7XG4gIH1cblxuICBwcml2YXRlIGdldEltcG9ydFJld3JpdGVyKHIzU3ltYm9sc0ZpbGU6IHRzLlNvdXJjZUZpbGV8bnVsbCwgaXNGbGF0OiBib29sZWFuKTogSW1wb3J0UmV3cml0ZXIge1xuICAgIGlmICh0aGlzLmlzQ29yZSAmJiBpc0ZsYXQpIHtcbiAgICAgIHJldHVybiBuZXcgTmdjY0ZsYXRJbXBvcnRSZXdyaXRlcigpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5pc0NvcmUpIHtcbiAgICAgIHJldHVybiBuZXcgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIocjNTeW1ib2xzRmlsZSAhLmZpbGVOYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBOb29wSW1wb3J0UmV3cml0ZXIoKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBNZXJnZSB0aGUgdHdvIHNwZWNpZmllZCBzb3VyY2UtbWFwcyBpbnRvIGEgc2luZ2xlIHNvdXJjZS1tYXAgdGhhdCBoaWRlcyB0aGUgaW50ZXJtZWRpYXRlXG4gKiBzb3VyY2UtbWFwLlxuICogRS5nLiBDb25zaWRlciB0aGVzZSBtYXBwaW5nczpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gT0xEX01BUCAtPiBJTlRFUk1FRElBVEVfU1JDIC0+IE5FV19NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKlxuICogdGhpcyB3aWxsIGJlIHJlcGxhY2VkIHdpdGg6XG4gKlxuICogYGBgXG4gKiBPTERfU1JDIC0+IE1FUkdFRF9NQVAgLT4gTkVXX1NSQ1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZVNvdXJjZU1hcHMoXG4gICAgb2xkTWFwOiBSYXdTb3VyY2VNYXAgfCBudWxsLCBuZXdNYXA6IFJhd1NvdXJjZU1hcCk6IFNvdXJjZU1hcENvbnZlcnRlciB7XG4gIGlmICghb2xkTWFwKSB7XG4gICAgcmV0dXJuIGZyb21PYmplY3QobmV3TWFwKTtcbiAgfVxuICBjb25zdCBvbGRNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihvbGRNYXApO1xuICBjb25zdCBuZXdNYXBDb25zdW1lciA9IG5ldyBTb3VyY2VNYXBDb25zdW1lcihuZXdNYXApO1xuICBjb25zdCBtZXJnZWRNYXBHZW5lcmF0b3IgPSBTb3VyY2VNYXBHZW5lcmF0b3IuZnJvbVNvdXJjZU1hcChuZXdNYXBDb25zdW1lcik7XG4gIG1lcmdlZE1hcEdlbmVyYXRvci5hcHBseVNvdXJjZU1hcChvbGRNYXBDb25zdW1lcik7XG4gIGNvbnN0IG1lcmdlZCA9IGZyb21KU09OKG1lcmdlZE1hcEdlbmVyYXRvci50b1N0cmluZygpKTtcbiAgcmV0dXJuIG1lcmdlZDtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIHJldHVybiBjb25zdGFudFBvb2wuc3RhdGVtZW50c1xuICAgICAgLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKSlcbiAgICAgIC5tYXAoc3RtdCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgc291cmNlRmlsZSkpXG4gICAgICAuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSAoY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbiBhcyB0cy5OYW1lZERlY2xhcmF0aW9uKS5uYW1lICE7XG4gIGNvbnN0IHRyYW5zbGF0ZSA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gIGNvbnN0IGRlZmluaXRpb25zID1cbiAgICAgIGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb25cbiAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICBjID0+IGMuc3RhdGVtZW50cy5tYXAoc3RhdGVtZW50ID0+IHRyYW5zbGF0ZShzdGF0ZW1lbnQpKVxuICAgICAgICAgICAgICAgICAgICAgICAuY29uY2F0KHRyYW5zbGF0ZShjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplcikpKVxuICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVtZW50ID0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0YXRlbWVudCwgc291cmNlRmlsZSkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSlcbiAgICAgICAgICAuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRXh0ZW5zaW9uKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gZmlsZVBhdGgucmVwbGFjZSgvXFwuKGpzfGRcXC50cykkLywgJycpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChcbiAgICByZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pOiBTdGF0ZW1lbnQge1xuICBjb25zdCByZWNlaXZlciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVjZWl2ZXJOYW1lKTtcbiAgcmV0dXJuIG5ldyBXcml0ZVByb3BFeHByKHJlY2VpdmVyLCBwcm9wTmFtZSwgaW5pdGlhbGl6ZXIpLnRvU3RtdCgpO1xufVxuXG5mdW5jdGlvbiBnZXRJbXBvcnRTdHJpbmcoXG4gICAgaW1wb3J0TWFuYWdlcjogSW1wb3J0TWFuYWdlciwgaW1wb3J0UGF0aDogc3RyaW5nIHwgbnVsbCwgaW1wb3J0TmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGltcG9ydEFzID0gaW1wb3J0UGF0aCA/IGltcG9ydE1hbmFnZXIuZ2VuZXJhdGVOYW1lZEltcG9ydChpbXBvcnRQYXRoLCBpbXBvcnROYW1lKSA6IG51bGw7XG4gIHJldHVybiBpbXBvcnRBcyA/IGAke2ltcG9ydEFzLm1vZHVsZUltcG9ydH0uJHtpbXBvcnRBcy5zeW1ib2x9YCA6IGAke2ltcG9ydE5hbWV9YDtcbn1cbiJdfQ==