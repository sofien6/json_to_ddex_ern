import { convertToDdex } from "@/lib/ddex";

// POST a ConversionInput JSON body.
// Responds with the ERN XML (application/xml) on success, or a JSON list of issues on failure.
// Add ?format=json to always receive { xml, issues } as JSON.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { xml: null, issues: [{ path: "$", message: "Request body is not valid JSON", severity: "error" }] },
      { status: 400 },
    );
  }

  const result = convertToDdex(body);
  if (!result.xml) return Response.json(result, { status: 422 });

  if (new URL(request.url).searchParams.get("format") === "json") return Response.json(result);
  return new Response(result.xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
