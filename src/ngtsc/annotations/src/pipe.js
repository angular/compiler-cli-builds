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
            var pipeName = metadata_1.staticallyResolve(pipe.get('name'), this.reflector, this.checker);
            if (typeof pipeName !== 'string') {
                throw new Error("@Pipe.name must be a string");
            }
            this.scopeRegistry.registerPipe(clazz, pipeName);
            var pure = true;
            if (pipe.has('pure')) {
                var pureValue = metadata_1.staticallyResolve(pipe.get('pure'), this.reflector, this.checker);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvYW5ub3RhdGlvbnMvc3JjL3BpcGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBd0c7SUFDeEcsK0JBQWlDO0lBR2pDLHFFQUF1RTtJQUl2RSw2RUFBaUU7SUFFakU7UUFDRSw4QkFDWSxPQUF1QixFQUFVLFNBQXlCLEVBQzFELGFBQW9DLEVBQVUsTUFBZTtZQUQ3RCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1lBQzFELGtCQUFhLEdBQWIsYUFBYSxDQUF1QjtZQUFVLFdBQU0sR0FBTixNQUFNLENBQVM7UUFBRyxDQUFDO1FBRTdFLHFDQUFNLEdBQU4sVUFBTyxTQUFzQjtZQUE3QixpQkFHQztZQUZDLE9BQU8sU0FBUyxDQUFDLElBQUksQ0FDakIsVUFBQSxTQUFTLElBQUksT0FBQSxTQUFTLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUksQ0FBQyxNQUFNLElBQUksb0JBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUF0RSxDQUFzRSxDQUFDLENBQUM7UUFDM0YsQ0FBQztRQUVELHNDQUFPLEdBQVAsVUFBUSxLQUEwQixFQUFFLFNBQW9CO1lBQ3RELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQzthQUMzQztZQUNELElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzdCLElBQU0sSUFBSSxHQUFHLElBQUksMEJBQWUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsSUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixJQUFJLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7YUFDeEQ7WUFDRCxJQUFNLElBQUksR0FBRywrQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV4QyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO2FBQzFEO1lBQ0QsSUFBTSxRQUFRLEdBQUcsNEJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRTtnQkFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRWpELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztZQUNoQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3BCLElBQU0sU0FBUyxHQUFHLDRCQUFpQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFHLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3RGLElBQUksT0FBTyxTQUFTLEtBQUssU0FBUyxFQUFFO29CQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7aUJBQ2pEO2dCQUNELElBQUksR0FBRyxTQUFTLENBQUM7YUFDbEI7WUFFRCxPQUFPO2dCQUNMLFFBQVEsRUFBRTtvQkFDUixJQUFJLE1BQUE7b0JBQ0osSUFBSSxNQUFBO29CQUNKLFFBQVEsVUFBQTtvQkFDUixJQUFJLEVBQUUsaUNBQTBCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksTUFBQTtpQkFDM0U7YUFDRixDQUFDO1FBQ0osQ0FBQztRQUVELHNDQUFPLEdBQVAsVUFBUSxJQUF5QixFQUFFLFFBQXdCO1lBQ3pELElBQU0sR0FBRyxHQUFHLGtDQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxHQUFHLENBQUMsVUFBVTtnQkFDM0IsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2FBQ2YsQ0FBQztRQUNKLENBQUM7UUFDSCwyQkFBQztJQUFELENBQUMsQUE5REQsSUE4REM7SUE5RFksb0RBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge0xpdGVyYWxFeHByLCBSM1BpcGVNZXRhZGF0YSwgV3JhcHBlZE5vZGVFeHByLCBjb21waWxlUGlwZUZyb21NZXRhZGF0YX0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXInO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmltcG9ydCB7RGVjb3JhdG9yLCBSZWZsZWN0aW9uSG9zdH0gZnJvbSAnLi4vLi4vaG9zdCc7XG5pbXBvcnQge3JlZmxlY3RPYmplY3RMaXRlcmFsLCBzdGF0aWNhbGx5UmVzb2x2ZX0gZnJvbSAnLi4vLi4vbWV0YWRhdGEnO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlcn0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtTZWxlY3RvclNjb3BlUmVnaXN0cnl9IGZyb20gJy4vc2VsZWN0b3Jfc2NvcGUnO1xuaW1wb3J0IHtnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcywgaXNBbmd1bGFyQ29yZX0gZnJvbSAnLi91dGlsJztcblxuZXhwb3J0IGNsYXNzIFBpcGVEZWNvcmF0b3JIYW5kbGVyIGltcGxlbWVudHMgRGVjb3JhdG9ySGFuZGxlcjxSM1BpcGVNZXRhZGF0YT4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgY2hlY2tlcjogdHMuVHlwZUNoZWNrZXIsIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCxcbiAgICAgIHByaXZhdGUgc2NvcGVSZWdpc3RyeTogU2VsZWN0b3JTY29wZVJlZ2lzdHJ5LCBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICBkZXRlY3QoZGVjb3JhdG9yOiBEZWNvcmF0b3JbXSk6IERlY29yYXRvcnx1bmRlZmluZWQge1xuICAgIHJldHVybiBkZWNvcmF0b3IuZmluZChcbiAgICAgICAgZGVjb3JhdG9yID0+IGRlY29yYXRvci5uYW1lID09PSAnUGlwZScgJiYgKHRoaXMuaXNDb3JlIHx8IGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkpO1xuICB9XG5cbiAgYW5hbHl6ZShjbGF6ejogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yOiBEZWNvcmF0b3IpOiBBbmFseXNpc091dHB1dDxSM1BpcGVNZXRhZGF0YT4ge1xuICAgIGlmIChjbGF6ei5uYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQFBpcGVzIG11c3QgaGF2ZSBuYW1lc2ApO1xuICAgIH1cbiAgICBjb25zdCBuYW1lID0gY2xhenoubmFtZS50ZXh0O1xuICAgIGNvbnN0IHR5cGUgPSBuZXcgV3JhcHBlZE5vZGVFeHByKGNsYXp6Lm5hbWUpO1xuICAgIGlmIChkZWNvcmF0b3IuYXJncyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBAUGlwZSBtdXN0IGJlIGNhbGxlZGApO1xuICAgIH1cbiAgICBjb25zdCBtZXRhID0gZGVjb3JhdG9yLmFyZ3NbMF07XG4gICAgaWYgKCF0cy5pc09iamVjdExpdGVyYWxFeHByZXNzaW9uKG1ldGEpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYERlY29yYXRvciBhcmd1bWVudCBtdXN0IGJlIGxpdGVyYWwuYCk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGUgPSByZWZsZWN0T2JqZWN0TGl0ZXJhbChtZXRhKTtcblxuICAgIGlmICghcGlwZS5oYXMoJ25hbWUnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBAUGlwZSBkZWNvcmF0b3IgaXMgbWlzc2luZyBuYW1lIGZpZWxkYCk7XG4gICAgfVxuICAgIGNvbnN0IHBpcGVOYW1lID0gc3RhdGljYWxseVJlc29sdmUocGlwZS5nZXQoJ25hbWUnKSAhLCB0aGlzLnJlZmxlY3RvciwgdGhpcy5jaGVja2VyKTtcbiAgICBpZiAodHlwZW9mIHBpcGVOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBAUGlwZS5uYW1lIG11c3QgYmUgYSBzdHJpbmdgKTtcbiAgICB9XG4gICAgdGhpcy5zY29wZVJlZ2lzdHJ5LnJlZ2lzdGVyUGlwZShjbGF6eiwgcGlwZU5hbWUpO1xuXG4gICAgbGV0IHB1cmUgPSB0cnVlO1xuICAgIGlmIChwaXBlLmhhcygncHVyZScpKSB7XG4gICAgICBjb25zdCBwdXJlVmFsdWUgPSBzdGF0aWNhbGx5UmVzb2x2ZShwaXBlLmdldCgncHVyZScpICEsIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgaWYgKHR5cGVvZiBwdXJlVmFsdWUgIT09ICdib29sZWFuJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEBQaXBlLnB1cmUgbXVzdCBiZSBhIGJvb2xlYW5gKTtcbiAgICAgIH1cbiAgICAgIHB1cmUgPSBwdXJlVmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFuYWx5c2lzOiB7XG4gICAgICAgIG5hbWUsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIHBpcGVOYW1lLFxuICAgICAgICBkZXBzOiBnZXRDb25zdHJ1Y3RvckRlcGVuZGVuY2llcyhjbGF6eiwgdGhpcy5yZWZsZWN0b3IsIHRoaXMuaXNDb3JlKSwgcHVyZSxcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBhbmFseXNpczogUjNQaXBlTWV0YWRhdGEpOiBDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCByZXMgPSBjb21waWxlUGlwZUZyb21NZXRhZGF0YShhbmFseXNpcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ1BpcGVEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IHJlcy5leHByZXNzaW9uLFxuICAgICAgc3RhdGVtZW50czogW10sXG4gICAgICB0eXBlOiByZXMudHlwZSxcbiAgICB9O1xuICB9XG59XG4iXX0=