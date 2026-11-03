import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const TO_EMAIL = '31lavneet@gmail.com'

export async function sendFeedbackEmail(
  subject: string,
  message: string,
  userEmail: string
): Promise<void> {
  if (!resend) throw new Error('Feedback service unavailable')
  const { error } = await resend.emails.send({
    from: 'RaiderRating <onboarding@resend.dev>',
    to: TO_EMAIL,
    replyTo: userEmail,
    subject: `[RaiderRating Feedback] ${subject}`,
    text: `From: ${userEmail}\nSubject: ${subject}\n\n${message}`,
  })
  if (error) throw new Error(error.message)
}
