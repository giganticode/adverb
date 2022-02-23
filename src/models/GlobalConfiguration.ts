import { RenamingConfiguration } from ".";

export class GlobalConfiguration {
    public fileRenaming: number | undefined;
    public renamings: { [key: string]: RenamingConfiguration } | undefined;
};