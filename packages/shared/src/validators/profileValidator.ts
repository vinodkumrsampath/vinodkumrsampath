import { MAX_BIO_LENGTH, MAX_PROMPT_ANSWER_LENGTH, MIN_PROFILE_PHOTOS, MAX_PROFILE_PHOTOS } from '../constants';

export function validateBio(bio: string): string | null {
  if (bio.length > MAX_BIO_LENGTH) return `Bio must be ${MAX_BIO_LENGTH} characters or less`;
  return null;
}

export function validatePhotoCount(count: number): string | null {
  if (count < MIN_PROFILE_PHOTOS) return `At least ${MIN_PROFILE_PHOTOS} photos required`;
  if (count > MAX_PROFILE_PHOTOS) return `Maximum ${MAX_PROFILE_PHOTOS} photos allowed`;
  return null;
}

export function validatePromptAnswer(answer: string): string | null {
  if (!answer.trim()) return 'Answer cannot be empty';
  if (answer.length > MAX_PROMPT_ANSWER_LENGTH) return `Answer must be ${MAX_PROMPT_ANSWER_LENGTH} characters or less`;
  return null;
}

export function validateAge(birthDate: string): string | null {
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  if (age < 18) return 'You must be at least 18 years old';
  if (age > 100) return 'Invalid birth date';
  return null;
}

export function getAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
