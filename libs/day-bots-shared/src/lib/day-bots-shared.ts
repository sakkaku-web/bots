import axios from 'axios';
import { eachDayOfInterval, format } from 'date-fns';

export const DAYS_TWEET_COUNT_TABLE = 'daysTweetCount';
export enum DaysTweetCountColumn {
  DATE = 'date',
  YEAR = 'year',
  DAYS = 'days',
}
export const DAYS_COUNT_YEAR_LATEST = '0';

export const formatDateShort = (date: Date): string => {
  return format(date, 'M/d');
};

const url = `https://ja.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&rvprop=content&redirects=1&titles=${encodeURI(
  '日本の記念日一覧'
)}`;

const formatDateJP = (date: Date): string => {
  return format(date, 'M月d日');
};

export interface DateDay {
  date: Date;
  days: string[];
}

export const getDaysFor = async (
  start: Date,
  end: Date = start
): Promise<DateDay[]> => {
  const { data } = await axios.get(url);
  const pages = data.query.pages;
  const content = pages[Object.keys(pages)[0]].revisions[0]['*'] as string;

  const dates = eachDayOfInterval({ start, end });

  const lines = content.split('\n');

  const dateDays = dates
    .map((date) => {
      const dateStr = formatDateJP(date);
      const foundLine = lines.find((line) => line.includes(dateStr));
      if (foundLine) {
        const days = foundLine
          .split('-')[1]
          .split('、')
          .map((day) => day.replace(/\[|\]/g, '').trim())
          .map((day) => day.split('（')[0])
          .map((day) => day.split('／')[0])
          .filter((x) => !!x);

        return {
          date,
          days,
        };
      }
    })
    .filter((x) => !!x && x.days.length > 0);

  return dateDays;
};

export interface TweetCount {
  day: string;
  count: number;
}
