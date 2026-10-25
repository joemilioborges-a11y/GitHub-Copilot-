import { Profile, UserProfileData } from '../types';

export interface AiCompatibilityBreakdown {
  overallScore: number;
  interestsScore: number;
  lifestyleScore: number;
  goalsScore: number;
  communicationScore: number;
  commonInterests: string[];
  commonHobbies: string[];
  explanation: string;
  icebreakers: string[];
  disclaimer: string;
}

const ETHICAL_DISCLAIMER =
  'A tecnologia de recomendação do JOBS analisa afinidades declaradas e interesses em comum para sugerir conexões potenciais. A inteligência artificial não prevê sentimentos nem garante compatibilidade afetiva.';

export function calculateAiCompatibility(
  user: UserProfileData,
  profile: Profile
): AiCompatibilityBreakdown {
  // 1. Common Interests
  const userInterests = user.interests || [];
  const profileInterests = profile.interests || [];
  const commonInterests = userInterests.filter((i) =>
    profileInterests.some((pi) => pi.toLowerCase().trim() === i.toLowerCase().trim())
  );

  const interestRatio = profileInterests.length > 0 ? commonInterests.length / Math.min(userInterests.length || 1, profileInterests.length) : 0;
  const interestsScore = Math.min(98, Math.max(45, Math.round(interestRatio * 60 + 38)));

  // 2. Common Hobbies
  const userHobbies = user.hobbies || [];
  const profileHobbies = profile.hobbies || [];
  const commonHobbies = userHobbies.filter((h) =>
    profileHobbies.some((ph) => ph.toLowerCase().trim() === h.toLowerCase().trim())
  );

  // 3. Goals Compatibility
  const userGoal = (user.seeking || '').toLowerCase();
  const profileGoal = (profile.relationshipGoal || '').toLowerCase();
  let goalsScore = 75;
  if (
    (userGoal.includes('sério') && profileGoal.includes('sério')) ||
    (userGoal.includes('namoro') && profileGoal.includes('namoro')) ||
    (userGoal.includes('vip') && profileGoal.includes('vip')) ||
    (userGoal.includes('casual') && profileGoal.includes('casual'))
  ) {
    goalsScore = 95;
  } else if (userGoal.includes('sério') && profileGoal.includes('casual')) {
    goalsScore = 55;
  }

  // 4. Lifestyle & Habit Compatibility
  let lifestyleScore = 80;
  if (user.drinking && profile.drinking && user.drinking === profile.drinking) lifestyleScore += 8;
  if (user.smoking && profile.smoking && user.smoking === profile.smoking) lifestyleScore += 7;
  lifestyleScore = Math.min(96, lifestyleScore);

  // 5. Communication & Age/Distance Score
  let communicationScore = 85;
  const ageDiff = Math.abs((user.age || 25) - (profile.age || 25));
  if (ageDiff <= 3) communicationScore += 8;
  else if (ageDiff <= 7) communicationScore += 4;
  else communicationScore -= 6;

  if (profile.distanceKm && profile.distanceKm <= 10) communicationScore += 5;
  communicationScore = Math.min(99, Math.max(50, communicationScore));

  // Weighted Overall Score
  const overallScore = Math.round(
    interestsScore * 0.35 +
    goalsScore * 0.25 +
    lifestyleScore * 0.2 +
    communicationScore * 0.2
  );

  // Generate Explainable Text
  let explanation = '';
  if (commonInterests.length >= 2) {
    explanation = `Vocês compartilham ${commonInterests.length} interesses em comum (${commonInterests.slice(0, 3).join(', ')}) e estilo de vida alinhado.`;
  } else if (commonInterests.length === 1) {
    explanation = `Vocês compartilham afinidade em ${commonInterests[0]} e buscam objetivos complementares no JOBS.`;
  } else {
    explanation = `Embora tenham interesses diversos, há grande sinergia de estilo de vida e proximidade geográfica.`;
  }

  if (goalsScore >= 90) {
    explanation += ` Ambos declararam objetivos de relacionamento altamente compatíveis.`;
  }

  // Generate Personalized Icebreakers
  const icebreakers: string[] = [];
  if (commonInterests.length > 0) {
    icebreakers.push(`Notei que você também curte ${commonInterests[0]}! Qual é a sua melhor experiência recente com isso?`);
  } else {
    icebreakers.push(`Olá ${profile.name}! Gostei do seu perfil no JOBS, o que você mais gosta de fazer no fim de semana?`);
  }

  if (profile.hobbies && profile.hobbies.length > 0) {
    icebreakers.push(`Vi no seu perfil que você pratica ${profile.hobbies[0]}. Há quanto tempo você se dedica a isso?`);
  } else {
    icebreakers.push(`Oi! Adorei a sua foto em ${profile.city}. Tem algum lugar favorito por lá para me recomendar?`);
  }

  icebreakers.push(`Se pudesse escolher agora uma viagem dos sonhos ou um jantar incrível, qual você escolheria?`);

  return {
    overallScore,
    interestsScore,
    lifestyleScore,
    goalsScore,
    communicationScore,
    commonInterests,
    commonHobbies,
    explanation,
    icebreakers,
    disclaimer: ETHICAL_DISCLAIMER,
  };
}
