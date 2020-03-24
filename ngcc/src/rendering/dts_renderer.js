(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/rendering/dts_renderer", ["require", "exports", "tslib", "magic-string", "typescript", "@angular/compiler-cli/src/ngtsc/translator", "@angular/compiler-cli/ngcc/src/constants", "@angular/compiler-cli/ngcc/src/rendering/utils", "@angular/compiler-cli/ngcc/src/rendering/source_maps"], factory);
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
    var utils_1 = require("@angular/compiler-cli/ngcc/src/rendering/utils");
    var source_maps_1 = require("@angular/compiler-cli/ngcc/src/rendering/source_maps");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9kdHNfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsNkNBQXVDO0lBQ3ZDLCtCQUFpQztJQUlqQyx5RUFBMkU7SUFJM0Usc0VBQTJDO0lBSTNDLHdFQUF1RDtJQUV2RCxvRkFBaUQ7SUFFakQ7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7WUFDRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztZQUMvQix3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1lBQ3BELG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztZQUNsQyxjQUFTLEdBQWUsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFBRCxvQkFBQztJQUFELENBQUMsQUFMRCxJQUtDO0lBV0Q7Ozs7O09BS0c7SUFDSDtRQUNFLHFCQUNZLFlBQWdDLEVBQVUsRUFBYyxFQUFVLE1BQWMsRUFDaEYsSUFBd0IsRUFBVSxNQUF3QjtZQUQxRCxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7WUFBVSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUNoRixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQUcsQ0FBQztRQUUxRSxtQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQ3RDLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBcUJDO1lBakJDLElBQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7WUFFeEMsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDekMsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsMkJB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TSxDQUFDLEdBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLElBQU0sVUFBVSxHQUNaLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ2xGLFVBQVUsQ0FBQyxjQUFjLEdBQUcsMkJBQTJCLENBQUM7Z0JBQ3hELE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2FBQ3ZDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUNILGtCQUFDO0lBQUQsQ0FBQyxBQTVIRCxJQTRIQztJQTVIWSxrQ0FBVztJQThIeEIsU0FBUyx1QkFBdUIsQ0FBQyxJQUFhO1FBQzVDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDL0MsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztJQUNqRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IE1hZ2ljU3RyaW5nIGZyb20gJ21hZ2ljLXN0cmluZyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVleHBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge3RyYW5zbGF0ZVR5cGUsIEltcG9ydE1hbmFnZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7RGVjb3JhdGlvbkFuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy90eXBlcyc7XG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnNJbmZvLCBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL21vZHVsZV93aXRoX3Byb3ZpZGVyc19hbmFseXplcic7XG5pbXBvcnQge1ByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcywgRXhwb3J0SW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvcHJpdmF0ZV9kZWNsYXJhdGlvbnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7RW50cnlQb2ludEJ1bmRsZX0gZnJvbSAnLi4vcGFja2FnZXMvZW50cnlfcG9pbnRfYnVuZGxlJztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0ZpbGVUb1dyaXRlLCBnZXRJbXBvcnRSZXdyaXRlcn0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge1JlbmRlcmluZ0Zvcm1hdHRlcn0gZnJvbSAnLi9yZW5kZXJpbmdfZm9ybWF0dGVyJztcbmltcG9ydCB7cmVuZGVyU291cmNlQW5kTWFwfSBmcm9tICcuL3NvdXJjZV9tYXBzJztcblxuLyoqXG4gKiBBIHN0cnVjdHVyZSB0aGF0IGNhcHR1cmVzIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgbmVlZHMgdG8gYmUgcmVuZGVyZWRcbiAqIGluIGEgdHlwaW5ncyBmaWxlLlxuICpcbiAqIEl0IGlzIGNyZWF0ZWQgYXMgYSByZXN1bHQgb2YgcHJvY2Vzc2luZyB0aGUgYW5hbHlzaXMgcGFzc2VkIHRvIHRoZSByZW5kZXJlci5cbiAqXG4gKiBUaGUgYHJlbmRlckR0c0ZpbGUoKWAgbWV0aG9kIGNvbnN1bWVzIGl0IHdoZW4gcmVuZGVyaW5nIGEgdHlwaW5ncyBmaWxlLlxuICovXG5jbGFzcyBEdHNSZW5kZXJJbmZvIHtcbiAgY2xhc3NJbmZvOiBEdHNDbGFzc0luZm9bXSA9IFtdO1xuICBtb2R1bGVXaXRoUHJvdmlkZXJzOiBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb1tdID0gW107XG4gIHByaXZhdGVFeHBvcnRzOiBFeHBvcnRJbmZvW10gPSBbXTtcbiAgcmVleHBvcnRzOiBSZWV4cG9ydFtdID0gW107XG59XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIGNsYXNzIGluIGEgdHlwaW5ncyBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIER0c0NsYXNzSW5mbyB7XG4gIGR0c0RlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbjtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRGaWxlYC5cbiAqXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0XG4gKiBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmQgYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNSZW5kZXJlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBkdHNGb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlciwgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGJ1bmRsZTogRW50cnlQb2ludEJ1bmRsZSkge31cblxuICByZW5kZXJQcm9ncmFtKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfG51bGwpOiBGaWxlVG9Xcml0ZVtdIHtcbiAgICBjb25zdCByZW5kZXJlZEZpbGVzOiBGaWxlVG9Xcml0ZVtdID0gW107XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIC5kLnRzIGZpbGVzXG4gICAgaWYgKHRoaXMuYnVuZGxlLmR0cykge1xuICAgICAgY29uc3QgZHRzRmlsZXMgPSB0aGlzLmdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgICAgIGRlY29yYXRpb25BbmFseXNlcywgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMpO1xuXG4gICAgICAvLyBJZiB0aGUgZHRzIGVudHJ5LXBvaW50IGlzIG5vdCBhbHJlYWR5IHRoZXJlIChpdCBkaWQgbm90IGhhdmUgY29tcGlsZWQgY2xhc3NlcylcbiAgICAgIC8vIHRoZW4gYWRkIGl0IG5vdywgdG8gZW5zdXJlIGl0IGdldHMgaXRzIGV4dHJhIGV4cG9ydHMgcmVuZGVyZWQuXG4gICAgICBpZiAoIWR0c0ZpbGVzLmhhcyh0aGlzLmJ1bmRsZS5kdHMuZmlsZSkpIHtcbiAgICAgICAgZHRzRmlsZXMuc2V0KHRoaXMuYnVuZGxlLmR0cy5maWxlLCBuZXcgRHRzUmVuZGVySW5mbygpKTtcbiAgICAgIH1cbiAgICAgIGR0c0ZpbGVzLmZvckVhY2goXG4gICAgICAgICAgKHJlbmRlckluZm8sIGZpbGUpID0+IHJlbmRlcmVkRmlsZXMucHVzaCguLi50aGlzLnJlbmRlckR0c0ZpbGUoZmlsZSwgcmVuZGVySW5mbykpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRGaWxlcztcbiAgfVxuXG4gIHJlbmRlckR0c0ZpbGUoZHRzRmlsZTogdHMuU291cmNlRmlsZSwgcmVuZGVySW5mbzogRHRzUmVuZGVySW5mbyk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IG91dHB1dFRleHQgPSBuZXcgTWFnaWNTdHJpbmcoZHRzRmlsZS50ZXh0KTtcbiAgICBjb25zdCBwcmludGVyID0gdHMuY3JlYXRlUHJpbnRlcigpO1xuICAgIGNvbnN0IGltcG9ydE1hbmFnZXIgPSBuZXcgSW1wb3J0TWFuYWdlcihcbiAgICAgICAgZ2V0SW1wb3J0UmV3cml0ZXIodGhpcy5idW5kbGUuZHRzICEucjNTeW1ib2xzRmlsZSwgdGhpcy5idW5kbGUuaXNDb3JlLCBmYWxzZSksXG4gICAgICAgIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgcmVuZGVySW5mby5jbGFzc0luZm8uZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIG1hcmtGb3JFbWl0QXNTaW5nbGVMaW5lKHR5cGUpO1xuICAgICAgICBjb25zdCB0eXBlU3RyID0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHR5cGUsIGR0c0ZpbGUpO1xuICAgICAgICBjb25zdCBuZXdTdGF0ZW1lbnQgPSBgICAgIHN0YXRpYyAke2RlY2xhcmF0aW9uLm5hbWV9OiAke3R5cGVTdHJ9O1xcbmA7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kUmlnaHQoZW5kT2ZDbGFzcyAtIDEsIG5ld1N0YXRlbWVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGlmIChyZW5kZXJJbmZvLnJlZXhwb3J0cy5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKGNvbnN0IGUgb2YgcmVuZGVySW5mby5yZWV4cG9ydHMpIHtcbiAgICAgICAgY29uc3QgbmV3U3RhdGVtZW50ID0gYFxcbmV4cG9ydCB7JHtlLnN5bWJvbE5hbWV9IGFzICR7ZS5hc0FsaWFzfX0gZnJvbSAnJHtlLmZyb21Nb2R1bGV9JztgO1xuICAgICAgICBvdXRwdXRUZXh0LmFwcGVuZChuZXdTdGF0ZW1lbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZHRzRm9ybWF0dGVyLmFkZE1vZHVsZVdpdGhQcm92aWRlcnNQYXJhbXMoXG4gICAgICAgIG91dHB1dFRleHQsIHJlbmRlckluZm8ubW9kdWxlV2l0aFByb3ZpZGVycywgaW1wb3J0TWFuYWdlcik7XG4gICAgdGhpcy5kdHNGb3JtYXR0ZXIuYWRkRXhwb3J0cyhcbiAgICAgICAgb3V0cHV0VGV4dCwgZHRzRmlsZS5maWxlTmFtZSwgcmVuZGVySW5mby5wcml2YXRlRXhwb3J0cywgaW1wb3J0TWFuYWdlciwgZHRzRmlsZSk7XG4gICAgdGhpcy5kdHNGb3JtYXR0ZXIuYWRkSW1wb3J0cyhcbiAgICAgICAgb3V0cHV0VGV4dCwgaW1wb3J0TWFuYWdlci5nZXRBbGxJbXBvcnRzKGR0c0ZpbGUuZmlsZU5hbWUpLCBkdHNGaWxlKTtcblxuICAgIHJldHVybiByZW5kZXJTb3VyY2VBbmRNYXAodGhpcy5sb2dnZXIsIHRoaXMuZnMsIGR0c0ZpbGUsIG91dHB1dFRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xcbiAgICAgIG51bGwpOiBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4ge1xuICAgIGNvbnN0IGR0c01hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4oKTtcblxuICAgIC8vIENhcHR1cmUgdGhlIHJlbmRlcmluZyBpbmZvIGZyb20gdGhlIGRlY29yYXRpb24gYW5hbHlzZXNcbiAgICBkZWNvcmF0aW9uQW5hbHlzZXMuZm9yRWFjaChjb21waWxlZEZpbGUgPT4ge1xuICAgICAgbGV0IGFwcGxpZWRSZWV4cG9ydHMgPSBmYWxzZTtcbiAgICAgIGNvbXBpbGVkRmlsZS5jb21waWxlZENsYXNzZXMuZm9yRWFjaChjb21waWxlZENsYXNzID0+IHtcbiAgICAgICAgY29uc3QgZHRzRGVjbGFyYXRpb24gPSB0aGlzLmhvc3QuZ2V0RHRzRGVjbGFyYXRpb24oY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbik7XG4gICAgICAgIGlmIChkdHNEZWNsYXJhdGlvbikge1xuICAgICAgICAgIGNvbnN0IGR0c0ZpbGUgPSBkdHNEZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCk7XG4gICAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5oYXMoZHRzRmlsZSkgPyBkdHNNYXAuZ2V0KGR0c0ZpbGUpICEgOiBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLnB1c2goe2R0c0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogY29tcGlsZWRDbGFzcy5jb21waWxhdGlvbn0pO1xuICAgICAgICAgIC8vIE9ubHkgYWRkIHJlLWV4cG9ydHMgaWYgdGhlIC5kLnRzIHRyZWUgaXMgb3ZlcmxheWVkIHdpdGggdGhlIC5qcyB0cmVlLCBhcyByZS1leHBvcnRzIGluXG4gICAgICAgICAgLy8gbmdjYyBhcmUgb25seSB1c2VkIHRvIHN1cHBvcnQgZGVlcCBpbXBvcnRzIGludG8gZS5nLiBjb21tb25qcyBjb2RlLiBGb3IgYSBkZWVwIGltcG9ydFxuICAgICAgICAgIC8vIHRvIHdvcmssIHRoZSB0eXBpbmcgZmlsZSBhbmQgSlMgZmlsZSBtdXN0IGJlIGluIHBhcmFsbGVsIHRyZWVzLiBUaGlzIGxvZ2ljIHdpbGwgZGV0ZWN0XG4gICAgICAgICAgLy8gdGhlIHNpbXBsZXN0IHZlcnNpb24gb2YgdGhpcyBjYXNlLCB3aGljaCBpcyBzdWZmaWNpZW50IHRvIGhhbmRsZSBtb3N0IGNvbW1vbmpzXG4gICAgICAgICAgLy8gbGlicmFyaWVzLlxuICAgICAgICAgIGlmICghYXBwbGllZFJlZXhwb3J0cyAmJlxuICAgICAgICAgICAgICBjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSA9PT1cbiAgICAgICAgICAgICAgICAgIGR0c0ZpbGUuZmlsZU5hbWUucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcuanMnKSkge1xuICAgICAgICAgICAgcmVuZGVySW5mby5yZWV4cG9ydHMucHVzaCguLi5jb21waWxlZEZpbGUucmVleHBvcnRzKTtcbiAgICAgICAgICAgIGFwcGxpZWRSZWV4cG9ydHMgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIENhcHR1cmUgdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgZnVuY3Rpb25zL21ldGhvZHMgdGhhdCBuZWVkIHVwZGF0aW5nXG4gICAgaWYgKG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyAhPT0gbnVsbCkge1xuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLmZvckVhY2goKG1vZHVsZVdpdGhQcm92aWRlcnNUb0ZpeCwgZHRzRmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmhhcyhkdHNGaWxlKSA/IGR0c01hcC5nZXQoZHRzRmlsZSkgISA6IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICAgIHJlbmRlckluZm8ubW9kdWxlV2l0aFByb3ZpZGVycyA9IG1vZHVsZVdpdGhQcm92aWRlcnNUb0ZpeDtcbiAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENhcHR1cmUgdGhlIHByaXZhdGUgZGVjbGFyYXRpb25zIHRoYXQgbmVlZCB0byBiZSByZS1leHBvcnRlZFxuICAgIGlmIChwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMubGVuZ3RoKSB7XG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMuZm9yRWFjaChlID0+IHtcbiAgICAgICAgaWYgKCFlLmR0c0Zyb20pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBUaGVyZSBpcyBubyB0eXBpbmdzIHBhdGggZm9yICR7ZS5pZGVudGlmaWVyfSBpbiAke2UuZnJvbX0uXFxuYCArXG4gICAgICAgICAgICAgIGBXZSBuZWVkIHRvIGFkZCBhbiBleHBvcnQgZm9yIHRoaXMgY2xhc3MgdG8gYSAuZC50cyB0eXBpbmdzIGZpbGUgYmVjYXVzZSBgICtcbiAgICAgICAgICAgICAgYEFuZ3VsYXIgY29tcGlsZXIgbmVlZHMgdG8gYmUgYWJsZSB0byByZWZlcmVuY2UgdGhpcyBjbGFzcyBpbiBjb21waWxlZCBjb2RlLCBzdWNoIGFzIHRlbXBsYXRlcy5cXG5gICtcbiAgICAgICAgICAgICAgYFRoZSBzaW1wbGVzdCBmaXggZm9yIHRoaXMgaXMgdG8gZW5zdXJlIHRoYXQgdGhpcyBjbGFzcyBpcyBleHBvcnRlZCBmcm9tIHRoZSBwYWNrYWdlJ3MgZW50cnktcG9pbnQuYCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc3QgZHRzRW50cnlQb2ludCA9IHRoaXMuYnVuZGxlLmR0cyAhLmZpbGU7XG4gICAgICBjb25zdCByZW5kZXJJbmZvID1cbiAgICAgICAgICBkdHNNYXAuaGFzKGR0c0VudHJ5UG9pbnQpID8gZHRzTWFwLmdldChkdHNFbnRyeVBvaW50KSAhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMgPSBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM7XG4gICAgICBkdHNNYXAuc2V0KGR0c0VudHJ5UG9pbnQsIHJlbmRlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkdHNNYXA7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUobm9kZTogdHMuTm9kZSkge1xuICB0cy5zZXRFbWl0RmxhZ3Mobm9kZSwgdHMuRW1pdEZsYWdzLlNpbmdsZUxpbmUpO1xuICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUpO1xufVxuIl19