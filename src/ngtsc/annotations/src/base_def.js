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
    function containsNgTopLevelDecorator(decorators, isCore) {
        if (!decorators) {
            return false;
        }
        return decorators.some(function (decorator) { return util_1.isAngularDecorator(decorator, 'Component', isCore) ||
            util_1.isAngularDecorator(decorator, 'Directive', isCore) ||
            util_1.isAngularDecorator(decorator, 'NgModule', isCore); });
    }
    var BaseDefDecoratorHandler = /** @class */ (function () {
        function BaseDefDecoratorHandler(reflector, evaluator, isCore) {
            this.reflector = reflector;
            this.evaluator = evaluator;
            this.isCore = isCore;
            this.precedence = transform_1.HandlerPrecedence.WEAK;
        }
        BaseDefDecoratorHandler.prototype.detect = function (node, decorators) {
            var _this = this;
            if (containsNgTopLevelDecorator(decorators, this.isCore)) {
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
                            if (util_1.isAngularDecorator(decorator, 'Input', _this.isCore)) {
                                result = result || {};
                                var inputs = result.inputs = result.inputs || [];
                                inputs.push({ decorator: decorator, property: property });
                            }
                            else if (util_1.isAngularDecorator(decorator, 'Output', _this.isCore)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9kZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9iYXNlX2RlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0Y7SUFJaEYsdUVBQWlIO0lBRWpILDZFQUEwQztJQUUxQyxTQUFTLDJCQUEyQixDQUFDLFVBQThCLEVBQUUsTUFBZTtRQUNsRixJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUMzRCx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUNsRCx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUZ4QyxDQUV3QyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVEO1FBRUUsaUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxNQUFlO1lBRGYsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRWxCLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxJQUFJLENBQUM7UUFGZixDQUFDO1FBSS9CLHdDQUFNLEdBQU4sVUFBTyxJQUFzQixFQUFFLFVBQTRCO1lBQTNELGlCQW1DQztZQWpDQyxJQUFJLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3hELHlFQUF5RTtnQkFDekUsd0RBQXdEO2dCQUN4RCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELElBQUksTUFB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QU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQy9CLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQzVCLElBQUksS0FBYSxDQUFDO29CQUNsQixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDM0IsSUFBTSxhQUFhLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZELElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFOzRCQUNyQyxNQUFNLElBQUksU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7eUJBQ3hFO3dCQUNELEtBQUssR0FBRyxhQUFhLENBQUM7cUJBQ3ZCO3lCQUFNO3dCQUNMLEtBQUssR0FBRyxRQUFRLENBQUM7cUJBQ2xCO29CQUNELFNBQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxPQUFPLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUNwQixDQUFDO1FBRUQseUNBQU8sR0FBUCxVQUFRLElBQXNCLEVBQUUsUUFBMkI7WUFDbkQsSUFBQSxvREFBeUQsRUFBeEQsMEJBQVUsRUFBRSxjQUE0QyxDQUFDO1lBRWhFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxVQUFVLEVBQUUsSUFBSSxNQUFBO2dCQUM3QixVQUFVLEVBQUUsRUFBRTthQUNmLENBQUM7UUFDSixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBbEdELElBa0dDO0lBbEdZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSM0Jhc2VSZWZNZXRhRGF0YSwgY29tcGlsZUJhc2VEZWZGcm9tTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcblxuaW1wb3J0IHtQYXJ0aWFsRXZhbHVhdG9yfSBmcm9tICcuLi8uLi9wYXJ0aWFsX2V2YWx1YXRvcic7XG5pbXBvcnQge0NsYXNzRGVjbGFyYXRpb24sIENsYXNzTWVtYmVyLCBEZWNvcmF0b3IsIFJlZmxlY3Rpb25Ib3N0fSBmcm9tICcuLi8uLi9yZWZsZWN0aW9uJztcbmltcG9ydCB7QW5hbHlzaXNPdXRwdXQsIENvbXBpbGVSZXN1bHQsIERlY29yYXRvckhhbmRsZXIsIERldGVjdFJlc3VsdCwgSGFuZGxlclByZWNlZGVuY2V9IGZyb20gJy4uLy4uL3RyYW5zZm9ybSc7XG5cbmltcG9ydCB7aXNBbmd1bGFyRGVjb3JhdG9yfSBmcm9tICcuL3V0aWwnO1xuXG5mdW5jdGlvbiBjb250YWluc05nVG9wTGV2ZWxEZWNvcmF0b3IoZGVjb3JhdG9yczogRGVjb3JhdG9yW10gfCBudWxsLCBpc0NvcmU6IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgaWYgKCFkZWNvcmF0b3JzKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiBkZWNvcmF0b3JzLnNvbWUoXG4gICAgICBkZWNvcmF0b3IgPT4gaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgJ0NvbXBvbmVudCcsIGlzQ29yZSkgfHxcbiAgICAgICAgICBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCAnRGlyZWN0aXZlJywgaXNDb3JlKSB8fFxuICAgICAgICAgIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsICdOZ01vZHVsZScsIGlzQ29yZSkpO1xufVxuXG5leHBvcnQgY2xhc3MgQmFzZURlZkRlY29yYXRvckhhbmRsZXIgaW1wbGVtZW50c1xuICAgIERlY29yYXRvckhhbmRsZXI8UjNCYXNlUmVmTWV0YURhdGEsIFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbj4ge1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHByaXZhdGUgcmVmbGVjdG9yOiBSZWZsZWN0aW9uSG9zdCwgcHJpdmF0ZSBldmFsdWF0b3I6IFBhcnRpYWxFdmFsdWF0b3IsXG4gICAgICBwcml2YXRlIGlzQ29yZTogYm9vbGVhbikge31cblxuICByZWFkb25seSBwcmVjZWRlbmNlID0gSGFuZGxlclByZWNlZGVuY2UuV0VBSztcblxuICBkZXRlY3Qobm9kZTogQ2xhc3NEZWNsYXJhdGlvbiwgZGVjb3JhdG9yczogRGVjb3JhdG9yW118bnVsbCk6XG4gICAgICBEZXRlY3RSZXN1bHQ8UjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9uPnx1bmRlZmluZWQge1xuICAgIGlmIChjb250YWluc05nVG9wTGV2ZWxEZWNvcmF0b3IoZGVjb3JhdG9ycywgdGhpcy5pc0NvcmUpKSB7XG4gICAgICAvLyBJZiB0aGUgY2xhc3MgaXMgYWxyZWFkeSBkZWNvcmF0ZWQgYnkgQENvbXBvbmVudCBvciBARGlyZWN0aXZlIGxldCB0aGF0XG4gICAgICAvLyBEZWNvcmF0b3JIYW5kbGVyIGhhbmRsZSB0aGlzLiBCYXNlRGVmIGlzIHVubmVjZXNzYXJ5LlxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgcmVzdWx0OiBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb258dW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgdGhpcy5yZWZsZWN0b3IuZ2V0TWVtYmVyc09mQ2xhc3Mobm9kZSkuZm9yRWFjaChwcm9wZXJ0eSA9PiB7XG4gICAgICBjb25zdCB7ZGVjb3JhdG9yc30gPSBwcm9wZXJ0eTtcbiAgICAgIGlmIChkZWNvcmF0b3JzKSB7XG4gICAgICAgIGZvciAoY29uc3QgZGVjb3JhdG9yIG9mIGRlY29yYXRvcnMpIHtcbiAgICAgICAgICBpZiAoaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgJ0lucHV0JywgdGhpcy5pc0NvcmUpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICBjb25zdCBpbnB1dHMgPSByZXN1bHQuaW5wdXRzID0gcmVzdWx0LmlucHV0cyB8fCBbXTtcbiAgICAgICAgICAgIGlucHV0cy5wdXNoKHtkZWNvcmF0b3IsIHByb3BlcnR5fSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCAnT3V0cHV0JywgdGhpcy5pc0NvcmUpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICBjb25zdCBvdXRwdXRzID0gcmVzdWx0Lm91dHB1dHMgPSByZXN1bHQub3V0cHV0cyB8fCBbXTtcbiAgICAgICAgICAgIG91dHB1dHMucHVzaCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YTogcmVzdWx0LFxuICAgICAgICB0cmlnZ2VyOiBudWxsLFxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cblxuICBhbmFseXplKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIG1ldGFkYXRhOiBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24pOlxuICAgICAgQW5hbHlzaXNPdXRwdXQ8UjNCYXNlUmVmTWV0YURhdGE+IHtcbiAgICBjb25zdCBhbmFseXNpczogUjNCYXNlUmVmTWV0YURhdGEgPSB7fTtcbiAgICBpZiAobWV0YWRhdGEuaW5wdXRzKSB7XG4gICAgICBjb25zdCBpbnB1dHMgPSBhbmFseXNpcy5pbnB1dHMgPSB7fSBhc3tba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBbc3RyaW5nLCBzdHJpbmddfTtcbiAgICAgIG1ldGFkYXRhLmlucHV0cy5mb3JFYWNoKCh7ZGVjb3JhdG9yLCBwcm9wZXJ0eX0pID0+IHtcbiAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBwcm9wZXJ0eS5uYW1lO1xuICAgICAgICBjb25zdCBhcmdzID0gZGVjb3JhdG9yLmFyZ3M7XG4gICAgICAgIGxldCB2YWx1ZTogc3RyaW5nfFtzdHJpbmcsIHN0cmluZ107XG4gICAgICAgIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShhcmdzWzBdKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnB1dCBhbGlhcyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgc3RyaW5nIHZhbHVlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gW3Jlc29sdmVkVmFsdWUsIHByb3BOYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHByb3BOYW1lO1xuICAgICAgICB9XG4gICAgICAgIGlucHV0c1twcm9wTmFtZV0gPSB2YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChtZXRhZGF0YS5vdXRwdXRzKSB7XG4gICAgICBjb25zdCBvdXRwdXRzID0gYW5hbHlzaXMub3V0cHV0cyA9IHt9IGFze1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gICAgICBtZXRhZGF0YS5vdXRwdXRzLmZvckVhY2goKHtkZWNvcmF0b3IsIHByb3BlcnR5fSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wTmFtZSA9IHByb3BlcnR5Lm5hbWU7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncztcbiAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmc7XG4gICAgICAgIGlmIChhcmdzICYmIGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkVmFsdWUgPSB0aGlzLmV2YWx1YXRvci5ldmFsdWF0ZShhcmdzWzBdKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHJlc29sdmVkVmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPdXRwdXQgYWxpYXMgZG9lcyBub3QgcmVzb2x2ZSB0byBhIHN0cmluZyB2YWx1ZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IHJlc29sdmVkVmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBwcm9wTmFtZTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRzW3Byb3BOYW1lXSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHthbmFseXNpc307XG4gIH1cblxuICBjb21waWxlKG5vZGU6IENsYXNzRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSM0Jhc2VSZWZNZXRhRGF0YSk6IENvbXBpbGVSZXN1bHRbXXxDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCB7ZXhwcmVzc2lvbiwgdHlwZX0gPSBjb21waWxlQmFzZURlZkZyb21NZXRhZGF0YShhbmFseXNpcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQmFzZURlZicsXG4gICAgICBpbml0aWFsaXplcjogZXhwcmVzc2lvbiwgdHlwZSxcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24ge1xuICBpbnB1dHM/OiBBcnJheTx7cHJvcGVydHk6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3I6IERlY29yYXRvcn0+O1xuICBvdXRwdXRzPzogQXJyYXk8e3Byb3BlcnR5OiBDbGFzc01lbWJlciwgZGVjb3JhdG9yOiBEZWNvcmF0b3J9Pjtcbn1cbiJdfQ==