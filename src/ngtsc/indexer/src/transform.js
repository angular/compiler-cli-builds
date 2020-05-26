/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngtsc/indexer/src/transform", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/indexer/src/template"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generateAnalysis = void 0;
    var compiler_1 = require("@angular/compiler");
    var template_1 = require("@angular/compiler-cli/src/ngtsc/indexer/src/template");
    /**
     * Generates `IndexedComponent` entries from a `IndexingContext`, which has information
     * about components discovered in the program registered in it.
     *
     * The context must be populated before `generateAnalysis` is called.
     */
    function generateAnalysis(context) {
        var analysis = new Map();
        context.components.forEach(function (_a) {
            var declaration = _a.declaration, selector = _a.selector, boundTemplate = _a.boundTemplate, templateMeta = _a.templateMeta;
            var name = declaration.name.getText();
            var usedComponents = new Set();
            var usedDirs = boundTemplate.getUsedDirectives();
            usedDirs.forEach(function (dir) {
                if (dir.isComponent) {
                    usedComponents.add(dir.ref.node);
                }
            });
            // Get source files for the component and the template. If the template is inline, its source
            // file is the component's.
            var componentFile = new compiler_1.ParseSourceFile(declaration.getSourceFile().getFullText(), declaration.getSourceFile().fileName);
            var templateFile;
            if (templateMeta.isInline) {
                templateFile = componentFile;
            }
            else {
                templateFile = templateMeta.file;
            }
            analysis.set(declaration, {
                name: name,
                selector: selector,
                file: componentFile,
                template: {
                    identifiers: template_1.getTemplateIdentifiers(boundTemplate),
                    usedComponents: usedComponents,
                    isInline: templateMeta.isInline,
                    file: templateFile,
                },
            });
        });
        return analysis;
    }
    exports.generateAnalysis = generateAnalysis;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy90cmFuc2Zvcm0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWtEO0lBSWxELGlGQUFrRDtJQUVsRDs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLE9BQXdCO1FBQ3ZELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFvQyxDQUFDO1FBRTdELE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBb0Q7Z0JBQW5ELFdBQVcsaUJBQUEsRUFBRSxRQUFRLGNBQUEsRUFBRSxhQUFhLG1CQUFBLEVBQUUsWUFBWSxrQkFBQTtZQUM3RSxJQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXhDLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQ2pELElBQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNsQixJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUU7b0JBQ25CLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDbEM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILDZGQUE2RjtZQUM3RiwyQkFBMkI7WUFDM0IsSUFBTSxhQUFhLEdBQUcsSUFBSSwwQkFBZSxDQUNyQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JGLElBQUksWUFBNkIsQ0FBQztZQUNsQyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUU7Z0JBQ3pCLFlBQVksR0FBRyxhQUFhLENBQUM7YUFDOUI7aUJBQU07Z0JBQ0wsWUFBWSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7YUFDbEM7WUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsSUFBSSxNQUFBO2dCQUNKLFFBQVEsVUFBQTtnQkFDUixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsUUFBUSxFQUFFO29CQUNSLFdBQVcsRUFBRSxpQ0FBc0IsQ0FBQyxhQUFhLENBQUM7b0JBQ2xELGNBQWMsZ0JBQUE7b0JBQ2QsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO29CQUMvQixJQUFJLEVBQUUsWUFBWTtpQkFDbkI7YUFDRixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUM7SUF2Q0QsNENBdUNDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge1BhcnNlU291cmNlRmlsZX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge0luZGV4ZWRDb21wb25lbnR9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7SW5kZXhpbmdDb250ZXh0fSBmcm9tICcuL2NvbnRleHQnO1xuaW1wb3J0IHtnZXRUZW1wbGF0ZUlkZW50aWZpZXJzfSBmcm9tICcuL3RlbXBsYXRlJztcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYEluZGV4ZWRDb21wb25lbnRgIGVudHJpZXMgZnJvbSBhIGBJbmRleGluZ0NvbnRleHRgLCB3aGljaCBoYXMgaW5mb3JtYXRpb25cbiAqIGFib3V0IGNvbXBvbmVudHMgZGlzY292ZXJlZCBpbiB0aGUgcHJvZ3JhbSByZWdpc3RlcmVkIGluIGl0LlxuICpcbiAqIFRoZSBjb250ZXh0IG11c3QgYmUgcG9wdWxhdGVkIGJlZm9yZSBgZ2VuZXJhdGVBbmFseXNpc2AgaXMgY2FsbGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmFseXNpcyhjb250ZXh0OiBJbmRleGluZ0NvbnRleHQpOiBNYXA8dHMuRGVjbGFyYXRpb24sIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgY29uc3QgYW5hbHlzaXMgPSBuZXcgTWFwPHRzLkRlY2xhcmF0aW9uLCBJbmRleGVkQ29tcG9uZW50PigpO1xuXG4gIGNvbnRleHQuY29tcG9uZW50cy5mb3JFYWNoKCh7ZGVjbGFyYXRpb24sIHNlbGVjdG9yLCBib3VuZFRlbXBsYXRlLCB0ZW1wbGF0ZU1ldGF9KSA9PiB7XG4gICAgY29uc3QgbmFtZSA9IGRlY2xhcmF0aW9uLm5hbWUuZ2V0VGV4dCgpO1xuXG4gICAgY29uc3QgdXNlZENvbXBvbmVudHMgPSBuZXcgU2V0PHRzLkRlY2xhcmF0aW9uPigpO1xuICAgIGNvbnN0IHVzZWREaXJzID0gYm91bmRUZW1wbGF0ZS5nZXRVc2VkRGlyZWN0aXZlcygpO1xuICAgIHVzZWREaXJzLmZvckVhY2goZGlyID0+IHtcbiAgICAgIGlmIChkaXIuaXNDb21wb25lbnQpIHtcbiAgICAgICAgdXNlZENvbXBvbmVudHMuYWRkKGRpci5yZWYubm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBHZXQgc291cmNlIGZpbGVzIGZvciB0aGUgY29tcG9uZW50IGFuZCB0aGUgdGVtcGxhdGUuIElmIHRoZSB0ZW1wbGF0ZSBpcyBpbmxpbmUsIGl0cyBzb3VyY2VcbiAgICAvLyBmaWxlIGlzIHRoZSBjb21wb25lbnQncy5cbiAgICBjb25zdCBjb21wb25lbnRGaWxlID0gbmV3IFBhcnNlU291cmNlRmlsZShcbiAgICAgICAgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmdldEZ1bGxUZXh0KCksIGRlY2xhcmF0aW9uLmdldFNvdXJjZUZpbGUoKS5maWxlTmFtZSk7XG4gICAgbGV0IHRlbXBsYXRlRmlsZTogUGFyc2VTb3VyY2VGaWxlO1xuICAgIGlmICh0ZW1wbGF0ZU1ldGEuaXNJbmxpbmUpIHtcbiAgICAgIHRlbXBsYXRlRmlsZSA9IGNvbXBvbmVudEZpbGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRlbXBsYXRlRmlsZSA9IHRlbXBsYXRlTWV0YS5maWxlO1xuICAgIH1cblxuICAgIGFuYWx5c2lzLnNldChkZWNsYXJhdGlvbiwge1xuICAgICAgbmFtZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZmlsZTogY29tcG9uZW50RmlsZSxcbiAgICAgIHRlbXBsYXRlOiB7XG4gICAgICAgIGlkZW50aWZpZXJzOiBnZXRUZW1wbGF0ZUlkZW50aWZpZXJzKGJvdW5kVGVtcGxhdGUpLFxuICAgICAgICB1c2VkQ29tcG9uZW50cyxcbiAgICAgICAgaXNJbmxpbmU6IHRlbXBsYXRlTWV0YS5pc0lubGluZSxcbiAgICAgICAgZmlsZTogdGVtcGxhdGVGaWxlLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIGFuYWx5c2lzO1xufVxuIl19