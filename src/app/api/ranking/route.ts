import { connection } from "next/server";
import { loadRanking } from "@/lib/offers";
import { httpStatusForRanking, type RankingFailure } from "@/lib/ranking";

/**
 * GET /api/ranking?amount=1000&period=30&periodUnit=days
 *
 * 200 RankingSuccess — ranked offers, possibly empty.
 * 400 RankingFailure — amount/period/periodUnit validation. No offers field.
 * 503 RankingFailure code OFFERS_UNAVAILABLE — offer data could not be loaded.
 *
 * Full contract, pricing assumptions, and examples: README.md.
 */
export async function GET(request: Request) {
  await connection();
  try {
    const result = await loadRanking(new URL(request.url).searchParams);
    return Response.json(result, { status: httpStatusForRanking(result) });
  } catch (error) {
    console.error(error);
    const body: RankingFailure = {
      ok: false,
      error: {
        code: "OFFERS_UNAVAILABLE",
        field: "offers",
        message: "Nie udało się wczytać ofert. Spróbuj ponownie.",
      },
    };
    return Response.json(body, { status: httpStatusForRanking(body) });
  }
}
