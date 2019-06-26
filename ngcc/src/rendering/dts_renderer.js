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
        function DtsRenderer(dtsFormatter, fs, logger, host, isCore, bundle) {
            this.dtsFormatter = dtsFormatter;
            this.fs = fs;
            this.logger = logger;
            this.host = host;
            this.isCore = isCore;
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
            var input = source_maps_1.extractSourceMap(this.fs, this.logger, dtsFile);
            var outputText = new magic_string_1.default(input.source);
            var printer = ts.createPrinter();
            var importManager = new translator_1.ImportManager(utils_1.getImportRewriter(this.bundle.dts.r3SymbolsFile, this.isCore, false), constants_1.IMPORT_PREFIX);
            renderInfo.classInfo.forEach(function (dtsClass) {
                var endOfClass = dtsClass.dtsDeclaration.getEnd();
                dtsClass.compilation.forEach(function (declaration) {
                    var type = translator_1.translateType(declaration.type, importManager);
                    var typeStr = printer.printNode(ts.EmitHint.Unspecified, type, dtsFile);
                    var newStatement = "    static " + declaration.name + ": " + typeStr + ";\n";
                    outputText.appendRight(endOfClass - 1, newStatement);
                });
            });
            this.dtsFormatter.addModuleWithProvidersParams(outputText, renderInfo.moduleWithProviders, importManager);
            this.dtsFormatter.addExports(outputText, dtsFile.fileName, renderInfo.privateExports, importManager, dtsFile);
            this.dtsFormatter.addImports(outputText, importManager.getAllImports(dtsFile.fileName), dtsFile);
            return source_maps_1.renderSourceAndMap(dtsFile, input, outputText);
        };
        DtsRenderer.prototype.getTypingsFilesToRender = function (decorationAnalyses, privateDeclarationsAnalyses, moduleWithProvidersAnalyses) {
            var _this = this;
            var dtsMap = new Map();
            // Capture the rendering info from the decoration analyses
            decorationAnalyses.forEach(function (compiledFile) {
                compiledFile.compiledClasses.forEach(function (compiledClass) {
                    var dtsDeclaration = _this.host.getDtsDeclaration(compiledClass.declaration);
                    if (dtsDeclaration) {
                        var dtsFile = dtsDeclaration.getSourceFile();
                        var renderInfo = dtsMap.has(dtsFile) ? dtsMap.get(dtsFile) : new DtsRenderInfo();
                        renderInfo.classInfo.push({ dtsDeclaration: dtsDeclaration, compilation: compiledClass.compilation });
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
                    if (!e.dtsFrom && !e.alias) {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9kdHNfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsNkNBQXVDO0lBQ3ZDLCtCQUFpQztJQUdqQyx5RUFBMkU7SUFJM0Usc0VBQTJDO0lBSTNDLHdFQUF1RDtJQUV2RCxvRkFBbUU7SUFFbkU7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7WUFDRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztZQUMvQix3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1lBQ3BELG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBQUQsb0JBQUM7SUFBRCxDQUFDLEFBSkQsSUFJQztJQVdEOzs7OztPQUtHO0lBQ0g7UUFDRSxxQkFDWSxZQUFnQyxFQUFVLEVBQWMsRUFBVSxNQUFjLEVBQ2hGLElBQXdCLEVBQVUsTUFBZSxFQUFVLE1BQXdCO1lBRG5GLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtZQUFVLE9BQUUsR0FBRixFQUFFLENBQVk7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFRO1lBQ2hGLFNBQUksR0FBSixJQUFJLENBQW9CO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUztZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQy9GLENBQUM7UUFFRCxtQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQ3RDLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBcUJDO1lBakJDLElBQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7WUFFeEMsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDekMsa0JBQWtCLEVBQUUsMkJBQTJC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SUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3RDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxVQUFBLENBQUM7b0JBQ25DLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTt3QkFDMUIsTUFBTSxJQUFJLEtBQUssQ0FDWCxrQ0FBZ0MsQ0FBQyxDQUFDLFVBQVUsWUFBTyxDQUFDLENBQUMsSUFBSSxRQUFLOzRCQUM5RCwwRUFBMEU7NEJBQzFFLGtHQUFrRzs0QkFDbEcsb0dBQW9HLENBQUMsQ0FBQztxQkFDM0c7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFLLENBQUMsSUFBSSxDQUFDO2dCQUM3QyxJQUFNLFVBQVUsR0FDWixNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsRixVQUFVLENBQUMsY0FBYyxHQUFHLDJCQUEyQixDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUEzR0QsSUEyR0M7SUEzR1ksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7dHJhbnNsYXRlVHlwZSwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzSW5mbywgTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9tb2R1bGVfd2l0aF9wcm92aWRlcnNfYW5hbHl6ZXInO1xuaW1wb3J0IHtQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIEV4cG9ydEluZm99IGZyb20gJy4uL2FuYWx5c2lzL3ByaXZhdGVfZGVjbGFyYXRpb25zX2FuYWx5emVyJztcbmltcG9ydCB7SU1QT1JUX1BSRUZJWH0gZnJvbSAnLi4vY29uc3RhbnRzJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5pbXBvcnQge0xvZ2dlcn0gZnJvbSAnLi4vbG9nZ2luZy9sb2dnZXInO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZSwgZ2V0SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtSZW5kZXJpbmdGb3JtYXR0ZXJ9IGZyb20gJy4vcmVuZGVyaW5nX2Zvcm1hdHRlcic7XG5pbXBvcnQge2V4dHJhY3RTb3VyY2VNYXAsIHJlbmRlclNvdXJjZUFuZE1hcH0gZnJvbSAnLi9zb3VyY2VfbWFwcyc7XG5cbi8qKlxuICogQSBzdHJ1Y3R1cmUgdGhhdCBjYXB0dXJlcyBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IG5lZWRzIHRvIGJlIHJlbmRlcmVkXG4gKiBpbiBhIHR5cGluZ3MgZmlsZS5cbiAqXG4gKiBJdCBpcyBjcmVhdGVkIGFzIGEgcmVzdWx0IG9mIHByb2Nlc3NpbmcgdGhlIGFuYWx5c2lzIHBhc3NlZCB0byB0aGUgcmVuZGVyZXIuXG4gKlxuICogVGhlIGByZW5kZXJEdHNGaWxlKClgIG1ldGhvZCBjb25zdW1lcyBpdCB3aGVuIHJlbmRlcmluZyBhIHR5cGluZ3MgZmlsZS5cbiAqL1xuY2xhc3MgRHRzUmVuZGVySW5mbyB7XG4gIGNsYXNzSW5mbzogRHRzQ2xhc3NJbmZvW10gPSBbXTtcbiAgbW9kdWxlV2l0aFByb3ZpZGVyczogTW9kdWxlV2l0aFByb3ZpZGVyc0luZm9bXSA9IFtdO1xuICBwcml2YXRlRXhwb3J0czogRXhwb3J0SW5mb1tdID0gW107XG59XG5cblxuLyoqXG4gKiBJbmZvcm1hdGlvbiBhYm91dCBhIGNsYXNzIGluIGEgdHlwaW5ncyBmaWxlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIER0c0NsYXNzSW5mbyB7XG4gIGR0c0RlY2xhcmF0aW9uOiB0cy5EZWNsYXJhdGlvbjtcbiAgY29tcGlsYXRpb246IENvbXBpbGVSZXN1bHRbXTtcbn1cblxuLyoqXG4gKiBBIGJhc2UtY2xhc3MgZm9yIHJlbmRlcmluZyBhbiBgQW5hbHl6ZWRGaWxlYC5cbiAqXG4gKiBQYWNrYWdlIGZvcm1hdHMgaGF2ZSBvdXRwdXQgZmlsZXMgdGhhdCBtdXN0IGJlIHJlbmRlcmVkIGRpZmZlcmVudGx5LiBDb25jcmV0ZSBzdWItY2xhc3NlcyBtdXN0XG4gKiBpbXBsZW1lbnQgdGhlIGBhZGRJbXBvcnRzYCwgYGFkZERlZmluaXRpb25zYCBhbmQgYHJlbW92ZURlY29yYXRvcnNgIGFic3RyYWN0IG1ldGhvZHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBEdHNSZW5kZXJlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBkdHNGb3JtYXR0ZXI6IFJlbmRlcmluZ0Zvcm1hdHRlciwgcHJpdmF0ZSBmczogRmlsZVN5c3RlbSwgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcixcbiAgICAgIHByaXZhdGUgaG9zdDogTmdjY1JlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbiwgcHJpdmF0ZSBidW5kbGU6IEVudHJ5UG9pbnRCdW5kbGUpIHtcbiAgfVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbCk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVUb1dyaXRlW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgLmQudHMgZmlsZXNcbiAgICBpZiAodGhpcy5idW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGaWxlcyA9IHRoaXMuZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG5cbiAgICAgIC8vIElmIHRoZSBkdHMgZW50cnktcG9pbnQgaXMgbm90IGFscmVhZHkgdGhlcmUgKGl0IGRpZCBub3QgaGF2ZSBjb21waWxlZCBjbGFzc2VzKVxuICAgICAgLy8gdGhlbiBhZGQgaXQgbm93LCB0byBlbnN1cmUgaXQgZ2V0cyBpdHMgZXh0cmEgZXhwb3J0cyByZW5kZXJlZC5cbiAgICAgIGlmICghZHRzRmlsZXMuaGFzKHRoaXMuYnVuZGxlLmR0cy5maWxlKSkge1xuICAgICAgICBkdHNGaWxlcy5zZXQodGhpcy5idW5kbGUuZHRzLmZpbGUsIG5ldyBEdHNSZW5kZXJJbmZvKCkpO1xuICAgICAgfVxuICAgICAgZHRzRmlsZXMuZm9yRWFjaChcbiAgICAgICAgICAocmVuZGVySW5mbywgZmlsZSkgPT4gcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRHRzRmlsZShmaWxlLCByZW5kZXJJbmZvKSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgcmVuZGVyRHRzRmlsZShkdHNGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZW5kZXJJbmZvOiBEdHNSZW5kZXJJbmZvKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgaW5wdXQgPSBleHRyYWN0U291cmNlTWFwKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBkdHNGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIGdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLmR0cyAhLnIzU3ltYm9sc0ZpbGUsIHRoaXMuaXNDb3JlLCBmYWxzZSksIElNUE9SVF9QUkVGSVgpO1xuXG4gICAgcmVuZGVySW5mby5jbGFzc0luZm8uZm9yRWFjaChkdHNDbGFzcyA9PiB7XG4gICAgICBjb25zdCBlbmRPZkNsYXNzID0gZHRzQ2xhc3MuZHRzRGVjbGFyYXRpb24uZ2V0RW5kKCk7XG4gICAgICBkdHNDbGFzcy5jb21waWxhdGlvbi5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHRyYW5zbGF0ZVR5cGUoZGVjbGFyYXRpb24udHlwZSwgaW1wb3J0TWFuYWdlcik7XG4gICAgICAgIGNvbnN0IHR5cGVTdHIgPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgdHlwZSwgZHRzRmlsZSk7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGAgICAgc3RhdGljICR7ZGVjbGFyYXRpb24ubmFtZX06ICR7dHlwZVN0cn07XFxuYDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmRSaWdodChlbmRPZkNsYXNzIC0gMSwgbmV3U3RhdGVtZW50KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kdHNGb3JtYXR0ZXIuYWRkTW9kdWxlV2l0aFByb3ZpZGVyc1BhcmFtcyhcbiAgICAgICAgb3V0cHV0VGV4dCwgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzLCBpbXBvcnRNYW5hZ2VyKTtcbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRFeHBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBkdHNGaWxlLmZpbGVOYW1lLCByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzLCBpbXBvcnRNYW5hZ2VyLCBkdHNGaWxlKTtcbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRJbXBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZHRzRmlsZS5maWxlTmFtZSksIGR0c0ZpbGUpO1xuXG5cblxuICAgIHJldHVybiByZW5kZXJTb3VyY2VBbmRNYXAoZHRzRmlsZSwgaW5wdXQsIG91dHB1dFRleHQpO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUeXBpbmdzRmlsZXNUb1JlbmRlcihcbiAgICAgIGRlY29yYXRpb25BbmFseXNlczogRGVjb3JhdGlvbkFuYWx5c2VzLFxuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzOiBQcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsXG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXM6IE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc3xcbiAgICAgIG51bGwpOiBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4ge1xuICAgIGNvbnN0IGR0c01hcCA9IG5ldyBNYXA8dHMuU291cmNlRmlsZSwgRHRzUmVuZGVySW5mbz4oKTtcblxuICAgIC8vIENhcHR1cmUgdGhlIHJlbmRlcmluZyBpbmZvIGZyb20gdGhlIGRlY29yYXRpb24gYW5hbHlzZXNcbiAgICBkZWNvcmF0aW9uQW5hbHlzZXMuZm9yRWFjaChjb21waWxlZEZpbGUgPT4ge1xuICAgICAgY29tcGlsZWRGaWxlLmNvbXBpbGVkQ2xhc3Nlcy5mb3JFYWNoKGNvbXBpbGVkQ2xhc3MgPT4ge1xuICAgICAgICBjb25zdCBkdHNEZWNsYXJhdGlvbiA9IHRoaXMuaG9zdC5nZXREdHNEZWNsYXJhdGlvbihjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uKTtcbiAgICAgICAgaWYgKGR0c0RlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgY29uc3QgZHRzRmlsZSA9IGR0c0RlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKTtcbiAgICAgICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmhhcyhkdHNGaWxlKSA/IGR0c01hcC5nZXQoZHRzRmlsZSkgISA6IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICAgICAgcmVuZGVySW5mby5jbGFzc0luZm8ucHVzaCh7ZHRzRGVjbGFyYXRpb24sIGNvbXBpbGF0aW9uOiBjb21waWxlZENsYXNzLmNvbXBpbGF0aW9ufSk7XG4gICAgICAgICAgZHRzTWFwLnNldChkdHNGaWxlLCByZW5kZXJJbmZvKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBNb2R1bGVXaXRoUHJvdmlkZXJzIGZ1bmN0aW9ucy9tZXRob2RzIHRoYXQgbmVlZCB1cGRhdGluZ1xuICAgIGlmIChtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMgIT09IG51bGwpIHtcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcy5mb3JFYWNoKChtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXgsIGR0c0ZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVuZGVySW5mbyA9IGR0c01hcC5oYXMoZHRzRmlsZSkgPyBkdHNNYXAuZ2V0KGR0c0ZpbGUpICEgOiBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMgPSBtb2R1bGVXaXRoUHJvdmlkZXJzVG9GaXg7XG4gICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgcmVuZGVySW5mbyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBDYXB0dXJlIHRoZSBwcml2YXRlIGRlY2xhcmF0aW9ucyB0aGF0IG5lZWQgdG8gYmUgcmUtZXhwb3J0ZWRcbiAgICBpZiAocHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmxlbmd0aCkge1xuICAgICAgcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLmZvckVhY2goZSA9PiB7XG4gICAgICAgIGlmICghZS5kdHNGcm9tICYmICFlLmFsaWFzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgVGhlcmUgaXMgbm8gdHlwaW5ncyBwYXRoIGZvciAke2UuaWRlbnRpZmllcn0gaW4gJHtlLmZyb219LlxcbmAgK1xuICAgICAgICAgICAgICBgV2UgbmVlZCB0byBhZGQgYW4gZXhwb3J0IGZvciB0aGlzIGNsYXNzIHRvIGEgLmQudHMgdHlwaW5ncyBmaWxlIGJlY2F1c2UgYCArXG4gICAgICAgICAgICAgIGBBbmd1bGFyIGNvbXBpbGVyIG5lZWRzIHRvIGJlIGFibGUgdG8gcmVmZXJlbmNlIHRoaXMgY2xhc3MgaW4gY29tcGlsZWQgY29kZSwgc3VjaCBhcyB0ZW1wbGF0ZXMuXFxuYCArXG4gICAgICAgICAgICAgIGBUaGUgc2ltcGxlc3QgZml4IGZvciB0aGlzIGlzIHRvIGVuc3VyZSB0aGF0IHRoaXMgY2xhc3MgaXMgZXhwb3J0ZWQgZnJvbSB0aGUgcGFja2FnZSdzIGVudHJ5LXBvaW50LmApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGR0c0VudHJ5UG9pbnQgPSB0aGlzLmJ1bmRsZS5kdHMgIS5maWxlO1xuICAgICAgY29uc3QgcmVuZGVySW5mbyA9XG4gICAgICAgICAgZHRzTWFwLmhhcyhkdHNFbnRyeVBvaW50KSA/IGR0c01hcC5nZXQoZHRzRW50cnlQb2ludCkgISA6IG5ldyBEdHNSZW5kZXJJbmZvKCk7XG4gICAgICByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzID0gcHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzO1xuICAgICAgZHRzTWFwLnNldChkdHNFbnRyeVBvaW50LCByZW5kZXJJbmZvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZHRzTWFwO1xuICB9XG59XG4iXX0=