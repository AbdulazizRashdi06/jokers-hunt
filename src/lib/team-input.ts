import { z } from 'zod';
export const captainPhoneSchema=z.string().trim().min(6).max(30).refine(value=>/^\+?[0-9 ()-]+$/.test(value)&&value.replace(/\D/g,'').length>=6&&value.replace(/\D/g,'').length<=15,'Enter a valid captain phone number, including country code.');
