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
            var input = source_maps_1.extractSourceMap(this.fs, this.logger, dtsFile);
            var outputText = new magic_string_1.default(input.source);
            var printer = ts.createPrinter();
            var importManager = new translator_1.ImportManager(utils_1.getImportRewriter(this.bundle.dts.r3SymbolsFile, this.bundle.isCore, false), constants_1.IMPORT_PREFIX);
            renderInfo.classInfo.forEach(function (dtsClass) {
                var e_1, _a;
                var endOfClass = dtsClass.dtsDeclaration.getEnd();
                dtsClass.compilation.forEach(function (declaration) {
                    var type = translator_1.translateType(declaration.type, importManager);
                    var typeStr = printer.printNode(ts.EmitHint.Unspecified, type, dtsFile);
                    var newStatement = "    static " + declaration.name + ": " + typeStr + ";\n";
                    outputText.appendRight(endOfClass - 1, newStatement);
                });
                if (renderInfo.reexports.length > 0) {
                    try {
                        for (var _b = tslib_1.__values(renderInfo.reexports), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var e = _c.value;
                            var newStatement = "\nexport {" + e.symbolName + " as " + e.asAlias + "} from '" + e.fromModule + "';";
                            outputText.appendRight(endOfClass, newStatement);
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
                        if (compiledClass.declaration.getSourceFile().fileName ===
                            dtsFile.fileName.replace(/\.d\.ts$/, '.js')) {
                            (_a = renderInfo.reexports).push.apply(_a, tslib_1.__spread(compiledClass.reexports));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9kdHNfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsNkNBQXVDO0lBQ3ZDLCtCQUFpQztJQUlqQyx5RUFBMkU7SUFJM0Usc0VBQTJDO0lBSTNDLHdFQUF1RDtJQUV2RCxvRkFBbUU7SUFFbkU7Ozs7Ozs7T0FPRztJQUNIO1FBQUE7WUFDRSxjQUFTLEdBQW1CLEVBQUUsQ0FBQztZQUMvQix3QkFBbUIsR0FBOEIsRUFBRSxDQUFDO1lBQ3BELG1CQUFjLEdBQWlCLEVBQUUsQ0FBQztZQUNsQyxjQUFTLEdBQWUsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFBRCxvQkFBQztJQUFELENBQUMsQUFMRCxJQUtDO0lBV0Q7Ozs7O09BS0c7SUFDSDtRQUNFLHFCQUNZLFlBQWdDLEVBQVUsRUFBYyxFQUFVLE1BQWMsRUFDaEYsSUFBd0IsRUFBVSxNQUF3QjtZQUQxRCxpQkFBWSxHQUFaLFlBQVksQ0FBb0I7WUFBVSxPQUFFLEdBQUYsRUFBRSxDQUFZO1lBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBUTtZQUNoRixTQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBQUcsQ0FBQztRQUUxRSxtQ0FBYSxHQUFiLFVBQ0ksa0JBQXNDLEVBQ3RDLDJCQUF3RCxFQUN4RCwyQkFBNkQ7WUFIakUsaUJBcUJDO1lBakJDLElBQU0sYUFBYSxHQUFrQixFQUFFLENBQUM7WUFFeEMsNEJBQTRCO1lBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUU7Z0JBQ25CLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDekMsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsMkJB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SSxDQUFDO2dCQUM3QyxJQUFNLFVBQVUsR0FDWixNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNsRixVQUFVLENBQUMsY0FBYyxHQUFHLDJCQUEyQixDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUF6SEQsSUF5SEM7SUF6SFksa0NBQVciLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtGaWxlU3lzdGVtfSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtSZWV4cG9ydH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuLi8uLi8uLi9zcmMvbmd0c2MvdHJhbnNmb3JtJztcbmltcG9ydCB7dHJhbnNsYXRlVHlwZSwgSW1wb3J0TWFuYWdlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zbGF0b3InO1xuaW1wb3J0IHtEZWNvcmF0aW9uQW5hbHlzZXN9IGZyb20gJy4uL2FuYWx5c2lzL3R5cGVzJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0luZm8sIE1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7UHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLCBFeHBvcnRJbmZvfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge0lNUE9SVF9QUkVGSVh9IGZyb20gJy4uL2NvbnN0YW50cyc7XG5pbXBvcnQge05nY2NSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vaG9zdC9uZ2NjX2hvc3QnO1xuaW1wb3J0IHtFbnRyeVBvaW50QnVuZGxlfSBmcm9tICcuLi9wYWNrYWdlcy9lbnRyeV9wb2ludF9idW5kbGUnO1xuaW1wb3J0IHtMb2dnZXJ9IGZyb20gJy4uL2xvZ2dpbmcvbG9nZ2VyJztcbmltcG9ydCB7RmlsZVRvV3JpdGUsIGdldEltcG9ydFJld3JpdGVyfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuL3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtleHRyYWN0U291cmNlTWFwLCByZW5kZXJTb3VyY2VBbmRNYXB9IGZyb20gJy4vc291cmNlX21hcHMnO1xuXG4vKipcbiAqIEEgc3RydWN0dXJlIHRoYXQgY2FwdHVyZXMgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBuZWVkcyB0byBiZSByZW5kZXJlZFxuICogaW4gYSB0eXBpbmdzIGZpbGUuXG4gKlxuICogSXQgaXMgY3JlYXRlZCBhcyBhIHJlc3VsdCBvZiBwcm9jZXNzaW5nIHRoZSBhbmFseXNpcyBwYXNzZWQgdG8gdGhlIHJlbmRlcmVyLlxuICpcbiAqIFRoZSBgcmVuZGVyRHRzRmlsZSgpYCBtZXRob2QgY29uc3VtZXMgaXQgd2hlbiByZW5kZXJpbmcgYSB0eXBpbmdzIGZpbGUuXG4gKi9cbmNsYXNzIER0c1JlbmRlckluZm8ge1xuICBjbGFzc0luZm86IER0c0NsYXNzSW5mb1tdID0gW107XG4gIG1vZHVsZVdpdGhQcm92aWRlcnM6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10gPSBbXTtcbiAgcHJpdmF0ZUV4cG9ydHM6IEV4cG9ydEluZm9bXSA9IFtdO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W10gPSBbXTtcbn1cblxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgY2xhc3MgaW4gYSB0eXBpbmdzIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRHRzQ2xhc3NJbmZvIHtcbiAgZHRzRGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uO1xuICBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdO1xufVxuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c1JlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGR0c0Zvcm1hdHRlcjogUmVuZGVyaW5nRm9ybWF0dGVyLCBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7fVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbCk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVUb1dyaXRlW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgLmQudHMgZmlsZXNcbiAgICBpZiAodGhpcy5idW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGaWxlcyA9IHRoaXMuZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG5cbiAgICAgIC8vIElmIHRoZSBkdHMgZW50cnktcG9pbnQgaXMgbm90IGFscmVhZHkgdGhlcmUgKGl0IGRpZCBub3QgaGF2ZSBjb21waWxlZCBjbGFzc2VzKVxuICAgICAgLy8gdGhlbiBhZGQgaXQgbm93LCB0byBlbnN1cmUgaXQgZ2V0cyBpdHMgZXh0cmEgZXhwb3J0cyByZW5kZXJlZC5cbiAgICAgIGlmICghZHRzRmlsZXMuaGFzKHRoaXMuYnVuZGxlLmR0cy5maWxlKSkge1xuICAgICAgICBkdHNGaWxlcy5zZXQodGhpcy5idW5kbGUuZHRzLmZpbGUsIG5ldyBEdHNSZW5kZXJJbmZvKCkpO1xuICAgICAgfVxuICAgICAgZHRzRmlsZXMuZm9yRWFjaChcbiAgICAgICAgICAocmVuZGVySW5mbywgZmlsZSkgPT4gcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRHRzRmlsZShmaWxlLCByZW5kZXJJbmZvKSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgcmVuZGVyRHRzRmlsZShkdHNGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZW5kZXJJbmZvOiBEdHNSZW5kZXJJbmZvKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3QgaW5wdXQgPSBleHRyYWN0U291cmNlTWFwKHRoaXMuZnMsIHRoaXMubG9nZ2VyLCBkdHNGaWxlKTtcbiAgICBjb25zdCBvdXRwdXRUZXh0ID0gbmV3IE1hZ2ljU3RyaW5nKGlucHV0LnNvdXJjZSk7XG4gICAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgICBjb25zdCBpbXBvcnRNYW5hZ2VyID0gbmV3IEltcG9ydE1hbmFnZXIoXG4gICAgICAgIGdldEltcG9ydFJld3JpdGVyKHRoaXMuYnVuZGxlLmR0cyAhLnIzU3ltYm9sc0ZpbGUsIHRoaXMuYnVuZGxlLmlzQ29yZSwgZmFsc2UpLFxuICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLmZvckVhY2goZHRzQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgZW5kT2ZDbGFzcyA9IGR0c0NsYXNzLmR0c0RlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgICAgZHRzQ2xhc3MuY29tcGlsYXRpb24uZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlY2xhcmF0aW9uLnR5cGUsIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICBjb25zdCB0eXBlU3RyID0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIHR5cGUsIGR0c0ZpbGUpO1xuICAgICAgICBjb25zdCBuZXdTdGF0ZW1lbnQgPSBgICAgIHN0YXRpYyAke2RlY2xhcmF0aW9uLm5hbWV9OiAke3R5cGVTdHJ9O1xcbmA7XG4gICAgICAgIG91dHB1dFRleHQuYXBwZW5kUmlnaHQoZW5kT2ZDbGFzcyAtIDEsIG5ld1N0YXRlbWVudCk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHJlbmRlckluZm8ucmVleHBvcnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yIChjb25zdCBlIG9mIHJlbmRlckluZm8ucmVleHBvcnRzKSB7XG4gICAgICAgICAgY29uc3QgbmV3U3RhdGVtZW50ID0gYFxcbmV4cG9ydCB7JHtlLnN5bWJvbE5hbWV9IGFzICR7ZS5hc0FsaWFzfX0gZnJvbSAnJHtlLmZyb21Nb2R1bGV9JztgO1xuICAgICAgICAgIG91dHB1dFRleHQuYXBwZW5kUmlnaHQoZW5kT2ZDbGFzcywgbmV3U3RhdGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5kdHNGb3JtYXR0ZXIuYWRkTW9kdWxlV2l0aFByb3ZpZGVyc1BhcmFtcyhcbiAgICAgICAgb3V0cHV0VGV4dCwgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzLCBpbXBvcnRNYW5hZ2VyKTtcbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRFeHBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBkdHNGaWxlLmZpbGVOYW1lLCByZW5kZXJJbmZvLnByaXZhdGVFeHBvcnRzLCBpbXBvcnRNYW5hZ2VyLCBkdHNGaWxlKTtcbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRJbXBvcnRzKFxuICAgICAgICBvdXRwdXRUZXh0LCBpbXBvcnRNYW5hZ2VyLmdldEFsbEltcG9ydHMoZHRzRmlsZS5maWxlTmFtZSksIGR0c0ZpbGUpO1xuXG4gICAgcmV0dXJuIHJlbmRlclNvdXJjZUFuZE1hcChkdHNGaWxlLCBpbnB1dCwgb3V0cHV0VGV4dCk7XG4gIH1cblxuICBwcml2YXRlIGdldFR5cGluZ3NGaWxlc1RvUmVuZGVyKFxuICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzOiBEZWNvcmF0aW9uQW5hbHlzZXMsXG4gICAgICBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM6IFByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcyxcbiAgICAgIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlczogTW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzfFxuICAgICAgbnVsbCk6IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPiB7XG4gICAgY29uc3QgZHRzTWFwID0gbmV3IE1hcDx0cy5Tb3VyY2VGaWxlLCBEdHNSZW5kZXJJbmZvPigpO1xuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcmVuZGVyaW5nIGluZm8gZnJvbSB0aGUgZGVjb3JhdGlvbiBhbmFseXNlc1xuICAgIGRlY29yYXRpb25BbmFseXNlcy5mb3JFYWNoKGNvbXBpbGVkRmlsZSA9PiB7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZHRzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuaGFzKGR0c0ZpbGUpID8gZHRzTWFwLmdldChkdHNGaWxlKSAhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgICByZW5kZXJJbmZvLmNsYXNzSW5mby5wdXNoKHtkdHNEZWNsYXJhdGlvbiwgY29tcGlsYXRpb246IGNvbXBpbGVkQ2xhc3MuY29tcGlsYXRpb259KTtcbiAgICAgICAgICAvLyBPbmx5IGFkZCByZS1leHBvcnRzIGlmIHRoZSAuZC50cyB0cmVlIGlzIG92ZXJsYXllZCB3aXRoIHRoZSAuanMgdHJlZSwgYXMgcmUtZXhwb3J0cyBpblxuICAgICAgICAgIC8vIG5nY2MgYXJlIG9ubHkgdXNlZCB0byBzdXBwb3J0IGRlZXAgaW1wb3J0cyBpbnRvIGUuZy4gY29tbW9uanMgY29kZS4gRm9yIGEgZGVlcCBpbXBvcnRcbiAgICAgICAgICAvLyB0byB3b3JrLCB0aGUgdHlwaW5nIGZpbGUgYW5kIEpTIGZpbGUgbXVzdCBiZSBpbiBwYXJhbGxlbCB0cmVlcy4gVGhpcyBsb2dpYyB3aWxsIGRldGVjdFxuICAgICAgICAgIC8vIHRoZSBzaW1wbGVzdCB2ZXJzaW9uIG9mIHRoaXMgY2FzZSwgd2hpY2ggaXMgc3VmZmljaWVudCB0byBoYW5kbGUgbW9zdCBjb21tb25qc1xuICAgICAgICAgIC8vIGxpYnJhcmllcy5cbiAgICAgICAgICBpZiAoY29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWUgPT09XG4gICAgICAgICAgICAgIGR0c0ZpbGUuZmlsZU5hbWUucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcuanMnKSkge1xuICAgICAgICAgICAgcmVuZGVySW5mby5yZWV4cG9ydHMucHVzaCguLi5jb21waWxlZENsYXNzLnJlZXhwb3J0cyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGR0c01hcC5zZXQoZHRzRmlsZSwgcmVuZGVySW5mbyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gQ2FwdHVyZSB0aGUgTW9kdWxlV2l0aFByb3ZpZGVycyBmdW5jdGlvbnMvbWV0aG9kcyB0aGF0IG5lZWQgdXBkYXRpbmdcbiAgICBpZiAobW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzICE9PSBudWxsKSB7XG4gICAgICBtb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXMuZm9yRWFjaCgobW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4LCBkdHNGaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuaGFzKGR0c0ZpbGUpID8gZHRzTWFwLmdldChkdHNGaWxlKSAhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzID0gbW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4O1xuICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcHJpdmF0ZSBkZWNsYXJhdGlvbnMgdGhhdCBuZWVkIHRvIGJlIHJlLWV4cG9ydGVkXG4gICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5sZW5ndGgpIHtcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAoIWUuZHRzRnJvbSAmJiAhZS5hbGlhcykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZXJlIGlzIG5vIHR5cGluZ3MgcGF0aCBmb3IgJHtlLmlkZW50aWZpZXJ9IGluICR7ZS5mcm9tfS5cXG5gICtcbiAgICAgICAgICAgICAgYFdlIG5lZWQgdG8gYWRkIGFuIGV4cG9ydCBmb3IgdGhpcyBjbGFzcyB0byBhIC5kLnRzIHR5cGluZ3MgZmlsZSBiZWNhdXNlIGAgK1xuICAgICAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBuZWVkcyB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSB0aGlzIGNsYXNzIGluIGNvbXBpbGVkIGNvZGUsIHN1Y2ggYXMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhlIHNpbXBsZXN0IGZpeCBmb3IgdGhpcyBpcyB0byBlbnN1cmUgdGhhdCB0aGlzIGNsYXNzIGlzIGV4cG9ydGVkIGZyb20gdGhlIHBhY2thZ2UncyBlbnRyeS1wb2ludC5gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkdHNFbnRyeVBvaW50ID0gdGhpcy5idW5kbGUuZHRzICEuZmlsZTtcbiAgICAgIGNvbnN0IHJlbmRlckluZm8gPVxuICAgICAgICAgIGR0c01hcC5oYXMoZHRzRW50cnlQb2ludCkgPyBkdHNNYXAuZ2V0KGR0c0VudHJ5UG9pbnQpICEgOiBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgcmVuZGVySW5mby5wcml2YXRlRXhwb3J0cyA9IHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcztcbiAgICAgIGR0c01hcC5zZXQoZHRzRW50cnlQb2ludCwgcmVuZGVySW5mbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGR0c01hcDtcbiAgfVxufVxuIl19