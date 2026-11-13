import { action,ApiError } from '@/lib/server';
export const POST=action(async()=>{throw new ApiError(404,'Hints are not available in this hunt.');});
