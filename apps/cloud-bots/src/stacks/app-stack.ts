import * as cdk from '@aws-cdk/core';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Table, AttributeType } from '@aws-cdk/aws-dynamodb';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { join } from 'path';
import {
  DAYS_TWEET_COUNT_TABLE,
  DaysTweetCountColumn,
} from '../../../../libs/day-bots-shared/src';

const libsPath = '../../dist/libs';

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'daysTweetCount', {
      tableName: DAYS_TWEET_COUNT_TABLE,
      partitionKey: {
        name: DaysTweetCountColumn.DATE,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: DaysTweetCountColumn.YEAR,
        type: AttributeType.NUMBER,
      },
    });

    const twitterBotFunction = new Function(this, 'twitterBotFunction', {
      functionName: 'twitterBot',
      environment: {
        TWITTER_API_KEY: process.env.TWITTER_API_KEY,
        TWITTER_API_SECRET: process.env.TWITTER_API_SECRET,
      },
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(join(libsPath, 'twitter-bot')),
      handler: 'twitter-bot.handler',
      logRetention: RetentionDays.ONE_MONTH,
    });

    const whatDayBotFunction = new Function(this, 'whatDayBotFunction', {
      runtime: Runtime.NODEJS_14_X,
      environment: {
        TWITTER_ACCESS: process.env.TWITTER_ACCESS_TOKEN,
        TWITTER_SECRET: process.env.TWITTER_ACCESS_SECRET,
      },
      code: Code.fromAsset(join(libsPath, 'what-day-bot')),
      handler: 'what-day-bot.handler',
      logRetention: RetentionDays.ONE_MONTH,
    });
    twitterBotFunction.grantInvoke(whatDayBotFunction);
    table.grantReadData(whatDayBotFunction);

    const dayTrendingBotFunction = new Function(
      this,
      'dayTrendingBotFunction',
      {
        environment: {
          TWITTER_BEARER: process.env.TWITTER_BEARER,
          TWITTER_ACCESS: process.env.TWITTER_ACCESS_TOKEN,
          TWITTER_SECRET: process.env.TWITTER_ACCESS_SECRET,
        },
        runtime: Runtime.NODEJS_14_X,
        code: Code.fromAsset(join(libsPath, 'day-trending-bot')),
        handler: 'day-trending-bot.handler',
        logRetention: RetentionDays.ONE_MONTH,
      }
    );
    twitterBotFunction.grantInvoke(dayTrendingBotFunction);
    table.grantWriteData(dayTrendingBotFunction);

    const dailyRule = new Rule(this, 'dailyCron', {
      schedule: Schedule.cron({ minute: '0', hour: '0' }),
    });
    dailyRule.addTarget(new LambdaFunction(whatDayBotFunction));
    dailyRule.addTarget(new LambdaFunction(dayTrendingBotFunction));
  }
}
