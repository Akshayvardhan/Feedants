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
        description: 'This is an online classical dance competition open for all age groups. Participate from anywhere and showcase your talent. Express your passion through traditional dance.\n\nParticipants can submit solo performances in Kathak, Bharatanatyam, Odissi, Kathakali, Mohiniyattam, Manipuri, or Kuchipudi. Video entries must be between 1 to 3 minutes in length, recorded in full HD (1080p) with clear audio. Winners receive official certificates, cash rewards, and features on Feedants.',
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
          { name: 'Riya Shah', position: '1st Winner', image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=300&q=80' },
          { name: 'Aarav Mehta', position: '1st Winner', image: 'https://images.unsplash.com/photo-1615109398623-88346a601842?auto=format&fit=crop&w=300&q=80' },
          { name: 'Neha Verma', position: '2nd Winner', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=300&q=80' },
          { name: 'Ishita Chopra', position: '3rd Winner', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80' }
        ],
        rewards: [{ position: '1st Winner', amount: 550 }, { position: '2nd Winner', amount: 300 }, { position: '3rd Winner', amount: 240 }, { position: '4th Winner', amount: 200 }, { position: '5th Winner', amount: 130 }, { position: '6th Winner', amount: 80 }],
        judgingParameters: 'Expression (Abhinaya), technique (Nritta & Nritya), rhythm (Taal), choreography, presentation, and musicality.\n\n• Facial Expressions & Emotion (30%)\n• Rhythm, Timing & Footwork (25%)\n• Choreography & Posture (25%)\n• Costume, Stage Presence & Overall Impact (20%)\n\nJudging will be performed by renowned Kathak Guru Manju Dubey and a panel of senior classical dance evaluators.',
        rules: 'Submit one original classical dance performance. Paid participants are eligible for judging.\n\n1. Video must be an original solo classical dance performance recorded specifically for Feedants.\n2. Minimum duration: 60 seconds; Maximum duration: 180 seconds.\n3. Pre-edited or filtered video effects that obscure facial expressions will lead to disqualification.\n4. Decisions made by the judge panel will be final and binding.\n5. Cash rewards will be transferred via Razorpay payout directly to registered participants.',
        capacity: 20
      },
      $setOnInsert: { participantIds: ['demo-registered-user', 'demo-second-user', 'demo-third-user'] }
    },
    { upsert: true, new: true }
  );
}
