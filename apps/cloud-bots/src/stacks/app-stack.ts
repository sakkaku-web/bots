import * as cdk from '@aws-cdk/core';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Table, AttributeType } from '@aws-cdk/aws-dynamodb';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { join } from 'path';

const libsPath = '../../dist/libs';

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(scope, 'daysTweetCount', {
      tableName: 'daysTweetCount',
      partitionKey: {
        name: 'date',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'year',
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
      environment: {
        TWITTER_ACCESS: process.env.TWITTER_ACCESS_TOKEN,
        TWITTER_SECRET: process.env.TWITTER_ACCESS_SECRET,
      },
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(join(libsPath, 'what-day-bot')),
      handler: 'what-day-bot.handler',
      logRetention: RetentionDays.ONE_MONTH,
    });
    twitterBotFunction.grantInvoke(whatDayBotFunction);
    table.grantReadData(whatDayBotFunction);

    const dailyRule = new Rule(this, 'dailyCron', {
      schedule: Schedule.cron({ minute: '0', hour: '0' }),
    });
    dailyRule.addTarget(new LambdaFunction(whatDayBotFunction));
  }
}
