import { chat } from "./chat";
import { common } from "./common";
import { decision } from "./decision";
import { form } from "./form";
import { processing } from "./processing";

export { chat, common, decision, form, processing };

export const pl = { common, form, processing, chat, decision } as const;
