import {
  add,
  eachDayOfInterval,
  format,
  isToday,
  isValid,
  parse,
} from 'date-fns';
import {
  getLatestRevision,
  getLinkText,
  removeHTMLTags,
} from '@what-day-bot/wikipedia-utils';
import { formatDateShort } from '@what-day-bot/common-shared';
import {
  InvocationType,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';

const getBirthdays = async (
  start: Date,
  end: Date
): Promise<{ [d: string]: string[] }> => {
  const content = await getLatestRevision('hololive.wiki', 'List_of_Birthdays');
  const contentPerMonth = content.split(/===/g);

  const eachDay = eachDayOfInterval({ start, end });
  const groupedDaysByMonth = {};

  eachDay.forEach((d) => {
    const month = format(d, 'MMMM');
    if (!groupedDaysByMonth[month]) {
      groupedDaysByMonth[month] = [];
    }

    groupedDaysByMonth[month].push(d);
  });

  const birthDays = {};
  Object.keys(groupedDaysByMonth).forEach((month) => {
    const monthIndex = contentPerMonth.findIndex((c) => c.trim() === month);
    const monthContent = contentPerMonth[monthIndex + 1];
    const monthLines = monthContent.split('\n');

    const dates = groupedDaysByMonth[month];
    dates.forEach((date) => {
      const dateStr = format(date, 'dd') + '. ';
      const days = monthLines.filter((line) => line.includes(dateStr));

      const names = days.map((day) =>
        removeHTMLTags(getLinkText(day.split(dateStr)[1]))
      );

      if (names.length > 0) {
        birthDays[formatDateShort(date)] = names;
      }
    });
  });

  return birthDays;
};

export const handler = async (event) => {
  let date = new Date(event.time);
  if (!isValid(date)) {
    date = new Date();
  }

  try {
    const birthdays = await getBirthdays(date, add(date, { days: 7 }));

    let text = '';

    Object.keys(birthdays).forEach((day) => {
      const date = parse(day, 'M/d', new Date());
      if (isToday(date)) {
        text += day + ': Happy Birthday! 🎂\n';
        birthdays[day].forEach((name) => {
          text += `${name}\n`;
        });
      } else {
        text += day + ': ' + birthdays[day].join(', ') + '\n';
      }
    });

    if (text === '') {
      return 'No birthdays';
    }

    text += '#hololive #ホロライブ';

    console.log(text);

    const lambda = new LambdaClient({});
    await lambda.send(
      new InvokeCommand({
        FunctionName: 'twitterBot',
        Payload: Buffer.from(
          JSON.stringify({
            text,
            accessToken: process.env.TWITTER_ACCESS,
            accessSecret: process.env.TWITTER_SECRET,
          })
        ),
        InvocationType: InvocationType.Event,
      })
    );
  } catch (err) {
    console.log(err);
  }
};

// handler({});
