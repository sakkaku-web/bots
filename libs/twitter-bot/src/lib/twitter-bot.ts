import { TwitterApi } from 'twitter-api-v2';

import * as dotenv from 'dotenv';
dotenv.config();

export const handler = async (event: TweetEvent) => {
  try {
    const api = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: event.accessToken,
      accessSecret: event.accessSecret,
    });

    await api.v2.tweet(event.text);
  } catch (err) {
    console.log(err);
  }
};

export interface TweetEvent {
  text: string;
  accessToken: string;
  accessSecret: string;
}
