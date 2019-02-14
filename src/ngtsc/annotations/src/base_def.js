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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/base_def", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/transform", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
    var transform_1 = require("@angular/compiler-cli/src/ngtsc/transform");
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
        function BaseDefDecoratorHandler(reflector, evaluator) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.precedence = transform_1.HandlerPrecedence.WEAK;
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
            if (result !== undefined) {
                return {
                    metadata: result,
                    trigger: null,
                };
            }
            else {
                return undefined;
            }
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
                        var resolvedValue = _this.evaluator.evaluate(args[0]);
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
                        var resolvedValue = _this.evaluator.evaluate(args[0]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9kZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9iYXNlX2RlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0Y7SUFLaEYsdUVBQWlIO0lBQ2pILDZFQUFxQztJQUVyQyxTQUFTLDJCQUEyQixDQUFDLFVBQThCO1FBQ2pFLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNYLFVBQUEsU0FBUyxJQUFJLE9BQUEsQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVc7WUFDaEUsU0FBUyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUM7WUFDeEMsb0JBQWEsQ0FBQyxTQUFTLENBQUMsRUFGZixDQUVlLENBQUMsS0FBSyxTQUFTLENBQUM7SUFDekQsQ0FBQztJQUVEO1FBRUUsaUNBQW9CLFNBQXlCLEVBQVUsU0FBMkI7WUFBOUQsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUV6RSxlQUFVLEdBQUcsNkJBQWlCLENBQUMsSUFBSSxDQUFDO1FBRndDLENBQUM7UUFJdEYsd0NBQU0sR0FBTixVQUFPLElBQXlCLEVBQUUsVUFBNEI7WUFFNUQsSUFBSSwyQkFBMkIsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDM0MseUVBQXlFO2dCQUN6RSx3REFBd0Q7Z0JBQ3hELE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1lBRUQsSUFBSSxNQUFNLEdBQTBDLFNBQVMsQ0FBQztZQUU5RCxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFB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SUFBSSxDQUFDO29CQUM1QixJQUFJLEtBQWEsQ0FBQztvQkFDbEIsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQzNCLElBQU0sYUFBYSxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN2RCxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRTs0QkFDckMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO3lCQUN4RTt3QkFDRCxLQUFLLEdBQUcsYUFBYSxDQUFDO3FCQUN2Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsUUFBUSxDQUFDO3FCQUNsQjtvQkFDRCxTQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQzthQUNKO1lBRUQsT0FBTyxFQUFDLFFBQVEsVUFBQSxFQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELHlDQUFPLEdBQVAsVUFBUSxJQUFvQixFQUFFLFFBQTJCO1lBQ2pELElBQUEsb0RBQXlELEVBQXhELDBCQUFVLEVBQUUsY0FBNEMsQ0FBQztZQUVoRSxPQUFPO2dCQUNMLElBQUksRUFBRSxXQUFXO2dCQUNqQixXQUFXLEVBQUUsVUFBVSxFQUFFLElBQUksTUFBQTtnQkFDN0IsVUFBVSxFQUFFLEVBQUU7YUFDZixDQUFDO1FBQ0osQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQWpHRCxJQWlHQztJQWpHWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UjNCYXNlUmVmTWV0YURhdGEsIGNvbXBpbGVCYXNlRGVmRnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmV9IGZyb20gJy4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwpOiBib29sZWFuIHtcbiAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgICAgICAgZGVjb3JhdG9yID0+IChkZWNvcmF0b3IubmFtZSA9PT0gJ0NvbXBvbmVudCcgfHwgZGVjb3JhdG9yLm5hbWUgPT09ICdEaXJlY3RpdmUnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IubmFtZSA9PT0gJ05nTW9kdWxlJykgJiZcbiAgICAgICAgICAgICAgICAgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSAhPT0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZURlZkRlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8UjNCYXNlUmVmTWV0YURhdGEsIFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuXG4gIGRldGVjdChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIERldGVjdFJlc3VsdDxSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24+fHVuZGVmaW5lZCB7XG4gICAgaWYgKGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzKSkge1xuICAgICAgLy8gSWYgdGhlIGNsYXNzIGlzIGFscmVhZHkgZGVjb3JhdGVkIGJ5IEBDb21wb25lbnQgb3IgQERpcmVjdGl2ZSBsZXQgdGhhdFxuICAgICAgLy8gRGVjb3JhdG9ySGFuZGxlciBoYW5kbGUgdGhpcy4gQmFzZURlZiBpcyB1bm5lY2Vzc2FyeS5cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgbGV0IHJlc3VsdDogUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9ufHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIHRoaXMucmVmbGVjdG9yLmdldE1lbWJlcnNPZkNsYXNzKG5vZGUpLmZvckVhY2gocHJvcGVydHkgPT4ge1xuICAgICAgY29uc3Qge2RlY29yYXRvcnN9ID0gcHJvcGVydHk7XG4gICAgICBpZiAoZGVjb3JhdG9ycykge1xuICAgICAgICBmb3IgKGNvbnN0IGRlY29yYXRvciBvZiBkZWNvcmF0b3JzKSB7XG4gICAgICAgICAgY29uc3QgZGVjb3JhdG9yTmFtZSA9IGRlY29yYXRvci5uYW1lO1xuICAgICAgICAgIGlmIChkZWNvcmF0b3JOYW1lID09PSAnSW5wdXQnICYmIGlzQW5ndWxhckNvcmUoZGVjb3JhdG9yKSkge1xuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0IHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgaW5wdXRzID0gcmVzdWx0LmlucHV0cyA9IHJlc3VsdC5pbnB1dHMgfHwgW107XG4gICAgICAgICAgICBpbnB1dHMucHVzaCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZGVjb3JhdG9yTmFtZSA9PT0gJ091dHB1dCcgJiYgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICBjb25zdCBvdXRwdXRzID0gcmVzdWx0Lm91dHB1dHMgPSByZXN1bHQub3V0cHV0cyB8fCBbXTtcbiAgICAgICAgICAgIG91dHB1dHMucHVzaCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YTogcmVzdWx0LFxuICAgICAgICB0cmlnZ2VyOiBudWxsLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IHRzLkNsYXNzRGVjbGFyYXRpb24sIG1ldGFkYXRhOiBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8UjNCYXNlUmVmTWV0YURhdGE+IHtcbiAgICBjb25zdCBhbmFseXNpczogUjNCYXNlUmVmTWV0YURhdGEgPSB7fTtcbiAgICBpZiAobWV0YWRhdGEuaW5wdXRzKSB7XG4gICAgICBjb25zdCBpbnB1dHMgPSBhbmFseXNpcy5pbnB1dHMgPSB7fSBhc3tba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfTtcbiAgICAgIG1ldGFkYXRhLmlucHV0cy5mb3JFYWNoKCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pID0+IHtcbiAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBwcm9wZXJ0eS5uYW1lO1xuICAgICAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3M7XG4gICAgICAgIGxldCB2YWx1ZTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ107XG4gICAgICAgIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShhcmdzWzBdKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnB1dCBhbGlhcyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgc3RyaW5nIHZhbHVlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gW3Jlc29sdmVkVmFsdWUsIHByb3BOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHByb3BOYW1lO1xuICAgICAgICB9XG4gICAgICAgIGlucHV0c1twcm9wTmFtZV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChtZXRhZGF0YS5vdXRwdXRzKSB7XG4gICAgICBjb25zdCBvdXRwdXRzID0gYW5hbHlzaXMub3V0cHV0cyA9IHt9IGFze1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gICAgICBtZXRhZGF0YS5vdXRwdXRzLmZvckVhY2goKHtkZWNvcmF0b3IsIHByb3BlcnR5fSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wTmFtZSA9IHByb3BlcnR5Lm5hbWU7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncztcbiAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmc7XG4gICAgICAgIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShhcmdzWzBdKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPdXRwdXQgYWxpYXMgZG9lcyBub3QgcmVzb2x2ZSB0byBhIHN0cmluZyB2YWx1ZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IHJlc29sdmVkVmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBwcm9wTmFtZTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRzW3Byb3BOYW1lXSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHthbmFseXNpc307XG4gIH1cblxuICBjb21waWxlKG5vZGU6IHRzLkRlY2xhcmF0aW9uLCBhbmFseXNpczogUjNCYXNlUmVmTWV0YURhdGEpOiBDb21waWxlUmVzdWx0W118Q29tcGlsZVJlc3VsdCB7XG4gICAgY29uc3Qge2V4cHJlc3Npb24sIHR5cGV9ID0gY29tcGlsZUJhc2VEZWZGcm9tTWV0YWRhdGEoYW5hbHlzaXMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWU6ICduZ0Jhc2VEZWYnLFxuICAgICAgaW5pdGlhbGl6ZXI6IGV4cHJlc3Npb24sIHR5cGUsXG4gICAgICBzdGF0ZW1lbnRzOiBbXSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9uIHtcbiAgaW5wdXRzPzogQXJyYXk8e3Byb3BlcnR5OiBDbGFzc01lbWJlciwgZGVjb3JhdG9yOiBEZWNvcmF0b3J9PjtcbiAgb3V0cHV0cz86IEFycmF5PHtwcm9wZXJ0eTogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcjogRGVjb3JhdG9yfT47XG59XG4iXX0=