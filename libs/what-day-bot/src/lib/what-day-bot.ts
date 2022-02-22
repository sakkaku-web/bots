import axios from 'axios';
import { add, eachDayOfInterval, format } from 'date-fns';

const url = `https://ja.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&rvprop=content&redirects=1&titles=${encodeURI(
  '日本の記念日一覧'
)}`;

const formatDate = (date: Date): string => {
  return format(date, 'M月d日');
};

export const handler = async () => {
  try {
    const { data } = await axios.get(url);
    const pages = data.query.pages;
    const content = pages[Object.keys(pages)[0]].revisions[0]['*'] as string;

    const start = new Date();
    const end = add(start, { days: 7 });
    const dates = eachDayOfInterval({ start, end });

    const lines = content.split('\n');

    const dateDays = dates.map((date) => {
      const dateStr = formatDate(date);
      const foundLine = lines.find((line) => line.includes(dateStr));
      if (foundLine) {
        const days = foundLine
          .split('-')[1]
          .split('、')
          .map((day) => day.replace(/\[|\]/g, '').trim());

        return {
          date,
          days,
        };
      }
    });

    console.log(dateDays);
  } catch (err) {
    console.log(err);
  }
};

// For testing locally
// handler();
