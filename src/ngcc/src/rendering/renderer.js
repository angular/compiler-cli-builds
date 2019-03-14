(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "convert-source-map", "fs", "magic-string", "canonical-path", "source-map", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/src/ngcc/src/rendering/ngcc_import_rewriter", "@angular/compiler-cli/src/ngcc/src/constants"], factory);
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
    var ngcc_import_rewriter_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/ngcc_import_rewriter");
    var constants_1 = require("@angular/compiler-cli/src/ngcc/src/constants");
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
                var importManager_1 = new translator_1.ImportManager(this.getImportRewriter(this.bundle.src.r3SymbolsFile, this.bundle.isFlat), constants_1.IMPORT_PREFIX);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3JlbmRlcmluZy9yZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBc0c7SUFDdEcseURBQTZNO0lBQzdNLHlCQUEwQztJQUMxQyw2Q0FBdUM7SUFDdkMsaURBQW9FO0lBQ3BFLHlDQUErRTtJQUMvRSwrQkFBaUM7SUFFakMsbUVBQWtKO0lBRWxKLHlFQUEyRjtJQUMzRiwwR0FBOEQ7SUFLOUQsMEVBQTJDO0lBNkIzQzs7Ozs7OztPQU9HO0lBQ0g7UUFBQTtZQUNFLGNBQVMsR0FBbUIsRUFBRSxDQUFDO1lBQy9CLHdCQUFtQixHQUE4QixFQUFFLENBQUM7WUFDcEQsbUJBQWMsR0FBaUIsRUFBRSxDQUFDO1FBQ3BDLENBQUM7UUFBRCxvQkFBQztJQUFELENBQUMsQUFKRCxJQUlDO0lBUVksUUFBQSxxQkFBcUIsR0FBRyxHQUFHLENBQUM7SUFFekM7Ozs7O09BS0c7SUFDSDtRQUNFLGtCQUNjLElBQXdCLEVBQVksTUFBZSxFQUNuRCxNQUF3QixFQUFZLFVBQWtCLEVBQ3RELFVBQWtCO1lBRmxCLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVksV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUNuRCxXQUFNLEdBQU4sTUFBTSxDQUFrQjtZQUFZLGVBQVUsR0FBVixVQUFVLENBQVE7WUFDdEQsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUFHLENBQUM7UUFFcEMsZ0NBQWEsR0FBYixVQUNJLGtCQUFzQyxFQUFFLG9CQUEwQyxFQUNsRiwyQkFBd0QsRUFDeEQsMkJBQTZEO1lBSGpFLGlCQWdDQztZQTVCQyxJQUFNLGFBQWEsR0FBZSxFQUFFLENBQUM7WUFFckMsOEJBQThCO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBQSxVQUFVO2dCQUNyRCxJQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3hELElBQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUVsRSxJQUFJLFlBQVksSUFBSSxvQkFBb0IsSUFBSSxVQUFVLEtBQUssS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUMvRSxhQUFhLENBQUMsSUFBSSxPQUFsQixhQUFhLG1CQUFTLEtBQUksQ0FBQyxVQUFVLENBQ2pDLFVBQVUsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLENBQUMsR0FBRTtpQkFDbkY7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILDRCQUE0QjtZQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO2dCQUNuQixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQ3pDLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLDJCQUEyQixDQUFDLENBQUM7Z0JBRWxGLGlGQUFpRjtnQkFDakYsaUVBQWlFO2dCQUNqRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDdkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO2lCQUN6RDtnQkFDRCxRQUFRLENBQUMsT0FBTyxDQUNaLFVBQUMsVUFBVSxFQUFFLElBQUksSUFBSyxPQUFBLGFBQWEsQ0FBQyxJQUFJLE9BQWxCLGFBQWEsbUJBQVMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQTFELENBQTJELENBQUMsQ0FBQzthQUN4RjtZQUVELE9BQU8sYUFBYSxDQUFDO1FBQ3ZCLENBQUM7UUFFRDs7OztXQUlHO1FBQ0gsNkJBQVUsR0FBVixVQUNJLFVBQXlCLEVBQUUsWUFBb0MsRUFDL0Qsb0JBQW9ELEVBQ3BELDJCQUF3RDtZQUg1RCxpQkF5Q0M7WUFyQ0MsSUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELElBQU0sVUFBVSxHQUFHLElBQUksc0JBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsSUFBSSxvQkFBb0IsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLDZCQUE2QixDQUM5QixVQUFVLEVBQUUsb0JBQW9CLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ3JGO1lBRUQsSUFBSSxZQUFZLEVBQUU7Z0JBQ2hCLElBQU0sZUFBYSxHQUFHLElBQUksMEJBQWEsQ0FDbkMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLHlCQUFhLENBQUMsQ0FBQztnQkFFOUYseUZBQXlGO2dCQUN6Rix1QkFBdUI7Z0JBQ3ZCLElBQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUV0RCxZQUFZLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7b0JBQ3hDLElBQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsZUFBYSxDQUFDLENBQUM7b0JBQzVGLEtBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsWUFBWSxDQUNiLFVBQVUsRUFDVixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxZQUFZLEVBQUUsZUFBYSxDQUFDLEVBQ3JGLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsZUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDNUY7WUFFRCxzQ0FBc0M7WUFDdEMsSUFBSSxVQUFVLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO2dCQUN2QyxJQUFNLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQzthQUM5RTtZQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELGdDQUFhLEdBQWIsVUFBYyxPQUFzQixFQUFFLFVBQXlCO1lBQzdELElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFNLFVBQVUsR0FBRyxJQUFJLHNCQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pELElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNuQyxJQUFNLGFBQWEsR0FBRyxJQUFJLDBCQUFhLENBQ25DLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUssQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEVBQUUseUJBQWEsQ0FBQyxDQUFDO1lBRW5GLFVBQVUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTtnQkFDbkMsSUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDcEQsUUFBUSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBQSxXQUFXO29CQUN0QyxJQUFNLElBQUksR0FBRywwQkFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQzVELElBQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUMxRSxJQUFNLFlBQVksR0FBRyxnQkFBYyxXQUFXLENBQUMsSUFBSSxVQUFLLE9BQU8sUUFBSyxDQUFDO29CQUNyRSxVQUFVLENBQUMsV0FBVyxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3ZELENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsNEJBQTRCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBRTNFLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBR3pFLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUVEOzs7Ozs7V0FNRztRQUNPLCtDQUE0QixHQUF0QyxVQUNJLFVBQXVCLEVBQUUsbUJBQThDLEVBQ3ZFLGFBQTRCO1lBRmhDLGlCQTBDQztZQXZDQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO2dCQUM5QixJQUFNLFlBQVksR0FBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQTRCLENBQUMsSUFBTSxDQUFDLElBQUksQ0FBQztnQkFDN0UsSUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQ2xFLElBQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDakUsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTO29CQUN0QyxDQUFDLGVBQWUsS0FBSyxZQUFZLENBQUMsQ0FBQzt3QkFDOUIsY0FBYyxDQUFDLE9BQUsseUJBQVEsQ0FBQyx3QkFBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFlBQVksQ0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDekUsSUFBSSxDQUFDLENBQUM7Z0JBQ2YsSUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBRTFFLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3pCLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQ3JGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNoQyxJQUFJLENBQUM7b0JBQ1QsSUFBSSxLQUFJLENBQUMsNkJBQTZCLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ2hELHdGQUF3Rjt3QkFDeEYsb0JBQW9CO3dCQUNwQixVQUFVLENBQUMsU0FBUyxDQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFDaEUseUJBQXVCLFFBQVEsTUFBRyxDQUFDLENBQUM7cUJBQ3pDO3lCQUFNO3dCQUNMLG1GQUFtRjt3QkFDbkYsa0NBQWtDO3dCQUNsQyxJQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMzRCxVQUFVLENBQUMsU0FBUyxDQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFDaEUsTUFBSSxrQkFBa0Isb0JBQWUsUUFBUSxNQUFHLENBQUMsQ0FBQztxQkFDdkQ7aUJBQ0Y7cUJBQU07b0JBQ0wscURBQXFEO29CQUNyRCxJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNsRCxJQUFNLFdBQVcsR0FBRyxTQUFTLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO3dCQUM5RSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzt3QkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDOUIsVUFBVSxDQUFDLFVBQVUsQ0FDakIsV0FBVyxFQUNYLE9BQUssZUFBZSxDQUFDLGFBQWEsRUFBRSxlQUFlLEVBQUUscUJBQXFCLENBQUMsU0FBSSxRQUFRLE1BQUcsQ0FBQyxDQUFDO2lCQUNqRztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQWdCRDs7Ozs7O1dBTUc7UUFDTyw0Q0FBeUIsR0FBbkMsVUFBb0MsT0FBd0I7WUFDMUQsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLDZCQUFxQixFQUFFLENBQUM7WUFDdkQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7Z0JBQ25CLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRztvQkFDMUIsSUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFRLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUU7d0JBQzNDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDcEQ7eUJBQU07d0JBQ0wsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ3pEO2dCQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDSCxPQUFPLGtCQUFrQixDQUFDO1FBQzVCLENBQUM7UUFFRDs7V0FFRztRQUNPLG1DQUFnQixHQUExQixVQUEyQixJQUFtQjtZQUM1QyxJQUFNLE1BQU0sR0FBRyxpQ0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBTSxRQUFRLEdBQUcsd0NBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVyRCxJQUFJLE1BQU0sRUFBRTtnQkFDVixJQUFNLGVBQWUsR0FBRywrQkFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUMsT0FBTztvQkFDTCxNQUFNLEVBQUUsbUNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7b0JBQ3hELEdBQUcsRUFBRSxlQUFlO29CQUNwQixRQUFRLEVBQUUsSUFBSTtpQkFDZixDQUFDO2FBQ0g7aUJBQU0sSUFBSSxRQUFRLEVBQUU7Z0JBQ25CLElBQUksaUJBQWlCLEdBQTRCLElBQUksQ0FBQztnQkFDdEQsSUFBSTtvQkFDRixpQkFBaUIsR0FBRyxzQ0FBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHdCQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7aUJBQzFFO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7d0JBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQ1Isa0VBQStELENBQUMsQ0FBQyxJQUFJLHlDQUFxQyxDQUFDLENBQUM7d0JBQ2hILElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO3dCQUN2QyxJQUFJLHlCQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLHlCQUFRLENBQUMsT0FBTyxDQUFDLElBQUksYUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFOzRCQUN4RSxPQUFPLENBQUMsSUFBSSxDQUNSLDZEQUEwRCx5QkFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFHLENBQUMsQ0FBQzs0QkFDcEYsSUFBSTtnQ0FDRixpQkFBaUIsR0FBRywrQkFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQVksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUMzRTs0QkFBQyxPQUFPLENBQUMsRUFBRTtnQ0FDVixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzZCQUNsQjt5QkFDRjtxQkFDRjtpQkFDRjtnQkFDRCxPQUFPO29CQUNMLE1BQU0sRUFBRSwwQ0FBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7b0JBQy9ELEdBQUcsRUFBRSxpQkFBaUI7b0JBQ3RCLFFBQVEsRUFBRSxLQUFLO2lCQUNoQixDQUFDO2FBQ0g7aUJBQU07Z0JBQ0wsT0FBTyxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBQyxDQUFDO2FBQ3hEO1FBQ0gsQ0FBQztRQUVEOzs7V0FHRztRQUNPLHFDQUFrQixHQUE1QixVQUNJLFVBQXlCLEVBQUUsS0FBb0IsRUFBRSxNQUFtQjtZQUN0RSxJQUFNLFVBQVUsR0FBRyx3QkFBTyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUseUJBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzVGLElBQU0sYUFBYSxHQUFNLFVBQVUsU0FBTSxDQUFDO1lBQzFDLElBQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUM7Z0JBQ25DLE1BQU0sRUFBRSxVQUFVLENBQUMsUUFBUTtnQkFDM0IsY0FBYyxFQUFFLElBQUk7YUFHckIsQ0FBQyxDQUFDO1lBRUgsb0ZBQW9GO1lBQ3BGLFNBQVMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBRTVCLElBQU0sU0FBUyxHQUNYLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXpGLElBQU0sTUFBTSxHQUFlLEVBQUUsQ0FBQztZQUM5QixJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQUssU0FBUyxDQUFDLFNBQVMsRUFBSSxFQUFDLENBQUMsQ0FBQzthQUM3RjtpQkFBTTtnQkFDTCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNWLElBQUksRUFBRSxVQUFVO29CQUNoQixRQUFRLEVBQUssTUFBTSxDQUFDLFFBQVEsRUFBRSxVQUFLLDJDQUFzQixDQUFDLGFBQWEsQ0FBRztpQkFDM0UsQ0FBQyxDQUFDO2dCQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUMsQ0FBQyxDQUFDO2FBQ2xFO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVTLDBDQUF1QixHQUFqQyxVQUNJLGtCQUFzQyxFQUN0QywyQkFBd0QsRUFDeEQsMkJBQ0k7WUFKUixpQkErQ0M7WUExQ0MsSUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWdDLENBQUM7WUFFdkQsMERBQTBEO1lBQzFELGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxVQUFBLFlBQVk7Z0JBQ3JDLFlBQVksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLFVBQUEsYUFBYTtvQkFDaEQsSUFBTSxjQUFjLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQzlFLElBQUksY0FBYyxFQUFFO3dCQUNsQixJQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQy9DLElBQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDOUQsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBQyxjQUFjLGdCQUFBLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDO3dCQUNwRixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztxQkFDakM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUVILHVFQUF1RTtZQUN2RSxJQUFJLDJCQUEyQixLQUFLLElBQUksRUFBRTtnQkFDeEMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLFVBQUMsd0JBQXdCLEVBQUUsT0FBTztvQkFDcEUsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUM5RCxVQUFVLENBQUMsbUJBQW1CLEdBQUcsd0JBQXdCLENBQUM7b0JBQzFELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDLENBQUMsQ0FBQzthQUNKO1lBRUQsK0RBQStEO1lBQy9ELElBQUksMkJBQTJCLENBQUMsTUFBTSxFQUFFO2dCQUN0QywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsVUFBQSxDQUFDO29CQUNuQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUU7d0JBQzFCLE1BQU0sSUFBSSxLQUFLLENBQ1gsa0NBQWdDLENBQUMsQ0FBQyxVQUFVLFlBQU8sQ0FBQyxDQUFDLElBQUksUUFBSzs0QkFDOUQsMEVBQTBFOzRCQUMxRSxrR0FBa0c7NEJBQ2xHLG9HQUFvRyxDQUFDLENBQUM7cUJBQzNHO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBSyxDQUFDLElBQUksQ0FBQztnQkFDN0MsSUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNwRSxVQUFVLENBQUMsY0FBYyxHQUFHLDJCQUEyQixDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRDs7OztXQUlHO1FBQ0ssZ0RBQTZCLEdBQXJDLFVBQXNDLFFBQTRCO1lBQ2hFLElBQU0sRUFBRSxHQUNKLFFBQVEsSUFBSSxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDN0YsT0FBTyxDQUNILEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLHFCQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVPLG9DQUFpQixHQUF6QixVQUEwQixhQUFpQyxFQUFFLE1BQWU7WUFDMUUsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sRUFBRTtnQkFDekIsT0FBTyxJQUFJLDZDQUFzQixFQUFFLENBQUM7YUFDckM7aUJBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUN0QixPQUFPLElBQUksaUNBQXVCLENBQUMsYUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlEO2lCQUFNO2dCQUNMLE9BQU8sSUFBSSw0QkFBa0IsRUFBRSxDQUFDO2FBQ2pDO1FBQ0gsQ0FBQztRQUNILGVBQUM7SUFBRCxDQUFDLEFBN1ZELElBNlZDO0lBN1ZxQiw0QkFBUTtJQStWOUI7Ozs7Ozs7Ozs7Ozs7O09BY0c7SUFDSCxTQUFnQixlQUFlLENBQzNCLE1BQTJCLEVBQUUsTUFBb0I7UUFDbkQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNYLE9BQU8sK0JBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUMzQjtRQUNELElBQU0sY0FBYyxHQUFHLElBQUksOEJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckQsSUFBTSxjQUFjLEdBQUcsSUFBSSw4QkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRCxJQUFNLGtCQUFrQixHQUFHLCtCQUFrQixDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM1RSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEQsSUFBTSxNQUFNLEdBQUcsNkJBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFYRCwwQ0FXQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLFVBQXlCLEVBQUUsWUFBMEIsRUFBRSxPQUFzQjtRQUMvRSxJQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkMsT0FBTyxZQUFZLENBQUMsVUFBVTthQUN6QixHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSwrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLHNDQUE0QixDQUFDLEVBQS9ELENBQStELENBQUM7YUFDNUUsR0FBRyxDQUFDLFVBQUEsSUFBSSxJQUFJLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQTVELENBQTRELENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFQRCxnREFPQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxTQUFnQixpQkFBaUIsQ0FDN0IsVUFBeUIsRUFBRSxhQUE0QixFQUFFLE9BQXNCO1FBQ2pGLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLElBQUksR0FBSSxhQUFhLENBQUMsV0FBbUMsQ0FBQyxJQUFNLENBQUM7UUFDdkUsSUFBTSxTQUFTLEdBQUcsVUFBQyxJQUFlO1lBQzlCLE9BQUEsK0JBQWtCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxzQ0FBNEIsQ0FBQztRQUEvRCxDQUErRCxDQUFDO1FBQ3BFLElBQU0sV0FBVyxHQUNiLGFBQWEsQ0FBQyxXQUFXO2FBQ3BCLEdBQUcsQ0FDQSxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQUEsU0FBUyxJQUFJLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFwQixDQUFvQixDQUFDO2FBQzlDLE1BQU0sQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDekUsR0FBRyxDQUNBLFVBQUEsU0FBUztZQUNMLE9BQUEsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO1FBQWpFLENBQWlFLENBQUM7YUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUxmLENBS2UsQ0FBQzthQUN4QixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxXQUFXLENBQUM7SUFDckIsQ0FBQztJQWpCRCw4Q0FpQkM7SUFFRCxTQUFnQixjQUFjLENBQUMsUUFBZ0I7UUFDN0MsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRkQsd0NBRUM7SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyx5QkFBeUIsQ0FDOUIsWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzdFLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FDcEIsYUFBNEIsRUFBRSxVQUF5QixFQUFFLFVBQWtCO1FBQzdFLElBQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQy9GLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBSSxRQUFRLENBQUMsWUFBWSxTQUFJLFFBQVEsQ0FBQyxNQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUcsVUFBWSxDQUFDO0lBQ3BGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlUHJvcEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7U291cmNlTWFwQ29udmVydGVyLCBjb21tZW50UmVnZXgsIGZyb21KU09OLCBmcm9tTWFwRmlsZVNvdXJjZSwgZnJvbU9iamVjdCwgZnJvbVNvdXJjZSwgZ2VuZXJhdGVNYXBGaWxlQ29tbWVudCwgbWFwRmlsZUNvbW1lbnRSZWdleCwgcmVtb3ZlQ29tbWVudHMsIHJlbW92ZU1hcEZpbGVDb21tZW50c30gZnJvbSAnY29udmVydC1zb3VyY2UtbWFwJztcbmltcG9ydCB7cmVhZEZpbGVTeW5jLCBzdGF0U3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQge2Jhc2VuYW1lLCBkaXJuYW1lLCByZWxhdGl2ZSwgcmVzb2x2ZX0gZnJvbSAnY2Fub25pY2FsLXBhdGgnO1xuaW1wb3J0IHtTb3VyY2VNYXBDb25zdW1lciwgU291cmNlTWFwR2VuZXJhdG9yLCBSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Tm9vcEltcG9ydFJld3JpdGVyLCBJbXBvcnRSZXdyaXRlciwgUjNTeW1ib2xzSW1wb3J0UmV3cml0ZXIsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge0NvbXBpbGVSZXN1bHR9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7dHJhbnNsYXRlU3RhdGVtZW50LCB0cmFuc2xhdGVUeXBlLCBJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7TmdjY0ZsYXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi9uZ2NjX2ltcG9ydF9yZXdyaXRlcic7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0luZm8sIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXNpc30gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdCwgU3dpdGNoYWJsZVZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcblxuaW50ZXJmYWNlIFNvdXJjZU1hcEluZm8ge1xuICBzb3VyY2U6IHN0cmluZztcbiAgbWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbDtcbiAgaXNJbmxpbmU6IGJvb2xlYW47XG59XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlIHRoYXQgaGFzIGJlZW4gcmVuZGVyZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUluZm8ge1xuICAvKipcbiAgICogUGF0aCB0byB3aGVyZSB0aGUgZmlsZSBzaG91bGQgYmUgd3JpdHRlbi5cbiAgICovXG4gIHBhdGg6IHN0cmluZztcbiAgLyoqXG4gICAqIFRoZSBjb250ZW50cyBvZiB0aGUgZmlsZSB0byBiZSBiZSB3cml0dGVuLlxuICAgKi9cbiAgY29udGVudHM6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIER0c0NsYXNzSW5mbyB7XG4gIGR0c0RlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbjtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuLyoqXG4gKiBBIHN0cnVjdHVyZSB0aGF0IGNhcHR1cmVzIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgbmVlZHMgdG8gYmUgcmVuZGVyZWRcbiAqIGluIGEgdHlwaW5ncyBmaWxlLlxuICpcbiAqIEl0IGlzIGNyZWF0ZWQgYXMgYSByZXN1bHQgb2YgcHJvY2Vzc2luZyB0aGUgYW5hbHlzaXMgcGFzc2VkIHRvIHRoZSByZW5kZXJlci5cbiAqXG4gKiBUaGUgYHJlbmRlckR0c0ZpbGUoKWAgbWV0aG9kIGNvbnN1bWVzIGl0IHdoZW4gcmVuZGVyaW5nIGEgdHlwaW5ncyBmaWxlLlxuICovXG5jbGFzcyBEdHNSZW5kZXJJbmZvIHtcbiAgY2xhc3NJbmZvOiBEdHNDbGFzc0luZm9bXSA9IFtdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdID0gW107XG4gIHByaXZhdGVFeHBvcnRzOiBFeHBvcnRJbmZvW10gPSBbXTtcbn1cblxuLyoqXG4gKiBUaGUgY29sbGVjdGVkIGRlY29yYXRvcnMgdGhhdCBoYXZlIGJlY29tZSByZWR1bmRhbnQgYWZ0ZXIgdGhlIGNvbXBpbGF0aW9uXG4gKiBvZiBJdnkgc3RhdGljIGZpZWxkcy4gVGhlIG1hcCBpcyBrZXllZCBieSB0aGUgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZVxuICogY2FuIHRlbGwgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eVxuICovXG5leHBvcnQgdHlwZSBSZWR1bmRhbnREZWNvcmF0b3JNYXAgPSBNYXA8dHMuTm9kZSwgdHMuTm9kZVtdPjtcbmV4cG9ydCBjb25zdCBSZWR1bmRhbnREZWNvcmF0b3JNYXAgPSBNYXA7XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcm90ZWN0ZWQgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlLCBwcm90ZWN0ZWQgc291cmNlUGF0aDogc3RyaW5nLFxuICAgICAgcHJvdGVjdGVkIHRhcmdldFBhdGg6IHN0cmluZykge31cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbCk6IEZpbGVJbmZvW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVJbmZvW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzLlxuICAgIHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkubWFwKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgY29uc3QgY29tcGlsZWRGaWxlID0gZGVjb3JhdGlvbkFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5c2lzID0gc3dpdGNoTWFya2VyQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuXG4gICAgICBpZiAoY29tcGlsZWRGaWxlIHx8IHN3aXRjaE1hcmtlckFuYWx5c2lzIHx8IHNvdXJjZUZpbGUgPT09IHRoaXMuYnVuZGxlLnNyYy5maWxlKSB7XG4gICAgICAgIHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckZpbGUoXG4gICAgICAgICAgICBzb3VyY2VGaWxlLCBjb21waWxlZEZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgLmQudHMgZmlsZXNcbiAgICBpZiAodGhpcy5idW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGaWxlcyA9IHRoaXMuZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG5cbiAgICAgIC8vIElmIHRoZSBkdHMgZW50cnktcG9pbnQgaXMgbm90IGFscmVhZHkgdGhlcmUgKGl0IGRpZCBub3QgaGF2ZSBjb21waWxlZCBjbGFzc2VzKVxuICAgICAgLy8gdGhlbiBhZGQgaXQgbm93LCB0byBlbnN1cmUgaXQgZ2V0cyBpdHMgZXh0cmEgZXhwb3J0cyByZW5kZXJlZC5cbiAgICAgIGlmICghZHRzRmlsZXMuaGFzKHRoaXMuYnVuZGxlLmR0cy5maWxlKSkge1xuICAgICAgICBkdHNGaWxlcy5zZXQodGhpcy5idW5kbGUuZHRzLmZpbGUsIG5ldyBEdHNSZW5kZXJJbmZvKCkpO1xuICAgICAgfVxuICAgICAgZHRzRmlsZXMuZm9yRWFjaChcbiAgICAgICAgICAocmVuZGVySW5mbywgZmlsZSkgPT4gcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRHRzRmlsZShmaWxlLCByZW5kZXJJbmZvKSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIGNvZGUgYW5kIHNvdXJjZS1tYXAgZm9yIGFuIEFuYWx5emVkIGZpbGUuXG4gICAqIEBwYXJhbSBjb21waWxlZEZpbGUgVGhlIGFuYWx5emVkIGZpbGUgdG8gcmVuZGVyLlxuICAgKiBAcGFyYW0gdGFyZ2V0UGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB3aGVyZSB0aGUgcmVuZGVyZWQgZmlsZSB3aWxsIGJlIHdyaXR0ZW4uXG4gICAqL1xuICByZW5kZXJGaWxlKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRGaWxlOiBDb21waWxlZEZpbGV8dW5kZWZpbmVkLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzaXM6IFN3aXRjaE1hcmtlckFuYWx5c2lzfHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoc291cmNlRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuXG4gICAgaWYgKHN3aXRjaE1hcmtlckFuYWx5c2lzKSB7XG4gICAgICB0aGlzLnJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgICAgIG91dHB1dFRleHQsIHN3aXRjaE1hcmtlckFuYWx5c2lzLnNvdXJjZUZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLmRlY2xhcmF0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSkge1xuICAgICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKFxuICAgICAgICAgIHRoaXMuZ2V0SW1wb3J0UmV3cml0ZXIodGhpcy5idW5kbGUuc3JjLnIzU3ltYm9sc0ZpbGUsIHRoaXMuYnVuZGxlLmlzRmxhdCksIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc3RydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnMgKHdlIG5lZWQgaW5mbyBmcm9tIHRoZVxuICAgICAgLy8gaGFuZGxlcnMgdG8gZG8gdGhpcylcbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IHRoaXMuY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzKTtcbiAgICAgIHRoaXMucmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXRUZXh0LCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuXG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY2xhenosIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICB0aGlzLmFkZERlZmluaXRpb25zKG91dHB1dFRleHQsIGNsYXp6LCByZW5kZXJlZERlZmluaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuYWRkQ29uc3RhbnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsXG4gICAgICAgICAgcmVuZGVyQ29uc3RhbnRQb29sKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUuY29uc3RhbnRQb29sLCBpbXBvcnRNYW5hZ2VyKSxcbiAgICAgICAgICBjb21waWxlZEZpbGUuc291cmNlRmlsZSk7XG5cbiAgICAgIHRoaXMuYWRkSW1wb3J0cyhvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZXhwb3J0cyB0byB0aGUgZW50cnktcG9pbnQgZmlsZVxuICAgIGlmIChzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgY29uc3QgZW50cnlQb2ludEJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24odGhpcy5idW5kbGUuc3JjLnBhdGgpO1xuICAgICAgdGhpcy5hZGRFeHBvcnRzKG91dHB1dFRleHQsIGVudHJ5UG9pbnRCYXNlUGF0aCwgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTb3VyY2VBbmRNYXAoc291cmNlRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICB9XG5cbiAgcmVuZGVyRHRzRmlsZShkdHNGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZW5kZXJJbmZvOiBEdHNSZW5kZXJJbmZvKTogRmlsZUluZm9bXSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmV4dHJhY3RTb3VyY2VNYXAoZHRzRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKFxuICAgICAgICB0aGlzLmdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLmR0cyAhLnIzU3ltYm9sc0ZpbGUsIGZhbHNlKSwgSU1QT1JUX1BSRUZJWCk7XG5cbiAgICByZW5kZXJJbmZvLmNsYXNzSW5mby5mb3JFYWNoKGR0c0NsYXNzID0+IHtcbiAgICAgIGNvbnN0IGVuZE9mQ2xhc3MgPSBkdHNDbGFzcy5kdHNEZWNsYXJhdGlvbi5nZXRFbmQoKTtcbiAgICAgIGR0c0NsYXNzLmNvbXBpbGF0aW9uLmZvckVhY2goZGVjbGFyYXRpb24gPT4ge1xuICAgICAgICBjb25zdCB0eXBlID0gdHJhbnNsYXRlVHlwZShkZWNsYXJhdGlvbi50eXBlLCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgY29uc3QgdHlwZVN0ciA9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0eXBlLCBkdHNGaWxlKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGVtZW50ID0gYCAgICBzdGF0aWMgJHtkZWNsYXJhdGlvbi5uYW1lfTogJHt0eXBlU3RyfTtcXG5gO1xuICAgICAgICBvdXRwdXRUZXh0LmFwcGVuZFJpZ2h0KGVuZE9mQ2xhc3MgLSAxLCBuZXdTdGF0ZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZE1vZHVsZVdpdGhQcm92aWRlcnNQYXJhbXMob3V0cHV0VGV4dCwgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzLCBpbXBvcnRNYW5hZ2VyKTtcbiAgICB0aGlzLmFkZEltcG9ydHMob3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGR0c0ZpbGUuZmlsZU5hbWUpKTtcblxuICAgIHRoaXMuYWRkRXhwb3J0cyhvdXRwdXRUZXh0LCBkdHNGaWxlLmZpbGVOYW1lLCByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzKTtcblxuXG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU291cmNlQW5kTWFwKGR0c0ZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgdGhlIHR5cGUgcGFyYW1ldGVycyB0byB0aGUgYXBwcm9wcmlhdGUgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIGBNb2R1bGVXaXRoUHJvdmlkZXJzYFxuICAgKiBzdHJ1Y3R1cmVzLlxuICAgKlxuICAgKiBUaGlzIGZ1bmN0aW9uIG9ubHkgZ2V0cyBjYWxsZWQgb24gdHlwaW5ncyBmaWxlcywgc28gaXQgZG9lc24ndCBuZWVkIGRpZmZlcmVudCBpbXBsZW1lbnRhdGlvbnNcbiAgICogZm9yIGVhY2ggYnVuZGxlIGZvcm1hdC5cbiAgICovXG4gIHByb3RlY3RlZCBhZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIG1vZHVsZVdpdGhQcm92aWRlcnM6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10sXG4gICAgICBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyKTogdm9pZCB7XG4gICAgbW9kdWxlV2l0aFByb3ZpZGVycy5mb3JFYWNoKGluZm8gPT4ge1xuICAgICAgY29uc3QgbmdNb2R1bGVOYW1lID0gKGluZm8ubmdNb2R1bGUubm9kZSBhcyB0cy5DbGFzc0RlY2xhcmF0aW9uKS5uYW1lICEudGV4dDtcbiAgICAgIGNvbnN0IGRlY2xhcmF0aW9uRmlsZSA9IGluZm8uZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lO1xuICAgICAgY29uc3QgbmdNb2R1bGVGaWxlID0gaW5mby5uZ01vZHVsZS5ub2RlLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZTtcbiAgICAgIGNvbnN0IGltcG9ydFBhdGggPSBpbmZvLm5nTW9kdWxlLnZpYU1vZHVsZSB8fFxuICAgICAgICAgIChkZWNsYXJhdGlvbkZpbGUgIT09IG5nTW9kdWxlRmlsZSA/XG4gICAgICAgICAgICAgICBzdHJpcEV4dGVuc2lvbihgLi8ke3JlbGF0aXZlKGRpcm5hbWUoZGVjbGFyYXRpb25GaWxlKSwgbmdNb2R1bGVGaWxlKX1gKSA6XG4gICAgICAgICAgICAgICBudWxsKTtcbiAgICAgIGNvbnN0IG5nTW9kdWxlID0gZ2V0SW1wb3J0U3RyaW5nKGltcG9ydE1hbmFnZXIsIGltcG9ydFBhdGgsIG5nTW9kdWxlTmFtZSk7XG5cbiAgICAgIGlmIChpbmZvLmRlY2xhcmF0aW9uLnR5cGUpIHtcbiAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBpbmZvLmRlY2xhcmF0aW9uLnR5cGUgJiYgdHMuaXNUeXBlUmVmZXJlbmNlTm9kZShpbmZvLmRlY2xhcmF0aW9uLnR5cGUpID9cbiAgICAgICAgICAgIGluZm8uZGVjbGFyYXRpb24udHlwZS50eXBlTmFtZSA6XG4gICAgICAgICAgICBudWxsO1xuICAgICAgICBpZiAodGhpcy5pc0NvcmVNb2R1bGVXaXRoUHJvdmlkZXJzVHlwZSh0eXBlTmFtZSkpIHtcbiAgICAgICAgICAvLyBUaGUgZGVjbGFyYXRpb24gYWxyZWFkeSByZXR1cm5zIGBNb2R1bGVXaXRoUHJvdmlkZXJgIGJ1dCBpdCBuZWVkcyB0aGUgYE5nTW9kdWxlYCB0eXBlXG4gICAgICAgICAgLy8gcGFyYW1ldGVyIGFkZGluZy5cbiAgICAgICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShcbiAgICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFN0YXJ0KCksIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgYE1vZHVsZVdpdGhQcm92aWRlcnM8JHtuZ01vZHVsZX0+YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIHJldHVybnMgYW4gdW5rbm93biB0eXBlIHNvIHdlIG5lZWQgdG8gY29udmVydCBpdCB0byBhIHVuaW9uIHRoYXRcbiAgICAgICAgICAvLyBpbmNsdWRlcyB0aGUgbmdNb2R1bGUgcHJvcGVydHkuXG4gICAgICAgICAgY29uc3Qgb3JpZ2luYWxUeXBlU3RyaW5nID0gaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFRleHQoKTtcbiAgICAgICAgICBvdXRwdXRUZXh0Lm92ZXJ3cml0ZShcbiAgICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi50eXBlLmdldFN0YXJ0KCksIGluZm8uZGVjbGFyYXRpb24udHlwZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgYCgke29yaWdpbmFsVHlwZVN0cmluZ30pJntuZ01vZHVsZToke25nTW9kdWxlfX1gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVGhlIGRlY2xhcmF0aW9uIGhhcyBubyByZXR1cm4gdHlwZSBzbyBwcm92aWRlIG9uZS5cbiAgICAgICAgY29uc3QgbGFzdFRva2VuID0gaW5mby5kZWNsYXJhdGlvbi5nZXRMYXN0VG9rZW4oKTtcbiAgICAgICAgY29uc3QgaW5zZXJ0UG9pbnQgPSBsYXN0VG9rZW4gJiYgbGFzdFRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuU2VtaWNvbG9uVG9rZW4gP1xuICAgICAgICAgICAgbGFzdFRva2VuLmdldFN0YXJ0KCkgOlxuICAgICAgICAgICAgaW5mby5kZWNsYXJhdGlvbi5nZXRFbmQoKTtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRMZWZ0KFxuICAgICAgICAgICAgaW5zZXJ0UG9pbnQsXG4gICAgICAgICAgICBgOiAke2dldEltcG9ydFN0cmluZyhpbXBvcnRNYW5hZ2VyLCAnQGFuZ3VsYXIvY29yZScsICdNb2R1bGVXaXRoUHJvdmlkZXJzJyl9PCR7bmdNb2R1bGV9PmApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGFkZENvbnN0YW50cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBjb25zdGFudHM6IHN0cmluZywgZmlsZTogdHMuU291cmNlRmlsZSk6XG4gICAgICB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgYWRkSW1wb3J0cyhvdXRwdXQ6IE1hZ2ljU3RyaW5nLCBpbXBvcnRzOiB7c3BlY2lmaWVyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWFsaWZpZXI6IHN0cmluZ31bXSk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGRFeHBvcnRzKFxuICAgICAgb3V0cHV0OiBNYWdpY1N0cmluZywgZW50cnlQb2ludEJhc2VQYXRoOiBzdHJpbmcsIGV4cG9ydHM6IEV4cG9ydEluZm9bXSk6IHZvaWQ7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBhZGREZWZpbml0aW9ucyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGRlZmluaXRpb25zOiBzdHJpbmcpOiB2b2lkO1xuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmVtb3ZlRGVjb3JhdG9ycyhcbiAgICAgIG91dHB1dDogTWFnaWNTdHJpbmcsIGRlY29yYXRvcnNUb1JlbW92ZTogUmVkdW5kYW50RGVjb3JhdG9yTWFwKTogdm9pZDtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgb3V0cHV0VGV4dDogTWFnaWNTdHJpbmcsIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsXG4gICAgICBkZWNsYXJhdGlvbnM6IFN3aXRjaGFibGVWYXJpYWJsZURlY2xhcmF0aW9uW10pOiB2b2lkO1xuXG4gIC8qKlxuICAgKiBGcm9tIHRoZSBnaXZlbiBsaXN0IG9mIGNsYXNzZXMsIGNvbXB1dGVzIGEgbWFwIG9mIGRlY29yYXRvcnMgdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICogVGhlIGRlY29yYXRvcnMgdG8gcmVtb3ZlIGFyZSBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZSwgc3VjaCB0aGF0IHdlIGNhbiB0ZWxsIGlmXG4gICAqIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHkuXG4gICAqIEBwYXJhbSBjbGFzc2VzIFRoZSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBtYXkgaGF2ZSBkZWNvcmF0b3JzIHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgQSBtYXAgb2YgZGVjb3JhdG9ycyB0byByZW1vdmUsIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY2xhc3NlczogQ29tcGlsZWRDbGFzc1tdKTogUmVkdW5kYW50RGVjb3JhdG9yTWFwIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgUmVkdW5kYW50RGVjb3JhdG9yTWFwKCk7XG4gICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgIGNsYXp6LmRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCAhO1xuICAgICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkgIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnNUb1JlbW92ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIG1hcCBmcm9tIHRoZSBzb3VyY2UgKG5vdGUgd2hldGhlciBpdCBpcyBpbmxpbmUgb3IgZXh0ZXJuYWwpXG4gICAqL1xuICBwcm90ZWN0ZWQgZXh0cmFjdFNvdXJjZU1hcChmaWxlOiB0cy5Tb3VyY2VGaWxlKTogU291cmNlTWFwSW5mbyB7XG4gICAgY29uc3QgaW5saW5lID0gY29tbWVudFJlZ2V4LnRlc3QoZmlsZS50ZXh0KTtcbiAgICBjb25zdCBleHRlcm5hbCA9IG1hcEZpbGVDb21tZW50UmVnZXgudGVzdChmaWxlLnRleHQpO1xuXG4gICAgaWYgKGlubGluZSkge1xuICAgICAgY29uc3QgaW5saW5lU291cmNlTWFwID0gZnJvbVNvdXJjZShmaWxlLnRleHQpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlOiByZW1vdmVDb21tZW50cyhmaWxlLnRleHQpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyksXG4gICAgICAgIG1hcDogaW5saW5lU291cmNlTWFwLFxuICAgICAgICBpc0lubGluZTogdHJ1ZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHRlcm5hbCkge1xuICAgICAgbGV0IGV4dGVybmFsU291cmNlTWFwOiBTb3VyY2VNYXBDb252ZXJ0ZXJ8bnVsbCA9IG51bGw7XG4gICAgICB0cnkge1xuICAgICAgICBleHRlcm5hbFNvdXJjZU1hcCA9IGZyb21NYXBGaWxlU291cmNlKGZpbGUudGV4dCwgZGlybmFtZShmaWxlLmZpbGVOYW1lKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChlLmNvZGUgPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICBgVGhlIGV4dGVybmFsIG1hcCBmaWxlIHNwZWNpZmllZCBpbiB0aGUgc291cmNlIGNvZGUgY29tbWVudCBcIiR7ZS5wYXRofVwiIHdhcyBub3QgZm91bmQgb24gdGhlIGZpbGUgc3lzdGVtLmApO1xuICAgICAgICAgIGNvbnN0IG1hcFBhdGggPSBmaWxlLmZpbGVOYW1lICsgJy5tYXAnO1xuICAgICAgICAgIGlmIChiYXNlbmFtZShlLnBhdGgpICE9PSBiYXNlbmFtZShtYXBQYXRoKSAmJiBzdGF0U3luYyhtYXBQYXRoKS5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgIGBHdWVzc2luZyB0aGUgbWFwIGZpbGUgbmFtZSBmcm9tIHRoZSBzb3VyY2UgZmlsZSBuYW1lOiBcIiR7YmFzZW5hbWUobWFwUGF0aCl9XCJgKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGV4dGVybmFsU291cmNlTWFwID0gZnJvbU9iamVjdChKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYXBQYXRoLCAndXRmOCcpKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzb3VyY2U6IHJlbW92ZU1hcEZpbGVDb21tZW50cyhmaWxlLnRleHQpLnJlcGxhY2UoL1xcblxcbiQvLCAnXFxuJyksXG4gICAgICAgIG1hcDogZXh0ZXJuYWxTb3VyY2VNYXAsXG4gICAgICAgIGlzSW5saW5lOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7c291cmNlOiBmaWxlLnRleHQsIG1hcDogbnVsbCwgaXNJbmxpbmU6IGZhbHNlfTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWVyZ2UgdGhlIGlucHV0IGFuZCBvdXRwdXQgc291cmNlLW1hcHMsIHJlcGxhY2luZyB0aGUgc291cmNlLW1hcCBjb21tZW50IGluIHRoZSBvdXRwdXQgZmlsZVxuICAgKiB3aXRoIGFuIGFwcHJvcHJpYXRlIHNvdXJjZS1tYXAgY29tbWVudCBwb2ludGluZyB0byB0aGUgbWVyZ2VkIHNvdXJjZS1tYXAuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVuZGVyU291cmNlQW5kTWFwKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgaW5wdXQ6IFNvdXJjZU1hcEluZm8sIG91dHB1dDogTWFnaWNTdHJpbmcpOiBGaWxlSW5mb1tdIHtcbiAgICBjb25zdCBvdXRwdXRQYXRoID0gcmVzb2x2ZSh0aGlzLnRhcmdldFBhdGgsIHJlbGF0aXZlKHRoaXMuc291cmNlUGF0aCwgc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgIGNvbnN0IG91dHB1dE1hcFBhdGggPSBgJHtvdXRwdXRQYXRofS5tYXBgO1xuICAgIGNvbnN0IG91dHB1dE1hcCA9IG91dHB1dC5nZW5lcmF0ZU1hcCh7XG4gICAgICBzb3VyY2U6IHNvdXJjZUZpbGUuZmlsZU5hbWUsXG4gICAgICBpbmNsdWRlQ29udGVudDogdHJ1ZSxcbiAgICAgIC8vIGhpcmVzOiB0cnVlIC8vIFRPRE86IFRoaXMgcmVzdWx0cyBpbiBhY2N1cmF0ZSBidXQgaHVnZSBzb3VyY2VtYXBzLiBJbnN0ZWFkIHdlIHNob3VsZCBmaXhcbiAgICAgIC8vIHRoZSBtZXJnZSBhbGdvcml0aG0uXG4gICAgfSk7XG5cbiAgICAvLyB3ZSBtdXN0IHNldCB0aGlzIGFmdGVyIGdlbmVyYXRpb24gYXMgbWFnaWMgc3RyaW5nIGRvZXMgXCJtYW5pcHVsYXRpb25cIiBvbiB0aGUgcGF0aFxuICAgIG91dHB1dE1hcC5maWxlID0gb3V0cHV0UGF0aDtcblxuICAgIGNvbnN0IG1lcmdlZE1hcCA9XG4gICAgICAgIG1lcmdlU291cmNlTWFwcyhpbnB1dC5tYXAgJiYgaW5wdXQubWFwLnRvT2JqZWN0KCksIEpTT04ucGFyc2Uob3V0cHV0TWFwLnRvU3RyaW5nKCkpKTtcblxuICAgIGNvbnN0IHJlc3VsdDogRmlsZUluZm9bXSA9IFtdO1xuICAgIGlmIChpbnB1dC5pc0lubGluZSkge1xuICAgICAgcmVzdWx0LnB1c2goe3BhdGg6IG91dHB1dFBhdGgsIGNvbnRlbnRzOiBgJHtvdXRwdXQudG9TdHJpbmcoKX1cXG4ke21lcmdlZE1hcC50b0NvbW1lbnQoKX1gfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgcGF0aDogb3V0cHV0UGF0aCxcbiAgICAgICAgY29udGVudHM6IGAke291dHB1dC50b1N0cmluZygpfVxcbiR7Z2VuZXJhdGVNYXBGaWxlQ29tbWVudChvdXRwdXRNYXBQYXRoKX1gXG4gICAgICB9KTtcbiAgICAgIHJlc3VsdC5wdXNoKHtwYXRoOiBvdXRwdXRNYXBQYXRoLCBjb250ZW50czogbWVyZ2VkTWFwLnRvSlNPTigpfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8XG4gICAgICBudWxsKTogTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+IHtcbiAgICBjb25zdCBkdHNNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+KCk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSByZW5kZXJpbmcgaW5mbyBmcm9tIHRoZSBkZWNvcmF0aW9uIGFuYWx5c2VzXG4gICAgZGVjb3JhdGlvbkFuYWx5c2VzLmZvckVhY2goY29tcGlsZWRGaWxlID0+IHtcbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjb21waWxlZENsYXNzID0+IHtcbiAgICAgICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgICAgIGlmIChkdHNEZWNsYXJhdGlvbikge1xuICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5nZXQoZHRzRmlsZSkgfHwgbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgICByZW5kZXJJbmZvLmNsYXNzSW5mby5wdXNoKHtkdHNEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb259KTtcbiAgICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIENhcHR1cmUgdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgZnVuY3Rpb25zL21ldGhvZHMgdGhhdCBuZWVkIHVwZGF0aW5nXG4gICAgaWYgKG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyAhPT0gbnVsbCkge1xuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLmZvckVhY2goKG1vZHVsZVdpdGhQcm92aWRlcnNUb0ZpeCwgZHRzRmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmdldChkdHNGaWxlKSB8fCBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXg7XG4gICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgcmVuZGVySW5mbyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBwcml2YXRlIGRlY2xhcmF0aW9ucyB0aGF0IG5lZWQgdG8gYmUgcmUtZXhwb3J0ZWRcbiAgICBpZiAocHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmxlbmd0aCkge1xuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIGlmICghZS5kdHNGcm9tICYmICFlLmFsaWFzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVGhlcmUgaXMgbm8gdHlwaW5ncyBwYXRoIGZvciAke2UuaWRlbnRpZmllcn0gaW4gJHtlLmZyb219LlxcbmAgK1xuICAgICAgICAgICAgICBgV2UgbmVlZCB0byBhZGQgYW4gZXhwb3J0IGZvciB0aGlzIGNsYXNzIHRvIGEgLmQudHMgdHlwaW5ncyBmaWxlIGJlY2F1c2UgYCArXG4gICAgICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG5lZWRzIHRvIGJlIGFibGUgdG8gcmVmZXJlbmNlIHRoaXMgY2xhc3MgaW4gY29tcGlsZWQgY29kZSwgc3VjaCBhcyB0ZW1wbGF0ZXMuXFxuYCArXG4gICAgICAgICAgICAgIGBUaGUgc2ltcGxlc3QgZml4IGZvciB0aGlzIGlzIHRvIGVuc3VyZSB0aGF0IHRoaXMgY2xhc3MgaXMgZXhwb3J0ZWQgZnJvbSB0aGUgcGFja2FnZSdzIGVudHJ5LXBvaW50LmApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGR0c0VudHJ5UG9pbnQgPSB0aGlzLmJ1bmRsZS5kdHMgIS5maWxlO1xuICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5nZXQoZHRzRW50cnlQb2ludCkgfHwgbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMgPSBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM7XG4gICAgICBkdHNNYXAuc2V0KGR0c0VudHJ5UG9pbnQsIHJlbmRlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkdHNNYXA7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgZ2l2ZW4gdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqIEBwYXJhbSB0eXBlTmFtZSBUaGUgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMgdHJ1ZSBpZiB0aGUgdHlwZSBpcyB0aGUgY29yZSBBbmd1bGFyIGBNb2R1bGVXaXRoUHJvdmlkZXJzYCBpbnRlcmZhY2UuXG4gICAqL1xuICBwcml2YXRlIGlzQ29yZU1vZHVsZVdpdGhQcm92aWRlcnNUeXBlKHR5cGVOYW1lOiB0cy5FbnRpdHlOYW1lfG51bGwpIHtcbiAgICBjb25zdCBpZCA9XG4gICAgICAgIHR5cGVOYW1lICYmIHRzLmlzSWRlbnRpZmllcih0eXBlTmFtZSkgPyB0aGlzLmhvc3QuZ2V0SW1wb3J0T2ZJZGVudGlmaWVyKHR5cGVOYW1lKSA6IG51bGw7XG4gICAgcmV0dXJuIChcbiAgICAgICAgaWQgJiYgaWQubmFtZSA9PT0gJ01vZHVsZVdpdGhQcm92aWRlcnMnICYmICh0aGlzLmlzQ29yZSB8fCBpZC5mcm9tID09PSAnQGFuZ3VsYXIvY29yZScpKTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0SW1wb3J0UmV3cml0ZXIocjNTeW1ib2xzRmlsZTogdHMuU291cmNlRmlsZXxudWxsLCBpc0ZsYXQ6IGJvb2xlYW4pOiBJbXBvcnRSZXdyaXRlciB7XG4gICAgaWYgKHRoaXMuaXNDb3JlICYmIGlzRmxhdCkge1xuICAgICAgcmV0dXJuIG5ldyBOZ2NjRmxhdEltcG9ydFJld3JpdGVyKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzQ29yZSkge1xuICAgICAgcmV0dXJuIG5ldyBSM1N5bWJvbHNJbXBvcnRSZXdyaXRlcihyM1N5bWJvbHNGaWxlICEuZmlsZU5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIE1lcmdlIHRoZSB0d28gc3BlY2lmaWVkIHNvdXJjZS1tYXBzIGludG8gYSBzaW5nbGUgc291cmNlLW1hcCB0aGF0IGhpZGVzIHRoZSBpbnRlcm1lZGlhdGVcbiAqIHNvdXJjZS1tYXAuXG4gKiBFLmcuIENvbnNpZGVyIHRoZXNlIG1hcHBpbmdzOlxuICpcbiAqIGBgYFxuICogT0xEX1NSQyAtPiBPTERfTUFQIC0+IElOVEVSTUVESUFURV9TUkMgLT4gTkVXX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqXG4gKiB0aGlzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aDpcbiAqXG4gKiBgYGBcbiAqIE9MRF9TUkMgLT4gTUVSR0VEX01BUCAtPiBORVdfU1JDXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlU291cmNlTWFwcyhcbiAgICBvbGRNYXA6IFJhd1NvdXJjZU1hcCB8IG51bGwsIG5ld01hcDogUmF3U291cmNlTWFwKTogU291cmNlTWFwQ29udmVydGVyIHtcbiAgaWYgKCFvbGRNYXApIHtcbiAgICByZXR1cm4gZnJvbU9iamVjdChuZXdNYXApO1xuICB9XG4gIGNvbnN0IG9sZE1hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG9sZE1hcCk7XG4gIGNvbnN0IG5ld01hcENvbnN1bWVyID0gbmV3IFNvdXJjZU1hcENvbnN1bWVyKG5ld01hcCk7XG4gIGNvbnN0IG1lcmdlZE1hcEdlbmVyYXRvciA9IFNvdXJjZU1hcEdlbmVyYXRvci5mcm9tU291cmNlTWFwKG5ld01hcENvbnN1bWVyKTtcbiAgbWVyZ2VkTWFwR2VuZXJhdG9yLmFwcGx5U291cmNlTWFwKG9sZE1hcENvbnN1bWVyKTtcbiAgY29uc3QgbWVyZ2VkID0gZnJvbUpTT04obWVyZ2VkTWFwR2VuZXJhdG9yLnRvU3RyaW5nKCkpO1xuICByZXR1cm4gbWVyZ2VkO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgY29uc3RhbnQgcG9vbCBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29uc3RhbnRQb29sKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgcmV0dXJuIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzXG4gICAgICAubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpKVxuICAgICAgLm1hcChzdG10ID0+IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCBzb3VyY2VGaWxlKSlcbiAgICAgIC5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAqIGRlZmluaXRpb25zLlxuICogQHBhcmFtIGltcG9ydHMgQW4gb2JqZWN0IHRoYXQgdHJhY2tzIHRoZSBpbXBvcnRzIHRoYXQgYXJlIG5lZWRlZCBieSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJEZWZpbml0aW9ucyhcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgY29uc3QgbmFtZSA9IChjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uIGFzIHRzLk5hbWVkRGVjbGFyYXRpb24pLm5hbWUgITtcbiAgY29uc3QgdHJhbnNsYXRlID0gKHN0bXQ6IFN0YXRlbWVudCkgPT5cbiAgICAgIHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKTtcbiAgY29uc3QgZGVmaW5pdGlvbnMgPVxuICAgICAgY29tcGlsZWRDbGFzcy5jb21waWxhdGlvblxuICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgIGMgPT4gYy5zdGF0ZW1lbnRzLm1hcChzdGF0ZW1lbnQgPT4gdHJhbnNsYXRlKHN0YXRlbWVudCkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5jb25jYXQodHJhbnNsYXRlKGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKSkpXG4gICAgICAgICAgICAgICAgICAgICAgIC5tYXAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZW1lbnQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RhdGVtZW50LCBzb3VyY2VGaWxlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpKVxuICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGRlZmluaXRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBFeHRlbnNpb24oZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBmaWxlUGF0aC5yZXBsYWNlKC9cXC4oanN8ZFxcLnRzKSQvLCAnJyk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFuZ3VsYXIgQVNUIHN0YXRlbWVudCBub2RlIHRoYXQgY29udGFpbnMgdGhlIGFzc2lnbm1lbnQgb2YgdGhlXG4gKiBjb21waWxlZCBkZWNvcmF0b3IgdG8gYmUgYXBwbGllZCB0byB0aGUgY2xhc3MuXG4gKiBAcGFyYW0gYW5hbHl6ZWRDbGFzcyBUaGUgaW5mbyBhYm91dCB0aGUgY2xhc3Mgd2hvc2Ugc3RhdGVtZW50IHdlIHdhbnQgdG8gY3JlYXRlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KFxuICAgIHJlY2VpdmVyTmFtZTogdHMuRGVjbGFyYXRpb25OYW1lLCBwcm9wTmFtZTogc3RyaW5nLCBpbml0aWFsaXplcjogRXhwcmVzc2lvbik6IFN0YXRlbWVudCB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG5cbmZ1bmN0aW9uIGdldEltcG9ydFN0cmluZyhcbiAgICBpbXBvcnRNYW5hZ2VyOiBJbXBvcnRNYW5hZ2VyLCBpbXBvcnRQYXRoOiBzdHJpbmcgfCBudWxsLCBpbXBvcnROYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgaW1wb3J0QXMgPSBpbXBvcnRQYXRoID8gaW1wb3J0TWFuYWdlci5nZW5lcmF0ZU5hbWVkSW1wb3J0KGltcG9ydFBhdGgsIGltcG9ydE5hbWUpIDogbnVsbDtcbiAgcmV0dXJuIGltcG9ydEFzID8gYCR7aW1wb3J0QXMubW9kdWxlSW1wb3J0fS4ke2ltcG9ydEFzLnN5bWJvbH1gIDogYCR7aW1wb3J0TmFtZX1gO1xufVxuIl19