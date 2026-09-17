import { api, type Company, type Contact } from "@hco/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, MoreHorizontal, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { Money } from "@/components/app/Money";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactFormDialog } from "@/features/contacts/ContactFormDialog";
import { fullName } from "@/features/contacts/names";
import { BackLink, DetailItem, NotAdded, RecordUnavailable, Section, WhatsappMark } from "@/features/contacts/ui";
import { ContactDealsPanel } from "@/features/pipeline/ContactDealsPanel";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatDate, formatPhone } from "@/lib/format";
import { CompanyFormDialog } from "./CompanyFormDialog";
import { CompanyMark } from "./CompanyMark";
import { DeleteCompanyDialog } from "./DeleteCompanyDialog";
import { RegistrationPanel } from "./Registration";

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const detail = useApiQuery(api.companies.get, { params: { companyId } });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  if (detail.isPending) return <CompanyDetailSkeleton />;
  if (detail.isError) {
    return (
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <BackLink to="/companies">{t("companies.title")}</BackLink>
        <RecordUnavailable
          error={detail.error}
          onRetry={() => void detail.refetch()}
          backTo="/companies"
          backLabel={t("companyDetail.backToCompanies")}
          title={t("companyDetail.unavailable")}
        />
      </div>
    );
  }

  const { company, contacts } = detail.data;

  return (
    <>
      <header className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 lg:px-8">
        <BackLink to="/companies">{t("companies.title")}</BackLink>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <CompanyMark name={company.name} size="lg" className="size-12 sm:size-14" />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{company.name}</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {company.industry ? <span>{company.industry}</span> : null}
                {company.website ? (
                  <a
                    href={websiteHref(company.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    {company.website.replace(/^https?:\/\//i, "")}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" onClick={() => setEditing(true)} className="hidden sm:inline-flex">
              <Pencil />
              {tc("actions.edit")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("detail.moreActions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => setEditing(true)} className="sm:hidden">
                  <Pencil />
                  {t("companyDetail.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  <Trash2 />
                  {t("companyDetail.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pb-10 sm:px-6 lg:px-8">
        <RegistrationPanel company={company} onEdit={() => setEditing(true)} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
            <CompanyContacts contacts={contacts} onAdd={() => setAddingContact(true)} />
            <ContactDealsPanel companyId={company.id} />
          </div>
          <div className="order-1 lg:order-2">
            <AboutCard
              company={company}
              openDealsCount={detail.data.openDealsCount ?? 0}
              openPipelineAed={detail.data.openPipelineAed ?? "0"}
            />
          </div>
        </div>
      </div>

      <CompanyFormDialog open={editing} onOpenChange={setEditing} company={company} />
      <DeleteCompanyDialog
        open={deleting}
        onOpenChange={setDeleting}
        companyId={company.id}
        name={company.name}
        contactsCount={contacts.length}
      />
      <ContactFormDialog
        open={addingContact}
        onOpenChange={setAddingContact}
        defaults={{ companyId: company.id }}
        onSaved={(contact) => void navigate({ to: "/contacts/$contactId", params: { contactId: contact.id } })}
      />
    </>
  );
}

function CompanyContacts({ contacts, onAdd }: { contacts: Contact[]; onAdd: () => void }) {
  const { t } = useTranslation("contacts");
  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          {t("companyDetail.contacts")}
          <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
            {contacts.length}
          </span>
        </span>
      }
      bodyClassName="p-0"
      action={
        <Button variant="ghost" size="sm" onClick={onAdd} className="-me-2 text-primary">
          <Plus />
          {t("companyDetail.addContact")}
        </Button>
      }
    >
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <UserPlus className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t("companyDetail.noContacts")}</p>
        </div>
      ) : (
        <ul className="divide-y">
          {contacts.map((contact) => {
            const name = fullName(contact);
            const phone = contact.phones[0];
            return (
              <li key={contact.id}>
                <Link
                  to="/contacts/$contactId"
                  params={{ contactId: contact.id }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <UserAvatar name={name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    {contact.jobTitle ? (
                      <span className="block truncate text-xs text-muted-foreground">{contact.jobTitle}</span>
                    ) : null}
                  </span>
                  {phone ? (
                    <span className="hidden shrink-0 items-center gap-1.5 text-sm tabular-nums sm:flex">
                      {formatPhone(phone.e164)}
                      {phone.isWhatsapp ? <WhatsappMark /> : null}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function AboutCard({
  company,
  openDealsCount,
  openPipelineAed,
}: {
  company: Company;
  openDealsCount: number;
  openPipelineAed: string;
}) {
  const { t } = useTranslation("contacts");
  const assigneeId = useId();
  const update = useApiMutation(api.companies.update);
  const assign = (userId: string | null) =>
    update.mutate(
      { params: { companyId: company.id }, body: { assigneeId: userId } },
      {
        onSuccess: () => toast.success(userId ? t("detail.assigned") : t("detail.unassigned")),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <Section title={t("companyDetail.about")}>
      <dl className="grid gap-4">
        <DetailItem label={t("companyDetail.openPipeline")}>
          <span className="flex flex-wrap items-baseline gap-x-2">
            <Money value={openPipelineAed} className="text-lg font-semibold" />
            <span className="text-xs text-muted-foreground">
              {t("companyDetail.acrossDeals", { count: openDealsCount })}
            </span>
          </span>
        </DetailItem>
        <DetailItem label={t("companyForm.website")}>
          {company.website ? (
            <a
              href={websiteHref(company.website)}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary underline-offset-4 hover:underline"
            >
              {company.website.replace(/^https?:\/\//i, "")}
            </a>
          ) : (
            <NotAdded />
          )}
        </DetailItem>
        <DetailItem label={t("companyForm.address")}>
          {company.address ? <span className="whitespace-pre-line">{company.address}</span> : <NotAdded />}
        </DetailItem>
        <DetailItem label={t("companyForm.assignee")} labelFor={assigneeId}>
          <AssigneeSelect
            id={assigneeId}
            value={company.assigneeId}
            onChange={assign}
            disabled={update.isPending}
            className="w-full"
          />
        </DetailItem>
        <DetailItem label={t("detail.added")}>
          <span className="tabular-nums">{formatDate(company.createdAt)}</span>
        </DetailItem>
      </dl>
    </Section>
  );
}

function CompanyDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-lg" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-24" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}
