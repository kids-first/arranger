import { GraphQLResolveInfo } from 'graphql';
import { MergeInfo } from 'graphql-tools';
import { Client } from 'elasticsearch';

export interface AdminApiConfig {
  esHost: string;
}
export interface IQueryContext {
  es: Client;
}

export type ResolverOutput<T> = T | Promise<T>;

export type MergeResolver<Output, Args = Object> =
  | ((
      a: any,
      args: Args,
      c: IQueryContext,
      d: GraphQLResolveInfo & { mergeInfo: MergeInfo },
    ) => ResolverOutput<Output>)
  | ResolverOutput<Output>;

export interface IMergeSchema<TOutput, TInput = any> {
  fragment: string;
  resolve: MergeResolver<TOutput, TInput>;
}
