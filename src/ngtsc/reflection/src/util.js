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
        define("@angular/compiler-cli/src/ngtsc/reflection/src/util", ["require", "exports", "typescript"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isNamedVariableDeclaration = exports.isNamedFunctionDeclaration = exports.isNamedClassDeclaration = void 0;
    var ts = require("typescript");
    function isNamedClassDeclaration(node) {
        return ts.isClassDeclaration(node) && (node.name !== undefined);
    }
    exports.isNamedClassDeclaration = isNamedClassDeclaration;
    function isNamedFunctionDeclaration(node) {
        return ts.isFunctionDeclaration(node) && (node.name !== undefined);
    }
    exports.isNamedFunctionDeclaration = isNamedFunctionDeclaration;
    function isNamedVariableDeclaration(node) {
        return ts.isVariableDeclaration(node) && (node.name !== undefined);
    }
    exports.isNamedVariableDeclaration = isNamedVariableDeclaration;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvcmVmbGVjdGlvbi9zcmMvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCwrQkFBaUM7SUFHakMsU0FBZ0IsdUJBQXVCLENBQUMsSUFBYTtRQUVuRCxPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUhELDBEQUdDO0lBRUQsU0FBZ0IsMEJBQTBCLENBQUMsSUFBYTtRQUV0RCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUhELGdFQUdDO0lBRUQsU0FBZ0IsMEJBQTBCLENBQUMsSUFBYTtRQUV0RCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUhELGdFQUdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q2xhc3NEZWNsYXJhdGlvbn0gZnJvbSAnLi9ob3N0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbjx0cy5DbGFzc0RlY2xhcmF0aW9uPiB7XG4gIHJldHVybiB0cy5pc0NsYXNzRGVjbGFyYXRpb24obm9kZSkgJiYgKG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbjx0cy5GdW5jdGlvbkRlY2xhcmF0aW9uPiB7XG4gIHJldHVybiB0cy5pc0Z1bmN0aW9uRGVjbGFyYXRpb24obm9kZSkgJiYgKG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzTmFtZWRWYXJpYWJsZURlY2xhcmF0aW9uKG5vZGU6IHRzLk5vZGUpOlxuICAgIG5vZGUgaXMgQ2xhc3NEZWNsYXJhdGlvbjx0cy5WYXJpYWJsZURlY2xhcmF0aW9uPiB7XG4gIHJldHVybiB0cy5pc1ZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSkgJiYgKG5vZGUubmFtZSAhPT0gdW5kZWZpbmVkKTtcbn1cbiJdfQ==