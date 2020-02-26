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
                return source_maps_1.renderSourceAndMap(this.fs, sourceFile, outputText);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryw2Q0FBdUM7SUFFdkMseUVBQTREO0lBSTVELHNFQUEyQztJQUszQyxvR0FBZ0Y7SUFDaEYsb0ZBQWlEO0lBQ2pELHdFQUF1RTtJQUV2RTs7Ozs7T0FLRztJQUNIO1FBQ0Usa0JBQ1ksSUFBd0IsRUFBVSxZQUFnQyxFQUNsRSxFQUFjLEVBQVUsTUFBYyxFQUFVLE1BQXdCO1lBRHhFLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsaUJBQVksR0FBWixZQUFZLENBQW9CO1lBQ2xFLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBa0I7UUFBRyxDQUFDO1FBRXhGLGdDQUFhLEdBQWIsVUFDSSxrQkFBc0MsRUFBRSxvQkFBMEMsRUFDbEYsMkJBQXdEO1lBRjVELGlCQWlCQztZQWRDLElBQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7WUFFeEMsOEJBQThCO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBQSxVQUFVO2dCQUN6RCxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO29CQUMxRSxVQUFVLEtBQUssS0FBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO29CQUN2QyxJQUFNLFlBQVksR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3hELElB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QUFzQjtZQUQ5RSxpQkFLQztZQUhDLElBQU0sY0FBYyxHQUFHLFVBQUMsSUFBZTtnQkFDbkMsT0FBQSxLQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQztZQUEzRCxDQUEyRCxDQUFDO1lBQ2hFLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUNILGVBQUM7SUFBRCxDQUFDLEFBaktELElBaUtDO0lBaktZLDRCQUFRO0lBbUtyQjs7T0FFRztJQUNILFNBQWdCLGtCQUFrQixDQUM5QixTQUE2QixFQUFFLFVBQXlCLEVBQUUsWUFBMEIsRUFDcEYsT0FBc0I7UUFDeEIsSUFBTSxjQUFjLEdBQUcsVUFBQyxJQUFlLElBQUssT0FBQSxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQW5ELENBQW1ELENBQUM7UUFDaEcsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUxELGdEQUtDO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMseUJBQXlCLENBQzlCLFlBQWdDLEVBQUUsUUFBZ0IsRUFBRSxXQUF1QjtRQUM3RSxJQUFNLFFBQVEsR0FBRyxJQUFJLDBCQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLHdCQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtDb25zdGFudFBvb2wsIEV4cHJlc3Npb24sIFN0YXRlbWVudCwgV3JhcHBlZE5vZGVFeHByLCBXcml0ZVByb3BFeHByfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtJbXBvcnRNYW5hZ2VyfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNsYXRvcic7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3MsIENvbXBpbGVkRmlsZSwgRGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtTd2l0Y2hNYXJrZXJBbmFseXNlcywgU3dpdGNoTWFya2VyQW5hbHlzaXN9IGZyb20gJy4uL2FuYWx5c2lzL3N3aXRjaF9tYXJrZXJfYW5hbHl6ZXInO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge1JlbmRlcmluZ0Zvcm1hdHRlciwgUmVkdW5kYW50RGVjb3JhdG9yTWFwfSBmcm9tICcuL3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtyZW5kZXJTb3VyY2VBbmRNYXB9IGZyb20gJy4vc291cmNlX21hcHMnO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZSwgZ2V0SW1wb3J0UmV3cml0ZXIsIHN0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWxzJztcblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRGaWxlYC5cbiAqXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0XG4gKiBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmQgYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZW5kZXJlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgc3JjRm9ybWF0dGVyOiBSZW5kZXJpbmdGb3JtYXR0ZXIsXG4gICAgICBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSkge31cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsIHN3aXRjaE1hcmtlckFuYWx5c2VzOiBTd2l0Y2hNYXJrZXJBbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZVRvV3JpdGVbXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBzb3VyY2UgZmlsZXMuXG4gICAgdGhpcy5idW5kbGUuc3JjLnByb2dyYW0uZ2V0U291cmNlRmlsZXMoKS5mb3JFYWNoKHNvdXJjZUZpbGUgPT4ge1xuICAgICAgaWYgKGRlY29yYXRpb25BbmFseXNlcy5oYXMoc291cmNlRmlsZSkgfHwgc3dpdGNoTWFya2VyQW5hbHlzZXMuaGFzKHNvdXJjZUZpbGUpIHx8XG4gICAgICAgICAgc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGUpIHtcbiAgICAgICAgY29uc3QgY29tcGlsZWRGaWxlID0gZGVjb3JhdGlvbkFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgICAgY29uc3Qgc3dpdGNoTWFya2VyQW5hbHlzaXMgPSBzd2l0Y2hNYXJrZXJBbmFseXNlcy5nZXQoc291cmNlRmlsZSk7XG4gICAgICAgIHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckZpbGUoXG4gICAgICAgICAgICBzb3VyY2VGaWxlLCBjb21waWxlZEZpbGUsIHN3aXRjaE1hcmtlckFuYWx5c2lzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgc291cmNlIGNvZGUgYW5kIHNvdXJjZS1tYXAgZm9yIGFuIEFuYWx5emVkIGZpbGUuXG4gICAqIEBwYXJhbSBjb21waWxlZEZpbGUgVGhlIGFuYWx5emVkIGZpbGUgdG8gcmVuZGVyLlxuICAgKiBAcGFyYW0gdGFyZ2V0UGF0aCBUaGUgYWJzb2x1dGUgcGF0aCB3aGVyZSB0aGUgcmVuZGVyZWQgZmlsZSB3aWxsIGJlIHdyaXR0ZW4uXG4gICAqL1xuICByZW5kZXJGaWxlKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRGaWxlOiBDb21waWxlZEZpbGV8dW5kZWZpbmVkLFxuICAgICAgc3dpdGNoTWFya2VyQW5hbHlzaXM6IFN3aXRjaE1hcmtlckFuYWx5c2lzfHVuZGVmaW5lZCxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgaXNFbnRyeVBvaW50ID0gc291cmNlRmlsZSA9PT0gdGhpcy5idW5kbGUuc3JjLmZpbGU7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhzb3VyY2VGaWxlLnRleHQpO1xuXG4gICAgaWYgKHN3aXRjaE1hcmtlckFuYWx5c2lzKSB7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5yZXdyaXRlU3dpdGNoYWJsZURlY2xhcmF0aW9ucyhcbiAgICAgICAgICBvdXRwdXRUZXh0LCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5zb3VyY2VGaWxlLCBzd2l0Y2hNYXJrZXJBbmFseXNpcy5kZWNsYXJhdGlvbnMpO1xuICAgIH1cblxuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgZ2V0SW1wb3J0UmV3cml0ZXIoXG4gICAgICAgICAgICB0aGlzLmJ1bmRsZS5zcmMucjNTeW1ib2xzRmlsZSwgdGhpcy5idW5kbGUuaXNDb3JlLCB0aGlzLmJ1bmRsZS5pc0ZsYXRDb3JlKSxcbiAgICAgICAgSU1QT1JUX1BSRUZJWCk7XG5cbiAgICBpZiAoY29tcGlsZWRGaWxlKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc3RydWN0b3IgcGFyYW0gbWV0YWRhdGEgYW5kIHByb3BlcnR5IGRlY29yYXRvcnMgKHdlIG5lZWQgaW5mbyBmcm9tIHRoZVxuICAgICAgLy8gaGFuZGxlcnMgdG8gZG8gdGhpcylcbiAgICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IHRoaXMuY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzKTtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnJlbW92ZURlY29yYXRvcnMob3V0cHV0VGV4dCwgZGVjb3JhdG9yc1RvUmVtb3ZlKTtcblxuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVyZWREZWZpbml0aW9uID1cbiAgICAgICAgICAgIHRoaXMucmVuZGVyRGVmaW5pdGlvbnMoY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNsYXp6LCBpbXBvcnRNYW5hZ2VyKTtcbiAgICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRGVmaW5pdGlvbnMob3V0cHV0VGV4dCwgY2xhenosIHJlbmRlcmVkRGVmaW5pdGlvbik7XG5cbiAgICAgICAgY29uc3QgcmVuZGVyZWRTdGF0ZW1lbnRzID1cbiAgICAgICAgICAgIHRoaXMucmVuZGVyQWRqYWNlbnRTdGF0ZW1lbnRzKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEFkamFjZW50U3RhdGVtZW50cyhvdXRwdXRUZXh0LCBjbGF6eiwgcmVuZGVyZWRTdGF0ZW1lbnRzKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWlzRW50cnlQb2ludCAmJiBjb21waWxlZEZpbGUucmVleHBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRGlyZWN0RXhwb3J0cyhcbiAgICAgICAgICAgIG91dHB1dFRleHQsIGNvbXBpbGVkRmlsZS5yZWV4cG9ydHMsIGltcG9ydE1hbmFnZXIsIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkQ29uc3RhbnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsXG4gICAgICAgICAgcmVuZGVyQ29uc3RhbnRQb29sKFxuICAgICAgICAgICAgICB0aGlzLnNyY0Zvcm1hdHRlciwgY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZS5jb25zdGFudFBvb2wsIGltcG9ydE1hbmFnZXIpLFxuICAgICAgICAgIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZXhwb3J0cyB0byB0aGUgZW50cnktcG9pbnQgZmlsZVxuICAgIGlmIChpc0VudHJ5UG9pbnQpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEV4cG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgZW50cnlQb2ludEJhc2VQYXRoLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIGltcG9ydE1hbmFnZXIsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGlmIChpc0VudHJ5UG9pbnQgfHwgY29tcGlsZWRGaWxlKSB7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRJbXBvcnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzb3VyY2VGaWxlLmZpbGVOYW1lKSwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcyB8fCBpc0VudHJ5UG9pbnQpIHtcbiAgICAgIHJldHVybiByZW5kZXJTb3VyY2VBbmRNYXAodGhpcy5mcywgc291cmNlRmlsZSwgb3V0cHV0VGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRnJvbSB0aGUgZ2l2ZW4gbGlzdCBvZiBjbGFzc2VzLCBjb21wdXRlcyBhIG1hcCBvZiBkZWNvcmF0b3JzIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAqIFRoZSBkZWNvcmF0b3JzIHRvIHJlbW92ZSBhcmUga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUsIHN1Y2ggdGhhdCB3ZSBjYW4gdGVsbCBpZlxuICAgKiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBlbnRpcmUgZGVjb3JhdG9yIHByb3BlcnR5LlxuICAgKiBAcGFyYW0gY2xhc3NlcyBUaGUgbGlzdCBvZiBjbGFzc2VzIHRoYXQgbWF5IGhhdmUgZGVjb3JhdG9ycyB0byByZW1vdmUuXG4gICAqIEByZXR1cm5zIEEgbWFwIG9mIGRlY29yYXRvcnMgdG8gcmVtb3ZlLCBrZXllZCBieSB0aGVpciBjb250YWluZXIgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZURlY29yYXRvcnNUb1JlbW92ZShjbGFzc2VzOiBDb21waWxlZENsYXNzW10pOiBSZWR1bmRhbnREZWNvcmF0b3JNYXAge1xuICAgIGNvbnN0IGRlY29yYXRvcnNUb1JlbW92ZSA9IG5ldyBSZWR1bmRhbnREZWNvcmF0b3JNYXAoKTtcbiAgICBjbGFzc2VzLmZvckVhY2goY2xhenogPT4ge1xuICAgICAgaWYgKGNsYXp6LmRlY29yYXRvcnMgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjbGF6ei5kZWNvcmF0b3JzLmZvckVhY2goZGVjID0+IHtcbiAgICAgICAgaWYgKGRlYy5ub2RlID09PSBudWxsKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRlY29yYXRvckFycmF5ID0gZGVjLm5vZGUucGFyZW50ICE7XG4gICAgICAgIGlmICghZGVjb3JhdG9yc1RvUmVtb3ZlLmhhcyhkZWNvcmF0b3JBcnJheSkpIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuc2V0KGRlY29yYXRvckFycmF5LCBbZGVjLm5vZGVdKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWNvcmF0b3JzVG9SZW1vdmUuZ2V0KGRlY29yYXRvckFycmF5KSAhLnB1c2goZGVjLm5vZGUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVjb3JhdG9yc1RvUmVtb3ZlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgZGVmaW5pdGlvbnMgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAgICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAgICogQHBhcmFtIGNsYXp6IFRoZSBjbGFzcyB3aG9zZSBkZWZpbml0aW9ucyBhcmUgdG8gYmUgcmVuZGVyZWQuXG4gICAqIEBwYXJhbSBjb21waWxhdGlvbiBUaGUgcmVzdWx0cyBvZiBhbmFseXppbmcgdGhlIGNsYXNzIC0gdGhpcyBpcyB1c2VkIHRvIGdlbmVyYXRlIHRoZSByZW5kZXJlZFxuICAgKiBkZWZpbml0aW9ucy5cbiAgICogQHBhcmFtIGltcG9ydHMgQW4gb2JqZWN0IHRoYXQgdHJhY2tzIHRoZSBpbXBvcnRzIHRoYXQgYXJlIG5lZWRlZCBieSB0aGUgcmVuZGVyZWQgZGVmaW5pdGlvbnMuXG4gICAqL1xuICBwcml2YXRlIHJlbmRlckRlZmluaXRpb25zKFxuICAgICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gICAgY29uc3QgbmFtZSA9IHRoaXMuaG9zdC5nZXRJbnRlcm5hbE5hbWVPZkNsYXNzKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGNvbnN0IHN0YXRlbWVudHM6IFN0YXRlbWVudFtdID0gY29tcGlsZWRDbGFzcy5jb21waWxhdGlvbi5tYXAoXG4gICAgICAgIGMgPT4geyByZXR1cm4gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChuYW1lLCBjLm5hbWUsIGMuaW5pdGlhbGl6ZXIpOyB9KTtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJTdGF0ZW1lbnRzKHNvdXJjZUZpbGUsIHN0YXRlbWVudHMsIGltcG9ydHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0aGUgYWRqYWNlbnQgc3RhdGVtZW50cyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICAgKiBAcGFyYW0gc291cmNlRmlsZSBUaGUgZmlsZSBjb250YWluaW5nIHRoZSBjbGFzcyB0byBwcm9jZXNzLlxuICAgKiBAcGFyYW0gY2xhenogVGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudHMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICAgKiBAcGFyYW0gY29tcGlsYXRpb24gVGhlIHJlc3VsdHMgb2YgYW5hbHl6aW5nIHRoZSBjbGFzcyAtIHRoaXMgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcmVuZGVyZWRcbiAgICogZGVmaW5pdGlvbnMuXG4gICAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICAgKi9cbiAgcHJpdmF0ZSByZW5kZXJBZGphY2VudFN0YXRlbWVudHMoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgYyBvZiBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9uKSB7XG4gICAgICBzdGF0ZW1lbnRzLnB1c2goLi4uYy5zdGF0ZW1lbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyU3RhdGVtZW50cyhzb3VyY2VGaWxlLCBzdGF0ZW1lbnRzLCBpbXBvcnRzKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyU3RhdGVtZW50cyhcbiAgICAgIHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUsIHN0YXRlbWVudHM6IFN0YXRlbWVudFtdLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmludFN0YXRlbWVudCA9IChzdG10OiBTdGF0ZW1lbnQpID0+XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLnByaW50U3RhdGVtZW50KHN0bXQsIHNvdXJjZUZpbGUsIGltcG9ydHMpO1xuICAgIHJldHVybiBzdGF0ZW1lbnRzLm1hcChwcmludFN0YXRlbWVudCkuam9pbignXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZW5kZXIgdGhlIGNvbnN0YW50IHBvb2wgYXMgc291cmNlIGNvZGUgZm9yIHRoZSBnaXZlbiBjbGFzcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckNvbnN0YW50UG9vbChcbiAgICBmb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlciwgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsXG4gICAgaW1wb3J0czogSW1wb3J0TWFuYWdlcik6IHN0cmluZyB7XG4gIGNvbnN0IHByaW50U3RhdGVtZW50ID0gKHN0bXQ6IFN0YXRlbWVudCkgPT4gZm9ybWF0dGVyLnByaW50U3RhdGVtZW50KHN0bXQsIHNvdXJjZUZpbGUsIGltcG9ydHMpO1xuICByZXR1cm4gY29uc3RhbnRQb29sLnN0YXRlbWVudHMubWFwKHByaW50U3RhdGVtZW50KS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gQW5ndWxhciBBU1Qgc3RhdGVtZW50IG5vZGUgdGhhdCBjb250YWlucyB0aGUgYXNzaWdubWVudCBvZiB0aGVcbiAqIGNvbXBpbGVkIGRlY29yYXRvciB0byBiZSBhcHBsaWVkIHRvIHRoZSBjbGFzcy5cbiAqIEBwYXJhbSBhbmFseXplZENsYXNzIFRoZSBpbmZvIGFib3V0IHRoZSBjbGFzcyB3aG9zZSBzdGF0ZW1lbnQgd2Ugd2FudCB0byBjcmVhdGUuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQoXG4gICAgcmVjZWl2ZXJOYW1lOiB0cy5EZWNsYXJhdGlvbk5hbWUsIHByb3BOYW1lOiBzdHJpbmcsIGluaXRpYWxpemVyOiBFeHByZXNzaW9uKTogU3RhdGVtZW50IHtcbiAgY29uc3QgcmVjZWl2ZXIgPSBuZXcgV3JhcHBlZE5vZGVFeHByKHJlY2VpdmVyTmFtZSk7XG4gIHJldHVybiBuZXcgV3JpdGVQcm9wRXhwcihyZWNlaXZlciwgcHJvcE5hbWUsIGluaXRpYWxpemVyKS50b1N0bXQoKTtcbn1cbiJdfQ==