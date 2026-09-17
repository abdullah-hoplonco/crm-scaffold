import type { DealDetail } from "@hco/shared/api/pipeline";
import { Link } from "@tanstack/react-router";
import { Building2, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/app/UserAvatar";
import { OpenChatButton } from "@/features/inbox/OpenChatButton";
import { formatDate, formatPhone } from "@/lib/format";

/** Who the deal is with: the contact's ways to reach them and the company's UAE registration. */
export function DealSidePanel({ detail }: { detail: DealDetail }) {
  const { t } = useTranslation("pipeline");
  const { contact, company, deal, lead } = detail;
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-4">
      <Panel title={t("deal.contact")}>
        <div className="flex items-center gap-3">
          <UserAvatar name={name} size="lg" />
          <div className="min-w-0">
            <Link
              to="/contacts/$contactId"
              params={{ contactId: contact.id }}
              className="block truncate font-medium underline-offset-4 hover:underline"
            >
              {name}
            </Link>
            {contact.jobTitle ? (
              <p className="truncate text-sm text-muted-foreground">{contact.jobTitle}</p>
            ) : null}
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {contact.phones.map((phone) => (
            <li key={phone.e164} className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`tel:${phone.e164}`} className="tabular-nums underline-offset-4 hover:underline">
                {formatPhone(phone.e164)}
              </a>
              <span className="text-xs text-muted-foreground">{t(`deal.phoneLabels.${phone.label}`)}</span>
              {phone.isWhatsapp ? (
                <span className="ms-auto inline-flex items-center gap-1 text-xs text-channel-whatsapp">
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  {t("deal.onWhatsapp")}
                </span>
              ) : null}
            </li>
          ))}
          {contact.emails.map((email) => (
            <li key={email} className="flex min-w-0 items-center gap-2">
              <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <a href={`mailto:${email}`} className="truncate underline-offset-4 hover:underline">
                {email}
              </a>
            </li>
          ))}
          {contact.phones.length === 0 && contact.emails.length === 0 ? (
            <li className="text-muted-foreground">{t("deal.noContactDetails")}</li>
          ) : null}
        </ul>
        <OpenChatButton contactId={contact.id} className="mt-3 w-full" />
      </Panel>

      <Panel title={t("deal.company")}>
        {company ? (
          <>
            <Link
              to="/companies/$companyId"
              params={{ companyId: company.id }}
              className="flex items-center gap-2 font-medium underline-offset-4 hover:underline"
            >
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{company.name}</span>
            </Link>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <Row label={t("deal.emirate")}>
                {company.emirate ? t(`common:emirates.${company.emirate}`) : t("common:states.none")}
              </Row>
              <Row label={t("deal.jurisdiction")}>
                {company.jurisdiction
                  ? company.jurisdiction === "free_zone" && company.freeZoneName
                    ? t("deal.freeZoneNamed", { name: company.freeZoneName })
                    : t(`common:jurisdiction.${company.jurisdiction}`)
                  : t("common:states.none")}
              </Row>
              {company.trn ? (
                <Row label={t("deal.trn")}>
                  <span className="tabular-nums">{formatTrn(company.trn)}</span>
                </Row>
              ) : null}
              {company.industry ? <Row label={t("deal.industry")}>{company.industry}</Row> : null}
            </dl>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("deal.noCompany")}</p>
        )}
      </Panel>

      <Panel title={t("deal.about")}>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <Row label={t("deal.created")}>{formatDate(deal.createdAt)}</Row>
          {lead ? (
            <Row label={t("deal.fromLead")}>
              <Link
                to="/leads/$leadId"
                params={{ leadId: lead.id }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("deal.leadReceived", {
                  source: t(`common:sources.${lead.source}`),
                  date: formatDate(lead.receivedAt),
                })}
              </Link>
            </Row>
          ) : null}
          {lead?.campaignName ? <Row label={t("deal.campaign")}>{lead.campaignName}</Row> : null}
          {deal.closedAt ? <Row label={t("deal.closed")}>{formatDate(deal.closedAt)}</Row> : null}
        </dl>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end sm:text-start">{children}</dd>
    </>
  );
}

/** 100458392700003 → 100-4583-9270-0003 */
function formatTrn(trn: string): string {
  const digits = trn.replace(/\D/g, "");
  return digits.length === 15
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}-${digits.slice(11)}`
    : trn;
}
