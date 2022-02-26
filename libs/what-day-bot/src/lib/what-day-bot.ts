import { add, isToday, isValid } from 'date-fns';
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

const POPULAR_TWEET_COUNT = 1_000_000;

const postDays = async (
  popular: string[],
  dateDays: DateDay[],
  dayLimit = 4
) => {
  let result = '';
  dateDays.forEach((dateDay) => {
    const dateStr = formatDateShort(dateDay.date);
    const days = dateDay.days
      .slice(0, dayLimit)
      .map((day) => (popular.includes(day) ? `🔥${day}` : day));

    if (isToday(dateDay.date)) {
      result = `📢 ${dateStr}\n`;
      days.forEach((day) => {
        result += `#${day}\n`;
      });
      result += '\n🔜\n';
    } else {
      result += `${dateStr}: ${days.join(', ')}\n`;
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
      Payload: Buffer.from(
        JSON.stringify({
          text: result,
          accessToken: process.env.TWITTER_ACCESS,
          accessSecret: process.env.TWITTER_SECRET,
        })
      ),
      InvocationType: InvocationType.Event,
    })
  );
};

const sortDaysBasedOnLastYearTrends = async (
  dateDays: DateDay[]
): Promise<string[]> => {
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

  const popular = [];
  const counts = {};
  Responses[DAYS_TWEET_COUNT_TABLE].forEach((data) => {
    const days = {};
    const tweetCounts: TweetCount[] = JSON.parse(
      data[DaysTweetCountColumn.DAYS].S
    );

    tweetCounts.forEach((tweetCount) => {
      days[tweetCount.day] = tweetCount.count;

      if (tweetCount.count >= POPULAR_TWEET_COUNT) {
        popular.push(tweetCount.day);
      }
    });

    counts[data[DaysTweetCountColumn.DATE].S] = days;
  });

  dateDays.forEach((dateDay) => {
    const dateStr = formatDateShort(dateDay.date);
    const dateCount = counts[dateStr] || {};
    const getCount = (day: string) => dateCount[day] || day.length * -1;

    dateDay.days.sort((a, b) => getCount(b) - getCount(a));
  });

  return popular;
};

export const handler = async (event) => {
  let date = new Date(event.time);
  if (!isValid(date)) {
    date = new Date();
  }

  try {
    const dateDays = await getDaysFor(date, add(date, { days: 5 }));
    if (dateDays.length === 0) {
      return 'No special days';
    }

    const popular = await sortDaysBasedOnLastYearTrends(dateDays);
    await postDays(popular, dateDays);
  } catch (err) {
    console.log(err);
  }
};

// For testing locally
// handler();
