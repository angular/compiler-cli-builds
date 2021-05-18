/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { relativePathBetween } from '../../util/src/path';
/**
 * `ImportRewriter` that does no rewriting.
 */
export class NoopImportRewriter {
    shouldImportSymbol(symbol, specifier) {
        return true;
    }
    rewriteSymbol(symbol, specifier) {
        return symbol;
    }
    rewriteSpecifier(specifier, inContextOfFile) {
        return specifier;
    }
}
/**
 * A mapping of supported symbols that can be imported from within @angular/core, and the names by
 * which they're exported from r3_symbols.
 */
const CORE_SUPPORTED_SYMBOLS = new Map([
    ['ɵɵdefineInjectable', 'ɵɵdefineInjectable'],
    ['ɵɵdefineInjector', 'ɵɵdefineInjector'],
    ['ɵɵdefineNgModule', 'ɵɵdefineNgModule'],
    ['ɵɵsetNgModuleScope', 'ɵɵsetNgModuleScope'],
    ['ɵɵinject', 'ɵɵinject'],
    ['ɵɵFactoryDeclaration', 'ɵɵFactoryDeclaration'],
    ['ɵsetClassMetadata', 'setClassMetadata'],
    ['ɵɵInjectableDeclaration', 'ɵɵInjectableDeclaration'],
    ['ɵɵInjectorDeclaration', 'ɵɵInjectorDeclaration'],
    ['ɵɵNgModuleDeclaration', 'ɵɵNgModuleDeclaration'],
    ['ɵNgModuleFactory', 'NgModuleFactory'],
    ['ɵnoSideEffects', 'ɵnoSideEffects'],
]);
const CORE_MODULE = '@angular/core';
/**
 * `ImportRewriter` that rewrites imports from '@angular/core' to be imported from the r3_symbols.ts
 * file instead.
 */
export class R3SymbolsImportRewriter {
    constructor(r3SymbolsPath) {
        this.r3SymbolsPath = r3SymbolsPath;
    }
    shouldImportSymbol(symbol, specifier) {
        return true;
    }
    rewriteSymbol(symbol, specifier) {
        if (specifier !== CORE_MODULE) {
            // This import isn't from core, so ignore it.
            return symbol;
        }
        return validateAndRewriteCoreSymbol(symbol);
    }
    rewriteSpecifier(specifier, inContextOfFile) {
        if (specifier !== CORE_MODULE) {
            // This module isn't core, so ignore it.
            return specifier;
        }
        const relativePathToR3Symbols = relativePathBetween(inContextOfFile, this.r3SymbolsPath);
        if (relativePathToR3Symbols === null) {
            throw new Error(`Failed to rewrite import inside ${CORE_MODULE}: ${inContextOfFile} -> ${this.r3SymbolsPath}`);
        }
        return relativePathToR3Symbols;
    }
}
export function validateAndRewriteCoreSymbol(name) {
    if (!CORE_SUPPORTED_SYMBOLS.has(name)) {
        throw new Error(`Importing unexpected symbol ${name} while compiling ${CORE_MODULE}`);
    }
    return CORE_SUPPORTED_SYMBOLS.get(name);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2NvbXBpbGVyLWNsaS9zcmMvbmd0c2MvaW1wb3J0cy9zcmMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0dBTUc7QUFFSCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQTBCeEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzdCLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxTQUFpQjtRQUNsRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxhQUFhLENBQUMsTUFBYyxFQUFFLFNBQWlCO1FBQzdDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxTQUFpQixFQUFFLGVBQXVCO1FBQ3pELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQUVEOzs7R0FHRztBQUNILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQWlCO0lBQ3JELENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUM7SUFDNUMsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztJQUN4QyxDQUFDLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDO0lBQ3hDLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUM7SUFDNUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0lBQ3hCLENBQUMsc0JBQXNCLEVBQUUsc0JBQXNCLENBQUM7SUFDaEQsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQztJQUN6QyxDQUFDLHlCQUF5QixFQUFFLHlCQUF5QixDQUFDO0lBQ3RELENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUM7SUFDbEQsQ0FBQyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQztJQUNsRCxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDO0lBQ3ZDLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUM7Q0FDckMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDO0FBRXBDOzs7R0FHRztBQUNILE1BQU0sT0FBTyx1QkFBdUI7SUFDbEMsWUFBb0IsYUFBcUI7UUFBckIsa0JBQWEsR0FBYixhQUFhLENBQVE7SUFBRyxDQUFDO0lBRTdDLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxTQUFpQjtRQUNsRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxhQUFhLENBQUMsTUFBYyxFQUFFLFNBQWlCO1FBQzdDLElBQUksU0FBUyxLQUFLLFdBQVcsRUFBRTtZQUM3Qiw2Q0FBNkM7WUFDN0MsT0FBTyxNQUFNLENBQUM7U0FDZjtRQUVELE9BQU8sNEJBQTRCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFNBQWlCLEVBQUUsZUFBdUI7UUFDekQsSUFBSSxTQUFTLEtBQUssV0FBVyxFQUFFO1lBQzdCLHdDQUF3QztZQUN4QyxPQUFPLFNBQVMsQ0FBQztTQUNsQjtRQUVELE1BQU0sdUJBQXVCLEdBQUcsbUJBQW1CLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN6RixJQUFJLHVCQUF1QixLQUFLLElBQUksRUFBRTtZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxXQUFXLEtBQUssZUFBZSxPQUM5RSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztTQUMzQjtRQUVELE9BQU8sdUJBQXVCLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLElBQVk7SUFDdkQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixJQUFJLG9CQUFvQixXQUFXLEVBQUUsQ0FBQyxDQUFDO0tBQ3ZGO0lBQ0QsT0FBTyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFFLENBQUM7QUFDM0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQge3JlbGF0aXZlUGF0aEJldHdlZW59IGZyb20gJy4uLy4uL3V0aWwvc3JjL3BhdGgnO1xuXG4vKipcbiAqIFJld3JpdGVzIGltcG9ydHMgb2Ygc3ltYm9scyBiZWluZyB3cml0dGVuIGludG8gZ2VuZXJhdGVkIGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0UmV3cml0ZXIge1xuICAvKipcbiAgICogU2hvdWxkIHRoZSBnaXZlbiBzeW1ib2wgYmUgaW1wb3J0ZWQgYXQgYWxsP1xuICAgKlxuICAgKiBJZiBgdHJ1ZWAsIHRoZSBzeW1ib2wgc2hvdWxkIGJlIGltcG9ydGVkIGZyb20gdGhlIGdpdmVuIHNwZWNpZmllci4gSWYgYGZhbHNlYCwgdGhlIHN5bWJvbFxuICAgKiBzaG91bGQgYmUgcmVmZXJlbmNlZCBkaXJlY3RseSwgd2l0aG91dCBhbiBpbXBvcnQuXG4gICAqL1xuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbjtcblxuICAvKipcbiAgICogT3B0aW9uYWxseSByZXdyaXRlIGEgcmVmZXJlbmNlIHRvIGFuIGltcG9ydGVkIHN5bWJvbCwgY2hhbmdpbmcgZWl0aGVyIHRoZSBiaW5kaW5nIHByZWZpeCBvciB0aGVcbiAgICogc3ltYm9sIG5hbWUgaXRzZWxmLlxuICAgKi9cbiAgcmV3cml0ZVN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIE9wdGlvbmFsbHkgcmV3cml0ZSB0aGUgZ2l2ZW4gbW9kdWxlIHNwZWNpZmllciBpbiB0aGUgY29udGV4dCBvZiBhIGdpdmVuIGZpbGUuXG4gICAqL1xuICByZXdyaXRlU3BlY2lmaWVyKHNwZWNpZmllcjogc3RyaW5nLCBpbkNvbnRleHRPZkZpbGU6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBgSW1wb3J0UmV3cml0ZXJgIHRoYXQgZG9lcyBubyByZXdyaXRpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBOb29wSW1wb3J0UmV3cml0ZXIgaW1wbGVtZW50cyBJbXBvcnRSZXdyaXRlciB7XG4gIHNob3VsZEltcG9ydFN5bWJvbChzeW1ib2w6IHN0cmluZywgc3BlY2lmaWVyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJld3JpdGVTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gc3ltYm9sO1xuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBzcGVjaWZpZXI7XG4gIH1cbn1cblxuLyoqXG4gKiBBIG1hcHBpbmcgb2Ygc3VwcG9ydGVkIHN5bWJvbHMgdGhhdCBjYW4gYmUgaW1wb3J0ZWQgZnJvbSB3aXRoaW4gQGFuZ3VsYXIvY29yZSwgYW5kIHRoZSBuYW1lcyBieVxuICogd2hpY2ggdGhleSdyZSBleHBvcnRlZCBmcm9tIHIzX3N5bWJvbHMuXG4gKi9cbmNvbnN0IENPUkVfU1VQUE9SVEVEX1NZTUJPTFMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPihbXG4gIFsnybXJtWRlZmluZUluamVjdGFibGUnLCAnybXJtWRlZmluZUluamVjdGFibGUnXSxcbiAgWyfJtcm1ZGVmaW5lSW5qZWN0b3InLCAnybXJtWRlZmluZUluamVjdG9yJ10sXG4gIFsnybXJtWRlZmluZU5nTW9kdWxlJywgJ8m1ybVkZWZpbmVOZ01vZHVsZSddLFxuICBbJ8m1ybVzZXROZ01vZHVsZVNjb3BlJywgJ8m1ybVzZXROZ01vZHVsZVNjb3BlJ10sXG4gIFsnybXJtWluamVjdCcsICfJtcm1aW5qZWN0J10sXG4gIFsnybXJtUZhY3RvcnlEZWNsYXJhdGlvbicsICfJtcm1RmFjdG9yeURlY2xhcmF0aW9uJ10sXG4gIFsnybVzZXRDbGFzc01ldGFkYXRhJywgJ3NldENsYXNzTWV0YWRhdGEnXSxcbiAgWyfJtcm1SW5qZWN0YWJsZURlY2xhcmF0aW9uJywgJ8m1ybVJbmplY3RhYmxlRGVjbGFyYXRpb24nXSxcbiAgWyfJtcm1SW5qZWN0b3JEZWNsYXJhdGlvbicsICfJtcm1SW5qZWN0b3JEZWNsYXJhdGlvbiddLFxuICBbJ8m1ybVOZ01vZHVsZURlY2xhcmF0aW9uJywgJ8m1ybVOZ01vZHVsZURlY2xhcmF0aW9uJ10sXG4gIFsnybVOZ01vZHVsZUZhY3RvcnknLCAnTmdNb2R1bGVGYWN0b3J5J10sXG4gIFsnybVub1NpZGVFZmZlY3RzJywgJ8m1bm9TaWRlRWZmZWN0cyddLFxuXSk7XG5cbmNvbnN0IENPUkVfTU9EVUxFID0gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4vKipcbiAqIGBJbXBvcnRSZXdyaXRlcmAgdGhhdCByZXdyaXRlcyBpbXBvcnRzIGZyb20gJ0Bhbmd1bGFyL2NvcmUnIHRvIGJlIGltcG9ydGVkIGZyb20gdGhlIHIzX3N5bWJvbHMudHNcbiAqIGZpbGUgaW5zdGVhZC5cbiAqL1xuZXhwb3J0IGNsYXNzIFIzU3ltYm9sc0ltcG9ydFJld3JpdGVyIGltcGxlbWVudHMgSW1wb3J0UmV3cml0ZXIge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHIzU3ltYm9sc1BhdGg6IHN0cmluZykge31cblxuICBzaG91bGRJbXBvcnRTeW1ib2woc3ltYm9sOiBzdHJpbmcsIHNwZWNpZmllcjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXdyaXRlU3ltYm9sKHN5bWJvbDogc3RyaW5nLCBzcGVjaWZpZXI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHNwZWNpZmllciAhPT0gQ09SRV9NT0RVTEUpIHtcbiAgICAgIC8vIFRoaXMgaW1wb3J0IGlzbid0IGZyb20gY29yZSwgc28gaWdub3JlIGl0LlxuICAgICAgcmV0dXJuIHN5bWJvbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsaWRhdGVBbmRSZXdyaXRlQ29yZVN5bWJvbChzeW1ib2wpO1xuICB9XG5cbiAgcmV3cml0ZVNwZWNpZmllcihzcGVjaWZpZXI6IHN0cmluZywgaW5Db250ZXh0T2ZGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChzcGVjaWZpZXIgIT09IENPUkVfTU9EVUxFKSB7XG4gICAgICAvLyBUaGlzIG1vZHVsZSBpc24ndCBjb3JlLCBzbyBpZ25vcmUgaXQuXG4gICAgICByZXR1cm4gc3BlY2lmaWVyO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID0gcmVsYXRpdmVQYXRoQmV0d2VlbihpbkNvbnRleHRPZkZpbGUsIHRoaXMucjNTeW1ib2xzUGF0aCk7XG4gICAgaWYgKHJlbGF0aXZlUGF0aFRvUjNTeW1ib2xzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXdyaXRlIGltcG9ydCBpbnNpZGUgJHtDT1JFX01PRFVMRX06ICR7aW5Db250ZXh0T2ZGaWxlfSAtPiAke1xuICAgICAgICAgIHRoaXMucjNTeW1ib2xzUGF0aH1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVsYXRpdmVQYXRoVG9SM1N5bWJvbHM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlQW5kUmV3cml0ZUNvcmVTeW1ib2wobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFDT1JFX1NVUFBPUlRFRF9TWU1CT0xTLmhhcyhuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW1wb3J0aW5nIHVuZXhwZWN0ZWQgc3ltYm9sICR7bmFtZX0gd2hpbGUgY29tcGlsaW5nICR7Q09SRV9NT0RVTEV9YCk7XG4gIH1cbiAgcmV0dXJuIENPUkVfU1VQUE9SVEVEX1NZTUJPTFMuZ2V0KG5hbWUpITtcbn1cbiJdfQ==