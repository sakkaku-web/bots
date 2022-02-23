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

export const parseDay = (day: string): string[] => {
  let cleanDay = day
    .replace(/(\{.*?\}) */g, '')
    .replace(/\{|\}/g, '')
    .replace('<ref>', '')
    .replace('</ref>', '');
  const result = [];

  if (cleanDay.includes('|')) {
    cleanDay = cleanDay.split('|')[1];
  }

  cleanDay = cleanDay.replace(/\[|\]/g, '');

  if (cleanDay.includes('http')) {
    const split = cleanDay.split('/');
    cleanDay = split[split.length - 1];
  }

  result.push(...splitAndGetWithPrio(cleanDay, '／'));

  return result.map((r) => r.replace(/(\(.*?\)) */g, '')).map((r) => r.trim());
};

const splitAndGetWithPrio = (day: string, delim: string): string[] => {
  const split = day.split(delim);
  const priority = split.filter((s) => s.includes('の日'));
  if (priority.length > 0) return priority;

  const secondPrio = split.filter((s) => s.includes('日'));
  if (secondPrio.length > 0) return secondPrio;
  return split;
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
          .map((day) => parseDay(day))
          .reduce((prev, curr) => prev.concat(curr), [])
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
