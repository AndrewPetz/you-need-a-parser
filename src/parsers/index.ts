import { parse, ParseResult, unparse } from 'papaparse';
import 'mdn-polyfills/String.prototype.padStart';

import { outbank } from './outbank';
import { n26 } from './n26';

export interface YnabRow {
  Date?: string;
  Payee?: string;
  Category?: string;
  Memo?: string;
  Outflow?: string;
  Inflow?: string;
}

export interface ParserModule {
  name: string;
  link: string;
  matcher: MatcherFunction;
  parser: ParserFunction;
}

export type MatcherFunction = (file: File, data: any[]) => Promise<boolean>;
export type ParserFunction = (data: any[]) => Promise<YnabRow[]>;

export const parserMap: { [k: string]: ParserModule } = {
  outbank,
  n26,
};

export const matchFile = async (file: File, data: any[]) => {
  for (const parser of Object.values(parserMap)) {
    if (await parser.matcher(file, data)) {
      return parser;
    }
  }

  return null;
};

export const parseFile = async (file: File, parserOverride?: ParserModule) => {
  const { data }: ParseResult = await new Promise((complete, error) => {
    parse(file, {
      header: true,
      complete,
      error,
    });
  });

  const parser = parserOverride || (await matchFile(file, data));

  if (!parser) {
    throw new Error(`No parser is available for this file.`);
  }

  const ynabData = await parser.parser(data);

  return {
    data: unparse(ynabData),
    matchedParser: parser,
  };
};
