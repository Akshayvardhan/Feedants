import { Schema, model, type InferSchemaType } from 'mongoose';

const competitionSchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  coverImage: { type: String, required: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  capacity: { type: Number, required: true, min: 1 },
  prizePool: { type: Number, required: true },
  entryFee: { type: Number, required: true },
  judge: { name: String, role: String, experience: String, image: String },
  registrationClosesAt: { type: Date, required: true },
  submissionStartsAt: { type: Date, required: true },
  submissionEndsAt: { type: Date, required: true },
  resultDate: { type: Date, required: true },
  winners: [{ name: String, position: String, image: String }],
  rewards: [{ position: String, amount: Number }],
  judgingParameters: { type: String, required: true },
  rules: { type: String, required: true },
  participantIds: { type: [String], default: [] }
}, { timestamps: true, versionKey: false });

export type CompetitionDocument = InferSchemaType<typeof competitionSchema>;
export const CompetitionModel = model('Competition', competitionSchema);
