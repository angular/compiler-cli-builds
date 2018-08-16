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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/base_def", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/metadata", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var metadata_1 = require("@angular/compiler-cli/src/ngtsc/metadata");
    var util_1 = require("@angular/compiler-cli/src/ngtsc/annotations/src/util");
    function containsNgTopLevelDecorator(decorators) {
        if (!decorators) {
            return false;
        }
        return decorators.find(function (decorator) { return (decorator.name === 'Component' || decorator.name === 'Directive' ||
            decorator.name === 'NgModule') &&
            util_1.isAngularCore(decorator); }) !== undefined;
    }
    var BaseDefDecoratorHandler = /** @class */ (function () {
        function BaseDefDecoratorHandler(checker, reflector) {
            this.checker = checker;
            this.reflector = reflector;
        }
        BaseDefDecoratorHandler.prototype.detect = function (node, decorators) {
            if (containsNgTopLevelDecorator(decorators)) {
                // If the class is already decorated by @Component or @Directive let that
                // DecoratorHandler handle this. BaseDef is unnecessary.
                return undefined;
            }
            var result = undefined;
            this.reflector.getMembersOfClass(node).forEach(function (property) {
                var e_1, _a;
                var decorators = property.decorators;
                if (decorators) {
                    try {
                        for (var decorators_1 = tslib_1.__values(decorators), decorators_1_1 = decorators_1.next(); !decorators_1_1.done; decorators_1_1 = decorators_1.next()) {
                            var decorator = decorators_1_1.value;
                            var decoratorName = decorator.name;
                            if (decoratorName === 'Input' && util_1.isAngularCore(decorator)) {
                                result = result || {};
                                var inputs = result.inputs = result.inputs || [];
                                inputs.push({ decorator: decorator, property: property });
                            }
                            else if (decoratorName === 'Output' && util_1.isAngularCore(decorator)) {
                                result = result || {};
                                var outputs = result.outputs = result.outputs || [];
                                outputs.push({ decorator: decorator, property: property });
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (decorators_1_1 && !decorators_1_1.done && (_a = decorators_1.return)) _a.call(decorators_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
            return result;
        };
        BaseDefDecoratorHandler.prototype.analyze = function (node, metadata) {
            var _this = this;
            var analysis = {};
            if (metadata.inputs) {
                var inputs_1 = analysis.inputs = {};
                metadata.inputs.forEach(function (_a) {
                    var decorator = _a.decorator, property = _a.property;
                    var propName = property.name;
                    var args = decorator.args;
                    var value;
                    if (args && args.length > 0) {
                        var resolvedValue = metadata_1.staticallyResolve(args[0], _this.reflector, _this.checker);
                        if (typeof resolvedValue !== 'string') {
                            throw new TypeError('Input alias does not resolve to a string value');
                        }
                        value = [resolvedValue, propName];
                    }
                    else {
                        value = propName;
                    }
                    inputs_1[propName] = value;
                });
            }
            if (metadata.outputs) {
                var outputs_1 = analysis.outputs = {};
                metadata.outputs.forEach(function (_a) {
                    var decorator = _a.decorator, property = _a.property;
                    var propName = property.name;
                    var args = decorator.args;
                    var value;
                    if (args && args.length > 0) {
                        var resolvedValue = metadata_1.staticallyResolve(args[0], _this.reflector, _this.checker);
                        if (typeof resolvedValue !== 'string') {
                            throw new TypeError('Output alias does not resolve to a string value');
                        }
                        value = resolvedValue;
                    }
                    else {
                        value = propName;
                    }
                    outputs_1[propName] = value;
                });
            }
            return { analysis: analysis };
        };
        BaseDefDecoratorHandler.prototype.compile = function (node, analysis) {
            var _a = compiler_1.compileBaseDefFromMetadata(analysis), expression = _a.expression, type = _a.type;
            return {
                name: 'ngBaseDef',
                initializer: expression, type: type,
                statements: [],
            };
        };
        return BaseDefDecoratorHandler;
    }());
    exports.BaseDefDecoratorHandler = BaseDefDecoratorHandler;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9kZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9iYXNlX2RlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0Y7SUFJaEYscUVBQWlEO0lBRWpELDZFQUFxQztJQUVyQyxxQ0FBcUMsVUFBOEI7UUFDakUsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ1gsVUFBQSxTQUFTLElBQUksT0FBQSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVztZQUNoRSxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztZQUN4QyxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxFQUZmLENBRWUsQ0FBQyxLQUFLLFNBQVMsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7UUFFRSxpQ0FBb0IsT0FBdUIsRUFBVSxTQUF5QjtZQUExRCxZQUFPLEdBQVAsT0FBTyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWdCO1FBQUssQ0FBQztRQUVwRix3Q0FBTSxHQUFOLFVBQU8sSUFBeUIsRUFBRSxVQUE0QjtZQUU1RCxJQUFJLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUMzQyx5RUFBeUU7Z0JBQ3pFLHdEQUF3RDtnQkFDeEQsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxJQUFJLE1BQU0sR0FBMEMsU0FBUyxDQUFDO1lBRTlELElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTs7Z0JBQzlDLElBQUEsZ0NBQVUsQ0FBYTtnQkFDOUIsSUFBSSxVQUFVLEVB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QUUsS0FBSSxDQUFDLFNBQVMsRUFBRSxLQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQy9FLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFOzRCQUNyQyxNQUFNLElBQUksU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7eUJBQ3hFO3dCQUNELEtBQUssR0FBRyxhQUFhLENBQUM7cUJBQ3ZCO3lCQUFNO3dCQUNMLEtBQUssR0FBRyxRQUFRLENBQUM7cUJBQ2xCO29CQUNELFNBQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxPQUFPLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUNwQixDQUFDO1FBRUQseUNBQU8sR0FBUCxVQUFRLElBQW9CLEVBQUUsUUFBMkI7WUFDakQsSUFBQSxvREFBeUQsRUFBeEQsMEJBQVUsRUFBRSxjQUFJLENBQXlDO1lBRWhFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxVQUFVLEVBQUUsSUFBSSxNQUFBO2dCQUM3QixVQUFVLEVBQUUsRUFBRTthQUNmLENBQUM7UUFDSixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBeEZELElBd0ZDO0lBeEZZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSM0Jhc2VSZWZNZXRhRGF0YSwgY29tcGlsZUJhc2VEZWZGcm9tTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge0NsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9ob3N0JztcbmltcG9ydCB7c3RhdGljYWxseVJlc29sdmV9IGZyb20gJy4uLy4uL21ldGFkYXRhJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmV9IGZyb20gJy4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwpOiBib29sZWFuIHtcbiAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgICAgICAgZGVjb3JhdG9yID0+IChkZWNvcmF0b3IubmFtZSA9PT0gJ0NvbXBvbmVudCcgfHwgZGVjb3JhdG9yLm5hbWUgPT09ICdEaXJlY3RpdmUnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IubmFtZSA9PT0gJ05nTW9kdWxlJykgJiZcbiAgICAgICAgICAgICAgICAgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSAhPT0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZURlZkRlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8UjNCYXNlUmVmTWV0YURhdGEsIFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGNoZWNrZXI6IHRzLlR5cGVDaGVja2VyLCBwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsICkge31cblxuICBkZXRlY3Qobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6IFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvblxuICAgICAgfHVuZGVmaW5lZCB7XG4gICAgaWYgKGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzKSkge1xuICAgICAgLy8gSWYgdGhlIGNsYXNzIGlzIGFscmVhZHkgZGVjb3JhdGVkIGJ5IEBDb21wb25lbnQgb3IgQERpcmVjdGl2ZSBsZXQgdGhhdFxuICAgICAgLy8gRGVjb3JhdG9ySGFuZGxlciBoYW5kbGUgdGhpcy4gQmFzZURlZiBpcyB1bm5lY2Vzc2FyeS5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdDogUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZvckVhY2gocHJvcGVydHkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnN9ID0gcHJvcGVydHk7XG4gICAgICBpZiAoZGVjb3JhdG9ycykge1xuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yTmFtZSA9IGRlY29yYXRvci5uYW1lO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3JOYW1lID09PSAnSW5wdXQnICYmIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0IHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgaW5wdXRzID0gcmVzdWx0LmlucHV0cyA9IHJlc3VsdC5pbnB1dHMgfHwgW107XG4gICAgICAgICAgICBpbnB1dHMucHVzaCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVjb3JhdG9yTmFtZSA9PT0gJ091dHB1dCcgJiYgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICBjb25zdCBvdXRwdXRzID0gcmVzdWx0Lm91dHB1dHMgPSByZXN1bHQub3V0cHV0cyB8fCBbXTtcbiAgICAgICAgICAgIG91dHB1dHMucHVzaCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YWRhdGE6IFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbik6XG4gICAgICBBbmFseXNpc091dHB1dDxSM0Jhc2VSZWZNZXRhRGF0YT4ge1xuICAgIGNvbnN0IGFuYWx5c2lzOiBSM0Jhc2VSZWZNZXRhRGF0YSA9IHt9O1xuICAgIGlmIChtZXRhZGF0YS5pbnB1dHMpIHtcbiAgICAgIGNvbnN0IGlucHV0cyA9IGFuYWx5c2lzLmlucHV0cyA9IHt9IGFze1trZXk6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119O1xuICAgICAgbWV0YWRhdGEuaW5wdXRzLmZvckVhY2goKHtkZWNvcmF0b3IsIHByb3BlcnR5fSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wTmFtZSA9IHByb3BlcnR5Lm5hbWU7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncztcbiAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmd8W3N0cmluZywgc3RyaW5nXTtcbiAgICAgICAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRWYWx1ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKGFyZ3NbMF0sIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRWYWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0lucHV0IGFsaWFzIGRvZXMgbm90IHJlc29sdmUgdG8gYSBzdHJpbmcgdmFsdWUnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBbcmVzb2x2ZWRWYWx1ZSwgcHJvcE5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gcHJvcE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5wdXRzW3Byb3BOYW1lXSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGFkYXRhLm91dHB1dHMpIHtcbiAgICAgIGNvbnN0IG91dHB1dHMgPSBhbmFseXNpcy5vdXRwdXRzID0ge30gYXN7W2tleTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAgIG1ldGFkYXRhLm91dHB1dHMuZm9yRWFjaCgoe2RlY29yYXRvciwgcHJvcGVydHl9KSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3BOYW1lID0gcHJvcGVydHkubmFtZTtcbiAgICAgICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzO1xuICAgICAgICBsZXQgdmFsdWU6IHN0cmluZztcbiAgICAgICAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRWYWx1ZSA9IHN0YXRpY2FsbHlSZXNvbHZlKGFyZ3NbMF0sIHRoaXMucmVmbGVjdG9yLCB0aGlzLmNoZWNrZXIpO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRWYWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ091dHB1dCBhbGlhcyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgc3RyaW5nIHZhbHVlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gcmVzb2x2ZWRWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHByb3BOYW1lO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dHNbcHJvcE5hbWVdID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2FuYWx5c2lzfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSM0Jhc2VSZWZNZXRhRGF0YSk6IENvbXBpbGVSZXN1bHRbXXxDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCB7ZXhwcmVzc2lvbiwgdHlwZX0gPSBjb21waWxlQmFzZURlZkZyb21NZXRhZGF0YShhbmFseXNpcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQmFzZURlZicsXG4gICAgICBpbml0aWFsaXplcjogZXhwcmVzc2lvbiwgdHlwZSxcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24ge1xuICBpbnB1dHM/OiBBcnJheTx7cHJvcGVydHk6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3I6IERlY29yYXRvcn0+O1xuICBvdXRwdXRzPzogQXJyYXk8e3Byb3BlcnR5OiBDbGFzc01lbWJlciwgZGVjb3JhdG9yOiBEZWNvcmF0b3J9Pjtcbn1cbiJdfQ==