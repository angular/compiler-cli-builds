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
        define("@angular/compiler-cli/src/ngtsc/metadata/src/resource_registry", ["require", "exports", "tslib"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResourceRegistry = void 0;
    var tslib_1 = require("tslib");
    /**
     * Tracks the mapping between external template/style files and the component(s) which use them.
     *
     * This information is produced during analysis of the program and is used mainly to support
     * external tooling, for which such a mapping is challenging to determine without compiler
     * assistance.
     */
    var ResourceRegistry = /** @class */ (function () {
        function ResourceRegistry() {
            this.templateToComponentsMap = new Map();
            this.componentToTemplateMap = new Map();
            this.componentToStylesMap = new Map();
            this.styleToComponentsMap = new Map();
        }
        ResourceRegistry.prototype.getComponentsWithTemplate = function (template) {
            if (!this.templateToComponentsMap.has(template)) {
                return new Set();
            }
            return this.templateToComponentsMap.get(template);
        };
        ResourceRegistry.prototype.registerResources = function (resources, component) {
            var e_1, _a;
            if (resources.template !== null) {
                this.registerTemplate(resources.template, component);
            }
            try {
                for (var _b = tslib_1.__values(resources.styles), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var style = _c.value;
                    this.registerStyle(style, component);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        ResourceRegistry.prototype.registerTemplate = function (templateResource, component) {
            var path = templateResource.path;
            if (!this.templateToComponentsMap.has(path)) {
                this.templateToComponentsMap.set(path, new Set());
            }
            this.templateToComponentsMap.get(path).add(component);
            this.componentToTemplateMap.set(component, templateResource);
        };
        ResourceRegistry.prototype.getTemplate = function (component) {
            if (!this.componentToTemplateMap.has(component)) {
                return null;
            }
            return this.componentToTemplateMap.get(component);
        };
        ResourceRegistry.prototype.registerStyle = function (styleResource, component) {
            var path = styleResource.path;
            if (!this.componentToStylesMap.has(component)) {
                this.componentToStylesMap.set(component, new Set());
            }
            if (!this.styleToComponentsMap.has(path)) {
                this.styleToComponentsMap.set(path, new Set());
            }
            this.styleToComponentsMap.get(path).add(component);
            this.componentToStylesMap.get(component).add(styleResource);
        };
        ResourceRegistry.prototype.getStyles = function (component) {
            if (!this.componentToStylesMap.has(component)) {
                return new Set();
            }
            return this.componentToStylesMap.get(component);
        };
        ResourceRegistry.prototype.getComponentsWithStyle = function (styleUrl) {
            if (!this.styleToComponentsMap.has(styleUrl)) {
                return new Set();
            }
            return this.styleToComponentsMap.get(styleUrl);
        };
        return ResourceRegistry;
    }());
    exports.ResourceRegistry = ResourceRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VfcmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZXNvdXJjZV9yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBNEJIOzs7Ozs7T0FNRztJQUNIO1FBQUE7WUFDVSw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUMzRSwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvRCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNsRSx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztRQTZEbEYsQ0FBQztRQTNEQyxvREFBeUIsR0FBekIsVUFBMEIsUUFBd0I7WUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQy9DLE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztRQUNyRCxDQUFDO1FBRUQsNENBQWlCLEdBQWpCLFVBQWtCLFNBQTZCLEVBQUUsU0FBMkI7O1lBQzFFLElBQUksU0FBUyxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQ3REOztnQkFDRCxLQUFvQixJQUFBLEtBQUEsaUJBQUEsU0FBUyxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBakMsSUFBTSxLQUFLLFdBQUE7b0JBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQ3RDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsMkNBQWdCLEdBQWhCLFVBQWlCLGdCQUEwQixFQUFFLFNBQTJCO1lBQy9ELElBQUEsSUFBSSxHQUFJLGdCQUFnQixLQUFwQixDQUFxQjtZQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsc0NBQVcsR0FBWCxVQUFZLFNBQTJCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDO1FBQ3JELENBQUM7UUFFRCx3Q0FBYSxHQUFiLFVBQWMsYUFBdUIsRUFBRSxTQUEyQjtZQUN6RCxJQUFBLElBQUksR0FBSSxhQUFhLEtBQWpCLENBQWtCO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUM3QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDeEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELG9DQUFTLEdBQVQsVUFBVSxTQUEyQjtZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDO1FBQ25ELENBQUM7UUFFRCxpREFBc0IsR0FBdEIsVUFBdUIsUUFBd0I7WUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzVDLE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztRQUNsRCxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBakVELElBaUVDO0lBakVZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIGV4dGVybmFsIHJlc291cmNlIGZvciBhIGNvbXBvbmVudCBhbmQgY29udGFpbnMgdGhlIGBBYnNvbHV0ZUZzUGF0aGBcbiAqIHRvIHRoZSBmaWxlIHdoaWNoIHdhcyByZXNvbHZlZCBieSBldmFsdWF0aW5nIHRoZSBgdHMuRXhwcmVzc2lvbmAgKGdlbmVyYWxseSwgYSByZWxhdGl2ZSBvclxuICogYWJzb2x1dGUgc3RyaW5nIHBhdGggdG8gdGhlIHJlc291cmNlKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXNvdXJjZSB7XG4gIHBhdGg6IEFic29sdXRlRnNQYXRoO1xuICBleHByZXNzaW9uOiB0cy5FeHByZXNzaW9uO1xufVxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGV4dGVybmFsIHJlc291cmNlcyBvZiBhIGNvbXBvbmVudC5cbiAqXG4gKiBJZiB0aGUgY29tcG9uZW50IHVzZXMgYW4gaW5saW5lIHRlbXBsYXRlLCB0aGUgdGVtcGxhdGUgcmVzb3VyY2Ugd2lsbCBiZSBgbnVsbGAuXG4gKiBJZiB0aGUgY29tcG9uZW50IGRvZXMgbm90IGhhdmUgZXh0ZXJuYWwgc3R5bGVzLCB0aGUgYHN0eWxlc2AgYFNldGAgd2lsbCBiZSBlbXB0eS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wb25lbnRSZXNvdXJjZXMge1xuICB0ZW1wbGF0ZTogUmVzb3VyY2V8bnVsbDtcbiAgc3R5bGVzOiBSZWFkb25seVNldDxSZXNvdXJjZT47XG59XG5cbi8qKlxuICogVHJhY2tzIHRoZSBtYXBwaW5nIGJldHdlZW4gZXh0ZXJuYWwgdGVtcGxhdGUvc3R5bGUgZmlsZXMgYW5kIHRoZSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZW0uXG4gKlxuICogVGhpcyBpbmZvcm1hdGlvbiBpcyBwcm9kdWNlZCBkdXJpbmcgYW5hbHlzaXMgb2YgdGhlIHByb2dyYW0gYW5kIGlzIHVzZWQgbWFpbmx5IHRvIHN1cHBvcnRcbiAqIGV4dGVybmFsIHRvb2xpbmcsIGZvciB3aGljaCBzdWNoIGEgbWFwcGluZyBpcyBjaGFsbGVuZ2luZyB0byBkZXRlcm1pbmUgd2l0aG91dCBjb21waWxlclxuICogYXNzaXN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlUmVnaXN0cnkge1xuICBwcml2YXRlIHRlbXBsYXRlVG9Db21wb25lbnRzTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgU2V0PENsYXNzRGVjbGFyYXRpb24+PigpO1xuICBwcml2YXRlIGNvbXBvbmVudFRvVGVtcGxhdGVNYXAgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFJlc291cmNlPigpO1xuICBwcml2YXRlIGNvbXBvbmVudFRvU3R5bGVzTWFwID0gbmV3IE1hcDxDbGFzc0RlY2xhcmF0aW9uLCBTZXQ8UmVzb3VyY2U+PigpO1xuICBwcml2YXRlIHN0eWxlVG9Db21wb25lbnRzTWFwID0gbmV3IE1hcDxBYnNvbHV0ZUZzUGF0aCwgU2V0PENsYXNzRGVjbGFyYXRpb24+PigpO1xuXG4gIGdldENvbXBvbmVudHNXaXRoVGVtcGxhdGUodGVtcGxhdGU6IEFic29sdXRlRnNQYXRoKTogUmVhZG9ubHlTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4ge1xuICAgIGlmICghdGhpcy50ZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5oYXModGVtcGxhdGUpKSB7XG4gICAgICByZXR1cm4gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnRlbXBsYXRlVG9Db21wb25lbnRzTWFwLmdldCh0ZW1wbGF0ZSkhO1xuICB9XG5cbiAgcmVnaXN0ZXJSZXNvdXJjZXMocmVzb3VyY2VzOiBDb21wb25lbnRSZXNvdXJjZXMsIGNvbXBvbmVudDogQ2xhc3NEZWNsYXJhdGlvbikge1xuICAgIGlmIChyZXNvdXJjZXMudGVtcGxhdGUgIT09IG51bGwpIHtcbiAgICAgIHRoaXMucmVnaXN0ZXJUZW1wbGF0ZShyZXNvdXJjZXMudGVtcGxhdGUsIGNvbXBvbmVudCk7XG4gICAgfVxuICAgIGZvciAoY29uc3Qgc3R5bGUgb2YgcmVzb3VyY2VzLnN0eWxlcykge1xuICAgICAgdGhpcy5yZWdpc3RlclN0eWxlKHN0eWxlLCBjb21wb25lbnQpO1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyVGVtcGxhdGUodGVtcGxhdGVSZXNvdXJjZTogUmVzb3VyY2UsIGNvbXBvbmVudDogQ2xhc3NEZWNsYXJhdGlvbik6IHZvaWQge1xuICAgIGNvbnN0IHtwYXRofSA9IHRlbXBsYXRlUmVzb3VyY2U7XG4gICAgaWYgKCF0aGlzLnRlbXBsYXRlVG9Db21wb25lbnRzTWFwLmhhcyhwYXRoKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5zZXQocGF0aCwgbmV3IFNldCgpKTtcbiAgICB9XG4gICAgdGhpcy50ZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5nZXQocGF0aCkhLmFkZChjb21wb25lbnQpO1xuICAgIHRoaXMuY29tcG9uZW50VG9UZW1wbGF0ZU1hcC5zZXQoY29tcG9uZW50LCB0ZW1wbGF0ZVJlc291cmNlKTtcbiAgfVxuXG4gIGdldFRlbXBsYXRlKGNvbXBvbmVudDogQ2xhc3NEZWNsYXJhdGlvbik6IFJlc291cmNlfG51bGwge1xuICAgIGlmICghdGhpcy5jb21wb25lbnRUb1RlbXBsYXRlTWFwLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcG9uZW50VG9UZW1wbGF0ZU1hcC5nZXQoY29tcG9uZW50KSE7XG4gIH1cblxuICByZWdpc3RlclN0eWxlKHN0eWxlUmVzb3VyY2U6IFJlc291cmNlLCBjb21wb25lbnQ6IENsYXNzRGVjbGFyYXRpb24pOiB2b2lkIHtcbiAgICBjb25zdCB7cGF0aH0gPSBzdHlsZVJlc291cmNlO1xuICAgIGlmICghdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5oYXMoY29tcG9uZW50KSkge1xuICAgICAgdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5zZXQoY29tcG9uZW50LCBuZXcgU2V0KCkpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuc3R5bGVUb0NvbXBvbmVudHNNYXAuaGFzKHBhdGgpKSB7XG4gICAgICB0aGlzLnN0eWxlVG9Db21wb25lbnRzTWFwLnNldChwYXRoLCBuZXcgU2V0KCkpO1xuICAgIH1cbiAgICB0aGlzLnN0eWxlVG9Db21wb25lbnRzTWFwLmdldChwYXRoKSEuYWRkKGNvbXBvbmVudCk7XG4gICAgdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5nZXQoY29tcG9uZW50KSEuYWRkKHN0eWxlUmVzb3VyY2UpO1xuICB9XG5cbiAgZ2V0U3R5bGVzKGNvbXBvbmVudDogQ2xhc3NEZWNsYXJhdGlvbik6IFNldDxSZXNvdXJjZT4ge1xuICAgIGlmICghdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcG9uZW50VG9TdHlsZXNNYXAuZ2V0KGNvbXBvbmVudCkhO1xuICB9XG5cbiAgZ2V0Q29tcG9uZW50c1dpdGhTdHlsZShzdHlsZVVybDogQWJzb2x1dGVGc1BhdGgpOiBSZWFkb25seVNldDxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgaWYgKCF0aGlzLnN0eWxlVG9Db21wb25lbnRzTWFwLmhhcyhzdHlsZVVybCkpIHtcbiAgICAgIHJldHVybiBuZXcgU2V0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3R5bGVUb0NvbXBvbmVudHNNYXAuZ2V0KHN0eWxlVXJsKSE7XG4gIH1cbn1cbiJdfQ==