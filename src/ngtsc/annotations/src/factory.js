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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/factory", ["require", "exports", "@angular/compiler"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    function compileNgFactoryDefField(metadata) {
        var res = compiler_1.compileFactoryFromMetadata(metadata);
        return {
            name: 'ngFactoryDef',
            initializer: res.factory,
            statements: res.statements,
            type: res.type
        };
    }
    exports.compileNgFactoryDefField = compileNgFactoryDefField;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL2ZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBbUY7SUFJbkYsU0FBZ0Isd0JBQXdCLENBQUMsUUFBOEI7UUFDckUsSUFBTSxHQUFHLEdBQUcscUNBQTBCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDakQsT0FBTztZQUNMLElBQUksRUFBRSxjQUFjO1lBQ3BCLFdBQVcsRUFBRSxHQUFHLENBQUMsT0FBTztZQUN4QixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVU7WUFDMUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1NBQ2YsQ0FBQztJQUNKLENBQUM7SUFSRCw0REFRQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSM0ZhY3RvcnlEZWZNZXRhZGF0YSwgY29tcGlsZUZhY3RvcnlGcm9tTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtDb21waWxlUmVzdWx0fSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZU5nRmFjdG9yeURlZkZpZWxkKG1ldGFkYXRhOiBSM0ZhY3RvcnlEZWZNZXRhZGF0YSk6IENvbXBpbGVSZXN1bHQge1xuICBjb25zdCByZXMgPSBjb21waWxlRmFjdG9yeUZyb21NZXRhZGF0YShtZXRhZGF0YSk7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ25nRmFjdG9yeURlZicsXG4gICAgaW5pdGlhbGl6ZXI6IHJlcy5mYWN0b3J5LFxuICAgIHN0YXRlbWVudHM6IHJlcy5zdGF0ZW1lbnRzLFxuICAgIHR5cGU6IHJlcy50eXBlXG4gIH07XG59XG4iXX0=