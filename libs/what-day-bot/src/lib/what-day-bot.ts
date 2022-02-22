import axios from 'axios';
import { add, eachDayOfInterval, format, isEqual, startOfDay } from 'date-fns';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';

const url = `https://ja.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&rvprop=content&redirects=1&titles=${encodeURI(
  '日本の記念日一覧'
)}`;

const formatDate = (date: Date): string => {
  return format(date, 'M月d日');
};

const formatDateShort = (date: Date): string => {
  return format(date, 'M/d');
};

export const handler = async () => {
  try {
    const { data } = await axios.get(url);
    const pages = data.query.pages;
    const content = pages[Object.keys(pages)[0]].revisions[0]['*'] as string;

    const start = new Date();
    const end = add(start, { days: 5 });
    const dates = eachDayOfInterval({ start, end });

    const lines = content.split('\n');

    const dateDays = dates
      .map((date) => {
        const dateStr = formatDate(date);
        const foundLine = lines.find((line) => line.includes(dateStr));
        if (foundLine) {
          const days = foundLine
            .split('-')[1]
            .split('、')
            .map((day) => day.replace(/\[|\]/g, '').trim())
            .map((day) => day.split('（')[0])
            .map((day) => day.split('／')[0])
            .filter((x) => !!x && x.length < 10);

          return {
            date,
            days: days.slice(0, 5),
          };
        }
      })
      .filter((x) => !!x && x.days.length > 0);

    if (dateDays.length === 0) {
      return 'No special days';
    }

    let result = '';
    dateDays.forEach((dateDay) => {
      const dateStr = formatDateShort(dateDay.date);

      if (isEqual(dateDay.date, startOfDay(start))) {
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
