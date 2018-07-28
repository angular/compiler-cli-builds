(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/utils", ["require", "exports", "typescript"], factory);
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
    var ts = require("typescript");
    function getOriginalSymbol(checker) {
        return function (symbol) {
            return ts.SymbolFlags.Alias & symbol.flags ? checker.getAliasedSymbol(symbol) : symbol;
        };
    }
    exports.getOriginalSymbol = getOriginalSymbol;
    function isDefined(value) {
        return !!value;
    }
    exports.isDefined = isDefined;
    function getNameText(name) {
        return ts.isIdentifier(name) || ts.isLiteralExpression(name) ? name.text : name.getText();
    }
    exports.getNameText = getNameText;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25nY2Mvc3JjL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBRWpDLDJCQUFrQyxPQUF1QjtRQUN2RCxPQUFPLFVBQVMsTUFBaUI7WUFDL0IsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN6RixDQUFDLENBQUM7SUFDSixDQUFDO0lBSkQsOENBSUM7SUFFRCxtQkFBNkIsS0FBMkI7UUFDdEQsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFGRCw4QkFFQztJQUVELHFCQUE0QixJQUFzQztRQUNoRSxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDNUYsQ0FBQztJQUZELGtDQUVDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmlnaW5hbFN5bWJvbChjaGVja2VyOiB0cy5UeXBlQ2hlY2tlcik6IChzeW1ib2w6IHRzLlN5bWJvbCkgPT4gdHMuU3ltYm9sIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN5bWJvbDogdHMuU3ltYm9sKSB7XG4gICAgcmV0dXJuIHRzLlN5bWJvbEZsYWdzLkFsaWFzICYgc3ltYm9sLmZsYWdzID8gY2hlY2tlci5nZXRBbGlhc2VkU3ltYm9sKHN5bWJvbCkgOiBzeW1ib2w7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQ8VD4odmFsdWU6IFQgfCB1bmRlZmluZWQgfCBudWxsKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiAhIXZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TmFtZVRleHQobmFtZTogdHMuUHJvcGVydHlOYW1lIHwgdHMuQmluZGluZ05hbWUpOiBzdHJpbmcge1xuICByZXR1cm4gdHMuaXNJZGVudGlmaWVyKG5hbWUpIHx8IHRzLmlzTGl0ZXJhbEV4cHJlc3Npb24obmFtZSkgPyBuYW1lLnRleHQgOiBuYW1lLmdldFRleHQoKTtcbn0iXX0=