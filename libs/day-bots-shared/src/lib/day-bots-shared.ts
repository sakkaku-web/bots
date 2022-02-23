import axios from 'axios';
import { add, eachDayOfInterval, format } from 'date-fns';

export const DAYS_TWEET_COUNT_TABLE = 'daysTweetCount';
export enum DaysTweetCountColumn {
  DATE = 'date',
  YEAR = 'year',
}

export const formatDateShort = (date: Date): string => {
  return format(date, 'M/d');
};

const url = `https://ja.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&rvprop=content&redirects=1&titles=${encodeURI(
  '日本の記念日一覧'
)}`;

const formatDateJP = (date: Date): string => {
  return format(date, 'M月d日');
};

export const getDaysFor = async (start: Date) => {
  const { data } = await axios.get(url);
  const pages = data.query.pages;
  const content = pages[Object.keys(pages)[0]].revisions[0]['*'] as string;

  const end = add(start, { days: 5 });
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
          .filter((x) => !!x && x.length < 10);

        return {
          date,
          days: days.slice(0, 5),
        };
      }
    })
    .filter((x) => !!x && x.days.length > 0);

  return dateDays;
};
