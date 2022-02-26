import {
  DaysTweetCountColumn,
  DAYS_COUNT_YEAR_LATEST,
  DAYS_TWEET_COUNT_TABLE,
  getDaysFor,
  TweetCount,
} from '@what-day-bot/day-bots-shared';
import { endOfDay, isValid, startOfDay, sub } from 'date-fns';
import { TwitterApi } from 'twitter-api-v2';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { formatDateShort } from '@what-day-bot/common-shared';

const TWEET_COUNT_SAVE_LIMIT = 500;

const saveDaysTweetCount = async (date: Date, tweetCounts: TweetCount[]) => {
  const countSave = tweetCounts.filter((c) => c.count > TWEET_COUNT_SAVE_LIMIT);
  if (countSave.length === 0) return;

  const Item = {
    [DaysTweetCountColumn.DATE]: { S: formatDateShort(date) },
    [DaysTweetCountColumn.YEAR]: { N: DAYS_COUNT_YEAR_LATEST },
    [DaysTweetCountColumn.DAYS]: {
      S: JSON.stringify(countSave),
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
  let result = `🔥 Trending ${date.getFullYear()}: ${formatDateShort(date)}\n`;

  tweetCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((dayCount) => {
      result += `#${dayCount.day}: ${dayCount.count}\n`;
    });

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

const getTweetCountForDate = async (date: Date): Promise<TweetCount[]> => {
  const days = await getDaysFor(date);

  const twitter = new TwitterApi(process.env.TWITTER_BEARER);
  const tweetCounts = await Promise.all(
    days[0].days.map(async (day) => {
      const tweetCount = await twitter.v2.tweetCountRecent(`#${day}`, {
        start_time: startOfDay(date).toISOString(),
        end_time: endOfDay(date).toISOString(),
      });
      return {
        day,
        count: tweetCount.meta.total_tweet_count,
      };
    })
  );

  return tweetCounts;
};

export const handler = async (event) => {
  let date = new Date(event.time);
  if (!isValid(date)) {
    date = new Date();
  }

  try {
    const yesterday = sub(date, { days: 1 });
    const tweetCounts = await getTweetCountForDate(yesterday);

    if (tweetCounts.length === 0) {
      return 'No tweet counts';
    }

    await saveDaysTweetCount(yesterday, tweetCounts);
    await postTrendingDays(yesterday, tweetCounts);
  } catch (err) {
    console.log(err);
    return err;
  }
};
