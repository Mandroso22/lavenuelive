import { NextResponse } from "next/server";
import { stripe } from "../../lib/stripe";
import { sendOrderConfirmationEmail } from "../../services/emailService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID manquant" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      try {
        await sendOrderConfirmationEmail({
          firstName: session.metadata?.firstName || "",
          lastName: session.metadata?.lastName || "",
          email: session.metadata?.email || "",
          phone: session.metadata?.phone || "",
          address: session.metadata?.address || "",
          city: session.metadata?.city || "",
          postalCode: session.metadata?.postalCode || "",
          reference: session.metadata?.reference || "",
          amount: (session.amount_total
            ? session.amount_total / 100
            : 0
          ).toString(),
          shippingMethod: session.metadata?.shippingMethod || "",
          tiktokPseudo: session.metadata?.tiktokPseudo || "",
        });
        await stripe.checkout.sessions.update(sessionId, {
          metadata: { ...session.metadata },
        });
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email:", emailError);
      }
      return NextResponse.json({ status: "complete" });
    }

    return NextResponse.json({ status: "incomplete" });
  } catch (error) {
    console.error("Erreur lors de la vérification du statut:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification du statut" },
      { status: 500 }
    );
  }
}
