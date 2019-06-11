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
                if (clazz.decorators === null) {
                    return;
                }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryw2Q0FBdUM7SUFDdkMsK0JBQWlDO0lBRWpDLG1FQUFxRjtJQUNyRix5RUFBZ0Y7SUFJaEYsc0VBQTJDO0lBSzNDLHdFQUF1RTtJQUN2RSxvR0FBZ0Y7SUFDaEYsb0ZBQW1FO0lBRW5FOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDWSxZQUFnQyxFQUFVLEVBQWMsRUFBVSxNQUFjLEVBQ2hGLElBQXdCLEVBQVUsTUFBZSxFQUFVLE1BQXdCO1lBRG5GLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtZQUFVLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ2hGLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQy9GLENBQUM7UUFFRCxnQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQUUsb0JBQTBDLEVBQ2xGLDJCQUF3RDtZQUY1RCxpQkFpQkM7WUFkQyxJQUFNLGFBQWEsR0FBa0IsRUFBRSxDQUFDO1lBRXhDLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDekQsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztvQkFDMUUsVUFBVSxLQUFLLEtBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDdkMs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LENBQUMsRUFIZixDQUdlLENBQUM7YUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFoQkQsOENBZ0JDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMseUJBQXlCLENBQzlCLFlBQWdDLEVBQUUsUUFBZ0IsRUFBRSxXQUF1QjtRQUM3RSxJQUFNLFFBQVEsR0FBRyxJQUFJLDBCQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLHdCQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0lBRUQsU0FBUyxhQUFhO1FBQ3BCLE9BQU8sRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSfSBmcm9tICdAYW5ndWxhci9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHt0cmFuc2xhdGVTdGF0ZW1lbnQsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7Q29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHlzZXMsIFN3aXRjaE1hcmtlckFuYWx5c2lzfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vZmlsZV9zeXN0ZW0vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0ZpbGVUb1dyaXRlLCBnZXRJbXBvcnRSZXdyaXRlciwgc3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXIsIFJlZHVuZGFudERlY29yYXRvck1hcH0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7ZXh0cmFjdFNvdXJjZU1hcCwgcmVuZGVyU291cmNlQW5kTWFwfSBmcm9tICcuL3NvdXJjZV9tYXBzJztcblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRGaWxlYC5cbiAqXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0XG4gKiBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmQgYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBzcmNGb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlciwgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpIHtcbiAgfVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzOiBGaWxlVG9Xcml0ZVtdID0gW107XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcy5cbiAgICB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc291cmNlRmlsZSA9PiB7XG4gICAgICBpZiAoZGVjb3JhdGlvbkFuYWx5c2VzLmhhcyhzb3VyY2VGaWxlKSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNlcy5oYXMoc291cmNlRmlsZSkgfHxcbiAgICAgICAgICBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgICBjb25zdCBjb21waWxlZEZpbGUgPSBkZWNvcmF0aW9uQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgICAgcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRmlsZShcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcykpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCBpc0VudHJ5UG9pbnQgPSBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZTtcbiAgICBjb25zdCBpbnB1dCA9IGV4dHJhY3RTb3VyY2VNYXAodGhpcy5mcywgdGhpcy5sb2dnZXIsIHNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcblxuICAgIGlmIChzd2l0Y2hNYXJrZXJBbmFseXNpcykge1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIucmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgc3dpdGNoTWFya2VyQW5hbHlzaXMuc291cmNlRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMuZGVjbGFyYXRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIGdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLnNyYy5yM1N5bWJvbHNGaWxlLCB0aGlzLmlzQ29yZSwgdGhpcy5idW5kbGUuaXNGbGF0Q29yZSksXG4gICAgICAgIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnN0cnVjdG9yIHBhcmFtIG1ldGFkYXRhIGFuZCBwcm9wZXJ0eSBkZWNvcmF0b3JzICh3ZSBuZWVkIGluZm8gZnJvbSB0aGVcbiAgICAgIC8vIGhhbmRsZXJzIHRvIGRvIHRoaXMpXG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcyk7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVkRGVmaW5pdGlvbiA9IHJlbmRlckRlZmluaXRpb25zKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZERlZmluaXRpb25zKG91dHB1dFRleHQsIGNsYXp6LCByZW5kZXJlZERlZmluaXRpb24pO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZENvbnN0YW50cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LFxuICAgICAgICAgIHJlbmRlckNvbnN0YW50UG9vbChjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLmNvbnN0YW50UG9vbCwgaW1wb3J0TWFuYWdlciksXG4gICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIC8vIEFkZCBleHBvcnRzIHRvIHRoZSBlbnRyeS1wb2ludCBmaWxlXG4gICAgaWYgKGlzRW50cnlQb2ludCkge1xuICAgICAgY29uc3QgZW50cnlQb2ludEJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24odGhpcy5idW5kbGUuc3JjLnBhdGgpO1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRXhwb3J0cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBlbnRyeVBvaW50QmFzZVBhdGgsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgaW1wb3J0TWFuYWdlciwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgaWYgKGlzRW50cnlQb2ludCB8fCBjb21waWxlZEZpbGUpIHtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEltcG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNvdXJjZUZpbGUuZmlsZU5hbWUpLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlIHx8IHN3aXRjaE1hcmtlckFuYWx5c2lzIHx8IGlzRW50cnlQb2ludCkge1xuICAgICAgcmV0dXJuIHJlbmRlclNvdXJjZUFuZE1hcChzb3VyY2VGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRnJvbSB0aGUgZ2l2ZW4gbGlzdCBvZiBjbGFzc2VzLCBjb21wdXRlcyBhIG1hcCBvZiBkZWNvcmF0b3JzIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAqIFRoZSBkZWNvcmF0b3JzIHRvIHJlbW92ZSBhcmUga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZSBjYW4gdGVsbCBpZlxuICAgKiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5LlxuICAgKiBAcGFyYW0gY2xhc3NlcyBUaGUgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbWF5IGhhdmUgZGVjb3JhdG9ycyB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIGRlY29yYXRvcnMgdG8gcmVtb3ZlLCBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjbGFzc2VzOiBDb21waWxlZENsYXNzW10pOiBSZWR1bmRhbnREZWNvcmF0b3JNYXAge1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBSZWR1bmRhbnREZWNvcmF0b3JNYXAoKTtcbiAgICBjbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgaWYgKGNsYXp6LmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGF6ei5kZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgICAgY29uc3QgZGVjb3JhdG9yQXJyYXkgPSBkZWMubm9kZS5wYXJlbnQgITtcbiAgICAgICAgaWYgKCFkZWNvcmF0b3JzVG9SZW1vdmUuaGFzKGRlY29yYXRvckFycmF5KSkge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5nZXQoZGVjb3JhdG9yQXJyYXkpICEucHVzaChkZWMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWNvcmF0b3JzVG9SZW1vdmU7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb25zdGFudFBvb2w6IENvbnN0YW50UG9vbCwgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSBjcmVhdGVQcmludGVyKCk7XG4gIHJldHVybiBjb25zdGFudFBvb2wuc3RhdGVtZW50c1xuICAgICAgLm1hcChzdG10ID0+IHRyYW5zbGF0ZVN0YXRlbWVudChzdG10LCBpbXBvcnRzLCBOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSKSlcbiAgICAgIC5tYXAoc3RtdCA9PiBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgc3RtdCwgc291cmNlRmlsZSkpXG4gICAgICAuam9pbignXFxuJyk7XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50ZXIgPSBjcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IG5hbWUgPSBjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLm5hbWU7XG4gIGNvbnN0IHRyYW5zbGF0ZSA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gIGNvbnN0IHByaW50ID0gKHN0bXQ6IFN0YXRlbWVudCkgPT5cbiAgICAgIHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0cmFuc2xhdGUoc3RtdCksIHNvdXJjZUZpbGUpO1xuICBjb25zdCBkZWZpbml0aW9ucyA9IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGMgPT4gW2NyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jb25jYXQoYy5zdGF0ZW1lbnRzKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChwcmludClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5qb2luKCdcXG4nKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICByZXR1cm4gZGVmaW5pdGlvbnM7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIEFuZ3VsYXIgQVNUIHN0YXRlbWVudCBub2RlIHRoYXQgY29udGFpbnMgdGhlIGFzc2lnbm1lbnQgb2YgdGhlXG4gKiBjb21waWxlZCBkZWNvcmF0b3IgdG8gYmUgYXBwbGllZCB0byB0aGUgY2xhc3MuXG4gKiBAcGFyYW0gYW5hbHl6ZWRDbGFzcyBUaGUgaW5mbyBhYm91dCB0aGUgY2xhc3Mgd2hvc2Ugc3RhdGVtZW50IHdlIHdhbnQgdG8gY3JlYXRlLlxuICovXG5mdW5jdGlvbiBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KFxuICAgIHJlY2VpdmVyTmFtZTogdHMuRGVjbGFyYXRpb25OYW1lLCBwcm9wTmFtZTogc3RyaW5nLCBpbml0aWFsaXplcjogRXhwcmVzc2lvbik6IFN0YXRlbWVudCB7XG4gIGNvbnN0IHJlY2VpdmVyID0gbmV3IFdyYXBwZWROb2RlRXhwcihyZWNlaXZlck5hbWUpO1xuICByZXR1cm4gbmV3IFdyaXRlUHJvcEV4cHIocmVjZWl2ZXIsIHByb3BOYW1lLCBpbml0aWFsaXplcikudG9TdG10KCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVByaW50ZXIoKTogdHMuUHJpbnRlciB7XG4gIHJldHVybiB0cy5jcmVhdGVQcmludGVyKHtuZXdMaW5lOiB0cy5OZXdMaW5lS2luZC5MaW5lRmVlZH0pO1xufVxuIl19