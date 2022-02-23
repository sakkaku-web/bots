import { TwitterApi } from 'twitter-api-v2';

export const handler = async (event: TweetEvent) => {
  try {
    const api = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS,
      accessSecret: process.env.TWITTER_SECRET,
    });

    await api.v2.tweet(event.text);
  } catch (err) {
    console.log(err);
  }
};

export interface TweetEvent {
  text: string;
}
