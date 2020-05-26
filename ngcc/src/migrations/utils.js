(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define("@angular/compiler-cli/ngcc/src/migrations/utils", ["require", "exports", "typescript", "@angular/compiler-cli/src/ngtsc/imports", "@angular/compiler-cli/src/ngtsc/reflection"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createInjectableDecorator = exports.createComponentDecorator = exports.createDirectiveDecorator = exports.hasConstructor = exports.hasPipeDecorator = exports.hasDirectiveDecorator = exports.isClassDeclaration = void 0;
    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    var ts = require("typescript");
    var imports_1 = require("@angular/compiler-cli/src/ngtsc/imports");
    var reflection_1 = require("@angular/compiler-cli/src/ngtsc/reflection");
    function isClassDeclaration(clazz) {
        return reflection_1.isNamedClassDeclaration(clazz) || reflection_1.isNamedFunctionDeclaration(clazz) ||
            reflection_1.isNamedVariableDeclaration(clazz);
    }
    exports.isClassDeclaration = isClassDeclaration;
    /**
     * Returns true if the `clazz` is decorated as a `Directive` or `Component`.
     */
    function hasDirectiveDecorator(host, clazz) {
        var ref = new imports_1.Reference(clazz);
        return host.metadata.getDirectiveMetadata(ref) !== null;
    }
    exports.hasDirectiveDecorator = hasDirectiveDecorator;
    /**
     * Returns true if the `clazz` is decorated as a `Pipe`.
     */
    function hasPipeDecorator(host, clazz) {
        var ref = new imports_1.Reference(clazz);
        return host.metadata.getPipeMetadata(ref) !== null;
    }
    exports.hasPipeDecorator = hasPipeDecorator;
    /**
     * Returns true if the `clazz` has its own constructor function.
     */
    function hasConstructor(host, clazz) {
        return host.reflectionHost.getConstructorParameters(clazz) !== null;
    }
    exports.hasConstructor = hasConstructor;
    /**
     * Create an empty `Directive` decorator that will be associated with the `clazz`.
     */
    function createDirectiveDecorator(clazz, metadata) {
        var args = [];
        if (metadata !== undefined) {
            var metaArgs = [];
            if (metadata.selector !== null) {
                metaArgs.push(property('selector', metadata.selector));
            }
            if (metadata.exportAs !== null) {
                metaArgs.push(property('exportAs', metadata.exportAs.join(', ')));
            }
            args.push(reifySourceFile(ts.createObjectLiteral(metaArgs)));
        }
        return {
            name: 'Directive',
            identifier: null,
            import: { name: 'Directive', from: '@angular/core' },
            node: null,
            synthesizedFor: clazz.name,
            args: args,
        };
    }
    exports.createDirectiveDecorator = createDirectiveDecorator;
    /**
     * Create an empty `Component` decorator that will be associated with the `clazz`.
     */
    function createComponentDecorator(clazz, metadata) {
        var metaArgs = [
            property('template', ''),
        ];
        if (metadata.selector !== null) {
            metaArgs.push(property('selector', metadata.selector));
        }
        if (metadata.exportAs !== null) {
            metaArgs.push(property('exportAs', metadata.exportAs.join(', ')));
        }
        return {
            name: 'Component',
            identifier: null,
            import: { name: 'Component', from: '@angular/core' },
            node: null,
            synthesizedFor: clazz.name,
            args: [
                reifySourceFile(ts.createObjectLiteral(metaArgs)),
            ],
        };
    }
    exports.createComponentDecorator = createComponentDecorator;
    /**
     * Create an empty `Injectable` decorator that will be associated with the `clazz`.
     */
    function createInjectableDecorator(clazz) {
        return {
            name: 'Injectable',
            identifier: null,
            import: { name: 'Injectable', from: '@angular/core' },
            node: null,
            synthesizedFor: clazz.name,
            args: [],
        };
    }
    exports.createInjectableDecorator = createInjectableDecorator;
    function property(name, value) {
        return ts.createPropertyAssignment(name, ts.createStringLiteral(value));
    }
    var EMPTY_SF = ts.createSourceFile('(empty)', '', ts.ScriptTarget.Latest);
    /**
     * Takes a `ts.Expression` and returns the same `ts.Expression`, but with an associated
     * `ts.SourceFile`.
     *
     * This transformation is necessary to use synthetic `ts.Expression`s with the `PartialEvaluator`,
     * and many decorator arguments are interpreted in this way.
     */
    function reifySourceFile(expr) {
        var printer = ts.createPrinter();
        var exprText = printer.printNode(ts.EmitHint.Unspecified, expr, EMPTY_SF);
        var sf = ts.createSourceFile('(synthetic)', "const expr = " + exprText + ";", ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
        var stmt = sf.statements[0];
        if (!ts.isVariableStatement(stmt)) {
            throw new Error("Expected VariableStatement, got " + ts.SyntaxKind[stmt.kind]);
        }
        return stmt.declarationList.declarations[0].initializer;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbWlncmF0aW9ucy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7SUFBQTs7Ozs7O09BTUc7SUFDSCwrQkFBaUM7SUFDakMsbUVBQXFEO0lBQ3JELHlFQUEySjtJQUczSixTQUFnQixrQkFBa0IsQ0FBQyxLQUFxQjtRQUN0RCxPQUFPLG9DQUF1QixDQUFDLEtBQUssQ0FBQyxJQUFJLHVDQUEwQixDQUFDLEtBQUssQ0FBQztZQUN0RSx1Q0FBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBSEQsZ0RBR0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLHFCQUFxQixDQUFDLElBQW1CLEVBQUUsS0FBdUI7UUFDaEYsSUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUM7SUFDMUQsQ0FBQztJQUhELHNEQUdDO0lBRUQ7O09BRUc7SUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUFtQixFQUFFLEtBQXVCO1FBQzNFLElBQU0sR0FBRyxHQUFHLElBQUksbUJBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQztJQUNyRCxDQUFDO0lBSEQsNENBR0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGNBQWMsQ0FBQyxJQUFtQixFQUFFLEtBQXVCO1FBQ3pFLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUM7SUFDdEUsQ0FBQztJQUZELHdDQUVDO0lBRUQ7O09B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QUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRTVFOzs7Ozs7T0FNRztJQUNILFNBQVMsZUFBZSxDQUFDLElBQW1CO1FBQzFDLElBQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQyxJQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1RSxJQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQzFCLGFBQWEsRUFBRSxrQkFBZ0IsUUFBUSxNQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEcsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQW1DLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRyxDQUFDLENBQUM7U0FDaEY7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVksQ0FBQztJQUMzRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IGNsYXp6IGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICByZXR1cm4gaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY2xhenopIHx8IGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKGNsYXp6KSB8fFxuICAgICAgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oY2xhenopO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYGNsYXp6YCBpcyBkZWNvcmF0ZWQgYXMgYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0OiBNaWdyYXRpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKGNsYXp6KTtcbiAgcmV0dXJuIGhvc3QubWV0YWRhdGEuZ2V0RGlyZWN0aXZlTWV0YWRhdGEocmVmKSAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGBjbGF6emAgaXMgZGVjb3JhdGVkIGFzIGEgYFBpcGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzUGlwZURlY29yYXRvcihob3N0OiBNaWdyYXRpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKGNsYXp6KTtcbiAgcmV0dXJuIGhvc3QubWV0YWRhdGEuZ2V0UGlwZU1ldGFkYXRhKHJlZikgIT09IG51bGw7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBgY2xhenpgIGhhcyBpdHMgb3duIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzQ29uc3RydWN0b3IoaG9zdDogTWlncmF0aW9uSG9zdCwgY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGhvc3QucmVmbGVjdGlvbkhvc3QuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KSAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZW1wdHkgYERpcmVjdGl2ZWAgZGVjb3JhdG9yIHRoYXQgd2lsbCBiZSBhc3NvY2lhdGVkIHdpdGggdGhlIGBjbGF6emAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXJlY3RpdmVEZWNvcmF0b3IoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sXG4gICAgbWV0YWRhdGE/OiB7c2VsZWN0b3I6IHN0cmluZ3xudWxsLCBleHBvcnRBczogc3RyaW5nW118bnVsbH0pOiBEZWNvcmF0b3Ige1xuICBjb25zdCBhcmdzOiB0cy5FeHByZXNzaW9uW10gPSBbXTtcbiAgaWYgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBtZXRhQXJnczogdHMuUHJvcGVydHlBc3NpZ25tZW50W10gPSBbXTtcbiAgICBpZiAobWV0YWRhdGEuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICAgIG1ldGFBcmdzLnB1c2gocHJvcGVydHkoJ3NlbGVjdG9yJywgbWV0YWRhdGEuc2VsZWN0b3IpKTtcbiAgICB9XG4gICAgaWYgKG1ldGFkYXRhLmV4cG9ydEFzICE9PSBudWxsKSB7XG4gICAgICBtZXRhQXJncy5wdXNoKHByb3BlcnR5KCdleHBvcnRBcycsIG1ldGFkYXRhLmV4cG9ydEFzLmpvaW4oJywgJykpKTtcbiAgICB9XG4gICAgYXJncy5wdXNoKHJlaWZ5U291cmNlRmlsZSh0cy5jcmVhdGVPYmplY3RMaXRlcmFsKG1ldGFBcmdzKSkpO1xuICB9XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ0RpcmVjdGl2ZScsXG4gICAgaWRlbnRpZmllcjogbnVsbCxcbiAgICBpbXBvcnQ6IHtuYW1lOiAnRGlyZWN0aXZlJywgZnJvbTogJ0Bhbmd1bGFyL2NvcmUnfSxcbiAgICBub2RlOiBudWxsLFxuICAgIHN5bnRoZXNpemVkRm9yOiBjbGF6ei5uYW1lLFxuICAgIGFyZ3MsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVtcHR5IGBDb21wb25lbnRgIGRlY29yYXRvciB0aGF0IHdpbGwgYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBgY2xhenpgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50RGVjb3JhdG9yKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLFxuICAgIG1ldGFkYXRhOiB7c2VsZWN0b3I6IHN0cmluZ3xudWxsLCBleHBvcnRBczogc3RyaW5nW118bnVsbH0pOiBEZWNvcmF0b3Ige1xuICBjb25zdCBtZXRhQXJnczogdHMuUHJvcGVydHlBc3NpZ25tZW50W10gPSBbXG4gICAgcHJvcGVydHkoJ3RlbXBsYXRlJywgJycpLFxuICBdO1xuICBpZiAobWV0YWRhdGEuc2VsZWN0b3IgIT09IG51bGwpIHtcbiAgICBtZXRhQXJncy5wdXNoKHByb3BlcnR5KCdzZWxlY3RvcicsIG1ldGFkYXRhLnNlbGVjdG9yKSk7XG4gIH1cbiAgaWYgKG1ldGFkYXRhLmV4cG9ydEFzICE9PSBudWxsKSB7XG4gICAgbWV0YUFyZ3MucHVzaChwcm9wZXJ0eSgnZXhwb3J0QXMnLCBtZXRhZGF0YS5leHBvcnRBcy5qb2luKCcsICcpKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnQ29tcG9uZW50JyxcbiAgICBpZGVudGlmaWVyOiBudWxsLFxuICAgIGltcG9ydDoge25hbWU6ICdDb21wb25lbnQnLCBmcm9tOiAnQGFuZ3VsYXIvY29yZSd9LFxuICAgIG5vZGU6IG51bGwsXG4gICAgc3ludGhlc2l6ZWRGb3I6IGNsYXp6Lm5hbWUsXG4gICAgYXJnczogW1xuICAgICAgcmVpZnlTb3VyY2VGaWxlKHRzLmNyZWF0ZU9iamVjdExpdGVyYWwobWV0YUFyZ3MpKSxcbiAgICBdLFxuICB9O1xufVxuXG4vKipcbiAqIENyZWF0ZSBhbiBlbXB0eSBgSW5qZWN0YWJsZWAgZGVjb3JhdG9yIHRoYXQgd2lsbCBiZSBhc3NvY2lhdGVkIHdpdGggdGhlIGBjbGF6emAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJbmplY3RhYmxlRGVjb3JhdG9yKGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uKTogRGVjb3JhdG9yIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnSW5qZWN0YWJsZScsXG4gICAgaWRlbnRpZmllcjogbnVsbCxcbiAgICBpbXBvcnQ6IHtuYW1lOiAnSW5qZWN0YWJsZScsIGZyb206ICdAYW5ndWxhci9jb3JlJ30sXG4gICAgbm9kZTogbnVsbCxcbiAgICBzeW50aGVzaXplZEZvcjogY2xhenoubmFtZSxcbiAgICBhcmdzOiBbXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvcGVydHkobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdHMuUHJvcGVydHlBc3NpZ25tZW50IHtcbiAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHZhbHVlKSk7XG59XG5cbmNvbnN0IEVNUFRZX1NGID0gdHMuY3JlYXRlU291cmNlRmlsZSgnKGVtcHR5KScsICcnLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0KTtcblxuLyoqXG4gKiBUYWtlcyBhIGB0cy5FeHByZXNzaW9uYCBhbmQgcmV0dXJucyB0aGUgc2FtZSBgdHMuRXhwcmVzc2lvbmAsIGJ1dCB3aXRoIGFuIGFzc29jaWF0ZWRcbiAqIGB0cy5Tb3VyY2VGaWxlYC5cbiAqXG4gKiBUaGlzIHRyYW5zZm9ybWF0aW9uIGlzIG5lY2Vzc2FyeSB0byB1c2Ugc3ludGhldGljIGB0cy5FeHByZXNzaW9uYHMgd2l0aCB0aGUgYFBhcnRpYWxFdmFsdWF0b3JgLFxuICogYW5kIG1hbnkgZGVjb3JhdG9yIGFyZ3VtZW50cyBhcmUgaW50ZXJwcmV0ZWQgaW4gdGhpcyB3YXkuXG4gKi9cbmZ1bmN0aW9uIHJlaWZ5U291cmNlRmlsZShleHByOiB0cy5FeHByZXNzaW9uKTogdHMuRXhwcmVzc2lvbiB7XG4gIGNvbnN0IHByaW50ZXIgPSB0cy5jcmVhdGVQcmludGVyKCk7XG4gIGNvbnN0IGV4cHJUZXh0ID0gcHJpbnRlci5wcmludE5vZGUodHMuRW1pdEhpbnQuVW5zcGVjaWZpZWQsIGV4cHIsIEVNUFRZX1NGKTtcbiAgY29uc3Qgc2YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKFxuICAgICAgJyhzeW50aGV0aWMpJywgYGNvbnN0IGV4cHIgPSAke2V4cHJUZXh0fTtgLCB0cy5TY3JpcHRUYXJnZXQuTGF0ZXN0LCB0cnVlLCB0cy5TY3JpcHRLaW5kLkpTKTtcbiAgY29uc3Qgc3RtdCA9IHNmLnN0YXRlbWVudHNbMF07XG4gIGlmICghdHMuaXNWYXJpYWJsZVN0YXRlbWVudChzdG10KSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgVmFyaWFibGVTdGF0ZW1lbnQsIGdvdCAke3RzLlN5bnRheEtpbmRbc3RtdC5raW5kXX1gKTtcbiAgfVxuICByZXR1cm4gc3RtdC5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zWzBdLmluaXRpYWxpemVyITtcbn1cbiJdfQ==