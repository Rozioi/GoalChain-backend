import { Bot, Context } from "grammy";
import { I18nFlavor } from "@grammyjs/i18n";
type MyContext = Context & I18nFlavor;
export declare let bot: Bot<MyContext>;
export declare const startBot: () => Promise<void>;
export {};
