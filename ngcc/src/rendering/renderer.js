(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "magic-string", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/constants", "@angular/compiler-cli/ngcc/src/rendering/utils", "@angular/compiler-cli/ngcc/src/rendering/rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/source_maps"], factory);
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
    var magic_string_1 = require("magic-string");
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var constants_1 = require("@angular/compiler-cli/ngcc/src/constants");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    var rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/rendering_formatter");
    var source_maps_1 = require("@angular/compiler-cli/ngcc/src/rendering/source_maps");
    /**
     * A base-class for rendering an `AnalyzedFile`.
     *
     * Package formats have output files that must be rendered differently. Concrete sub-classes must
     * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
     */
    var Renderer = /** @class */ (function () {
        function Renderer(srcFormatter, fs, logger, host, isCore, bundle) {
            this.srcFormatter = srcFormatter;
            this.fs = fs;
            this.logger = logger;
            this.host = host;
            this.isCore = isCore;
            this.bundle = bundle;
        }
        Renderer.prototype.renderProgram = function (decorationAnalyses, switchMarkerAnalyses, privateDeclarationsAnalyses) {
            var _this = this;
            var renderedFiles = [];
            // Transform the source files.
            this.bundle.src.program.getSourceFiles().forEach(function (sourceFile) {
                if (decorationAnalyses.has(sourceFile) || switchMarkerAnalyses.has(sourceFile) ||
                    sourceFile === _this.bundle.src.file) {
                    var compiledFile = decorationAnalyses.get(sourceFile);
                    var switchMarkerAnalysis = switchMarkerAnalyses.get(sourceFile);
                    renderedFiles.push.apply(renderedFiles, tslib_1.__spread(_this.renderFile(sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses)));
                }
            });
            return renderedFiles;
        };
        /**
         * Render the source code and source-map for an Analyzed file.
         * @param compiledFile The analyzed file to render.
         * @param targetPath The absolute path where the rendered file will be written.
         */
        Renderer.prototype.renderFile = function (sourceFile, compiledFile, switchMarkerAnalysis, privateDeclarationsAnalyses) {
            var _this = this;
            var isEntryPoint = sourceFile === this.bundle.src.file;
            var input = source_maps_1.extractSourceMap(this.fs, this.logger, sourceFile);
            var outputText = new magic_string_1.default(input.source);
            if (switchMarkerAnalysis) {
                this.srcFormatter.rewriteSwitchableDeclarations(outputText, switchMarkerAnalysis.sourceFile, switchMarkerAnalysis.declarations);
            }
            var importManager = new translator_1.ImportManager(utils_1.getImportRewriter(this.bundle.src.r3SymbolsFile, this.isCore, this.bundle.isFlatCore), constants_1.IMPORT_PREFIX);
            if (compiledFile) {
                // TODO: remove constructor param metadata and property decorators (we need info from the
                // handlers to do this)
                var decoratorsToRemove = this.computeDecoratorsToRemove(compiledFile.compiledClasses);
                this.srcFormatter.removeDecorators(outputText, decoratorsToRemove);
                compiledFile.compiledClasses.forEach(function (clazz) {
                    var renderedDefinition = renderDefinitions(compiledFile.sourceFile, clazz, importManager);
                    _this.srcFormatter.addDefinitions(outputText, clazz, renderedDefinition);
                });
                this.srcFormatter.addConstants(outputText, renderConstantPool(compiledFile.sourceFile, compiledFile.constantPool, importManager), compiledFile.sourceFile);
            }
            // Add exports to the entry-point file
            if (isEntryPoint) {
                var entryPointBasePath = utils_1.stripExtension(this.bundle.src.path);
                this.srcFormatter.addExports(outputText, entryPointBasePath, privateDeclarationsAnalyses, importManager, sourceFile);
            }
            if (isEntryPoint || compiledFile) {
                this.srcFormatter.addImports(outputText, importManager.getAllImports(sourceFile.fileName), sourceFile);
            }
            if (compiledFile || switchMarkerAnalysis || isEntryPoint) {
                return source_maps_1.renderSourceAndMap(sourceFile, input, outputText);
            }
            else {
                return [];
            }
        };
        /**
         * From the given list of classes, computes a map of decorators that should be removed.
         * The decorators to remove are keyed by their container node, such that we can tell if
         * we should remove the entire decorator property.
         * @param classes The list of classes that may have decorators to remove.
         * @returns A map of decorators to remove, keyed by their container node.
         */
        Renderer.prototype.computeDecoratorsToRemove = function (classes) {
            var decoratorsToRemove = new rendering_formatter_1.RedundantDecoratorMap();
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
        return Renderer;
    }());
    exports.Renderer = Renderer;
    /**
     * Render the constant pool as source code for the given class.
     */
    function renderConstantPool(sourceFile, constantPool, imports) {
        var printer = createPrinter();
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
        var printer = createPrinter();
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
    /**
     * Create an Angular AST statement node that contains the assignment of the
     * compiled decorator to be applied to the class.
     * @param analyzedClass The info about the class whose statement we want to create.
     */
    function createAssignmentStatement(receiverName, propName, initializer) {
        var receiver = new compiler_1.WrappedNodeExpr(receiverName);
        return new compiler_1.WritePropExpr(receiver, propName, initializer).toStmt();
    }
    function createPrinter() {
        return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryw2Q0FBdUM7SUFDdkMsK0JBQWlDO0lBRWpDLG1FQUFxRjtJQUNyRix5RUFBZ0Y7SUFJaEYsc0VBQTJDO0lBSzNDLHdFQUF1RTtJQUN2RSxvR0FBZ0Y7SUFDaEYsb0ZBQW1FO0lBRW5FOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDWSxZQUFnQyxFQUFVLEVBQWMsRUFBVSxNQUFjLEVBQ2hGLElBQXdCLEVBQVUsTUFBZSxFQUFVLE1BQXdCO1lBRG5GLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtZQUFVLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ2hGLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQy9GLENBQUM7UUFFRCxnQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQUUsb0JBQTBDLEVBQ2xGLDJCQUF3RDtZQUY1RCxpQkFpQkM7WUFkQyxJQUFNLGFBQWEsR0FBa0IsRUFBRSxDQUFDO1lBRXhDLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDekQsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztvQkFDMUUsVUFBVSxLQUFLLEtBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDdkMsSUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN4RCxJQUFNLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDbEUsYUFBYSxDQUFDLElBQUksT0FBbEIsYUFBYSxtQkFBUyxLQUFJLENBQUMsVUFBVSxDQUNqQyxVQUFVLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLDJCQUEyQixDQUFDLEdBQUU7aUJBQ25GO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLGFBQWEsQ0FBQztRQUN2QixDQUFDO1FBRUQ7Ozs7V0FJRztRQUNILDZCQUFVLEdBQVYsVUFDSSxVQUF5QixFQUFFLFlBQW9DLEVBQy9ELG9CQUFvRCxFQUNwRCwyQkFBd0Q7WUFINUQsaUJBbURDO1lBL0NDLElBQU0sWUFBWSxHQUFHLFVBQVUsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDekQsSUFBTSxLQUFLLEdBQUcsOEJBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pFLElBQU0sVUFBVSxHQUFHLElBQUksc0JBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFakQsSUFBSSxvQkFBb0IsRUFBRTtnQkFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyw2QkFBNkIsQ0FDM0MsVUFBVSxFQUFFLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsQ0FBQzthQUNyRjtZQUVELElBQU0sYUFBYSxHQUFHLElBQUksMEJBQWEsQ0FDbkMseUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFDckYseUJBQWEsQ0FBQyxDQUFDO1lBRW5CLElBQUksWUFBWSxFQUFFO2dCQUNoQix5RkFBeUY7Z0JBQ3pGLHVCQUF1QjtnQkFDdkIsSUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUN4RixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO2dCQUVuRSxZQUFZLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEtBQUs7b0JBQ3hDLElBQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQzVGLEtBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQkFDMUUsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQzFCLFVBQVUsRUFDVixrQkFBa0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLEVBQ3JGLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUM5QjtZQUVELHNDQUFzQztZQUN0QyxJQUFJLFlBQVksRUFBRTtnQkFDaEIsSUFBTSxrQkFBa0IsR0FBRyxzQkFBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FDeEIsVUFBVSxFQUFFLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUM3RjtZQUVELElBQUksWUFBWSxJQUFJLFlBQVksRUFBRTtnQkFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQ3hCLFVBQVUsRUFBRSxhQUFhLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUMvRTtZQUVELElBQUksWUFBWSxJQUFJLG9CQUFvQixJQUFJLFlBQVksRUFBRTtnQkFDeEQsT0FBTyxnQ0FBa0IsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQzFEO2lCQUFNO2dCQUNMLE9BQU8sRUFBRSxDQUFDO2FBQ1g7UUFDSCxDQUFDO1FBRUQ7Ozs7OztXQU1HO1FBQ0ssNENBQXlCLEdBQWpDLFVBQWtDLE9BQXdCO1lBQ3hELElBQU0sa0JBQWtCLEdBQUcsSUFBSSwyQ0FBcUIsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLO2dCQUNuQixLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7b0JBQzFCLElBQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBUSxDQUFDO29CQUN6QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFO3dCQUMzQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ3BEO3lCQUFNO3dCQUNMLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUN6RDtnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxrQkFBa0IsQ0FBQztRQUM1QixDQUFDO1FBQ0gsZUFBQztJQUFELENBQUMsQUF4R0QsSUF3R0M7SUF4R1ksNEJBQVE7SUEwR3JCOztPQUVHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLFVBQXlCLEVBQUUsWUFBMEIsRUFBRSxPQUFzQjtRQUMvRSxJQUFNLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxPQUFPLFlBQVksQ0FBQyxVQUFVO2FBQ3pCLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLCtCQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsc0NBQTRCLENBQUMsRUFBL0QsQ0FBK0QsQ0FBQzthQUM1RSxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsRUFBNUQsQ0FBNEQsQ0FBQzthQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQVBELGdEQU9DO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILFNBQWdCLGlCQUFpQixDQUM3QixVQUF5QixFQUFFLGFBQTRCLEVBQUUsT0FBc0I7UUFDakYsSUFBTSxPQUFPLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFDaEMsSUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7UUFDNUMsSUFBTSxTQUFTLEdBQUcsVUFBQyxJQUFlO1lBQzlCLE9BQUEsK0JBQWtCLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxzQ0FBNEIsQ0FBQztRQUEvRCxDQUErRCxDQUFDO1FBQ3BFLElBQU0sS0FBSyxHQUFHLFVBQUMsSUFBZTtZQUMxQixPQUFBLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQztRQUF2RSxDQUF1RSxDQUFDO1FBQzVFLElBQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxXQUFXO2FBQ3BCLEdBQUcsQ0FDQSxVQUFBLENBQUMsSUFBSSxPQUFBLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2FBQ25ELE1BQU0sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO2FBQ3BCLEdBQUcsQ0FBQyxLQUFLLENBQUM7YUFDVixJQUFJLENBQUMsSUFBSSxDQUFDLEVBSGYsQ0FHZSxDQUFDO2FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBaEJELDhDQWdCQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLHlCQUF5QixDQUM5QixZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQztJQUVELFNBQVMsYUFBYTtRQUNwQixPQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUMsRUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge0NvbnN0YW50UG9vbCwgRXhwcmVzc2lvbiwgU3RhdGVtZW50LCBXcmFwcGVkTm9kZUV4cHIsIFdyaXRlUHJvcEV4cHJ9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7Tk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7dHJhbnNsYXRlU3RhdGVtZW50LCBJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9kZWNvcmF0aW9uX2FuYWx5emVyJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXNpc30gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uL2ZpbGVfc3lzdGVtL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZSwgZ2V0SW1wb3J0UmV3cml0ZXIsIHN0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyLCBSZWR1bmRhbnREZWNvcmF0b3JNYXB9IGZyb20gJy4vcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge2V4dHJhY3RTb3VyY2VNYXAsIHJlbmRlclNvdXJjZUFuZE1hcH0gZnJvbSAnLi9zb3VyY2VfbWFwcyc7XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgc3JjRm9ybWF0dGVyOiBSZW5kZXJpbmdGb3JtYXR0ZXIsIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBpc0NvcmU6IGJvb2xlYW4sIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7XG4gIH1cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZVRvV3JpdGVbXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAgdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgaWYgKGRlY29yYXRpb25BbmFseXNlcy5oYXMoc291cmNlRmlsZSkgfHwgc3dpdGNoTWFya2VyQW5hbHlzZXMuaGFzKHNvdXJjZUZpbGUpIHx8XG4gICAgICAgICAgc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgICAgY29uc3QgY29tcGlsZWRGaWxlID0gZGVjb3JhdGlvbkFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzaXMgPSBzd2l0Y2hNYXJrZXJBbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICAgIHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckZpbGUoXG4gICAgICAgICAgICBzb3VyY2VGaWxlLCBjb21waWxlZEZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIGNvZGUgYW5kIHNvdXJjZS1tYXAgZm9yIGFuIEFuYWx5emVkIGZpbGUuXG4gICAqIEBwYXJhbSBjb21waWxlZEZpbGUgVGhlIGFuYWx5emVkIGZpbGUgdG8gcmVuZGVyLlxuICAgKiBAcGFyYW0gdGFyZ2V0UGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB3aGVyZSB0aGUgcmVuZGVyZWQgZmlsZSB3aWxsIGJlIHdyaXR0ZW4uXG4gICAqL1xuICByZW5kZXJGaWxlKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRGaWxlOiBDb21waWxlZEZpbGV8dW5kZWZpbmVkLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzaXM6IFN3aXRjaE1hcmtlckFuYWx5c2lzfHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgaXNFbnRyeVBvaW50ID0gc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGU7XG4gICAgY29uc3QgaW5wdXQgPSBleHRyYWN0U291cmNlTWFwKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG5cbiAgICBpZiAoc3dpdGNoTWFya2VyQW5hbHlzaXMpIHtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgICAgIG91dHB1dFRleHQsIHN3aXRjaE1hcmtlckFuYWx5c2lzLnNvdXJjZUZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLmRlY2xhcmF0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKFxuICAgICAgICBnZXRJbXBvcnRSZXdyaXRlcih0aGlzLmJ1bmRsZS5zcmMucjNTeW1ib2xzRmlsZSwgdGhpcy5pc0NvcmUsIHRoaXMuYnVuZGxlLmlzRmxhdENvcmUpLFxuICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgIGlmIChjb21waWxlZEZpbGUpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zdHJ1Y3RvciBwYXJhbSBtZXRhZGF0YSBhbmQgcHJvcGVydHkgZGVjb3JhdG9ycyAod2UgbmVlZCBpbmZvIGZyb20gdGhlXG4gICAgICAvLyBoYW5kbGVycyB0byBkbyB0aGlzKVxuICAgICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gdGhpcy5jb21wdXRlRGVjb3JhdG9yc1RvUmVtb3ZlKGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMpO1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIucmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXRUZXh0LCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuXG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPSByZW5kZXJEZWZpbml0aW9ucyhjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY2xhenosIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGREZWZpbml0aW9ucyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRDb25zdGFudHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICByZW5kZXJDb25zdGFudFBvb2woY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZS5jb25zdGFudFBvb2wsIGltcG9ydE1hbmFnZXIpLFxuICAgICAgICAgIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZXhwb3J0cyB0byB0aGUgZW50cnktcG9pbnQgZmlsZVxuICAgIGlmIChpc0VudHJ5UG9pbnQpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEV4cG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgZW50cnlQb2ludEJhc2VQYXRoLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIGltcG9ydE1hbmFnZXIsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGlmIChpc0VudHJ5UG9pbnQgfHwgY29tcGlsZWRGaWxlKSB7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRJbXBvcnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzb3VyY2VGaWxlLmZpbGVOYW1lKSwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcyB8fCBpc0VudHJ5UG9pbnQpIHtcbiAgICAgIHJldHVybiByZW5kZXJTb3VyY2VBbmRNYXAoc291cmNlRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZyb20gdGhlIGdpdmVuIGxpc3Qgb2YgY2xhc3NlcywgY29tcHV0ZXMgYSBtYXAgb2YgZGVjb3JhdG9ycyB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgKiBUaGUgZGVjb3JhdG9ycyB0byByZW1vdmUgYXJlIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLCBzdWNoIHRoYXQgd2UgY2FuIHRlbGwgaWZcbiAgICogd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eS5cbiAgICogQHBhcmFtIGNsYXNzZXMgVGhlIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG1heSBoYXZlIGRlY29yYXRvcnMgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBBIG1hcCBvZiBkZWNvcmF0b3JzIHRvIHJlbW92ZSwga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY2xhc3NlczogQ29tcGlsZWRDbGFzc1tdKTogUmVkdW5kYW50RGVjb3JhdG9yTWFwIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgUmVkdW5kYW50RGVjb3JhdG9yTWFwKCk7XG4gICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgIGNsYXp6LmRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCAhO1xuICAgICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkgIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnNUb1JlbW92ZTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgY29uc3RhbnQgcG9vbCBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29uc3RhbnRQb29sKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IGNyZWF0ZVByaW50ZXIoKTtcbiAgcmV0dXJuIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzXG4gICAgICAubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpKVxuICAgICAgLm1hcChzdG10ID0+IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCBzb3VyY2VGaWxlKSlcbiAgICAgIC5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAqIGRlZmluaXRpb25zLlxuICogQHBhcmFtIGltcG9ydHMgQW4gb2JqZWN0IHRoYXQgdHJhY2tzIHRoZSBpbXBvcnRzIHRoYXQgYXJlIG5lZWRlZCBieSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJEZWZpbml0aW9ucyhcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IGNyZWF0ZVByaW50ZXIoKTtcbiAgY29uc3QgbmFtZSA9IGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24ubmFtZTtcbiAgY29uc3QgdHJhbnNsYXRlID0gKHN0bXQ6IFN0YXRlbWVudCkgPT5cbiAgICAgIHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKTtcbiAgY29uc3QgcHJpbnQgPSAoc3RtdDogU3RhdGVtZW50KSA9PlxuICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHRyYW5zbGF0ZShzdG10KSwgc291cmNlRmlsZSk7XG4gIGNvbnN0IGRlZmluaXRpb25zID0gY29tcGlsZWRDbGFzcy5jb21waWxhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYyA9PiBbY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChuYW1lLCBjLm5hbWUsIGMuaW5pdGlhbGl6ZXIpXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNvbmNhdChjLnN0YXRlbWVudHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKHByaW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuam9pbignXFxuJyk7XG4gIHJldHVybiBkZWZpbml0aW9ucztcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUHJpbnRlcigpOiB0cy5QcmludGVyIHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVByaW50ZXIoe25ld0xpbmU6IHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkfSk7XG59XG4iXX0=