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
        define("@angular/compiler-cli/src/ngtsc/imports/src/find_export", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findExportedNameOfNode = void 0;
    var ts = require("typescript");
    /**
     * Find the name, if any, by which a node is exported from a given file.
     */
    function findExportedNameOfNode(target, file, reflector) {
        var exports = reflector.getExportsOfModule(file);
        if (exports === null) {
            return null;
        }
        // Look for the export which declares the node.
        var keys = Array.from(exports.keys());
        var name = keys.find(function (key) {
            var decl = exports.get(key);
            return decl !== undefined && decl.node === target;
        });
        if (name === undefined) {
            throw new Error("Failed to find exported name of node (" + target.getText() + ") in '" + file.fileName + "'.");
        }
        return name;
    }
    exports.findExportedNameOfNode = findExportedNameOfNode;
    /**
     * Check whether a given `ts.Symbol` represents a declaration of a given node.
     *
     * This is not quite as trivial as just checking the declarations, as some nodes are
     * `ts.ExportSpecifier`s and need to be unwrapped.
     */
    function symbolDeclaresNode(sym, node, checker) {
        return sym.declarations.some(function (decl) {
            if (ts.isExportSpecifier(decl)) {
                var exportedSymbol = checker.getExportSpecifierLocalTargetSymbol(decl);
                if (exportedSymbol !== undefined) {
                    return symbolDeclaresNode(exportedSymbol, node, checker);
                }
            }
            return decl === node;
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZF9leHBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2ZpbmRfZXhwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7OztJQUVILCtCQUFpQztJQUdqQzs7T0FFRztJQUNILFNBQWdCLHNCQUFzQixDQUNsQyxNQUFlLEVBQUUsSUFBbUIsRUFBRSxTQUF5QjtRQUNqRSxJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCwrQ0FBK0M7UUFDL0MsSUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4QyxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUEsR0FBRztZQUN4QixJQUFNLElBQUksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUNYLDJDQUF5QyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQVMsSUFBSSxDQUFDLFFBQVEsT0FBSSxDQUFDLENBQUM7U0FDMUY7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFsQkQsd0RBa0JDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLGtCQUFrQixDQUFDLEdBQWMsRUFBRSxJQUFhLEVBQUUsT0FBdUI7UUFDaEYsT0FBTyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFBLElBQUk7WUFDL0IsSUFBSSxFQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzlCLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekUsSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFO29CQUNoQyxPQUFPLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7aUJBQzFEO2FBQ0Y7WUFDRCxPQUFPLElBQUksS0FBSyxJQUFJLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuXG4vKipcbiAqIEZpbmQgdGhlIG5hbWUsIGlmIGFueSwgYnkgd2hpY2ggYSBub2RlIGlzIGV4cG9ydGVkIGZyb20gYSBnaXZlbiBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShcbiAgICB0YXJnZXQ6IHRzLk5vZGUsIGZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IGV4cG9ydHMgPSByZWZsZWN0b3IuZ2V0RXhwb3J0c09mTW9kdWxlKGZpbGUpO1xuICBpZiAoZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIC8vIExvb2sgZm9yIHRoZSBleHBvcnQgd2hpY2ggZGVjbGFyZXMgdGhlIG5vZGUuXG4gIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKGV4cG9ydHMua2V5cygpKTtcbiAgY29uc3QgbmFtZSA9IGtleXMuZmluZChrZXkgPT4ge1xuICAgIGNvbnN0IGRlY2wgPSBleHBvcnRzLmdldChrZXkpO1xuICAgIHJldHVybiBkZWNsICE9PSB1bmRlZmluZWQgJiYgZGVjbC5ub2RlID09PSB0YXJnZXQ7XG4gIH0pO1xuXG4gIGlmIChuYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gZmluZCBleHBvcnRlZCBuYW1lIG9mIG5vZGUgKCR7dGFyZ2V0LmdldFRleHQoKX0pIGluICcke2ZpbGUuZmlsZU5hbWV9Jy5gKTtcbiAgfVxuICByZXR1cm4gbmFtZTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGEgZ2l2ZW4gYHRzLlN5bWJvbGAgcmVwcmVzZW50cyBhIGRlY2xhcmF0aW9uIG9mIGEgZ2l2ZW4gbm9kZS5cbiAqXG4gKiBUaGlzIGlzIG5vdCBxdWl0ZSBhcyB0cml2aWFsIGFzIGp1c3QgY2hlY2tpbmcgdGhlIGRlY2xhcmF0aW9ucywgYXMgc29tZSBub2RlcyBhcmVcbiAqIGB0cy5FeHBvcnRTcGVjaWZpZXJgcyBhbmQgbmVlZCB0byBiZSB1bndyYXBwZWQuXG4gKi9cbmZ1bmN0aW9uIHN5bWJvbERlY2xhcmVzTm9kZShzeW06IHRzLlN5bWJvbCwgbm9kZTogdHMuTm9kZSwgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIHN5bS5kZWNsYXJhdGlvbnMuc29tZShkZWNsID0+IHtcbiAgICBpZiAodHMuaXNFeHBvcnRTcGVjaWZpZXIoZGVjbCkpIHtcbiAgICAgIGNvbnN0IGV4cG9ydGVkU3ltYm9sID0gY2hlY2tlci5nZXRFeHBvcnRTcGVjaWZpZXJMb2NhbFRhcmdldFN5bWJvbChkZWNsKTtcbiAgICAgIGlmIChleHBvcnRlZFN5bWJvbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzeW1ib2xEZWNsYXJlc05vZGUoZXhwb3J0ZWRTeW1ib2wsIG5vZGUsIGNoZWNrZXIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVjbCA9PT0gbm9kZTtcbiAgfSk7XG59XG4iXX0=