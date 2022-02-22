import * as cdk from '@aws-cdk/core';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Runtime, Code, Function } from '@aws-cdk/aws-lambda';
import { Rule, Schedule } from '@aws-cdk/aws-events';
import { LambdaFunction } from '@aws-cdk/aws-events-targets';
import { join } from 'path';

const libsPath = '../../dist/libs';

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const whatDayBotFunction = new Function(this, 'whatDayBotFunction', {
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset(join(libsPath, 'what-day-bot')),
      handler: 'what-day-bot.handler',
      logRetention: RetentionDays.ONE_MONTH,
    });

    const dailyRule = new Rule(this, 'dailyCron', {
      schedule: Schedule.cron({ minute: '0', hour: '0' }),
    });
    dailyRule.addTarget(new LambdaFunction(whatDayBotFunction));
  }
}
