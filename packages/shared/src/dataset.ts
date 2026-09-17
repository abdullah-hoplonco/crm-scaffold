import type {
  Activity,
  AssignmentRule,
  ChannelConnection,
  Company,
  Contact,
  Conversation,
  Deal,
  Lead,
  Message,
  Notification,
  Pipeline,
  Quote,
  QuoteCounter,
  Stage,
  StageTransition,
  Task,
  User,
  WhatsAppTemplate,
  Workspace,
} from "./entities";

/**
 * Every table of the domain, as plain rows. This is the shape the Phase B Prisma
 * schema mirrors, the shape `pnpm seed` writes, and the shape the Phase A in-browser
 * mock backend stores.
 */
export interface Tables {
  workspaces: Workspace[];
  users: User[];
  leads: Lead[];
  contacts: Contact[];
  companies: Company[];
  pipelines: Pipeline[];
  stages: Stage[];
  deals: Deal[];
  stageTransitions: StageTransition[];
  activities: Activity[];
  tasks: Task[];
  notifications: Notification[];
  channelConnections: ChannelConnection[];
  conversations: Conversation[];
  messages: Message[];
  whatsappTemplates: WhatsAppTemplate[];
  quotes: Quote[];
  quoteCounters: QuoteCounter[];
  assignmentRules: AssignmentRule[];
}

export type TableName = keyof Tables;

export function emptyTables(): Tables {
  return {
    workspaces: [],
    users: [],
    leads: [],
    contacts: [],
    companies: [],
    pipelines: [],
    stages: [],
    deals: [],
    stageTransitions: [],
    activities: [],
    tasks: [],
    notifications: [],
    channelConnections: [],
    conversations: [],
    messages: [],
    whatsappTemplates: [],
    quotes: [],
    quoteCounters: [],
    assignmentRules: [],
  };
}
