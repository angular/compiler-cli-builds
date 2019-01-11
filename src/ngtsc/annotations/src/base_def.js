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
        define("@angular/compiler-cli/src/ngtsc/annotations/src/base_def", ["require", "exports", "tslib", "@angular/compiler", "@angular/compiler-cli/src/ngtsc/annotations/src/util"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var tslib_1 = require("tslib");
    var compiler_1 = require("@angular/compiler");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9kZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9iYXNlX2RlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0Y7SUFNaEYsNkVBQXFDO0lBRXJDLFNBQVMsMkJBQTJCLENBQUMsVUFBOEI7UUFDakUsSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNmLE9BQU8sS0FBSyxDQUFDO1NBQ2Q7UUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQ1gsVUFBQSxTQUFTLElBQUksT0FBQSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEtBQUssV0FBVztZQUNoRSxTQUFTLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQztZQUN4QyxvQkFBYSxDQUFDLFNBQVMsQ0FBQyxFQUZmLENBRWUsQ0FBQyxLQUFLLFNBQVMsQ0FBQztJQUN6RCxDQUFDO0lBRUQ7UUFFRSxpQ0FBb0IsU0FBeUIsRUFBVSxTQUEyQjtZQUE5RCxjQUFTLEdBQVQsU0FBUyxDQUFnQjtZQUFVLGNBQVMsR0FBVCxTQUFTLENBQWtCO1FBQUcsQ0FBQztRQUV0Rix3Q0FBTSxHQUFOLFVBQU8sSUFBeUIsRUFBRSxVQUE0QjtZQUU1RCxJQUFJLDJCQUEyQixDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUMzQyx5RUFBeUU7Z0JBQ3pFLHdEQUF3RDtnQkFDeEQsT0FBTyxTQUFTLENBQUM7YUFDbEI7WUFFRCxJQUFJLE1BQU0sR0FBMEMsU0FBUyxDQUFDO1lBRTlELElBQUksQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsUUFBUTs7Z0JBQzlDLElBQUEsZ0NBQVUsQ0FBYTtnQkFDOUIsSUFBSSxVQUFVLEVBQUU7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O3dCQUN2RCxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsRUFBRTs0QkFDckMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO3lCQUN4RTt3QkFDRCxLQUFLLEdBQUcsYUFBYSxDQUFDO3FCQUN2Qjt5QkFBTTt3QkFDTCxLQUFLLEdBQUcsUUFBUSxDQUFDO3FCQUNsQjtvQkFDRCxTQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQzthQUNKO1lBRUQsT0FBTyxFQUFDLFFBQVEsVUFBQSxFQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELHlDQUFPLEdBQVAsVUFBUSxJQUFvQixFQUFFLFFBQTJCO1lBQ2pELElBQUEsb0RBQXlELEVBQXhELDBCQUFVLEVBQUUsY0FBNEMsQ0FBQztZQUVoRSxPQUFPO2dCQUNMLElBQUksRUFBRSxXQUFXO2dCQUNqQixXQUFXLEVBQUUsVUFBVSxFQUFFLElBQUksTUFBQTtnQkFDN0IsVUFBVSxFQUFFLEVBQUU7YUFDZixDQUFDO1FBQ0osQ0FBQztRQUNILDhCQUFDO0lBQUQsQ0FBQyxBQXhGRCxJQXdGQztJQXhGWSwwREFBdUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7UjNCYXNlUmVmTWV0YURhdGEsIGNvbXBpbGVCYXNlRGVmRnJvbU1ldGFkYXRhfSBmcm9tICdAYW5ndWxhci9jb21waWxlcic7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXJ9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5pbXBvcnQge2lzQW5ndWxhckNvcmV9IGZyb20gJy4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwpOiBib29sZWFuIHtcbiAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBkZWNvcmF0b3JzLmZpbmQoXG4gICAgICAgICAgICAgZGVjb3JhdG9yID0+IChkZWNvcmF0b3IubmFtZSA9PT0gJ0NvbXBvbmVudCcgfHwgZGVjb3JhdG9yLm5hbWUgPT09ICdEaXJlY3RpdmUnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvcmF0b3IubmFtZSA9PT0gJ05nTW9kdWxlJykgJiZcbiAgICAgICAgICAgICAgICAgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSAhPT0gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZURlZkRlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8UjNCYXNlUmVmTWV0YURhdGEsIFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbj4ge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlZmxlY3RvcjogUmVmbGVjdGlvbkhvc3QsIHByaXZhdGUgZXZhbHVhdG9yOiBQYXJ0aWFsRXZhbHVhdG9yKSB7fVxuXG4gIGRldGVjdChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTogUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9uXG4gICAgICB8dW5kZWZpbmVkIHtcbiAgICBpZiAoY29udGFpbnNOZ1RvcExldmVsRGVjb3JhdG9yKGRlY29yYXRvcnMpKSB7XG4gICAgICAvLyBJZiB0aGUgY2xhc3MgaXMgYWxyZWFkeSBkZWNvcmF0ZWQgYnkgQENvbXBvbmVudCBvciBARGlyZWN0aXZlIGxldCB0aGF0XG4gICAgICAvLyBEZWNvcmF0b3JIYW5kbGVyIGhhbmRsZSB0aGlzLiBCYXNlRGVmIGlzIHVubmVjZXNzYXJ5LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0OiBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3Mobm9kZSkuZm9yRWFjaChwcm9wZXJ0eSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9yc30gPSBwcm9wZXJ0eTtcbiAgICAgIGlmIChkZWNvcmF0b3JzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIGRlY29yYXRvcnMpIHtcbiAgICAgICAgICBjb25zdCBkZWNvcmF0b3JOYW1lID0gZGVjb3JhdG9yLm5hbWU7XG4gICAgICAgICAgaWYgKGRlY29yYXRvck5hbWUgPT09ICdJbnB1dCcgJiYgaXNBbmd1bGFyQ29yZShkZWNvcmF0b3IpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICBjb25zdCBpbnB1dHMgPSByZXN1bHQuaW5wdXRzID0gcmVzdWx0LmlucHV0cyB8fCBbXTtcbiAgICAgICAgICAgIGlucHV0cy5wdXNoKHtkZWNvcmF0b3IsIHByb3BlcnR5fSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChkZWNvcmF0b3JOYW1lID09PSAnT3V0cHV0JyAmJiBpc0FuZ3VsYXJDb3JlKGRlY29yYXRvcikpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dHMgPSByZXN1bHQub3V0cHV0cyA9IHJlc3VsdC5vdXRwdXRzIHx8IFtdO1xuICAgICAgICAgICAgb3V0cHV0cy5wdXNoKHtkZWNvcmF0b3IsIHByb3BlcnR5fSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYW5hbHl6ZShub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBtZXRhZGF0YTogUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9uKTpcbiAgICAgIEFuYWx5c2lzT3V0cHV0PFIzQmFzZVJlZk1ldGFEYXRhPiB7XG4gICAgY29uc3QgYW5hbHlzaXM6IFIzQmFzZVJlZk1ldGFEYXRhID0ge307XG4gICAgaWYgKG1ldGFkYXRhLmlucHV0cykge1xuICAgICAgY29uc3QgaW5wdXRzID0gYW5hbHlzaXMuaW5wdXRzID0ge30gYXN7W2tleTogc3RyaW5nXTogc3RyaW5nIHwgW3N0cmluZywgc3RyaW5nXX07XG4gICAgICBtZXRhZGF0YS5pbnB1dHMuZm9yRWFjaCgoe2RlY29yYXRvciwgcHJvcGVydHl9KSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3BOYW1lID0gcHJvcGVydHkubmFtZTtcbiAgICAgICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzO1xuICAgICAgICBsZXQgdmFsdWU6IHN0cmluZ3xbc3RyaW5nLCBzdHJpbmddO1xuICAgICAgICBpZiAoYXJncyAmJiBhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlZFZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoYXJnc1swXSk7XG4gICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW5wdXQgYWxpYXMgZG9lcyBub3QgcmVzb2x2ZSB0byBhIHN0cmluZyB2YWx1ZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IFtyZXNvbHZlZFZhbHVlLCBwcm9wTmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBwcm9wTmFtZTtcbiAgICAgICAgfVxuICAgICAgICBpbnB1dHNbcHJvcE5hbWVdID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAobWV0YWRhdGEub3V0cHV0cykge1xuICAgICAgY29uc3Qgb3V0cHV0cyA9IGFuYWx5c2lzLm91dHB1dHMgPSB7fSBhc3tba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAgICAgbWV0YWRhdGEub3V0cHV0cy5mb3JFYWNoKCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pID0+IHtcbiAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBwcm9wZXJ0eS5uYW1lO1xuICAgICAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3M7XG4gICAgICAgIGxldCB2YWx1ZTogc3RyaW5nO1xuICAgICAgICBpZiAoYXJncyAmJiBhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlZFZhbHVlID0gdGhpcy5ldmFsdWF0b3IuZXZhbHVhdGUoYXJnc1swXSk7XG4gICAgICAgICAgaWYgKHR5cGVvZiByZXNvbHZlZFZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT3V0cHV0IGFsaWFzIGRvZXMgbm90IHJlc29sdmUgdG8gYSBzdHJpbmcgdmFsdWUnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSByZXNvbHZlZFZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gcHJvcE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgb3V0cHV0c1twcm9wTmFtZV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7YW5hbHlzaXN9O1xuICB9XG5cbiAgY29tcGlsZShub2RlOiB0cy5EZWNsYXJhdGlvbiwgYW5hbHlzaXM6IFIzQmFzZVJlZk1ldGFEYXRhKTogQ29tcGlsZVJlc3VsdFtdfENvbXBpbGVSZXN1bHQge1xuICAgIGNvbnN0IHtleHByZXNzaW9uLCB0eXBlfSA9IGNvbXBpbGVCYXNlRGVmRnJvbU1ldGFkYXRhKGFuYWx5c2lzKTtcblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnbmdCYXNlRGVmJyxcbiAgICAgIGluaXRpYWxpemVyOiBleHByZXNzaW9uLCB0eXBlLFxuICAgICAgc3RhdGVtZW50czogW10sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbiB7XG4gIGlucHV0cz86IEFycmF5PHtwcm9wZXJ0eTogQ2xhc3NNZW1iZXIsIGRlY29yYXRvcjogRGVjb3JhdG9yfT47XG4gIG91dHB1dHM/OiBBcnJheTx7cHJvcGVydHk6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3I6IERlY29yYXRvcn0+O1xufVxuIl19