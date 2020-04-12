(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/dts_renderer", ["require", "exports", "tslib", "magic-string", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/constants", "@angular/compiler-cli/ngcc/src/rendering/source_maps", "@angular/compiler-cli/ngcc/src/rendering/utils"], factory);
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
    var magic_string_1 = require("magic-string");
    var ts = require("typescript");
    var translator_1 = require("@angular/compiler-cli/src/ngtsc/translator");
    var constants_1 = require("@angular/compiler-cli/ngcc/src/constants");
    var source_maps_1 = require("@angular/compiler-cli/ngcc/src/rendering/source_maps");
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
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
            this.reexports = [];
        }
        return DtsRenderInfo;
    }());
    /**
     * A base-class for rendering an `AnalyzedFile`.
     *
     * Package formats have output files that must be rendered differently. Concrete sub-classes must
     * implement the `addImports`, `addDefinitions` and `removeDecorators` abstract methods.
     */
    var DtsRenderer = /** @class */ (function () {
        function DtsRenderer(dtsFormatter, fs, logger, host, bundle) {
            this.dtsFormatter = dtsFormatter;
            this.fs = fs;
            this.logger = logger;
            this.host = host;
            this.bundle = bundle;
        }
        DtsRenderer.prototype.renderProgram = function (decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
            var _this = this;
            var renderedFiles = [];
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
        DtsRenderer.prototype.renderDtsFile = function (dtsFile, renderInfo) {
            var e_1, _a;
            var outputText = new magic_string_1.default(dtsFile.text);
            var printer = ts.createPrinter();
            var importManager = new translator_1.ImportManager(utils_1.getImportRewriter(this.bundle.dts.r3SymbolsFile, this.bundle.isCore, false), constants_1.IMPORT_PREFIX);
            renderInfo.classInfo.forEach(function (dtsClass) {
                var endOfClass = dtsClass.dtsDeclaration.getEnd();
                dtsClass.compilation.forEach(function (declaration) {
                    var type = translator_1.translateType(declaration.type, importManager);
                    markForEmitAsSingleLine(type);
                    var typeStr = printer.printNode(ts.EmitHint.Unspecified, type, dtsFile);
                    var newStatement = "    static " + declaration.name + ": " + typeStr + ";\n";
                    outputText.appendRight(endOfClass - 1, newStatement);
                });
            });
            if (renderInfo.reexports.length > 0) {
                try {
                    for (var _b = tslib_1.__values(renderInfo.reexports), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var e = _c.value;
                        var newStatement = "\nexport {" + e.symbolName + " as " + e.asAlias + "} from '" + e.fromModule + "';";
                        outputText.append(newStatement);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            this.dtsFormatter.addModuleWithProvidersParams(outputText, renderInfo.moduleWithProviders, importManager);
            this.dtsFormatter.addExports(outputText, dtsFile.fileName, renderInfo.privateExports, importManager, dtsFile);
            this.dtsFormatter.addImports(outputText, importManager.getAllImports(dtsFile.fileName), dtsFile);
            return source_maps_1.renderSourceAndMap(this.logger, this.fs, dtsFile, outputText);
        };
        DtsRenderer.prototype.getTypingsFilesToRender = function (decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
            var _this = this;
            var dtsMap = new Map();
            // Capture the rendering info from the decoration analyses
            decorationAnalyses.forEach(function (compiledFile) {
                var appliedReexports = false;
                compiledFile.compiledClasses.forEach(function (compiledClass) {
                    var _a;
                    var dtsDeclaration = _this.host.getDtsDeclaration(compiledClass.declaration);
                    if (dtsDeclaration) {
                        var dtsFile = dtsDeclaration.getSourceFile();
                        var renderInfo = dtsMap.has(dtsFile) ? dtsMap.get(dtsFile) : new DtsRenderInfo();
                        renderInfo.classInfo.push({ dtsDeclaration: dtsDeclaration, compilation: compiledClass.compilation });
                        // Only add re-exports if the .d.ts tree is overlayed with the .js tree, as re-exports in
                        // ngcc are only used to support deep imports into e.g. commonjs code. For a deep import
                        // to work, the typing file and JS file must be in parallel trees. This logic will detect
                        // the simplest version of this case, which is sufficient to handle most commonjs
                        // libraries.
                        if (!appliedReexports &&
                            compiledClass.declaration.getSourceFile().fileName ===
                                dtsFile.fileName.replace(/\.d\.ts$/, '.js')) {
                            (_a = renderInfo.reexports).push.apply(_a, tslib_1.__spread(compiledFile.reexports));
                            appliedReexports = true;
                        }
                        dtsMap.set(dtsFile, renderInfo);
                    }
                });
            });
            // Capture the ModuleWithProviders functions/methods that need updating
            if (moduleWithProvidersAnalyses !== null) {
                moduleWithProvidersAnalyses.forEach(function (moduleWithProvidersToFix, dtsFile) {
                    var renderInfo = dtsMap.has(dtsFile) ? dtsMap.get(dtsFile) : new DtsRenderInfo();
                    renderInfo.moduleWithProviders = moduleWithProvidersToFix;
                    dtsMap.set(dtsFile, renderInfo);
                });
            }
            // Capture the private declarations that need to be re-exported
            if (privateDeclarationsAnalyses.length) {
                privateDeclarationsAnalyses.forEach(function (e) {
                    if (!e.dtsFrom) {
                        throw new Error("There is no typings path for " + e.identifier + " in " + e.from + ".\n" +
                            "We need to add an export for this class to a .d.ts typings file because " +
                            "Angular compiler needs to be able to reference this class in compiled code, such as templates.\n" +
                            "The simplest fix for this is to ensure that this class is exported from the package's entry-point.");
                    }
                });
                var dtsEntryPoint = this.bundle.dts.file;
                var renderInfo = dtsMap.has(dtsEntryPoint) ? dtsMap.get(dtsEntryPoint) : new DtsRenderInfo();
                renderInfo.privateExports = privateDeclarationsAnalyses;
                dtsMap.set(dtsEntryPoint, renderInfo);
            }
            return dtsMap;
        };
        return DtsRenderer;
    }());
    exports.DtsRenderer = DtsRenderer;
    function markForEmitAsSingleLine(node) {
        ts.setEmitFlags(node, ts.EmitFlags.SingleLine);
        ts.forEachChild(node, markForEmitAsSingleLine);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9kdHNfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsNkNBQXVDO0lBQ3ZDLCtCQUFpQztJQUtqQyx5RUFBMkU7SUFJM0Usc0VBQTJDO0lBTTNDLG9GQUFpRDtJQUNqRCx3RUFBdUQ7SUFFdkQ7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7WUFDRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztZQUMvQix3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1lBQ3BELG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztZQUNsQyxjQUFTLEdBQWUsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFBRCxvQkFBQztJQUFELENBQUMsQUFMRCxJQUtDO0lBV0Q7Ozs7O09BS0c7SUFDSDtRQUNFLHFCQUNZLFlBQWdDLEVBQVUsRUFBYyxFQUFVLE1BQWMsRUFDaEYsSUFBd0IsRUFBVSxNQUF3QjtZQUQxRCxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7WUFBVSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUNoRixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQUcsQ0FBQztRQUUxRSxtQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQ3RDLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBcUJDO1lBakJDLElBQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7WUFFeEMsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDekMsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsMkJB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TSxDQUFDLEdBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLElBQU0sVUFBVSxHQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ2xGLFVBQVUsQ0FBQyxjQUFjLEdBQUcsMkJBQTJCLENBQUM7Z0JBQ3hELE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ3ZDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTVIRCxJQTRIQztJQTVIWSxrQ0FBVztJQThIeEIsU0FBUyx1QkFBdUIsQ0FBQyxJQUFhO1FBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7SW1wb3J0TWFuYWdlciwgdHJhbnNsYXRlVHlwZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMsIE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtFeHBvcnRJbmZvLCBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcblxuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge3JlbmRlclNvdXJjZUFuZE1hcH0gZnJvbSAnLi9zb3VyY2VfbWFwcyc7XG5pbXBvcnQge0ZpbGVUb1dyaXRlLCBnZXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi91dGlscyc7XG5cbi8qKlxuICogQSBzdHJ1Y3R1cmUgdGhhdCBjYXB0dXJlcyBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IG5lZWRzIHRvIGJlIHJlbmRlcmVkXG4gKiBpbiBhIHR5cGluZ3MgZmlsZS5cbiAqXG4gKiBJdCBpcyBjcmVhdGVkIGFzIGEgcmVzdWx0IG9mIHByb2Nlc3NpbmcgdGhlIGFuYWx5c2lzIHBhc3NlZCB0byB0aGUgcmVuZGVyZXIuXG4gKlxuICogVGhlIGByZW5kZXJEdHNGaWxlKClgIG1ldGhvZCBjb25zdW1lcyBpdCB3aGVuIHJlbmRlcmluZyBhIHR5cGluZ3MgZmlsZS5cbiAqL1xuY2xhc3MgRHRzUmVuZGVySW5mbyB7XG4gIGNsYXNzSW5mbzogRHRzQ2xhc3NJbmZvW10gPSBbXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSA9IFtdO1xuICBwcml2YXRlRXhwb3J0czogRXhwb3J0SW5mb1tdID0gW107XG4gIHJlZXhwb3J0czogUmVleHBvcnRbXSA9IFtdO1xufVxuXG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYSBjbGFzcyBpbiBhIHR5cGluZ3MgZmlsZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBEdHNDbGFzc0luZm8ge1xuICBkdHNEZWNsYXJhdGlvbjogdHMuRGVjbGFyYXRpb247XG4gIGNvbXBpbGF0aW9uOiBDb21waWxlUmVzdWx0W107XG59XG5cbi8qKlxuICogQSBiYXNlLWNsYXNzIGZvciByZW5kZXJpbmcgYW4gYEFuYWx5emVkRmlsZWAuXG4gKlxuICogUGFja2FnZSBmb3JtYXRzIGhhdmUgb3V0cHV0IGZpbGVzIHRoYXQgbXVzdCBiZSByZW5kZXJlZCBkaWZmZXJlbnRseS4gQ29uY3JldGUgc3ViLWNsYXNzZXMgbXVzdFxuICogaW1wbGVtZW50IHRoZSBgYWRkSW1wb3J0c2AsIGBhZGREZWZpbml0aW9uc2AgYW5kIGByZW1vdmVEZWNvcmF0b3JzYCBhYnN0cmFjdCBtZXRob2RzLlxuICovXG5leHBvcnQgY2xhc3MgRHRzUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgZHRzRm9ybWF0dGVyOiBSZW5kZXJpbmdGb3JtYXR0ZXIsIHByaXZhdGUgZnM6IEZpbGVTeXN0ZW0sIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXIsXG4gICAgICBwcml2YXRlIGhvc3Q6IE5nY2NSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpIHt9XG5cbiAgcmVuZGVyUHJvZ3JhbShcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xudWxsKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgcmVuZGVyZWRGaWxlczogRmlsZVRvV3JpdGVbXSA9IFtdO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSAuZC50cyBmaWxlc1xuICAgIGlmICh0aGlzLmJ1bmRsZS5kdHMpIHtcbiAgICAgIGNvbnN0IGR0c0ZpbGVzID0gdGhpcy5nZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihcbiAgICAgICAgICBkZWNvcmF0aW9uQW5hbHlzZXMsIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzKTtcblxuICAgICAgLy8gSWYgdGhlIGR0cyBlbnRyeS1wb2ludCBpcyBub3QgYWxyZWFkeSB0aGVyZSAoaXQgZGlkIG5vdCBoYXZlIGNvbXBpbGVkIGNsYXNzZXMpXG4gICAgICAvLyB0aGVuIGFkZCBpdCBub3csIHRvIGVuc3VyZSBpdCBnZXRzIGl0cyBleHRyYSBleHBvcnRzIHJlbmRlcmVkLlxuICAgICAgaWYgKCFkdHNGaWxlcy5oYXModGhpcy5idW5kbGUuZHRzLmZpbGUpKSB7XG4gICAgICAgIGR0c0ZpbGVzLnNldCh0aGlzLmJ1bmRsZS5kdHMuZmlsZSwgbmV3IER0c1JlbmRlckluZm8oKSk7XG4gICAgICB9XG4gICAgICBkdHNGaWxlcy5mb3JFYWNoKFxuICAgICAgICAgIChyZW5kZXJJbmZvLCBmaWxlKSA9PiByZW5kZXJlZEZpbGVzLnB1c2goLi4udGhpcy5yZW5kZXJEdHNGaWxlKGZpbGUsIHJlbmRlckluZm8pKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkRmlsZXM7XG4gIH1cblxuICByZW5kZXJEdHNGaWxlKGR0c0ZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlbmRlckluZm86IER0c1JlbmRlckluZm8pOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGR0c0ZpbGUudGV4dCk7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIGdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLmR0cyAhLnIzU3ltYm9sc0ZpbGUsIHRoaXMuYnVuZGxlLmlzQ29yZSwgZmFsc2UpLFxuICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLmZvckVhY2goZHRzQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgZW5kT2ZDbGFzcyA9IGR0c0NsYXNzLmR0c0RlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgICAgZHRzQ2xhc3MuY29tcGlsYXRpb24uZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlY2xhcmF0aW9uLnR5cGUsIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICBtYXJrRm9yRW1pdEFzU2luZ2xlTGluZSh0eXBlKTtcbiAgICAgICAgY29uc3QgdHlwZVN0ciA9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0eXBlLCBkdHNGaWxlKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGVtZW50ID0gYCAgICBzdGF0aWMgJHtkZWNsYXJhdGlvbi5uYW1lfTogJHt0eXBlU3RyfTtcXG5gO1xuICAgICAgICBvdXRwdXRUZXh0LmFwcGVuZFJpZ2h0KGVuZE9mQ2xhc3MgLSAxLCBuZXdTdGF0ZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpZiAocmVuZGVySW5mby5yZWV4cG9ydHMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCBlIG9mIHJlbmRlckluZm8ucmVleHBvcnRzKSB7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGBcXG5leHBvcnQgeyR7ZS5zeW1ib2xOYW1lfSBhcyAke2UuYXNBbGlhc319IGZyb20gJyR7ZS5mcm9tTW9kdWxlfSc7YDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmQobmV3U3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKFxuICAgICAgICBvdXRwdXRUZXh0LCByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMsIGltcG9ydE1hbmFnZXIpO1xuICAgIHRoaXMuZHRzRm9ybWF0dGVyLmFkZEV4cG9ydHMoXG4gICAgICAgIG91dHB1dFRleHQsIGR0c0ZpbGUuZmlsZU5hbWUsIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMsIGltcG9ydE1hbmFnZXIsIGR0c0ZpbGUpO1xuICAgIHRoaXMuZHRzRm9ybWF0dGVyLmFkZEltcG9ydHMoXG4gICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhkdHNGaWxlLmZpbGVOYW1lKSwgZHRzRmlsZSk7XG5cbiAgICByZXR1cm4gcmVuZGVyU291cmNlQW5kTWFwKHRoaXMubG9nZ2VyLCB0aGlzLmZzLCBkdHNGaWxlLCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8XG4gICAgICBudWxsKTogTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+IHtcbiAgICBjb25zdCBkdHNNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+KCk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSByZW5kZXJpbmcgaW5mbyBmcm9tIHRoZSBkZWNvcmF0aW9uIGFuYWx5c2VzXG4gICAgZGVjb3JhdGlvbkFuYWx5c2VzLmZvckVhY2goY29tcGlsZWRGaWxlID0+IHtcbiAgICAgIGxldCBhcHBsaWVkUmVleHBvcnRzID0gZmFsc2U7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZHRzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuaGFzKGR0c0ZpbGUpID8gZHRzTWFwLmdldChkdHNGaWxlKSAhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgICByZW5kZXJJbmZvLmNsYXNzSW5mby5wdXNoKHtkdHNEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb259KTtcbiAgICAgICAgICAvLyBPbmx5IGFkZCByZS1leHBvcnRzIGlmIHRoZSAuZC50cyB0cmVlIGlzIG92ZXJsYXllZCB3aXRoIHRoZSAuanMgdHJlZSwgYXMgcmUtZXhwb3J0cyBpblxuICAgICAgICAgIC8vIG5nY2MgYXJlIG9ubHkgdXNlZCB0byBzdXBwb3J0IGRlZXAgaW1wb3J0cyBpbnRvIGUuZy4gY29tbW9uanMgY29kZS4gRm9yIGEgZGVlcCBpbXBvcnRcbiAgICAgICAgICAvLyB0byB3b3JrLCB0aGUgdHlwaW5nIGZpbGUgYW5kIEpTIGZpbGUgbXVzdCBiZSBpbiBwYXJhbGxlbCB0cmVlcy4gVGhpcyBsb2dpYyB3aWxsIGRldGVjdFxuICAgICAgICAgIC8vIHRoZSBzaW1wbGVzdCB2ZXJzaW9uIG9mIHRoaXMgY2FzZSwgd2hpY2ggaXMgc3VmZmljaWVudCB0byBoYW5kbGUgbW9zdCBjb21tb25qc1xuICAgICAgICAgIC8vIGxpYnJhcmllcy5cbiAgICAgICAgICBpZiAoIWFwcGxpZWRSZWV4cG9ydHMgJiZcbiAgICAgICAgICAgICAgY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgPT09XG4gICAgICAgICAgICAgICAgICBkdHNGaWxlLmZpbGVOYW1lLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnLmpzJykpIHtcbiAgICAgICAgICAgIHJlbmRlckluZm8ucmVleHBvcnRzLnB1c2goLi4uY29tcGlsZWRGaWxlLnJlZXhwb3J0cyk7XG4gICAgICAgICAgICBhcHBsaWVkUmVleHBvcnRzID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIGZ1bmN0aW9ucy9tZXRob2RzIHRoYXQgbmVlZCB1cGRhdGluZ1xuICAgIGlmIChtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgIT09IG51bGwpIHtcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcy5mb3JFYWNoKChtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXgsIGR0c0ZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5oYXMoZHRzRmlsZSkgPyBkdHNNYXAuZ2V0KGR0c0ZpbGUpICEgOiBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXg7XG4gICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgcmVuZGVySW5mbyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBwcml2YXRlIGRlY2xhcmF0aW9ucyB0aGF0IG5lZWQgdG8gYmUgcmUtZXhwb3J0ZWRcbiAgICBpZiAocHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmxlbmd0aCkge1xuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIGlmICghZS5kdHNGcm9tKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVGhlcmUgaXMgbm8gdHlwaW5ncyBwYXRoIGZvciAke2UuaWRlbnRpZmllcn0gaW4gJHtlLmZyb219LlxcbmAgK1xuICAgICAgICAgICAgICBgV2UgbmVlZCB0byBhZGQgYW4gZXhwb3J0IGZvciB0aGlzIGNsYXNzIHRvIGEgLmQudHMgdHlwaW5ncyBmaWxlIGJlY2F1c2UgYCArXG4gICAgICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG5lZWRzIHRvIGJlIGFibGUgdG8gcmVmZXJlbmNlIHRoaXMgY2xhc3MgaW4gY29tcGlsZWQgY29kZSwgc3VjaCBhcyB0ZW1wbGF0ZXMuXFxuYCArXG4gICAgICAgICAgICAgIGBUaGUgc2ltcGxlc3QgZml4IGZvciB0aGlzIGlzIHRvIGVuc3VyZSB0aGF0IHRoaXMgY2xhc3MgaXMgZXhwb3J0ZWQgZnJvbSB0aGUgcGFja2FnZSdzIGVudHJ5LXBvaW50LmApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGR0c0VudHJ5UG9pbnQgPSB0aGlzLmJ1bmRsZS5kdHMgIS5maWxlO1xuICAgICAgY29uc3QgcmVuZGVySW5mbyA9XG4gICAgICAgICAgZHRzTWFwLmhhcyhkdHNFbnRyeVBvaW50KSA/IGR0c01hcC5nZXQoZHRzRW50cnlQb2ludCkgISA6IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzID0gcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzO1xuICAgICAgZHRzTWFwLnNldChkdHNFbnRyeVBvaW50LCByZW5kZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZHRzTWFwO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKG5vZGU6IHRzLk5vZGUpIHtcbiAgdHMuc2V0RW1pdEZsYWdzKG5vZGUsIHRzLkVtaXRGbGFncy5TaW5nbGVMaW5lKTtcbiAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKTtcbn1cbiJdfQ==