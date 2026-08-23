import QRCode from "qrcode";

export async function bookingQrDataUrl(reference: string) {
  return QRCode.toDataURL(`STAGEPASS:${reference}`, {
    width: 280,
    margin: 1,
    color: { dark: "#1c1408", light: "#faf7f2" },
  });
}
