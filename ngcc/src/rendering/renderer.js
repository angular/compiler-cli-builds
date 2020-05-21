(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/renderer", ["require", "exports", "tslib", "@angular/compiler", "magic-string", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/constants", "@angular/compiler-cli/ngcc/src/rendering/rendering_formatter", "@angular/compiler-cli/ngcc/src/rendering/source_maps", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.renderConstantPool = exports.Renderer = void 0;
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
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var constants_1 = require("@angular/compiler-cli/ngcc/src/constants");
    var rendering_formatter_1 = require("@angular/compiler-cli/ngcc/src/rendering/rendering_formatter");
    var source_maps_1 = require("@angular/compiler-cli/ngcc/src/rendering/source_maps");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
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
            var outputText = new magic_string_1.default(sourceFile.text);
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
                });
                if (!isEntryPoint && compiledFile.reexports.length > 0) {
                    this.srcFormatter.addDirectExports(outputText, compiledFile.reexports, importManager, compiledFile.sourceFile);
                }
                this.srcFormatter.addConstants(outputText, renderConstantPool(this.srcFormatter, compiledFile.sourceFile, compiledFile.constantPool, importManager), compiledFile.sourceFile);
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
                return source_maps_1.renderSourceAndMap(this.logger, this.fs, sourceFile, outputText);
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
            var statements = compiledClass.compilation.map(function (c) {
                return createAssignmentStatement(name, c.name, c.initializer);
            });
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
            var _this = this;
            var printStatement = function (stmt) {
                return _this.srcFormatter.printStatement(stmt, sourceFile, imports);
            };
            return statements.map(printStatement).join('\n');
        };
        return Renderer;
    }());
    exports.Renderer = Renderer;
    /**
     * Render the constant pool as source code for the given class.
     */
    function renderConstantPool(formatter, sourceFile, constantPool, imports) {
        var printStatement = function (stmt) { return formatter.printStatement(stmt, sourceFile, imports); };
        return constantPool.statements.map(printStatement).join('\n');
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCw4Q0FBc0c7SUFDdEcsNkNBQXVDO0lBSXZDLHlFQUE0RDtJQUk1RCxzRUFBMkM7SUFLM0Msb0dBQWdGO0lBQ2hGLG9GQUFpRDtJQUNqRCx3RUFBdUU7SUFFdkU7Ozs7O09BS0c7SUFDSDtRQUNFLGtCQUNZLElBQXdCLEVBQVUsWUFBZ0MsRUFDbEUsRUFBYyxFQUFVLE1BQWMsRUFBVSxNQUF3QjtZQUR4RSxTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtZQUNsRSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQUcsQ0FBQztRQUV4RixnQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQUUsb0JBQTBDLEVBQ2xGLDJCQUF3RDtZQUY1RCxpQkFpQkM7WUFkQyxJQUFNLGFBQWEsR0FBa0IsRUFBRSxDQUFDO1lBRXhDLDhCQUE4QjtZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQUEsVUFBVTtnQkFDekQsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksb0JBQW9CLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztvQkFDMUUsVUFBVSxLQUFLLEtBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtvQkFDdkMsSUFBTSxZQUFZLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN4RCxJ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QUF5QixFQUFFLFVBQXVCLEVBQUUsT0FBc0I7WUFEOUUsaUJBS0M7WUFIQyxJQUFNLGNBQWMsR0FBRyxVQUFDLElBQWU7Z0JBQ25DLE9BQUEsS0FBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUM7WUFBM0QsQ0FBMkQsQ0FBQztZQUNoRSxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFDSCxlQUFDO0lBQUQsQ0FBQyxBQWxLRCxJQWtLQztJQWxLWSw0QkFBUTtJQW9LckI7O09BRUc7SUFDSCxTQUFnQixrQkFBa0IsQ0FDOUIsU0FBNkIsRUFBRSxVQUF5QixFQUFFLFlBQTBCLEVBQ3BGLE9BQXNCO1FBQ3hCLElBQU0sY0FBYyxHQUFHLFVBQUMsSUFBZSxJQUFLLE9BQUEsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxFQUFuRCxDQUFtRCxDQUFDO1FBQ2hHLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFMRCxnREFLQztJQUVEOzs7O09BSUc7SUFDSCxTQUFTLHlCQUF5QixDQUM5QixZQUFnQyxFQUFFLFFBQWdCLEVBQUUsV0FBdUI7UUFDN0UsSUFBTSxRQUFRLEdBQUcsSUFBSSwwQkFBZSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ25ELE9BQU8sSUFBSSx3QkFBYSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDckUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHlzaXN9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtDb21waWxlZENsYXNzLCBDb21waWxlZEZpbGUsIERlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmltcG9ydCB7UmVkdW5kYW50RGVjb3JhdG9yTWFwLCBSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge3JlbmRlclNvdXJjZUFuZE1hcH0gZnJvbSAnLi9zb3VyY2VfbWFwcyc7XG5pbXBvcnQge0ZpbGVUb1dyaXRlLCBnZXRJbXBvcnRSZXdyaXRlciwgc3RyaXBFeHRlbnNpb259IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBzcmNGb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlcixcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7fVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzOiBGaWxlVG9Xcml0ZVtdID0gW107XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcy5cbiAgICB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc291cmNlRmlsZSA9PiB7XG4gICAgICBpZiAoZGVjb3JhdGlvbkFuYWx5c2VzLmhhcyhzb3VyY2VGaWxlKSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNlcy5oYXMoc291cmNlRmlsZSkgfHxcbiAgICAgICAgICBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgICBjb25zdCBjb21waWxlZEZpbGUgPSBkZWNvcmF0aW9uQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgICAgcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRmlsZShcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcykpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCBpc0VudHJ5UG9pbnQgPSBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKHNvdXJjZUZpbGUudGV4dCk7XG5cbiAgICBpZiAoc3dpdGNoTWFya2VyQW5hbHlzaXMpIHtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnJld3JpdGVTd2l0Y2hhYmxlRGVjbGFyYXRpb25zKFxuICAgICAgICAgIG91dHB1dFRleHQsIHN3aXRjaE1hcmtlckFuYWx5c2lzLnNvdXJjZUZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLmRlY2xhcmF0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKFxuICAgICAgICBnZXRJbXBvcnRSZXdyaXRlcihcbiAgICAgICAgICAgIHRoaXMuYnVuZGxlLnNyYy5yM1N5bWJvbHNGaWxlLCB0aGlzLmJ1bmRsZS5pc0NvcmUsIHRoaXMuYnVuZGxlLmlzRmxhdENvcmUpLFxuICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgIGlmIChjb21waWxlZEZpbGUpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zdHJ1Y3RvciBwYXJhbSBtZXRhZGF0YSBhbmQgcHJvcGVydHkgZGVjb3JhdG9ycyAod2UgbmVlZCBpbmZvIGZyb20gdGhlXG4gICAgICAvLyBoYW5kbGVycyB0byBkbyB0aGlzKVxuICAgICAgY29uc3QgZGVjb3JhdG9yc1RvUmVtb3ZlID0gdGhpcy5jb21wdXRlRGVjb3JhdG9yc1RvUmVtb3ZlKGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMpO1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIucmVtb3ZlRGVjb3JhdG9ycyhvdXRwdXRUZXh0LCBkZWNvcmF0b3JzVG9SZW1vdmUpO1xuXG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJlZERlZmluaXRpb24gPVxuICAgICAgICAgICAgdGhpcy5yZW5kZXJEZWZpbml0aW9ucyhjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY2xhenosIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGREZWZpbml0aW9ucyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWREZWZpbml0aW9uKTtcblxuICAgICAgICBjb25zdCByZW5kZXJlZFN0YXRlbWVudHMgPVxuICAgICAgICAgICAgdGhpcy5yZW5kZXJBZGphY2VudFN0YXRlbWVudHMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkQWRqYWNlbnRTdGF0ZW1lbnRzKG91dHB1dFRleHQsIGNsYXp6LCByZW5kZXJlZFN0YXRlbWVudHMpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICghaXNFbnRyeVBvaW50ICYmIGNvbXBpbGVkRmlsZS5yZWV4cG9ydHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGREaXJlY3RFeHBvcnRzKFxuICAgICAgICAgICAgb3V0cHV0VGV4dCwgY29tcGlsZWRGaWxlLnJlZXhwb3J0cywgaW1wb3J0TWFuYWdlciwgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRDb25zdGFudHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICByZW5kZXJDb25zdGFudFBvb2woXG4gICAgICAgICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLCBjb21waWxlZEZpbGUuc291cmNlRmlsZSwgY29tcGlsZWRGaWxlLmNvbnN0YW50UG9vbCwgaW1wb3J0TWFuYWdlciksXG4gICAgICAgICAgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIC8vIEFkZCBleHBvcnRzIHRvIHRoZSBlbnRyeS1wb2ludCBmaWxlXG4gICAgaWYgKGlzRW50cnlQb2ludCkge1xuICAgICAgY29uc3QgZW50cnlQb2ludEJhc2VQYXRoID0gc3RyaXBFeHRlbnNpb24odGhpcy5idW5kbGUuc3JjLnBhdGgpO1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRXhwb3J0cyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBlbnRyeVBvaW50QmFzZVBhdGgsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgaW1wb3J0TWFuYWdlciwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgaWYgKGlzRW50cnlQb2ludCB8fCBjb21waWxlZEZpbGUpIHtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEltcG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKHNvdXJjZUZpbGUuZmlsZU5hbWUpLCBzb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlIHx8IHN3aXRjaE1hcmtlckFuYWx5c2lzIHx8IGlzRW50cnlQb2ludCkge1xuICAgICAgcmV0dXJuIHJlbmRlclNvdXJjZUFuZE1hcCh0aGlzLmxvZ2dlciwgdGhpcy5mcywgc291cmNlRmlsZSwgb3V0cHV0VGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRnJvbSB0aGUgZ2l2ZW4gbGlzdCBvZiBjbGFzc2VzLCBjb21wdXRlcyBhIG1hcCBvZiBkZWNvcmF0b3JzIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAqIFRoZSBkZWNvcmF0b3JzIHRvIHJlbW92ZSBhcmUga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZSBjYW4gdGVsbCBpZlxuICAgKiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5LlxuICAgKiBAcGFyYW0gY2xhc3NlcyBUaGUgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbWF5IGhhdmUgZGVjb3JhdG9ycyB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIGRlY29yYXRvcnMgdG8gcmVtb3ZlLCBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjbGFzc2VzOiBDb21waWxlZENsYXNzW10pOiBSZWR1bmRhbnREZWNvcmF0b3JNYXAge1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBSZWR1bmRhbnREZWNvcmF0b3JNYXAoKTtcbiAgICBjbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgaWYgKGNsYXp6LmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGF6ei5kZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgICAgaWYgKGRlYy5ub2RlID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ITtcbiAgICAgICAgaWYgKCFkZWNvcmF0b3JzVG9SZW1vdmUuaGFzKGRlY29yYXRvckFycmF5KSkge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5zZXQoZGVjb3JhdG9yQXJyYXksIFtkZWMubm9kZV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlY29yYXRvcnNUb1JlbW92ZS5nZXQoZGVjb3JhdG9yQXJyYXkpIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnNUb1JlbW92ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW5kZXIgdGhlIGRlZmluaXRpb25zIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gICAqIEBwYXJhbSBzb3VyY2VGaWxlIFRoZSBmaWxlIGNvbnRhaW5pbmcgdGhlIGNsYXNzIHRvIHByb2Nlc3MuXG4gICAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAgICogZGVmaW5pdGlvbnMuXG4gICAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSByZW5kZXJEZWZpbml0aW9ucyhcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIGNvbXBpbGVkQ2xhc3M6IENvbXBpbGVkQ2xhc3MsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICAgIGNvbnN0IG5hbWUgPSB0aGlzLmhvc3QuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb24ubWFwKGMgPT4ge1xuICAgICAgcmV0dXJuIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTdGF0ZW1lbnRzKHNvdXJjZUZpbGUsIHN0YXRlbWVudHMsIGltcG9ydHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgYWRqYWNlbnQgc3RhdGVtZW50cyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICAgKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudHMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAgICogZGVmaW5pdGlvbnMuXG4gICAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSByZW5kZXJBZGphY2VudFN0YXRlbWVudHMoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYyBvZiBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9uKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goLi4uYy5zdGF0ZW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU3RhdGVtZW50cyhzb3VyY2VGaWxlLCBzdGF0ZW1lbnRzLCBpbXBvcnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdGVtZW50cyhcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0YXRlbWVudHM6IFN0YXRlbWVudFtdLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmludFN0YXRlbWVudCA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnByaW50U3RhdGVtZW50KHN0bXQsIHNvdXJjZUZpbGUsIGltcG9ydHMpO1xuICAgIHJldHVybiBzdGF0ZW1lbnRzLm1hcChwcmludFN0YXRlbWVudCkuam9pbignXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBmb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlciwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsXG4gICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50U3RhdGVtZW50ID0gKHN0bXQ6IFN0YXRlbWVudCkgPT4gZm9ybWF0dGVyLnByaW50U3RhdGVtZW50KHN0bXQsIHNvdXJjZUZpbGUsIGltcG9ydHMpO1xuICByZXR1cm4gY29uc3RhbnRQb29sLnN0YXRlbWVudHMubWFwKHByaW50U3RhdGVtZW50KS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cbiJdfQ==