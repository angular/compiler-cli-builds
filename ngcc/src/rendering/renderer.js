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
            var e_1, _a;
            var printer = createPrinter();
            var name = this.host.getInternalNameOfClass(compiledClass.declaration);
            var translate = function (stmt) {
                return translator_1.translateStatement(stmt, imports, imports_1.NOOP_DEFAULT_IMPORT_RECORDER);
            };
            var print = function (stmt) {
                return printer.printNode(ts.EmitHint.Unspecified, translate(stmt), sourceFile);
            };
            var statements = compiledClass.compilation.map(function (c) { return createAssignmentStatement(name, c.name, c.initializer); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvcmVuZGVyaW5nL3JlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDhDQUFzRztJQUN0Ryw2Q0FBdUM7SUFDdkMsK0JBQWlDO0lBQ2pDLG1FQUF3RTtJQUN4RSx5RUFBZ0Y7SUFJaEYsc0VBQTJDO0lBSTNDLHdFQUF1RTtJQUN2RSxvR0FBZ0Y7SUFDaEYsb0ZBQW1FO0lBR25FOzs7OztPQUtHO0lBQ0g7UUFDRSxrQkFDWSxJQUF3QixFQUFVLFlBQWdDLEVBQ2xFLEVBQWMsRUFBVSxNQUFjLEVBQVUsTUFBd0I7WUFEeEUsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7WUFDbEUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQUFHLENBQUM7UUFFeEYsZ0NBQWEsR0FBYixVQUNJLGtCQUFzQyxFQUFFLG9CQUEwQyxFQUNsRiwyQkFBd0Q7WUFGNUQsaUJBaUJDO1lBZEMsSUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztZQUV4Qyw4QkFBOEI7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFVBQVU7Z0JBQ3pELElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7b0JBQzFFLFVBQVUsS0FBSyxLQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7b0JBQ3ZDLElBQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FB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QUE3SUQsSUE2SUM7SUE3SVksNEJBQVE7SUErSXJCOztPQUVHO0lBQ0gsU0FBZ0Isa0JBQWtCLENBQzlCLFVBQXlCLEVBQUUsWUFBMEIsRUFBRSxPQUFzQjtRQUMvRSxJQUFNLE9BQU8sR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNoQyxPQUFPLFlBQVksQ0FBQyxVQUFVO2FBQ3pCLEdBQUcsQ0FBQyxVQUFBLElBQUksSUFBSSxPQUFBLCtCQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsc0NBQTRCLENBQUMsRUFBL0QsQ0FBK0QsQ0FBQzthQUM1RSxHQUFHLENBQUMsVUFBQSxJQUFJLElBQUksT0FBQSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsRUFBNUQsQ0FBNEQsQ0FBQzthQUN6RSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsQ0FBQztJQVBELGdEQU9DO0lBRUQ7Ozs7T0FJRztJQUNILFNBQVMseUJBQXlCLENBQzlCLFlBQWdDLEVBQUUsUUFBZ0IsRUFBRSxXQUF1QjtRQUM3RSxJQUFNLFFBQVEsR0FBRyxJQUFJLDBCQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkQsT0FBTyxJQUFJLHdCQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNyRSxDQUFDO0lBRUQsU0FBUyxhQUFhO1FBQ3BCLE9BQU8sRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7Q29uc3RhbnRQb29sLCBFeHByZXNzaW9uLCBTdGF0ZW1lbnQsIFdyYXBwZWROb2RlRXhwciwgV3JpdGVQcm9wRXhwcn0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Tk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHt0cmFuc2xhdGVTdGF0ZW1lbnQsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7Q29tcGlsZWRDbGFzcywgQ29tcGlsZWRGaWxlLCBEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL3R5cGVzJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge1N3aXRjaE1hcmtlckFuYWx5c2VzLCBTd2l0Y2hNYXJrZXJBbmFseXNpc30gZnJvbSAnLi4vYW5hbHlzaXMvc3dpdGNoX21hcmtlcl9hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge0ZpbGVTeXN0ZW19IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9maWxlX3N5c3RlbSc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZSwgZ2V0SW1wb3J0UmV3cml0ZXIsIHN0cmlwRXh0ZW5zaW9ufSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyLCBSZWR1bmRhbnREZWNvcmF0b3JNYXB9IGZyb20gJy4vcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge2V4dHJhY3RTb3VyY2VNYXAsIHJlbmRlclNvdXJjZUFuZE1hcH0gZnJvbSAnLi9zb3VyY2VfbWFwcyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBzcmNGb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlcixcbiAgICAgIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7fVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcywgc3dpdGNoTWFya2VyQW5hbHlzZXM6IFN3aXRjaE1hcmtlckFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzOiBGaWxlVG9Xcml0ZVtdID0gW107XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIHNvdXJjZSBmaWxlcy5cbiAgICB0aGlzLmJ1bmRsZS5zcmMucHJvZ3JhbS5nZXRTb3VyY2VGaWxlcygpLmZvckVhY2goc291cmNlRmlsZSA9PiB7XG4gICAgICBpZiAoZGVjb3JhdGlvbkFuYWx5c2VzLmhhcyhzb3VyY2VGaWxlKSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNlcy5oYXMoc291cmNlRmlsZSkgfHxcbiAgICAgICAgICBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZSkge1xuICAgICAgICBjb25zdCBjb21waWxlZEZpbGUgPSBkZWNvcmF0aW9uQW5hbHlzZXMuZ2V0KHNvdXJjZUZpbGUpO1xuICAgICAgICBjb25zdCBzd2l0Y2hNYXJrZXJBbmFseXNpcyA9IHN3aXRjaE1hcmtlckFuYWx5c2VzLmdldChzb3VyY2VGaWxlKTtcbiAgICAgICAgcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRmlsZShcbiAgICAgICAgICAgIHNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcykpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBzb3VyY2UgY29kZSBhbmQgc291cmNlLW1hcCBmb3IgYW4gQW5hbHl6ZWQgZmlsZS5cbiAgICogQHBhcmFtIGNvbXBpbGVkRmlsZSBUaGUgYW5hbHl6ZWQgZmlsZSB0byByZW5kZXIuXG4gICAqIEBwYXJhbSB0YXJnZXRQYXRoIFRoZSBhYnNvbHV0ZSBwYXRoIHdoZXJlIHRoZSByZW5kZXJlZCBmaWxlIHdpbGwgYmUgd3JpdHRlbi5cbiAgICovXG4gIHJlbmRlckZpbGUoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZEZpbGU6IENvbXBpbGVkRmlsZXx1bmRlZmluZWQsXG4gICAgICBzd2l0Y2hNYXJrZXJBbmFseXNpczogU3dpdGNoTWFya2VyQW5hbHlzaXN8dW5kZWZpbmVkLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCBpc0VudHJ5UG9pbnQgPSBzb3VyY2VGaWxlID09PSB0aGlzLmJ1bmRsZS5zcmMuZmlsZTtcbiAgICBjb25zdCBpbnB1dCA9IGV4dHJhY3RTb3VyY2VNYXAodGhpcy5mcywgdGhpcy5sb2dnZXIsIHNvdXJjZUZpbGUpO1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoaW5wdXQuc291cmNlKTtcblxuICAgIGlmIChzd2l0Y2hNYXJrZXJBbmFseXNpcykge1xuICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIucmV3cml0ZVN3aXRjaGFibGVEZWNsYXJhdGlvbnMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgc3dpdGNoTWFya2VyQW5hbHlzaXMuc291cmNlRmlsZSwgc3dpdGNoTWFya2VyQW5hbHlzaXMuZGVjbGFyYXRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIGdldEltcG9ydFJld3JpdGVyKFxuICAgICAgICAgICAgdGhpcy5idW5kbGUuc3JjLnIzU3ltYm9sc0ZpbGUsIHRoaXMuYnVuZGxlLmlzQ29yZSwgdGhpcy5idW5kbGUuaXNGbGF0Q29yZSksXG4gICAgICAgIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnN0cnVjdG9yIHBhcmFtIG1ldGFkYXRhIGFuZCBwcm9wZXJ0eSBkZWNvcmF0b3JzICh3ZSBuZWVkIGluZm8gZnJvbSB0aGVcbiAgICAgIC8vIGhhbmRsZXJzIHRvIGRvIHRoaXMpXG4gICAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSB0aGlzLmNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcyk7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5yZW1vdmVEZWNvcmF0b3JzKG91dHB1dFRleHQsIGRlY29yYXRvcnNUb1JlbW92ZSk7XG5cbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjbGF6eiA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVkRGVmaW5pdGlvbiA9XG4gICAgICAgICAgICB0aGlzLnJlbmRlckRlZmluaXRpb25zKGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlLCBjbGF6eiwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZERlZmluaXRpb25zKG91dHB1dFRleHQsIGNsYXp6LCByZW5kZXJlZERlZmluaXRpb24pO1xuXG4gICAgICAgIGlmICghaXNFbnRyeVBvaW50ICYmIGNsYXp6LnJlZXhwb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5zcmNGb3JtYXR0ZXIuYWRkRGlyZWN0RXhwb3J0cyhcbiAgICAgICAgICAgICAgb3V0cHV0VGV4dCwgY2xhenoucmVleHBvcnRzLCBpbXBvcnRNYW5hZ2VyLCBjb21waWxlZEZpbGUuc291cmNlRmlsZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRDb25zdGFudHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCxcbiAgICAgICAgICByZW5kZXJDb25zdGFudFBvb2woY29tcGlsZWRGaWxlLnNvdXJjZUZpbGUsIGNvbXBpbGVkRmlsZS5jb25zdGFudFBvb2wsIGltcG9ydE1hbmFnZXIpLFxuICAgICAgICAgIGNvbXBpbGVkRmlsZS5zb3VyY2VGaWxlKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgZXhwb3J0cyB0byB0aGUgZW50cnktcG9pbnQgZmlsZVxuICAgIGlmIChpc0VudHJ5UG9pbnQpIHtcbiAgICAgIGNvbnN0IGVudHJ5UG9pbnRCYXNlUGF0aCA9IHN0cmlwRXh0ZW5zaW9uKHRoaXMuYnVuZGxlLnNyYy5wYXRoKTtcbiAgICAgIHRoaXMuc3JjRm9ybWF0dGVyLmFkZEV4cG9ydHMoXG4gICAgICAgICAgb3V0cHV0VGV4dCwgZW50cnlQb2ludEJhc2VQYXRoLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIGltcG9ydE1hbmFnZXIsIHNvdXJjZUZpbGUpO1xuICAgIH1cblxuICAgIGlmIChpc0VudHJ5UG9pbnQgfHwgY29tcGlsZWRGaWxlKSB7XG4gICAgICB0aGlzLnNyY0Zvcm1hdHRlci5hZGRJbXBvcnRzKFxuICAgICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhzb3VyY2VGaWxlLmZpbGVOYW1lKSwgc291cmNlRmlsZSk7XG4gICAgfVxuXG4gICAgaWYgKGNvbXBpbGVkRmlsZSB8fCBzd2l0Y2hNYXJrZXJBbmFseXNpcyB8fCBpc0VudHJ5UG9pbnQpIHtcbiAgICAgIHJldHVybiByZW5kZXJTb3VyY2VBbmRNYXAoc291cmNlRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEZyb20gdGhlIGdpdmVuIGxpc3Qgb2YgY2xhc3NlcywgY29tcHV0ZXMgYSBtYXAgb2YgZGVjb3JhdG9ycyB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgKiBUaGUgZGVjb3JhdG9ycyB0byByZW1vdmUgYXJlIGtleWVkIGJ5IHRoZWlyIGNvbnRhaW5lciBub2RlLCBzdWNoIHRoYXQgd2UgY2FuIHRlbGwgaWZcbiAgICogd2Ugc2hvdWxkIHJlbW92ZSB0aGUgZW50aXJlIGRlY29yYXRvciBwcm9wZXJ0eS5cbiAgICogQHBhcmFtIGNsYXNzZXMgVGhlIGxpc3Qgb2YgY2xhc3NlcyB0aGF0IG1heSBoYXZlIGRlY29yYXRvcnMgdG8gcmVtb3ZlLlxuICAgKiBAcmV0dXJucyBBIG1hcCBvZiBkZWNvcmF0b3JzIHRvIHJlbW92ZSwga2V5ZWQgYnkgdGhlaXIgY29udGFpbmVyIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVEZWNvcmF0b3JzVG9SZW1vdmUoY2xhc3NlczogQ29tcGlsZWRDbGFzc1tdKTogUmVkdW5kYW50RGVjb3JhdG9yTWFwIHtcbiAgICBjb25zdCBkZWNvcmF0b3JzVG9SZW1vdmUgPSBuZXcgUmVkdW5kYW50RGVjb3JhdG9yTWFwKCk7XG4gICAgY2xhc3Nlcy5mb3JFYWNoKGNsYXp6ID0+IHtcbiAgICAgIGlmIChjbGF6ei5kZWNvcmF0b3JzID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY2xhenouZGVjb3JhdG9ycy5mb3JFYWNoKGRlYyA9PiB7XG4gICAgICAgIGlmIChkZWMubm9kZSA9PT0gbnVsbCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkZWNvcmF0b3JBcnJheSA9IGRlYy5ub2RlLnBhcmVudCAhO1xuICAgICAgICBpZiAoIWRlY29yYXRvcnNUb1JlbW92ZS5oYXMoZGVjb3JhdG9yQXJyYXkpKSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLnNldChkZWNvcmF0b3JBcnJheSwgW2RlYy5ub2RlXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVjb3JhdG9yc1RvUmVtb3ZlLmdldChkZWNvcmF0b3JBcnJheSkgIS5wdXNoKGRlYy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlY29yYXRvcnNUb1JlbW92ZTtcbiAgfVxuXG4gIC8qKlxuICogUmVuZGVyIHRoZSBkZWZpbml0aW9ucyBhcyBzb3VyY2UgY29kZSBmb3IgdGhlIGdpdmVuIGNsYXNzLlxuICogQHBhcmFtIHNvdXJjZUZpbGUgVGhlIGZpbGUgY29udGFpbmluZyB0aGUgY2xhc3MgdG8gcHJvY2Vzcy5cbiAqIEBwYXJhbSBjbGF6eiBUaGUgY2xhc3Mgd2hvc2UgZGVmaW5pdGlvbnMgYXJlIHRvIGJlIHJlbmRlcmVkLlxuICogQHBhcmFtIGNvbXBpbGF0aW9uIFRoZSByZXN1bHRzIG9mIGFuYWx5emluZyB0aGUgY2xhc3MgLSB0aGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHJlbmRlcmVkXG4gKiBkZWZpbml0aW9ucy5cbiAqIEBwYXJhbSBpbXBvcnRzIEFuIG9iamVjdCB0aGF0IHRyYWNrcyB0aGUgaW1wb3J0cyB0aGF0IGFyZSBuZWVkZWQgYnkgdGhlIHJlbmRlcmVkIGRlZmluaXRpb25zLlxuICovXG4gIHByaXZhdGUgcmVuZGVyRGVmaW5pdGlvbnMoXG4gICAgICBzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlLCBjb21waWxlZENsYXNzOiBDb21waWxlZENsYXNzLCBpbXBvcnRzOiBJbXBvcnRNYW5hZ2VyKTogc3RyaW5nIHtcbiAgICBjb25zdCBwcmludGVyID0gY3JlYXRlUHJpbnRlcigpO1xuICAgIGNvbnN0IG5hbWUgPSB0aGlzLmhvc3QuZ2V0SW50ZXJuYWxOYW1lT2ZDbGFzcyhjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICBjb25zdCB0cmFuc2xhdGUgPSAoc3RtdDogU3RhdGVtZW50KSA9PlxuICAgICAgICB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUik7XG4gICAgY29uc3QgcHJpbnQgPSAoc3RtdDogU3RhdGVtZW50KSA9PlxuICAgICAgICBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdHJhbnNsYXRlKHN0bXQpLCBzb3VyY2VGaWxlKTtcbiAgICBjb25zdCBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb24ubWFwKFxuICAgICAgICBjID0+IHsgcmV0dXJuIGNyZWF0ZUFzc2lnbm1lbnRTdGF0ZW1lbnQobmFtZSwgYy5uYW1lLCBjLmluaXRpYWxpemVyKTsgfSk7XG4gICAgZm9yIChjb25zdCBjIG9mIGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb24pIHtcbiAgICAgIHN0YXRlbWVudHMucHVzaCguLi5jLnN0YXRlbWVudHMpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhdGVtZW50cy5tYXAocHJpbnQpLmpvaW4oJ1xcbicpO1xuICB9XG59XG5cbi8qKlxuICogUmVuZGVyIHRoZSBjb25zdGFudCBwb29sIGFzIHNvdXJjZSBjb2RlIGZvciB0aGUgZ2l2ZW4gY2xhc3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJDb25zdGFudFBvb2woXG4gICAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZSwgY29uc3RhbnRQb29sOiBDb25zdGFudFBvb2wsIGltcG9ydHM6IEltcG9ydE1hbmFnZXIpOiBzdHJpbmcge1xuICBjb25zdCBwcmludGVyID0gY3JlYXRlUHJpbnRlcigpO1xuICByZXR1cm4gY29uc3RhbnRQb29sLnN0YXRlbWVudHNcbiAgICAgIC5tYXAoc3RtdCA9PiB0cmFuc2xhdGVTdGF0ZW1lbnQoc3RtdCwgaW1wb3J0cywgTk9PUF9ERUZBVUxUX0lNUE9SVF9SRUNPUkRFUikpXG4gICAgICAubWFwKHN0bXQgPT4gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHN0bXQsIHNvdXJjZUZpbGUpKVxuICAgICAgLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBBbmd1bGFyIEFTVCBzdGF0ZW1lbnQgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBhc3NpZ25tZW50IG9mIHRoZVxuICogY29tcGlsZWQgZGVjb3JhdG9yIHRvIGJlIGFwcGxpZWQgdG8gdGhlIGNsYXNzLlxuICogQHBhcmFtIGFuYWx5emVkQ2xhc3MgVGhlIGluZm8gYWJvdXQgdGhlIGNsYXNzIHdob3NlIHN0YXRlbWVudCB3ZSB3YW50IHRvIGNyZWF0ZS5cbiAqL1xuZnVuY3Rpb24gY3JlYXRlQXNzaWdubWVudFN0YXRlbWVudChcbiAgICByZWNlaXZlck5hbWU6IHRzLkRlY2xhcmF0aW9uTmFtZSwgcHJvcE5hbWU6IHN0cmluZywgaW5pdGlhbGl6ZXI6IEV4cHJlc3Npb24pOiBTdGF0ZW1lbnQge1xuICBjb25zdCByZWNlaXZlciA9IG5ldyBXcmFwcGVkTm9kZUV4cHIocmVjZWl2ZXJOYW1lKTtcbiAgcmV0dXJuIG5ldyBXcml0ZVByb3BFeHByKHJlY2VpdmVyLCBwcm9wTmFtZSwgaW5pdGlhbGl6ZXIpLnRvU3RtdCgpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQcmludGVyKCk6IHRzLlByaW50ZXIge1xuICByZXR1cm4gdHMuY3JlYXRlUHJpbnRlcih7bmV3TGluZTogdHMuTmV3TGluZUtpbmQuTGluZUZlZWR9KTtcbn1cbiJdfQ==