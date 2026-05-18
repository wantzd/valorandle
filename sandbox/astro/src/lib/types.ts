export interface Player {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  team: string;
  age: number;
  role: string;
  titles: string[];
  yearsActive: number;
  league: string;
  vlrId?: string | number;
  isIGL?: boolean;
}

export type Status = 'correct' | 'close' | 'wrong';

export interface FeedbackCell {
  attr: string;
  value: string | number;
  status: Status;
  hint: string | null;
  fullList?: string[];
}

export type Feedback = FeedbackCell[];

export interface Guess {
  player: Player;
  feedback: Feedback;
}

export interface RoundResult {
  won: boolean;
  guesses: Guess[];
}

export interface DailyState {
  currentRound: number;
  roundResults: RoundResult[];
  guesses: Guess[];
  finished: boolean;
  won: boolean;
  dailyDone: boolean;
}

export interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
}
