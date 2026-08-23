import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const from =
  process.env.EMAIL_FROM ?? "StagePass <onboarding@resend.dev>";

const TEST_RECIPIENT = "veenaramesha@gmail.com";

type Mail = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(mail: Mail) {
  const to = String(mail.to || "").trim().toLowerCase();
  const isAllowedTestRecipient = to === TEST_RECIPIENT.toLowerCase();

  if (!resend || !isAllowedTestRecipient) {
    console.log("[email:blocked]", {
      subject: mail.subject,
      to,
      reason: !resend ? "Missing Resend API key" : `Only ${TEST_RECIPIENT} is allowed for testing.`,
    });

    return {
      mocked: true,
      blocked: true,
      reason: !resend
        ? "Email delivery is not configured in this environment."
        : `Email delivery is limited to ${TEST_RECIPIENT} for testing.`,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
    });

    if (error) {
      console.error("RESEND ERROR:", error);
      return {
        mocked: true,
        blocked: true,
        reason: error.message || "Resend rejected the email request.",
      };
    }

    console.log("EMAIL SENT:", data);

    return {
      mocked: false,
      blocked: false,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email";
    console.error("EMAIL DELIVERY FAILED:", message);

    return {
      mocked: true,
      blocked: true,
      reason: message,
    };
  }
}

export function bookingEmailHtml(opts: {
  name: string;
  title: string;
  when: string;
  venue: string;
  seats: string;
  reference: string;
  qrDataUrl: string | null;
}) {
  const qr = opts.qrDataUrl
    ? `<img src="${opts.qrDataUrl}" alt="Booking QR" width="180" height="180" style="border-radius:12px" />`
    : "";

  return `
  <div style="font-family:Georgia,serif;background:#0c0a09;color:#faf7f2;padding:32px">

    <h1 style="color:#e8b86d;font-weight:normal">
      You're in, ${opts.name}.
    </h1>

    <p style="opacity:.85">
      Your seats for <strong>${opts.title}</strong> are confirmed.
    </p>

    <p>
      ${opts.when}<br/>
      ${opts.venue}<br/>
      Seats: ${opts.seats}
    </p>

    <p>
      Reference <strong>${opts.reference}</strong>
    </p>

    ${qr}

    <p style="font-size:12px;opacity:.6">
      Present this QR at the door. StagePass
    </p>

  </div>`;
}

export function waitlistOfferHtml(opts: {
  name: string;
  title: string;
  category: string;
  link: string;
  minutes: number;
}) {
  return `
  <div style="font-family:Georgia,serif;background:#0c0a09;color:#faf7f2;padding:32px">

    <h1 style="color:#e8b86d;font-weight:normal">
      A seat opened up
    </h1>

    <p>
      Hi ${opts.name}, a ${opts.category} seat for
      <strong>${opts.title}</strong> is yours for
      ${opts.minutes} minutes.
    </p>

    <p>
      <a
        href="${opts.link}"
        style="
          color:#0c0a09;
          background:#e8b86d;
          padding:12px 18px;
          border-radius:999px;
          text-decoration:none;
        "
      >
        Claim this seat
      </a>
    </p>

  </div>`;
}