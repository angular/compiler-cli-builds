(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/src/ngcc/src/rendering/esm5_renderer", ["require", "exports", "tslib", "typescript", "@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var esm_renderer_1 = require("@angular/compiler-cli/src/ngcc/src/rendering/esm_renderer");
    var Esm5Renderer = /** @class */ (function (_super) {
        tslib_1.__extends(Esm5Renderer, _super);
        function Esm5Renderer(host, isCore, rewriteCoreImportsTo, sourcePath, targetPath, transformDts) {
            var _this = _super.call(this, host, isCore, rewriteCoreImportsTo, sourcePath, targetPath, transformDts) || this;
            _this.host = host;
            _this.isCore = isCore;
            _this.rewriteCoreImportsTo = rewriteCoreImportsTo;
            _this.sourcePath = sourcePath;
            _this.targetPath = targetPath;
            return _this;
        }
        /**
         * Add the definitions to each decorated class
         */
        Esm5Renderer.prototype.addDefinitions = function (output, compiledClass, definitions) {
            var classSymbol = this.host.getClassSymbol(compiledClass.declaration);
            if (!classSymbol) {
                throw new Error("Compiled class does not have a valid symbol: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var parent = classSymbol.valueDeclaration && classSymbol.valueDeclaration.parent;
            if (!parent || !ts.isBlock(parent)) {
                throw new Error("Compiled class declaration is not inside an IIFE: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var returnStatement = parent.statements.find(function (statement) { return ts.isReturnStatement(statement); });
            if (!returnStatement) {
                throw new Error("Compiled class wrapper IIFE does not have a return statement: " + compiledClass.name + " in " + compiledClass.declaration.getSourceFile().fileName);
            }
            var insertionPoint = returnStatement.getFullStart();
            output.appendLeft(insertionPoint, '\n' + definitions);
        };
        return Esm5Renderer;
    }(esm_renderer_1.EsmRenderer));
    exports.Esm5Renderer = Esm5Renderer;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNtNV9yZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmdjYy9zcmMvcmVuZGVyaW5nL2VzbTVfcmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0lBQUE7Ozs7OztPQU1HO0lBQ0gsK0JBQWlDO0lBSWpDLDBGQUEyQztJQUUzQztRQUFrQyx3Q0FBVztRQUMzQyxzQkFDYyxJQUF3QixFQUFZLE1BQWUsRUFDbkQsb0JBQXdDLEVBQVksVUFBa0IsRUFDdEUsVUFBa0IsRUFBRSxZQUFxQjtZQUh2RCxZQUlFLGtCQUFNLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsU0FDaEY7WUFKYSxVQUFJLEdBQUosSUFBSSxDQUFvQjtZQUFZLFlBQU0sR0FBTixNQUFNLENBQVM7WUFDbkQsMEJBQW9CLEdBQXBCLG9CQUFvQixDQUFvQjtZQUFZLGdCQUFVLEdBQVYsVUFBVSxDQUFRO1lBQ3RFLGdCQUFVLEdBQVYsVUFBVSxDQUFROztRQUVoQyxDQUFDO1FBRUQ7O1dBRUc7UUFDSCxxQ0FBYyxHQUFkLFVBQWUsTUFBbUIsRUFBRSxhQUE0QixFQUFFLFdBQW1CO1lBQ25GLElBQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN4RSxJQUFJLENBQUMsV0FBVyxFQUFFO2dCQUNoQixNQUFNLElBQUksS0FBSyxDQUNYLGtEQUFnRCxhQUFhLENBQUMsSUFBSSxZQUFPLGFBQWEsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBVSxDQUFDLENBQUM7YUFDcEk7WUFDRCxJQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsZ0JBQWdCLElBQUksV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztZQUNuRixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDbEMsTUFBTSxJQUFJLEtBQUssQ0FDWCx1REFBcUQsYUFBYSxDQUFDLElBQUksWUFBTyxhQUFhLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLFFBQVUsQ0FBQyxDQUFDO2FBQ3pJO1lBQ0QsSUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBQSxTQUFTLElBQUksT0FBQSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQS9CLENBQStCLENBQUMsQ0FBQztZQUM3RixJQUFJLENBQUMsZUFBZSxFQUFFO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUNYLG1FQUFpRSxhQUFhLENBQUMsSUFBSSxZQUFPLGFBQWEsQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsUUFBVSxDQUFDLENBQUM7YUFDcko7WUFDRCxJQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDSCxtQkFBQztJQUFELENBQUMsQUE5QkQsQ0FBa0MsMEJBQVcsR0E4QjVDO0lBOUJZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgTWFnaWNTdHJpbmcgZnJvbSAnbWFnaWMtc3RyaW5nJztcbmltcG9ydCB7TmdjY1JlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi9ob3N0L25nY2NfaG9zdCc7XG5pbXBvcnQge0NvbXBpbGVkQ2xhc3N9IGZyb20gJy4uL2FuYWx5c2lzL2RlY29yYXRpb25fYW5hbHl6ZXInO1xuaW1wb3J0IHtFc21SZW5kZXJlcn0gZnJvbSAnLi9lc21fcmVuZGVyZXInO1xuXG5leHBvcnQgY2xhc3MgRXNtNVJlbmRlcmVyIGV4dGVuZHMgRXNtUmVuZGVyZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByb3RlY3RlZCBob3N0OiBOZ2NjUmVmbGVjdGlvbkhvc3QsIHByb3RlY3RlZCBpc0NvcmU6IGJvb2xlYW4sXG4gICAgICBwcm90ZWN0ZWQgcmV3cml0ZUNvcmVJbXBvcnRzVG86IHRzLlNvdXJjZUZpbGV8bnVsbCwgcHJvdGVjdGVkIHNvdXJjZVBhdGg6IHN0cmluZyxcbiAgICAgIHByb3RlY3RlZCB0YXJnZXRQYXRoOiBzdHJpbmcsIHRyYW5zZm9ybUR0czogYm9vbGVhbikge1xuICAgIHN1cGVyKGhvc3QsIGlzQ29yZSwgcmV3cml0ZUNvcmVJbXBvcnRzVG8sIHNvdXJjZVBhdGgsIHRhcmdldFBhdGgsIHRyYW5zZm9ybUR0cyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIHRoZSBkZWZpbml0aW9ucyB0byBlYWNoIGRlY29yYXRlZCBjbGFzc1xuICAgKi9cbiAgYWRkRGVmaW5pdGlvbnMob3V0cHV0OiBNYWdpY1N0cmluZywgY29tcGlsZWRDbGFzczogQ29tcGlsZWRDbGFzcywgZGVmaW5pdGlvbnM6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGNsYXNzU3ltYm9sID0gdGhpcy5ob3N0LmdldENsYXNzU3ltYm9sKGNvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24pO1xuICAgIGlmICghY2xhc3NTeW1ib2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgQ29tcGlsZWQgY2xhc3MgZG9lcyBub3QgaGF2ZSBhIHZhbGlkIHN5bWJvbDogJHtjb21waWxlZENsYXNzLm5hbWV9IGluICR7Y29tcGlsZWRDbGFzcy5kZWNsYXJhdGlvbi5nZXRTb3VyY2VGaWxlKCkuZmlsZU5hbWV9YCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcmVudCA9IGNsYXNzU3ltYm9sLnZhbHVlRGVjbGFyYXRpb24gJiYgY2xhc3NTeW1ib2wudmFsdWVEZWNsYXJhdGlvbi5wYXJlbnQ7XG4gICAgaWYgKCFwYXJlbnQgfHwgIXRzLmlzQmxvY2socGFyZW50KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDb21waWxlZCBjbGFzcyBkZWNsYXJhdGlvbiBpcyBub3QgaW5zaWRlIGFuIElJRkU6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfSBpbiAke2NvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCByZXR1cm5TdGF0ZW1lbnQgPSBwYXJlbnQuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB0cy5pc1JldHVyblN0YXRlbWVudChzdGF0ZW1lbnQpKTtcbiAgICBpZiAoIXJldHVyblN0YXRlbWVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBDb21waWxlZCBjbGFzcyB3cmFwcGVyIElJRkUgZG9lcyBub3QgaGF2ZSBhIHJldHVybiBzdGF0ZW1lbnQ6ICR7Y29tcGlsZWRDbGFzcy5uYW1lfSBpbiAke2NvbXBpbGVkQ2xhc3MuZGVjbGFyYXRpb24uZ2V0U291cmNlRmlsZSgpLmZpbGVOYW1lfWApO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25Qb2ludCA9IHJldHVyblN0YXRlbWVudC5nZXRGdWxsU3RhcnQoKTtcbiAgICBvdXRwdXQuYXBwZW5kTGVmdChpbnNlcnRpb25Qb2ludCwgJ1xcbicgKyBkZWZpbml0aW9ucyk7XG4gIH1cbn1cbiJdfQ==