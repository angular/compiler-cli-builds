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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/pipe", ["require", "exports", "@angular/compiler", "typescript", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var compiler_1 = require("@angular/compiler");
    var ts = require("typescript");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    var PipeDecoratorHandler = /** @class */ (function () {
        function PipeDecoratorHandler(checker, reflector, scopeRegistry, isCore) {
            this.checker = checker;
            this.reflector = reflector;
            this.scopeRegistry = scopeRegistry;
            this.isCore = isCore;
        }
        PipeDecoratorHandler.prototype.detect = function (decorator) {
            var _this = this;
            return decorator.find(function (decorator) { return decorator.name === 'Pipe' && (_this.isCore || util_1.isAngularCore(decorator)); });
        };
        PipeDecoratorHandler.prototype.analyze = function (clazz, decorator) {
            if (clazz.name === undefined) {
                throw new Error("@Pipes must have names");
            }
            var name = clazz.name.text;
            var type = new compiler_1.WrappedNodeExpr(clazz.name);
            if (decorator.args === null) {
                throw new Error("@Pipe must be called");
            }
            var meta = decorator.args[0];
            if (!ts.isObjectLiteralExpression(meta)) {
                throw new Error("Decorator argument must be literal.");
            }
            var pipe = metadata_1.reflectObjectLiteral(meta);
            if (!pipe.has('name')) {
                throw new Error("@Pipe decorator is missing name field");
            }
            var pipeName = metadata_1.staticallyResolve(pipe.get('name'), this.checker);
            if (typeof pipeName !== 'string') {
                throw new Error("@Pipe.name must be a string");
            }
            this.scopeRegistry.registerPipe(clazz, pipeName);
            var pure = true;
            if (pipe.has('pure')) {
                var pureValue = metadata_1.staticallyResolve(pipe.get('pure'), this.checker);
                if (typeof pureValue !== 'boolean') {
                    throw new Error("@Pipe.pure must be a boolean");
                }
                pure = pureValue;
            }
            return {
                analysis: {
                    name: name,
                    type: type,
                    pipeName: pipeName,
                    deps: util_1.getConstructorDependencies(clazz, this.reflector, this.isCore), pure: pure,
                }
            };
        };
        PipeDecoratorHandler.prototype.compile = function (node, analysis) {
            var res = compiler_1.compilePipeFromMetadata(analysis);
            return {
                name: 'ngPipeDef',
                initializer: res.expression,
                statements: [],
                type: res.type,
            };
        };
        return PipeDecoratorHandler;
    }());
    exports.PipeDecoratorHandler = PipeDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBd0c7SUFDeEcsK0JBQWlDO0lBR2pDLHFFQUF1RTtJQUl2RSw2RUFBaUU7SUFFakU7UUFDRSw4QkFDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZTtZQUQ3RCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7UUFBRyxDQUFDO1FBRTdFLHFDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUE3QixpQkFHQztZQUZDLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FDakIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUF0RSxDQUFzRSxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHNDQUFPLEdBQVAsVUFBUSxLQUEwQixFQUFFLFNBQW9CO1lBQ3RELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUMzQztZQUNELElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzdCLElBQU0sSUFBSSxHQUFHLElBQUksMEJBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7YUFDeEQ7WUFDRCxJQUFNLElBQUksR0FBRywrQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsSUFBTSxRQUFRLEdBQUcsNEJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDckUsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUU7Z0JBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQzthQUNoRDtZQUNELElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVqRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7WUFDaEIsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNwQixJQUFNLFNBQVMsR0FBRyw0QkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDdEUsSUFBSSxPQUFPLFNBQVMsS0FBSyxTQUFTLEVBQUU7b0JBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztpQkFDakQ7Z0JBQ0QsSUFBSSxHQUFHLFNBQVMsQ0FBQzthQUNsQjtZQUVELE9BQU87Z0JBQ0wsUUFBUSxFQUFFO29CQUNSLElBQUksTUFBQTtvQkFDSixJQUFJLE1BQUE7b0JBQ0osUUFBUSxVQUFBO29CQUNSLElBQUksRUFBRSxpQ0FBMEIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxNQUFBO2lCQUMzRTthQUNGLENBQUM7UUFDSixDQUFDO1FBRUQsc0NBQU8sR0FBUCxVQUFRLElBQXlCLEVBQUUsUUFBd0I7WUFDekQsSUFBTSxHQUFHLEdBQUcsa0NBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDOUMsT0FBTztnQkFDTCxJQUFJLEVBQUUsV0FBVztnQkFDakIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVO2dCQUMzQixVQUFVLEVBQUUsRUFBRTtnQkFDZCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7YUFDZixDQUFDO1FBQ0osQ0FBQztRQUNILDJCQUFDO0lBQUQsQ0FBQyxBQTlERCxJQThEQztJQTlEWSxvREFBb0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7TGl0ZXJhbEV4cHIsIFIzUGlwZU1ldGFkYXRhLCBXcmFwcGVkTm9kZUV4cHIsIGNvbXBpbGVQaXBlRnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7cmVmbGVjdE9iamVjdExpdGVyYWwsIHN0YXRpY2FsbHlSZXNvbHZlfSBmcm9tICcuLi8uLi9tZXRhZGF0YSc7XG5pbXBvcnQge0FuYWx5c2lzT3V0cHV0LCBDb21waWxlUmVzdWx0LCBEZWNvcmF0b3JIYW5kbGVyfSBmcm9tICcuLi8uLi90cmFuc2Zvcm0nO1xuXG5pbXBvcnQge1NlbGVjdG9yU2NvcGVSZWdpc3RyeX0gZnJvbSAnLi9zZWxlY3Rvcl9zY29wZSc7XG5pbXBvcnQge2dldENvbnN0cnVjdG9yRGVwZW5kZW5jaWVzLCBpc0FuZ3VsYXJDb3JlfSBmcm9tICcuL3V0aWwnO1xuXG5leHBvcnQgY2xhc3MgUGlwZURlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50cyBEZWNvcmF0b3JIYW5kbGVyPFIzUGlwZU1ldGFkYXRhPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSBjaGVja2VyOiB0cy5UeXBlQ2hlY2tlciwgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LFxuICAgICAgcHJpdmF0ZSBzY29wZVJlZ2lzdHJ5OiBTZWxlY3RvclNjb3BlUmVnaXN0cnksIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIGRldGVjdChkZWNvcmF0b3I6IERlY29yYXRvcltdKTogRGVjb3JhdG9yfHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIGRlY29yYXRvci5maW5kKFxuICAgICAgICBkZWNvcmF0b3IgPT4gZGVjb3JhdG9yLm5hbWUgPT09ICdQaXBlJyAmJiAodGhpcy5pc0NvcmUgfHwgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSk7XG4gIH1cblxuICBhbmFseXplKGNsYXp6OiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3I6IERlY29yYXRvcik6IEFuYWx5c2lzT3V0cHV0PFIzUGlwZU1ldGFkYXRhPiB7XG4gICAgaWYgKGNsYXp6Lm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBAUGlwZXMgbXVzdCBoYXZlIG5hbWVzYCk7XG4gICAgfVxuICAgIGNvbnN0IG5hbWUgPSBjbGF6ei5uYW1lLnRleHQ7XG4gICAgY29uc3QgdHlwZSA9IG5ldyBXcmFwcGVkTm9kZUV4cHIoY2xhenoubmFtZSk7XG4gICAgaWYgKGRlY29yYXRvci5hcmdzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEBQaXBlIG11c3QgYmUgY2FsbGVkYCk7XG4gICAgfVxuICAgIGNvbnN0IG1ldGEgPSBkZWNvcmF0b3IuYXJnc1swXTtcbiAgICBpZiAoIXRzLmlzT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb24obWV0YSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRGVjb3JhdG9yIGFyZ3VtZW50IG11c3QgYmUgbGl0ZXJhbC5gKTtcbiAgICB9XG4gICAgY29uc3QgcGlwZSA9IHJlZmxlY3RPYmplY3RMaXRlcmFsKG1ldGEpO1xuXG4gICAgaWYgKCFwaXBlLmhhcygnbmFtZScpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEBQaXBlIGRlY29yYXRvciBpcyBtaXNzaW5nIG5hbWUgZmllbGRgKTtcbiAgICB9XG4gICAgY29uc3QgcGlwZU5hbWUgPSBzdGF0aWNhbGx5UmVzb2x2ZShwaXBlLmdldCgnbmFtZScpICEsIHRoaXMuY2hlY2tlcik7XG4gICAgaWYgKHR5cGVvZiBwaXBlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQFBpcGUubmFtZSBtdXN0IGJlIGEgc3RyaW5nYCk7XG4gICAgfVxuICAgIHRoaXMuc2NvcGVSZWdpc3RyeS5yZWdpc3RlclBpcGUoY2xhenosIHBpcGVOYW1lKTtcblxuICAgIGxldCBwdXJlID0gdHJ1ZTtcbiAgICBpZiAocGlwZS5oYXMoJ3B1cmUnKSkge1xuICAgICAgY29uc3QgcHVyZVZhbHVlID0gc3RhdGljYWxseVJlc29sdmUocGlwZS5nZXQoJ3B1cmUnKSAhLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiBwdXJlVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBQaXBlLnB1cmUgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIHB1cmUgPSBwdXJlVmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHBpcGVOYW1lLFxuICAgICAgICBkZXBzOiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHVyZSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNQaXBlTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlUGlwZUZyb21NZXRhZGF0YShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ1BpcGVEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG4iXX0=