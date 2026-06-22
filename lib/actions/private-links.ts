"use server";

function parseEventSlug(url: string): string | null {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments[1] ?? null;
  } catch {
    return null;
  }
}

export async function generatePrivateLink(params: {
  calComUrl: string;
  attorneyEmail: string;
  clientEmail?: string;
}): Promise<{ bookingUrl: string } | { error: string }> {
  const apiUrl = process.env.MANIFEST_API_URL;
  const apiKey = process.env.MANIFEST_API_KEY;

  if (!apiUrl || !apiKey) {
    return { error: "ManifestOS API is not configured" };
  }

  if (!params.attorneyEmail) {
    return { error: "Attorney email is not set" };
  }

  const eventSlug = parseEventSlug(params.calComUrl);
  if (!eventSlug) {
    return { error: "Could not parse event slug" };
  }

  const body: Record<string, string> = {
    eventSlug,
    attorneyEmail: params.attorneyEmail
  };

  if (params.clientEmail) {
    body.clientEmail = params.clientEmail;
  }

  const response = await fetch(`${apiUrl}/api/calcom/v1/private-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    return { error: `Failed to generate link (HTTP ${response.status})` };
  }

  const data = await response.json();
  return { bookingUrl: data.bookingUrl };
}
