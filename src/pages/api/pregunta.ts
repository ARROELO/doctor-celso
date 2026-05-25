import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

interface PreguntaBody {
  pregunta?: string;
  edad?: number;
}

export const POST: APIRoute = async ({ request }) => {
  let body: PreguntaBody;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Datos inválidos.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pregunta = body.pregunta?.trim();
  const edad = body.edad;

  if (!pregunta || pregunta.length < 10) {
    return new Response(
      JSON.stringify({ ok: false, error: 'La pregunta debe tener al menos 10 caracteres.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (edad !== undefined && (typeof edad !== 'number' || edad < 18 || edad > 120)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'La edad debe estar entre 18 y 120 años.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  const emailTo = import.meta.env.PREGUNTA_EMAIL_TO;

  if (!apiKey || !emailTo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Servicio de envío no configurado.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const resend = new Resend(apiKey);
  const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const edadText = edad !== undefined ? `${edad} años` : 'No indicada';

  const { error } = await resend.emails.send({
    from: 'Preguntas Anónimas <onboarding@resend.dev>',
    to: emailTo,
    subject: 'Nueva pregunta anónima — Iniciativa 60+',
    text: [
      'Nueva pregunta anónima recibida',
      '',
      `Fecha: ${timestamp}`,
      `Edad: ${edadText}`,
      '',
      'Pregunta:',
      pregunta,
    ].join('\n'),
  });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No se pudo enviar la pregunta.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
