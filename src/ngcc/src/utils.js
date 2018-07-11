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
        define("@angular/compiler-cli/src/ngcc/src/utils", ["require", "exports", "path", "shelljs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path_1 = require("path");
    var shelljs = require("shelljs");
    function findMetadataPaths(rootPath) {
        return shelljs.find(rootPath).filter(function (p) { return /\.metadata\.json$/.test(p); });
    }
    exports.findMetadataPaths = findMetadataPaths;
    function parseMetadataPath(path) {
        var metadataFile = require(path_1.resolve(path));
        var filesSet = new Set();
        Object.keys(metadataFile.origins).forEach(function (key) {
            filesSet.add(metadataFile.origins[key]);
        });
        console.error(filesSet);
        var decorators = {};
        Object.keys(metadataFile.metadata).forEach(function (name) {
            var item = metadataFile.metadata[name];
            if (item.decorators) {
                item.decorators.forEach(function (decorator) {
                    var type = decorator.expression && decorator.expression.name;
                    if (type) {
                        var decoratorHolder = decorators[type] = decorators[type] || [];
                        decoratorHolder.push({ name: name, type: type, args: decorator.arguments });
                    }
                });
            }
        });
        console.error(decorators);
    }
    exports.parseMetadataPath = parseMetadataPath;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7O0lBRUgsNkJBQStCO0lBQy9CLGlDQUFtQztJQUVuQywyQkFBa0MsUUFBZ0I7UUFDaEQsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFGRCw4Q0FFQztJQUVELDJCQUFrQyxJQUFZO1FBQzVDLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxjQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU1QyxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7WUFDM0MsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhCLElBQU0sVUFBVSxHQUFRLEVBQUUsQ0FBQztRQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1lBQzdDLElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLFNBQWM7b0JBQ3JDLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7b0JBQy9ELElBQUksSUFBSSxFQUFFO3dCQUNSLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNsRSxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO3FCQUNqRTtnQkFDSCxDQUFDLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUF4QkQsOENBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBzaGVsbGpzIGZyb20gJ3NoZWxsanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZE1ldGFkYXRhUGF0aHMocm9vdFBhdGg6IHN0cmluZykge1xuICByZXR1cm4gc2hlbGxqcy5maW5kKHJvb3RQYXRoKS5maWx0ZXIocCA9PiAvXFwubWV0YWRhdGFcXC5qc29uJC8udGVzdChwKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1ldGFkYXRhUGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgbWV0YWRhdGFGaWxlID0gcmVxdWlyZShyZXNvbHZlKHBhdGgpKTtcblxuICBjb25zdCBmaWxlc1NldCA9IG5ldyBTZXQoKTtcbiAgT2JqZWN0LmtleXMobWV0YWRhdGFGaWxlLm9yaWdpbnMpLmZvckVhY2goa2V5ID0+IHtcbiAgICBmaWxlc1NldC5hZGQobWV0YWRhdGFGaWxlLm9yaWdpbnNba2V5XSk7XG4gIH0pO1xuICBjb25zb2xlLmVycm9yKGZpbGVzU2V0KTtcblxuICBjb25zdCBkZWNvcmF0b3JzOiBhbnkgPSB7fTtcbiAgT2JqZWN0LmtleXMobWV0YWRhdGFGaWxlLm1ldGFkYXRhKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBtZXRhZGF0YUZpbGUubWV0YWRhdGFbbmFtZV07XG4gICAgaWYgKGl0ZW0uZGVjb3JhdG9ycykge1xuICAgICAgaXRlbS5kZWNvcmF0b3JzLmZvckVhY2goKGRlY29yYXRvcjogYW55KSA9PiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBkZWNvcmF0b3IuZXhwcmVzc2lvbiAmJiBkZWNvcmF0b3IuZXhwcmVzc2lvbi5uYW1lO1xuICAgICAgICBpZiAodHlwZSkge1xuICAgICAgICAgIGNvbnN0IGRlY29yYXRvckhvbGRlciA9IGRlY29yYXRvcnNbdHlwZV0gPSBkZWNvcmF0b3JzW3R5cGVdIHx8IFtdO1xuICAgICAgICAgIGRlY29yYXRvckhvbGRlci5wdXNoKHsgbmFtZSwgdHlwZSwgYXJnczogZGVjb3JhdG9yLmFyZ3VtZW50cyB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBjb25zb2xlLmVycm9yKGRlY29yYXRvcnMpO1xufVxuIl19