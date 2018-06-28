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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var PipeDecoratorHandler = /** @class */ (function () {
        function PipeDecoratorHandler(reflector, isCore) {
            this.reflector = reflector;
            this.isCore = isCore;
        }
        PipeDecoratorHandler.prototype.detect = function (decorator) {
            var _this = this;
            return decorator.find(function (decorator) { return decorator.name === 'Pipe' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        PipeDecoratorHandler.prototype.analyze = function (node, decorator) {
            return {
                analysis: 'test',
            };
        };
        PipeDecoratorHandler.prototype.compile = function (node, analysis) {
            return {
                name: 'ngPipeDef',
                initializer: new compiler_1.LiteralExpr(null),
                statements: [],
                type: new compiler_1.ExpressionType(new compiler_1.LiteralExpr(null)),
            };
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBNE07SUFNNU0sNkVBQXFDO0lBRXJDO1FBQ0UsOEJBQW9CLFNBQXlCLEVBQVUsTUFBZTtZQUFsRCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7UUFBRyxDQUFDO1FBRTFFLHFDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUE3QixpQkFHQztZQUZDLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FDakIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUF0RSxDQUFzRSxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHNDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFNBQW9CO1lBQ3JELE9BQU87Z0JBQ0wsUUFBUSxFQUFFLE1BQU07YUFDakIsQ0FBQztRQUNKLENBQUM7UUFFRCxzQ0FBTyxHQUFQLFVBQVEsSUFBeUIsRUFBRSxRQUFnQjtZQUNqRCxPQUFPO2dCQUNMLElBQUksRUFBRSxXQUFXO2dCQUNqQixXQUFXLEVBQUUsSUFBSSxzQkFBVyxDQUFDLElBQUksQ0FBQztnQkFDbEMsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLElBQUkseUJBQWMsQ0FBQyxJQUFJLHNCQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEQsQ0FBQztRQUNKLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUF0QkQsSUFzQkM7SUF0Qlksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0V4cHJlc3Npb24sIEV4cHJlc3Npb25UeXBlLCBMaXRlcmFsRXhwciwgUjNEZXBlbmRlbmN5TWV0YWRhdGEsIFIzSW5qZWN0YWJsZU1ldGFkYXRhLCBSM1Jlc29sdmVkRGVwZW5kZW5jeVR5cGUsIFdyYXBwZWROb2RlRXhwciwgY29tcGlsZUluamVjdGFibGUgYXMgY29tcGlsZUl2eUluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0RlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL2hvc3QnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtpc0FuZ3VsYXJDb3JlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY2xhc3MgUGlwZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPHN0cmluZz4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3I6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdQaXBlJyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIGRlY29yYXRvcjogRGVjb3JhdG9yKTogQW5hbHlzaXNPdXRwdXQ8c3RyaW5nPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiAndGVzdCcsXG4gICAgfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgYW5hbHlzaXM6IHN0cmluZyk6IENvbXBpbGVSZXN1bHQge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdQaXBlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiBuZXcgTGl0ZXJhbEV4cHIobnVsbCksXG4gICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICAgIHR5cGU6IG5ldyBFeHByZXNzaW9uVHlwZShuZXcgTGl0ZXJhbEV4cHIobnVsbCkpLFxuICAgIH07XG4gIH1cbn1cbiJdfQ==