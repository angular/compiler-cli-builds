/**
 * @license
 * Copyright Google LLC All Rights Reserved.
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
                    identifiers: (0, template_1.getTemplateIdentifiers)(boundTemplate),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNmb3JtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvY29tcGlsZXItY2xpL3NyYy9uZ3RzYy9pbmRleGVyL3NyYy90cmFuc2Zvcm0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsOENBQWtEO0lBSWxELGlGQUFrRDtJQUVsRDs7Ozs7T0FLRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLE9BQXdCO1FBQ3ZELElBQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBRTlELE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBb0Q7Z0JBQW5ELFdBQVcsaUJBQUEsRUFBRSxRQUFRLGNBQUEsRUFBRSxhQUFhLG1CQUFBLEVBQUUsWUFBWSxrQkFBQTtZQUM3RSxJQUFNLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBRXhDLElBQU0sY0FBYyxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO1lBQ2xELElBQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHO2dCQUNsQixJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUU7b0JBQ25CLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDbEM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILDZGQUE2RjtZQUM3RiwyQkFBMkI7WUFDM0IsSUFBTSxhQUFhLEdBQUcsSUFBSSwwQkFBZSxDQUNyQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JGLElBQUksWUFBNkIsQ0FBQztZQUNsQyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUU7Z0JBQ3pCLFlBQVksR0FBRyxhQUFhLENBQUM7YUFDOUI7aUJBQU07Z0JBQ0wsWUFBWSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7YUFDbEM7WUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRTtnQkFDeEIsSUFBSSxNQUFBO2dCQUNKLFFBQVEsVUFBQTtnQkFDUixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsUUFBUSxFQUFFO29CQUNSLFdBQVcsRUFBRSxJQUFBLGlDQUFzQixFQUFDLGFBQWEsQ0FBQztvQkFDbEQsY0FBYyxnQkFBQTtvQkFDZCxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7b0JBQy9CLElBQUksRUFBRSxZQUFZO2lCQUNuQjthQUNGLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQXZDRCw0Q0F1Q0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtQYXJzZVNvdXJjZUZpbGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCB7RGVjbGFyYXRpb25Ob2RlfSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7SW5kZXhlZENvbXBvbmVudH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHtJbmRleGluZ0NvbnRleHR9IGZyb20gJy4vY29udGV4dCc7XG5pbXBvcnQge2dldFRlbXBsYXRlSWRlbnRpZmllcnN9IGZyb20gJy4vdGVtcGxhdGUnO1xuXG4vKipcbiAqIEdlbmVyYXRlcyBgSW5kZXhlZENvbXBvbmVudGAgZW50cmllcyBmcm9tIGEgYEluZGV4aW5nQ29udGV4dGAsIHdoaWNoIGhhcyBpbmZvcm1hdGlvblxuICogYWJvdXQgY29tcG9uZW50cyBkaXNjb3ZlcmVkIGluIHRoZSBwcm9ncmFtIHJlZ2lzdGVyZWQgaW4gaXQuXG4gKlxuICogVGhlIGNvbnRleHQgbXVzdCBiZSBwb3B1bGF0ZWQgYmVmb3JlIGBnZW5lcmF0ZUFuYWx5c2lzYCBpcyBjYWxsZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuYWx5c2lzKGNvbnRleHQ6IEluZGV4aW5nQ29udGV4dCk6IE1hcDxEZWNsYXJhdGlvbk5vZGUsIEluZGV4ZWRDb21wb25lbnQ+IHtcbiAgY29uc3QgYW5hbHlzaXMgPSBuZXcgTWFwPERlY2xhcmF0aW9uTm9kZSwgSW5kZXhlZENvbXBvbmVudD4oKTtcblxuICBjb250ZXh0LmNvbXBvbmVudHMuZm9yRWFjaCgoe2RlY2xhcmF0aW9uLCBzZWxlY3RvciwgYm91bmRUZW1wbGF0ZSwgdGVtcGxhdGVNZXRhfSkgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSBkZWNsYXJhdGlvbi5uYW1lLmdldFRleHQoKTtcblxuICAgIGNvbnN0IHVzZWRDb21wb25lbnRzID0gbmV3IFNldDxEZWNsYXJhdGlvbk5vZGU+KCk7XG4gICAgY29uc3QgdXNlZERpcnMgPSBib3VuZFRlbXBsYXRlLmdldFVzZWREaXJlY3RpdmVzKCk7XG4gICAgdXNlZERpcnMuZm9yRWFjaChkaXIgPT4ge1xuICAgICAgaWYgKGRpci5pc0NvbXBvbmVudCkge1xuICAgICAgICB1c2VkQ29tcG9uZW50cy5hZGQoZGlyLnJlZi5ub2RlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEdldCBzb3VyY2UgZmlsZXMgZm9yIHRoZSBjb21wb25lbnQgYW5kIHRoZSB0ZW1wbGF0ZS4gSWYgdGhlIHRlbXBsYXRlIGlzIGlubGluZSwgaXRzIHNvdXJjZVxuICAgIC8vIGZpbGUgaXMgdGhlIGNvbXBvbmVudCdzLlxuICAgIGNvbnN0IGNvbXBvbmVudEZpbGUgPSBuZXcgUGFyc2VTb3VyY2VGaWxlKFxuICAgICAgICBkZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZ2V0RnVsbFRleHQoKSwgZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lKTtcbiAgICBsZXQgdGVtcGxhdGVGaWxlOiBQYXJzZVNvdXJjZUZpbGU7XG4gICAgaWYgKHRlbXBsYXRlTWV0YS5pc0lubGluZSkge1xuICAgICAgdGVtcGxhdGVGaWxlID0gY29tcG9uZW50RmlsZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGVtcGxhdGVGaWxlID0gdGVtcGxhdGVNZXRhLmZpbGU7XG4gICAgfVxuXG4gICAgYW5hbHlzaXMuc2V0KGRlY2xhcmF0aW9uLCB7XG4gICAgICBuYW1lLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBmaWxlOiBjb21wb25lbnRGaWxlLFxuICAgICAgdGVtcGxhdGU6IHtcbiAgICAgICAgaWRlbnRpZmllcnM6IGdldFRlbXBsYXRlSWRlbnRpZmllcnMoYm91bmRUZW1wbGF0ZSksXG4gICAgICAgIHVzZWRDb21wb25lbnRzLFxuICAgICAgICBpc0lubGluZTogdGVtcGxhdGVNZXRhLmlzSW5saW5lLFxuICAgICAgICBmaWxlOiB0ZW1wbGF0ZUZpbGUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gYW5hbHlzaXM7XG59XG4iXX0=