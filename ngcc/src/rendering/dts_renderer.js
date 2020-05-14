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
    exports.DtsRenderer = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHRzX3JlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL25nY2Mvc3JjL3JlbmRlcmluZy9kdHNfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILDZDQUF1QztJQUN2QywrQkFBaUM7SUFLakMseUVBQTJFO0lBSTNFLHNFQUEyQztJQU0zQyxvRkFBaUQ7SUFDakQsd0VBQXVEO0lBRXZEOzs7Ozs7O09BT0c7SUFDSDtRQUFBO1lBQ0UsY0FBUyxHQUFtQixFQUFFLENBQUM7WUFDL0Isd0JBQW1CLEdBQThCLEVBQUUsQ0FBQztZQUNwRCxtQkFBYyxHQUFpQixFQUFFLENBQUM7WUFDbEMsY0FBUyxHQUFlLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQUQsb0JBQUM7SUFBRCxDQUFDLEFBTEQsSUFLQztJQVdEOzs7OztPQUtHO0lBQ0g7UUFDRSxxQkFDWSxZQUFnQyxFQUFVLEVBQWMsRUFBVSxNQUFjLEVBQ2hGLElBQXdCLEVBQVUsTUFBd0I7WUFEMUQsaUJBQVksR0FBWixZQUFZLENBQW9CO1lBQVUsT0FBRSxHQUFGLEVBQUUsQ0FBWTtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVE7WUFDaEYsU0FBSSxHQUFKLElBQUksQ0FBb0I7WUFBVSxXQUFNLEdBQU4sTUFBTSxDQUFrQjtRQUFHLENBQUM7UUFFMUUsbUNBQWEsR0FBYixVQUNJLGtCQUFzQyxFQUN0QywyQkFBd0QsRUFDeEQsMkJBQTZEO1lBSGpFLGlCQXFCQztZQWpCQyxJQUFNLGFBQWEsR0FBa0IsRUFBRSxDQUFDO1lBRXhDLDRCQUE0QjtZQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO2dCQUNuQixJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQ3pDLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLDJC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QU0sQ0FBQyxHQUFJLENBQUMsSUFBSSxDQUFDO2dCQUM1QyxJQUFNLFVBQVUsR0FDWixNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNqRixVQUFVLENBQUMsY0FBYyxHQUFHLDJCQUEyQixDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFDSCxrQkFBQztJQUFELENBQUMsQUE1SEQsSUE0SEM7SUE1SFksa0NBQVc7SUE4SHhCLFNBQVMsdUJBQXVCLENBQUMsSUFBYTtRQUM1QyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9DLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDakQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCBNYWdpY1N0cmluZyBmcm9tICdtYWdpYy1zdHJpbmcnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RmlsZVN5c3RlbX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ZpbGVfc3lzdGVtJztcbmltcG9ydCB7UmVleHBvcnR9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9pbXBvcnRzJztcbmltcG9ydCB7Q29tcGlsZVJlc3VsdH0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL3RyYW5zZm9ybSc7XG5pbXBvcnQge0ltcG9ydE1hbmFnZXIsIHRyYW5zbGF0ZVR5cGV9IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy90cmFuc2xhdG9yJztcbmltcG9ydCB7TW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLCBNb2R1bGVXaXRoUHJvdmlkZXJzSW5mb30gZnJvbSAnLi4vYW5hbHlzaXMvbW9kdWxlX3dpdGhfcHJvdmlkZXJzX2FuYWx5emVyJztcbmltcG9ydCB7RXhwb3J0SW5mbywgUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzfSBmcm9tICcuLi9hbmFseXNpcy9wcml2YXRlX2RlY2xhcmF0aW9uc19hbmFseXplcic7XG5pbXBvcnQge0RlY29yYXRpb25BbmFseXNlc30gZnJvbSAnLi4vYW5hbHlzaXMvdHlwZXMnO1xuaW1wb3J0IHtJTVBPUlRfUFJFRklYfSBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IHtOZ2NjUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uL2hvc3QvbmdjY19ob3N0JztcbmltcG9ydCB7TG9nZ2VyfSBmcm9tICcuLi9sb2dnaW5nL2xvZ2dlcic7XG5pbXBvcnQge0VudHJ5UG9pbnRCdW5kbGV9IGZyb20gJy4uL3BhY2thZ2VzL2VudHJ5X3BvaW50X2J1bmRsZSc7XG5cbmltcG9ydCB7UmVuZGVyaW5nRm9ybWF0dGVyfSBmcm9tICcuL3JlbmRlcmluZ19mb3JtYXR0ZXInO1xuaW1wb3J0IHtyZW5kZXJTb3VyY2VBbmRNYXB9IGZyb20gJy4vc291cmNlX21hcHMnO1xuaW1wb3J0IHtGaWxlVG9Xcml0ZSwgZ2V0SW1wb3J0UmV3cml0ZXJ9IGZyb20gJy4vdXRpbHMnO1xuXG4vKipcbiAqIEEgc3RydWN0dXJlIHRoYXQgY2FwdHVyZXMgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBuZWVkcyB0byBiZSByZW5kZXJlZFxuICogaW4gYSB0eXBpbmdzIGZpbGUuXG4gKlxuICogSXQgaXMgY3JlYXRlZCBhcyBhIHJlc3VsdCBvZiBwcm9jZXNzaW5nIHRoZSBhbmFseXNpcyBwYXNzZWQgdG8gdGhlIHJlbmRlcmVyLlxuICpcbiAqIFRoZSBgcmVuZGVyRHRzRmlsZSgpYCBtZXRob2QgY29uc3VtZXMgaXQgd2hlbiByZW5kZXJpbmcgYSB0eXBpbmdzIGZpbGUuXG4gKi9cbmNsYXNzIER0c1JlbmRlckluZm8ge1xuICBjbGFzc0luZm86IER0c0NsYXNzSW5mb1tdID0gW107XG4gIG1vZHVsZVdpdGhQcm92aWRlcnM6IE1vZHVsZVdpdGhQcm92aWRlcnNJbmZvW10gPSBbXTtcbiAgcHJpdmF0ZUV4cG9ydHM6IEV4cG9ydEluZm9bXSA9IFtdO1xuICByZWV4cG9ydHM6IFJlZXhwb3J0W10gPSBbXTtcbn1cblxuXG4vKipcbiAqIEluZm9ybWF0aW9uIGFib3V0IGEgY2xhc3MgaW4gYSB0eXBpbmdzIGZpbGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRHRzQ2xhc3NJbmZvIHtcbiAgZHRzRGVjbGFyYXRpb246IHRzLkRlY2xhcmF0aW9uO1xuICBjb21waWxhdGlvbjogQ29tcGlsZVJlc3VsdFtdO1xufVxuXG4vKipcbiAqIEEgYmFzZS1jbGFzcyBmb3IgcmVuZGVyaW5nIGFuIGBBbmFseXplZEZpbGVgLlxuICpcbiAqIFBhY2thZ2UgZm9ybWF0cyBoYXZlIG91dHB1dCBmaWxlcyB0aGF0IG11c3QgYmUgcmVuZGVyZWQgZGlmZmVyZW50bHkuIENvbmNyZXRlIHN1Yi1jbGFzc2VzIG11c3RcbiAqIGltcGxlbWVudCB0aGUgYGFkZEltcG9ydHNgLCBgYWRkRGVmaW5pdGlvbnNgIGFuZCBgcmVtb3ZlRGVjb3JhdG9yc2AgYWJzdHJhY3QgbWV0aG9kcy5cbiAqL1xuZXhwb3J0IGNsYXNzIER0c1JlbmRlcmVyIHtcbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIGR0c0Zvcm1hdHRlcjogUmVuZGVyaW5nRm9ybWF0dGVyLCBwcml2YXRlIGZzOiBGaWxlU3lzdGVtLCBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyLFxuICAgICAgcHJpdmF0ZSBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgYnVuZGxlOiBFbnRyeVBvaW50QnVuZGxlKSB7fVxuXG4gIHJlbmRlclByb2dyYW0oXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8bnVsbCk6IEZpbGVUb1dyaXRlW10ge1xuICAgIGNvbnN0IHJlbmRlcmVkRmlsZXM6IEZpbGVUb1dyaXRlW10gPSBbXTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgLmQudHMgZmlsZXNcbiAgICBpZiAodGhpcy5idW5kbGUuZHRzKSB7XG4gICAgICBjb25zdCBkdHNGaWxlcyA9IHRoaXMuZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICAgICAgZGVjb3JhdGlvbkFuYWx5c2VzLCBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXMsIG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyk7XG5cbiAgICAgIC8vIElmIHRoZSBkdHMgZW50cnktcG9pbnQgaXMgbm90IGFscmVhZHkgdGhlcmUgKGl0IGRpZCBub3QgaGF2ZSBjb21waWxlZCBjbGFzc2VzKVxuICAgICAgLy8gdGhlbiBhZGQgaXQgbm93LCB0byBlbnN1cmUgaXQgZ2V0cyBpdHMgZXh0cmEgZXhwb3J0cyByZW5kZXJlZC5cbiAgICAgIGlmICghZHRzRmlsZXMuaGFzKHRoaXMuYnVuZGxlLmR0cy5maWxlKSkge1xuICAgICAgICBkdHNGaWxlcy5zZXQodGhpcy5idW5kbGUuZHRzLmZpbGUsIG5ldyBEdHNSZW5kZXJJbmZvKCkpO1xuICAgICAgfVxuICAgICAgZHRzRmlsZXMuZm9yRWFjaChcbiAgICAgICAgICAocmVuZGVySW5mbywgZmlsZSkgPT4gcmVuZGVyZWRGaWxlcy5wdXNoKC4uLnRoaXMucmVuZGVyRHRzRmlsZShmaWxlLCByZW5kZXJJbmZvKSkpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZEZpbGVzO1xuICB9XG5cbiAgcmVuZGVyRHRzRmlsZShkdHNGaWxlOiB0cy5Tb3VyY2VGaWxlLCByZW5kZXJJbmZvOiBEdHNSZW5kZXJJbmZvKTogRmlsZVRvV3JpdGVbXSB7XG4gICAgY29uc3Qgb3V0cHV0VGV4dCA9IG5ldyBNYWdpY1N0cmluZyhkdHNGaWxlLnRleHQpO1xuICAgIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gICAgY29uc3QgaW1wb3J0TWFuYWdlciA9IG5ldyBJbXBvcnRNYW5hZ2VyKFxuICAgICAgICBnZXRJbXBvcnRSZXdyaXRlcih0aGlzLmJ1bmRsZS5kdHMhLnIzU3ltYm9sc0ZpbGUsIHRoaXMuYnVuZGxlLmlzQ29yZSwgZmFsc2UpLFxuICAgICAgICBJTVBPUlRfUFJFRklYKTtcblxuICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLmZvckVhY2goZHRzQ2xhc3MgPT4ge1xuICAgICAgY29uc3QgZW5kT2ZDbGFzcyA9IGR0c0NsYXNzLmR0c0RlY2xhcmF0aW9uLmdldEVuZCgpO1xuICAgICAgZHRzQ2xhc3MuY29tcGlsYXRpb24uZm9yRWFjaChkZWNsYXJhdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0cmFuc2xhdGVUeXBlKGRlY2xhcmF0aW9uLnR5cGUsIGltcG9ydE1hbmFnZXIpO1xuICAgICAgICBtYXJrRm9yRW1pdEFzU2luZ2xlTGluZSh0eXBlKTtcbiAgICAgICAgY29uc3QgdHlwZVN0ciA9IHByaW50ZXIucHJpbnROb2RlKHRzLkVtaXRIaW50LlVuc3BlY2lmaWVkLCB0eXBlLCBkdHNGaWxlKTtcbiAgICAgICAgY29uc3QgbmV3U3RhdGVtZW50ID0gYCAgICBzdGF0aWMgJHtkZWNsYXJhdGlvbi5uYW1lfTogJHt0eXBlU3RyfTtcXG5gO1xuICAgICAgICBvdXRwdXRUZXh0LmFwcGVuZFJpZ2h0KGVuZE9mQ2xhc3MgLSAxLCBuZXdTdGF0ZW1lbnQpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBpZiAocmVuZGVySW5mby5yZWV4cG9ydHMubGVuZ3RoID4gMCkge1xuICAgICAgZm9yIChjb25zdCBlIG9mIHJlbmRlckluZm8ucmVleHBvcnRzKSB7XG4gICAgICAgIGNvbnN0IG5ld1N0YXRlbWVudCA9IGBcXG5leHBvcnQgeyR7ZS5zeW1ib2xOYW1lfSBhcyAke2UuYXNBbGlhc319IGZyb20gJyR7ZS5mcm9tTW9kdWxlfSc7YDtcbiAgICAgICAgb3V0cHV0VGV4dC5hcHBlbmQobmV3U3RhdGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmR0c0Zvcm1hdHRlci5hZGRNb2R1bGVXaXRoUHJvdmlkZXJzUGFyYW1zKFxuICAgICAgICBvdXRwdXRUZXh0LCByZW5kZXJJbmZvLm1vZHVsZVdpdGhQcm92aWRlcnMsIGltcG9ydE1hbmFnZXIpO1xuICAgIHRoaXMuZHRzRm9ybWF0dGVyLmFkZEV4cG9ydHMoXG4gICAgICAgIG91dHB1dFRleHQsIGR0c0ZpbGUuZmlsZU5hbWUsIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMsIGltcG9ydE1hbmFnZXIsIGR0c0ZpbGUpO1xuICAgIHRoaXMuZHRzRm9ybWF0dGVyLmFkZEltcG9ydHMoXG4gICAgICAgIG91dHB1dFRleHQsIGltcG9ydE1hbmFnZXIuZ2V0QWxsSW1wb3J0cyhkdHNGaWxlLmZpbGVOYW1lKSwgZHRzRmlsZSk7XG5cbiAgICByZXR1cm4gcmVuZGVyU291cmNlQW5kTWFwKHRoaXMubG9nZ2VyLCB0aGlzLmZzLCBkdHNGaWxlLCBvdXRwdXRUZXh0KTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0VHlwaW5nc0ZpbGVzVG9SZW5kZXIoXG4gICAgICBkZWNvcmF0aW9uQW5hbHlzZXM6IERlY29yYXRpb25BbmFseXNlcyxcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlczogUHJpdmF0ZURlY2xhcmF0aW9uc0FuYWx5c2VzLFxuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzOiBNb2R1bGVXaXRoUHJvdmlkZXJzQW5hbHlzZXN8XG4gICAgICBudWxsKTogTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+IHtcbiAgICBjb25zdCBkdHNNYXAgPSBuZXcgTWFwPHRzLlNvdXJjZUZpbGUsIER0c1JlbmRlckluZm8+KCk7XG5cbiAgICAvLyBDYXB0dXJlIHRoZSByZW5kZXJpbmcgaW5mbyBmcm9tIHRoZSBkZWNvcmF0aW9uIGFuYWx5c2VzXG4gICAgZGVjb3JhdGlvbkFuYWx5c2VzLmZvckVhY2goY29tcGlsZWRGaWxlID0+IHtcbiAgICAgIGxldCBhcHBsaWVkUmVleHBvcnRzID0gZmFsc2U7XG4gICAgICBjb21waWxlZEZpbGUuY29tcGlsZWRDbGFzc2VzLmZvckVhY2goY29tcGlsZWRDbGFzcyA9PiB7XG4gICAgICAgIGNvbnN0IGR0c0RlY2xhcmF0aW9uID0gdGhpcy5ob3N0LmdldER0c0RlY2xhcmF0aW9uKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgICAgICBpZiAoZHRzRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICBjb25zdCBkdHNGaWxlID0gZHRzRGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpO1xuICAgICAgICAgIGNvbnN0IHJlbmRlckluZm8gPSBkdHNNYXAuaGFzKGR0c0ZpbGUpID8gZHRzTWFwLmdldChkdHNGaWxlKSEgOiBuZXcgRHRzUmVuZGVySW5mbygpO1xuICAgICAgICAgIHJlbmRlckluZm8uY2xhc3NJbmZvLnB1c2goe2R0c0RlY2xhcmF0aW9uLCBjb21waWxhdGlvbjogY29tcGlsZWRDbGFzcy5jb21waWxhdGlvbn0pO1xuICAgICAgICAgIC8vIE9ubHkgYWRkIHJlLWV4cG9ydHMgaWYgdGhlIC5kLnRzIHRyZWUgaXMgb3ZlcmxheWVkIHdpdGggdGhlIC5qcyB0cmVlLCBhcyByZS1leHBvcnRzIGluXG4gICAgICAgICAgLy8gbmdjYyBhcmUgb25seSB1c2VkIHRvIHN1cHBvcnQgZGVlcCBpbXBvcnRzIGludG8gZS5nLiBjb21tb25qcyBjb2RlLiBGb3IgYSBkZWVwIGltcG9ydFxuICAgICAgICAgIC8vIHRvIHdvcmssIHRoZSB0eXBpbmcgZmlsZSBhbmQgSlMgZmlsZSBtdXN0IGJlIGluIHBhcmFsbGVsIHRyZWVzLiBUaGlzIGxvZ2ljIHdpbGwgZGV0ZWN0XG4gICAgICAgICAgLy8gdGhlIHNpbXBsZXN0IHZlcnNpb24gb2YgdGhpcyBjYXNlLCB3aGljaCBpcyBzdWZmaWNpZW50IHRvIGhhbmRsZSBtb3N0IGNvbW1vbmpzXG4gICAgICAgICAgLy8gbGlicmFyaWVzLlxuICAgICAgICAgIGlmICghYXBwbGllZFJlZXhwb3J0cyAmJlxuICAgICAgICAgICAgICBjb21waWxlZENsYXNzLmRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSA9PT1cbiAgICAgICAgICAgICAgICAgIGR0c0ZpbGUuZmlsZU5hbWUucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcuanMnKSkge1xuICAgICAgICAgICAgcmVuZGVySW5mby5yZWV4cG9ydHMucHVzaCguLi5jb21waWxlZEZpbGUucmVleHBvcnRzKTtcbiAgICAgICAgICAgIGFwcGxpZWRSZWV4cG9ydHMgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIENhcHR1cmUgdGhlIE1vZHVsZVdpdGhQcm92aWRlcnMgZnVuY3Rpb25zL21ldGhvZHMgdGhhdCBuZWVkIHVwZGF0aW5nXG4gICAgaWYgKG1vZHVsZVdpdGhQcm92aWRlcnNBbmFseXNlcyAhPT0gbnVsbCkge1xuICAgICAgbW9kdWxlV2l0aFByb3ZpZGVyc0FuYWx5c2VzLmZvckVhY2goKG1vZHVsZVdpdGhQcm92aWRlcnNUb0ZpeCwgZHRzRmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZW5kZXJJbmZvID0gZHRzTWFwLmhhcyhkdHNGaWxlKSA/IGR0c01hcC5nZXQoZHRzRmlsZSkhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgICAgcmVuZGVySW5mby5tb2R1bGVXaXRoUHJvdmlkZXJzID0gbW9kdWxlV2l0aFByb3ZpZGVyc1RvRml4O1xuICAgICAgICBkdHNNYXAuc2V0KGR0c0ZpbGUsIHJlbmRlckluZm8pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQ2FwdHVyZSB0aGUgcHJpdmF0ZSBkZWNsYXJhdGlvbnMgdGhhdCBuZWVkIHRvIGJlIHJlLWV4cG9ydGVkXG4gICAgaWYgKHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5sZW5ndGgpIHtcbiAgICAgIHByaXZhdGVEZWNsYXJhdGlvbnNBbmFseXNlcy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAoIWUuZHRzRnJvbSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFRoZXJlIGlzIG5vIHR5cGluZ3MgcGF0aCBmb3IgJHtlLmlkZW50aWZpZXJ9IGluICR7ZS5mcm9tfS5cXG5gICtcbiAgICAgICAgICAgICAgYFdlIG5lZWQgdG8gYWRkIGFuIGV4cG9ydCBmb3IgdGhpcyBjbGFzcyB0byBhIC5kLnRzIHR5cGluZ3MgZmlsZSBiZWNhdXNlIGAgK1xuICAgICAgICAgICAgICBgQW5ndWxhciBjb21waWxlciBuZWVkcyB0byBiZSBhYmxlIHRvIHJlZmVyZW5jZSB0aGlzIGNsYXNzIGluIGNvbXBpbGVkIGNvZGUsIHN1Y2ggYXMgdGVtcGxhdGVzLlxcbmAgK1xuICAgICAgICAgICAgICBgVGhlIHNpbXBsZXN0IGZpeCBmb3IgdGhpcyBpcyB0byBlbnN1cmUgdGhhdCB0aGlzIGNsYXNzIGlzIGV4cG9ydGVkIGZyb20gdGhlIHBhY2thZ2UncyBlbnRyeS1wb2ludC5gKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkdHNFbnRyeVBvaW50ID0gdGhpcy5idW5kbGUuZHRzIS5maWxlO1xuICAgICAgY29uc3QgcmVuZGVySW5mbyA9XG4gICAgICAgICAgZHRzTWFwLmhhcyhkdHNFbnRyeVBvaW50KSA/IGR0c01hcC5nZXQoZHRzRW50cnlQb2ludCkhIDogbmV3IER0c1JlbmRlckluZm8oKTtcbiAgICAgIHJlbmRlckluZm8ucHJpdmF0ZUV4cG9ydHMgPSBwcml2YXRlRGVjbGFyYXRpb25zQW5hbHlzZXM7XG4gICAgICBkdHNNYXAuc2V0KGR0c0VudHJ5UG9pbnQsIHJlbmRlckluZm8pO1xuICAgIH1cblxuICAgIHJldHVybiBkdHNNYXA7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUobm9kZTogdHMuTm9kZSkge1xuICB0cy5zZXRFbWl0RmxhZ3Mobm9kZSwgdHMuRW1pdEZsYWdzLlNpbmdsZUxpbmUpO1xuICB0cy5mb3JFYWNoQ2hpbGQobm9kZSwgbWFya0ZvckVtaXRBc1NpbmdsZUxpbmUpO1xufVxuIl19