import { parseGoogleSheetRankingCsv } from '../../src/domain/googleSheetSource.js';

const GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1iqFf2dbfsG_tl2FB8TrPsBfjO3xkvQYrnvqheUPY9KE/export?format=csv&gid=1481288268';

type CloudflareRequestInit = RequestInit & {
  readonly cf?: {
    readonly cacheTtl: number;
  };
};

export async function onRequestGet(): Promise<Response> {
  try {
    const requestInit: CloudflareRequestInit = {
      cf: {
        cacheTtl: 0,
      },
    };
    const response = await fetch(
      `${GOOGLE_SHEET_CSV_URL}&cachebust=${Date.now()}`,
      requestInit,
    );

    if (!response.ok) {
      return jsonResponse(
        { message: `Falha ao ler planilha: ${response.status}` },
        502,
      );
    }

    const csv = await response.text();
    const payload = parseGoogleSheetRankingCsv(csv);

    return jsonResponse({
      ...payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return jsonResponse(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Erro desconhecido ao ler a planilha.',
      },
      500,
    );
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json; charset=utf-8',
    },
    status,
  });
}
