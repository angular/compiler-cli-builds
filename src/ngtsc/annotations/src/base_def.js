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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZV9kZWYuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL2Fubm90YXRpb25zL3NyYy9iYXNlX2RlZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7SUFFSCw4Q0FBZ0Y7SUFLaEYsdUVBQWlIO0lBRWpILDZFQUEwQztJQUUxQyxTQUFTLDJCQUEyQixDQUFDLFVBQThCLEVBQUUsTUFBZTtRQUNsRixJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2YsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FDbEIsVUFBQSxTQUFTLElBQUksT0FBQSx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUMzRCx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sQ0FBQztZQUNsRCx5QkFBa0IsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUZ4QyxDQUV3QyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVEO1FBRUUsaUNBQ1ksU0FBeUIsRUFBVSxTQUEyQixFQUM5RCxNQUFlO1lBRGYsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7WUFBVSxjQUFTLEdBQVQsU0FBUyxDQUFrQjtZQUM5RCxXQUFNLEdBQU4sTUFBTSxDQUFTO1lBRWxCLGVBQVUsR0FBRyw2QkFBaUIsQ0FBQyxJQUFJLENBQUM7UUFGZixDQUFDO1FBSS9CLHdDQUFNLEdBQU4sVUFBTyxJQUF5QixFQUFFLFVBQTRCO1lBQTlELGlCQW1DQztZQWpDQyxJQUFJLDJCQUEyQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3hELHlFQUF5RTtnQkFDekUsd0RBQXdEO2dCQUN4RCxPQUFPLFNBQVMsQ0FBQzthQUNsQjtZQUVELElBQUksTUFB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QU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQy9CLElBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7b0JBQzVCLElBQUksS0FBYSxDQUFDO29CQUNsQixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDM0IsSUFBTSxhQUFhLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3ZELElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFOzRCQUNyQyxNQUFNLElBQUksU0FBUyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7eUJBQ3hFO3dCQUNELEtBQUssR0FBRyxhQUFhLENBQUM7cUJBQ3ZCO3lCQUFNO3dCQUNMLEtBQUssR0FBRyxRQUFRLENBQUM7cUJBQ2xCO29CQUNELFNBQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFFRCxPQUFPLEVBQUMsUUFBUSxVQUFBLEVBQUMsQ0FBQztRQUNwQixDQUFDO1FBRUQseUNBQU8sR0FBUCxVQUFRLElBQW9CLEVBQUUsUUFBMkI7WUFDakQsSUFBQSxvREFBeUQsRUFBeEQsMEJBQVUsRUFBRSxjQUE0QyxDQUFDO1lBRWhFLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLFdBQVcsRUFBRSxVQUFVLEVBQUUsSUFBSSxNQUFBO2dCQUM3QixVQUFVLEVBQUUsRUFBRTthQUNmLENBQUM7UUFDSixDQUFDO1FBQ0gsOEJBQUM7SUFBRCxDQUFDLEFBbEdELElBa0dDO0lBbEdZLDBEQUF1QiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHtSM0Jhc2VSZWZNZXRhRGF0YSwgY29tcGlsZUJhc2VEZWZGcm9tTWV0YWRhdGF9IGZyb20gJ0Bhbmd1bGFyL2NvbXBpbGVyJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5pbXBvcnQge1BhcnRpYWxFdmFsdWF0b3J9IGZyb20gJy4uLy4uL3BhcnRpYWxfZXZhbHVhdG9yJztcbmltcG9ydCB7Q2xhc3NNZW1iZXIsIERlY29yYXRvciwgUmVmbGVjdGlvbkhvc3R9IGZyb20gJy4uLy4uL3JlZmxlY3Rpb24nO1xuaW1wb3J0IHtBbmFseXNpc091dHB1dCwgQ29tcGlsZVJlc3VsdCwgRGVjb3JhdG9ySGFuZGxlciwgRGV0ZWN0UmVzdWx0LCBIYW5kbGVyUHJlY2VkZW5jZX0gZnJvbSAnLi4vLi4vdHJhbnNmb3JtJztcblxuaW1wb3J0IHtpc0FuZ3VsYXJEZWNvcmF0b3J9IGZyb20gJy4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXSB8IG51bGwsIGlzQ29yZTogYm9vbGVhbik6IGJvb2xlYW4ge1xuICBpZiAoIWRlY29yYXRvcnMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIGRlY29yYXRvcnMuc29tZShcbiAgICAgIGRlY29yYXRvciA9PiBpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCAnQ29tcG9uZW50JywgaXNDb3JlKSB8fFxuICAgICAgICAgIGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsICdEaXJlY3RpdmUnLCBpc0NvcmUpIHx8XG4gICAgICAgICAgaXNBbmd1bGFyRGVjb3JhdG9yKGRlY29yYXRvciwgJ05nTW9kdWxlJywgaXNDb3JlKSk7XG59XG5cbmV4cG9ydCBjbGFzcyBCYXNlRGVmRGVjb3JhdG9ySGFuZGxlciBpbXBsZW1lbnRzXG4gICAgRGVjb3JhdG9ySGFuZGxlcjxSM0Jhc2VSZWZNZXRhRGF0YSwgUjNCYXNlUmVmRGVjb3JhdG9yRGV0ZWN0aW9uPiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgICAgcHJpdmF0ZSByZWZsZWN0b3I6IFJlZmxlY3Rpb25Ib3N0LCBwcml2YXRlIGV2YWx1YXRvcjogUGFydGlhbEV2YWx1YXRvcixcbiAgICAgIHByaXZhdGUgaXNDb3JlOiBib29sZWFuKSB7fVxuXG4gIHJlYWRvbmx5IHByZWNlZGVuY2UgPSBIYW5kbGVyUHJlY2VkZW5jZS5XRUFLO1xuXG4gIGRldGVjdChub2RlOiB0cy5DbGFzc0RlY2xhcmF0aW9uLCBkZWNvcmF0b3JzOiBEZWNvcmF0b3JbXXxudWxsKTpcbiAgICAgIERldGVjdFJlc3VsdDxSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24+fHVuZGVmaW5lZCB7XG4gICAgaWYgKGNvbnRhaW5zTmdUb3BMZXZlbERlY29yYXRvcihkZWNvcmF0b3JzLCB0aGlzLmlzQ29yZSkpIHtcbiAgICAgIC8vIElmIHRoZSBjbGFzcyBpcyBhbHJlYWR5IGRlY29yYXRlZCBieSBAQ29tcG9uZW50IG9yIEBEaXJlY3RpdmUgbGV0IHRoYXRcbiAgICAgIC8vIERlY29yYXRvckhhbmRsZXIgaGFuZGxlIHRoaXMuIEJhc2VEZWYgaXMgdW5uZWNlc3NhcnkuXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGxldCByZXN1bHQ6IFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbnx1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICB0aGlzLnJlZmxlY3Rvci5nZXRNZW1iZXJzT2ZDbGFzcyhub2RlKS5mb3JFYWNoKHByb3BlcnR5ID0+IHtcbiAgICAgIGNvbnN0IHtkZWNvcmF0b3JzfSA9IHByb3BlcnR5O1xuICAgICAgaWYgKGRlY29yYXRvcnMpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZWNvcmF0b3Igb2YgZGVjb3JhdG9ycykge1xuICAgICAgICAgIGlmIChpc0FuZ3VsYXJEZWNvcmF0b3IoZGVjb3JhdG9yLCAnSW5wdXQnLCB0aGlzLmlzQ29yZSkpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0cyA9IHJlc3VsdC5pbnB1dHMgPSByZXN1bHQuaW5wdXRzIHx8IFtdO1xuICAgICAgICAgICAgaW5wdXRzLnB1c2goe2RlY29yYXRvciwgcHJvcGVydHl9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzQW5ndWxhckRlY29yYXRvcihkZWNvcmF0b3IsICdPdXRwdXQnLCB0aGlzLmlzQ29yZSkpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dHMgPSByZXN1bHQub3V0cHV0cyA9IHJlc3VsdC5vdXRwdXRzIHx8IFtdO1xuICAgICAgICAgICAgb3V0cHV0cy5wdXNoKHtkZWNvcmF0b3IsIHByb3BlcnR5fSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1ldGFkYXRhOiByZXN1bHQsXG4gICAgICAgIHRyaWdnZXI6IG51bGwsXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIGFuYWx5emUobm9kZTogdHMuQ2xhc3NEZWNsYXJhdGlvbiwgbWV0YWRhdGE6IFIzQmFzZVJlZkRlY29yYXRvckRldGVjdGlvbik6XG4gICAgICBBbmFseXNpc091dHB1dDxSM0Jhc2VSZWZNZXRhRGF0YT4ge1xuICAgIGNvbnN0IGFuYWx5c2lzOiBSM0Jhc2VSZWZNZXRhRGF0YSA9IHt9O1xuICAgIGlmIChtZXRhZGF0YS5pbnB1dHMpIHtcbiAgICAgIGNvbnN0IGlucHV0cyA9IGFuYWx5c2lzLmlucHV0cyA9IHt9IGFze1trZXk6IHN0cmluZ106IHN0cmluZyB8IFtzdHJpbmcsIHN0cmluZ119O1xuICAgICAgbWV0YWRhdGEuaW5wdXRzLmZvckVhY2goKHtkZWNvcmF0b3IsIHByb3BlcnR5fSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9wTmFtZSA9IHByb3BlcnR5Lm5hbWU7XG4gICAgICAgIGNvbnN0IGFyZ3MgPSBkZWNvcmF0b3IuYXJncztcbiAgICAgICAgbGV0IHZhbHVlOiBzdHJpbmd8W3N0cmluZywgc3RyaW5nXTtcbiAgICAgICAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRWYWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGFyZ3NbMF0pO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRWYWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0lucHV0IGFsaWFzIGRvZXMgbm90IHJlc29sdmUgdG8gYSBzdHJpbmcgdmFsdWUnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBbcmVzb2x2ZWRWYWx1ZSwgcHJvcE5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gcHJvcE5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgaW5wdXRzW3Byb3BOYW1lXSA9IHZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKG1ldGFkYXRhLm91dHB1dHMpIHtcbiAgICAgIGNvbnN0IG91dHB1dHMgPSBhbmFseXNpcy5vdXRwdXRzID0ge30gYXN7W2tleTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAgIG1ldGFkYXRhLm91dHB1dHMuZm9yRWFjaCgoe2RlY29yYXRvciwgcHJvcGVydHl9KSA9PiB7XG4gICAgICAgIGNvbnN0IHByb3BOYW1lID0gcHJvcGVydHkubmFtZTtcbiAgICAgICAgY29uc3QgYXJncyA9IGRlY29yYXRvci5hcmdzO1xuICAgICAgICBsZXQgdmFsdWU6IHN0cmluZztcbiAgICAgICAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRWYWx1ZSA9IHRoaXMuZXZhbHVhdG9yLmV2YWx1YXRlKGFyZ3NbMF0pO1xuICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWRWYWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ091dHB1dCBhbGlhcyBkb2VzIG5vdCByZXNvbHZlIHRvIGEgc3RyaW5nIHZhbHVlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gcmVzb2x2ZWRWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IHByb3BOYW1lO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dHNbcHJvcE5hbWVdID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2FuYWx5c2lzfTtcbiAgfVxuXG4gIGNvbXBpbGUobm9kZTogdHMuRGVjbGFyYXRpb24sIGFuYWx5c2lzOiBSM0Jhc2VSZWZNZXRhRGF0YSk6IENvbXBpbGVSZXN1bHRbXXxDb21waWxlUmVzdWx0IHtcbiAgICBjb25zdCB7ZXhwcmVzc2lvbiwgdHlwZX0gPSBjb21waWxlQmFzZURlZkZyb21NZXRhZGF0YShhbmFseXNpcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogJ25nQmFzZURlZicsXG4gICAgICBpbml0aWFsaXplcjogZXhwcmVzc2lvbiwgdHlwZSxcbiAgICAgIHN0YXRlbWVudHM6IFtdLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBSM0Jhc2VSZWZEZWNvcmF0b3JEZXRlY3Rpb24ge1xuICBpbnB1dHM/OiBBcnJheTx7cHJvcGVydHk6IENsYXNzTWVtYmVyLCBkZWNvcmF0b3I6IERlY29yYXRvcn0+O1xuICBvdXRwdXRzPzogQXJyYXk8e3Byb3BlcnR5OiBDbGFzc01lbWJlciwgZGVjb3JhdG9yOiBEZWNvcmF0b3J9Pjtcbn1cbiJdfQ==