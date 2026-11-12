import { Resend } from 'resend';
import { getSiteUrl } from '@/lib/site-url';

export async function sendTesterConfirmation(opts: {
  email: string;
  id: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return false;

  const site = getSiteUrl();
  const markerUrl = `${site}/marker`;
  const tryUrl = `${site}/try`;
  const thanksUrl = `${site}/thanks?id=${encodeURIComponent(opts.id)}`;
  const replyTo = process.env.TESTER_REPLY_TO?.trim() || undefined;

  const replyLine = replyTo
    ? 'Reply to this message if something breaks — camera, marker, or morph.'
    : null;

  const text = [
    'You are on the TagXR tester list.',
    '',
    'How to try Untitled No. 7:',
    `1. Print the marker on matte paper: ${markerUrl}`,
    `2. On your phone (Safari or Chrome), open: ${tryUrl}`,
    '3. Tap Begin, aim at the marker, then tap the piece to morph.',
    '',
    `After you try it, leave a short note: ${thanksUrl}`,
    replyLine,
    '',
    '— TagXR',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <p>You are on the TagXR tester list.</p>
    <p><strong>How to try Untitled No. 7:</strong></p>
    <ol>
      <li>Print the marker on matte paper: <a href="${markerUrl}">${markerUrl}</a></li>
      <li>On your phone (Safari or Chrome), open: <a href="${tryUrl}">${tryUrl}</a></li>
      <li>Tap Begin, aim at the marker, then tap the piece to morph.</li>
    </ol>
    <p>After you try it, <a href="${thanksUrl}">leave a short note</a>.</p>
    ${replyLine ? `<p>${replyLine}</p>` : ''}
    <p>— TagXR</p>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: opts.email,
      subject: 'Your TagXR test links',
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (result.error) return false;
    return true;
  } catch {
    return false;
  }
}
