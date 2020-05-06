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
        define("@angular/compiler-cli/src/ngtsc/typecheck/src/augmented_program", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngtsc/typecheck/src/api", "@angular/compiler-cli/src/ngtsc/typecheck/src/host"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var ts = require("typescript");
    var api_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/api");
    var host_1 = require("@angular/compiler-cli/src/ngtsc/typecheck/src/host");
    /**
     * Implements a template type-checking program using `ts.createProgram` and TypeScript's program
     * reuse functionality.
     */
    var ReusedProgramStrategy = /** @class */ (function () {
        function ReusedProgramStrategy(program, originalHost, options, shimExtensionPrefixes) {
            this.program = program;
            this.originalHost = originalHost;
            this.options = options;
            this.shimExtensionPrefixes = shimExtensionPrefixes;
            /**
             * A map of source file paths to replacement `ts.SourceFile`s for those paths.
             *
             * Effectively, this tracks the delta between the user's program (represented by the
             * `originalHost`) and the template type-checking program being managed.
             */
            this.sfMap = new Map();
        }
        ReusedProgramStrategy.prototype.getProgram = function () {
            return this.program;
        };
        ReusedProgramStrategy.prototype.updateFiles = function (contents, updateMode) {
            var e_1, _a;
            if (updateMode === api_1.UpdateMode.Complete) {
                this.sfMap.clear();
            }
            try {
                for (var _b = tslib_1.__values(contents.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_1.__read(_c.value, 2), filePath = _d[0], text = _d[1];
                    this.sfMap.set(filePath, ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var host = new host_1.TypeCheckProgramHost(this.sfMap, this.originalHost, this.shimExtensionPrefixes);
            this.program = ts.createProgram({
                host: host,
                rootNames: this.program.getRootFileNames(),
                options: this.options,
                oldProgram: this.program,
            });
            host.postProgramCreationCleanup();
        };
        return ReusedProgramStrategy;
    }());
    exports.ReusedProgramStrategy = ReusedProgramStrategy;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXVnbWVudGVkX3Byb2dyYW0uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3R5cGVjaGVjay9zcmMvYXVnbWVudGVkX3Byb2dyYW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7O0lBRUgsK0JBQWlDO0lBSWpDLHlFQUE4RDtJQUM5RCwyRUFBNEM7SUFFNUM7OztPQUdHO0lBQ0g7UUFTRSwrQkFDWSxPQUFtQixFQUFVLFlBQTZCLEVBQzFELE9BQTJCLEVBQVUscUJBQStCO1lBRHBFLFlBQU8sR0FBUCxPQUFPLENBQVk7WUFBVSxpQkFBWSxHQUFaLFlBQVksQ0FBaUI7WUFDMUQsWUFBTyxHQUFQLE9BQU8sQ0FBb0I7WUFBVSwwQkFBcUIsR0FBckIscUJBQXFCLENBQVU7WUFWaEY7Ozs7O2VBS0c7WUFDSyxVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7UUFJa0MsQ0FBQztRQUVwRiwwQ0FBVSxHQUFWO1lBQ0UsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3RCLENBQUM7UUFFRCwyQ0FBVyxHQUFYLFVBQVksUUFBcUMsRUFBRSxVQUFzQjs7WUFDdkUsSUFBSSxVQUFVLEtBQUssZ0JBQVUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDcEI7O2dCQUVELEtBQStCLElBQUEsS0FBQSxpQkFBQSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUEsZ0JBQUEsNEJBQUU7b0JBQXhDLElBQUEsZ0NBQWdCLEVBQWYsZ0JBQVEsRUFBRSxZQUFJO29CQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDN0Y7Ozs7Ozs7OztZQUVELElBQU0sSUFBSSxHQUNOLElBQUksMkJBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQztnQkFDOUIsSUFBSSxNQUFBO2dCQUNKLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFO2dCQUMxQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTzthQUN6QixDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztRQUNwQyxDQUFDO1FBQ0gsNEJBQUM7SUFBRCxDQUFDLEFBcENELElBb0NDO0lBcENZLHNEQUFxQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7QWJzb2x1dGVGc1BhdGh9IGZyb20gJy4uLy4uL2ZpbGVfc3lzdGVtJztcblxuaW1wb3J0IHtUeXBlQ2hlY2tpbmdQcm9ncmFtU3RyYXRlZ3ksIFVwZGF0ZU1vZGV9IGZyb20gJy4vYXBpJztcbmltcG9ydCB7VHlwZUNoZWNrUHJvZ3JhbUhvc3R9IGZyb20gJy4vaG9zdCc7XG5cbi8qKlxuICogSW1wbGVtZW50cyBhIHRlbXBsYXRlIHR5cGUtY2hlY2tpbmcgcHJvZ3JhbSB1c2luZyBgdHMuY3JlYXRlUHJvZ3JhbWAgYW5kIFR5cGVTY3JpcHQncyBwcm9ncmFtXG4gKiByZXVzZSBmdW5jdGlvbmFsaXR5LlxuICovXG5leHBvcnQgY2xhc3MgUmV1c2VkUHJvZ3JhbVN0cmF0ZWd5IGltcGxlbWVudHMgVHlwZUNoZWNraW5nUHJvZ3JhbVN0cmF0ZWd5IHtcbiAgLyoqXG4gICAqIEEgbWFwIG9mIHNvdXJjZSBmaWxlIHBhdGhzIHRvIHJlcGxhY2VtZW50IGB0cy5Tb3VyY2VGaWxlYHMgZm9yIHRob3NlIHBhdGhzLlxuICAgKlxuICAgKiBFZmZlY3RpdmVseSwgdGhpcyB0cmFja3MgdGhlIGRlbHRhIGJldHdlZW4gdGhlIHVzZXIncyBwcm9ncmFtIChyZXByZXNlbnRlZCBieSB0aGVcbiAgICogYG9yaWdpbmFsSG9zdGApIGFuZCB0aGUgdGVtcGxhdGUgdHlwZS1jaGVja2luZyBwcm9ncmFtIGJlaW5nIG1hbmFnZWQuXG4gICAqL1xuICBwcml2YXRlIHNmTWFwID0gbmV3IE1hcDxzdHJpbmcsIHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgICBwcml2YXRlIHByb2dyYW06IHRzLlByb2dyYW0sIHByaXZhdGUgb3JpZ2luYWxIb3N0OiB0cy5Db21waWxlckhvc3QsXG4gICAgICBwcml2YXRlIG9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgcHJpdmF0ZSBzaGltRXh0ZW5zaW9uUHJlZml4ZXM6IHN0cmluZ1tdKSB7fVxuXG4gIGdldFByb2dyYW0oKTogdHMuUHJvZ3JhbSB7XG4gICAgcmV0dXJuIHRoaXMucHJvZ3JhbTtcbiAgfVxuXG4gIHVwZGF0ZUZpbGVzKGNvbnRlbnRzOiBNYXA8QWJzb2x1dGVGc1BhdGgsIHN0cmluZz4sIHVwZGF0ZU1vZGU6IFVwZGF0ZU1vZGUpOiB2b2lkIHtcbiAgICBpZiAodXBkYXRlTW9kZSA9PT0gVXBkYXRlTW9kZS5Db21wbGV0ZSkge1xuICAgICAgdGhpcy5zZk1hcC5jbGVhcigpO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgW2ZpbGVQYXRoLCB0ZXh0XSBvZiBjb250ZW50cy5lbnRyaWVzKCkpIHtcbiAgICAgIHRoaXMuc2ZNYXAuc2V0KGZpbGVQYXRoLCB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGVQYXRoLCB0ZXh0LCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgaG9zdCA9XG4gICAgICAgIG5ldyBUeXBlQ2hlY2tQcm9ncmFtSG9zdCh0aGlzLnNmTWFwLCB0aGlzLm9yaWdpbmFsSG9zdCwgdGhpcy5zaGltRXh0ZW5zaW9uUHJlZml4ZXMpO1xuICAgIHRoaXMucHJvZ3JhbSA9IHRzLmNyZWF0ZVByb2dyYW0oe1xuICAgICAgaG9zdCxcbiAgICAgIHJvb3ROYW1lczogdGhpcy5wcm9ncmFtLmdldFJvb3RGaWxlTmFtZXMoKSxcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIG9sZFByb2dyYW06IHRoaXMucHJvZ3JhbSxcbiAgICB9KTtcbiAgICBob3N0LnBvc3RQcm9ncmFtQ3JlYXRpb25DbGVhbnVwKCk7XG4gIH1cbn1cbiJdfQ==