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
            this.externalTemplateToComponentsMap = new Map();
            this.componentToTemplateMap = new Map();
            this.componentToStylesMap = new Map();
            this.externalStyleToComponentsMap = new Map();
        }
        ResourceRegistry.prototype.getComponentsWithTemplate = function (template) {
            if (!this.externalTemplateToComponentsMap.has(template)) {
                return new Set();
            }
            return this.externalTemplateToComponentsMap.get(template);
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
            if (path !== null) {
                if (!this.externalTemplateToComponentsMap.has(path)) {
                    this.externalTemplateToComponentsMap.set(path, new Set());
                }
                this.externalTemplateToComponentsMap.get(path).add(component);
            }
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
            if (path !== null) {
                if (!this.externalStyleToComponentsMap.has(path)) {
                    this.externalStyleToComponentsMap.set(path, new Set());
                }
                this.externalStyleToComponentsMap.get(path).add(component);
            }
            this.componentToStylesMap.get(component).add(styleResource);
        };
        ResourceRegistry.prototype.getStyles = function (component) {
            if (!this.componentToStylesMap.has(component)) {
                return new Set();
            }
            return this.componentToStylesMap.get(component);
        };
        ResourceRegistry.prototype.getComponentsWithStyle = function (styleUrl) {
            if (!this.externalStyleToComponentsMap.has(styleUrl)) {
                return new Set();
            }
            return this.externalStyleToComponentsMap.get(styleUrl);
        };
        return ResourceRegistry;
    }());
    exports.ResourceRegistry = ResourceRegistry;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VfcmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL21ldGFkYXRhL3NyYy9yZXNvdXJjZV9yZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7O0lBNkJIOzs7Ozs7T0FNRztJQUNIO1FBQUE7WUFDVSxvQ0FBK0IsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztZQUNuRiwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBOEIsQ0FBQztZQUMvRCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQztZQUNsRSxpQ0FBNEIsR0FBRyxJQUFJLEdBQUcsRUFBeUMsQ0FBQztRQWlFMUYsQ0FBQztRQS9EQyxvREFBeUIsR0FBekIsVUFBMEIsUUFBd0I7WUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3ZELE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztRQUM3RCxDQUFDO1FBRUQsNENBQWlCLEdBQWpCLFVBQWtCLFNBQTZCLEVBQUUsU0FBMkI7O1lBQzFFLElBQUksU0FBUyxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQy9CLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2FBQ3REOztnQkFDRCxLQUFvQixJQUFBLEtBQUEsaUJBQUEsU0FBUyxDQUFDLE1BQU0sQ0FBQSxnQkFBQSw0QkFBRTtvQkFBakMsSUFBTSxLQUFLLFdBQUE7b0JBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQ3RDOzs7Ozs7Ozs7UUFDSCxDQUFDO1FBRUQsMkNBQWdCLEdBQWhCLFVBQWlCLGdCQUEwQixFQUFFLFNBQTJCO1lBQy9ELElBQUEsSUFBSSxHQUFJLGdCQUFnQixLQUFwQixDQUFxQjtZQUNoQyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuRCxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7aUJBQzNEO2dCQUNELElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2hFO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsc0NBQVcsR0FBWCxVQUFZLFNBQTJCO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUMvQyxPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDO1FBQ3JELENBQUM7UUFFRCx3Q0FBYSxHQUFiLFVBQWMsYUFBdUIsRUFBRSxTQUEyQjtZQUN6RCxJQUFBLElBQUksR0FBSSxhQUFhLEtBQWpCLENBQWtCO1lBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO2dCQUM3QyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7YUFDckQ7WUFDRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNoRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7aUJBQ3hEO2dCQUNELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzdEO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELG9DQUFTLEdBQVQsVUFBVSxTQUEyQjtZQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBRSxDQUFDO1FBQ25ELENBQUM7UUFFRCxpREFBc0IsR0FBdEIsVUFBdUIsUUFBd0I7WUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ3BELE9BQU8sSUFBSSxHQUFHLEVBQUUsQ0FBQzthQUNsQjtZQUVELE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQztRQUMxRCxDQUFDO1FBQ0gsdUJBQUM7SUFBRCxDQUFDLEFBckVELElBcUVDO0lBckVZLDRDQUFnQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtBYnNvbHV0ZUZzUGF0aH0gZnJvbSAnLi4vLi4vZmlsZV9zeXN0ZW0nO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9ufSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcblxuLyoqXG4gKiBSZXByZXNlbnRzIGFuIHJlc291cmNlIGZvciBhIGNvbXBvbmVudCBhbmQgY29udGFpbnMgdGhlIGBBYnNvbHV0ZUZzUGF0aGBcbiAqIHRvIHRoZSBmaWxlIHdoaWNoIHdhcyByZXNvbHZlZCBieSBldmFsdWF0aW5nIHRoZSBgdHMuRXhwcmVzc2lvbmAgKGdlbmVyYWxseSwgYSByZWxhdGl2ZSBvclxuICogYWJzb2x1dGUgc3RyaW5nIHBhdGggdG8gdGhlIHJlc291cmNlKS5cbiAqXG4gKiBJZiB0aGUgcmVzb3VyY2UgaXMgaW5saW5lLCB0aGUgYHBhdGhgIHdpbGwgYmUgYG51bGxgLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlc291cmNlIHtcbiAgcGF0aDogQWJzb2x1dGVGc1BhdGh8bnVsbDtcbiAgZXhwcmVzc2lvbjogdHMuRXhwcmVzc2lvbjtcbn1cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBlaXRoZXIgaW5saW5lIG9yIGV4dGVybmFsIHJlc291cmNlcyBvZiBhIGNvbXBvbmVudC5cbiAqXG4gKiBBIHJlc291cmNlIHdpdGggYSBgcGF0aGAgb2YgYG51bGxgIGlzIGNvbnNpZGVyZWQgaW5saW5lLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbXBvbmVudFJlc291cmNlcyB7XG4gIHRlbXBsYXRlOiBSZXNvdXJjZTtcbiAgc3R5bGVzOiBSZWFkb25seVNldDxSZXNvdXJjZT47XG59XG5cbi8qKlxuICogVHJhY2tzIHRoZSBtYXBwaW5nIGJldHdlZW4gZXh0ZXJuYWwgdGVtcGxhdGUvc3R5bGUgZmlsZXMgYW5kIHRoZSBjb21wb25lbnQocykgd2hpY2ggdXNlIHRoZW0uXG4gKlxuICogVGhpcyBpbmZvcm1hdGlvbiBpcyBwcm9kdWNlZCBkdXJpbmcgYW5hbHlzaXMgb2YgdGhlIHByb2dyYW0gYW5kIGlzIHVzZWQgbWFpbmx5IHRvIHN1cHBvcnRcbiAqIGV4dGVybmFsIHRvb2xpbmcsIGZvciB3aGljaCBzdWNoIGEgbWFwcGluZyBpcyBjaGFsbGVuZ2luZyB0byBkZXRlcm1pbmUgd2l0aG91dCBjb21waWxlclxuICogYXNzaXN0YW5jZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlc291cmNlUmVnaXN0cnkge1xuICBwcml2YXRlIGV4dGVybmFsVGVtcGxhdGVUb0NvbXBvbmVudHNNYXAgPSBuZXcgTWFwPEFic29sdXRlRnNQYXRoLCBTZXQ8Q2xhc3NEZWNsYXJhdGlvbj4+KCk7XG4gIHByaXZhdGUgY29tcG9uZW50VG9UZW1wbGF0ZU1hcCA9IG5ldyBNYXA8Q2xhc3NEZWNsYXJhdGlvbiwgUmVzb3VyY2U+KCk7XG4gIHByaXZhdGUgY29tcG9uZW50VG9TdHlsZXNNYXAgPSBuZXcgTWFwPENsYXNzRGVjbGFyYXRpb24sIFNldDxSZXNvdXJjZT4+KCk7XG4gIHByaXZhdGUgZXh0ZXJuYWxTdHlsZVRvQ29tcG9uZW50c01hcCA9IG5ldyBNYXA8QWJzb2x1dGVGc1BhdGgsIFNldDxDbGFzc0RlY2xhcmF0aW9uPj4oKTtcblxuICBnZXRDb21wb25lbnRzV2l0aFRlbXBsYXRlKHRlbXBsYXRlOiBBYnNvbHV0ZUZzUGF0aCk6IFJlYWRvbmx5U2V0PENsYXNzRGVjbGFyYXRpb24+IHtcbiAgICBpZiAoIXRoaXMuZXh0ZXJuYWxUZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5oYXModGVtcGxhdGUpKSB7XG4gICAgICByZXR1cm4gbmV3IFNldCgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4dGVybmFsVGVtcGxhdGVUb0NvbXBvbmVudHNNYXAuZ2V0KHRlbXBsYXRlKSE7XG4gIH1cblxuICByZWdpc3RlclJlc291cmNlcyhyZXNvdXJjZXM6IENvbXBvbmVudFJlc291cmNlcywgY29tcG9uZW50OiBDbGFzc0RlY2xhcmF0aW9uKSB7XG4gICAgaWYgKHJlc291cmNlcy50ZW1wbGF0ZSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5yZWdpc3RlclRlbXBsYXRlKHJlc291cmNlcy50ZW1wbGF0ZSwgY29tcG9uZW50KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBzdHlsZSBvZiByZXNvdXJjZXMuc3R5bGVzKSB7XG4gICAgICB0aGlzLnJlZ2lzdGVyU3R5bGUoc3R5bGUsIGNvbXBvbmVudCk7XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJUZW1wbGF0ZSh0ZW1wbGF0ZVJlc291cmNlOiBSZXNvdXJjZSwgY29tcG9uZW50OiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qge3BhdGh9ID0gdGVtcGxhdGVSZXNvdXJjZTtcbiAgICBpZiAocGF0aCAhPT0gbnVsbCkge1xuICAgICAgaWYgKCF0aGlzLmV4dGVybmFsVGVtcGxhdGVUb0NvbXBvbmVudHNNYXAuaGFzKHBhdGgpKSB7XG4gICAgICAgIHRoaXMuZXh0ZXJuYWxUZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5zZXQocGF0aCwgbmV3IFNldCgpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZXh0ZXJuYWxUZW1wbGF0ZVRvQ29tcG9uZW50c01hcC5nZXQocGF0aCkhLmFkZChjb21wb25lbnQpO1xuICAgIH1cbiAgICB0aGlzLmNvbXBvbmVudFRvVGVtcGxhdGVNYXAuc2V0KGNvbXBvbmVudCwgdGVtcGxhdGVSZXNvdXJjZSk7XG4gIH1cblxuICBnZXRUZW1wbGF0ZShjb21wb25lbnQ6IENsYXNzRGVjbGFyYXRpb24pOiBSZXNvdXJjZXxudWxsIHtcbiAgICBpZiAoIXRoaXMuY29tcG9uZW50VG9UZW1wbGF0ZU1hcC5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmNvbXBvbmVudFRvVGVtcGxhdGVNYXAuZ2V0KGNvbXBvbmVudCkhO1xuICB9XG5cbiAgcmVnaXN0ZXJTdHlsZShzdHlsZVJlc291cmNlOiBSZXNvdXJjZSwgY29tcG9uZW50OiBDbGFzc0RlY2xhcmF0aW9uKTogdm9pZCB7XG4gICAgY29uc3Qge3BhdGh9ID0gc3R5bGVSZXNvdXJjZTtcbiAgICBpZiAoIXRoaXMuY29tcG9uZW50VG9TdHlsZXNNYXAuaGFzKGNvbXBvbmVudCkpIHtcbiAgICAgIHRoaXMuY29tcG9uZW50VG9TdHlsZXNNYXAuc2V0KGNvbXBvbmVudCwgbmV3IFNldCgpKTtcbiAgICB9XG4gICAgaWYgKHBhdGggIT09IG51bGwpIHtcbiAgICAgIGlmICghdGhpcy5leHRlcm5hbFN0eWxlVG9Db21wb25lbnRzTWFwLmhhcyhwYXRoKSkge1xuICAgICAgICB0aGlzLmV4dGVybmFsU3R5bGVUb0NvbXBvbmVudHNNYXAuc2V0KHBhdGgsIG5ldyBTZXQoKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmV4dGVybmFsU3R5bGVUb0NvbXBvbmVudHNNYXAuZ2V0KHBhdGgpIS5hZGQoY29tcG9uZW50KTtcbiAgICB9XG4gICAgdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5nZXQoY29tcG9uZW50KSEuYWRkKHN0eWxlUmVzb3VyY2UpO1xuICB9XG5cbiAgZ2V0U3R5bGVzKGNvbXBvbmVudDogQ2xhc3NEZWNsYXJhdGlvbik6IFNldDxSZXNvdXJjZT4ge1xuICAgIGlmICghdGhpcy5jb21wb25lbnRUb1N0eWxlc01hcC5oYXMoY29tcG9uZW50KSkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY29tcG9uZW50VG9TdHlsZXNNYXAuZ2V0KGNvbXBvbmVudCkhO1xuICB9XG5cbiAgZ2V0Q29tcG9uZW50c1dpdGhTdHlsZShzdHlsZVVybDogQWJzb2x1dGVGc1BhdGgpOiBSZWFkb25seVNldDxDbGFzc0RlY2xhcmF0aW9uPiB7XG4gICAgaWYgKCF0aGlzLmV4dGVybmFsU3R5bGVUb0NvbXBvbmVudHNNYXAuaGFzKHN0eWxlVXJsKSkge1xuICAgICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leHRlcm5hbFN0eWxlVG9Db21wb25lbnRzTWFwLmdldChzdHlsZVVybCkhO1xuICB9XG59XG4iXX0=