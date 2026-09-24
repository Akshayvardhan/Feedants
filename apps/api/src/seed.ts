import { CompetitionModel } from './models/Competition';

export async function seedCompetition() {
  const startsAt = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const registrationClosesAt = new Date(Date.now() + 1000 * 60 * 60 * 30);
  const submissionStartsAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
  const submissionEndsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 9);
  const resultDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10);
  await CompetitionModel.findOneAndUpdate(
    { slug: 'urban-textures' },
    {
      $set: {
        slug: 'urban-textures',
        title: 'Feedants Classical Dance',
        category: 'Dance',
        description: 'This is an online classical dance competition open for all age groups. Participate from anywhere and showcase your talent. Express your passion through traditional dance.',
        coverImage: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80',
        startsAt,
        endsAt: registrationClosesAt,
        registrationClosesAt,
        submissionStartsAt,
        submissionEndsAt,
        resultDate,
        prizePool: 1500,
        entryFee: 99,
        judge: { name: 'Manju Dubey', role: 'Professional Kathak Dancer', experience: '12+ Years of Experience', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80' },
        winners: [
          { name: 'Riya Shah', position: '1st Winner', image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=120&q=80' },
          { name: 'Aarav Mehta', position: '1st Winner', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80' },
          { name: 'Neha Verma', position: '2nd Winner', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=120&q=80' },
          { name: 'Ishita Chopra', position: '3rd Winner', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=120&q=80' }
        ],
        rewards: [{ position: '1st Winner', amount: 550 }, { position: '2nd Winner', amount: 300 }, { position: '3rd Winner', amount: 240 }, { position: '4th Winner', amount: 200 }, { position: '5th Winner', amount: 130 }, { position: '6th Winner', amount: 80 }],
        judgingParameters: 'Expression, technique, creativity, presentation and musicality.',
        rules: 'Submit one original classical dance performance. Paid participants are eligible for judging.',
        capacity: 20
      },
      $setOnInsert: { participantIds: ['demo-registered-user', 'demo-second-user', 'demo-third-user'] }
    },
    { upsert: true, new: true }
  );
}
