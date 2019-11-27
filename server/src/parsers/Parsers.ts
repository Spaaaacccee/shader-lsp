import BlockParser from "./BlockParser";
import KeywordParser from "./KeywordParser";
import RootParser from "./RootParser";
import StubParser from "./StubParser";
import UnknownParser from "./UnknownParser";

export const block = new BlockParser();
export const unknown = new UnknownParser();
export const root = new RootParser();
export const stub = new StubParser();
export const keyword = new KeywordParser();
