(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("angular/packages/compiler-cli/src/ngcc/src/metadata-json-parser", ["require", "exports", "path", "shelljs"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWV0YWRhdGEtanNvbi1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL21ldGFkYXRhLWpzb24tcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsNkJBQStCO0lBQy9CLGlDQUFtQztJQUVuQywyQkFBa0MsUUFBZ0I7UUFDaEQsT0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLENBQUMsSUFBSSxPQUFBLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFGRCw4Q0FFQztJQUVELDJCQUFrQyxJQUFZO1FBQzVDLElBQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxjQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU1QyxJQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFBLEdBQUc7WUFDM0MsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXhCLElBQU0sVUFBVSxHQUFRLEVBQUUsQ0FBQztRQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxJQUFJO1lBQzdDLElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFDLFNBQWM7b0JBQ3JDLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7b0JBQy9ELElBQUksSUFBSSxFQUFFO3dCQUNSLElBQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNsRSxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxNQUFBLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO3FCQUNqRTtnQkFDSCxDQUFDLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUF4QkQsOENBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgc2hlbGxqcyBmcm9tICdzaGVsbGpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRNZXRhZGF0YVBhdGhzKHJvb3RQYXRoOiBzdHJpbmcpIHtcbiAgcmV0dXJuIHNoZWxsanMuZmluZChyb290UGF0aCkuZmlsdGVyKHAgPT4gL1xcLm1ldGFkYXRhXFwuanNvbiQvLnRlc3QocCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VNZXRhZGF0YVBhdGgocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IG1ldGFkYXRhRmlsZSA9IHJlcXVpcmUocmVzb2x2ZShwYXRoKSk7XG5cbiAgY29uc3QgZmlsZXNTZXQgPSBuZXcgU2V0KCk7XG4gIE9iamVjdC5rZXlzKG1ldGFkYXRhRmlsZS5vcmlnaW5zKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgZmlsZXNTZXQuYWRkKG1ldGFkYXRhRmlsZS5vcmlnaW5zW2tleV0pO1xuICB9KTtcbiAgY29uc29sZS5lcnJvcihmaWxlc1NldCk7XG5cbiAgY29uc3QgZGVjb3JhdG9yczogYW55ID0ge307XG4gIE9iamVjdC5rZXlzKG1ldGFkYXRhRmlsZS5tZXRhZGF0YSkuZm9yRWFjaChuYW1lID0+IHtcbiAgICBjb25zdCBpdGVtID0gbWV0YWRhdGFGaWxlLm1ldGFkYXRhW25hbWVdO1xuICAgIGlmIChpdGVtLmRlY29yYXRvcnMpIHtcbiAgICAgIGl0ZW0uZGVjb3JhdG9ycy5mb3JFYWNoKChkZWNvcmF0b3I6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlID0gZGVjb3JhdG9yLmV4cHJlc3Npb24gJiYgZGVjb3JhdG9yLmV4cHJlc3Npb24ubmFtZTtcbiAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JIb2xkZXIgPSBkZWNvcmF0b3JzW3R5cGVdID0gZGVjb3JhdG9yc1t0eXBlXSB8fCBbXTtcbiAgICAgICAgICBkZWNvcmF0b3JIb2xkZXIucHVzaCh7IG5hbWUsIHR5cGUsIGFyZ3M6IGRlY29yYXRvci5hcmd1bWVudHMgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc29sZS5lcnJvcihkZWNvcmF0b3JzKTtcbn1cbiJdfQ==