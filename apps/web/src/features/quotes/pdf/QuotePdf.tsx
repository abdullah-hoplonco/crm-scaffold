import plex400 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff?url";
import plex500 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff?url";
import plex600 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff?url";
import { Document, Font, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuoteDocumentText } from "../model";

/**
 * The quotation as an A4 PDF. Loaded on demand (dynamic import) because @react-pdf/renderer is large.
 * Mirrors QuoteDocument using the same printed text.
 */

const PLEX = "IBM Plex Sans";
const FALLBACK = "Helvetica";

const INK = "#13232A";
const MUTED = "#58696D";
const RULE = "#D9E2E2";
const LAGOON = "#0F5F66";
const TINT = "#EAF0F0";

let fontsRegistered = false;

function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: PLEX,
    fonts: [
      { src: plex400, fontWeight: 400 },
      { src: plex500, fontWeight: 500 },
      { src: plex600, fontWeight: 600 },
    ],
  });
  // Keep words whole: hyphenated treatment names read badly on a quotation.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 72,
    paddingHorizontal: 46,
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.35,
  },
  watermark: {
    position: "absolute",
    top: 330,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 120,
    fontWeight: 600,
    color: INK,
    opacity: 0.05,
    transform: "rotate(-24deg)",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  seller: { flexDirection: "row", maxWidth: 300 },
  monogram: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: LAGOON,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  monogramText: { color: "#F2FBFB", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 },
  sellerName: { fontSize: 11.5, fontWeight: 600, marginBottom: 2 },
  small: { fontSize: 8.5, color: MUTED },
  smallInk: { fontSize: 8.5, color: INK },
  title: { fontSize: 26, lineHeight: 1.15, fontWeight: 600, textAlign: "right", letterSpacing: -0.4 },
  number: { fontSize: 10.5, lineHeight: 1.35, color: MUTED, textAlign: "right", marginTop: 4 },
  meta: {
    flexDirection: "row",
    marginTop: 26,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: RULE,
  },
  metaItem: { flex: 1 },
  label: { fontSize: 7.5, color: MUTED, marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 500 },
  parties: { flexDirection: "row", marginTop: 20 },
  party: { flex: 1, paddingRight: 18 },
  partyName: { fontSize: 10.5, fontWeight: 600 },
  table: { marginTop: 24 },
  thead: {
    flexDirection: "row",
    backgroundColor: TINT,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  th: { fontSize: 7.5, color: MUTED, fontWeight: 500 },
  tr: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: RULE,
  },
  cIndex: { width: 20 },
  cDesc: { flex: 1, paddingRight: 10 },
  cQty: { width: 36, textAlign: "right" },
  cUnit: { width: 86, textAlign: "right" },
  cAmount: { width: 90, textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 236 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  totalBand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 3,
    backgroundColor: LAGOON,
    color: "#F2FBFB",
  },
  words: { marginTop: 6, fontSize: 8.5, color: MUTED, textAlign: "right" },
  notes: { marginTop: 22 },
  footer: {
    position: "absolute",
    left: 46,
    right: 46,
    bottom: 30,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: RULE,
  },
  footerText: { fontSize: 7.5, color: MUTED },
});

function QuotePdfDocument({ text, fontFamily }: { text: QuoteDocumentText; fontFamily: string }) {
  return (
    <Document title={`${text.title} ${text.number}`} author={text.seller.name} subject={text.subject.value}>
      <Page size="A4" style={[s.page, { fontFamily }]}>
        {text.watermark ? (
          <Text style={s.watermark} fixed>
            {text.watermark}
          </Text>
        ) : null}

        <View style={s.header}>
          <View style={s.seller}>
            <View style={s.monogram}>
              <Text style={s.monogramText}>{text.monogram}</Text>
            </View>
            <View>
              <Text style={s.sellerName}>{text.seller.name}</Text>
              {text.seller.lines.map((line) => (
                <Text key={line} style={s.small}>
                  {line}
                </Text>
              ))}
              <Text style={s.smallInk}>{text.seller.trn}</Text>
            </View>
          </View>
          <View>
            <Text style={s.title}>{text.title}</Text>
            <Text style={s.number}>{text.number}</Text>
          </View>
        </View>

        <View style={s.meta}>
          {text.meta.map((item) => (
            <View key={item.label} style={s.metaItem}>
              <Text style={s.label}>{item.label}</Text>
              <Text style={s.metaValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.label}>{text.billTo.label}</Text>
            <Text style={s.partyName}>{text.billTo.name}</Text>
            {text.billTo.company ? <Text>{text.billTo.company}</Text> : null}
            {text.billTo.lines.map((line) => (
              <Text key={line} style={s.small}>
                {line}
              </Text>
            ))}
          </View>
          <View style={s.party}>
            <Text style={s.label}>{text.subject.label}</Text>
            <Text style={{ fontWeight: 500 }}>{text.subject.value}</Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, s.cIndex]}>#</Text>
            <Text style={[s.th, s.cDesc]}>{text.columns.description}</Text>
            <Text style={[s.th, s.cQty]}>{text.columns.qty}</Text>
            <Text style={[s.th, s.cUnit]}>{text.columns.unitPriceAed}</Text>
            <Text style={[s.th, s.cAmount]}>{text.columns.amountAed}</Text>
          </View>
          {text.lines.map((line, index) => (
            <View key={line.key} style={s.tr} wrap={false}>
              <Text style={[s.cIndex, { color: MUTED }]}>{index + 1}</Text>
              <Text style={s.cDesc}>{line.description}</Text>
              <Text style={s.cQty}>{line.qty}</Text>
              <Text style={s.cUnit}>{line.unitPrice}</Text>
              <Text style={[s.cAmount, { fontWeight: 500 }]}>{line.amount}</Text>
            </View>
          ))}
        </View>

        <View wrap={false}>
          <View style={s.totals}>
            {[text.totals.subtotal, text.totals.vat].map((row) => (
              <View key={row.label} style={s.totalRow}>
                <Text style={{ color: MUTED }}>{row.label}</Text>
                <Text>{row.value}</Text>
              </View>
            ))}
            <View style={s.totalBand}>
              <Text style={{ fontWeight: 500 }}>{text.totals.total.label}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: 600 }}>{text.totals.total.value}</Text>
            </View>
          </View>
          <Text style={s.words}>{text.amountInWords}</Text>
        </View>

        {text.notes ? (
          <View style={s.notes} wrap={false}>
            <Text style={s.label}>{text.notes.label}</Text>
            <Text>{text.notes.value}</Text>
          </View>
        ) : null}

        {/* No page numbers: render-prop Text doesn't draw with @react-pdf/renderer 4.9 on React 19. */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{text.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render the quotation to a PDF blob in IBM Plex Sans, or in Helvetica when the font files can't load. */
export async function renderQuotePdf(text: QuoteDocumentText): Promise<Blob> {
  registerFonts();
  try {
    return await pdf(<QuotePdfDocument text={text} fontFamily={PLEX} />).toBlob();
  } catch (error) {
    console.warn("[quotes] IBM Plex Sans could not be embedded in the PDF; using Helvetica.", error);
    return await pdf(<QuotePdfDocument text={text} fontFamily={FALLBACK} />).toBlob();
  }
}
