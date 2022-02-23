import { isEqual, startOfDay } from 'date-fns';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { formatDateShort, getDaysFor } from '@what-day-bot/day-bots-shared';

export const handler = async () => {
  try {
    const today = startOfDay(new Date());
    const dateDays = await getDaysFor(today);
    if (dateDays.length === 0) {
      return 'No special days';
    }

    let result = '';
    dateDays.forEach((dateDay) => {
      const dateStr = formatDateShort(dateDay.date);

      if (isEqual(dateDay.date, today)) {
        result = `${dateStr}\n`;
        dateDay.days.forEach((day) => {
          result += `#${day}\n`;
        });
        result += '\n';
      } else {
        result += `${dateStr}: ${dateDay.days.join(', ')}\n`;
      }
    });

    while (result.length > 250) {
      const index = result.lastIndexOf('\n');
      result = result.substring(0, index);
    }

    console.log(result);

    const payload = {
      text: result,
      accessToken: process.env.TWITTER_ACCESS,
      accessSecret: process.env.TWITTER_SECRET,
    };
    const lambda = new LambdaClient({});
    await lambda.send(
      new InvokeCommand({
        FunctionName: 'twitterBot',
        Payload: Buffer.from(JSON.stringify(payload)),
        InvocationType: InvocationType.Event,
      })
    );
  } catch (err) {
    console.log(err);
  }
};

// For testing locally
// handler();
