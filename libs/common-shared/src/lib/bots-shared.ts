import { format } from "date-fns";

export const formatDateShort = (date: Date): string => {
  return format(date, 'M/d');
};
