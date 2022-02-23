import { FileConfiguration } from ".";
import { GlobalConfiguration } from "./GlobalConfiguration";

export class AdverbConfiguration {
    public global: GlobalConfiguration | undefined;
    public files: { [key: string]: FileConfiguration } | undefined;
};