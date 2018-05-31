/// <amd-module name="@angular/compiler-cli/src/ngtsc/transform/src/declaration" />
import { AddStaticFieldInstruction } from './api';
/**
 * Processes .d.ts file text and adds static field declarations, with types.
 */
export declare class DtsFileTransformer {
    private ivyFields;
    private imports;
    /**
     * Track that a static field was added to the code for a class.
     */
    recordStaticField(name: string, decl: AddStaticFieldInstruction): void;
    /**
     * Process the .d.ts text for a file and add any declarations which were recorded.
     */
    transform(dts: string): string;
}
