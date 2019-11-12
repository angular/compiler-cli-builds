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
        function Renderer(host, srcFormatter, fs, logger, bundle) {
            this.host = host;
            this.srcFormatter = srcFormatter;
            this.fs = fs;
            this.logger = logger;
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
            var importManager = new translator_1.ImportManager(utils_1.getImportRewriter(this.bundle.src.r3SymbolsFile, this.bundle.isCore, this.bundle.isFlatCore), constants_1.IMPORT_PREFIX);
            if (compiledFile) {
                // TODO: remove constructor param metadata and property decorators (we need info from the
                // handlers to do this)
                var decoratorsToRemove = this.computeDecoratorsToRemove(compiledFile.compiledClasses);
                this.srcFormatter.removeDecorators(outputText, decoratorsToRemove);
                compiledFile.compiledClasses.forEach(function (clazz) {
                    var renderedDefinition = _this.renderDefinitions(compiledFile.sourceFile, clazz, importManager);
                    _this.srcFormatter.addDefinitions(outputText, clazz, renderedDefinition);
                    var renderedStatements = _this.renderAdjacentStatements(compiledFile.sourceFile, clazz, importManager);
                    _this.srcFormatter.addAdjacentStatements(outputText, clazz, renderedStatements);
                    if (!isEntryPoint && clazz.reexports.length > 0) {
                        _this.srcFormatter.addDirectExports(outputText, clazz.reexports, importManager, compiledFile.sourceFile);
                    }
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
                    if (dec.node === null) {
                        return;
                    }
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
         * Render the definitions as source code for the given class.
         * @param sourceFile The file containing the class to process.
         * @param clazz The class whose definitions are to be rendered.
         * @param compilation The results of analyzing the class - this is used to generate the rendered
         * definitions.
         * @param imports An object that tracks the imports that are needed by the rendered definitions.
         */
        Renderer.prototype.renderDefinitions = function (sourceFile, compiledClass, imports) {
            var name = this.host.getInternalNameOfClass(compiledClass.declaration);
            var statements = compiledClass.compilation.map(function (c) { return createAssignmentStatement(name, c.name, c.initializer); });
            return this.renderStatements(sourceFile, statements, imports);
        };
        /**
         * Render the adjacent statements as source code for the given class.
         * @param sourceFile The file containing the class to process.
         * @param clazz The class whose statements are to be rendered.
         * @param compilation The results of analyzing the class - this is used to generate the rendered
         * definitions.
         * @param imports An object that tracks the imports that are needed by the rendered definitions.
         */
        Renderer.prototype.renderAdjacentStatements = function (sourceFile, compiledClass, imports) {
            var e_1, _a;
            var statements = [];
            try {
                for (var _b = tslib_1.__values(compiledClass.compilation), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var c = _c.value;
                    statements.push.apply(statements, tslib_1.__spread(c.statements));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return this.renderStatements(sourceFile, statements, imports);
        };
        Renderer.prototype.renderStatements = function (sourceFile, statements, imports) {
            var printer = createPrinter();
            var translate = function (stmt) {
                return translator_1.translateStatement(stmt, imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER);
            };
            var print = function (stmt) {
                return printer.printNode(ts.EmitHint.Unspecified, translate(stmt), sourceFile);
            };
            return statements.map(print).join('\n');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryw2Q0FBdUM7SUFDdkMsK0JBQWlDO0lBQ2pDLG1FQUF3RTtJQUN4RSx5RUFBZ0Y7SUFJaEYsc0VBQTJDO0lBSTNDLHdFQUF1RTtJQUN2RSxvR0FBZ0Y7SUFDaEYsb0ZBQW1FO0lBR25FOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDWSxJQUF3QixFQUFVLFlBQWdDLEVBQ2xFLEVBQWMsRUFBVSxNQUFjLEVBQVUsTUFBd0I7WUFEeEUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7WUFDbEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQUFHLENBQUM7UUFFeEYsZ0NBQWEsR0FBYixVQUNJLGtCQUFzQyxFQUFFLG9CQUEwQyxFQUNsRiwyQkFBd0Q7WUFGNUQsaUJBaUJDO1lBZEMsSUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztZQUV4Qyw4QkFBOEI7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFVBQVU7Z0JBQ3pELElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7b0JBQzFFLFVBQVUsS0FBSyxLQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3ZDLElBQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FB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SUFFRDs7OztPQUlHO0lBQ0gsU0FBUyx5QkFBeUIsQ0FDOUIsWUFBZ0MsRUFBRSxRQUFnQixFQUFFLFdBQXVCO1FBQzdFLElBQU0sUUFBUSxHQUFHLElBQUksMEJBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxPQUFPLElBQUksd0JBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3JFLENBQUM7SUFFRCxTQUFTLGFBQWE7UUFDcEIsT0FBTyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZVByb3BFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtOT09QX0RFRkFVTFRfSU1QT1JUX1JFQ09SREVSfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvaW1wb3J0cyc7XG5pbXBvcnQge3RyYW5zbGF0ZVN0YXRlbWVudCwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7U3dpdGNoTWFya2VyQW5hbHlzZXMsIFN3aXRjaE1hcmtlckFuYWx5c2lzfSBmcm9tICcuLi9hbmFseXNpcy9zd2l0Y2hfbWFya2VyX2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0ZpbGVUb1dyaXRlLCBnZXRJbXBvcnRSZXdyaXRlciwgc3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXIsIFJlZHVuZGFudERlY29yYXRvck1hcH0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7ZXh0cmFjdFNvdXJjZU1hcCwgcmVuZGVyU291cmNlQW5kTWFwfSBmcm9tICcuL3NvdXJjZV9tYXBzJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgY2xhc3MgUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIHNyY0Zvcm1hdHRlcjogUmVuZGVyaW5nRm9ybWF0dGVyLFxuICAgICAgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlciwgcHJpdmF0ZSBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpIHt9XG5cbiAgcmVuZGVyUHJvZ3JhbShcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLCBzd2l0Y2hNYXJrZXJBbmFseXNlczogU3dpdGNoTWFya2VyQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVUb1dyaXRlW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgc291cmNlIGZpbGVzLlxuICAgIHRoaXMuYnVuZGxlLnNyYy5wcm9ncmFtLmdldFNvdXJjZUZpbGVzKCkuZm9yRWFjaChzb3VyY2VGaWxlID0+IHtcbiAgICAgIGlmIChkZWNvcmF0aW9uQW5hbHlzZXMuaGFzKHNvdXJjZUZpbGUpIHx8IHN3aXRjaE1hcmtlckFuYWx5c2VzLmhhcyhzb3VyY2VGaWxlKSB8fFxuICAgICAgICAgIHNvdXJjZUZpbGUgPT09IHRoaXMuYnVuZGxlLnNyYy5maWxlKSB7XG4gICAgICAgIGNvbnN0IGNvbXBpbGVkRmlsZSA9IGRlY29yYXRpb25BbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICAgIGNvbnN0IHN3aXRjaE1hcmtlckFuYWx5c2lzID0gc3dpdGNoTWFya2VyQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgICByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJGaWxlKFxuICAgICAgICAgICAgc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVuZGVyZWRGaWxlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIHNvdXJjZSBjb2RlIGFuZCBzb3VyY2UtbWFwIGZvciBhbiBBbmFseXplZCBmaWxlLlxuICAgKiBAcGFyYW0gY29tcGlsZWRGaWxlIFRoZSBhbmFseXplZCBmaWxlIHRvIHJlbmRlci5cbiAgICogQHBhcmFtIHRhcmdldFBhdGggVGhlIGFic29sdXRlIHBhdGggd2hlcmUgdGhlIHJlbmRlcmVkIGZpbGUgd2lsbCBiZSB3cml0dGVuLlxuICAgKi9cbiAgcmVuZGVyRmlsZShcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZTogQ29tcGlsZWRGaWxlfHVuZGVmaW5lZCxcbiAgICAgIHN3aXRjaE1hcmtlckFuYWx5c2lzOiBTd2l0Y2hNYXJrZXJBbmFseXNpc3x1bmRlZmluZWQsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IGlzRW50cnlQb2ludCA9IHNvdXJjZUZpbGUgPT09IHRoaXMuYnVuZGxlLnNyYy5maWxlO1xuICAgIGNvbnN0IGlucHV0ID0gZXh0cmFjdFNvdXJjZU1hcCh0aGlzLmZzLCB0aGlzLmxvZ2dlciwgc291cmNlRmlsZSk7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhpbnB1dC5zb3VyY2UpO1xuXG4gICAgaWYgKHN3aXRjaE1hcmtlckFuYWx5c2lzKSB7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5yZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5zb3VyY2VGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5kZWNsYXJhdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgZ2V0SW1wb3J0UmV3cml0ZXIoXG4gICAgICAgICAgICB0aGlzLmJ1bmRsZS5zcmMucjNTeW1ib2xzRmlsZSwgdGhpcy5idW5kbGUuaXNDb3JlLCB0aGlzLmJ1bmRsZS5pc0ZsYXRDb3JlKSxcbiAgICAgICAgSU1QT1JUX1BSRUZJWCk7XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc3RydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnMgKHdlIG5lZWQgaW5mbyBmcm9tIHRoZVxuICAgICAgLy8gaGFuZGxlcnMgdG8gZG8gdGhpcylcbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IHRoaXMuY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzKTtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnJlbW92ZURlY29yYXRvcnMob3V0cHV0VGV4dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID1cbiAgICAgICAgICAgIHRoaXMucmVuZGVyRGVmaW5pdGlvbnMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG5cbiAgICAgICAgY29uc3QgcmVuZGVyZWRTdGF0ZW1lbnRzID1cbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRqYWNlbnRTdGF0ZW1lbnRzKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEFkamFjZW50U3RhdGVtZW50cyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWRTdGF0ZW1lbnRzKTtcblxuICAgICAgICBpZiAoIWlzRW50cnlQb2ludCAmJiBjbGF6ei5yZWV4cG9ydHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZERpcmVjdEV4cG9ydHMoXG4gICAgICAgICAgICAgIG91dHB1dFRleHQsIGNsYXp6LnJlZXhwb3J0cywgaW1wb3J0TWFuYWdlciwgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkQ29uc3RhbnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsXG4gICAgICAgICAgcmVuZGVyQ29uc3RhbnRQb29sKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjb21waWxlZEZpbGUuY29uc3RhbnRQb29sLCBpbXBvcnRNYW5hZ2VyKSxcbiAgICAgICAgICBjb21waWxlZEZpbGUuc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIGV4cG9ydHMgdG8gdGhlIGVudHJ5LXBvaW50IGZpbGVcbiAgICBpZiAoaXNFbnRyeVBvaW50KSB7XG4gICAgICBjb25zdCBlbnRyeVBvaW50QmFzZVBhdGggPSBzdHJpcEV4dGVuc2lvbih0aGlzLmJ1bmRsZS5zcmMucGF0aCk7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRFeHBvcnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsIGVudHJ5UG9pbnRCYXNlUGF0aCwgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBpbXBvcnRNYW5hZ2VyLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBpZiAoaXNFbnRyeVBvaW50IHx8IGNvbXBpbGVkRmlsZSkge1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkSW1wb3J0cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoc291cmNlRmlsZS5maWxlTmFtZSksIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGlmIChjb21waWxlZEZpbGUgfHwgc3dpdGNoTWFya2VyQW5hbHlzaXMgfHwgaXNFbnRyeVBvaW50KSB7XG4gICAgICByZXR1cm4gcmVuZGVyU291cmNlQW5kTWFwKHNvdXJjZUZpbGUsIGlucHV0LCBvdXRwdXRUZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGcm9tIHRoZSBnaXZlbiBsaXN0IG9mIGNsYXNzZXMsIGNvbXB1dGVzIGEgbWFwIG9mIGRlY29yYXRvcnMgdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICogVGhlIGRlY29yYXRvcnMgdG8gcmVtb3ZlIGFyZSBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZSwgc3VjaCB0aGF0IHdlIGNhbiB0ZWxsIGlmXG4gICAqIHdlIHNob3VsZCByZW1vdmUgdGhlIGVudGlyZSBkZWNvcmF0b3IgcHJvcGVydHkuXG4gICAqIEBwYXJhbSBjbGFzc2VzIFRoZSBsaXN0IG9mIGNsYXNzZXMgdGhhdCBtYXkgaGF2ZSBkZWNvcmF0b3JzIHRvIHJlbW92ZS5cbiAgICogQHJldHVybnMgQSBtYXAgb2YgZGVjb3JhdG9ycyB0byByZW1vdmUsIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wdXRlRGVjb3JhdG9yc1RvUmVtb3ZlKGNsYXNzZXM6IENvbXBpbGVkQ2xhc3NbXSk6IFJlZHVuZGFudERlY29yYXRvck1hcCB7XG4gICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gbmV3IFJlZHVuZGFudERlY29yYXRvck1hcCgpO1xuICAgIGNsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICBpZiAoY2xhenouZGVjb3JhdG9ycyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNsYXp6LmRlY29yYXRvcnMuZm9yRWFjaChkZWMgPT4ge1xuICAgICAgICBpZiAoZGVjLm5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGVjb3JhdG9yQXJyYXkgPSBkZWMubm9kZS5wYXJlbnQgITtcbiAgICAgICAgaWYgKCFkZWNvcmF0b3JzVG9SZW1vdmUuaGFzKGRlY29yYXRvckFycmF5KSkge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5nZXQoZGVjb3JhdG9yQXJyYXkpICEucHVzaChkZWMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWNvcmF0b3JzVG9SZW1vdmU7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICAgKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIGRlZmluaXRpb25zIGFyZSB0byBiZSByZW5kZXJlZC5cbiAgICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gICAqIGRlZmluaXRpb25zLlxuICAgKiBAcGFyYW0gaW1wb3J0cyBBbiBvYmplY3QgdGhhdCB0cmFja3MgdGhlIGltcG9ydHMgdGhhdCBhcmUgbmVlZGVkIGJ5IHRoZSByZW5kZXJlZCBkZWZpbml0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBuYW1lID0gdGhpcy5ob3N0LmdldEludGVybmFsTmFtZU9mQ2xhc3MoY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgY29uc3Qgc3RhdGVtZW50czogU3RhdGVtZW50W10gPSBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9uLm1hcChcbiAgICAgICAgYyA9PiB7IHJldHVybiBjcmVhdGVBc3NpZ25tZW50U3RhdGVtZW50KG5hbWUsIGMubmFtZSwgYy5pbml0aWFsaXplcik7IH0pO1xuICAgIHJldHVybiB0aGlzLnJlbmRlclN0YXRlbWVudHMoc291cmNlRmlsZSwgc3RhdGVtZW50cywgaW1wb3J0cyk7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBhZGphY2VudCBzdGF0ZW1lbnRzIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gICAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2Ugc3RhdGVtZW50cyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gICAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZFxuICAgKiBkZWZpbml0aW9ucy5cbiAgICogQHBhcmFtIGltcG9ydHMgQW4gb2JqZWN0IHRoYXQgdHJhY2tzIHRoZSBpbXBvcnRzIHRoYXQgYXJlIG5lZWRlZCBieSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIHJlbmRlckFkamFjZW50U3RhdGVtZW50cyhcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN0YXRlbWVudHM6IFN0YXRlbWVudFtdID0gW107XG4gICAgZm9yIChjb25zdCBjIG9mIGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb24pIHtcbiAgICAgIHN0YXRlbWVudHMucHVzaCguLi5jLnN0YXRlbWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTdGF0ZW1lbnRzKHNvdXJjZUZpbGUsIHN0YXRlbWVudHMsIGltcG9ydHMpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJTdGF0ZW1lbnRzKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgc3RhdGVtZW50czogU3RhdGVtZW50W10sIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IHByaW50ZXIgPSBjcmVhdGVQcmludGVyKCk7XG4gICAgY29uc3QgdHJhbnNsYXRlID0gKHN0bXQ6IFN0YXRlbWVudCkgPT5cbiAgICAgICAgdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpO1xuICAgIGNvbnN0IHByaW50ID0gKHN0bXQ6IFN0YXRlbWVudCkgPT5cbiAgICAgICAgcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHRyYW5zbGF0ZShzdG10KSwgc291cmNlRmlsZSk7XG4gICAgcmV0dXJuIHN0YXRlbWVudHMubWFwKHByaW50KS5qb2luKCdcXG4nKTtcbiAgfVxufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgY29uc3RhbnQgcG9vbCBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyQ29uc3RhbnRQb29sKFxuICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbnN0YW50UG9vbDogQ29uc3RhbnRQb29sLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgY29uc3QgcHJpbnRlciA9IGNyZWF0ZVByaW50ZXIoKTtcbiAgcmV0dXJuIGNvbnN0YW50UG9vbC5zdGF0ZW1lbnRzXG4gICAgICAubWFwKHN0bXQgPT4gdHJhbnNsYXRlU3RhdGVtZW50KHN0bXQsIGltcG9ydHMsIE5PT1BfREVGQVVMVF9JTVBPUlRfUkVDT1JERVIpKVxuICAgICAgLm1hcChzdG10ID0+IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCBzdG10LCBzb3VyY2VGaWxlKSlcbiAgICAgIC5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUHJpbnRlcigpOiB0cy5QcmludGVyIHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVByaW50ZXIoe25ld0xpbmU6IHRzLk5ld0xpbmVLaW5kLkxpbmVGZWVkfSk7XG59XG4iXX0=