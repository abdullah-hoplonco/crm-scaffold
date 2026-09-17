import { api, type Company, type Contact } from "@hco/shared";
import { Link } from "@tanstack/react-router";
import { Mail, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AssigneeSelect } from "@/components/app/AssigneeSelect";
import { SourceBadge } from "@/components/app/SourceBadge";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyMark } from "@/features/companies/CompanyMark";
import { RegistrationList } from "@/features/companies/Registration";
import { OpenChatButton } from "@/features/inbox/OpenChatButton";
import { ContactDealsPanel } from "@/features/pipeline/ContactDealsPanel";
import { TaskList } from "@/features/timeline/TaskList";
import { Timeline } from "@/features/timeline/Timeline";
import { errorMessage } from "@/lib/api/errors";
import { useApiMutation, useApiQuery } from "@/lib/api/hooks";
import { formatDate, formatPhone } from "@/lib/format";
import { ContactFormDialog } from "./ContactFormDialog";
import { DeleteContactDialog } from "./DeleteContactDialog";
import { useMediaQuery } from "./hooks";
import { fullName } from "./names";
import { BackLink, DetailItem, NotAdded, RecordUnavailable, Section, WhatsappMark } from "./ui";

export function ContactDetailPage({ contactId }: { contactId: string }) {
  const { t } = useTranslation("contacts");
  const detail = useApiQuery(api.contacts.get, { params: { contactId } });
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (detail.isPending) return <ContactDetailSkeleton />;
  if (detail.isError) {
    return (
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <BackLink to="/contacts">{t("list.title")}</BackLink>
        <RecordUnavailable
          error={detail.error}
          onRetry={() => void detail.refetch()}
          backTo="/contacts"
          backLabel={t("detail.backToContacts")}
          title={t("detail.unavailable")}
        />
      </div>
    );
  }

  const { contact, company } = detail.data;
  const openEdit = () => setEditing(true);
  const details = <DetailsCard contact={contact} onEdit={openEdit} />;
  const companyCard = <CompanyCard company={company} onEdit={openEdit} />;
  const deals = <ContactDealsPanel contactId={contact.id} />;
  const tasks = (
    <Section title={t("detail.tasks")}>
      <TaskList subject={{ contactId: contact.id }} />
    </Section>
  );
  const timeline = (
    <Section title={t("detail.activity")}>
      <Timeline subject={{ contactId: contact.id }} allowCompose />
    </Section>
  );

  return (
    <>
      <ContactHeader
        contact={contact}
        company={company}
        onEdit={openEdit}
        onDelete={() => setDeleting(true)}
      />
      {isDesktop ? (
        <div className="grid grid-cols-[340px_minmax(0,1fr)] items-start gap-5 px-8 pb-10 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            {details}
            {companyCard}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {deals}
            {tasks}
            {timeline}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="details" className="gap-3 px-4 pb-8 sm:px-6">
          <TabsList className="w-full">
            <TabsTrigger value="details">{t("detail.tabs.details")}</TabsTrigger>
            <TabsTrigger value="activity">{t("detail.tabs.activity")}</TabsTrigger>
            <TabsTrigger value="deals">{t("detail.tabs.deals")}</TabsTrigger>
            <TabsTrigger value="tasks">{t("detail.tabs.tasks")}</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="flex flex-col gap-4">
            {details}
            {companyCard}
          </TabsContent>
          <TabsContent value="activity">{timeline}</TabsContent>
          <TabsContent value="deals">{deals}</TabsContent>
          <TabsContent value="tasks">{tasks}</TabsContent>
        </Tabs>
      )}
      <ContactFormDialog open={editing} onOpenChange={setEditing} contact={contact} />
      <DeleteContactDialog
        open={deleting}
        onOpenChange={setDeleting}
        contactId={contact.id}
        name={fullName(contact)}
        openDealsCount={detail.data.openDealsCount ?? 0}
      />
    </>
  );
}

function ContactHeader({
  contact,
  company,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  company: Company | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const name = fullName(contact);
  const phone = contact.primaryPhoneE164;
  const email = contact.emails[0];

  let role: ReactNode = null;
  const companyLink = company ? (
    <Link
      to="/companies/$companyId"
      params={{ companyId: company.id }}
      className="font-medium text-foreground/90 underline-offset-4 hover:text-primary hover:underline"
    />
  ) : null;
  if (contact.jobTitle && company && companyLink) {
    role = (
      <Trans
        t={t}
        i18nKey="detail.jobAtCompany"
        values={{ job: contact.jobTitle, company: company.name }}
        components={{ company: companyLink }}
      />
    );
  } else if (company && companyLink) {
    role = (
      <Trans t={t} i18nKey="detail.worksAt" values={{ company: company.name }} components={{ company: companyLink }} />
    );
  } else if (contact.jobTitle) {
    role = contact.jobTitle;
  }

  return (
    <header className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6 lg:px-8">
      <BackLink to="/contacts">{t("list.title")}</BackLink>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <UserAvatar name={name} size="lg" className="size-12 text-base sm:size-14 sm:text-lg" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{name}</h1>
            {role ? <p className="mt-0.5 text-sm text-muted-foreground">{role}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" onClick={onEdit} className="hidden sm:inline-flex">
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
              <DropdownMenuItem onSelect={onEdit} className="sm:hidden">
                <Pencil />
                {t("detail.editContact")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                {t("detail.deleteContact")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
        {phone ? (
          <Button variant="outline" asChild>
            <a href={`tel:${phone}`}>
              <Phone />
              {t("detail.call")}
            </a>
          </Button>
        ) : null}
        <OpenChatButton contactId={contact.id} />
        {email ? (
          <Button variant="outline" asChild>
            <a href={`mailto:${email}`}>
              <Mail />
              {t("detail.email")}
            </a>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function DetailsCard({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const { t } = useTranslation("contacts");
  const { t: tc } = useTranslation();
  const assigneeId = useId();
  const update = useApiMutation(api.contacts.update);

  const assign = (userId: string | null) =>
    update.mutate(
      { params: { contactId: contact.id }, body: { assigneeId: userId } },
      {
        onSuccess: () => toast.success(userId ? t("detail.assigned") : t("detail.unassigned")),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );

  return (
    <Section
      title={t("detail.details")}
      action={
        <Button variant="ghost" size="sm" onClick={onEdit} className="-me-2 text-primary">
          {tc("actions.edit")}
        </Button>
      }
    >
      <dl className="grid gap-4">
        <DetailItem label={t("detail.phones")}>
          {contact.phones.length ? (
            <ul className="grid gap-1.5">
              {contact.phones.map((phone) => (
                <li key={phone.e164} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <a
                    href={`tel:${phone.e164}`}
                    className="font-medium tabular-nums underline-offset-4 hover:text-primary hover:underline"
                  >
                    {formatPhone(phone.e164)}
                  </a>
                  <span className="text-xs text-muted-foreground">{t(`phoneLabels.${phone.label}`)}</span>
                  {phone.isWhatsapp ? <WhatsappMark withLabel /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <NotAdded />
          )}
        </DetailItem>
        <DetailItem label={t("detail.emails")}>
          {contact.emails.length ? (
            <ul className="grid gap-1">
              {contact.emails.map((email) => (
                <li key={email} className="min-w-0">
                  <a
                    href={`mailto:${email}`}
                    className="block truncate font-medium underline-offset-4 hover:text-primary hover:underline"
                  >
                    {email}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <NotAdded />
          )}
        </DetailItem>
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label={t("detail.source")}>
            <SourceBadge source={contact.source} />
          </DetailItem>
          <DetailItem label={t("detail.added")}>
            <span className="tabular-nums">{formatDate(contact.createdAt)}</span>
          </DetailItem>
        </div>
        <DetailItem label={t("detail.assignee")} labelFor={assigneeId}>
          <AssigneeSelect
            id={assigneeId}
            value={contact.assigneeId}
            onChange={assign}
            disabled={update.isPending}
            className="w-full"
          />
        </DetailItem>
        <DetailItem label={t("detail.notes")}>
          {contact.notes ? (
            <p className="whitespace-pre-line">{contact.notes}</p>
          ) : (
            <NotAdded>{t("detail.noNotes")}</NotAdded>
          )}
        </DetailItem>
      </dl>
    </Section>
  );
}

function CompanyCard({ company, onEdit }: { company: Company | null; onEdit: () => void }) {
  const { t } = useTranslation("contacts");
  return (
    <Section title={t("detail.company")}>
      {company ? (
        <div className="grid gap-4">
          <Link
            to="/companies/$companyId"
            params={{ companyId: company.id }}
            className="group flex min-w-0 items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <CompanyMark name={company.name} />
            <span className="min-w-0">
              <span className="block truncate font-medium group-hover:text-primary group-hover:underline">
                {company.name}
              </span>
              {company.industry ? (
                <span className="block truncate text-xs text-muted-foreground">{company.industry}</span>
              ) : null}
            </span>
          </Link>
          <RegistrationList company={company} />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 text-sm">
          <p className="text-muted-foreground">{t("detail.noCompany")}</p>
          <Button variant="outline" size="sm" onClick={onEdit}>
            {t("detail.addCompany")}
          </Button>
        </div>
      )}
    </Section>
  );
}

function ContactDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 px-4 pt-4 pb-8 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
