import axios from 'axios';

export const getLatestRevision = async (host: string, title: string) => {
  const url = `https://${host}/w/api.php?format=json&action=query&prop=revisions&rvprop=content&redirects=1&titles=${encodeURI(
    title
  )}`;

  const { data } = await axios.get(url);
  const pages = data.query.pages;
  return pages[Object.keys(pages)[0]].revisions[0]['*'] as string;
};
