import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export async function requireVerified(req: FastifyRequest, reply: FastifyReply) {
  await authenticate(req, reply);
  const user = req.user as { verificationLevel: string };
  if (user.verificationLevel === 'none') {
    reply.code(403).send({ error: 'Email verification required', code: 'VERIFY_EMAIL' });
  }
}

export async function requireFullVerification(req: FastifyRequest, reply: FastifyReply) {
  await authenticate(req, reply);
  const user = req.user as { verificationLevel: string };
  if (user.verificationLevel !== 'full') {
    reply.code(403).send({ error: 'Full verification required to access discovery', code: 'VERIFY_SELFIE' });
  }
}
