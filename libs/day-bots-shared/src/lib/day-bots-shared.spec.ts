import { parseDay } from './day-bots-shared';

describe('Parse Day', () => {
  it('should parse normal', () => {
    const actual = parseDay('エッセイ記念日');
    expect(actual).toEqual(['エッセイ記念日']);
  });

  it('should parse split by slash', () => {
    const actual = parseDay('ボンカレーの日／レトルトカレーの日');
    expect(actual).toEqual(['ボンカレーの日', 'レトルトカレーの日']);
  });

  it('should parse normal link', () => {
    const actual = parseDay('[[猫の日]]');
    expect(actual).toEqual(['猫の日']);
  });

  it('should parse partial link', () => {
    const actual = parseDay('[[靴]]の記念日');
    expect(actual).toEqual(['靴の記念日']);
  });

  it('should parse link with different name', () => {
    const actual = parseDay('[[乃木坂46|乃木坂46の日]]');
    expect(actual).toEqual(['乃木坂46の日']);
  });

  it('should parse partial link with different name', () => {
    const actual = parseDay('[[民間放送|民放ラジオ]]の日');
    expect(actual).toEqual(['民放ラジオの日']);
  });

  it('should parse link without brackets', () => {
    const actual = parseDay('[[36の日|36(サブロク)の日]]');
    expect(actual).toEqual(['36の日']);
  });

  it('should parse with url', () => {
    const actual = parseDay('[http://charadinate.jp/ キャラディネートの日]');
    expect(actual).toEqual(['キャラディネートの日']);
  });

  it('should remove ref', () => {
    const actual = parseDay(
      '無電柱化の日<ref>{{Cite web |url=http://www.mlit.go.jp/report/press/road01_hh_001086.html |title=報道発表資料：１１月１０日「無電柱化の日」にイベントを開催します<br>～みんなで考えよう なるほど納得！無電柱化ｉｎお台場～ - 国土交通省 |publisher=国土交通省|accessdate=2019-07-11}}</ref>'
    );
    expect(actual).toEqual(['無電柱化の日']);
  });
});
