import { add, isToday } from 'date-fns';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { BatchGetItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DateDay,
  DaysTweetCountColumn,
  DAYS_COUNT_YEAR_LATEST,
  DAYS_TWEET_COUNT_TABLE,
  formatDateShort,
  getDaysFor,
  TweetCount,
} from '@what-day-bot/day-bots-shared';

const postDays = async (dateDays: DateDay[], dayLimit = 4) => {
  let result = '';
  dateDays.forEach((dateDay) => {
    const dateStr = formatDateShort(dateDay.date);

    if (isToday(dateDay.date)) {
      result = `${dateStr}\n`;
      dateDay.days.slice(0, dayLimit).forEach((day) => {
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

  const lambda = new LambdaClient({});
  await lambda.send(
    new InvokeCommand({
      FunctionName: 'twitterBot',
      Payload: Buffer.from(JSON.stringify({ text: result })),
      InvocationType: InvocationType.Event,
    })
  );
};

const sortDaysBasedOnLastYearTrends = async (dateDays: DateDay[]) => {
  const dynamo = new DynamoDBClient({});

  const batchGet = new BatchGetItemCommand({
    RequestItems: {
      [DAYS_TWEET_COUNT_TABLE]: {
        Keys: dateDays.map((dateDay) => ({
          [DaysTweetCountColumn.DATE]: { S: formatDateShort(dateDay.date) },
          [DaysTweetCountColumn.YEAR]: { N: DAYS_COUNT_YEAR_LATEST },
        })),
      },
    },
  });

  const { Responses, UnprocessedKeys } = await dynamo.send(batchGet);
  if (Object.keys(UnprocessedKeys).length > 0) {
    console.log('Unprocessed', UnprocessedKeys);
  }

  const counts = {};
  Responses[DAYS_TWEET_COUNT_TABLE].forEach((data) => {
    const days = {};
    const tweetCounts: TweetCount[] = JSON.parse(
      data[DaysTweetCountColumn.DAYS].S
    );

    tweetCounts.forEach((tweetCount) => {
      days[tweetCount.day] = tweetCount.count;
    });

    counts[data[DaysTweetCountColumn.DATE].S] = days;
  });

  dateDays.forEach((dateDay) => {
    const dateStr = formatDateShort(dateDay.date);
    const dateCount = counts[dateStr] || {};
    const getCount = (day: string) => dateCount[day] || day.length * -1;

    dateDay.days.sort((a, b) => getCount(b) - getCount(a));
  });
};

export const handler = async () => {
  try {
    const today = new Date();
    const dateDays = await getDaysFor(today, add(today, { days: 5 }));
    if (dateDays.length === 0) {
      return 'No special days';
    }

    await sortDaysBasedOnLastYearTrends(dateDays);
    await postDays(dateDays);
  } catch (err) {
    console.log(err);
  }
};

// For testing locally
// handler();
