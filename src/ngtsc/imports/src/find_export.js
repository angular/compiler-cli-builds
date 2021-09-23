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
        define("@angular/compiler-cli/src/ngtsc/imports/src/find_export", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/util/src/typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.findExportedNameOfNode = void 0;
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var typescript_1 = require("@angular/compiler-cli/src/ngtsc/util/src/typescript");
    /**
     * Find the name, if any, by which a node is exported from a given file.
     */
    function findExportedNameOfNode(target, file, reflector) {
        var e_1, _a;
        var exports = reflector.getExportsOfModule(file);
        if (exports === null) {
            return null;
        }
        var declaredName = (0, typescript_1.isNamedDeclaration)(target) ? target.name.text : null;
        // Look for the export which declares the node.
        var foundExportName = null;
        try {
            for (var exports_1 = (0, tslib_1.__values)(exports), exports_1_1 = exports_1.next(); !exports_1_1.done; exports_1_1 = exports_1.next()) {
                var _b = (0, tslib_1.__read)(exports_1_1.value, 2), exportName = _b[0], declaration = _b[1];
                if (declaration.node !== target) {
                    continue;
                }
                if (exportName === declaredName) {
                    // A non-alias export exists which is always preferred, so use that one.
                    return exportName;
                }
                foundExportName = exportName;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (exports_1_1 && !exports_1_1.done && (_a = exports_1.return)) _a.call(exports_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (foundExportName === null) {
            throw new Error("Failed to find exported name of node (" + target.getText() + ") in '" + file.fileName + "'.");
        }
        return foundExportName;
    }
    exports.findExportedNameOfNode = findExportedNameOfNode;
    /**
     * Check whether a given `ts.Symbol` represents a declaration of a given node.
     *
     * This is not quite as trivial as just checking the declarations, as some nodes are
     * `ts.ExportSpecifier`s and need to be unwrapped.
     */
    function symbolDeclaresNode(sym, node, checker) {
        if (sym.declarations === undefined) {
            return false;
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZF9leHBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2ltcG9ydHMvc3JjL2ZpbmRfZXhwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRzs7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFFakMsa0ZBQTZEO0lBRTdEOztPQUVHO0lBQ0gsU0FBZ0Isc0JBQXNCLENBQ2xDLE1BQWUsRUFBRSxJQUFtQixFQUFFLFNBQXlCOztRQUNqRSxJQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFO1lBQ3BCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxJQUFNLFlBQVksR0FBRyxJQUFBLCtCQUFrQixFQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRTFFLCtDQUErQztRQUMvQyxJQUFJLGVBQWUsR0FBZ0IsSUFBSSxDQUFDOztZQUN4QyxLQUF3QyxJQUFBLFlBQUEsc0JBQUEsT0FBTyxDQUFBLGdDQUFBLHFEQUFFO2dCQUF0QyxJQUFBLEtBQUEseUNBQXlCLEVBQXhCLFVBQVUsUUFBQSxFQUFFLFdBQVcsUUFBQTtnQkFDakMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtvQkFDL0IsU0FBUztpQkFDVjtnQkFFRCxJQUFJLFVBQVUsS0FBSyxZQUFZLEVBQUU7b0JBQy9CLHdFQUF3RTtvQkFDeEUsT0FBTyxVQUFVLENBQUM7aUJBQ25CO2dCQUVELGVBQWUsR0FBRyxVQUFVLENBQUM7YUFDOUI7Ozs7Ozs7OztRQUVELElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUM1QixNQUFNLElBQUksS0FBSyxDQUNYLDJDQUF5QyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQVMsSUFBSSxDQUFDLFFBQVEsT0FBSSxDQUFDLENBQUM7U0FDMUY7UUFDRCxPQUFPLGVBQWUsQ0FBQztJQUN6QixDQUFDO0lBN0JELHdEQTZCQztJQUVEOzs7OztPQUtHO0lBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxHQUFjLEVBQUUsSUFBYSxFQUFFLE9BQXVCO1FBQ2hGLElBQUksR0FBRyxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUU7WUFDbEMsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE9BQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBQSxJQUFJO1lBQy9CLElBQUksRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5QixJQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsbUNBQW1DLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3pFLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRTtvQkFDaEMsT0FBTyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUMxRDthQUNGO1lBQ0QsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtpc05hbWVkRGVjbGFyYXRpb259IGZyb20gJy4uLy4uL3V0aWwvc3JjL3R5cGVzY3JpcHQnO1xuXG4vKipcbiAqIEZpbmQgdGhlIG5hbWUsIGlmIGFueSwgYnkgd2hpY2ggYSBub2RlIGlzIGV4cG9ydGVkIGZyb20gYSBnaXZlbiBmaWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEV4cG9ydGVkTmFtZU9mTm9kZShcbiAgICB0YXJnZXQ6IHRzLk5vZGUsIGZpbGU6IHRzLlNvdXJjZUZpbGUsIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QpOiBzdHJpbmd8bnVsbCB7XG4gIGNvbnN0IGV4cG9ydHMgPSByZWZsZWN0b3IuZ2V0RXhwb3J0c09mTW9kdWxlKGZpbGUpO1xuICBpZiAoZXhwb3J0cyA9PT0gbnVsbCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgZGVjbGFyZWROYW1lID0gaXNOYW1lZERlY2xhcmF0aW9uKHRhcmdldCkgPyB0YXJnZXQubmFtZS50ZXh0IDogbnVsbDtcblxuICAvLyBMb29rIGZvciB0aGUgZXhwb3J0IHdoaWNoIGRlY2xhcmVzIHRoZSBub2RlLlxuICBsZXQgZm91bmRFeHBvcnROYW1lOiBzdHJpbmd8bnVsbCA9IG51bGw7XG4gIGZvciAoY29uc3QgW2V4cG9ydE5hbWUsIGRlY2xhcmF0aW9uXSBvZiBleHBvcnRzKSB7XG4gICAgaWYgKGRlY2xhcmF0aW9uLm5vZGUgIT09IHRhcmdldCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgaWYgKGV4cG9ydE5hbWUgPT09IGRlY2xhcmVkTmFtZSkge1xuICAgICAgLy8gQSBub24tYWxpYXMgZXhwb3J0IGV4aXN0cyB3aGljaCBpcyBhbHdheXMgcHJlZmVycmVkLCBzbyB1c2UgdGhhdCBvbmUuXG4gICAgICByZXR1cm4gZXhwb3J0TmFtZTtcbiAgICB9XG5cbiAgICBmb3VuZEV4cG9ydE5hbWUgPSBleHBvcnROYW1lO1xuICB9XG5cbiAgaWYgKGZvdW5kRXhwb3J0TmFtZSA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEZhaWxlZCB0byBmaW5kIGV4cG9ydGVkIG5hbWUgb2Ygbm9kZSAoJHt0YXJnZXQuZ2V0VGV4dCgpfSkgaW4gJyR7ZmlsZS5maWxlTmFtZX0nLmApO1xuICB9XG4gIHJldHVybiBmb3VuZEV4cG9ydE5hbWU7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhIGdpdmVuIGB0cy5TeW1ib2xgIHJlcHJlc2VudHMgYSBkZWNsYXJhdGlvbiBvZiBhIGdpdmVuIG5vZGUuXG4gKlxuICogVGhpcyBpcyBub3QgcXVpdGUgYXMgdHJpdmlhbCBhcyBqdXN0IGNoZWNraW5nIHRoZSBkZWNsYXJhdGlvbnMsIGFzIHNvbWUgbm9kZXMgYXJlXG4gKiBgdHMuRXhwb3J0U3BlY2lmaWVyYHMgYW5kIG5lZWQgdG8gYmUgdW53cmFwcGVkLlxuICovXG5mdW5jdGlvbiBzeW1ib2xEZWNsYXJlc05vZGUoc3ltOiB0cy5TeW1ib2wsIG5vZGU6IHRzLk5vZGUsIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyKTogYm9vbGVhbiB7XG4gIGlmIChzeW0uZGVjbGFyYXRpb25zID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gc3ltLmRlY2xhcmF0aW9ucy5zb21lKGRlY2wgPT4ge1xuICAgIGlmICh0cy5pc0V4cG9ydFNwZWNpZmllcihkZWNsKSkge1xuICAgICAgY29uc3QgZXhwb3J0ZWRTeW1ib2wgPSBjaGVja2VyLmdldEV4cG9ydFNwZWNpZmllckxvY2FsVGFyZ2V0U3ltYm9sKGRlY2wpO1xuICAgICAgaWYgKGV4cG9ydGVkU3ltYm9sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHN5bWJvbERlY2xhcmVzTm9kZShleHBvcnRlZFN5bWJvbCwgbm9kZSwgY2hlY2tlcik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZWNsID09PSBub2RlO1xuICB9KTtcbn1cbiJdfQ==