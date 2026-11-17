import { NextRequest } from "next/server";
import { assertSameOrigin, cookieName, exchangeToken, HttpError, limit } from "@/lib/security";
import { errorResponse, noStoreJson, readJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await limit(request, "session-exchange", 80);
    const body = await readJson(request);
    if (typeof body.token !== "string") throw new HttpError(400, "access_token_missing");
    const { access, session } = await exchangeToken(body.token);
    const response = noStoreJson({ role: access.role });
    response.cookies.set(cookieName(access.role), session.raw, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
