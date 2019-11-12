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
                metaArgs.push(property('exportAs', metadata.exportAs));
            }
            args.push(reifySourceFile(ts.createObjectLiteral(metaArgs)));
        }
        return {
            name: 'Directive',
            identifier: null,
            import: { name: 'Directive', from: '@angular/core' },
            node: null,
            synthesizedFor: clazz.name, args: args,
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
            metaArgs.push(property('exportAs', metadata.exportAs));
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
        if (typeof value === 'string') {
            return ts.createPropertyAssignment(name, ts.createStringLiteral(value));
        }
        else {
            return ts.createPropertyAssignment(name, ts.createArrayLiteral(value.map(function (v) { return ts.createStringLiteral(v); })));
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvbmdjYy9zcmMvbWlncmF0aW9ucy91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztJQUFBOzs7Ozs7T0FNRztJQUNILCtCQUFpQztJQUNqQyxtRUFBcUQ7SUFDckQseUVBQTJKO0lBRzNKLFNBQWdCLGtCQUFrQixDQUFDLEtBQXFCO1FBQ3RELE9BQU8sb0NBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksdUNBQTBCLENBQUMsS0FBSyxDQUFDO1lBQ3RFLHVDQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFIRCxnREFHQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IscUJBQXFCLENBQUMsSUFBbUIsRUFBRSxLQUF1QjtRQUNoRixJQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQztJQUMxRCxDQUFDO0lBSEQsc0RBR0M7SUFFRDs7T0FFRztJQUNILFNBQWdCLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsS0FBdUI7UUFDM0UsSUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDO0lBQ3JELENBQUM7SUFIRCw0Q0FHQztJQUVEOztPQUVHO0lBQ0gsU0FBZ0IsY0FBYyxDQUFDLElBQW1CLEVBQUUsS0FBdUI7UUFDekUsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQztJQUN0RSxDQUFDO0lBRkQsd0NBRUM7SUFFRDs7T0FF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IEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlZmVyZW5jZX0gZnJvbSAnLi4vLi4vLi4vc3JjL25ndHNjL2ltcG9ydHMnO1xuaW1wb3J0IHtDbGFzc0RlY2xhcmF0aW9uLCBEZWNvcmF0b3IsIGlzTmFtZWRDbGFzc0RlY2xhcmF0aW9uLCBpc05hbWVkRnVuY3Rpb25EZWNsYXJhdGlvbiwgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb259IGZyb20gJy4uLy4uLy4uL3NyYy9uZ3RzYy9yZWZsZWN0aW9uJztcbmltcG9ydCB7TWlncmF0aW9uSG9zdH0gZnJvbSAnLi9taWdyYXRpb24nO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNDbGFzc0RlY2xhcmF0aW9uKGNsYXp6OiB0cy5EZWNsYXJhdGlvbik6IGNsYXp6IGlzIENsYXNzRGVjbGFyYXRpb24ge1xuICByZXR1cm4gaXNOYW1lZENsYXNzRGVjbGFyYXRpb24oY2xhenopIHx8IGlzTmFtZWRGdW5jdGlvbkRlY2xhcmF0aW9uKGNsYXp6KSB8fFxuICAgICAgaXNOYW1lZFZhcmlhYmxlRGVjbGFyYXRpb24oY2xhenopO1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgYGNsYXp6YCBpcyBkZWNvcmF0ZWQgYXMgYSBgRGlyZWN0aXZlYCBvciBgQ29tcG9uZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhc0RpcmVjdGl2ZURlY29yYXRvcihob3N0OiBNaWdyYXRpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKGNsYXp6KTtcbiAgcmV0dXJuIGhvc3QubWV0YWRhdGEuZ2V0RGlyZWN0aXZlTWV0YWRhdGEocmVmKSAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGBjbGF6emAgaXMgZGVjb3JhdGVkIGFzIGEgYFBpcGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzUGlwZURlY29yYXRvcihob3N0OiBNaWdyYXRpb25Ib3N0LCBjbGF6ejogQ2xhc3NEZWNsYXJhdGlvbik6IGJvb2xlYW4ge1xuICBjb25zdCByZWYgPSBuZXcgUmVmZXJlbmNlKGNsYXp6KTtcbiAgcmV0dXJuIGhvc3QubWV0YWRhdGEuZ2V0UGlwZU1ldGFkYXRhKHJlZikgIT09IG51bGw7XG59XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBgY2xhenpgIGhhcyBpdHMgb3duIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFzQ29uc3RydWN0b3IoaG9zdDogTWlncmF0aW9uSG9zdCwgY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBib29sZWFuIHtcbiAgcmV0dXJuIGhvc3QucmVmbGVjdGlvbkhvc3QuZ2V0Q29uc3RydWN0b3JQYXJhbWV0ZXJzKGNsYXp6KSAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW4gZW1wdHkgYERpcmVjdGl2ZWAgZGVjb3JhdG9yIHRoYXQgd2lsbCBiZSBhc3NvY2lhdGVkIHdpdGggdGhlIGBjbGF6emAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVEaXJlY3RpdmVEZWNvcmF0b3IoXG4gICAgY2xheno6IENsYXNzRGVjbGFyYXRpb24sXG4gICAgbWV0YWRhdGE/OiB7c2VsZWN0b3I6IHN0cmluZyB8IG51bGwsIGV4cG9ydEFzOiBzdHJpbmdbXSB8IG51bGx9KTogRGVjb3JhdG9yIHtcbiAgY29uc3QgYXJnczogdHMuRXhwcmVzc2lvbltdID0gW107XG4gIGlmIChtZXRhZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbWV0YUFyZ3M6IHRzLlByb3BlcnR5QXNzaWdubWVudFtdID0gW107XG4gICAgaWYgKG1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgICBtZXRhQXJncy5wdXNoKHByb3BlcnR5KCdzZWxlY3RvcicsIG1ldGFkYXRhLnNlbGVjdG9yKSk7XG4gICAgfVxuICAgIGlmIChtZXRhZGF0YS5leHBvcnRBcyAhPT0gbnVsbCkge1xuICAgICAgbWV0YUFyZ3MucHVzaChwcm9wZXJ0eSgnZXhwb3J0QXMnLCBtZXRhZGF0YS5leHBvcnRBcykpO1xuICAgIH1cbiAgICBhcmdzLnB1c2gocmVpZnlTb3VyY2VGaWxlKHRzLmNyZWF0ZU9iamVjdExpdGVyYWwobWV0YUFyZ3MpKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnRGlyZWN0aXZlJyxcbiAgICBpZGVudGlmaWVyOiBudWxsLFxuICAgIGltcG9ydDoge25hbWU6ICdEaXJlY3RpdmUnLCBmcm9tOiAnQGFuZ3VsYXIvY29yZSd9LFxuICAgIG5vZGU6IG51bGwsXG4gICAgc3ludGhlc2l6ZWRGb3I6IGNsYXp6Lm5hbWUsIGFyZ3MsXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVtcHR5IGBDb21wb25lbnRgIGRlY29yYXRvciB0aGF0IHdpbGwgYmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBgY2xhenpgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tcG9uZW50RGVjb3JhdG9yKFxuICAgIGNsYXp6OiBDbGFzc0RlY2xhcmF0aW9uLFxuICAgIG1ldGFkYXRhOiB7c2VsZWN0b3I6IHN0cmluZyB8IG51bGwsIGV4cG9ydEFzOiBzdHJpbmdbXSB8IG51bGx9KTogRGVjb3JhdG9yIHtcbiAgY29uc3QgbWV0YUFyZ3M6IHRzLlByb3BlcnR5QXNzaWdubWVudFtdID0gW1xuICAgIHByb3BlcnR5KCd0ZW1wbGF0ZScsICcnKSxcbiAgXTtcbiAgaWYgKG1ldGFkYXRhLnNlbGVjdG9yICE9PSBudWxsKSB7XG4gICAgbWV0YUFyZ3MucHVzaChwcm9wZXJ0eSgnc2VsZWN0b3InLCBtZXRhZGF0YS5zZWxlY3RvcikpO1xuICB9XG4gIGlmIChtZXRhZGF0YS5leHBvcnRBcyAhPT0gbnVsbCkge1xuICAgIG1ldGFBcmdzLnB1c2gocHJvcGVydHkoJ2V4cG9ydEFzJywgbWV0YWRhdGEuZXhwb3J0QXMpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIG5hbWU6ICdDb21wb25lbnQnLFxuICAgIGlkZW50aWZpZXI6IG51bGwsXG4gICAgaW1wb3J0OiB7bmFtZTogJ0NvbXBvbmVudCcsIGZyb206ICdAYW5ndWxhci9jb3JlJ30sXG4gICAgbm9kZTogbnVsbCxcbiAgICBzeW50aGVzaXplZEZvcjogY2xhenoubmFtZSxcbiAgICBhcmdzOiBbXG4gICAgICByZWlmeVNvdXJjZUZpbGUodHMuY3JlYXRlT2JqZWN0TGl0ZXJhbChtZXRhQXJncykpLFxuICAgIF0sXG4gIH07XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIGVtcHR5IGBJbmplY3RhYmxlYCBkZWNvcmF0b3IgdGhhdCB3aWxsIGJlIGFzc29jaWF0ZWQgd2l0aCB0aGUgYGNsYXp6YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUluamVjdGFibGVEZWNvcmF0b3IoY2xheno6IENsYXNzRGVjbGFyYXRpb24pOiBEZWNvcmF0b3Ige1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICdJbmplY3RhYmxlJyxcbiAgICBpZGVudGlmaWVyOiBudWxsLFxuICAgIGltcG9ydDoge25hbWU6ICdJbmplY3RhYmxlJywgZnJvbTogJ0Bhbmd1bGFyL2NvcmUnfSxcbiAgICBub2RlOiBudWxsLFxuICAgIHN5bnRoZXNpemVkRm9yOiBjbGF6ei5uYW1lLFxuICAgIGFyZ3M6IFtdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eShuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcgfCBzdHJpbmdbXSk6IHRzLlByb3BlcnR5QXNzaWdubWVudCB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChuYW1lLCB0cy5jcmVhdGVTdHJpbmdMaXRlcmFsKHZhbHVlKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHRzLmNyZWF0ZVByb3BlcnR5QXNzaWdubWVudChcbiAgICAgICAgbmFtZSwgdHMuY3JlYXRlQXJyYXlMaXRlcmFsKHZhbHVlLm1hcCh2ID0+IHRzLmNyZWF0ZVN0cmluZ0xpdGVyYWwodikpKSk7XG4gIH1cbn1cblxuY29uc3QgRU1QVFlfU0YgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKCcoZW1wdHkpJywgJycsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QpO1xuXG4vKipcbiAqIFRha2VzIGEgYHRzLkV4cHJlc3Npb25gIGFuZCByZXR1cm5zIHRoZSBzYW1lIGB0cy5FeHByZXNzaW9uYCwgYnV0IHdpdGggYW4gYXNzb2NpYXRlZFxuICogYHRzLlNvdXJjZUZpbGVgLlxuICpcbiAqIFRoaXMgdHJhbnNmb3JtYXRpb24gaXMgbmVjZXNzYXJ5IHRvIHVzZSBzeW50aGV0aWMgYHRzLkV4cHJlc3Npb25gcyB3aXRoIHRoZSBgUGFydGlhbEV2YWx1YXRvcmAsXG4gKiBhbmQgbWFueSBkZWNvcmF0b3IgYXJndW1lbnRzIGFyZSBpbnRlcnByZXRlZCBpbiB0aGlzIHdheS5cbiAqL1xuZnVuY3Rpb24gcmVpZnlTb3VyY2VGaWxlKGV4cHI6IHRzLkV4cHJlc3Npb24pOiB0cy5FeHByZXNzaW9uIHtcbiAgY29uc3QgcHJpbnRlciA9IHRzLmNyZWF0ZVByaW50ZXIoKTtcbiAgY29uc3QgZXhwclRleHQgPSBwcmludGVyLnByaW50Tm9kZSh0cy5FbWl0SGludC5VbnNwZWNpZmllZCwgZXhwciwgRU1QVFlfU0YpO1xuICBjb25zdCBzZiA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoXG4gICAgICAnKHN5bnRoZXRpYyknLCBgY29uc3QgZXhwciA9ICR7ZXhwclRleHR9O2AsIHRzLlNjcmlwdFRhcmdldC5MYXRlc3QsIHRydWUsIHRzLlNjcmlwdEtpbmQuSlMpO1xuICBjb25zdCBzdG10ID0gc2Yuc3RhdGVtZW50c1swXTtcbiAgaWYgKCF0cy5pc1ZhcmlhYmxlU3RhdGVtZW50KHN0bXQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFeHBlY3RlZCBWYXJpYWJsZVN0YXRlbWVudCwgZ290ICR7dHMuU3ludGF4S2luZFtzdG10LmtpbmRdfWApO1xuICB9XG4gIHJldHVybiBzdG10LmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnNbMF0uaW5pdGlhbGl6ZXIgITtcbn1cbiJdfQ==