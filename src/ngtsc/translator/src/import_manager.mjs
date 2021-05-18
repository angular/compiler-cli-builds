/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import { NoopImportRewriter } from '../../imports';
export class ImportManager {
    constructor(rewriter = new NoopImportRewriter(), prefix = 'i') {
        this.rewriter = rewriter;
        this.prefix = prefix;
        this.specifierToIdentifier = new Map();
        this.nextIndex = 0;
    }
    generateNamespaceImport(moduleName) {
        if (!this.specifierToIdentifier.has(moduleName)) {
            this.specifierToIdentifier.set(moduleName, ts.createIdentifier(`${this.prefix}${this.nextIndex++}`));
        }
        return this.specifierToIdentifier.get(moduleName);
    }
    generateNamedImport(moduleName, originalSymbol) {
        // First, rewrite the symbol name.
        const symbol = this.rewriter.rewriteSymbol(originalSymbol, moduleName);
        // Ask the rewriter if this symbol should be imported at all. If not, it can be referenced
        // directly (moduleImport: null).
        if (!this.rewriter.shouldImportSymbol(symbol, moduleName)) {
            // The symbol should be referenced directly.
            return { moduleImport: null, symbol };
        }
        // If not, this symbol will be imported using a generated namespace import.
        const moduleImport = this.generateNamespaceImport(moduleName);
        return { moduleImport, symbol };
    }
    getAllImports(contextPath) {
        const imports = [];
        for (const [originalSpecifier, qualifier] of this.specifierToIdentifier) {
            const specifier = this.rewriter.rewriteSpecifier(originalSpecifier, contextPath);
            imports.push({
                specifier,
                qualifier,
            });
        }
        return imports;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW1wb3J0X21hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9jb21waWxlci1jbGkvc3JjL25ndHNjL3RyYW5zbGF0b3Ivc3JjL2ltcG9ydF9tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7R0FNRztBQUNILE9BQU8sS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ2pDLE9BQU8sRUFBaUIsa0JBQWtCLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFhakUsTUFBTSxPQUFPLGFBQWE7SUFJeEIsWUFBc0IsV0FBMkIsSUFBSSxrQkFBa0IsRUFBRSxFQUFVLFNBQVMsR0FBRztRQUF6RSxhQUFRLEdBQVIsUUFBUSxDQUEyQztRQUFVLFdBQU0sR0FBTixNQUFNLENBQU07UUFIdkYsMEJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7UUFDekQsY0FBUyxHQUFHLENBQUMsQ0FBQztJQUd0QixDQUFDO0lBRUQsdUJBQXVCLENBQUMsVUFBa0I7UUFDeEMsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDL0MsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FDMUIsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzNFO1FBQ0QsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDO0lBQ3JELENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxVQUFrQixFQUFFLGNBQXNCO1FBQzVELGtDQUFrQztRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdkUsMEZBQTBGO1FBQzFGLGlDQUFpQztRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLEVBQUU7WUFDekQsNENBQTRDO1lBQzVDLE9BQU8sRUFBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBQyxDQUFDO1NBQ3JDO1FBRUQsMkVBQTJFO1FBQzNFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU5RCxPQUFPLEVBQUMsWUFBWSxFQUFFLE1BQU0sRUFBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRCxhQUFhLENBQUMsV0FBbUI7UUFDL0IsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1FBQzdCLEtBQUssTUFBTSxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUN2RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ2pGLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsU0FBUztnQkFDVCxTQUFTO2FBQ1YsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtJbXBvcnRSZXdyaXRlciwgTm9vcEltcG9ydFJld3JpdGVyfSBmcm9tICcuLi8uLi9pbXBvcnRzJztcbmltcG9ydCB7SW1wb3J0R2VuZXJhdG9yLCBOYW1lZEltcG9ydH0gZnJvbSAnLi9hcGkvaW1wb3J0X2dlbmVyYXRvcic7XG5cbi8qKlxuICogSW5mb3JtYXRpb24gYWJvdXQgYW4gaW1wb3J0IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gYSBtb2R1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0IHtcbiAgLyoqIFRoZSBuYW1lIG9mIHRoZSBtb2R1bGUgdGhhdCBoYXMgYmVlbiBpbXBvcnRlZC4gKi9cbiAgc3BlY2lmaWVyOiBzdHJpbmc7XG4gIC8qKiBUaGUgYHRzLklkZW50aWZlcmAgYnkgd2hpY2ggdGhlIGltcG9ydGVkIG1vZHVsZSBpcyBrbm93bi4gKi9cbiAgcXVhbGlmaWVyOiB0cy5JZGVudGlmaWVyO1xufVxuXG5leHBvcnQgY2xhc3MgSW1wb3J0TWFuYWdlciBpbXBsZW1lbnRzIEltcG9ydEdlbmVyYXRvcjx0cy5JZGVudGlmaWVyPiB7XG4gIHByaXZhdGUgc3BlY2lmaWVyVG9JZGVudGlmaWVyID0gbmV3IE1hcDxzdHJpbmcsIHRzLklkZW50aWZpZXI+KCk7XG4gIHByaXZhdGUgbmV4dEluZGV4ID0gMDtcblxuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmV3cml0ZXI6IEltcG9ydFJld3JpdGVyID0gbmV3IE5vb3BJbXBvcnRSZXdyaXRlcigpLCBwcml2YXRlIHByZWZpeCA9ICdpJykge1xuICB9XG5cbiAgZ2VuZXJhdGVOYW1lc3BhY2VJbXBvcnQobW9kdWxlTmFtZTogc3RyaW5nKTogdHMuSWRlbnRpZmllciB7XG4gICAgaWYgKCF0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllci5oYXMobW9kdWxlTmFtZSkpIHtcbiAgICAgIHRoaXMuc3BlY2lmaWVyVG9JZGVudGlmaWVyLnNldChcbiAgICAgICAgICBtb2R1bGVOYW1lLCB0cy5jcmVhdGVJZGVudGlmaWVyKGAke3RoaXMucHJlZml4fSR7dGhpcy5uZXh0SW5kZXgrK31gKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllci5nZXQobW9kdWxlTmFtZSkhO1xuICB9XG5cbiAgZ2VuZXJhdGVOYW1lZEltcG9ydChtb2R1bGVOYW1lOiBzdHJpbmcsIG9yaWdpbmFsU3ltYm9sOiBzdHJpbmcpOiBOYW1lZEltcG9ydDx0cy5JZGVudGlmaWVyPiB7XG4gICAgLy8gRmlyc3QsIHJld3JpdGUgdGhlIHN5bWJvbCBuYW1lLlxuICAgIGNvbnN0IHN5bWJvbCA9IHRoaXMucmV3cml0ZXIucmV3cml0ZVN5bWJvbChvcmlnaW5hbFN5bWJvbCwgbW9kdWxlTmFtZSk7XG5cbiAgICAvLyBBc2sgdGhlIHJld3JpdGVyIGlmIHRoaXMgc3ltYm9sIHNob3VsZCBiZSBpbXBvcnRlZCBhdCBhbGwuIElmIG5vdCwgaXQgY2FuIGJlIHJlZmVyZW5jZWRcbiAgICAvLyBkaXJlY3RseSAobW9kdWxlSW1wb3J0OiBudWxsKS5cbiAgICBpZiAoIXRoaXMucmV3cml0ZXIuc2hvdWxkSW1wb3J0U3ltYm9sKHN5bWJvbCwgbW9kdWxlTmFtZSkpIHtcbiAgICAgIC8vIFRoZSBzeW1ib2wgc2hvdWxkIGJlIHJlZmVyZW5jZWQgZGlyZWN0bHkuXG4gICAgICByZXR1cm4ge21vZHVsZUltcG9ydDogbnVsbCwgc3ltYm9sfTtcbiAgICB9XG5cbiAgICAvLyBJZiBub3QsIHRoaXMgc3ltYm9sIHdpbGwgYmUgaW1wb3J0ZWQgdXNpbmcgYSBnZW5lcmF0ZWQgbmFtZXNwYWNlIGltcG9ydC5cbiAgICBjb25zdCBtb2R1bGVJbXBvcnQgPSB0aGlzLmdlbmVyYXRlTmFtZXNwYWNlSW1wb3J0KG1vZHVsZU5hbWUpO1xuXG4gICAgcmV0dXJuIHttb2R1bGVJbXBvcnQsIHN5bWJvbH07XG4gIH1cblxuICBnZXRBbGxJbXBvcnRzKGNvbnRleHRQYXRoOiBzdHJpbmcpOiBJbXBvcnRbXSB7XG4gICAgY29uc3QgaW1wb3J0czogSW1wb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtvcmlnaW5hbFNwZWNpZmllciwgcXVhbGlmaWVyXSBvZiB0aGlzLnNwZWNpZmllclRvSWRlbnRpZmllcikge1xuICAgICAgY29uc3Qgc3BlY2lmaWVyID0gdGhpcy5yZXdyaXRlci5yZXdyaXRlU3BlY2lmaWVyKG9yaWdpbmFsU3BlY2lmaWVyLCBjb250ZXh0UGF0aCk7XG4gICAgICBpbXBvcnRzLnB1c2goe1xuICAgICAgICBzcGVjaWZpZXIsXG4gICAgICAgIHF1YWxpZmllcixcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gaW1wb3J0cztcbiAgfVxufVxuIl19