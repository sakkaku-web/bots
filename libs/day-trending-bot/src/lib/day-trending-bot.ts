import {
  DaysTweetCountColumn,
  DAYS_COUNT_YEAR_LATEST,
  DAYS_TWEET_COUNT_TABLE,
  formatDateShort,
  getDaysFor,
  TweetCount,
} from '@what-day-bot/day-bots-shared';
import { startOfYesterday } from 'date-fns';
import { TwitterApi } from 'twitter-api-v2';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const saveDaysTweetCount = async (date: Date, tweetCounts: TweetCount[]) => {
  const Item = {
    [DaysTweetCountColumn.DATE]: { S: formatDateShort(date) },
    [DaysTweetCountColumn.YEAR]: { N: DAYS_COUNT_YEAR_LATEST },
    [DaysTweetCountColumn.DAYS]: {
      S: JSON.stringify(tweetCounts.filter((c) => c.count > 500)),
    },
  };

  const dynamo = new DynamoDBClient({});
  await dynamo.send(
    new PutItemCommand({
      TableName: DAYS_TWEET_COUNT_TABLE,
      Item,
    })
  );
};

const postTrendingDays = async (date: Date, tweetCounts: TweetCount[]) => {
  let result = `Trending ${date.getFullYear()}: ${formatDateShort(date)}\n`;

  tweetCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((dayCount) => {
      result += `#${dayCount.day}: ${dayCount.count}\n`;
    });

  const lambda = new LambdaClient({});
  await lambda.send(
    new InvokeCommand({
      FunctionName: 'twitterBot',
      Payload: Buffer.from(JSON.stringify({ text: result })),
      InvocationType: InvocationType.Event,
    })
  );
};

const getTweetCountForDate = async (date: Date): Promise<TweetCount[]> => {
  const days = await getDaysFor(date);

  const twitter = new TwitterApi(process.env.TWITTER_BEARER);
  const tweetCounts = await Promise.all(
    days[0].days.map(async (day) => {
      const tweetCount = await twitter.v2.tweetCountRecent(`#${day}`);
      return {
        day,
        count: tweetCount.meta.total_tweet_count,
      };
    })
  );

  return tweetCounts;
};

export const handler = async () => {
  try {
    const yesterday = startOfYesterday();
    const tweetCounts = await getTweetCountForDate(yesterday);
    await saveDaysTweetCount(yesterday, tweetCounts);
    await postTrendingDays(yesterday, tweetCounts);
  } catch (err) {
    console.log(err);
    return err;
  }
};
