export type CompetitionStatus = 'upcoming' | 'open' | 'closed' | 'completed';

export interface Competition {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  coverImage: string;
  startsAt: string;
  endsAt: string;
  status: CompetitionStatus;
  participantCount: number;
  capacity: number;
  isRegistered: boolean;
  prizePool: number;
  entryFee: number;
  judge: { name: string; role: string; experience: string; image: string };
  registrationClosesAt: string;
  submissionStartsAt: string;
  submissionEndsAt: string;
  resultDate: string;
  winners: Array<{ name: string; position: string; image: string }>;
  rewards: Array<{ position: string; amount: number }>;
  judgingParameters: string;
  rules: string;
}

export interface ApiError { error: string; code?: string; }
