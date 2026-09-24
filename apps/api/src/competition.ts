import { Router } from 'express';
import { CompetitionModel } from './models/Competition';
import type { Competition, CompetitionStatus } from '@feedants/shared';

export const competitionRouter = Router();

function currentStatus(startsAt: Date, endsAt: Date, now = new Date()): CompetitionStatus {
  if (now < startsAt) return 'upcoming';
  if (now >= endsAt) return 'closed';
  return 'open';
}

function serialize(document: any, registeredUserId: string): Competition {
  return {
    id: document._id.toString(),
    slug: document.slug,
    title: document.title,
    category: document.category,
    description: document.description,
    coverImage: document.coverImage,
    startsAt: document.startsAt.toISOString(),
    endsAt: document.endsAt.toISOString(),
    status: currentStatus(document.startsAt, document.endsAt),
    participantCount: document.participantIds.length,
    capacity: document.capacity,
    isRegistered: document.participantIds.includes(registeredUserId),
    prizePool: document.prizePool,
    entryFee: document.entryFee,
    judge: document.judge,
    registrationClosesAt: document.registrationClosesAt.toISOString(),
    submissionStartsAt: document.submissionStartsAt.toISOString(),
    submissionEndsAt: document.submissionEndsAt.toISOString(),
    resultDate: document.resultDate.toISOString(),
    winners: document.winners,
    rewards: document.rewards,
    judgingParameters: document.judgingParameters,
    rules: document.rules
  };
}

competitionRouter.get('/:slug', async (request, response, next) => {
  try {
    const competition = await CompetitionModel.findOne({ slug: request.params.slug }).lean();
    if (!competition) return response.status(404).json({ error: 'Competition not found', code: 'NOT_FOUND' });
    return response.json(serialize(competition, request.userId!));
  } catch (error) { return next(error); }
});

competitionRouter.post('/:id/register', async (request, response, next) => {
  try {
    const id = request.userId!;
    const now = new Date();
    const competition = await CompetitionModel.findOneAndUpdate(
      {
        _id: request.params.id,
        startsAt: { $lte: now },
        endsAt: { $gt: now },
        participantIds: { $ne: id },
        $expr: { $lt: [{ $size: '$participantIds' }, '$capacity'] }
      },
      { $addToSet: { participantIds: id } },
      { new: true }
    ).lean();

    if (competition) return response.status(201).json(serialize(competition, id));

    const existing = await CompetitionModel.findById(request.params.id).lean();
    if (!existing) return response.status(404).json({ error: 'Competition not found', code: 'NOT_FOUND' });
    if (existing.participantIds.includes(id)) return response.status(409).json({ error: 'You are already registered', code: 'ALREADY_REGISTERED' });
    const status = currentStatus(existing.startsAt, existing.endsAt, now);
    if (status !== 'open') return response.status(409).json({ error: `Registration is ${status}`, code: 'NOT_OPEN' });
    return response.status(409).json({ error: 'This competition is full', code: 'FULL' });
  } catch (error) { return next(error); }
});
